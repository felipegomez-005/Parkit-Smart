"""Servidor de prueba (solo librería estándar) que imita el endpoint del backend.

Uso:  python mock_backend.py
Configura backend.url con http://127.0.0.1:3000/api/vision/spots,
activa backend.enabled y ejecuta monitor.py.
"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        print("\n--- POST", self.path)
        print(json.dumps(json.loads(body), indent=2, ensure_ascii=False))
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok": true}')

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print("Mock backend en http://localhost:3000 (Ctrl+C para salir)")
    HTTPServer(("127.0.0.1", 3000), Handler).serve_forever()
