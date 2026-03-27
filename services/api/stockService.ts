import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, mapStockDbToUi, ApiResult, ADMIN_USER, uploadToSupabase } from './baseService';
import { createNotification } from './notificationService';

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
    const username = getStorageItem("currentUser") || ADMIN_USER;
    const fullName = getStorageItem("currentConsultant") || username;
    try {
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
        const { data, error } = await supabase.rpc('rpc_release_car', { p_vin: vin, p_outcome: outcome });
        if (error) throw error;
        return { status: 'SUCCESS', message: data.message };
    } catch (err: any) {
        return { status: 'ERROR', message: 'Lỗi khi hủy giữ xe.' };
    }
};

export const joinHoldQueue = async (vin: string) => {
    const username = getStorageItem("currentUser") || ADMIN_USER;
    const fullName = getStorageItem("currentConsultant") || username;
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
    const username = getStorageItem("currentUser") || ADMIN_USER;
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
        const { error } = await supabase.rpc('auto_release_expired_holds');
        if (error) throw error;
        return { status: 'SUCCESS' };
    } catch (err) {
        return { status: 'ERROR' };
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
