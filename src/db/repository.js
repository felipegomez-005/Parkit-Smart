import db from './index.js';

// ---------------------------------------------------------------------------
// Capa de acceso a datos: lectura y escritura del mapa y de la configuración.
// ---------------------------------------------------------------------------

function parsePolygon(spot) {
  if (spot.polygon) {
    try {
      return { ...spot, polygon: JSON.parse(spot.polygon) };
    } catch {
      return spot;
    }
  }
  return spot;
}

// ---- Lectura ---------------------------------------------------------------

export function getMap() {
  const zones = db.prepare('SELECT id, name, description FROM zones ORDER BY id').all();
  const spots = db
    .prepare(
      `SELECT s.id, s.zone_id, s.number, s.label, s.status, s.x, s.y, s.polygon, s.updated_at,
              z.name AS zone_name
         FROM spots s
         JOIN zones z ON z.id = s.zone_id
        ORDER BY s.id`
    )
    .all()
    .map(parsePolygon);
  const pillars = db.prepare('SELECT id, name, x, y FROM pillars ORDER BY id').all();
  const lights = db
    .prepare(
      `SELECT l.id, l.pillar_id, l.spot_id, l.side, l.x, l.y,
              p.name AS pillar_name, s.number AS spot_number
         FROM lights l
         JOIN pillars p ON p.id = l.pillar_id
         JOIN spots s ON s.id = l.spot_id
        ORDER BY l.id`
    )
    .all();
  const nodes = db.prepare('SELECT id, label, type, x, y, spot_id, zone_id FROM nodes ORDER BY id').all();
  const edges = db.prepare('SELECT id, node_a, node_b, weight FROM edges ORDER BY id').all();

  return { zones, spots, pillars, lights, nodes, edges };
}

export function getZones() {
  return db.prepare('SELECT id, name, description FROM zones ORDER BY id').all();
}

export function getSpots(zoneId) {
  const base = `
    SELECT s.id, s.zone_id, s.number, s.label, s.status, s.x, s.y, s.polygon, s.updated_at,
           z.name AS zone_name
      FROM spots s
      JOIN zones z ON z.id = s.zone_id
  `;
  if (zoneId !== undefined) {
    return db.prepare(`${base} WHERE s.zone_id = ? ORDER BY s.id`).all(zoneId).map(parsePolygon);
  }
  return db.prepare(`${base} ORDER BY s.id`).all().map(parsePolygon);
}

export function getConfig() {
  const row = db.prepare('SELECT * FROM map_config WHERE id = 1').get();
  if (row && row.homography) {
    try {
      row.homography = JSON.parse(row.homography);
    } catch {
      // Se devuelve tal cual si no es JSON válido.
    }
  }
  return row;
}

// ---- Escritura -------------------------------------------------------------

// Reemplaza TODO el mapa en una transacción. Recibe un mapa ya validado y
// normalizado (con referencias por nombre, no por id).
export function replaceMap(map) {
  const insertZone = db.prepare('INSERT INTO zones (name, description) VALUES (?, ?)');
  const insertSpot = db.prepare(
    'INSERT INTO spots (zone_id, number, label, status, x, y, polygon) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertPillar = db.prepare('INSERT INTO pillars (name, x, y) VALUES (?, ?, ?)');
  const insertLight = db.prepare(
    'INSERT INTO lights (pillar_id, spot_id, side, x, y) VALUES (?, ?, ?, ?, ?)'
  );
  const insertNode = db.prepare(
    'INSERT INTO nodes (label, type, x, y, spot_id, zone_id) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertEdge = db.prepare('INSERT INTO edges (node_a, node_b, weight) VALUES (?, ?, ?)');

  db.exec('BEGIN');
  try {
    db.exec(
      'DELETE FROM edges; DELETE FROM nodes; DELETE FROM lights; DELETE FROM pillars; DELETE FROM spots; DELETE FROM zones;'
    );
    db.exec(
      "DELETE FROM sqlite_sequence WHERE name IN ('zones','spots','pillars','lights','nodes','edges');"
    );

    const zoneId = {};
    for (const z of map.zones || []) {
      zoneId[z.name] = Number(insertZone.run(z.name, z.description ?? null).lastInsertRowid);
    }

    const spotId = {};
    for (const s of map.spots || []) {
      spotId[s.number] = Number(
        insertSpot.run(
          zoneId[s.zone],
          s.number,
          s.label || `Plaza ${s.number}`,
          'libre',
          s.x,
          s.y,
          s.polygon ? JSON.stringify(s.polygon) : null
        ).lastInsertRowid
      );
    }

    const pillarId = {};
    for (const p of map.pillars || []) {
      pillarId[p.name] = Number(insertPillar.run(p.name, p.x, p.y).lastInsertRowid);
    }

    for (const l of map.lights || []) {
      insertLight.run(pillarId[l.pillar], spotId[l.spot], l.side ?? null, l.x ?? 0, l.y ?? 0);
    }

    const nodeId = {};
    for (const n of map.nodes || []) {
      nodeId[n.label] = Number(
        insertNode.run(
          n.label,
          n.type || 'cruce',
          n.x ?? 0,
          n.y ?? 0,
          n.spot ? spotId[n.spot] : null,
          n.zone ? zoneId[n.zone] : null
        ).lastInsertRowid
      );
    }

    for (const e of map.edges || []) {
      insertEdge.run(nodeId[e.from], nodeId[e.to], e.weight ?? 1);
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getMap();
}

export function saveConfig(cfg) {
  db.prepare(
    `UPDATE map_config
        SET name = ?, image_width = ?, image_height = ?, scale = ?, homography = ?, updated_at = ?
      WHERE id = 1`
  ).run(
    cfg.name ?? 'Parking',
    cfg.image_width ?? null,
    cfg.image_height ?? null,
    cfg.scale ?? null,
    cfg.homography ? JSON.stringify(cfg.homography) : null,
    new Date().toISOString()
  );
  return getConfig();
}
