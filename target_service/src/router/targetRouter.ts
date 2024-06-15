import express from 'express';
import * as dotenv from 'dotenv';
import Target from "../models/Target";
import amqp, {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import vision from '@google-cloud/vision';

const router = express.Router();

dotenv.config();

if (!process.env.SECRET_KEY) {
    console.error('No secret key found');
    process.exit(1);
}

if (!process.env.RABBITMQ_URL) {
    console.error('No RabbitMQ URL found');
    process.exit(1);
}

const rabbitMQUrl: string = process.env.RABBITMQ_URL;
const SECRET_KEY = process.env.SECRET_KEY;
const messageBacklog: any[] = [];


let channel: ChannelWrapper, connection: AmqpConnectionManager;

const exchange = 'contestQueue';

const newTargetKey = 'target.new';

async function connectQueue() {
    try {
        connection = amqp.connect(rabbitMQUrl, {heartbeatIntervalInSeconds: 4});
        connection.on('error', (err) => {
            console.log(`Error: ${err.message}`);
        });

        connection.on('disconnect', (params) => {
            console.log('Disconnected from queue');
        });
        connection.on('close', () => {
            console.log('Connection closed');
        });
        channel = connection.createChannel()

        connection.on('connect', async () => {
            console.log('Publishing backlog to queue');
            while (messageBacklog.length > 0) {
                await channel.publish(exchange, newTargetKey, Buffer.from(JSON.stringify(messageBacklog[0])));
                messageBacklog.shift();
            }
        });

    } catch (error) {
        console.log(error)
    }
}

connectQueue().then(r => console.log('connected to queue')).catch(e => console.log(e));


interface Target {
    userId: string,
    image: string,
    location: string,
    date: Date,
    labels: string[]
}

interface TargetData {
    userId: string,
    image: string,
    location: string,
    date: Date
}


router.post('/target', async (req, res) => {
    const targetData = req.body;

    if (!targetData.userId || !targetData.image || !targetData.location || !targetData.date) {
        return res.status(400).json({error: 'Fill required fields'});
    }

    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.labelDetection(targetData.image);
    const labels = result.labelAnnotations;
    let labelValues: string[] = [];
    if (labels !== undefined  && labels !== null) {
        labelValues = labels.map((label) => label.description ?? '');
    }


    const target: Target = {
        userId: targetData.userId,
        image: targetData.image,
        location: targetData.location,
        date: targetData.date,
        labels: labelValues
    }


    const targetAlreadyExists = await Target.findOne({image: target.image});

    if (targetAlreadyExists) {
        return res.status(400).json({error: 'Target already exists'});
    }

    await Target.create(target);

    console.log('publishing to queue');

    if (!connection.isConnected()) {
        messageBacklog.push(target);
    } else {
        await channel.publish(exchange, newTargetKey, Buffer.from(JSON.stringify(target)));
    }

    return res.status(201).json({target});


})

export {router as authRouter};