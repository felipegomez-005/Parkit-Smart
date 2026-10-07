import { getMap, replaceMap, getConfig, saveConfig } from '../db/repository.js';

const NODE_TYPES = new Set(['entrada', 'salida', 'acceso', 'cruce', 'plaza']);

function centroid(polygon) {
  const pts = polygon.filter((p) => Array.isArray(p) && p.length >= 2);
  if (pts.length === 0) return null;
  const sum = pts.reduce(
    (acc, [x, y]) => ({ x: acc.x + Number(x), y: acc.y + Number(y) }),
    { x: 0, y: 0 }
  );
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

// Normaliza y valida el payload de un mapa completo.
// Devuelve { ok, errors, map }.
export function parseMap(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, errors: ['El body debe ser un objeto JSON.'], map: null };
  }

  const zones = Array.isArray(payload.zones) ? payload.zones : [];
  const spots = Array.isArray(payload.spots) ? payload.spots : [];
  const pillars = Array.isArray(payload.pillars) ? payload.pillars : [];
  const lights = Array.isArray(payload.lights) ? payload.lights : [];
  const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
  const edges = Array.isArray(payload.edges) ? payload.edges : [];

  const map = { zones: [], spots: [], pillars: [], lights: [], nodes: [], edges: [] };

  // Zonas.
  const zoneNames = new Set();
  for (const z of zones) {
    if (!z || !z.name) {
      errors.push('Cada zona requiere un "name".');
      continue;
    }
    if (zoneNames.has(z.name)) errors.push(`Zona duplicada: "${z.name}".`);
    zoneNames.add(z.name);
    map.zones.push({ name: z.name, description: z.description ?? null });
  }

  // Plazas (con polígono y centro calculado).
  const spotNumbers = new Set();
  for (const s of spots) {
    if (!s || !s.number) {
      errors.push('Cada plaza requiere un "number".');
      continue;
    }
    if (!s.zone) {
      errors.push(`La plaza "${s.number}" requiere una "zone".`);
    } else if (!zoneNames.has(s.zone)) {
      errors.push(`La plaza "${s.number}" referencia una zona inexistente: "${s.zone}".`);
    }
    if (spotNumbers.has(s.number)) errors.push(`Plaza duplicada: "${s.number}".`);
    spotNumbers.add(s.number);

    let x = Number(s.x);
    let y = Number(s.y);
    let polygon = null;

    if (Array.isArray(s.polygon) && s.polygon.length >= 3) {
      polygon = s.polygon.map((p) => [Number(p && p[0]), Number(p && p[1])]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        const c = centroid(polygon);
        if (c) {
          x = c.x;
          y = c.y;
        }
      }
    }

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      errors.push(
        `La plaza "${s.number}" necesita un "polygon" (3+ puntos) o coordenadas "x"/"y".`
      );
      x = 0;
      y = 0;
    }

    map.spots.push({
      number: s.number,
      zone: s.zone,
      label: s.label ?? `Plaza ${s.number}`,
      x,
      y,
      polygon,
    });
  }

  // Pilares.
  const pillarNames = new Set();
  for (const p of pillars) {
    if (!p || !p.name) {
      errors.push('Cada pilar requiere un "name".');
      continue;
    }
    if (pillarNames.has(p.name)) errors.push(`Pilar duplicado: "${p.name}".`);
    pillarNames.add(p.name);
    map.pillars.push({ name: p.name, x: Number(p.x) || 0, y: Number(p.y) || 0 });
  }

  // Luces (una por plaza).
  for (const l of lights) {
    if (!l || !l.spot) {
      errors.push('Cada luz requiere un "spot".');
      continue;
    }
    if (!spotNumbers.has(l.spot)) errors.push(`La luz referencia una plaza inexistente: "${l.spot}".`);
    if (!l.pillar) {
      errors.push(`La luz de la plaza "${l.spot}" requiere un "pillar".`);
    } else if (!pillarNames.has(l.pillar)) {
      errors.push(`La luz referencia un pilar inexistente: "${l.pillar}".`);
    }
    map.lights.push({
      spot: l.spot,
      pillar: l.pillar ?? null,
      side: l.side ?? null,
      x: Number(l.x) || 0,
      y: Number(l.y) || 0,
    });
  }

  // Nodos del grafo.
  const nodeLabels = new Set();
  const nodePos = {};
  for (const n of nodes) {
    if (!n || !n.label) {
      errors.push('Cada nodo requiere un "label".');
      continue;
    }
    if (nodeLabels.has(n.label)) errors.push(`Nodo duplicado: "${n.label}".`);
    nodeLabels.add(n.label);
    if (n.spot && !spotNumbers.has(n.spot)) {
      errors.push(`El nodo "${n.label}" referencia una plaza inexistente: "${n.spot}".`);
    }
    if (n.zone && !zoneNames.has(n.zone)) {
      errors.push(`El nodo "${n.label}" referencia una zona inexistente: "${n.zone}".`);
    }
    if (n.type && !NODE_TYPES.has(n.type)) {
      errors.push(`El nodo "${n.label}" tiene un tipo inválido: "${n.type}".`);
    }

    const x = Number(n.x) || 0;
    const y = Number(n.y) || 0;
    nodePos[n.label] = { x, y };
    map.nodes.push({
      label: n.label,
      type: NODE_TYPES.has(n.type) ? n.type : 'cruce',
      x,
      y,
      spot: n.spot ?? null,
      zone: n.zone ?? null,
    });
  }

  // Aristas (el peso se calcula como distancia si no se envía).
  for (const e of edges) {
    if (!e || !e.from || !e.to) {
      errors.push('Cada arista requiere "from" y "to".');
      continue;
    }
    if (!nodeLabels.has(e.from)) errors.push(`La arista referencia un nodo inexistente: "${e.from}".`);
    if (!nodeLabels.has(e.to)) errors.push(`La arista referencia un nodo inexistente: "${e.to}".`);

    let weight = Number(e.weight);
    if (!Number.isFinite(weight)) {
      const a = nodePos[e.from];
      const b = nodePos[e.to];
      weight = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 1;
    }
    map.edges.push({ from: e.from, to: e.to, weight });
  }

  return { ok: errors.length === 0, errors, map };
}

// Guarda un mapa completo (resultado de la calibración).
export function saveMap(payload) {
  const { ok, errors, map } = parseMap(payload);
  if (!ok) {
    const err = new Error('Mapa inválido');
    err.details = errors;
    err.status = 400;
    throw err;
  }
  return replaceMap(map);
}

// Configuración de calibración (metadatos).
export function getCalibrationConfig() {
  return getConfig();
}

export function updateConfig(cfg) {
  return saveConfig(cfg ?? {});
}
