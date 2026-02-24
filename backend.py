"""
AuraCode Python Backend Node v1.0
Handles incoming JSON execution requests from the AuraCode Communication Layer.
"""

from flask import Flask, request, jsonify
import base64
import subprocess
import time
import uuid
import os

app = Flask(__name__)

# Basic CORS support for the browser IDE
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST')
    return response

@app.route('/execute', methods=['POST'])
def execute_code():
    try:
        data = request.json
        payload = data.get('payload', {})
        
        lang = payload.get('language')
        # Decode the Base64 source code
        source_code = base64.b64decode(payload.get('source')).decode('utf-8')
        
        start_time = time.time()
        
        # Unique filename for execution isolation
        filename = f"aura_{uuid.uuid4().hex}.py"
        with open(filename, "w") as f:
            f.write(source_code)
            
        # Execute in a subprocess for safety
        process = subprocess.run(
            ['python3', filename],
            capture_output=True,
            text=True,
            timeout=10 # Security timeout
        )
        
        # Cleanup
        if os.path.exists(filename):
            os.remove(filename)
            
        latency = int((time.time() - start_time) * 1000)
        
        return jsonify({
            "status": "success",
            "stdout": process.stdout if process.returncode == 0 else process.stderr,
            "exit_code": process.returncode,
            "latency_ms": latency,
            "id": data.get('id')
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("========================================")
    print("   AuraCode Python Backend Node v1.0    ")
    print("========================================")
    print("Listening on http://localhost:5000")
    app.run(port=5000)
