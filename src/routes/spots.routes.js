import { Router } from 'express';
import { getSpots } from '../db/repository.js';
import { setSpotStatus } from '../services/state.service.js';

const router = Router();

// GET /api/spots        -> todas las plazas con su estado
// GET /api/spots?zone=1 -> plazas filtradas por zona
router.get('/', (req, res) => {
  const zoneId = req.query.zone ? Number(req.query.zone) : undefined;
  res.json(getSpots(Number.isFinite(zoneId) ? zoneId : undefined));
});

// PUT /api/spots/:id/status -> cambia el estado de una plaza.
// Body: { status: "libre" | "ocupado" }
router.put('/:id/status', (req, res) => {
  try {
    res.json(setSpotStatus(Number(req.params.id), req.body?.status));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details ?? undefined });
  }
});

export default router;
