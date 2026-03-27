import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction, ApiResult, postApi, getExteriorColorName, getInteriorColorName, uploadToSupabase, getApi, ADMIN_USER } from './baseService';
import { createNotification } from './notificationService';
import { StockVehicle } from '../../types';

export const performAdminAction = async (action: string, params: Record<string, any>): Promise<ApiResult> => {
    const currentUser = getStorageItem("currentUser") || "Unknown Admin";
    try {
        if (action === 'deleteOrderLogic') {
            const orderNumber = params.orderNumber;
            const userEmail = getStorageItem("userEmail") || getStorageItem("currentConsultant") || "admin@system.com";
            const userFullName = getStorageItem("currentUser") || "Admin";

            const { data, error } = await supabaseAdmin.rpc('rpc_delete_order', {
                p_order_number: orderNumber,
                p_actor_email: userEmail,
                p_actor_name: userFullName
            });

            if (error) throw error;
            return data;
        }
        if (action === 'cancelRequest') {
            const nos = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
            const userEmail = getStorageItem("userEmail") || getStorageItem("currentConsultant") || "admin@system.com";
            const userFullName = getStorageItem("currentUser") || "Admin";

            const { data, error } = await supabaseAdmin.rpc('rpc_cancel_order_request', {
                p_order_numbers: nos,
                p_reason: params.reason,
                p_actor_email: userEmail,
                p_actor_name: userFullName
            });

            if (error) throw error;
            return data;
        }
        if (action === 'findAndAddCarByVin') {
            const vin = params.vin.trim().toUpperCase();
            if (vin.length !== 17) return { status: 'ERROR', message: 'Số VIN không hợp lệ (phải đủ 17 ký tự).' };
            const { data: master } = await supabaseAdmin.from('thongtinxe').select('*').ilike('vin', vin).maybeSingle();
            const modelName = master?.mo_ta || '';
            const finalModel = modelName.toLowerCase().includes('limo green') ? 'LIMO' : modelName;
            const { error: insErr } = await supabaseAdmin.from('khoxe').insert([{ vin, dong_xe: finalModel, phien_ban: '', ngoai_that: getExteriorColorName(master?.ngoai_that || ''), noi_that: getInteriorColorName(master?.noi_that || ''), so_may: master?.so_may || '', ma_dms: master?.khu_vuc || '', trang_thai: 'Chưa ghép', ngay_nhap: new Date().toISOString() }]);
            if (insErr) { if (insErr.code === '23505') return { status: 'ERROR', message: `Xe với VIN ${vin} đã tồn tại trong kho.` }; throw insErr; }
            await logAction('ADD_CAR', { vin }, vin, 'stock');
            createNotification({ message: `<b>${finalModel}</b> (${vin}) đã nhập kho. Sẵn sàng giao dịch!`, type: 'stock_hero', targetView: 'stock', targetId: vin });
            return { status: 'SUCCESS', message: master ? `Đã thêm xe ${vin} thành công.` : `Đã thêm xe ${vin} (VIN này chưa có trong danh mục thongtinxe).` };
        }
        if (action === 'bulkAddCarsByVin') {
            const rawLines = (params.vins || '').split(/\r?\n/);
            const parsedMap = new Map<string, string>();
            for (let line of rawLines) {
                line = line.trim();
                if (!line) continue;
                let vin = ''; let version = '';
                const parts = line.split('\t');
                if (parts.length >= 2) {
                    let p0 = parts[0].trim().toUpperCase();
                    let p1 = parts[1].trim();
                    if (p0.length === 17) { vin = p0; version = parts.slice(1).join(' ').trim(); }
                    else if (p1.length === 17) { vin = p1.toUpperCase(); version = parts[0].trim(); }
                }
                if (!vin) {
                    const match = line.match(/([a-zA-Z0-9]{17})([,;\t\s]+(.*))?/);
                    if (match) { vin = match[1].toUpperCase(); version = (match[3] || '').trim(); }
                }
                if (vin && vin.length === 17) parsedMap.set(vin, version);
            }
            if (parsedMap.size === 0) return { status: 'ERROR', message: 'Không tìm thấy số VIN hợp lệ.' };
            const uniqueVins = Array.from(parsedMap.keys());
            const { data: masters } = await supabaseAdmin.from('thongtinxe').select('*').in('vin', uniqueVins);
            const masterMap = new Map(); (masters || []).forEach(m => masterMap.set(m.vin.trim().toUpperCase(), m));
            const res = { success: 0, failed: 0, skipped: 0 };
            for (const vin of uniqueVins) {
                const m = masterMap.get(vin); const model = (m?.mo_ta || '').toLowerCase().includes('limo green') ? 'LIMO' : (m?.mo_ta || '');
                const version = parsedMap.get(vin) || '';
                const { error: insErr } = await supabaseAdmin.from('khoxe').insert([{ vin, dong_xe: model, phien_ban: version, ngoai_that: getExteriorColorName(m?.ngoai_that || ''), noi_that: getInteriorColorName(m?.noi_that || ''), so_may: m?.so_may || '', ma_dms: m?.khu_vuc || '', trang_thai: 'Chưa ghép', ngay_nhap: new Date().toISOString() }]);
                if (insErr) { if (insErr.code === '23505') res.skipped++; else res.failed++; } else { res.success++; await logAction('ADD_CAR_BULK', { vin, version }, vin as string, 'stock'); }
            }
            if (res.success > 0) createNotification({ message: `Đã cập nhật <b>${res.success} xe mới</b> vào kho dữ liệu.`, type: 'stock_hero', targetView: 'stock' });
            return { status: 'SUCCESS', message: `Hoàn tất: Thêm ${res.success}. Bỏ qua ${res.skipped}. Thất bại ${res.failed}.` };
        }
        if (action === 'deleteCarFromStockLogic') {
            const vin = params.vinToDelete; const reason = params.reason;
            const { data: carSnap } = await supabaseAdmin.from('khoxe').select('*').eq('vin', vin).maybeSingle();
            const { data: matchedOrder } = await supabaseAdmin.from('donhang').select('so_don_hang').eq('vin', vin).maybeSingle();
            if (matchedOrder) await supabaseAdmin.from('donhang').update({ ket_qua: 'Chưa ghép', vin: null, thoi_gian_ghep: null }).eq('so_don_hang', (matchedOrder as any).so_don_hang);
            await logAction('DELETE_CAR', { vin, reason, snapshot: carSnap }, vin, 'stock');
            await supabaseAdmin.from('khoxe').delete().eq('vin', vin);
            return { status: 'SUCCESS', message: `Đã xóa xe ${vin}.` + (matchedOrder ? ` (Đã tự động hủy ghép ĐH ${(matchedOrder as any).so_don_hang})` : '') };
        }
        if (action === 'restoreCarToStockLogic') {
            const vin = params.vinToRestore;
            const { data: logs } = await supabaseAdmin.from('interactions').select('metadata').eq('target_id', vin).eq('category', 'LOG').eq('type', 'DELETE_CAR').order('created_at', { ascending: false }).limit(1);
            let carData: any = null;
            if (logs && logs[0]?.metadata?.snapshot) {
                carData = { ...logs[0].metadata.snapshot }; delete carData.id; carData.trang_thai = 'Chưa ghép'; carData.nguoi_giu_xe = null; carData.thoi_gian_het_han_giu = null; carData.ngay_nhap = new Date().toISOString();
            } else {
                const { data: m } = await supabaseAdmin.from('thongtinxe').select('*').eq('vin', vin).maybeSingle();
                carData = { vin, trang_thai: 'Chưa ghép', ngay_nhap: new Date().toISOString(), dong_xe: (m as any)?.mo_ta || '', phien_ban: (m as any)?.phien_ban || '', ngoai_that: getExteriorColorName((m as any)?.ngoai_that || ''), noi_that: getInteriorColorName((m as any)?.noi_that || ''), ma_dms: (m as any)?.khu_vuc || '', so_may: (m as any)?.so_may || '' };
            }
            await supabaseAdmin.from('khoxe').insert([carData]);
            await logAction('RESTORE_CAR', { vin }, vin, 'stock');
            return { status: 'SUCCESS', message: `Đã phục hồi xe ${vin}.` };
        }
        if (action === 'approveSelectedInvoiceRequest') {
            const nos = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
            const userEmail = getStorageItem("userEmail") || getStorageItem("currentConsultant") || "admin@system.com";
            const userFullName = getStorageItem("currentUser") || "Admin";

            const { data, error } = await supabaseAdmin.rpc('rpc_approve_invoice_request', {
                p_order_numbers: nos,
                p_actor_email: userEmail,
                p_actor_name: userFullName
            });

            if (error) throw error;
            return data;
        }
        if (action === 'markAsPendingSignature') {
            const nos = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
            const dateVal = params.ngay_xuat_hoa_don || null;
            const userEmail = getStorageItem("userEmail") || getStorageItem("currentConsultant") || "admin@system.com";
            const userFullName = getStorageItem("currentUser") || "Admin";

            const { data, error } = await supabaseAdmin.rpc('rpc_mark_as_pending_signature', {
                p_order_numbers: nos,
                p_ngay_xuat_hoa_don: dateVal,
                p_actor_email: userEmail,
                p_actor_name: userFullName
            });

            if (error) throw error;
            return data;
        }
        if (action === 'requestSupplementForInvoice') {
            const nos = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];

            let finalReason = params.reason || '';
            if (params.pastedImagesBase64) {
                try {
                    const base64Images = JSON.parse(params.pastedImagesBase64);
                    if (Array.isArray(base64Images) && base64Images.length > 0) {
                        const uploadedUrls = [];
                        for (let i = 0; i < base64Images.length; i++) {
                            const dataUrl = base64Images[i];
                            if (dataUrl) {
                                const res = await fetch(dataUrl);
                                const blob = await res.blob();
                                const orderFolder = nos.length > 0 ? nos[0].replace(/[^a-zA-Z0-9]/g, '_') : 'bulk';
                                const path = `${orderFolder}/SUPP_IMG_${Date.now()}_${i}.png`;
                                const url = await uploadToSupabase(blob, path);
                                uploadedUrls.push(url);
                            }
                        }
                        if (uploadedUrls.length > 0) {
                            finalReason += '\n\nFile đính kèm: ' + uploadedUrls.join(', ');
                        }
                    }
                } catch (err) {
                    console.error("Failed to upload supplement images:", err);
                }
            }

            let successCount = 0;
            for (const orderNo of nos) {
                const tr = orderNo.trim();
                const { data: o } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang, vin').eq('so_don_hang', tr).maybeSingle();
                if (!o) continue;

                await supabaseAdmin.from('yeucauxhd').update({ ghi_chu_admin: finalReason }).eq('so_don_hang', tr);
                await supabaseAdmin.from('donhang').update({ ket_qua: 'Yêu cầu bổ sung' }).eq('so_don_hang', tr);

                await logAction('REQUEST_SUPPLEMENT', { reason: finalReason }, tr, 'invoice_bulk');

                if (o.ten_tu_van_ban_hang) {
                    if (o.vin) {
                        const { error: penaltyErr } = await supabaseAdmin.from('car_hold_activities').insert({
                            vin: o.vin, username: o.ten_tu_van_ban_hang, tvbh_name: o.ten_tu_van_ban_hang, type: 'PENALTY', status: 'supplement_requested', reason: `Bổ sung HS: ${finalReason.substring(0, 50)}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
                        });
                        if (penaltyErr) console.warn("Skipped car_hold_activities penalty:", penaltyErr.message);
                    }

                    await createNotification({
                        message: `Yêu cầu xuất hóa đơn cho ĐH ${tr} cần bổ sung: ${finalReason}`,
                        type: 'warning',
                        recipient: o.ten_tu_van_ban_hang,
                        targetView: 'orders',
                        targetId: tr
                    });

                    // Gửi email yêu cầu bổ sung cho TVBH đồng bộ
                    try {
                        const payload = {
                            actionId: 'invoice_supplement_requested',
                            record: {
                                tvbh: o.ten_tu_van_ban_hang,
                                ten_khach_hang: 'Khách hàng', // Không có sẵn trong o, tạm để KH
                                so_don_hang: tr,
                                vin: o.vin || '',
                                ghi_chu_admin: finalReason
                            }
                        };
                        supabaseAdmin.functions.invoke('send-email', { body: payload })
                            .then(({ error }) => { if (error) console.warn('Lỗi gửi mail supplement_requested:', error) })
                            .catch(err => console.warn('Lỗi gọi gửi mail supplement_requested:', err));
                    } catch (err) {
                        console.warn('Lỗi gửi mail supplement_requested:', err);
                    }
                }
                successCount++;
            }

            if (successCount === 0) throw new Error("Không tìm thấy đơn hàng hợp lệ để yêu cầu bổ sung.");
            return { status: 'SUCCESS', message: `Đã gửi yêu cầu bổ sung thành công cho ${successCount} đơn hàng.` };
        }
        if (action === 'handleBulkUploadIssuedInvoices') {
            const files = params.filesData ? JSON.parse(params.filesData) : [];
            for (let f of files) {
                const tr = f.orderNumber.trim(); const { data: o } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang, vin').eq('so_don_hang', tr).single();
                const up: any = {}; if (f.invoiceUrl) up.url_hoa_don_da_xuat = f.invoiceUrl;
                await supabaseAdmin.from('yeucauxhd').update(up).eq('so_don_hang', tr);
                await supabaseAdmin.from('donhang').update({ ket_qua: 'Đã xuất hóa đơn' }).eq('so_don_hang', tr);
                if (o && (o as any).vin) await supabaseAdmin.from('car_hold_activities').update({ status: 'invoiced' }).eq('vin', (o as any).vin).eq('status', 'matched');
                if (o && (o as any).ten_tu_van_ban_hang) await createNotification({ message: `Đã có hóa đơn cho ĐH ${tr}.`, type: 'success', recipient: (o as any).ten_tu_van_ban_hang, targetView: 'sold', targetId: tr });
            }
            await logAction('UPLOAD_INVOICE_BULK', { count: files.length }, 'bulk', 'invoice');
            return { status: 'SUCCESS', message: 'Đã xuất hóa đơn thành công' };
        }
        if (action === 'unmatchOrder') {
            const tr = params.orderNumber; const kqm = (params.unmatchType || '').includes('Chờ xe') ? 'Chưa ghép' : 'Đã hủy';
            const { data: o } = await supabaseAdmin.from('donhang').select('vin, ten_tu_van_ban_hang').eq('so_don_hang', tr).maybeSingle();
            if (o && (o as any).vin) await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', (o as any).vin);
            const up: any = { ket_qua: kqm, vin: null, thoi_gian_ghep: null };
            if (kqm === 'Đã hủy') { up.ghi_chu_huy = `Bị Admin hủy ghép. Lý do: ${params.reason}`; up.thoi_gian_huy = new Date().toISOString(); await supabaseAdmin.from('yeucauxhd').update({ ghi_chu_admin: params.reason }).eq('so_don_hang', tr); }
            else await supabaseAdmin.from('yeucauxhd').update({ vin: null }).eq('so_don_hang', tr);
            await supabaseAdmin.from('donhang').update(up).eq('so_don_hang', tr);
            if (o && (o as any).ten_tu_van_ban_hang) await createNotification({ message: `Đơn hàng ${tr} đã bị hủy ghép xe (${kqm}). Lý do: ${params.reason}`, type: 'danger', recipient: (o as any).ten_tu_van_ban_hang, targetView: 'orders', targetId: tr });
            await logAction('UNMATCH_ORDER', { orderNumber: tr, reason: params.reason, kqm }, tr, 'order');
            return { status: 'SUCCESS', message: 'Đã hủy ghép xe thành công.' };
        }
        if (action === 'updateRowData' && params.sheetName === 'Xuathoadon') {
            const tr = params.primaryKeyValue; const up: any = {};
            if (params["SỐ ĐỘNG CƠ"] !== undefined) up.so_may = params["SỐ ĐỘNG CƠ"]; if (params["CHÍNH SÁCH"] !== undefined) up.chinh_sach = params["CHÍNH SÁCH"]; if (params["Hoa hồng ứng"] !== undefined) up.hoa_hong_ung = params["Hoa hồng ứng"]; if (params["Điểm Vpoint sử dụng"] !== undefined) up.vpoint = params["Điểm Vpoint sử dụng"]; if (params["NGÀY XUẤT HÓA ĐƠN"] !== undefined) up.ngay_xuat_hoa_don = params["NGÀY XUẤT HÓA ĐƠN"]; if (params["KẾT QUẢ GỬI MAIL"] !== undefined) up.ket_qua_gui_mail = params["KẾT QUẢ GỬI MAIL"]; if (params["URL Hóa Đơn Đã Xuất"] !== undefined) up.url_hoa_don_da_xuat = params["URL Hóa Đơn Đã Xuất"];
            await supabaseAdmin.from('yeucauxhd').update(up).eq('so_don_hang', tr);
            await logAction('EDIT_INVOICE_DETAILS', { orderNumber: tr, updates: up }, tr, 'order');
            return { status: 'SUCCESS', message: 'Đã cập nhật thông tin hóa đơn.' };
        }
        if (action === 'manualMatchCar') {
            const tr = params.orderNumber; const vin = params.vin;
            const { data: o } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang').eq('so_don_hang', tr).single();
            await supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: currentUser, thoi_gian_het_han_giu: 'Vô thời hạn' }).eq('vin', vin);
            await supabaseAdmin.from('donhang').update({ vin, ket_qua: 'Đã ghép', thoi_gian_ghep: new Date().toISOString() }).eq('so_don_hang', tr);
            
            // Thêm ghi nhận uy tín cho TVBH (tính như khớp xe)
            const tvbh = o && (o as any).ten_tu_van_ban_hang;
            if (tvbh) {
                await supabaseAdmin.from('car_hold_activities').insert({
                    vin,
                    username: tvbh,
                    tvbh_name: tvbh,
                    status: 'matched',
                    type: 'HOLD',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
                await createNotification({ message: `Admin đã ghép xe (VIN: ${vin}) cho ĐH ${tr}.`, type: 'success', recipient: tvbh, targetView: 'orders', targetId: tr });
            }
            
            await logAction('MANUAL_MATCH', { orderNumber: tr, vin }, tr, 'order');
            return { status: 'SUCCESS', message: 'Ghép xe thành công!' };
        }
        if (action === 'revertOrderStatus') {
            const tr = params.orderNumber;
            const { data: o } = await supabaseAdmin.from('donhang').select('ket_qua, ten_tu_van_ban_hang, vin').eq('so_don_hang', tr).maybeSingle();
            
            if (o) {
                let ns = ''; 
                switch (o.ket_qua) { 
                    case 'Đã hoàn tất': 
                        ns = 'Đã xuất hóa đơn'; 
                        break; 
                    case 'Đã xuất hóa đơn': 
                        ns = 'Chờ ký hóa đơn'; 
                        break; 
                    case 'Chờ ký hóa đơn': 
                        ns = 'Đã phê duyệt'; 
                        await supabaseAdmin.from('donhang').update({ ngay_xuat_hoa_don: null }).eq('so_don_hang', tr); 
                        await supabaseAdmin.from('yeucauxhd').update({ ngay_xuat_hoa_don: null }).eq('so_don_hang', tr); 
                        break; 
                    case 'Đã phê duyệt': 
                        ns = 'Chờ phê duyệt'; 
                        await supabaseAdmin.from('yeucauxhd').update({ ghi_chu_admin: 'Admin đã hoàn tác về Chờ phê duyệt' }).eq('so_don_hang', tr);
                        break; 
                    case 'Chờ phê duyệt': 
                    case 'Yêu cầu bổ sung': 
                        ns = 'Đã ghép'; 
                        // [Nâng cấp]: Xoá hoàn toàn hồ sơ yêu cầu XHĐ để phục hồi nguyên bản trạng thái ghép xe chưa yc
                        await supabaseAdmin.from('yeucauxhd').delete().eq('so_don_hang', tr);
                        break; 
                    case 'Đã ghép': 
                        if (o.vin) {
                            await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', o.vin);
                        }
                        await supabaseAdmin.from('donhang').update({ ket_qua: 'Chưa ghép', vin: null, thoi_gian_ghep: null }).eq('so_don_hang', tr); 
                        await logAction('REVERT_STATUS', { orderNumber: tr, from: o.ket_qua, to: 'Chưa ghép' }, tr, 'order'); 
                        break; 
                    case 'Đã hủy': 
                        const { data: ls } = await supabaseAdmin.from('interactions').select('metadata').eq('target_id', tr).eq('category', 'LOG').in('type', ['DELETE_ORDER', 'CANCEL_REQUEST']).order('created_at', { ascending: false }).limit(1); 
                        if (ls && ls[0]?.metadata?.snapshot) { 
                            const sn = { ...ls[0].metadata.snapshot }; 
                            delete sn.id; 
                            sn.ghi_chu_huy = sn.thoi_gian_huy = null; 
                            if (sn.vin && sn.ket_qua === 'Đã ghép') { 
                                const { data: kx } = await supabaseAdmin.from('khoxe').select('trang_thai').eq('vin', sn.vin).maybeSingle(); 
                                if (!kx || kx.trang_thai !== 'Chưa ghép') { 
                                    sn.vin = sn.thoi_gian_ghep = null; 
                                    sn.ket_qua = 'Chưa ghép'; 
                                } else {
                                    await supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: currentUser, thoi_gian_het_han_giu: 'Vô thời hạn' }).eq('vin', sn.vin); 
                                }
                            } 
                            await supabaseAdmin.from('donhang').update(sn).eq('so_don_hang', tr); 
                            break; 
                        } 
                        ns = 'Chưa ghép'; 
                        break; 
                    default: 
                        break; 
                }
                
                if (ns) {
                     await supabaseAdmin.from('donhang').update({ ket_qua: ns, ghi_chu_huy: null, thoi_gian_huy: null }).eq('so_don_hang', tr);
                     const rc = o.ten_tu_van_ban_hang || (o as any).tvbh; 
                     if (rc) await createNotification({ message: `Đơn hàng ${tr} đã được Admin chuyển về: ${ns}`, type: 'info', recipient: rc, targetView: 'orders', targetId: tr });
                     await logAction('REVERT_STATUS', { orderNumber: tr, from: o.ket_qua, to: ns }, tr, 'order');
                }
            }
            return { status: 'SUCCESS', message: 'Hoàn tác trạng thái thành công.' };
        }
        if (action === 'advanceOrderStatus') {
            const tr = params.orderNumber;
            const { data: o } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', tr).maybeSingle();
            
            if (o) {
                let ns = '';
                const isoNow = new Date().toISOString();
                const upDonHang: any = {};
                const upYeuCau: any = {};
                let preventYeuCauUpdate = false;
                
                switch (o.ket_qua) {
                    case 'Đã ghép':
                        ns = 'Chờ phê duyệt';
                        // Tự động tạo dữ liệu yeucauxhd giả để tránh lỗi trắng đơn ở màn 'Chờ phê duyệt'
                        await supabaseAdmin.from('yeucauxhd').insert({
                            so_don_hang: o.so_don_hang || tr,
                            tvbh: o.ten_tu_van_ban_hang,
                            ten_khach_hang: o.ten_khach_hang || 'KH (Auto)',
                            dong_xe: o.dong_xe || 'CXĐ',
                            phien_ban: o.phien_ban || 'CXĐ',
                            ngoai_that: o.ngoai_that || 'CXĐ',
                            noi_that: o.noi_that || 'CXĐ',
                            vin: o.vin || null,
                            ngay_coc: o.ngay_coc || isoNow,
                            ngay_yeu_cau: isoNow,
                            trang_thai_vc: o.trang_thai_vc || 'Chưa gửi YC',
                            ghi_chu_admin: 'Tạo tự động bởi chức năng Tiến Tới Trạng Thái'
                        });
                        break;
                    case 'Yêu cầu bổ sung':
                        ns = 'Chờ phê duyệt';
                        break;
                    case 'Chờ phê duyệt':
                        ns = 'Đã phê duyệt';
                        break;
                    case 'Đã phê duyệt':
                        ns = 'Chờ ký hóa đơn';
                        upDonHang.ngay_xuat_hoa_don = isoNow;
                        upYeuCau.ngay_xuat_hoa_don = isoNow;
                        break;
                    case 'Chờ ký hóa đơn':
                        ns = 'Đã xuất hóa đơn';
                        break;
                    case 'Đã xuất hóa đơn':
                        ns = 'Đã hoàn tất';
                        break;
                    default:
                        break;
                }
                
                if (ns) {
                     upDonHang.ket_qua = ns;
                     await supabaseAdmin.from('donhang').update(upDonHang).eq('so_don_hang', tr);
                     if (!preventYeuCauUpdate && Object.keys(upYeuCau).length > 0) {
                         await supabaseAdmin.from('yeucauxhd').update(upYeuCau).eq('so_don_hang', tr);
                     }
                     const rc = o.ten_tu_van_ban_hang || (o as any).tvbh; 
                     if (rc) await createNotification({ message: `Đơn hàng ${tr} đã được Hệ thống đẩy lên tiến tới: ${ns}`, type: 'success', recipient: rc, targetView: 'orders', targetId: tr });
                     await logAction('ADVANCE_STATUS', { orderNumber: tr, from: o.ket_qua, to: ns }, tr, 'order');
                } else {
                     return { status: 'ERROR', message: `Trạng thái hiện tại ("${o.ket_qua}") không thể tiến tới hoặc đã ở cuối.` };
                }
            }
            return { status: 'SUCCESS', message: 'Đã tiến tới trạng thái tiếp theo thành công.' };
        }
        if (action === 'approveVcRequest') {
            const tr = params.orderNumber; const { data: vc } = await supabaseAdmin.from('yeucauvc').select('nguoi_yc').eq('so_don_hang', tr).maybeSingle();
            await supabaseAdmin.from('yeucauvc').update({ trang_thai_xu_ly: 'Đã phê duyệt' }).eq('so_don_hang', tr);
            await supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Đã phê duyệt VC' }).eq('so_don_hang', tr);
            if (vc && (vc as any).nguoi_yc) await createNotification({ message: `Yêu cầu VinClub cho ĐH ${tr} đã được phê duyệt.`, type: 'success', recipient: (vc as any).nguoi_yc, targetView: 'orders', targetId: tr });
            await logAction('APPROVE_VC', { orderNumber: tr }, tr, 'vc');
            return { status: 'SUCCESS', message: 'Đã phê duyệt VC thành công.' };
        }
        if (action === 'rejectVcRequest') {
            const tr = params.orderNumber; 
            let rs = params.reason || ''; 
            
            if (params.pastedImagesBase64) {
                try {
                    const base64Images = JSON.parse(params.pastedImagesBase64);
                    if (Array.isArray(base64Images) && base64Images.length > 0) {
                        const uploadedUrls = [];
                        for (let i = 0; i < base64Images.length; i++) {
                            const dataUrl = base64Images[i];
                            if (dataUrl) {
                                const res = await fetch(dataUrl);
                                const blob = await res.blob();
                                const orderFolder = tr ? tr.replace(/[^a-zA-Z0-9]/g, '_') : 'bulk';
                                const path = `${orderFolder}/VC_REJECT_${Date.now()}_${i}.png`;
                                const url = await uploadToSupabase(blob, path);
                                uploadedUrls.push(url);
                            }
                        }
                        if (uploadedUrls.length > 0) {
                            rs += '\n\nFile đính kèm: ' + uploadedUrls.join(', ');
                        }
                    }
                } catch (err) {
                    console.error("Failed to upload reject VC images:", err);
                }
            }

            const { data: vc } = await supabaseAdmin.from('yeucauvc').select('nguoi_yc').eq('so_don_hang', tr).maybeSingle();
            await supabaseAdmin.from('yeucauvc').update({ trang_thai_xu_ly: 'Từ chối ycvc', ghi_chu: rs }).eq('so_don_hang', tr);
            await supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Từ chối VC' }).eq('so_don_hang', tr);
            if (vc && (vc as any).nguoi_yc) {
                const { data: ov } = await supabaseAdmin.from('donhang').select('vin').eq('so_don_hang', tr).maybeSingle();
                if (ov && (ov as any).vin) {
                    const { error: rejectErr } = await supabaseAdmin.from('car_hold_activities').insert({ vin: (ov as any).vin, username: (vc as any).nguoi_yc, tvbh_name: (vc as any).nguoi_yc, type: 'PENALTY', status: 'vc_rejected', reason: `Từ chối VC: ${rs.substring(0, 50)}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
                    if (rejectErr) console.warn("Skipped car_hold_activities penalty inside reject VC:", rejectErr.message);
                }
                await createNotification({ message: `Yêu cầu VinClub cho ĐH ${tr} đã bị từ chối. Lý do: ${rs}`, type: 'danger', recipient: (vc as any).nguoi_yc, targetView: 'orders', targetId: tr });
            }
            await logAction('REJECT_VC', { orderNumber: tr, reason: rs }, tr, 'vc');
            return { status: 'SUCCESS', message: 'Đã từ chối VC thành công.' };
        }
        if (action === 'confirmVcUnc') {
            const tr = params.orderNumber; const { data: vc } = await supabaseAdmin.from('yeucauvc').select('nguoi_yc').eq('so_don_hang', tr).maybeSingle();
            await supabaseAdmin.from('yeucauvc').update({ trang_thai_xu_ly: 'Đã xác thực UNC' }).eq('so_don_hang', tr);
            await supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Đã có VC' }).eq('so_don_hang', tr);
            if (vc && (vc as any).nguoi_yc) await createNotification({ message: `UNC VinClub ĐH ${tr} đã xác thực.`, type: 'success', recipient: (vc as any).nguoi_yc, targetView: 'orders', targetId: tr });
            await logAction('CONFIRM_VC_UNC', { orderNumber: tr }, tr, 'vc');
            return { status: 'SUCCESS', message: 'Đã xác nhận UNC thành công.' };
        }
    } catch (e: any) {
        if (['deleteOrderLogic', 'cancelRequest', 'findAndAddCarByVin', 'bulkAddCarsByVin', 'deleteCarFromStockLogic', 'restoreCarToStockLogic', 'approveSelectedInvoiceRequest', 'markAsPendingSignature', 'requestSupplementForInvoice', 'unmatchOrder', 'updateRowData', 'manualMatchCar', 'revertOrderStatus', 'approveVcRequest', 'rejectVcRequest'].includes(action)) return { status: 'ERROR', message: `Lỗi Supabase: ${e.message}` };
    }
    if (action === 'archiveInvoicedOrdersMonthly') {
        await logAction('ARCHIVE_DATA', {}, 'system', 'archive');
        return await postApi({ action, ...params });
    }
    if (action === 'resendEmail' || action === 'addUser') {
        if (action === 'addUser') {
            await logAction('ADD_USER', { fullName: params.fullName, email: params.email }, params.email, 'user');
        }
        return await postApi({ action, ...params });
    }
    return { status: 'ERROR', message: `Hành động "${action}" không được hỗ trợ.` };
};

export const updateCarInfo = async (vin: string, updates: Partial<StockVehicle>): Promise<ApiResult> => {
    try {
        const up: any = {};
        if (updates['Dòng xe'] !== undefined) up.dong_xe = updates['Dòng xe']; if (updates['Phiên bản'] !== undefined) up.phien_ban = updates['Phiên bản']; if (updates['Ngoại thất'] !== undefined) up.ngoai_that = updates['Ngoại thất']; if (updates['Nội thất'] !== undefined) up.noi_that = updates['Nội thất']; if (updates['Mã DMS'] !== undefined) up.ma_dms = updates['Mã DMS']; if (updates['Số máy'] !== undefined) up.so_may = updates['Số máy'];
        await supabase.from('khoxe').update(up).eq('vin', vin);
        return { status: 'SUCCESS', message: 'Cập nhật thành công.' };
    } catch (error: any) { return { status: 'ERROR', message: error.message }; }
};

export const uploadBulkInvoices = async (files: any[]): Promise<ApiResult> => {
    try {
        const results = [];
        for (let f of files) {
            const rawOrderNo = f.orderNumber;
            const trimmedOrderNo = rawOrderNo.trim();
            const ts = Date.now();
            
            // Tìm kiếm linh hoạt hơn (phòng trường hợp DB có khoảng trắng dư thừa)
            let { data: o, error: orderError } = await supabaseAdmin
                .from('donhang')
                .select('so_don_hang, ten_khach_hang, vin')
                .eq('so_don_hang', trimmedOrderNo)
                .maybeSingle();

            // Nếu không thấy bản khớp chính xác, thử tìm kiếm có chứa (LIKE)
            if (!o && !orderError) {
                const { data: matches } = await supabaseAdmin
                    .from('donhang')
                    .select('so_don_hang, ten_khach_hang, vin')
                    .ilike('so_don_hang', `%${trimmedOrderNo}%`)
                    .limit(1);
                if (matches && matches.length > 0) o = matches[0];
            }

            if (orderError) throw new Error(`Lỗi khi tìm đơn hàng ${trimmedOrderNo}: ${orderError.message}`);
            if (!o) throw new Error(`Không tìm thấy đơn hàng "${trimmedOrderNo}" trong hệ thống. Vui lòng kiểm tra lại mã đơn.`);
            
            // Sử dụng mã đơn hàng CHÍNH XÁC từ database (có thể có khoảng trắng)
            const exactOrderNo = o.so_don_hang;
            const sanitize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '').toUpperCase();
            const cSafe = o.ten_khach_hang ? sanitize(o.ten_khach_hang) : 'KH';
            
            let url = '';
            if (f.fileObject) {
                // Sử dụng trimmedOrderNo cho đường dẫn Storage để đồng nhất
                url = await uploadToSupabase(f.fileObject, `${trimmedOrderNo}/HOADON_${cSafe}_${ts}.${f.fileObject.name.split('.').pop()}`);
            } else if (f.url) {
                url = f.url;
            }

            if (url) {
                
                // Cập nhật cả 2 bảng bằng exactOrderNo
                const { error: e1 } = await supabaseAdmin.from('yeucauxhd')
                    .update({ ket_qua_gui_mail: '', url_hoa_don_da_xuat: url })
                    .eq('so_don_hang', exactOrderNo);
                
                const { error: e2 } = await supabaseAdmin.from('donhang')
                    .update({ ket_qua: 'Đã xuất hóa đơn', link_hoa_don_da_xuat: url })
                    .eq('so_don_hang', exactOrderNo); 
                
                if (e1 || e2) throw new Error(`Lỗi cập nhật đơn hàng ${trimmedOrderNo}: ${e1?.message || e2?.message}`);

                // Cập nhật uy tín
                if (o.vin) {
                    await supabaseAdmin.from('car_hold_activities')
                        .update({ status: 'invoiced' })
                        .eq('vin', o.vin)
                        .eq('status', 'matched');
                }
                
                await logAction('UPLOAD_INVOICE', { orderNumber: exactOrderNo }, exactOrderNo, 'order'); 
                
                // Thông báo qua GAS (vẫn dùng exactOrderNo để GAS tìm thấy)
                postApi({ 
                    action: 'notifyInvoiceUploaded', 
                    orderNumber: exactOrderNo, 
                    url, 
                    uploadedBy: 'Admin' 
                }).catch(err => console.error('GAS Notify Error:', err));
                
                results.push(trimmedOrderNo);
            }
        }
        return { 
            status: 'SUCCESS', 
            message: `Đã xuất hóa đơn thành công cho ${results.length} đơn hàng!` 
        };
    } catch (e: any) { 
        console.error('uploadBulkInvoices error:', e);
        return { status: 'ERROR', message: e.message || 'Lỗi không xác định khi tải lên hóa đơn.' }; 
    }
};

export const getAppSetting = async (key: string): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).single();
        if (error) throw error;
        return { status: 'SUCCESS', message: `Fetched ${key}`, data: data.value };
    } catch (err: any) {
        const legacy = key === 'chat_visibility' ? 'getChatVisibility' : key === 'stock_visibility' ? 'getStockVisibility' : null;
        if (legacy) return getApi({ action: legacy });
        return { status: 'ERROR', message: err.message };
    }
};

export const updateAppSetting = async (key: string, value: any): Promise<ApiResult> => {
    try {
        const u = getStorageItem("currentConsultant") || ADMIN_USER;
        await supabaseAdmin.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString(), updated_by: u }, { onConflict: 'key' });
        await logAction('UPDATE_SETTING', { key, value }, key, 'SETTINGS');
        return { status: 'SUCCESS', message: `Đã cập nhật ${key} thành công.` };
    } catch (err: any) {
        const legacy = key === 'chat_visibility' ? 'toggleChatVisibility' : key === 'stock_visibility' ? 'toggleStockVisibility' : null;
        if (legacy) return postApi({ action: legacy, isAdmin: true });
        return { status: 'ERROR', message: err.message };
    }
};
