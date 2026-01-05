import mongoose, {Schema} from "mongoose";
import type {ILeave} from "../interface/leave.ts";

const leaveSchema = new Schema<ILeave>({
    date: {
        type: Date,
        required: true
    },
    day_status: {
        type: String,
        default: "full_day"
    },
    leave_status: {
        type: String,
        default: "pending"
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    }
});

const Leave = mongoose.model<ILeave>("Leave", leaveSchema);
export default Leave;