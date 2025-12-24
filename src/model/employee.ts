import {Schema,model} from "mongoose";

const employeeSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
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
    locationId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    departmentId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    shiftId: {
        type: Schema.Types.ObjectId,
        required: true
    }
});

const Employee = model("Employee", employeeSchema);
export default Employee;