import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction } from './baseService';

export const getHoldReputation = async (email: string) => {
    try {
        const { data: cache, error } = await supabase.from('user_reputation_cache').select('*').eq('username', email).maybeSingle();
        if (error) throw error;
        const THIRTY_MINS = 30 * 60 * 1000;
        if (!cache || (new Date().getTime() - new Date(cache.last_updated).getTime() > THIRTY_MINS)) {
            supabase.rpc('refresh_user_reputation', { p_username: email }).then();
            if (cache) return { score: cache.score, total: cache.total_holds, matched: cache.matched_holds, bonus: (cache.score >= 90 && cache.matched_holds >= 5) ? 1 : 0, isNewUser: cache.total_holds === 0, isChampion: cache.is_champion, systemScore: cache.score, maxHolds: calculateMaxHolds(cache.score, cache.is_champion) };
        } else {
            return { score: cache.score, total: cache.total_holds, matched: cache.matched_holds, bonus: (cache.score >= 90 && cache.matched_holds >= 5) ? 1 : 0, isNewUser: cache.total_holds === 0, isChampion: cache.is_champion, systemScore: cache.score, maxHolds: calculateMaxHolds(cache.score, cache.is_champion) };
        }
        const { data: result, error: rpcErr } = await supabase.rpc('calculate_user_reputation', { p_username: email });
        if (rpcErr || !result || result.length === 0) throw new Error("RPC calculation failed");
        const res = result[0];
        return { score: res.score, total: res.total_holds, matched: res.matched_holds, bonus: (res.score >= 90 && res.matched_holds >= 5) ? 1 : 0, isNewUser: res.total_holds === 0, isChampion: res.is_champion, systemScore: res.score, maxHolds: calculateMaxHolds(res.score, res.is_champion) };
    } catch (err) {
        return { score: 100, total: 0, matched: 0, bonus: 0, isNewUser: true, isChampion: false, systemScore: 100, maxHolds: 5 };
    }
};

const calculateMaxHolds = (score: number, isChampion: boolean = false) => {
    let max = 0;
    if (score >= 85) max = 5; else if (score >= 65) max = 4; else if (score >= 40) max = 3; else if (score >= 15) max = 2; else if (score > 0) max = 1; else max = 0;
    if (isChampion) max++;
    return max;
};

export const getAllUsersReputations = async () => {
    try {
        const { data: cacheData } = await supabaseAdmin.from('user_reputation_cache').select('*');
        const { data: usersData } = await supabaseAdmin.from('users').select('username, full_name, is_blocked, blocked_until');
        const { data: currentHoldsData } = await supabase.from('khoxe').select('username_giu_xe').eq('trang_thai', 'Đang giữ').not('username_giu_xe', 'is', null).neq('username_giu_xe', '');
        const currentHoldsMap: Record<string, number> = {};
        (currentHoldsData || []).forEach(c => currentHoldsMap[c.username_giu_xe] = (currentHoldsMap[c.username_giu_xe] || 0) + 1);
        // Chỉ lấy các user hợp lệ (bỏ qua các account rác cũ có username chứa dấu cách)
        const validUsers = (usersData || []).filter((u: any) => u.username && !u.username.includes(' '));
        const usersMap = validUsers.reduce((acc: any, u: any) => ({ ...acc, [u.username]: u }), {});
        
        // Lọc trùng lặp cache (phòng trường hợp DB cache lưu nhiều bản ghi cùng 1 username)
        const uniqueCacheMap = (cacheData || []).reduce((acc: any, row: any) => {
            if (!acc[row.username] || new Date(row.last_updated || 0) > new Date(acc[row.username].last_updated || 0)) {
                acc[row.username] = row;
            }
            return acc;
        }, {});

        const validCacheData = Object.values(uniqueCacheMap).filter((row: any) => usersMap[row.username]);
        
        const reputations = validCacheData.map((row: any) => {
            const user = usersMap[row.username];
            const score = row.score;
            let maxHolds = calculateMaxHolds(score, row.is_champion);
            let rankName = score >= 85 ? "Tinh Anh" : score >= 65 ? "Chuyên nghiệp" : score >= 40 ? "Tiêu chuẩn" : score >= 15 ? "Cơ bản" : score > 0 ? "Thử thách" : "Bị khóa";
            if (row.is_champion) rankName += " (Quán Quân)";
            return { email: row.username, name: user.full_name, total: row.total_holds, matched: row.matched_holds, score, is_blocked: user.is_blocked, blocked_until: user.blocked_until, isChampion: row.is_champion, currentHolds: currentHoldsMap[row.username] || 0, maxHolds, rankName };
        });
        return reputations.sort((a, b) => b.score - a.score || b.total - a.total);
    } catch (err) { return []; }
};

export const updateUserReputation = async (username: string, targetScore: number, reason: string) => {
    try {
        const adminUser = getStorageItem("currentConsultant") || "Admin";
        const currentRep = await getHoldReputation(username);
        const systemScore = currentRep.systemScore || 100;
        const adjustment = Number(targetScore) - systemScore;
        const { error } = await supabase.from('reputation_adjustments').upsert({ username, adjustment_value: adjustment, system_score_at_update: systemScore, target_score: targetScore, updated_at: new Date().toISOString(), updated_by: adminUser, reason });
        if (error) throw error;
        await logAction('UPDATE_REPUTATION', { username, targetScore, adjustment, reason }, username, 'admin');
        return { status: 'SUCCESS', message: `Đã cập nhật mức điều chỉnh cho ${username}. Điểm mục tiêu: ${targetScore}%.` };
    } catch (error: any) { return { status: 'ERROR', message: error.message }; }
};

export const getUserReputationHistory = async (email: string) => {
    try {
        const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const { data, error } = await supabase.from('car_hold_activities').select('*').eq('username', email).in('type', ['HOLD', 'PENALTY', 'BONUS']).gte('created_at', startOfCurrentMonth.toISOString()).order('created_at', { ascending: true });
        if (error) throw error;
        const history: any[] = []; const vinHistory: Record<string, number> = {}; let releaseCount = 0;
        data.forEach(h => {
            const start = new Date(h.created_at).getTime(); const end = new Date(h.updated_at || h.created_at).getTime(); const hours = (end - start) / (1000 * 60 * 60);
            if (h.status === 'matched' || h.status === 'invoiced') {
                history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at || h.created_at, vin: h.vin, reason: 'Khớp xe thành công', pointChange: 2, type: 'success' });
                if (h.status === 'invoiced') history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at, vin: h.vin, reason: 'Xuất hóa đơn thành công', pointChange: 2, type: 'success' });
            }
            if (h.status === 'expired') { history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at || h.created_at, vin: h.vin, reason: 'Để xe tự hết hạn', pointChange: -4, type: 'penalty' }); releaseCount++; }
            else if (h.status === 'order_cancelled') { history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at || h.created_at, vin: h.vin, reason: `Hủy đơn: ${h.reason}`.substring(0, 50), pointChange: -4, type: 'penalty' }); }
            else if (h.status === 'released') { if (hours >= 12) history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at || h.created_at, vin: h.vin, reason: `Nhả xe chậm (${Math.floor(hours)}h)`, pointChange: -4, type: 'penalty' }); releaseCount++; }
            else if (h.status === 'supplement_requested') history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at || h.created_at, vin: h.vin, reason: h.reason || 'Yêu cầu bổ sung hồ sơ', pointChange: -1, type: 'penalty' });
            else if (h.status === 'vc_rejected') history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at || h.created_at, vin: h.vin, reason: h.reason || 'Từ chối yêu cầu VinClub', pointChange: -1, type: 'penalty' });
            else if (h.status === 'lethargic_penalty') history.push({ id: Math.random().toString(36).substring(7), date: h.created_at, vin: h.vin, reason: 'Phạt ngâm đơn quá lâu (>5 ngày)', pointChange: -4, type: 'penalty' });
            vinHistory[h.vin] = (vinHistory[h.vin] || 0) + 1; if (vinHistory[h.vin] > 1) history.push({ id: Math.random().toString(36).substring(7), date: h.created_at, vin: h.vin, reason: `Giữ lại cùng xe nhiều lần (${vinHistory[h.vin]} lần)`, pointChange: -4, type: 'penalty' });
            if (releaseCount > 0 && releaseCount % 5 === 0 && ['released', 'expired'].includes(h.status)) history.push({ id: Math.random().toString(36).substring(7), date: h.updated_at || h.created_at, vin: 'HỆ THỐNG', reason: `Tỷ lệ hủy cao (${releaseCount} lần)`, pointChange: -2, type: 'penalty' });
        });
        const { data: adj } = await supabase.from('reputation_adjustments').select('adjustment_value, updated_at, reason').eq('username', email).gte('updated_at', startOfCurrentMonth.toISOString()).maybeSingle();
        if (adj && adj.adjustment_value !== 0) history.push({ id: Math.random().toString(36).substring(7), date: adj.updated_at, vin: 'ADMIN', reason: adj.reason || 'Admin điều chỉnh trực tiếp', pointChange: adj.adjustment_value, type: adj.adjustment_value > 0 ? 'success' : 'penalty' });
        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (err) { return []; }
};
