import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, ApiResult } from './baseService';
import { createNotification } from './notificationService';

const TELEGRAM_BOT_TOKEN = "8444242103:AAGupLJ1RJS3b3LD5LMEYIWMfwCFW3mzhB4";
const TELEGRAM_CHAT_ID = "-1003202763251";

const sendTelegramMessage = async (text: string, thread_id?: number) => {
    try {
        const body: any = { chat_id: TELEGRAM_CHAT_ID, text: text, parse_mode: 'HTML' };
        if (thread_id) body.message_thread_id = thread_id;
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (e) { console.error("Telegram send error", e); }
};

export const submitCarInquiry = async (inquiry: { tvbh_name: string; tvbh_email: string; model: string; version: string; exterior_color: string; interior_color: string; }): Promise<ApiResult> => {
    try {
        const { data: matchingCars } = await supabase.from('khoxe').select('vin, trang_thai').eq('dong_xe', inquiry.model).eq('phien_ban', inquiry.version).eq('ngoai_that', inquiry.exterior_color).eq('noi_that', inquiry.interior_color).in('trang_thai', ['Chưa ghép', 'Đang giữ']);
        let status: any = 'pending'; let matchedVin = null; let adminResponse = null;
        if (matchingCars && matchingCars.length > 0) { status = 'auto_found'; matchedVin = matchingCars[0].vin; adminResponse = `Hệ thống tự động tìm thấy ${matchingCars.length} xe phù hợp. Xe đầu tiên: ${matchedVin}`; }
        const insertPayload: any = { ...inquiry, status, matched_vin: matchedVin, admin_response: adminResponse, is_read_by_admin: false, is_read_by_tvbh: false };
        if (status === 'auto_found') insertPayload.responded_at = new Date().toISOString();
        const { data: insertedData, error } = await supabase.from('car_inquiries').insert(insertPayload).select().single();
        if (error) throw error;
        await createNotification({ message: `[Tra cứu kho] ${inquiry.tvbh_name} vừa tạo yêu cầu mới: ${inquiry.model} ${inquiry.version}`, type: 'info', recipient: 'ADMINS', targetView: 'inquiries', targetId: (insertedData as any).id });
        
        // Create Telegram Topic
        let thread_id: number | undefined = undefined;
        try {
            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/createForumTopic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, name: `[Tìm Xe] ${inquiry.tvbh_name} - ${inquiry.model}` })
            });
            const topicData = await res.json();
            if (topicData.ok && topicData.result) {
                thread_id = topicData.result.message_thread_id;
                const h = [{ telegram_thread_id: thread_id, type: 'system' }];
                await supabaseAdmin.from('car_inquiries').update({ chat_history: h }).eq('id', (insertedData as any).id);
            }
        } catch (e) { console.error("Create topic error", e); }

        // Push notification to Telegram
        const telegramMsg = `<b>🚨 YÊU CẦU TÌM XE MỚI 🚨</b>\n\n<b>Từ:</b> ${inquiry.tvbh_name} (${inquiry.tvbh_email})\n<b>Xe:</b> ${inquiry.model}\n<b>Phiên bản:</b> ${inquiry.version}\n<b>Ngoại Thất:</b> ${inquiry.exterior_color}\n<b>Nội Thất:</b> ${inquiry.interior_color}\n\n<b>ID Yêu Cầu:</b> <code>${(insertedData as any).id}</code>\n\n<i>=> Admin nhắn tin thẳng vào phòng này để phản hồi nhé!</i>`;
        sendTelegramMessage(telegramMsg, thread_id);

        return { status: 'SUCCESS', message: status === 'auto_found' ? 'Hệ thống đã tự động tìm thấy xe!' : 'Yêu cầu của bạn đã được gửi tới Admin.', inquiry: insertedData };
    } catch (error: any) { return { status: 'ERROR', message: error.message }; }
};

export const getCarInquiries = async (email?: string): Promise<any[]> => {
    try {
        let query = supabase.from('car_inquiries').select('*').order('created_at', { ascending: false });
        if (email) query = query.eq('tvbh_email', email);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) { return []; }
};

export const respondToCarInquiry = async (id: string, response: string, matched_vin?: string, status: any = 'manual_responded'): Promise<ApiResult> => {
    try {
        const { data: inquiry, error: getErr } = await supabase.from('car_inquiries').select('tvbh_email, model, version, tvbh_name').eq('id', id).single();
        if (getErr) throw getErr;
        const updates: any = { admin_response: response, status, is_read_by_tvbh: false };
        if (matched_vin) updates.matched_vin = matched_vin;
        const { error: updateErr } = await supabaseAdmin.from('car_inquiries').update(updates).eq('id', id);
        if (updateErr) throw updateErr;
        if (status !== 'auto_checking') {
            let message = `[Tra cứu kho] Admin đã phản hồi yêu cầu ${inquiry.model}: ${response || 'Đã cập nhật trạng thái'}`;
            if (status === 'held') message = `[Tra cứu kho] Admin đã GIỮ XE cho bạn: ${inquiry.model} ${inquiry.version}`;
            if (status === 'auto_found') message = `[Tra cứu kho] Hệ thống tìm thấy xe phù hợp: ${inquiry.model}`;
            await createNotification({ message, type: status === 'held' ? 'success' : 'info', recipient: inquiry.tvbh_email, targetView: 'inquiry', targetId: id });
        }
        return { status: 'SUCCESS', message: 'Đã phản hồi yêu cầu.' };
    } catch (error: any) { return { status: 'ERROR', message: error.message }; }
};

export const markInquiryAsRead = async (id: string, forWhom: 'admin' | 'tvbh'): Promise<void> => {
    try {
        const field = forWhom === 'admin' ? 'is_read_by_admin' : 'is_read_by_tvbh';
        await supabase.from('car_inquiries').update({ [field]: true }).eq('id', id);
        const ce = getStorageItem("userEmail") || getStorageItem("currentConsultant");
        if (ce) await supabase.from('interactions').update({ is_read: true }).eq('category', 'NOTIFICATION').eq('target_id', id).eq('target_view', forWhom === 'admin' ? 'inquiries' : 'inquiry').eq('recipient', forWhom === 'admin' ? 'ADMINS' : ce);
    } catch (error) {}
};

export const deleteCarInquiry = async (id: string): Promise<ApiResult> => {
    try {
        await supabaseAdmin.from('car_inquiries').delete().eq('id', id);
        return { status: 'SUCCESS', message: 'Đã xóa yêu cầu.' };
    } catch (error: any) { return { status: 'ERROR', message: error.message }; }
};

export const getInquiryComments = async (inquiryId: string): Promise<any[]> => {
    try {
        const { data } = await supabase.from('car_inquiries').select('chat_history').eq('id', inquiryId).single();
        return data?.chat_history || [];
    } catch (error) { return []; }
};

export const addInquiryComment = async (comment: { inquiry_id: string; sender_email: string; sender_name: string; content: string; is_admin_comment?: boolean; }): Promise<ApiResult> => {
    try {
        const { data: inquiry } = await supabase.from('car_inquiries').select('chat_history, tvbh_email, model, version, exterior_color, interior_color').eq('id', comment.inquiry_id).maybeSingle();
        if (!inquiry) throw new Error("Yêu cầu không tồn tại.");
        const newC = { id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2), ...comment, created_at: new Date().toISOString() };
        const updatedH = [...((inquiry as any).chat_history || []), newC];
        await supabaseAdmin.from('car_inquiries').update({ chat_history: updatedH, is_read_by_tvbh: comment.is_admin_comment ? false : true, is_read_by_admin: comment.is_admin_comment ? true : false }).eq('id', comment.inquiry_id);
        
        if (!comment.is_admin_comment) {
            await createNotification({ message: `[Tra cứu kho] ${comment.sender_name}: ${comment.content.substring(0, 50)}`, type: 'info', recipient: 'ADMINS', targetView: 'inquiries', targetId: comment.inquiry_id });
            const inqAny = inquiry as any;
            const chatMsg = `<b>💬 TIN NHẮN TỪ TVBH 💬</b>\n\n<b>Từ:</b> ${comment.sender_name}\n<b>Nội dung:</b> ${comment.content}\n\n<b>Xe đang Tra cứu:</b> ${inqAny.model} ${inqAny.version} | ${inqAny.exterior_color} | ${inqAny.interior_color}\n\n<b>ID Yêu Cầu:</b> <code>${comment.inquiry_id}</code>\n\n<i>=> Reply tin nhắn này để chat lại!</i>`;
            sendTelegramMessage(chatMsg);
        }
        
        if (comment.is_admin_comment && (inquiry as any).tvbh_email) await createNotification({ message: `[Tra cứu kho] Admin đã phản hồi: ${comment.content.substring(0, 50)}`, type: 'success', recipient: (inquiry as any).tvbh_email, targetView: 'inquiry', targetId: comment.inquiry_id });
        return { status: 'SUCCESS', message: 'Đã gửi phản hồi.', data: newC };
    } catch (error: any) { return { status: 'ERROR', message: error.message }; }
};
