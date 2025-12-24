import {Schema,model} from "mongoose";

const attendanceSchema = new Schema({
    clock_in: {
        type: Date
    },
    clock_out: {
        type: Date
    },
    break: {
        type: Number
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        required: true
    }
});

const Attendance = model("Attendance",attendanceSchema);
export default Attendance;