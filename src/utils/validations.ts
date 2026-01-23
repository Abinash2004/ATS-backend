import {Types} from "mongoose";
import type {Socket} from "socket.io";
import type {IEmployee} from "../interface/employee.ts";
import type {ISalaryTemplate} from "../interface/salary_template.ts";
import type {ICredentialsValidationResponse} from "../interface/auth.ts";
import {messageEmission} from "../handler/helper.ts";

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
function isValidMonthYear(value: string): boolean {
    const match = /^(0[1-9]|1[0-2])\/\d{4}$/.exec(value);
    if (!match) return false;
    const [, month, year] = value.match(/^(0[1-9]|1[0-2])\/(\d{4})$/)!;
    const y = Number(year);
    return y >= 1900 && y <= 2100;
}
function isValidSalaryTemplate(socket: Socket, salaryTemplate: ISalaryTemplate) {
    if (!salaryTemplate.hra || !salaryTemplate.da || !salaryTemplate.hra_type || !salaryTemplate.da_type) {
        messageEmission(socket, "failed", "invalid salaryTemplate, some values are missing.");
        return false;
    }
    if (salaryTemplate.hra_type === "percentage" && (salaryTemplate.hra < 0 || salaryTemplate.hra > 100)) {
        messageEmission(socket, "failed", "HRA percentage must be between 0 and 100");
        return false;
    }
    if (salaryTemplate.da_type === "percentage" && (salaryTemplate.da < 0 || salaryTemplate.da > 100)) {
        messageEmission(socket, "failed", "TA percentage must be between 0 and 100");
        return false;
    }
    if (salaryTemplate.basic_type === "percentage" && (salaryTemplate.basic < 0 || salaryTemplate.basic > 100)) {
        messageEmission(socket, "failed", "Basic percentage must be between 0 and 100");
        return false;
    }
    return true;
}

export {isNumber,isObject,isString,validateAuthCredentials,isValidMonthYear,isValidSalaryTemplate};