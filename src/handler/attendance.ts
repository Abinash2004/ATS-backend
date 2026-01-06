import {errorEmission} from "./helper.ts";
import type {Socket} from "socket.io";
import {setAttendanceRecordDate} from "./mongoose/attendance_record.ts";

async function attendanceHolidayHandler(socket: Socket, attendance_date: Date, employeeId: string): Promise<void> {
    try {
        await setAttendanceRecordDate(attendance_date, "no_shift", "no_shift", employeeId);
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function attendanceFirstHalfHandler(socket: Socket): Promise<void> {
    try {

    } catch(error) {
        errorEmission(socket,error);
    }
}
async function attendanceSecondHalfHandler(socket: Socket): Promise<void> {
    try {

    } catch(error) {
        errorEmission(socket,error);
    }
}
async function attendanceFullDayHandler(socket: Socket): Promise<void> {
    try {

    } catch(error) {
        errorEmission(socket,error);
    }
}

export {
    attendanceHolidayHandler,
    attendanceFirstHalfHandler,
    attendanceSecondHalfHandler,
    attendanceFullDayHandler
}