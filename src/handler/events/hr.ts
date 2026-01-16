import type {Socket} from "socket.io";
import type {IEmployee} from "../../interface/employee.ts";
import type {IAttendance} from "../../interface/attendance.ts";
import type {leave_response} from "../../type/leave_response.ts";
import type {IAttendanceSheet} from "../../interface/attendance_sheet.ts";
import Attendance from "../../model/attendance.ts";
import {getShift} from "../mongoose/shift.ts";
import {updateLeave} from "../mongoose/leave.ts";
import {createBonus} from "../mongoose/bonus.ts";
import {createPenalty} from "../mongoose/penalty.ts";
import {generateSheet} from "../../utils/sheet_generation.ts";
import {getAllEmployeesList} from "../mongoose/employee.ts";
import {dateToIST,formatHoursMinutes,getDayName,getFirstDayUtc,getLastDayUtc,toMonthName} from "../../utils/date_time.ts";
import {getAllAttendanceRecord,getEmployeeAttendanceRecordMonthWise,getRecentAttendanceRecordDate} from "../mongoose/attendance_record.ts";
import {attendanceFirstHalfHandler,attendanceFullDayHandler,attendanceHolidayHandler,attendanceSecondHalfHandler} from "../attendance.ts";
import {calculateOvertimeMinutes,calculateOvertimePay,calculateShiftSalary,checkMonthValidationAndCurrentDate,errorEmission,messageEmission} from "../helper.ts";

async function createAttendanceRecordHandler(socket: Socket) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.")
            return;
        }
        let startDate:Date | null = await getRecentAttendanceRecordDate();
        if (!startDate) {
            const attendance: IAttendance | null = await Attendance.findOne().sort({clock_in: 1}).exec();
            if (!attendance) {
                messageEmission(socket, "failed","there is no attendance record");
                return;
            }
            startDate = attendance.clock_in;
        }
        let endDate: Date = new Date(Date.now());
        endDate.setDate(endDate.getDate()-1);
        const employees: IEmployee[] = await getAllEmployeesList();

        for (let iterDate = new Date(startDate);iterDate <= endDate;iterDate.setDate(iterDate.getDate() + 1)) {
            const day = getDayName(iterDate);
            for (let emp of employees) {
                const shift = await getShift(emp.shiftId.toString());
                if (!shift) continue;
                const day_status = shift[day].day_status;
                if (day_status === "holiday") {
                    await attendanceHolidayHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                } else if (day_status === "first_half") {
                    await attendanceFirstHalfHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                } else if (day_status === "second_half") {
                    await attendanceSecondHalfHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                } else if (day_status === "full_day") {
                    await attendanceFullDayHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                }
            }
        }
        messageEmission(socket,"success","attendance record generated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function viewAllAttendanceRecordHandler(socket:Socket) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.")
            return;
        }
        const attendanceRecord = await getAllAttendanceRecord();
        messageEmission(socket,"success",attendanceRecord);
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function generateAttendanceSheetHandler(socket:Socket, month: string) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.")
            return;
        }
        if (!checkMonthValidationAndCurrentDate(month, socket)) return;
        const employees: IEmployee[] = await getAllEmployeesList();
        for (let emp of employees) {
            console.log("pass");
            const attendance = await getEmployeeAttendanceRecordMonthWise(emp._id.toString(), month);
            if (!attendance.length) {
                messageEmission(socket,"failed",`there is no attendance record for ${toMonthName(month)}`);
                return;
            }
            let shiftId: string = attendance[0].shiftId.toString();
            const startDate: Date = getFirstDayUtc(month);
            const lastDate: Date = getLastDayUtc(month);
            let shiftSalary = await calculateShiftSalary(attendance[0].shiftId.toString(), startDate,lastDate, emp.salary);
            let attendanceSheetData: IAttendanceSheet[] = [];
            let sheetData: IAttendanceSheet;
            for (let att of attendance) {
                let first_half_pay: number = 0;
                let second_half_pay: number = 0;

                if (shiftId !== att.shiftId.toString()) {
                    shiftId = att.shiftId.toString();
                    shiftSalary = await calculateShiftSalary(att.shiftId.toString(), startDate,lastDate, emp.salary);
                }
                if (att.first_half === "present" || att.first_half === "paid_leave") {
                    first_half_pay += shiftSalary;
                }
                if (att.second_half === "present" || att.second_half === "paid_leave") {
                    second_half_pay += shiftSalary;
                }
                const overtimeMinutes = await calculateOvertimeMinutes(att, emp._id.toString());
                const overTimeWages = await calculateOvertimePay(att, emp._id.toString(), shiftSalary);
                sheetData = {
                    "Date": dateToIST(att.attendance_date).split(",")[0],
                    "First Half": att.first_half,
                    "Second Half": att.second_half,
                    "First Half Pay": first_half_pay.toString(),
                    "Second Half Pay": second_half_pay.toString(),
                    "Over Time": formatHoursMinutes(overtimeMinutes),
                    "Over Time Pay": overTimeWages.toString(),
                    "Total Pay": (first_half_pay+second_half_pay+overTimeWages).toString()
                }
                attendanceSheetData.push(sheetData);
            }
            generateSheet(attendanceSheetData, toMonthName(month),emp.email);
            messageEmission(socket,"success",`Attendance Excel Sheet for ${toMonthName(month)} is generated successfully.`);
        }
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function leaveResponseHandler(socket: Socket, leaveId: string, response: leave_response) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.")
            return;
        }
        if (!leaveId || !response) {
            messageEmission(socket, "failed","incomplete / invalid credentials.");
            return;
        }
        if (response !== "pending" && response !== "approved" && response !== "rejected") {
            messageEmission(socket,"success","response can only be approved, pending or rejected.");
            return;
        }
        await updateLeave(socket, leaveId, response);
    } catch (error) {
        errorEmission(socket,error);
    }
}
async function giveBonusHandler(socket:Socket, currEmpId: string, employeeId: string, amount: Number, reason: string) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.")
            return;
        }
        if (!currEmpId || !employeeId || !amount || !reason) {
            messageEmission(socket,"failed","required arguments are missing.");
            return;
        }
        await createBonus(employeeId, amount, reason);
        messageEmission(socket,"success",`Bonus successfully created for ${employeeId}`);
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function givePenaltyHandler(socket:Socket, currEmpId: string, employeeId: string, amount: Number, reason: string) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.")
            return;
        }
        if (!currEmpId || !employeeId || !amount || !reason) {
            messageEmission(socket,"failed","required arguments are missing.");
            return;
        }
        await createPenalty(employeeId, amount, reason);
        messageEmission(socket,"success",`Penalty successfully created for ${employeeId}`);
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {createAttendanceRecordHandler,viewAllAttendanceRecordHandler,generateAttendanceSheetHandler,leaveResponseHandler,giveBonusHandler,givePenaltyHandler};