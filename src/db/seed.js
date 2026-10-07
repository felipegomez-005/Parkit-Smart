import db from './index.js';
import { saveMap } from '../services/map.service.js';
import { saveConfig } from '../db/repository.js';

// ---------------------------------------------------------------------------
// Datos DEMO para desarrollo. La configuración real de un estacionamiento se
// carga desde la pantalla de calibración de la app con PUT /api/map.
//
//   - Zona A (izquierda): Plaza A1  -> luz izquierda del pilar izquierdo
//   - Zona B (centro):    Plaza B1  -> luz derecha  del pilar izquierdo
//   - Zona C (derecha):   Plaza C1  -> luz única del pilar derecho
// ---------------------------------------------------------------------------

const demoMap = {
  zones: [
    { name: 'Zona A', description: 'Plaza izquierda (A1)' },
    { name: 'Zona B', description: 'Plaza del centro (B1)' },
    { name: 'Zona C', description: 'Plaza derecha (C1)' },
  ],
  spots: [
    { number: 'A1', zone: 'Zona A', polygon: [[-13, 18], [-7, 18], [-7, 22], [-13, 22]] },
    { number: 'B1', zone: 'Zona B', polygon: [[-3, 18], [3, 18], [3, 22], [-3, 22]] },
    { number: 'C1', zone: 'Zona C', polygon: [[7, 18], [13, 18], [13, 22], [7, 22]] },
  ],
  pillars: [
    { name: 'Pilar izquierdo', x: -5, y: 17 },
    { name: 'Pilar derecho', x: 10, y: 17 },
  ],
  lights: [
    { spot: 'A1', pillar: 'Pilar izquierdo', side: 'izquierda', x: -6, y: 17 },
    { spot: 'B1', pillar: 'Pilar izquierdo', side: 'derecha', x: -4, y: 17 },
    { spot: 'C1', pillar: 'Pilar derecho', side: null, x: 10, y: 17 },
  ],
  nodes: [
    { label: 'Entrada', type: 'entrada', x: 0, y: 0 },
    { label: 'Cruce central', type: 'cruce', x: 0, y: 10 },
    { label: 'Plaza A1', type: 'plaza', x: -10, y: 20, spot: 'A1' },
    { label: 'Plaza B1', type: 'plaza', x: 0, y: 20, spot: 'B1' },
    { label: 'Plaza C1', type: 'plaza', x: 10, y: 20, spot: 'C1' },
  ],
  edges: [
    { from: 'Entrada', to: 'Cruce central' },
    { from: 'Cruce central', to: 'Plaza A1' },
    { from: 'Cruce central', to: 'Plaza B1' },
    { from: 'Cruce central', to: 'Plaza C1' },
  ],
};

const map = saveMap(demoMap);

// Estado inicial del vehículo: desconectado, sin plaza guardada.
db.prepare(
  `UPDATE vehicle
      SET status = 'desconectado',
          position_x = NULL,
          position_y = NULL,
          orientation = NULL,
          parked_spot_id = NULL,
          updated_at = ?
    WHERE id = 1`
).run(new Date().toISOString());

// Configuración de calibración por defecto (DEMO).
saveConfig({
  name: 'Maqueta ParkIt',
  image_width: 1920,
  image_height: 1080,
  scale: null,
  homography: null,
});

console.log('[Seed] Datos DEMO cargados:');
console.log(`  - Zonas: ${map.zones.length}`);
console.log(`  - Plazas: ${map.spots.length}`);
console.log(`  - Pilares: ${map.pillars.length}`);
console.log(`  - Luces LED: ${map.lights.length}`);
console.log(`  - Nodos del grafo: ${map.nodes.length}`);
console.log(`  - Aristas del grafo: ${map.edges.length}`);
