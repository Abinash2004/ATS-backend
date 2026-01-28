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
