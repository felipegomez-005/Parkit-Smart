# ParkIt Smart

Aplicación de estacionamiento inteligente con backend Node.js/Express, SQLite y Socket.IO, más un frontend React + Vite.

## Requisitos

Node.js 22.13 o superior y npm.

## Backend

Desde la raíz:

```bash
npm install
npm run seed
npm run dev
```

API: `http://localhost:3000`.

## Frontend

En otra terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Abre la URL que indique Vite (por defecto `http://localhost:5173`). En Windows PowerShell usa `Copy-Item .env.example .env` en lugar de `cp`.

Configura `VITE_API_URL` en `frontend/.env` si el backend no está en `http://localhost:3000`.

## Interfaz

El frontend utiliza una estética clara inspirada en Apple Maps y un plano SVG personalizado de la maqueta: sectores A, B y C; plazas P1–P6; entrada inferior; pasillos, rampa y obstáculos. Permite seleccionar plazas, visualizar rutas Dijkstra, revisar disponibilidad y registrar/retirar el vehículo.

Consulta `frontend/README.md` para detalles del frontend y `docs/contrato-api.md` para el contrato de la API.

> `npm run seed` carga el plano de demostración y reinicia el estado del vehículo. No lo ejecutes sobre una base de datos con información que quieras conservar.
