import type {IPenalty} from "../interface/penalty.ts";
import mongoose from "mongoose";

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

const Penalty = mongoose.model<IPenalty>("Penalty", penaltySchema);
export default Penalty;