import { Router } from 'express';
import { getMap } from '../db/repository.js';
import { saveMap } from '../services/map.service.js';

const router = Router();

// GET /api/map -> mapa completo (zonas, plazas, pilares, luces, nodos, aristas).
router.get('/', (req, res) => {
  res.json(getMap());
});

// PUT /api/map -> reemplaza el mapa completo con el resultado de la calibración.
router.put('/', (req, res) => {
  try {
    res.json(saveMap(req.body));
  } catch (err) {
    res.status(err.status || 500).json({
      error: err.message,
      details: err.details ?? undefined,
    });
  }
});

export default router;
