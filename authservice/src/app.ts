import cors from 'cors';
import express from 'express';
import passport from 'passport';
import * as dotenv from 'dotenv';
import passportStrategy from './passport/passport';
import {authRouter} from "./router/authRouter";
import connectToDatabase from "./database/mongooseConnection";
import {checkApiKey} from "./middleware/AuthMiddleware";

dotenv.config();

const app = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3001;

connectToDatabase();

passportStrategy(passport);
app.use(passport.initialize());
app.use(cors())
app.use(express.json());

app.use('/', checkApiKey)

app.use(authRouter)


app.listen(port, () => {
    console.log('Server is up on port ' + port);
})