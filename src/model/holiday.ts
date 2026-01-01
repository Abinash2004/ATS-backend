import {model, Schema} from "mongoose";
import type {IHoliday} from "../interface/holiday.ts";

const holidaySchema = new Schema({
    date: {
        type: Date,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    }
});


const Holiday  = model<IHoliday>("Holiday", holidaySchema);
export {Holiday};