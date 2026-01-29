import Leave from "../../model/leave";
import type { Socket } from "socket.io";
import type { ILeave } from "../../interface/leave";
import type { DayStatus } from "../../type/day_status";
import type { leave_response } from "../../type/leave_response";
import { messageEmission } from "../helper/reusable";
import { parseDateDMY } from "../../utils/date_time";
import { readSalaryTemplate } from "./salary_template";

export async function createLeave(
	socket: Socket,
	leave_date: string,
	category: string,
	day_status: DayStatus,
	reason: string,
	employeeId: string,
	shiftId: string,
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
