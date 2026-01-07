import SalarySlip from "../../model/salary_silp.ts";
import type {ISalarySlip} from "../../interface/salary_slip.ts";

async function createSalarySlip(salary: number, employeeId: string, month: string): Promise<void> {
    try {
        await SalarySlip.create({salary, employeeId, month});
    } catch(error) {
        console.error(error);
    }
}
async function getSalarySlip(month: string): Promise<ISalarySlip | null> {
    try {
        return await SalarySlip.findOne({month});
    } catch(error) {
        console.error(error);
        return null;
    }
}

export {createSalarySlip,getSalarySlip};