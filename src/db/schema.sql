-- ParkIt - Esquema de la base de datos (SQLite)

PRAGMA foreign_keys = ON;

-- Zonas del estacionamiento (se definen durante la calibración).
CREATE TABLE IF NOT EXISTS zones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  description TEXT
);

-- Plazas. El contorno (polygon) se marca en la calibración; (x, y) es el punto
-- de referencia (centro) de la plaza, usado por el grafo de navegación.
CREATE TABLE IF NOT EXISTS spots (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id    INTEGER NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  number     TEXT NOT NULL,                -- p.ej. "A1"
  label      TEXT NOT NULL,                -- p.ej. "Plaza A1"
  status     TEXT NOT NULL DEFAULT 'libre' CHECK (status IN ('libre','ocupado')),
  x          REAL NOT NULL DEFAULT 0,      -- centro (punto de referencia)
  y          REAL NOT NULL DEFAULT 0,
  polygon    TEXT,                         -- contorno en JSON: [[x,y],[x,y],...]
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Pilares físicos (soportes que pueden tener una o más luces LED).
CREATE TABLE IF NOT EXISTS pillars (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  x    REAL NOT NULL DEFAULT 0,
  y    REAL NOT NULL DEFAULT 0
);

-- Luces LED bicolor que la cámara lee para conocer el estado de cada plaza.
-- Relación 1:1 con las plazas (una luz por plaza).
CREATE TABLE IF NOT EXISTS lights (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  pillar_id INTEGER NOT NULL REFERENCES pillars(id) ON DELETE CASCADE,
  spot_id   INTEGER NOT NULL UNIQUE REFERENCES spots(id) ON DELETE CASCADE,
  side      TEXT,                         -- lado del pilar ('izquierda'/'derecha'); NULL si el pilar tiene una sola luz
  x         REAL NOT NULL DEFAULT 0,
  y         REAL NOT NULL DEFAULT 0
);

-- Nodos del grafo de navegación (entrada, cruces, accesos y plazas).
CREATE TABLE IF NOT EXISTS nodes (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  label   TEXT NOT NULL,
  type    TEXT NOT NULL DEFAULT 'cruce'
          CHECK (type IN ('entrada','salida','acceso','cruce','plaza')),
  x       REAL NOT NULL DEFAULT 0,
  y       REAL NOT NULL DEFAULT 0,
  spot_id INTEGER REFERENCES spots(id) ON DELETE SET NULL,
  zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL
);

-- Aristas NO dirigidas del grafo de navegación (caminos entre nodos).
CREATE TABLE IF NOT EXISTS edges (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  node_a  INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  node_b  INTEGER NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  weight  REAL NOT NULL DEFAULT 1
);

-- Estado del vehículo (fila única con id = 1).
CREATE TABLE IF NOT EXISTS vehicle (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  status         TEXT NOT NULL DEFAULT 'desconectado'
                 CHECK (status IN ('desconectado','buscando','estacionado')),
  position_x     REAL,                      -- posición actual (ArUco)
  position_y     REAL,
  orientation    REAL,                      -- ángulo en grados (ArUco)
  parked_spot_id INTEGER REFERENCES spots(id) ON DELETE SET NULL,
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Metadatos de la calibración (fila única con id = 1).
CREATE TABLE IF NOT EXISTS map_config (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  name         TEXT NOT NULL DEFAULT 'Parking',
  image_width  INTEGER,                     -- resolución de la cámara
  image_height INTEGER,
  scale        REAL,                        -- p.ej. píxeles por metro
  homography   TEXT,                        -- matriz 3x3 en JSON (corrección de perspectiva)
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

INSERT OR IGNORE INTO vehicle (id, status) VALUES (1, 'desconectado');
INSERT OR IGNORE INTO map_config (id, name) VALUES (1, 'Parking');

CREATE INDEX IF NOT EXISTS idx_spots_zone    ON spots(zone_id);
CREATE INDEX IF NOT EXISTS idx_lights_pillar ON lights(pillar_id);
CREATE INDEX IF NOT EXISTS idx_nodes_spot    ON nodes(spot_id);
CREATE INDEX IF NOT EXISTS idx_edges_nodes   ON edges(node_a);
