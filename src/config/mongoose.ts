import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({quiet: true});
const URI:string = process.env.URI || "mongodb://localhost:27017";

async function connectToMongoDB(): Promise<void> {
    try {
        await mongoose.connect(URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error(error);
    }
}
export {connectToMongoDB};