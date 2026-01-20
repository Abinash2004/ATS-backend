import {connectToRedis} from "../config/redis.ts";
import {connectToMongoDB} from "../config/mongoose.ts";
import {startPayrollWorker} from "./worker.ts";
import {startAuthSocketServer,startSocketServer} from "./socket.ts";

async function startInitialServers() {
    await connectToMongoDB();
    await connectToRedis()
    startAuthSocketServer();
    startSocketServer();
    startPayrollWorker()
}

export {startInitialServers};