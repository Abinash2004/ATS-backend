import mongoose from "mongoose";
import Bonus from "../../model/bonus.ts";
import {redisClient} from "../../config/redis.ts";
import type {IBonus} from "../../interface/bonus.ts";

const BONUS_TTL = 60 * 60;
const bonusKey = (employeeId: string) => `bonus:${employeeId}`;

async function createBonus(employeeId: string, amount: Number, reason: string): Promise<void> {
    try {
        await Bonus.create({employeeId, amount, reason, bonus_date: new Date(Date.now())});
        await redisClient.del(bonusKey(employeeId));
    } catch(error) {
        console.error(error);
    }
}
async function getBonusByDate(employeeId: string,startDate: Date, endDate:Date): Promise<number> {
    try {
        const result = await Bonus.aggregate([
            {$match: {employeeId: new mongoose.Types.ObjectId(employeeId),bonus_date: {$gte: startDate,$lte: endDate}}},
            {$group: {_id: null,totalSum: { $sum: "$amount" }}}
        ]);
        return result.length ? result[0].totalSum : 0;
    } catch (error) {
        console.error(error);
        return 0;
    }
}
async function getEmployeeBonus(employeeId: string): Promise<IBonus[]> {
    try {
        const bonusCache = await redisClient.get(bonusKey(employeeId));
        if (bonusCache) return JSON.parse(bonusCache);
        const bonusData = await Bonus.find({employeeId}).lean<IBonus[]>();
        await redisClient.set(bonusKey(employeeId), JSON.stringify(bonusData),{EX:BONUS_TTL});
        return bonusData;
    } catch(error) {
        console.error(error);
        return [];
    }
}

export {createBonus,getBonusByDate,getEmployeeBonus};