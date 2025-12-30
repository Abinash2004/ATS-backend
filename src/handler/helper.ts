import type {Socket} from "socket.io";

function helperStringToDate(inputTime: string): Date {
    const [hh,mm] = inputTime.split(":").map(Number);
    let shiftTime = new Date();
    shiftTime.setUTCHours(hh-5, mm-30, 0, 0);
    return shiftTime;
}

function helperTOIST(date: Date): string {
    return date.toLocaleString("en-IN", {timeZone: "Asia/Kolkata"});
}

function helperErrorEmission(socket: Socket, error: unknown) :void {
    socket.emit("server_response",{
        status: "failed",
        message: error instanceof Error ? error.message : error
    });
}

function helperMessageEmission(socket: Socket, status: string, message: string) :void {
    socket.emit("server_response",{status,message});
}

function helperCalculateMinutes(start: Date, end: Date): number {
    if (end < start) return 0;
    return Math.floor((end.getTime() - start.getTime()) / 60000);
}

export {
    helperStringToDate,
    helperTOIST,
    helperErrorEmission,
    helperMessageEmission,
    helperCalculateMinutes
};