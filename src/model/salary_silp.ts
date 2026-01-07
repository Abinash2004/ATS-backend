import mongoose, {Types} from "mongoose";
import type {ISalarySlip} from "../interface/salary_slip.ts";

const salarySlipSchema = new mongoose.Schema<ISalarySlip>({
    salary: {
        type: Number,
        required: true,
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    month: {
        type: String,
        required: true
    }
});

const SalarySlip = mongoose.model<ISalarySlip>("salary_slip", salarySlipSchema);
export default SalarySlip;