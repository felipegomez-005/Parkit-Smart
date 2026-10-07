import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api', apiRoutes);

  // 404 para rutas no definidas.
  app.use((req, res) => {
    res.status(404).json({ error: 'No encontrado', path: req.originalUrl });
  });

  // Manejador central de errores.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
