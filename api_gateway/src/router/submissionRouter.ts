import express, {NextFunction, Response} from 'express';
import multer from "multer";
import {addSubmission, deleteSubmissionById, getTargetById, getTargets} from "../services/targetService";
import {hasSubmissionOwnership, hasTargetOwnership, isLoggedIn} from "../middleware/authMiddleware";
import {RequestCustom} from "./types";

const api_url = process.env.API_URL || 'http://localhost:3000';
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
//@ts-ignore
router.get('/targets/:id/submissions', isLoggedIn, hasTargetOwnership, (req: Request, res: Response, next: NextFunction) => {
    getTargets(req)
        .then(targets => {
            res.json(targets);
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
//@ts-ignore

router.post('/submissions', upload.single('image'), isLoggedIn, (req: RequestCustom, res: Response) => {
    const file = req.file;
    console.log(file);

    if (!file) {
        return res.status(400).send({ error: 'Image required' });
    }

    const blob = new Blob([file.buffer], { type: file.mimetype });
    const form = new FormData();

    form.append('target_id', req.body.target_id);
    form.append('image', blob, file.originalname);

    addSubmission(req, form)
        .then(response => {
            if (response.status === 201) {
                const submission = response.data
                res.send(submission);
            } else {
                res.status(response.status).send({error: response.error});
            }
        })
        .catch(e => {
            console.log(e);
            res.status(400).send(e);
        });
});

// @ts-ignore
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
router.delete('/submissions/:id',
    //@ts-ignore
    isLoggedIn,
    hasSubmissionOwnership,
    (req: Request, res: Response) => {
        deleteSubmissionById(req)
            .then(response => {
                if (response.status === 200) {
                    const message = response.data.message;
                    res.send({message});
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
