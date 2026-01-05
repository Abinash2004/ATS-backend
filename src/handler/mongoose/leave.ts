import Leave from "../../model/leave.ts";
import {messageEmission, parseDateDMY} from "../helper.ts";
import type {Socket} from "socket.io";
import type {DayStatus} from "../../type/day_status.ts";

async function createLeave(socket: Socket ,leave_date: string, day_status: DayStatus, reason: string, employeeId: string): Promise<void> {
    try {
        const leaveDate: Date =  parseDateDMY(leave_date);

        const leave = await Leave.findOne({date: leaveDate, employeeId});
        if (leave) {
            messageEmission(socket, "failed", "leave request already exists.")
            return;
        }
        await Leave.create({date: leaveDate, day_status, employeeId, leave_status: "pending", reason});
        messageEmission(socket, "success", "leave request sent successfully.")
    } catch(error) {
        console.log(error);
    }
}
export {createLeave};