import {connectToMongoDB} from "../config/mongoose.ts";
import {startSocketServer} from "./socket.ts";

async function startInitialServers() {
    await connectToMongoDB();
    startSocketServer();
}

export {startInitialServers};