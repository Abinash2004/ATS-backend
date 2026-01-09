import {Types} from "mongoose";

export interface IPenalty {
    employeeId: Types.ObjectId;
    penalty_date: Date;
    amount: Number;
    reason: String;
}