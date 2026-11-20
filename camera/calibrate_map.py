"""Calibra el mapa: marca las 4 esquinas del PISO de la maqueta para que el auto (ArUco) se mueva en la app.

Uso:
    python calibrate_map.py                 # usa la ULTIMA imagen que tomo calibrate.py (mismo encuadre)
    python calibrate_map.py --camara        # captura una imagen nueva con la camara en vivo
    python calibrate_map.py --image foto.jpg

Haz clic en las 4 esquinas del piso (dentro de las paredes), en este orden:
    1) arriba-izquierda   2) arriba-derecha   3) abajo-derecha   4) abajo-izquierda
La esquina de abajo es el borde de la entrada (el lado sin pared).
Teclas: R = rehacer, ENTER = guardar, Q = salir.
"""
import argparse
import json
import os
import sys

import cv2
import numpy as np

from calibrate import grab_frame
from parkit_vision import load_config, to_plano

# Plano de la app: 688 x 388 unidades <-> carton de 77 x 55 cm.
# El piso va de x = 3 a 74 cm y de y = 3 a 55 cm (paredes de 3 cm arriba, izquierda y derecha).
PLANO_W, PLANO_H = 688.0, 388.0
SHEET_W, SHEET_H = 77.0, 55.0
PISO_X0, PISO_X1, PISO_Y0, PISO_Y1 = 3.0, 74.0, 3.0, 55.0
NOMBRES = ["ARRIBA-IZQUIERDA", "ARRIBA-DERECHA", "ABAJO-DERECHA", "ABAJO-IZQUIERDA"]


def cm_to_plano(x, y):
    return [x * PLANO_W / SHEET_W, y * PLANO_H / SHEET_H]


def ultima_imagen():
    """La imagen mas reciente que dejo calibrate.py (limpia si existe, si no la anotada)."""
    existentes = [p for p in ("calibracion_base.jpg", "calibracion.jpg") if os.path.exists(p)]
    return max(existentes, key=os.path.getmtime) if existentes else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--image", help="usar una foto en vez de la ultima calibracion")
    ap.add_argument("--camara", action="store_true", help="capturar con la camara en vivo")
    args = ap.parse_args()

    cfg = load_config(args.config)
    image = args.image
    if image is None and not args.camara:
        image = ultima_imagen()
        if image:
            print(f"Usando la imagen de la ultima calibracion: {image}")
        else:
            print("No hay imagen de calibracion previa: se usara la camara en vivo.")
    frame = grab_frame(cfg, image)
    dst = np.array([cm_to_plano(PISO_X0, PISO_Y0), cm_to_plano(PISO_X1, PISO_Y0),
                    cm_to_plano(PISO_X1, PISO_Y1), cm_to_plano(PISO_X0, PISO_Y1)], dtype=np.float32)
    pts = []

    def on_mouse(event, x, y, flags, param):
        if event == cv2.EVENT_LBUTTONDOWN and len(pts) < 4:
            pts.append((x, y))

    win = "Calibrar mapa"
    cv2.namedWindow(win)
    cv2.setMouseCallback(win, on_mouse)
    while True:
        view = frame.copy()
        for i, p in enumerate(pts):
            cv2.circle(view, p, 6, (0, 255, 255), -1)
            cv2.putText(view, str(i + 1), (p[0] + 8, p[1] - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        if len(pts) > 1:
            cv2.polylines(view, [np.array(pts, dtype=np.int32)], len(pts) == 4, (0, 255, 255), 2)
        msg = (f"Clic en la esquina {len(pts) + 1}: {NOMBRES[len(pts)]}" if len(pts) < 4
               else "ENTER = guardar | R = rehacer")
        cv2.putText(view, msg, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        cv2.imshow(win, view)
        key = cv2.waitKey(30) & 0xFF
        if key == ord("r"):
            pts.clear()
        elif key == ord("q"):
            sys.exit("Cancelado.")
        elif key in (13, 10) and len(pts) == 4:
            break
    cv2.destroyAllWindows()

    H = cv2.getPerspectiveTransform(np.array(pts, dtype=np.float32), dst)
    out = cfg.get("vehicle", {}).get("homography_file", "map_homography.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"matrix": H.tolist(), "points_px": pts, "points_plano": dst.tolist()}, f, indent=2)
    centro = to_plano(H.astype(np.float64), *np.mean(pts, axis=0))
    print(f"Listo. Guardado en {out}. El centro de lo marcado cae en el plano en x={centro[0]:.0f}, y={centro[1]:.0f}.")


if __name__ == "__main__":
    main()
