import { Router } from 'express';
import { shortestPath, nearestFreeSpot } from '../services/graph.service.js';

const router = Router();

// POST /api/route -> ruta más corta entre dos nodos. Body: { from, to }
router.post('/', (req, res) => {
  try {
    res.json(shortestPath(req.body?.from, req.body?.to));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/route/free-spot -> plaza libre más cercana. Body: { from? }
router.post('/free-spot', (req, res) => {
  try {
    res.json(nearestFreeSpot(req.body?.from));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
