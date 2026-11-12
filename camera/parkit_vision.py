"""Funciones compartidas del sistema de cámara de ParkIt Smart."""
import json
import platform

import cv2
import numpy as np

SPOT_IDS = ["P1", "P2", "P3", "P4", "P5", "P6"]


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_config(path="config.json"):
    return load_json(path)


def open_camera(cfg):
    src = cfg["camera_source"]
    if isinstance(src, int) and platform.system() == "Windows":
        cap = cv2.VideoCapture(src)
    else:
        cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        raise RuntimeError(
            f"No se pudo abrir la cámara '{src}'. Revisa 'camera_source' en config.json."
        )
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, cfg["frame_width"])
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, cfg["frame_height"])
    return cap


def normalize_frame(frame, cfg):
    """Deja todos los fotogramas al mismo tamaño para que las ROI siempre calcen."""
    w, h = cfg["frame_width"], cfg["frame_height"]
    if frame.shape[1] != w or frame.shape[0] != h:
        frame = cv2.resize(frame, (w, h))
    return frame


def _range(hsv_patch, rng):
    return cv2.inRange(hsv_patch, np.array(rng["lower"]), np.array(rng["upper"]))


def classify_color(hsv, roi, color_cfg):
    """Devuelve (estado, ratio_verde, ratio_rojo) para una ROI [x, y, w, h]."""
    x, y, w, h = roi
    patch = hsv[y:y + h, x:x + w]
    if patch.size == 0:
        return "unknown", 0.0, 0.0
    green = _range(patch, color_cfg["green"])
    red = cv2.bitwise_or(_range(patch, color_cfg["red_low"]), _range(patch, color_cfg["red_high"]))
    total = green.size
    g_ratio = float(np.count_nonzero(green)) / total
    r_ratio = float(np.count_nonzero(red)) / total
    m = color_cfg["min_ratio"]
    if g_ratio >= m and g_ratio > r_ratio:
        return "available", g_ratio, r_ratio
    if r_ratio >= m and r_ratio > g_ratio:
        return "occupied", g_ratio, r_ratio
    return "unknown", g_ratio, r_ratio


def make_detector(dict_name):
    dictionary = cv2.aruco.getPredefinedDictionary(getattr(cv2.aruco, dict_name))
    return cv2.aruco.ArucoDetector(dictionary, cv2.aruco.DetectorParameters())


def detect_markers(detector, frame, rois):
    """Detecta ArUco y asigna cada uno a la plaza cuya zona contiene su centro."""
    corners, ids, _ = detector.detectMarkers(frame)
    found = []
    if ids is None:
        return found
    for c, marker_id in zip(corners, ids.flatten()):
        cx, cy = c[0].mean(axis=0)
        spot = None
        for sid, r in rois.items():
            x, y, w, h = r["zone"]
            if x <= cx <= x + w and y <= cy <= y + h:
                spot = sid
                break
        found.append({
            "markerId": int(marker_id),
            "spotId": spot,
            "center": [float(cx), float(cy)],
            "corners": c[0].tolist(),
        })
    return found


class Debouncer:
    """Confirma un cambio solo si se repite N lecturas seguidas (evita parpadeos)."""

    def __init__(self, frames):
        self.frames = max(1, frames)
        self.confirmed = {}
        self.candidate = {}
        self.count = {}

    def update(self, key, value, initial=None):
        if key not in self.confirmed:
            self.confirmed[key] = initial
        if value == self.confirmed[key]:
            self.candidate.pop(key, None)
            self.count[key] = 0
        else:
            if self.candidate.get(key) == value:
                self.count[key] += 1
            else:
                self.candidate[key] = value
                self.count[key] = 1
            if self.count[key] >= self.frames:
                self.confirmed[key] = value
                self.candidate.pop(key, None)
                self.count[key] = 0
        return self.confirmed[key]


STATUS_COLORS = {
    "available": (0, 200, 0),
    "occupied": (0, 0, 220),
    "unknown": (160, 160, 160),
}


def draw_overlay(frame, rois, raw_spots, markers):
    out = frame.copy()
    for sid, r in rois.items():
        st = raw_spots[sid]["status"]
        col = STATUS_COLORS[st]
        x, y, w, h = r["zone"]
        cv2.rectangle(out, (x, y), (x + w, y + h), col, 2)
        cx, cy, cw, ch = r["color"]
        cv2.rectangle(out, (cx, cy), (cx + cw, cy + ch), (255, 255, 0), 1)
        cv2.putText(out, f"{sid} {st}", (x + 4, y + 20),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, col, 2)
    for m in markers:
        pts = np.array(m["corners"], dtype=np.int32)
        cv2.polylines(out, [pts], True, (255, 0, 255), 2)
        cx, cy = int(m["center"][0]), int(m["center"][1])
        cv2.putText(out, f"ID {m['markerId']}", (cx - 20, cy - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)
    return out
