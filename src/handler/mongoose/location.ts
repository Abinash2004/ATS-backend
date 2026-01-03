import Location from "../../model/location.ts";
import type {ILocation} from "../../interface/location.ts";

async function createLocation(location: ILocation): Promise<void> {
    try {
        await Location.create(location);
    } catch(error) {
        console.log(error);
    }
}

async function getLocation(locationId: string): Promise<ILocation | null> {
    try {
        return await Location.findOne({_id: locationId});
    } catch(error) {
        console.error(error);
        return null;
    }
}

async function updateLocation(locationId: string, location: ILocation): Promise<void> {
    try {
        await Location.updateOne({_id: locationId}, {
            $set: {
                street: location.street,
                city: location.city,
                state: location.state
            }
        })
    } catch(error) {
        console.error(error);
    }
}

async function deleteLocation(locationId: string): Promise<void> {
    try {
        await Location.deleteOne({_id: locationId});
    } catch(error) {
        console.error(error);
    }
}

export {createLocation,getLocation,updateLocation,deleteLocation};