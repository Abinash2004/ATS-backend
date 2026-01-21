import {io} from '../config/server.ts';
import type {Socket} from 'socket.io';
import type {IShift} from "../interface/shift.ts";
import type {IPolicy} from "../interface/policy.ts";
import type {DayStatus} from "../type/day_status.ts";
import type {IEmployee} from "../interface/employee.ts";
import type {ILocation} from "../interface/location.ts";
import type {IDepartment} from "../interface/department.ts";
import type {leave_response} from "../type/leave_response.ts";
import type { ExtendedError } from "socket.io/dist/namespace";
import type {ISalaryTemplate} from "../interface/salary_template.ts";
import {runPayrollHandler,viewPayrollHistory} from "./events/admin.ts";
import {authSignIn,authSignUp,authVerification} from "./auth.ts";
import {createPolicyHandler, readPolicyHandler, updatePolicyHandler} from "./crud/policy.ts";
import {createShiftHandler,deleteShiftHandler,readShiftHandler,updateShiftHandler} from "./crud/shift.ts";
import {createEmployeeHandler,deleteEmployeeHandler,readEmployeeHandler,updateEmployeeHandler} from "./crud/employee.ts";
import {createLocationHandler,deleteLocationHandler,readLocationHandler,updateLocationHandler} from "./crud/location.ts";
import {createDepartmentHandler,deleteDepartmentHandler,readDepartmentHandler,updateDepartmentHandler} from "./crud/department.ts";
import {createAttendanceRecordHandler,generateAttendanceSheetHandler,giveBonusHandler,givePenaltyHandler,leaveResponseHandler,salaryTemplateCreateHandler,salaryTemplateUpdateHandler,viewAllAttendanceRecordHandler} from "./events/hr.ts";
import {breakHandler,clockInHandler,clockOutHandler,leaveRequestHandler,resolvePendingAttendanceHandler,statusHandler,viewEmployeeAttendanceHandler,viewEmployeeSalaryHandler,viewPenaltyHandler,viewBonusHandler} from "./events/employee.ts";

function startAuthSocketServer() {
    const authNamespace = io.of("/auth");
    authNamespace.on('connection', (socket) => {
        console.log(`${socket.id} connected to auth server.`);
        socket.on("sign_up", (employee: IEmployee) => authSignUp(socket,employee));
        socket.on("sign_in", (employee: IEmployee) => authSignIn(socket,employee));
    });
}

function startSocketServer() {
    const appNamespace = io.of("/app");
    appNamespace.use((socket: Socket, next: (err?: ExtendedError) => void) => authVerification(socket,next));
    appNamespace.on('connection', (socket: Socket) => {
        const employee: IEmployee  = socket.data.employee;

        //daily attendance + read only operations - by any authenticated user
        socket.on("clock.in", (reason: string) => clockInHandler(socket,employee,reason));
        socket.on("clock.out", (reason: string) => clockOutHandler(socket,employee,reason));
        socket.on("break", (reason: string) => breakHandler(reason,socket,employee));
        socket.on("status.view",() => statusHandler(socket, employee));
        socket.on("penalty.view",() => viewPenaltyHandler(socket,employee._id.toString()));
        socket.on("bonus.view",() => viewBonusHandler(socket,employee._id.toString()));
        socket.on("salary.view", (month: string) => viewEmployeeSalaryHandler(socket,month,employee._id.toString()));
        socket.on("leave.request", (leave_date: string, day_status: DayStatus, reason: string) => leaveRequestHandler(socket,employee._id.toString(), employee.shiftId.toString(),leave_date,day_status,reason));
        socket.on("attendance.resolve",(attendanceId: string, clockOutTime: string) => resolvePendingAttendanceHandler(socket, attendanceId, clockOutTime));
        socket.on("attendance.employee.view",() => viewEmployeeAttendanceHandler(socket,employee._id.toString()));

        //attendance + leave approval + bonus + penalty section - only HR / admin are permitted
        socket.on("attendance.generate",() => createAttendanceRecordHandler(socket));
        socket.on("attendance.view",() => viewAllAttendanceRecordHandler(socket));
        socket.on("attendance.sheet.generate",(month: string) => generateAttendanceSheetHandler(socket,month));
        socket.on("leave.response",(leaveId: string, response: leave_response) => leaveResponseHandler(socket, leaveId, response));
        socket.on("penalty.add",(employeeId: string, amount: Number, reason: string) => givePenaltyHandler(socket, employee.departmentId.toString(), employeeId, amount, reason));
        socket.on("bonus.add",(employeeId: string, amount: Number, reason: string) => giveBonusHandler(socket, employee.departmentId.toString(), employeeId, amount, reason));
        socket.on("policy.view",() => readPolicyHandler(socket));
        socket.on("salary_template.create", (salaryTemplate: ISalaryTemplate) => salaryTemplateCreateHandler(socket, salaryTemplate));
        socket.on("salary_template.update", (salaryTemplateId: string,salaryTemplate: ISalaryTemplate) => salaryTemplateUpdateHandler(socket,salaryTemplateId, salaryTemplate));

        //payroll section - only admin permitted
        socket.on("payroll.run",(endDate: string,startDate: string) => runPayrollHandler(socket, startDate, endDate));
        socket.on("payroll.history",() => viewPayrollHistory(socket));

        //CRUD on collections - only admin permitted
        socket.on("employee.create",(employee:IEmployee)=>createEmployeeHandler(socket,employee));
        socket.on("employee.read",(employeeId: string)=>readEmployeeHandler(socket,employeeId));
        socket.on("employee.update",(employeeId: string, employee:IEmployee)=>updateEmployeeHandler(socket,employeeId,employee));
        socket.on("employee.delete",(employeeId: string)=>deleteEmployeeHandler(socket, employeeId));
        socket.on("shift.create",(shift:IShift)=>createShiftHandler(socket,shift));
        socket.on("shift.read",(shiftId: string)=>readShiftHandler(socket,shiftId));
        socket.on("shift.update",(shiftId: string, shift:IShift)=>updateShiftHandler(socket,shiftId,shift));
        socket.on("shift.delete",(shiftId: string)=>deleteShiftHandler(socket, shiftId));
        socket.on("department.create",(department:IDepartment)=>createDepartmentHandler(socket,department));
        socket.on("department.read",(departmentId: string)=>readDepartmentHandler(socket,departmentId));
        socket.on("department.update",(departmentId: string, department:IDepartment)=>updateDepartmentHandler(socket,departmentId,department));
        socket.on("department.delete",(departmentId: string)=>deleteDepartmentHandler(socket, departmentId));
        socket.on("location.create",(location:ILocation)=>createLocationHandler(socket,location));
        socket.on("location.read",(locationId: string)=>readLocationHandler(socket,locationId));
        socket.on("location.update",(locationId: string, location:ILocation)=>updateLocationHandler(socket,locationId,location));
        socket.on("location.delete",(locationId: string)=>deleteLocationHandler(socket, locationId));
        socket.on("policy.create",(policy: IPolicy)=>createPolicyHandler(socket,policy));
        socket.on("policy.update",(policy:IPolicy)=>updatePolicyHandler(socket,policy));
    });
}

export {startSocketServer,startAuthSocketServer};