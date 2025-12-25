import {Schema,model} from "mongoose";
import {ILocation} from "../interface/location.ts";

const locationSchema = new Schema<ILocation>({
    street: {
        type: String
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    }
});

const Location = model<ILocation>("Location", locationSchema);
export default Location;