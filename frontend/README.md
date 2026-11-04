# ParkIt Frontend — Kit base (capa de datos)

Base del frontend de **ParkIt Smart**. Contiene la **capa de datos** (HTTP + tiempo
real) lista para usar desde cualquier framework (React, Vue, vanilla). **No decide el
diseño de la interfaz**, así que Cristian puede montarla sobre lo que quiera.

## Qué contiene

| Archivo | Qué hace |
|---------|----------|
| `src/lib/api.js` | Cliente HTTP con una función por cada endpoint del backend |
| `src/lib/socket.js` | Cliente Socket.IO con suscripción a los eventos en tiempo real |

## Cómo usarlo

```js
import { api } from './lib/api.js';
import { subscribe } from './lib/socket.js';

// 1) Traer el mapa completo
const map = await api.getMap();
// map = { zones, spots, pillars, lights, nodes, edges }

// 2) Suscribirse a cambios en tiempo real
const off = subscribe({
  onSpotUpdate: (spot) => console.log('cambió', spot.number, spot.status),
  onVehicleUpdate: (vehicle) => console.log('vehículo', vehicle),
});

// 3) Plaza libre más cercana y su ruta (Dijkstra)
const ruta = await api.getFreeSpot('Entrada');
// ruta = { from, spot, distance, path }

// 4) Estacionar y "dónde está mi vehículo"
await api.park('A1');
const miAuto = await api.getParking();
await api.unpark();

// 5) Reset de desarrollo
await api.reset();

// al salir de la pantalla
off();
```

## Configuración

Define la URL del backend en una variable de entorno (Vite):

```
# .env
VITE_API_URL=http://localhost:3000
```

Si no se define, usa `http://localhost:3000` por defecto.

## Dirección del diseño (Google Maps)

La capa de datos **no depende del diseño**. Para una UI tipo Google Maps, el siguiente
paso sería:

- Renderizar `map.spots` como **marcadores/pins** sobre un lienzo (`<canvas>` o SVG).
- Color por estado: **verde = libre**, **rojo = ocupado** (igual que los LEDs).
- Dibujar `map.nodes` y `map.edges` como la red de caminos (fondo, gris claro).
- Dibujar la ruta (`path`) como una **polilínea azul**, al estilo de Google Maps.
- Mover el auto (marcador azul) con `vehicle:update`.

## Siguiente paso

1. Scaffold React + Vite: `npm create vite@latest parkit-frontend -- --template react`.
2. Instalar dependencias: `npm i socket.io-client`.
3. Montar estos módulos en un componente de mapa y pintar los marcadores.
