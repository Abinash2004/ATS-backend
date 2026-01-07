import Leave from "../../model/leave.ts";
import type {Socket} from "socket.io";
import type {ILeave} from "../../interface/leave.ts";
import type {DayStatus} from "../../type/day_status.ts";
import type {leave_response} from "../../type/leave_response.ts";
import {messageEmission, parseDateDMY} from "../helper.ts";

async function createLeave(socket: Socket ,leave_date: string, day_status: DayStatus, reason: string, employeeId: string, shiftId: string): Promise<void> {
    try {
        const leaveDate: Date =  parseDateDMY(leave_date);

        const leave = await Leave.findOne({date: leaveDate, employeeId});
        if (leave) {
            messageEmission(socket, "failed", "leave request already exists.")
            return;
        }
        await Leave.create({date: leaveDate, day_status, employeeId, shiftId, leave_status: "pending", reason});
        messageEmission(socket, "success", "leave request sent successfully.")
    } catch(error) {
        console.log(error);
    }
}

async function updateLeave(socket: Socket, leaveId: string, response: leave_response): Promise<void> {
    try {
        const leave = await Leave.findOne({_id:leaveId});
        if (!leave) {
            messageEmission(socket, "failed", "leave request not found.");
            return;
        }
        await Leave.updateOne({_id:leaveId}, {$set: {leave_status: response}});
        messageEmission(socket, "success", `leave request set ${response} successfully`);
    } catch(error) {
        console.log(error);
    }
}

async function getApprovedLeave(leaveDate: Date, employeeId: string): Promise<ILeave | null> {
    try {
        return await Leave.findOne({date: leaveDate, employeeId, leave_status: "approved"});
    } catch(error) {
        console.log(error);
        return null;
    }
}

export {createLeave,updateLeave, getApprovedLeave};