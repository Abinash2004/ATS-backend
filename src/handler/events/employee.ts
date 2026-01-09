import type {Socket} from "socket.io";
import type {DayStatus} from "../../type/day_status.ts";
import type {IEmployee} from "../../interface/employee.ts";
import type {IDepartment} from "../../interface/department.ts";
import type {IAttendance} from "../../interface/attendance.ts";
import type {leave_response} from "../../type/leave_response.ts";
import {createBonus} from "../mongoose/bonus.ts";
import {getDepartment} from "../mongoose/department.ts";
import {isValidMonthYear} from "../../utils/validations.ts";
import {createLeave, updateLeave} from "../mongoose/leave.ts";
import {getEmployeeAttendanceRecord} from "../mongoose/attendance_record.ts";
import {getMonthlyEmployeeSalarySlip} from "../mongoose/salary_slip.ts";
import {formatHoursMinutes,getShiftData,errorEmission,messageEmission,dateToIST} from "../helper.ts";
import {
    addNewAttendance,addNewBreak,getAttendance,getAttendanceRecord,getTodayAttendance,
    isShiftTimeCompleted,resolveAttendance,updateClockOutTime,updateOngoingBreak
} from "../mongoose/attendance.ts";

async function clockInHandler(socket: Socket,employee: IEmployee, reason: string): Promise<void> {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        if(!attendance) {
            await addNewAttendance(socket, employee._id, employee.shiftId.toString(), reason);
        } else if (attendance.status === "in" || attendance.status === "out") {
            messageEmission(socket, "failed","can't clock in if already clocked in or clocked out.");
        } else {
            await updateOngoingBreak(socket, employee._id.toString(), attendance);
        }
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function clockOutHandler(socket: Socket,employee: IEmployee, reason: string) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        if(!attendance) {
            messageEmission(socket, "failed","not clocked in yet.");
        } else if (attendance.status === "break" || attendance.status === "out") {
            messageEmission(socket, "failed","can't clock out if already clocked out or in break.");
        } else if (!await isShiftTimeCompleted(attendance) && !reason) {
            messageEmission(socket, "failed","shift hours are pending, provide reason for early clock out.");
        } else {
            await updateClockOutTime(socket, employee._id.toString(), attendance, reason);
        }
    } catch (error) {
        errorEmission(socket,error);
    }
}

async function breakHandler(reason: string, socket: Socket,employee: IEmployee) {
    try {
        const attendance: IAttendance | null = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        if(!attendance || attendance.status === "break" || attendance.status === "out") {
            messageEmission(socket, "failed","not clocked in yet.");
        } else if (!reason) {
            messageEmission(socket, "failed","give reason for the break.");
        } else {
            await addNewBreak(socket, employee._id.toString(),attendance, reason);
        }
    } catch (error) {
        errorEmission(socket,error);
    }
}

async function statusHandler(socket:Socket, employee: IEmployee) {
    try {
        let status;
        const attendance = await getTodayAttendance(socket,employee._id, employee.shiftId.toString());
        const attendanceRecord = await getAttendanceRecord(employee._id);
        if(!attendance) status = "not clocked in yet.";
        else {
            const currentTime = attendance.clock_out || new Date();
            const {shiftStartTime,shiftEndTime,breakMinutes,workedMinutes,pendingTimeMinutes,overTimeMinutes} =
                await getShiftData(attendance,currentTime);
            status = {
                status: attendance.status,
                "clocked in": dateToIST(attendance.clock_in),
                "break time": formatHoursMinutes(breakMinutes),
                "working time": formatHoursMinutes( workedMinutes),
                "pending time": formatHoursMinutes(pendingTimeMinutes),
                "over time": formatHoursMinutes(overTimeMinutes),
                "shift": {from: dateToIST(shiftStartTime),to: dateToIST(shiftEndTime)},
            };
        }
        messageEmission(socket, "success",{
            "current status": status,
            "attendance record": attendanceRecord
        });
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function resolvePendingAttendanceHandler(socket: Socket, attendanceId: string, clockOutTime: string) {
    try {
        const attendance: IAttendance | null = await getAttendance(attendanceId);
        if(!attendance) {
            messageEmission(socket, "failed",`${attendanceId} is an invalid attendance id.`);
            return;
        }
        await resolveAttendance(socket,attendance, clockOutTime);
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function leaveRequestHandler(socket: Socket, employeeId: string, shiftId: string, leave_date: string, day_status: DayStatus, reason: string) {
    try {
        if (!leave_date || !day_status || !reason) {
            messageEmission(socket, "failed","incomplete / invalid credentials.");
            return;
        }
        await createLeave(socket, leave_date, day_status, reason, employeeId, shiftId);
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function leaveResponseHandler(socket: Socket, leaveId: string, response: leave_response, departmentId: string) {
    try {
        if (!leaveId || !response) {
            messageEmission(socket, "failed","incomplete / invalid credentials.");
            return;
        }
        if (response !== "pending" && response !== "approved" && response !== "rejected") {
            messageEmission(socket,"success","response can only be approved, pending or rejected.");
            return;
        }
        const department: IDepartment | null = await getDepartment(departmentId);
        if (department && department.name !== "Human Resources") {
            messageEmission(socket, "failed","current user is not in HR department.");
            return;
        }
        await updateLeave(socket, leaveId, response);
    } catch (error) {
        errorEmission(socket,error);
    }
}

async function viewEmployeeAttendanceHandler(socket: Socket, employeeId: string) {
    try {
        const attendanceRecord = await getEmployeeAttendanceRecord(employeeId);
        messageEmission(socket, "success",attendanceRecord);
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function viewEmployeeSalaryHandler(socket:Socket, month: string, employeeId: string) {
    try {
        if (!month) {
            messageEmission(socket,"failed","month is missing.");
            return;
        }
        if (!isValidMonthYear(month)) {
            messageEmission(socket,"failed","invalid month format [mm/yyyy].");
            return;
        }
        const salarySlip = await getMonthlyEmployeeSalarySlip(month,employeeId);
        messageEmission(socket,"success",salarySlip);
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function giveBonusHandler(socket:Socket, currEmpId: string, employeeId: string, amount: Number, reason: string) {
    try {
        if (!currEmpId || !employeeId || !amount || !reason) {
            messageEmission(socket,"failed","required arguments are missing.");
            return;
        }
        const department: IDepartment | null = await getDepartment(employeeId);
        if (department && department.name !== "Human Resources") {
            messageEmission(socket,"failed","only HR department can provide bonus.");
            return;
        }
        await createBonus(employeeId, amount, reason);
        messageEmission(socket,"success",`Bonus successfully created for ${employeeId}`);
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {
    clockInHandler,
    breakHandler,
    clockOutHandler,
    statusHandler,
    resolvePendingAttendanceHandler,
    leaveRequestHandler,
    leaveResponseHandler,
    viewEmployeeAttendanceHandler,
    viewEmployeeSalaryHandler,
    giveBonusHandler
};