import {parse} from "mathjs";
import type {Socket} from "socket.io";
import type {ISingleShift} from "../interface/shift.ts";
import type {SymbolNodeLike} from "../interface/symbol_node_like.ts";
import type {ISalaryTemplate} from "../interface/salary_template.ts";
import type {IAttendanceRecord} from "../interface/attendance_record.ts";
import type {IAttendance,IBreak} from "../interface/attendance.ts";
import {getShift} from "./mongoose/shift.ts";
import {getEmployeeById} from "./mongoose/employee.ts";
import {isValidMonthYear} from "../utils/validations.ts";
import {readSalaryTemplate} from "./mongoose/salary_template.ts";
import {getAttendanceByDate} from "./mongoose/attendance.ts";
import {getBreakPerHourPenalty} from "./mongoose/policy.ts";
import {getEmployeeAttendanceRecordDateWise} from "./mongoose/attendance_record.ts";
import {calculateMinutes,getDayName,getLastDayUtc,stringToDate} from "../utils/date_time.ts";

type AllowedVar = "salary" | "basic" | "hra" | "da";
type Formulas = Partial<Record<AllowedVar, string>>;

function errorEmission(socket: Socket, error: unknown) :void {
    socket.emit("server_response",{
        status: "failed",
        message: error instanceof Error ? error.message : error
    });
}
function messageEmission(socket: Socket, status: string, message: any) :void {
    socket.emit("server_response",{status,message});
}
async function getShiftData(attendance: IAttendance,currentTime: Date) {
    let shiftStartTime = stringToDate(attendance.shift.start_time);
    let shiftEndTime = stringToDate(attendance.shift.end_time);

    if (attendance.shift.day_status === "first_half") {
        const timeRange = calculateMinutes(shiftStartTime,shiftEndTime);
        shiftEndTime.setMinutes(shiftEndTime.getMinutes() - timeRange/2);
    } else if (attendance.shift.day_status === "second_half") {
        const timeRange = calculateMinutes(shiftStartTime,shiftEndTime);
        shiftStartTime.setMinutes(shiftStartTime.getMinutes() + timeRange/2);
    }

    // Night shift handling
    if (shiftStartTime > shiftEndTime) shiftEndTime.setDate(shiftEndTime.getDate() + 1);

    let breakMinutes = 0;
    const shiftMinutes = calculateMinutes(shiftStartTime, shiftEndTime);
    const totalSpentMinutes = calculateMinutes(attendance.clock_in, currentTime);
    attendance.breaks.forEach((single: IBreak) => {
        breakMinutes += calculateMinutes(single.break_in,single.break_out || currentTime);
    });

    const workedMinutes = totalSpentMinutes - breakMinutes;
    const pendingTimeMinutes = (shiftMinutes - workedMinutes > 0) ? shiftMinutes - workedMinutes : 0;
    const overTimeMinutes = (workedMinutes - shiftMinutes > 0) ? workedMinutes - shiftMinutes : 0;
    return {shiftStartTime,shiftEndTime,shiftMinutes,breakMinutes,workedMinutes,pendingTimeMinutes,overTimeMinutes};
}
async function getShiftTimings(shift: ISingleShift): Promise<Date[]> {
    try {
        let shiftInitialTime: Date = stringToDate(shift.start_time);
        let shiftExitTime: Date = stringToDate(shift.end_time);

        if (shift.day_status === "first_half") {
            const timeRange = calculateMinutes(shiftInitialTime,shiftExitTime);
            shiftExitTime.setMinutes(shiftExitTime.getMinutes() - timeRange/2);
        } else if (shift.day_status === "second_half") {
            const timeRange = calculateMinutes(shiftInitialTime,shiftExitTime);
            shiftInitialTime.setMinutes(shiftInitialTime.getMinutes() + timeRange/2);
        }
        return [shiftInitialTime, shiftExitTime];
    } catch(error) {
        console.log(error);
        return [];
    }
}
async function calculateShiftSalary(shiftId: string, start: Date, end: Date, amount: number): Promise<number> {
    try {
        const shiftCount = await calculateWorkingShift(shiftId,start,end);
        return amount/shiftCount;
    } catch(error) {
        console.log(error);
        return 0;
    }
}
async function calculateWorkingShift(shiftId: string,start: Date, end: Date): Promise<number> {
    try {
        const shift = await getShift(shiftId);
        if(!shift) return 0;
        let shiftCount = 0;
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
        for(let iterDate = new Date(start); iterDate <= new Date(end); iterDate.setDate(iterDate.getDate()+1)) {
            const day = getDayName(iterDate);
            if (shift[day].day_status === "full_day") shiftCount += 2;
            else if (shift[day].day_status === "first_half" || shift[day].day_status === "second_half") shiftCount++;
        }
        return shiftCount;
    } catch(error) {
        console.log(error);
        return 0;
    }
}
async function calculateTotalWorkingShift(employeeId: string, start: Date, end: Date): Promise<number> {
    try {
        let shiftCount = 0;
        const attendanceRecord = await getEmployeeAttendanceRecordDateWise(employeeId,start,end);
        if (!attendanceRecord[0]) return 0;
        let shiftId: string = attendanceRecord[0].shiftId.toString();
        let shift = await getShift(shiftId.toString());
        if(!shift) return 0;
        for (let attendance of attendanceRecord) {
            if (shiftId !== attendance.shiftId.toString()) {
                shiftId = attendance.shiftId.toString();
                shift = await getShift(attendance.shiftId.toString());
                if(!shift) return 0;
            }
            const day = getDayName(attendance.attendance_date);
            if (shift[day].day_status === "full_day") shiftCount += 2;
            else if (shift[day].day_status === "first_half" || shift[day].day_status === "second_half") shiftCount++;
        }
        return shiftCount;
    } catch(error) {
        console.log(error);
        return 0;
    }
}
async function calculateOvertimePay(attendance: IAttendanceRecord, employeeId: string, shiftSalary: number): Promise<number> {
    try {
        const fullAttendance = await getAttendanceByDate(attendance.attendance_date, employeeId);
        if (!fullAttendance) return 0;
        if (!fullAttendance.clock_out) return 0;
        let {shiftMinutes,overTimeMinutes} = await getShiftData(fullAttendance, fullAttendance.clock_out);
        return (shiftSalary * overTimeMinutes)/(shiftMinutes/2);
    } catch(error) {
        console.log(error);
        return 0;
    }
}
async function calculateOvertimeMinutes(attendance: IAttendanceRecord, employeeId: string): Promise<number> {
    try {
        const fullAttendance = await getAttendanceByDate(attendance.attendance_date, employeeId);
        if (!fullAttendance) return 0;
        if (!fullAttendance.clock_out) return 0;
        let {overTimeMinutes} = await getShiftData(fullAttendance, fullAttendance.clock_out);
        return overTimeMinutes;
    } catch(error) {
        console.log(error);
        return 0;
    }
}
function checkMonthValidationAndCurrentDate(month: string, socket:Socket): boolean {
    if (!month) {
        messageEmission(socket,"failed","month is missing.");
        return false;
    }
    if (!isValidMonthYear(month)) {
        messageEmission(socket,"failed","invalid month format [mm/yyyy].");
        return false;
    }
    const lastDate: Date = getLastDayUtc(month);
    const currentDate: Date = new Date(Date.now());
    if (lastDate >= currentDate) {
        messageEmission(socket,"failed","month has not ended.");
        return false;
    }
    return true;
}
async function checkBreakPenalty(breaks: IBreak[], currentTime: Date): Promise<number> {
    let breakMinutes: number = 0;
    let penalty: number = 0;
    for (let b of breaks) {
        if (!b.break_out) {
            breakMinutes = calculateMinutes(b.break_in, currentTime);
        }
    }
    const penaltyPerHour = await getBreakPerHourPenalty();
    while (breakMinutes > 0) {
        breakMinutes -= 60;
        penalty += penaltyPerHour;
    }
    return penalty;
}
async function getSalaryTemplateData(employeeId: string, salary: number) {
    try {
        const salaryTemplate = await readSalaryTemplate(employeeId);
        if (!salaryTemplate) return {monthlyBasic:salary,monthlyHRA:0,monthlyDA:0};
        const {basic, hra, da} = evaluateSalaryTemplate(salary, salaryTemplate);
        return {monthlyBasic:basic, monthlyHRA:hra, monthlyDA:da};
    } catch(error) {
        let monthlyBasic = salary;
        let monthlyHRA = 0;
        let monthlyDA = 0;
        console.log(error);
        return {monthlyBasic, monthlyHRA, monthlyDA};
    }
}
async function validateSalaryTemplatePerEmployee(socket: Socket,salaryTemplate : ISalaryTemplate): Promise<boolean> {
    try {
        for (let empId of salaryTemplate.employeeIds) {
            const emp = await getEmployeeById(empId.toString());
            if (!emp) {
                messageEmission(socket, "failed", "employeeId is invalid");
                return false;
            }
            const salary = emp.salary;
            const {basic, hra, da} = evaluateSalaryTemplate(salary, salaryTemplate);
            console.log(`basic: ${basic}`);
            console.log(`da: ${da}`);
            console.log(`hra: ${hra}`);
            if ((basic + hra + da) > salary) {
                messageEmission(socket, "failed",`total amount is exceeding from employee ID ${empId} monthly salary`);
                return false;
            }
        }
        return true;
    } catch(error) {
        errorEmission(socket,error);
        return false;
    }
}

function buildDependencyGraph(formulas: Formulas): Record<AllowedVar, AllowedVar[]> {
    const graph: Record<AllowedVar, AllowedVar[]> = { salary: [], basic: [], hra: [], da: [] };

    for (const key of ["basic", "hra", "da"] as AllowedVar[]) {
        const expr = formulas[key];
        if (!expr) continue;

        const parsed: { filter: (cb: (node: SymbolNodeLike) => boolean) => SymbolNodeLike[] } = parse(expr) as any;

        const deps: AllowedVar[] = parsed
            .filter((node) => node.type === "SymbolNode" && typeof node.name === "string")
            .map((node) => node.name!)
            .filter((v: string): v is AllowedVar => ["salary", "basic", "hra", "da"].includes(v));

        graph[key] = deps;
    }

    return graph;
}
function topologicalSort(graph: Record<AllowedVar, AllowedVar[]>): AllowedVar[] {
    const visited = new Set<AllowedVar>();
    const stack = new Set<AllowedVar>();
    const order: AllowedVar[] = [];

    function dfs(node: AllowedVar) {
        if (stack.has(node)) throw new Error("Circular dependency detected");
        if (visited.has(node)) return;

        stack.add(node);
        for (const dep of graph[node]) dfs(dep);
        stack.delete(node);
        visited.add(node);
        order.push(node);
    }

    for (const node of Object.keys(graph) as AllowedVar[]) {
        if (node === "salary") continue; // salary is root
        dfs(node);
    }

    return ["salary", ...order];
}
function evaluateSalaryTemplate(salary: number,template: ISalaryTemplate): Record<AllowedVar, number> {
    const values: Record<AllowedVar, number> = { salary, basic: 0, hra: 0, da: 0 };
    const formulas: Formulas = {};

    if (template.basic_type === "formula") formulas.basic = template.basic.toLowerCase();
    if (template.hra_type === "formula") formulas.hra = template.hra.toLowerCase();
    if (template.da_type === "formula") formulas.da = template.da.toLowerCase();

    const graph = buildDependencyGraph(formulas);
    const order = topologicalSort(graph);

    for (const field of order) {
        if (field === "salary") continue;

        const typeKey = `${field}_type` as keyof ISalaryTemplate;
        const valKey = field as keyof ISalaryTemplate;
        const type = template[typeKey];
        const expr = template[valKey];

        if (type === "fixed") values[field] = Number(expr);
        else if (type === "percentage") values[field] = (Number(expr) / 100) * values.salary;
        else if (type === "formula") {
            if (typeof expr !== "string") throw new Error(`Invalid formula for ${field}`);
            const parsed = parse(expr);
            values[field] = parsed.evaluate(values);
        }
    }
    return values;
}

export {
    errorEmission,
    messageEmission,
    getShiftData,
    getShiftTimings,
    calculateShiftSalary,
    calculateOvertimePay,
    calculateWorkingShift,
    calculateOvertimeMinutes,
    calculateTotalWorkingShift,
    checkMonthValidationAndCurrentDate,
    checkBreakPenalty,
    getSalaryTemplateData,
    validateSalaryTemplatePerEmployee,
    evaluateSalaryTemplate
};