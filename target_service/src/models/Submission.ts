import mongoose, { Document, Schema }  from 'mongoose';

export interface LabelAccuracy
{
    label: string,
    score: number
}

interface ISubmission extends Document {
    userId: string;
    image: string;
    labels: LabelAccuracy[];
    date: Date;
    score: number;
    targetUUID: string;
    targetId: number;
    submissionId: number;
}


const submissionSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    image: {type: String, unique: true, required: true},
    labels: { type: [Object]},
    date: {type: Date},
    score: {type: Number},
    targetUUID: {type: String, required:true, ref: 'Target'},
    targetId: {type: Number},
    submissionId: {type: Number, unique: true}
})


submissionSchema.pre<ISubmission>('save', async function (next) {
    const doc = this;
    try {
        if (!doc.isNew) {
            return next();
        }

        // Find the max targetId in the collection
        const maxSubmission = await Submission.findOne({}, {}, { sort: { 'submissionId': -1 } });

        // Set the new targetId to one greater than the current max
        doc['submissionId'] = maxSubmission ? maxSubmission.submissionId + 1 : 1;

        next();
    } catch (err) {
        // @ts-ignore
        return next(err);
    }
});


const Submission = mongoose.model<ISubmission>('Submission', submissionSchema);
export default Submission;