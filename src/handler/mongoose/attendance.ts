import {getShift} from "./shift.ts";
import {helperCalculateMinutes, helperStringToDate} from "../helper.ts";
import Timesheet from "../../model/timesheet.ts";
import Attendance from "../../model/attendance.ts";
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

async function addNewAttendance(employeeId: string, shiftId: string): Promise<boolean> {
    try {
        let isEarlyClockIn = false;
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);

        const now = new Date();
        let clockInTime: Date = helperStringToDate(shift.initial_time);
        if (now >= clockInTime) clockInTime = now;
        else isEarlyClockIn = true;

        await Attendance.create({clock_in: clockInTime,employeeId: employeeId,status: "in"});
        await Timesheet.create({time: clockInTime,status: "in", employeeId: employeeId});
        console.log(`${employeeId} successfully clocked in.`);
        return isEarlyClockIn;
    } catch(error) {
        console.error(error);
        return false;
    }
}

async function addNewBreak(employeeId: string, attendanceId: string, reason: string): Promise<void> {
    try {
        const currentTime = new Date();
        const breakObject: IBreak = {break_in: currentTime,reason: reason};
        await Attendance.updateOne({_id: attendanceId},{
            $push: {breaks: breakObject},
            status: "break"
        });
        await Timesheet.create({time: currentTime,status: "out", employeeId: employeeId});
    } catch(error: unknown) {
        console.error(error);
    }
}

async function updateOngoingBreak(employeeId: string, attendanceId: string): Promise<void> {
    try {
        const dateStart = new Date(Date.now());
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(dateStart);
        dateEnd.setDate(dateEnd.getDate() + 1);
        const currentTime = new Date();

        await Attendance.updateOne({_id: attendanceId,breaks: {$elemMatch: {
            break_in: {$gte: dateStart, $lt: dateEnd},
            break_out: {$exists: false},
        }}},{$set:{status: "in","breaks.$.break_out": currentTime}});
        await Timesheet.create({time: currentTime,status: "in", employeeId: employeeId});
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

async function updateClockOutTime(employeeId: string, attendanceId: string): Promise<void> {
    try {
        const currentTime = new Date();
        await Attendance.updateOne({_id: attendanceId}, {$set: {
            clock_out: currentTime,
            status: "out"
        }});
        await Timesheet.create({time: currentTime,status: "out", employeeId: employeeId});
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