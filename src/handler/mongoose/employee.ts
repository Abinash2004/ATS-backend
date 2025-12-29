import Employee from "../../model/employee.ts";
import type {IEmployee} from "../../interface/employee.ts";

async function isEmployeeExists(email: string): Promise<boolean> {
    try {
        const emp = await Employee.findOne({email});
        return !!emp;
    } catch(error) {
        console.log(error);
        return false;
    }
}

async function addNewEmployee(employee: Partial<IEmployee>): Promise<void> {
    try {
        await Employee.create(employee);
    } catch (error) {
        console.log(error);
    }
}

async function getEmployeeData(email: string) {
    try {
        const emp =  await Employee.findOne({email});
        return emp as IEmployee;
    } catch(error) {
        console.log(error);
    }
}

export {
    isEmployeeExists,
    addNewEmployee,
    getEmployeeData
};