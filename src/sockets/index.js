import { getMap } from '../db/repository.js';

// Configuración base de Socket.IO. Los eventos de actualización en tiempo real
// (spot:update, vehicle:update) se agregan en pasos posteriores.
export function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Cliente conectado: ${socket.id}`);

    // Enviar el estado completo del mapa al conectar.
    socket.emit('map:snapshot', getMap());

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Cliente desconectado: ${socket.id}`);
    });
  });
}
