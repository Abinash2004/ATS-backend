import type {Socket} from "socket.io";
import type {ILocation} from "../../interface/location.ts";
import {errorEmission, messageEmission} from "../helper.ts";
import {createLocation, deleteLocation, getLocation, updateLocation} from "../mongoose/location.ts";

async function createLocationHandler(socket:Socket, location:ILocation) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        if (!location) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        await createLocation(location);
        messageEmission(socket,"success","location created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readLocationHandler(socket:Socket, locationId: string) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        if (!locationId) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        const location:ILocation|null = await getLocation(locationId);
        if (!location) {
            messageEmission(socket,"failed","location not found.");
            return;
        }
        messageEmission(socket,"success",{location});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateLocationHandler(socket:Socket, locationId: string, location:ILocation) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        if (!locationId) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        if (!location) {
            messageEmission(socket,"failed","location data are needed");
            return
        }
        await updateLocation(locationId,location);
        messageEmission(socket,"success","location data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteLocationHandler(socket:Socket, locationId: string) {
    try {
        if (socket.data.role !== "admin") {
            messageEmission(socket,"failed","only admin are permitted.")
            return;
        }
        if (!locationId) {
            messageEmission(socket,"failed","location ID is missing.");
            return;
        }
        await deleteLocation(locationId);
        messageEmission(socket,"success","location deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {createLocationHandler,readLocationHandler,updateLocationHandler,deleteLocationHandler};