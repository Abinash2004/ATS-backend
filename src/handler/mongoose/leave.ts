import Leave from "../../model/leave";
import { redisClient } from "../../config/redis";
import type { Socket } from "socket.io";
import type { ILeave } from "../../interface/leave";
import type { DayStatus } from "../../type/day_status";
import type { leave_response } from "../../type/leave_response";
import { messageEmission } from "../helper";
import { normalizeDate, parseDateDMY } from "../../utils/date_time";

const LEAVE_TTL = 60 * 60 * 1000;
const leaveKey = (date: string | Date, employeeId: string) =>
	`leave:${normalizeDate(date)}:${employeeId}`;

async function createLeave(
	socket: Socket,
	leave_date: string,
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
			employeeId,
			shiftId,
			leave_status: "pending",
			reason,
		});
		const normalizedDate = parseDateDMY(leave_date).toISOString().split("T")[0];
		await redisClient.del(leaveKey(normalizedDate, employeeId));
		messageEmission(socket, "success", "leave request sent successfully.");
	} catch (error) {
		console.log(error);
	}
}

async function updateLeave(
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

async function getApprovedLeave(
	leaveDate: Date,
	employeeId: string,
): Promise<ILeave | null> {
	try {
		const normalizedDate = leaveDate.toISOString().split("T")[0];
		const leaveCache = await redisClient.get(
			leaveKey(normalizedDate, employeeId),
		);
		if (leaveCache) return JSON.parse(leaveCache);
		const leaveData = await Leave.findOne({
			date: leaveDate,
			employeeId,
			leave_status: "approved",
		})
			.lean<ILeave>()
			.exec();
		await redisClient.set(
			leaveKey(normalizedDate, employeeId),
			JSON.stringify(leaveData),
			{ EX: LEAVE_TTL },
		);
		return leaveData;
	} catch (error) {
		console.log(error);
		return null;
	}
}

export { createLeave, updateLeave, getApprovedLeave };
