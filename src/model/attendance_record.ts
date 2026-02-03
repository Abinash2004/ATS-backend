import mongoose from "mongoose";
import type { IAttendanceRecord } from "../interface/attendance_record";

const attendanceRecordSchema = new mongoose.Schema<IAttendanceRecord>({
	attendance_date: {
		type: Date,
		required: true,
	},
	first_half: {
		type: String,
		required: true,
	},
	second_half: {
		type: String,
		required: true,
	},
	first_half_fraction: {
		type: Number,
		default: 1,
	},
	second_half_fraction: {
		type: Number,
		default: 1,
	},
	employeeId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Employee",
		required: true,
	},
	shiftId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Shift",
		required: true,
	},
});

attendanceRecordSchema.index({ attendance_date: -1 });
attendanceRecordSchema.index({ employeeId: 1, attendance_date: 1 });
const AttendanceRecord = mongoose.model<IAttendanceRecord>(
	"Attendance_Record",
	attendanceRecordSchema,
);

export default AttendanceRecord;
