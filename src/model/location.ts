import { Schema, model } from "mongoose";
import type { ILocation } from "../interface/location";

const locationSchema = new Schema<ILocation>({
	street: {
		type: String,
	},
	city: {
		type: String,
		required: true,
	},
	state: {
		type: String,
		required: true,
	},
});

const Location = model<ILocation>("Location", locationSchema);
export default Location;
