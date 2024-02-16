import Mongoose, {Model} from "mongoose";

export interface UserDocument extends Document {
    _id: Mongoose.Types.ObjectId;
    email: string;
    password: string;
    isOwner: boolean;
    targets: Mongoose.Types.ObjectId[];

    isValidPassword(password: string): Promise<boolean>;
}

export interface UserModel extends Model<UserDocument> {
    isValidPassword(password: string): Promise<boolean>;
}