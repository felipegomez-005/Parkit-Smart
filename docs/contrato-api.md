# Contrato de API — ParkIt (backend ↔ frontend)

> Documento para **Cristian** (frontend). Define exactamente qué espera el backend
> y qué devuelve, para que la app de React pueda conectarse sin fricción.

## Datos básicos

- **Base URL (desarrollo):** `http://localhost:3000`
- **Formato:** todo es JSON.
- **Coordenadas:** todas las coordenadas (plazas, nodos, pilares, luces, vehículo y
  rutas) están en el espacio del **plano de 688 de ancho por 388 de alto**:
  - Origen `(0, 0)` arriba a la izquierda; `x` crece hacia la derecha e `y` hacia abajo.
  - Rango esperado: `0 ≤ x ≤ 688` y `0 ≤ y ≤ 388`.
  - **Orientación del vehículo:** `0°` apunta hacia arriba y crece en sentido horario
    (`90°` apunta a la derecha, `180°` abajo, `270°` a la izquierda).
- **Nota para el script de visión:** la cámara entrega **píxeles**; antes de llamar a
  `POST /api/vision/vehicle` y `POST /api/vision/spots` hay que convertirlos a estas
  coordenadas del plano (688×388).

## Conceptos del modelo

| Concepto | Qué es | Notas |
|----------|--------|-------|
| `zone` (zona) | Agrupación de plazas | Ej. "Zona A", "Zona B" |
| `spot` (plaza) | Un lugar de estacionamiento | Tiene `polygon` (contorno) y `x`,`y` (centro, **calculado por el backend**) |
| `pillar` (pilar) | Soporte físico de luces | Puede tener 1 o varias luces |
| `light` (luz) | LED bicolor que indica el estado de **una** plaza | Verde = libre · Rojo = ocupado |
| `node` (nodo) | Punto del grafo de navegación | Tipos: `entrada`, `salida`, `acceso`, `cruce`, `plaza` |
| `edge` (arista) | Camino entre dos nodos | El `weight` (distancia) **se calcula solo** si no se envía |

## Endpoints

| Método | Ruta | Qué hace |
|--------|------|----------|
| GET | `/api/health` | Estado del servicio (para probar la conexión). |
| GET | `/api/map` | Mapa completo (zonas, plazas, pilares, luces, nodos, aristas). |
| PUT | `/api/map` | **Reemplaza el mapa completo** (resultado de la calibración). |
| GET | `/api/zones` | Lista de zonas. |
| GET | `/api/spots` | Lista de plazas con su estado. Admite `?zone=<id>`. |
| GET | `/api/config` | Metadatos de calibración (nombre, resolución, escala, homografía). |
| PUT | `/api/config` | Actualiza los metadatos de calibración. |
| PUT | `/api/spots/:id/status` | Cambia el estado de una plaza. Body: `{ "status": "libre" \| "ocupado" }`. |
| POST | `/api/vision/spots` | OpenCV envía los estados detectados. Body: `{ "spots": [{ "number", "status" }] }`. |
| POST | `/api/vision/vehicle` | OpenCV envía posición/orientación. Body: `{ x, y, orientation, status? }`. |
| GET | `/api/vehicle` | Estado actual del vehículo. |
| POST | `/api/route` | Ruta más corta entre dos nodos (Dijkstra). Body: `{ from, to }`. |
| POST | `/api/route/free-spot` | Plaza libre más cercana (desde la entrada por defecto). Body: `{ from? }`. |
| POST | `/api/vehicle/park` | Guarda la plaza donde estacionó. Body: `{ spot: "A1" }`. |
| GET | `/api/vehicle/parking` | "Dónde está mi vehículo" (vehículo + plaza guardada). |
| POST | `/api/vehicle/unpark` | Libera la plaza guardada (el vehículo se va). |
| POST | `/api/reset` | Restaura el estado de demostración (plazas libres, vehículo desconectado). |
| POST | `/api/auth/register` | Crea una cuenta. Body: `{ name, email, password }`. |
| POST | `/api/auth/login` | Inicia sesión. Body: `{ email, password }` → devuelve `{ token, user }`. |
| GET | `/api/auth/me` | Usuario actual (requiere `Authorization: Bearer <token>`). |

---

## Autenticación (registro e inicio de sesión)

La app móvil usa **JWT**. Al registrarse o iniciar sesión, el backend devuelve un
`token` que el cliente envía en las peticiones protegidas con la cabecera
`Authorization: Bearer <token>`.

### POST /api/auth/register

```json
{ "name": "Felipe Gomez", "email": "felipe@test.com", "password": "secreto123" }
```

Respuesta `201`:

```json
{ "token": "...", "user": { "id": 1, "name": "Felipe Gomez", "email": "felipe@test.com" } }
```

- `email` debe ser único y válido; `password` debe tener al menos 6 caracteres.
- El correo ya registrado responde `409`.

### POST /api/auth/login

```json
{ "email": "felipe@test.com", "password": "secreto123" }
```

Respuesta `200`: igual que register (`{ token, user }`). Credenciales inválidas → `401`.

### GET /api/auth/me

Devuelve el usuario del token:

```
Authorization: Bearer <token>
```

```json
{ "user": { "id": 1, "name": "Felipe Gomez", "email": "felipe@test.com" } }
```

Sin token o token inválido → `401`.

---

## PUT /api/map — la calibración

La pantalla de calibración marca el mapa y, al terminar, lo envía **todo de una vez**
con `PUT /api/map`. El backend **reemplaza** el mapa anterior por el nuevo (operación
atómica).

### Reglas importantes

1. Las **referencias son por nombre/número**, no por id:
   - `spots[].zone` → `name` de una zona.
   - `lights[].spot` → `number` de una plaza · `lights[].pillar` → `name` de un pilar.
   - `nodes[].spot` (opcional) → `number` de una plaza.
   - `edges[].from` / `edges[].to` → `label` de un nodo.
2. **No calcules nada de geometría, el backend lo hace:**
   - Una `spot` puede enviar **solo su `polygon`** (array de puntos); el backend calcula
     el centro (`x`,`y`) promediando las esquinas.
   - Una `edge` puede **omitir `weight`**; el backend lo calcula como la distancia entre
     sus dos nodos.
3. `nodes` y `edges` son **opcionales** (se usan para la navegación con Dijkstra).
   Si no se envían, el mapa se guarda sin grafo.
4. Si algo está mal, responde **`400`** con la lista de errores en el campo `details`.

### Body de ejemplo (maqueta de 3 plazas)

```json
{
  "zones": [
    { "name": "Zona A", "description": "Plaza izquierda (A1)" },
    { "name": "Zona B", "description": "Plaza del centro (B1)" },
    { "name": "Zona C", "description": "Plaza derecha (C1)" }
  ],
  "spots": [
    { "number": "A1", "zone": "Zona A", "polygon": [[214, 220], [274, 220], [274, 260], [214, 260]] },
    { "number": "B1", "zone": "Zona B", "polygon": [[314, 220], [374, 220], [374, 260], [314, 260]] },
    { "number": "C1", "zone": "Zona C", "polygon": [[414, 220], [474, 220], [474, 260], [414, 260]] }
  ],
  "pillars": [
    { "name": "Pilar izquierdo", "x": 294, "y": 210 },
    { "name": "Pilar derecho", "x": 444, "y": 210 }
  ],
  "lights": [
    { "spot": "A1", "pillar": "Pilar izquierdo", "side": "izquierda", "x": 284, "y": 210 },
    { "spot": "B1", "pillar": "Pilar izquierdo", "side": "derecha", "x": 304, "y": 210 },
    { "spot": "C1", "pillar": "Pilar derecho", "x": 444, "y": 210 }
  ],
  "nodes": [
    { "label": "Entrada", "type": "entrada", "x": 344, "y": 40 },
    { "label": "Cruce central", "type": "cruce", "x": 344, "y": 140 },
    { "label": "Plaza A1", "type": "plaza", "x": 244, "y": 240, "spot": "A1" },
    { "label": "Plaza B1", "type": "plaza", "x": 344, "y": 240, "spot": "B1" },
    { "label": "Plaza C1", "type": "plaza", "x": 444, "y": 240, "spot": "C1" }
  ],
  "edges": [
    { "from": "Entrada", "to": "Cruce central" },
    { "from": "Cruce central", "to": "Plaza A1" },
    { "from": "Cruce central", "to": "Plaza B1" },
    { "from": "Cruce central", "to": "Plaza C1" }
  ]
}
```

### Notas sobre el body

- `side` en una luz es opcional (`"izquierda"`, `"derecha"` o `null`). Sirve cuando un
  mismo pilar tiene dos luces y hay que distinguir cuál es cuál.
- `nodes[].type` puede ser `entrada | salida | acceso | cruce | plaza`. Si se omite,
  queda `cruce`.
- `description`, `label` y `side` son opcionales.

### Respuesta exitosa

Devuelve el mapa **ya guardado**, con el mismo formato de `GET /api/map` (con ids,
centros calculados y pesos de aristas ya puestos).

### Respuesta de error (ejemplo)

```json
{
  "error": "Mapa inválido",
  "details": ["La plaza \"X\" referencia una zona inexistente: \"Zona Z\"."]
}
```

---

## GET /api/map — leer el mapa

Devuelve el mapa completo. **Ejemplo** (recortado):

```json
{
  "zones": [
    { "id": 1, "name": "Zona A", "description": "Plaza izquierda (A1)" }
  ],
  "spots": [
    {
      "id": 1,
      "zone_id": 1,
      "zone_name": "Zona A",
      "number": "A1",
      "label": "Plaza A1",
      "status": "libre",
      "x": 244,
      "y": 240,
      "polygon": [[214, 220], [274, 220], [274, 260], [214, 260]],
      "updated_at": "2026-10-07T21:44:04.600Z"
    }
  ],
  "pillars": [
    { "id": 1, "name": "Pilar izquierdo", "x": 294, "y": 210 }
  ],
  "lights": [
    {
      "id": 1,
      "pillar_id": 1,
      "spot_id": 1,
      "side": "izquierda",
      "x": 284,
      "y": 210,
      "pillar_name": "Pilar izquierdo",
      "spot_number": "A1"
    }
  ],
  "nodes": [
    { "id": 1, "label": "Entrada", "type": "entrada", "x": 344, "y": 40, "spot_id": null, "zone_id": null }
  ],
  "edges": [
    { "id": 1, "node_a": 1, "node_b": 2, "weight": 100 }
  ]
}
```

> `polygon` viene como **array** (ya parseado). El campo `status` de cada plaza es
> `"libre"` o `"ocupado"`.

---

## Otros endpoints

### GET /api/zones

```json
[ { "id": 1, "name": "Zona A", "description": "Plaza izquierda (A1)" } ]
```

### GET /api/spots

```json
[
  {
    "id": 1, "zone_id": 1, "number": "A1", "label": "Plaza A1",
    "status": "libre", "x": 244, "y": 240, "polygon": [[214,220],[274,220],[274,260],[214,260]],
    "zone_name": "Zona A", "updated_at": "..."
  }
]
```

Con filtro: `GET /api/spots?zone=1` devuelve solo las plazas de esa zona.

### GET /api/config

```json
{
  "id": 1,
  "name": "Maqueta ParkIt",
  "image_width": 688,
  "image_height": 388,
  "scale": null,
  "homography": null,
  "updated_at": "..."
}
```

`image_width` e `image_height` son el tamaño del plano (688×388), el espacio de
coordenadas del resto de la API; no la resolución de la cámara.

### PUT /api/config

Envía los campos que quieras actualizar (p.ej. `{ "scale": 0.5, "homography": [...] }`)
y devuelve la config actualizada.

### PUT /api/spots/:id/status — cambiar estado de una plaza

```json
{ "status": "ocupado" }
```

- `status` solo puede ser `"libre"` o `"ocupado"` (si no, `400`).
- Si la plaza no existe → `404`.
- Devuelve la plaza actualizada. Si el estado no cambió, **no emite evento**.

### POST /api/vision/spots — ingest de visión (estados)

La cámara (OpenCV) envía los estados detectados. El backend actualiza las plazas y
**emite `spot:update` por cada plaza que cambió**.

```json
{
  "spots": [
    { "number": "A1", "status": "ocupado" },
    { "number": "B1", "status": "libre" }
  ]
}
```

- Devuelve un array con las plazas actualizadas.
- Si alguna referencia es inválida (número inexistente o estado inválido) → `400`
  con la lista de errores en `details`.

### POST /api/vision/vehicle — ingest de visión (vehículo)

La cámara (ArUco) envía la posición y orientación del auto. El backend guarda y
**emite `vehicle:update`**.

```json
{ "x": 354, "y": 140, "orientation": 90 }
```

- `x`, `y` en coordenadas del plano (688×388). `orientation` en grados: `0°` arriba, creciendo en sentido horario (`90°` = derecha). `status` es opcional (`buscando` por defecto; si el vehículo está `estacionado` y no se envía `status`, se conserva `estacionado` y su plaza).
- Devuelve el estado del vehículo actualizado.

### GET /api/vehicle

```json
{
  "id": 1,
  "status": "buscando",
  "position_x": 354,
  "position_y": 140,
  "orientation": 90,
  "parked_spot_id": null,
  "updated_at": "..."
}
```

---

## Navegación y vehículo

### POST /api/route — ruta más corta entre dos nodos

Calcula la ruta más corta (Dijkstra) entre dos nodos, referenciados por su `label`
o por su `id`.

```json
{ "from": "Entrada", "to": "Plaza A1" }
```

Respuesta:

```json
{
  "from": { "id": 1, "label": "Entrada", "type": "entrada", "x": 344, "y": 40 },
  "to": { "id": 3, "label": "Plaza A1", "type": "plaza", "x": 244, "y": 240 },
  "distance": 241.42,
  "path": [
    { "id": 1, "label": "Entrada", "type": "entrada", "x": 344, "y": 40, "instruction": "inicio" },
    { "id": 2, "label": "Cruce central", "type": "cruce", "x": 344, "y": 140, "instruction": "izquierda" },
    { "id": 3, "label": "Plaza A1", "type": "plaza", "x": 244, "y": 240, "instruction": "destino" }
  ]
}
```

- `distance` es la suma de los pesos de las aristas.
- `path` es la lista ordenada de nodos (con sus coordenadas para dibujar la línea).
- Cada nodo del `path` incluye `instruction`: `inicio`, `recto`, `izquierda`,
  `derecha` o `destino`. Sirve para mostrar las indicaciones de giro.
- Si un nodo no existe o no hay ruta → `404`.
- Si `from` no viene o está vacío, se usa `"Entrada"` por defecto.
- **Origen desde el vehículo:** `"from": "vehicle"` usa la posición actual del
  vehículo (`position_x`, `position_y`), la lleva al nodo del grafo más cercano
  (distancia euclidiana) y parte desde ahí. El `from` de la respuesta es ese nodo.
  Si el vehículo no tiene posición → `400` con `{ "error": "..." }`.
- **Ruta de regreso al vehículo:** `"to": "parked"` usa la plaza guardada del
  vehículo (la misma de `GET /api/vehicle/parking`), toma su nodo `Plaza X` como
  destino y calcula la ruta desde `from` (por defecto `Entrada`). El `to` de la
  respuesta es ese nodo. Si no hay plaza guardada → `404` con
  `{ "error": "No hay una plaza guardada para el vehículo; no se puede usar to=parked." }`.
  Se puede combinar con `"from": "vehicle"`. Cualquier otro valor de `to` funciona igual que antes.

```json
{ "from": "Entrada", "to": "parked" }
```

### POST /api/route/free-spot — plaza libre más cercana

Encuentra la plaza libre más cercana a un nodo (por defecto la **entrada**) y
devuelve la ruta hasta ella.

```json
{ "from": "Entrada" }
```

Respuesta:

```json
{
  "from": { "id": 1, "label": "Entrada", "type": "entrada", "x": 344, "y": 40 },
  "spot": { "number": "B1", "status": "libre" },
  "distance": 200,
  "path": [ "...nodos en orden..." ]
}
```

- Si no hay plazas libres → `404`.
- `"from": "vehicle"` funciona igual que en `/api/route`: parte desde el nodo más
  cercano a la posición actual del vehículo; sin posición → `400`.

### POST /api/vehicle/park — guardar plaza al estacionar

Guarda la plaza donde el vehículo estacionó y la marca como `ocupado` (para la demo;
en producción la ocupación la detecta la cámara).

```json
{ "spot": "A1" }
```

- Devuelve `{ vehicle, spot }`.
- Si la plaza no existe → `404`.
- Si la plaza ya está `ocupado` y no es la que este mismo vehículo ya tenía guardada → `409`.
- Si el vehículo tenía otra plaza guardada, esa se libera (`libre`) y se emite `spot:update`.
- Estacionar de nuevo en la misma plaza no da error.

### GET /api/vehicle/parking — "Dónde está mi vehículo"

Devuelve el vehículo y la plaza guardada (o `spot: null` si aún no estacionó).

```json
{
  "vehicle": { "id": 1, "status": "estacionado", "parked_spot_id": 1 },
  "spot": { "id": 1, "number": "A1", "label": "Plaza A1", "zone_name": "Zona A" }
}
```

---

## Socket.IO (tiempo real)

- URL: `http://localhost:3000` (mismo puerto).
- **Requiere autenticación**: hay que enviar el JWT obtenido en `POST /api/auth/login` (o `/register`) en `auth.token` del handshake:

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: { token }, // JWT de /api/auth/login
});

socket.on('connect_error', (err) => console.error(err.message)); // "Token inválido o ausente"
```

  Si el token falta o es inválido, la conexión se rechaza y el cliente recibe `connect_error` con el mensaje `Token inválido o ausente`. Las rutas REST de `/api/vision/*` siguen sin autenticación.
- Al conectarse, el servidor envía:

| Evento | Dirección | Contenido |
|--------|-----------|-----------|
| `map:snapshot` | servidor → cliente | El mapa completo (igual a `GET /api/map`), al conectarse. |
| `vehicle:snapshot` | servidor → cliente | El estado del vehículo, al conectarse. |
| `spot:update` | servidor → cliente | Una plaza cambió de estado (payload = la plaza actualizada). |
| `vehicle:update` | servidor → cliente | El estado del vehículo cambió (payload = el estado nuevo). |

---

## Flujo de calibración sugerido (pantalla en React)

1. `GET /api/map` para ver si ya hay un mapa (o arrancar vacío).
2. Mostrar el **video de la cámara** como fondo.
3. Marcar (con clics) en este orden:
   - **Zonas** (nombre + opcional descripción).
   - **Plazas**: clickear las **esquinas** de cada plaza → generar su `polygon`.
   - **Pilares** (puntos) y **luces** (un punto por plaza, asociada a su pilar).
   - **Nodos** del grafo (entrada, cruces) y **aristas** (unir nodos).
4. Armar el JSON y hacer `PUT /api/map`.
5. A partir de ahí, la app usa `GET /api/map` para dibujar el estacionamiento real.
