import { Router } from 'express';
import { getCalibrationConfig, updateConfig } from '../services/map.service.js';

const router = Router();

// GET /api/config -> metadatos de la calibración.
router.get('/', (req, res) => {
  res.json(getCalibrationConfig());
});

// PUT /api/config -> actualiza los metadatos de la calibración.
router.put('/', (req, res) => {
  res.json(updateConfig(req.body));
});

export default router;
