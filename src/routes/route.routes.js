import { Router } from 'express';
import { shortestPath, nearestFreeSpot, nearestNode } from '../services/graph.service.js';
import { getVehicle } from '../db/repository.js';

const router = Router();

// Si from === 'vehicle', devuelve el id del nodo más cercano a la posición
// actual del vehículo. En cualquier otro caso devuelve `from` sin cambios.
function resolveFrom(from) {
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

// POST /api/route -> ruta más corta entre dos nodos. Body: { from, to }
// `from` puede ser "vehicle" para partir desde la posición real del vehículo.
router.post('/', (req, res) => {
  try {
    res.json(shortestPath(resolveFrom(req.body?.from), req.body?.to));
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
