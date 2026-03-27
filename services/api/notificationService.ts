import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, ApiResult, ADMIN_USER } from './baseService';

export const fetchNotifications = async (): Promise<ApiResult> => {
    try {
        const currentConsultant = getStorageItem("currentConsultant") || "";
        const actualUsername = getStorageItem("currentUser") || "";
        const userRole = getStorageItem("userRole");
        const isAdmin = actualUsername.toLowerCase() === 'admin' || userRole === 'Admin' || userRole === 'Quản trị viên';
        
        let filterParts = ['recipient.eq.ALL', 'recipient.eq.ALL_TVBH'];
        if (currentConsultant) filterParts.push(`recipient.eq."${currentConsultant}"`);
        if (actualUsername) filterParts.push(`recipient.eq."${actualUsername}"`);
        if (isAdmin) filterParts.push('recipient.eq.ADMINS');

        let query = supabase.from('interactions')
            .select('*')
            .eq('category', 'NOTIFICATION')
            .or(filterParts.join(','))
            .order('created_at', { ascending: false })
            .limit(50);

        const { data, error } = await query;
        if (error) throw error;

        const formattedNotifs = data.map((n: any) => ({
            id: n.id,
            timestamp: n.created_at,
            message: n.message,
            type: n.type,
            targetView: n.target_view,
            targetId: n.target_id,
            createdBy: n.actor_name,
            isRead: n.is_read,
            recipient: n.recipient
        }));

        const unreadCount = formattedNotifs.filter((n: any) => !n.isRead).length;

        return {
            status: 'SUCCESS',
            message: 'Fetched notifications from Supabase',
            notifications: formattedNotifs,
            unreadCount
        };
    } catch (err: any) {
        const currentUser = getStorageItem("currentConsultant") || ADMIN_USER;
        const { getApi } = await import('./baseService');
        return getApi({ 
            action: 'getNotifications', 
            currentUser: currentUser, 
            isAdmin: String(currentUser === ADMIN_USER) 
        });
    }
};

export const markAllNotificationsAsRead = async (): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || getStorageItem("currentUser") || ADMIN_USER;
        const userRole = getStorageItem("userRole");
        const actualUsername = getStorageItem("currentUser") || "";
        const isAdmin = currentUser === ADMIN_USER || userRole === 'Quản trị viên' || actualUsername.toLowerCase() === 'admin';

        let query = supabase.from('interactions').update({ is_read: true }).eq('category', 'NOTIFICATION').eq('is_read', false);

        if (!isAdmin) {
            let filterParts = ['recipient.eq.ALL'];
            if (currentUser) filterParts.push(`recipient.eq."${currentUser}"`);
            if (actualUsername) filterParts.push(`recipient.eq."${actualUsername}"`);
            query = query.or(filterParts.join(','));
        }

        const { error } = await query;
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Đã đánh dấu tất cả thông báo là đã đọc.' };
    } catch (err: any) {
        const { postApi } = await import('./baseService');
        return postApi({ action: 'markAllNotificationsAsRead' });
    }
};

export const markNotificationAsRead = async (notificationId: string): Promise<ApiResult> => {
    try {
        const { error } = await supabase.from('interactions').update({ is_read: true }).eq('id', notificationId);
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Đã đánh dấu là đã đọc.' };
    } catch (err) {
        const { postApi } = await import('./baseService');
        return postApi({ action: 'markNotificationAsRead', notificationId });
    }
};

export const createNotification = async (payload: {
    message: string;
    type?: string;
    recipient?: string;
    targetView?: string;
    targetId?: string;
}): Promise<void> => {
    try {
        const actorId = getStorageItem("currentUser") || "System";
        const actorName = getStorageItem("currentConsultant") || "System";
        const recipient = payload.recipient || 'ALL';
        const targetView = payload.targetView || '';
        const targetId = payload.targetId || '';

        if (targetId && targetView && recipient !== 'ALL') {
            const { data: existing } = await supabase.from('interactions').select('id, message, metadata').eq('category', 'NOTIFICATION').eq('recipient', recipient).eq('target_view', targetView).eq('target_id', targetId).eq('is_read', false).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (existing) {
                let newMessage = payload.message;
                const metadata = existing.metadata || {};
                const count = (metadata.count || 1) + 1;
                if (payload.message.includes('phản hồi') || payload.message.includes(':')) newMessage = `(${count}) ${payload.message}`;
                await supabase.from('interactions').update({ message: newMessage, created_at: new Date().toISOString(), actor_id: actorId, actor_name: actorName, metadata: { ...metadata, count } }).eq('id', existing.id);
                return;
            }
        }

        await supabaseAdmin.from('interactions').insert({
            category: 'NOTIFICATION', type: payload.type || 'info', message: payload.message,
            recipient, target_view: targetView, target_id: targetId, is_read: false,
            actor_id: actorId, actor_name: actorName
        });
    } catch (err) {
        console.error("Failed to create notification:", err);
    }
};

export const getGlobalNotification = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'global_notification').single();
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Fetched global notification from Supabase', data: data.value };
    } catch (err) {
        const { getApi } = await import('./baseService');
        return getApi({ action: 'getGlobalNotification' });
    }
};

export const updateGlobalNotification = async (notification: { content: string; isActive: boolean; type: string }): Promise<ApiResult> => {
    try {
        const updatedBy = getStorageItem("currentConsultant") || ADMIN_USER;
        const { error } = await supabase.from('app_settings').update({ value: notification, updated_at: new Date().toISOString(), updated_by: updatedBy }).eq('key', 'global_notification');
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Cập nhật thông báo thành công.' };
    } catch (err) {
        const { postApi } = await import('./baseService');
        return postApi({ action: 'updateGlobalNotification', ...notification });
    }
};
