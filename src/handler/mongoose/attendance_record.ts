import type { AttendanceStatus } from "../../type/attendance";
import type { IAttendanceRecord } from "../../interface/attendance_record";
import AttendanceRecord from "../../model/attendance_record";
import { getFirstDayUtc, getLastDayUtc } from "../../utils/date_time";

export async function getRecentAttendanceRecordDate(): Promise<Date | null> {
	try {
		const recentAttendance = await AttendanceRecord.findOne()
			.sort({ attendance_date: -1 })
			.exec();
		if (!recentAttendance) return null;
		return new Date(recentAttendance.attendance_date);
	} catch (error) {
		console.log(error);
		return null;
	}
}

export async function setAttendanceRecord(
	attendance_date: Date,
	first_half: AttendanceStatus,
	second_half: AttendanceStatus,
	employeeId: string,
	shiftId: string,
): Promise<void> {
	try {
		await AttendanceRecord.create({
			attendance_date: new Date(attendance_date.setUTCHours(0, 0, 0, 0)),
			employeeId: employeeId,
			first_half: first_half,
			second_half: second_half,
			shiftId: shiftId,
		});
	} catch (error) {
		console.log(error);
	}
}

export async function getAllAttendanceRecord(): Promise<IAttendanceRecord[]> {
	try {
		return await AttendanceRecord.find({}, { _id: 0, __v: 0 });
	} catch (error) {
		console.log(error);
		return [];
	}
}

export async function getEmployeeAttendanceRecord(
	employeeId: string,
): Promise<IAttendanceRecord[]> {
	try {
		return await AttendanceRecord.find(
			{ employeeId },
			{ _id: 0, __v: 0, employeeId: 0 },
		);
	} catch (error) {
		console.log(error);
		return [];
	}
}

export async function getEmployeeAttendanceRecordDateWise(
	employeeId: string,
	start: Date,
	end: Date,
): Promise<IAttendanceRecord[]> {
	try {
		return await AttendanceRecord.find({
			employeeId,
			attendance_date: { $gte: start, $lte: end },
		});
	} catch (error) {
		console.log(error);
		return [];
	}
}

export async function getEmployeeAttendanceRecordMonthWise(
	employeeId: string,
	month: string,
): Promise<IAttendanceRecord[]> {
	try {
		const start = getFirstDayUtc(month);
		const end = getLastDayUtc(month);
		return await AttendanceRecord.find({
			employeeId,
			attendance_date: { $gte: start, $lte: end },
		});
	} catch (error) {
		console.log(error);
		return [];
	}
}
