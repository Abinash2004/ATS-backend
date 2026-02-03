import { Types } from "mongoose";

export interface IAttendanceRecord {
	attendance_date: Date;
	first_half: string;
	second_half: string;
	first_half_fraction: number;
	second_half_fraction: number;
	employeeId: Types.ObjectId;
	shiftId: Types.ObjectId;
}
