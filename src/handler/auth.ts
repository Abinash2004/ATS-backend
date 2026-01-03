import type {Socket} from "socket.io";
import type {IEmployee} from "../interface/employee.ts";
import {signToken} from "../config/jwt.ts";
import {validateAuthCredentials} from "../utils/validations.ts";
import {addNewEmployee, isEmployeeExists} from "./mongoose/employee.ts";

async function authSignUp(socket: Socket, employee: IEmployee) {
    const message = validateAuthCredentials(employee, true);
    if (!message.status) {
        return socket.emit("sign_up_response", { status: "failed", message: message.message});
    }
    const email = employee.email as string;
    if (await isEmployeeExists(email)) {
        return socket.emit("sign_up_response", { status: "failed", message: "employee already exists with this email."});
    }
    await addNewEmployee(employee);
    const token = signToken({email});
    return socket.emit("sign_up_response", { status: "success", message: message.message, token });
}

async function authSignIn(socket: Socket, employee: IEmployee) {
    const message = validateAuthCredentials(employee, false);
    if (!message.status) {
        return socket.emit("sign_in_response", { status: "failed", message: message.message});
    }
    const email = employee.email as string;
    if (await isEmployeeExists(email)) {
        const token = signToken({email});
        return socket.emit("sign_in_response", { status: "success", message: message.message, token});
    }
    return socket.emit("sign_in_response", { status: "failed", message: "employee not found with this email."});
}

export {authSignUp, authSignIn};