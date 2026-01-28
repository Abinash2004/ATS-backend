import type { Socket } from "socket.io";
import type { IPolicy } from "../../interface/policy";
import { errorEmission, messageEmission } from "../helper/reusable";
import {
	createPolicy,
	getLateInPenalty,
	readPolicy,
	updatePolicy,
} from "../mongoose/policy";

export async function createPolicyHandler(
	socket: Socket,
	policy: IPolicy,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin can access policy.");
			return;
		}
		const checkPolicy = await getLateInPenalty();
		if (checkPolicy) {
			messageEmission(
				socket,
				"failed",
				"policy already exists, try to update it.",
			);
			return;
		}
		if (!policy) {
			messageEmission(socket, "failed", "policy argument is required.");
			return;
		}
		await createPolicy(policy);
		messageEmission(socket, "success", "policy created successfully");
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function updatePolicyHandler(
	socket: Socket,
	policy: IPolicy,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin can access policy.");
			return;
		}
		const checkPolicy = await getLateInPenalty();
		if (!checkPolicy) {
			messageEmission(
				socket,
				"failed",
				"policy don't exists, try to create one.",
			);
			return;
		}
		if (!policy) {
			messageEmission(socket, "failed", "policy argument is required.");
			return;
		}
		await updatePolicy(policy);
		messageEmission(socket, "success", "policy updated successfully");
	} catch (error) {
		errorEmission(socket, error);
	}
}

export async function readPolicyHandler(socket: Socket): Promise<void> {
	try {
		if (socket.data.role !== "admin" && socket.data.role !== "HR") {
			messageEmission(socket, "failed", "only admin & HR are permitted.");
			return;
		}
		const policy = await readPolicy();
		if (!policy) {
			messageEmission(socket, "failed", "policy not exists.");
			return;
		}
		messageEmission(socket, "success", policy);
	} catch (error) {
		errorEmission(socket, error);
	}
}
