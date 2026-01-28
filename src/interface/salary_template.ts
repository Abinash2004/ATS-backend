import { Types } from "mongoose";

export interface ISalaryTemplateComponent {
	code: string;
	name: string;
	component_type: 1 | 2 | 3;
	expression: string;
}

export interface ISalaryTemplate {
	name: string;
	components: ISalaryTemplateComponent[];
	employeeIds: Types.ObjectId[];
}
