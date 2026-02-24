/**
 * AuraCode Communication Layer v1.0
 * ROLE: The "Router" between the Browser UI and Native Backends.
 * It handles the JSON-Bridge protocol for C++, Rust, and Python.
 */

const AuraComm = {
    // Configuration for local nodes: lists of 10 preferred ports each
    nodes: {
        cpp: Array.from({length:10}, (_,i) => 56000 + i),
        python: Array.from({length:10}, (_,i) => 55000 + i),
        rust: Array.from({length:10}, (_,i) => 58000 + i)
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

        // Build list of candidate URLs based on configured ports
        const ports = this.nodes[lang] || this.nodes.python;
        const path = (lang === 'python') ? '/execute' : '/bridge';

        Terminal.print(`Comm: Trying ${ports.length} ports for ${lang.toUpperCase()} node...`, "info");

        // Helper to attempt a POST with timeout
        const tryPost = async (url, body, timeout = 5000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const resp = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body), signal: controller.signal });
                clearTimeout(id);
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                return await resp.json();
            } catch (e) {
                clearTimeout(id);
                throw e;
            }
        };

        // Iterate ports with simple exponential backoff
        let attempt = 0;
        for (const port of ports) {
            attempt++;
            const url = `http://localhost:${port}${path}`;
            Terminal.print(`Comm: Attempt ${attempt} -> ${url}`, "dim");
            try {
                const result = await tryPost(url, payload, 4000 + attempt * 500);
                return this.handleResponse(result);
            } catch (err) {
                Terminal.print(`Comm: Port ${port} failed (${err.message}).`, "dim");
                // small delay before next try
                await new Promise(r => setTimeout(r, 200 + attempt * 50));
                continue;
            }
        }

        Terminal.print(`Comm Error: All ${ports.length} ports failed for ${lang.toUpperCase()}`, "error");
        return { success: false, error: `No available ${lang} node ports` };
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
