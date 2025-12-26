import {io} from '../config/server.ts';
import {authSignIn, authSignUp} from "./auth.ts";
import type {IEmployee} from "../interface/employee.ts";

function startSocketServer() {
    io.on('connection', (socket) => {
        console.log(`${socket.id} connected to server.`);
    });
}

function startAuthSocketServer() {
    const authNamespace = io.of("/auth");
    authNamespace.on('connection', (socket) => {
        console.log(`${socket.id} connected to auth server.`);
        socket.on("sign_up", (employee: Partial<IEmployee>) => authSignUp(socket,employee));
        socket.on("sign_in", (employee: Partial<IEmployee>) => authSignIn(socket,employee));
    });
}

export {startSocketServer,startAuthSocketServer};