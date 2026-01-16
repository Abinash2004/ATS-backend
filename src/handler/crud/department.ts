import type {Socket} from "socket.io";
import type {IDepartment} from "../../interface/department.ts";
import {errorEmission, messageEmission} from "../helper.ts";
import {createDepartment,deleteDepartment,getDepartment,updateDepartment} from "../mongoose/department.ts";

async function createDepartmentHandler(socket:Socket, department:IDepartment) {
    try {
        if (!department) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        await createDepartment(department);
        messageEmission(socket,"success","department created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readDepartmentHandler(socket:Socket, departmentId: string) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        const department:IDepartment|null = await getDepartment(departmentId);
        if (!department) {
            messageEmission(socket,"failed","department not found.");
            return;
        }
        messageEmission(socket,"success",{department});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateDepartmentHandler(socket:Socket, departmentId: string, department:IDepartment) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        if (!department) {
            messageEmission(socket,"failed","department data are needed");
            return
        }
        await updateDepartment(departmentId,department);
        messageEmission(socket,"success","department data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteDepartmentHandler(socket:Socket, departmentId: string) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        await deleteDepartment(departmentId);
        messageEmission(socket,"success","department deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {createDepartmentHandler,readDepartmentHandler,updateDepartmentHandler,deleteDepartmentHandler};