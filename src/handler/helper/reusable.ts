import type { Socket } from "socket.io";
import type { ISingleShift } from "../../interface/shift";
import type { IAttendanceRecord } from "../../interface/attendance_record";
import type { IAttendance, IBreak } from "../../interface/attendance";
import type {
	ISalaryTemplate,
	ISalaryTemplateComponent,
} from "../../interface/salary_template";
import { getShift } from "../mongoose/shift";
import { readSalaryTemplate } from "../mongoose/salary_template";
import { getBreakPerHourPenalty } from "../mongoose/policy";
import {
	evaluateSalaryTemplate,
	isValidMonthYear,
} from "../../utils/validations";
import {
	calculateMinutes,
	getDayName,
	getLastDayUtc,
	stringToDate,
} from "../../utils/date_time";
import { IAdvancePayroll } from "../../interface/advance_payroll";

export function errorEmission(socket: Socket, error: unknown): void {
	socket.emit("server_response", {
		status: "failed",
		message: error instanceof Error ? error.message : error,
	});
}

export function messageEmission(
	socket: Socket,
	status: string,
	message: any,
): void {
	socket.emit("server_response", { status, message });
}

export async function getShiftData(attendance: IAttendance, currentTime: Date) {
	let shiftStartTime = stringToDate(attendance.shift.start_time);
	let shiftEndTime = stringToDate(attendance.shift.end_time);

	if (attendance.shift.day_status === "first_half") {
		const timeRange = calculateMinutes(shiftStartTime, shiftEndTime);
		shiftEndTime.setMinutes(shiftEndTime.getMinutes() - timeRange / 2);
	} else if (attendance.shift.day_status === "second_half") {
		const timeRange = calculateMinutes(shiftStartTime, shiftEndTime);
		shiftStartTime.setMinutes(shiftStartTime.getMinutes() + timeRange / 2);
	}

	// Night shift handling
	if (shiftStartTime > shiftEndTime) {
		shiftEndTime.setDate(shiftEndTime.getDate() + 1);
	}

	let breakMinutes = 0;
	const shiftMinutes = calculateMinutes(shiftStartTime, shiftEndTime);
	const totalSpentMinutes = calculateMinutes(attendance.clock_in, currentTime);
	attendance.breaks.forEach((single: IBreak) => {
		breakMinutes += calculateMinutes(
			single.break_in,
			single.break_out || currentTime,
		);
	});

	const workedMinutes = totalSpentMinutes - breakMinutes;
	const pendingTimeMinutes =
		shiftMinutes - workedMinutes > 0 ? shiftMinutes - workedMinutes : 0;
	const overTimeMinutes =
		workedMinutes - shiftMinutes > 0 ? workedMinutes - shiftMinutes : 0;

	return {
		shiftStartTime,
		shiftEndTime,
		shiftMinutes,
		breakMinutes,
		workedMinutes,
		pendingTimeMinutes,
		overTimeMinutes,
	};
}

export async function getShiftTimings(shift: ISingleShift): Promise<Date[]> {
	try {
		let shiftInitialTime: Date = stringToDate(shift.start_time);
		let shiftExitTime: Date = stringToDate(shift.end_time);

		if (shift.day_status === "first_half") {
			const timeRange = calculateMinutes(shiftInitialTime, shiftExitTime);
			shiftExitTime.setMinutes(shiftExitTime.getMinutes() - timeRange / 2);
		} else if (shift.day_status === "second_half") {
			const timeRange = calculateMinutes(shiftInitialTime, shiftExitTime);
			shiftInitialTime.setMinutes(
				shiftInitialTime.getMinutes() + timeRange / 2,
			);
		}
		return [shiftInitialTime, shiftExitTime];
	} catch (error) {
		console.log(error);
		return [];
	}
}

export async function calculateShiftSalary(
	shiftId: string,
	start: Date,
	end: Date,
	amount: number,
): Promise<number> {
	try {
		const shiftCount = await calculateWorkingShift(shiftId, start, end);
		return amount / shiftCount;
	} catch (error) {
		console.log(error);
		return 0;
	}
}

export async function calculateWorkingShift(
	shiftId: string,
	start: Date,
	end: Date,
): Promise<number> {
	try {
		const shift = await getShift(shiftId);
		if (!shift) return 0;
		let shiftCount = 0;

		start = new Date(start.getFullYear(), start.getMonth(), 1);
		end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

		for (
			let iterDate = new Date(start);
			iterDate <= new Date(end);
			iterDate.setDate(iterDate.getDate() + 1)
		) {
			const day = getDayName(iterDate);
			if (shift[day].day_status === "full_day") {
				shiftCount += 2;
			} else if (
				shift[day].day_status === "first_half" ||
				shift[day].day_status === "second_half"
			) {
				shiftCount++;
			}
		}
		return shiftCount;
	} catch (error) {
		console.log(error);
		return 0;
	}
}

export async function calculateTotalWorkingShift(
	attendanceRecord: IAttendanceRecord[],
): Promise<number> {
	try {
		let shiftCount = 0;

		if (!attendanceRecord[0]) return 0;

		let shiftId: string = attendanceRecord[0].shiftId.toString();
		let shift = await getShift(shiftId.toString());
		if (!shift) return 0;

		for (let attendance of attendanceRecord) {
			if (shiftId !== attendance.shiftId.toString()) {
				shiftId = attendance.shiftId.toString();
				shift = await getShift(attendance.shiftId.toString());
				if (!shift) return 0;
			}
			const day = getDayName(attendance.attendance_date);
			if (shift[day].day_status === "full_day") {
				shiftCount += 2;
			} else if (
				shift[day].day_status === "first_half" ||
				shift[day].day_status === "second_half"
			) {
				shiftCount++;
			}
		}
		return shiftCount;
	} catch (error) {
		console.log(error);
		return 0;
	}
}

export async function calculateOvertimePay(
	fullAttendance: IAttendance,
	shiftSalary: number,
	salaryTemplate: ISalaryTemplate | null,
): Promise<number> {
	try {
		if (!fullAttendance.clock_out) return 0;
		let { shiftMinutes, overTimeMinutes } = await getShiftData(
			fullAttendance,
			fullAttendance.clock_out,
		);

		if (!salaryTemplate) {
			return (shiftSalary * overTimeMinutes) / (shiftMinutes / 2);
		}

		const perShiftComponents: ISalaryTemplateComponent[] = [
			...salaryTemplate.earnings,
			salaryTemplate.overtime,
		];

		const hourlyPay = (shiftSalary * 60) / (shiftMinutes / 2);

		const otResult = evaluateSalaryTemplate(hourlyPay, perShiftComponents);

		return otResult[salaryTemplate.overtime.code];
	} catch (error) {
		console.log(error);
		return 0;
	}
}

export async function calculateOvertimeMinutes(
	fullAttendance: IAttendance,
): Promise<number> {
	try {
		if (!fullAttendance.clock_out) return 0;
		let { overTimeMinutes } = await getShiftData(
			fullAttendance,
			fullAttendance.clock_out,
		);
		return overTimeMinutes;
	} catch (error) {
		console.log(error);
		return 0;
	}
}

export function checkMonthValidationAndCurrentDate(
	month: string,
	socket: Socket,
): boolean {
	if (!month) {
		messageEmission(socket, "failed", "month is missing.");
		return false;
	}
	if (!isValidMonthYear(month)) {
		messageEmission(socket, "failed", "invalid month format [mm/yyyy].");
		return false;
	}
	const lastDate: Date = getLastDayUtc(month);
	const currentDate: Date = new Date(Date.now());
	if (lastDate >= currentDate) {
		messageEmission(socket, "failed", "month has not ended.");
		return false;
	}
	return true;
}

export async function checkBreakPenalty(
	breaks: IBreak[],
	currentTime: Date,
): Promise<number> {
	let breakMinutes: number = 0;
	let penalty: number = 0;

	for (let b of breaks) {
		if (!b.break_out) {
			breakMinutes = calculateMinutes(b.break_in, currentTime);
		}
	}
	const penaltyPerHour = await getBreakPerHourPenalty();
	while (breakMinutes > 0) {
		breakMinutes -= 60;
		penalty += penaltyPerHour;
	}
	return penalty;
}

export async function getSalaryTemplateEarningData(
	employeeId: string,
	salary: number,
): Promise<Record<string, number>> {
	try {
		const salaryTemplate = await readSalaryTemplate(employeeId);
		if (!salaryTemplate) return {};
		return evaluateSalaryTemplate(salary, salaryTemplate.earnings);
	} catch (error) {
		console.log(error);
		return {};
	}
}

export async function getSalaryTemplateLeaveData(
	employeeId: string,
	salary: number,
): Promise<Record<string, number>> {
	try {
		const salaryTemplate = await readSalaryTemplate(employeeId);
		if (!salaryTemplate) return {};
		const perShiftComponents: ISalaryTemplateComponent[] = [
			...salaryTemplate.earnings,
			...salaryTemplate.leaves,
		];
		return evaluateSalaryTemplate(salary, perShiftComponents);
	} catch (error) {
		console.log(error);
		return {};
	}
}

export function normalizeAttendance(a: IAttendance): IAttendance {
	return {
		...a,
		clock_in: new Date(a.clock_in),
		clock_out: a.clock_out ? new Date(a.clock_out) : undefined,
		breaks: a.breaks.map((b) => ({
			...b,
			break_in: new Date(b.break_in),
			break_out: b.break_out ? new Date(b.break_out) : undefined,
		})),
	};
}

export function normalizeAdvancePayroll(raw: IAdvancePayroll): IAdvancePayroll {
	return {
		...raw,
		start_date: new Date(raw.start_date),
		end_date: new Date(raw.end_date),
	};
}
