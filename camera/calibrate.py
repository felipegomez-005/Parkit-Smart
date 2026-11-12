"""Calibración: dibuja con el mouse, para cada plaza, su zona completa y su indicador de color.

Uso:
    python calibrate.py                 # con la cámara en vivo (ESPACIO captura)
    python calibrate.py --image foto.jpg
"""
import argparse
import json
import sys

import cv2

from parkit_vision import SPOT_IDS, load_config, normalize_frame, open_camera


def grab_frame(cfg, image_path):
    if image_path:
        frame = cv2.imread(image_path)
        if frame is None:
            sys.exit(f"No se pudo leer la imagen {image_path}")
        return normalize_frame(frame, cfg)
    cap = open_camera(cfg)
    while True:
        ok, frame = cap.read()
        if not ok:
            continue
        frame = normalize_frame(frame, cfg)
        view = frame.copy()
        cv2.putText(view, "ESPACIO: capturar | Q: salir", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.imshow("Calibracion", view)
        key = cv2.waitKey(1) & 0xFF
        if key == ord(" "):
            break
        if key == ord("q"):
            cap.release()
            sys.exit("Cancelado.")
    cap.release()
    cv2.destroyAllWindows()
    return frame


def ask_roi(frame, title):
    win = title
    r = cv2.selectROI(win, frame, showCrosshair=False)
    cv2.destroyWindow(win)
    x, y, w, h = map(int, r)
    if w == 0 or h == 0:
        sys.exit("No dibujaste ningún rectángulo. Calibración cancelada.")
    return [x, y, w, h]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--image", help="usar una foto en vez de la cámara")
    args = ap.parse_args()

    cfg = load_config(args.config)
    frame = grab_frame(cfg, args.image)
    canvas = frame.copy()
    rois = {}

    print("Para cada plaza dibuja un rectángulo y pulsa ENTER (C para cancelar ese paso).")
    for sid in cfg.get("spot_ids", SPOT_IDS):
        zone = ask_roi(canvas, f"{sid}: ZONA COMPLETA de la plaza (donde queda el auto)")
        x, y, w, h = zone
        cv2.rectangle(canvas, (x, y), (x + w, y + h), (0, 255, 0), 2)
        color = ask_roi(canvas, f"{sid}: INDICADOR de color (la parte roja/verde)")
        cx, cy, cw, ch = color
        cv2.rectangle(canvas, (cx, cy), (cx + cw, cy + ch), (255, 255, 0), 1)
        cv2.putText(canvas, sid, (x + 4, y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        rois[sid] = {"zone": zone, "color": color}

    with open(cfg["rois_file"], "w", encoding="utf-8") as f:
        json.dump(rois, f, indent=2)
    cv2.imwrite("calibracion.jpg", canvas)
    print(f"Listo. ROI guardadas en {cfg['rois_file']} y vista previa en calibracion.jpg")


if __name__ == "__main__":
    main()
