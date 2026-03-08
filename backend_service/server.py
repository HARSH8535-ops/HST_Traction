import os
import sys
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Add src to python path so api_handlers can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'src')))

try:
    from api_handlers.main import handler as lambda_handler
except ImportError as e:
    print(f"Error importing lambda handler: {e}")
    sys.exit(1)

class LocalAPIHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def handle_api_request(self, method):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        query_params = {k: v[0] for k, v in parse_qs(parsed_path.query).items()}

        body = ""
        if method in ['POST', 'PUT', 'DELETE']:
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                body = self.rfile.read(content_length).decode('utf-8')

        # Mock API Gateway event
        event = {
            'httpMethod': method,
            'path': path,
            'queryStringParameters': query_params if query_params else None,
            'headers': {
                'origin': 'http://localhost:3000',
                'Content-Type': self.headers.get('Content-Type', 'application/json')
            },
            'body': body
        }

        # Call the Lambda handler
        try:
            print(f"Routing {method} {path} to lambda_handler...")
            response = lambda_handler(event, None)
            
            status_code = response.get('statusCode', 500)
            headers = response.get('headers', {})
            response_body = response.get('body', '')

            self.send_response(status_code)
            for k, v in headers.items():
                self.send_header(k, v)
            
            # Ensure CORS is always present locally
            if 'Access-Control-Allow-Origin' not in headers:
                self.send_header('Access-Control-Allow-Origin', '*')
                
            self.end_headers()
            
            if response_body:
                self.wfile.write(response_body.encode('utf-8'))
                
        except Exception as e:
            print(f"Error executing lambda handler: {e}")
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))

    def do_GET(self):
        if self.path.startswith('/api'):
            self.handle_api_request('GET')
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')

    def do_POST(self):
        if self.path.startswith('/api'):
            self.handle_api_request('POST')
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
            
    def do_PUT(self):
        if self.path.startswith('/api'):
            self.handle_api_request('PUT')
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')

    def do_DELETE(self):
        if self.path.startswith('/api'):
            self.handle_api_request('DELETE')
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')

def run(server_class=HTTPServer, handler_class=LocalAPIHandler, port=8001):
    os.environ['ALLOWED_ORIGINS'] = 'http://localhost:3000,http://127.0.0.1:3000'
    os.environ['AWS_REGION'] = 'us-east-1'
    os.environ['SAGEMAKER_TEXT_ENDPOINT_NAME'] = 'mistral-7b-instruct-endpoint' # Adjust to actual deployed endpoint later if known
    
    # We will need some mock AWS credentials for boto3 to not crash initializing if not fully configured
    if 'AWS_ACCESS_KEY_ID' not in os.environ:
        os.environ['AWS_ACCESS_KEY_ID'] = 'mock_key'
        os.environ['AWS_SECRET_ACCESS_KEY'] = 'mock_secret'
    
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f'Starting local API server on port {port}...')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print('Stopping server...')

if __name__ == '__main__':
    run()
