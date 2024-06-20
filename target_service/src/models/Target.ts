import mongoose, { Document, Schema } from 'mongoose';

// Define an interface representing a document in MongoDB

export interface LabelAccuracy
{
    label: string,
    score: number
}


export interface ITarget extends Document {
    userId: string;
    image: string;
    location: string;
    labels: LabelAccuracy[];
    date: Date;
    targetId: number;
}

// Define the schema
const targetSchema: Schema<ITarget> = new Schema({
    userId: { type: String, required: true },
    image: { type: String, unique: true, required: true },
    location: { type: String, required: true },
    labels: { type: [Object]},
    date: { type: Date, required: true },
    targetId: { type: Number, unique: true },
});

// Custom plugin function for auto-increment
targetSchema.pre<ITarget>('save', async function (next) {
    const doc = this;
    try {
        if (!doc.isNew) {
            return next();
        }

        // Find the max targetId in the collection
        const maxTarget = await Target.findOne({}, {}, { sort: { 'targetId': -1 } });

        // Set the new targetId to one greater than the current max
        doc['targetId'] = maxTarget ? maxTarget.targetId + 1 : 1;

        next();
    } catch (err) {
        // @ts-ignore
        return next(err);
    }
});


const Target = mongoose.model<ITarget>('Target', targetSchema);
export default Target;


