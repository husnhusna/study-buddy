"""
STUDY.EXE // Shared Data Local Server Bridge
Serves the website and allows synchronization between web dashboard and desktop widget.
Uses 100% standard library (zero pip packages or external dependencies).
Supports dual-stack IPv4/IPv6 for seamless localhost and 127.0.0.1 access on Windows.
"""

import http.server
import socket
import contextlib
import json
import os
import sys
import functools

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_FILE = os.path.join(BASE_DIR, "study_data.json")

class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        with contextlib.suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()

class StudyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/data":
            try:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                if os.path.exists(DATA_FILE):
                    with open(DATA_FILE, "rb") as f:
                        self.wfile.write(f.read())
                else:
                    self.wfile.write(b'{"tasks":[],"subjects":[],"notes":[]}')
            except Exception as e:
                pass
            return
        # Standard static file serving
        return super().do_GET()

    def do_POST(self):
        if self.path == "/api/data":
            try:
                content_len = int(self.headers.get("Content-Length", 0))
                post_body = self.rfile.read(content_len).decode("utf-8")
                parsed = json.loads(post_body)
                
                # Write to study_data.json
                with open(DATA_FILE, "w", encoding="utf-8") as f:
                    json.dump(parsed, f, indent=2)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(b'{"status":"saved"}')
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return
        
        self.send_response(404)
        self.end_headers()

def run_server(port=8000):
    handler = functools.partial(StudyHandler, directory=BASE_DIR)
    server = DualStackServer(("", port), handler)
    print(f"[STUDY.EXE SERVER] Serving website & data sync at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run_server(port)
