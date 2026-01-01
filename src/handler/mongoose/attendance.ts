import {getShift} from "./shift.ts";
import Timesheet from "../../model/timesheet.ts";
import Attendance from "../../model/attendance.ts";
import type {Socket} from "socket.io";
import type {IShift} from "../../interface/shift.ts";
import type {IAttendance, IBreak} from "../../interface/attendance.ts";
import {getShiftData, messageEmission,stringToDate, dateToIST, validateWorkingDay} from "../helper.ts";

async function getTodayAttendance(employeeId: string, shiftId: string) : Promise<IAttendance | null> {
    try {
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);
        let shiftInitialTime: Date = stringToDate(shift.initial_time);
        let shiftExitTime: Date = stringToDate(shift.exit_time);

        //regular shift
        if (shiftInitialTime < shiftExitTime) {
            const dateStart = new Date(Date.now());
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(dateStart);
            dateEnd.setDate(dateEnd.getDate() + 1);
            return await Attendance.findOne({
                employeeId: employeeId,
                clock_in: {$gte: dateStart, $lt: dateEnd}
            });
        }
        //midnight shift
        else {
            const midNightStart = new Date(Date.now());
            midNightStart.setHours(0, 0, 0, 0);
            const midNightEnd = new Date(Date.now());
            midNightEnd.setDate(midNightStart.getDate() + 1);
            let currentTime = new Date(Date.now());

            if (currentTime >= midNightStart && currentTime <= shiftExitTime ) {
                const startDate = new Date(shiftInitialTime);
                startDate.setDate(startDate.getDate() - 1);
                return await Attendance.findOne({
                    employeeId: employeeId,
                    clock_in: {
                        $gte: startDate,
                        $lte: currentTime
                    }
                });
            } else if (currentTime > shiftExitTime && currentTime < shiftInitialTime) {
                return null;
            } else if (currentTime >= shiftInitialTime && currentTime < midNightEnd) {
                return await Attendance.findOne({employeeId: employeeId,
                    clock_in: {$gte: shiftInitialTime,$lt: currentTime}
                });
            }
        }
        return null;
    } catch(error: unknown) {
        console.error(error);
        return null;
    }
}

async function addNewAttendance(socket: Socket,employeeId: string, shiftId: string): Promise<void> {
    try {
        if (!await validateWorkingDay(new Date(Date.now()))) {
            messageEmission(socket, "failed","today is holiday, no clock in allowed");
            return;
        }
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);
        let shiftInitialTime: Date = stringToDate(shift.initial_time);
        let shiftExitTime: Date = stringToDate(shift.exit_time);

        //regular shift
        if (shiftInitialTime < shiftExitTime) {
            let clockInTime = new Date();
            if (clockInTime < shiftInitialTime) clockInTime = shiftInitialTime;
            if (clockInTime >= shiftExitTime) {
                messageEmission(socket, "failed",`your shift is completed on ${dateToIST(shiftExitTime)}`);
                return;
            }
            await Attendance.create({clock_in: clockInTime,employeeId: employeeId, shiftId: shiftId,status: "in"});
            await Timesheet.create({time: clockInTime,status: "in", employeeId: employeeId});
            messageEmission(socket, "success",`clocked in on ${dateToIST(clockInTime)}`);
        }
        //midnight shift
        else {
            const midNightStart = new Date(Date.now());
            midNightStart.setHours(0, 0, 0, 0);
            const midNightEnd = new Date(Date.now());
            midNightEnd.setDate(midNightStart.getDate() + 1);
            let currentTime = new Date(Date.now());

            if (currentTime >= midNightStart && currentTime <= shiftExitTime ) {
                messageEmission(socket, "success",`clocked in on ${dateToIST(currentTime)}`);
            } else if (currentTime > shiftExitTime && currentTime < shiftInitialTime) {
                currentTime = shiftInitialTime;
                messageEmission(socket, "success",`you are clocking in early, timer will start on ${dateToIST(shiftInitialTime)}`);
            } else if (currentTime >= shiftInitialTime && currentTime < midNightEnd) {
                messageEmission(socket, "success",`clocked in on ${dateToIST(currentTime)}`);
            }
            await Attendance.create({clock_in: currentTime,employeeId: employeeId, shiftId: shiftId,status: "in"});
            await Timesheet.create({time: currentTime,status: "in", employeeId: employeeId});
        }
    } catch(error) {
        console.error(error);
    }
}

async function addNewBreak(socket: Socket, employeeId: string, attendanceId: string, shiftId: string, reason: string): Promise<void> {
    try {
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);
        let shiftInitialTime: Date = stringToDate(shift.initial_time);
        let shiftExitTime: Date = stringToDate(shift.exit_time);
        const currentTime = new Date();

        if ((shiftInitialTime < shiftExitTime && currentTime < shiftInitialTime) ||
            (shiftInitialTime > shiftExitTime && currentTime > shiftExitTime && currentTime < shiftInitialTime)) {
            messageEmission(socket, "failed", `break is not allowed before ${dateToIST(shiftInitialTime)}.`);
            return;
        }

        const breakObject: IBreak = {break_in: currentTime,reason: reason};
        await Attendance.updateOne({_id: attendanceId},{
            $push: {breaks: breakObject},
            status: "break"
        });
        await Timesheet.create({time: currentTime,status: "out", employeeId: employeeId});
        messageEmission(socket, "success",`break time started on ${dateToIST(currentTime)}.`);
    } catch(error: unknown) {
        console.error(error);
    }
}

async function updateOngoingBreak(socket: Socket, employeeId: string, attendanceId: string, shiftId: string): Promise<void> {
    try {
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) throw new Error(`${shiftId} not found for employee ${employeeId}`);

        let shiftInitialTime: Date = stringToDate(shift.initial_time);
        let shiftExitTime: Date = stringToDate(shift.exit_time);
        let dateStart: Date = stringToDate(shift.initial_time);
        const currentTime = new Date();

        //midnight shift
        if (shiftInitialTime > shiftExitTime) {
            const midNightStart = new Date(Date.now());
            midNightStart.setHours(0, 0, 0, 0);
            if (currentTime >= midNightStart && currentTime <= shiftExitTime ) {
                dateStart.setDate(dateStart.getDate() - 1);
            }
        }

        await Attendance.updateOne({_id: attendanceId,breaks: {$elemMatch: {
            break_in: {$gte: dateStart, $lt: currentTime},
            break_out: {$exists: false}
        }}},{$set:{status: "in","breaks.$.break_out": currentTime}});
        await Timesheet.create({time: currentTime,status: "in", employeeId: employeeId});
        messageEmission(socket, "success",`break ended, clocked in on ${dateToIST(currentTime)}.`);
    }catch(error: unknown) {
        console.error(error);
    }
}

async function isShiftTimeCompleted(attendance: IAttendance): Promise<boolean> {
    try {
        const currentTime = new Date();
        const {shiftMinutes,workedMinutes} = await getShiftData(attendance, attendance.shiftId.toString(), currentTime);
        return workedMinutes >= shiftMinutes;
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
            messageEmission(socket, "success",`early clocked out for reason (${reason}) on ${dateToIST(currentTime)}.`);
        } else {
            await Attendance.updateOne({_id: attendanceId}, {$set: {
                clock_out: currentTime,
                status: "out"
            }});
            messageEmission(socket, "success",`clocked out on ${dateToIST(currentTime)}.`);
        }
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