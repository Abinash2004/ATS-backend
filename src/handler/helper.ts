import type {Socket} from "socket.io";
import type {IAttendance, IBreak} from "../interface/attendance.ts";
import {getShift} from "./mongoose/shift.ts";

function helperStringToDate(inputTime: string): Date {
    const [hh,mm] = inputTime.split(":").map(Number);
    let shiftTime = new Date();
    shiftTime.setUTCHours(hh-5, mm-30, 0, 0);
    return shiftTime;
}

function helperTOIST(date: Date): string {
    return date.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"});
}

function helperErrorEmission(socket: Socket, error: unknown) :void {
    socket.emit("server_response",{
        status: "failed",
        message: error instanceof Error ? error.message : error
    });
}

function helperMessageEmission(socket: Socket, status: string, message: any) :void {
    socket.emit("server_response",{status,message});
}

function helperCalculateMinutes(start: Date, end: Date): number {
    if (end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 60000);
}

function formatHoursMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
}

async function getShiftCalculation(attendance: IAttendance,shiftId: string,currentTime: Date) {
    const shift = await getShift(shiftId);
    if (!shift) throw new Error("Invalid shift");
    const shiftStartTime = helperStringToDate(shift.initial_time);
    const shiftEndTime = helperStringToDate(shift.exit_time);

    // Night shift handling
    if (shiftStartTime > shiftEndTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    const shiftMinutes = helperCalculateMinutes(shiftStartTime, shiftEndTime);
    const totalSpentMinutes = helperCalculateMinutes(attendance.clock_in, currentTime);

    let breakMinutes = 0;
    attendance.breaks.forEach((single: IBreak) => {
        breakMinutes += helperCalculateMinutes(single.break_in,single.break_out || currentTime);
    });

    const workedMinutes = totalSpentMinutes - breakMinutes;

    return {shiftStartTime,shiftEndTime,shiftMinutes,totalSpentMinutes,breakMinutes,workedMinutes};
}

export {
    helperStringToDate,
    helperTOIST,
    helperErrorEmission,
    helperMessageEmission,
    helperCalculateMinutes,
    formatHoursMinutes,
    getShiftCalculation
};