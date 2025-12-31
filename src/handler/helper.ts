import type {Socket} from "socket.io";
import type {IAttendance, IBreak} from "../interface/attendance.ts";
import {getShift} from "./mongoose/shift.ts";

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

async function getShiftData(attendance: IAttendance,shiftId: string,currentTime: Date) {
    const shift = await getShift(shiftId);
    if (!shift) throw new Error("Invalid shift");
    const shiftStartTime = stringToDate(shift.initial_time);
    const shiftEndTime = stringToDate(shift.exit_time);

    // Night shift handling
    if (shiftStartTime > shiftEndTime) {
        shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }

    const shiftMinutes = calculateMinutes(shiftStartTime, shiftEndTime);
    const totalSpentMinutes = calculateMinutes(attendance.clock_in, currentTime);

    let breakMinutes = 0;
    attendance.breaks.forEach((single: IBreak) => {
        breakMinutes += calculateMinutes(single.break_in,single.break_out || currentTime);
    });

    const workedMinutes = totalSpentMinutes - breakMinutes;

    return {shiftStartTime,shiftEndTime,shiftMinutes,totalSpentMinutes,breakMinutes,workedMinutes};
}

export {
    stringToDate,
    dateToIST,
    errorEmission,
    messageEmission,
    calculateMinutes,
    formatHoursMinutes,
    getShiftData
};