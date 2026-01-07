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
async function getMonthlySalarySlip(month: string): Promise<ISalarySlip[] | null> {
    try {
        return await SalarySlip.find({month}, {_id: 0,__v: 0,month:0});
    } catch(error) {
        console.error(error);
        return [];
    }
}

export {
    createSalarySlip,
    getSalarySlip,
    getMonthlySalarySlip
};