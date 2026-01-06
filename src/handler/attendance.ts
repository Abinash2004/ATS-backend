import type {Socket} from "socket.io";
import type {AttendanceStatus} from "../type/attendance.ts";
import {errorEmission, getShiftData} from "./helper.ts";
import {getApprovedLeave} from "./mongoose/leave.ts";
import {getAttendanceByDate} from "./mongoose/attendance.ts";
import {setAttendanceRecord} from "./mongoose/attendance_record.ts";

async function attendanceHolidayHandler(socket: Socket, attendance_date: Date, employeeId: string): Promise<void> {
    try {
        await setAttendanceRecord(attendance_date, "no_shift", "no_shift", employeeId);
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function attendanceFirstHalfHandler(socket: Socket, attendance_date: Date, employeeId: string): Promise<void> {
    try {
        const second_half: AttendanceStatus = "no_shift";
        const leave = await getApprovedLeave(attendance_date, employeeId);
        if (leave && (leave.day_status === "first_half" || leave.day_status === "full_day")) {
            await  setAttendanceRecord(attendance_date, "paid_leave", second_half, employeeId);
        } else {
            const attendance = await getAttendanceByDate(attendance_date);
            if (!attendance) await setAttendanceRecord(attendance_date, "absent", second_half, employeeId);
            else {
                if(!attendance.clock_out) return;
                const {shiftMinutes,workedMinutes} = await getShiftData(attendance, attendance.clock_out);
                if (shiftMinutes <= workedMinutes) await setAttendanceRecord(attendance_date, "present", second_half, employeeId);
                else await setAttendanceRecord(attendance_date, "absent", second_half, employeeId);
            }
        }
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function attendanceSecondHalfHandler(socket: Socket, attendance_date: Date, employeeId: string): Promise<void> {
    try {
        const first_half: AttendanceStatus = "no_shift";
        const leave = await getApprovedLeave(attendance_date, employeeId);
        if (leave && (leave.day_status === "second_half" || leave.day_status === "full_day")) {
            await  setAttendanceRecord(attendance_date, first_half, "paid_leave", employeeId);
        } else {
            const attendance = await getAttendanceByDate(attendance_date);
            if (!attendance) await setAttendanceRecord(attendance_date, first_half, "absent", employeeId);
            else {
                if(!attendance.clock_out) return;
                const {shiftMinutes,workedMinutes} = await getShiftData(attendance, attendance.clock_out);
                if (shiftMinutes <= workedMinutes) await setAttendanceRecord(attendance_date, first_half, "present", employeeId);
                else await setAttendanceRecord(attendance_date, first_half, "absent", employeeId);
            }
        }
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function attendanceFullDayHandler(socket: Socket, attendance_date: Date, employeeId: string): Promise<void> {
    try {
        const leave = await getApprovedLeave(attendance_date, employeeId);
        if(leave) {
            if(leave.day_status === "full_day") {
                await setAttendanceRecord(attendance_date,"paid_leave","paid_leave",employeeId);
            } else if (leave.day_status === "first_half") {
                const attendance = await getAttendanceByDate(attendance_date);
                if (!attendance) await setAttendanceRecord(attendance_date,"paid_leave","absent", employeeId);
                else {
                    if (!attendance.clock_out) return;
                    const {shiftMinutes,workedMinutes} = await getShiftData(attendance, attendance.clock_out);
                    if (workedMinutes < shiftMinutes/2) await setAttendanceRecord(attendance_date,"paid_leave","absent", employeeId);
                    else await setAttendanceRecord(attendance_date,"paid_leave","present", employeeId);
                }
            } else if (leave.day_status === "second_half") {
                const attendance = await getAttendanceByDate(attendance_date);
                if (!attendance) await setAttendanceRecord(attendance_date,"absent","paid_leave", employeeId);
                else {
                    if (!attendance.clock_out) return;
                    const {shiftMinutes,workedMinutes} = await getShiftData(attendance, attendance.clock_out);
                    if (workedMinutes < shiftMinutes/2) await setAttendanceRecord(attendance_date,"absent","paid_leave", employeeId);
                    else await setAttendanceRecord(attendance_date,"present","paid_leave", employeeId);
                }
            }
            return;
        }
        const attendance = await getAttendanceByDate(attendance_date);
        if (!attendance) {
            await setAttendanceRecord(attendance_date,"absent","absent", employeeId);
        } else {
            if(!attendance.clock_out) return;
            const {shiftMinutes,workedMinutes} = await getShiftData(attendance, attendance.clock_out);
            if (shiftMinutes <= workedMinutes) await setAttendanceRecord(attendance_date, "present", "present", employeeId);
            else {
                const {shiftStartTime,shiftEndTime} = await getShiftData(attendance, attendance.clock_out);
                const middleDate = new Date((shiftStartTime.getTime() + shiftEndTime.getTime()) / 2);
                if (attendance.clock_in < middleDate) await setAttendanceRecord(attendance_date,"present","absent", employeeId);
                else await setAttendanceRecord(attendance_date,"absent","present", employeeId);
            }
        }
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