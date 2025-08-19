from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import json
import urllib.request
import urllib.parse
from urllib.error import HTTPError

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        if self.path == '/api/chat':
            self.handle_chat_api()
        else:
            self.send_response(404)
            self.end_headers()
    
    def handle_chat_api(self):
        try:
            # Get API key from environment
            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                self.send_error_response(500, 'API key not configured')
                return
            
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_data = json.loads(post_data.decode('utf-8'))
            
            # Prepare Gemini API request
            api_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}'
            
            # Create request
            req = urllib.request.Request(
                api_url,
                data=json.dumps(request_data).encode('utf-8'),
                headers={'Content-Type': 'application/json'}
            )
            
            # Make API call
            with urllib.request.urlopen(req) as response:
                response_data = response.read()
                
            # Send response back to client
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(response_data)
            
        except HTTPError as e:
            error_response = e.read().decode('utf-8')
            self.send_error_response(e.code, f'API Error: {error_response}')
        except json.JSONDecodeError:
            self.send_error_response(400, 'Invalid JSON in request')
        except Exception as e:
            self.send_error_response(500, f'Server error: {str(e)}')
    
    def send_error_response(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        error_data = json.dumps({'error': {'message': message}})
        self.wfile.write(error_data.encode('utf-8'))

if __name__ == "__main__":
    port = 5000
    server = HTTPServer(('0.0.0.0', port), CORSRequestHandler)
    print(f"Server running at http://0.0.0.0:{port}")
    server.serve_forever()
