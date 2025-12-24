import {Schema,model} from "mongoose";

const timesheetSchema = new Schema({
    clock_in: {
        type: Date
    },
    clock_out: {
        type: Date
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        required: true
    }
});

const Timesheet = model("Timesheet", timesheetSchema);
export default Timesheet;