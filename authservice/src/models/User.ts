import Mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import {UserDocument, UserModel} from "./IUser";

const userSchema = new Mongoose.Schema<UserDocument>({
    isOwner: {type: Boolean},
    email: {type: String, unique: true, required: true},
    password: {type: String, unique: true, required: true},
    targets: [{type: Number, ref: 'UserTarget'}],
    role : { type: String, required: true},
}, {
    methods: {
        async isValidPassword(password: string | Buffer) {
            return await bcrypt.compare(password, this.password);
        }
    },

})


userSchema.pre(
    'save',
    async function (next: () => void) {
        this.password = await bcrypt.hash(this.password, 10);
        next();
    }
);

const User = Mongoose.model<UserDocument, UserModel>('User', userSchema);

export default User;