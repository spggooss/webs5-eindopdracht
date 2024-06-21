import express, {Request, Response} from 'express';
import * as dotenv from 'dotenv';
import Target, {LabelAccuracy} from "../models/Target";
import amqp, {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import vision from '@google-cloud/vision';

import { ParsedQs } from 'qs';
import {CreateTargetValidator} from "../validators/CreateTargetValidator";

import multer from "multer";
import mongoose from "mongoose";
import {ConfirmChannel, ConsumeMessage} from "amqplib";
import Submission from "../models/Submission";

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
const timerMessageBacklog: any[] = [];
const submissionTargetMessageBacklog: any[] = [];



let submissionTargetChannel: ChannelWrapper, timerChannel: ChannelWrapper, contestEndedChannel: ChannelWrapper, connection: AmqpConnectionManager;

const submissionTargetExchange = 'submissionTargetQueue';
const timerExchange = 'timerQueue';

const newTargetKey = 'target.new';

const contestEndedExchange = 'contestEndedQueue';
export const contestEndedKey = 'contest.end';

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
        timerChannel = connection.createChannel({
            setup: async function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(timerExchange, {durable: true});
            },
        })
        contestEndedChannel = connection.createChannel({
            setup: async function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(contestEndedExchange, {durable: true});
            },
        })
        submissionTargetChannel = connection.createChannel({
            setup: async function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(submissionTargetExchange, {durable: true});
            },
        })

        await contestEndedChannel.addSetup(function (channel: ConfirmChannel) {
            channel.bindQueue(timerExchange, timerExchange, contestEndedKey);
        });

        await contestEndedChannel.consume(timerExchange, onMessage, {
            noAck: true
        });

        connection.on('connect', async () => {
            console.log('Publishing backlog to queue');
            while (submissionTargetMessageBacklog.length > 0) {
                await submissionTargetChannel.publish(submissionTargetExchange, newTargetKey, Buffer.from(JSON.stringify(submissionTargetMessageBacklog[0])));
                submissionTargetMessageBacklog.shift();
            }
            while (timerMessageBacklog.length > 0) {
                await timerChannel.publish(timerExchange, newTargetKey, Buffer.from(JSON.stringify(timerMessageBacklog[0])));
                timerMessageBacklog.shift();
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
    labels: { label: string; score: number; }[]
}

interface TargetData {
    user_id: string,
    location: string,
    date: Date
}


router.post('/targets', upload.single('image'), CreateTargetValidator, async (req, res) => {
try {
    const targetData: TargetData = req.body;

    const file = req.file

    if (!file) {
        return res.json({ status: 400, data: {error: 'Image required'}});
    }

    if (!targetData.user_id || !req.file || !targetData.location || !targetData.date) {
        return res.json({status: 400, error: 'Fill required fields'});
    }

    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.labelDetection(file.buffer);
    const labels = result.labelAnnotations;
    let labelValues: LabelAccuracy[] = [];
    if (labels !== undefined && labels !== null) {
        labelValues = labels.map((label) => {return {label: label.description ?? '', score: label.score ?? 0}});
    }


    const target: Target = {
        userId: targetData.user_id,
        image: file.buffer.toString('base64'),
        location: targetData.location,
        date: targetData.date,
        labels: labelValues
    }


    const targetAlreadyExists = await Target.findOne({image: target.image});

    if (targetAlreadyExists) {
        return res.json({status: 400, data: {error: 'Target already exists'}});
    }

    const targetModel = await Target.create(target);


    console.log('publishing to queue');

    const targetModelData = {
        targetUUID: targetModel._id,
        userId: targetModel.userId,
        date: targetModel.date,
        targetId: targetModel.targetId
    }

    if (!connection.isConnected()) {
        submissionTargetMessageBacklog.push(targetModelData);
        timerMessageBacklog.push(targetModelData);
    } else {

        await timerChannel.publish(timerExchange, newTargetKey, Buffer.from(JSON.stringify(targetModelData)));
        await submissionTargetChannel.publish(submissionTargetExchange, newTargetKey, Buffer.from(JSON.stringify(targetModelData)));
    }


    const targetResponse = {
        _id: targetModel._id,
        location: targetModel.location,
        date: targetModel.date,
        targetId: targetModel.targetId
    }
    return res.json({status: 200, data: targetResponse});
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
            res.json({status: 400, error: 'Target not found'});
            return;
        }


        res.json({status: 200, data: target.image});

    } catch(error) {
        if (error instanceof mongoose.Error.ValidationError) {
            res.json({status: 400, data: error});
            return;
        }
        console.error(error);
    }
});

router.get('/targets/:id', async (req, res) => {

    const targetId = req.params.id;

    const target = await Target.findOne({targetId: targetId})



    if (target) {
        const targetData = {
            _id: target._id,
            location: target.location,
            date: target.date,
        }
        res.json({status: 200, data: targetData});
    } else {
        res.json({status: 404, error: 'Target not found'});
    }

})

router.delete('/targets/:id', async (req, res) => {

    const targetId = req.params.id;
    console.log(targetId);
try {
    const deleteResult = await Target.deleteOne({targetId: targetId})


    if (deleteResult.deletedCount === 1) {
        res.json({status: 200, data: {message: 'Target deleted'}});
    } else {
        res.json({status: 404, error: 'Target not found'});
    }
} catch (e) {
    console.log(e);
    res.json({status: 404, error: 'Target not found'});
}

})


router.get('/targets', async (req, res) => {

    const location = req.query.location;

    const page = parseQueryParam(req.query.page, '1');
    const limit = parseQueryParam(req.query.limit, '10');

    if(location) {
        if (page && limit) {
            const targets = await Target.find({location: location}).skip((page - 1) * limit).limit(limit).select('_id location date targetId');
            const targetData = targets.map((target) => {
                return {
                    _id: target._id,
                    location: target.location,
                    date: target.date,
                    targetId: target.targetId
                }
            });
            res.json({status: 200, data: targetData});
        } else {
            const targets = await Target.find({location: location}).select('_id location date targetId');
            const targetData = targets.map((target) => {
                return {
                    _id: target._id,
                    location: target.location,
                    date: target.date,
                    targetId: target.targetId
                }
            });
            res.json({status: 200, data: targetData});        }
    } else if (page && limit) {
        const targets = await Target.find().skip((page - 1) * limit).limit(limit).select('_id location date targetId');
        const targetData = targets.map((target) => {
            return {
                _id: target._id,
                location: target.location,
                date: target.date,
                targetId: target.targetId
            }
        });
        res.json({status: 200, data: targetData});    } else {
        const targets = await Target.find().select('_id location date targetId');
        const targetData = targets.map((target) => {
            return {
                _id: target._id,
                location: target.location,
                date: target.date,
                targetId: target.targetId
            }
        });
        res.json({status: 200, data: targetData});
    }

})

interface ContestEndedMessage {
    targetId: number;
}

export const onMessage = async (msg: ConsumeMessage) => {
    console.log('Received message');
    if (msg === null) {
        return;
    }
    console.log(`Received message: ${msg.content.toString()}`);
    const queueMessage: ContestEndedMessage = JSON.parse(msg.content.toString());
    switch (msg.fields.routingKey) {
        case contestEndedKey:
            const submissions = await Submission.find({targetId: queueMessage.targetId});



            break;
    }

}

export {router as targetRouter};