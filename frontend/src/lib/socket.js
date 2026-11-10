// ---------------------------------------------------------------------------
// ParkIt — Cliente Socket.IO (tiempo real)
// Suscripción declarativa a los eventos del backend.
// Requiere instalar:  npm i socket.io-client
// ---------------------------------------------------------------------------

import { io } from 'socket.io-client';

// En producción se usa la misma URL del backend (''). En desarrollo se define
// VITE_API_URL=http://localhost:3000 en .env.
const BASE_URL = (import.meta.env && import.meta.env.VITE_API_URL) || '';

let socket = null;

export function connectSocket() {
  if (socket) return socket;
  socket = io(BASE_URL, { transports: ['websocket'] });
  return socket;
}

// Suscribe a los eventos del backend. Devuelve una función para cancelar la suscripción.
// Eventos disponibles:
//   map:snapshot      -> { zones, spots, pillars, lights, nodes, edges }
//   vehicle:snapshot  -> { id, status, position_x, position_y, orientation, parked_spot_id, ... }
//   spot:update       -> spot actualizada (con number y status)
//   vehicle:update    -> estado del vehículo actualizado
export function subscribe({ onMap, onVehicle, onSpotUpdate, onVehicleUpdate }) {
  const s = connectSocket();

  if (onMap) s.on('map:snapshot', onMap);
  if (onVehicle) s.on('vehicle:snapshot', onVehicle);
  if (onSpotUpdate) s.on('spot:update', onSpotUpdate);
  if (onVehicleUpdate) s.on('vehicle:update', onVehicleUpdate);

  return () => {
    if (onMap) s.off('map:snapshot', onMap);
    if (onVehicle) s.off('vehicle:snapshot', onVehicle);
    if (onSpotUpdate) s.off('spot:update', onSpotUpdate);
    if (onVehicleUpdate) s.off('vehicle:update', onVehicleUpdate);
  };
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export default { connectSocket, subscribe, disconnectSocket };
