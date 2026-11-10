# ParkIt Smart — Frontend

Frontend React + Vite para la maqueta subterránea de ParkIt Smart. La interfaz toma como referencia la estética clara y minimalista de Apple Maps, pero utiliza un plano SVG propio (no un mapa geográfico externo).

## Requisitos

- Node.js 22.13 o superior (el backend lo requiere).
- npm.

## Ejecutar el proyecto

Abre dos terminales desde la carpeta raíz del repositorio.

### 1. Backend

```bash
npm install
npm run seed
npm run dev
```

El backend queda disponible en `http://localhost:3000`.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Vite mostrará la dirección local, normalmente `http://localhost:5173`.

En Windows PowerShell, para crear el archivo de entorno:

```powershell
Copy-Item .env.example .env
```

Si el backend corre en otra dirección, cambia `VITE_API_URL` en `frontend/.env`.

## Funciones incluidas

- Plano interactivo con seis plazas: P1–P6, agrupadas en los sectores A, B y C.
- Selección de plaza desde el mapa o desde el listado lateral.
- Estados disponible/ocupada conectados a la API.
- Cálculo de ruta mediante `POST /api/route` (Dijkstra) y búsqueda de plaza libre mediante `POST /api/route/free-spot`.
- Registro y retiro del vehículo mediante los endpoints existentes.
- Actualización de mapa, plazas y vehículo mediante Socket.IO.
- Modo demostración cuando la API no está disponible.

## Plano y coordenadas

El componente `src/components/ParkingMap.jsx` dibuja el plano con SVG en un `viewBox` de `688 × 388`. Las coordenadas de plazas y nodos del seed del backend utilizan ese mismo sistema. Para modificar la distribución visual, actualiza el SVG y los datos de `src/db/seed.js` manteniendo la correspondencia de coordenadas.

## Notas

- `npm run seed` vuelve a cargar el mapa de demostración y restablece el estado del vehículo. No lo ejecutes si ya tienes datos reales que quieras conservar.
- La primera versión incluye un plano vectorial estilizado basado en la imagen de referencia; no es todavía una reconstrucción fotogramétrica de la maqueta.
- Los cambios de estado de las plazas se guardan en el backend cuando existe conexión. En modo demostración, los cambios solo viven en el estado del navegador.
