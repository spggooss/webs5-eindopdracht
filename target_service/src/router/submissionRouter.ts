import * as dotenv from 'dotenv';
import amqp, {AmqpConnectionManager, ChannelWrapper} from "amqp-connection-manager";
import vision from '@google-cloud/vision';
import Submission, {LabelAccuracy} from "../models/Submission";
import express, {Request, Response} from "express";
import Target from "../models/Target";
import multer from "multer";


const storage = multer.memoryStorage();
const upload = multer({storage: storage});

const router = express.Router();

dotenv.config();

if (!process.env.SECRET_KEY) {
    console.error('No secret key found');
    process.exit(1);
}

if (!process.env.RABBITMQ_URL) {
    console.error('No RabbitMQ URL found');
    process.exit(1);
}

const rabbitMQUrl: string = process.env.RABBITMQ_URL;
const messageBacklog: any[] = [];


let channel: ChannelWrapper, connection: AmqpConnectionManager;

const exchange = 'submissionTargetQueue';

const newSubmissionKey = 'submission.new';

async function connectQueue() {
    try {
        connection = amqp.connect(rabbitMQUrl, {heartbeatIntervalInSeconds: 4});
        connection.on('error', (err) => {
            console.log(`Error: ${err.message}`);
        });

        connection.on('disconnect', (params) => {
            console.log('Disconnected from queue');
        });
        connection.on('close', () => {
            console.log('Connection closed');
        });
        channel = connection.createChannel()

        connection.on('connect', async () => {
            console.log('Publishing backlog to queue');
            while (messageBacklog.length > 0) {
                await channel.publish(exchange, newSubmissionKey, Buffer.from(JSON.stringify(messageBacklog[0])));
                messageBacklog.shift();
            }
        });

    } catch (error) {
        console.log(error)
    }
}

connectQueue().then(r => console.log('connected to queue')).catch(e => console.log(e));


interface Submission {
    targetId: number,
    image: string,
    userId: string,
    labels: LabelAccuracy[],
    score: number
    targetUUID: string,
}

interface SubmissionData {
    target_id: number,
    user_id: string,
}
router.post('/submissions', upload.single('image'), async (req: Request, res: Response) => {

    const submissionData: SubmissionData = req.body;

    if (!req.body.user_id || !submissionData.target_id) {
        return res.json({status: 400, error: 'Fill required fields'});
    }

    const file = req.file

    if (!file) {
        return res.json({ status: 400, data: {error: 'Image required'}});
    }

    const target = await Target.findOne({targetId: submissionData.target_id});

    if (!target) {
        return res.json({status: 404, error: 'Target not found'});
    }

    if(target.date < new Date()) {
        return res.json({status: 400, error: 'Target has expired'});
    }

    const imageString = file.buffer.toString('base64');
    const submissionAlreadyExists = await Submission.findOne({
        $or: [
            { image: imageString },
            {
                $and: [
                    { userId: submissionData.user_id },
                    { targetId: submissionData.target_id }
                ]
            }
        ]
    });

    if (submissionAlreadyExists) {
        return res.json({status: 400, error: 'Submission already exists'});
    }

    const client = new vision.ImageAnnotatorClient();

    const [result] = await client.labelDetection(file.buffer);
    const labels = result.labelAnnotations;
    let labelValues: LabelAccuracy[] = [];
    if (labels !== undefined  && labels !== null) {
        labelValues = labels.map((label) => {return {label: label.description ?? '', score: label.score ?? 0}});
    }

    const targetLabels = target?.labels.map((label) => {
        return {label: label.label, score: label.score};
    }) ?? [];

    const submissionLabels = labelValues.map((label) => {
        return {label: label.label, score: label.score};
    });


    const score = calculateSimilarityScore(targetLabels, submissionLabels);

    console.log('Score:', score);

    const submission: Submission = {
        userId: submissionData.user_id,
        image: imageString,
        targetId: submissionData.target_id,
        labels: submissionLabels,
        targetUUID: target?._id,
        score: score
    }


    const submissionModel = await Submission.create(submission);

    console.log('publishing to queue');

    const submissionResponse = {
        _id: submissionModel._id,
        targetId: submissionModel.targetId,
        userId: submissionModel.userId,
        submissionId: submissionModel.submissionId,
        score: submissionModel.score
    }

    if (!connection.isConnected()) {
        messageBacklog.push(submissionResponse);
    } else {
        await channel.publish(exchange, newSubmissionKey, Buffer.from(JSON.stringify(submissionResponse)));
    }

    return res.json({status: 201, data: submissionResponse});


})

function calculateSimilarityScore(origLabels: LabelAccuracy[], newLabels: LabelAccuracy[]): number {
    let totalScore = 0.0;
    let maxPossibleScore = 0.0;

    // Create a map of the original labels with their accuracy
    const origLabelMap = new Map<string, number>();
    for (const { label, score } of origLabels) {
        origLabelMap.set(label, score);
        maxPossibleScore += score * score;  // assume max score when matched perfectly
    }

    for (const { label, score: newAccuracy } of newLabels) {
        if (origLabelMap.has(label)) {
            const origAccuracy = origLabelMap.get(label)!;
            // Calculate the score for this label
            const labelScore = origAccuracy * newAccuracy;
            totalScore += labelScore;
        }
    }

    // Normalize the score to a range of 1-100
    return maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
}

router.get('/targets/:id/submissions', async (req, res) => {

        const targetId = req.params.id;
        const submissions = await Submission.find({targetId: targetId})

        const submissionResponse = submissions.map((submission) => {
            return {
                _id: submission._id,
                targetId: submission.targetId,
                userId: submission.userId,
                submissionId: submission.submissionId,
                score: submission.score
            }
        });

        if (submissions) {
            res.json({status: 200, data: submissionResponse});
        } else {
            res.json({status: 404, error: 'Target not found'});
        }


});

router.get('/submissions/:id', async (req, res) => {

    const submissionId = req.params.id;

    const submission = await Submission.findOne({submissionId: submissionId})


    if (submission) {
        res.json({status: 200, data: submission});
    } else {
        res.json({status: 404, error: 'Target not found'});
    }

})

router.delete('/submissions/:id', async (req, res) => {

    const submissionId = req.params.id;
    try {
        const deleteResult = await Submission.deleteOne({submissionId: submissionId})


        if (deleteResult.deletedCount === 1) {
            res.json({status: 200, data: {message: 'Submission deleted'}});
        } else {
            res.json({status: 404, error: 'Submission not found'});
        }
    } catch (e) {
        console.log(e);
        res.json({status: 404, error: 'Submission not found'});
    }
})

router.delete('/targets/:id/submissions', async (req, res) => {

    const targetId = req.params.id;

    const submission = await Submission.deleteMany({targetId: targetId})


    if (submission) {
        res.json({status: 200, data: submission});
    } else {
        res.json({status: 404, error: 'Target not found'});
    }

})

export {router as submissionRouter};