import Leave from "../../model/leave";
import type { Socket } from "socket.io";
import type { ILeave } from "../../interface/leave";
import type { DayStatus } from "../../type/day_status";
import type { leave_response } from "../../type/leave_response";
import { isNumber } from "../../utils/validations";
import { messageEmission } from "../helper/reusable";
import { readSalaryTemplate } from "./salary_template";
import {
	getCurrentSixMonthQuarterRange,
	getFirstAndLastDateOfCurrentYear,
	getFirstDateOfCurrentMonth,
	getFirstDateOfCurrentWeek,
	getLastDateOfCurrentMonth,
	getLastDateOfCurrentWeek,
	parseDateDMY,
} from "../../utils/date_time";

export async function createLeave(
	socket: Socket,
	leave_date: string,
	category: string,
	day_status: DayStatus,
	reason: string,
	employeeId: string,
	shiftId: string,
	fraction: number,
): Promise<void> {
	try {
		const leaveDate: Date = parseDateDMY(leave_date);

		const leave = await Leave.findOne({ date: leaveDate, employeeId });
		if (leave) {
			messageEmission(socket, "failed", "leave request already exists.");
			return;
		}
		await Leave.create({
			date: leaveDate,
			day_status,
			category,
			employeeId,
			shiftId,
			leave_status: "pending",
			reason,
			fraction,
		});
		messageEmission(socket, "success", "leave request sent successfully.");
	} catch (error) {
		console.log(error);
	}
}

export async function updateLeave(
	socket: Socket,
	leaveId: string,
	response: leave_response,
): Promise<void> {
	try {
		const leave = await Leave.findOne({ _id: leaveId });
		if (!leave) {
			messageEmission(socket, "failed", "leave request not found.");
			return;
		}
		await Leave.updateOne(
			{ _id: leaveId },
			{ $set: { leave_status: response } },
		);
		messageEmission(
			socket,
			"success",
			`leave request set ${response} successfully`,
		);
	} catch (error) {
		console.log(error);
	}
}

export async function getApprovedLeave(
	leaveDate: Date,
	employeeId: string,
): Promise<ILeave | null> {
	try {
		const leaveData = await Leave.findOne({
			date: leaveDate,
			employeeId,
			leave_status: "approved",
		})
			.lean<ILeave>()
			.exec();

		return leaveData;
	} catch (error) {
		console.log(error);
		return null;
	}
}

export async function isValidCategory(
	employeeId: string,
	category: string,
): Promise<boolean> {
	try {
		const salaryTemplate = await readSalaryTemplate(employeeId);
		if (!salaryTemplate) return false;
		for (let leave of salaryTemplate.leaves) {
			if (leave.code === category) return true;
		}
		return false;
	} catch (error) {
		console.log(error);
		return false;
	}
}

export async function isLeaveAvailable(
	employeeId: string,
	category: string,
): Promise<boolean> {
	try {
		let limit = 0;
		let time_period = 1;
		let start = new Date(Date.now());
		let end = new Date(Date.now());

		const salaryTemplate = await readSalaryTemplate(employeeId);
		if (!salaryTemplate) return false;
		for (let leave of salaryTemplate.leaves) {
			if (leave.code === category) {
				limit = leave.limit;
				time_period = leave.time_period;
			}
		}

		let isOverAll = false;

		//set start and end with respect to time period
		switch (time_period) {
			case 1: {
				start = getFirstDateOfCurrentWeek();
				end = getLastDateOfCurrentWeek();
				break;
			}
			case 2: {
				start = getFirstDateOfCurrentMonth();
				end = getLastDateOfCurrentMonth();
				break;
			}
			case 3: {
				const timeLine = getCurrentSixMonthQuarterRange();
				start = timeLine.start;
				end = timeLine.end;
				break;
			}
			case 4: {
				const timeLine = getFirstAndLastDateOfCurrentYear();
				start = timeLine.start;
				end = timeLine.end;
				break;
			}
			case 5: {
				isOverAll = true;
				break;
			}
			case 6: {
				return true;
			}
		}

		if (isOverAll) {
			const leaves = await Leave.find({
				employeeId,
				category,
			});
			if (leaves.length < limit) return true;
		} else {
			const leaves = await Leave.find({
				employeeId,
				category,
				date: { $gte: start, $lt: end },
			});
			if (leaves.length < limit) return true;
		}

		return false;
	} catch (error) {
		console.log(error);
		return false;
	}
}

export function isValidFraction(fraction: string): boolean {
	if (!isNumber(fraction)) return false;
	const value = Number(fraction);
	if (value < 0 || value > 1) return false;
	return true;
}
