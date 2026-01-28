import mongoose from "mongoose";
import type { IBonus } from "../interface/bonus";

const bonusSchema = new mongoose.Schema<IBonus>({
	employeeId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
	},
	bonus_date: {
		type: Date,
		required: true,
	},
	amount: {
		type: Number,
		required: true,
	},
	reason: {
		type: String,
		required: true,
	},
});

bonusSchema.index({ employeeId: 1, bonus_date: 1 });
const Bonus = mongoose.model<IBonus>("Bonus", bonusSchema);

export default Bonus;
