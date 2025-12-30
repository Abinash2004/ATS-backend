import {getShift} from "./shift.ts";
import {helperCalculateMinutes, helperMessageEmission, helperStringToDate, helperTOIST} from "../helper.ts";
import Timesheet from "../../model/timesheet.ts";
import Attendance from "../../model/attendance.ts";
import type {Socket} from "socket.io";
import type {IShift} from "../../interface/shift.ts";
import type {IAttendance, IBreak} from "../../interface/attendance.ts";

async function getTodayAttendance(employeeId: string) : Promise<IAttendance | null> {
    try {
        const dateStart = new Date(Date.now());
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(dateStart);
        dateEnd.setDate(dateEnd.getDate() + 1);
        return await Attendance.findOne({
            employeeId: employeeId,
            clock_in: {$gte: dateStart, $lt: dateEnd}
        });
    } catch(error: unknown) {
        console.error(error);
        return null;
    }
}

async function addNewAttendance(socket: Socket,employeeId: string, shiftId: string): Promise<void> {
    try {
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);

        let clockInTime = new Date();
        let shiftInitialTime: Date = helperStringToDate(shift.initial_time);
        let shiftExitTime: Date = helperStringToDate(shift.exit_time);
        if (clockInTime < shiftInitialTime) clockInTime = shiftInitialTime;
        if (clockInTime >= shiftExitTime) {
            helperMessageEmission(socket, "failed",`your shift is completed on ${helperTOIST(shiftExitTime)}`);
            return;
        }

        await Attendance.create({clock_in: clockInTime,employeeId: employeeId,status: "in"});
        await Timesheet.create({time: clockInTime,status: "in", employeeId: employeeId});
        helperMessageEmission(socket, "success",`clocked in on ${helperTOIST(clockInTime)}`);
    } catch(error) {
        console.error(error);
    }
}

async function addNewBreak(socket: Socket, employeeId: string, attendanceId: string, shiftId: string, reason: string): Promise<void> {
    try {
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);

        const currentTime = new Date();
        const shiftInitialTime: Date = helperStringToDate(shift.initial_time);
        if (currentTime < shiftInitialTime) {
            helperMessageEmission(socket, "failed", `break is not allowed before ${helperTOIST(shiftInitialTime)}.`);
            return;
        }
        const breakObject: IBreak = {break_in: currentTime,reason: reason};
        await Attendance.updateOne({_id: attendanceId},{
            $push: {breaks: breakObject},
            status: "break"
        });
        await Timesheet.create({time: currentTime,status: "out", employeeId: employeeId});
        helperMessageEmission(socket, "success",`break time started on ${helperTOIST(currentTime)}.`);
    } catch(error: unknown) {
        console.error(error);
    }
}

async function updateOngoingBreak(socket: Socket, employeeId: string, attendanceId: string, shiftId: string): Promise<void> {
    try {
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);

        const dateStart = helperStringToDate(shift.initial_time);
        const dateEnd = new Date(dateStart);
        dateEnd.setDate(dateEnd.getDate() + 1);
        const currentTime = new Date();

        await Attendance.updateOne({_id: attendanceId,breaks: {$elemMatch: {
            break_in: {$gte: dateStart, $lt: dateEnd},
            break_out: {$exists: false},
        }}},{$set:{status: "in","breaks.$.break_out": currentTime}});
        await Timesheet.create({time: currentTime,status: "in", employeeId: employeeId});
        helperMessageEmission(socket, "success",`break ended, clocked in on ${helperTOIST(currentTime)}.`);
    }catch(error: unknown) {
        console.error(error);
    }
}

async function isShiftTimeCompleted(employeeId: string, shiftId: string, attendance: IAttendance): Promise<boolean> {
    try {
        const currentTime = new Date();
        const shift = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);

        const shiftStartTime = helperStringToDate(shift.initial_time);
        const shiftEndTime = helperStringToDate(shift.exit_time);
        const shiftMinutes = helperCalculateMinutes(shiftStartTime,shiftEndTime);
        const clientMinutes = helperCalculateMinutes(attendance.clock_in, currentTime);
        return clientMinutes >= shiftMinutes;
    } catch(error: unknown) {
        console.error(error);
        return false;
    }
}

async function updateClockOutTime(socket:Socket, employeeId: string, attendanceId: string, reason: string): Promise<void> {
    try {
        const currentTime = new Date();
        if (reason) {
            await Attendance.updateOne({_id: attendanceId},{$set:{
                clock_out: currentTime,
                early_clock_out_reason: reason,
                status: "out"
            }});
        } else {
            await Attendance.updateOne({_id: attendanceId}, {$set: {
                clock_out: currentTime,
                status: "out"
            }});
        }
        await Timesheet.create({time: currentTime,status: "out", employeeId: employeeId});
        helperMessageEmission(socket, "success",`clocked out on ${helperTOIST(currentTime)}.`);
    } catch(error: unknown) {
        console.error(error);
    }
}

export {
    getTodayAttendance,
    addNewAttendance,
    addNewBreak,
    updateOngoingBreak,
    updateClockOutTime,
    isShiftTimeCompleted
}