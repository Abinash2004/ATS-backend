import Employee from "../../model/employee";
import type { IEmployee } from "../../interface/employee";

export async function isEmployeeExists(email: string): Promise<boolean> {
	try {
		const emp = await Employee.findOne({ email });
		return !!emp;
	} catch (error) {
		console.log(error);
		return false;
	}
}

export async function addNewEmployee(employee: IEmployee): Promise<void> {
	try {
		await Employee.create(employee);
	} catch (error) {
		console.log(error);
	}
}

export async function getEmployeeDataByEmail(
	email: string,
): Promise<IEmployee | null> {
	try {
		return await Employee.findOne({ email });
	} catch (error) {
		console.log(error);
		return null;
	}
}

export async function getEmployeeById(id: string): Promise<IEmployee | null> {
	try {
		return await Employee.findOne({ _id: id });
	} catch (error) {
		console.log(error);
		return null;
	}
}

export async function updateEmployee(
	employeeId: string,
	employee: Partial<IEmployee>,
): Promise<void> {
	try {
		const updateData: any = {};
		if (employee.name) updateData.name = employee.name;
		if (employee.email) updateData.email = employee.email;
		if (employee.password) updateData.password = employee.password;
		if (employee.salary) updateData.salary = employee.salary;
		if (employee.locationId) updateData.locationId = employee.locationId;
		if (employee.departmentId) updateData.departmentId = employee.departmentId;
		if (employee.shiftId) updateData.shiftId = employee.shiftId;
		if (employee.role) updateData.role = employee.role;

		await Employee.updateOne({ _id: employeeId }, { $set: updateData });
	} catch (error) {
		console.log(error);
	}
}

export async function deleteEmployee(employeeId: string): Promise<void> {
	try {
		await Employee.deleteOne({ _id: employeeId });
	} catch (error) {
		console.log(error);
	}
}

export async function getAllEmployeesList(): Promise<IEmployee[]> {
	try {
		return await Employee.find();
	} catch (error) {
		console.log(error);
		return [];
	}
}
