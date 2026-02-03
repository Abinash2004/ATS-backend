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

function truncate2(value: number): number {
	return value <= 0 ? 0 : Math.floor(value * 100) / 100;
}

function safeFraction(worked: number, total: number): number {
	return total > 0 ? truncate2(worked / total) : 0;
}

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
					employeeId,
					shift: shift[currentDay],
					shiftId,
					status: "in",
					late_in,
					late_clock_in_reason: reason,
				});
				await Timesheet.create({
					time: clockInTime,
					status: "in",
					employeeId,
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
			employeeId,
			shift: shift[currentDay],
			shiftId,
			status: "in",
			late_in,
		});
		await Timesheet.create({
			time: clockInTime,
			status: "in",
			employeeId,
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
					employeeId,
					shift: shift[currentDay],
					shiftId,
					status: "in",
					late_in,
					late_clock_in_reason: reason,
				});
				await Timesheet.create({
					time: currentTime,
					status: "in",
					employeeId,
				});
				return;
			}
		}

		await Attendance.create({
			clock_in: currentTime,
			employeeId,
			shift: shift[currentDay],
			shiftId,
			late_in,
		});
		await Timesheet.create({
			time: currentTime,
			status: "in",
			employeeId,
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
			0.0,
			0.0,
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
		const attendance = await getAttendanceByDate(attendance_date, employeeId);

		if (
			leave &&
			(leave.day_status === "first_half" || leave.day_status === "full_day")
		) {
			if (!attendance) {
				await setAttendanceRecord(
					attendance_date,
					leave.category,
					second_half,
					0,
					0,
					employeeId,
					shiftId,
				);
			} else if (attendance.clock_out) {
				const { shiftMinutes, workedMinutes } = await getShiftData(
					attendance,
					attendance.clock_out,
				);
				const workedFraction = safeFraction(workedMinutes, shiftMinutes);
				await setAttendanceRecord(
					attendance_date,
					leave.category,
					second_half,
					workedFraction >= 1 - leave.fraction
						? 1 - leave.fraction
						: workedFraction,
					0,
					employeeId,
					shiftId,
				);
			}
		} else {
			if (!attendance) {
				await setAttendanceRecord(
					attendance_date,
					"absent",
					second_half,
					0,
					0,
					employeeId,
					shiftId,
				);
			} else if (attendance.clock_out) {
				const { shiftMinutes, workedMinutes } = await getShiftData(
					attendance,
					attendance.clock_out,
				);
				const workedFraction = safeFraction(workedMinutes, shiftMinutes);
				await setAttendanceRecord(
					attendance_date,
					"present",
					second_half,
					workedFraction >= 1 ? 1 : workedFraction,
					0,
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
		const attendance = await getAttendanceByDate(attendance_date, employeeId);

		if (
			leave &&
			(leave.day_status === "second_half" || leave.day_status === "full_day")
		) {
			if (!attendance) {
				await setAttendanceRecord(
					attendance_date,
					first_half,
					leave.category,
					0,
					0,
					employeeId,
					shiftId,
				);
			} else if (attendance.clock_out) {
				const { shiftMinutes, workedMinutes } = await getShiftData(
					attendance,
					attendance.clock_out,
				);
				const workedFraction = safeFraction(workedMinutes, shiftMinutes);
				await setAttendanceRecord(
					attendance_date,
					first_half,
					leave.category,
					0,
					workedFraction >= 1 - leave.fraction
						? 1 - leave.fraction
						: workedFraction,
					employeeId,
					shiftId,
				);
			}
		} else {
			if (!attendance) {
				await setAttendanceRecord(
					attendance_date,
					first_half,
					"absent",
					0,
					0,
					employeeId,
					shiftId,
				);
			} else if (attendance.clock_out) {
				const { shiftMinutes, workedMinutes } = await getShiftData(
					attendance,
					attendance.clock_out,
				);
				const workedFraction = safeFraction(workedMinutes, shiftMinutes);
				await setAttendanceRecord(
					attendance_date,
					first_half,
					"present",
					0,
					workedFraction >= 1 ? 1 : workedFraction,
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
		const attendance = await getAttendanceByDate(attendance_date, employeeId);

		if (leave) {
			if (leave.day_status === "full_day") {
				if (!attendance) {
					await setAttendanceRecord(
						attendance_date,
						leave.category,
						leave.category,
						0,
						0,
						employeeId,
						shiftId,
					);
				} else if (attendance.clock_out) {
					const { shiftMinutes, workedMinutes } = await getShiftData(
						attendance,
						attendance.clock_out,
					);
					let workedFraction = safeFraction(workedMinutes, shiftMinutes);
					if (workedFraction >= 1 - leave.fraction)
						workedFraction = 1 - leave.fraction;
					await setAttendanceRecord(
						attendance_date,
						"present",
						"present",
						truncate2(workedFraction / 2),
						truncate2(workedFraction / 2),
						employeeId,
						shiftId,
					);
				}
			}
		} else {
			if (!attendance) {
				await setAttendanceRecord(
					attendance_date,
					"absent",
					"absent",
					0,
					0,
					employeeId,
					shiftId,
				);
			} else if (attendance.clock_out) {
				const { shiftMinutes, shiftStartTime, shiftEndTime } =
					await getShiftData(attendance, attendance.clock_out);
				const middleDate = new Date(
					(shiftStartTime.getTime() + shiftEndTime.getTime()) / 2,
				);
				const first_half_minutes =
					attendance.clock_in < middleDate
						? calculateMinutes(attendance.clock_in, middleDate)
						: 0;
				const second_half_minutes =
					middleDate < attendance.clock_out
						? calculateMinutes(middleDate, attendance.clock_out)
						: 0;
				const first_half_fraction = safeFraction(
					first_half_minutes,
					shiftMinutes / 2,
				);
				const second_half_fraction = safeFraction(
					second_half_minutes,
					shiftMinutes / 2,
				);

				await setAttendanceRecord(
					attendance_date,
					first_half_minutes ? "present" : "absent",
					second_half_minutes ? "present" : "absent",
					first_half_fraction > 1 ? 1 : first_half_fraction,
					second_half_fraction > 1 ? 1 : second_half_fraction,
					employeeId,
					shiftId,
				);
			}
		}
	} catch (error) {
		errorEmission(socket, error);
	}
}
