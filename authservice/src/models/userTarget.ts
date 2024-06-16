import Mongoose from 'mongoose';
import {AutoIncrementSimple} from "@typegoose/auto-increment";


const userTargetSchema = new Mongoose.Schema({
    _id: {unique: true, type: Mongoose.Types.ObjectId},
    userId: {type: String, required: true, ref: 'User'},
    targetId: {type: Number, required: true},
})


const UserTarget = Mongoose.model('UserTarget', userTargetSchema);

export default UserTarget;