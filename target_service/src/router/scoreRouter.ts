import Submission from "../models/Submission";
//@ts-ignore
import express, {Request, Response} from "express";

const router = express.Router();

router.get('/submissions/:id', async (req: Request, res: Response) => {

    const submissionId = req.params.id;

    const submission = await Submission.findOne({submissionId: submissionId})


    if (submission) {
        res.json({status: 200, data: submission});
    } else {
        res.json({status: 404, error: 'Target not found'});
    }

})