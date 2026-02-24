/**
 * AuraCode Communication Layer v1.0
 * ROLE: The "Router" between the Browser UI and Native Backends.
 * It handles the JSON-Bridge protocol for C++, Rust, and Python.
 */

const AuraComm = {
    // Configuration for local nodes
    nodes: {
        cpp: "http://localhost:56000/bridge",
        python: "http://localhost:55000/execute",
        rust: "http://localhost:58000/bridge"
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
        // Normalize responses to the standardized schema: { stdout, exit_code, latency_ms }
        try {
            if (data && typeof data === 'object') {
                // Standardized backend response
                if ('stdout' in data && 'exit_code' in data) {
                    const ok = Number(data.exit_code) === 0;
                    Terminal.print(`Node Response: [Exit ${data.exit_code}] [${data.latency_ms ?? 0}ms]`, ok ? "success" : "error");
                    return { success: ok, output: data.stdout, exit_code: data.exit_code, latency_ms: data.latency_ms ?? 0 };
                }

                // Legacy response shape
                if (data.status === "success") {
                    Terminal.print(`Node Response: [Exit 0] [${data.latency_ms ?? 0}ms]`, "success");
                    return { success: true, output: data.stdout, exit_code: 0, latency_ms: data.latency_ms ?? 0 };
                }

                // Error shapes
                const err = data.error || data.message || 'Unknown node response';
                Terminal.print(`Node Exception: ${err}`, "error");
                return { success: false, error: err };
            }
        } catch (e) {
            Terminal.print(`Response Parse Error: ${e.message}`, "error");
            return { success: false, error: e.message };
        }
    }
};

// Export to Global Scope
window.AuraComm = AuraComm;
