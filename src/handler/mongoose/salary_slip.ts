import SalarySlip from "../../model/salary_silp.ts";
import type {ISalary, ISalaryAttendance, ISalarySlip} from "../../interface/salary_slip.ts";

async function createSalarySlip(salary: ISalary,attendance: ISalaryAttendance, employeeId: string, month: string): Promise<void> {
    try {
        await SalarySlip.create({salary, attendance, employeeId, month});
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
async function getMonthlyEmployeeSalarySlip(month: string, employeeId: string): Promise<ISalarySlip[] | null> {
    try {
        return await SalarySlip.find({month, employeeId}, {_id: 0,__v: 0,month:0, employeeId:0});
    } catch(error) {
        console.error(error);
        return [];
    }
}

export {
    createSalarySlip,
    getSalarySlip,
    getMonthlySalarySlip,
    getMonthlyEmployeeSalarySlip
};