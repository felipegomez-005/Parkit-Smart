import { Router } from 'express';
import { shortestPath, nearestFreeSpot, nearestNode } from '../services/graph.service.js';
import { getVehicle } from '../db/repository.js';
import { getParkedSpotInfo } from '../services/state.service.js';

const router = Router();

// Si from === 'vehicle', devuelve el id del nodo más cercano a la posición
// actual del vehículo. En cualquier otro caso devuelve `from` sin cambios.
function resolveFrom(from) {
  if (from === undefined || from === null || (typeof from === 'string' && from.trim() === '')) {
    return 'Entrada';
  }
  if (from !== 'vehicle') return from;
  const v = getVehicle();
  const x = v?.position_x;
  const y = v?.position_y;
  if (typeof x !== 'number' || typeof y !== 'number') {
    const err = new Error('El vehículo no tiene posición conocida; no se puede usar from=vehicle.');
    err.status = 400;
    throw err;
  }
  const node = nearestNode(x, y);
  if (!node) {
    const err = new Error('No hay nodos en el grafo.');
    err.status = 404;
    throw err;
  }
  return node.id;
}

// Si to === 'parked', devuelve el label del nodo "Plaza X" de la plaza guardada
// del vehículo (la misma de GET /api/vehicle/parking). Sin plaza guardada -> 404.
// En cualquier otro caso devuelve `to` sin cambios.
function resolveTo(to) {
  if (to !== 'parked') return to;
  const { spot } = getParkedSpotInfo();
  if (!spot) {
    const err = new Error('No hay una plaza guardada para el vehículo; no se puede usar to=parked.');
    err.status = 404;
    throw err;
  }
  return spot.label ?? `Plaza ${spot.number}`;
}

// POST /api/route -> ruta más corta entre dos nodos. Body: { from, to }
// `from` puede ser "vehicle" para partir desde la posición real del vehículo.
// `to` puede ser "parked" para ir a la plaza donde quedó estacionado el vehículo.
router.post('/', (req, res) => {
  try {
    res.json(shortestPath(resolveFrom(req.body?.from), resolveTo(req.body?.to)));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/route/free-spot -> plaza libre más cercana. Body: { from? }
router.post('/free-spot', (req, res) => {
  try {
    res.json(nearestFreeSpot(resolveFrom(req.body?.from)));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
