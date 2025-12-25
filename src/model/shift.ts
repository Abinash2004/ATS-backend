import {Schema,model} from "mongoose";
import {IShift} from "../interface/shift.ts";

const shiftSchema = new Schema<IShift>({
    initial_time: {
        type: String, // "HH:mm"
        required: true
    },
    exit_time: {
        type: String, // "HH:mm"
        required: true
    }
});

const Shift = model<IShift>("Shift", shiftSchema);
export default Shift;