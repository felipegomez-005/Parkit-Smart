import { Router } from 'express';
import { register, login } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/register -> crea una cuenta. Body: { name, email, password }
router.post('/register', async (req, res) => {
  try {
    const result = await register(req.body ?? {});
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/auth/login -> inicia sesión. Body: { email, password }
router.post('/login', async (req, res) => {
  try {
    const result = await login(req.body ?? {});
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/auth/me -> usuario actual (requiere token).
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
