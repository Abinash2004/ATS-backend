import {Types} from 'mongoose';

export interface IEmployee {
    name: string;
    email: string;
    password: string;
    salary: number;
    locationId:Types.ObjectId;
    departmentId:Types.ObjectId;
    shiftId:Types.ObjectId;
}