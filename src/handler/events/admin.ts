import type {Socket} from "socket.io";
import type {IEmployee} from "../../interface/employee.ts";
import type {ISalary, ISalaryAttendance} from "../../interface/salary_slip.ts";
import {getShift} from "../mongoose/shift.ts";
import {generatePDF} from "../../utils/pdf_generation.ts";
import {getDepartment} from "../mongoose/department.ts";
import {getBonusByDate} from "../mongoose/bonus.ts";
import {createSalarySlip} from "../mongoose/salary_slip.ts";
import {getAllEmployeesList} from "../mongoose/employee.ts";
import {createPenalty, getPenaltyByDate} from "../mongoose/penalty.ts";
import {createPayrollRecord,getLastPayrollDate,getPayrollHistory} from "../mongoose/payroll_record.ts";
import {createAdvancePayroll,getPendingAdvancePayroll,resolveAdvancePayroll} from "../mongoose/advance_payroll.ts";
import {getEmployeeAttendanceRecordDateWise,getRecentAttendanceRecordDate} from "../mongoose/attendance_record.ts";
import {countDays,dateToIST,dateToMonthYear,formatHoursMinutes,formatMonthYear,getDayName,parseDateDMY} from "../../utils/date_time.ts";
import {calculateOvertimeMinutes,calculateOvertimePay,calculateShiftSalary,calculateTotalWorkingShift,errorEmission,messageEmission} from "../helper.ts";

async function runPayrollHandler(socket:Socket,startDate: string, endDate: string) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        let start: Date;
        let end: Date;
        if (!endDate) {
            messageEmission(socket,"failed","ending date is required.");
            return;
        }
        const tempDate: Date|null = await getLastPayrollDate();
        if (tempDate) {
            start = new Date(tempDate.setDate(tempDate.getDate()+1));
            end = parseDateDMY(endDate);
        } else {
            if (!startDate) {
                messageEmission(socket,"failed","starting date is required.");
                return;
            }
            start = parseDateDMY(startDate);
            end = parseDateDMY(endDate);
        }

        const days = countDays(start,end);
        if(days < 29 || days > 31) {
            messageEmission(socket,"failed","number of payroll days must be between 29 and 31.");
            return;
        }
        let isAdvancePayroll = false;
        let actualEndDate: Date = end;
        const recentAttendanceDate: Date|null = await getRecentAttendanceRecordDate();
        if (!recentAttendanceDate) {
            messageEmission(socket,"failed",`attendance record till ${dateToIST(end)} is not exists.`);
            return;
        }
        if (recentAttendanceDate < end) {
            isAdvancePayroll = true;
            end = recentAttendanceDate;
        }

        if (recentAttendanceDate < start) {
            messageEmission(socket,"failed",`attendance record after ${dateToIST(recentAttendanceDate)} do not exists.`);
            return;
        }

        //advance payroll calculation & verification
        let isPendingAdvancePayroll = false;
        const pendingAdvancePayroll = await getPendingAdvancePayroll();
        if (pendingAdvancePayroll) {
            if (recentAttendanceDate < pendingAdvancePayroll.end_date) {
                messageEmission(socket, "failed", `payroll can't be run before ${dateToIST(pendingAdvancePayroll.end_date)} (to resolve the advance payment).`);
                return;
            }
            isPendingAdvancePayroll = true;
        }

        const employees: IEmployee[] = await getAllEmployeesList();
        for (let emp of employees) {
            let basicSalary = 0;
            let advanceSalary = 0;
            let overTimeWages = 0;
            let presentShift = 0;
            let absentShift = 0;
            let paidLeave = 0;
            let overtimeMinutes = 0;
            const attendance = await getEmployeeAttendanceRecordDateWise(emp._id.toString(),start,end);
            let totalBonus = await getBonusByDate(emp._id.toString(),start,end);
            let workingShift = await calculateTotalWorkingShift(emp._id.toString(), start,end);
            let shiftId: string = emp.shiftId.toString();
            if (attendance.length !== 0) shiftId = attendance[0].shiftId.toString();
            let shiftSalary = await calculateShiftSalary(shiftId,start,end, emp.salary);

            //resolve advance payroll
            if (isPendingAdvancePayroll && pendingAdvancePayroll) {
                let advancePayrollAttendance = await getEmployeeAttendanceRecordDateWise(emp._id.toString(),pendingAdvancePayroll.start_date, pendingAdvancePayroll.end_date);
                for (let att of advancePayrollAttendance) {
                    if (shiftId !== att.shiftId.toString()) {
                        shiftId = att.shiftId.toString();
                        shiftSalary = await calculateShiftSalary(att.shiftId.toString(),start,end, emp.salary);
                    }
                    if (att.first_half === "absent") {
                        await createPenalty(emp._id.toString(),Math.round(shiftSalary*100)/100, `remain absent on first half ${dateToIST(att.attendance_date)}, advance payment deducted.`);
                    }
                    if (att.second_half === "absent") {
                        await createPenalty(emp._id.toString(),Math.round(shiftSalary*100)/100, `remain absent on second half ${dateToIST(att.attendance_date)}, advance payment deducted.`);
                    }
                    overtimeMinutes += await calculateOvertimeMinutes(att,emp._id.toString());
                    overTimeWages += await calculateOvertimePay(att, emp._id.toString(), shiftSalary);
                }
            }

            let totalPenalties = await getPenaltyByDate(emp._id.toString(),start,end);
            for (let att of attendance) {
                if (shiftId !== att.shiftId.toString()) {
                    shiftId = att.shiftId.toString();
                    shiftSalary = await calculateShiftSalary(att.shiftId.toString(),start,end, emp.salary);
                }
                if (att.first_half === "present") {
                    basicSalary += shiftSalary;
                    presentShift++;

                } if(att.first_half === "paid_leave") {
                    basicSalary += shiftSalary;
                    paidLeave++;
                } if (att.second_half === "present") {
                    basicSalary += shiftSalary;
                    presentShift++;
                } if (att.second_half === "paid_leave") {
                    basicSalary += shiftSalary;
                    paidLeave++;
                }
                if (att.first_half === "absent") absentShift++;
                if (att.second_half === "absent") absentShift++;
                overtimeMinutes += await calculateOvertimeMinutes(att,emp._id.toString());
                overTimeWages += await calculateOvertimePay(att, emp._id.toString(), shiftSalary);
            }
            if (isAdvancePayroll) {
                const shift = await getShift(shiftId);
                if(!shift) return;
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
                end = actualEndDate;
            }
            const salaryObject: ISalary = {
                basic_salary: Math.round(basicSalary*100)/100,
                advance_salary: Math.round(advanceSalary*100)/100,
                over_time_wages: Math.round(overTimeWages*100)/100,
                bonus_salary: Math.round(totalBonus*100)/100,
                penalty_amount: Math.round(totalPenalties*100)/100,
                gross_salary: Math.round((basicSalary + advanceSalary + overTimeWages + totalBonus - totalPenalties)*100)/100
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
            if (!department) return;
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
                    basic: (Math.round(basicSalary*100)/100).toString(),
                    advance: (Math.round(advanceSalary*100)/100).toString(),
                    over_time: (Math.round(overTimeWages*100)/100).toString(),
                    bonus: (Math.round(totalBonus*100)/100).toString(),
                    penalty: (Math.round(totalPenalties*100)/100).toString(),
                    gross: (Math.round((basicSalary + advanceSalary + overTimeWages + totalBonus - totalPenalties)*100)/100).toString()
                }
            });
        }
        const startAdvancePayroll = new Date(recentAttendanceDate);
        startAdvancePayroll.setDate(startAdvancePayroll.getDate() + 1);
        if (isAdvancePayroll) await createAdvancePayroll(startAdvancePayroll,actualEndDate);
        if (isPendingAdvancePayroll) await resolveAdvancePayroll();
        await createPayrollRecord(start, end, String(new Date().getFullYear()));
        messageEmission(socket,"success",`salarySlip for ${formatMonthYear(start)} is generated successfully.`);
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function viewPayrollHistory(socket:Socket) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        const payrollHistory = await getPayrollHistory();
        messageEmission(socket, "success",payrollHistory);
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {runPayrollHandler,viewPayrollHistory}