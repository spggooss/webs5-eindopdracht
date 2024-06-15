// @ts-ignore
import cors from 'cors';
// @ts-ignore
import express from 'express';
// @ts-ignore
import passport from 'passport';
import {getTargets} from './services/targetService';

import * as dotenv from 'dotenv';
import {router} from "./router/router";
dotenv.config();

const app = express();
const port: number = process.env.APIGATEWAYPORT ? parseInt(process.env.APIGATEWAYPORT) : 3000;


app.use(passport.initialize());
app.use(cors())
app.use(express.json());


app.use(router)


app.listen(port, () => {
    console.log('Server is up on port ' + port);
})