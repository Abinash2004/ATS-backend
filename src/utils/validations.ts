import {Types} from "mongoose";
import type {IEmployee} from "../interface/employee.ts";
import type {ICredentialsValidationResponse} from "../interface/auth.ts";

function isString(str: unknown): boolean {
    return typeof str === 'string' && str.trim().length > 0;
}
function isNumber(n: unknown): boolean {
    return typeof n === 'number' && !Number.isNaN(n);
}
function isObject(obj: unknown): boolean {
    return typeof obj === 'string' && Types.ObjectId.isValid(obj);
}

function validateAuthCredentials(employee: Partial<IEmployee>, isSignUp: boolean): ICredentialsValidationResponse {
    const {name, email, password, salary, departmentId, locationId, shiftId} = employee;
    if (isSignUp && !isString(name)) {
        return {status: false, message: "invalid name."};
    } if (!isString(email)) {
        return {status: false, message: "invalid email."};
    } if (!isString(password)) {
        return {status: false, message: "invalid password."};
    } if (isSignUp && !isNumber(salary)) {
        return {status: false, message: "invalid salary."};
    } if (isSignUp && !isObject(departmentId)) {
        return {status: false, message: "invalid departmentId."};
    } if (isSignUp && !isObject(locationId)) {
        return {status: false, message: "invalid locationId."};
    } if (isSignUp && !isObject(shiftId)) {
        return {status: false, message: "invalid shiftId."};
    }
    return { status: true, message: isSignUp ? "successfully signed up." : "successfully signed in." };
}

export {isNumber,isObject,isString,validateAuthCredentials};