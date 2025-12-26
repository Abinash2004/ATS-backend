import {Schema,model} from "mongoose";
import type {IDepartment} from "../interface/department.ts";

const departmentSchema = new Schema<IDepartment>({
   name: {
       type: String,
       required: true
   }
});

const Department = model<IDepartment>("Department", departmentSchema);
export default Department;