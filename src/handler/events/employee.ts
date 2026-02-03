import type { Socket } from "socket.io";
import type { IBonus } from "../../interface/bonus";
import type { IPenalty } from "../../interface/penalty";
import type { DayStatus } from "../../type/day_status";
import type { IEmployee } from "../../interface/employee";
import type { IAttendance } from "../../interface/attendance";
import { getEmployeeBonus } from "../mongoose/bonus";
import { isValidMonthYear } from "../../utils/validations";
import { getEmployeePenalty } from "../mongoose/penalty";
import { getEmployeeAttendanceRecord } from "../mongoose/attendance_record";
import { dateToIST, formatHoursMinutes } from "../../utils/date_time";
import {
	getMonthlyEmployeeSalarySlip,
	getTotalEPFAmount,
} from "../mongoose/salary_slip";
import {
	getShiftData,
	errorEmission,
	messageEmission,
} from "../helper/reusable";
import {
	createLeave,
	isLeaveAvailable,
	isValidCategory,
	isValidFraction,
} from "../mongoose/leave";
import {
	addNewAttendance,
	addNewBreak,
	getAttendance,
	getAttendanceRecord,
	getTodayAttendance,
	isShiftTimeCompleted,
	resolveAttendance,
	updateClockOutTime,
	updateOngoingBreak,
} from "../mongoose/attendance";

export async function clockInHandler(
	socket: Socket,
	employee: IEmployee,
	reason: string,
): Promise<void> {
	try {
		const attendance: IAttendance | null = await getTodayAttendance(
			socket,
			employee._id,
			employee.shiftId.toString(),
		);

		if (!attendance) {
			await addNewAttendance(
				socket,
				employee._id,
				employee.shiftId.toString(),
				reason,
			);
		} else if (attendance.status === "in" || attendance.status === "out") {
			messageEmission(
				socket,
				"failed",
				"can't clock in if already clocked in or clocked out.",
			);
		} else {
			await updateOngoingBreak(socket, employee._id.toString(), attendance);
		}
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function clockOutHandler(
	socket: Socket,
	employee: IEmployee,
	reason: string,
): Promise<void> {
	try {
		const attendance: IAttendance | null = await getTodayAttendance(
			socket,
			employee._id,
			employee.shiftId.toString(),
		);

		if (!attendance) {
			messageEmission(socket, "failed", "not clocked in yet.");
		} else if (attendance.status === "break" || attendance.status === "out") {
			messageEmission(
				socket,
				"failed",
				"can't clock out if already clocked out or in break.",
			);
		} else if (!(await isShiftTimeCompleted(attendance)) && !reason) {
			messageEmission(
				socket,
				"failed",
				"shift hours are pending, provide reason for early clock out.",
			);
		} else {
			await updateClockOutTime(
				socket,
				employee._id.toString(),
				attendance,
				reason,
			);
		}
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function breakHandler(
	reason: string,
	socket: Socket,
	employee: IEmployee,
): Promise<void> {
	try {
		const attendance: IAttendance | null = await getTodayAttendance(
			socket,
			employee._id,
			employee.shiftId.toString(),
		);

		if (
			!attendance ||
			attendance.status === "break" ||
			attendance.status === "out"
		) {
			messageEmission(socket, "failed", "not clocked in yet.");
		} else if (!reason) {
			messageEmission(socket, "failed", "give reason for the break.");
		} else {
			await addNewBreak(socket, employee._id.toString(), attendance, reason);
		}
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function statusHandler(
	socket: Socket,
	employee: IEmployee,
): Promise<void> {
	try {
		let status;
		const attendance = await getTodayAttendance(
			socket,
			employee._id,
			employee.shiftId.toString(),
		);

		const attendanceRecord = await getAttendanceRecord(employee._id);
		if (!attendance) status = "not clocked in yet.";
		else {
			const currentTime = attendance.clock_out || new Date();
			const {
				shiftStartTime,
				shiftEndTime,
				breakMinutes,
				workedMinutes,
				pendingTimeMinutes,
				overTimeMinutes,
			} = await getShiftData(attendance, currentTime);

			status = {
				status: attendance.status,
				"clocked in": dateToIST(attendance.clock_in),
				"break time": formatHoursMinutes(breakMinutes),
				"working time": formatHoursMinutes(workedMinutes),
				"pending time": formatHoursMinutes(pendingTimeMinutes),
				"over time": formatHoursMinutes(overTimeMinutes),
				shift: { from: dateToIST(shiftStartTime), to: dateToIST(shiftEndTime) },
			};
		}

		messageEmission(socket, "success", {
			"current status": status,
			"attendance record": attendanceRecord,
		});
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function resolvePendingAttendanceHandler(
	socket: Socket,
	attendanceId: string,
	clockOutTime: string,
): Promise<void> {
	try {
		const attendance: IAttendance | null = await getAttendance(attendanceId);
		if (!attendance) {
			messageEmission(
				socket,
				"failed",
				`${attendanceId} is an invalid attendance id.`,
			);
			return;
		}
		await resolveAttendance(socket, attendance, clockOutTime);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function leaveRequestHandler(
	socket: Socket,
	employeeId: string,
	shiftId: string,
	leave_date: string,
	category: string,
	day_status: DayStatus,
	reason: string,
	fraction: string,
): Promise<void> {
	try {
		if (!leave_date || !category || !day_status || !reason || !fraction) {
			messageEmission(socket, "failed", "incomplete / invalid credentials.");
			return;
		}
		if (!isValidFraction(fraction)) {
			messageEmission(socket, "failed", "invalid fraction value.");
			return;
		}
		if (!(await isValidCategory(employeeId, category))) {
			messageEmission(socket, "failed", "invalid leave category.");
			return;
		}
		if (!(await isLeaveAvailable(employeeId, category))) {
			messageEmission(socket, "failed", "your leave limit exceed.");
			return;
		}

		await createLeave(
			socket,
			leave_date,
			category,
			day_status,
			reason,
			employeeId,
			shiftId,
			Math.floor(Number(fraction) * 100) / 100,
		);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function viewEmployeeAttendanceHandler(
	socket: Socket,
	employeeId: string,
): Promise<void> {
	try {
		const attendanceRecord = await getEmployeeAttendanceRecord(employeeId);
		messageEmission(socket, "success", attendanceRecord);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function viewEmployeeSalaryHandler(
	socket: Socket,
	month: string,
	employeeId: string,
): Promise<void> {
	try {
		if (!month) {
			messageEmission(socket, "failed", "month is missing.");
			return;
		}
		if (!isValidMonthYear(month)) {
			messageEmission(socket, "failed", "invalid month format [mm/yyyy].");
			return;
		}
		const salarySlip = await getMonthlyEmployeeSalarySlip(month, employeeId);
		messageEmission(socket, "success", salarySlip);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function viewBonusHandler(
	socket: Socket,
	employeeId: string,
): Promise<void> {
	try {
		const bonus: IBonus[] = await getEmployeeBonus(employeeId);
		messageEmission(socket, "success", bonus);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function viewPenaltyHandler(
	socket: Socket,
	employeeId: string,
): Promise<void> {
	try {
		const penalty: IPenalty[] = await getEmployeePenalty(employeeId);
		messageEmission(socket, "success", penalty);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function viewEPFHandler(
	socket: Socket,
	employeeId: string,
): Promise<void> {
	try {
		const epfAmount = await getTotalEPFAmount(employeeId);
		messageEmission(
			socket,
			"success",
			`total epf amount till now: ${epfAmount}`,
		);
	} catch (error) {
		errorEmission(socket, error);
	}
}
