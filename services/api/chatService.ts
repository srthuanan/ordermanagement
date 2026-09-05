import { supabase } from '../supabaseClient';
import { ApiResult, getApi, postApi } from './baseService';


export const getSupabaseChatMessages = async (limit = 100, search = ''): Promise<ApiResult> => {
    try {
        let query = supabase
            .from('interactions')
            .select('*')
            .eq('category', 'MESSAGE')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (search) {
            query = query.ilike('message', `%${search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;

        const mappedMessages = (data || []).map(m => ({
            id: m.id,
            timestamp: m.created_at,
            senderName: m.actor_name,
            senderRole: m.metadata?.sender_role,
            message: m.message,
            mentions: m.metadata?.mentions || [],
            reactions: m.metadata?.reactions || {},
            replyTo: m.metadata?.reply_to,
            isPinned: m.metadata?.is_pinned || false,
            fileId: m.metadata?.file_id,
            recipient: m.recipient
        })).reverse();

        return { status: 'SUCCESS', message: 'Fetched from Supabase', messages: mappedMessages };
    } catch (err: any) {
        console.error("Supabase getChatMessages error:", err);
        return getApi({ action: 'getChatMessages', limit, search });
    }
};

export const addSupabaseChatMessage = async (payload: any): Promise<ApiResult> => {
    try {
        const { message, mentionedUsers, replyToId, fileId, updatedBy, userRole, recipient } = payload;
        const actorName = sessionStorage.getItem("currentConsultant") || updatedBy;
        const actorId = sessionStorage.getItem("currentUser") || "System";
        
        const mentions = typeof mentionedUsers === 'string' ? JSON.parse(mentionedUsers) : mentionedUsers;

        const { data, error } = await supabase
            .from('interactions')
            .insert({
                category: 'MESSAGE',
                message,
                actor_id: actorId,
                actor_name: actorName,
                recipient: recipient || 'ALL',
                metadata: {
                    sender_role: userRole,
                    mentions: mentions || [],
                    reply_to: replyToId && replyToId.includes('-') ? replyToId : null,
                    file_id: fileId,
                    is_pinned: false
                }
            })
            .select()
            .single();

        if (error) throw error;

        return { status: 'SUCCESS', message: 'Message sent', data };
    } catch (err: any) {
        console.error("Supabase addChatMessage interactions error:", err);
        return postApi({ action: 'addChatMessage', ...payload });
    }
};

export const toggleSupabaseMessageReaction = async (payload: any): Promise<ApiResult> => {
    try {
        const { id, timestamp, senderName, emoji, updatedBy } = payload;
        
        let query = supabase.from('interactions').select('id, metadata').eq('category', 'MESSAGE');
        if (id && id.includes('-')) {
            query = query.eq('id', id);
        } else {
            query = query.eq('created_at', timestamp).eq('actor_name', senderName);
        }

        const { data, error } = await query.single();
        if (error || !data) throw error || new Error('Message not found');

        const currentMetadata = data.metadata || {};
        const currentReactions = currentMetadata.reactions || {};
        if (!currentReactions[emoji]) {
            currentReactions[emoji] = [updatedBy];
        } else {
            const users = currentReactions[emoji];
            const index = users.indexOf(updatedBy);
            if (index > -1) {
                users.splice(index, 1);
                if (users.length === 0) delete currentReactions[emoji];
            } else {
                users.push(updatedBy);
            }
        }

        currentMetadata.reactions = currentReactions;

        const { error: updateError } = await supabase
            .from('interactions')
            .update({ metadata: currentMetadata })
            .eq('id', data.id);

        if (updateError) throw updateError;

        return { status: 'SUCCESS', message: 'Reaction toggled' };
    } catch (err: any) {
        console.error("Supabase toggleMessageReaction error:", err);
        return postApi({ action: 'toggleMessageReaction', ...payload });
    }
};

export const revokeSupabaseChatMessage = async (payload: any): Promise<ApiResult> => {
    try {
        const { id, timestamp, senderName } = payload;
        
        let query = supabase.from('interactions').update({ 
            message: 'Tin nhắn đã bị thu hồi', 
            metadata: {} 
        });

        if (id && id.includes('-')) {
            query = query.eq('id', id);
        } else {
            query = query.eq('created_at', timestamp).eq('actor_name', senderName);
        }

        const { error } = await query;
        if (error) throw error;

        return { status: 'SUCCESS', message: 'Revoked' };
    } catch (err: any) {
        console.error("Supabase revokeChatMessage error:", err);
        return postApi({ action: 'revokeChatMessage', ...payload });
    }
};

export const toggleSupabasePinMessage = async (payload: any): Promise<ApiResult> => {
    try {
        const { id, timestamp, senderName } = payload;
        
        let query = supabase.from('interactions').select('id, metadata').eq('category', 'MESSAGE');
        if (id && id.includes('-')) {
            query = query.eq('id', id);
        } else {
            query = query.eq('created_at', timestamp).eq('actor_name', senderName);
        }

        const { data, error } = await query.single();
        if (error || !data) throw error || new Error('Message not found');

        const currentMetadata = data.metadata || {};
        currentMetadata.is_pinned = !currentMetadata.is_pinned;

        const { error: updateError } = await supabase
            .from('interactions')
            .update({ metadata: currentMetadata })
            .eq('id', data.id);

        if (updateError) throw updateError;

        return { status: 'SUCCESS', message: 'Pinned toggled' };
    } catch (err: any) {
        console.error("Supabase togglePinMessage error:", err);
        return postApi({ action: 'togglePinMessage', ...payload });
    }
};

export const getSupabasePinnedMessages = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase
            .from('interactions')
            .select('*')
            .eq('category', 'MESSAGE')
            .filter('metadata->is_pinned', 'eq', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedMessages = (data || []).map(m => ({
            id: m.id,
            timestamp: m.created_at,
            senderName: m.actor_name,
            senderRole: m.metadata?.sender_role,
            message: m.message,
            mentions: m.metadata?.mentions || [],
            reactions: m.metadata?.reactions || {},
            replyTo: m.metadata?.reply_to,
            isPinned: true,
            fileId: m.metadata?.file_id,
            recipient: m.recipient
        }));

        return { status: 'SUCCESS', message: 'Pinned from Supabase', messages: mappedMessages };
    } catch (err: any) {
        console.error("Supabase getPinnedMessages error:", err);
        try {
            return await getApi({ action: 'getPinnedMessages' });
        } catch (e) {
            return { status: 'ERROR', message: err.message };
        }
    }
};
