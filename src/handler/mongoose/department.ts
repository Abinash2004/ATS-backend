import Department from "../../model/department";
import type { IDepartment } from "../../interface/department";

export async function createDepartment(department: IDepartment): Promise<void> {
	try {
		await Department.create(department);
	} catch (error) {
		console.log(error);
	}
}

export async function getDepartment(
	departmentId: string,
): Promise<IDepartment | null> {
	try {
		return await Department.findOne({ _id: departmentId });
	} catch (error) {
		console.error(error);
		return null;
	}
}

export async function updateDepartment(
	departmentId: string,
	department: IDepartment,
): Promise<void> {
	try {
		await Department.updateOne(
			{ _id: departmentId },
			{
				$set: { name: department.name },
			},
		);
	} catch (error) {
		console.error(error);
	}
}

export async function deleteDepartment(departmentId: string): Promise<void> {
	try {
		await Department.deleteOne({ _id: departmentId });
	} catch (error) {
		console.error(error);
	}
}
