import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import type { jwtPayload } from "../interface/auth";

const jwtSecretKey: string = process.env.JWT_SECRET || "kiss my ass";
const timeToLive: string = process.env.JWT_TTL ?? "60s";

export function signToken(payload: jwtPayload): string {
	return jwt.sign(payload, jwtSecretKey, {
		expiresIn: timeToLive as SignOptions["expiresIn"],
	});
}

export function verifyToken(token: string): string {
	const payload = jwt.verify(token, jwtSecretKey) as jwtPayload;
	return payload.email;
}
