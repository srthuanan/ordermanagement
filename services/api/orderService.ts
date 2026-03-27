import { supabase, supabaseAdmin } from '../supabaseClient';
import { getStorageItem, mapOrderDbToUi, ApiResult, logAction, uploadToSupabase, ADMIN_USER } from './baseService';
import { Order } from '../../types';

export const getPaginatedData = async (_?: string[], __?: string, ___?: boolean): Promise<ApiResult> => {
    try {
        let query = supabase.from('donhang').select('*').not('ket_qua', 'ilike', 'Đã hủy%');
        const { data, error } = await query;
        if (error) throw error;
        const formattedData = (data || []).map((order: any) => ({
            'Tên tư vấn bán hàng': order.ten_tu_van_ban_hang, 'Tên khách hàng': order.ten_khach_hang, 'Dòng xe': order.dong_xe,
            'Phiên bản': order.phien_ban, 'Ngoại thất': order.ngoai_that, 'Nội thất': order.noi_that,
            'Số đơn hàng': order.so_don_hang, 'Ngày cọc': order.ngay_coc, 'Thời gian nhập': order.thoi_gian_nhap,
            'Kết quả': order.ket_qua, 'Trạng thái gửi mail': order.trang_thai_gui_mail, 'VIN': order.vin,
            'Thời gian ghép': order.thoi_gian_ghep, 'Số ngày ghép': order.so_ngay_ghep, 'Ngày xuất hóa đơn': order.ngay_xuat_hoa_don,
            'Cảnh báo quá hạn': order.canh_bao_qua_han, 'Cảnh báo sai DMS': order.canh_bao_sai_dms,
            'LinkHoaDonDaXuat': order.link_hoa_don_da_xuat, 'Trạng thái VC': order.trang_thai_vc,
            'Ghi chú hủy': order.ghi_chu_huy, 'Thời gian hủy': order.thoi_gian_huy
        }));
        return { status: 'SUCCESS', message: 'Fetched orders from Supabase', data: formattedData };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const fetchAllArchivedData = async (): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown User";
        const userRole = getStorageItem("userRole");
        const actualUsername = getStorageItem("currentUser") || "";
        const isAdmin = currentUser === ADMIN_USER || userRole === 'Quản trị viên' || actualUsername.toLowerCase() === 'admin';
        let query = supabase.from('archived_orders').select('*').order('ngay_xuat_hoa_don', { ascending: false });
        if (!isAdmin) query = query.eq('tvbh', currentUser);
        const { data, error } = await query;
        if (error) throw error;
        const formattedData = data.map((order: any) => ({
            'Tên tư vấn bán hàng': order.tvbh, 'Tên khách hàng': order.ten_khach_hang, 'Dòng xe': order.dong_xe,
            'Phiên bản': order.phien_ban, 'Ngoại thất': order.ngoai_that, 'Nội thất': order.noi_that,
            'Số đơn hàng': order.so_don_hang, 'SỐ ĐƠN HÀNG': order.so_don_hang, 'Ngày cọc': order.ngay_coc,
            'VIN': order.vin, 'SỐ VIN': order.vin, 'Ngày xuất hóa đơn': order.ngay_xuat_hoa_don,
            'NGÀY XUẤT HÓA ĐƠN': order.ngay_xuat_hoa_don, 'Kết quả': order.ket_qua || 'Đã xuất hóa đơn',
            'Số động cơ': order.so_may, 'SỐ ĐỘNG CƠ': order.so_may, 'LinkHopDong': order.url_hop_dong,
            'LinkDeNghiXHD': order.url_de_nghi_xhd, 'LinkHoaDonDaXuat': order.url_hoa_don_da_xuat, 'Trạng thái VC': order.trang_thai_vc
        }));
        return { status: 'SUCCESS', message: 'Fetched archived orders from Supabase', data: formattedData };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message || "Không thể tải dữ liệu lưu trữ" };
    }
};

export const addRequest = async (formData: Record<string, string>, _chicFile: File) => {
    const payloadData: Record<string, string> = { ...formData };
    try {
        const soDonHang = payloadData.so_don_hang;
        const { data: activeExists } = await supabase.from('donhang').select('so_don_hang, ket_qua').eq('so_don_hang', soDonHang).maybeSingle();
        if (activeExists) {
            const status = activeExists.ket_qua || "";
            if (!status.toLowerCase().startsWith('đã hủy')) return { status: 'ERROR', message: `Số đơn hàng ${soDonHang} đang hoạt động (${status}). Không thể ghi đè.` };
        }
        const { data: archivedExists } = await supabase.from('archived_orders').select('so_don_hang').eq('so_don_hang', soDonHang).maybeSingle();
        if (archivedExists) return { status: 'ERROR', message: `Số đơn hàng ${soDonHang} đã tồn tại trong kho lưu trữ (Đã xuất HĐ). Không thể ghi đè dữ liệu lịch sử.` };
    } catch (checkErr) {}

    let ketQua = "Chưa ghép";
    let vinDk = null;
    let pairedTime = null;

    if (payloadData.vin) {
        try {
            const { data: carData } = await supabase.from('khoxe').select('ma_dms').eq('vin', payloadData.vin).single();
            if (carData && carData.ma_dms) {
                const orderPrefix = payloadData.so_don_hang.substring(0, 6).toUpperCase();
                const dmsUpperNode = carData.ma_dms.toUpperCase();
                if (orderPrefix !== dmsUpperNode) return { status: 'ERROR', message: `Mã DMS của xe (${dmsUpperNode}) không khớp với 6 ký tự đầu của Số đơn hàng (${orderPrefix}). Vui lòng kiểm tra lại.` };
            }
        } catch (dmsErr) {}
        vinDk = payloadData.vin; ketQua = "Đã ghép"; pairedTime = new Date().toISOString();
        delete payloadData.vin;
    } else {
        try {
            const { data: availableCars } = await supabase.from('khoxe').select('vin, noi_that, ma_dms').eq('trang_thai', 'Chưa ghép').eq('dong_xe', payloadData.dong_xe).eq('phien_ban', payloadData.phien_ban).eq('ngoai_that', payloadData.ngoai_that).order('ngay_nhap', { ascending: true });
            if (availableCars && availableCars.length > 0) {
                const normalize = (str?: string) => (str || '').toLowerCase().trim().normalize('NFC');
                const orderNoiThat = normalize(payloadData.noi_that);
                const orderPrefix = payloadData.so_don_hang.substring(0, 6).toUpperCase();
                const matchedCar = availableCars.find(car => {
                    const carNoiThat = normalize(car.noi_that);
                    const carDms = (car.ma_dms || '').toUpperCase();
                    return (orderNoiThat.includes(carNoiThat) || carNoiThat.includes(orderNoiThat)) && carDms === orderPrefix;
                });
                if (matchedCar) { vinDk = matchedCar.vin; ketQua = "Đã ghép"; pairedTime = new Date().toISOString(); }
            }
        } catch (autoMatchErr) {}
    }

    const nowISO = new Date().toISOString();
    try {
        const insertPayload: Record<string, any> = {
            ten_tu_van_ban_hang: payloadData.ten_ban_hang, ten_khach_hang: payloadData.ten_khach_hang, dong_xe: payloadData.dong_xe, phien_ban: payloadData.phien_ban, ngoai_that: payloadData.ngoai_that, noi_that: payloadData.noi_that, so_don_hang: payloadData.so_don_hang, ngay_coc: payloadData.ngay_coc || null, thoi_gian_nhap: nowISO, ket_qua: ketQua, vin: vinDk, thoi_gian_ghep: pairedTime
        };
        const { error } = await supabase.from('donhang').upsert(insertPayload, { onConflict: 'so_don_hang' });
        if (error) throw error;
        if (vinDk) {
            await supabase.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: payloadData.ten_ban_hang, thoi_gian_het_han_giu: 'Vô thời hạn', is_extension_requested: false }).eq('vin', vinDk);
            await supabase.from('car_hold_activities').update({ updated_at: nowISO, status: 'matched' }).eq('vin', vinDk).eq('status', 'active');
            await supabase.from('car_hold_activities').delete().eq('vin', vinDk).eq('type', 'QUEUE');
        }
        await logAction('CREATE_ORDER', { ...insertPayload }, payloadData.so_don_hang, 'order');
        
        try {
            const { createNotification } = await import('./notificationService');
            if (vinDk) {
                await createNotification({ message: `TVBH ${payloadData.ten_ban_hang} đã tạo ĐH mới ${payloadData.so_don_hang} và ghép với xe ${vinDk}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: payloadData.so_don_hang });
            } else {
                await createNotification({ message: `TVBH ${payloadData.ten_ban_hang} đã tạo ĐH mới ${payloadData.so_don_hang} (Chưa có xe, đang chờ ghép).`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: payloadData.so_don_hang });
            }
        } catch(e) {}
        
        return { status: 'SUCCESS', message: 'Đã gửi yêu cầu thành công', newRecord: { ...mapOrderDbToUi(insertPayload) } };
    } catch (err: any) {
        return { status: 'ERROR', message: `Lỗi khi tạo đơn hàng: ${err?.message || 'Không xác định'}` };
    }
};

export const pairVinToOrder = async (orderNumber: string, vin: string) => {
    const pairedBy = getStorageItem("currentConsultant") || "Unknown";
    const pairedTime = new Date().toISOString();
    try {
        const { data: orderData } = await supabase.from('donhang').select('ket_qua, ten_tu_van_ban_hang').eq('so_don_hang', orderNumber).single();
        if (orderData && (orderData.ket_qua || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn') {
            throw new Error("Đơn hàng này đã xuất hóa đơn, không thể thay đổi thông tin ghép xe.");
        }

        const { data: carData } = await supabase.from('khoxe').select('ma_dms').eq('vin', vin).single();
        if (carData && carData.ma_dms) {
            const orderPrefix = orderNumber.substring(0, 6).toUpperCase();
            if (orderPrefix !== carData.ma_dms.toUpperCase()) return { status: 'ERROR', message: `Mã DMS của xe (${carData.ma_dms.toUpperCase()}) không khớp với 6 ký tự đầu của Số đơn hàng (${orderPrefix}).` };
        }
        await supabase.from('donhang').update({ ket_qua: 'Đã ghép', vin: vin, thoi_gian_ghep: pairedTime }).eq('so_don_hang', orderNumber);
        await supabase.from('yeucauxhd').update({ vin: vin }).eq('so_don_hang', orderNumber);
        
        if (orderData?.ten_tu_van_ban_hang) {
            const { data: activeHold } = await supabase.from('car_hold_activities').select('id').eq('vin', vin).eq('status', 'active').single();
            if (activeHold) await supabase.from('car_hold_activities').update({ updated_at: pairedTime, status: 'matched' }).eq('id', activeHold.id);
            else await supabase.from('car_hold_activities').insert({ vin: vin, username: orderData.ten_tu_van_ban_hang, tvbh_name: orderData.ten_tu_van_ban_hang, type: 'HOLD', status: 'matched', created_at: pairedTime, updated_at: pairedTime });
        }
        await supabase.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: pairedBy, thoi_gian_het_han_giu: 'Vô thời hạn' }).eq('vin', vin);
        await supabase.from('car_hold_activities').delete().eq('vin', vin).eq('type', 'QUEUE');
        await logAction('PAIR_VIN', { orderNumber, vin }, orderNumber, 'order');
        
        try {
            const { createNotification } = await import('./notificationService');
            await createNotification({ message: `TVBH ${pairedBy} đã ghép xe ${vin} cho ĐH ${orderNumber}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber });
        } catch(e) {}
        
        return { status: 'SUCCESS', message: 'Ghép xe thành công!' };
    } catch (e: any) {
        return { status: 'ERROR', message: e.message };
    }
};

export const cancelRequest = async (orderNumber: string, reason: string, unmatchType: string = 'Hủy luôn đơn hàng (Hủy đơn)') => {
    try {
        const { createNotification } = await import('./notificationService');
        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        
        const { data: order } = await supabase.from('donhang').select('vin, ket_qua').eq('so_don_hang', orderNumber).maybeSingle();
        if (order && (order.ket_qua || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn') {
            throw new Error("Đơn hàng này đã xuất hóa đơn, không thể thực hiện quá trình hủy bỏ được nữa.");
        }

        const ketQuaMoi = unmatchType.includes('Chờ xe') ? 'Chưa ghép' : 'Đã hủy';
        
        if (order && order.vin) {
            await supabase.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', order.vin);
            const { data: matchedHold } = await supabase.from('car_hold_activities').select('id').eq('vin', order.vin).in('status', ['matched', 'active']).order('created_at', { ascending: false }).limit(1).single();
            if (matchedHold) await supabase.from('car_hold_activities').update({ status: ketQuaMoi === 'Đã hủy' ? 'order_cancelled' : 'unmatched', reason, updated_at: new Date().toISOString() }).eq('id', matchedHold.id);
            else await supabase.from('car_hold_activities').insert({ vin: order.vin, username: currentUser, tvbh_name: currentUser, type: 'HOLD', status: ketQuaMoi === 'Đã hủy' ? 'order_cancelled' : 'unmatched', reason, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        }
        const updatePayload: any = { ket_qua: ketQuaMoi, vin: null, thoi_gian_ghep: null };
        if (ketQuaMoi === 'Đã hủy') { 
            updatePayload.ghi_chu_huy = `Bị hủy bởi ${currentUser}. Lý do: ${reason}`; 
            updatePayload.thoi_gian_huy = new Date().toISOString(); 
            // Giải phóng số đơn hàng bằng cách nối thêm hậu tố HUY để không bị vi phạm Unique Constraints
            updatePayload.so_don_hang = `${orderNumber}-HUY-${Date.now()}`;
        }
        
        await supabase.from('donhang').update(updatePayload).eq('so_don_hang', orderNumber);
        
        if (ketQuaMoi === 'Đã hủy') {
            await supabase.from('yeucauxhd').update({ so_don_hang: updatePayload.so_don_hang, ghi_chu_admin: `Sale hủy: ${reason}` }).eq('so_don_hang', orderNumber);
            await supabase.from('yeucauvc').update({ so_don_hang: updatePayload.so_don_hang }).eq('so_don_hang', orderNumber);
        } else {
            await supabase.from('yeucauxhd').update({ vin: null }).eq('so_don_hang', orderNumber);
        }
        
        const notifMsg = ketQuaMoi === 'Đã hủy' ? `TVBH ${currentUser} đã hủy đơn hàng ${orderNumber}. Lý do: ${reason}` : `TVBH ${currentUser} đã hủy ghép xe cho ${orderNumber}. Lý do: ${reason}`;
        await createNotification({ message: notifMsg, type: 'warning', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber });
        
        await logAction('CANCEL_REQUEST', { orderNumber, reason, ketQuaMoi }, orderNumber, 'order');
        return { status: 'SUCCESS', message: 'Hủy yêu cầu thành công!' };
    } catch (e: any) {
        return { status: 'ERROR', message: e.message };
    }
};

export const updateOrderDetails = async (orderNumber: string, details: Partial<Order>): Promise<ApiResult> => {
    try {
        const { data: checkStatus } = await supabase.from('donhang').select('ket_qua').eq('so_don_hang', orderNumber).maybeSingle();
        if (checkStatus && (checkStatus.ket_qua || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn') {
            throw new Error("Đơn hàng này đã xuất hóa đơn, không thể chỉnh sửa để bảo vệ dữ liệu.");
        }

        let matchedVin: string | null = null;
        const criticalFieldsChanged = details["Dòng xe"] || details["Phiên bản"] || details["Ngoại thất"] || details["Nội thất"];
        if (criticalFieldsChanged) {
            const { data: currentOrders } = await supabase.from('donhang').select('*').eq('so_don_hang', orderNumber);
            if (currentOrders && currentOrders.length > 0) {
                const order = currentOrders[0];
                const dongXe = details["Dòng xe"] || order.dong_xe;
                const phienBan = details["Phiên bản"] || order.phien_ban;
                const ngoaiThat = details["Ngoại thất"] || order.ngoai_that;
                const noiThat = details["Nội thất"] || order.noi_that;
                const { data: matchedCars } = await supabase.from('khoxe').select('vin').eq('trang_thai', 'Chưa ghép').eq('dong_xe', dongXe).eq('phien_ban', phienBan).eq('ngoai_that', ngoaiThat).eq('noi_that', noiThat).order('ngay_nhap', { ascending: true }).limit(1);
                if (matchedCars && matchedCars.length > 0) matchedVin = matchedCars[0].vin;
            }
        }
        const updateData: any = {};
        if (details["Tên khách hàng"]) updateData.ten_khach_hang = details["Tên khách hàng"];
        if (details["Số đơn hàng"]) updateData.so_don_hang = details["Số đơn hàng"];
        if (details["Dòng xe"]) updateData.dong_xe = details["Dòng xe"];
        if (details["Phiên bản"]) updateData.phien_ban = details["Phiên bản"];
        if (details["Ngoại thất"]) updateData.ngoai_that = details["Ngoại thất"];
        if (details["Nội thất"]) updateData.noi_that = details["Nội thất"];
        if (details["Ngày cọc"]) updateData.ngay_coc = details["Ngày cọc"];
        if (details["Tên tư vấn bán hàng"]) updateData.ten_tu_van_ban_hang = details["Tên tư vấn bán hàng"];
        if (matchedVin) { updateData.vin = matchedVin; updateData.ket_qua = 'Đã ghép'; updateData.thoi_gian_ghep = new Date().toISOString(); }
        if (Object.keys(updateData).length > 0) {
            const { error: donhangError } = await supabase.from('donhang').update(updateData).eq('so_don_hang', orderNumber);
            if (donhangError) throw donhangError;
            const yeuUpdate: any = { ...updateData };
            if (yeuUpdate.ten_tu_van_ban_hang) { yeuUpdate.tvbh = yeuUpdate.ten_tu_van_ban_hang; delete yeuUpdate.ten_tu_van_ban_hang; }
            await supabase.from('yeucauxhd').update(yeuUpdate).eq('so_don_hang', orderNumber);
        }
        if (matchedVin) {
            await supabase.from('khoxe').update({ trang_thai: 'Đã ghép' }).eq('vin', matchedVin);
            await supabase.from('car_hold_activities').delete().eq('vin', matchedVin).eq('type', 'QUEUE');
        }
        return { status: 'SUCCESS', message: matchedVin ? `Cập nhật thành công! Mối nối tự động ghép với VIN: ${matchedVin}` : "Cập nhật thông tin đơn hàng thành công.", autoMatched: !!matchedVin, vin: matchedVin };
    } catch (e: any) {
        let errorMessage = e.message || "Lỗi khi cập nhật";
        if (e.code === '23505') {
            if (e.message?.includes('vin')) {
                errorMessage = `Số VIN này đã tồn tại trong hệ thống.`;
            } else if (e.message?.includes('so_don_hang') || e.message?.includes('donhang')) {
                const match = e.details?.match(/\(([^)]+)\)=\(([^)]+)\)/);
                if (match && match[2]) {
                    errorMessage = `Số đơn hàng "${match[2]}" đã tồn tại. Không thể đổi sang mã này!`;
                } else {
                    errorMessage = `Số đơn hàng cập nhật đã tồn tại.`;
                }
            } else {
                errorMessage = `Dữ liệu cập nhật bị trùng lặp trong hệ thống.`;
            }
        }
        throw new Error(errorMessage);
    }
};

export const superUpdateOrderDetails = async (oldOrderNumber: string, details: any): Promise<ApiResult> => {
    try {
        const { data: currentOrder } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', oldOrderNumber).maybeSingle();
        if (currentOrder && (currentOrder.ket_qua || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn') {
            throw new Error("Đơn hàng này đã xuất hóa đơn, hệ thống từ chối siêu chỉnh sửa để bảo đảm an toàn dữ liệu.");
        }

        const oldVin = currentOrder?.vin;
        const newVin = details['VIN'] || details['vin'];
        const isVinChanged = newVin !== undefined && newVin !== oldVin;
        
        const mappings = {
            donhang: {
                ten_tu_van_ban_hang: details['Tên tư vấn bán hàng'], 
                ten_khach_hang: details['Tên khách hàng'], 
                dong_xe: details['Dòng xe'], 
                phien_ban: details['Phiên bản'], 
                ngoai_that: details['Ngoại thất'], 
                noi_that: details['Nội thất'], 
                vin: details['VIN'], 
                ngay_coc: details['Ngày cọc'] || null, 
                ket_qua: details['Kết quả'], 
                trang_thai_vc: details['Trạng thái VC'], 
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'] || null, 
                link_hoa_don_da_xuat: details['LinkHoaDonDaXuat']
            },
            yeucauxhd: {
                ten_khach_hang: details['Tên khách hàng'], 
                tvbh: details['Tên tư vấn bán hàng'], 
                dong_xe: details['Dòng xe'], 
                phien_ban: details['Phiên bản'], 
                ngoai_that: details['Ngoại thất'], 
                noi_that: details['Nội thất'], 
                vin: details['VIN'], 
                so_may: details['Số máy'] || details['SỐ ĐỘNG CƠ'], 
                ngay_coc: details['Ngày cọc'] || null, 
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'] || null, 
                url_hoa_don_da_xuat: details['LinkHoaDonDaXuat']
            },
            yeucauvc: { 
                ten_khach_hang: details['Tên khách hàng'], 
                vin: details['VIN'] 
            },
            archived_orders: {
                ten_khach_hang: details['Tên khách hàng'], 
                vin: details['VIN'] || details['SỐ VIN'], 
                so_may: details['Số máy'] || details['SỐ ĐỘNG CƠ'], 
                dong_xe: details['Dòng xe'], 
                phien_ban: details['Phiên bản'], 
                ngoai_that: details['Ngoại thất'], 
                noi_that: details['Nội thất'], 
                tvbh: details['Tên tư vấn bán hàng'], 
                ngay_coc: details['Ngày cọc'] || null, 
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'] || details['NGÀY XUẤT HÓA ĐƠN'] || null, 
                url_hoa_don_da_xuat: details['LinkHoaDonDaXuat'], 
                trang_thai_vc: details['Trạng thái VC']
            }
        };

        const cleanData = (obj: any) => { 
            const res: any = {}; 
            Object.keys(obj).forEach(k => { 
                if (obj[k] !== undefined) {
                    // Chuyển chuỗi rỗng thành null để tránh lỗi kiểu dữ liệu trong Postgres (VD: date, number)
                    res[k] = (obj[k] === '') ? null : obj[k];
                }
            }); 
            return res; 
        };

        const cleanDonhang = cleanData(mappings.donhang);
        const cleanYeucauxhd = cleanData(mappings.yeucauxhd);
        const cleanYeucauvc = cleanData(mappings.yeucauvc);
        const cleanArchived = cleanData(mappings.archived_orders);

        // Cập nhật bảng donhang đầu tiên vì nó có các constraint quan trọng (ví dụ unique so_don_hang)
        if (Object.keys(cleanDonhang).length > 0) {
            const donhangRes = await supabaseAdmin.from('donhang').update(cleanDonhang).eq('so_don_hang', oldOrderNumber);
            if (donhangRes.error) throw donhangRes.error; // Ném lỗi ngay nếu donhang thất bại (tránh cập nhật các bảng khác)
        }

        // Nếu donhang thành công, tiến hành cập nhật các bảng còn lại
        const updates = [];
        if (Object.keys(cleanYeucauxhd).length > 0) updates.push(supabaseAdmin.from('yeucauxhd').update(cleanYeucauxhd).eq('so_don_hang', oldOrderNumber));
        if (Object.keys(cleanYeucauvc).length > 0) updates.push(supabaseAdmin.from('yeucauvc').update(cleanYeucauvc).eq('so_don_hang', oldOrderNumber));
        if (Object.keys(cleanArchived).length > 0) updates.push(supabaseAdmin.from('archived_orders').update(cleanArchived).eq('so_don_hang', oldOrderNumber));

        if (isVinChanged) {
            if (oldVin && oldVin !== 'N/A' && oldVin !== '') {
                updates.push(supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', oldVin));
            }
            if (newVin && newVin !== 'N/A' && newVin !== '') { 
                updates.push(supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: details['Tên tư vấn bán hàng'] || currentOrder?.ten_tu_van_ban_hang || 'ADMIN', thoi_gian_het_han_giu: 'Vô thời hạn' }).eq('vin', newVin)); 
                updates.push(supabaseAdmin.from('car_hold_activities').delete().eq('vin', newVin).eq('type', 'QUEUE')); 
            }
        }

        if (details['Kết quả'] === 'Đã xuất hóa đơn') { 
            const vinToInv = details['VIN'] || oldVin; 
            if (vinToInv && vinToInv !== 'N/A') {
                updates.push(supabaseAdmin.from('car_hold_activities').update({ status: 'invoiced' }).eq('vin', vinToInv).eq('status', 'matched')); 
            }
        }

        if (updates.length > 0) {
            const responses = await Promise.all(updates);
            
            // Lấy lỗi đầu tiên nếu có trong các Promise chạy song song
            const firstError = responses.find(r => r.error)?.error;
            if (firstError) throw firstError;
        }

        await logAction('SUPER_EDIT', { oldOrderNumber, details }, details['Số đơn hàng'] || oldOrderNumber, 'admin');
        return { status: 'SUCCESS', message: 'Siêu chỉnh sửa và đồng bộ dữ liệu thành công.' };
    } catch (e: any) {
        let errorMessage = e.message || "Lỗi khi thực hiện siêu chỉnh sửa";
        
        if (e.code === '23505') {
            if (e.message?.includes('vin')) {
                errorMessage = `Số VIN này đã tồn tại trong hệ thống. Không thể sửa thành VIN trùng lặp.`;
            } else if (e.message?.includes('so_don_hang') || e.message?.includes('donhang')) {
                const match = e.details?.match(/\(([^)]+)\)=\(([^)]+)\)/);
                if (match && match[2]) {
                    errorMessage = `Số đơn hàng "${match[2]}" đã tồn tại trong hệ thống. Không thể đổi sang mã này!`;
                } else {
                    errorMessage = `Số đơn hàng cập nhật đã tồn tại. Không thể sửa sang số bị trùng!`;
                }
            } else {
                errorMessage = `Dữ liệu cập nhật bị trùng lặp trong hệ thống (Unique Constraint). ${e.details || ''}`;
            }
        } else {
             console.error("Super Edit Error:", e); // Chỉ hiện log khi là lỗi lạ
        }
        
        throw new Error(errorMessage);
    }
};

export const changeOrderConfiguration = async (orderNumber: string, newConfig: Partial<Order>): Promise<ApiResult> => {
    try {
        const { data: order, error: fetchErr } = await supabase.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
        if (fetchErr) throw fetchErr;
        
        if (order && (order.ket_qua || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn') {
            throw new Error("Đơn hàng này đã xuất hóa đơn, không thể đổi cấu hình xe được nữa.");
        }

        if (order.vin) await supabase.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', order.vin);
        const updateData: any = { dong_xe: newConfig["Dòng xe"], phien_ban: newConfig["Phiên bản"], ngoai_that: newConfig["Ngoại thất"], noi_that: newConfig["Nội thất"], vin: null, ket_qua: 'Chưa ghép', thoi_gian_ghep: null };
        const { error: updateErr } = await supabase.from('donhang').update(updateData).eq('so_don_hang', orderNumber);
        if (updateErr) throw updateErr;
        await supabase.from('yeucauxhd').update({ dong_xe: updateData.dong_xe, phien_ban: updateData.phien_ban, ngoai_that: updateData.ngoai_that, noi_that: updateData.noi_that, vin: '' }).eq('so_don_hang', orderNumber);
        const { data: matchedCars } = await supabase.from('khoxe').select('vin').eq('trang_thai', 'Chưa ghép').eq('dong_xe', updateData.dong_xe).eq('phien_ban', updateData.phien_ban).eq('ngoai_that', updateData.ngoai_that).eq('noi_that', updateData.noi_that).order('ngay_nhap', { ascending: true }).limit(1);
        let finalMessage = "Đã thay đổi cấu hình xe thành công.";
        let autoMatched = false, finalVin = null;
        if (matchedCars && matchedCars.length > 0) {
            finalVin = matchedCars[0].vin;
            await supabase.from('donhang').update({ vin: finalVin, ket_qua: 'Đã ghép', thoi_gian_ghep: new Date().toISOString() }).eq('so_don_hang', orderNumber);
            await supabase.from('khoxe').update({ trang_thai: 'Đã ghép' }).eq('vin', finalVin);
            await supabase.from('car_hold_activities').delete().eq('vin', finalVin).eq('type', 'QUEUE');
            finalMessage += ` Hệ thống đã tự động ghép với xe mới (VIN: ${finalVin})`; autoMatched = true;
        }
        const { data: updatedOrder } = await supabase.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
        await logAction('CHANGE_CONFIG', { orderNumber, oldConfig: { dong_xe: order.dong_xe, phien_ban: order.phien_ban, color: order.ngoai_that }, newConfig }, orderNumber, 'order');
        return { status: 'SUCCESS', message: finalMessage, autoMatched, vin: finalVin, updatedOrder: updatedOrder ? mapOrderDbToUi(updatedOrder) : null };
    } catch (e: any) {
        throw new Error(e.message || "Lỗi khi thay đổi cấu hình xe");
    }
};

export const getOrderHistory = async (orderNumber: string): Promise<ApiResult> => {
    const { getApi } = await import('./baseService');
    return getApi({ action: 'getOrderHistory', orderNumber });
};

export const requestVinClub = async (payload: { orderNumber: string; customerType: string; dmsCode?: string; vin?: string; files?: Record<string, File | null>; }): Promise<ApiResult> => {
    const { postApi } = await import('./baseService');
    const { createNotification } = await import('./notificationService');
    try {
        const { orderNumber, customerType, dmsCode, vin, files } = payload;
        const requestedBy = getStorageItem("currentConsultant") || "Unknown User";
        const [activeRes, archivedRes] = await Promise.all([supabase.from('donhang').select('ten_khach_hang, ten_tu_van_ban_hang, vin, ket_qua').eq('so_don_hang', orderNumber).maybeSingle(), supabase.from('archived_orders').select('ten_khach_hang, tvbh, vin').eq('so_don_hang', orderNumber).maybeSingle()]);
        const orderData = activeRes.data || (archivedRes.data ? { ten_khach_hang: archivedRes.data.ten_khach_hang, ten_tu_van_ban_hang: archivedRes.data.tvbh, vin: archivedRes.data.vin, ket_qua: 'Đã xuất hóa đơn' } : null);
        if (!orderData) throw new Error(`Không tìm thấy đơn hàng ${orderNumber}.`);
        const vehicleVin = vin || orderData.vin;
        if (!vehicleVin) throw new Error(`Đơn hàng ${orderNumber} chưa có số VIN.`);
        const { data: existingReq } = await supabase.from('yeucauvc').select('trang_thai_xu_ly').eq('so_don_hang', orderNumber).neq('trang_thai_xu_ly', 'Từ chối ycvc').neq('trang_thai_xu_ly', 'Hủy').maybeSingle();
        if (existingReq) throw new Error(`Đơn hàng ${orderNumber} đã có yêu cầu VinClub (Trạng thái: ${existingReq.trang_thai_xu_ly}).`);
        const uploadedFileUrls: Record<string, string> = {};
        if (files) {
            const uploadPromises = Object.entries(files).map(async ([key, file]) => {
                if (file) uploadedFileUrls[key] = await uploadToSupabase(file, `${orderNumber}/VC_${key}_${Date.now()}.${file.name.split('.').pop()}`, 'vinclub-requests');
            });
            await Promise.all(uploadPromises);
        }
        await supabaseAdmin.from('yeucauvc').insert({ so_don_hang: orderNumber, ten_khach_hang: orderData.ten_khach_hang, thoi_gian_yc: new Date().toISOString(), nguoi_yc: requestedBy, loai_yc: customerType === 'personal' ? 'Cá Nhân' : 'Công Ty', trang_thai_xu_ly: 'Chờ duyệt ycvc', file_urls: uploadedFileUrls, ma_kh_dms: dmsCode || '', vin: vehicleVin });
        if (activeRes.data) await supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Chờ duyệt VC' }).eq('so_don_hang', orderNumber);
        if (archivedRes.data) await supabaseAdmin.from('archived_orders').update({ trang_thai_vc: 'Chờ duyệt VC' }).eq('so_don_hang', orderNumber);
        postApi({ action: 'requestVinClubNotificationOnly', orderNumber, customerName: orderData.ten_khach_hang, requestedBy, vin: vehicleVin }).catch(() => {});
        await createNotification({ message: `Vừa gửi yêu cầu cấp VC (KH: ${orderData.ten_khach_hang}) qua số ĐH ${orderNumber}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber });
        await logAction('REQUEST_VINCLUB', { orderNumber, customerType, vin: vehicleVin }, orderNumber, 'order');
        return { status: 'SUCCESS', message: 'Yêu cầu VinClub đã được gửi thành công.', updatedOrder: { ...orderData, "Số đơn hàng": orderNumber, "Trạng thái VC": 'Chờ duyệt VC', VIN: vehicleVin } };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const globalSearch = async (keyword: string, scope: 'active' | 'archive' | 'all' = 'all'): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || getStorageItem("currentUser") || ADMIN_USER;
        const userRole = getStorageItem("userRole");
        const actualUsername = getStorageItem("currentUser") || "";
        const isAdmin = currentUser === ADMIN_USER || userRole === 'Quản trị viên' || actualUsername.toLowerCase() === 'admin';

        const searchResults: Record<string, any[]> = {};
        const term = `%${keyword}%`;

        const performSearch = async (tableName: string, columns: string[], ownerColumn?: string) => {
            let query = supabase.from(tableName).select('*');
            const filterStr = columns.map(col => `${col}.ilike.${term}`).join(',');
            query = query.or(filterStr);
            if (!isAdmin && ownerColumn) query = query.eq(ownerColumn, currentUser);
            const { data, error } = await query.limit(50);
            return error ? [] : (data || []);
        };

        const searchPromises: Promise<void>[] = [];
        if (scope === 'active' || scope === 'all') {
            searchPromises.push(performSearch('donhang', ['so_don_hang', 'ten_khach_hang', 'vin'], 'ten_tu_van_ban_hang').then(res => {
                if (res.length > 0) searchResults['Đơn hàng'] = res.map(o => ({ 'Số đơn hàng': o.so_don_hang, 'Tên khách hàng': o.ten_khach_hang, 'VIN': o.vin, 'Kết quả': o.ket_qua, 'Dòng xe': o.dong_xe, 'Tên tư vấn bán hàng': o.ten_tu_van_ban_hang }));
            }));
            searchPromises.push(performSearch('yeucauvc', ['so_don_hang', 'ten_khach_hang', 'vin'], 'nguoi_yc').then(res => {
                if (res.length > 0) searchResults['Yêu cầu VinClub'] = res.map(o => ({ 'Số đơn hàng': o.so_don_hang, 'Tên khách hàng': o.ten_khach_hang, 'Thời gian YC': o.thoi_gian_yc, 'Trạng thái xử lý': o.trang_thai_xu_ly, 'Người YC': o.nguoi_yc }));
            }));
            searchPromises.push(performSearch('yeucauxhd', ['so_don_hang', 'ten_khach_hang', 'vin'], 'tvbh').then(res => {
                if (res.length > 0) searchResults['Yêu cầu hóa đơn'] = res.map(o => ({ 'Số đơn hàng': o.so_don_hang, 'Tên khách hàng': o.ten_khach_hang, 'Ngày yêu cầu': o.ngay_yeu_cau, 'Trạng thái': o.trang_thai_vc || 'Chờ duyệt', 'TVBH': o.tvbh }));
            }));
            searchPromises.push(performSearch('khoxe', ['vin', 'ma_dms']).then(res => {
                let filtered = res; if (!isAdmin) filtered = res.filter(c => !c.nguoi_giu_xe || c.nguoi_giu_xe === currentUser);
                if (filtered.length > 0) searchResults['Kho xe'] = filtered.map(o => ({ 'VIN': o.vin, 'Mã DMS': o.ma_dms, 'Dòng xe': o.dong_xe, 'Ngoại thất': o.ngoai_that, 'Nội thất': o.noi_that, 'Trạng thái': o.trang_thai }));
            }));
        }
        if (scope === 'archive' || scope === 'all') {
            searchPromises.push(performSearch('archived_orders', ['so_don_hang', 'ten_khach_hang', 'vin'], 'tvbh').then(res => {
                if (res.length > 0) searchResults['Dữ liệu lưu trữ'] = res.map(o => ({ 'Số đơn hàng': o.so_don_hang, 'Tên khách hàng': o.ten_khach_hang, 'Ngày xuất hóa đơn': o.ngay_xuat_hoa_don, 'VIN': o.vin, 'TVBH': o.tvbh }));
            }));
        }
        await Promise.all(searchPromises);
        return { status: 'SUCCESS', message: 'Search completed via Supabase', data: searchResults };
    } catch (err: any) {
        const { getApi } = await import('./baseService');
        return getApi({ action: 'searchGlobal', keyword, scope, isAdmin: String(getStorageItem("userRole") === 'Quản trị viên') });
    }
};

export const getYeuCauVcData = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('yeucauvc').select('*').order('thoi_gian_yc', { ascending: false });
        if (error) throw error;
        const formattedData = data.map((req: any) => ({
            "Số đơn hàng": req.so_don_hang, "Tên khách hàng": req.ten_khach_hang, "Thời gian YC": req.thoi_gian_yc, "Người YC": req.nguoi_yc,
            "Loại YC": req.loai_yc, "Trạng thái xử lý": req.trang_thai_xu_ly, "Ghi chú": req.ghi_chu,
            "FileUrls": typeof req.file_urls === 'string' ? req.file_urls : JSON.stringify(req.file_urls),
            "Mã KH DMS": req.ma_kh_dms, "VIN": req.vin, "URL hình ảnh": req.url_hinh_anh
        }));
        return { status: 'SUCCESS', message: 'Fetched VC requests from Supabase', data: formattedData };
    } catch (err: any) {
        const { getApi } = await import('./baseService');
        try {
            return await getApi({ action: 'getYeuCauVcData' });
        } catch (gasErr) {
            return { status: 'ERROR', message: err.message };
        }
    }
};
