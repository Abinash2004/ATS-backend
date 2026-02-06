import { Types } from "mongoose";

export interface ISalaryTemplateComponent {
	code: string;
	name: string;
	component_type: 1 | 2 | 3; // FIXED | PERCENTAGE | FORMULA
	expression: string;
}

export interface ISalaryTemplateLeave {
	code: string;
	name: string;
	component_type: 1 | 2 | 3; // FIXED | PERCENTAGE | FORMULA
	expression: string;
	limit: number;
	time_period: 1 | 2 | 3 | 4 | 5 | 6; // WEEKLY | MONTHLY | QUARTERLY | YEARLY | OVERALL | UNLIMITED
}

export interface ISalaryTemplate {
	name: string;
	is_prorate: boolean;
	earnings: ISalaryTemplateComponent[];
	leaves: ISalaryTemplateLeave[];
	overtime: ISalaryTemplateComponent;
	employeeIds: Types.ObjectId[];
}
