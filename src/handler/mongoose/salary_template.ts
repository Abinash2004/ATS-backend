import { SalaryTemplate } from "../../model/salary_template";
import type { ISalaryTemplate } from "../../interface/salary_template";

export async function createSalaryTemplate(
	salaryTemplate: ISalaryTemplate,
): Promise<void> {
	try {
		await SalaryTemplate.create(salaryTemplate);
	} catch (error) {
		console.error(error);
	}
}

export async function updateSalaryTemplate(
	salaryTemplateId: string,
	salaryTemplate: ISalaryTemplate,
): Promise<void> {
	try {
		const st = await SalaryTemplate.findOne({ _id: salaryTemplateId });
		if (!st) throw new Error(`${salaryTemplateId} not found`);
		await SalaryTemplate.updateOne({ _id: salaryTemplateId }, salaryTemplate);
	} catch (error) {
		console.error(error);
	}
}

export async function readSalaryTemplate(
	employeeId: string,
): Promise<ISalaryTemplate | null> {
	try {
		return await SalaryTemplate.findOne(
			{ employeeIds: employeeId },
			{ _id: 0, employeeIds: 0, __v: 0 },
		);
	} catch (error) {
		console.error(error);
		return null;
	}
}
