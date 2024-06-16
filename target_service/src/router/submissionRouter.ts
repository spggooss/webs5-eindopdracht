import * as dotenv from 'dotenv';
import amqp, {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import vision from '@google-cloud/vision';
import {CreateTargetValidator} from "../validators/CreateTargetValidator";
import Submission from "../models/Submission";
import express from "express";


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


interface Submission {
    targetId: number,
    image: string,
    userId: string,
    labels: string[]
}

interface SubmissionData {
    targetId: number,
    image: string,
    userId: string,
}


router.post('/submissions', CreateTargetValidator, async (req, res) => {
    const submissionData: SubmissionData = req.body;

    console.log(JSON.stringify(submissionData));

    if (!submissionData.userId || !submissionData.image || !submissionData.targetId) {
        return res.status(400).json({error: 'Fill required fields'});
    }

    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.labelDetection(submissionData.image);
    const labels = result.labelAnnotations;
    let labelValues: string[] = [];
    if (labels !== undefined  && labels !== null) {
        labelValues = labels.map((label) => label.description ?? '');
    }


    const submission: Submission = {
        userId: submissionData.userId,
        image: submissionData.image,
        targetId: submissionData.targetId,
        labels: labelValues
    }


    const targetAlreadyExists = await Submission.findOne({userId: submission.userId, targetId: submission.targetId});

    if (targetAlreadyExists) {
        return res.status(400).json({error: 'Submission already exists'});
    }

    await Submission.create(submission);

    console.log('publishing to queue');

    if (!connection.isConnected()) {
        messageBacklog.push(submission);
    } else {
        await channel.publish(exchange, newTargetKey, Buffer.from(JSON.stringify(submission)));
    }

    return res.status(201).json({submission});


})

router.get('/targets/:id/submissions', async (req, res) => {

        const targetId = req.params.id;
        const submissions = await Submission.find({targetId: targetId})

        if (submissions) {
            res.json({status: 200, data: submissions});
        } else {
            res.json({status: 404, error: 'Target not found'});
        }


});

router.get('/submissions/:id', async (req, res) => {

    const submissionId = req.params.id;

    const submission = await Submission.findOne({submissionId: submissionId})


    if (submission) {
        res.json({status: 200, data: submission});
    } else {
        res.json({status: 404, error: 'Target not found'});
    }

})

router.delete('/submissions/:id', async (req, res) => {

    const submissionId = req.params.id;

    const submission = await Submission.deleteOne({submissionId: submissionId})


    if (submission) {
        res.json({status: 200, data: submission});
    } else {
        res.json({status: 404, error: 'Target not found'});
    }

})

export {router as submissionRouter};