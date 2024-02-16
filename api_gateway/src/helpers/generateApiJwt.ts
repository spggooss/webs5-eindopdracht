import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.SECRET_KEY) {
    console.error('No secret key found');
    process.exit(1);
}


if (!process.env.AUTH_SERVICE_API_KEY) {
    console.error('No API key found');
    process.exit(1);
}

const AUTH_SERVICE_API_KEY = process.env.AUTH_SERVICE_API_KEY;
const SECRET_KEY = process.env.SECRET_KEY;


function generateJWT() {

    return jwt.sign({AUTH_SERVICE_API_KEY}, SECRET_KEY, {expiresIn: '1d'});
}

export {generateJWT};