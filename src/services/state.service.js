import {
  getMap,
  getSpotById,
  getSpotByNumber,
  updateSpotStatus,
  getVehicle,
  updateVehicle,
  parkVehicle,
  getParkedSpot,
  resetState,
  clearParkedSpot,
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
  let status;
  if (VALID_VEHICLE_STATUS.has(payload.status)) {
    status = payload.status;
  } else {
    // Sin status explícito: si ya está estacionado, se conserva (y su parked_spot_id).
    status = getVehicle().status === 'estacionado' ? 'estacionado' : 'buscando';
  }
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

// Guarda la plaza donde estacionó el vehículo (y la marca ocupada para la demo).
export function parkVehicleAtSpot(number) {
  const spot = getSpotByNumber(number);
  if (!spot) {
    const err = new Error(`Plaza inexistente: "${number}".`);
    err.status = 404;
    throw err;
  }
  const previousSpotId = getVehicle().parked_spot_id ?? null;

  if (spot.status === 'ocupado' && previousSpotId !== spot.id) {
    const err = new Error(`La plaza "${number}" ya está ocupada.`);
    err.status = 409;
    throw err;
  }

  const vehicle = parkVehicle(spot.id);

  // Si tenía otra plaza guardada, se libera.
  if (previousSpotId !== null && previousSpotId !== spot.id) {
    const previous = getSpotById(previousSpotId);
    if (previous && previous.status !== 'libre') {
      broadcast('spot:update', updateSpotStatus(previousSpotId, 'libre'));
    }
  }

  // En producción la ocupación la detecta la cámara; aquí se marca para la demo.
  if (spot.status !== 'ocupado') {
    const updatedSpot = updateSpotStatus(spot.id, 'ocupado');
    broadcast('spot:update', updatedSpot);
  }

  broadcast('vehicle:update', vehicle);
  return { vehicle, spot: getSpotById(spot.id) };
}

// "Dónde está mi vehículo": devuelve el vehículo y la plaza guardada.
export function getParkedSpotInfo() {
  return {
    vehicle: getVehicle(),
    spot: getParkedSpot(),
  };
}

// Restaura el estado de demostración (plazas libres, vehículo desconectado).
// Emite eventos solo para las plazas que cambian y para el vehículo.
export function resetSystem() {
  const before = new Map(getMap().spots.map((s) => [s.number, s.status]));
  const map = resetState();

  for (const spot of map.spots) {
    if (before.get(spot.number) !== 'libre') {
      broadcast('spot:update', spot);
    }
  }

  const vehicle = getVehicle();
  broadcast('vehicle:update', vehicle);
  return { map, vehicle };
}

// Libera la plaza guardada (el vehículo se va) y la deja disponible.
export function unparkVehicle() {
  const { vehicle, releasedSpotId } = clearParkedSpot();

  let spot = null;
  if (releasedSpotId !== null) {
    const current = getSpotById(releasedSpotId);
    if (current && current.status !== 'libre') {
      spot = updateSpotStatus(releasedSpotId, 'libre');
      broadcast('spot:update', spot);
    } else {
      spot = current;
    }
  }

  broadcast('vehicle:update', vehicle);
  return { vehicle, spot };
}
