// ---------------------------------------------------------------------------
// ParkIt — Cliente HTTP del backend
// Capa de datos del frontend. Independiente del framework y del diseño de la UI.
// Requiere solo `fetch` (nativo en navegadores y Node >= 18).
// ---------------------------------------------------------------------------

// En producción el frontend se sirve desde el propio backend, así que se usa la
// misma URL (''). En desarrollo se define VITE_API_URL=http://localhost:3000 en .env.
const BASE_URL = (import.meta.env && import.meta.env.VITE_API_URL) || '';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export function logout() {
  authToken = null;
}

async function request(method, path, body) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err = new Error(data?.error ?? `Error ${res.status}`);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

export const api = {
  // ---- Estado -------------------------------------------------------------
  health: () => request('GET', '/api/health'),

  // ---- Autenticación ------------------------------------------------------
  register: async (name, email, password) => {
    const r = await request('POST', '/api/auth/register', { name, email, password });
    if (r.token) setAuthToken(r.token);
    return r;
  },
  login: async (email, password) => {
    const r = await request('POST', '/api/auth/login', { email, password });
    if (r.token) setAuthToken(r.token);
    return r;
  },
  me: () => request('GET', '/api/auth/me'),

  // ---- Mapa y configuración ------------------------------------------------
  getMap: () => request('GET', '/api/map'),
  setMap: (map) => request('PUT', '/api/map', map), // calibración
  getConfig: () => request('GET', '/api/config'),
  setConfig: (cfg) => request('PUT', '/api/config', cfg),

  // ---- Zonas y plazas ------------------------------------------------------
  getZones: () => request('GET', '/api/zones'),
  getSpots: (zoneId) => request('GET', zoneId ? `/api/spots?zone=${zoneId}` : '/api/spots'),
  setSpotStatus: (id, status) => request('PUT', `/api/spots/${id}/status`, { status }),

  // ---- Ingest de visión (OpenCV → backend) ---------------------------------
  ingestSpots: (spots) => request('POST', '/api/vision/spots', { spots }),
  ingestVehicle: (position) => request('POST', '/api/vision/vehicle', position),

  // ---- Vehículo ------------------------------------------------------------
  getVehicle: () => request('GET', '/api/vehicle'),
  park: (spot) => request('POST', '/api/vehicle/park', { spot }),
  unpark: () => request('POST', '/api/vehicle/unpark'),
  getParking: () => request('GET', '/api/vehicle/parking'), // "dónde está mi vehículo"

  // ---- Rutas (Dijkstra) ----------------------------------------------------
  getRoute: (from, to) => request('POST', '/api/route', { from, to }),
  getFreeSpot: (from) => request('POST', '/api/route/free-spot', from ? { from } : {}),

  // ---- Utilidades de desarrollo --------------------------------------------
  reset: () => request('POST', '/api/reset'),
};

export default api;
