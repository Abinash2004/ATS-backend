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

async function addNewShift(shift: IShift): Promise<string|null|undefined> {
    try {
        const returnShift: IShift = await Shift.create(shift);
        if (!returnShift) return null;
        return returnShift._id?.toString();
    } catch(error) {
        console.error(error);
        return null;
    }
}

export {getShift, addNewShift};