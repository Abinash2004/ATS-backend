import {Types} from "mongoose";

export interface ISalarySlip {
    basic_salary: number;
    overtime_wages: number;
    gross_salary: number;
    employeeId: Types.ObjectId;
    month: string;
}