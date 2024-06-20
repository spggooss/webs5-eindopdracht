import Mongoose from 'mongoose';


const clockTargetSchema = new Mongoose.Schema({
    targetId: {type: Number, required: true},
    status: {type: String, required: true},
    date: {type: Date, required: true},
})

const ClockTarget = Mongoose.model('ClockTarget', clockTargetSchema);

export default ClockTarget;