import subprocess
import threading
import time
import os
import sys
import webbrowser

# --- CONFIGURATION ---
# Adjust these paths if your Jekyll or Bridge files are in subdirectories
PYTHON_BACKEND = "backend.py"
CPP_BRIDGE_SOURCE = "bridge.cpp"
CPP_BRIDGE_BIN = "./aura_bridge"
JEKYLL_CMD = ["bundle", "exec", "jekyll", "serve"] # or ["jekyll", "serve"]
LOCAL_URL = "http://localhost:4000" # Default Jekyll Port

def run_process(command, name):
    print(f"🚀 Starting {name}...")
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        for line in process.stdout:
            print(f"[{name}] {line.strip()}")
    except Exception as e:
        print(f"❌ Error in {name}: {e}")

def compile_cpp():
    print("🔨 Compiling C++ Bridge...")
    compile_cmd = ["g++", CPP_BRIDGE_SOURCE, "-o", CPP_BRIDGE_BIN, "-lpthread", "-O3"]
    result = subprocess.run(compile_cmd)
    if result.returncode == 0:
        print("✅ C++ Bridge Compiled successfully.")
        return True
    else:
        print("❌ C++ Compilation Failed.")
        return False

def main():
    print("--- AuraCode Unified Startup ---")
    
    # 1. Compile C++ Bridge first
    if not compile_cpp():
        sys.exit(1)

    # 2. Define the threads for our services
    threads = [
        threading.Thread(target=run_process, args=(["python", PYTHON_BACKEND], "PYTHON-NODE"), daemon=True),
        threading.Thread(target=run_process, args=([CPP_BRIDGE_BIN], "CPP-NODE"), daemon=True),
        threading.Thread(target=run_process, args=(JEKYLL_CMD, "JEKYLL-FRONTEND"), daemon=True)
    ]

    # 3. Start all services
    for thread in threads:
        thread.start()

    # 4. Wait for servers to warm up then open browser
    print("⏳ Waiting for environments to stabilize...")
    time.sleep(5) 
    print(f"🌐 Opening AuraCode at {LOCAL_URL}")
    webbrowser.open(LOCAL_URL)

    # Keep the main thread alive so the daemon threads continue running
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Shutting down AuraCode Environment...")
        sys.exit(0)

if __name__ == "__main__":
    main()
