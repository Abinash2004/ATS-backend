import {parse} from "mathjs";
import {Types} from "mongoose";
import {messageEmission} from "../handler/helper.ts";
import type {Socket} from "socket.io";
import type {IEmployee} from "../interface/employee.ts";
import type {SymbolNodeLike} from "../interface/symbol_node_like.ts";
import type {ISalaryTemplate} from "../interface/salary_template.ts";
import type {ICredentialsValidationResponse} from "../interface/auth.ts";

const ALLOWED_VARS = ["salary", "basic", "hra", "da"] as const;
type AllowedVar = typeof ALLOWED_VARS[number];
type Formulas = Partial<Record<AllowedVar, string>>;

function checkSyntax(key: string, expr: string): any {
    try {
        return parse(expr);
    } catch (e: any) {
        throw new Error(`Syntax error in "${key}": ${e.message}`);
    }
}
function checkAllowedVariables(key: string, parsed: { filter: (cb: (node: SymbolNodeLike) => boolean) => SymbolNodeLike[] }) {
    const vars: string[] = parsed
        .filter((node) => node.type === "SymbolNode" && typeof node.name === "string")
        .map((node) => node.name!);

    const illegalVars = vars.filter((v) => !ALLOWED_VARS.includes(v as AllowedVar));
    if (illegalVars.length > 0) {
        throw new Error(`Illegal variables in "${key}": ${illegalVars.join(", ")}`);
    }

    return vars;
}
function checkSelfReference(key: string, vars: string[]) {
    if (vars.includes(key)) {
        throw new Error(`Self-reference detected in "${key}"`);
    }
}
function buildGraph(formulas: Formulas): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const key in formulas) {
        const exprStr = formulas[key as AllowedVar];
        if (!exprStr) continue;

        const parsed = checkSyntax(key, exprStr);
        const vars = checkAllowedVariables(key, parsed);
        checkSelfReference(key, vars);

        graph[key] = vars;
    }

    return graph;
}
function hasCycle(graph: Record<string, string[]>): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    function dfs(node: string): boolean {
        if (stack.has(node)) return true;
        if (visited.has(node)) return false;

        visited.add(node);
        stack.add(node);

        for (const dep of graph[node] || []) {
            if (graph[dep] && dfs(dep)) return true;
        }

        stack.delete(node);
        return false;
    }

    return Object.keys(graph).some(dfs);
}
function validateFormulas(formulas: Formulas): true {
    const graph = buildGraph(formulas);

    if (hasCycle(graph)) {
        throw new Error("Circular dependency detected");
    }

    return true;
}

function isString(str: unknown): boolean {
    return typeof str === "string" && str.trim().length > 0;
}
function isNumber(value: unknown): boolean {
    return typeof value === "string" && !isNaN(Number(value));
}
function toNumber(value: string): number {
    return Number(value);
}
function isValidObjectId(value: unknown): boolean {
    return typeof value === "string" && Types.ObjectId.isValid(value);
}

function validateAuthCredentials(employee: Partial<IEmployee>,isSignUp: boolean): ICredentialsValidationResponse {
    const { name, email, password, salary, departmentId, locationId, shiftId } = employee;
    if (isSignUp && !isString(name)) return { status: false, message: "invalid name." };
    if (!isString(email)) return { status: false, message: "invalid email." };
    if (!isString(password)) return { status: false, message: "invalid password." };
    if (isSignUp && !isNumber(salary)) return { status: false, message: "invalid salary." };
    if (isSignUp && !isValidObjectId(departmentId)) return { status: false, message: "invalid departmentId." };
    if (isSignUp && !isValidObjectId(locationId)) return { status: false, message: "invalid locationId." };
    if (isSignUp && !isValidObjectId(shiftId)) return { status: false, message: "invalid shiftId." };

    return { status: true, message: isSignUp ? "successfully signed up." : "successfully signed in." };
}
function isValidMonthYear(value: string): boolean {
    const match = /^(0[1-9]|1[0-2])\/\d{4}$/.exec(value);
    if (!match) return false;
    const [, month, year] = value.match(/^(0[1-9]|1[0-2])\/(\d{4})$/)!;
    const y = Number(year);
    return y >= 1900 && y <= 2100;
}
function isValidSalaryTemplate(socket: Socket, salaryTemplate: ISalaryTemplate): boolean {
    const { basic, hra, da, basic_type, hra_type, da_type } = salaryTemplate;

    if (!basic || !hra || !da || !basic_type || !hra_type || !da_type) {
        messageEmission(socket, "failed", "invalid salaryTemplate, some values are missing.");
        return false;
    }
    if (basic_type === "fixed" && !isNumber(basic)) {
        messageEmission(socket, "failed", "If basic type is fixed, value must be a number");
        return false;
    }
    if (hra_type === "fixed" && !isNumber(hra)) {
        messageEmission(socket, "failed", "If HRA type is fixed, value must be a number");
        return false;
    }
    if (da_type === "fixed" && !isNumber(da)) {
        messageEmission(socket, "failed", "If DA type is fixed, value must be a number");
        return false;
    }
    if (basic_type === "percentage" && (!isNumber(basic) || toNumber(basic) < 0 || toNumber(basic) > 100)) {
        messageEmission(socket, "failed", "Basic percentage must be between 0 and 100");
        return false;
    }
    if (hra_type === "percentage" && (!isNumber(hra) || toNumber(hra) < 0 || toNumber(hra) > 100)) {
        messageEmission(socket, "failed", "HRA percentage must be between 0 and 100");
        return false;
    }
    if (da_type === "percentage" && (!isNumber(da) || toNumber(da) < 0 || toNumber(da) > 100)) {
        messageEmission(socket, "failed", "DA percentage must be between 0 and 100");
        return false;
    }

    const formulas: Formulas = {};
    if (basic_type === "formula") formulas["basic"] = basic.toLowerCase();
    if (hra_type === "formula") formulas["hra"] = hra.toLowerCase();
    if (da_type === "formula") formulas["da"] = da.toLowerCase();

    try {
        validateFormulas(formulas);
        return true;
    } catch (e: any) {
        messageEmission(socket, "failed", e.message);
        return false;
    }
}

export {
    toNumber,
    isNumber,
    isString,
    isValidObjectId,
    validateAuthCredentials,
    isValidMonthYear,
    isValidSalaryTemplate,
};
