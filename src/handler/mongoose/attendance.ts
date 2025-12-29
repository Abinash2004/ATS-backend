import {getShift} from "./shift.ts";
import {helperStringToDate} from "../helper.ts";
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

async function addNewAttendance(employeeId: string, shiftId: string): Promise<void> {
    try {
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);

        const now = new Date();
        let clockInTime: Date = helperStringToDate(shift.initial_time);
        if (now > clockInTime) clockInTime = now;

        await Attendance.create({clock_in: clockInTime,employeeId: employeeId,status: "in"});
        await Timesheet.create({time: clockInTime,status: "in", employeeId: employeeId});
        console.log(`${employeeId} successfully clocked in.`);
    } catch(error) {
        console.error(error);
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

export {
    getTodayAttendance,
    addNewAttendance,
    addNewBreak
}