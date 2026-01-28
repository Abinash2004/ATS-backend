import AdvancePayroll from "../../model/advance_payroll";
import type { IAdvancePayroll } from "../../interface/advance_payroll";

async function createAdvancePayroll(
	start_date: Date,
	end_date: Date,
): Promise<void> {
	try {
		await AdvancePayroll.create({ start_date, end_date, status: "pending" });
	} catch (error) {
		console.log(error);
	}
}
async function getPendingAdvancePayroll(): Promise<IAdvancePayroll | null> {
	try {
		return await AdvancePayroll.findOne({ status: "pending" });
	} catch (error) {
		console.log(error);
		return null;
	}
}
async function resolveAdvancePayroll(): Promise<void> {
	try {
		await AdvancePayroll.updateOne(
			{ status: "pending" },
			{ status: "resolved" },
		);
	} catch (error) {
		console.log(error);
	}
}

export {
	createAdvancePayroll,
	getPendingAdvancePayroll,
	resolveAdvancePayroll,
};
