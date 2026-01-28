import { connectToRedis } from "../config/redis";
import { connectToMongoDB } from "../config/mongoose";
import { startPayrollWorker } from "./worker";
import { startAuthSocketServer, startSocketServer } from "./socket";

async function startInitialServers() {
	await connectToMongoDB();
	await connectToRedis();
	startAuthSocketServer();
	startSocketServer();
	startPayrollWorker();
}

export { startInitialServers };
