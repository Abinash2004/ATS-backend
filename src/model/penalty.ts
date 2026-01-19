import mongoose from "mongoose";
import type {IPenalty} from "../interface/penalty.ts";

const penaltySchema = new mongoose.Schema<IPenalty>({
    penalty_date: {
        type: Date,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    }
});
penaltySchema.index({employeeId: 1,penalty_date: 1});
const Penalty = mongoose.model<IPenalty>("Penalty", penaltySchema);
export default Penalty;