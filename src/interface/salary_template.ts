import {Types} from "mongoose";

export interface ISalaryTemplate {
    basic: string;
    basic_type: "fixed" | "percentage" | "formula";
    hra: string;
    hra_type: "fixed" | "percentage" | "formula";
    da: string;
    da_type: "fixed" | "percentage" | "formula";
    employeeIds: Types.ObjectId[];
}
