// @ts-ignore
import express, {Response} from 'express';
import {loginPost, registerPost} from "../services/authService";
import {RequestCustom} from "./types";

const router = express.Router();

interface User {
    email: string,
    password: string,
    role: string
}


/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           description: User's email
 *         password:
 *           type: string
 *           description: User's password
 *         role:
 *           type: string
 *           description: User's role
 *       example:
 *         email: user@example.com
 *         password: password123
 *         role: user
 */

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Successful registration
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "token12345"
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "error message"
 */
//@ts-ignore
router.post('/register', (req: RequestCustom, res: Response) => {
    const user: User = req.body;

    registerPost(user).then(response => {
        console.log(response);
        if (response.status === 201) {
            res.status(response.status).send({token: response.token});
        } else {
            res.status(response.status).send(response.error);
        }        }).catch(e => {
            console.log(e);
            if (e.response.data) {
                res.status(400).json(e.response.data);
            } else if (e.response.status && e.response.details) {
                res.status(400).json(e);
            }
        }
    );

});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "token12345"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               example: "error message"
 */
//@ts-ignore

router.post('/login', (req: RequestCustom, res: Response) => {
    const user: User = req.body;


    loginPost(user).then(response => {
        if (response.status === 404) {
            res.status(404).send(response.error);
        } else if (response.status === 200) {
            console.log(response);
            res.status(response.status).send({token:response.token});
        }
    }).catch(e => {
        console.log(e);
    });
});

export {router as authRouter};