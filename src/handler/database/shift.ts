import type { Socket } from "socket.io";
import type { IShift } from "../../interface/shift";
import { errorEmission, messageEmission } from "../helper/reusable";
import {
	createShift,
	deleteShift,
	getShift,
	updateShift,
} from "../mongoose/shift";

export async function createShiftHandler(
	socket: Socket,
	shift: IShift,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!shift) {
			messageEmission(socket, "failed", "shift ID is missing.");
			return;
		}
		await createShift(shift);
		messageEmission(socket, "success", "shift created successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}
export async function readShiftHandler(
	socket: Socket,
	shiftId: string,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!shiftId) {
			messageEmission(socket, "failed", "shift ID is missing.");
			return;
		}
		const shift: IShift | null = await getShift(shiftId);
		if (!shift) {
			messageEmission(socket, "failed", "shift not found.");
			return;
		}
		messageEmission(socket, "success", { shift });
	} catch (error) {
		errorEmission(socket, error);
	}
}
export async function updateShiftHandler(
	socket: Socket,
	shiftId: string,
	shift: IShift,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!shiftId) {
			messageEmission(socket, "failed", "shift ID is missing.");
			return;
		}
		if (!shift) {
			messageEmission(socket, "failed", "shift data are needed");
			return;
		}
		await updateShift(shiftId, shift);
		messageEmission(socket, "success", "shift data updated successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}
export async function deleteShiftHandler(
	socket: Socket,
	shiftId: string,
): Promise<void> {
	try {
		if (socket.data.role !== "admin") {
			messageEmission(socket, "failed", "only admin are permitted.");
			return;
		}
		if (!shiftId) {
			messageEmission(socket, "failed", "shift ID is missing.");
			return;
		}
		await deleteShift(shiftId);
		messageEmission(socket, "success", "shift deleted successfully.");
	} catch (error) {
		errorEmission(socket, error);
	}
}
