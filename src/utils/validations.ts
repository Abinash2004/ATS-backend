import { parse } from "mathjs";
import { Types } from "mongoose";
import { messageEmission } from "../handler/helper/reusable";
import { getEmployeeById } from "../handler/mongoose/employee";
import type { Socket } from "socket.io";
import type { IEmployee } from "../interface/employee";
import type { SymbolNodeLike } from "../interface/symbol_node_like";
import type { ICredentialsValidationResponse } from "../interface/auth";
import type {
	ISalaryTemplate,
	ISalaryTemplateComponent,
} from "../interface/salary_template";

const FIXED = 1;
const PERCENTAGE = 2;
const FORMULA = 3;

export function isString(str: unknown): boolean {
	return typeof str === "string" && str.trim().length > 0;
}
export function isNumber(value: unknown): boolean {
	return typeof value === "string" && !isNaN(Number(value));
}
export function toNumber(value: string): number {
	return Number(value);
}
export function isValidObjectId(value: unknown): boolean {
	return typeof value === "string" && Types.ObjectId.isValid(value);
}
export function isValidMonthYear(value: string): boolean {
	const match = /^(0[1-9]|1[0-2])\/\d{4}$/.exec(value);
	if (!match) return false;
	const [, month, year] = value.match(/^(0[1-9]|1[0-2])\/(\d{4})$/)!;
	const y = Number(year);
	return y >= 1900 && y <= 2100;
}

export function validateAuthCredentials(
	employee: Partial<IEmployee>,
	isSignUp: boolean,
): ICredentialsValidationResponse {
	const { name, email, password, salary, departmentId, locationId, shiftId } =
		employee;

	if (isSignUp && !isString(name)) {
		return { status: false, message: "invalid name." };
	}
	if (!isString(email)) {
		return { status: false, message: "invalid email." };
	}
	if (!isString(password)) {
		return { status: false, message: "invalid password." };
	}
	if (isSignUp && !isNumber(salary)) {
		return { status: false, message: "invalid salary." };
	}
	if (isSignUp && !isValidObjectId(departmentId)) {
		return { status: false, message: "invalid departmentId." };
	}
	if (isSignUp && !isValidObjectId(locationId)) {
		return { status: false, message: "invalid locationId." };
	}
	if (isSignUp && !isValidObjectId(shiftId)) {
		return { status: false, message: "invalid shiftId." };
	}
	return {
		status: true,
		message: isSignUp ? "successfully signed up." : "successfully signed in.",
	};
}

export function buildDependencyGraph(
	components: ISalaryTemplateComponent[],
): Record<string, string[]> {
	const graph: Record<string, string[]> = {};
	for (const c of components) {
		graph[c.code] = [];
	}

	for (const c of components) {
		if (c.component_type !== FORMULA) continue;
		const parsed: {
			filter: (cb: (node: SymbolNodeLike) => boolean) => SymbolNodeLike[];
		} = parse(c.expression) as any;

		const deps = parsed
			.filter(
				(node) => node.type === "SymbolNode" && typeof node.name === "string",
			)
			.map((node) => node.name!)
			.filter((v) => v === "salary" || graph[v] !== undefined);

		graph[c.code] = deps;
	}
	return graph;
}

export function topologicalSort(graph: Record<string, string[]>): string[] {
	const visited = new Set<string>();
	const stack = new Set<string>();
	const order: string[] = [];

	function dfs(node: string) {
		if (stack.has(node)) {
			throw new Error("Circular dependency detected");
		}
		if (visited.has(node)) return;
		stack.add(node);
		for (const dep of graph[node] || []) {
			if (dep !== "salary") dfs(dep);
		}
		stack.delete(node);
		visited.add(node);
		order.push(node);
	}
	for (const node of Object.keys(graph)) {
		dfs(node);
	}
	return order;
}

export function evaluateSalaryTemplate(
	salary: number,
	template: ISalaryTemplate,
): Record<string, number> {
	const values: Record<string, number> = { salary };
	const returnValues: Record<string, number> = {};
	const graph = buildDependencyGraph(template.components);
	const order = topologicalSort(graph);

	const componentMap = new Map<string, ISalaryTemplateComponent>(
		template.components.map((c) => [c.code, c]),
	);

	for (const code of order) {
		const component = componentMap.get(code);
		if (!component) continue;

		const expr = component.expression;

		if (component.component_type === FIXED) {
			values[code] = Number(expr);
			returnValues[component.name] = values[code];
		} else if (component.component_type === PERCENTAGE) {
			values[code] = (Number(expr) / 100) * values.salary;
			returnValues[component.name] = values[code];
		} else if (component.component_type === FORMULA) {
			const parsed = parse(expr);
			values[code] = parsed.evaluate(values);
			returnValues[component.name] = values[code];
		}
	}
	return returnValues;
}

export async function isValidSalaryTemplate(
	socket: Socket,
	salaryTemplate: ISalaryTemplate,
): Promise<boolean> {
	if (!salaryTemplate.name) {
		messageEmission(socket, "failed", "name is missing");
		return false;
	}
	if (salaryTemplate.components.length > 0) {
		for (const component of salaryTemplate.components) {
			if (
				!component.name ||
				!component.code ||
				!component.component_type ||
				!component.expression
			) {
				messageEmission(socket, "failed", "invalid componenet");
				return false;
			}
		}
	}
	if (salaryTemplate.employeeIds.length > 0) {
		for (const empId of salaryTemplate.employeeIds) {
			const employee = await getEmployeeById(empId.toString());
			if (!employee) {
				messageEmission(socket, "failed", "employeeId is invalid");
				return false;
			}
			let summation = 0;
			const result = evaluateSalaryTemplate(employee.salary, salaryTemplate);
			for (const component of salaryTemplate.components) {
				summation += result[component.name];
			}
			if (summation > employee.salary) {
				messageEmission(
					socket,
					"failed",
					"summation of salary component is greater than monthly salary.",
				);
				return false;
			}
		}
	}
	return true;
}
