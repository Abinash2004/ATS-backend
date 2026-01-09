import {getShift} from "./shift.ts";
import {createPenalty} from "./penalty.ts";
import Timesheet from "../../model/timesheet.ts";
import Attendance from "../../model/attendance.ts";
import type {Socket} from "socket.io";
import type {Day} from "../../type/day.ts";
import type {IShift} from "../../interface/shift.ts";
import type {IAttendance, IBreak} from "../../interface/attendance.ts";
import {
    getShiftData, messageEmission, stringToDate,
    dateToIST, getDayName, calculateMinutes, getShiftTimings
} from "../helper.ts";

async function getTodayAttendance(socket:Socket, employeeId: string, shiftId: string) : Promise<IAttendance | null> {
    try {
        let currentTime = new Date(Date.now());
        const currentDay: Day = getDayName(currentTime);
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) {
            messageEmission(socket,"failed",`${shiftId} not found for employee ${employeeId}`);
            return null;
        }

        if(shift[currentDay].day_status === "holiday") return null;
        const [shiftInitialTime, shiftExitTime] = await getShiftTimings(shift[currentDay]);

        //regular shift
        if (shiftInitialTime < shiftExitTime) {
            const dateStart = new Date(Date.now());
            dateStart.setHours(0, 0, 0, 0);
            const dateEnd = new Date(dateStart);
            dateEnd.setDate(dateEnd.getDate() + 1);
            return await Attendance.findOne({employeeId: employeeId,clock_in: {$gte: dateStart, $lt: dateEnd}});
        }
        //midnight shift
        else {
            const midNightStart = new Date(Date.now());
            midNightStart.setHours(0, 0, 0, 0);
            const midNightEnd = new Date(Date.now());
            midNightEnd.setDate(midNightStart.getDate() + 1);

            if (currentTime >= midNightStart && currentTime <= shiftExitTime ) {
                const startDate = new Date(shiftInitialTime);
                startDate.setDate(startDate.getDate() - 1);
                return await Attendance.findOne({
                    employeeId: employeeId,
                    clock_in: {$gte: startDate,$lte: currentTime}
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

async function addNewAttendance(socket: Socket,employeeId: string, shiftId: string, reason: string): Promise<void> {
    try {
        const pendingClockOutAttendance: IAttendance | null = await Attendance.findOne({employeeId,clock_out:{$exists: false}});
        if (pendingClockOutAttendance) {
            messageEmission(socket, "failed", `pending clock-out for attendance [${pendingClockOutAttendance._id}] - ${dateToIST(pendingClockOutAttendance.clock_in)}`);
            return;
        }

        let late_in:number = 0;
        let currentTime = new Date(Date.now());
        const currentDay: Day = getDayName(currentTime);
        const shift : IShift | null = await getShift(shiftId.toString());
        if (!shift) {
            messageEmission(socket, "failed",`shift not found.`);
            return;
        }
        if(shift[currentDay].day_status === "holiday") {
            messageEmission(socket, "failed",`you don't have shift for today (holiday).`);
            return;
        }

        const [shiftInitialTime, shiftExitTime] = await getShiftTimings(shift[currentDay]);

        if (shift[currentDay].day_status === "second_half") {
            const halfMinutes = calculateMinutes(shiftInitialTime, shiftExitTime) / 2;
            const secondHalfStart = new Date(shiftInitialTime.getTime() + halfMinutes * 60 * 1000);
            late_in = calculateMinutes(secondHalfStart, currentTime);
        } else late_in = calculateMinutes(shiftInitialTime,currentTime);

        //regular shift
        if (shiftInitialTime < shiftExitTime) {
            let clockInTime = new Date();
            if (clockInTime < shiftInitialTime) clockInTime = shiftInitialTime;
            if (clockInTime >= shiftExitTime) {
                messageEmission(socket, "failed",`your shift is completed on ${dateToIST(shiftExitTime)}`);
                return;
            }
            if (currentTime > shiftInitialTime) {
                if (!reason) {
                    messageEmission(socket,"failed","clocking in late, provide reason");
                    return;
                } else {
                    const lateMinutes = calculateMinutes(shiftInitialTime, currentTime);
                    if (lateMinutes >= 30) await createPenalty(employeeId, 500, `late clock-in on ${dateToIST(currentTime)}`);
                    await Attendance.create({clock_in: clockInTime,employeeId: employeeId, shift: shift[currentDay], shiftId: shiftId,status: "in", late_in: late_in, late_clock_in_reason: reason});
                    await Timesheet.create({time: clockInTime,status: "in", employeeId: employeeId});
                    messageEmission(socket, "success",`late clocked in on ${dateToIST(clockInTime)}`);
                    return;
                }
            }
            await Attendance.create({clock_in: clockInTime,employeeId: employeeId, shift: shift[currentDay], shiftId: shiftId,status: "in", late_in: late_in});
            await Timesheet.create({time: clockInTime,status: "in", employeeId: employeeId});
            messageEmission(socket, "success",`clocked in on ${dateToIST(clockInTime)}`);
        }
        //midnight shift
        else {
            const midNightStart = new Date(Date.now());
            midNightStart.setHours(0, 0, 0, 0);
            const midNightEnd = new Date(Date.now());
            midNightEnd.setDate(midNightStart.getDate() + 1);

            if (currentTime >= midNightStart && currentTime <= shiftExitTime ) {
                messageEmission(socket, "success",`clocked in on ${dateToIST(currentTime)}`);
            } else if (currentTime > shiftExitTime && currentTime < shiftInitialTime) {
                currentTime = shiftInitialTime;
                messageEmission(socket, "success",`you are clocking in early, timer will start on ${dateToIST(shiftInitialTime)}`);
            } else if (currentTime >= shiftInitialTime && currentTime < midNightEnd) {
                messageEmission(socket, "success",`clocked in on ${dateToIST(currentTime)}`);
            }
            if (currentTime > shiftInitialTime) {
                if (!reason) {
                    messageEmission(socket,"failed","clocking in late, provide reason");
                    return;
                } else {
                    const lateMinutes = calculateMinutes(shiftInitialTime, currentTime);
                    if (lateMinutes >= 30) await createPenalty(employeeId, 500, `late clock-in on ${dateToIST(currentTime)}`);
                    await Attendance.create({clock_in: currentTime,employeeId: employeeId, shift: shift[currentDay], shiftId: shiftId,status: "in", late_in: late_in, late_clock_in_reason: reason});
                    await Timesheet.create({time: currentTime,status: "in", employeeId: employeeId});
                    return;
                }
            }
            await Attendance.create({clock_in: currentTime,employeeId: employeeId, shift: shift[currentDay], shiftId: shiftId, late_in: late_in});
            await Timesheet.create({time: currentTime,status: "in", employeeId: employeeId});
        }
    } catch(error) {
        console.error(error);
    }
}

async function addNewBreak(socket: Socket, employeeId: string, attendance: IAttendance, reason: string): Promise<void> {
    try {

        const currentTime = new Date();
        const [shiftInitialTime, shiftExitTime] = await getShiftTimings(attendance.shift);
        if ((shiftInitialTime < shiftExitTime && currentTime < shiftInitialTime) ||
            (shiftInitialTime > shiftExitTime && currentTime > shiftExitTime && currentTime < shiftInitialTime)) {
            messageEmission(socket, "failed", `break is not allowed before ${dateToIST(shiftInitialTime)}.`);
            return;
        }

        const breakObject: IBreak = {break_in: currentTime,reason: reason};
        await Attendance.updateOne({_id: attendance._id},{
            $push: {breaks: breakObject},
            status: "break"
        });
        await Timesheet.create({time: currentTime,status: "out", employeeId: employeeId});
        messageEmission(socket, "success",`break time started on ${dateToIST(currentTime)}.`);
    } catch(error: unknown) {
        console.error(error);
    }
}

async function updateOngoingBreak(socket: Socket, employeeId: string, attendance: IAttendance): Promise<void> {
    try {
        const [shiftInitialTime, shiftExitTime] = await getShiftTimings(attendance.shift);
        let dateStart: Date = shiftInitialTime;
        const currentTime = new Date();

        //midnight shift
        if (shiftInitialTime > shiftExitTime) {
            const midNightStart = new Date(Date.now());
            midNightStart.setHours(0, 0, 0, 0);
            if (currentTime >= midNightStart && currentTime <= shiftExitTime ) {
                dateStart.setDate(dateStart.getDate() - 1);
            }
        }

        await Attendance.updateOne({_id: attendance._id,breaks: {$elemMatch: {
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
        const {shiftMinutes,workedMinutes} = await getShiftData(attendance, currentTime);
        return workedMinutes >= shiftMinutes;
    } catch(error: unknown) {
        console.error(error);
        return false;
    }
}

async function updateClockOutTime(socket:Socket, employeeId: string, attendance: IAttendance, reason: string): Promise<void> {
    try {
        const currentTime = new Date();
        let early_out:number = 0;
        const {shiftMinutes,workedMinutes} = await getShiftData(attendance,currentTime);
        if (shiftMinutes - workedMinutes > 0) early_out = calculateMinutes(currentTime,stringToDate(attendance.shift.end_time));
        if (currentTime < attendance.clock_in) {
            await Attendance.deleteOne({_id:attendance._id});
            messageEmission(socket, "success", "you clocked out before shift clock in time so no attendance will be marked.");
            return;
        }
        if (reason) {
            await Attendance.updateOne({_id: attendance._id},{$set:{
                clock_out: currentTime,
                early_clock_out_reason: reason,
                status: "out",
                early_out: early_out
            }});
            messageEmission(socket, "success",`early clocked out for reason (${reason}) on ${dateToIST(currentTime)}.`);
        } else {
            await Attendance.updateOne({_id: attendance._id}, {$set: {
                clock_out: currentTime,
                status: "out",
                early_out: early_out
            }});
            messageEmission(socket, "success",`clocked out on ${dateToIST(currentTime)}.`);
        }
        await Timesheet.create({time: currentTime,status: "out", employeeId: employeeId});
    } catch(error: unknown) {
        console.error(error);
    }
}

async function getAttendanceRecord(employeeId: string): Promise<any> {
    try {
        const attendance = await Attendance.find({employeeId});
        let attendanceRecord: any = [];
        attendance.map(att => {
            attendanceRecord.push(dateToIST(att.clock_in));
        })
        return attendanceRecord;
    } catch(error: unknown) {
        console.error(error);
    }
}

async function getAttendance(attendanceId: string): Promise<IAttendance | null> {
    try {
        return await Attendance.findOne({_id: attendanceId});
    } catch(error: unknown) {
        console.error(error);
        return null;
    }
}

async function resolveAttendance(socket: Socket, attendance: IAttendance, clockOutTime: string): Promise<void> {
    try {
        const clock_out = stringToDate(clockOutTime);
        clock_out.setFullYear(
            attendance.clock_in.getFullYear(),
            attendance.clock_in.getMonth(),
            attendance.clock_in.getDate()
        );
        await Attendance.updateOne({_id: attendance._id},{$set:{clock_out: clock_out}});
        messageEmission(socket,"success",`attendance resolved, clocked out at ${dateToIST(clock_out)}`);
    } catch(error: unknown) {
        console.error(error);
    }
}

async function getAttendanceByDate(inputDate: Date, employeeId: string): Promise<IAttendance | null> {
    try {
        const start = new Date(inputDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        return await Attendance.findOne({employeeId, clock_in: {$gte: start,$lt: end}});
    } catch(error) {
        console.error(error);
        return null;
    }
}

export {
    getTodayAttendance,
    addNewAttendance,
    addNewBreak,
    updateOngoingBreak,
    updateClockOutTime,
    isShiftTimeCompleted,
    getAttendanceRecord,
    getAttendance,
    resolveAttendance,
    getAttendanceByDate
}