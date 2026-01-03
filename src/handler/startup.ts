import {connectToMongoDB} from "../config/mongoose.ts";
import {startAuthSocketServer, startEmployeeSocketServer, startAdminSocketServer} from "./socket.ts";

async function startInitialServers() {
    await connectToMongoDB();
    startAuthSocketServer();
    startEmployeeSocketServer();
    startAdminSocketServer();
}

export {startInitialServers};