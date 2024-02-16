import mongoose from 'mongoose';


const contestSchema = new mongoose.Schema({
    _id: {required: true, type: mongoose.Types.ObjectId},
    userId: {type: String, required: true},
    image: {type: String, unique: true, required: true},
    location: {type: String, unique: true, required: true},
    date: {type: Date, unique: true}
})

const Contest = mongoose.model('Target', contestSchema);
module.exports = Contest;