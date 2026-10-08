import { Router } from 'express';
import mapRoutes from './map.routes.js';
import zoneRoutes from './zones.routes.js';
import spotRoutes from './spots.routes.js';
import configRoutes from './config.routes.js';
import visionRoutes from './vision.routes.js';
import vehicleRoutes from './vehicle.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'parkit-backend',
    time: new Date().toISOString(),
  });
});

router.use('/map', mapRoutes);
router.use('/zones', zoneRoutes);
router.use('/spots', spotRoutes);
router.use('/config', configRoutes);
router.use('/vision', visionRoutes);
router.use('/vehicle', vehicleRoutes);

export default router;
