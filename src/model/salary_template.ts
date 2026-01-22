import mongoose, {Schema} from "mongoose";
import type {ISalaryTemplate} from "../interface/salary_template.ts";

const salaryTemplateSchema = new Schema<ISalaryTemplate>({
    basic_percentage: {
        type: Number,
        default: 100,
        min: 0,
        max: 100
    },
    hra: {
        type: Number,
        required: true
    },
    hra_type: {
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed"
    },
    da: {
        type: Number,
        required: true
    },
    da_type: {
        type: String,
        enum: ["fixed", "percentage"],
        default: "fixed"
    },
    employeeIds: [{
        type: Schema.Types.ObjectId,
        ref: "Employee"
    }]
});

const SalaryTemplate = mongoose.model<ISalaryTemplate>("Salary_Template", salaryTemplateSchema);
export default SalaryTemplate;