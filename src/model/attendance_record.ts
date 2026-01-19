import mongoose from "mongoose";
import type {IAttendanceRecord} from "../interface/attendance_record.ts";

const attendanceRecordSchema = new mongoose.Schema<IAttendanceRecord>({
    attendance_date: {
        type: Date,
        required: true
    },
    first_half: {
        type: String,
        enum: ["present","absent","paid_leave","no_shift"],
        required: true
    },
    second_half: {
        type: String,
        enum: ["present","absent","paid_leave","no_shift"],
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    shiftId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shift",
        required: true
    }
});
attendanceRecordSchema.index({attendance_date: -1});
attendanceRecordSchema.index({employeeId: 1,attendance_date: 1});
const AttendanceRecord = mongoose.model<IAttendanceRecord>("Attendance_Record",attendanceRecordSchema);
export default AttendanceRecord;