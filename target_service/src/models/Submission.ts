import mongoose from 'mongoose';
import {AutoIncrementSimple} from "@typegoose/auto-increment";


const submissionSchema = new mongoose.Schema({
    _id: {required: true, type: mongoose.Types.ObjectId},
    userId: {type: String, required: true},
    image: {type: String, unique: true, required: true},
    labels: {type: Array, unique: true},
    date: {type: Date, unique: true},
    targetUUID: {type: String, required: true, ref: 'Target'},
    targetId: {type: Number, unique: true},
    submissionId: {type: Number, unique: true}
})

submissionSchema.plugin(AutoIncrementSimple, [{field: 'submissionId'}]);


const Submission = mongoose.model('Submission', submissionSchema);
export default Submission;