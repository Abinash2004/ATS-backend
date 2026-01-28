import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import type { ISalarySlipPDF } from "../interface/salary_slip_pdf";
import type { ISalaryTemplateAmount } from "../interface/salary_slip";

export function generatePDF(
    d: ISalarySlipPDF,
    salaryTemplateAmountArray: ISalaryTemplateAmount[]
): void {
    const dirPath = path.join("salary_slips", d.month);
    const filePath = path.join(dirPath, `${d.employee.email}.pdf`);
    fs.mkdirSync(dirPath, { recursive: true });

    const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 15
    });

    doc.pipe(fs.createWriteStream(filePath));
    const BLACK = "#000000";
    const HR = (): void => {
        doc.moveTo(40, doc.y).lineTo(800, doc.y).stroke(BLACK);
        doc.moveDown();
    };

    const text = (
        size: number,
        color: string,
        txt: string,
        x: number,
        y: number,
        opt: PDFKit.Mixins.TextOptions = {}
    ): void => {
        doc.fontSize(size).fillColor(color).text(txt, x, y, opt);
    };

    let y = 40;

    // TITLE
    text(20, BLACK, `Salary Slip - ${d.month}`, 40, y, { align: "center" });
    doc.moveDown(0.5);
    HR();

    // COMPANY
    text(22, BLACK, d.company.name, 40, doc.y);
    text(13, BLACK, d.company.address, 40, doc.y + 6);
    doc.moveDown(0.5);
    HR();

    const row = (x: number, key: string, value: string): void => {
        text(13, BLACK, key, x, y);
        text(14, BLACK, `:  ${value}`, x + 150, y);
        y += 24;
    };

    // EMPLOYEE DETAILS
    y = doc.y;
    row(40, "Employee Name", d.employee.name);
    row(40, "Employee Email", d.employee.email);
    row(40, "Account No", d.employee.account);
    row(40, "Bank Name", d.employee.bank);
    row(40, "Department", d.employee.department);

    // ATTENDANCE DETAILS
    y = doc.y - 110;
    row(575, "Working Shifts", d.attendance.working_shift);
    row(575, "Present Shifts", d.attendance.present_shift);
    row(575, "Absent Shifts", d.attendance.absent_shift);
    row(575, "Paid Leave", d.attendance.paid_leave);
    row(575, "Overtime Hours", d.attendance.over_time);
    doc.moveDown(0.5);
    HR();

    // SALARY TEMPLATE AMOUNTS
    y = doc.y + 25;
    text(15, BLACK, "Salary Components", 40, y);
    salaryTemplateAmountArray.forEach(item => {
        row(40, item.name, String(item.amount));
    });
    HR();

    // SALARY
    row(40, "Advance Salary", d.salary.advance);
    row(40, "Overtime Wages", d.salary.over_time);
    row(40, "Bonus Salary", d.salary.bonus);
    row(40, "Penalty Amount", d.salary.penalty);
    row(40, "Fixed Allowance", d.salary.fixed_allowance);
    row(40, "Gross Salary", d.salary.gross);
    HR();
    doc.end();
}