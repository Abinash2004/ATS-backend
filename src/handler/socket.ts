import {io} from '../config/server.ts';
import type {Socket} from 'socket.io';
import type {IShift} from "../interface/shift.ts";
import type {IEmployee} from "../interface/employee.ts";
import type {IDepartment} from "../interface/department.ts";
import {verifyToken} from "../config/jwt.ts";
import {getEmployeeDataByEmail} from "./mongoose/employee.ts";
import {authSignIn, authSignUp} from "./auth.ts";
import {
    breakHandler,clockInHandler,clockOutHandler,
    resolvePendingAttendanceHandler,statusHandler
} from "./events/employee.ts";
import {
    createDepartmentHandler,
    createEmployeeHandler, createShiftHandler,
    deleteDepartmentHandler, deleteEmployeeHandler, deleteShiftHandler, readDepartmentHandler,
    readEmployeeHandler, readShiftHandler, updateDepartmentHandler, updateEmployeeHandler, updateShiftHandler
} from "./events/admin.ts";

function startAuthSocketServer() {
    const authNamespace = io.of("/auth");
    authNamespace.on('connection', (socket) => {
        console.log(`${socket.id} connected to auth server.`);
        socket.on("sign_up", (employee: IEmployee) => authSignUp(socket,employee));
        socket.on("sign_in", (employee: IEmployee) => authSignIn(socket,employee));
    });
}

function startEmployeeSocketServer() {
    const employeeNamespace = io.of("/employee");
    employeeNamespace.use(async (socket: Socket, next) => {
        try {
            const authHeader = socket.handshake.headers.authorization;
            if (!authHeader?.startsWith("Bearer ")) return next(new Error("Authentication token missing."));
            const token = authHeader?.split(" ")[1];
            const email = verifyToken(token);
            socket.data.employee = await getEmployeeDataByEmail(email);
            next();
        } catch (err: unknown) {
            return next(new Error("invalid or expired token"));
        }
    });
    employeeNamespace.on('connection', (socket: Socket) => {
        const employee: IEmployee  = socket.data.employee;
        console.log(`${socket.id} connected to employee server.`);
        socket.on("clock_in", (reason: string) => clockInHandler(socket,employee,reason));
        socket.on("break", (reason: string) => breakHandler(reason,socket,employee));
        socket.on("clock_out", (reason: string) => clockOutHandler(socket,employee,reason));
        socket.on("status",() => statusHandler(socket, employee));
        socket.on("resolve",(attendanceId: string, clockOutTime: string) =>
            resolvePendingAttendanceHandler(socket, attendanceId, clockOutTime));
    });
}

function startAdminSocketServer() {
    const adminNamespace = io.of("/admin");
    adminNamespace.use(async (socket: Socket, next) => {
        try {
            const authHeader = socket.handshake.headers.authorization;
            const adminPassword = socket.handshake.headers.admin_password;
            if (!authHeader?.startsWith("Bearer ")) return next(new Error("Authentication token missing."));
            const token = authHeader?.split(" ")[1];
            const email = verifyToken(token);
            if (!adminPassword) return next(new Error("adminPassword is missing."));
            if (adminPassword !== "me nahi bataunga") return next(new Error("invalid adminPassword."));
            socket.data.employee = await getEmployeeDataByEmail(email);
            next();
        } catch (err: unknown) {
            return next(new Error("invalid or expired token"));
        }
    });
    adminNamespace.on('connection', (socket) => {
        console.log(`${socket.id} connected to admin server.`);
        socket.on("create_employee",(employee:IEmployee)=>createEmployeeHandler(socket,employee));
        socket.on("read_employee",(employeeId: string)=>readEmployeeHandler(socket,employeeId));
        socket.on("update_employee",(employeeId: string, employee:IEmployee)=>updateEmployeeHandler(socket,employeeId,employee));
        socket.on("delete_employee",(employeeId: string)=>deleteEmployeeHandler(socket, employeeId));

        socket.on("create_shift",(shift:IShift)=>createShiftHandler(socket,shift));
        socket.on("read_shift",(shiftId: string)=>readShiftHandler(socket,shiftId));
        socket.on("update_shift",(shiftId: string, shift:IShift)=>updateShiftHandler(socket,shiftId,shift));
        socket.on("delete_shift",(shiftId: string)=>deleteShiftHandler(socket, shiftId));

        socket.on("create_department",(department:IDepartment)=>createDepartmentHandler(socket,department));
        socket.on("read_department",(departmentId: string)=>readDepartmentHandler(socket,departmentId));
        socket.on("update_department",(departmentId: string, department:IDepartment)=>updateDepartmentHandler(socket,departmentId,department));
        socket.on("delete_department",(departmentId: string)=>deleteDepartmentHandler(socket, departmentId));
    });
}

export {startEmployeeSocketServer,startAuthSocketServer,startAdminSocketServer};