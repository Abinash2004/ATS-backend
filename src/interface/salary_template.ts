import { Types } from "mongoose";

export interface ISalaryTemplateComponent {
	code: string;
	name: string;
	component_type: 1 | 2 | 3; // FIXED | PERCENTAGE | FORMULA
	expression: string;
}

export interface ISalaryTemplate {
	name: string;
	earnings: ISalaryTemplateComponent[];
	leaves: ISalaryTemplateComponent[];
	overtime: ISalaryTemplateComponent;
	employeeIds: Types.ObjectId[];
}
