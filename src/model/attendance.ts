import {singleShift} from "./shift.ts";
import {Schema,model} from "mongoose";
import type {IBreak,IAttendance} from "../interface/attendance.ts";

const breakSchema = new Schema<IBreak>(
    {
        break_in: {
            type: Date,
            required: true
        },
        break_out: {
            type: Date
        },
        reason: {
            type: String,
            required: true
        }
    },{ _id: false }
);

const attendanceSchema = new Schema<IAttendance>({
    clock_in: {
        type: Date,
        required: true,
    },
    clock_out: {
        type: Date
    },
    late_in: {
        type: Number
    },
    early_out: {
        type: Number
    },
    early_clock_out_reason: {
        type: String,
    },
    late_clock_in_reason: {
        type: String,
    },
    breaks: {
        type: [breakSchema],
        default: []
    },
    status: {
        type: String,
        enum: ["in","out","break"],
        required: true
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    },
    shift: {
        type: singleShift,
        required: true
    },
    shiftId: {
        type: Schema.Types.ObjectId,
        ref: "Shift",
        required: true
    }
});

const Attendance = model<IAttendance>("Attendance",attendanceSchema);
export default Attendance;