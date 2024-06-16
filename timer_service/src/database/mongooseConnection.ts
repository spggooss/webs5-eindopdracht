import mongoose from 'mongoose';
import 'dotenv/config';


if (!process.env.MONGODB_CONNECTION_STRING) {
    console.error('No MongoDB connection string found');
    process.exit(1);
}

const dbUrl = process.env.MONGODB_CONNECTION_STRING;

function connectToDatabase() {
    mongoose.connect(dbUrl, {autoIndex: true});

    const db = mongoose.connection;

    db.on('error', (err) => console.error(err));

    db.once('open', () => {
        console.log('Connected to database!');
    });
}

export default connectToDatabase;
