import Employee from "../../model/employee";
import type { IEmployee } from "../../interface/employee";

async function isEmployeeExists(email: string): Promise<boolean> {
	try {
		const emp = await Employee.findOne({ email });
		return !!emp;
	} catch (error) {
		console.log(error);
		return false;
	}
}

async function addNewEmployee(employee: IEmployee): Promise<void> {
	try {
		await Employee.create(employee);
	} catch (error) {
		console.log(error);
	}
}

async function getEmployeeDataByEmail(
	email: string,
): Promise<IEmployee | null> {
	try {
		return await Employee.findOne({ email });
	} catch (error) {
		console.log(error);
		return null;
	}
}

async function getEmployeeById(id: string): Promise<IEmployee | null> {
	try {
		return await Employee.findOne({ _id: id });
	} catch (error) {
		console.log(error);
		return null;
	}
}

async function updateEmployee(
	employeeId: string,
	employee: IEmployee,
): Promise<void> {
	try {
		await Employee.updateOne(
			{ _id: employeeId },
			{
				$set: {
					name: employee.name,
					email: employee.email,
					password: employee.password,
					salary: employee.salary,
					locationId: employee.locationId,
					departmentId: employee.departmentId,
					shiftId: employee.shiftId,
				},
			},
		);
	} catch (error) {
		console.log(error);
	}
}

async function deleteEmployee(employeeId: string): Promise<void> {
	try {
		await Employee.deleteOne({ _id: employeeId });
	} catch (error) {
		console.log(error);
	}
}

async function getAllEmployeesList(): Promise<IEmployee[]> {
	try {
		return await Employee.find();
	} catch (error) {
		console.log(error);
		return [];
	}
}

export {
	isEmployeeExists,
	addNewEmployee,
	getEmployeeDataByEmail,
	getEmployeeById,
	updateEmployee,
	deleteEmployee,
	getAllEmployeesList,
};
