import type {Socket} from "socket.io";
import type {IShift} from "../../interface/shift.ts";
import type {IEmployee} from "../../interface/employee.ts";
import type {IDepartment} from "../../interface/department.ts";
import type {ILocation} from "../../interface/location.ts";
import type {IAttendance} from "../../interface/attendance.ts";
import type {IAttendanceSheet} from "../../interface/attendance_sheet.ts";
import type {ISalary, ISalaryAttendance} from "../../interface/salary_slip.ts";
import {generatePDF} from "../../utils/pdf_generation.ts";
import {generateSheet} from "../../utils/sheet_generation.ts";
import {getBonusByDate} from "../mongoose/bonus.ts";
import {isValidMonthYear} from "../../utils/validations.ts";
import {getPenaltyByDate} from "../mongoose/penalty.ts";
import {createPayrollRecord, getLastPayrollDate} from "../mongoose/payroll_record.ts";
import {createShift,deleteShift,getShift,updateShift} from "../mongoose/shift.ts";
import {createSalarySlip,getMonthlySalarySlip} from "../mongoose/salary_slip.ts";
import {createLocation,deleteLocation,getLocation,updateLocation} from "../mongoose/location.ts";
import {createDepartment,deleteDepartment,getDepartment,updateDepartment} from "../mongoose/department.ts";
import {
    calculateOvertimeMinutes, calculateOvertimePay, calculateShiftSalary, calculateTotalWorkingShift,
    checkMonthValidationAndCurrentDate, countDays, dateToIST,dateToMonthYear, errorEmission, formatHoursMinutes,
    formatMonthYear,getDayName, getFirstDayUtc, getLastDayUtc, messageEmission, parseDateDMY, toMonthName
} from "../helper.ts";
import {addNewEmployee,deleteEmployee,getAllEmployeesList,getEmployeeById,isEmployeeExists,updateEmployee} from "../mongoose/employee.ts";
import {attendanceFirstHalfHandler,attendanceFullDayHandler,attendanceHolidayHandler,attendanceSecondHalfHandler} from "../attendance.ts";
import {
    getAllAttendanceRecord, getEmployeeAttendanceRecordDateWise,
    getEmployeeAttendanceRecordMonthWise, getRecentAttendanceRecordDate
} from "../mongoose/attendance_record.ts";
import Attendance from "../../model/attendance.ts";

async function createEmployeeHandler(socket:Socket, employee:IEmployee) {
    try {
        if (!employee) {
            messageEmission(socket,"failed","employee data are needed");
            return
        }
        const isEmployee = await isEmployeeExists(employee.email);
        if (isEmployee) {
            messageEmission(socket,"failed","employee already exists");
            return;
        }
        await addNewEmployee(employee);
        messageEmission(socket,"success","employee created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readEmployeeHandler(socket:Socket, employeeId: string) {
    try {
        if (!employeeId) {
            messageEmission(socket,"failed","employee ID is missing.");
            return;
        }
        const employee: IEmployee|null = await getEmployeeById(employeeId);
        if (!employee) {
            messageEmission(socket,"failed","employee not found.");
            return;
        }
        messageEmission(socket,"success",{employee});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateEmployeeHandler(socket:Socket, employeeId: string, employee:IEmployee) {
    try {
        if (!employeeId) {
            messageEmission(socket,"failed","employee ID is missing.");
            return;
        }
        if (!employee) {
            messageEmission(socket,"failed","employee data are needed");
            return
        }
        await updateEmployee(employeeId,employee);
        messageEmission(socket,"success","employee data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteEmployeeHandler(socket:Socket, employeeId: string) {
    try {
        if (!employeeId) {
            messageEmission(socket,"failed","employee ID is missing.");
            return;
        }
        await deleteEmployee(employeeId);
        messageEmission(socket,"success","employee deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createShiftHandler(socket:Socket, shift:IShift) {
    try {
        if (!shift) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        await createShift(shift);
        messageEmission(socket,"success","shift created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readShiftHandler(socket:Socket, shiftId: string) {
    try {
        if (!shiftId) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        const shift:IShift|null = await getShift(shiftId);
        if (!shift) {
            messageEmission(socket,"failed","shift not found.");
            return;
        }
        messageEmission(socket,"success",{shift});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateShiftHandler(socket:Socket, shiftId: string, shift:IShift) {
    try {
        if (!shiftId) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        if (!shift) {
            messageEmission(socket,"failed","shift data are needed");
            return
        }
        await updateShift(shiftId,shift);
        messageEmission(socket,"success","shift data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteShiftHandler(socket:Socket, shiftId: string) {
    try {
        if (!shiftId) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        await deleteShift(shiftId);
        messageEmission(socket,"success","shift deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createDepartmentHandler(socket:Socket, department:IDepartment) {
    try {
        if (!department) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        await createDepartment(department);
        messageEmission(socket,"success","department created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readDepartmentHandler(socket:Socket, departmentId: string) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        const department:IDepartment|null = await getDepartment(departmentId);
        if (!department) {
            messageEmission(socket,"failed","department not found.");
            return;
        }
        messageEmission(socket,"success",{department});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateDepartmentHandler(socket:Socket, departmentId: string, department:IDepartment) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        if (!department) {
            messageEmission(socket,"failed","department data are needed");
            return
        }
        await updateDepartment(departmentId,department);
        messageEmission(socket,"success","department data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteDepartmentHandler(socket:Socket, departmentId: string) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        await deleteDepartment(departmentId);
        messageEmission(socket,"success","department deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createLocationHandler(socket:Socket, location:ILocation) {
    try {
        if (!location) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        await createLocation(location);
        messageEmission(socket,"success","location created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readLocationHandler(socket:Socket, locationId: string) {
    try {
        if (!locationId) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        const location:ILocation|null = await getLocation(locationId);
        if (!location) {
            messageEmission(socket,"failed","location not found.");
            return;
        }
        messageEmission(socket,"success",{location});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateLocationHandler(socket:Socket, locationId: string, location:ILocation) {
    try {
        if (!locationId) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        if (!location) {
            messageEmission(socket,"failed","location data are needed");
            return
        }
        await updateLocation(locationId,location);
        messageEmission(socket,"success","location data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteLocationHandler(socket:Socket, locationId: string) {
    try {
        if (!locationId) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        await deleteLocation(locationId);
        messageEmission(socket,"success","location deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createAttendanceRecordHandler(socket: Socket) {
    try {
        let startDate:Date | null = await getRecentAttendanceRecordDate();
        if (!startDate) {
            const attendance: IAttendance | null = await Attendance.findOne().sort({clock_in: 1}).exec();
            if (!attendance) {
                messageEmission(socket, "failed","there is no attendance record");
                return;
            }
            startDate = attendance.clock_in;
        }
        let endDate: Date = new Date(Date.now());
        endDate.setDate(endDate.getDate()-1);
        const employees: IEmployee[] = await getAllEmployeesList();

        for (let iterDate = new Date(startDate);iterDate <= endDate;iterDate.setDate(iterDate.getDate() + 1)) {
            const day = getDayName(iterDate);
            for (let emp of employees) {
                const shift = await getShift(emp.shiftId.toString());
                if (!shift) continue;
                const day_status = shift[day].day_status;
                if (day_status === "holiday") {
                    await attendanceHolidayHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                } else if (day_status === "first_half") {
                    await attendanceFirstHalfHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                } else if (day_status === "second_half") {
                    await attendanceSecondHalfHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                } else if (day_status === "full_day") {
                    await attendanceFullDayHandler(socket, iterDate, emp._id.toString(),emp.shiftId.toString());
                }
            }
        }
        messageEmission(socket,"success","attendance record generated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function viewAllAttendanceRecordHandler(socket:Socket) {
    try {
        const attendanceRecord = await getAllAttendanceRecord();
        messageEmission(socket,"success",attendanceRecord);
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createSalaryHandler(socket:Socket,startDate: string, endDate: string) {
    try {
        let start: Date;
        let end: Date;
        if (!endDate) {
            messageEmission(socket,"failed","ending date is required.");
            return false;
        }
        const tempDate: Date|null = await getLastPayrollDate();
        if (tempDate) {
            start = new Date(tempDate.setDate(tempDate.getDate()+1));
            end = parseDateDMY(endDate);
        } else {
            if (!startDate) {
                messageEmission(socket,"failed","starting date is required.");
                return false;
            }
            start = parseDateDMY(startDate);
            end = parseDateDMY(endDate);
        }

        const days = countDays(start,end);
        if(days < 29 || days > 31) {
            messageEmission(socket,"failed","number of payroll days must be between 29 to 31.");
            return false;
        }

        const recentAttendanceDate: Date|null = await getRecentAttendanceRecordDate();
        if (!recentAttendanceDate) {
            messageEmission(socket,"failed",`attendance record till ${dateToIST(end)} is not exists.`);
            return false;
        }
        if (recentAttendanceDate < end) {
            messageEmission(socket,"failed",`attendance record till ${dateToIST(end)} is not exists.`);
            return false;
        }

        const employees: IEmployee[] = await getAllEmployeesList();
        for (let emp of employees) {
            const attendance = await getEmployeeAttendanceRecordDateWise(emp._id.toString(),start,end);
            if (!attendance.length) continue;

            let basicSalary = 0;
            let overTimeWages = 0;
            let presentShift = 0;
            let absentShift = 0;
            let paidLeave = 0;
            let overtimeMinutes = 0;
            let totalBonus = await getBonusByDate(emp._id.toString(),start,end);
            let totalPenalties = await getPenaltyByDate(emp._id.toString(),start,end);
            let workingShift = await calculateTotalWorkingShift(emp._id.toString(), start,end);

            let shiftId: string = attendance[0].shiftId.toString();
            let shiftSalary = await calculateShiftSalary(attendance[0].shiftId.toString(),start,end, emp.salary);
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
            const salaryObject: ISalary = {
                basic_salary: basicSalary,
                over_time_wages: overTimeWages,
                bonus_salary: totalBonus,
                penalty_amount: totalPenalties,
                gross_salary: basicSalary + overTimeWages + totalBonus - totalPenalties
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
                    address: "Diamond World 3rd floor C-301, Mini Bazar, Varachha Road, Surat, Gujarat, India, 395006",
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
                    basic: basicSalary.toString(),
                    over_time: overTimeWages.toString(),
                    bonus: totalBonus.toString(),
                    penalty: totalPenalties.toString(),
                    gross: (basicSalary + overTimeWages + totalBonus - totalPenalties).toString()
                }
            });
        }
        await createPayrollRecord(start, end, String(new Date().getFullYear()));
        messageEmission(socket,"success",`salarySlip for ${formatMonthYear(start)} is generated successfully.`);
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function viewSalaryHandler(socket:Socket, month: string) {
    try {
        if (!month) {
            messageEmission(socket,"failed","month is missing.");
            return;
        }
        if (!isValidMonthYear(month)) {
            messageEmission(socket,"failed","invalid month format [mm/yyyy].");
            return;
        }
        const salarySlip = await getMonthlySalarySlip(month);
        messageEmission(socket,"success",salarySlip);
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function generateAttendanceSheetHandler(socket:Socket, month: string) {
    try {
        if (!checkMonthValidationAndCurrentDate(month, socket)) return;
        const employees: IEmployee[] = await getAllEmployeesList();
        for (let emp of employees) {
            const attendance = await getEmployeeAttendanceRecordMonthWise(emp._id.toString(), month);
            if (!attendance.length) continue;
            let shiftId: string = attendance[0].shiftId.toString();
            const startDate: Date = getFirstDayUtc(month);
            const lastDate: Date = getLastDayUtc(month);
            let shiftSalary = await calculateShiftSalary(attendance[0].shiftId.toString(), startDate,lastDate, emp.salary);
            let attendanceSheetData: IAttendanceSheet[] = [];
            let sheetData: IAttendanceSheet;
            for (let att of attendance) {
                let first_half_pay: number = 0;
                let second_half_pay: number = 0;

                if (shiftId !== att.shiftId.toString()) {
                    shiftId = att.shiftId.toString();
                    shiftSalary = await calculateShiftSalary(att.shiftId.toString(), startDate,lastDate, emp.salary);
                }
                if (att.first_half === "present" || att.first_half === "paid_leave") {
                    first_half_pay += shiftSalary;
                }
                if (att.second_half === "present" || att.second_half === "paid_leave") {
                    second_half_pay += shiftSalary;
                }
                const overtimeMinutes = await calculateOvertimeMinutes(att, emp._id.toString());
                const overTimeWages = await calculateOvertimePay(att, emp._id.toString(), shiftSalary);
                sheetData = {
                    "Date": dateToIST(att.attendance_date).split(",")[0],
                    "First Half": att.first_half,
                    "Second Half": att.second_half,
                    "First Half Pay": first_half_pay.toString(),
                    "Second Half Pay": second_half_pay.toString(),
                    "Over Time": formatHoursMinutes(overtimeMinutes),
                    "Over Time Pay": overTimeWages.toString(),
                    "Total Pay": (first_half_pay+second_half_pay+overTimeWages).toString()
                }
                attendanceSheetData.push(sheetData);
            }
            generateSheet(attendanceSheetData, toMonthName(month),emp.email);
            messageEmission(socket,"success",`Attendance Excel Sheet for ${toMonthName(month)} is generated successfully.`);
        }
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {
    createEmployeeHandler,
    readEmployeeHandler,
    updateEmployeeHandler,
    deleteEmployeeHandler,
    createShiftHandler,
    readShiftHandler,
    updateShiftHandler,
    deleteShiftHandler,
    createDepartmentHandler,
    readDepartmentHandler,
    updateDepartmentHandler,
    deleteDepartmentHandler,
    createLocationHandler,
    readLocationHandler,
    updateLocationHandler,
    deleteLocationHandler,
    createAttendanceRecordHandler,
    viewAllAttendanceRecordHandler,
    createSalaryHandler,
    viewSalaryHandler,
    generateAttendanceSheetHandler
}