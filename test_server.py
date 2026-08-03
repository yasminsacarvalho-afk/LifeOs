from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class SimpleHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        print(f"GET Request received: {self.path}")
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"events": [], "tasks": []}')
        
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.end_headers()

server = HTTPServer(('localhost', 3333), SimpleHandler)
print("Listening on port 3333...")
server.serve_forever()
