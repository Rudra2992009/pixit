/**
 * AuraCode Communication Layer v1.0
 * ROLE: The "Router" between the Browser UI and Native Backends.
 * It handles the JSON-Bridge protocol for C++, Rust, and Python.
 */

const AuraComm = {
    // Configuration for local nodes
    nodes: {
        cpp: "http://localhost:8080/bridge",
        python: "http://localhost:5000/execute",
        rust: "http://localhost:8080/bridge"
    },

    /**
     * Serializes the source code and context into the Aura-JSON Schema
     * @param {string} lang - The target language engine
     * @param {string} source - Raw source code from the editor
     */
    async dispatch(lang, source) {
        const payload = {
            op: "EXECUTE_SOURCE",
            timestamp: Date.now(),
            id: crypto.randomUUID(),
            payload: {
                language: lang,
                source: btoa(source), // Base64 encoding for safe JSON transport
                options: {
                    optimization: "O3",
                    vfs_mount: true
                }
            }
        };

        Terminal.print(`Comm: Payload ${payload.id.substring(0,8)} generated.`, "dim");

        try {
            // Determine which backend node to talk to
            const targetUrl = this.nodes[lang] || this.nodes.python;
            
            Terminal.print(`Comm: Connecting to ${lang.toUpperCase()} Node...`, "info");

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`Node unreachable: ${response.statusText}`);

            const result = await response.json();
            return this.handleResponse(result);

        } catch (error) {
            Terminal.print(`Comm Error: ${error.message}`, "error");
            // Fallback: If native node is down, we could trigger WASM fallback here
            return { success: false, error: error.message };
        }
    },

    /**
     * Processes the JSON response from the backend nodes
     */
    handleResponse(data) {
        if (data.status === "success") {
            Terminal.print(`Node Response: [Exit 0] [${data.latency_ms}ms]`, "success");
            return { success: true, output: data.stdout };
        } else {
            Terminal.print(`Node Exception: ${data.error}`, "error");
            return { success: false, error: data.error };
        }
    }
};

// Export to Global Scope
window.AuraComm = AuraComm;
