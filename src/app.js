import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api', apiRoutes);

  // Servir el frontend compilado (producción). En desarrollo se usa Vite aparte.
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
  // sw.js e index.html siempre se revalidan; los archivos con hash de /assets se cachean un año.
  app.use(
    express.static(distDir, {
      setHeaders(res, filePath) {
        const name = path.basename(filePath);
        if (name === 'sw.js' || name === 'index.html') {
          res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // Fallback SPA: cualquier GET que no sea de la API devuelve index.html.
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/socket.io')) {
      const indexFile = path.join(distDir, 'index.html');
      if (existsSync(indexFile)) {
        res.setHeader('Cache-Control', 'no-cache');
        return res.sendFile(indexFile);
      }
    }
    next();
  });

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
