import { Queue } from "bullmq";
import type { Socket } from "socket.io";
import type { IEmployee } from "../interface/employee.ts";
import type { IAdvancePayroll } from "../interface/advance_payroll.ts";
import type {
    ISalary,
    ISalaryAttendance,
    ISalaryTemplateAmount
} from "../interface/salary_slip.ts";

import { getShift } from "./mongoose/shift.ts";
import { generatePDF } from "../utils/pdf_generation.ts";
import { getDepartment } from "./mongoose/department.ts";
import { getBonusByDate } from "./mongoose/bonus.ts";
import { createSalarySlip } from "./mongoose/salary_slip.ts";
import { getAllEmployeesList } from "./mongoose/employee.ts";
import { createPayrollRecord } from "./mongoose/payroll_record.ts";
import { createPenalty ,getPenaltyByDate } from "./mongoose/penalty.ts";
import { getEmployeeAttendanceRecordDateWise } from "./mongoose/attendance_record.ts";
import { createAdvancePayroll, resolveAdvancePayroll } from "./mongoose/advance_payroll.ts";
import {
    dateToIST,
    dateToMonthYear,
    formatHoursMinutes,
    formatMonthYear,
    getDayName
} from "../utils/date_time.ts";
import {
    calculateOvertimeMinutes,
    calculateOvertimePay,
    calculateShiftSalary,
    calculateTotalWorkingShift,
    getSalaryTemplateData,
    messageEmission
} from "./helper.ts";

const redisURI = "redis://localhost:6379/0";
export const payrollQueue = new Queue("payroll", { connection: { url: redisURI }});

async function runPayroll(
    socket: Socket,
    start: Date,
    end: Date,
    isPendingAdvancePayroll: boolean,
    pendingAdvancePayroll: IAdvancePayroll | null,
    isAdvancePayroll: boolean,
    recentAttendanceDate: Date,
    actualEndDate: Date
): Promise<void>  {
    try {
        const employees: IEmployee[] = await getAllEmployeesList();
        for (let emp of employees) {
            await payrollQueue.add("employeePayroll",{
                employeeId: emp._id.toString(),
                start,
                end,
                isPendingAdvancePayroll,
                pendingAdvancePayroll,
                isAdvancePayroll,
                recentAttendanceDate,
                actualEndDate
            });
        }

        const startAdvancePayroll = new Date(recentAttendanceDate);
        startAdvancePayroll.setDate(startAdvancePayroll.getDate() + 1);
        if (isAdvancePayroll) {
            await createAdvancePayroll(startAdvancePayroll,actualEndDate);
        }

        if (isPendingAdvancePayroll) await resolveAdvancePayroll();
        await createPayrollRecord(start, end, String(new Date().getFullYear()));
        messageEmission(socket,"success",`salarySlip created - ${formatMonthYear(start)}.`);
    } catch(error) {
        messageEmission(socket, "failed", "Payroll failed: " + error);
    }
}

async function runEmployeePayroll(
    emp: IEmployee,
    start: Date,
    end: Date,
    isPendingAdvancePayroll: boolean,
    pendingAdvancePayroll: IAdvancePayroll | null,
    isAdvancePayroll: boolean,
    recentAttendanceDate: Date,
    actualEndDate: Date
): Promise<void> {
    try {
        let salary = 0;
        let paidLeave = 0;
        let absentShift = 0;
        let presentShift = 0;
        let advanceSalary = 0;
        let overTimeWages = 0;
        let overtimeMinutes = 0;

        let shiftId: string = emp.shiftId.toString();
        let totalBonus = await getBonusByDate(emp._id.toString(),start,end);
        let workingShift = await calculateTotalWorkingShift(emp._id.toString(), start,end);
        const attendance = await getEmployeeAttendanceRecordDateWise(emp._id.toString(),start,end);
        if (attendance.length !== 0) shiftId = attendance[0].shiftId.toString();
        let shiftSalary = await calculateShiftSalary(shiftId,start,end,emp.salary);

        const result = await getSalaryTemplateData(emp._id.toString(),emp.salary);
        let salaryAmount : Record<string, number> = {};
        for (let key in result) {
            salaryAmount[key] = 0;
        }

        //resolve advance payroll
        if (isPendingAdvancePayroll && pendingAdvancePayroll) {
            let advancePayrollAttendance = await getEmployeeAttendanceRecordDateWise(
                emp._id.toString(),
                pendingAdvancePayroll.start_date,
                pendingAdvancePayroll.end_date
            );

            let amountPerShift : Record<string, number> = {};
            for (let key in result) {
                amountPerShift[key] = await calculateShiftSalary(shiftId, start, end, result[key]);
            }

            for (let att of advancePayrollAttendance) {
                if (shiftId !== att.shiftId.toString()) {
                    shiftId = att.shiftId.toString();
                    for (let key in result) {
                        amountPerShift[key] = await calculateShiftSalary(shiftId, start, end, result[key]);
                    }
                }

                if (att.first_half === "absent") {
                    let penalty = 0;
                    for (let key in result) {
                        penalty += amountPerShift[key];
                    }
                    await createPenalty(
                        emp._id.toString(),
                        penalty,
                        `advance deduction - ${dateToIST(att.attendance_date)} (first half).`
                    );
                }

                if (att.second_half === "absent") {
                    let penalty = 0;
                    for (let key in result) {
                        penalty += amountPerShift[key];
                    }
                    await createPenalty(
                        emp._id.toString(),
                        penalty,
                        `advance deduction - ${dateToIST(att.attendance_date)} (second half).`
                    );
                }

                overtimeMinutes += await calculateOvertimeMinutes(att,emp._id.toString());
                overTimeWages += await calculateOvertimePay(att, emp._id.toString(), shiftSalary);
            }
        }

        let totalPenalties = await getPenaltyByDate(emp._id.toString(),start,end);
        let amountPerShift : Record<string, number> = {};
        for (let key in result) {
            amountPerShift[key] = await calculateShiftSalary(shiftId, start, end, result[key]);
        }

        for (let att of attendance) {
            if (shiftId !== att.shiftId.toString()) {
                shiftId = att.shiftId.toString();
                shiftSalary = await calculateShiftSalary(shiftId,start,end,emp.salary);
                for (let key in result) {
                    amountPerShift[key] = await calculateShiftSalary(shiftId, start, end, result[key]);
                }
            }

            if (att.first_half === "present") {
                salary += shiftSalary;
                for (let key in result) {
                    salaryAmount[key] += amountPerShift[key];
                }
                presentShift++;

            }

            if(att.first_half === "paid_leave") {
                salary += shiftSalary;
                for (let key in result) {
                    salaryAmount[key] += amountPerShift[key];
                }
                paidLeave++;
            }

            if (att.second_half === "present") {
                salary += shiftSalary;
                for (let key in result) {
                    salaryAmount[key] += amountPerShift[key];
                }
                presentShift++;
            }

            if (att.second_half === "paid_leave") {
                salary += shiftSalary;
                for (let key in result) {
                    salaryAmount[key] += amountPerShift[key];
                }
                paidLeave++;
            }

            if (att.first_half === "absent") absentShift++;
            if (att.second_half === "absent") absentShift++;

            overtimeMinutes += await calculateOvertimeMinutes(att,emp._id.toString());
            overTimeWages += await calculateOvertimePay(att, emp._id.toString(), shiftSalary);
        }
        if (isAdvancePayroll) {
            const shift = await getShift(shiftId);
            if (!shift) throw new Error("Shift not found");
            let shiftCount = 0;

            let iterDate = new Date(recentAttendanceDate);
            iterDate.setDate(iterDate.getDate() + 1);
            while (iterDate <= actualEndDate) {
                const day = getDayName(iterDate);
                if (shift[day].day_status === "full_day") shiftCount += 2;
                else if (shift[day].day_status === "first_half" || shift[day].day_status === "second_half") shiftCount++;
                iterDate.setDate(iterDate.getDate()+1);
            }

            workingShift += shiftCount;
            presentShift += shiftCount;
            advanceSalary = shiftSalary * shiftCount;
        }

        let salaryComponent = 0;
        let salaryTemplateAmountArray: ISalaryTemplateAmount[] = [];
        for (let key in result) {
            salaryTemplateAmountArray.push({
                name: key,
                amount: Math.round(salaryAmount[key] * 100) / 100
            });
            salaryComponent += salaryAmount[key];
        }

        const salaryObject: ISalary = {
            salaryTemplateAmount: salaryTemplateAmountArray,
            advance_salary: Math.round(advanceSalary*100)/100,
            over_time_wages: Math.round(overTimeWages*100)/100,
            bonus_salary: Math.round(totalBonus*100)/100,
            penalty_amount: Math.round(totalPenalties*100)/100,
            fixed_allowance: Math.round((salary - salaryComponent)*100)/100,
            gross_salary: Math.round((salaryComponent + (salary - salaryComponent) + advanceSalary + overTimeWages + totalBonus - totalPenalties)*100)/100
        };

        const attendanceObject: ISalaryAttendance = {
            working_shifts: workingShift,
            present_shifts: presentShift,
            absent_shifts: absentShift,
            over_time_hours: formatHoursMinutes(overtimeMinutes),
            paid_leave: paidLeave
        }

        await createSalarySlip(salaryObject, attendanceObject,emp._id.toString(),dateToMonthYear(start));
        const department = await getDepartment(emp.departmentId.toString());
        if (!department) throw new Error("Department not found");

        generatePDF({
            month: formatMonthYear(start),
            company: {
                name: "Ultimate Business Systems Pvt. Ltd.",
                address: "Diamond World 3rd floor C-301, Mini Bazaar, Varachha Road, Surat, Gujarat, India, 395006",
            },
            employee: {
                name: emp.name,
                email: emp.email,
                account: "69066990666999",
                bank: "Super Bank of Surat",
                department: department.name,
            },
            attendance: {
                working_shift: workingShift.toString(),
                present_shift: presentShift.toString(),
                absent_shift: absentShift.toString(),
                paid_leave: paidLeave.toString(),
                over_time: formatHoursMinutes(overtimeMinutes)
            },
            salary: {
                advance: (Math.round(advanceSalary*100)/100).toString(),
                over_time: (Math.round(overTimeWages*100)/100).toString(),
                bonus: (Math.round(totalBonus*100)/100).toString(),
                penalty: (Math.round(totalPenalties*100)/100).toString(),
                fixed_allowance: (Math.round((salary - salaryComponent)*100)/100).toString(),
                gross: (Math.round((salaryComponent + (salary - salaryComponent) + advanceSalary + overTimeWages + totalBonus - totalPenalties)*100)/100).toString()
            }
        },salaryTemplateAmountArray);
    } catch(error) {
        console.log(error);
    }
}

export{runPayroll,runEmployeePayroll};