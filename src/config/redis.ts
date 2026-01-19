import {createClient} from "redis";
import dotenv from "dotenv";
dotenv.config({quiet: true});
const redisURL = process.env.REDIS_URL || "redis://localhost:6379"
const redisClient = createClient({url: redisURL});
async function connectToRedis(): Promise<void> {
    try {
        await redisClient.connect();
        console.log("Connected to Redis");
    } catch (error) {
        console.error(error);
    }
}
export {redisClient,connectToRedis};