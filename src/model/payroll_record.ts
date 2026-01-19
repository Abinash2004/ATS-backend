import mongoose, {Schema} from "mongoose";
import type {IPayrollRecord} from "../interface/payroll_record.ts";

const payrollRecordSchema = new Schema<IPayrollRecord>({
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    year: {
        type: String,
        required: true
    }
});
payrollRecordSchema.index({end_date: -1});
const PayrollRecord = mongoose.model<IPayrollRecord>("Payroll_Record", payrollRecordSchema);
export default PayrollRecord;