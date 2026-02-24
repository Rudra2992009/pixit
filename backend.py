"""
AuraCode Python Backend Node v1.1
High-performance execution engine for the AuraCode decentralized environment.
Configured for 5-digit port stability.
"""

from flask import Flask, request, jsonify
import base64
import subprocess
import time
import uuid
import os

app = Flask(__name__)

# --- CORS CONFIGURATION ---
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
    return response

@app.route('/execute', methods=['POST', 'OPTIONS'])
def execute_code():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return jsonify({"status": "ok"}), 200

    try:
        data = request.json
        # Extract payload based on the Aura-JSON schema
        payload = data.get('payload', {})
        
        # Determine language (defaults to python if not specified)
        lang = payload.get('language', 'python')
        
        # Secure Base64 Decoding of source code
        encoded_source = payload.get('source', '')
        if not encoded_source:
            return jsonify({"status": "error", "error": "No source code provided"}), 400
            
        source_code = base64.b64decode(encoded_source).decode('utf-8')
        
        start_time = time.time()
        
        # Create a unique temporary file for isolation
        # Using a UUID to prevent filename collisions during concurrent execution
        unique_id = uuid.uuid4().hex
        temp_filename = f"aura_node_{unique_id}.py"
        
        with open(temp_filename, "w", encoding="utf-8") as f:
            f.write(source_code)
            
        # Execute the script in a restricted subprocess
        # We use a 10-second timeout to prevent runaway processes
        try:
            process = subprocess.run(
                ['python3', temp_filename],
                capture_output=True,
                text=True,
                timeout=10 
            )
            stdout = process.stdout
            stderr = process.stderr
            exit_code = process.returncode
        except subprocess.TimeoutExpired:
            stdout = ""
            stderr = "Execution Error: Process timed out after 10 seconds."
            exit_code = 124
        
        # Final cleanup of the temporary file
        if os.path.exists(temp_filename):
            os.remove(temp_filename)
            
        latency = int((time.time() - start_time) * 1000)
        
        # Prepare the standardized JSON response for the comm.js layer
        return jsonify({
            "status": "success",
            "stdout": stdout if exit_code == 0 else stderr,
            "exit_code": exit_code,
            "latency_ms": latency,
            "engine": "python-native",
            "request_id": data.get('id', unique_id)
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": f"Internal Node Error: {str(e)}"
        }), 500

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        "node": "AuraCode-Python",
        "status": "online",
        "vfs_mount": True,
        "uptime": time.process_time()
    })

if __name__ == '__main__':
    # Use a 5-digit port (default 55000) but allow overriding via argv[1] or PORT env var
    import sys
    env_port = os.environ.get('PORT')
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except Exception:
            PORT = int(env_port) if env_port else 55000
    else:
        PORT = int(env_port) if env_port else 55000
    print("========================================")
    print("   AuraCode Python Backend Node v1.1    ")
    print("========================================")
    print(f"🚀 Node initialized at http://localhost:{PORT}")
    print("📡 Protocol: JSON-Bridge over Base64")
    app.run(host='0.0.0.0', port=PORT, debug=False)
