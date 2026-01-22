import type {ISalaryTemplate} from "../../interface/salary_template.ts";
import SalaryTemplate from "../../model/salary_template.ts";

async function createSalaryTemplate(salaryTemplate:ISalaryTemplate){
    try {
        await SalaryTemplate.create(salaryTemplate);
    } catch(error) {
        console.error(error);
    }
}
async function updateSalaryTemplate(salaryTemplateId: string, salaryTemplate:ISalaryTemplate){
    try {
        const st = await SalaryTemplate.findOne({_id: salaryTemplateId});
        if (!st) throw new Error(`${salaryTemplateId} not found`);
        await SalaryTemplate.updateOne({_id: salaryTemplateId}, salaryTemplate);
    } catch(error) {
        console.error(error);
    }
}
async function readSalaryTemplate(employeeId: string): Promise<ISalaryTemplate | null> {
    try {
        return await SalaryTemplate.findOne({employeeIds : employeeId},{_id:0,employeeIds:0,__v:0,});
    } catch(error) {
        console.error(error);
        return null;
    }
}

export {createSalaryTemplate,updateSalaryTemplate,readSalaryTemplate};