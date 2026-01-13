import type {IPayrollRecord} from "../../interface/payroll_record.ts";
import PayrollRecord from "../../model/payroll_record.ts";

async function getLastPayrollDate(): Promise<Date|null> {
    try {
        const payroll: IPayrollRecord|null = await PayrollRecord.findOne().sort({ end_date: -1}).exec();
        if (!payroll) return null;
        return payroll.end_date;
    } catch(error) {
        console.error(error);
        return null;
    }
}

async function createPayrollRecord(start: Date,end: Date,year: string): Promise<void> {
    try {
        const currentYear = Number(year);
        const prevFinancialYear = `${currentYear - 1}-${currentYear}`;
        const nextFinancialYear = `${currentYear}-${currentYear + 1}`;

        const payroll = await PayrollRecord.find();
        if (payroll.length === 0) await PayrollRecord.create({start_date: start,end_date: end,year: nextFinancialYear});
        else {
            if (payroll.length < 12) await PayrollRecord.create({start_date: start,end_date: end,year: nextFinancialYear});
            else {
                const count = await PayrollRecord.countDocuments({year: prevFinancialYear});
                const financialYear = count >= 12 ? nextFinancialYear : prevFinancialYear;
                await PayrollRecord.create({start_date: start,end_date: end,year: financialYear});
            }
        }
    } catch (error) {
        console.log(error);
    }
}


export {getLastPayrollDate,createPayrollRecord};