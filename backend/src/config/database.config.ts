import mongoose from 'mongoose';
import Env from './env.config.js';
const connectDatabase = async () => {
 try {
    await mongoose.connect(Env.MONGODB_URI,{
        serverSelectionTimeoutMS:8000,
        socketTimeoutMS:4500,
        connectTimeoutMS:10000,
    });
    console.log('Database connected successfully');
 }
    catch (error) {
    console.error('Error connecting to MongoDB database:', error);
    process.exit(1); // Exit the process with failure
    }

};

export default connectDatabase;