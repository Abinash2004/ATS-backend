import Attendance from "../../model/attendance.ts";
import AttendanceRecord from "../../model/attendance_record.ts";
import type {AttendanceStatus} from "../../type/attendance.ts";
import type {IAttendanceRecord} from "../../interface/attendance_record.ts";

async function getRecentAttendanceRecordDate(): Promise<Date|null> {
    try {
        const recentAttendance = await AttendanceRecord.findOne().sort({attendance_date: -1}).exec();
        if (!recentAttendance) {
            const firstAttendance = await Attendance.findOne().sort({clock_in: 1}).exec();
            if (!firstAttendance) return null;
            return new Date(firstAttendance.clock_in.setUTCHours(0,0,0,0));
        }
        return new Date(recentAttendance.attendance_date.setDate(recentAttendance.attendance_date.getDate() + 1));
    } catch(error) {
        console.log(error);
        return new Date(Date.now()-1);
    }
}
async function setAttendanceRecord(attendance_date: Date, first_half: AttendanceStatus,second_half: AttendanceStatus, employeeId: string): Promise<void> {
    try {
        await AttendanceRecord.create({
            attendance_date: new Date(attendance_date.setUTCHours(0,0,0,0)),
            employeeId: employeeId,
            first_half: first_half,
            second_half: second_half
        });
    } catch (error) {
        console.log(error);
    }
}
async function getAllAttendanceRecord(): Promise<IAttendanceRecord[]> {
    try {
        return await AttendanceRecord.find({}, { _id: 0, __v: 0 });
    } catch(error) {
        console.log(error);
        return [];
    }
}
async function getEmployeeAttendanceRecord(employeeId: string): Promise<IAttendanceRecord[]> {
    try {
        return await AttendanceRecord.find({employeeId}, {_id: 0,__v: 0,employeeId:0});
    } catch(error) {
        console.log(error);
        return [];
    }
}

export {
    getRecentAttendanceRecordDate,
    setAttendanceRecord,
    getAllAttendanceRecord,
    getEmployeeAttendanceRecord
};