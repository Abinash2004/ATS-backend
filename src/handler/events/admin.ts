import type {Socket} from "socket.io";
import type {IAdvancePayroll} from "../../interface/advance_payroll.ts";
import {runPayroll} from "../payroll.run.ts";
import {getPendingAdvancePayroll} from "../mongoose/advance_payroll.ts";
import {createAttendanceRecordHandler} from "./hr.ts";
import {errorEmission,messageEmission} from "../helper.ts";
import {getRecentAttendanceRecordDate} from "../mongoose/attendance_record.ts";
import {countDays,dateToIST,parseDateDMY} from "../../utils/date_time.ts";
import {getLastPayrollDate,getPayrollHistory} from "../mongoose/payroll_record.ts";

async function runPayrollHandler(socket:Socket,startDate: string, endDate: string) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        let start: Date;
        let end: Date;
        if (!endDate) {
            messageEmission(socket,"failed","ending date is required.");
            return;
        }
        const tempDate: Date|null = await getLastPayrollDate();
        if (tempDate) {
            start = new Date(tempDate.setDate(tempDate.getDate()+1));
            end = parseDateDMY(endDate);
        } else {
            if (!startDate) {
                messageEmission(socket,"failed","starting date is required.");
                return;
            }
            start = parseDateDMY(startDate);
            end = parseDateDMY(endDate);
        }

        const days = countDays(start,end);
        if(days < 29 || days > 31) {
            messageEmission(socket,"failed","number of payroll days must be between 29 and 31.");
            return;
        }

        await createAttendanceRecordHandler(socket);
        let isAdvancePayroll = false;
        let actualEndDate: Date = end;
        const recentAttendanceDate: Date|null = await getRecentAttendanceRecordDate();
        if (!recentAttendanceDate) {
            messageEmission(socket,"failed",`attendance record is empty.`);
            return;
        }
        if (recentAttendanceDate < end) {
            isAdvancePayroll = true;
            end = recentAttendanceDate;
        }

        if (recentAttendanceDate < start) {
            messageEmission(socket,"failed",`attendance record after ${dateToIST(recentAttendanceDate)} do not exists.`);
            return;
        }

        //advance payroll calculation & verification
        let isPendingAdvancePayroll = false;
        const pendingAdvancePayroll: IAdvancePayroll | null = await getPendingAdvancePayroll();
        if (pendingAdvancePayroll) {
            if (recentAttendanceDate < pendingAdvancePayroll.end_date) {
                messageEmission(socket, "failed", `payroll can't be run before ${dateToIST(pendingAdvancePayroll.end_date)} (to resolve the advance payment).`);
                return;
            }
            isPendingAdvancePayroll = true;
        }
        await runPayroll(socket,start,end,isPendingAdvancePayroll,pendingAdvancePayroll,isAdvancePayroll,recentAttendanceDate,actualEndDate);
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function viewPayrollHistory(socket:Socket) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        const payrollHistory = await getPayrollHistory();
        messageEmission(socket, "success",payrollHistory);
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {runPayrollHandler,viewPayrollHistory}