import mongoose from "mongoose";
import Penalty from "../../model/penalty.ts";
import {getFirstDayUtc,getLastDayUtc} from "../helper.ts";
import type {IPenalty} from "../../interface/penalty.ts";

async function createPenalty(employeeId: string, amount: Number, reason: string): Promise<void> {
    try {
        await Penalty.create({employeeId, amount, reason, penalty_date: new Date(Date.now())});
    } catch(error) {
        console.error(error);
    }
}

async function getMonthlyPenalty(employeeId: string,month: string): Promise<number> {
    try {
        const startDate = getFirstDayUtc(month);
        const endDate = getLastDayUtc(month);

        const result = await Penalty.aggregate([
            {$match: {employeeId: new mongoose.Types.ObjectId(employeeId),penalty_date: {$gte: startDate,$lte: endDate}}},
            {$group: {_id: null,totalSum: { $sum: "$amount" }}}
        ]);
        return result.length ? result[0].totalSum : 0;
    } catch (error) {
        console.error(error);
        return 0;
    }
}

async function getEmployeePenalty(employeeId: string): Promise<IPenalty[]> {
    try {
        return await Penalty.find({employeeId});
    } catch(error) {
        console.error(error);
        return [];
    }
}

export {createPenalty,getMonthlyPenalty,getEmployeePenalty};