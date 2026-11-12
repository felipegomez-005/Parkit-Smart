"""Sistema de cámara de ParkIt Smart: lee el color de las plazas configuradas y los marcadores ArUco.

Uso:
    python monitor.py --show              # cámara en vivo con ventana (Q para salir)
    python monitor.py                     # sin ventana (para dejarlo corriendo)
    python monitor.py --image foto.jpg    # analiza una sola foto y muestra el JSON
Cada vez que cambia algo se guarda state.json y, si backend.enabled = true, se envía al servidor.
"""
import argparse
import json
import os
import time
from datetime import datetime, timezone

import cv2
import requests

from parkit_vision import (SPOT_IDS, Debouncer, classify_color, detect_markers,
                           draw_overlay, load_config, load_json, make_detector,
                           normalize_frame, open_camera)


def analyze(frame, cfg, rois, detector):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    raw = {}
    for sid in rois:
        status, g, r = classify_color(hsv, rois[sid]["color"], cfg["color"])
        raw[sid] = {"status": status, "green": round(g, 2), "red": round(r, 2)}
    return raw, detect_markers(detector, frame, rois)


def build_payload(spot_status, marker_spot):
    vehicle_in = {s: m for m, s in marker_spot.items() if s not in (None, "outside")}
    spots = []
    for sid, status in spot_status.items():
        mid = vehicle_in.get(sid)
        spots.append({
            "id": sid,
            "status": status,
            "markerId": mid,
            # auto detectado en la plaza pero el indicador dice "disponible"
            "conflict": mid is not None and status == "available",
        })
    markers = [{"markerId": m, "spotId": (None if s == "outside" else s)}
               for m, s in sorted(marker_spot.items()) if s is not None]
    return {"spots": spots, "markers": markers}


def save_state(path, payload):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


def publish(cfg, payload):
    b = cfg["backend"]
    if not b.get("enabled"):
        return
    api_status = {"available": "libre", "occupied": "ocupado"}
    spots = [
        {"number": spot["id"], "status": api_status[spot["status"]]}
        for spot in payload["spots"]
        if spot["status"] in api_status
    ]
    if not spots:
        return
    try:
        response = requests.post(b["url"], json={"spots": spots}, timeout=3)
        response.raise_for_status()
    except requests.RequestException as error:
        print(f"[aviso] Error al actualizar plazas: {error}")


def run_image(args, cfg, rois, detector):
    frame = cv2.imread(args.image)
    if frame is None:
        raise SystemExit(f"No se pudo leer {args.image}")
    frame = normalize_frame(frame, cfg)
    raw, markers = analyze(frame, cfg, rois, detector)
    marker_spot = {m["markerId"]: (m["spotId"] or "outside") for m in markers}
    payload = build_payload({s: v["status"] for s, v in raw.items()}, marker_spot)
    payload["timestamp"] = datetime.now(timezone.utc).isoformat()
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    if args.save_annotated:
        cv2.imwrite(args.save_annotated, draw_overlay(frame, rois, raw, markers))
        print("Imagen anotada:", args.save_annotated)


def run_live(args, cfg, rois, detector):
    cap = open_camera(cfg)
    spot_deb = Debouncer(cfg["stability_frames"])
    marker_deb = Debouncer(cfg["stability_frames"])
    known_markers = set()
    last_payload, last_sent, fails = None, 0.0, 0
    print("Monitoreando... (Ctrl+C para detener)")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                fails += 1
                if fails >= 30:
                    print("[aviso] se perdió la cámara, reintentando...")
                    cap.release()
                    time.sleep(2)
                    cap = open_camera(cfg)
                    fails = 0
                continue
            fails = 0
            frame = normalize_frame(frame, cfg)
            raw, markers = analyze(frame, cfg, rois, detector)

            spot_status = {s: spot_deb.update(s, raw[s]["status"], "unknown") for s in raw}
            seen = {m["markerId"]: (m["spotId"] or "outside") for m in markers}
            known_markers |= set(seen)
            marker_spot = {}
            for mid in known_markers:
                marker_spot[mid] = marker_deb.update(mid, seen.get(mid), None)

            payload = build_payload(spot_status, marker_spot)
            changed = payload != last_payload
            heartbeat = time.time() - last_sent >= cfg["backend"].get("heartbeat_seconds", 5)
            if changed or heartbeat:
                payload["timestamp"] = datetime.now(timezone.utc).isoformat()
                if changed:
                    resumen = ", ".join(f"{s['id']}={s['status']}" +
                                        (f"(auto {s['markerId']})" if s["markerId"] is not None else "")
                                        for s in payload["spots"])
                    print(datetime.now().strftime("%H:%M:%S"), resumen)
                    save_state(cfg["state_file"], payload)
                publish(cfg, payload)
                last_sent = time.time()
                last_payload = {k: v for k, v in payload.items() if k != "timestamp"}

            if args.show:
                cv2.imshow("ParkIt Smart - camara (Q para salir)", draw_overlay(frame, rois, raw, markers))
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
            time.sleep(cfg["interval_seconds"])
    except KeyboardInterrupt:
        pass
    finally:
        cap.release()
        cv2.destroyAllWindows()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--image", help="analizar una sola foto")
    ap.add_argument("--save-annotated", help="con --image: guardar la imagen con lo detectado")
    ap.add_argument("--show", action="store_true", help="mostrar ventana con la cámara")
    args = ap.parse_args()

    cfg = load_config(args.config)
    if not os.path.exists(cfg["rois_file"]):
        raise SystemExit("Falta rois.json. Ejecuta primero: python calibrate.py")
    saved_rois = load_json(cfg["rois_file"])
    spot_ids = cfg.get("spot_ids", SPOT_IDS)
    missing = [sid for sid in spot_ids if sid not in saved_rois]
    if missing:
        raise SystemExit(f"Falta calibrar: {', '.join(missing)}. Ejecuta python calibrate.py.")
    rois = {sid: saved_rois[sid] for sid in spot_ids}
    detector = make_detector(cfg["aruco_dictionary"])

    if args.image:
        run_image(args, cfg, rois, detector)
    else:
        run_live(args, cfg, rois, detector)


if __name__ == "__main__":
    main()
