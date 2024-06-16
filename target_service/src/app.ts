import cors from 'cors';
import express from 'express';
import passport from 'passport';
import * as dotenv from 'dotenv';
import passportStrategy from './passport/passport';
import {targetRouter} from "./router/targetRouter";
import connectToDatabase from "./database/mongooseConnection";
import {checkApiKey} from "./middleware/AuthMiddleware";
import {submissionRouter} from "./router/submissionRouter";

dotenv.config();

const app = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3003;

connectToDatabase();

passportStrategy(passport);
app.use(passport.initialize());
app.use(cors())
app.use(express.json({ limit: '200mb' }));

app.use('/', checkApiKey)

app.use(targetRouter)
app.use(submissionRouter)


app.listen(port, () => {
    console.log('Server is up on port ' + port);
})