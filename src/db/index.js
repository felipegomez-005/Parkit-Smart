import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import config from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear la carpeta data/ si no existe.
mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new DatabaseSync(config.dbPath);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec(readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8'));

// Migraciones simples (ADD COLUMN) para bases de datos creadas con un esquema
// anterior. Se ignoran los errores de "columna duplicada".
const migrations = [
  'ALTER TABLE spots ADD COLUMN polygon TEXT',
];
for (const sql of migrations) {
  try {
    db.exec(sql);
  } catch {
    // La columna ya existe.
  }
}

export default db;
