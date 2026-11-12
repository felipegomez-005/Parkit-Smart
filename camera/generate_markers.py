"""Genera marcadores ArUco listos para imprimir.

Uso:  python generate_markers.py --count 6 --size 600
"""
import argparse
import os

import cv2

from parkit_vision import load_config


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--count", type=int, default=6, help="cuántos marcadores (IDs 0..count-1)")
    ap.add_argument("--size", type=int, default=600, help="tamaño del marcador en píxeles")
    ap.add_argument("--out", default="markers")
    args = ap.parse_args()

    cfg = load_config(args.config)
    dictionary = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, cfg["aruco_dictionary"]))
    os.makedirs(args.out, exist_ok=True)
    border = args.size // 4  # borde blanco: es parte del marcador, no lo recortes
    for i in range(args.count):
        img = cv2.aruco.generateImageMarker(dictionary, i, args.size)
        img = cv2.copyMakeBorder(img, border, border, border, border,
                                 cv2.BORDER_CONSTANT, value=255)
        path = os.path.join(args.out, f"marker_{i:02d}.png")
        cv2.imwrite(path, img)
        print("Generado", path)


if __name__ == "__main__":
    main()
