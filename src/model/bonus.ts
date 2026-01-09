import mongoose from "mongoose";
import type {IBonus} from "../interface/bonus.ts";

const bonusSchema = new mongoose.Schema<IBonus>({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    bonus_date: {
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
    }
});
const Bonus = mongoose.model<IBonus>("Bonus", bonusSchema);
export default Bonus;