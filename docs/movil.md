# Camino a móvil (Capacitor)

Guía para convertir el frontend de ParkIt en una app móvil (Android/iOS) **sin cambiar la
arquitectura**. La página web **es** la app: Capacitor envuelve la web compilada en un
WebView nativo. Por eso no existe un "frontend web" y un "frontend móvil" separados.

## Bases ya listas

El backend y el kit del frontend ya están preparados para móvil:

- **URL configurable**: `frontend/src/lib/api.js` y `socket.js` usan `VITE_API_URL`.
- **Backend accesible**: escucha en `0.0.0.0` (config `HOST`), así un teléfono puede llegar por la red local.
- **CORS abierto** (`*`).
- **HTTP + WebSocket** (Socket.IO).
- **`/api/health`** para que la app verifique conexión al servidor.

## Lo único que NO hay que hacer

No hardcodear `http://localhost:3000` en el frontend. En el teléfono, `localhost` es el
propio teléfono, no el PC. Usar siempre `VITE_API_URL`.

## Pasos

1. Construir el frontend en React (normal, como web).
2. Instalar Capacitor:

   ```bash
   npm i @capacitor/core @capacitor/cli
   npx cap init ParkIt com.parkit.app --web-dir dist
   npm i @capacitor/android @capacitor/ios
   npx cap add android      # y/o  npx cap add ios
   ```

3. Compilar y sincronizar:

   ```bash
   npm run build
   npx cap sync
   ```

4. Abrir en el IDE nativo:

   ```bash
   npx cap open android     # Android Studio
   npx cap open ios         # Xcode
   ```

## Probar en el teléfono (misma red Wi-Fi)

Apuntar a la IP del PC (no `localhost`):

```
# .env  (o .env.production)
VITE_API_URL=http://192.168.1.20:3000
```

Para conocer la IP del PC en Windows: `ipconfig` y buscar "Dirección IPv4". El teléfono y
el PC deben estar en la misma red.

## Gotcha de Android (http en desarrollo)

Android bloquea `http://` (no-https) por defecto. Para desarrollo, activar
`usesCleartextTraffic` en `android/app/src/main/AndroidManifest.xml`:

```xml
<application
    android:usesCleartextTraffic="true"
    ... >
```

En producción se usa `https://` y se quita esa línea.

## Token JWT

El token se guarda en `localStorage`, que funciona dentro del WebView. Para algo más
robusto a futuro, se puede migrar a `@capacitor/preferences`.

## capacitor.config de ejemplo

```json
{
  "appId": "com.parkit.app",
  "appName": "ParkIt",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  }
}
```

> `androidScheme: "https"` hace que el WebView sirva la app por `https://localhost`,
> lo que convive con llamar al backend por `http://` (para eso está `usesCleartextTraffic`).
