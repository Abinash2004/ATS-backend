import type {Day} from "../type/day.ts";
import type {Socket} from "socket.io";
import type {ISingleShift} from "../interface/shift.ts";
import type {IAttendance, IBreak} from "../interface/attendance.ts";
import type {IAttendanceRecord} from "../interface/attendance_record.ts";
import {getShift} from "./mongoose/shift.ts";
import {getAttendanceByDate} from "./mongoose/attendance.ts";
import {getEmployeeAttendanceRecordMonthWise} from "./mongoose/attendance_record.ts";

function stringToDate(inputTime: string): Date {
    const [hh,mm] = inputTime.split(":").map(Number);
    let shiftTime = new Date();
    shiftTime.setUTCHours(hh-5, mm-30, 0, 0);
    return shiftTime;
}

function dateToIST(date: Date): string {
    return date.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"});
}

function errorEmission(socket: Socket, error: unknown) :void {
    socket.emit("server_response",{
        status: "failed",
        message: error instanceof Error ? error.message : error
    });
}

function messageEmission(socket: Socket, status: string, message: any) :void {
    socket.emit("server_response",{status,message});
}

function calculateMinutes(start: Date, end: Date): number {
    if (end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 60000);
}

function formatHoursMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

async function getShiftData(attendance: IAttendance,currentTime: Date) {
    let shiftStartTime = stringToDate(attendance.shift.start_time);
    let shiftEndTime = stringToDate(attendance.shift.end_time);

    if (attendance.shift.day_status === "first_half") {
        const timeRange = calculateMinutes(shiftStartTime,shiftEndTime);
        shiftEndTime.setMinutes(shiftEndTime.getMinutes() - timeRange/2);
    } else if (attendance.shift.day_status === "second_half") {
        const timeRange = calculateMinutes(shiftStartTime,shiftEndTime);
        shiftStartTime.setMinutes(shiftStartTime.getMinutes() + timeRange/2);
    }

    // Night shift handling
    if (shiftStartTime > shiftEndTime) shiftEndTime.setDate(shiftEndTime.getDate() + 1);

    let breakMinutes = 0;
    const shiftMinutes = calculateMinutes(shiftStartTime, shiftEndTime);
    const totalSpentMinutes = calculateMinutes(attendance.clock_in, currentTime);
    attendance.breaks.forEach((single: IBreak) => {
        breakMinutes += calculateMinutes(single.break_in,single.break_out || currentTime);
    });

    const workedMinutes = totalSpentMinutes - breakMinutes;
    const pendingTimeMinutes = (shiftMinutes - workedMinutes > 0) ? shiftMinutes - workedMinutes : 0;
    const overTimeMinutes = (workedMinutes - shiftMinutes > 0) ? workedMinutes - shiftMinutes : 0;
    return {shiftStartTime,shiftEndTime,shiftMinutes,breakMinutes,workedMinutes,pendingTimeMinutes,overTimeMinutes};
}

function getDayName(date: Date): Day {
    const days: Day[] = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"] as const;
    return days[date.getDay()];
}

async function getShiftTimings(shift: ISingleShift): Promise<Date[]> {
    try {
        let shiftInitialTime: Date = stringToDate(shift.start_time);
        let shiftExitTime: Date = stringToDate(shift.end_time);

        if (shift.day_status === "first_half") {
            const timeRange = calculateMinutes(shiftInitialTime,shiftExitTime);
            shiftExitTime.setMinutes(shiftExitTime.getMinutes() - timeRange/2);
        } else if (shift.day_status === "second_half") {
            const timeRange = calculateMinutes(shiftInitialTime,shiftExitTime);
            shiftInitialTime.setMinutes(shiftInitialTime.getMinutes() + timeRange/2);
        }
        return [shiftInitialTime, shiftExitTime];
    } catch(error) {
        console.log(error);
        return [];
    }
}

function parseDateDMY(input: string): Date {
    const [dd, mm, yyyy] = input.split("/").map(Number);
    if (!dd || !mm || !yyyy) {
        throw new Error("Invalid date format");
    }
    return new Date(Date.UTC(yyyy, mm - 1, dd));
}

function getLastDayUtc(mmYYYY: string): Date {
    const [mm, yyyy] = mmYYYY.split("/").map(Number);
    if (!mm || !yyyy || mm < 1 || mm > 12) {
        throw new Error("Invalid format. Expected mm/yyyy");
    }
    return new Date(Date.UTC(yyyy, mm, 0, 0, 0, 0, 0));
}

function getFirstDayUtc(mmYYYY: string): Date {
    const [mm, yyyy] = mmYYYY.split("/").map(Number);
    if (!mm || !yyyy || mm < 1 || mm > 12) {
        throw new Error("Invalid format. Expected mm/yyyy");
    }
    return new Date(Date.UTC(yyyy, mm - 1, 1, 0, 0, 0, 0));
}

async function calculateShiftSalary(shiftId: string, month: string, salary: number): Promise<number> {
    try {
        const shiftCount = await calculateWorkingShift(shiftId,month);
        return salary/shiftCount;
    } catch(error) {
        console.log(error);
        return 0;
    }
}

async function calculateWorkingShift(shiftId: string, month: string): Promise<number> {
    try {
        const shift = await getShift(shiftId);
        if(!shift) return 0;
        const start = getFirstDayUtc(month);
        const end = getLastDayUtc(month);
        let shiftCount = 0;
        for(let iterDate = new Date(start); iterDate <= new Date(end); iterDate.setDate(iterDate.getDate()+1)) {
            const day = getDayName(iterDate);
            if (shift[day].day_status === "full_day") shiftCount += 2;
            else if (shift[day].day_status === "first_half" || shift[day].day_status === "second_half") shiftCount++;
        }
        return shiftCount;
    } catch(error) {
        console.log(error);
        return 0;
    }
}

async function calculateTotalWorkingShift(employeeId: string, month: string): Promise<number> {
    try {
        let shiftCount = 0;
        const attendanceRecord = await getEmployeeAttendanceRecordMonthWise(employeeId, month);
        if (!attendanceRecord[0]) return 0;
        let shiftId: string = attendanceRecord[0].shiftId.toString();
        let shift = await getShift(shiftId.toString());
        if(!shift) return 0;
        for (let attendance of attendanceRecord) {
            if (shiftId !== attendance.shiftId.toString()) {
                shiftId = attendance.shiftId.toString();
                shift = await getShift(attendance.shiftId.toString());
                if(!shift) return 0;
            }
            const day = getDayName(attendance.attendance_date);
            if (shift[day].day_status === "full_day") shiftCount += 2;
            else if (shift[day].day_status === "first_half" || shift[day].day_status === "second_half") shiftCount++;
        }
        return shiftCount;
    } catch(error) {
        console.log(error);
        return 0;
    }
}

async function calculateOvertimePay(attendance: IAttendanceRecord, employeeId: string, shiftSalary: number): Promise<number> {
    try {
        const fullAttendance = await getAttendanceByDate(attendance.attendance_date, employeeId);
        if (!fullAttendance) return 0;
        if (!fullAttendance.clock_out) return 0;
        let {shiftMinutes,overTimeMinutes} = await getShiftData(fullAttendance, fullAttendance.clock_out);
        return (shiftSalary * overTimeMinutes)/(shiftMinutes/2);
    } catch(error) {
        console.log(error);
        return 0;
    }
}

async function calculateOvertimeMinutes(attendance: IAttendanceRecord, employeeId: string): Promise<number> {
    try {
        const fullAttendance = await getAttendanceByDate(attendance.attendance_date, employeeId);
        if (!fullAttendance) return 0;
        if (!fullAttendance.clock_out) return 0;
        let {overTimeMinutes} = await getShiftData(fullAttendance, fullAttendance.clock_out);
        return overTimeMinutes;
    } catch(error) {
        console.log(error);
        return 0;
    }
}

function formatMonthYear(input: string): string {
    const [mm, yyyy] = input.split("/").map(Number);
    if (!mm || mm < 1 || mm > 12 || !yyyy) {
        throw new Error("Invalid format. Expected mm/yyyy");
    }
    const monthName = new Date(yyyy, mm - 1).toLocaleString("en-US", {
        month: "long"
    });
    return `${monthName} ${yyyy}`;
}

export {
    stringToDate,
    dateToIST,
    errorEmission,
    messageEmission,
    calculateMinutes,
    formatHoursMinutes,
    getShiftData,
    getDayName,
    getShiftTimings,
    parseDateDMY,
    getLastDayUtc,
    getFirstDayUtc,
    calculateShiftSalary,
    calculateOvertimePay,
    calculateWorkingShift,
    calculateOvertimeMinutes,
    formatMonthYear,
    calculateTotalWorkingShift
};