import type {Socket} from "socket.io";
import type {IShift} from "../../interface/shift.ts";
import type {IEmployee} from "../../interface/employee.ts";
import type {IDepartment} from "../../interface/department.ts";
import type {ILocation} from "../../interface/location.ts";
import {errorEmission, getDayName, messageEmission} from "../helper.ts";
import {createShift, deleteShift, getShift, updateShift} from "../mongoose/shift.ts";
import {createDepartment, deleteDepartment, getDepartment, updateDepartment} from "../mongoose/department.ts";
import {createLocation, deleteLocation, getLocation, updateLocation} from "../mongoose/location.ts";
import {
    addNewEmployee,
    deleteEmployee,
    getAllEmployeesList,
    getEmployeeById,
    isEmployeeExists,
    updateEmployee
} from "../mongoose/employee.ts";
import {getAttendanceRecord} from "../mongoose/attendance.ts";
import {getRecentAttendanceRecordDate} from "../mongoose/attendance_record.ts";
import {start} from "node:repl";

async function createEmployeeHandler(socket:Socket, employee:IEmployee) {
    try {
        if (!employee) {
            messageEmission(socket,"failed","employee data are needed");
            return
        }
        const isEmployee = await isEmployeeExists(employee.email);
        if (isEmployee) {
            messageEmission(socket,"failed","employee already exists");
            return;
        }
        await addNewEmployee(employee);
        messageEmission(socket,"success","employee created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readEmployeeHandler(socket:Socket, employeeId: string) {
    try {
        if (!employeeId) {
            messageEmission(socket,"failed","employee ID is missing.");
            return;
        }
        const employee: IEmployee|null = await getEmployeeById(employeeId);
        if (!employee) {
            messageEmission(socket,"failed","employee not found.");
            return;
        }
        messageEmission(socket,"success",{employee});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateEmployeeHandler(socket:Socket, employeeId: string, employee:IEmployee) {
    try {
        if (!employeeId) {
            messageEmission(socket,"failed","employee ID is missing.");
            return;
        }
        if (!employee) {
            messageEmission(socket,"failed","employee data are needed");
            return
        }
        await updateEmployee(employeeId,employee);
        messageEmission(socket,"success","employee data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteEmployeeHandler(socket:Socket, employeeId: string) {
    try {
        if (!employeeId) {
            messageEmission(socket,"failed","employee ID is missing.");
            return;
        }
        await deleteEmployee(employeeId);
        messageEmission(socket,"success","employee deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createShiftHandler(socket:Socket, shift:IShift) {
    try {
        if (!shift) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        await createShift(shift);
        messageEmission(socket,"success","shift created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readShiftHandler(socket:Socket, shiftId: string) {
    try {
        if (!shiftId) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        const shift:IShift|null = await getShift(shiftId);
        if (!shift) {
            messageEmission(socket,"failed","shift not found.");
            return;
        }
        messageEmission(socket,"success",{shift});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateShiftHandler(socket:Socket, shiftId: string, shift:IShift) {
    try {
        if (!shiftId) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        if (!shift) {
            messageEmission(socket,"failed","shift data are needed");
            return
        }
        await updateShift(shiftId,shift);
        messageEmission(socket,"success","shift data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteShiftHandler(socket:Socket, shiftId: string) {
    try {
        if (!shiftId) {
            messageEmission(socket,"failed","shift ID is missing.");
            return;
        }
        await deleteShift(shiftId);
        messageEmission(socket,"success","shift deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createDepartmentHandler(socket:Socket, department:IDepartment) {
    try {
        if (!department) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        await createDepartment(department);
        messageEmission(socket,"success","department created successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function readDepartmentHandler(socket:Socket, departmentId: string) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        const department:IDepartment|null = await getDepartment(departmentId);
        if (!department) {
            messageEmission(socket,"failed","department not found.");
            return;
        }
        messageEmission(socket,"success",{department});
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function updateDepartmentHandler(socket:Socket, departmentId: string, department:IDepartment) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        if (!department) {
            messageEmission(socket,"failed","department data are needed");
            return
        }
        await updateDepartment(departmentId,department);
        messageEmission(socket,"success","department data updated successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}
async function deleteDepartmentHandler(socket:Socket, departmentId: string) {
    try {
        if (!departmentId) {
            messageEmission(socket,"failed","department ID is missing.");
            return;
        }
        await deleteDepartment(departmentId);
        messageEmission(socket,"success","department deleted successfully.");
    } catch(error) {
        errorEmission(socket,error);
    }
}

async function createLocationHandler(socket:Socket, location:ILocation) {
    try {
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

async function createAttendanceRecordHandler(socket: Socket) {
    try {
        let startDate:Date | null = await getRecentAttendanceRecordDate();
        if (!startDate) {
            messageEmission(socket, "failed","there is no attendance record");
            return;
        }
        let endDate: Date = new Date(Date.now()-1);
        const employees: IEmployee[] = await getAllEmployeesList();

        for (let iterDate = new Date(startDate);iterDate <= endDate;iterDate.setDate(iterDate.getDate() + 1)) {
            const day = getDayName(iterDate);
            for (let emp of employees) {
                const shift = await getShift(emp.shiftId.toString());
                if (!shift) continue;
                const day_status = shift[day].day_status;
                if (day_status === "holiday") {
                    // logic pending
                } else if (day_status === "full_day") {
                    // logic pending
                } else if (day_status === "first_half") {
                    // logic pending
                }else if (day_status === "second_half") {
                    // logic pending
                }
            }
        }
    } catch(error) {
        errorEmission(socket,error);
    }
}

export {
    createEmployeeHandler,
    readEmployeeHandler,
    updateEmployeeHandler,
    deleteEmployeeHandler,
    createShiftHandler,
    readShiftHandler,
    updateShiftHandler,
    deleteShiftHandler,
    createDepartmentHandler,
    readDepartmentHandler,
    updateDepartmentHandler,
    deleteDepartmentHandler,
    createLocationHandler,
    readLocationHandler,
    updateLocationHandler,
    deleteLocationHandler,
    createAttendanceRecordHandler
}