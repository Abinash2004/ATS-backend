import {Types} from "mongoose";
import type {DayStatus} from "../type/day_status.ts";

export interface ILeave {
    date: Date;
    day_status: DayStatus;
    leave_status: "pending" | "approved" | "rejected";
    reason: string;
    employeeId: Types.ObjectId;
}