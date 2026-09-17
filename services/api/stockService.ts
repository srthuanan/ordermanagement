import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, mapStockDbToUi, ApiResult, uploadToSupabase } from './baseService';
import { createNotification } from './notificationService';
import { logAction } from './baseService';

export const getStockData = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('khoxe').select('*');
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Fetched stock from Supabase', khoxe: (data || []).map(mapStockDbToUi) };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const holdCar = async (vin: string) => {
    const username = getStorageItem("currentUser") || "";
    const fullName = getStorageItem("currentConsultant") || username || "Chưa xác định";
    try {
        // --- Bắt đầu: Ràng buộc FIFO ---
        if (username !== 'admin') {
            const { data: currentCar } = await supabase.from('khoxe')
                .select('dong_xe, phien_ban, ngoai_that, noi_that, ngay_nhap')
                .eq('vin', vin)
                .single();

            if (currentCar && currentCar.ngay_nhap) {
                const { data: olderCars } = await supabase.from('khoxe')
                    .select('vin')
                    .eq('trang_thai', 'Chưa ghép')
                    .is('nguoi_giu_xe', null)
                    .eq('dong_xe', currentCar.dong_xe)
                    .eq('phien_ban', currentCar.phien_ban)
                    .eq('ngoai_that', currentCar.ngoai_that)
                    .eq('noi_that', currentCar.noi_that)
                    .lt('ngay_nhap', currentCar.ngay_nhap)
                    .order('ngay_nhap', { ascending: true })
                    .limit(1);

                if (olderCars && olderCars.length > 0) {
                    const errorMsg = `Hệ thống từ chối: Xe này nhập sau.\nVui lòng ưu tiên giữ/ghép xe cũ hơn (VIN: ${olderCars[0].vin}) theo đúng quy tắc FIFO!`;
                    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fifo-error', { detail: { message: errorMsg } }));
                    return { 
                        status: 'ERROR', 
                        message: errorMsg 
                    };
                }
            }
        }
        // --- Kết thúc: Ràng buộc FIFO ---

        const { data, error } = await supabase.rpc('rpc_hold_car', { p_vin: vin, p_username: username, p_full_name: fullName });
        if (error) throw error;
        if (data.status === 'SUCCESS') {
            await createNotification({ message: `TVBH ${fullName} vừa mới giữ xe ${vin}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: vin });
            return { status: 'SUCCESS', message: data.message };
        }
        if (data.status === 'SPAM_BLOCK') {
            window.dispatchEvent(new CustomEvent('user-blocked', { detail: { reason: data.message } }));
        }
        return { status: 'ERROR', message: data.message };
    } catch (err: any) {
        return { status: 'ERROR', message: 'Lỗi khi giữ xe.' };
    }
};

export const releaseCar = async (vin: string, outcome: 'released' | 'expired' | 'matched' = 'released') => {
    try {
        // Fetch car configuration before releasing so we can try auto-matching
        const { data: car } = await supabaseAdmin.from('khoxe')
            .select('dong_xe, phien_ban, ngoai_that, noi_that')
            .eq('vin', vin)
            .single();

        const { data, error } = await supabase.rpc('rpc_release_car', { p_vin: vin, p_outcome: outcome });
        if (error) throw error;

        // If successfully released and there was configuration found, try auto-matching
        if (car && (outcome === 'released' || outcome === 'expired')) {
            await tryAutoMatchWaitingOrder(vin, {
                dong_xe: car.dong_xe,
                phien_ban: car.phien_ban,
                ngoai_that: car.ngoai_that,
                noi_that: car.noi_that
            });
        }

        return { status: 'SUCCESS', message: data.message };
    } catch (err: any) {
        console.error("Error releasing car:", err);
        return { status: 'ERROR', message: 'Lỗi khi hủy giữ xe.' };
    }
};

export const joinHoldQueue = async (vin: string) => {
    const username = getStorageItem("currentUser") || "";
    const fullName = getStorageItem("currentConsultant") || username || "Chưa xác định";
    try {
        const { error } = await supabase.from('car_hold_activities').insert({ vin, username, tvbh_name: fullName, type: 'QUEUE', status: 'waiting' });
        if (error) {
            if (error.code === '23505') return { status: 'ERROR', message: 'Bạn đã ở trong hàng chờ của xe này.' };
            throw error;
        }
        await createNotification({ message: `TVBH ${fullName} đã tham gia hàng chờ ưu tiên xe ${vin}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: vin });
        return { status: 'SUCCESS', message: 'Bạn đã gia nhập hàng chờ thành công.' };
    } catch (err) {
        return { status: 'ERROR', message: 'Không thể đăng ký hàng chờ.' };
    }
};

export const leaveHoldQueue = async (vin: string) => {
    const username = getStorageItem("currentUser") || "";
    try {
        const { error } = await supabase.rpc('rpc_leave_hold_queue', {
            p_vin: vin,
            p_username: username
        });
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Đã hủy chờ xe thành công.' };
    } catch (err: any) {
        console.error("Error leaving queue:", err);
        return { status: 'ERROR', message: err.message || 'Lỗi khi hủy chờ xe.' };
    }
};

export const getMyQueuedVins = async (): Promise<string[]> => {
    try {
        await processExpiredQueuePriorities();
        const username = getStorageItem("currentUser");
        if (!username) return [];
        const { data, error } = await supabase.from('car_hold_activities').select('vin').eq('username', username).eq('type', 'QUEUE').in('status', ['waiting', 'notified', 'prioritized']);
        if (error) throw error;
        return (data || []).map(item => item.vin);
    } catch (err) {
        return [];
    }
};

export const uploadHoldEvidence = async (vin: string, file: File) => {
    try {
        const path = `hold_extensions/${vin}_${Date.now()}.${file.name.split('.').pop()}`;
        const url = await uploadToSupabase(file, path);
        return { status: 'SUCCESS', url };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const requestHoldExtension = async (vin: string, evidenceUrl: string, reason: string) => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        await supabase.from('khoxe').update({ is_extension_requested: true, extension_evidence_url: evidenceUrl, extension_reason: reason }).eq('vin', vin);
        await createNotification({ message: `Yêu cầu gia hạn giữ xe cho VIN: ${vin}. Lý do: ${reason}`, type: 'info', recipient: 'ADMINS', targetView: 'stock', targetId: vin });
        await supabase.from('car_hold_activities').insert({ vin, username: currentUser, tvbh_name: currentUser, type: 'PENALTY', status: 'extension_requested', reason: `Xin gia hạn giữ xe`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        
        // --- TELEGRAM NOTIFICATION ---
        try {
            const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
            const TELEGRAM_CHAT_ID = "5812034168";
            const msg = `<b>⏰ YÊU CẦU GIA HẠN GIỮ XE</b>\n\n<b>VIN:</b> <code>${vin}</code>\n<b>Sale:</b> ${currentUser}\n<b>Lý do:</b> ${reason}\n\n<i>Reply tin nhắn này với chữ \"Duyệt\" hoặc \"Từ chối\" để xử lý nhanh.</i>\n\n<b>Mã lệnh:</b> <code>EXT-${vin}</code>`;
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'HTML' })
            });
        } catch (e) { console.error("Telegram notify error", e); }
        
        return { status: 'SUCCESS', message: 'Đã gửi yêu cầu gia hạn đến Quản trị viên.' };
    } catch (err) {
        return { status: 'ERROR', message: 'Lỗi khi gửi yêu cầu gia hạn.' };
    }
};

export const approveHoldExtension = async (vin: string) => {
    try {
        const { data: car } = await supabase.from('khoxe').select('thoi_gian_het_han_giu, extension_count').eq('vin', vin).single();
        if (!car) throw new Error("Xe không tồn tại");
        const parts = car.thoi_gian_het_han_giu.split(' ');
        const d = parts[0].split('/'); const t = parts[1].split(':');
        const exp = new Date(parseInt(d[2]), parseInt(d[1]) - 1, parseInt(d[0]), parseInt(t[0]), parseInt(t[1]), parseInt(t[2]));
        exp.setHours(exp.getHours() + 12);
        const pad = (n: number) => n < 10 ? '0' + n : n;
        const newExpStr = `${pad(exp.getDate())}/${pad(exp.getMonth() + 1)}/${exp.getFullYear()} ${pad(exp.getHours())}:${pad(exp.getMinutes())}:${pad(exp.getSeconds())}`;
        await supabase.from('khoxe').update({ thoi_gian_het_han_giu: newExpStr, is_extension_requested: false, extension_count: (car.extension_count || 0) + 1 }).eq('vin', vin);
        return { status: 'SUCCESS', message: 'Phê duyệt gia hạn thành công.' };
    } catch (err) {
        return { status: 'ERROR', message: 'Lỗi khi duyệt gia hạn.' };
    }
};

export const rejectHoldExtension = async (vin: string) => {
    try {
        await supabase.from('khoxe').update({ is_extension_requested: false }).eq('vin', vin);
        const { data: car } = await supabase.from('khoxe').select('nguoi_giu_xe').eq('vin', vin).single();
        if (car?.nguoi_giu_xe) {
            await supabase.from('car_hold_activities').insert({ vin, username: car.nguoi_giu_xe, tvbh_name: car.nguoi_giu_xe, type: 'PENALTY', status: 'extension_rejected', reason: `Bị từ chối gia hạn`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
        return { status: 'SUCCESS', message: 'Đã từ chối yêu cầu gia hạn.' };
    } catch (err) {
        return { status: 'ERROR', message: 'Lỗi khi từ chối gia hạn.' };
    }
};

export const getPendingHoldExtensions = async () => {
    try {
        const { data } = await supabase.from('khoxe').select('vin, dong_xe, phien_ban, ngoai_that, noi_that, nguoi_giu_xe, thoi_gian_het_han_giu, extension_count, extension_evidence_url, extension_reason').eq('is_extension_requested', true);
        return data || [];
    } catch (err) {
        return [];
    }
};

export const processExpiredQueuePriorities = async () => {
    try {
        const now = new Date();
        const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000).toISOString();

        // 1. Dọn dẹp các ưu tiên đã hết hạn (quá 15p)
        const { data: expiredPrios } = await supabaseAdmin.from('car_hold_activities')
            .select('id, vin')
            .eq('type', 'QUEUE')
            .eq('status', 'prioritized')
            .lt('updated_at', fifteenMinsAgo);

        if (expiredPrios && expiredPrios.length > 0) {
            for (const expPrio of expiredPrios) {
                // Xóa bản ghi prioritized đã hết hạn
                await supabaseAdmin.from('car_hold_activities').delete().eq('id', expPrio.id);
                // Gọi rpc_release_car để hệ thống tự động tìm người tiếp theo trong hàng chờ
                await supabase.rpc('rpc_release_car', { p_vin: expPrio.vin, p_outcome: 'expired' });
            }
        }

        // 2. Kích hoạt hàng chờ cho các xe RẢNH mà chưa có ai đứng tên ưu tiên
        // (Xử lý trường hợp xe được nhả nhưng hệ thống chưa kịp hoặc bị lỗi khi đôn người mới lên)
        const { data: waitingItems } = await supabaseAdmin.from('car_hold_activities')
            .select('vin')
            .eq('type', 'QUEUE')
            .in('status', ['waiting', 'notified']);
        
        if (waitingItems && waitingItems.length > 0) {
            const uniqueVins = Array.from(new Set(waitingItems.map(i => i.vin)));
            
            const [carsRes, prioRes] = await Promise.all([
                supabase.from('khoxe').select('vin, trang_thai').in('vin', uniqueVins),
                supabase.from('car_hold_activities').select('vin').eq('type', 'QUEUE').eq('status', 'prioritized').in('vin', uniqueVins)
            ]);

            const emptyCars = (carsRes.data || []).filter(c => c.trang_thai === 'Chưa ghép').map(c => c.vin);
            const vinsWithPrio = new Set((prioRes.data || []).map(p => p.vin));

            // Lọc ra các xe rảnh tuyệt đối nhưng hàng chờ đang bị "kẹt"
            const stuckVins = emptyCars.filter(vin => !vinsWithPrio.has(vin));
            
            for (const vin of stuckVins) {
                // Đánh thức hàng chờ của xe này
                await supabase.rpc('rpc_release_car', { p_vin: vin, p_outcome: 'released' });
            }
        }
    } catch (err) {
        console.error("Lỗi khi xử lý hàng chờ ưu tiên:", err);
    }
};

export const getAllHoldQueues = async () => {
    try {
        await processExpiredQueuePriorities();
        const { data } = await supabase.from('car_hold_activities').select('*').eq('type', 'QUEUE').order('created_at', { ascending: true });
        return data || [];
    } catch (err) { return []; }
};

export const autoReleaseExpiredHolds = async () => {
    try {
        console.log("[autoReleaseExpiredHolds] Đang kiểm tra các xe hết hạn giữ...");
        
        // 1. Tìm các xe đã quá hạn thoi_gian_het_han_giu (Trùng logic với RPC SQL để đảm bảo chính xác)
        const { data: expiredCars, error: fetchErr } = await supabaseAdmin.from('khoxe')
            .select('vin, dong_xe, phien_ban, ngoai_that, noi_that')
            .eq('trang_thai', 'Đang giữ')
            .neq('thoi_gian_het_han_giu', 'Vô thời hạn')
            .not('thoi_gian_het_han_giu', 'is', null);

        if (fetchErr) throw fetchErr;

        if (!expiredCars || expiredCars.length === 0) {
            return { status: 'SUCCESS', message: 'Không có xe nào hết hạn.' };
        }

        const now = new Date();
        const parseDate = (str: string) => {
            const [d, t] = str.split(' ');
            const [day, month, year] = d.split('/').map(Number);
            const [h, m, s] = t.split(':').map(Number);
            return new Date(year, month - 1, day, h, m, s);
        };

        for (const car of expiredCars) {
            try {
                const { data: currentCar } = await supabaseAdmin.from('khoxe').select('thoi_gian_het_han_giu').eq('vin', car.vin).single();
                if (!currentCar?.thoi_gian_het_han_giu || currentCar.thoi_gian_het_han_giu === 'Vô thời hạn') continue;

                const expiryDate = parseDate(currentCar.thoi_gian_het_han_giu);
                if (expiryDate < now) {
                    console.log(`[autoReleaseExpiredHolds] Xử lý hết hạn cho VIN: ${car.vin}`);
                    
                    // A. Giải phóng xe (Dùng RPC để xử lý uy tín và hàng chờ cũ)
                    await supabase.rpc('rpc_release_car', { p_vin: car.vin, p_outcome: 'expired' });

                    // B. Thử ghép tự động cho người đang chờ (Dự phòng đơn hàng)
                    await tryAutoMatchWaitingOrder(car.vin, {
                        dong_xe: car.dong_xe,
                        phien_ban: car.phien_ban,
                        ngoai_that: car.ngoai_that,
                        noi_that: car.noi_that
                    });
                }
            } catch (carErr) {
                console.error(`Lỗi khi xử lý hết hạn cho xe ${car.vin}:`, carErr);
            }
        }

        return { status: 'SUCCESS' };
    } catch (err) {
        console.error("[autoReleaseExpiredHolds] Lỗi tổng quát:", err);
        return { status: 'ERROR' };
    }
};

/**
 * [MỚI] Tự động ghép nối đơn hàng đang chờ khi có xe được nhả ra
 * Logic ưu tiên: Ngày cọc (ngay_coc) -> Ngày cần xe (thoi_gian_can_xe) -> Thời gian tạo đơn (created_at)
 */
export const tryAutoMatchWaitingOrder = async (vin: string, config: { dong_xe: string, phien_ban: string, ngoai_that: string, noi_that: string }): Promise<boolean> => {
    try {
        console.log(`[tryAutoMatchWaitingOrder] Tìm đơn hàng chờ cho VIN: ${vin}`, config);
        
        // 1. Tìm đơn hàng "Chưa ghép" có cấu hình khớp tuyệt đối
        const { data: waitingOrders, error } = await supabaseAdmin.from('donhang')
            .select('*')
            .eq('ket_qua', 'Chưa ghép')
            .eq('dong_xe', config.dong_xe)
            .eq('phien_ban', config.phien_ban)
            .eq('ngoai_that', config.ngoai_that)
            .eq('noi_that', config.noi_that)
            .order('ngay_coc', { ascending: true }) // Ai cọc trước lấy trước
            .order('thoi_gian_can_xe', { ascending: true, nullsFirst: false }) // Ưu tiên ngày cần xe sớm
            .order('created_at', { ascending: true }) // Ưu tiên người vào hệ thống trước
            .limit(1);

        if (error) {
            console.error("[tryAutoMatchWaitingOrder] Lỗi truy vấn đơn hàng chờ:", error);
            return false;
        }

        if (waitingOrders && waitingOrders.length > 0) {
            const bestMatch = waitingOrders[0];
            const orderNumber = bestMatch.so_don_hang;
            const tvbh = bestMatch.ten_tu_van_ban_hang;

            console.log(`[tryAutoMatchWaitingOrder] Khớp chính xác 100%: ĐH ${orderNumber} (TVBH: ${tvbh})`);

            // 2. Cập nhật trạng thái Kho xe
            const { error: khoxeError } = await supabaseAdmin.from('khoxe').update({
                trang_thai: 'Đã ghép',
                nguoi_giu_xe: tvbh,
                thoi_gian_het_han_giu: 'Vô thời hạn'
            }).eq('vin', vin);
            if (khoxeError) throw khoxeError;

            // 3. Cập nhật trạng thái Đơn hàng
            const { error: orderError } = await supabaseAdmin.from('donhang').update({
                vin: vin,
                ket_qua: 'Đã ghép',
                thoi_gian_ghep: new Date().toISOString()
            }).eq('so_don_hang', orderNumber);
            if (orderError) throw orderError;

            // 4. Gửi thông báo & Email
            if (tvbh) {
                await createNotification({
                    message: `Hệ thống tự động ghép xe dự phòng (VIN: ${vin}) cho đơn hàng ${orderNumber} của bạn.`,
                    type: 'success',
                    recipient: tvbh,
                    targetView: 'orders',
                    targetId: orderNumber
                });
            }

            const { data: fullOrder } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
            supabaseAdmin.functions.invoke('send-email', {
                body: { 
                    actionId: 'match_success', 
                    record: fullOrder || bestMatch
                }
            }).then();

            await logAction('AUTO_MATCH_BACKUP', { orderNumber, vin, config }, orderNumber, 'order');
            return true;
        }
        return false;
    } catch (e) {
        console.error("[tryAutoMatchWaitingOrder] Lỗi hệ thống:", e);
        return false;
    }
};

export const getVehiclesByVins = async (vins: string[]) => {
    try {
        if (!vins.length) return [];
        
        const CHUNK_SIZE = 200;
        let allData: any[] = [];
        
        for (let i = 0; i < vins.length; i += CHUNK_SIZE) {
            const chunk = vins.slice(i, i + CHUNK_SIZE);
            const { data, error } = await supabase.from('khoxe').select('*').in('vin', chunk);
            if (error) throw error;
            if (data) allData = [...allData, ...data];
        }
        
        return allData;
    } catch (err) { 
        console.error("Error in getVehiclesByVins:", err);
        return []; 
    }
};

export interface VehicleStockUpdatePayload {
    vin: string;
    vi_tri?: string;
    ma_dms?: string;
    so_may?: string;
}

export const bulkUpdateVehicleLocations = async (updates: VehicleStockUpdatePayload[]): Promise<ApiResult> => {
    try {
        if (!updates || updates.length === 0) {
            return { status: 'SUCCESS', message: 'Không có xe nào cần cập nhật.' };
        }

        let successCount = 0;
        const CHUNK_SIZE = 50;

        for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
            const chunk = updates.slice(i, i + CHUNK_SIZE);
            await Promise.all(
                chunk.map(async (u) => {
                    const payload: Record<string, any> = {};
                    if (u.vi_tri !== undefined && u.vi_tri !== '') payload.vi_tri = u.vi_tri;
                    if (u.ma_dms !== undefined && u.ma_dms !== '') payload.ma_dms = u.ma_dms;
                    if (u.so_may !== undefined && u.so_may !== '') payload.so_may = u.so_may;

                    if (Object.keys(payload).length === 0) return;

                    const { error } = await supabaseAdmin
                        .from('khoxe')
                        .update(payload)
                        .eq('vin', u.vin);
                    if (!error) successCount++;
                })
            );
        }

        await logAction('BULK_UPDATE_STOCK_LOCATIONS', { updatedCount: successCount, total: updates.length });
        return { 
            status: 'SUCCESS', 
            message: `Đã cập nhật thành công thông tin cho ${successCount}/${updates.length} xe.` 
        };
    } catch (err: any) {
        console.error("Lỗi bulkUpdateVehicleLocations:", err);
        return { status: 'ERROR', message: err.message || 'Lỗi khi cập nhật thông tin kho xe.' };
    }
};

export interface DeliveryPlanItem {
    vin: string;
    vi_tri?: string;
    raw_kho?: string;
    ma_dms?: string;
    so_may?: string;
    dong_xe?: string;
    phien_ban?: string;
    ngoai_that?: string;
    noi_that?: string;
    ngay_phan_bo?: string;
    ngay_nhap_kho?: string;
    ngay_van_tai?: string;
    don_vi_van_tai?: string;
    ghi_chu?: string;
}

export const saveDeliveryPlanToStorage = async (items: DeliveryPlanItem[]): Promise<ApiResult> => {
    try {
        if (!items || items.length === 0) {
            return { status: 'SUCCESS', message: 'Không có dữ liệu kế hoạch giao xe để lưu.' };
        }

        const CHUNK_SIZE = 100;
        let totalUpserted = 0;

        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
            const chunk = items.slice(i, i + CHUNK_SIZE).map(item => ({
                vin: item.vin.trim().toUpperCase(),
                vi_tri: item.vi_tri || '',
                raw_kho: item.raw_kho || '',
                ma_dms: item.ma_dms || '',
                so_may: item.so_may || '',
                dong_xe: item.dong_xe || '',
                phien_ban: item.phien_ban || '',
                ngoai_that: item.ngoai_that || '',
                noi_that: item.noi_that || '',
                ngay_phan_bo: item.ngay_phan_bo || '',
                ngay_nhap_kho: item.ngay_nhap_kho || '',
                ngay_van_tai: item.ngay_van_tai || '',
                don_vi_van_tai: item.don_vi_van_tai || '',
                ghi_chu: item.ghi_chu || '',
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabaseAdmin
                .from('kehoach_giaoxe')
                .upsert(chunk, { onConflict: 'vin' });

            if (error) {
                console.error("Lỗi lưu kehoach_giaoxe chunk:", error);
                throw error;
            }
            totalUpserted += chunk.length;
        }

        await logAction('SAVE_DELIVERY_PLAN', { total: totalUpserted });
        return {
            status: 'SUCCESS',
            message: `Đã lưu trữ ${totalUpserted} xe vào Kế hoạch giao xe.`
        };
    } catch (err: any) {
        console.error("Lỗi saveDeliveryPlanToStorage:", err);
        return { status: 'ERROR', message: err.message || 'Lỗi khi lưu dữ liệu kế hoạch giao xe.' };
    }
};

const getCyberEndpoints = (apiPath: string): string[] => {
    const customUrl = (typeof window !== 'undefined' ? localStorage.getItem('cyber_api_url') : '') || '';
    const cloudApiUrl = ((import.meta as any).env?.VITE_CYBER_API_URL || customUrl || 'https://cybersync-api.onrender.com').trim();
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
    const isLocal = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.port === '5173'
    );

    if (isLocal) {
        return [
            `${currentOrigin}${apiPath}`,
            `http://localhost:3001${apiPath}`,
            ...(cloudApiUrl ? [`${cloudApiUrl.replace(/\/+$/, '')}${apiPath}`] : [])
        ];
    }

    return [
        ...(cloudApiUrl ? [`${cloudApiUrl.replace(/\/+$/, '')}${apiPath}`] : []),
        `${currentOrigin}${apiPath}`,
        `http://localhost:3001${apiPath}`
    ];
};

export const syncCyberAllocations = async (options: { fromDate?: string; toDate?: string; preview?: boolean } = {}) => {
    try {
        // 1. Thử gọi API qua Electron Desktop Bridge nếu có
        if (typeof window !== 'undefined' && window.electronAPI?.syncCyberAllocations) {
            const res = await window.electronAPI.syncCyberAllocations(options);
            return res;
        }

        const endpoints = getCyberEndpoints('/api/cyber/sync-allocations');

        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(options)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) {
            throw new Error(lastErrorMsg || 'Không thể kết nối dịch vụ đồng bộ CyberSoft. Vui lòng mở ứng dụng Desktop (Electron) hoặc chạy lệnh `node server-cyber.mjs`.');
        }

        const data = await response.json();
        return data;
    } catch (err: any) {
        console.error("Lỗi syncCyberAllocations:", err);
        return {
            success: false,
            error: err.message || 'Không thể kết nối dịch vụ đồng bộ CyberSoft. Vui lòng kiểm tra kết nối mạng nội bộ hoặc ứng dụng Desktop.'
        };
    }
};

/**
 * Tự động quét và cập nhật vị trí kho thực tế từ sổ cái CyberSoft ERP (CT70BEX) vào khoxe
 */
export const syncCyberLocations = async (options: { preview?: boolean; vins?: string[] } = { preview: false }) => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/sync-locations');

        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(options)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) {
            throw new Error(lastErrorMsg || 'Không thể kết nối dịch vụ đồng bộ vị trí CyberSoft.');
        }

        const data = await response.json();
        return data;
    } catch (err: any) {
        console.error("Lỗi syncCyberLocations:", err);
        return {
            success: false,
            error: err.message || 'Không thể kết nối dịch vụ đồng bộ vị trí CyberSoft.'
        };
    }
};

export interface CyberPlanSearchParams {
    keyword?: string;
    model?: string;
    version?: string;
    color?: string;
    ttcp?: string;
    fromDate?: string;
    toDate?: string;
    planType?: 'K10' | 'K15' | 'ALL';
    limit?: number;
    offset?: number;
}

/**
 * Tra cứu xe theo điều kiện trên toàn bộ dữ liệu kế hoạch nhà máy giao từ CyberSoft
 */
export const searchCyberFactoryPlan = async (params: CyberPlanSearchParams) => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/search-factory-plan');

        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) {
            throw new Error(lastErrorMsg || 'Không thể kết nối dịch vụ tra cứu CyberSoft.');
        }

        const data = await response.json();
        return data;
    } catch (err: any) {
        console.error("Lỗi searchCyberFactoryPlan:", err);
        return {
            success: false,
            error: err.message || 'Không thể kết nối dịch vụ tra cứu kế hoạch CyberSoft.'
        };
    }
};

/**
 * Lấy danh sách tùy chọn lọc (Showroom, Màu sắc) từ CyberSoft
 */
export const getCyberPlanFilterOptions = async (model?: string) => {
    try {
        const query = model && model !== 'Tất cả' ? `?model=${encodeURIComponent(model)}` : '';
        const endpoints = getCyberEndpoints(`/api/cyber/plan-filter-options${query}`);

        let response: Response | null = null;
        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint);
                if (res.ok) {
                    response = res;
                    break;
                }
            } catch (err) {}
        }

        if (!response) return { success: false, ttcp_list: [], models: [], versions: [], colors: [] };
        return await response.json();
    } catch (err) {
        return { success: false, ttcp_list: [], models: [], versions: [], colors: [] };
    }
};

/**
 * Hoàn tác các xe phân bổ vừa được nạp vào khoxe
 */
export const undoCyberAllocations = async (vins: string[]) => {
    try {
        if (!vins || vins.length === 0) {
            return { success: false, error: 'Không có danh sách VIN để hoàn tác.' };
        }

        // Lấy thông tin các xe để kiểm tra trạng thái trước khi xóa
        const { data: currentStock, error: fetchErr } = await supabaseAdmin
            .from('khoxe')
            .select('vin, trang_thai')
            .in('vin', vins);

        if (fetchErr) throw fetchErr;

        // Chỉ xóa xe chưa bị ghép để đảm bảo an toàn tuyệt đối
        const deletableVins = (currentStock || [])
            .filter((c: any) => !c.trang_thai || c.trang_thai === 'Trong kho' || c.trang_thai === 'Chưa ghép')
            .map((c: any) => c.vin);

        if (deletableVins.length === 0) {
            return {
                success: false,
                error: 'Các xe vừa nạp đã được ghép hoặc không còn tồn tại trong Kho xe.'
            };
        }

        const { error: delErr } = await supabaseAdmin
            .from('khoxe')
            .delete()
            .in('vin', deletableVins);

        if (delErr) throw delErr;

        await logAction('UNDO_CYBER_ALLOCATIONS', {
            totalRequested: vins.length,
            deletedCount: deletableVins.length,
            vins: deletableVins
        }, 'cyber_undo', 'stock');

        return {
            success: true,
            deletedCount: deletableVins.length,
            skippedCount: vins.length - deletableVins.length
        };
    } catch (err: any) {
        console.error("Lỗi undoCyberAllocations:", err);
        return {
            success: false,
            error: err.message || 'Lỗi khi hoàn tác xe trong Kho xe.'
        };
    }
};

export interface CyberTonKhoParams {
    fromDate?: string;
    toDate?: string;
    warehouse?: string;
    model?: string;
    color?: string;
    status?: 'all' | 'invoiced' | 'not_invoiced';
    keyword?: string;
}

export interface CyberTonKhoItem {
    vin: string;
    so_may: string;
    so_hd: string;
    ngay_hd: string;
    thang_hd: string;
    ma_kx: string;
    ten_kx: string;
    ma_mau: string;
    ten_mau: string;
    ma_mau_nt: string;
    ten_mau_nt: string;
    ma_kho: string;
    ten_kho: string;
    ngay_ton: number;
    nam_sx: number;
    tinh_trang: string;
    is_invoiced: boolean;
    ten_ttcp: string;
    tvbh: string;
    ghi_chu: string;
}

export interface CyberTonKhoResponse {
    success: boolean;
    total: number;
    invoiced_count: number;
    not_invoiced_count: number;
    cars: CyberTonKhoItem[];
    warehouses: { code: string; name: string }[];
    models: string[];
    error?: string;
}

/**
 * Lấy báo cáo tồn kho xe từ CyberSoft ERP (CP_BETONXE)
 */
export const getCyberTonKhoReport = async (params: CyberTonKhoParams = {}): Promise<CyberTonKhoResponse> => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/ton-kho-report');

        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) {
            throw new Error(lastErrorMsg || 'Không thể kết nối dịch vụ báo cáo tồn kho CyberSoft.');
        }

        return await response.json();
    } catch (err: any) {
        console.error("Lỗi getCyberTonKhoReport:", err);
        return {
            success: false,
            total: 0,
            invoiced_count: 0,
            not_invoiced_count: 0,
            cars: [],
            warehouses: [],
            models: [],
            error: err.message || 'Không thể kết nối dịch vụ báo cáo tồn kho CyberSoft.'
        };
    }
};

export interface CyberXepXeContract {
    stt_rec: string;
    stt_rec0: string;
    so_ct: string;
    ma_hd: string;
    ngay_ct: string;
    ngay_gx: string;
    ten_kh: string;
    dien_thoai: string;
    ma_kx: string;
    ten_kx: string;
    ma_mau: string;
    ten_mau: string;
    ma_mau_nt: string;
    ten_mau_nt: string;
    so_khung: string;
    so_may?: string;
    ma_post?: string;
    ngay_xep: string;
    tien_nt: number;
    da_tt: number;
    con_no: number;
    ten_ttcp: string;
    ma_dvcs: string;
    ten_hs: string;
    ten_bp: string;
    ten_color: string;
    ma_color: string;
    back_color: string;
    fore_color: string;
    bold: boolean;
}

export interface CyberXepXeCandidate {
    so_khung: string;
    so_may: string;
    nam_sx: number;
    ngay_ct: string;
    dien_giai: string;
    ma_kx: string;
    ma_mau_nt: string;
    chua_xep: string;
}

export interface CyberXepXeFilterParams {
    thang1?: number;
    nam1?: number;
    thang2?: number;
    nam2?: number;
    ma_dvcs?: string;
    ma_kx?: string;
    ma_mau?: string;
    ma_kh?: string;
    ma_hd?: string;
    all?: string;
    is_xep_xe?: string;
    showroom?: string;
}

export interface CyberXepXeContractsResponse {
    success: boolean;
    total: number;
    status_counts: Record<string, number>;
    showrooms: string[];
    models: string[];
    contracts: CyberXepXeContract[];
    error?: string;
}

export interface CyberXepXeCandidatesResponse {
    success: boolean;
    total: number;
    candidates: CyberXepXeCandidate[];
    error?: string;
}

export interface CyberXepXeActionResult {
    success: boolean;
    message?: string;
    status?: string;
    note?: string;
    error?: string;
}

export interface CyberAssignmentCheckResult {
    isAssigned: boolean;
    cyberVin?: string;
    contract?: CyberXepXeContract;
    isApprovedYellow?: boolean; // Đã được Giám đốc duyệt (Màu vàng / ma_post = 3)
    isPendingGreen?: boolean;    // Chưa được Giám đốc duyệt (Màu xanh / ma_post = 2 / Chờ duyệt)
}

/**
 * Kiểm tra xem đơn hàng đã được xếp xe trên CyberSoft ERP hay chưa
 */
export const isOrderAssignedOnCyber = (order: any, cyberContracts: CyberXepXeContract[]): CyberAssignmentCheckResult => {
    if (!order || !cyberContracts || cyberContracts.length === 0) {
        return { isAssigned: false };
    }

    const removeTones = (str: string) => (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .toLowerCase()
        .trim();

    const getApprovalStatus = (c?: CyberXepXeContract) => {
        if (!c) return { isPendingGreen: false, isApprovedYellow: false };
        const post = (c.ma_post || '').trim();
        const tenColor = (c.ten_color || '').trim().toLowerCase();
        const backColor = (c.back_color || '').trim().toLowerCase();
        const maColor = (c.ma_color || '').trim();

        const isPending = post === '2' || tenColor === 'chờ duyệt' || maColor === '04' || backColor === 'greenyellow';
        const isApproved = !isPending && (post === '3' || backColor === 'yellow' || tenColor !== 'chờ duyệt');
        return { isPendingGreen: isPending, isApprovedYellow: isApproved };
    };

    const custName = removeTones(order['Tên khách hàng'] || order.ten_khach_hang || '');
    const orderNo = (order['Số đơn hàng'] || order.so_don_hang || '').toLowerCase().trim();
    const orderVin = (order.VIN || order.vin || order['SỐ VIN'] || '').toLowerCase().trim();
    const carModel = removeTones(order['Dòng xe'] || order.dong_xe || order['DÒNG XE'] || '');

    // 1. Nếu đơn hàng có số VIN và trên Cyber đã có hợp đồng chứa số VIN này:
    if (orderVin) {
        const vinMatch = cyberContracts.find(c => (c.so_khung || '').toLowerCase().trim() === orderVin);
        if (vinMatch) {
            const approval = getApprovalStatus(vinMatch);
            return {
                isAssigned: true,
                cyberVin: vinMatch.so_khung,
                contract: vinMatch,
                isApprovedYellow: approval.isApprovedYellow,
                isPendingGreen: approval.isPendingGreen
            };
        }
    }

    // 2. Tìm theo số đơn hàng (ma_hd hoặc so_ct)
    if (orderNo) {
        const orderNoMatch = cyberContracts.find(c => {
            const cMaHd = (c.ma_hd || '').toLowerCase();
            const cSoCt = (c.so_ct || '').toLowerCase();
            return cMaHd.includes(orderNo) || cSoCt.includes(orderNo) || orderNo.includes(cMaHd);
        });
        if (orderNoMatch) {
            const isAssigned = Boolean(orderNoMatch.so_khung && orderNoMatch.so_khung.trim()) ||
                               orderNoMatch.ten_color === 'Đã ghép SK' ||
                               orderNoMatch.ten_color === 'Đã xuất HĐ';
            const approval = getApprovalStatus(orderNoMatch);
            return {
                isAssigned,
                cyberVin: orderNoMatch.so_khung,
                contract: orderNoMatch,
                isApprovedYellow: approval.isApprovedYellow,
                isPendingGreen: approval.isPendingGreen
            };
        }
    }

    // 3. Tìm theo tên khách hàng (kết hợp dòng xe nếu có)
    if (custName) {
        const customerMatches = cyberContracts.filter(c => {
            const cCust = removeTones(c.ten_kh || '');
            return cCust === custName || cCust.includes(custName) || custName.includes(cCust);
        });

        if (customerMatches.length > 0) {
            // Lọc tiếp theo dòng xe nếu có nhiều hơn 1 hợp đồng
            let candidateMatches = customerMatches;
            if (candidateMatches.length > 1 && carModel) {
                const modelFiltered = candidateMatches.filter(c => {
                    const cModel = removeTones(`${c.ten_kx || ''} ${c.ma_kx || ''}`);
                    return cModel.includes(carModel) || carModel.includes(cModel);
                });
                if (modelFiltered.length > 0) {
                    candidateMatches = modelFiltered;
                }
            }

            // Kiểm tra xem trong các hợp đồng khớp, có hợp đồng nào ĐÃ XẾP XE không
            const assignedContract = candidateMatches.find(c => {
                const hasVin = Boolean(c.so_khung && c.so_khung.trim());
                const status = (c.ten_color || '').trim();
                return hasVin || status === 'Đã ghép SK' || status === 'Đã xuất HĐ';
            });

            if (assignedContract) {
                const approval = getApprovalStatus(assignedContract);
                return {
                    isAssigned: true,
                    cyberVin: assignedContract.so_khung,
                    contract: assignedContract,
                    isApprovedYellow: approval.isApprovedYellow,
                    isPendingGreen: approval.isPendingGreen
                };
            }

            // Nếu không có hợp đồng nào đã xếp xe -> hợp đồng đang chờ ghép xe
            const targetContract = candidateMatches[0];
            const approval = getApprovalStatus(targetContract);
            return {
                isAssigned: false,
                contract: targetContract,
                isApprovedYellow: approval.isApprovedYellow,
                isPendingGreen: approval.isPendingGreen
            };
        }
    }

    return { isAssigned: false };
};

/**
 * Lấy danh sách hợp đồng xếp xe từ CyberSoft ERP (CP_BeXepXe)
 */
export const getCyberXepXeContracts = async (params: CyberXepXeFilterParams = {}): Promise<CyberXepXeContractsResponse> => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/xep-xe-contracts');
        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) throw new Error(lastErrorMsg || 'Không thể kết nối máy chủ CyberSoft Xếp xe.');
        return await response.json();
    } catch (err: any) {
        console.error("Lỗi getCyberXepXeContracts:", err);
        return {
            success: false,
            total: 0,
            status_counts: {},
            showrooms: [],
            models: [],
            contracts: [],
            error: err.message || 'Lỗi khi tải danh sách hợp đồng xếp xe CyberSoft.'
        };
    }
};

/**
 * Tra cứu xe tồn/kế hoạch khớp cấu hình để xếp vào hợp đồng (CP_BeXepXe_SK)
 */
export const getCyberXepXeCandidates = async (params: { stt_rec: string; stt_rec0: string; ma_dvcs?: string }): Promise<CyberXepXeCandidatesResponse> => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/xep-xe-candidates');
        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) throw new Error(lastErrorMsg || 'Không thể kết nối máy chủ tìm xe ghép.');
        return await response.json();
    } catch (err: any) {
        console.error("Lỗi getCyberXepXeCandidates:", err);
        return {
            success: false,
            total: 0,
            candidates: [],
            error: err.message || 'Lỗi khi tìm danh sách xe ghép.'
        };
    }
};

/**
 * Gán/xếp xe vào hợp đồng trong CyberSoft ERP (CP_BeXepXe_SAVE)
 */
export const saveCyberXepXe = async (params: { ma_hd: string; stt_rec: string; stt_rec0: string; so_khung: string; ma_dvcs?: string; user_name?: string }): Promise<CyberXepXeActionResult> => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/xep-xe-save');
        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) throw new Error(lastErrorMsg || 'Không thể kết nối máy chủ lưu xếp xe.');
        return await response.json();
    } catch (err: any) {
        console.error("Lỗi saveCyberXepXe:", err);
        return {
            success: false,
            error: err.message || 'Lỗi khi lưu xếp xe vào CyberSoft.'
        };
    }
};

/**
 * Hủy ghép xe khỏi hợp đồng trong CyberSoft ERP (CP_BeXepXe_DELETE)
 */
export const deleteCyberXepXe = async (params: { ma_hd: string; stt_rec: string; stt_rec0: string; so_khung: string; ma_dvcs?: string; user_name?: string }): Promise<CyberXepXeActionResult> => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/xep-xe-delete');
        let response: Response | null = null;
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errJson = await res.json().catch(() => ({}));
                    lastErrorMsg = errJson.error || `HTTP ${res.status}`;
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        if (!response) throw new Error(lastErrorMsg || 'Không thể kết nối máy chủ hủy xếp xe.');
        return await response.json();
    } catch (err: any) {
        console.error("Lỗi deleteCyberXepXe:", err);
        return {
            success: false,
            error: err.message || 'Lỗi khi hủy xếp xe khỏi CyberSoft.'
        };
    }
};

export interface CyberDnxCreateParams {
    vins: string[];
    ma_kho_xuat?: string;
    ma_kho_nhan?: string;
    khach_hang?: string;
    ly_do?: string;
    ma_dvcs?: string;
    ma_ttcp?: string;
    user_name?: string;
}

export interface CyberDnxCreateResult {
    success: boolean;
    message?: string;
    so_ct?: string;
    stt_rec?: string;
    user_name?: string;
    user_id?: number;
    total_cars?: number;
    cars?: any[];
    error?: string;
}

export const createCyberDnxTicket = async (params: CyberDnxCreateParams): Promise<CyberDnxCreateResult> => {
    try {
        const endpoints = getCyberEndpoints('/api/cyber/create-dnx');
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params)
                });
                const text = await res.text();
                let json: any = null;
                try { json = JSON.parse(text); } catch (_) {}

                if (res.ok && json && typeof json === 'object') {
                    return json;
                } else {
                    lastErrorMsg = (json && json.error) || (text && !text.startsWith('<') ? text : `HTTP ${res.status}`);
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        throw new Error(lastErrorMsg || 'Không thể kết nối dịch vụ tạo giấy chuyển CyberSoft.');
    } catch (err: any) {
        console.error("Lỗi createCyberDnxTicket:", err);
        return {
            success: false,
            error: err.message || 'Lỗi kết nối khi tạo giấy đề nghị xuất xe trên CyberSoft.'
        };
    }
};

export interface CyberVoucherTicketItem {
    voucher_type: 'DNX' | 'TD4';
    voucher_name: string;
    stt_rec: string;
    so_ct: string;
    ngay_ct: string;
    ma_post: string;
    ma_ttcp: string;
    dien_giai: string;
    ten_kh: string;
    so_hd: string;
    tong_tien: number;
    da_thanh_toan: number;
    con_lai: number;
    nvkd: string;
    vin: string;
    so_may: string;
    loai_xe: string;
    ma_mau?: string;
}

export interface CyberVoucherTicketParams {
    ma_ct?: string;
    ma_post?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    ma_ttcp?: string;
}

export interface CyberVoucherTicketResponse {
    success: boolean;
    data?: CyberVoucherTicketItem[];
    total?: number;
    error?: string;
}

export const getCyberVoucherTickets = async (params: CyberVoucherTicketParams = {}): Promise<CyberVoucherTicketResponse> => {
    try {
        const queryParams = new URLSearchParams();
        if (params.ma_ct) queryParams.set('ma_ct', params.ma_ct);
        if (params.ma_post) queryParams.set('ma_post', params.ma_post);
        if (params.search) queryParams.set('search', params.search);
        if (params.fromDate) queryParams.set('fromDate', params.fromDate);
        if (params.toDate) queryParams.set('toDate', params.toDate);
        if (params.limit) queryParams.set('limit', String(params.limit));
        queryParams.set('ma_ttcp', params.ma_ttcp || '02.01.08');

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const endpoints = getCyberEndpoints(`/api/cyber/voucher-tickets${queryString}`);
        let lastErrorMsg = '';

        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint);
                const text = await res.text();
                let json: any = null;
                try { json = JSON.parse(text); } catch (_) {}

                if (res.ok && json && json.success) {
                    return json;
                } else {
                    lastErrorMsg = (json && json.error) || (text && !text.startsWith('<') ? text : `HTTP ${res.status}`);
                }
            } catch (err: any) {
                lastErrorMsg = err.message || '';
            }
        }

        throw new Error(lastErrorMsg || 'Không thể kết nối máy chủ tra cứu phiếu CyberSoft.');
    } catch (err: any) {
        console.error("Lỗi getCyberVoucherTickets:", err);
        return {
            success: false,
            data: [],
            error: err.message || 'Lỗi kết nối khi tra cứu danh sách phiếu CyberSoft.'
        };
    }
};




