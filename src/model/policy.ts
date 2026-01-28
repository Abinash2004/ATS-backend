import mongoose from "mongoose";
import type { IPolicy } from "../interface/policy";

const policySchema = new mongoose.Schema<IPolicy>({
	late_in: {
		type: Number,
		required: true,
	},
	early_out: {
		type: Number,
		required: true,
	},
	break_per_hour: {
		type: Number,
		required: true,
	},
	break_limit: {
		type: Number,
		required: true,
	},
	epf_percentage: {
		type: Number,
		min: 0,
		max: 100,
		default: 12,
	},
	epf_cap: {
		type: Number,
		default: 15000,
	},
});

const Policy = mongoose.model<IPolicy>("policy", policySchema);
export default Policy;
