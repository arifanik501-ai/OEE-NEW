"""
OEE Report Portal - Standalone Python 3 Web Server
Built with Python standard library (http.server, json, os, urllib, hashlib)
Zero external dependencies required.
"""

import http.server
import socketserver
import json
import os
import urllib.parse
import hashlib
from datetime import datetime

PORT = int(os.environ.get('PORT', 3000))
HOST = os.environ.get('HOST', '127.0.0.1')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'data.json')

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.txt': 'text/plain; charset=utf-8',
    '.zip': 'application/zip'
}

ALLOWED_STATIC_FILES = {
    'index.html',
    'style.css',
    'app.js',
    'data.json',
    'favicon.svg',
    'README.md',
    'oee-report-github.zip'
}

def set_security_headers(handler):
    handler.send_header('X-Content-Type-Options', 'nosniff')
    handler.send_header('X-Frame-Options', 'SAMEORIGIN')
    handler.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
    handler.send_header(
        'Content-Security-Policy',
        "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://*.google-analytics.com; connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://*.google-analytics.com https://*.firebasestorage.app; script-src 'self' 'unsafe-inline' https://www.gstatic.com; frame-ancestors 'self';"
    )

def hash_password(password):
    return hashlib.sha256(str(password).strip().encode('utf-8')).hexdigest()

def is_valid_http_url(url_str):
    if not url_str or not isinstance(url_str, str):
        return False
    trimmed = url_str.strip()
    if trimmed == "":
        return True
    try:
        parsed = urllib.parse.urlparse(trimmed)
        return parsed.scheme in ('http', 'https') and bool(parsed.netloc)
    except Exception:
        return False

def read_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print("Error reading data.json:", e)
    return {
        "portalTitle": "OEE Report",
        "portalSubtitle": "Centralized Operational Equipment Effectiveness Reports & Logs",
        "openInNewTab": True,
        "adminPasswordHash": "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9",
        "lastPublished": datetime.utcnow().isoformat() + "Z",
        "reports": {
            "anwar": {
                "id": "anwar",
                "name": "Anwar",
                "title": "Anwar's OEE Report",
                "department": "Production & Efficiency",
                "description": "Daily production rates, line availability, and machine efficiency logs.",
                "url": "",
                "notes": "Primary tracking sheet managed by Anwar",
                "updatedAt": datetime.utcnow().isoformat() + "Z"
            },
            "monir": {
                "id": "monir",
                "name": "Monir",
                "title": "Monir's OEE Report",
                "department": "Maintenance & Downtime",
                "description": "Machine breakdown analysis, speed loss records, and operational quality data.",
                "url": "",
                "notes": "Primary tracking sheet managed by Monir",
                "updatedAt": datetime.utcnow().isoformat() + "Z"
            }
        }
    }

def write_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

class OEERequestHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}")

    def do_OPTIONS(self):
        self.send_response(204)
        set_security_headers(self)
        self.send_header('Access-Control-Allow-Origin', f'http://127.0.0.1:{PORT}')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == '/api/health':
            self.send_response(200)
            set_security_headers(self)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "timestamp": datetime.utcnow().isoformat() + "Z"}).encode('utf-8'))
            return

        if path == '/api/reports':
            data = read_data()
            self.send_response(200)
            set_security_headers(self)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
            return

        # Static file handling
        rel_path = 'index.html' if path in ('/', '') else path.lstrip('/')
        if rel_path not in ALLOWED_STATIC_FILES:
            rel_path = 'index.html'

        safe_path = os.path.normpath(os.path.join(BASE_DIR, rel_path))

        if not os.path.isfile(safe_path):
            safe_path = os.path.join(BASE_DIR, 'index.html')

        _, ext = os.path.splitext(safe_path)
        content_type = MIME_TYPES.get(ext.lower(), 'application/octet-stream')

        try:
            with open(safe_path, 'rb') as f:
                content = f.read()
            self.send_response(200)
            set_security_headers(self)
            self.send_header('Content-Type', content_type)
            self.end_headers()
            self.wfile.write(content)
        except Exception:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b'Internal Server Error')

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length > 64 * 1024:
            self.send_response(413)
            self.end_headers()
            self.wfile.write(b'Payload Too Large')
            return

        body = self.rfile.read(content_length)

        if parsed.path == '/api/verify-password':
            try:
                payload = json.loads(body.decode('utf-8'))
                data = read_data()
                input_hash = hash_password(payload.get('password', ''))
                if input_hash == data.get('adminPasswordHash'):
                    self.send_response(200)
                    set_security_headers(self)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True}).encode('utf-8'))
                else:
                    self.send_response(401)
                    set_security_headers(self)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Incorrect password"}).encode('utf-8'))
            except Exception:
                self.send_response(400)
                self.end_headers()
            return

        if parsed.path == '/api/reports':
            try:
                payload = json.loads(body.decode('utf-8'))
                existing = read_data()

                # Verify Password
                input_pass = payload.get('adminPassword') or self.headers.get('X-Admin-Password', '')
                if existing.get('adminPasswordHash') and hash_password(input_pass) != existing.get('adminPasswordHash'):
                    self.send_response(401)
                    set_security_headers(self)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Incorrect admin password"}).encode('utf-8'))
                    return

                anwar_url = (payload.get('reports', {}).get('anwar', {}).get('url') or '').strip()
                monir_url = (payload.get('reports', {}).get('monir', {}).get('url') or '').strip()

                if not is_valid_http_url(anwar_url):
                    self.send_response(400)
                    set_security_headers(self)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Invalid URL for Anwar's report"}).encode('utf-8'))
                    return

                if not is_valid_http_url(monir_url):
                    self.send_response(400)
                    set_security_headers(self)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Invalid URL for Monir's report"}).encode('utf-8'))
                    return

                now = datetime.utcnow().isoformat() + "Z"
                new_pass = payload.get('newPassword')
                new_hash = hash_password(new_pass) if (new_pass and len(str(new_pass).strip()) >= 4) else existing.get('adminPasswordHash')

                updated = {
                    "portalTitle": payload.get('portalTitle', existing.get('portalTitle', 'OEE Report'))[:80],
                    "portalSubtitle": payload.get('portalSubtitle', existing.get('portalSubtitle', ''))[:160],
                    "openInNewTab": payload.get('openInNewTab', True),
                    "adminPasswordHash": new_hash,
                    "lastPublished": now,
                    "reports": {
                        "anwar": {
                            "id": "anwar",
                            "name": "Anwar",
                            "title": payload.get('reports', {}).get('anwar', {}).get('title', existing['reports']['anwar']['title'])[:100],
                            "department": payload.get('reports', {}).get('anwar', {}).get('department', existing['reports']['anwar']['department'])[:100],
                            "description": payload.get('reports', {}).get('anwar', {}).get('description', existing['reports']['anwar']['description'])[:300],
                            "url": anwar_url[:1000],
                            "notes": payload.get('reports', {}).get('anwar', {}).get('notes', existing['reports']['anwar']['notes'])[:200],
                            "updatedAt": now
                        },
                        "monir": {
                            "id": "monir",
                            "name": "Monir",
                            "title": payload.get('reports', {}).get('monir', {}).get('title', existing['reports']['monir']['title'])[:100],
                            "department": payload.get('reports', {}).get('monir', {}).get('department', existing['reports']['monir']['department'])[:100],
                            "description": payload.get('reports', {}).get('monir', {}).get('description', existing['reports']['monir']['description'])[:300],
                            "url": monir_url[:1000],
                            "notes": payload.get('reports', {}).get('monir', {}).get('notes', existing['reports']['monir']['notes'])[:200],
                            "updatedAt": now
                        }
                    }
                }

                write_data(updated)

                self.send_response(200)
                set_security_headers(self)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "Links published successfully!", "data": updated}).encode('utf-8'))

            except Exception as e:
                self.send_response(400)
                set_security_headers(self)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Invalid request: {str(e)}"}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer((HOST, PORT), OEERequestHandler) as httpd:
        print("=" * 55)
        print(f"  OEE Report Portal running at: http://{HOST}:{PORT}")
        print(f"  Local URL:                    http://localhost:{PORT}")
        print(f"  Default Admin Password:       admin123")
        print("=" * 55)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
