import { Types } from "mongoose";

export interface IEmployee {
	_id: string;
	name: string;
	email: string;
	password: string;
	salary: number;
	role: "employee" | "admin";
	locationId: Types.ObjectId;
	departmentId: Types.ObjectId;
	shiftId: Types.ObjectId;
}
