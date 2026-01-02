import type {Socket} from "socket.io";
import type {IShift} from "../interface/shift.ts";
import type {IEmployee} from "../interface/employee.ts";
import type {IAttendance} from "../interface/attendance.ts";
import {addNewShift} from "./mongoose/shift.ts";
import {addShiftToEmployee} from "./mongoose/employee.ts";
import {formatHoursMinutes,getShiftData,errorEmission,messageEmission,dateToIST} from "./helper.ts";
import {
    addNewAttendance,addNewBreak,getAttendance,getAttendanceRecord,getTodayAttendance,
    isShiftTimeCompleted,resolveAttendance,updateClockOutTime,updateOngoingBreak
} from "./mongoose/attendance.ts";

async function clockInHandler(socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        if(!attendance) {
            await addNewAttendance(socket, employee._id, employee.shiftId.toString());
        } else if (attendance.status === "in" || attendance.status === "out") {
            messageEmission(socket, "failed","can't clock in if already clocked in or clocked out.");
        } else {
            await updateOngoingBreak(socket, employee._id.toString(), attendance);
        }
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function clockOutHandler(socket: Socket,employee: IEmployee, reason: string) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        if(!attendance) {
            messageEmission(socket, "failed","not clocked in yet.");
        } else if (attendance.status === "break" || attendance.status === "out") {
            messageEmission(socket, "failed","can't clock out if already clocked out or in break.");
        } else if (!await isShiftTimeCompleted(attendance) && !reason) {
            messageEmission(socket, "failed","shift hours are pending, provide reason for early clock out.");
        } else {
            await updateClockOutTime(socket, employee._id.toString(), attendance, reason);
        }
    } catch (error) {
        errorEmission(socket,error);
    }
}

async function breakHandler(reason: string, socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        if(!attendance || attendance.status === "break" || attendance.status === "out") {
            messageEmission(socket, "failed","not clocked in yet.");
        } else if (!reason) {
            messageEmission(socket, "failed","give reason for the break.");
        } else {
            await addNewBreak(socket, employee._id.toString(),attendance, reason);
        }
    } catch (error) {
        errorEmission(socket,error);
    }
}

async function statusHandler(socket:Socket, employee: IEmployee) {
    try {
        let status;
        const attendance = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        const attendanceRecord = await getAttendanceRecord(employee._id);
        if(!attendance) status = "not clocked in yet.";
        else {
            const currentTime = attendance.clock_out || new Date();
            const {shiftStartTime,shiftEndTime,shiftMinutes,breakMinutes,workedMinutes} =
                await getShiftData(attendance,currentTime);
            status = {
                status: attendance.status,
                "clocked in": dateToIST(attendance.clock_in),
                "break time": formatHoursMinutes(breakMinutes),
                "working time": formatHoursMinutes( workedMinutes),
                "pending time": formatHoursMinutes(shiftMinutes-workedMinutes),
                "shift": {from: dateToIST(shiftStartTime),to: dateToIST(shiftEndTime)},
            };
        }
        messageEmission(socket, "success",{
            "current status": status,
            "attendance record": attendanceRecord
        });
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function resolvePendingAttendanceHandler(socket: Socket, attendanceId: string, clockOutTime: string) {
    try {
        const attendance: IAttendance | null = await getAttendance(attendanceId);
        if(!attendance) {
            messageEmission(socket, "failed",`${attendanceId} is an invalid attendance id.`);
            return;
        }
        await resolveAttendance(socket,attendance, clockOutTime);
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function addShiftHandler(socket: Socket, employeeId: string, shift: IShift) {
    try {
        if (!employeeId || !shift) messageEmission(socket, "failed",`employee id & shift data is required.`);
        const shiftId: string|null|undefined = await addNewShift(shift);
        if(!shiftId) {
            messageEmission(socket, "failed",`invalid shift data.`);
            return;
        }
        await addShiftToEmployee(socket,employeeId,shiftId);
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {
    clockInHandler,
    breakHandler,
    clockOutHandler,
    statusHandler,
    resolvePendingAttendanceHandler,
    addShiftHandler
};