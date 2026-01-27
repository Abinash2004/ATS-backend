import { Types } from "mongoose";

export type ComponentType = 1 | 2 | 3;

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