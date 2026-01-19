import mongoose from "mongoose";
import type {IPolicy} from "../interface/policy.ts";

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
});

const Policy = mongoose.model<IPolicy>("policy", policySchema);
export default Policy;