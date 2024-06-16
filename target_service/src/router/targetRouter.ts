import express from 'express';
import * as dotenv from 'dotenv';
import Target from "../models/Target";
import amqp, {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import vision from '@google-cloud/vision';
import { ParsedQs } from 'qs';
import {CreateTargetValidator} from "../validators/CreateTargetValidator";

import multer from "multer";
import mongoose from "mongoose";

const storage = multer.memoryStorage();
const upload = multer({storage: storage});


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
    location: string,
    date: Date
}


router.post('/targets', upload.single('image'), async (req, res) => {
console.log(req.file)
try {
    const targetData: TargetData = req.body;

    const file = req.file

    if (!file) {
        return res.send({ status: 400, data: {error: 'Image required'}});
    }

    if (!targetData.userId || !req.file || !targetData.location || !targetData.date) {
        return res.status(400).json({error: 'Fill required fields'});
    }

    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.labelDetection(file.buffer);
    const labels = result.labelAnnotations;
    let labelValues: string[] = [];
    if (labels !== undefined && labels !== null) {
        labelValues = labels.map((label) => label.description ?? '');
    }


    const target: Target = {
        userId: targetData.userId,
        image: file.buffer.toString('base64'),
        location: targetData.location,
        date: targetData.date,
        labels: labelValues
    }


    const targetAlreadyExists = await Target.findOne({image: target.image});

    if (targetAlreadyExists) {
        return res.json({status: 400, data: {error: 'Target already exists'}});
    }

    await Target.create(target);

    console.log('publishing to queue');

    if (!connection.isConnected()) {
        messageBacklog.push(target);
    } else {
        await channel.publish(exchange, newTargetKey, Buffer.from(JSON.stringify(target)));
    }

    return res.status(200).json({target});
} catch (e) {
    console.log(e);

}


})


const parseQueryParam = (param: string | string[] | ParsedQs | ParsedQs[] | undefined, defaultValue: string): number => {
    if (Array.isArray(param)) {
        param = param[0];  // Take the first element if it's an array
    }
    if (typeof param === 'object' && param !== null) {
        param = JSON.stringify(param);  // Convert object to string
    }
    if (typeof param === 'string') {
        return parseInt(param, 10);
    }
    return parseInt(defaultValue, 10);  // Use default value if param is null or undefined
};


router.get('/images/:id', async function(req, res) {
    try {

        const target = await Target.findOne({__v: req.params.id });

        if (!target) {
            res.status(404).json({error: 'Target not found'});
            return;
        }


        res.json({status: 200, image: target.image});

    } catch(error) {
        if (error instanceof mongoose.Error.ValidationError) {
            res.json({status: 400, data: error});
            return;
        }
        console.error(error);
    }
});


router.get('/targets', async (req, res) => {


    const location = req.query.location;

    const page = parseQueryParam(req.query.page, '1');
    const limit = parseQueryParam(req.query.limit, '10');

    if(location) {
        if (page && limit) {
            const targets = await Target.find({location: location}).skip((page - 1) * limit).limit(limit).select('_id image location');
            res.json(targets);
        } else {
            const targets = await Target.find({location: location}).select('_id image location');
            res.json(targets);
        }
    } else if (page && limit) {
        const targets = await Target.find().skip((page - 1) * limit).limit(limit).select('_id image location');
        res.json(targets);
    } else {
        const targets = await Target.find().select('_id image location');
        res.json(targets);
    }

})

router.get('/targets/:id', async (req, res) => {

    const targetId = req.params.id;

    const target = await Target.findOne({targetId: targetId})


    if (target) {
        res.status(200).json(target);
    } else {
        res.json({status: 404, error: 'Target not found'});
    }

})

export {router as targetRouter};