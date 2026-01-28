import fs from "fs";
import XLSX from "xlsx";
import path from "path";
import type { IAttendanceSheet } from "../interface/attendance_sheet";

export function generateSheet(
	data: IAttendanceSheet[],
	month: string,
	email: string,
) {
	try {
		const dir = path.join("attendance_sheet", month);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		const workbook = XLSX.utils.book_new();
		const worksheet = XLSX.utils.json_to_sheet(data);
		XLSX.utils.book_append_sheet(workbook, worksheet, "attendance");
		const filePath = path.join(dir, `${email}.xlsx`);
		XLSX.writeFile(workbook, filePath);
		console.log(`generated excel sheet at ${filePath}`);
	} catch (error) {
		console.error(error);
	}
}
