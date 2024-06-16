// @ts-ignore
import express from 'express';
import {loginPost, registerPost} from "../services/authService";
// @ts-ignore
import passport from "passport";
import {addTarget, deleteTargetById, getImageByTargetId, getTargetById, getTargets} from "../services/targetService";
import {isLoggedIn} from "../middleware/authMiddleware";

import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const router = express.Router();

router.get('/targets',isLoggedIn, (req, res) => {

    console.log(req.user)

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
})

router.get('/targets/:id', isLoggedIn, (req, res) => {

    getTargetById(req).then((response) => {
        if (response.status === 200) {
            const target = JSON.parse(response.data);
            res.send(target);
        } else {
            const error = response.error
            res.status(response.status).send({error});
        }
    }).catch((e) => {
        console.log(e)
        res.status(400).send(e);
    })
    /*inmiddels weten we hier dat de user bekend is in het systeem
     *Nu moet er gekeken worden of deze user deze route mag aanroepen
     *Wanneer dat het geval is mag bijv. de **circuitBreaker.fire()** methode aangeroepen
     *worden die vervolgens het endpoint aanroept van de microservice.
     *Om de enpoint van de postService microservice aan te roepen, kun je bijv. axios gebruiken
    */
})

router.post('/targets', upload.single('image'), isLoggedIn, (req, res) => {


    const file = req.file

    if (!file) {
        return res.status(400).send({error: 'Image required'});
    }

    const blob = new Blob([file.buffer], {type: file.mimetype});

    const form = new FormData();

    form.append('location', req.body.location);
    form.append('date', req.body.date);
    form.append('image', blob, file.originalname);


    addTarget(req, form).then((response) => {
        if (response.status === 404) {
            const target = JSON.parse(response.data);
            res.send(target);
        } else {
            res.status(response.status).send(response.data);
        }
    }).catch((e) => {
        console.log(e)
        res.status(400).send(e);
    })
})

router.delete('/targets/:id', isLoggedIn, (req, res) => {

    getTargetById(req).then((response) => {
        if (response.status === 404) {
            const target = JSON.parse(response.data);
            res.send(target);
        } else {
            res.status(response.status).send(response.error);
        }
    }).catch((e) => {
        console.log(e)
        res.status(400).send(e);
    })
})

router.get('/images/:id', isLoggedIn, (req, res) => {

    getImageByTargetId(req).then((response) => {

        if (response.status === 404) {
            const target = JSON.parse(response.data);
            res.send(target);
        } else {
            const img = Buffer.from(response.image, 'base64');
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
            });
            res.end(img);
        }
    }).catch((e) => {
        console.log(e)
        res.status(400).send(e);
    })
    /*inmiddels weten we hier dat de user bekend is in het systeem
     *Nu moet er gekeken worden of deze user deze route mag aanroepen
     *Wanneer dat het geval is mag bijv. de **circuitBreaker.fire()** methode aangeroepen
     *worden die vervolgens het endpoint aanroept van de microservice.
     *Om de enpoint van de postService microservice aan te roepen, kun je bijv. axios gebruiken
    */
})

router.delete('/targets/:id', isLoggedIn, (req, res) => {

        deleteTargetById(req).then((response) => {
            if (response.status === 404) {
                const target = JSON.parse(response.data);
                res.send(target);
            } else {
                res.status(response.status).send(response.error);
            }
        }).catch((e) => {
            console.log(e)
            res.status(400).send(e);
        })
});


export {router as targetRouter};