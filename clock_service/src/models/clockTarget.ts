import Mongoose from 'mongoose';


const clockTargetSchema = new Mongoose.Schema({
    contestId: {type: Number, required: true},
    status: {type: String, required: true},
    startDate: {type: Date, required: true},
    endDate: {type: Date, required: true},
})

const ClockTarget = Mongoose.model('ClockTarget', clockTargetSchema);

export default ClockTarget;