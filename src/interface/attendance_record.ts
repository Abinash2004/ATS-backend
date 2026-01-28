import { Types } from "mongoose";

export interface IAttendanceRecord {
	attendance_date: Date;
	first_half: "present" | "absent" | "paid_leave" | "no_shift";
	second_half: "present" | "absent" | "paid_leave" | "no_shift";
	employeeId: Types.ObjectId;
	shiftId: Types.ObjectId;
}
