import type { Day } from "../type/day";

export function stringToDate(inputTime: string): Date {
	const [hh, mm] = inputTime.split(":").map(Number);
	let shiftTime = new Date();
	shiftTime.setUTCHours(hh - 5, mm - 30, 0, 0);
	return shiftTime;
}

export function dateToIST(date: Date): string {
	return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

export function calculateMinutes(start: Date, end: Date): number {
	if (end < start) return 0;
	return Math.floor((end.getTime() - start.getTime()) / 60000);
}

export function formatHoursMinutes(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}h ${minutes}m`;
}

export function getDayName(date: Date): Day {
	const days: Day[] = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
	] as const;
	return days[date.getDay()];
}

export function parseDateDMY(input: string): Date {
	const [dd, mm, yyyy] = input.split("/").map(Number);
	if (!dd || !mm || !yyyy) {
		throw new Error("Invalid date format");
	}
	return new Date(Date.UTC(yyyy, mm - 1, dd));
}

export function getLastDayUtc(mmYYYY: string): Date {
	const [mm, yyyy] = mmYYYY.split("/").map(Number);
	if (!mm || !yyyy || mm < 1 || mm > 12) {
		throw new Error("Invalid format. Expected mm/yyyy");
	}
	return new Date(Date.UTC(yyyy, mm, 0, 0, 0, 0, 0));
}

export function getFirstDayUtc(mmYYYY: string): Date {
	const [mm, yyyy] = mmYYYY.split("/").map(Number);
	if (!mm || !yyyy || mm < 1 || mm > 12) {
		throw new Error("Invalid format. Expected mm/yyyy");
	}
	return new Date(Date.UTC(yyyy, mm - 1, 1, 0, 0, 0, 0));
}

export function formatMonthYear(input: Date): string {
	return input.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function toMonthName(input: string) {
	const [mm, yyyy] = input.split("/").map(Number);
	if (!mm || mm < 1 || mm > 12 || !yyyy) {
		throw new Error("Invalid format. Expected mm/yyyy");
	}
	const monthName = new Date(yyyy, mm - 1).toLocaleString("en-US", {
		month: "long",
	});
	return `${monthName} ${yyyy}`;
}

export function countDays(startDate: Date, endDate: Date): number {
	const MS_PER_DAY = 1000 * 60 * 60 * 24;

	const start = Date.UTC(
		startDate.getUTCFullYear(),
		startDate.getUTCMonth(),
		startDate.getUTCDate(),
	);

	const end = Date.UTC(
		endDate.getUTCFullYear(),
		endDate.getUTCMonth(),
		endDate.getUTCDate(),
	);

	return Math.floor((end - start) / MS_PER_DAY) + 1;
}

export function dateToMonthYear(date: Date): string {
	return date.toLocaleDateString("en-GB", {
		month: "2-digit",
		year: "numeric",
	});
}

export function normalizeDate(date: string | Date) {
	const d = typeof date === "string" ? parseDateDMY(date) : date;
	return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

export function getFirstDateOfCurrentWeek(): Date {
	const today = new Date();
	const day = today.getDay();
	const diff = day === 0 ? -6 : 1 - day;
	const monday = new Date(today);
	monday.setDate(today.getDate() + diff);
	monday.setHours(0, 0, 0, 0);

	return monday;
}

export function getLastDateOfCurrentWeek(): Date {
	const today = new Date();
	const day = today.getDay();
	const diff = day === 0 ? 0 : 7 - day;
	const sunday = new Date(today);
	sunday.setDate(today.getDate() + diff);
	sunday.setHours(23, 59, 59, 999);

	return sunday;
}

export function getFirstDateOfCurrentMonth(): Date {
	const date = new Date();
	return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function getLastDateOfCurrentMonth(): Date {
	const date = new Date();
	return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getCurrentSixMonthQuarterRange(): { start: Date; end: Date } {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth();
	const isFirstHalf = month < 6;
	const startMonth = isFirstHalf ? 0 : 6;
	const endMonth = isFirstHalf ? 5 : 11;
	const start = new Date(year, startMonth, 1, 0, 0, 0, 0);
	const end = new Date(year, endMonth + 1, 0, 23, 59, 59, 999);
	return { start, end };
}

export function getFirstAndLastDateOfCurrentYear(): { start: Date; end: Date } {
	const year = new Date().getFullYear();
	const start = new Date(year, 0, 1, 0, 0, 0, 0); // Jan 1
	const end = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31
	return { start, end };
}
