import type {Socket} from "socket.io";
import type {IEmployee} from "../interface/employee.ts";
import type {IAttendance} from "../interface/attendance.ts";
import {helperErrorEmission, helperMessageEmission} from "./helper.ts";
import {addNewAttendance,addNewBreak,getTodayAttendance, isShiftTimeCompleted,
    updateClockOutTime,updateOngoingBreak} from "./mongoose/attendance.ts";

async function clockInHandler(socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(employee._id, employee.shiftId.toString());
        if(!attendance) {
            await addNewAttendance(socket, employee._id, employee.shiftId.toString());
        } else if (attendance.status === "in" || attendance.status === "out") {
            helperMessageEmission(socket, "failed","can't clock in if already clocked in or clocked out.");
        } else {
            await updateOngoingBreak(socket, employee._id.toString(), attendance._id.toString(), employee.shiftId.toString());
        }
    } catch(error) {
        helperErrorEmission(socket,error);
    }
}

async function clockOutHandler(socket: Socket,employee: IEmployee, reason: string) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(employee._id, employee.shiftId.toString());
        if(!attendance) {
            helperMessageEmission(socket, "failed","not clocked in yet.");
        } else if (attendance.status === "break" || attendance.status === "out") {
            helperMessageEmission(socket, "failed","can't clock out if already clocked out or in break.");
        } else if (!await isShiftTimeCompleted(employee._id.toString(), employee.shiftId.toString(), attendance) && !reason) {
            helperMessageEmission(socket, "failed","shift hours are pending, provide reason for early clock out.");
        } else {
            await updateClockOutTime(socket, employee._id.toString(), attendance._id.toString(), reason);
        }
    } catch (error) {
        helperErrorEmission(socket,error);
    }
}

async function breakHandler(reason: string, socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(employee._id, employee.shiftId.toString());
        if(!attendance || attendance.status === "break" || attendance.status === "out") {
            helperMessageEmission(socket, "failed","not clocked in yet.");
        } else if (!reason) {
            helperMessageEmission(socket, "failed","give reason for the break.");
        } else {
            await addNewBreak(socket, employee._id.toString(),attendance._id, employee.shiftId.toString(), reason);
        }
    } catch (error) {
        helperErrorEmission(socket,error);
    }
}

export {clockInHandler,breakHandler,clockOutHandler};