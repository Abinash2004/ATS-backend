import {Schema,model} from "mongoose";
import type {IEmployee} from "../interface/employee.ts";

const employeeSchema = new Schema<IEmployee>({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    salary: {
        type: Number,
        required: true
    },
    role: {
        type: String,
        enum: ["employee","admin"],
        required: true
    },
    locationId: {
        type: Schema.Types.ObjectId,
        ref: "Location",
        required: true
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        ref: "Department",
        required: true
    },
    shiftId: {
        type: Schema.Types.ObjectId,
        ref: "Shift",
        required: true
    }
});

const Employee = model<IEmployee>("Employee", employeeSchema);
export default Employee;