# ParkIt Smart

Sistema inteligente de estacionamiento (prototipo académico). Este repositorio es un
**monorepo** con dos partes:

- **Backend** (raíz): Node.js + Express + SQLite + Socket.IO.
- **Frontend** (`frontend/`): kit base con la capa de datos (HTTP + tiempo real) lista
  para montar sobre React/Capacitor.

## Estructura del repositorio

| Carpeta | Qué contiene |
|---------|--------------|
| `src/` | Backend completo: servidor, base de datos, rutas, servicios y Socket.IO |
| `frontend/` | Kit base del frontend: `api.js` (HTTP) y `socket.js` (tiempo real) |
| `docs/` | Contrato de API completo (`contrato-api.md`) |
| `data/` | Base de datos SQLite (generada, **no se versiona**) |

## Arranque rápido

### Backend (en la raíz)

```bash
npm install        # dependencias: express, socket.io, cors
npm run seed       # carga datos de ejemplo (3 plazas en 3 zonas)
npm start          # arranca en http://localhost:3000
# npm run dev      # alternativa con recarga automática (node --watch)
```

### Frontend

El kit está en `frontend/`. No requiere instalación por sí solo; son los módulos que se
montan dentro del `src/` de un proyecto Vite + React. Para el tiempo real hay que
instalar `socket.io-client`. Ver [`frontend/README.md`](frontend/README.md).

---

## Backend

### Stack

- **Node.js** + **Express** (API HTTP/JSON)
- **SQLite** (módulo integrado `node:sqlite`, sin dependencias nativas)
- **Socket.IO** (tiempo real por WebSocket)

### Requisitos

- **Node.js >= 22.13** (necesario para `node:sqlite`; recomendado Node 22 LTS o 24 LTS).

### Maqueta (modelo físico)

- **3 plazas** en **3 zonas** (una por zona): izquierda (A1), centro (B1) y derecha (C1).
- **2 pilares** con luces LED bicolor:
  - **Pilar izquierdo**: 2 luces (lado izquierdo → A1, lado derecho → B1).
  - **Pilar derecho**: 1 luz (→ C1).
- Total: **3 plazas, 2 pilares, 3 luces LED** (1 luz por plaza). La cámara lee el color
  de cada luz (verde = libre, rojo = ocupado) para determinar el estado.

### Calibración (configurar el estacionamiento)

El backend es **genérico**: no fija cuántas plazas, zonas, pilares o luces hay. La
configuración se define en la pantalla de calibración de la app, que marca cada plaza por
su contorno (`polygon`) y envía el mapa con `PUT /api/map`. El backend calcula solo el
centro de cada plaza y el peso de las aristas.

```
Cámara → calibración (marcar plazas/zonas/luces/caminos) → PUT /api/map → la app usa GET /api/map
```

Los datos de `npm run seed` son solo un **ejemplo** (la maqueta de 3 plazas).

### Modelo de datos

| Tabla | Descripción |
|-------|-------------|
| `zones` | Zonas del estacionamiento |
| `spots` | Plazas: número, zona, estado, posición y contorno (`polygon`) |
| `pillars` | Pilares físicos que sostienen las luces LED |
| `lights` | Luces LED bicolor (1 por plaza): pilar, lado y posición |
| `nodes` | Nodos del grafo de navegación (entrada, cruces, plazas) |
| `edges` | Aristas no dirigidas entre nodos, con peso (distancia) |
| `vehicle` | Estado del vehículo: posición/orientación y plaza guardada |
| `map_config` | Metadatos de calibración (nombre, resolución, escala, homografía) |

### API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| GET / PUT | `/api/map` | Leer / reemplazar el mapa calibrado |
| GET / PUT | `/api/config` | Metadatos de calibración |
| GET | `/api/zones` | Listado de zonas |
| GET | `/api/spots` | Plazas con su estado (`?zone=<id>`) |
| PUT | `/api/spots/:id/status` | Cambiar el estado de una plaza |
| POST | `/api/vision/spots` | OpenCV envía los estados detectados |
| POST | `/api/vision/vehicle` | OpenCV envía posición/orientación (ArUco) |
| GET | `/api/vehicle` | Estado actual del vehículo |
| POST | `/api/vehicle/park` | Guardar la plaza al estacionar |
| POST | `/api/vehicle/unpark` | Liberar la plaza guardada |
| GET | `/api/vehicle/parking` | "Dónde está mi vehículo" |
| POST | `/api/route` | Ruta más corta entre dos nodos (Dijkstra) |
| POST | `/api/route/free-spot` | Plaza libre más cercana |
| POST | `/api/reset` | Restaurar el estado de demostración |

### Socket.IO (eventos)

| Evento | Dirección | Descripción |
|--------|-----------|-------------|
| `map:snapshot` | servidor → cliente | Estado completo del mapa al conectarse |
| `vehicle:snapshot` | servidor → cliente | Estado del vehículo al conectarse |
| `spot:update` | servidor → cliente | Una plaza cambió de estado |
| `vehicle:update` | servidor → cliente | El vehículo cambió de posición/estado |

---

## Documentación

- **Contrato de API** (para el frontend): [`docs/contrato-api.md`](docs/contrato-api.md)
- **Kit del frontend** (capa de datos): [`frontend/README.md`](frontend/README.md)

## Próximos pasos

1. Plan de pruebas del backend (Fase 3).
2. Scaffold React + Vite y montar el mapa (frontend, estética tipo Google Maps).
3. Integración completa: hardware (ESP32) + visión (OpenCV) + backend + app.
