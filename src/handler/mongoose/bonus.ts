import Bonus from "../../model/bonus.ts";

async function createBonus(employeeId: string, amount: Number, reason: string): Promise<void> {
    try {
        await Bonus.create({employeeId, amount, reason, bonus_date: new Date(Date.now())});
    } catch(error) {
        console.error(error);
    }
}

export {createBonus}