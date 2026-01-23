import {Types} from "mongoose";

export interface ISalaryTemplate {
    basic: number;
    basic_type: "fixed" | "percentage";
    hra: number;
    hra_type: "fixed" | "percentage";
    da: number;
    da_type: "fixed" | "percentage";
    employeeIds: Types.ObjectId[];
}
