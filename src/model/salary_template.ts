import { Schema, model } from "mongoose";
import type {
	ISalaryTemplateComponent,
	ISalaryTemplateLeave,
	ISalaryTemplate,
} from "../interface/salary_template";

const salaryTemplateComponentSchema = new Schema<ISalaryTemplateComponent>(
	{
		code: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		component_type: {
			type: Number,
			required: true,
			enum: [1, 2, 3], // FIXED | PERCENTAGE | FORMULA
		},
		expression: {
			type: String,
			required: true,
		},
	},
	{ _id: false },
);

const salaryTemplateLeaveSchema = new Schema<ISalaryTemplateLeave>(
	{
		code: {
			type: String,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		component_type: {
			type: Number,
			required: true,
			enum: [1, 2, 3], // FIXED | PERCENTAGE | FORMULA
		},
		expression: {
			type: String,
			required: true,
		},
		limit: {
			type: Number,
			required: true,
		},
		time_period: {
			type: Number,
			required: true,
			enum: [1, 2, 3, 4, 5], // WEEKLY | MONTHLY | QUARTERLY | YEARLY | OVERALL
		},
	},
	{ _id: false },
);

const salaryTemplateSchema = new Schema<ISalaryTemplate>({
	name: {
		type: String,
		required: true,
	},
	is_prorate: {
		type: Boolean,
		default: false,
	},
	earnings: {
		type: [salaryTemplateComponentSchema],
		default: [],
	},
	leaves: {
		type: [salaryTemplateLeaveSchema],
		default: [],
	},
	overtime: {
		type: salaryTemplateComponentSchema,
		required: true,
	},
	employeeIds: [
		{
			type: Schema.Types.ObjectId,
			ref: "Employee",
		},
	],
});

export const SalaryTemplate = model<ISalaryTemplate>(
	"Salary_Template",
	salaryTemplateSchema,
);
