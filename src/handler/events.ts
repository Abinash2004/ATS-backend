import type {Socket} from "socket.io";
import type {IEmployee} from "../interface/employee.ts";
import type {IAttendance} from "../interface/attendance.ts";
import {helperErrorEmission, helperMessageEmission} from "./helper.ts";
import {addNewAttendance, addNewBreak, getTodayAttendance} from "./mongoose/attendance.ts";

async function clockInHandler(socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(employee._id);
        if(!attendance) {
            await addNewAttendance(employee._id, employee.shiftId.toString());
            helperMessageEmission(socket, "success","clocked in successfully");
        } else {
            helperMessageEmission(socket, "success","already clocked in successfully");
        }
    } catch(error) {
        helperErrorEmission(socket,error);
    }
}

async function clockOutHandler(socket: Socket,employee: IEmployee) {
    try {

    } catch (error) {
        helperErrorEmission(socket,error);
    }
}

async function breakHandler(reason: string, socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(employee._id);
        if(!attendance || attendance.status === "break" || attendance.status === "out") {
            helperMessageEmission(socket, "failed","not clocked in yet.");
        } else if (!reason) {
            helperMessageEmission(socket, "failed","give reason for the break.");
        } else {
            await addNewBreak(employee._id.toString(),attendance._id, reason);
            helperMessageEmission(socket, "success","break time started successfully.");
        }
    } catch (error) {
        helperErrorEmission(socket,error);
    }
}

export {clockInHandler,breakHandler,clockOutHandler};