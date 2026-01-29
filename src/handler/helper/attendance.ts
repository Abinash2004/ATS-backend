import type { Day } from "../../type/day";
import type { IShift } from "../../interface/shift";
import type { Socket } from "socket.io";
import { getApprovedLeave } from "../mongoose/leave";
import { getAttendanceByDate } from "../mongoose/attendance";
import { setAttendanceRecord } from "../mongoose/attendance_record";
import { errorEmission, getShiftData, messageEmission } from "./reusable";
import { calculateMinutes, dateToIST } from "../../utils/date_time";
import { getLateInPenalty } from "../mongoose/policy";
import { createPenalty } from "../mongoose/penalty";
import Attendance from "../../model/attendance";
import Timesheet from "../../model/timesheet";

export async function newAttendanceRegularHandler(
	socket: Socket,
	shiftInitialTime: Date,
	shiftExitTime: Date,
	currentTime: Date,
	reason: string,
	employeeId: string,
	shift: IShift,
	shiftId: string,
	late_in: number,
	currentDay: Day,
) {
	try {
		let clockInTime = new Date();
		if (clockInTime < shiftInitialTime) clockInTime = shiftInitialTime;
		if (clockInTime >= shiftExitTime) {
			messageEmission(
				socket,
				"failed",
				`your shift is completed on ${dateToIST(shiftExitTime)}`,
			);
			return;
		}
		if (currentTime > shiftInitialTime) {
			if (!reason) {
				messageEmission(socket, "failed", "clocking in late, provide reason");
				return;
			} else {
				const lateMinutes = calculateMinutes(shiftInitialTime, currentTime);
				if (lateMinutes >= 30) {
					const lateInPenalty = await getLateInPenalty();
					await createPenalty(
						employeeId,
						lateInPenalty,
						`late clock-in on ${dateToIST(currentTime)}`,
					);
				}
				await Attendance.create({
					clock_in: clockInTime,
					employeeId: employeeId,
					shift: shift[currentDay],
					shiftId: shiftId,
					status: "in",
					late_in: late_in,
					late_clock_in_reason: reason,
				});
				await Timesheet.create({
					time: clockInTime,
					status: "in",
					employeeId: employeeId,
				});
				messageEmission(
					socket,
					"success",
					`late clocked in on ${dateToIST(clockInTime)}`,
				);
				return;
			}
		}

		await Attendance.create({
			clock_in: clockInTime,
			employeeId: employeeId,
			shift: shift[currentDay],
			shiftId: shiftId,
			status: "in",
			late_in: late_in,
		});
		await Timesheet.create({
			time: clockInTime,
			status: "in",
			employeeId: employeeId,
		});
		messageEmission(
			socket,
			"success",
			`clocked in on ${dateToIST(clockInTime)}`,
		);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function newAttendanceMidNigthHandler(
	socket: Socket,
	currentTime: Date,
	shiftInitialTime: Date,
	shiftExitTime: Date,
	reason: string,
	employeeId: string,
	shift: IShift,
	shiftId: string,
	late_in: number,
	currentDay: Day,
) {
	try {
		const midNightStart = new Date(Date.now());
		midNightStart.setHours(0, 0, 0, 0);
		const midNightEnd = new Date(Date.now());
		midNightEnd.setDate(midNightStart.getDate() + 1);

		if (currentTime >= midNightStart && currentTime <= shiftExitTime) {
			messageEmission(
				socket,
				"success",
				`clocked in on ${dateToIST(currentTime)}`,
			);
		} else if (currentTime > shiftExitTime && currentTime < shiftInitialTime) {
			currentTime = shiftInitialTime;
			messageEmission(
				socket,
				"success",
				`you are clocking in early, timer will start on ${dateToIST(shiftInitialTime)}`,
			);
		} else if (currentTime >= shiftInitialTime && currentTime < midNightEnd) {
			messageEmission(
				socket,
				"success",
				`clocked in on ${dateToIST(currentTime)}`,
			);
		}

		if (currentTime > shiftInitialTime) {
			if (!reason) {
				messageEmission(socket, "failed", "clocking in late, provide reason");
				return;
			} else {
				const lateMinutes = calculateMinutes(shiftInitialTime, currentTime);
				if (lateMinutes >= 30) {
					const lateInPenalty = await getLateInPenalty();
					await createPenalty(
						employeeId,
						lateInPenalty,
						`late clock-in on ${dateToIST(currentTime)}`,
					);
				}
				await Attendance.create({
					clock_in: currentTime,
					employeeId: employeeId,
					shift: shift[currentDay],
					shiftId: shiftId,
					status: "in",
					late_in: late_in,
					late_clock_in_reason: reason,
				});
				await Timesheet.create({
					time: currentTime,
					status: "in",
					employeeId: employeeId,
				});
				return;
			}
		}
		await Attendance.create({
			clock_in: currentTime,
			employeeId: employeeId,
			shift: shift[currentDay],
			shiftId: shiftId,
			late_in: late_in,
		});
		await Timesheet.create({
			time: currentTime,
			status: "in",
			employeeId: employeeId,
		});
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function attendanceHolidayHandler(
	socket: Socket,
	attendance_date: Date,
	employeeId: string,
	shiftId: string,
): Promise<void> {
	try {
		await setAttendanceRecord(
			attendance_date,
			"no_shift",
			"no_shift",
			employeeId,
			shiftId,
		);
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function attendanceFirstHalfHandler(
	socket: Socket,
	attendance_date: Date,
	employeeId: string,
	shiftId: string,
): Promise<void> {
	try {
		const second_half = "no_shift";
		const leave = await getApprovedLeave(attendance_date, employeeId);
		if (
			leave &&
			(leave.day_status === "first_half" || leave.day_status === "full_day")
		) {
			await setAttendanceRecord(
				attendance_date,
				leave.category,
				second_half,
				employeeId,
				shiftId,
			);
		} else {
			const attendance = await getAttendanceByDate(attendance_date, employeeId);
			if (!attendance)
				await setAttendanceRecord(
					attendance_date,
					"absent",
					second_half,
					employeeId,
					shiftId,
				);
			else {
				if (!attendance.clock_out) return;
				const { shiftMinutes, workedMinutes } = await getShiftData(
					attendance,
					attendance.clock_out,
				);
				if (shiftMinutes <= workedMinutes)
					await setAttendanceRecord(
						attendance_date,
						"present",
						second_half,
						employeeId,
						shiftId,
					);
				else
					await setAttendanceRecord(
						attendance_date,
						"absent",
						second_half,
						employeeId,
						shiftId,
					);
			}
		}
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function attendanceSecondHalfHandler(
	socket: Socket,
	attendance_date: Date,
	employeeId: string,
	shiftId: string,
): Promise<void> {
	try {
		const first_half = "no_shift";
		const leave = await getApprovedLeave(attendance_date, employeeId);
		if (
			leave &&
			(leave.day_status === "second_half" || leave.day_status === "full_day")
		) {
			await setAttendanceRecord(
				attendance_date,
				first_half,
				leave.category,
				employeeId,
				shiftId,
			);
		} else {
			const attendance = await getAttendanceByDate(attendance_date, employeeId);
			if (!attendance)
				await setAttendanceRecord(
					attendance_date,
					first_half,
					"absent",
					employeeId,
					shiftId,
				);
			else {
				if (!attendance.clock_out) return;
				const { shiftMinutes, workedMinutes } = await getShiftData(
					attendance,
					attendance.clock_out,
				);
				if (shiftMinutes <= workedMinutes)
					await setAttendanceRecord(
						attendance_date,
						first_half,
						"present",
						employeeId,
						shiftId,
					);
				else
					await setAttendanceRecord(
						attendance_date,
						first_half,
						"absent",
						employeeId,
						shiftId,
					);
			}
		}
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function attendanceFullDayHandler(
	socket: Socket,
	attendance_date: Date,
	employeeId: string,
	shiftId: string,
): Promise<void> {
	try {
		const leave = await getApprovedLeave(attendance_date, employeeId);
		if (leave) {
			if (leave.day_status === "full_day") {
				await setAttendanceRecord(
					attendance_date,
					leave.category,
					leave.category,
					employeeId,
					shiftId,
				);
			} else if (leave.day_status === "first_half") {
				const attendance = await getAttendanceByDate(
					attendance_date,
					employeeId,
				);
				if (!attendance)
					await setAttendanceRecord(
						attendance_date,
						leave.category,
						"absent",
						employeeId,
						shiftId,
					);
				else {
					if (!attendance.clock_out) return;
					const { shiftMinutes, workedMinutes } = await getShiftData(
						attendance,
						attendance.clock_out,
					);
					if (workedMinutes < shiftMinutes / 2)
						await setAttendanceRecord(
							attendance_date,
							leave.category,
							"absent",
							employeeId,
							shiftId,
						);
					else
						await setAttendanceRecord(
							attendance_date,
							leave.category,
							"present",
							employeeId,
							shiftId,
						);
				}
			} else if (leave.day_status === "second_half") {
				const attendance = await getAttendanceByDate(
					attendance_date,
					employeeId,
				);
				if (!attendance)
					await setAttendanceRecord(
						attendance_date,
						"absent",
						leave.category,
						employeeId,
						shiftId,
					);
				else {
					if (!attendance.clock_out) return;
					const { shiftMinutes, workedMinutes } = await getShiftData(
						attendance,
						attendance.clock_out,
					);
					if (workedMinutes < shiftMinutes / 2)
						await setAttendanceRecord(
							attendance_date,
							"absent",
							leave.category,
							employeeId,
							shiftId,
						);
					else
						await setAttendanceRecord(
							attendance_date,
							"present",
							leave.category,
							employeeId,
							shiftId,
						);
				}
			}
			return;
		}
		const attendance = await getAttendanceByDate(attendance_date, employeeId);
		if (!attendance) {
			await setAttendanceRecord(
				attendance_date,
				"absent",
				"absent",
				employeeId,
				shiftId,
			);
		} else {
			if (!attendance.clock_out) return;
			const { shiftMinutes, workedMinutes } = await getShiftData(
				attendance,
				attendance.clock_out,
			);
			if (shiftMinutes <= workedMinutes)
				await setAttendanceRecord(
					attendance_date,
					"present",
					"present",
					employeeId,
					shiftId,
				);
			else {
				const { shiftStartTime, shiftEndTime } = await getShiftData(
					attendance,
					attendance.clock_out,
				);
				const middleDate = new Date(
					(shiftStartTime.getTime() + shiftEndTime.getTime()) / 2,
				);
				if (attendance.clock_in < middleDate)
					await setAttendanceRecord(
						attendance_date,
						"present",
						"absent",
						employeeId,
						shiftId,
					);
				else
					await setAttendanceRecord(
						attendance_date,
						"absent",
						"present",
						employeeId,
						shiftId,
					);
			}
		}
	} catch (error) {
		errorEmission(socket, error);
	}
}
