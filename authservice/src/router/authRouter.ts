import express from 'express';
import * as dotenv from 'dotenv';
import {generateJWT} from '../middleware/AuthMiddleware';
import User from "../models/User";
import {CreateUserValidator} from "../validators/CreateUserValidator";
import jwt from "jsonwebtoken";
import amqp, {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import {ConfirmChannel} from "amqplib";

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

const registrationKey = 'contest.registration';

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
                await channel.publish(exchange, registrationKey, Buffer.from(JSON.stringify(messageBacklog[0])));
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
//De gebruiker ontvangt hier een register json object omdat de user nog niet bekend is
//in het systeem
router.get('/register', (req, res) => {
    res.json({
        email: "geef hier uw email adres",
        password: "voer hier uw wachtwoord in",
    })
})

//gebruiker wordt geregistreerd en ontvangt een JWT
//Daarmee is de gebruiker automatisch ingelogd
router.post('/register', CreateUserValidator, async (req, res) => {
    const userData = req.body;

    if (!userData.email || !userData.password || !userData.role) {
        return res.status(400).json({error: 'Fill required fields'});
    }
    const user: User = {
        email: userData.email,
        password: userData.password,
        role: userData.role,
    }


    const userAlreadyExists = await User.findOne({email: userData.email});

    if (userAlreadyExists) {
        return res.status(400).json({error: 'User already exists'});
    }

    const {id} = await User.create(user);

    const token = jwt.sign({id}, SECRET_KEY, {expiresIn: '1d'});

    console.log('publishing to queue');

    if (!connection.isConnected()) {
        messageBacklog.push(user);
    } else {
        await channel.publish(exchange, registrationKey, Buffer.from(JSON.stringify(user)));
    }

    return res.status(201).json({token});


})

//de login doet praktisch hetzelfde als de 'register' route met dat verschil dat het alleen maar
// een nieuwe JWT geeft wanneer de user al bestaat
router.post('/login', generateJWT);

export {router as authRouter};