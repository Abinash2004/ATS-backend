import { Schema, model } from "mongoose";
import type { IShift, ISingleShift } from "../interface/shift";

export const singleShift = new Schema<ISingleShift>(
	{
		start_time: {
			type: String, //HH:MM
			required: true,
			match: /^([01]\d|2[0-3]):([0-5]\d)$/,
		},
		end_time: {
			type: String, //HH:MM
			required: true,
			match: /^([01]\d|2[0-3]):([0-5]\d)$/,
		},
		day_status: {
			type: String,
			enum: ["full_day", "first_half", "second_half", "holiday"],
			default: "full_day",
		},
	},
	{ _id: false },
);

const shiftSchema = new Schema<IShift>({
	sunday: {
		type: singleShift,
		required: true,
	},
	monday: {
		type: singleShift,
		required: true,
	},
	tuesday: {
		type: singleShift,
		required: true,
	},
	wednesday: {
		type: singleShift,
		required: true,
	},
	thursday: {
		type: singleShift,
		required: true,
	},
	friday: {
		type: singleShift,
		required: true,
	},
	saturday: {
		type: singleShift,
		required: true,
	},
});

const Shift = model<IShift>("Shift", shiftSchema);
export default Shift;
