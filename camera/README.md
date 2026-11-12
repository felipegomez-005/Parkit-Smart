# ParkIt Smart – Sistema de cámara

Lee el color (verde = disponible, rojo = ocupada) de P1 y P2 y detecta marcadores ArUco
para saber qué auto está en cada plaza. Funciona solo, sin necesitar el backend; el envío a la app
se activa después con un interruptor en `config.json`.

## 1. Instalación (una sola vez)
Requiere Python 3.9 o superior.
```
cd camera
python -m pip install -r requirements.txt
```

## 2. Montaje físico
- Cámara **fija** (trípode o soporte), con P1 y P2 completas a la vista. Si se mueve, hay que recalibrar.
- Luz pareja, sin reflejos fuertes sobre los indicadores ni los marcadores.
- Cada plaza necesita un **indicador de color** (LED difuminado con papel, o una tarjeta verde/roja) que la cámara vea sin que el auto lo tape.
- Si es posible, bloquea la exposición y el balance de blancos de la cámara (en el software de la cámara). Si cambian solos, los colores se corren.

## 3. Marcadores ArUco
Puedes usar [el ArUco ID 0 incluido](marker_00.png) o generar otros.
```
python generate_markers.py --count 2 --size 600
```
Imprime los PNG de la carpeta `markers/` en papel **mate**, sin recortar el borde blanco.
Un ID distinto por auto. Pruébalos a la distancia real: cada marcador debe verse de al menos ~50 px por lado en la imagen.

## 4. Fuente de video
En `config.json`, `camera_source`:
- `0` = primera cámara USB/webcam (si no abre, prueba `1`).
- Un celular como cámara IP (app "IP Webcam" o similar): `"http://192.168.x.x:8080/video"`.
- Una cámara digital "normal" sin salida USB de video no sirve en vivo; necesita modo webcam/HDMI con capturadora.

## 5. Calibración
```
python calibrate.py
```
Se abre la cámara; pulsa **ESPACIO** para capturar. Para cada plaza dibujas dos rectángulos (ENTER confirma):
1. La **zona completa** de la plaza (donde queda el auto): sirve para asignar marcadores.
2. El **indicador de color**: solo la parte roja/verde.

Resultado: `rois.json` y una vista previa `calibracion.jpg`. Repite la calibraci?n si cambias de c?mara, posici?n o encuadre. La lista `spot_ids` en `config.json` determina qu? plazas se calibran y se monitorean.

## 6. Ajustar colores (si algo se lee mal)
```
python tune_color.py
```
Haz clic en el indicador para ver su valor HSV y revisa las ventanas de máscara. Cambia los rangos en `config.json` (`color`). El rojo tiene dos rangos porque en HSV está en ambos extremos del tono.

## 7. Ejecutar
```
python monitor.py --show          # con ventana, para probar (Q para salir)
python monitor.py                 # sin ventana, para dejarlo corriendo
python monitor.py --image foto.jpg --save-annotated salida.jpg   # probar con una foto
```
Un cambio se confirma recién tras `stability_frames` lecturas iguales seguidas (por defecto 5), para evitar parpadeos.
Cada cambio queda en `state.json`.

## 8. Formato de salida (contrato para integrarlo con la app)
```json
{
  "timestamp": "2026-11-11T15:30:00+00:00",
  "spots": [
    {"id": "P1", "status": "available", "markerId": null, "conflict": false},
    {"id": "P2", "status": "occupied",  "markerId": 3,    "conflict": false}
  ],
  "markers": [{"markerId": 3, "spotId": "P2"}]
}
```
- `status`: `available` | `occupied` | `unknown`.
- `markerId`: auto detectado dentro de la plaza.
- `conflict`: hay auto en la plaza pero el indicador dice "disponible".
- `markers[].spotId` es `null` si el auto se ve pero no está dentro de ninguna plaza.

## 9. Actualizar el mapa publicado

Primero verifica la detecci?n de P1 y P2 con el env?o desactivado. Despu?s cambia
`backend.enabled` a `true` en `config.json` y reinicia el monitor. La URL incluida
apunta a la p?gina publicada del equipo. Para un backend local, usa
`http://127.0.0.1:3000/api/vision/spots`.

El monitor env?a `available` como `libre` y `occupied` como `ocupado`. Si el color
es `unknown`, conserva el ?ltimo estado de esa plaza en la p?gina. El ArUco y
los conflictos quedan en el monitor y en `state.json`.

Si Python en Windows no reconoce el certificado HTTPS, usa Python 3.10 o superior
e inicia el monitor con el almac?n de certificados de Windows:

```powershell
python -m pip install truststore
python -c "import truststore; truststore.inject_into_ssl(); import runpy; runpy.run_path('monitor.py', run_name='__main__')" --show
```

Para probar el env?o sin actualizar el mapa publicado, usa `python mock_backend.py`
en otra terminal y configura la URL local antes de activar el env?o.

## Problemas frecuentes
| Síntoma | Causa probable |
|---|---|
| Plaza siempre `unknown` | Rangos HSV mal ajustados o ROI de color mal dibujada: usa `tune_color.py`. |
| Rojo/verde se confunden | Cambio de luz o exposición automática. Bloquéala y recalibra. |
| ArUco no se detecta | Marcador muy pequeño en la imagen, papel brillante o borde blanco recortado. |
| No abre la cámara | Cambia `camera_source` (0, 1, 2…) y cierra otras apps que la usen. |
