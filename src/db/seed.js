import db from './index.js';
import { saveMap } from '../services/map.service.js';
import { saveConfig } from '../db/repository.js';

// Plano demo ParkIt Smart: seis plazas distribuidas como la maqueta de referencia.
// Coordenadas expresadas en el mismo sistema del SVG del frontend (688 x 388).
const demoMap = {
  zones: [
    { name: 'Sector A', description: 'Plazas P1 y P2 · sector inferior derecho' },
    { name: 'Sector B', description: 'Plazas P3 y P4 · sector superior derecho' },
    { name: 'Sector C', description: 'Plazas P5 y P6 · sector superior izquierdo' },
  ],
  spots: [
    { number: 'P1', zone: 'Sector A', polygon: [[482, 304], [538, 304], [538, 366], [482, 366]] },
    { number: 'P2', zone: 'Sector A', polygon: [[547, 304], [603, 304], [603, 366], [547, 366]] },
    { number: 'P3', zone: 'Sector B', polygon: [[532, 50], [588, 50], [588, 112], [532, 112]] },
    { number: 'P4', zone: 'Sector B', polygon: [[602, 50], [658, 50], [658, 112], [602, 112]] },
    { number: 'P5', zone: 'Sector C', polygon: [[67, 50], [123, 50], [123, 112], [67, 112]] },
    { number: 'P6', zone: 'Sector C', polygon: [[132, 50], [188, 50], [188, 112], [132, 112]] },
  ],
  pillars: [
    { name: 'Pilar A1', x: 465, y: 280 }, { name: 'Pilar A2', x: 620, y: 280 },
    { name: 'Pilar B1', x: 505, y: 140 }, { name: 'Pilar B2', x: 665, y: 140 },
    { name: 'Pilar C1', x: 25, y: 140 }, { name: 'Pilar C2', x: 205, y: 140 },
  ],
  lights: [
    { spot: 'P1', pillar: 'Pilar A1', side: 'izquierda', x: 510, y: 294 },
    { spot: 'P2', pillar: 'Pilar A2', side: 'izquierda', x: 575, y: 294 },
    { spot: 'P3', pillar: 'Pilar B1', side: 'izquierda', x: 560, y: 40 },
    { spot: 'P4', pillar: 'Pilar B2', side: 'izquierda', x: 630, y: 40 },
    { spot: 'P5', pillar: 'Pilar C1', side: 'izquierda', x: 95, y: 40 },
    { spot: 'P6', pillar: 'Pilar C2', side: 'izquierda', x: 160, y: 40 },
  ],
  nodes: [
    { label: 'Entrada', type: 'entrada', x: 344, y: 350 },
    { label: 'Cruce sur', type: 'cruce', x: 344, y: 276 },
    { label: 'Cruce suroeste', type: 'cruce', x: 232, y: 276 },
    { label: 'Cruce noroeste', type: 'cruce', x: 232, y: 152 },
    { label: 'Cruce noreste', type: 'cruce', x: 458, y: 152 },
    { label: 'Cruce sureste', type: 'cruce', x: 458, y: 276 },
    { label: 'Acceso P1', type: 'cruce', x: 510, y: 276 },
    { label: 'Acceso P2', type: 'cruce', x: 575, y: 276 },
    { label: 'Acceso P3', type: 'cruce', x: 560, y: 152 },
    { label: 'Acceso P4', type: 'cruce', x: 630, y: 152 },
    { label: 'Acceso P5', type: 'cruce', x: 95, y: 152 },
    { label: 'Acceso P6', type: 'cruce', x: 160, y: 152 },
    { label: 'Plaza P1', type: 'plaza', x: 510, y: 335, spot: 'P1', zone: 'Sector A' },
    { label: 'Plaza P2', type: 'plaza', x: 575, y: 335, spot: 'P2', zone: 'Sector A' },
    { label: 'Plaza P3', type: 'plaza', x: 560, y: 81, spot: 'P3', zone: 'Sector B' },
    { label: 'Plaza P4', type: 'plaza', x: 630, y: 81, spot: 'P4', zone: 'Sector B' },
    { label: 'Plaza P5', type: 'plaza', x: 95, y: 81, spot: 'P5', zone: 'Sector C' },
    { label: 'Plaza P6', type: 'plaza', x: 160, y: 81, spot: 'P6', zone: 'Sector C' },
  ],
  edges: [
    // Calle sur (y=276), de oeste a este.
    { from: 'Cruce suroeste', to: 'Cruce sur' },
    { from: 'Cruce sur', to: 'Cruce sureste' },
    { from: 'Cruce sureste', to: 'Acceso P1' },
    { from: 'Acceso P1', to: 'Acceso P2' },
    { from: 'Entrada', to: 'Cruce sur' },
    // Conectores oeste y este.
    { from: 'Cruce suroeste', to: 'Cruce noroeste' },
    { from: 'Cruce sureste', to: 'Cruce noreste' },
    // Calle norte (y=152), de oeste a este.
    { from: 'Acceso P5', to: 'Acceso P6' },
    { from: 'Acceso P6', to: 'Cruce noroeste' },
    { from: 'Cruce noroeste', to: 'Cruce noreste' },
    { from: 'Cruce noreste', to: 'Acceso P3' },
    { from: 'Acceso P3', to: 'Acceso P4' },
    // Cada acceso con su plaza.
    { from: 'Acceso P1', to: 'Plaza P1' },
    { from: 'Acceso P2', to: 'Plaza P2' },
    { from: 'Acceso P3', to: 'Plaza P3' },
    { from: 'Acceso P4', to: 'Plaza P4' },
    { from: 'Acceso P5', to: 'Plaza P5' },
    { from: 'Acceso P6', to: 'Plaza P6' },
  ],
};

const map = saveMap(demoMap);
db.prepare(`UPDATE vehicle SET status = 'desconectado', position_x = NULL, position_y = NULL,
  orientation = NULL, parked_spot_id = NULL, updated_at = ? WHERE id = 1`).run(new Date().toISOString());
saveConfig({ name: 'ParkIt Smart · Maqueta subterránea', image_width: 688, image_height: 388, scale: null, homography: null });
console.log('[Seed] Plano ParkIt Smart cargado:');
console.log(`  - Sectores: ${map.zones.length}`);
console.log(`  - Plazas: ${map.spots.length}`);
console.log(`  - Nodos: ${map.nodes.length}`);
console.log(`  - Conexiones: ${map.edges.length}`);
