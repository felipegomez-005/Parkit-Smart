import { Router } from 'express';
import { ingestSpotStates, setVehicleState } from '../services/state.service.js';

const router = Router();

// POST /api/vision/spots -> OpenCV envía los estados detectados de las plazas.
// Body: { spots: [{ number: "A1", status: "ocupado" }, ...] }
router.post('/spots', (req, res) => {
  try {
    const updates = Array.isArray(req.body?.spots) ? req.body.spots : [];
    res.json(ingestSpotStates(updates));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details ?? undefined });
  }
});

// POST /api/vision/vehicle -> OpenCV envía la posición/orientación del vehículo.
// Body: { x, y, orientation, status? }
router.post('/vehicle', (req, res) => {
  try {
    res.json(setVehicleState(req.body ?? {}));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, details: err.details ?? undefined });
  }
});

export default router;
