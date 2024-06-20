import Mongoose from 'mongoose';

const userSubmissionSchema = new Mongoose.Schema({
    userId: {type: String, required: true, ref: 'User'},
    submissionId: {type: Number, required: true},
})


const UserSubmission = Mongoose.model('UserSubmission', userSubmissionSchema);

export default UserSubmission;