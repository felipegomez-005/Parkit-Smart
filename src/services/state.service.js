import {
  getSpotById,
  getSpotByNumber,
  updateSpotStatus,
  getVehicle,
  updateVehicle,
} from '../db/repository.js';
import { broadcast } from '../sockets/index.js';

const VALID_SPOT_STATUS = new Set(['libre', 'ocupado']);
const VALID_VEHICLE_STATUS = new Set(['desconectado', 'buscando', 'estacionado']);

// Cambia el estado de una plaza por su id. Emite "spot:update" si cambió.
export function setSpotStatus(id, status) {
  if (!Number.isFinite(id)) {
    const err = new Error(`Id de plaza inválido: "${id}".`);
    err.status = 400;
    throw err;
  }
  if (!VALID_SPOT_STATUS.has(status)) {
    const err = new Error(`Estado inválido: "${status}". Usa "libre" o "ocupado".`);
    err.status = 400;
    throw err;
  }
  const current = getSpotById(id);
  if (!current) {
    const err = new Error(`No existe la plaza con id ${id}.`);
    err.status = 404;
    throw err;
  }
  if (current.status === status) {
    return current; // sin cambios -> no se emite evento
  }
  const updated = updateSpotStatus(id, status);
  broadcast('spot:update', updated);
  return updated;
}

// Recibe los estados detectados por la cámara (OpenCV) y actualiza las plazas.
// updates: [{ number, status }]
export function ingestSpotStates(updates) {
  const results = [];
  const errors = [];

  for (const u of updates) {
    if (!u || !u.number) {
      errors.push('Cada actualización requiere "number".');
      continue;
    }
    if (!VALID_SPOT_STATUS.has(u.status)) {
      errors.push(`Estado inválido para "${u.number}": "${u.status}".`);
      continue;
    }
    const current = getSpotByNumber(u.number);
    if (!current) {
      errors.push(`Plaza inexistente: "${u.number}".`);
      continue;
    }
    if (current.status !== u.status) {
      const updated = updateSpotStatus(current.id, u.status);
      broadcast('spot:update', updated);
      results.push(updated);
    } else {
      results.push(current);
    }
  }

  if (errors.length > 0) {
    const err = new Error('Algunas actualizaciones fallaron');
    err.details = errors;
    err.status = 400;
    throw err;
  }

  return results;
}

// Actualiza la posición/orientación del vehículo (ArUco). Emite "vehicle:update".
export function setVehicleState(payload) {
  const status = VALID_VEHICLE_STATUS.has(payload.status) ? payload.status : 'buscando';
  const x = Number(payload.x);
  const y = Number(payload.y);
  const orientation = Number(payload.orientation);

  const updated = updateVehicle({
    status,
    position_x: Number.isFinite(x) ? x : null,
    position_y: Number.isFinite(y) ? y : null,
    orientation: Number.isFinite(orientation) ? orientation : null,
  });

  broadcast('vehicle:update', updated);
  return updated;
}

export function getVehicleState() {
  return getVehicle();
}
