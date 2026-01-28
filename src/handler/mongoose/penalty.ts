import mongoose from "mongoose";
import Penalty from "../../model/penalty";
import { redisClient } from "../../config/redis";
import type { IPenalty } from "../../interface/penalty";

const PENALTY_LIST_TTL = 15 * 60;
const penaltyListKey = (empId: string) => `penalty:list:${empId}`;

export async function createPenalty(
	employeeId: string,
	amount: Number,
	reason: string,
): Promise<void> {
	try {
		await Penalty.create({
			employeeId,
			amount,
			reason,
			penalty_date: new Date(Date.now()),
		});
		await redisClient.del(penaltyListKey(employeeId));
	} catch (error) {
		console.error(error);
	}
}

export async function getPenaltyByDate(
	employeeId: string,
	startDate: Date,
	endDate: Date,
): Promise<number> {
	try {
		const result = await Penalty.aggregate([
			{
				$match: {
					employeeId: new mongoose.Types.ObjectId(employeeId),
					penalty_date: { $gte: startDate, $lte: endDate },
				},
			},
			{ $group: { _id: null, totalSum: { $sum: "$amount" } } },
		]);
		return result.length ? result[0].totalSum : 0;
	} catch (error) {
		console.error(error);
		return 0;
	}
}

export async function getEmployeePenalty(
	employeeId: string,
): Promise<IPenalty[]> {
	try {
		const employeePenaltyCache = await redisClient.get(
			penaltyListKey(employeeId),
		);
		if (employeePenaltyCache) return JSON.parse(employeePenaltyCache);
		const employeePenaltyData = await Penalty.find({ employeeId })
			.lean<IPenalty[]>()
			.exec();
		await redisClient.set(
			penaltyListKey(employeeId),
			JSON.stringify(employeePenaltyData),
			{ EX: PENALTY_LIST_TTL },
		);
		return employeePenaltyData;
	} catch (error) {
		console.error(error);
		return [];
	}
}
