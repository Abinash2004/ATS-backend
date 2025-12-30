import type {Socket} from "socket.io";
import type {IEmployee} from "../interface/employee.ts";
import type {IAttendance} from "../interface/attendance.ts";
import {helperErrorEmission, helperMessageEmission} from "./helper.ts";
import {addNewAttendance,addNewBreak,getTodayAttendance, isShiftTimeCompleted,
    updateClockOutTime,updateOngoingBreak} from "./mongoose/attendance.ts";

async function clockInHandler(socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(employee._id);
        if(!attendance) {
            const isEarly = await addNewAttendance(employee._id, employee.shiftId.toString());
            (isEarly) ?
            helperMessageEmission(socket, "success","early clocked in, timer will start at your shift time.") :
            helperMessageEmission(socket, "success","clocked in successfully");
        } else if (attendance.status === "in" || attendance.status === "out") {
            helperMessageEmission(socket, "failed","can't clock in if already clocked in or clocked out.");
        } else {
            await updateOngoingBreak(employee._id.toString(), attendance._id.toString());
            helperMessageEmission(socket, "success","clocked in successfully");
        }
    } catch(error) {
        helperErrorEmission(socket,error);
    }
}

async function clockOutHandler(socket: Socket,employee: IEmployee, reason: string) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(employee._id);
        if(!attendance) {
            helperMessageEmission(socket, "failed","not clocked in yet.");
        } else if (attendance.status === "break" || attendance.status === "out") {
            helperMessageEmission(socket, "failed","can't clock out if already clocked out or in break.");
        } else if (!await isShiftTimeCompleted(employee._id.toString(), employee.shiftId.toString(), attendance) && !reason) {
            helperMessageEmission(socket, "failed","shift hours are pending, provide reason for early clock out.");
        } else {
            await updateClockOutTime(employee._id.toString(), attendance._id.toString(), reason);
            helperMessageEmission(socket, "success","clocked out successfully");
        }
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