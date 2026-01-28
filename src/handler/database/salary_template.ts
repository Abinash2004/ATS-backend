import type { Socket } from "socket.io";
import type { ISalaryTemplate } from "../../interface/salary_template";
import { isValidSalaryTemplate } from "../../utils/validations";
import { errorEmission, messageEmission } from "../helper/reusable";
import {
	readSalaryTemplate,
	createSalaryTemplate,
	updateSalaryTemplate,
} from "../mongoose/salary_template";

export async function salaryTemplateCreateHandler(
	socket: Socket,
	salaryTemplate: ISalaryTemplate,
): Promise<void> {
	try {
		if (socket.data.role !== "admin" && socket.data.role !== "HR") {
			messageEmission(socket, "failed", "only admin & HR are permitted.");
			return;
		}
		if (!(await isValidSalaryTemplate(socket, salaryTemplate))) return;
		await createSalaryTemplate(salaryTemplate);
		messageEmission(socket, "success", "salary template created successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function salaryTemplateUpdateHandler(
	socket: Socket,
	salaryTemplateId: string,
	salaryTemplate: ISalaryTemplate,
): Promise<void> {
	try {
		if (socket.data.role !== "admin" && socket.data.role !== "HR") {
			messageEmission(socket, "failed", "only admin & HR are permitted.");
			return;
		}
		if (!(await isValidSalaryTemplate(socket, salaryTemplate))) return;
		await updateSalaryTemplate(salaryTemplateId, salaryTemplate);
		messageEmission(socket, "success", "salary template updated successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function salaryTemplateReadHandler(
	socket: Socket,
	employeeId: string,
): Promise<void> {
	try {
		const salaryTemplate: ISalaryTemplate | null =
			await readSalaryTemplate(employeeId);
		if (!salaryTemplate) {
			messageEmission(socket, "failed", "salary template not found");
			return;
		}
		messageEmission(socket, "success", salaryTemplate);
	} catch (error) {
		errorEmission(socket, error);
	}
}
