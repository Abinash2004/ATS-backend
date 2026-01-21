import {Types} from "mongoose";

export interface ISalaryTemplate {
    basic_percentage: number;
    hra: number;
    hra_type: "fixed" | "percentage";
    ta: number;
    ta_type: "fixed" | "percentage";
    employeeIds: Types.ObjectId[];
}
