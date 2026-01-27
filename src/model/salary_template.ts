import { Schema, model } from "mongoose";
import type {
    ISalaryTemplateComponent,
    ISalaryTemplate
} from "../interface/salary_template.ts";


const salaryTemplateComponentSchema = new Schema<ISalaryTemplateComponent>(
    {
        code: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        component_type: {
            type: Number,
            required: true,
            enum: [1, 2, 3] // FIXED, PERCENTAGE, FORMULA
        },
        expression: {
            type: String,
            required: true
        }
    },
    { _id: false }
);

const salaryTemplateSchema = new Schema<ISalaryTemplate>({
    name: {
        type: String,
        required: true
    },
    components: {
        type: [salaryTemplateComponentSchema],
        default: []
    },
    employeeIds: [{
        type: Schema.Types.ObjectId,
        ref: "Employee"
    }]
});

export const SalaryTemplate = model<ISalaryTemplate>(
    "Salary_Template",
    salaryTemplateSchema
);