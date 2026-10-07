import { Router } from 'express';
import { getSpots } from '../db/repository.js';

const router = Router();

// GET /api/spots        -> todas las plazas con su estado
// GET /api/spots?zone=1 -> plazas filtradas por zona
router.get('/', (req, res) => {
  const zoneId = req.query.zone ? Number(req.query.zone) : undefined;
  res.json(getSpots(Number.isFinite(zoneId) ? zoneId : undefined));
});

export default router;
