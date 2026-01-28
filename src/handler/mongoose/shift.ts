import Shift from "../../model/shift";
import type { IShift } from "../../interface/shift";
import { redisClient } from "../../config/redis";

const SHIFT_CACHE_TTL = 60 * 60;
const shiftKey = (id: string) => `shift:${id}`;

export async function getShift(shiftId: string): Promise<IShift | null> {
	try {
		const shiftCache = await redisClient.get(shiftKey(shiftId));
		if (shiftCache) return JSON.parse(shiftCache) as IShift;
		const shiftData = await Shift.findOne({ _id: shiftId }).lean<IShift>();
		if (!shiftData) return null;
		await redisClient.set(shiftKey(shiftId), JSON.stringify(shiftData), {
			EX: SHIFT_CACHE_TTL,
		});
		return shiftData;
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function createShift(shift: IShift): Promise<void> {
	try {
		await Shift.create(shift);
	} catch (error) {
		console.error(error);
	}
}

export async function deleteShift(shiftId: string): Promise<void> {
	try {
		await Shift.deleteOne({ _id: shiftId });
		await redisClient.del(shiftKey(shiftId));
	} catch (error) {
		console.error(error);
	}
}

export async function updateShift(
	shiftId: string,
	shift: IShift,
): Promise<void> {
	try {
		await Shift.updateOne(
			{ _id: shiftId },
			{
				$set: {
					monday: shift.monday,
					tuesday: shift.tuesday,
					wednesday: shift.wednesday,
					thursday: shift.thursday,
					friday: shift.friday,
					saturday: shift.saturday,
					sunday: shift.sunday,
				},
			},
		);
		await redisClient.del(shiftKey(shiftId));
	} catch (error) {
		console.error(error);
	}
}
