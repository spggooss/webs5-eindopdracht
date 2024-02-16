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


//Een route waar authorisatie op zit
app.get('/targets', passport.authenticate('jwt', {session: false}), (req, res) => {

    getTargets(req).then((targets) => {
        res.send(targets);
    }).catch((e) => {
        res.status(400).send(e);
    })
    /*inmiddels weten we hier dat de user bekend is in het systeem
     *Nu moet er gekeken worden of deze user deze route mag aanroepen
     *Wanneer dat het geval is mag bijv. de **circuitBreaker.fire()** methode aangeroepen
     *worden die vervolgens het endpoint aanroept van de microservice.
     *Om de enpoint van de postService microservice aan te roepen, kun je bijv. axios gebruiken
    */
    res.send('welkom')
})

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})