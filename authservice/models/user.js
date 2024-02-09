const Mongoose = require('mongoose');

const userSchema = new Mongoose.Schema({
    _id:{unique:true, type: Mongoose.Types.ObjectId},
    isOwner:{type: Boolean},
    email:{type: String,unique:true, required:true},
    hash:{type: String,unique:true, required:true},
    salt:{type: String,unique:true, required:true}
})

const User = Mongoose.model('User',userSchema);
module.exports =  User;