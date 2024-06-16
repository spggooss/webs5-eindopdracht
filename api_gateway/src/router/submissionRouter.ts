import express from 'express';
import multer from "multer";
import { addTarget, getTargetById, getTargets } from "../services/targetService";
import { hasTargetOwnership, isLoggedIn } from "../middleware/authMiddleware";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Submission:
 *       type: object
 *       required:
 *         - location
 *         - date
 *         - image
 *       properties:
 *         location:
 *           type: string
 *           description: Submission's location
 *         date:
 *           type: string
 *           format: date
 *           description: Date of the submission
 *         image:
 *           type: string
 *           format: binary
 *           description: Submission's image
 *       example:
 *         location: "New York"
 *         date: "2024-06-15"
 */

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Submissions management API
 */

/**
 * @swagger
 * /targets/{id}/submissions:
 *   get:
 *     summary: Get submissions for a target
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The target ID
 *     responses:
 *       200:
 *         description: List of submissions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Bad request
 */
router.get('/targets/:id/submissions', isLoggedIn, hasTargetOwnership, (req, res) => {
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
 * /submissions:
 *   post:
 *     summary: Create a new submission
 *     tags: [Submissions]
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
 *         description: Submission created successfully
 *       400:
 *         description: Bad request
 */
router.post('/submissions', upload.single('image'), isLoggedIn, (req, res) => {
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
 * /submissions/{id}:
 *   delete:
 *     summary: Delete submission by ID
 *     tags: [Submissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The submission ID
 *     responses:
 *       200:
 *         description: Submission deleted successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Submission not found
 */
router.delete('/submissions/:id', isLoggedIn, (req, res) => {
    getTargetById(req)
        .then(response => {
            if (response.status === 404) {
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

export { router as submissionsRouter };
