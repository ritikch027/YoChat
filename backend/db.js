import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB=async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Connected to MongoDB");
    }catch(err){
        console.error("Error connecting to MongoDB:", err);
        throw err;
    }
}

export default connectDB;