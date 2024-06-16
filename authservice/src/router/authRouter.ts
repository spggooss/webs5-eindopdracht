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
        await channel.publish(exchange, registrationKey, Buffer.from(JSON.stringify(user)));
    }

    return res.json({status: 201, token: token});


})

//de login doet praktisch hetzelfde als de 'register' route met dat verschil dat het alleen maar
// een nieuwe JWT geeft wanneer de user al bestaat
router.post('/login', generateJWT);

export {router as authRouter};