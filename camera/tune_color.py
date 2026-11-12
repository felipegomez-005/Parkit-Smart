"""Ayuda para ajustar los rangos HSV. Haz clic sobre un color para ver su valor HSV.

Muestra también las máscaras de verde y rojo con los rangos actuales de config.json.
Uso:  python tune_color.py   (o --image foto.jpg).  Q para salir.
"""
import argparse

import cv2
import numpy as np

from parkit_vision import load_config, normalize_frame, open_camera

point = None


def on_mouse(event, x, y, flags, param):
    global point
    if event == cv2.EVENT_LBUTTONDOWN:
        point = (x, y)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--image")
    args = ap.parse_args()
    cfg = load_config(args.config)
    c = cfg["color"]

    cap = None if args.image else open_camera(cfg)
    static = normalize_frame(cv2.imread(args.image), cfg) if args.image else None

    cv2.namedWindow("Camara")
    cv2.setMouseCallback("Camara", on_mouse)
    while True:
        if static is not None:
            frame = static.copy()
        else:
            ok, frame = cap.read()
            if not ok:
                continue
            frame = normalize_frame(frame, cfg)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        green = cv2.inRange(hsv, np.array(c["green"]["lower"]), np.array(c["green"]["upper"]))
        red = cv2.bitwise_or(
            cv2.inRange(hsv, np.array(c["red_low"]["lower"]), np.array(c["red_low"]["upper"])),
            cv2.inRange(hsv, np.array(c["red_high"]["lower"]), np.array(c["red_high"]["upper"])))
        if point:
            x, y = point
            patch = hsv[max(0, y - 2):y + 3, max(0, x - 2):x + 3].reshape(-1, 3)
            h, s, v = patch.mean(axis=0).astype(int)
            cv2.circle(frame, point, 6, (255, 255, 255), 2)
            cv2.putText(frame, f"HSV=({h},{s},{v})", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2)
        cv2.imshow("Camara", frame)
        cv2.imshow("Mascara VERDE", green)
        cv2.imshow("Mascara ROJO", red)
        if cv2.waitKey(30) & 0xFF == ord("q"):
            break
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
