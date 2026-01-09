import {Types} from "mongoose";

export interface IBonus {
    employeeId: Types.ObjectId;
    bonus_date: Date;
    amount: Number;
    reason: String;
}