import mongoose, { Schema } from "mongoose";
import type { ILeave } from "../interface/leave";

const leaveSchema = new Schema<ILeave>({
	date: {
		type: Date,
		required: true,
	},
	category: {
		type: String,
		required: true,
	},
	day_status: {
		type: String,
		enum: ["full_day", "first_half", "second_half"],
		default: "full_day",
	},
	leave_status: {
		type: String,
		enum: ["pending", "approved", "rejected"],
		default: "pending",
	},
	reason: {
		type: String,
		required: true,
	},
	employeeId: {
		type: Schema.Types.ObjectId,
		ref: "Employee",
		required: true,
	},
	shiftId: {
		type: Schema.Types.ObjectId,
		ref: "Shift",
		required: true,
	},
	fraction: {
		type: Number,
		default: 1,
	},
});

leaveSchema.index({ date: 1, employeeId: 1, leave_status: 1 });
const Leave = mongoose.model<ILeave>("Leave", leaveSchema);

export default Leave;
