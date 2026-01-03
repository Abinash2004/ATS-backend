import type {Day} from "../type/day.ts";
import type {Socket} from "socket.io";
import type {ISingleShift} from "../interface/shift.ts";
import type {IAttendance, IBreak} from "../interface/attendance.ts";

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

export {
    stringToDate,
    dateToIST,
    errorEmission,
    messageEmission,
    calculateMinutes,
    formatHoursMinutes,
    getShiftData,
    getDayName,
    getShiftTimings
};