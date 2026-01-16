import {connectToMongoDB} from "../config/mongoose.ts";
import {startAuthSocketServer,startSocketServer} from "./socket.ts";

async function startInitialServers() {
    await connectToMongoDB();
    startAuthSocketServer();
    startSocketServer();
}

export {startInitialServers};