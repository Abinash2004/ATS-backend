import {Schema,model} from "mongoose";

const shiftSchema = new Schema({
    initial_time: {
        type: Date,
        required: true
    },
    exit_time: {
        type: Date,
        required: true
    }
});

const Shift = model("Shift", shiftSchema);
export default Shift;