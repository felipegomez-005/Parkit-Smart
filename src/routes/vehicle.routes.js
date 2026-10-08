import { Router } from 'express';
import {
  getVehicleState,
  parkVehicleAtSpot,
  getParkedSpotInfo,
} from '../services/state.service.js';

const router = Router();

// GET /api/vehicle -> estado actual del vehículo.
router.get('/', (req, res) => {
  res.json(getVehicleState());
});

// POST /api/vehicle/park -> guarda la plaza donde estacionó. Body: { spot: "A1" }
router.post('/park', (req, res) => {
  try {
    res.json(parkVehicleAtSpot(req.body?.spot));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details ?? undefined });
  }
});

// GET /api/vehicle/parking -> "Dónde está mi vehículo".
router.get('/parking', (req, res) => {
  res.json(getParkedSpotInfo());
});

export default router;
