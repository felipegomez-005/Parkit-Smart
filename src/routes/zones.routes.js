import { Router } from 'express';
import { getZones } from '../db/repository.js';

const router = Router();

// GET /api/zones -> listado de zonas.
router.get('/', (req, res) => {
  res.json(getZones());
});

export default router;
