import express from 'express';
import * as dotenv from 'dotenv';
import {generateJWT} from '../middleware/AuthMiddleware';
import User from "../models/User";
import {CreateUserValidator} from "../validators/CreateUserValidator";
import jwt from "jsonwebtoken";
import amqp, {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import {ConfirmChannel} from "amqplib";
import userTarget from "../models/userTarget";
import {onMessage} from "../services/rabbitMQ";

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


let emailChannel: ChannelWrapper, submissionTargetChannel: ChannelWrapper, connection: AmqpConnectionManager;

const emailExchange = 'emailQueue';
const submissionTargetExchange = 'submissionTargetQueue';


const registrationKey = 'user.registration';
export const newTargetKey = 'target.new';
export const newSubmissionKey = 'submission.new';

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
        emailChannel = connection.createChannel({
            setup: async function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(emailExchange, {durable: true});
            },
        })

        submissionTargetChannel = connection.createChannel({
            setup: async function (channel: ConfirmChannel) {
                // `channel` here is a regular amqplib `ConfirmChannel`.
                // Note that `this` here is the channelWrapper instance.
                return channel.assertQueue(submissionTargetExchange, {durable: true});
            },
        })

        await submissionTargetChannel.addSetup(function (channel: ConfirmChannel) {
            channel.bindQueue(submissionTargetExchange, submissionTargetExchange, newTargetKey);
            channel.bindQueue(submissionTargetExchange, submissionTargetExchange, newSubmissionKey);
        });

        await submissionTargetChannel.consume(submissionTargetExchange, onMessage, {
            noAck: true
        });

        connection.on('connect', async () => {
            while (messageBacklog.length > 0) {
                console.log('Publishing backlog to queue');
                await emailChannel.publish(emailExchange, registrationKey, Buffer.from(JSON.stringify(messageBacklog[0])));
                messageBacklog.shift();
            }
        });

    } catch (error) {
        console.log(error)
    }
}

interface User {
    email: string,
    password: string,
    role: string
}

connectQueue().then(r => console.log('connected to queue')).catch(e => console.log(e));


router.get('/register', (req, res) => {
    res.json({
        email: "geef hier uw email adres",
        password: "voer hier uw wachtwoord in",
        role: "geef hier uw rol in"
    })
})

//gebruiker wordt geregistreerd en ontvangt een JWT
//Daarmee is de gebruiker automatisch ingelogd
router.post('/register', CreateUserValidator, async (req, res) => {
    const userRegisterData = req.body;

    if (!userRegisterData.email || !userRegisterData.password || !userRegisterData.role) {
        return res.json({status: 400, error: 'Fill required fields'});
    }
    const user: User = {
        email: userRegisterData.email,
        password: userRegisterData.password,
        role: userRegisterData.role,
    }


    const userAlreadyExists = await User.findOne({email: userRegisterData.email});

    if (userAlreadyExists) {
        return res.json({status: 400, error: 'User already exists'});
    }

    const {id, role, targets} = await User.create(user);

    const userData = {
        id,
        role,
        targets
    }

    const token = jwt.sign(userData, SECRET_KEY, {expiresIn: '1d'});

    console.log('publishing to queue');

    if (!connection.isConnected()) {
        messageBacklog.push(user);
    } else {
        await emailChannel.publish(emailExchange, registrationKey, Buffer.from(JSON.stringify(user)));
    }

    return res.json({status: 201, token: token});


})

//de login doet praktisch hetzelfde als de 'register' route met dat verschil dat het alleen maar
// een nieuwe JWT geeft wanneer de user al bestaat
router.post('/login', generateJWT);


router.get('/user-targets/:id', async (req, res) => {
    const userId = req.params.id;

    const userTargets = await userTarget.find({userId: userId});

    if (userTargets) {
        return res.json({status: 200, data: userTargets});
    } else {
        return res.json({status: 404, error: 'No targets found'});
    }
});

export {router as authRouter};