import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3001;

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    if (req.method === 'POST' && req.url === '/api/cyber/sync-allocations') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let options = {};
            try { options = JSON.parse(body || '{}'); } catch (e) {}

            const { fromDate, toDate, preview } = options;
            const scriptPath = path.resolve(__dirname, 'scripts', 'sync_thuan_an_allocations.py');

            const args = [scriptPath];
            if (fromDate) args.push('--from', fromDate);
            if (toDate) args.push('--to', toDate);
            if (preview) args.push('--preview');

            console.log(`[CyberSync] Running: python ${args.join(' ')}`);
            const pyProcess = spawn('python', args);

            let stdout = '';
            let stderr = '';

            pyProcess.stdout.on('data', (data) => { stdout += data.toString(); });
            pyProcess.stderr.on('data', (data) => { stderr += data.toString(); });

            pyProcess.on('close', (code) => {
                if (code !== 0) {
                    console.error('[CyberSync Error]', stderr);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ success: false, error: stderr || `Exit code ${code}` }));
                }
                try {
                    const lines = stdout.trim().split('\n');
                    const lastLine = lines[lines.length - 1];
                    const parsed = JSON.parse(lastLine);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(parsed));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, raw: stdout, error: e.message }));
                }
            });
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
    console.log(`CyberSync Local Server running on http://localhost:${PORT}`);
});
