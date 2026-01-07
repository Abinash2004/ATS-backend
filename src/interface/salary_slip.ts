import {Types} from "mongoose";

export interface ISalarySlip {
    salary: number;
    employeeId: Types.ObjectId;
    month: string;
}