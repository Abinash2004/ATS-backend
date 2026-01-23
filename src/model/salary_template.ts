import mongoose, {Schema} from "mongoose";
import type {ISalaryTemplate} from "../interface/salary_template.ts";

const salaryTemplateSchema = new Schema<ISalaryTemplate>({
    basic: {
        type: String,
        required: true
    },
    basic_type: {
        type: String,
        enum: ["fixed", "percentage","formula"],
        default: "fixed"
    },
    hra: {
        type: String,
        required: true
    },
    hra_type: {
        type: String,
        enum: ["fixed", "percentage","formula"],
        default: "fixed"
    },
    da: {
        type: String,
        required: true
    },
    da_type: {
        type: String,
        enum: ["fixed", "percentage","formula"],
        default: "fixed"
    },
    employeeIds: [{
        type: Schema.Types.ObjectId,
        ref: "Employee"
    }]
});

const SalaryTemplate = mongoose.model<ISalaryTemplate>("Salary_Template", salaryTemplateSchema);
export default SalaryTemplate;