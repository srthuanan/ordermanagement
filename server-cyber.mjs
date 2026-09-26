import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Nạp biến môi trường từ .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

const PORT = parseInt(process.env.CYBER_LOCAL_PORT || '3001', 10);
const scriptPath = path.resolve(__dirname, 'scripts', 'sync_thuan_an_allocations.py');
const crmScript = path.resolve(__dirname, 'scripts', 'cyber_crm_service.py');
const minvoiceScript = path.resolve(__dirname, 'scripts', 'm_invoice_service.py');

/**
 * Thực thi lệnh python và trả về Promise JSON
 */
function executePython(args, bodyData) {
    return new Promise((resolve, reject) => {
        const pyProcess = spawn('python', args, { cwd: __dirname });
        let stdout = '';
        let stderr = '';

        if (bodyData) {
            pyProcess.stdin.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
        }
        pyProcess.stdin.end();

        pyProcess.stdout.on('data', (data) => { stdout += data.toString(); });
        pyProcess.stderr.on('data', (data) => { stderr += data.toString(); });

        pyProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`[CyberSync Error] Exit code ${code}:`, stderr || stdout);
                return reject(new Error(stderr || stdout || `Lỗi script Python (exit code ${code})`));
            }
            try {
                const lines = stdout.trim().split('\n');
                const lastLine = lines[lines.length - 1];
                const parsed = JSON.parse(lastLine);
                resolve(parsed);
            } catch (e) {
                resolve({ success: true, raw: stdout });
            }
        });
    });
}

/**
 * Điều phối xử lý tất cả các route nghiệp vụ Cyber
 */
async function handleCyberAction(pathname, method, body, queryParams = {}) {
    let bodyObj = {};
    if (typeof body === 'string' && body.trim()) {
        try { bodyObj = JSON.parse(body); } catch (_) { bodyObj = {}; }
    } else if (typeof body === 'object' && body !== null) {
        bodyObj = body;
    }
    const mergedData = { ...queryParams, ...bodyObj };
    const mergedJson = JSON.stringify(mergedData);

    switch (pathname) {
        case '/api/cyber/sync-allocations': {
            const { fromDate, toDate, preview } = mergedData;
            const args = [scriptPath];
            if (fromDate) args.push('--from', fromDate);
            if (toDate) args.push('--to', toDate);
            if (preview) args.push('--preview');
            return await executePython(args, mergedJson);
        }

        case '/api/cyber/sync-locations': {
            const args = [scriptPath, '--sync-locations'];
            if (mergedData.preview) args.push('--preview');
            return await executePython(args, mergedJson);
        }

        case '/api/cyber/sync-status': {
            return {
                status: 'ok',
                mode: 'local_daemon',
                server_time: new Date().toISOString(),
                has_cybersoft_local: fs.existsSync('D:\\CyberSoft\\CYBNET9_VANDAO')
            };
        }

        case '/api/cyber/plan-filter-options': {
            const model = queryParams.model || mergedData.model || '';
            const args = [scriptPath, '--plan-filter-options'];
            if (model) args.push('--model', model);
            return await executePython(args, '');
        }

        case '/api/cyber/search-factory-plan':
            return await executePython([scriptPath, '--search-plan'], mergedJson);

        case '/api/cyber/ton-kho-report':
            return await executePython([scriptPath, '--ton-kho-report'], mergedJson);

        case '/api/cyber/xep-xe-contracts':
            return await executePython([scriptPath, '--xep-xe-contracts'], mergedJson);

        case '/api/cyber/xep-xe-candidates':
            return await executePython([scriptPath, '--xep-xe-candidates'], mergedJson);

        case '/api/cyber/xep-xe-save':
            return await executePython([scriptPath, '--xep-xe-save'], mergedJson);

        case '/api/cyber/xep-xe-delete':
            return await executePython([scriptPath, '--xep-xe-delete'], mergedJson);

        case '/api/cyber/create-dnx':
            return await executePython([scriptPath, '--create-dnx'], mergedJson);

        case '/api/cyber/lookup-vin':
            return await executePython([scriptPath, '--lookup-vin'], mergedJson);

        case '/api/cyber/voucher-tickets':
            return await executePython([scriptPath, '--voucher-tickets'], mergedJson);

        case '/api/cyber/export-pdf':
            return await executePython([scriptPath, '--export-pdf'], mergedJson);

        case '/api/cyber/check-contract-status':
            return await executePython([scriptPath, '--check-contract-status'], mergedJson);

        case '/api/cyber/sync-ton-kho-to-supabase':
            return await executePython([scriptPath, '--sync-ton-kho'], '{}');

        case '/api/cyber/sync-all-to-supabase':
            return await executePython([scriptPath, '--sync-all-cyber'], '{}');

        // Phân hệ CRM Cyber
        case '/api/cyber/crm-metadata':
            return await executePython([crmScript, '--metadata'], '');

        case '/api/cyber/crm-check-duplicates': {
            const payload = { ...mergedData, action: 'check_duplicates' };
            return await executePython([crmScript], JSON.stringify(payload));
        }

        case '/api/cyber/crm-import-khtn': {
            const payload = { ...mergedData, action: 'import_khtn' };
            return await executePython([crmScript], JSON.stringify(payload));
        }

        case '/api/health':
            return { status: 'ok', service: 'CyberSync Local Server & Bridge', time: new Date().toISOString() };

        case '/api/cyber/sync-car-status':
            return await executePython([scriptPath, '--sync-car-status'], mergedJson);

        case '/api/cyber/diagnose-pdf':
            return await executePython([scriptPath, '--diagnose-pdf'], mergedJson);

        // M-Invoice
        case '/api/minvoice/fetch-invoice': {
            const vin = queryParams.vin || mergedData.vin || '';
            return await executePython([minvoiceScript], JSON.stringify({ vin }));
        }

        case '/api/minvoice/sync-and-notify': {
            const payload = { ...mergedData, action: 'sync_and_notify' };
            return await executePython([minvoiceScript], JSON.stringify(payload));
        }

        case '/api/minvoice/batch-fetch':
            return await executePython([minvoiceScript], mergedJson);

        default:
            throw new Error(`Đường dẫn API không hỗ trợ: ${pathname}`);
    }
}

// ─────────────────────────────────────────────────────────────
// 1. KẾT NỐI SUPABASE REALTIME BRIDGE (CHO WEB GITHUB PAGES)
// ─────────────────────────────────────────────────────────────
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let bridgeChannel = null;

if (supabaseUrl && supabaseKey) {
    try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false }
        });

        bridgeChannel = supabase.channel('cyber-realtime-bridge', {
            config: { broadcast: { self: false } }
        });

        // 1. Phản hồi nhịp tim (Heartbeat) định kỳ để Web GitHub Pages biết máy tính đang online
        const sendHeartbeat = () => {
            if (!bridgeChannel) return;
            bridgeChannel.send({
                type: 'broadcast',
                event: 'daemon-heartbeat',
                payload: {
                    online: true,
                    timestamp: Date.now(),
                    platform: process.platform,
                    version: '2.0-bridge'
                }
            }).catch(() => {});
        };

        // 2. Lắng nghe yêu cầu Ping tức thời
        bridgeChannel.on('broadcast', { event: 'daemon-ping' }, () => {
            sendHeartbeat();
        });

        // 3. Lắng nghe và xử lý yêu cầu gọi API từ Web (GitHub Pages)
        bridgeChannel.on('broadcast', { event: 'daemon-request' }, async ({ payload }) => {
            if (!payload || !payload.requestId) return;
            const { requestId, pathname, method = 'POST', body, queryParams = {} } = payload;
            console.log(`[Cyber Bridge] Nhận yêu cầu từ Web: ${method} ${pathname} (ID: ${requestId})`);

            try {
                const startTime = Date.now();
                const result = await handleCyberAction(pathname, method, body, queryParams);
                const duration = Date.now() - startTime;
                console.log(`[Cyber Bridge] Hoàn tất ${pathname} trong ${duration}ms -> Gửi phản hồi về Web.`);

                await bridgeChannel.send({
                    type: 'broadcast',
                    event: 'daemon-response',
                    payload: {
                        requestId,
                        success: true,
                        data: result
                    }
                });
            } catch (err) {
                console.error(`[Cyber Bridge Lỗi] ${pathname}:`, err.message);
                await bridgeChannel.send({
                    type: 'broadcast',
                    event: 'daemon-response',
                    payload: {
                        requestId,
                        success: false,
                        error: err.message
                    }
                });
            }
        });

        bridgeChannel.subscribe((status) => {
            console.log(`[Cyber Bridge Realtime] Trạng thái kết nối Supabase: ${status}`);
            if (status === 'SUBSCRIBED') {
                sendHeartbeat();
                // Phát heartbeat mỗi 5 giây
                setInterval(sendHeartbeat, 5000);
            }
        });

    } catch (e) {
        console.error('[Cyber Bridge Lỗi khởi tạo Supabase Realtime]:', e);
    }
} else {
    console.warn('[Cyber Bridge] Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env');
}

// ─────────────────────────────────────────────────────────────
// 2. TỰ ĐỘNG CHẠY TIẾN TRÌNH ĐỒNG BỘ PDF NGẦM (NẾU CÓ D:\CyberSoft)
// ─────────────────────────────────────────────────────────────
const cyberDir = 'D:\\CyberSoft\\CYBNET9_VANDAO';
if (fs.existsSync(cyberDir) && process.env.ENABLE_PDF_SYNC !== 'false') {
    console.log(`[CyberSync] Đã tìm thấy CyberSoft tại ${cyberDir}.`);
    console.log('[CyberSync] Đang kích hoạt tiến trình tự động xuất PDF gốc (DNX, TD4) lên Supabase...');
    const pdfSyncProc = spawn('python', ['scripts/watch_and_sync_cyber_pdfs.py', '--interval', '15', '--limit', '20', '--max-export', '5'], {
        cwd: __dirname,
        stdio: 'inherit'
    });
    pdfSyncProc.on('exit', (code) => {
        console.log(`[CyberSync] PDF sync daemon kết thúc với code: ${code}`);
    });
} else {
    console.log('[CyberSync] Bỏ qua xuất PDF ngầm (không tìm thấy D:\\CyberSoft hoặc tắt qua cấu hình).');
}

// ─────────────────────────────────────────────────────────────
// 3. HTTP SERVER TRUYỀN THỐNG (CỔNG 3001) CHO LOCALHOST
// ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const queryParams = Object.fromEntries(urlObj.searchParams);

    // Xem PDF trực tiếp
    if (pathname === '/api/cyber/view-pdf') {
        const rawStt = (urlObj.searchParams.get('stt_rec') || '').trim().replace(/\.pdf$/i, '');
        const baseStt = rawStt.replace(/(_sig|_nosig)$/i, '');
        const safeBase = baseStt.replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeName = rawStt.replace(/[^a-zA-Z0-9_-]/g, '_');
        const isNosig = /_nosig$/i.test(rawStt);
        const isSig = /_sig$/i.test(rawStt);

        let candidates = [];
        if (isNosig) {
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
            if (req.method === 'HEAD') return res.end();
            return fs.createReadStream(foundPath).pipe(res);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            return res.end(JSON.stringify({ success: false, error: 'PDF not found' }));
        }
    }

    // Các route JSON khác
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
        try {
            const result = await handleCyberAction(pathname, req.method, body, queryParams);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(result));
        } catch (err) {
            console.error(`[HTTP Error] ${pathname}:`, err.message);
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: err.message }));
        }
    });
});

server.listen(PORT, () => {
    console.log('==================================================================');
    console.log(`  CYBERSYNC DỊCH VỤ NỘI BỘ ĐÃ KHỞI CHẠY THÀNH CÔNG!`);
    console.log(`  - Local Port:       http://localhost:${PORT}`);
    console.log(`  - Supabase Bridge:  Kênh 'cyber-realtime-bridge' (Đang lắng nghe)`);
    console.log(`  - Web GitHub Pages: Sẽ tự động ưu tiên máy tính này, KHÔNG dùng Render!`);
    console.log('==================================================================');
});
