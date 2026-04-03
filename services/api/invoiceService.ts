import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction, uploadToSupabase, ApiResult } from './baseService';
import { createNotification } from './notificationService';

export const requestInvoice = async (
    orderNumber: string, contractFile: File, proposalFile: File, policy: string, commission: string, vpoint: string,
    orderData?: { ten_khach_hang?: string; tvbh?: string; vin?: string; dong_xe?: string; phien_ban?: string; ngoai_that?: string; noi_that?: string; ngay_coc?: string; },
    aiNote?: string
) => {
    const requestedBy = getStorageItem("currentConsultant") || "Unknown User";
    const now = new Date().toISOString();
    const timestamp = Date.now();
    const sanitize = (name: string): string => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '').toUpperCase();
    const custSafe = orderData?.ten_khach_hang ? sanitize(orderData.ten_khach_hang) : 'KH';
    const cPath = `${orderNumber}/HDMB_${custSafe}_${timestamp}.${contractFile.name.split('.').pop()}`;
    const pPath = `${orderNumber}/DNXHD_${custSafe}_${timestamp}.${proposalFile.name.split('.').pop()}`;
    const [cUp, pUp] = await Promise.all([supabase.storage.from('yeucauxhd-files').upload(cPath, contractFile, { upsert: true }), supabase.storage.from('yeucauxhd-files').upload(pPath, proposalFile, { upsert: true })]);
    if (cUp.error) throw new Error(`Lỗi upload Hợp đồng: ${cUp.error.message}`);
    if (pUp.error) throw new Error(`Lỗi upload Đề nghị XHĐ: ${pUp.error.message}`);
    const { data: cUrl } = supabase.storage.from('yeucauxhd-files').getPublicUrl(cPath);
    const { data: pUrl } = supabase.storage.from('yeucauxhd-files').getPublicUrl(pPath);
    let soMay = '', vinLookup = orderData?.vin;
    if (!vinLookup) { const { data: orderRec } = await supabase.from('donhang').select('vin').eq('so_don_hang', orderNumber).single(); if (orderRec?.vin) vinLookup = orderRec.vin; }
    if (vinLookup) {
        const cleanVin = vinLookup.trim().toUpperCase();
        const { data: kx } = await supabase.from('khoxe').select('so_may').eq('vin', cleanVin).maybeSingle();
        if (kx?.so_may) soMay = kx.so_may;
        else { const { data: ttx } = await supabase.from('thongtinxe').select('so_may').eq('vin', cleanVin).maybeSingle(); soMay = ttx?.so_may || ''; }
    }
    const row = { so_don_hang: orderNumber, ten_khach_hang: orderData?.ten_khach_hang || '', tvbh: orderData?.tvbh || requestedBy, dong_xe: orderData?.dong_xe || '', phien_ban: orderData?.phien_ban || '', ngoai_that: orderData?.ngoai_that || '', noi_that: orderData?.noi_that || '', ngay_coc: orderData?.ngay_coc || null, ngay_yeu_cau: now, chinh_sach: policy || '', hoa_hong_ung: commission || '', vpoint: vpoint || '', url_hop_dong: cUrl.publicUrl, url_de_nghi_xhd: pUrl.publicUrl, so_may: soMay, vin: vinLookup || '', ngay_xuat_hoa_don: null, ket_qua_gui_mail: '', url_hoa_don_da_xuat: '', trang_thai_vc: '', ghi_chu_ai: aiNote || '' };
    const { error: insErr } = await supabaseAdmin.from('yeucauxhd').insert([row]);
    if (insErr) throw new Error(`Lỗi lưu Supabase: ${insErr.message}`);
    await supabaseAdmin.from('donhang').update({ ket_qua: 'Chờ phê duyệt' }).eq('so_don_hang', orderNumber);
    await logAction('REQUEST_INVOICE', { orderNumber, policy, commission, vpoint, aiNote }, orderNumber, 'order');
    if (vinLookup) await supabaseAdmin.from('khoxe').delete().eq('vin', vinLookup);
    await createNotification({ message: `TVBH đã yêu cầu xuất hóa đơn cho đơn hàng ${orderNumber}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber });
    return { status: 'SUCCESS', message: `Đã gửi yêu cầu xuất hóa đơn cho đơn hàng ${orderNumber} và xóa xe khỏi kho.` };
};

export const uploadSupplementaryFiles = async (orderNumber: string, contractFile: File | null, proposalFile: File | null, aiNote?: string) => {
    const { data: existing } = await supabase.from('yeucauxhd').select('url_hop_dong, url_de_nghi_xhd, ten_khach_hang').eq('so_don_hang', orderNumber).single();
    const extractPath = (url: string) => { const marker = '/yeucauxhd-files/'; const idx = url.indexOf(marker); return idx === -1 ? null : decodeURIComponent(url.substring(idx + marker.length)); };
    const sanitize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '').toUpperCase();
    const custSafe = existing?.ten_khach_hang ? sanitize(existing.ten_khach_hang) : 'KH';
    
    let urlH = '', urlP = '', ts = Date.now();
    const tasks: Promise<any>[] = [];

    if (contractFile) {
        if (existing?.url_hop_dong) { const ep = extractPath(existing.url_hop_dong); if (ep) tasks.push(supabaseAdmin.storage.from('yeucauxhd-files').remove([ep]).catch(() => {})); }
        tasks.push(uploadToSupabase(contractFile, `${orderNumber}/HDMB_${custSafe}_supp_${ts}.${contractFile.name.split('.').pop()}`).then(url => urlH = url));
    }
    if (proposalFile) {
        if (existing?.url_de_nghi_xhd) { const ep = extractPath(existing.url_de_nghi_xhd); if (ep) tasks.push(supabaseAdmin.storage.from('yeucauxhd-files').remove([ep]).catch(() => {})); }
        tasks.push(uploadToSupabase(proposalFile, `${orderNumber}/DNXHD_${custSafe}_supp_${ts}.${proposalFile.name.split('.').pop()}`).then(url => urlP = url));
    }

    await Promise.all(tasks);

    const up: any = {}; if (urlH) up.url_hop_dong = urlH; if (urlP) up.url_de_nghi_xhd = urlP; if (aiNote) up.ghi_chu_ai = aiNote;
    if (Object.keys(up).length > 0) {
        // Thực hiện update tuần tự để tránh Deadlock do Trigger 2 bảng gọi chéo nhau lấy lock Row
        await supabaseAdmin.from('yeucauxhd').update(up).eq('so_don_hang', orderNumber);
        await supabaseAdmin.from('donhang').update({ ket_qua: 'Đã bổ sung' }).eq('so_don_hang', orderNumber);

        await Promise.all([
            logAction('SUPPLEMENT_FILES', { orderNumber }, orderNumber, 'order'),
            createNotification({ message: `Hồ sơ bổ sung cho đơn hàng ${orderNumber} đã được upload.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber })
        ]);

        try {
            const { data: updatedRecord } = await supabaseAdmin.from('yeucauxhd').select('*').eq('so_don_hang', orderNumber).single();
            if (updatedRecord) {

                // (removed GAS sync block to avoid recreating deleted sheets)

                let filesInfo = [];
                if (urlH) filesInfo.push("Hợp đồng mua bán");
                if (urlP) filesInfo.push("Đề nghị XHĐ");
                
                supabaseAdmin.functions.invoke('send-email', {
                    body: {
                        actionId: 'invoice_supplement_submitted',
                        record: { ...updatedRecord, filesInfo: filesInfo.join(', ') }
                    }
                }).catch(e => console.warn('Lỗi gọi gửi email biên nhận qua Edge Function:', e));
            }
        } catch (e) {
            console.warn('Không thể đồng bộ trực tiếp file bổ sung về GS:', e);
        }
    }
    return { status: 'SUCCESS', message: 'Đã bổ sung hồ sơ thành công (file cũ đã tự động xóa).' };
};
export const getXuathoadonData = async () => {
    const { getApi } = await import('./baseService');
    return getApi({ action: 'getXuathoadonData' });
};

export const getSalesPolicies = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('chinhsach').select('ten_chinh_sach').eq('trang_thai', 'Hoạt động');
        if (error) throw error;
        const policies = data ? data.map((p: any) => p.ten_chinh_sach) : [];
        return { status: 'SUCCESS', message: 'Tải chính sách thành công', data: policies };
    } catch (error: any) {
        return { status: 'ERROR', message: error.message || 'Lỗi tải chính sách' };
    }
};
