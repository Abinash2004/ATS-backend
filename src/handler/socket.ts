import type {Socket} from 'socket.io';
import {io} from '../config/server.ts';
import {authSignIn, authSignUp} from "./auth.ts";
import type {IEmployee} from "../interface/employee.ts";
import {breakHandler, clockInHandler, clockOutHandler} from "./events.ts";
import {verifyToken} from "../config/jwt.ts";
import {getEmployeeData} from "./mongoose/employee.ts";

function startSocketServer() {
    io.use(async (socket: Socket, next) => {
        try {
            const authHeader = socket.handshake.headers.authorization;
            if (!authHeader?.startsWith("Bearer ")) {
                return next(new Error("Authentication token missing."));
            }
            const token = authHeader?.split(" ")[1];
            const email = verifyToken(token);
            socket.data.employee = await getEmployeeData(email);
            next();
        } catch (err: unknown) {
            return next(new Error("invalid or expired token"));
        }
    });

    io.on('connection', (socket: Socket) => {
        const employee: IEmployee  = socket.data.employee;
        console.log(`${socket.id} connected to server.`);
        socket.on("clock_in", () => clockInHandler(socket,employee));
        socket.on("break", (reason: string) => breakHandler(reason,socket,employee));
        socket.on("clock_out", () => clockOutHandler(socket,employee));
    });
}

function startAuthSocketServer() {
    const authNamespace = io.of("/auth");
    authNamespace.on('connection', (socket) => {
        console.log(`${socket.id} connected to auth server.`);
        socket.on("sign_up", (employee: Partial<IEmployee>) => authSignUp(socket,employee));
        socket.on("sign_in", (employee: Partial<IEmployee>) => authSignIn(socket,employee));
    });
}

export {startSocketServer,startAuthSocketServer};