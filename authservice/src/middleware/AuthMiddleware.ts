import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.SECRET_KEY) {
    console.error('No secret key found');
    process.exit(1);
}

if (!process.env.API_KEY) {
    console.error('No API key found');
    process.exit(1);
}

const SECRET_KEY = process.env.SECRET_KEY;
const API_KEY = process.env.API_KEY;


// Custom JWT authentication middleware
async function verifyJWT(req: {
    headers: { authorization: any };
    body: { id: any; user_jwt: any };
}, res: Response, next: NextFunction) {
    if (req.body.user_jwt) {
        const userToken = req.body.user_jwt;
        if (!userToken) {
            return res.status(400).json({error: 'No user token provided'});
        }

        return jwt.verify(userToken, SECRET_KEY, async (err: any, decoded: any) => {
            if (err) {
                return res.status(400).json({error: err});
            }

            req.body.id = decoded.id;

            const user = await User.findById(req.body.id);

            if (!user) {
                return res.status(400).json({error: 'User not exists'});
            }

            next();
        });
    }
}

async function generateJWT(req: Request, res: Response) {

    const {email} = req.body;

    const user = await User.findOne({email});

    if (!user) {
        return res.status(400).json({error: 'User not exists'});
    }

    const passwordIsValid = await user.isValidPassword(req.body.password);

    if (!passwordIsValid) {
        return res.status(400).json({error: 'Failed to login, invalid password'});
    }

    const {id, role} = user;

    const userData = {
        id,
        role,
    }

    const newToken = jwt.sign(userData, SECRET_KEY, {expiresIn: '1d'});

    return res.status(200).json(newToken);
}

async function checkApiKey(req: Request, res: Response, next: NextFunction) {
    if (!req.headers) {
        console.log(req.headers);
        return res.status(400).json({error: 'No headers provided'});
    }
    if (!req.headers.authorization) {
        console.log(req.headers.authorization);
        return res.status(400).json({error: 'No token provided'});
    }

    const token = req.headers.authorization?.split(' ')[1]; // Assuming 'Authorization: Bearer <token>'


    return jwt.verify(token, SECRET_KEY, async (err: any, decoded: any) => {
        if (err) {
            console.log("err: " + err);
            return res.status(400).json({error: err});
        }

        if (API_KEY !== decoded.apiKey) {
            return res.status(400).json({error: 'Invalid API Key'});
        }

        next();
    });

}


export {verifyJWT, generateJWT, checkApiKey};
