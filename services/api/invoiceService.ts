import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction, uploadToSupabase, ApiResult, postApi } from './baseService';
import { createNotification } from './notificationService';

export const requestInvoice = async (
    orderNumber: string, contractFile: File, proposalFile: File, policy: string, commission: string, vpoint: string,
    orderData?: { ten_khach_hang?: string; tvbh?: string; vin?: string; dong_xe?: string; phien_ban?: string; ngoai_that?: string; noi_that?: string; ngay_coc?: string; },
    aiNote?: string,
    xeXangVin?: string, xeXangHang?: string, xeXangModel?: string,
    _preProcessedPayloads?: { contract: any, proposal: any },
    maVc?: string
) => {
    const requestedBy = getStorageItem("currentConsultant") || "Unknown User";
    const now = new Date().toISOString();
    const timestamp = Date.now();

    if (xeXangVin) {
        const cleanGasVin = xeXangVin.trim().toUpperCase();
        const { data: existingGasCar } = await supabase.from('yeucauxhd')
            .select('xe_xang_vin, so_don_hang')
            .ilike('xe_xang_vin', cleanGasVin);

        const { data: existingArchivedGasCar } = await supabase.from('archived_orders')
            .select('xe_xang_vin, so_don_hang')
            .ilike('xe_xang_vin', cleanGasVin);

        const matchY = !!(existingGasCar && existingGasCar.length > 0);
        const matchA = !!(existingArchivedGasCar && existingArchivedGasCar.length > 0);

        if (matchY || matchA) {
            const matched = matchY && existingGasCar ? existingGasCar[0] : (existingArchivedGasCar ? existingArchivedGasCar[0] : null);
            if (matched) {
                throw new Error(`Xe xăng có số VIN ${cleanGasVin} đã được sử dụng trước đó trong yêu cầu xuất hóa đơn ${matched.so_don_hang}.`);
            }
        }
    }

    const sanitize = (name: string): string => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '').toUpperCase();
    const custSafe = orderData?.ten_khach_hang ? sanitize(orderData.ten_khach_hang) : 'KH';
    const cPath = `${orderNumber}/HDMB_${custSafe}_${timestamp}.${contractFile.name.split('.').pop()}`;
    const pPath = `${orderNumber}/DNXHD_${custSafe}_${timestamp}.${proposalFile.name.split('.').pop()}`;
    const [cUp, pUp] = await Promise.all([supabase.storage.from('yeucauxhd-files').upload(cPath, contractFile, { upsert: true }), supabase.storage.from('yeucauxhd-files').upload(pPath, proposalFile, { upsert: true })]);
    if (cUp.error) throw new Error(`Lỗi upload Hợp đồng: ${cUp.error.message}`);
    if (pUp.error) throw new Error(`Lỗi upload Đề nghị XHĐ: ${pUp.error.message}`);
    const { data: cUrl } = supabase.storage.from('yeucauxhd-files').getPublicUrl(cPath);
    const { data: pUrl } = supabase.storage.from('yeucauxhd-files').getPublicUrl(pPath);
    let soMay = '', maDms = '', vinLookup = orderData?.vin;
    if (!vinLookup) { const { data: orderRec } = await supabase.from('donhang').select('vin, ma_dms').eq('so_don_hang', orderNumber).single(); if (orderRec?.vin) { vinLookup = orderRec.vin; maDms = orderRec.ma_dms || ''; } }
    if (vinLookup) {
        const cleanVin = vinLookup.trim().toUpperCase();
        const { data: ttx } = await supabase.from('thongtinxe').select('so_may, khu_vuc').eq('vin', cleanVin).maybeSingle(); 
        soMay = ttx?.so_may || ''; 
        if (!maDms) maDms = ttx?.khu_vuc || ''; 
    }
    const row = { so_don_hang: orderNumber, ten_khach_hang: orderData?.ten_khach_hang || '', tvbh: orderData?.tvbh || requestedBy, dong_xe: orderData?.dong_xe || '', phien_ban: orderData?.phien_ban || '', ngoai_that: orderData?.ngoai_that || '', noi_that: orderData?.noi_that || '', ngay_coc: orderData?.ngay_coc || null, ngay_yeu_cau: now, chinh_sach: policy || '', hoa_hong_ung: commission || '', vpoint: vpoint || '', url_hop_dong: cUrl.publicUrl, url_de_nghi_xhd: pUrl.publicUrl, so_may: soMay, vin: vinLookup || '', ma_dms: maDms, ngay_xuat_hoa_don: null, ket_qua_gui_mail: '', url_hoa_don_da_xuat: '', trang_thai_vc: '', ghi_chu_ai: aiNote || '', xe_xang_vin: xeXangVin || '', xe_xang_hang: xeXangHang || '', xe_xang_model: xeXangModel || '', ma_vc: maVc || '' };
    const { error: insErr } = await supabaseAdmin.from('yeucauxhd').insert([row]);
    if (insErr) throw new Error(`Lỗi lưu Supabase: ${insErr.message}`);
    await supabaseAdmin.from('donhang').update({ 
        ket_qua: 'Chờ phê duyệt',
        chinh_sach: policy || '',
        ma_vc: maVc || ''
    }).eq('so_don_hang', orderNumber);
    await logAction('REQUEST_INVOICE', { orderNumber, policy, commission, vpoint, aiNote, xeXangVin, xeXangHang, xeXangModel }, orderNumber, 'order');
    if (vinLookup) await supabaseAdmin.from('khoxe').delete().eq('vin', vinLookup);
    await createNotification({ message: `TVBH đã yêu cầu xuất hóa đơn cho đơn hàng ${orderNumber}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber });
    
    // Gửi email biên nhận tiếp nhận yêu cầu xuất hóa đơn cho TVBH (Background non-blocking)
    supabaseAdmin.functions.invoke('send-email', {
        body: {
            actionId: 'invoice_request_submitted',
            record: {
                ...row,
                policy: policy || row.chinh_sach,
                commission: commission || row.hoa_hong_ung,
                vpoint: vpoint || row.vpoint,
            }
        }
    }).then(({ error }) => {
        if (error) console.error(`[ERROR-MAIL] Gửi mail tiếp nhận XHĐ cho đơn ${orderNumber} lỗi:`, error);
        else console.log(`[SUCCESS-MAIL] Đã gửi mail tiếp nhận XHĐ thành công cho đơn ${orderNumber}`);
    }).catch(e => console.error(`[CRITICAL-MAIL] Lỗi gọi EF gửi mail tiếp nhận XHĐ cho đơn ${orderNumber}:`, e));

    return { status: 'SUCCESS', message: `Đã gửi yêu cầu xuất hóa đơn cho đơn hàng ${orderNumber} và xóa xe khỏi kho.` };
};

export const uploadSupplementaryFiles = async (orderNumber: string, contractFile: File | null, proposalFile: File | null, aiNote?: string) => {
    const { data: existing } = await supabase.from('yeucauxhd').select('url_hop_dong, url_de_nghi_xhd, ten_khach_hang, ghi_chu_admin, tvbh').eq('so_don_hang', orderNumber).single();
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

    const up: any = {}; 
    if (urlH) up.url_hop_dong = urlH; 
    if (urlP) up.url_de_nghi_xhd = urlP; 
    if (aiNote) up.ghi_chu_ai = aiNote;
    if (existing?.ghi_chu_admin && existing.ghi_chu_admin.includes('[YÊU CẦU SCAN LẠI]')) {
        up.ghi_chu_admin = '[ĐÃ SCAN LẠI] TVBH đã cập nhật file scan mới';
    } else if (existing?.ghi_chu_admin) {
        up.ghi_chu_admin = 'TVBH đã nộp hồ sơ bổ sung';
    }
    if (Object.keys(up).length > 0) {
        // Lấy thông tin hiện tại của đơn hàng để kiểm tra trạng thái
        const { data: currentOrder } = await supabaseAdmin.from('donhang').select('ket_qua').eq('so_don_hang', orderNumber).maybeSingle();
        const prevStatus = (currentOrder?.ket_qua || '').trim().toLowerCase().normalize('NFC');

        await supabaseAdmin.from('yeucauxhd').update(up).eq('so_don_hang', orderNumber);
        
        // CHỈ đổi ket_qua sang 'Đã bổ sung' nếu trước đó đơn hàng đang ở trạng thái 'Yêu cầu bổ sung'
        // Nếu đơn hàng đang ở trạng thái khác (Đã xuất hóa đơn, Chờ ký, v.v.), GIỮ NGUYÊN trạng thái hiện tại!
        if (prevStatus === 'yêu cầu bổ sung') {
            await supabaseAdmin.from('donhang').update({ ket_qua: 'Đã bổ sung' }).eq('so_don_hang', orderNumber);
        }

        const tvbhName = existing?.tvbh ? ` (${existing.tvbh})` : '';
        const notifyMsg = prevStatus === 'yêu cầu bổ sung' 
            ? `TVBH${tvbhName} đã nộp hồ sơ bổ sung cho đơn hàng ${orderNumber}.` 
            : `TVBH${tvbhName} đã cập nhật lại bản scan hồ sơ cho đơn hàng ${orderNumber}.`;

        await Promise.all([
            logAction('SUPPLEMENT_FILES', { orderNumber, prevStatus, tvbh: existing?.tvbh }, orderNumber, 'order'),
            createNotification({ message: notifyMsg, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber })
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
                        record: { 
                            ...updatedRecord, 
                            filesInfo: filesInfo.join(', '),
                            ma_dms: updatedRecord.ma_dms || ''
                        }
                    }
                }).then(({ error }) => {
                    if (error) console.error(`[ERROR-MAIL] Gửi mail bổ sung cho đơn ${orderNumber} lỗi:`, error);
                    else console.log(`[SUCCESS-MAIL] Đã gửi mail bổ sung thành công cho đơn ${orderNumber}`);
                }).catch(e => console.error(`[CRITICAL-MAIL] Lỗi gọi Edge Function gửi mail bổ sung cho đơn ${orderNumber}:`, e));
            }
        } catch (e) {
            console.warn('Không thể đồng bộ trực tiếp file bổ sung về GS:', e);
        }
    }
    return { status: 'SUCCESS', message: 'Đã bổ sung hồ sơ thành công (file cũ đã tự động xóa).' };
};
export const getXuathoadonData = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('yeucauxhd').select('*').order('ngay_yeu_cau', { ascending: false });
        if (error) throw error;

        const formattedData = data.map((req: any) => ({
            "Số đơn hàng": req.so_don_hang,
            "Tên khách hàng": req.ten_khach_hang,
            "Dòng xe": req.dong_xe,
            "Phiên bản": req.phien_ban,
            "Ngoại thất": req.ngoai_that,
            "Nội thất": req.noi_that,
            "Tên tư vấn bán hàng": req.tvbh,
            "VIN": req.vin,
            "Số máy": req.so_may,
            "Mã DMS": req.ma_dms,
            "Ngày yêu cầu": req.ngay_yeu_cau,
            "Thời gian nhập": req.ngay_yeu_cau, // Đồng bộ với useAdminData
            "Ngày cọc": req.ngay_coc,
            "Chính sách": req.chinh_sach,
            "CHÍNH SÁCH": req.chinh_sach,
            "Hoa hồng ứng": req.hoa_hong_ung,
            "Điểm Vpoint sử dụng": req.vpoint,
            "LinkHopDong": req.url_hop_dong,
            "LinkDeNghiXHD": req.url_de_nghi_xhd,
            "LinkHoaDonDaXuat": req.url_hoa_don_da_xuat,
            "Ngày xuất hóa đơn": req.ngay_xuat_hoa_don,
            "Kết quả gửi mail": req.ket_qua_gui_mail,
            "Trạng thái VC": req.trang_thai_vc,
            "Mã VC": req.ma_vc,
            "Ghi chú AI": req.ghi_chu_ai,
            "Ghi chú Admin": req.ghi_chu_admin || '',
            "ghi_chu_admin": req.ghi_chu_admin || ''
        }));

        return {
            status: 'SUCCESS',
            message: 'Fetched xuathoadon data from Supabase',
            data: formattedData
        };
    } catch (err: any) {
        console.error("Supabase getXuathoadonData error: ", err);
        return {
            status: 'ERROR',
            message: err.message
        };
    }
};

export const getSalesPolicies = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase
            .from('chinhsach')
            .select('ten_chinh_sach, dong_xe')
            .eq('trang_thai', 'Hoạt động');
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Tải chính sách thành công', data: data || [] };
    } catch (error: any) {
        return { status: 'ERROR', message: error.message || 'Lỗi tải chính sách' };
    }
};

export const forceMigrateToDrive = async (orderNumber: string): Promise<ApiResult> => {
    try {
        return await postApi({ action: 'fetchSupabasePdfToDrive', orderNumber });
    } catch (err: any) {
        return { status: 'ERROR', message: err.message || 'Không thể gửi yêu cầu bốc HS sang Drive.' };
    }
};

export const saveSplitImagesToSupabase = async (
    orderNumber: string, 
    _customerName: string, 
    images: { base64Data: string, mimeType: string }[],
    prefix: string
) => {
    try {
        const sanitizedPrefix = (prefix || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9._\-]/g, '_');
        const folder = `rescan/${orderNumber}/${sanitizedPrefix}`;
        const uploadPromises = images.map(async (img, idx) => {
            const byteCharacters = atob(img.base64Data);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                const slice = byteCharacters.slice(offset, offset + 512);
                const byteNumbers = new Array(slice.length);
                for (let i = 0; i < slice.length; i++) {
                    byteNumbers[i] = slice.charCodeAt(i);
                }
                byteArrays.push(new Uint8Array(byteNumbers));
            }
            const blob = new Blob(byteArrays, { type: img.mimeType });
            const fileName = `page_${idx + 1}.jpg`;
            const path = `${folder}/${fileName}`;
            
            return uploadToSupabase(blob, path, 'temp_scans');
        });

        const urls = await Promise.all(uploadPromises);
        return { status: 'SUCCESS', urls };
    } catch (e: any) {
        console.error("Lỗi saveSplitImagesToSupabase:", e);
        return { status: 'ERROR', message: e.message };
    }
};

export const getSupabaseScanImages = async (orderNumber: string) => {
    try {
        const folder = `rescan/${orderNumber}`;
        const { data, error } = await supabaseAdmin.storage.from('temp_scans').list(folder, {
            recursive: true
        } as any);

        if (error) throw error;
        if (!data || data.length === 0) return { status: 'ERROR', message: "Không tìm thấy ảnh quét lại trên Supabase." };

        const files = data
            .filter(f => !f.id === false)
            .map(f => {
                const path = `${folder}/${f.name}`;
                const { data: urlData } = supabaseAdmin.storage.from('temp_scans').getPublicUrl(path);
                return {
                    url: urlData.publicUrl,
                    mimeType: 'image/jpeg'
                };
            });

        return { status: 'SUCCESS', files };
    } catch (e: any) {
        console.error("Lỗi getSupabaseScanImages:", e);
        return { status: 'ERROR', message: e.message };
    }
};

export const deleteSupabaseScanImages = async (orderNumber: string) => {
    try {
        const folder = `rescan/${orderNumber}`;
        const { data: listData } = await supabaseAdmin.storage.from('temp_scans').list(folder, { recursive: true } as any);
        
        if (listData && listData.length > 0) {
            const filesToRemove = listData.map(f => `${folder}/${f.name}`);
            await supabaseAdmin.storage.from('temp_scans').remove(filesToRemove);
        }
        return { status: 'SUCCESS' };
    } catch (e) {
        console.error("Lỗi xóa ảnh quét lại:", e);
        return { status: 'ERROR' };
    }
};

export const saveAllSplitImagesToDrive = async (orderNumber: string, customerName: string, documentGroups: any[]) => {
    try {
        return await postApi({ action: 'saveAllSplitImagesToDrive', orderNumber, customerName, documentGroups: JSON.stringify(documentGroups) });
    } catch (e: any) {
        return { status: 'ERROR', message: e.message };
    }
};

export const saveSplitImagesToDrive = async (orderNumber: string, customerName: string, images: string[], prefix: string) => {
    try {
        return await postApi({ action: 'saveSplitImagesToDrive', orderNumber, customerName, images: JSON.stringify(images), prefix });
    } catch (e: any) {
        return { status: 'ERROR', message: e.message };
    }
};

export const getOrderDriveImages = async (orderNumber: string, customerName: string, orderDateStr: string) => {
    try {
        return await postApi({ action: 'getOrderImagesFromDrive', orderNumber, customerName, orderDate: orderDateStr });
    } catch (e: any) {
        return { status: 'ERROR', message: e.message };
    }
};

