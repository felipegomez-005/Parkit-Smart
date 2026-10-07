import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cargar variables de entorno desde .env si existe (sin dependencias externas).
try {
  process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch {
  // No hay .env: se usan los valores por defecto.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST || '0.0.0.0',
  dbPath: path.resolve(rootDir, process.env.DB_PATH || './data/parkit.db'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

export default config;
