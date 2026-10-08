# Contrato de API — ParkIt (backend ↔ frontend)

> Documento para **Cristian** (frontend). Define exactamente qué espera el backend
> y qué devuelve, para que la app de React pueda conectarse sin fricción.

## Datos básicos

- **Base URL (desarrollo):** `http://localhost:3000`
- **Formato:** todo es JSON.
- **Coordenadas:** `(x, y)` en un plano 2D con unidades arbitrarias. Las define la
  calibración (el "mundo" del mapa). No hay restricción de rango.

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
    { "number": "A1", "zone": "Zona A", "polygon": [[-13, 18], [-7, 18], [-7, 22], [-13, 22]] },
    { "number": "B1", "zone": "Zona B", "polygon": [[-3, 18], [3, 18], [3, 22], [-3, 22]] },
    { "number": "C1", "zone": "Zona C", "polygon": [[7, 18], [13, 18], [13, 22], [7, 22]] }
  ],
  "pillars": [
    { "name": "Pilar izquierdo", "x": -5, "y": 17 },
    { "name": "Pilar derecho", "x": 10, "y": 17 }
  ],
  "lights": [
    { "spot": "A1", "pillar": "Pilar izquierdo", "side": "izquierda", "x": -6, "y": 17 },
    { "spot": "B1", "pillar": "Pilar izquierdo", "side": "derecha", "x": -4, "y": 17 },
    { "spot": "C1", "pillar": "Pilar derecho", "x": 10, "y": 17 }
  ],
  "nodes": [
    { "label": "Entrada", "type": "entrada", "x": 0, "y": 0 },
    { "label": "Cruce central", "type": "cruce", "x": 0, "y": 10 },
    { "label": "Plaza A1", "type": "plaza", "x": -10, "y": 20, "spot": "A1" },
    { "label": "Plaza B1", "type": "plaza", "x": 0, "y": 20, "spot": "B1" },
    { "label": "Plaza C1", "type": "plaza", "x": 10, "y": 20, "spot": "C1" }
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
      "x": -10,
      "y": 20,
      "polygon": [[-13, 18], [-7, 18], [-7, 22], [-13, 22]],
      "updated_at": "2026-10-07T21:44:04.600Z"
    }
  ],
  "pillars": [
    { "id": 1, "name": "Pilar izquierdo", "x": -5, "y": 17 }
  ],
  "lights": [
    {
      "id": 1,
      "pillar_id": 1,
      "spot_id": 1,
      "side": "izquierda",
      "x": -6,
      "y": 17,
      "pillar_name": "Pilar izquierdo",
      "spot_number": "A1"
    }
  ],
  "nodes": [
    { "id": 1, "label": "Entrada", "type": "entrada", "x": 0, "y": 0, "spot_id": null, "zone_id": null }
  ],
  "edges": [
    { "id": 1, "node_a": 1, "node_b": 2, "weight": 10 }
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
    "status": "libre", "x": -10, "y": 20, "polygon": [[-13,18],[-7,18],[-7,22],[-13,22]],
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
  "image_width": 1920,
  "image_height": 1080,
  "scale": null,
  "homography": null,
  "updated_at": "..."
}
```

### PUT /api/config

Envía los campos que quieras actualizar (p.ej. `{ "scale": 0.5, "homography": [...] }`)
y devuelve la config actualizada.

---

## Socket.IO (tiempo real)

- URL: `http://localhost:3000` (mismo puerto).
- Al conectarse, el servidor envía:

| Evento | Dirección | Contenido |
|--------|-----------|-----------|
| `map:snapshot` | servidor → cliente | El mapa completo (igual a `GET /api/map`). |

> Eventos futuros (próximo paso): `spot:update` y `vehicle:update`, para que el mapa
> se refresque en vivo cuando cambie el estado de una plaza o la posición del auto.

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
