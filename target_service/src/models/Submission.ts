import mongoose from 'mongoose';
import {AutoIncrementSimple} from "@typegoose/auto-increment";


const submissionSchema = new mongoose.Schema({
    _id: {required: true, type: mongoose.Types.ObjectId},
    userId: {type: String, required: true},
    image: {type: String, unique: true, required: true},
    labels: {type: Array, unique: true},
    date: {type: Date},
    score: {type:Number},
    targetUUID: {type: String, ref: 'Target'},
    targetId: {type: Number},
    submissionId: {type: Number, unique: true}
})

submissionSchema.plugin(AutoIncrementSimple, [{field: 'submissionId'}]);


const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;