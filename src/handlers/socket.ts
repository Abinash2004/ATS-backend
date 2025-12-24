import {io} from '../config/server.ts';

function startSocketServer() {
    io.on('connection', (socket) => {
        console.log(`${socket.id} connected to server.`);
    });
}
export {startSocketServer};