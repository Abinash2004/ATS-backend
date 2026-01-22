import {Types} from "mongoose";

export interface ISalaryTemplate {
    basic_percentage: number;
    hra: number;
    hra_type: "fixed" | "percentage";
    da: number;
    da_type: "fixed" | "percentage";
    employeeIds: Types.ObjectId[];
}
