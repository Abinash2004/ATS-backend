import AttendanceRecord from "../../model/attendance_record.ts";
import Attendance from "../../model/attendance.ts";

async function getRecentAttendanceRecordDate(): Promise<Date|null> {
    try {
        const recentAttendance = await AttendanceRecord.findOne().sort({date: -1}).exec();
        if (!recentAttendance) {
            const firstAttendance = await Attendance.findOne().sort({clock_in: 1}).exec();
            if (!firstAttendance) return null;
            return new Date(firstAttendance.clock_in.setHours(0,0,0,0));
        }
        return recentAttendance.attendance_date;
    } catch(error) {
        console.log(error);
        return new Date(Date.now()-1);
    }
}
export {getRecentAttendanceRecordDate};
