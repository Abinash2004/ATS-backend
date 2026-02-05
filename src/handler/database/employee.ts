import type { Socket } from "socket.io";
import bcrypt from "bcrypt";
import type { IEmployee } from "../../interface/employee";
import { errorEmission, messageEmission } from "../helper/reusable";
import {
	addNewEmployee,
	deleteEmployee,
	getEmployeeById,
	isEmployeeExists,
	updateEmployee,
} from "../mongoose/employee";

export async function createEmployeeHandler(
	socket: Socket,
	employee: IEmployee,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!employee) {
			messageEmission(socket, "failed", "employee data are needed");
			return;
		}
		const isEmployee = await isEmployeeExists(employee.email);
		if (isEmployee) {
			messageEmission(socket, "failed", "employee already exists");
			return;
		}
		employee.password = await bcrypt.hash(employee.password, 10);
		await addNewEmployee(employee);
		messageEmission(socket, "success", "employee created successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function readEmployeeHandler(
	socket: Socket,
	employeeId: string,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!employeeId) {
			messageEmission(socket, "failed", "employee ID is missing.");
			return;
		}
		const employee: IEmployee | null = await getEmployeeById(employeeId);
		if (!employee) {
			messageEmission(socket, "failed", "employee not found.");
			return;
		}
		messageEmission(socket, "success", { employee });
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function updateEmployeeHandler(
	socket: Socket,
	employeeId: string,
	employee: IEmployee,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!employeeId) {
			messageEmission(socket, "failed", "employee ID is missing.");
			return;
		}
		if (!employee) {
			messageEmission(socket, "failed", "employee data are needed");
			return;
		}
		if (employee.password) {
			employee.password = await bcrypt.hash(employee.password, 10);
		}
		await updateEmployee(employeeId, employee);
		messageEmission(socket, "success", "employee data updated successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function deleteEmployeeHandler(
	socket: Socket,
	employeeId: string,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!employeeId) {
			messageEmission(socket, "failed", "employee ID is missing.");
			return;
		}
		await deleteEmployee(employeeId);
		messageEmission(socket, "success", "employee deleted successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}
