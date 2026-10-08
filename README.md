# ParkIt Backend

Backend de **ParkIt Smart**, el sistema inteligente de estacionamiento. Centraliza el
mapa calibrado, el estado de las plazas y la posición del vehículo, y lo comunica en
tiempo real a la aplicación (React/Capacitor).

## Stack

- **Node.js** + **Express** (API HTTP/JSON)
- **SQLite** (base de datos, usando el módulo integrado `node:sqlite`, sin dependencias nativas)
- **Socket.IO** (tiempo real por WebSocket)

## Requisitos

- **Node.js >= 22.13** (se usa `node:sqlite`, estable a partir de esa versión; recomendado Node 22 LTS o 24 LTS).

## Instalación y arranque

```bash
# 1. Instalar dependencias
npm install

# 2. (opcional) Configurar variables de entorno
copy .env.example .env   # en Windows
# cp .env.example .env   # en macOS/Linux

# 3. Cargar los datos de ejemplo (3 plazas en 3 zonas + 2 pilares + 3 luces LED)
npm run seed

# 4. Arrancar el servidor
npm start          # una sola vez
npm run dev        # con reinicio automático (node --watch)
```

El servidor queda escuchando en `http://localhost:3000` por defecto.

## Estructura del proyecto

```
parkit-backend/
├── src/
│   ├── server.js          # Punto de entrada: HTTP + Socket.IO
│   ├── app.js             # Aplicación Express (middlewares y rutas)
│   ├── config.js          # Configuración desde variables de entorno
│   ├── db/
│   │   ├── index.js       # Conexión SQLite y carga del esquema
│   │   ├── schema.sql     # Modelo de datos (DDL)
│   │   ├── seed.js        # Datos de ejemplo
│   │   └── repository.js  # Consultas de acceso a datos
│   ├── routes/            # Endpoints HTTP (map, zones, spots, ...)
│   └── sockets/           # Handlers de Socket.IO
├── data/                  # Archivo SQLite (generado, no se versiona)
├── .env.example
└── package.json
```

## Maqueta (modelo físico)

- **3 plazas** en **3 zonas** (una por zona): izquierda (A1), centro (B1) y derecha (C1).
- **2 pilares** con luces LED bicolor:
  - **Pilar izquierdo**: 2 luces (lado izquierdo → A1, lado derecho → B1).
  - **Pilar derecho**: 1 luz (→ C1).
- Total: **3 plazas, 2 pilares, 3 luces LED** (1 luz por plaza). La cámara lee el
  color de cada luz (verde = libre, rojo = ocupado) para determinar el estado.

## Calibración (configurar el estacionamiento)

El backend es **genérico**: no fija cuántas plazas, zonas, pilares o luces hay.
La configuración se define en la pantalla de calibración de la app (React), que
muestra lo que ve la cámara y permite **marcar** cada plaza (clickeando sus
esquinas), zonas, pilares, luces y caminos. Ese mapa se envía al backend con
`PUT /api/map`.

```
Cámara → calibración (marcar plazas/zonas/luces/caminos) → PUT /api/map → la app usa GET /api/map
```

- Cada **plaza** se marca con su contorno `polygon` (array de puntos). El backend
  calcula solo el centro (`x`, `y`), usado por el grafo de navegación.
- El **peso de cada arista** se calcula solo como la distancia entre sus nodos,
  salvo que se envíe explícitamente.
- Los datos de `npm run seed` son solo un **ejemplo** (la maqueta de 3 plazas);
  un estacionamiento real se carga mediante calibración.

## Modelo de datos

| Tabla    | Descripción                                                        |
|----------|--------------------------------------------------------------------|
| `zones`  | Zonas del estacionamiento (A, B y C).                              |
| `spots`  | Plazas: número, zona, estado (`libre`/`ocupado`), posición (x,y) y contorno (polygon). |
| `pillars`| Pilares físicos que sostienen las luces LED (2 en la maqueta).      |
| `lights` | Luces LED bicolor (1 por plaza): pilar, lado y posición.             |
| `nodes`  | Nodos del grafo de navegación (entrada, cruces, accesos, plazas).  |
| `edges`  | Aristas no dirigidas entre nodos, con peso (distancia).            |
| `vehicle`| Estado del vehículo: posición/orientación (ArUco) y plaza guardada.|
| `map_config` | Metadatos de calibración: nombre, resolución, escala y homografía. |

## API (contrato actual)

| Método | Ruta             | Descripción                                        |
|--------|------------------|----------------------------------------------------|
| GET    | `/api/health`    | Estado del servicio.                               |
| GET    | `/api/map`       | Mapa completo: zonas, plazas, pilares, luces, nodos y aristas. |
| GET    | `/api/zones`     | Listado de zonas.                                  |
| GET    | `/api/spots`     | Plazas con su estado. Admite `?zone=<id>`          |
| PUT    | `/api/map`       | Reemplaza el mapa completo (resultado de la calibración). |
| GET    | `/api/config`    | Metadatos de la calibración.                        |
| PUT    | `/api/config`    | Actualiza los metadatos de la calibración.          |
| PUT    | `/api/spots/:id/status` | Cambia el estado de una plaza (`libre`/`ocupado`). |
| POST   | `/api/vision/spots` | OpenCV envía los estados detectados de las plazas. |
| POST   | `/api/vision/vehicle` | OpenCV envía posición/orientación del vehículo. |
| GET    | `/api/vehicle`   | Estado actual del vehículo.                         |
| POST   | `/api/route`     | Ruta más corta entre dos nodos (Dijkstra). Body: `{from,to}` |
| POST   | `/api/route/free-spot` | Plaza libre más cercana. Body: `{from?}`      |
| POST   | `/api/vehicle/park` | Guarda la plaza donde estacionó. Body: `{spot}`   |
| GET    | `/api/vehicle/parking` | "Dónde está mi vehículo".                       |

### Socket.IO (eventos actuales)

| Evento             | Dirección          | Descripción                                      |
|--------------------|--------------------|--------------------------------------------------|
| `map:snapshot`     | servidor → cliente | Estado completo del mapa al conectarse.          |
| `vehicle:snapshot` | servidor → cliente | Estado del vehículo al conectarse.               |
| `spot:update`      | servidor → cliente | Una plaza cambió de estado.                      |
| `vehicle:update`   | servidor → cliente | La posición/estado del vehículo cambió.          |

## Próximos pasos (roadmap)

1. Pruebas (plan de pruebas de la Fase 3) y datos de ejemplo para el frontend.
