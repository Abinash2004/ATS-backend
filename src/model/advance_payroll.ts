import mongoose from "mongoose";
import type {IAdvancePayroll} from "../interface/advance_payroll.ts";

const advancePayrollSchema = new mongoose.Schema<IAdvancePayroll>({
    start_date: {
        type: Date,
        required: true
    },
    end_date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        default: "pending"
    }
});
const AdvancePayroll = mongoose.model<IAdvancePayroll>("Advance_Payroll", advancePayrollSchema);
export default AdvancePayroll;