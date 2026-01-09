import mongoose from "mongoose";
import Bonus from "../../model/bonus.ts";
import {getFirstDayUtc,getLastDayUtc} from "../helper.ts";

async function createBonus(employeeId: string, amount: Number, reason: string): Promise<void> {
    try {
        await Bonus.create({employeeId, amount, reason, bonus_date: new Date(Date.now())});
    } catch(error) {
        console.error(error);
    }
}

async function getMonthlyBonus(employeeId: string,month: string): Promise<number> {
    try {
        const startDate = getFirstDayUtc(month);
        const endDate = getLastDayUtc(month);

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

export {createBonus,getMonthlyBonus};