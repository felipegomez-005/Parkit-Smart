import { getMap, getVehicle } from '../db/repository.js';
import { getUserFromToken } from '../services/auth.service.js';

let io = null;

// Configura Socket.IO: envía el estado inicial al conectar y expone `broadcast`
// para que los servicios emitan eventos en tiempo real a todos los clientes.
export function initSocket(socketServer) {
  io = socketServer;

  // Exige un JWT válido en `handshake.auth.token`.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    const user = token ? getUserFromToken(token) : null;
    if (!user) {
      return next(new Error('Token inválido o ausente'));
    }
    socket.data.user = user;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

    // Estado inicial completo al conectar.
    socket.emit('map:snapshot', getMap());
    socket.emit('vehicle:snapshot', getVehicle());

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
    });
  });
}

// Emite un evento a todos los clientes conectados.
export function broadcast(event, payload) {
  if (io) {
    io.emit(event, payload);
  }
}
