import dotenv from "dotenv";
import type { Socket } from "socket.io";
import type { IEmployee } from "../../interface/employee";
import type { IAttendance } from "../../interface/attendance";
import type { IAdvancePayroll } from "../../interface/advance_payroll";
import type { ISalaryTemplate } from "../../interface/salary_template";
import type { IAttendanceRecord } from "../../interface/attendance_record";
import type {
	ISalary,
	ISalaryAttendance,
	ISalaryTemplateAmount,
} from "../../interface/salary_slip";

import { getShift } from "../mongoose/shift";
import { generatePDF } from "../../utils/pdf_generation";
import { getDepartment } from "../mongoose/department";
import { getBonusByDate } from "../mongoose/bonus";
import { getApprovedLeave } from "../mongoose/leave";
import { createSalarySlip } from "../mongoose/salary_slip";
import { createPenalty, getPenaltyByDate } from "../mongoose/penalty";
import { getEmployeeAttendanceRecordDateWise } from "../mongoose/attendance_record";
import {
	getComponentName,
	readSalaryTemplate,
} from "../mongoose/salary_template";
import {
	createAdvancePayroll,
	resolveAdvancePayroll,
} from "../mongoose/advance_payroll";
import {
	createPayrollRecord,
	getLastPayrollDate,
} from "../mongoose/payroll_record";
import {
	countDays,
	dateToIST,
	dateToMonthYear,
	formatHoursMinutes,
	formatMonthYear,
	getDayName,
	parseDateDMY,
} from "../../utils/date_time";
import {
	calculateOvertimeMinutes,
	calculateOvertimePay,
	calculateTotalWorkingShift,
	calculateWorkingShift,
	errorEmission,
	getSalaryTemplateEarningData,
	getSalaryTemplateLeaveData,
	messageEmission,
	normalizeAdvancePayroll,
	normalizeAttendance,
} from "./reusable";

dotenv.config({ quiet: true });

export async function runEmployeePayroll(
	emp: IEmployee,
	start: Date,
	end: Date,
	isPendingAdvancePayroll: boolean,
	tempPendingAdvancePayroll: IAdvancePayroll | null,
	isAdvancePayroll: boolean,
	recentAttendanceDate: Date,
	actualEndDate: Date,
	fullAttendance: IAttendance[],
): Promise<void> {
	try {
		let salary = 0;
		let paidLeave = 0;
		let absentShift = 0;
		let presentShift = 0;
		let advanceSalary = 0;
		let overTimeWages = 0;
		let overtimeMinutes = 0;

		const attendanceMap: Record<string, IAttendance> = {};
		let pendingAdvancePayroll: IAdvancePayroll | null = null;
		if (tempPendingAdvancePayroll) {
			pendingAdvancePayroll = normalizeAdvancePayroll(
				tempPendingAdvancePayroll,
			);
		}

		for (const raw of fullAttendance) {
			const attendance = normalizeAttendance(raw);
			const dateId = new Date(attendance.clock_in);
			dateId.setUTCHours(0, 0, 0, 0);
			attendanceMap[dateId.toUTCString() + attendance.employeeId] = attendance;
		}

		const [
			totalBonus,
			totalPenalties,
			salaryTemplate,
			attendanceRecord,
			advanceAttendanceRecord,
		] = await Promise.all([
			getBonusByDate(emp._id.toString(), start, end),
			getPenaltyByDate(emp._id.toString(), start, end),
			readSalaryTemplate(emp._id.toString()),
			getEmployeeAttendanceRecordDateWise(emp._id.toString(), start, end),
			pendingAdvancePayroll
				? getEmployeeAttendanceRecordDateWise(
						emp._id.toString(),
						new Date(pendingAdvancePayroll.start_date),
						new Date(pendingAdvancePayroll.end_date),
					)
				: [],
		]);

		let workingShift = await calculateTotalWorkingShift(attendanceRecord);
		let shiftSalary = emp.salary / workingShift;
		let shiftId: string = emp.shiftId.toString();
		if (attendanceRecord.length !== 0) {
			shiftId = attendanceRecord[0].shiftId.toString();
		}

		const [earnings, leaves, shift] = await Promise.all([
			getSalaryTemplateEarningData(emp._id.toString(), emp.salary),
			getSalaryTemplateLeaveData(emp._id.toString(), shiftSalary),
			getShift(shiftId),
		]);

		if (!shift) throw new Error("Shift not found");
		let salaryAmount: Record<string, number> = {};
		let amountPerShift: Record<string, number> = {};
		for (let key in earnings) {
			salaryAmount[key] = 0;
			amountPerShift[key] = earnings[key] / workingShift;
		}

		//resolve advance payroll
		if (isPendingAdvancePayroll && pendingAdvancePayroll) {
			const overtimeValues = await resolveAdvancePayrollHandler(
				advanceAttendanceRecord,
				amountPerShift,
				emp,
				earnings,
				leaves,
				shiftId,
				start,
				end,
				shiftSalary,
				salaryTemplate,
				attendanceMap,
			);
			if (overtimeValues) {
				overTimeWages += overtimeValues.overTimeWages;
				overtimeMinutes += overtimeValues.overTimeMinutes;
			}
		}

		// call attendance Payroll Handler
		const attendanceResult = await attendancePayrollHandler(
			attendanceRecord,
			shiftId,
			shiftSalary,
			start,
			end,
			emp,
			amountPerShift,
			earnings,
			leaves,
			salaryAmount,
			salaryTemplate,
			attendanceMap,
		);
		if (attendanceResult) {
			salary += attendanceResult.salaryAttendance;
			paidLeave += attendanceResult.paidLeaveAttendance;
			absentShift += attendanceResult.absentShiftAttendance;
			presentShift += attendanceResult.presentShiftAttendance;
			overTimeWages += attendanceResult.overTimeWagesAttendance;
			overtimeMinutes += attendanceResult.overtimeMinutesAttendance;
		}

		if (isAdvancePayroll) {
			let shiftCount = 0;
			let iterDate = new Date(recentAttendanceDate);
			iterDate.setDate(iterDate.getDate() + 1);
			while (iterDate <= actualEndDate) {
				const day = getDayName(iterDate);

				if (shift[day].day_status === "full_day") {
					shiftCount += 2;
				} else if (
					shift[day].day_status === "first_half" ||
					shift[day].day_status === "second_half"
				) {
					shiftCount++;
				}
				iterDate.setDate(iterDate.getDate() + 1);
			}

			workingShift += shiftCount;
			presentShift += shiftCount;
			advanceSalary = shiftSalary * shiftCount;
		}

		// save pay slip and generate pdf
		await saveEmployeePayrollHandler(
			workingShift,
			presentShift,
			absentShift,
			overtimeMinutes,
			paidLeave,
			start,
			emp,
			earnings,
			salaryAmount,
			salary,
			advanceSalary,
			overTimeWages,
			totalBonus,
			totalPenalties,
		);
	} catch (error) {
		console.log(error);
	}
}

async function resolveAdvancePayrollHandler(
	advanceAttendanceRecord: IAttendanceRecord[],
	amountPerShift: Record<string, number>,
	emp: IEmployee,
	result: Record<string, number>,
	leaves: Record<string, number>,
	shiftId: string,
	start: Date,
	end: Date,
	shiftSalary: number,
	salaryTemplate: ISalaryTemplate | null,
	attendanceMap: Record<string, IAttendance>,
): Promise<{ overTimeMinutes: number; overTimeWages: number } | null> {
	try {
		let overTimeMinutes = 0;
		let overTimeWages = 0;

		for (let att of advanceAttendanceRecord) {
			if (shiftId !== att.shiftId.toString()) {
				shiftId = att.shiftId.toString();
				const workingShift = await calculateWorkingShift(shiftId, start, end);
				for (let key in result) {
					amountPerShift[key] = result[key] / workingShift;
				}
			}

			let totalPenalty = 0;
			let penaltyList = [];

			if (att.first_half === "absent") {
				for (let key in result) {
					totalPenalty += amountPerShift[key];
				}
				penaltyList.push(`${dateToIST(att.attendance_date)} (first half)`);
			} else if (leaves[att.first_half] !== undefined) {
				let penalty = 0;
				for (let key in result) {
					penalty += amountPerShift[key];
				}
				if (penalty - leaves[att.first_half] > 0) {
					const leave = await getApprovedLeave(
						att.attendance_date,
						emp._id.toString(),
					);
					let fraction = 0;
					if (leave) fraction = leave.fraction;
					totalPenalty += penalty - leaves[att.first_half] * fraction;
					penaltyList.push(`${dateToIST(att.attendance_date)} (first half)`);
				}
			}

			if (att.second_half === "absent") {
				for (let key in result) {
					totalPenalty += amountPerShift[key];
				}
				penaltyList.push(`${dateToIST(att.attendance_date)} (second half)`);
			} else if (leaves[att.second_half] !== undefined) {
				let penalty = 0;
				for (let key in result) {
					totalPenalty += amountPerShift[key];
				}
				if (penalty - leaves[att.second_half] > 0) {
					const leave = await getApprovedLeave(
						att.attendance_date,
						emp._id.toString(),
					);
					let fraction = 0;
					if (leave) fraction = leave.fraction;
					totalPenalty = penalty - leaves[att.second_half] * fraction;
					penaltyList.push(`${dateToIST(att.attendance_date)} (first half)`);
				}
			}

			if (totalPenalty) {
				await createPenalty(
					emp._id.toString(),
					totalPenalty,
					`Advance deduction for ${penaltyList}`,
				);
			}

			let dateId = new Date(att.attendance_date);
			dateId.setUTCHours(0, 0, 0, 0);
			const fullAttendance =
				attendanceMap[dateId.toUTCString() + emp._id.toString()];

			if (fullAttendance && fullAttendance?.clock_out) {
				overTimeMinutes += await calculateOvertimeMinutes(fullAttendance);
				overTimeWages += await calculateOvertimePay(
					fullAttendance,
					shiftSalary,
					salaryTemplate,
				);
			}
		}
		if (overTimeMinutes || overTimeWages) {
			return { overTimeMinutes, overTimeWages };
		}
		return null;
	} catch (error) {
		console.log(error);
		return null;
	}
}

async function attendancePayrollHandler(
	attendance: IAttendanceRecord[],
	shiftId: string,
	shiftSalary: number,
	start: Date,
	end: Date,
	emp: IEmployee,
	amountPerShift: Record<string, number>,
	result: Record<string, number>,
	leaves: Record<string, number>,
	salaryAmount: Record<string, number>,
	salaryTemplate: ISalaryTemplate | null,
	attendanceMap: Record<string, IAttendance>,
): Promise<{
	salaryAttendance: number;
	paidLeaveAttendance: number;
	absentShiftAttendance: number;
	presentShiftAttendance: number;
	overTimeWagesAttendance: number;
	overtimeMinutesAttendance: number;
} | null> {
	try {
		let salary = 0;
		let paidLeave = 0;
		let absentShift = 0;
		let presentShift = 0;
		let overTimeWages = 0;
		let overtimeMinutes = 0;

		for (let att of attendance) {
			if (shiftId !== att.shiftId.toString()) {
				shiftId = att.shiftId.toString();
				let workingShift = await calculateWorkingShift(shiftId, start, end);
				shiftSalary = emp.salary / workingShift;
				for (let key in result) {
					amountPerShift[key] = result[key] / workingShift;
				}
			}

			if (att.first_half === "present") {
				salary += shiftSalary * att.first_half_fraction;
				for (let key in result) {
					salaryAmount[key] += amountPerShift[key] * att.first_half_fraction;
				}
				presentShift++;
			} else if (leaves[att.first_half] !== undefined) {
				const leave = await getApprovedLeave(
					att.attendance_date,
					emp._id.toString(),
				);
				let fraction = leave ? leave.fraction : 0;
				salary += leaves[att.first_half] * fraction;
				paidLeave++;
			}

			if (att.second_half === "present") {
				salary += shiftSalary * att.second_half_fraction;
				for (let key in result) {
					salaryAmount[key] += amountPerShift[key] * att.second_half_fraction;
				}
				presentShift++;
			} else if (leaves[att.second_half] !== undefined) {
				const leave = await getApprovedLeave(
					att.attendance_date,
					emp._id.toString(),
				);
				let fraction = leave ? leave.fraction : 0;
				salary += leaves[att.second_half] * fraction;
				paidLeave++;
			}

			if (att.first_half === "absent") absentShift++;
			if (att.second_half === "absent") absentShift++;

			let dateId = new Date(att.attendance_date);
			dateId.setUTCHours(0, 0, 0, 0);
			const fullAttendance =
				attendanceMap[dateId.toUTCString() + emp._id.toString()];

			if (fullAttendance && fullAttendance?.clock_out) {
				overtimeMinutes += await calculateOvertimeMinutes(fullAttendance);
				overTimeWages += await calculateOvertimePay(
					fullAttendance,
					shiftSalary,
					salaryTemplate,
				);
			}
		}
		return {
			salaryAttendance: salary,
			paidLeaveAttendance: paidLeave,
			absentShiftAttendance: absentShift,
			presentShiftAttendance: presentShift,
			overTimeWagesAttendance: overTimeWages,
			overtimeMinutesAttendance: overtimeMinutes,
		};
	} catch (error) {
		console.log(error);
		return {
			salaryAttendance: 0,
			paidLeaveAttendance: 0,
			absentShiftAttendance: 0,
			presentShiftAttendance: 0,
			overTimeWagesAttendance: 0,
			overtimeMinutesAttendance: 0,
		};
	}
}

async function saveEmployeePayrollHandler(
	workingShift: number,
	presentShift: number,
	absentShift: number,
	overtimeMinutes: number,
	paidLeave: number,
	start: Date,
	emp: IEmployee,
	result: Record<string, number>,
	salaryAmount: Record<string, number>,
	salaryValue: number,
	advanceSalaryValue: number,
	overTimeWagesValue: number,
	totalBonusValue: number,
	totalPenaltiesValue: number,
) {
	try {
		const salary = Math.round(salaryValue * 100) / 100;
		const advanceSalary = Math.round(advanceSalaryValue * 100) / 100;
		const overTimeWages = Math.round(overTimeWagesValue * 100) / 100;
		const totalBonus = Math.round(totalBonusValue * 100) / 100;
		const totalPenalties = Math.round(totalPenaltiesValue * 100) / 100;

		let salaryComponent = 0;
		let salaryTemplateAmountArray: ISalaryTemplateAmount[] = [];
		for (let key in result) {
			salaryTemplateAmountArray.push({
				name: await getComponentName(emp._id.toString(), key),
				amount: Math.round(salaryAmount[key] * 100) / 100,
			});
			salaryComponent += salaryAmount[key];
		}

		salaryComponent = Math.round(salaryComponent * 100) / 100;

		const salaryObject: ISalary = {
			salaryTemplateAmount: salaryTemplateAmountArray,
			advance_salary: advanceSalary,
			over_time_wages: overTimeWages,
			bonus_salary: totalBonus,
			penalty_amount: totalPenalties,
			fixed_allowance: Math.round((salary - salaryComponent) * 100) / 100,
			gross_salary:
				Math.round(
					(salary +
						advanceSalary +
						overTimeWages +
						totalBonus -
						totalPenalties) *
						100,
				) / 100,
		};

		const attendanceObject: ISalaryAttendance = {
			working_shifts: workingShift,
			present_shifts: presentShift,
			absent_shifts: absentShift,
			over_time_hours: formatHoursMinutes(overtimeMinutes),
			leave: paidLeave,
		};

		await createSalarySlip(
			salaryObject,
			attendanceObject,
			emp._id.toString(),
			dateToMonthYear(start),
		);
		const department = await getDepartment(emp.departmentId.toString());
		if (!department) throw new Error("Department not found");

		const companyName = process.env.COMPANY_NAME || "Company Name";
		const companyAddress = process.env.COMPANY_ADDRESS || "Company Address";
		const employeeAccount = process.env.EMPLOYEE_ACCOUNT || "Employee Account";
		const employeeBank = process.env.EMPLOYEE_BANK || "Employee Bank";

		generatePDF(
			{
				month: formatMonthYear(start),
				company: {
					name: companyName,
					address: companyAddress,
				},
				employee: {
					name: emp.name,
					email: emp.email,
					account: employeeAccount,
					bank: employeeBank,
					department: department.name,
				},
				attendance: {
					working_shift: workingShift.toString(),
					present_shift: presentShift.toString(),
					absent_shift: absentShift.toString(),
					leave: paidLeave.toString(),
					over_time: formatHoursMinutes(overtimeMinutes),
				},
				salary: {
					advance: advanceSalary.toString(),
					over_time: overTimeWages.toString(),
					bonus: totalBonus.toString(),
					penalty: totalPenalties.toString(),
					fixed_allowance: (
						Math.round((salary - salaryComponent) * 100) / 100
					).toString(),
					gross: (
						Math.round(
							(salary +
								advanceSalary +
								overTimeWages +
								totalBonus -
								totalPenalties) *
								100,
						) / 100
					).toString(),
				},
			},
			salaryTemplateAmountArray,
		);
	} catch (error) {
		console.log(error);
	}
}

export async function getStartAndEndDate(
	socket: Socket,
	startDate: string,
	endDate: string,
): Promise<{ start: Date; end: Date } | null> {
	try {
		let start: Date;
		let end: Date;

		const tempDate: Date | null = await getLastPayrollDate();
		if (tempDate) {
			start = new Date(tempDate.setDate(tempDate.getDate() + 1));
			end = parseDateDMY(endDate);
		} else {
			if (!startDate) {
				messageEmission(socket, "failed", "starting date is required.");
				return null;
			}
			start = parseDateDMY(startDate);
			end = parseDateDMY(endDate);
		}

		if (end < start) {
			messageEmission(socket, "failed", "end date is less than start date");
			return null;
		}

		const days = countDays(start, end);
		if (days < 29 || days > 31) {
			messageEmission(
				socket,
				"failed",
				"number of payroll days must be between 29 and 31.",
			);
			return null;
		}

		return { start, end };
	} catch (error) {
		errorEmission(socket, error);
		return null;
	}
}

export async function postPayrollHandler(
	socket: Socket,
	isAdvancePayroll: boolean,
	isPendingAdvancePayroll: boolean,
	recentAttendanceDate: Date,
	actualEndDate: Date,
	start: Date,
	end: Date,
): Promise<void> {
	try {
		// cretae new advance payroll
		if (isAdvancePayroll) {
			const startAdvancePayroll = new Date(recentAttendanceDate);
			startAdvancePayroll.setDate(startAdvancePayroll.getDate() + 1);
			await createAdvancePayroll(startAdvancePayroll, actualEndDate);
		}

		// uddate pending advance payroll & create payroll record
		if (isPendingAdvancePayroll) await resolveAdvancePayroll();
		await createPayrollRecord(start, end, String(new Date().getFullYear()));
		messageEmission(
			socket,
			"success",
			`salarySlip created - ${formatMonthYear(start)}.`,
		);
	} catch (error) {
		errorEmission(socket, error);
	}
}
