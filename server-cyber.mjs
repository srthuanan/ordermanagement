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

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://jwvgxqrkjlbewvpkvucj.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
let supabase = null;
if (supabaseUrl && supabaseKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    } catch (e) {
        console.warn('[Supabase Client Warning]', e.message);
    }
}

const PORT = parseInt(process.env.CYBER_LOCAL_PORT || '3001', 10);
const scriptPath = path.resolve(__dirname, 'scripts', 'sync_thuan_an_allocations.py');
const crmScript = path.resolve(__dirname, 'scripts', 'cyber_crm_service.py');
const minvoiceScript = path.resolve(__dirname, 'scripts', 'm_invoice_service.py');
const donHangTonScript = path.resolve(__dirname, 'scripts', 'sync_cyber_donhang_ton.py');
const gpsRadarScript = path.resolve(__dirname, 'scripts', 'cloud_dms_sync_radar.py');
const dmsAriCheckerScript = path.resolve(__dirname, 'scripts', 'dms_vso_ari_checker.py');

process.on('uncaughtException', (err) => {
    console.error('[CRITICAL] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[CRITICAL] Unhandled rejection:', reason);
});



/**
 * Thực thi lệnh python và trả về Promise JSON
 */
function executePython(args, bodyData) {
    return new Promise((resolve, reject) => {
        const pyProcess = spawn('python', args, { cwd: __dirname, env: { ...process.env } });
        let stdout = '';
        let stderr = '';

        pyProcess.on('error', (err) => {
            console.error(`[CyberSync Error] Spawn error:`, err.message);
            reject(err);
        });

        if (pyProcess.stdin) {
            pyProcess.stdin.on('error', (err) => {
                console.error(`[CyberSync Error] stdin error:`, err.message);
            });
            if (bodyData) {
                pyProcess.stdin.write(typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData));
            }
            pyProcess.stdin.end();
        }

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

        case '/api/cyber/cross-showroom-allocations':
            return await executePython([scriptPath, '--cross-showroom-allocations'], mergedJson);

        case '/api/cyber/other-showroom-allocations':
            return await executePython([scriptPath, '--other-showroom-allocations'], mergedJson);

        case '/api/cyber/transfer-business-location':
            return await executePython([scriptPath, '--transfer-business-location'], mergedJson);

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

        case '/api/cyber/approve-contract':
            return await executePython([scriptPath, '--approve-contract'], mergedJson);

        case '/api/cyber/revoke-contract-approval':
            return await executePython([scriptPath, '--revoke-contract-approval'], mergedJson);

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

        case '/api/cyber/sync-donhang-ton': {
            console.log(`\n==================================================================`);
            console.log(`[CyberSync Đơn Tồn] 🔄 [${new Date().toLocaleTimeString('vi-VN')}] NHẬN LỆNH ĐỒNG BỘ ĐƠN CỌC TỒN TỪ WEB...`);
            console.log(`[CyberSync Đơn Tồn] ⏳ Đang kết nối SQL CyberSoft (SQLVanDao) truy vấn dữ liệu...`);
            const startTime = Date.now();
            const res = await executePython([donHangTonScript], '{}');
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[CyberSync Đơn Tồn] ✅ [${new Date().toLocaleTimeString('vi-VN')}] ${res?.message || 'Đồng bộ thành công'} (hoàn tất trong ${duration}s)`);
            console.log(`==================================================================\n`);
            return res;
        }

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

        // Tra cứu DMS VSO & ARI tự động chuyển sang Chờ ký
        case '/api/dms/check-approved-ari': {
            const orderNo = queryParams.orderNo || mergedData.orderNo || '';
            const orderNumbers = Array.isArray(mergedData.orderNumbers) ? mergedData.orderNumbers : [];
            const checkAll = queryParams.checkAll === 'true' || mergedData.checkAll === true || mergedData.checkAll === 'true' || queryParams.all === 'true' || mergedData.all === true;
            const args = [dmsAriCheckerScript];
            if (orderNo) {
                args.push(orderNo);
            } else if (orderNumbers.length > 0) {
                args.push('--orders', orderNumbers.join(','));
            } else if (checkAll) {
                args.push('--all');
            }
            const pyRes = await executePython(args, '');
            if (pyRes) {
                const rawStr = pyRes.raw || (typeof pyRes === 'string' ? pyRes : '');
                if (rawStr.includes('__JSON_RESULT_START__')) {
                    const parts = rawStr.split('__JSON_RESULT_START__');
                    if (parts.length > 1) {
                        const jsonPart = parts[1].split('__JSON_RESULT_END__')[0].trim();
                        try { return JSON.parse(jsonPart); } catch (_) {}
                    }
                }
            }
            return pyRes;
        }

        // Lấy danh sách showroom và trạng thái Cookie DMS
        case '/api/dms/dealers': {
            const dealersFile = path.resolve(__dirname, 'dms_dealers_config.json');
            if (fs.existsSync(dealersFile)) {
                try {
                    const data = JSON.parse(fs.readFileSync(dealersFile, 'utf8'));
                    return data;
                } catch (e) {
                    return [];
                }
            }
            return [];
        }

        // Nhận Cookie mới từ Extension hoặc app đồng bộ
        case '/api/dms/sync': {
            const dCode = (mergedData.dealer_code || queryParams.dealer_code || '').trim().toUpperCase();
            const newCookie = (mergedData.cookie || queryParams.cookie || '').trim();
            if (!dCode || !newCookie) {
                return { success: false, error: 'Thiếu dealer_code hoặc cookie' };
            }
            const dealersFile = path.resolve(__dirname, 'dms_dealers_config.json');
            let dealersList = [];
            if (fs.existsSync(dealersFile)) {
                try {
                    dealersList = JSON.parse(fs.readFileSync(dealersFile, 'utf8'));
                } catch (e) {
                    dealersList = [];
                }
            }
            const foundItem = dealersList.find(x => (x.dealer_code || '').toUpperCase() === dCode);
            if (foundItem) {
                foundItem.cookie = newCookie;
                foundItem.last_sync_time = new Date().toISOString();
            } else {
                dealersList.push({
                    dealer_code: dCode,
                    name: `VinFast Showroom ${dCode}`,
                    cookie: newCookie,
                    last_sync_time: new Date().toISOString()
                });
            }
            fs.writeFileSync(dealersFile, JSON.stringify(dealersList, null, 2), 'utf8');
            console.log(`[DMS Sync] 🔑 Đã nạp Cookie mới cho Showroom [${dCode}] thành công!`);
            return { status: 'ok', success: true, message: `Đã lưu cookie cho [${dCode}]` };
        }

        // Tra cứu đơn hàng VSO trực tiếp từ DMS Dynamics (Live Fallback)
        case '/api/dms/lookup-vso': {
            const vsoRaw = (mergedData.vso || queryParams.vso || '').trim();
            return await lookupDmsVsoLive(vsoRaw);
        }

        default:
            throw new Error(`Đường dẫn API không hỗ trợ: ${pathname}`);
    }
}

/**
 * Trích xuất nhãn formattedvalue hoặc lookup id từ đối tượng Dynamics OData
 */
function getDmsLookupName(item, field) {
    if (!item) return "";
    const f = field.toLowerCase();
    for (const [k, v] of Object.entries(item)) {
        const kl = k.toLowerCase();
        if (kl.includes(f) && kl.includes('@odata.community.display.v1.formattedvalue')) {
            return String(v ?? '');
        }
    }
    for (const [k, v] of Object.entries(item)) {
        const kl = k.toLowerCase();
        if (kl.includes(f) && kl.includes('_value')) {
            return String(v ?? '');
        }
    }
    const val = item[field];
    return val !== undefined && val !== null ? String(val) : '';
}

/**
 * Tra cứu tức thì số đơn hàng VSO trên VinFast DMS và tự nạp vào donhanghienhuu nếu là đơn Mở
 */
async function lookupDmsVsoLive(vsoRaw) {
    const cleanNo = (vsoRaw || '').trim().toUpperCase().replace(/-VS0-/g, '-VSO-');
    if (!cleanNo) return { success: false, found: false, error: 'Thiếu mã đơn hàng VSO' };

    const dealersFile = path.resolve(__dirname, 'dms_dealers_config.json');
    let dealersList = [];
    if (fs.existsSync(dealersFile)) {
        try {
            dealersList = JSON.parse(fs.readFileSync(dealersFile, 'utf8'));
        } catch (_) {}
    }

    const dCode = (cleanNo.split('-')[0] || '').trim().toUpperCase();
    let targetDealer = dealersList.find(x => (x.dealer_code || '').toUpperCase() === dCode && x.cookie);
    if (!targetDealer) {
        targetDealer = dealersList.find(x => x.cookie);
    }

    if (!targetDealer || !targetDealer.cookie) {
        return {
            success: false,
            found: false,
            error: `Chưa có Cookie DMS hoạt động cho showroom [${dCode}]. Vui lòng dùng Extension đồng bộ lại.`
        };
    }

    const queryUrl = `https://vinfastdms.crm5.dynamics.com/api/data/v9.2/xts_newvehiclesalesorders?$filter=xts_newvehiclesalesordernumber eq '${encodeURIComponent(cleanNo)}'`;
    try {
        const res = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Cookie': targetDealer.cookie,
                'Accept': 'application/json',
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Prefer': 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"'
            },
            signal: AbortSignal.timeout(20000)
        });

        if (res.status === 401) {
            return {
                success: false,
                found: false,
                error: `Cookie của đại lý [${dCode}] đã hết hạn (401). Vui lòng dùng Extension cập nhật lại.`
            };
        }

        if (!res.ok) {
            return {
                success: false,
                found: false,
                error: `Lỗi kết nối VinFast DMS (HTTP ${res.status})`
            };
        }

        const data = await res.json();
        const items = data.value || [];
        if (items.length === 0) {
            return {
                success: true,
                found: false,
                error: `Không tìm thấy Số đơn hàng ${cleanNo} trên hệ thống VinFast DMS.`
            };
        }

        const item = items[0];
        const invDate = item.xvf_sapinvoicedate || item.xts_salesdate;
        const hasSapInv = Boolean(item.xvf_sapinvoicenumber);
        const isInvStatus = [7, 10, '7', '10'].includes(item.xts_status);
        const statusText = (getDmsLookupName(item, 'xts_status') || '').toLowerCase();
        const isBlocked = ['hóa đơn', 'invoiced', 'hủy', 'cancel', 'void', 'closed', 'đã giao', 'hoàn tất'].some(b => statusText.includes(b));

        const isOpen = !invDate && !hasSapInv && !isInvStatus && !isBlocked;

        const orderRecord = {
            new_vehicle_sales_order_id: item.xts_newvehiclesalesorderid || "",
            kiem_tra_tong_cho_hang: "",
            ngay_sua_doi: item.modifiedon || null,
            ngay_giao_dich: item.xts_transactiondate ? item.xts_transactiondate.substring(0, 10) : null,
            tu_van_ban_hang: getDmsLookupName(item, "xts_salespersonid") || getDmsLookupName(item, "ownerid") || "",
            so_don_hang_ban: item.xts_newvehiclesalesordernumber || cleanNo,
            so_bao_gia_xe: getDmsLookupName(item, "xts_newvehiclesalesquoteid") || "",
            ngay_xuat_hoa_don: invDate ? String(invDate).substring(0, 10) : null,
            khach_hang_tiem_nang: getDmsLookupName(item, "xts_potentialcustomerid") || item.xts_potentialcustomerdescription || "",
            promotion: getDmsLookupName(item, "xvf_promotionid") || item.itv_promotiondetail || "",
            ma_khach_hang: item.xts_customernumber || "",
            mo_ta_san_pham: item.xts_productdescription || getDmsLookupName(item, "xts_productid") || "",
            ten_phien_ban: getDmsLookupName(item, "xvf_characteristicconfiguration") || getDmsLookupName(item, "xts_productconfigurationid") || "",
            loai_tran: getDmsLookupName(item, "itv_characteristicceilingid") || "",
            mau_ngoai_that: item.xvf_exteriorcolor || getDmsLookupName(item, "xts_productexteriorcolorid") || "",
            mau_noi_that: item.xvf_interiorcolor || getDmsLookupName(item, "xts_productinteriorcolorid") || "",
            ma_phien_ban: getDmsLookupName(item, "xvf_vehiclepackage") || "",
            ma_mau_ngoai_that: getDmsLookupName(item, "xts_productexteriorcolorid") || getDmsLookupName(item, "xvf_characteristicexteriorcolor") || "",
            ma_mau_noi_that: getDmsLookupName(item, "xts_productinteriorcolorid") || getDmsLookupName(item, "xvf_characteristicinteriorcolor") || "",
            trang_thai: getDmsLookupName(item, "xts_status") || (isOpen ? "Mở" : "Hóa đơn"),
            pre_customer: getDmsLookupName(item, "itv_customerpreorderid") || getDmsLookupName(item, "itv_leadid") || "",
            so_vin: getDmsLookupName(item, "xts_chassisid") || item.xts_chassisnumber || "",
            accessory_serial: getDmsLookupName(item, "xts_stockid") || "",
            ma_san_pham: getDmsLookupName(item, "xts_productid") || "",
            so_ton_kho: getDmsLookupName(item, "xts_stockid") || "",
            so_tien_thuc_sau_thue: item.xts_netamountaftertax || item.xvf_grandtotal || 0,
            don_hang_goc: getDmsLookupName(item, "xts_originalnewvehiclesalesorderreferenceid") || "",
            chi_nhanh: getDmsLookupName(item, "xts_businessunitid") || ""
        };

        // Nếu là đơn hàng MỞ, tự động lưu ngay vào Supabase bảng donhanghienhuu
        if (isOpen && supabase) {
            try {
                await supabase.from('donhanghienhuu').upsert(orderRecord, { onConflict: 'so_don_hang_ban' });
                console.log(`[DMS Live Lookup] ⚡ Đã tự động lưu đơn hàng MỞ ${cleanNo} vào donhanghienhuu!`);
            } catch (errSup) {
                console.warn(`[DMS Live Lookup] Lỗi upsert donhanghienhuu:`, errSup);
            }
        }

        return {
            success: true,
            found: true,
            isOpen,
            order: orderRecord,
            reason: isOpen ? undefined : `VSO trên DMS đã ở trạng thái ${orderRecord.trang_thai || 'Hóa đơn'}.`
        };
    } catch (netErr) {
        return {
            success: false,
            found: false,
            error: `Lỗi kết nối DMS: ${netErr.message}`
        };
    }
}

// ─────────────────────────────────────────────────────────────
// 1. KẾT NỐI SUPABASE REALTIME BRIDGE (CHO WEB GITHUB PAGES)
// ─────────────────────────────────────────────────────────────
let bridgeChannel = null;

if (supabase) {
    try {
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
        stdio: ['ignore', 'pipe', 'pipe']
    });
    pdfSyncProc.stdout.on('data', (d) => process.stdout.write(d));
    pdfSyncProc.stderr.on('data', (d) => process.stderr.write(d));
    pdfSyncProc.on('error', (err) => {
        console.error(`[CyberSync Error] Khởi động PDF sync daemon lỗi:`, err.message);
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
    res.setHeader('Access-Control-Allow-Private-Network', 'true');

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
            console.log(`[HTTP Local] 📥 [${new Date().toLocaleTimeString('vi-VN')}] Nhận yêu cầu: ${req.method} ${pathname}`);
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
    console.log(`  - AutoSync Đơn Tồn: Chạy ngầm định kỳ mỗi 3 tiếng/lần`);
    console.log(`  - AutoSync Đơn DMS: Chạy ngầm đồng bộ donhanghienhuu mỗi 1 tiếng/lần`);
    console.log(`  - AutoSync GPS DMS: Chạy khi khởi động và tự động quét 4 lần/ngày (mỗi 6 tiếng)`);
    console.log('==================================================================');

    // ── Tự động đồng bộ Đơn hàng mở DMS vào bảng donhanghienhuu mỗi 1 tiếng (1 * 3600 * 1000 ms)
    const ONE_HOUR_MS = 1 * 60 * 60 * 1000;
    setTimeout(() => {
        console.log(`[AutoSync DMS Orders] 📋 [${new Date().toLocaleString('vi-VN')}] Đang đồng bộ donhanghienhuu từ DMS lần đầu...`);
        executePython([gpsRadarScript, 'orders_only'], '{}')
            .then(res => console.log(`[AutoSync DMS Orders] ✅ Hoàn tất đồng bộ donhanghienhuu!`))
            .catch(err => console.error(`[AutoSync DMS Orders Error]:`, err.message));

        setInterval(() => {
            console.log(`[AutoSync DMS Orders] 📋 [${new Date().toLocaleString('vi-VN')}] Đang đồng bộ donhanghienhuu định kỳ (chu kỳ 1 tiếng)...`);
            executePython([gpsRadarScript, 'orders_only'], '{}')
                .then(res => console.log(`[AutoSync DMS Orders] ✅ Hoàn tất đồng bộ donhanghienhuu định kỳ!`))
                .catch(err => console.error(`[AutoSync DMS Orders Error]:`, err.message));
        }, ONE_HOUR_MS);
    }, 10000);

    // ── Tự động quét GPS DMS xe lồng: Chạy ngay khi khởi động và 4 lần/ngày (mỗi 6 tiếng = 6 * 3600 * 1000 ms)
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    setTimeout(() => {
        console.log(`[AutoSync GPS] 🛰️ [${new Date().toLocaleString('vi-VN')}] Đang quét vị trí GPS xe lồng lần đầu khi khởi động máy...`);
        executePython([gpsRadarScript, 'gps_only'], '{}')
            .then(res => console.log(`[AutoSync GPS] ✅ Hoàn tất quét GPS xe lồng khi khởi động!`))
            .catch(err => console.error(`[AutoSync GPS Error]:`, err.message));

        setInterval(() => {
            console.log(`[AutoSync GPS] 🛰️ [${new Date().toLocaleString('vi-VN')}] Đang quét vị trí GPS định kỳ (lịch 4 lần/ngày)...`);
            executePython([gpsRadarScript, 'gps_only'], '{}')
                .then(res => console.log(`[AutoSync GPS] ✅ Hoàn tất quét vị trí GPS định kỳ!`))
                .catch(err => console.error(`[AutoSync GPS Error]:`, err.message));
        }, SIX_HOURS_MS);
    }, 25000);

    // ── Tự động đồng bộ ngầm đơn hàng cọc tồn từ Cyber mỗi 3 tiếng (3 * 3600 * 1000 ms)
    const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
    setTimeout(() => {
        executePython([donHangTonScript], '{}')
            .then(res => console.log(`[AutoSync DonHangTon] ✅ Đồng bộ ngầm đơn cọc tồn Cyber hoàn tất:`, res?.message || 'Thành công'))
            .catch(err => console.error(`[AutoSync DonHangTon Error]:`, err.message));

        setInterval(() => {
            console.log(`[AutoSync DonHangTon] 🔄 [${new Date().toLocaleString('vi-VN')}] Đang chạy ngầm đồng bộ đơn cọc tồn Cyber (chu kỳ 3h)...`);
            executePython([donHangTonScript], '{}')
                .then(res => console.log(`[AutoSync DonHangTon] ✅ Đồng bộ ngầm đơn cọc tồn Cyber hoàn tất:`, res?.message || 'Thành công'))
                .catch(err => console.error(`[AutoSync DonHangTon Error]:`, err.message));
        }, THREE_HOURS_MS);
    }, 15000);

    // ── Tự động kiểm tra và giới hạn dung lượng file log (tối đa 5MB) mỗi 30 phút
    rotateLogFile();
    setInterval(() => rotateLogFile(), 30 * 60 * 1000);
});
