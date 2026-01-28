import type { Socket } from "socket.io";
import type { IEmployee } from "../../interface/employee";
import type { IAdvancePayroll } from "../../interface/advance_payroll";
import type { IAttendanceRecord } from "../../interface/attendance_record";
import { getShift } from "../mongoose/shift";
import { generatePDF } from "../../utils/pdf_generation";
import { getDepartment } from "../mongoose/department";
import { getBonusByDate } from "../mongoose/bonus";
import { createSalarySlip } from "../mongoose/salary_slip";
import { createPenalty, getPenaltyByDate } from "../mongoose/penalty";
import { getEmployeeAttendanceRecordDateWise } from "../mongoose/attendance_record";
import {
	createAdvancePayroll,
	resolveAdvancePayroll,
} from "../mongoose/advance_payroll";
import {
	createPayrollRecord,
	getLastPayrollDate,
} from "../mongoose/payroll_record";
import {
	ISalary,
	ISalaryAttendance,
	ISalaryTemplateAmount,
} from "../../interface/salary_slip";
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
	calculateShiftSalary,
	calculateTotalWorkingShift,
	errorEmission,
	getSalaryTemplateData,
	messageEmission,
} from "./reusable";

export async function runEmployeePayroll(
	emp: IEmployee,
	start: Date,
	end: Date,
	isPendingAdvancePayroll: boolean,
	pendingAdvancePayroll: IAdvancePayroll | null,
	isAdvancePayroll: boolean,
	recentAttendanceDate: Date,
	actualEndDate: Date,
): Promise<void> {
	try {
		let salary = 0;
		let paidLeave = 0;
		let absentShift = 0;
		let presentShift = 0;
		let advanceSalary = 0;
		let overTimeWages = 0;
		let overtimeMinutes = 0;

		let shiftId: string = emp.shiftId.toString();
		let totalBonus = await getBonusByDate(emp._id.toString(), start, end);
		let workingShift = await calculateTotalWorkingShift(
			emp._id.toString(),
			start,
			end,
		);
		const attendance = await getEmployeeAttendanceRecordDateWise(
			emp._id.toString(),
			start,
			end,
		);
		if (attendance.length !== 0) shiftId = attendance[0].shiftId.toString();
		let shiftSalary = await calculateShiftSalary(
			shiftId,
			start,
			end,
			emp.salary,
		);

		const result: Record<string, number> = await getSalaryTemplateData(
			emp._id.toString(),
			emp.salary,
		);
		let salaryAmount: Record<string, number> = {};
		for (let key in result) {
			salaryAmount[key] = 0;
		}

		//resolve advance payroll
		if (isPendingAdvancePayroll && pendingAdvancePayroll) {
			const overtimeValues = await resolveAdvancePayrollHandler(
				emp,
				pendingAdvancePayroll,
				result,
				shiftId,
				start,
				end,
				shiftSalary,
			);
			if (overtimeValues) {
				overTimeWages += overtimeValues.overTimeWages;
				overtimeMinutes += overtimeValues.overTimeMinutes;
			}
		}

		let totalPenalties = await getPenaltyByDate(emp._id.toString(), start, end);
		let amountPerShift: Record<string, number> = {};
		for (let key in result) {
			amountPerShift[key] = await calculateShiftSalary(
				shiftId,
				start,
				end,
				result[key],
			);
		}

		// call attendance Payroll Handler
		const attendanceResult = await attendancePayrollHandler(
			attendance,
			shiftId,
			shiftSalary,
			start,
			end,
			emp,
			amountPerShift,
			result,
			salaryAmount,
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
			const shift = await getShift(shiftId);
			if (!shift) throw new Error("Shift not found");
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
			result,
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
	emp: IEmployee,
	pendingAdvancePayroll: IAdvancePayroll,
	result: Record<string, number>,
	shiftId: string,
	start: Date,
	end: Date,
	shiftSalary: number,
): Promise<{ overTimeMinutes: number; overTimeWages: number } | null> {
	try {
		let overTimeMinutes = 0;
		let overTimeWages = 0;

		let advancePayrollAttendance = await getEmployeeAttendanceRecordDateWise(
			emp._id.toString(),
			pendingAdvancePayroll.start_date,
			pendingAdvancePayroll.end_date,
		);

		let amountPerShift: Record<string, number> = {};
		for (let key in result) {
			amountPerShift[key] = await calculateShiftSalary(
				shiftId,
				start,
				end,
				result[key],
			);
		}

		for (let att of advancePayrollAttendance) {
			if (shiftId !== att.shiftId.toString()) {
				shiftId = att.shiftId.toString();
				for (let key in result) {
					amountPerShift[key] = await calculateShiftSalary(
						shiftId,
						start,
						end,
						result[key],
					);
				}
			}

			if (att.first_half === "absent") {
				let penalty = 0;
				for (let key in result) {
					penalty += amountPerShift[key];
				}
				await createPenalty(
					emp._id.toString(),
					penalty,
					`advance deduction - ${dateToIST(att.attendance_date)} (first half).`,
				);
			}

			if (att.second_half === "absent") {
				let penalty = 0;
				for (let key in result) {
					penalty += amountPerShift[key];
				}
				await createPenalty(
					emp._id.toString(),
					penalty,
					`advance deduction - ${dateToIST(att.attendance_date)} (second half).`,
				);
			}

			overTimeMinutes += await calculateOvertimeMinutes(
				att,
				emp._id.toString(),
			);
			overTimeWages += await calculateOvertimePay(
				att,
				emp._id.toString(),
				shiftSalary,
			);
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
	salaryAmount: Record<string, number>,
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
				shiftSalary = await calculateShiftSalary(
					shiftId,
					start,
					end,
					emp.salary,
				);
				for (let key in result) {
					amountPerShift[key] = await calculateShiftSalary(
						shiftId,
						start,
						end,
						result[key],
					);
				}
			}

			if (att.first_half === "present") {
				salary += shiftSalary;
				for (let key in result) {
					salaryAmount[key] += amountPerShift[key];
				}
				presentShift++;
			}

			if (att.first_half === "paid_leave") {
				salary += shiftSalary;
				for (let key in result) {
					salaryAmount[key] += amountPerShift[key];
				}
				paidLeave++;
			}

			if (att.second_half === "present") {
				salary += shiftSalary;
				for (let key in result) {
					salaryAmount[key] += amountPerShift[key];
				}
				presentShift++;
			}

			if (att.second_half === "paid_leave") {
				salary += shiftSalary;
				for (let key in result) {
					salaryAmount[key] += amountPerShift[key];
				}
				paidLeave++;
			}

			if (att.first_half === "absent") absentShift++;
			if (att.second_half === "absent") absentShift++;

			overtimeMinutes += await calculateOvertimeMinutes(
				att,
				emp._id.toString(),
			);
			overTimeWages += await calculateOvertimePay(
				att,
				emp._id.toString(),
				shiftSalary,
			);
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
				name: key,
				amount: Math.round(salaryAmount[key] * 100) / 100,
			});
			salaryComponent += salaryAmount[key];
		}

		const salaryObject: ISalary = {
			salaryTemplateAmount: salaryTemplateAmountArray,
			advance_salary: advanceSalary,
			over_time_wages: overTimeWages,
			bonus_salary: totalBonus,
			penalty_amount: totalPenalties,
			fixed_allowance: salary - salaryComponent,
			gross_salary:
				salaryComponent +
				(salary - salaryComponent) +
				advanceSalary +
				overTimeWages +
				totalBonus -
				totalPenalties,
		};

		const attendanceObject: ISalaryAttendance = {
			working_shifts: workingShift,
			present_shifts: presentShift,
			absent_shifts: absentShift,
			over_time_hours: formatHoursMinutes(overtimeMinutes),
			paid_leave: paidLeave,
		};

		await createSalarySlip(
			salaryObject,
			attendanceObject,
			emp._id.toString(),
			dateToMonthYear(start),
		);
		const department = await getDepartment(emp.departmentId.toString());
		if (!department) throw new Error("Department not found");

		generatePDF(
			{
				month: formatMonthYear(start),
				company: {
					name: "Ultimate Business Systems Pvt. Ltd.",
					address:
						"Diamond World 3rd floor C-301, Mini Bazaar, Varachha Road, Surat, Gujarat, India, 395006",
				},
				employee: {
					name: emp.name,
					email: emp.email,
					account: "69066990666999",
					bank: "Super Bank of Surat",
					department: department.name,
				},
				attendance: {
					working_shift: workingShift.toString(),
					present_shift: presentShift.toString(),
					absent_shift: absentShift.toString(),
					paid_leave: paidLeave.toString(),
					over_time: formatHoursMinutes(overtimeMinutes),
				},
				salary: {
					advance: advanceSalary.toString(),
					over_time: overTimeWages.toString(),
					bonus: totalBonus.toString(),
					penalty: totalPenalties.toString(),
					fixed_allowance: (salary - salaryComponent).toString(),
					gross: (
						salaryComponent +
						(salary - salaryComponent) +
						advanceSalary +
						overTimeWages +
						totalBonus -
						totalPenalties
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
