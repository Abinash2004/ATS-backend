import bcrypt from "bcrypt";
import type { Socket } from "socket.io";
import type { IEmployee } from "../../interface/employee";
import type { IDepartment } from "../../interface/department";
import type { ExtendedError } from "socket.io/dist/namespace";
import { getDepartment } from "../mongoose/department";
import { signToken, verifyToken } from "../../config/jwt";
import { validateAuthCredentials } from "../../utils/validations";
import {
	addNewEmployee,
	getEmployeeDataByEmail,
	isEmployeeExists,
} from "../mongoose/employee";

export async function authSignUp(socket: Socket, employee: IEmployee) {
	const message = validateAuthCredentials(employee, true);
	if (!message.status) {
		return socket.emit("sign_up_response", {
			status: "failed",
			message: message.message,
		});
	}
	const email = employee.email as string;
	if (await isEmployeeExists(email)) {
		return socket.emit("sign_up_response", {
			status: "failed",
			message: "employee already exists with this email.",
		});
	}
	employee.password = await bcrypt.hash(employee.password, 10);
	employee.role = "employee"; // Enforce default role to prevent role escalation
	await addNewEmployee(employee);
	const token = signToken({ email });
	return socket.emit("sign_up_response", {
		status: "success",
		message: message.message,
		token,
	});
}

export async function authSignIn(socket: Socket, employee: IEmployee) {
	const message = validateAuthCredentials(employee, false);
	if (!message.status)
		return socket.emit("sign_in_response", {
			status: "failed",
			message: message.message,
		});
	const employeeData: IEmployee | null = await getEmployeeDataByEmail(
		employee.email,
	);
	if (!employeeData)
		return socket.emit("sign_in_response", {
			status: "failed",
			message: "employee not found with this email",
		});
	if (!(await bcrypt.compare(employee.password, employeeData.password))) {
		return socket.emit("sign_in_response", {
			status: "failed",
			message: "invalid password.",
		});
	}
	const token = signToken({ email: employee.email });
	return socket.emit("sign_in_response", {
		status: "success",
		message: message.message,
		token,
	});
}

export async function authVerification(
	socket: Socket,
	next: (err?: ExtendedError) => void,
) {
	try {
		const authHeader = socket.handshake.headers.authorization;
		const adminPassword = socket.handshake.headers.admin_password;

		if (!authHeader?.startsWith("Bearer "))
			return next(new Error("Authentication token missing."));
		const token = authHeader?.split(" ")[1];
		const email = verifyToken(token);
		const employee: IEmployee | null = await getEmployeeDataByEmail(email);
		if (!employee) return next(new Error("Employee not found."));

		if (employee.role === "admin") {
			if (adminPassword === process.env.ADMIN_PASSWORD) {
				socket.data.role = "admin";
			} else {
				socket.data.role = "employee"; // Admin without sudo password is treated as employee
			}
		} else {
			const department: IDepartment | null = await getDepartment(
				employee.departmentId.toString(),
			);
			if (!department) return next(new Error("Department not found."));
			if (department.name === "Human Resources") socket.data.role = "HR";
			else socket.data.role = "employee";
		}
		socket.data.employee = employee;
		next();
	} catch (err: unknown) {
		return next(new Error("invalid or expired token"));
	}
}
