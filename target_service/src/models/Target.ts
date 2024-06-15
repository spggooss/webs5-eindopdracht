import mongoose from 'mongoose';


const targetSchema = new mongoose.Schema({
    _id: {required: true, type: mongoose.Types.ObjectId},
    userId: {type: String, required: true},
    image: {type: String, unique: true, required: true},
    location: {type: String, unique: true, required: true},
    labels: {type: Array, unique: true},
    date: {type: Date, unique: true}
})

const Target = mongoose.model('Target', targetSchema);
export default Target;