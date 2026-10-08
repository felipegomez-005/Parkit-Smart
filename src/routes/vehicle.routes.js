import { Router } from 'express';
import { getVehicleState } from '../services/state.service.js';

const router = Router();

// GET /api/vehicle -> estado actual del vehículo.
router.get('/', (req, res) => {
  res.json(getVehicleState());
});

export default router;
