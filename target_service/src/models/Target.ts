import mongoose from 'mongoose';
import {AutoIncrementSimple} from "@typegoose/auto-increment";


const targetSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    image: {type: String, unique: true, required: true},
    location: {type: String, required: true},
    labels: {type: Array, unique: true},
    date: {type: Date, required: true},
    targetId: {type: Number, unique: true}
})

targetSchema.plugin(AutoIncrementSimple, [{field: 'targetId'}]);


const Target = mongoose.model('Target', targetSchema);
export default Target;