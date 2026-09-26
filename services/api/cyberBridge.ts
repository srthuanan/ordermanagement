import { supabase } from '../supabaseClient';

/**
 * Cyber Realtime Bridge:
 * Cầu nối thời gian thực giữa Web (GitHub Pages / Online) và File BAT chạy trên máy tính văn phòng.
 *
 * Cơ chế hoạt động:
 * 1. Khi file BAT chạy trên máy tính, nó kết nối vào Supabase Realtime channel 'cyber-realtime-bridge'
 *    và phát nhịp tim (heartbeat) định kỳ mỗi 5 giây.
 * 2. Khi Web trên GitHub Pages cần gọi bất kỳ API Cyber nào:
 *    - Nếu nhận diện file BAT đang chạy: Gửi yêu cầu qua kênh Supabase Broadcast và nhận kết quả tức thì (~100-200ms).
 *      -> 100% KHÔNG CẦN DÙNG ĐẾN BÊN THỨ 3 (RENDER).
 *    - Nếu file BAT tắt (hoặc máy văn phòng tắt): Tự động chuyển hướng (fallback) gọi qua Cloud Render.
 */

interface DaemonStatus {
    isOnline: boolean;
    lastHeartbeat: number;
    platform?: string;
    version?: string;
}

let daemonStatus: DaemonStatus = {
    isOnline: false,
    lastHeartbeat: 0
};

const listeners = new Map<string, { resolve: (data: any) => void; reject: (err: any) => void }>();
let bridgeChannel: any = null;
let statusSubscribers: Array<(status: DaemonStatus) => void> = [];

export const subscribeDaemonStatus = (callback: (status: DaemonStatus) => void) => {
    statusSubscribers.push(callback);
    callback(daemonStatus);
    return () => {
        statusSubscribers = statusSubscribers.filter(cb => cb !== callback);
    };
};

const notifyStatusChange = () => {
    statusSubscribers.forEach(cb => cb({ ...daemonStatus }));
};

export const getDaemonStatus = (): DaemonStatus => ({ ...daemonStatus });

export const initCyberBridge = () => {
    if (typeof window === 'undefined') return;
    if (bridgeChannel) return;

    try {
        bridgeChannel = supabase.channel('cyber-realtime-bridge', {
            config: {
                broadcast: { self: false }
            }
        });

        // Nhận nhịp tim từ daemon máy tính văn phòng
        bridgeChannel.on('broadcast', { event: 'daemon-heartbeat' }, ({ payload }: any) => {
            daemonStatus = {
                isOnline: true,
                lastHeartbeat: Date.now(),
                platform: payload?.platform,
                version: payload?.version
            };
            notifyStatusChange();
        });

        // Nhận phản hồi Ping
        bridgeChannel.on('broadcast', { event: 'daemon-pong' }, ({ payload }: any) => {
            daemonStatus = {
                isOnline: true,
                lastHeartbeat: Date.now(),
                platform: payload?.platform,
                version: payload?.version
            };
            notifyStatusChange();
        });

        // Nhận kết quả xử lý từ daemon máy tính
        bridgeChannel.on('broadcast', { event: 'daemon-response' }, ({ payload }: any) => {
            const reqId = payload?.requestId;
            if (reqId && listeners.has(reqId)) {
                const { resolve, reject } = listeners.get(reqId)!;
                listeners.delete(reqId);
                if (payload.success) {
                    resolve(payload.data);
                } else {
                    reject(new Error(payload.error || 'Lỗi xử lý từ máy tính văn phòng'));
                }
            }
        });

        bridgeChannel.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
                // Hỏi ngay xem có daemon nào đang online không
                pingLocalDaemon();
            }
        });

        // Quét kiểm tra trạng thái heartbeat mỗi 5 giây
        setInterval(() => {
            if (daemonStatus.isOnline && Date.now() - daemonStatus.lastHeartbeat > 15000) {
                daemonStatus.isOnline = false;
                notifyStatusChange();
            }
        }, 5000);
    } catch (err) {
        console.warn('[CyberBridge] Không thể khởi tạo kênh Realtime:', err);
    }
};

export const pingLocalDaemon = async () => {
    if (!bridgeChannel) return false;
    try {
        await bridgeChannel.send({
            type: 'broadcast',
            event: 'daemon-ping',
            payload: { timestamp: Date.now() }
        });
        return true;
    } catch (_) {
        return false;
    }
};

// Tự động khởi tạo ngay khi nạp module
initCyberBridge();

export const getResolvedCyberApiUrl = (): string => {
    let customUrl = (typeof window !== 'undefined' ? localStorage.getItem('cyber_api_url') : '') || '';
    if (customUrl && customUrl.includes('cybersync-api.onrender.com') && !customUrl.includes('cybersync-api-4k4j')) {
        try { localStorage.removeItem('cyber_api_url'); } catch (_) {}
        customUrl = '';
    }
    let envUrl = ((import.meta as any).env?.VITE_CYBER_API_URL || '').trim();
    if (envUrl && envUrl.includes('cybersync-api.onrender.com') && !envUrl.includes('cybersync-api-4k4j')) {
        envUrl = '';
    }
    return (customUrl || envUrl || 'https://cybersync-api-4k4j.onrender.com').trim().replace(/\/+$/, '');
};

interface RequestCyberOptions {
    method?: 'GET' | 'POST';
    body?: any;
    queryParams?: Record<string, string>;
    timeoutMs?: number;
    /** Bắt buộc dùng Render (bỏ qua bridge) */
    forceCloud?: boolean;
}

/**
 * Hàm điều phối gọi API Cyber thông minh:
 * 1. Nếu chạy ở môi trường localhost -> Thử gọi HTTP local http://localhost:3001
 * 2. Nếu ở GitHub Pages hoặc thiết bị khác:
 *    - Kiểm tra xem file BAT máy tính văn phòng có online không (qua Supabase Realtime).
 *    - Nếu ONLINE -> Gửi lệnh qua máy tính văn phòng (Render HOÀN TOÀN KHÔNG BỊ GỌI).
 *    - Nếu OFFLINE -> Tự động chuyển hướng gọi sang Render Cloud.
 */
export async function executeCyberApi<T = any>(pathname: string, options: RequestCyberOptions = {}): Promise<T> {
    const {
        method = 'POST',
        body,
        queryParams = {},
        timeoutMs = 12000,
        forceCloud = false
    } = options;

    const isLocalHost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '5173'
    );

    // ─── 1. Ưu tiên kiểm tra trực tiếp HTTP nếu đang mở web ngay tại localhost ───
    if (isLocalHost && !forceCloud) {
        try {
            const queryStr = Object.keys(queryParams).length > 0
                ? '?' + new URLSearchParams(queryParams).toString()
                : '';
            const localUrl = `http://localhost:3001${pathname}${queryStr}`;
            const res = await fetch(localUrl, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body || {})) : undefined,
                signal: AbortSignal.timeout(4000)
            });
            if (res.ok) {
                return await res.json();
            }
        } catch (_) {
            // Local HTTP 3001 không chạy, tiếp tục thử các phương thức tiếp theo
        }
    }

    // ─── 2. Ưu tiên máy tính văn phòng qua Supabase Realtime Bridge (hoạt động tốt trên GitHub Pages) ───
    let isBridgeOnline = daemonStatus.isOnline && (Date.now() - daemonStatus.lastHeartbeat < 15000);

    // Nếu vừa nạp trang (chưa nhận heartbeat), gửi ping nhanh chờ tối đa 600ms để bắt tín hiệu file BAT
    if (!forceCloud && !isBridgeOnline && daemonStatus.lastHeartbeat === 0 && bridgeChannel) {
        pingLocalDaemon();
        await new Promise(r => setTimeout(r, 600));
        isBridgeOnline = daemonStatus.isOnline && (Date.now() - daemonStatus.lastHeartbeat < 15000);
    }

    if (!forceCloud && isBridgeOnline && bridgeChannel) {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        try {
            const bridgePromise = new Promise<T>((resolve, reject) => {
                const timer = setTimeout(() => {
                    listeners.delete(requestId);
                    reject(new Error('TIMEOUT_BRIDGE'));
                }, timeoutMs);

                listeners.set(requestId, {
                    resolve: (data) => {
                        clearTimeout(timer);
                        resolve(data);
                    },
                    reject: (err) => {
                        clearTimeout(timer);
                        reject(err);
                    }
                });
            });

            await bridgeChannel.send({
                type: 'broadcast',
                event: 'daemon-request',
                payload: {
                    requestId,
                    pathname,
                    method,
                    body: typeof body === 'string' ? body : JSON.stringify(body || {}),
                    queryParams
                }
            });

            const result = await bridgePromise;
            return result;
        } catch (bridgeErr: any) {
            if (bridgeErr?.message === 'TIMEOUT_BRIDGE') {
                console.warn(`[CyberBridge] Máy tính văn phòng quá thời gian phản hồi cho ${pathname}, tự động fallback sang Render...`);
                daemonStatus.isOnline = false;
                notifyStatusChange();
            } else {
                console.warn(`[CyberBridge] Lỗi qua bridge, thử chuyển sang Render:`, bridgeErr);
            }
        }
    }

    // ─── 3. Phương án dự phòng: Gọi qua Cloud Server (Render) ───
    const cloudApiUrl = getResolvedCyberApiUrl();
    const queryStr = Object.keys(queryParams).length > 0
        ? '?' + new URLSearchParams(queryParams).toString()
        : '';
    const targetUrl = `${cloudApiUrl}${pathname}${queryStr}`;

    const res = await fetch(targetUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body || {})) : undefined,
        signal: AbortSignal.timeout(timeoutMs + 5000)
    });

    if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Lỗi máy chủ Cyber Cloud`);
    }

    return await res.json();
}

/**
 * Hàm fetch bọc (drop-in replacement cho fetch):
 * Tự động chọn File BAT (Supabase Realtime Bridge / Local HTTP 3001) trước,
 * nếu không có thì mới gọi qua Render.
 */
export async function cyberFetch(apiPath: string, init?: RequestInit): Promise<Response> {
    const [pathname, search] = apiPath.split('?');
    const queryParams: Record<string, string> = {};
    if (search) {
        new URLSearchParams(search).forEach((v, k) => { queryParams[k] = v; });
    }
    const method = (init?.method?.toUpperCase() || 'GET') as 'GET' | 'POST';
    const body = init?.body;

    try {
        const result = await executeCyberApi(pathname, {
            method,
            body,
            queryParams
        });
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
