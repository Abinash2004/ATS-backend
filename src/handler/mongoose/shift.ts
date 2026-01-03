import Shift from "../../model/shift.ts";
import type {IShift} from "../../interface/shift.ts";

async function getShift(shiftId: string): Promise<IShift | null> {
    try {
        return await Shift.findOne({_id: shiftId});
    } catch(error) {
        console.error(error);
        return null;
    }
}

async function createShift(shift: IShift): Promise<void> {
    try {
        await Shift.create(shift);
    } catch(error) {
        console.error(error);
    }
}

async function deleteShift(shiftId: string): Promise<void> {
    try {
        await Shift.deleteOne({_id: shiftId});
    } catch(error) {
        console.error(error);
    }
}

async function updateShift(shiftId: string, shift: IShift): Promise<void> {
    try {
        await Shift.updateOne({_id: shiftId}, {
            $set: {
                monday: shift.monday,
                tuesday: shift.tuesday,
                wednesday: shift.wednesday,
                thursday: shift.thursday,
                friday: shift.friday,
                saturday: shift.saturday,
                sunday: shift.sunday
            }
        });
    } catch(error) {
        console.error(error);
    }
}

export {getShift,createShift,deleteShift,updateShift};