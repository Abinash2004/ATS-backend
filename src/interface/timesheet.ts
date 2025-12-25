import {Types} from "mongoose";

export interface ITimesheet {
    time: Date;
    status: "in" | "out";
    employeeId: Types.ObjectId;
}