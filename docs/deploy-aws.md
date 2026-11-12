# Despliegue en AWS Academy (Ubuntu)

Guía para correr **todo el stack** (backend + frontend) en una instancia EC2 de AWS
Academy. El backend sirve también el frontend compilado, así que **un solo proceso**
expone la aplicación completa en el puerto `3000`.

## Requisitos previos

- Llave `.pem` descargada al crear la instancia.
- IP pública de la instancia (panel EC2 → Instancias → "IPv4 pública").
- Usuario: `ubuntu` (imágenes oficiales de Ubuntu).

## 1. Conectarse por SSH (desde PowerShell en Windows)

```powershell
ssh -i "C:\ruta\a\mi-llave.pem" ubuntu@IP_PUBLICA
```

- La primera vez pregunta si confiar en el host: escribe `yes`.
- Si da error de permisos de la llave (más común en Linux/macOS), ejecuta:
  `chmod 400 mi-llave.pem` y reintenta.

## 2. Instalar Node.js, git y herramientas

```bash
sudo apt update
sudo apt install -y git curl

# Node.js 22 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v   # debe mostrar v22.x
npm -v
```

## 3. Clonar el repositorio

```bash
git clone https://github.com/felipegomez-005/Parkit-Smart.git
cd Parkit-Smart
```

> El repositorio es público, por lo que clona sin credenciales.

## 4. Backend: instalar dependencias y datos de ejemplo

```bash
npm install
npm run seed
```

## 5. Frontend: instalar y compilar (misma URL que el backend)

```bash
cd frontend
npm install
npm run build
cd ..
```

> No se define `VITE_API_URL`, por lo que el frontend usa la **misma URL** del backend
> (correcto para producción). El resultado queda en `frontend/dist`.

## 6. Arrancar la aplicación

```bash
npm start
```

La aplicación completa queda disponible en:

```
http://IP_PUBLICA:3000
```

El backend sirve la interfaz (`/`) y la API (`/api/*`) desde el mismo puerto.

## 7. Abrir el puerto 3000 en el Security Group

En la consola AWS: **EC2 → Instancias → Security → Grupos de seguridad → Editar reglas
de entrada → Agregar regla**:

| Tipo | Puerto | Origen |
|------|--------|--------|
| TCP personalizado | 3000 | `0.0.0.0/0` (o `Mi IP`) |

Sin esto, el navegador no podrá entrar a la aplicación.

## 8. Mantener la app corriendo con pm2 (recomendado)

`npm start` se detiene al cerrar la sesión SSH. Para dejarla siempre activa:

```bash
sudo npm install -g pm2
pm2 start src/server.js --name parkit
pm2 save
pm2 startup   # seguir las instrucciones que imprime
```

Reiniciar tras cambios:

```bash
pm2 restart parkit
```

## Actualizar la aplicación (tras subir cambios al repo)

```bash
cd Parkit-Smart
git pull
npm install
cd frontend && npm install && npm run build && cd ..
npm run seed          # necesario si cambió el plano/grafo (src/db/seed.js); reinicia plazas y vehículo
pm2 restart parkit
```

## Configuración (opcional)

El backend lee variables de entorno (ver `.env.example`):

- `PORT` (por defecto 3000)
- `HOST` (por defecto `0.0.0.0`, correcto para AWS)
- `JWT_SECRET` (cámbialo en producción)
- `JWT_EXPIRES_IN`

Para crear un `.env` en el servidor:

```bash
cp .env.example .env
nano .env
```

## Notas

- La IP pública de una instancia de AWS Academy **puede cambiar al reiniciarla** (salvo
  que uses una Elastic IP). Si un día no entra, revisa la IP actual.
- La base de datos (SQLite) vive en `data/parkit.db`; `npm run seed` la reinicia.
