import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction, ApiResult, getApi, ADMIN_USER } from './baseService';

export const getActiveUsers = async (): Promise<ApiResult> => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
        const { data, error } = await supabase.from('user_presence').select('*').gt('last_active_at', fiveMinutesAgo);
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Fetched active users from Supabase', data: data || [] };
    } catch (err) {
        return getApi({ action: 'getActiveUsers' });
    }
};

export const recordUserPresence = async (): Promise<void> => {
    try {
        const username = getStorageItem("currentUser") || ADMIN_USER;
        const fullName = getStorageItem("currentConsultant") || "User";
        if (username) {
            await supabase.from('user_presence').upsert({ username: username, full_name: fullName, last_active_at: new Date().toISOString(), status: 'online' }, { onConflict: 'username' });
        }
    } catch (error) {}
};

export const getUsers = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabaseAdmin.from('users').select('username, full_name, role, manager_id, is_blocked, block_reason');
        if (error) throw error;
        return { 
            status: 'SUCCESS', message: 'Fetched users from Supabase',
            users: (data || []).map(u => ({ username: u.username, name: u.full_name, role: u.role, manager_id: u.manager_id, is_blocked: u.is_blocked, block_reason: u.block_reason })) 
        };
    } catch (error) {
        return getApi({ action: 'getUsers' });
    }
};

export const toggleUserBlock = async (username: string, isBlocked: boolean, reason?: string): Promise<ApiResult> => {
    try {
        const adminUser = getStorageItem("currentConsultant") || "Admin";
        const { error } = await supabaseAdmin.from('users').update({
            is_blocked: isBlocked, block_reason: isBlocked ? reason : null, 
            blocked_at: isBlocked ? new Date().toISOString() : null,
            blocked_by: isBlocked ? adminUser : null
        }).eq('username', username);
        if (error) throw error;
        await logAction(isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER', { username, reason }, username, 'admin');
        return { status: 'SUCCESS', message: isBlocked ? `Đã khóa tài khoản ${username}` : `Đã mở khóa tài khoản ${username}` };
    } catch (error: any) {
        return { status: 'ERROR', message: error.message };
    }
};

export const getTeamData = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabaseAdmin.from('users').select('username, full_name, manager_id');
        if (error) throw error;
        const teamData: Record<string, string[]> = {};
        const usernameToFullName: Record<string, string> = {};
        (data || []).forEach(u => usernameToFullName[u.username] = u.full_name || u.username);
        (data || []).forEach(user => {
            if (user.manager_id) {
                const leaderName = usernameToFullName[user.manager_id] || user.manager_id;
                if (!teamData[leaderName]) teamData[leaderName] = [];
                teamData[leaderName].push(user.full_name || user.username);
            }
        });
        return { status: 'SUCCESS', message: `Teams processed`, teamData };
    } catch (error) {
        return getApi({ action: 'getTeamData' });
    }
};

export const getAuditLogs = async (limit: number = 100): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('interactions').select('*').eq('category', 'LOG').order('created_at', { ascending: false }).limit(limit);
        if (error) throw error;
        const mappedLogs = (data || []).map(log => ({ id: log.id, timestamp: log.created_at, user_email: log.actor_id, user_full_name: log.actor_name, action: log.type, details: log.metadata, target_id: log.target_id, target_type: log.target_view }));
        return { status: 'SUCCESS', message: 'Fetched logs from interactions', data: mappedLogs };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const getLogData = async (): Promise<ApiResult> => {
    return getApi({ action: 'getLogData' });
};
