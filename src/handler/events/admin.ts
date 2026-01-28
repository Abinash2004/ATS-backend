import type { Socket } from "socket.io";
import type { IAdvancePayroll } from "../../interface/advance_payroll";
import { runPayroll } from "../payroll.run";
import { getPendingAdvancePayroll } from "../mongoose/advance_payroll";
import { createAttendanceRecordHandler } from "./hr";
import { errorEmission, messageEmission } from "../helper";
import { getRecentAttendanceRecordDate } from "../mongoose/attendance_record";
import { countDays, dateToIST, parseDateDMY } from "../../utils/date_time";
import {
	getLastPayrollDate,
	getPayrollHistory,
} from "../mongoose/payroll_record";

async function runPayrollHandler(
	socket: Socket,
	startDate: string,
	endDate: string,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}

		let start: Date;
		let end: Date;

		if (!endDate) {
			messageEmission(socket, "failed", "ending date is required.");
			return;
		}

		const tempDate: Date | null = await getLastPayrollDate();
		if (tempDate) {
			start = new Date(tempDate.setDate(tempDate.getDate() + 1));
			end = parseDateDMY(endDate);
		} else {
			if (!startDate) {
				messageEmission(socket, "failed", "starting date is required.");
				return;
			}
			start = parseDateDMY(startDate);
			end = parseDateDMY(endDate);
		}

		const days = countDays(start, end);
		if (days < 29 || days > 31) {
			messageEmission(
				socket,
				"failed",
				"number of payroll days must be between 29 and 31.",
			);
			return;
		}

		await createAttendanceRecordHandler(socket);
		let isAdvancePayroll = false;
		let actualEndDate: Date = end;
		const recentAttendanceDate: Date | null =
			await getRecentAttendanceRecordDate();

		if (!recentAttendanceDate) {
			messageEmission(socket, "failed", `attendance record is empty.`);
			return;
		}
		if (recentAttendanceDate < end) {
			isAdvancePayroll = true;
			end = recentAttendanceDate;
		}
		if (recentAttendanceDate < start) {
			messageEmission(socket, "failed", `attendance record do not exists.`);
			return;
		}

		//advance payroll calculation & verification
		let isPendingAdvancePayroll = false;
		const pendingAdvancePayroll: IAdvancePayroll | null =
			await getPendingAdvancePayroll();

		if (pendingAdvancePayroll) {
			if (recentAttendanceDate < pendingAdvancePayroll.end_date) {
				messageEmission(
					socket,
					"failed",
					`payroll blocked till ${dateToIST(pendingAdvancePayroll.end_date)}.`,
				);
				return;
			}
			isPendingAdvancePayroll = true;
		}

		await runPayroll(
			socket,
			start,
			end,
			isPendingAdvancePayroll,
			pendingAdvancePayroll,
			isAdvancePayroll,
			recentAttendanceDate,
			actualEndDate,
		);
	} catch (error) {
		errorEmission(socket, error);
	}
}
async function viewPayrollHistory(socket: Socket): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		const payrollHistory = await getPayrollHistory();
		messageEmission(socket, "success", payrollHistory);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export { runPayrollHandler, viewPayrollHistory };
