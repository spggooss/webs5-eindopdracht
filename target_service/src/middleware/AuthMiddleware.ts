import {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
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

async function checkApiKey(req: Request, res: Response, next: NextFunction) {
    if (!req.headers) {
        console.log(req.headers);
        return res.status(400).json({error: 'No headers provided'});
    }
    if (!req.headers.authorization) {
        console.log(req.headers.authorization);
        return res.status(400).json({error: 'No token provided'});
    }

    const token = req.headers.authorization;

    return jwt.verify(token, SECRET_KEY, async (err: any, decoded: any) => {
        if (err) {
            console.log("err: " + err);
            return res.status(400).json({error: err});
        }

        if (API_KEY !== decoded.TARGET_SERVICE_API_KEY) {
            return res.status(400).json({error: 'Invalid API Key'});
        }

        next();
    });

}


export {checkApiKey};
