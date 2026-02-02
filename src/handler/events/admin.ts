import dotenv from "dotenv";
import type { Socket } from "socket.io";
import type { IAdvancePayroll } from "../../interface/advance_payroll";
import { Queue } from "bullmq";
import { dateToIST } from "../../utils/date_time";
import { IEmployee } from "../../interface/employee";
import { getPayrollHistory } from "../mongoose/payroll_record";
import { getAllEmployeesList } from "../mongoose/employee";
import { getPendingAdvancePayroll } from "../mongoose/advance_payroll";
import { createAttendanceRecordHandler } from "./hr";
import { errorEmission, messageEmission } from "../helper/reusable";
import { getRecentAttendanceRecordDate } from "../mongoose/attendance_record";
import { getStartAndEndDate, postPayrollHandler } from "../helper/payroll";
import { getAttendanceByDateRange } from "../mongoose/attendance";
import { IAttendance } from "../../interface/attendance";

dotenv.config({ quiet: true });
const redisURI = process.env.REDIS_QUEUE_URL || "redis://localhost:6379/0";

export const payrollQueue = new Queue("payroll", {
	connection: { url: redisURI, skipVersionCheck: true },
});

export async function runPayrollHandler(
	socket: Socket,
	startDate: string,
	endDate: string,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!endDate) {
			messageEmission(socket, "failed", "ending date is required.");
			return;
		}

		// check for first payroll run
		const result = await getStartAndEndDate(socket, startDate, endDate);
		if (!result) return;
		let start: Date = result.start;
		let end: Date = result.end;

		await createAttendanceRecordHandler(socket);

		// check for attendance and payroll date sync
		let isAdvancePayroll = false;
		let actualEndDate: Date = end;
		const recentAttendanceDate: Date | null =
			await getRecentAttendanceRecordDate();
		let fullAttendanceStart = start;
		let fullAttendanceEnd = end;

		if (!recentAttendanceDate) {
			messageEmission(socket, "failed", `attendance record is empty.`);
			return;
		}
		if (recentAttendanceDate < end) {
			isAdvancePayroll = true;
			end = recentAttendanceDate;
			fullAttendanceEnd = recentAttendanceDate;
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
			fullAttendanceStart = pendingAdvancePayroll.start_date;
			isPendingAdvancePayroll = true;
		}

		const fullAttendance: IAttendance[] = await getAttendanceByDateRange(
			fullAttendanceStart,
			fullAttendanceEnd,
		);

		// payroll run for each employee
		const employees: IEmployee[] = await getAllEmployeesList();
		for (let emp of employees) {
			await payrollQueue.add("employeePayroll", {
				employeeId: emp._id.toString(),
				start,
				end,
				isPendingAdvancePayroll,
				pendingAdvancePayroll,
				isAdvancePayroll,
				recentAttendanceDate,
				actualEndDate,
				fullAttendance,
			});
		}

		await postPayrollHandler(
			socket,
			isAdvancePayroll,
			isPendingAdvancePayroll,
			recentAttendanceDate,
			actualEndDate,
			start,
			end,
		);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function viewPayrollHistory(socket: Socket): Promise<void> {
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
