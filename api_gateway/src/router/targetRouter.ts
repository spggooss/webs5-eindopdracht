import express from 'express';
import passport from "passport";
import multer from "multer";
import { addTarget, deleteTargetById, getImageByTargetId, getTargetById, getTargets } from "../services/targetService";
import { isLoggedIn } from "../middleware/authMiddleware";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Target:
 *       type: object
 *       required:
 *         - location
 *         - date
 *         - image
 *       properties:
 *         location:
 *           type: string
 *           description: Target's location
 *         date:
 *           type: string
 *           format: date
 *           description: Date of the target
 *         image:
 *           type: string
 *           format: binary
 *           description: Target's image
 *       example:
 *         location: "New York"
 *         date: "2024-06-15"
 */

/**
 * @swagger
 * tags:
 *   name: Target
 *   description: Target management API
 */

/**
 * @swagger
 * /targets:
 *   get:
 *     summary: Get all targets
 *     tags: [Target]
 *     responses:
 *       200:
 *         description: List of targets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Target'
 *       400:
 *         description: Bad request
 */
router.get('/targets', isLoggedIn, (req, res) => {
    console.log(req.user);

    getTargets(req)
        .then(targets => {
            res.send(targets);
        })
        .catch(e => {
            res.status(400).send(e);
        });
});

/**
 * @swagger
 * /targets/{id}:
 *   get:
 *     summary: Get target by ID
 *     tags: [Target]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The target ID
 *     responses:
 *       200:
 *         description: Target found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Target'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Target not found
 */
router.get('/targets/:id', isLoggedIn, (req, res) => {
    getTargetById(req)
        .then(response => {
            if (response.status === 200) {
                const target = JSON.parse(response.data);
                res.send(target);
            } else {
                const error = response.error;
                res.status(response.status).send({ error });
            }
        })
        .catch(e => {
            console.log(e);
            res.status(400).send(e);
        });
});

/**
 * @swagger
 * /targets:
 *   post:
 *     summary: Create a new target
 *     tags: [Target]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               location:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Target created successfully
 *       400:
 *         description: Bad request
 */
router.post('/targets', upload.single('image'), isLoggedIn, (req, res) => {
    const file = req.file;

    if (!file) {
        return res.status(400).send({ error: 'Image required' });
    }

    const blob = new Blob([file.buffer], { type: file.mimetype });
    const form = new FormData();

    form.append('location', req.body.location);
    form.append('date', req.body.date);
    form.append('image', blob, file.originalname);

    addTarget(req, form)
        .then(response => {
            if (response.status === 404) {
                const target = JSON.parse(response.data);
                res.send(target);
            } else {
                res.status(response.status).send(response.data);
            }
        })
        .catch(e => {
            console.log(e);
            res.status(400).send(e);
        });
});

/**
 * @swagger
 * /targets/{id}:
 *   delete:
 *     summary: Delete target by ID
 *     tags: [Target]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The target ID
 *     responses:
 *       200:
 *         description: Target deleted successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Target not found
 */
router.delete('/targets/:id', isLoggedIn, (req, res) => {
    deleteTargetById(req)
        .then(response => {
            if (response.status === 200) {
                const target = JSON.parse(response.data);
                res.send(target);
            } else {
                res.status(response.status).send(response.error);
            }
        })
        .catch(e => {
            console.log(e);
            res.status(400).send(e);
        });
});

/**
 * @swagger
 * /images/{id}:
 *   get:
 *     summary: Get image by target ID
 *     tags: [Target]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The target ID
 *     responses:
 *       200:
 *         description: Image retrieved successfully
 *         content:
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request
 *       404:
 *         description: Image not found
 */
router.get('/images/:id', isLoggedIn, (req, res) => {
    getImageByTargetId(req)
        .then(response => {
            if (response.status === 404) {
                const target = JSON.parse(response.data);
                res.send(target);
            } else {
                const img = Buffer.from(response.image, 'base64');
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Content-Length': img.length,
                });
                res.end(img);
            }
        })
        .catch(e => {
            console.log(e);
            res.status(400).send(e);
        });
});

export { router as targetRouter };
