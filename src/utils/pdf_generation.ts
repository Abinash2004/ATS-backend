import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type {ISalarySlipPDF} from "../interface/salary_slip_pdf";

export function generatePDF(d: ISalarySlipPDF): void {
    const dirPath = path.join("salary_slips", d.month);
    const filePath = path.join(dirPath, `${d.employee.email}.pdf`);
    fs.mkdirSync(dirPath, { recursive: true });
    const doc = new PDFDocument({size: "A4",layout: "landscape",margin: 15});
    doc.pipe(fs.createWriteStream(filePath));

    const BLACK = "#000000";
    const HR = (): void => {
        doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke(BLACK);
        doc.moveDown();
    };

    const text = (size: number,color: string,txt: string,x: number,y: number,opt: PDFKit.Mixins.TextOptions = {}): void => {
        doc.fontSize(size).fillColor(color).text(txt, x, y, opt);
    };

    // TITLE
    text(20, BLACK, `Salary Slip - ${d.month}`, 40, 40, { align: "center" });
    doc.moveDown(0.5);
    HR();

    // COMPANY
    text(22, BLACK, d.company.name, 40, doc.y);
    text(13, BLACK, d.company.address, 40, doc.y + 6);
    doc.moveDown(0.5);
    HR();

    // DETAILS
    let y = doc.y;
    const row = (x: number, key: string, value: string | number): void => {
        text(13, BLACK, key, x, y);
        text(14, BLACK, `:  ${value}`, x + 150, y);
        y += 24;
    };

    // EMPLOYEE DETAILS
    const empValues = Object.values(d.employee);
    [
        "Employee Name",
        "Employee Email",
        "Account No",
        "Bank Name",
        "Department"
    ].forEach((k, i) => row(40, k, empValues[i]));

    // ATTENDANCE DETAILS
    y = doc.y - 112;
    const attendanceValues = Object.values(d.attendance);
    [
        "Working Shifts",
        "Present Shifts",
        "Absent Shifts",
        "Paid Leave",
        "Overtime Hours"
    ].forEach((k, i) => row(575, k, attendanceValues[i]));

    // SALARY
    y = doc.y + 35;
    doc.moveDown(0.5);
    HR();
    doc.moveDown(0.5);
    const salaryValues = Object.values(d.salary);
    [
        "Basic Salary",
        "House Rental Allowance",
        "Dearness Allowance",
        "Advance Salary",
        "Overtime Wages",
        "Bonus Salary",
        "Penalty Amount",
        "EPF Amount",
        "Fixed Allowance",
        "Gross Salary"
    ].forEach((k, i) => row(40, k, salaryValues[i]));
    doc.moveDown(0.5);
    HR();

    // FOOTER
    const year = new Date().getFullYear();
    text(12,BLACK,`Copyright 2020-${year} Superworks Company. All rights reserved.`,0,560,{align: "center"});
    doc.end();
}