// @ts-ignore
import express from 'express';
import {loginPost, registerPost} from "../services/authService";

const router = express.Router();

interface User {
    email: string,
    password: string,
}

router.post('/register', (req, res) => {
    const user: User = req.body;

    registerPost(user).then(r => {
        res.json({token: r})
    }).catch(e => {
            console.log(e);
            if (e.response.data) {
                res.status(400).json(e.response.data);
            } else if (e.response.status && e.response.details) {
                res.status(400).json(e);
            }
        }
    );

});

router.post('/login', (req, res) => {
    const user: User = req.body;

    loginPost(user).then(r => {
        res.json({token: r})
    }).catch(e => {
        console.log(e);
        if (e.response.data) {
            res.status(400).json(e.response.data);
        } else if (e.response.status && e.response.details) {
            res.status(400).json(e);
        }
    });
});

export {router as authRouter};