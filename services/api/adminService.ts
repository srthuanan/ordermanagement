import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, logAction, ApiResult, postApi, getExteriorColorName, getInteriorColorName, uploadToSupabase, getApi, ADMIN_USER } from './baseService';
import { createNotification } from './notificationService';
import { StockVehicle } from '../../types';

export const performAdminAction = async (action: string, params: Record<string, any>): Promise<ApiResult> => {
    const currentUser = getStorageItem("currentUser") || "Unknown Admin";
    try {
        if (action === 'auditDataConsistency') {
            const { data: stockCars } = await supabaseAdmin.from('khoxe').select('*');
            const { data: activeOrders } = await supabaseAdmin.from('donhang').select('so_don_hang, vin, ket_qua');
            const { data: archivedOrders } = await supabaseAdmin.from('archived_orders').select('so_don_hang, vin, ket_qua');

            const issues: any[] = [];
            const activeVins = new Set(activeOrders?.filter(o => o.vin && o.ket_qua !== 'Đã hủy').map(o => o.vin));
            const archivedVins = new Set(archivedOrders?.filter(o => o.vin).map(o => o.vin));

            // 1. Xe bị kẹt (Ghost Car) / Xe đã bán (Zombie)
            stockCars?.forEach(car => {
                if (car.trang_thai === 'Đã ghép' && !activeVins.has(car.vin)) {
                    issues.push({
                        type: 'ghost_car',
                        vin: car.vin,
                        description: `Xe ${car.vin} có trạng thái Đã ghép trong Kho nhưng không nằm trong Đơn hàng nào đang hoạt động.`,
                        actionLabel: 'Trả xe về trạng thái Chưa ghép.'
                    });
                }
                
                if (archivedVins.has(car.vin)) {
                    issues.push({
                        type: 'zombie_car',
                        vin: car.vin,
                        description: `Xe ${car.vin} đang nằm trong Kho nhưng thực tế đã được xuất hóa đơn/bán trước đó.`,
                        actionLabel: 'Xóa xe khỏi kho.'
                    });
                }
            });

            // 3. Mất tích xe (Active order has VIN but VIN not in stock AND not in invoice phase)
            const stockVins = new Set(stockCars?.map(c => c.vin));
            activeOrders?.forEach(order => {
                if (order.ket_qua === 'Đã ghép' && order.vin && !stockVins.has(order.vin)) {
                    issues.push({
                        type: 'missing_car',
                        vin: order.vin,
                        orderNumber: order.so_don_hang,
                        description: `Đơn hàng ${order.so_don_hang} báo Đã ghép với VIN ${order.vin} nhưng xe không có trong kho.`,
                        actionLabel: 'Phục hồi xe vào kho với trạng thái Đã ghép.'
                    });
                }
            });

            return { status: 'SUCCESS', data: issues, message: 'Hoàn tất quét kiểm toán.' };
        }
        
        if (action === 'fixDataConsistency') {
            const issuesToFix = params.issues ? JSON.parse(params.issues) : [];
            let fixedCount = 0;
            
            for (const issue of issuesToFix) {
                if (issue.type === 'ghost_car') {
                    await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', issue.vin);
                    fixedCount++;
                } else if (issue.type === 'zombie_car') {
                    await supabaseAdmin.from('khoxe').delete().eq('vin', issue.vin);
                    fixedCount++;
                } else if (issue.type === 'missing_car') {
                    const { data: m } = await supabaseAdmin.from('thongtinxe').select('*').eq('vin', issue.vin).maybeSingle();
                    const { data: o } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', issue.orderNumber).maybeSingle();
                    if (o) {
                        const carData = { 
                            vin: issue.vin, 
                            trang_thai: 'Đã ghép', 
                            nguoi_giu_xe: o.ten_tu_van_ban_hang, 
                            thoi_gian_het_han_giu: 'Vô thời hạn', 
                            ngay_nhap: new Date().toISOString(), 
                            dong_xe: o.dong_xe || (m as any)?.mo_ta || '', 
                            phien_ban: o.phien_ban || (m as any)?.phien_ban || '', 
                            ngoai_that: o.ngoai_that || (m as any)?.ngoai_that || '', 
                            noi_that: o.noi_that || (m as any)?.noi_that || '', 
                            ma_dms: o.ma_dms || (m as any)?.khu_vuc || '', 
                            so_may: o.so_may || (m as any)?.so_may || '' 
                        };
                        await supabaseAdmin.from('khoxe').upsert([carData]);
                        fixedCount++;
                    }
                }
            }
            await logAction('AUDIT_FIX', { count: fixedCount, issues: issuesToFix }, 'system', 'audit');
            return { status: 'SUCCESS', message: `Đã tự động xử lý thành công ${fixedCount} lỗi bất đồng bộ.` };
        }

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
            // Chỉ gửi thông báo nhập kho khi xe có đầy đủ thông tin trừ số máy (dòng xe, phiên bản, ngoại thất, nội thất, mã DMS)
            // Vì khi thêm mới bằng VIN thì phiên bản luôn để trống (''), xe chưa thể đầy đủ thông tin ngay lập tức.
            // Thông báo sẽ được gửi sau đó khi Admin cập nhật thông tin phiên bản đầy đủ cho xe.
            const hasCompleteInfo = false;
            if (hasCompleteInfo) {
                createNotification({ message: `<b>${finalModel}</b> (${vin}) đã nhập kho. Sẵn sàng giao dịch!`, type: 'stock_hero', targetView: 'stock', targetId: vin });
            }
            return { status: 'SUCCESS', message: master ? `Đã thêm xe ${vin} thành công.` : `Đã thêm xe ${vin} (VIN này chưa có trong danh mục thongtinxe - cần bổ sung thông tin).` };
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
            const res = { success: 0, failed: 0, skipped: 0, complete: 0 };
            for (const vin of uniqueVins) {
                const m = masterMap.get(vin); const model = (m?.mo_ta || '').toLowerCase().includes('limo green') ? 'LIMO' : (m?.mo_ta || '');
                const version = parsedMap.get(vin) || '';
                const ext = getExteriorColorName(m?.ngoai_that || '');
                const int = getInteriorColorName(m?.noi_that || '');
                const { error: insErr } = await supabaseAdmin.from('khoxe').insert([{ vin, dong_xe: model, phien_ban: version, ngoai_that: ext, noi_that: int, so_may: m?.so_may || '', ma_dms: m?.khu_vuc || '', trang_thai: 'Chưa ghép', ngay_nhap: new Date().toISOString() }]);
                if (insErr) { if (insErr.code === '23505') res.skipped++; else res.failed++; } 
                else { 
                    res.success++; 
                    if (model && version && ext && int && (m?.khu_vuc || '')) res.complete++;
                    await logAction('ADD_CAR_BULK', { vin, version }, vin as string, 'stock'); 
                }
            }
            if (res.complete > 0) createNotification({ message: `Đã cập nhật <b>${res.complete} xe mới</b> vào kho dữ liệu. Sẵn sàng giao dịch!`, type: 'stock_hero', targetView: 'stock' });
            return { status: 'SUCCESS', message: `Hoàn tất: Thêm ${res.success} (${res.complete} đủ thông tin). Bỏ qua ${res.skipped}. Thất bại ${res.failed}.` };
        }
        if (action === 'deleteCarFromStockLogic') {
            const vin = params.vinToDelete; const reason = params.reason;
            const { data: carSnap } = await supabaseAdmin.from('khoxe').select('*').eq('vin', vin).maybeSingle();
            const { data: matchedOrder } = await supabaseAdmin.from('donhang').select('so_don_hang').eq('vin', vin).maybeSingle();
            if (matchedOrder) await supabaseAdmin.from('donhang').update({ ket_qua: 'Chưa ghép', vin: null, thoi_gian_ghep: null }).eq('so_don_hang', (matchedOrder as any).so_don_hang);
            await logAction('DELETE_CAR', { vin, reason, snapshot: carSnap }, vin, 'stock');
            await supabaseAdmin.from('khoxe').delete().eq('vin', vin);

            // Xoá xe khỏi bộ nhớ đệm định vị GPS
            const { data: settingData } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'car_gps_cache').maybeSingle();
            if (settingData && settingData.value && typeof settingData.value === 'object' && settingData.value !== null) {
                const updatedCache = { ...settingData.value as object };
                delete (updatedCache as any)[vin];
                await supabaseAdmin.from('app_settings').update({ value: updatedCache, updated_at: new Date().toISOString() }).eq('key', 'car_gps_cache');
            }

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

            // Kích hoạt Archival ngay lập tức cho các đơn đã phê duyệt
            if (Array.isArray(nos)) {
                nos.forEach((no: string) => {
                    postApi({ action: 'archiveOrderNow', orderNumber: no }).catch(e => console.warn(`Silent error triggering archive for ${no}:`, e));
                });
            }

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
                                ten_khach_hang: 'Khách hàng',
                                so_don_hang: tr,
                                vin: o.vin || '',
                                ma_dms: (o as any).ma_dms || '',
                                ghi_chu_admin: finalReason
                            }
                        };
                        const { error: emailErr } = await supabaseAdmin.functions.invoke('send-email', { body: payload });
                        if (emailErr) console.error(`[ERROR-MAIL] Gửi mail bổ sung cho đơn ${tr} thất bại:`, emailErr);
                        else console.log(`[SUCCESS-MAIL] Đã gửi mail bổ sung cho đơn ${tr}`);
                    } catch (err) {
                        console.error('[CATCH-MAIL] Lỗi không xác định khi chuẩn bị gửi mail bổ sung:', err);
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
                
                // Kích hoạt Archival ngay lập tức cho hóa đơn
                postApi({ action: 'archiveOrderNow', orderNumber: tr }).catch(e => console.warn(`Silent error triggering archive for ${tr}:`, e));
            }
            await logAction('UPLOAD_INVOICE_BULK', { count: files.length }, 'bulk', 'invoice');
            return { status: 'SUCCESS', message: 'Đã xuất hóa đơn thành công' };
        }
        if (action === 'unmatchOrder') {
            const tr = params.orderNumber; const kqm = (params.unmatchType || '').includes('Chờ xe') ? 'Chưa ghép' : 'Đã hủy';
            // Fetch bản ghi đầy đủ TRƯỚC khi update để lấy thông tin khách hàng, dòng xe và VIN cũ phục vụ gửi Mail
            const { data: fullOrder } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', tr).maybeSingle();
            
            if (!fullOrder) return { status: 'ERROR', message: 'Không tìm thấy đơn hàng cần hủy ghép.' };

            if (fullOrder.vin) {
                await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', fullOrder.vin);
            }
            
            const up: any = { ket_qua: kqm, vin: null, thoi_gian_ghep: null };
            if (kqm === 'Đã hủy') { 
                up.ghi_chu_huy = `Bị Admin hủy ghép. Lý do: ${params.reason}`; 
                up.thoi_gian_huy = new Date().toISOString(); 
                await supabaseAdmin.from('yeucauxhd').update({ ghi_chu_admin: params.reason }).eq('so_don_hang', tr); 
            } else {
                await supabaseAdmin.from('yeucauxhd').update({ vin: null }).eq('so_don_hang', tr);
            }
            
            await supabaseAdmin.from('donhang').update(up).eq('so_don_hang', tr);
            
            if (fullOrder.ten_tu_van_ban_hang) {
                await createNotification({ message: `Đơn hàng ${tr} đã bị hủy ghép xe (${kqm}). Lý do: ${params.reason}`, type: 'danger', recipient: fullOrder.ten_tu_van_ban_hang, targetView: 'orders', targetId: tr });
                
                // Gửi email thông báo hủy ghép cho TVBH
                const emailRecord = {
                    ...fullOrder, // Giữ lại thông tin khách hàng, dòng xe, phiên bản...
                    ghi_chu_huy: `Admin hủy ghép. Lý do: ${params.reason}`,
                    is_waiting: kqm === 'Chưa ghép',
                    status: kqm
                };

                supabaseAdmin.functions.invoke('send-email', {
                    body: {
                        actionId: 'order_self_cancelled',
                        record: emailRecord
                    }
                })
                .then(({ error }) => { 
                    if (error) console.error(`[ERROR-MAIL] Hủy ghép đơn ${tr} lỗi gửi mail:`, error);
                    else console.log(`[SUCCESS-MAIL] Đã gửi mail hủy ghép cho đơn ${tr}`);
                })
                .catch(e => console.error(`[CRITICAL-MAIL] Lỗi gọi gửi mail hủy ghép (admin):`, e));
            }

            await logAction('UNMATCH_ORDER', { orderNumber: tr, reason: params.reason, kqm }, tr, 'order');
            return { status: 'SUCCESS', message: 'Đã hủy ghép xe thành công.' };
        }
        if (action === 'updateRowData' && params.sheetName === 'Xuathoadon') {
            const tr = params.primaryKeyValue; const up: any = {};
            if (params["Số máy"] !== undefined) up.so_may = params["Số máy"]; if (params["CHÍNH SÁCH"] !== undefined) up.chinh_sach = params["CHÍNH SÁCH"]; if (params["Hoa hồng ứng"] !== undefined) up.hoa_hong_ung = params["Hoa hồng ứng"]; if (params["Điểm Vpoint sử dụng"] !== undefined) up.vpoint = params["Điểm Vpoint sử dụng"]; if (params["NGÀY XUẤT HÓA ĐƠN"] !== undefined) up.ngay_xuat_hoa_don = params["NGÀY XUẤT HÓA ĐƠN"]; if (params["KẾT QUẢ GỬI MAIL"] !== undefined) up.ket_qua_gui_mail = params["KẾT QUẢ GỬI MAIL"]; if (params["URL Hóa Đơn Đã Xuất"] !== undefined) up.url_hoa_don_da_xuat = params["URL Hóa Đơn Đã Xuất"];
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
                // Gửi email thông báo ghép xe thành công cho TVBH
                // Fetch bản ghi đầy đủ sau khi update để gửi email (consistent với apiService.pairVinToOrder)
                const { data: fullOrder } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', tr).single();

                if (fullOrder) {
                    supabaseAdmin.functions.invoke('send-email', {
                        body: {
                            actionId: 'match_success',
                            record: fullOrder
                        }
                    }).then(({ error }) => { 
                        if (error) console.error(`[ERROR-MAIL] Ghép xe thành công cho đơn ${tr} lỗi gửi mail:`, error);
                        else console.log(`[SUCCESS-MAIL] Đã gửi mail ghép xe cho đơn ${tr}`);
                    }).catch(e => console.error(`[CRITICAL-MAIL] Lỗi gọi gửi mail match_success (admin):`, e));
                }

            }
            
            await logAction('MANUAL_MATCH', { orderNumber: tr, vin }, tr, 'order');
            return { status: 'SUCCESS', message: 'Ghép xe thành công!' };
        }
        if (action === 'revertOrderStatus') {
            const tr = params.orderNumber?.trim();
            if (!tr) return { status: 'ERROR', message: 'Số đơn hàng không hợp lệ.' };
            
            const { data: o } = await supabaseAdmin.from('donhang').select('*').ilike('so_don_hang', tr).limit(1).maybeSingle();
            if (!o) return { status: 'ERROR', message: `Không tìm thấy đơn hàng: ${tr}` };
            
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
                        const { error: delErr } = await supabaseAdmin.from('yeucauxhd').delete().eq('so_don_hang', tr);
                        if (delErr) throw new Error(`Lỗi xóa Yêu cầu XHĐ: ${delErr.message}`);
                        
                        // [CRITICAL FIX]: Phục hồi xe lại vào kho xe vì trigger tự động xóa xe khi có yêu cầu xuất hóa đơn
                        if (o.vin) {
                            const { data: carInStock } = await supabaseAdmin.from('khoxe').select('vin').eq('vin', o.vin).limit(1).maybeSingle();
                            if (!carInStock) {
                                // Lấy thông tin xe cơ bản nếu có thể
                                const { data: m } = await supabaseAdmin.from('thongtinxe').select('*').eq('vin', o.vin).limit(1).maybeSingle();
                                const carData = { 
                                    vin: o.vin, 
                                    trang_thai: 'Đã ghép', 
                                    nguoi_giu_xe: o.ten_tu_van_ban_hang, 
                                    thoi_gian_het_han_giu: 'Vô thời hạn', 
                                    ngay_nhap: new Date().toISOString(), 
                                    dong_xe: o.dong_xe || (m as any)?.mo_ta || '', 
                                    phien_ban: o.phien_ban || (m as any)?.phien_ban || '', 
                                    ngoai_that: o.ngoai_that || (m as any)?.ngoai_that || '', 
                                    noi_that: o.noi_that || (m as any)?.noi_that || '', 
                                    ma_dms: o.ma_dms || (m as any)?.khu_vuc || '', 
                                    so_may: o.so_may || (m as any)?.so_may || '' 
                                };
                                const { error: upsertErr } = await supabaseAdmin.from('khoxe').upsert([carData]);
                                if (upsertErr) throw new Error(`Lỗi phục hồi xe vào Kho: ${upsertErr.message}`);
                            }
                        }
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
                     const { error: updErr } = await supabaseAdmin.from('donhang').update({ ket_qua: ns, ghi_chu_huy: null, thoi_gian_huy: null }).eq('so_don_hang', tr);
                     if (updErr) throw new Error(`Lỗi cập nhật Đơn hàng: ${updErr.message}`);
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
        try {
            const now = new Date();
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const { data: invoicedOrders, error: fetchErr } = await supabaseAdmin
                .from('yeucauxhd')
                .select('*')
                .not('ngay_xuat_hoa_don', 'is', null);

            if (fetchErr) throw fetchErr;

            const ordersToArchive = invoicedOrders?.filter(o => {
                if (!o.ngay_xuat_hoa_don) return false;
                let date = new Date(o.ngay_xuat_hoa_don);
                if (isNaN(date.getTime())) {
                    const parts = String(o.ngay_xuat_hoa_don).split('/');
                    if (parts.length === 3) {
                        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                }
                return date && !isNaN(date.getTime()) && date < firstOfMonth;
            }) || [];

            let archivedCount = 0;
            if (ordersToArchive.length > 0) {
                const parseDateSafe = (d: any) => {
                    if (!d) return null;
                    const parsed = new Date(d);
                    if (!isNaN(parsed.getTime())) return parsed.toISOString();
                    const parts = String(d).split('/');
                    if (parts.length === 3) {
                        const parsedVi = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                        if (!isNaN(parsedVi.getTime())) return parsedVi.toISOString();
                    }
                    return null;
                };

                const archivePayload = ordersToArchive.map(y => ({
                    so_don_hang: y.so_don_hang,
                    ten_khach_hang: y.ten_khach_hang,
                    dong_xe: y.dong_xe,
                    phien_ban: y.phien_ban,
                    ngoai_that: y.ngoai_that,
                    noi_that: y.noi_that,
                    tvbh: y.tvbh,
                    vin: y.vin,
                    so_may: y.so_may,
                    ngay_coc: parseDateSafe(y.ngay_coc),
                    ngay_yeu_cau: parseDateSafe(y.ngay_yeu_cau),
                    ngay_xuat_hoa_don: parseDateSafe(y.ngay_xuat_hoa_don),
                    chinh_sach: y.chinh_sach,
                    hoa_hong_ung: y.hoa_hong_ung ? (typeof y.hoa_hong_ung === 'number' ? y.hoa_hong_ung : parseFloat(String(y.hoa_hong_ung).replace(/[^0-9.-]+/g, "")) || 0) : 0,
                    vpoint: typeof y.vpoint === 'number' ? y.vpoint : 0,
                    url_hop_dong: y.url_hop_dong,
                    url_de_nghi_xhd: y.url_de_nghi_xhd,
                    url_hoa_don_da_xuat: y.url_hoa_don_da_xuat,
                    trang_thai_vc: y.trang_thai_vc,
                    ket_qua: 'Đã xuất hóa đơn',
                    created_at: parseDateSafe(y.created_at) || new Date().toISOString()
                }));

                const { error: insertErr } = await supabaseAdmin.from('archived_orders').upsert(archivePayload, { onConflict: 'so_don_hang' });
                if (insertErr) throw insertErr;

                archivedCount = archivePayload.length;
                const soDonHangs = archivePayload.map(o => o.so_don_hang);

                // Use bulk delete to avoid large parameter lists (batch 100 at a time)
                for (let i = 0; i < soDonHangs.length; i += 100) {
                    const batch = soDonHangs.slice(i, i + 100);
                    await supabaseAdmin.from('yeucauxhd').delete().in('so_don_hang', batch);
                    await supabaseAdmin.from('donhang').delete().in('so_don_hang', batch);
                }
            }

            postApi({ action, ...params }).catch(e => console.warn('GAS archive backup error:', e));
            return { status: 'SUCCESS', message: `Đã lưu trữ ${archivedCount} đơn hàng thành công.` };
        } catch (err: any) {
            console.error('Archive error:', err);
            return { status: 'ERROR', message: `Lỗi lưu trữ: ${err.message}` };
        }
    }
    if (action === 'generateInviteLink') {
        try {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const expiry = new Date();
            expiry.setHours(expiry.getHours() + 48); // Hết hạn sau 48 giờ

            // Tạo một username tạm thời (vì username thường là NOT NULL)
            const tempUsername = 'pending_' + Math.random().toString(36).substring(2, 7);

            // Lưu thông tin vào bảng users (tận dụng cột otp_code và otp_expiry có sẵn)
            const { error: insErr } = await supabaseAdmin.from('users').insert({
                username: tempUsername,
                full_name: params.fullName,
                role: params.role || 'Tư vấn bán hàng',
                otp_code: token,
                otp_expiry: expiry.toISOString(),
                email: 'pending_' + token + '@placeholder.com' // Email tạm thời
            });

            if (insErr) throw insErr;

            const inviteLink = window.location.origin + window.location.pathname + '#/join?token=' + token;
            
            await logAction('GENERATE_INVITE_LINK', { fullName: params.fullName, role: params.role }, params.fullName, 'user');
            
            return { 
                status: 'SUCCESS', 
                message: 'Đã tạo Link mời thành công.', 
                inviteLink: inviteLink 
            };
        } catch (err: any) {
            console.error('Lỗi khi tạo Link mời:', err);
            return { status: 'ERROR', message: `Lỗi: ${err.message}` };
        }
    }
    if (action === 'addUser') {
        // [PURE SUPABASE AUTH] Khởi tạo tài khoản và gửi Link mời qua Email
        try {
            const username = params.email.split('@')[0].toLowerCase();
            const redirectTo = window.location.origin + window.location.pathname + '#/reset-password';
            
            console.log(`[AddUser] Đang mời nhân viên mới: ${params.email}...`);

            // 1. Mời user qua Supabase Auth (Gửi email hệ thống)
            const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(params.email, {
                redirectTo: redirectTo,
                data: {
                    full_name: params.fullName,
                    role: params.role || 'Tư vấn bán hàng'
                }
            });

            if (authErr) {
                // Nếu user đã tồn tại trong Auth, chúng ta vẫn cập nhật profile bên dưới
                console.warn("[AddUser] Auth user might already exist:", authErr.message);
            }

            // 2. Cập nhật hoặc chèn mới vào bảng Hồ sơ (public.users)
            const { error: insErr } = await supabaseAdmin.from('users').upsert({
                username: username,
                email: params.email,
                full_name: params.fullName,
                role: params.role || 'Tư vấn bán hàng',
                uid: authData?.user?.id || params.uid || null
            }, { onConflict: 'email' });

            if (insErr) throw insErr;

            // 3. Đồng bộ sang danh sách email TVBH (tvbh_emails)
            const { data: existEmail } = await supabaseAdmin.from('tvbh_emails').select('id').eq('email', params.email).maybeSingle();
            if (!existEmail) {
                await supabaseAdmin.from('tvbh_emails').insert({ 
                    ten_tvbh: params.fullName, 
                    email: params.email 
                });
            }

            await logAction('ADD_USER_INVITE', { fullName: params.fullName, email: params.email, username }, params.email, 'user');
            return { status: 'SUCCESS', message: `Đã gửi Link mời kích hoạt tài khoản đến email ${params.email}.` };
        } catch (err: any) {
            console.error('Lỗi khi mời nhân viên:', err);
            return { status: 'ERROR', message: `Lỗi: ${err.message}` };
        }
    }
    if (action === 'resendEmail') {
        const orderNumbers = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
        const emailType = params.emailType || 'invoice_issued';
        let successCount = 0;
        let lastError = '';

        for (const orderNo of orderNumbers) {
            const tr = String(orderNo).trim();
            try {
                // Fetch full order data from Supabase
                const { data: fullOrder } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', tr).maybeSingle();
                if (!fullOrder) {
                    lastError = `Không tìm thấy đơn hàng ${tr}`;
                    continue;
                }

                // Build the record payload based on emailType
                let actionId = emailType;
                let record: Record<string, any> = { ...fullOrder, ten_ban_hang: fullOrder.ten_tu_van_ban_hang };

                if (emailType === 'invoice_issued') {
                    // Fetch invoice URL from yeucauxhd if available
                    const { data: ycxhd } = await supabaseAdmin.from('yeucauxhd').select('url_hoa_don_da_xuat').eq('so_don_hang', tr).maybeSingle();
                    if (ycxhd?.url_hoa_don_da_xuat) {
                        record.link_hoa_don_da_xuat = ycxhd.url_hoa_don_da_xuat;
                    }
                    if (fullOrder.link_hoa_don_da_xuat) {
                        record.link_hoa_don_da_xuat = fullOrder.link_hoa_don_da_xuat;
                    }
                } else if (emailType === 'invoice_supplement_requested') {
                    // Fetch supplement reason from yeucauxhd
                    const { data: ycxhd } = await supabaseAdmin.from('yeucauxhd').select('ghi_chu_admin').eq('so_don_hang', tr).maybeSingle();
                    record.ghi_chu_admin = ycxhd?.ghi_chu_admin || '[GỬI LẠI] Vui lòng kiểm tra và bổ sung hồ sơ theo yêu cầu trước đó.';
                    record.tvbh = fullOrder.ten_tu_van_ban_hang;
                } else if (emailType === 'match_success') {
                    // Already have full order data with VIN
                    if (!fullOrder.vin) {
                        lastError = `Đơn hàng ${tr} chưa được ghép xe.`;
                        continue;
                    }
                }

                // Call Edge Function directly (same pattern as all other working email actions)
                const { error: emailErr } = await supabaseAdmin.functions.invoke('send-email', {
                    body: { actionId, record }
                });

                if (emailErr) {
                    console.error(`[resendEmail] Edge Function error for ${tr}:`, emailErr);
                    lastError = `Lỗi gửi email cho đơn ${tr}: ${emailErr.message || 'Unknown'}`;
                } else {
                    successCount++;
                    console.log(`[resendEmail] ✅ Email sent for ${tr} (type: ${emailType})`);
                }
            } catch (err: any) {
                console.error(`[resendEmail] Error processing ${tr}:`, err);
                lastError = err.message || 'Lỗi không xác định';
            }
        }

        if (successCount > 0) {
            return { status: 'SUCCESS', message: `Đã gửi lại email thành công cho ${successCount}/${orderNumbers.length} đơn hàng.` };
        }
        return { status: 'ERROR', message: lastError || 'Không thể gửi email.' };
    }
    return { status: 'ERROR', message: `Hành động "${action}" không được hỗ trợ.` };
};

export const updateCarInfo = async (vin: string, updates: Partial<StockVehicle>): Promise<ApiResult> => {
    try {
        const up: any = {};
        if (updates['Dòng xe'] !== undefined) up.dong_xe = updates['Dòng xe']; if (updates['Phiên bản'] !== undefined) up.phien_ban = updates['Phiên bản']; if (updates['Ngoại thất'] !== undefined) up.ngoai_that = updates['Ngoại thất']; if (updates['Nội thất'] !== undefined) up.noi_that = updates['Nội thất']; if (updates['Mã DMS'] !== undefined) up.ma_dms = updates['Mã DMS']; if (updates['Số máy'] !== undefined) up.so_may = updates['Số máy']; if (updates.VIN !== undefined) up.vin = updates.VIN;
        // [QUAN TRỌNG]: Xóa car_hold_activities trước khi đổi VIN (FK constraint)
        if (updates.VIN !== undefined && updates.VIN !== vin) {
            await supabaseAdmin.from('car_hold_activities').delete().eq('vin', vin);
        }

        await supabaseAdmin.from('khoxe').update(up).eq('vin', vin);

        if (updates.VIN !== undefined && updates.VIN !== vin) {
            // Cập nhật các bảng con SAU khi khoxe đã đổi VIN thành công
            await supabaseAdmin.from('donhang').update({ vin: updates.VIN }).eq('vin', vin);
            await supabaseAdmin.from('yeucauxhd').update({ vin: updates.VIN }).eq('vin', vin);
            await supabaseAdmin.from('yeucauvc').update({ vin: updates.VIN }).eq('vin', vin);

            const { data: matchedOrder } = await supabaseAdmin.from('donhang').select('so_don_hang, ten_tu_van_ban_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that').eq('vin', updates.VIN).limit(1).maybeSingle();
            if (matchedOrder && matchedOrder.ten_tu_van_ban_hang) {
                const tvbh = matchedOrder.ten_tu_van_ban_hang;
                await createNotification({
                    message: `Đơn hàng ${matchedOrder.so_don_hang} đã được Admin thay VIN: ${vin} → ${updates.VIN}`,
                    type: 'warning',
                    recipient: tvbh,
                    targetView: 'orders',
                    targetId: matchedOrder.so_don_hang
                });
                supabaseAdmin.functions.invoke('send-email', {
                    body: {
                        actionId: 'vin_replaced',
                        record: {
                            so_don_hang: matchedOrder.so_don_hang,
                            ten_khach_hang: matchedOrder.ten_khach_hang,
                            ten_tu_van_ban_hang: tvbh,
                            dong_xe: matchedOrder.dong_xe,
                            phien_ban: matchedOrder.phien_ban,
                            ngoai_that: matchedOrder.ngoai_that,
                            noi_that: matchedOrder.noi_that,
                            old_vin: vin,
                            new_vin: updates.VIN
                        }
                    }
                }).then(({ error }) => {
                    if (error) console.warn(`[EMAIL] Lỗi gửi mail thay VIN cho ${tvbh}:`, error);
                }).catch(e => console.warn('[EMAIL] Lỗi Edge Function thay VIN:', e));
                await logAction('REPLACE_VIN', { orderNumber: matchedOrder.so_don_hang, oldVin: vin, newVin: updates.VIN }, matchedOrder.so_don_hang, 'order');
            }
        }

        // [THÔNG BÁO NHẬP KHO]: Chỉ gửi khi xe vừa được bổ sung đầy đủ thông tin
        // Kiểm tra bản ghi mới nhất sau khi update để xem đã đủ chưa
        const finalVin = updates.VIN || vin;
        const { data: updatedCar } = await supabaseAdmin.from('khoxe').select('dong_xe, phien_ban, ngoai_that, noi_that, ma_dms').eq('vin', finalVin).limit(1).maybeSingle();
        if (updatedCar && updatedCar.dong_xe && updatedCar.phien_ban && updatedCar.ngoai_that && updatedCar.noi_that && updatedCar.ma_dms) {
            const justFilledModel = up.dong_xe !== undefined;
            const justFilledVersion = up.phien_ban !== undefined;
            const justFilledExterior = up.ngoai_that !== undefined;
            const justFilledInterior = up.noi_that !== undefined;
            const justFilledDms = up.ma_dms !== undefined;
            if (justFilledVersion || justFilledModel || justFilledExterior || justFilledInterior || justFilledDms) {
                createNotification({ message: `<b>${updatedCar.dong_xe}</b> - ${updatedCar.phien_ban} (${finalVin}) đã nhập kho. Sẵn sàng giao dịch!`, type: 'stock_hero', targetView: 'stock', targetId: finalVin });
            }
        }

        return { status: 'SUCCESS', message: 'Cập nhật thành công.' };
    } catch (error: any) { return { status: 'ERROR', message: error.message }; }
};

export const uploadBulkInvoices = async (files: any[]): Promise<ApiResult> => {
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (let f of files) {
        try {
            const rawOrderNo = f.orderNumber;
            const trimmedOrderNo = rawOrderNo.trim();
            const ts = Date.now();
            
            let { data: o, error: orderError } = await supabaseAdmin
                .from('donhang')
                .select('*')
                .eq('so_don_hang', trimmedOrderNo)
                .maybeSingle();

            if (!o && !orderError) {
                const { data: matches } = await supabaseAdmin
                    .from('donhang')
                    .select('*')
                    .ilike('so_don_hang', `%${trimmedOrderNo}%`)
                    .limit(1);
                if (matches && matches.length > 0) o = matches[0];
            }

            if (orderError) throw new Error(`Lỗi DB khi tìm ${trimmedOrderNo}: ${orderError.message}`);
            if (!o) {
                errors.push(`Đơn hàng "${trimmedOrderNo}" không tồn tại.`);
                failCount++;
                continue;
            }
            
            const exactOrderNo = o.so_don_hang;
            const sanitize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '').toUpperCase();
            const cSafe = o.ten_khach_hang ? sanitize(o.ten_khach_hang) : 'KH';
            
            let url = '';
            if (f.fileObject) {
                url = await uploadToSupabase(f.fileObject, `${trimmedOrderNo}/HOADON_${cSafe}_${ts}.${f.fileObject.name.split('.').pop()}`);
            } else if (f.url) {
                url = f.url;
            }

            if (url) {
                const { error: e1 } = await supabaseAdmin.from('yeucauxhd')
                    .update({ ket_qua_gui_mail: '', url_hoa_don_da_xuat: url })
                    .eq('so_don_hang', exactOrderNo);
                
                const { error: e2 } = await supabaseAdmin.from('donhang')
                    .update({ ket_qua: 'Đã xuất hóa đơn', link_hoa_don_da_xuat: url })
                    .eq('so_don_hang', exactOrderNo); 
                
                if (e1 || e2) throw new Error(`Lỗi cập nhật ${trimmedOrderNo}: ${e1?.message || e2?.message}`);

                if (o.vin) {
                    await supabaseAdmin.from('car_hold_activities')
                        .update({ status: 'invoiced' })
                        .eq('vin', o.vin)
                        .eq('status', 'matched');
                }
                
                await logAction('UPLOAD_INVOICE', { orderNumber: exactOrderNo }, exactOrderNo, 'order'); 
                
                // Gửi email thông báo: CẦN AWAIT để tránh tình trạng Edge Function bị đóng sớm hoặc Gmail quá tải
                console.log(`[DEBUG-BULK] Đang xử lý gửi mail cho: "${exactOrderNo}"`);
                
                const invoice_ext = f.fileObject?.name ? f.fileObject.name.split('.').pop() : (url ? url.split('?')[0].split('.').pop() : 'pdf');
                try {
                    console.log(`[DEBUG-BULK] Tiến hành gọi EF cho ${exactOrderNo}...`);
                    const { error: mailErr } = await supabaseAdmin.functions.invoke('send-email', {
                        body: {
                            actionId: 'invoice_issued',
                            record: { ...o, link_hoa_don_da_xuat: url, invoice_ext }
                        }
                    });
                        
                        if (mailErr) {
                            console.warn(`[MAIL-DELAYED] Lỗi gửi mail cho đơn ${exactOrderNo}:`, mailErr);
                            await supabaseAdmin.from('yeucauxhd').update({ ket_qua_gui_mail: `Lỗi: ${mailErr.message || 'Unknown'}` }).eq('so_don_hang', exactOrderNo);
                        } else {
                            console.log(`[DEBUG-BULK] EF trả về thành công cho ${exactOrderNo}`);
                            const { error: updErr } = await supabaseAdmin.from('yeucauxhd').update({ ket_qua_gui_mail: 'Đã gửi mail' }).eq('so_don_hang', exactOrderNo);
                            if (updErr) console.error(`[DEBUG-BULK] Lỗi cập nhật trạng thái "Đã gửi mail" cho ${exactOrderNo}:`, updErr);
                        }
                        
                        // Nghỉ 2 giây giữa mỗi lần gửi email để tránh rate limit của Gmail/SMTP
                        await new Promise(resolve => setTimeout(resolve, 2000));

                    } catch (mailEx: any) {
                        console.error(`[MAIL-CRITICAL] Lỗi gọi Edge Function cho đơn ${exactOrderNo}:`, mailEx);
                        // Thử lại một lần duy nhất nếu lỗi kết nối
                        try {
                            console.log(`[RETRY] Thử lại gửi mail cho ${exactOrderNo}...`);
                            await new Promise(res => setTimeout(res, 3000));
                            const { error: retryErr } = await supabaseAdmin.functions.invoke('send-email', {
                                body: { actionId: 'invoice_issued', record: { ...o, link_hoa_don_da_xuat: url, invoice_ext } }
                            });
                            if (retryErr) throw retryErr;
                            
                            console.log(`[RETRY-SUCCESS] Gửi lại mail cho ${exactOrderNo} thành công.`);
                            await supabaseAdmin.from('yeucauxhd').update({ ket_qua_gui_mail: 'Đã gửi mail (Retry)' }).eq('so_don_hang', exactOrderNo);
                        } catch (secondErr) {
                            errors.push(`Đơn ${exactOrderNo}: Gửi email thất bại sau khi thử lại.`);
                            await supabaseAdmin.from('yeucauxhd').update({ ket_qua_gui_mail: `Lỗi gọi EF: ${mailEx.message}` }).eq('so_don_hang', exactOrderNo);
                        }
                    }

                // Luôn thực hiện các bước hậu kỳ cho dù mail có lỗi hay không (để tránh mất dữ liệu)
                await postApi({ action: 'archiveOrderNow', orderNumber: exactOrderNo }).catch(() => {});
                successCount++;
            } else {
                failCount++;
                errors.push(`Không có file/URL cho đơn ${trimmedOrderNo}`);
            }
        } catch (e: any) {
            console.error(`Error processing bulk invoice for file:`, f, e);
            failCount++;
            errors.push(`${f.orderNumber}: ${e.message}`);
        }
    }

    if (successCount === 0 && files.length > 0) {
        return { status: 'ERROR', message: `Thất bại: ${errors.join('; ')}` };
    }

    return { 
        status: 'SUCCESS', 
        message: `Đã xử lý xong ${files.length} hóa đơn: Thành công ${successCount}, Thất bại ${failCount}. ${errors.length > 0 ? 'Chi tiết: ' + errors.join('; ') : ''}` 
    };
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
