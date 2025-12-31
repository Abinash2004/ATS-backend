import { Types } from "mongoose";

export interface IBreak {
    break_in: Date;
    break_out?: Date;
    reason: string;
}

export interface IAttendance {
    _id: string;
    clock_in: Date;
    clock_out?: Date;
    early_clock_out_reason?: string;
    breaks: IBreak[];
    status: "in" | "out" | "break";
    employeeId: Types.ObjectId;
    shiftId: Types.ObjectId;
}
