import {Schema,model} from "mongoose";
import type {ITimesheet} from "../interface/timesheet.ts";

const timesheetSchema = new Schema<ITimesheet>({
    time: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["in","out"],
        required: true
    },
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: "Employee",
        required: true
    }
});

const Timesheet = model<ITimesheet>("Timesheet", timesheetSchema);
export default Timesheet;