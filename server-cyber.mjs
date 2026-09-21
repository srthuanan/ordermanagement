import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3001;
const scriptPath = path.resolve(__dirname, 'scripts', 'sync_thuan_an_allocations.py');

function runPy(args, bodyData, res) {
    console.log(`[CyberSync] Running: python ${args.join(' ')}`);
    const pyProcess = spawn('python', args);

    let stdout = '';
    let stderr = '';

    if (bodyData) {
        pyProcess.stdin.write(bodyData);
        pyProcess.stdin.end();
    }

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
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    if (req.method === 'POST' && pathname === '/api/cyber/sync-allocations') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let options = {};
            try { options = JSON.parse(body || '{}'); } catch (e) {}
            const { fromDate, toDate, preview } = options;
            const args = [scriptPath];
            if (fromDate) args.push('--from', fromDate);
            if (toDate) args.push('--to', toDate);
            if (preview) args.push('--preview');
            runPy(args, body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/sync-locations') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            let options = {};
            try { options = JSON.parse(body || '{}'); } catch (e) {}
            const args = [scriptPath, '--sync-locations'];
            if (options.preview) args.push('--preview');
            runPy(args, body, res);
        });
        return;
    }

    if (req.method === 'GET' && pathname === '/api/cyber/plan-filter-options') {
        const model = urlObj.searchParams.get('model') || '';
        const args = [scriptPath, '--plan-filter-options'];
        if (model) args.push('--model', model);
        runPy(args, '', res);
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/search-factory-plan') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--search-plan'], body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/ton-kho-report') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--ton-kho-report'], body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/xep-xe-contracts') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--xep-xe-contracts'], body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/xep-xe-candidates') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--xep-xe-candidates'], body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/xep-xe-save') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--xep-xe-save'], body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/xep-xe-delete') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--xep-xe-delete'], body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/create-dnx') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--create-dnx'], body, res);
        });
        return;
    }

    if (req.method === 'POST' && pathname === '/api/cyber/lookup-vin') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([scriptPath, '--lookup-vin'], body, res);
        });
        return;
    }

    if (pathname === '/api/cyber/voucher-tickets') {
        const queryParams = Object.fromEntries(urlObj.searchParams);
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                let bodyObj = {};
                try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
                runPy([scriptPath, '--voucher-tickets'], JSON.stringify({ ...queryParams, ...bodyObj }), res);
            });
        } else {
            runPy([scriptPath, '--voucher-tickets'], JSON.stringify(queryParams), res);
        }
        return;
    }

    if (pathname === '/api/cyber/export-pdf') {
        const queryParams = Object.fromEntries(urlObj.searchParams);
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                let bodyObj = {};
                try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
                runPy([scriptPath, '--export-pdf'], JSON.stringify({ ...queryParams, ...bodyObj }), res);
            });
        } else {
            runPy([scriptPath, '--export-pdf'], JSON.stringify(queryParams), res);
        }
        return;
    }
    if (pathname === '/api/cyber/view-pdf') {
        const rawStt = (urlObj.searchParams.get('stt_rec') || '').trim().replace(/\.pdf$/i, '');
        const baseStt = rawStt.replace(/(_sig|_nosig)$/i, '');
        const safeBase = baseStt.replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeName = rawStt.replace(/[^a-zA-Z0-9_-]/g, '_');
        const isNosig = /_nosig$/i.test(rawStt);
        const isSig = /_sig$/i.test(rawStt);

        let candidates = [];
        if (isNosig) {
            // Khi người dùng chọn không chèn chữ ký, TUYỆT ĐỐI không fallback sang file _sig.pdf
            candidates = [
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeName}.pdf`),
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_nosig.pdf`)
            ];
        } else if (isSig) {
            candidates = [
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeName}.pdf`),
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_sig.pdf`),
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}.pdf`)
            ];
        } else {
            candidates = [
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeName}.pdf`),
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_sig.pdf`),
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}_nosig.pdf`),
                path.resolve(__dirname, 'public/cyber_pdfs', `${safeBase}.pdf`)
            ];
        }
        const foundPath = candidates.find(p => fs.existsSync(p));
        if (foundPath) {
            const stat = fs.statSync(foundPath);
            res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': stat.size,
                'Content-Disposition': `inline; filename="${path.basename(foundPath)}"`,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            });
            if (req.method === 'HEAD') {
                res.end();
                return;
            }
            fs.createReadStream(foundPath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ success: false, error: 'PDF not found' }));
        }
        return;
    }
    if (pathname === '/api/cyber/check-contract-status') {
        const queryParams = Object.fromEntries(urlObj.searchParams);
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                let bodyObj = {};
                try { bodyObj = JSON.parse(body || '{}'); } catch (_) {}
                runPy([scriptPath, '--check-contract-status'], JSON.stringify({ ...queryParams, ...bodyObj }), res);
            });
        } else {
            runPy([scriptPath, '--check-contract-status'], JSON.stringify(queryParams), res);
        }
        return;
    }

    if (pathname === '/api/minvoice/fetch-invoice') {
        const minvoiceScript = path.resolve(__dirname, 'scripts', 'm_invoice_service.py');
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                runPy([minvoiceScript], body, res);
            });
        } else {
            const vin = urlObj.searchParams.get('vin') || '';
            runPy([minvoiceScript], JSON.stringify({ vin }), res);
        }
        return;
    }

    if (pathname === '/api/minvoice/batch-fetch') {
        const minvoiceScript = path.resolve(__dirname, 'scripts', 'm_invoice_service.py');
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            runPy([minvoiceScript], body, res);
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
    console.log(`CyberSync Local Server running on http://localhost:${PORT}`);
});

