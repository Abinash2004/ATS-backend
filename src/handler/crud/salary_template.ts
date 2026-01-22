import type {Socket} from "socket.io";
import type {ISalaryTemplate} from "../../interface/salary_template.ts";
import {isValidSalaryTemplate} from "../../utils/validations.ts";
import {errorEmission,messageEmission} from "../helper.ts";
import {createSalaryTemplate,readSalaryTemplate,updateSalaryTemplate} from "../mongoose/salary_template.ts";

async function salaryTemplateCreateHandler(socket: Socket, salaryTemplate: ISalaryTemplate) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.");
            return;
        }
        if (!isValidSalaryTemplate(socket,salaryTemplate)) return;
        await createSalaryTemplate(salaryTemplate);
        messageEmission(socket,"success","salary template created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function salaryTemplateUpdateHandler(socket: Socket, salaryTemplateId: string, salaryTemplate: ISalaryTemplate) {
    try {
        if (socket.data.role !== "admin" && socket.data.role !== "HR") {
            messageEmission(socket,"failed","only admin & HR are permitted.");
            return;
        }
        if (!isValidSalaryTemplate(socket, salaryTemplate)) return;
        await updateSalaryTemplate(salaryTemplateId,salaryTemplate);
        messageEmission(socket,"success","salary template created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function salaryTemplateReadHandler(socket: Socket, employeeId: string) {
    try {
        const salaryTemplate: ISalaryTemplate | null = await readSalaryTemplate(employeeId);
        if (!salaryTemplate) {
            messageEmission(socket,"failed","salary template not found");
            return;
        }
        messageEmission(socket,"success",salaryTemplate);
    } catch(error) {
        errorEmission(socket,error);
    }
}
export {salaryTemplateCreateHandler,salaryTemplateUpdateHandler,salaryTemplateReadHandler};