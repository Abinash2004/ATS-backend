import {Types} from "mongoose";

export interface ISalaryAttendance {
    working_shifts: number;
    present_shifts: number;
    absent_shifts: number;
    paid_leave: number;
    over_time_hours: string;
}

export interface ISalary {
    basic_salary: number;
    advance_salary: number;
    over_time_wages: number;
    bonus_salary: number;
    penalty_amount: number;
    gross_salary: number;
}

export interface ISalarySlip {
    salary: ISalary;
    attendance: ISalaryAttendance;
    employeeId: Types.ObjectId;
    month: string;
}