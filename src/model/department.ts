import {Schema,model} from "mongoose";

const departmentSchema = new Schema({
   name: {
       type: String,
       required: true
   }
});

const Department = model("Department", departmentSchema);
export default Department;