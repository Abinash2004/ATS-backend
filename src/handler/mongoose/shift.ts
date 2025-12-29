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

export {getShift};