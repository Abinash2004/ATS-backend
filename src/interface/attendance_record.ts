import { Types } from "mongoose";

export interface IAttendanceRecord {
	attendance_date: Date;
	first_half: string;
	second_half: string;
	employeeId: Types.ObjectId;
	shiftId: Types.ObjectId;
}
