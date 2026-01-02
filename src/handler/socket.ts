import type {Socket} from 'socket.io';
import {io} from '../config/server.ts';
import type {IShift} from "../interface/shift.ts";
import type {IEmployee} from "../interface/employee.ts";
import {verifyToken} from "../config/jwt.ts";
import {getEmployeeData} from "./mongoose/employee.ts";
import {authSignIn, authSignUp} from "./auth.ts";
import {
    addShiftHandler,
    breakHandler,
    clockInHandler,
    clockOutHandler,
    resolvePendingAttendanceHandler,
    statusHandler
} from "./events.ts";

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
        socket.on("clock_in", (reason: string) => clockInHandler(socket,employee,reason));
        socket.on("break", (reason: string) => breakHandler(reason,socket,employee));
        socket.on("clock_out", (reason: string) => clockOutHandler(socket,employee,reason));
        socket.on("status",() => statusHandler(socket, employee));
        socket.on("resolve",(attendanceId: string, clockOutTime: string) =>
            resolvePendingAttendanceHandler(socket, attendanceId, clockOutTime));
        socket.on("add_shift",(employeeId:string, shift: IShift) =>
            addShiftHandler(socket,employeeId, shift));
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