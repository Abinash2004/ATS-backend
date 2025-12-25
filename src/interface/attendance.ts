import { Types } from "mongoose";

export interface IBreak {
    break_in: Date;
    break_out?: Date;
    reason: string;
}

export interface IAttendance {
    clock_in: Date;
    clock_out?: Date;
    breaks: IBreak[];
    status: "in" | "out" | "break";
    employeeId: Types.ObjectId;
}
