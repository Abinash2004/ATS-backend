import AdvancePayroll from "../../model/advance_payroll.ts";

async function createAdvancePayroll(start_date: Date, end_date: Date) {
    try {
        await AdvancePayroll.create({start_date,end_date,status:"pending"});
    } catch(error) {
        console.log(error);
    }
}

export {createAdvancePayroll}