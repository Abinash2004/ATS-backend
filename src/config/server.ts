import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();
const httpsServer = createServer(app);
const io = new Server(httpsServer, { cors: { origin: "*" } });

export { httpsServer, io };
