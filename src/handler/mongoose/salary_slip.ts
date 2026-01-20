import {redisClient} from "../../config/redis.ts";
import SalarySlip from "../../model/salary_silp.ts";
import type {ISalary,ISalaryAttendance,ISalarySlip} from "../../interface/salary_slip.ts";

const SALARY_SLIP_CACHE_TTL = 60 * 60;
const salarySlipKey = (employeeId: string, month: string) => `salarySlip:${employeeId}:${month}`;

async function createSalarySlip(salary: ISalary,attendance: ISalaryAttendance, employeeId: string, month: string): Promise<void> {
    try {
        const salarySlip = await SalarySlip.findOne({employeeId,month});
        if (salarySlip) await SalarySlip.deleteOne({employeeId,month});
        await SalarySlip.create({salary, attendance, employeeId, month});
        await redisClient.del(salarySlipKey(employeeId, month));
    } catch(error) {
        console.error(error);
    }
}
async function getMonthlyEmployeeSalarySlip(month: string, employeeId: string): Promise<ISalarySlip[] | null> {
    try {
        const salarySlipCache = await redisClient.get(salarySlipKey(employeeId,month));
        if (salarySlipCache) return JSON.parse(salarySlipCache) as ISalarySlip[];
        const salarySlipData = await SalarySlip.find({month, employeeId}, {_id: 0,__v: 0,month:0, employeeId:0}).lean<ISalarySlip[]>().exec();
        await redisClient.set(salarySlipKey(employeeId,month),JSON.stringify(salarySlipData),{EX: SALARY_SLIP_CACHE_TTL});
        return salarySlipData;
    } catch(error) {
        console.error(error);
        return [];
    }
}

export {createSalarySlip,getMonthlyEmployeeSalarySlip};