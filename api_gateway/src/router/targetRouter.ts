// @ts-ignore
import express from 'express';
import {loginPost, registerPost} from "../services/authService";
// @ts-ignore
import passport from "passport";
import {getTargets} from "../services/targetService";

const router = express.Router();

router.get('/targets', passport.authenticate('jwt', {session: false}), (req, res) => {

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


export {router as targetRouter};