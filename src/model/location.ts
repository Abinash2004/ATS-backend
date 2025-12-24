import {Schema,model} from "mongoose";

const locationSchema = new Schema({
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

const Location = model("Location", locationSchema);
export default Location;