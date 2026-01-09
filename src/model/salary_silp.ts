import mongoose from "mongoose";
import type {ISalary, ISalaryAttendance, ISalarySlip} from "../interface/salary_slip.ts";

const salarySchema = new mongoose.Schema<ISalary>({
    basic_salary: {
        type: Number,
        required: true
    },
    over_time_wages: {
        type: Number,
        required: true
    },
    bonus_salary: {
        type: Number,
        required: true
    },
    penalty_amount: {
        type: Number,
        required: true
    },
    gross_salary: {
        type: Number,
        required: true
    }
},{ _id: false });

const salaryAttendanceSchema = new mongoose.Schema<ISalaryAttendance>({
    working_shifts: {
        type: Number,
        required: true
    },
    present_shifts: {
        type: Number,
        required: true
    },
    absent_shifts: {
        type: Number,
        required: true
    },
    over_time_hours: {
        type: String,
        required: true
    },
    paid_leave: {
        type: Number,
        required: true
    }
},{ _id: false })

const salarySlipSchema = new mongoose.Schema<ISalarySlip>({
    salary: {
        type: salarySchema,
        required: true,
    },
    attendance: {
        type: salaryAttendanceSchema,
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