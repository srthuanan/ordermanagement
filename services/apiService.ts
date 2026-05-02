import { API_URL, ADMIN_USER, defaultExteriors } from '../constants';
import { Order, StockVehicle } from '../types';
import { supabase, supabaseAdmin } from './supabaseClient';
export { supabase, supabaseAdmin };

// autoReleaseExpiredHolds only exists in the newer modular stockService, re-export it here for backward compatibility
import { autoReleaseExpiredHolds, leaveHoldQueue, tryAutoMatchWaitingOrder, holdCar, releaseCar } from './api/stockService';
export { autoReleaseExpiredHolds, leaveHoldQueue, tryAutoMatchWaitingOrder, holdCar, releaseCar };
export { getSoldCarsDataByMonth, getAllSoldCarsData } from './api/soldCarsService';

declare const axios: any;

/**
 * Generates a username from full name following the pattern:
 * (First Name) + (Initials of remaining names)
 * Example: "Phạm Thành Nhân" -> "nhanpt"
 */
export const generateUsernameFromFullName = (fullName: string): string => {
    if (!fullName) return '';
    const normalized = fullName.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
    
    const parts = normalized.split(/\s+/);
    if (parts.length === 0) return '';
    
    const firstName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
    
    return firstName + initials;
};

/**
 * Generates a random 10-character alphanumeric password
 */
export const generateRandomPassword = (): string => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let retVal = "";
    for (let i = 0; i < 10; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return retVal;
};

/**
 * Basic SHA-256 hash using SubtleCrypto (Async)
 */
export const hashPassword = async (password: string): Promise<string> => {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};


const getStorageItem = (key: string) => localStorage.getItem(key) || sessionStorage.getItem(key);

export const triggerAutoSync = () => {
    try {
        const bodyParams = new URLSearchParams();
        bodyParams.append('action', 'forceSync');
        axios.post(API_URL, bodyParams).catch(() => {});
    } catch(e) {}
};

/**
 * Buộc di chuyển tệp hồ sơ từ Supabase sang Google Drive cho một đơn hàng cụ thể.
 */
export const forceMigrateToDrive = async (orderNumber: string) => {
    return postApi({ action: 'archiveOrderNow', orderNumber });
};

/**
 * [NEW] Lưu các ảnh đã tách từ PDF vào Supabase Storage (thư mục đơn hàng / Ảnh) thay vì Google Drive
 */
export const saveSplitImagesToSupabase = async (
    orderNumber: string, 
    _customerName: string, 
    images: { base64Data: string, mimeType: string }[],
    prefix: string
) => {
    try {
        const folder = `rescan/${orderNumber}/${prefix}`;
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

/**
 * [NEW] Lấy danh sách ảnh hồ sơ từ Supabase Storage để quét lại
 */
export const getSupabaseScanImages = async (orderNumber: string) => {
    try {
        const folder = `rescan/${orderNumber}`;
        const { data, error } = await supabaseAdmin.storage.from('temp_scans').list(folder, {
            recursive: true
        } as any);

        if (error) throw error;
        if (!data || data.length === 0) return { status: 'ERROR', message: "Không tìm thấy ảnh quét lại trên Supabase." };

        const files = data
            .filter(f => !f.id === false) // Chỉ lấy file, không lấy folder
            .map(f => {
                const path = `${folder}/${f.name}`;
                const { data: urlData } = supabaseAdmin.storage.from('temp_scans').getPublicUrl(path);
                return {
                    url: urlData.publicUrl,
                    mimeType: 'image/jpeg' // Default
                };
            });

        return { status: 'SUCCESS', files };
    } catch (e: any) {
        console.error("Lỗi getSupabaseScanImages:", e);
        return { status: 'ERROR', message: e.message };
    }
};

/**
 * Xóa dữ liệu quét lại trên Supabase sau khi hoàn tất
 */
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

// --- GIỮ LẠI ĐỂ KHÔNG GÂY LỖI BUILD NHƯNG SẼ KHÔNG DÙNG ---
export const saveAllSplitImagesToDrive = async (_orderNumber: string, _customerName: string, _documentGroups: any[]) => ({ status: 'SUCCESS' });
export const saveSplitImagesToDrive = async (_orderNumber: string, _customerName: string, _images: string[], _prefix: string) => ({ status: 'SUCCESS' });
export const getOrderDriveImages = async (_orderNumber: string, _customerName: string, _orderDateStr: string) => ({ status: 'ERROR', message: "Đã chuyển sang dùng Supabase." });

const uploadToSupabase = async (file: File | Blob, path: string, bucket: string = 'yeucauxhd-files'): Promise<string> => {
    const { error } = await supabaseAdmin.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};

/**
 * Maps a color code (e.g., "CE1V") to its full descriptive name (e.g., "Zenith Grey (CE1V)").
 * Uses the defaultExteriors list from constants.
 * @param code The color code to map.
 */
const getExteriorColorName = (code: string): string => {
    if (!code) return '';
    const upperCode = code.toUpperCase().trim();
    // Search for "(CODE)" in the predefined list of full names
    const match = defaultExteriors.find(name => name.toUpperCase().includes(`(${upperCode})`));
    return match || code; // Return original code if no match found
};

/**
 * Maps an interior color code (e.g., "CI11") to its descriptive name.
 * @param code The interior color code to map.
 */
const getInteriorColorName = (code: string): string => {
    if (!code) return '';
    const upperCode = code.toUpperCase().trim();
    const mapping: Record<string, string> = {
        'CI11': 'Black',
        'CI1H': 'Black',
        'CI12': 'Brown',
        'CI18': 'Brown',
        'CI13': 'Beige',
        'CI1M': 'Grey'
    };
    return mapping[upperCode] || code;
};

interface ApiResult {
    status: 'SUCCESS' | 'ERROR';
    message: string;
    [key: string]: any;
}

// The new, separate API endpoint for the "Xe Đã Bán" data (now handled in modular services).


// FIX: Replaced fetch with axios for more robust handling of network requests and errors,
// which should resolve the "Failed to fetch" errors. Axios is already loaded globally.
export const postApi = async (payload: Record<string, any>, url: string = API_URL): Promise<ApiResult> => {
    try {
        const bodyParams = new URLSearchParams();

        // --- JWT TOKEN INJECTION ---
        const token = getStorageItem('token');
        if (token && !payload.token) {
            payload.token = token;
        }
        // ---------------------------

        for (const key in payload) {
            if (payload[key] !== null && payload[key] !== undefined) {
                bodyParams.append(key, String(payload[key]));
            }
        }

        const response = await axios.post(url, bodyParams);

        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;

        if (result.status !== 'SUCCESS') {
            if (result.message && result.message.includes('Unauthorized')) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('isLoggedIn');
                window.location.reload();
            }
            throw new Error(result.message || 'API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'An unknown API error occurred.';
        if (errorMessage.includes('Unauthorized')) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('isLoggedIn');
            window.location.reload();
        }
        console.error('API service error (POST):', error);
        throw new Error(errorMessage);
    }
};

/**
 * Gửi yêu cầu POST với body là JSON (Thích hợp cho payload lớn như mảng Base64)
 */
export const postJsonApi = async (payload: Record<string, any>, url: string = API_URL): Promise<ApiResult> => {
    try {
        // --- JWT TOKEN INJECTION ---
        const token = getStorageItem('token');
        if (token && !payload.token) {
            payload.token = token;
        }
        // ---------------------------

        // Lưu ý: Sử dụng 'text/plain' để tránh yêu cầu CORS Preflight (OPTIONS) 
        // mà Google Apps Script không hỗ trợ tốt.
        const response = await axios.post(url, JSON.stringify(payload), {
            headers: { 'Content-Type': 'text/plain' }
        });

        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;

        if (result.status !== 'SUCCESS') {
            if (result.message && result.message.includes('Unauthorized')) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('isLoggedIn');
                window.location.reload();
            }
            throw new Error(result.message || 'API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'An unknown API error occurred.';
        console.error('API service error (POST JSON):', error);
        throw new Error(errorMessage);
    }
};

export const getApi = async (params: Record<string, any>, baseUrl: string = API_URL): Promise<ApiResult> => {
    try {
        // FIX: Manually construct the URL to ensure parameters are correctly passed to Google Apps Script.
        // This avoids potential issues with how axios's `params` config interacts with the backend.
        const url = new URL(baseUrl);

        // --- JWT TOKEN INJECTION ---
        const token = getStorageItem('token');
        if (token && !params.token) {
            params.token = token;
        }
        // ---------------------------

        Object.keys(params).forEach(key => {
            if (params[key] !== undefined && params[key] !== null) {
                url.searchParams.append(key, String(params[key]));
            }
        });

        const response = await axios.get(url.toString());

        // Handle cases where Google Apps Script returns a stringified JSON
        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;

        if (result.status !== 'SUCCESS') {
            if (result.message && result.message.includes('Unauthorized')) {
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('isLoggedIn');
                window.location.reload();
            }
            throw new Error(result.message || 'API returned an unspecified error.');
        }
        return result;
    } catch (error) {
        const errorMessage = (error as any).response?.data?.message || (error as Error).message || 'An unknown API error occurred.';
        if (errorMessage.includes('Unauthorized')) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('isLoggedIn');
            window.location.reload();
        }
        console.error('API service error (GET):', error);
        throw new Error(errorMessage);
    }
};

export const getLogData = async (): Promise<ApiResult> => {
    return getApi({ action: 'getLogData' });
};

export const getActiveUsers = async (): Promise<ApiResult> => {
    try {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
        const { data, error } = await supabase
            .from('user_presence')
            .select('*')
            .gt('last_active_at', fiveMinutesAgo);
        
        if (error) throw error;

        return {
            status: 'SUCCESS',
            message: 'Fetched active users from Supabase',
            data: data || []
        };
    } catch (err) {
        console.error("Supabase getActiveUsers error:", err);
        return getApi({ action: 'getActiveUsers' });
    }
};

export const recordUserPresence = async (): Promise<void> => {
    try {
        const username = getStorageItem("currentUser") || ADMIN_USER;
        const fullName = getStorageItem("currentConsultant") || "User";
        if (username) {
            await supabase.from('user_presence').upsert({
                username: username,
                full_name: fullName,
                last_active_at: new Date().toISOString(),
                status: 'online'
            }, { onConflict: 'username' });
        }
    } catch (error) {
        console.warn('Failed to record user presence on Supabase:', error);
    }
};

export const getPaginatedData = async (usersToView?: string[], currentUser?: string, isCurrentUserAdmin?: boolean): Promise<ApiResult> => {
    try {
        let query = supabase.from('donhang').select('*')
            .not('ket_qua', 'ilike', 'Đã hủy%'); // Không load các đơn đã hủy ra màn hình chính

        if (!isCurrentUserAdmin) {
            if (usersToView && usersToView.length > 0) {
                query = query.in('ten_tu_van_ban_hang', usersToView);
            } else if (currentUser) {
                query = query.eq('ten_tu_van_ban_hang', currentUser);
            }
        }

        // Note: For now we fetch filtered active data from Supabase and let frontend slice it
        const { data, error } = await query;
        if (error) throw error;

        // Dịch ngược từ column database về lại Tiếng Việt chuẩn của Object Order cũ
        const formattedData = data.map((order: any) => ({
            'Tên tư vấn bán hàng': order.ten_tu_van_ban_hang,
            'Tên khách hàng': order.ten_khach_hang,
            'Dòng xe': order.dong_xe,
            'Phiên bản': order.phien_ban,
            'Ngoại thất': order.ngoai_that,
            'Nội thất': order.noi_that,
            'Số đơn hàng': order.so_don_hang,
            'Ngày cọc': order.ngay_coc,
            'Thời gian nhập': order.thoi_gian_nhap,
            'Kết quả': order.ket_qua,
            'Trạng thái gửi mail': order.trang_thai_gui_mail,
            'VIN': order.vin,
            'Số máy': order.so_may,
            'Mã DMS': order.ma_dms,
            'Thời gian ghép': order.thoi_gian_ghep,
            'Số ngày ghép': order.so_ngay_ghep,
            'Ngày xuất hóa đơn': order.ngay_xuat_hoa_don,
            'Cảnh báo quá hạn': order.canh_bao_qua_han,
            'Cảnh báo sai DMS': order.canh_bao_sai_dms,
            'LinkHoaDonDaXuat': order.link_hoa_don_da_xuat,
            'Trạng thái VC': order.trang_thai_vc,
            'Ghi chú hủy': order.ghi_chu_huy,
            'Thời gian hủy': order.thoi_gian_huy,
            'Thời gian cần xe': order.thoi_gian_can_xe,
            'CHÍNH SÁCH': order.chinh_sach
        }));

        return {
            status: 'SUCCESS',
            message: 'Fetched orders from Supabase',
            data: formattedData
        };
    } catch (err: any) {
        console.error("Supabase getPaginatedData error: ", err);
        return {
            status: 'ERROR',
            message: err.message
        };
    }
};

export const getXuathoadonData = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase
            .from('yeucauxhd')
            .select('*')
            .order('ngay_yeu_cau', { ascending: false })
            .limit(300);

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
            "Thời gian nhập": req.ngay_yeu_cau,
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
            "Ghi chú AI": req.ghi_chu_ai,
            "Kết quả": req.trang_thai_vc || 'Đã xuất hóa đơn' // Default result for processed invoices
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

        // Trả về mảng các chuỗi tên chính sách để frontend xử lý (giống hệt định dạng cũ)
        const policies = data ? data.map((p: any) => ({ ten_chinh_sach: p.ten_chinh_sach, dong_xe: p.dong_xe })) : [];
        return { status: 'SUCCESS', message: 'Tải chính sách thành công', data: policies };
    } catch (error: any) {
        console.error("Lỗi khi tải danh sách chính sách từ Supabase:", error);
        return { status: 'ERROR', message: error.message || 'Lỗi tải chính sách' };
    }
};


export const getYeuCauVcData = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('yeucauvc').select('*').order('thoi_gian_yc', { ascending: false });
        if (error) throw error;

        const formattedData = data.map((req: any) => ({
            "Số đơn hàng": req.so_don_hang,
            "Tên khách hàng": req.ten_khach_hang,
            "Thời gian YC": req.thoi_gian_yc,
            "Người YC": req.nguoi_yc,
            "Loại YC": req.loai_yc,
            "Trạng thái xử lý": req.trang_thai_xu_ly,
            "Ghi chú": req.ghi_chu,
            "FileUrls": typeof req.file_urls === 'string' ? req.file_urls : JSON.stringify(req.file_urls),
            "Mã KH DMS": req.ma_kh_dms,
            "VIN": req.vin,
            "URL hình ảnh": req.url_hinh_anh // for backward compatibility if needed
        }));

        return { status: 'SUCCESS', message: 'Fetched VC requests from Supabase', data: formattedData };
    } catch (err: any) {
        console.error("Supabase getYeuCauVcData error: ", err);
        // Fallback to GAS if Supabase fails (e.g. table not created yet)
        try {
            return await getApi({ action: 'getYeuCauVcData' });
        } catch (gasErr) {
            return { status: 'ERROR', message: err.message };
        }
    }
};

export const getStockData = async (): Promise<ApiResult> => {
    try {
        // Fetch data array directly from Supabase
        const { data, error } = await supabase.from('khoxe').select('*');
        if (error) throw error;

        // Xử lý bảo mật: Sales chỉ được thấy xe Chưa Ghép của chính mình & Kho trống (nếu có logic ẩn)
        // (Nếu cần mình sẽ viết filter JS ở đây, còn hiện tại đang đổ toàn bộ giống GAS cũ)

        // Dịch lại sang Tiếng Việt để tương thích 100% với Frontend không sửa một dòng render nào
        const formattedData = data.map((car: any) => ({
            'Dòng xe': car.dong_xe,
            'Phiên bản': car.phien_ban,
            'Ngoại thất': car.ngoai_that,
            'Nội thất': car.noi_that,
            'VIN': car.vin,
            'Mã DMS': car.ma_dms,
            'Số máy': car.so_may,
            'Trạng thái': car.trang_thai,
            'Ngày nhập': car.ngay_nhap,
            'Đã thông báo': car.da_thong_bao,
            'Người Giữ Xe': car.nguoi_giu_xe,
            'Thời Gian Hết Hạn Giữ': car.thoi_gian_het_han_giu,
            'Ngày vận tải': car.ngay_van_tai,
            'extension_reason': car.extension_reason,
            id: car.id,
            vin: car.vin,
            dong_xe: car.dong_xe,
            phien_ban: car.phien_ban,
            ngoai_that: car.ngoai_that,
            noi_that: car.noi_that,
            trang_thai: car.trang_thai,
            ma_dms: car.ma_dms
        }));

        return {
            status: 'SUCCESS',
            message: 'Fetched stock from Supabase',
            khoxe: formattedData
        };
    } catch (err: any) {
        console.error("Supabase getStockData error: ", err);
        return {
            status: 'ERROR',
            message: err.message
        };
    }
};

// holdCar and releaseCar are now imported from ./api/stockService

// --- HÀNG CHỜ VÀ GIA HẠN ---

export const joinHoldQueue = async (vin: string) => {
    const username = getStorageItem("currentUser") || ADMIN_USER;
    const fullName = getStorageItem("currentConsultant") || username;

    try {
        const { error } = await supabase.from('car_hold_activities').insert({
            vin,
            username: username,
            tvbh_name: fullName,
            type: 'QUEUE',
            status: 'waiting'
        });
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Bạn đã gia nhập hàng chờ thành công.' };
    } catch (err: any) {
        if (err.code === '23505') return { status: 'ERROR', message: 'Bạn đã ở trong hàng chờ của xe này.' };
        return { status: 'ERROR', message: 'Không thể đăng ký hàng chờ.' };
    }
};

export const getMyQueuedVins = async (): Promise<string[]> => {
    try {
        await processExpiredQueuePriorities();
        const username = getStorageItem("currentUser");
        if (!username) return [];

        const { data, error } = await supabase
            .from('car_hold_activities')
            .select('vin')
            .eq('username', username)
            .eq('type', 'QUEUE')
            .in('status', ['waiting', 'notified', 'prioritized']);

        if (error) throw error;
        return (data || []).map(item => item.vin);
    } catch (err) {
        console.error("Error fetching my queued vins:", err);
        return [];
    }
};

export const uploadHoldEvidence = async (vin: string, file: File) => {
    try {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop();
        const path = `hold_extensions/${vin}_${timestamp}.${ext}`;

        const { error } = await supabaseAdmin.storage.from('yeucauxhd-files').upload(path, file);
        if (error) throw error;

        const { data } = supabase.storage.from('yeucauxhd-files').getPublicUrl(path);
        return { status: 'SUCCESS', url: data.publicUrl };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const requestHoldExtension = async (vin: string, evidenceUrl: string, reason: string) => {
    try {
        const { error } = await supabase.from('khoxe').update({
            is_extension_requested: true,
            extension_evidence_url: evidenceUrl,
            extension_reason: reason
        }).eq('vin', vin);

        if (error) throw error;

        // Thông báo cho Admin
        await createNotification({
            message: `Yêu cầu gia hạn giữ xe cho VIN: ${vin}. Lý do: ${reason}`,
            type: 'info',
            recipient: 'ADMINS',
            targetView: 'stock',
            targetId: vin
        });

        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        await supabase.from('car_hold_activities').insert({
            vin: vin,
            username: currentUser,
            tvbh_name: currentUser,
            type: 'PENALTY',
            status: 'extension_requested',
            reason: `Xin gia hạn giữ xe`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        return { status: 'SUCCESS', message: 'Đã gửi yêu cầu gia hạn đến Quản trị viên.' };
    } catch (err) {
        return { status: 'ERROR', message: 'Lỗi khi gửi yêu cầu gia hạn.' };
    }
};

export const approveHoldExtension = async (vin: string) => {
    try {
        // Lấy thông tin xe để biết thời gian hiện tại
        const { data: car } = await supabase.from('khoxe').select('thoi_gian_het_han_giu, extension_count').eq('vin', vin).single();
        if (!car) throw new Error("Xe không tồn tại");

        // Parse ngày hiện tại: format DD/MM/YYYY HH:mm:ss
        const parts = car.thoi_gian_het_han_giu.split(' ');
        const dateParts = parts[0].split('/');
        const timeParts = parts[1].split(':');
        
        const currentExp = new Date(
            parseInt(dateParts[2]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[0]),
            parseInt(timeParts[0]),
            parseInt(timeParts[1]),
            parseInt(timeParts[2])
        );

        // Gia hạn thêm 12h
        currentExp.setHours(currentExp.getHours() + 12);
        
        const pad = (n: number) => n < 10 ? '0' + n : n;
        const newExpStr = `${pad(currentExp.getDate())}/${pad(currentExp.getMonth() + 1)}/${currentExp.getFullYear()} ${pad(currentExp.getHours())}:${pad(currentExp.getMinutes())}:${pad(currentExp.getSeconds())}`;

        const { error } = await supabase.from('khoxe').update({
            thoi_gian_het_han_giu: newExpStr,
            is_extension_requested: false,
            extension_count: (car.extension_count || 0) + 1
        }).eq('vin', vin);

        if (error) throw error;
        return { status: 'SUCCESS', message: 'Phê duyệt gia hạn thành công.' };
    } catch (err) {
        return { status: 'ERROR', message: 'Lỗi khi duyệt gia hạn.' };
    }
};

export const rejectHoldExtension = async (vin: string) => {
    try {
        const { error } = await supabase.from('khoxe').update({
            is_extension_requested: false
        }).eq('vin', vin);

        if (error) throw error;

        const { data: car } = await supabase.from('khoxe').select('nguoi_giu_xe').eq('vin', vin).single();
        if (car && car.nguoi_giu_xe) {
            await supabase.from('car_hold_activities').insert({
                vin: vin,
                username: car.nguoi_giu_xe,
                tvbh_name: car.nguoi_giu_xe,
                type: 'PENALTY',
                status: 'extension_rejected',
                reason: `Bị từ chối gia hạn`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        }
        return { status: 'SUCCESS', message: 'Đã từ chối yêu cầu gia hạn.' };
    } catch (err) {
        return { status: 'ERROR', message: 'Lỗi khi từ chối gia hạn.' };
    }
};

export const getPendingHoldExtensions = async () => {
    try {
        const { data, error } = await supabase.from('khoxe')
            .select('vin, dong_xe, phien_ban, ngoai_that, noi_that, nguoi_giu_xe, thoi_gian_het_han_giu, extension_count, extension_evidence_url, extension_reason')
            .eq('is_extension_requested', true);
        
        if (error) throw error;
        return data as any[];
    } catch (err) {
        return [];
    }
};

// --- OPTIMIZED: Using Reputation Cache Table for near-instant access ---
export const getHoldReputation = async (email: string) => {
    try {
        // 1. Fetch from Cache first
        const { data: cache, error } = await supabase.from('user_reputation_cache').select('*').eq('username', email).maybeSingle();
        
        if (error) throw error;

        // 2. If no cache or cache is older than 30 mins, trigger background refresh (don't wait)
        const THIRTY_MINS = 30 * 60 * 1000;
        if (!cache || (new Date().getTime() - new Date(cache.last_updated).getTime() > THIRTY_MINS)) {
            // Trigger RPC refresh without blocking the response
            supabase.rpc('refresh_user_reputation', { p_username: email }).then();
            
            // If cache exists but is just slightly old, return it now for speed
            if (cache) {
                return {
                    score: cache.score,
                    total: cache.total_holds,
                    matched: cache.matched_holds,
                    bonus: (cache.score >= 90 && cache.matched_holds >= 5) ? 1 : 0,
                    isAdjusted: false, // Could be found from reputation_adjustments if critical
                    isNewUser: cache.total_holds === 0,
                    isChampion: cache.is_champion,
                    systemScore: cache.score
                };
            }
        } else {
            // Cache is fresh
            return {
                score: cache.score,
                total: cache.total_holds,
                matched: cache.matched_holds,
                bonus: (cache.score >= 90 && cache.matched_holds >= 5) ? 1 : 0,
                isAdjusted: false,
                isNewUser: cache.total_holds === 0,
                isChampion: cache.is_champion,
                systemScore: cache.score
            };
        }

        // 3. Fallback calculation if cache is missing and we MUST have it now (first time)
        const { data: result, error: rpcErr } = await supabase.rpc('calculate_user_reputation', { p_username: email });
        if (rpcErr || !result || result.length === 0) throw new Error("RPC calculation failed");

        const res = result[0];
        return {
            score: res.score,
            total: res.total_holds,
            matched: res.matched_holds,
            bonus: (res.score >= 90 && res.matched_holds >= 5) ? 1 : 0,
            isAdjusted: false,
            isNewUser: res.total_holds === 0,
            isChampion: res.is_champion,
            systemScore: res.score
        };
    } catch (err) {
        console.warn("Reputation cache error, falling back to 100:", err);
        return { score: 100, total: 0, matched: 0, bonus: 0, isAdjusted: false, systemScore: 100 };
    }
};

export const addBacklogOrder = async (soDonHang: string, ghiChu: string, tvbhName: string) => {
    try {
        // 1. Kiểm tra tồn tại trong donhanghienhuu
        const { data: matched, error: matchErr } = await supabase
            .from('donhanghienhuu')
            .select('*')
            .eq('so_don_hang_ban', soDonHang)
            .maybeSingle();

        if (matchErr) throw matchErr;
        if (!matched) return { status: 'ERROR', message: `Số đơn hàng ${soDonHang} chưa có trên DMS (hoặc chưa đồng bộ). Vui lòng đợi hệ thống cập nhật và thử lại.` };

        // 2. Thêm vào bảng donhang_ton
        const { error: insertErr } = await supabase
            .from('donhang_ton')
            .insert({
                so_don_hang: soDonHang,
                tvbh_name: tvbhName,
                ghi_chu: ghiChu
            });

        if (insertErr) {
            if (insertErr.code === '23505') return { status: 'ERROR', message: 'Số đơn hàng này đã được báo cáo trong danh sách Tồn rồi!' };
            throw insertErr;
        }

        return { status: 'SUCCESS', message: 'Đã gửi báo cáo Đơn Tồn thành công!', data: matched };
    } catch (e: any) {
        console.error("addBacklogOrder Error:", e);
        return { status: 'ERROR', message: e.message || 'Lỗi không xác định.' };
    }
};

export const getBacklogOrders = async () => {
    try {
        const { data, error } = await supabase
            .from('donhang_ton')
            .select(`
                *,
                donhanghienhuu!inner (
                    khach_hang_tiem_nang,
                    ma_khach_hang,
                    ten_phien_ban,
                    mau_ngoai_that,
                    mau_noi_that,
                    ngay_giao_dich,
                    so_vin
                )
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Enhance with actual VIN from `donhang` since `donhanghienhuu` might not reflect the paired VIN 
        const soDonHangs = data.map((item: any) => item.so_don_hang);
        const { data: donHangs } = await supabase
            .from('donhang')
            .select('so_don_hang, vin, ket_qua')
            .in('so_don_hang', soDonHangs);
            
        const donhangMap = new Map();
        if (donHangs) {
            donHangs.forEach((dh: any) => {
                const isProcessed = dh.ket_qua && dh.ket_qua.toUpperCase().includes('ĐÃ XUẤT HÓA ĐƠN');
                const isPaired = !!dh.vin;
                donhangMap.set(dh.so_don_hang, { vin: dh.vin, isProcessed, isPaired });
                
                // Auto-delete processed (invoiced) backlog orders
                if (isProcessed) {
                    supabase.from('donhang_ton').delete().eq('so_don_hang', dh.so_don_hang).then();
                }
            });
        }

        // Format to flat Array for easy UI rendering
        const formatted = data.map((item: any) => {
            const dhData = donhangMap.get(item.so_don_hang) || {};
            const isProcessed = dhData.isProcessed || item.donhanghienhuu.ten_phien_ban?.toUpperCase().includes('ĐÃ XUẤT HÓA ĐƠN');
            const isPaired = dhData.isPaired || (item.donhanghienhuu.so_vin && item.donhanghienhuu.so_vin !== 'N/A');
            
            // Replicate model parsing logic from Admin tab
            const full = item.donhanghienhuu.ten_phien_ban || '';
            let model = 'N/A';
            let version = full;

            const knownModels = ['VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'VFe34', 'VF e34', '6 ECO', 'Limo Green'];
            for (const m of knownModels) {
                if (full.toUpperCase().includes(m.toUpperCase())) {
                    model = m;
                    version = full.replace(new RegExp(m, 'gi'), '').trim() || 'Tiêu chuẩn';
                    break;
                }
            }

            if (model === 'N/A' && full) {
                const parts = full.split(' ');
                model = parts[0];
                version = parts.slice(1).join(' ') || 'Tiêu chuẩn';
            }

            return {
                id: item.id,
                so_don_hang: item.so_don_hang,
                tvbh_name: item.tvbh_name,
                ghi_chu: item.ghi_chu,
                status: item.status,
                created_at: item.created_at,
                khach_hang: item.donhanghienhuu.khach_hang_tiem_nang,
                ma_khach_hang: item.donhanghienhuu.ma_khach_hang,
                phien_ban: item.donhanghienhuu.ten_phien_ban,
                displayModel: model,
                displayVersion: version,
                ngoai_that: item.donhanghienhuu.mau_ngoai_that,
                noi_that: item.donhanghienhuu.mau_noi_that,
                ngay_giao_dich: item.donhanghienhuu.ngay_giao_dich,
                vin: dhData.vin || item.donhanghienhuu.so_vin,
                isProcessed,
                isPaired
            };
        }).filter((i: any) => !i.isProcessed && !i.isPaired);

        return { status: 'SUCCESS', data: formatted };
    } catch (e: any) {
        console.error("getBacklogOrders Error", e);
        return { status: 'ERROR', message: e.message };
    }
};

export const updateBacklogStatus = async (id: string, status: string, ghi_chu_admin?: string) => {
    try {
        const { error } = await supabase
            .from('donhang_ton')
            .update({ status, ghi_chu: ghi_chu_admin })
            .eq('id', id);

        if (error) throw error;
        return { status: 'SUCCESS', message: 'Cập nhật trạng thái thành công' };
    } catch (e: any) {
        console.error("updateBacklogStatus Error", e);
        return { status: 'ERROR', message: e.message };
    }
};

export const addRequest = async (formData: Record<string, string>, _chicFile: File) => {
    // ===== HOÀN TOÀN ĐỘC LẬP VỚI GOOGLE SHEETS =====
    // Mọi thao tác đều qua Supabase. Email được xử lý tự động bởi DB trigger.

    // Create a mutable copy of the form data to avoid side effects
    const payloadData: Record<string, string> = { ...formData };

    // --- BƯỚC MỚI: KIỂM TRA TRÙNG SỐ ĐƠN HÀNG TRÊN TOÀN HỆ THỐNG ---
    try {
        const soDonHang = payloadData.so_don_hang;
        
        // 1. Kiểm tra trong bảng đơn hàng hiện tại
        const { data: activeExists } = await supabase.from('donhang')
            .select('so_don_hang, ket_qua')
            .eq('so_don_hang', soDonHang)
            .maybeSingle();

        if (activeExists) {
            const status = activeExists.ket_qua || "";
            // CHỈ cho phép nếu trạng thái bắt đầu bằng "Đã hủy"
            if (!status.toLowerCase().startsWith('đã hủy')) {
                return { status: 'ERROR', message: `Số đơn hàng ${soDonHang} đang hoạt động (${status}). Không thể ghi đè.` };
            }
            console.log(`Phát hiện đơn hàng ${soDonHang} đã hủy. Chế độ: Ghi đè thông tin mới.`);
        }

        // 2. Kiểm tra trong kho lưu trữ (Archived) - Kho này chứa đơn ĐÃ XHĐ nên KHÔNG cho ghi đè
        const { data: archivedExists } = await supabase.from('archived_orders')
            .select('so_don_hang')
            .eq('so_don_hang', soDonHang)
            .maybeSingle();

        if (archivedExists) {
            return { status: 'ERROR', message: `Số đơn hàng ${soDonHang} đã tồn tại trong kho lưu trữ (Đã xuất HĐ). Không thể ghi đè dữ liệu lịch sử.` };
        }
    } catch (checkErr) {
        console.warn("Lỗi khi kiểm tra trùng số đơn hàng:", checkErr);
    }
    // -----------------------------------------------------------

    let ketQua = "Chưa ghép";
    let vinDk = null;
    let pairedTime = null;

    // Nếu lúc tạo đơn mà chọn luôn VIN (Giữ xe rồi ghép)
    if (payloadData.vin) {
        // --- KIỂM TRA MÃ DMS ---
        try {
            const { data: carData } = await supabase.from('khoxe')
                .select('ma_dms')
                .eq('vin', payloadData.vin)
                .single();
            
            if (carData && carData.ma_dms) {
                const orderPrefix = payloadData.so_don_hang.substring(0, 6).toUpperCase();
                const dmsUpperNode = carData.ma_dms.toUpperCase();
                if (orderPrefix !== dmsUpperNode) {
                    return { 
                        status: 'ERROR', 
                        message: `Mã DMS của xe (${dmsUpperNode}) không khớp với 6 ký tự đầu của Số đơn hàng (${orderPrefix}). Vui lòng kiểm tra lại.` 
                    };
                }
            }
        } catch (dmsErr) {
            console.error("DMS validation error:", dmsErr);
        }
        // -----------------------

        payloadData.vin_giu_yeu_cau = payloadData.vin;
        vinDk = payloadData.vin;
        ketQua = "Đã ghép"; // Tự động duyệt ngay lập tức
        pairedTime = new Date().toISOString();
        delete payloadData.vin;
    } else {
        // TỰ ĐỘNG GHÉP XE NGAY NẾU CÓ XE RẢNH
        try {
            const { data: availableCars } = await supabase.from('khoxe')
                .select('vin, noi_that, ma_dms') // Lấy thêm ma_dms
                .eq('trang_thai', 'Chưa ghép')
                .eq('dong_xe', payloadData.dong_xe)
                .eq('phien_ban', payloadData.phien_ban)
                .eq('ngoai_that', payloadData.ngoai_that)
                .order('ngay_nhap', { ascending: true });

            if (availableCars && availableCars.length > 0) {
                const normalize = (str?: string) => (str || '').toLowerCase().trim().normalize('NFC');
                const orderNoiThat = normalize(payloadData.noi_that);
                const orderPrefix = payloadData.so_don_hang.substring(0, 6).toUpperCase();

                const matchedCar = availableCars.find(car => {
                    const carNoiThat = normalize(car.noi_that);
                    const carDms = (car.ma_dms || '').toUpperCase();
                    
                    // --- ĐIỀU KIỆN GHÉP XE: Nội thất khớp VÀ Mã DMS khớp 6 ký tự đầu SĐH ---
                    const isNoiThatMatch = orderNoiThat.includes(carNoiThat) || carNoiThat.includes(orderNoiThat);
                    const isDmsMatch = carDms === orderPrefix;
                    
                    return isNoiThatMatch && isDmsMatch;
                });

                if (matchedCar) {
                    vinDk = matchedCar.vin;
                    ketQua = "Đã ghép";
                    pairedTime = new Date().toISOString();
                }
            }
        } catch (autoMatchErr) {
            console.error("Auto match Supabase error:", autoMatchErr);
        }
    }


    const nowISO = new Date().toISOString();

    // skip upload CHIC as requested
    let chicUrl: string | null = null;
    /*
    try {
        const sanitize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `chic/${payloadData.so_don_hang}_${Date.now()}_${sanitize(chicFile.name)}`;
        chicUrl = await uploadToSupabase(chicFile, storagePath);
    } catch (uploadErr) {
        console.error('CHIC file upload error:', uploadErr);
    }
    */

    // Ghi toàn bộ vào Supabase
    try {
        const insertPayload: Record<string, any> = {
            ten_tu_van_ban_hang: payloadData.ten_ban_hang,
            ten_khach_hang: payloadData.ten_khach_hang,
            dong_xe: payloadData.dong_xe,
            phien_ban: payloadData.phien_ban,
            ngoai_that: payloadData.ngoai_that,
            noi_that: payloadData.noi_that,
            so_don_hang: payloadData.so_don_hang,
            ngay_coc: payloadData.ngay_coc || null,
            thoi_gian_nhap: nowISO,
            ket_qua: ketQua,
            vin: vinDk,
            thoi_gian_ghep: pairedTime,
            thoi_gian_can_xe: payloadData.thoi_gian_can_xe || null,
        };

        const { error } = await supabase.from('donhang')
            .upsert(insertPayload, { onConflict: 'so_don_hang' });
            
        if (error) {
            console.error('Supabase addRequest process error:', error.message);
            throw error;
        }

        // CHỦ ĐỘNG GỌI ROBOT GỬI MAIL (Thay vì đợi Trigger)
        supabaseAdmin.functions.invoke('send-email', {
            body: { 
                actionId: ketQua === 'Đã ghép' ? 'match_success' : 'match_request_pending', 
                record: insertPayload 
            }
        }).then();

        // Thử patch url_chic riêng nếu có (bỏ qua nếu cột không tồn tại)
        if (chicUrl && payloadData.so_don_hang) {
            const { error: chicError } = await supabase.from('donhang')
                .update({ url_chic: chicUrl })
                .eq('so_don_hang', payloadData.so_don_hang);
            if (chicError) {
                console.warn('Không thể lưu url_chic (cột có thể chưa tồn tại):', chicError.message);
            }
        }

        // Nếu ghép xe ngay, cập nhật trạng thái xe trong kho
        if (vinDk) {
            await supabase.from('khoxe').update({
                trang_thai: 'Đã ghép',
                nguoi_giu_xe: payloadData.ten_ban_hang,
                thoi_gian_het_han_giu: 'Vô thời hạn',
                is_extension_requested: false
            }).eq('vin', vinDk);

            // Cập nhật lịch sử giữ xe: Đánh dấu là 'matched'
            await supabase.from('car_hold_activities')
                .update({ 
                    updated_at: nowISO,
                    status: 'matched'
                })
                .eq('vin', vinDk)
                .eq('status', 'active');

            // Xóa hàng chờ vì xe đã được ghép chính thức
            await supabase.from('car_hold_activities').delete().eq('vin', vinDk).eq('type', 'QUEUE');
        }

        await logAction('CREATE_ORDER', { ...insertPayload }, payloadData.so_don_hang, 'order');
        
        // --- ADDED ADMIN NOTIFICATION ---
        await createNotification({ 
            message: `TVBH ${payloadData.ten_ban_hang} đã tạo đơn hàng mới ${payloadData.so_don_hang} (Kết quả: ${ketQua}).`, 
            type: 'info', 
            recipient: 'ADMINS', 
            targetView: 'admin', 
            targetId: payloadData.so_don_hang 
        });
    } catch (err: any) {
        console.error('Supabase addRequest error:', err?.message || err);
        return { status: 'ERROR', message: `Lỗi khi tạo đơn hàng: ${err?.message || 'Không xác định'}` };
    }

    // Email xử lý tự động bởi DB trigger (match_request_pending / match_success)

    return {
        status: 'SUCCESS',
        message: 'Đã gửi yêu cầu thành công',
        newRecord: {
            'Tên tư vấn bán hàng': payloadData.ten_ban_hang,
            'Tên khách hàng': payloadData.ten_khach_hang,
            'Số đơn hàng': payloadData.so_don_hang,
            'Dòng xe': payloadData.dong_xe,
            'Phiên bản': payloadData.phien_ban,
            'Ngoại thất': payloadData.ngoai_that,
            'Nội thất': payloadData.noi_that,
            'Ngày cọc': payloadData.ngay_coc,
            'Thời gian nhập': nowISO,
            'Kết quả': ketQua,
            'VIN': vinDk || ''
        }
    };
};

export const pairVinToOrder = async (orderNumber: string, vin: string) => {
    const pairedBy = getStorageItem("currentConsultant") || "Unknown";
    const pairedTime = new Date().toISOString();

    // 1. Kiểm tra mã DMS
    try {
        const { data: carData } = await supabase.from('khoxe')
            .select('ma_dms')
            .eq('vin', vin)
            .single();

        if (carData && carData.ma_dms) {
            const orderPrefix = orderNumber.substring(0, 6).toUpperCase();
            const dmsUpperNode = carData.ma_dms.toUpperCase();
            if (orderPrefix !== dmsUpperNode) {
                return { 
                    status: 'ERROR', 
                    message: `Mã DMS của xe (${dmsUpperNode}) không khớp với 6 ký tự đầu của Số đơn hàng (${orderPrefix}). Vui lòng kiểm tra lại.` 
                };
            }
        }
    } catch (dmsErr) {
        console.error("DMS validation error in pairVinToOrder:", dmsErr);
    }

    // 2. Ghi Supabase
    try {
        await supabase.from('donhang').update({
            ket_qua: 'Đã ghép',
            vin: vin,
            thoi_gian_ghep: pairedTime
        }).eq('so_don_hang', orderNumber);

        // ĐỒNG BỘ: Cập nhật VIN sang bảng yeucauxhd nếu đã có yêu cầu XHĐ
        await supabase.from('yeucauxhd').update({
            vin: vin
        }).eq('so_don_hang', orderNumber);

        // 2.5 CẬP NHẬT ĐIỂM UY TÍN: Chuyển log giữ xe thành 'matched' cho TVBH của đơn hàng này
        const { data: orderData } = await supabase.from('donhang').select('ten_tu_van_ban_hang').eq('so_don_hang', orderNumber).single();
        if (orderData && orderData.ten_tu_van_ban_hang) {
             const tvbhUsername = orderData.ten_tu_van_ban_hang;
             
             // Tìm xem TVBH này có đang giữ xe này hay đang giữ bất kỳ xe nào khác không
             // Cách an toàn nhất để cộng điểm là ghi đè lịch sử active của xe này thành 'matched'
             // Hoặc tạo trực tiếp một bản ghi log 'matched' để đảm bảo TVBH nhận được điểm thưởng
             const { data: activeHold } = await supabase.from('car_hold_activities')
                 .select('id')
                 .eq('vin', vin)
                 .eq('status', 'active')
                 .single();
                 
             if (activeHold) {
                 await supabase.from('car_hold_activities').update({
                     updated_at: pairedTime,
                     status: 'matched' // Chuyển thành khớp xe để lấy +8 điểm
                 }).eq('id', activeHold.id);
             } else {
                 // Nếu xe này đang tự do (chưa ai giữ) mà Admin ghép thẳng, tạo 1 log ảo để thưởng
                 await supabase.from('car_hold_activities').insert({
                     vin: vin,
                     username: tvbhUsername,
                     tvbh_name: tvbhUsername,
                     type: 'HOLD',
                     status: 'matched',
                     created_at: pairedTime,
                     updated_at: pairedTime
                 });
             }
        }

        await supabase.from('khoxe').update({
            trang_thai: 'Đã ghép',
            nguoi_giu_xe: pairedBy, // Vẫn ghi nhận người ghép
            thoi_gian_het_han_giu: 'Vô thời hạn'
        }).eq('vin', vin);

        // Xóa hàng chờ vì xe đã được ghép chính thức
        await supabase.from('car_hold_activities').delete().eq('vin', vin).eq('type', 'QUEUE');

        // GỬI EMAIL THÔNG BÁO GHÉP XE THÀNH CÔNG
        // Gửi đầy đủ thông tin đơn hàng để Edge Function không cần lookup lại DB
        const { data: fullOrderForEmail } = await supabase.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
        supabaseAdmin.functions.invoke('send-email', {
            body: { 
                actionId: 'match_success', 
                record: fullOrderForEmail || { so_don_hang: orderNumber, vin } 
            }
        }).then();

        await logAction('PAIR_VIN', { orderNumber, vin }, orderNumber, 'order');

        // --- ADDED ADMIN NOTIFICATION ---
        await createNotification({ 
            message: `TVBH ${pairedBy} đã ghép xe ${vin} cho ĐH ${orderNumber}.`, 
            type: 'info', 
            recipient: 'ADMINS', 
            targetView: 'admin', 
            targetId: orderNumber 
        });
    } catch (e) {
        console.error("Supabase pairVin error:", e);
    }

    return { status: 'SUCCESS', message: 'Ghép xe thành công!' };
};



export const cancelRequest = async (orderNumber: string, reason: string, unmatchType: string = 'Hủy luôn đơn hàng (Hủy đơn)', thoiGianCanXe?: string) => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        const ketQuaMoi = unmatchType.includes('Chờ xe') ? 'Chưa ghép' : 'Đã hủy';
        const trimmedOrderNo = orderNumber.trim();

        // ========== BƯỚC 1: TÌM ĐƠN HÀNG ==========
        let order: any = null;
        
        // Exact match trước
        const { data: exactMatch } = await supabase.from('donhang')
            .select('*').eq('so_don_hang', trimmedOrderNo).maybeSingle();
        
        if (exactMatch) {
            order = exactMatch;
        } else {
            // Fallback: case-insensitive
            const { data: ilikeMatch } = await supabase.from('donhang')
                .select('*').ilike('so_don_hang', trimmedOrderNo).maybeSingle();
            order = ilikeMatch;
        }

        if (!order) {
            throw new Error(`Không tìm thấy đơn hàng "${trimmedOrderNo}" trong hệ thống.`);
        }

        console.log("Cancelling order:", order.so_don_hang, "| ID:", order.id, "| VIN:", order.vin || 'N/A');

        // ========== BƯỚC 2: TRẢ XE VỀ KHO (nếu có VIN) ==========
        if (order.vin) {
            const vin = order.vin;
            const { data: carConfig } = await supabaseAdmin.from('khoxe').select('dong_xe, phien_ban, ngoai_that, noi_that').eq('vin', vin).single();
            
            let autoMatched = false;
            if (carConfig) {
                autoMatched = await tryAutoMatchWaitingOrder(vin, carConfig);
            }

            if (!autoMatched) {
                await supabase.from('khoxe').update({
                    trang_thai: 'Chưa ghép',
                    nguoi_giu_xe: null,
                    thoi_gian_het_han_giu: null
                }).eq('vin', vin);
            }

            // Cập nhật uy tín (non-critical, không bỏ 'reason' để tránh 400 nếu cột chưa tồn tại)
            try {
                const { data: matchedHold } = await supabase.from('car_hold_activities')
                    .select('id')
                    .eq('vin', vin)
                    .in('status', ['matched', 'active'])
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                const holdStatus = ketQuaMoi === 'Đã hủy' ? 'order_cancelled' : 'unmatched';
                if (matchedHold) {
                    await supabase.from('car_hold_activities').update({
                        status: holdStatus,
                        updated_at: new Date().toISOString()
                    }).eq('id', matchedHold.id);
                } else {
                    await supabase.from('car_hold_activities').insert({
                        vin: order.vin,
                        username: currentUser,
                        tvbh_name: currentUser,
                        type: 'HOLD',
                        status: holdStatus,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
            } catch (holdErr) {
                console.warn("car_hold_activities update (non-critical):", holdErr);
            }
        }

        // ========== BƯỚC 3: GỬI EMAIL (trước khi xóa) ==========
        try {
            supabaseAdmin.functions.invoke('send-email', {
                body: { 
                    actionId: 'order_self_cancelled', 
                    record: { 
                        so_don_hang: order.so_don_hang, 
                        ten_ban_hang: order.ten_tu_van_ban_hang,
                        ten_khach_hang: order.ten_khach_hang,
                        dong_xe: order.dong_xe,
                        phien_ban: order.phien_ban,
                        ngoai_that: order.ngoai_that,
                        noi_that: order.noi_that,
                        vin: order.vin || 'N/A',
                        ghi_chu_huy: reason, 
                        is_waiting: (ketQuaMoi === 'Chưa ghép'),
                        status: ketQuaMoi 
                    } 
                }
            }).catch(e => console.warn("Email send failed (non-critical):", e));
        } catch (_) { /* ignore */ }

        // ========== BƯỚC 4: THỰC HIỆN HỦY/XÓA ==========
        if (ketQuaMoi === 'Đã hủy') {
            // === HỦY HẲN: XÓA TRỰC TIẾP bằng supabaseAdmin (KHÔNG qua RPC) ===
            console.log(`Direct DELETE order: id=${order.id}, so_don_hang=${order.so_don_hang}`);

            // Lưu snapshot trước khi xóa
            try {
                await supabaseAdmin.from('interactions').insert({
                    category: 'LOG',
                    type: 'CANCEL_REQUEST',
                    actor_id: currentUser,
                    actor_name: currentUser,
                    target_id: order.so_don_hang,
                    target_view: 'order',
                    message: `Hủy và xóa đơn hàng. Lý do: ${reason}`,
                    metadata: { reason, snapshot: order }
                });
            } catch (logErr) {
                console.warn("Interaction log failed (non-critical):", logErr);
            }

            // Xóa bản ghi liên quan (bỏ qua nếu không tồn tại)
            await supabaseAdmin.from('yeucauxhd').delete().eq('so_don_hang', order.so_don_hang);
            await supabaseAdmin.from('yeucauvc').delete().eq('so_don_hang', order.so_don_hang);

            // XÓA ĐƠN HÀNG CHÍNH — dùng ID chính xác từ DB
            const { error: deleteErr } = await supabaseAdmin.from('donhang').delete().eq('id', order.id);
            if (deleteErr) {
                console.error("donhang DELETE error:", deleteErr);
                throw new Error(`Lỗi xóa đơn hàng: ${deleteErr.message}`);
            }

            console.log("✅ Đã xóa đơn hàng thành công:", order.so_don_hang);

        } else {
            // === CHỜ XE (Unmatch): Chỉ update, không xóa ===
            const updatePayload: any = {
                ket_qua: ketQuaMoi,
                vin: null,
                thoi_gian_ghep: null
            };
            if (thoiGianCanXe) {
                updatePayload.thoi_gian_can_xe = thoiGianCanXe;
            }

            const { error: dhErr } = await supabase.from('donhang').update(updatePayload).eq('so_don_hang', trimmedOrderNo);
            if (dhErr) throw dhErr;

            // yeucauxhd update — non-critical
            const { error: ycxErr } = await supabase.from('yeucauxhd').update({ vin: null }).eq('so_don_hang', trimmedOrderNo);
            if (ycxErr) console.warn("yeucauxhd update (non-critical):", ycxErr.message);
        }
        
        await logAction('CANCEL_REQUEST', { orderNumber: order.so_don_hang, reason, ketQuaMoi }, order.so_don_hang, 'order');
        return { status: 'SUCCESS', message: 'Hủy yêu cầu thành công!' };

    } catch (e: any) {
        console.error("Supabase cancel error details:", e);
        throw new Error(e.message || 'Lỗi khi xử lý yêu cầu hủy trên hệ thống.');
    }
};

export const requestInvoice = async (
    orderNumber: string,
    contractFile: File,
    proposalFile: File,
    policy: string,
    commission: string,
    vpoint: string,
    orderData?: {
        ten_khach_hang?: string;
        tvbh?: string;
        vin?: string;
        dong_xe?: string;
        phien_ban?: string;
        ngoai_that?: string;
        noi_that?: string;
        ngay_coc?: string;
    },
    aiNote?: string,
    preProcessedPayloads?: { contract: any, proposal: any }
) => {
    const requestedBy = getStorageItem("currentConsultant") || "Unknown User";
    const now = new Date().toISOString();
    const timestamp = Date.now();

    // === BƯỚC 1: Upload file trực tiếp lên Supabase Storage (siêu nhanh, không base64) ===
    // Sanitize tên file: xóa dấu tiếng Việt, khoảng trắng, ký tự đặc biệt
    const sanitizeFileName = (name: string): string => {
        return name
            .normalize('NFD')                    // Tách dấu tiếng Việt ra
            .replace(/[\u0300-\u036f]/g, '')     // Xóa các dấu
            .replace(/[đĐ]/g, 'd')               // đ → d
            .replace(/\s+/g, '_')                // Khoảng trắng → gạch dưới
            .replace(/[^a-zA-Z0-9._\-]/g, '')   // Xóa ký tự lạ
            .toUpperCase();
    };

    const customerNameSafe = orderData?.ten_khach_hang ? sanitizeFileName(orderData.ten_khach_hang) : 'KH';
    const contractExt = contractFile.name.split('.').pop();
    const proposalExt = proposalFile.name.split('.').pop();

    const contractPath = `${orderNumber}/HDMB_${customerNameSafe}_${timestamp}.${contractExt}`;
    const proposalPath = `${orderNumber}/DNXHD_${customerNameSafe}_${timestamp}.${proposalExt}`;

    const [contractUpload, proposalUpload] = await Promise.all([
        supabaseAdmin.storage.from('yeucauxhd-files').upload(contractPath, contractFile, { upsert: true }),
        supabaseAdmin.storage.from('yeucauxhd-files').upload(proposalPath, proposalFile, { upsert: true }),
    ]);


    if (contractUpload.error) throw new Error(`Lỗi upload Hợp đồng: ${contractUpload.error.message}`);
    if (proposalUpload.error) throw new Error(`Lỗi upload Đề nghị XHĐ: ${proposalUpload.error.message}`);

    // Lấy public URL của file
    const { data: contractUrlData } = supabase.storage.from('yeucauxhd-files').getPublicUrl(contractPath);
    const { data: proposalUrlData } = supabase.storage.from('yeucauxhd-files').getPublicUrl(proposalPath);

    const urlHopDong = contractUrlData.publicUrl;
    const urlDeNghi = proposalUrlData.publicUrl;

    // === BƯỚC 2: Tra cứu số máy (so_may) từ nhiều nguồn theo VIN ===
    let soMay = '';
    let vinToLookup = orderData?.vin;

    // Nếu lúc gửi chưa có VIN trong orderData, thử lấy từ bảng đơn hàng hiện tại
    if (!vinToLookup) {
        const { data: orderRec } = await supabase.from('donhang').select('vin').eq('so_don_hang', orderNumber).single();
        if (orderRec?.vin) vinToLookup = orderRec.vin;
    }

    if (vinToLookup) {
        const cleanVin = vinToLookup.trim().toUpperCase();
        
        // Luôn ưu tiên lấy từ kho xe trước (dữ liệu mới nhất)
        const { data: khoxeData } = await supabase.from('khoxe').select('so_may').eq('vin', cleanVin).maybeSingle();
        if (khoxeData?.so_may) {
            soMay = khoxeData.so_may;
        } else {
            // Sau đó mới tra trong bảng thông tin xe tổng hợp
            const { data: vinData } = await supabase
                .from('thongtinxe')
                .select('so_may')
                .eq('vin', cleanVin)
                .maybeSingle();
            soMay = vinData?.so_may || '';
        }
    }

    // === BƯỚC 3: Insert vào bảng yeucauxhd Supabase NGAY LẬP TỨC với đầy đủ thông tin ===
    const supabaseRow = {
        so_don_hang: orderNumber,
        ten_khach_hang: orderData?.ten_khach_hang || '',
        tvbh: orderData?.tvbh || requestedBy,
        dong_xe: orderData?.dong_xe || '',
        phien_ban: orderData?.phien_ban || '',
        ngoai_that: orderData?.ngoai_that || '',
        noi_that: orderData?.noi_that || '',
        ngay_coc: orderData?.ngay_coc || null,
        ngay_yeu_cau: now,
        chinh_sach: policy || '',
        hoa_hong_ung: commission || '',
        vpoint: vpoint || '',
        url_hop_dong: urlHopDong,
        url_de_nghi_xhd: urlDeNghi,
        so_may: soMay,
        vin: vinToLookup || '',         // SỐ VIN (Sử dụng VIN đã tìm được)
        ngay_xuat_hoa_don: null,           // NGÀY XUẤT HÓA ĐƠN (sẽ điền sau)
        ket_qua_gui_mail: '',              // KẾT QUẢ GỬI MAIL
        url_hoa_don_da_xuat: '',           // URL Hóa Đơn Đã Xuất
        trang_thai_vc: '',                 // Trạng thái VC
        ghi_chu_ai: aiNote || '',
    };

    const { error: insertError } = await supabaseAdmin.from('yeucauxhd').insert([supabaseRow]);
    if (insertError) throw new Error(`Lỗi lưu Supabase: ${insertError.message}`);

    // Cập nhật trạng thái đơn hàng trên Supabase
    const { error: updateOrderErr } = await supabaseAdmin.from('donhang')
        .update({ ket_qua: 'Chờ phê duyệt' })
        .eq('so_don_hang', orderNumber);
    if (updateOrderErr) throw new Error(`Lỗi cập nhật đơn hàng: ${updateOrderErr.message}`);
    await logAction('REQUEST_INVOICE', { orderNumber, policy, commission, vpoint, aiNote }, orderNumber, 'order');

    // --- ADDED ADMIN NOTIFICATION ---
    await createNotification({ 
        message: `TVBH đã yêu cầu xuất hóa đơn cho đơn hàng ${orderNumber}.`, 
        type: 'info', 
        recipient: 'ADMINS', 
        targetView: 'admin', 
        targetId: orderNumber 
    });

    // --- GỬI EMAIL XÁC NHẬN YÊU CẦU XHĐ CHO TVBH ---
    try {
        supabaseAdmin.functions.invoke('send-email', {
            body: {
                actionId: 'invoice_request_submitted',
                record: {
                    so_don_hang: orderNumber,
                    ten_ban_hang: orderData?.tvbh || requestedBy,
                    ten_khach_hang: orderData?.ten_khach_hang,
                    vin: orderData?.vin || vinToLookup,
                    policy: policy,
                    commission: commission,
                    vpoint: vpoint,
                }
            }
        }).catch(e => console.warn('Lỗi gửi mail invoice_request_submitted:', e));
    } catch (_) { /* ignore */ }

    // Xóa xe khỏi Kho khi bắt đầu dính vào yêu cầu xuất hóa đơn
    const targetVin = orderData?.vin || vinToLookup;
    if (targetVin) {
        const { error: deleteCarErr } = await supabaseAdmin.from('khoxe').delete().eq('vin', targetVin);
        if (deleteCarErr) console.error('Sync khoxe delete error:', deleteCarErr);
    }

    // === BƯỚC 4: Kích hoạt KIỂM TOÁN AI CHẠY NGẦM (Background Audit) ===
    const triggerBackgroundAudit = async () => {
        try {
            console.log(`[BackgroundAudit] Starting for ${orderNumber}...`);
            
            // Nếu có payloads từ trình duyệt (đã tách trang và upload ảnh), dùng chúng để AI quét nhanh và nhẹ hơn
            const aiFiles = (preProcessedPayloads && preProcessedPayloads.contract?.payload && preProcessedPayloads.proposal?.payload) 
                ? [
                    ...preProcessedPayloads.contract.payload.map((p: any) => ({ url: p.url, mimeType: p.mimeType, fileName: 'HDMB_Page' })),
                    ...preProcessedPayloads.proposal.payload.map((p: any) => ({ url: p.url, mimeType: p.mimeType, fileName: 'DNXHD_Page' }))
                ]
                : [
                    { url: urlHopDong, mimeType: contractFile.type, fileName: contractFile.name },
                    { url: urlDeNghi, mimeType: proposalFile.type, fileName: proposalFile.name }
                ];

            const { data: aiResult, error: aiError } = await supabaseAdmin.functions.invoke('scan-pdf', {
                body: {
                    files: aiFiles,
                    orderData: {
                        "Số đơn hàng": orderNumber,
                        "Tên khách hàng": orderData?.ten_khach_hang,
                        "Dòng xe": orderData?.dong_xe,
                        "Phiên bản": orderData?.phien_ban,
                        "VIN": orderData?.vin || vinToLookup
                    }
                }
            });

            if (aiError) throw aiError;

            // Cập nhật kết quả AI vào database
            let note = '';
            if (aiResult?.success && aiResult?.data) {
                const data = aiResult.data;
                if (data.canh_bao_sai_lech && data.canh_bao_sai_lech !== 'Không có') {
                    note = `⚠️ AI CẢNH BÁO: ${data.canh_bao_sai_lech}`;
                    
                    // Gửi thông báo RIÊNG cho Admin nếu có sai sót
                    createNotification({
                        message: `AI phát hiện sai sót trong hồ sơ ĐH ${orderNumber}: ${data.canh_bao_sai_lech}`,
                        type: 'error',
                        recipient: 'ADMINS',
                        targetView: 'admin',
                        targetId: orderNumber
                    }).catch(e => console.error("Notify error:", e));
                } else {
                    note = `✅ AI: Hồ sơ khớp 100%.`;
                }

                await supabaseAdmin.from('yeucauxhd')
                    .update({ ghi_chu_ai: note })
                    .eq('so_don_hang', orderNumber);
                
                console.log(`[BackgroundAudit] Completed for ${orderNumber}`);
            }
        } catch (e) {
            console.error(`[BackgroundAudit] Failed for ${orderNumber}:`, e);
        }
    };

    // BẮN VÀ QUÊN (Fire and forget)
    triggerBackgroundAudit();

    return { status: 'SUCCESS', message: `Đã gửi yêu cầu xuất hóa đơn cho đơn hàng ${orderNumber} thành công! Hệ thống đang kiểm tra hồ sơ chạy ngầm.` };
};


export const uploadSupplementaryFiles = async (orderNumber: string, contractFile: File | null, proposalFile: File | null, _aiNote?: string) => {
    // 1. Lấy URL file cũ từ yeucauxhd để xóa sau
    const { data: existing } = await supabase
        .from('yeucauxhd')
        .select('url_hop_dong, url_de_nghi_xhd, ten_khach_hang')
        .eq('so_don_hang', orderNumber)
        .single();

    // Hàm trích xuất storage path từ public URL
    const extractStoragePath = (publicUrl: string): string | null => {
        try {
            // Public URL dạng: .../storage/v1/object/public/yeucauxhd-files/PATH
            const marker = '/yeucauxhd-files/';
            const idx = publicUrl.indexOf(marker);
            if (idx === -1) return null;
            return decodeURIComponent(publicUrl.substring(idx + marker.length));
        } catch {
            return null;
        }
    };

    const sanitizeFileName = (name: string): string => {
        return name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9._\-]/g, '')
            .toUpperCase();
    };

    const customerNameSafe = existing?.ten_khach_hang ? sanitizeFileName(existing.ten_khach_hang) : 'KH';

    // 2. Upload file mới & xóa file cũ (nếu file đó được bổ sung)
    let urlHopDong = '';
    let urlDeNghi = '';
    const timestamp = Date.now();

    try {
        if (contractFile) {
            // Xóa file cũ trước
            if (existing?.url_hop_dong) {
                const oldPath = extractStoragePath(existing.url_hop_dong);
                if (oldPath) {
                    try {
                        const { error } = await supabaseAdmin.storage.from('yeucauxhd-files').remove([oldPath]);
                        if (error) console.warn('SupabaseAdmin delete error:', error);
                    } catch (e) {
                        console.error('Không thể xóa file cũ (hợp đồng) trên Supabase:', e);
                    }
                }
            }
            // Upload file mới
            const ext = contractFile.name.split('.').pop();
            const newPath = `${orderNumber}/HDMB_${customerNameSafe}_supp_${timestamp}.${ext}`;
            urlHopDong = await uploadToSupabase(contractFile, newPath);
        }
        if (proposalFile) {
            // Xóa file cũ trước
            if (existing?.url_de_nghi_xhd) {
                const oldPath = extractStoragePath(existing.url_de_nghi_xhd);
                if (oldPath) {
                    try {
                        const { error } = await supabaseAdmin.storage.from('yeucauxhd-files').remove([oldPath]);
                        if (error) console.warn('SupabaseAdmin delete error:', error);
                    } catch (e) {
                        console.error('Không thể xóa file cũ (đề nghị) trên Supabase:', e);
                    }
                }
            }
            // Upload file mới
            const ext = proposalFile.name.split('.').pop();
            const newPath = `${orderNumber}/DNXHD_${customerNameSafe}_supp_${timestamp}.${ext}`;
            urlDeNghi = await uploadToSupabase(proposalFile, newPath);
        }
    } catch (e) {
        console.error("Supabase Storage upload error (supplementary):", e);
        throw e;
    }

    // 3. Cập nhật bảng yeucauxhd trên Supabase
    const updateData: any = {};
    if (urlHopDong) updateData.url_hop_dong = urlHopDong;
    if (urlDeNghi) updateData.url_de_nghi_xhd = urlDeNghi;

    // Cập nhật trạng thái 'Đã bổ sung' cho cả 2 bảng
    updateData.trang_thai_vc = 'Đã bổ sung';
    
    await supabaseAdmin.from('yeucauxhd').update(updateData).eq('so_don_hang', orderNumber);
    await supabaseAdmin.from('donhang').update({ ket_qua: 'Đã bổ sung' }).eq('so_don_hang', orderNumber);

    // === BƯỚC 4: KIỂM TOÁN AI CHẠY NGẦM SAU KHI BỔ SUNG ===
    const triggerBackgroundAudit = async () => {
        try {
            console.log(`[BackgroundAudit-Supplement] Starting for ${orderNumber}...`);
            
            // Lấy thông tin đơn hàng để AI đối chiếu
            const { data: orderData } = await supabaseAdmin.from('donhang')
                .select('ten_khach_hang, dong_xe, phien_ban, vin')
                .eq('so_don_hang', orderNumber)
                .single();

            // Sử dụng URL mới nếu có, nếu không thì dùng URL cũ đã có sẵn
            const finalUrlHopDong = urlHopDong || existing?.url_hop_dong;
            const finalUrlDeNghi = urlDeNghi || existing?.url_de_nghi_xhd;

            if (!finalUrlHopDong || !finalUrlDeNghi) {
                console.warn("[BackgroundAudit-Supplement] Missing one or both files, skipping AI scan.");
                return;
            }

            const { data: aiResult, error: aiError } = await supabaseAdmin.functions.invoke('scan-pdf', {
                body: {
                    files: [
                        { url: finalUrlHopDong, mimeType: 'application/pdf', fileName: 'HDMB.pdf' },
                        { url: finalUrlDeNghi, mimeType: 'application/pdf', fileName: 'DNXHD.pdf' }
                    ],
                    orderData: {
                        "Số đơn hàng": orderNumber,
                        "Tên khách hàng": orderData?.ten_khach_hang,
                        "Dòng xe": orderData?.dong_xe,
                        "Phiên bản": orderData?.phien_ban,
                        "VIN": orderData?.vin
                    }
                }
            });

            if (aiError) throw aiError;

            // Cập nhật kết quả AI vào database
            let note = '';
            if (aiResult?.success && aiResult?.data) {
                const data = aiResult.data;
                if (data.canh_bao_sai_lech && data.canh_bao_sai_lech !== 'Không có') {
                    note = `⚠️ AI CẢNH BÁO (BẢN BỔ SUNG): ${data.canh_bao_sai_lech}`;
                    
                    // Gửi thông báo RIÊNG cho Admin nếu bản bổ sung vẫn sai
                    createNotification({
                        message: `AI phát hiện SAI SÓT trong bản BỔ SUNG của ĐH ${orderNumber}: ${data.canh_bao_sai_lech}`,
                        type: 'error',
                        recipient: 'ADMINS',
                        targetView: 'admin',
                        targetId: orderNumber
                    }).catch(e => console.error("Notify error:", e));
                } else {
                    note = `✅ AI: Bản bổ sung đã khớp 100%.`;
                }

                await supabaseAdmin.from('yeucauxhd')
                    .update({ ghi_chu_ai: note })
                    .eq('so_don_hang', orderNumber);
                
                console.log(`[BackgroundAudit-Supplement] Completed for ${orderNumber}`);
            }
        } catch (e) {
            console.error(`[BackgroundAudit-Supplement] Failed for ${orderNumber}:`, e);
        }
    };

    // BẮN VÀ QUÊN
    triggerBackgroundAudit();

    // Bắn email báo xác nhận Biên nhận hồ sơ đồng bộ qua Edge Function
    let filesInfo = [];
    if (urlHopDong) filesInfo.push("Hợp đồng mua bán");
    if (urlDeNghi) filesInfo.push("Đề nghị XHĐ");

    const { data: updatedRecord } = await supabaseAdmin.from('yeucauxhd').select('*').eq('so_don_hang', orderNumber).single();

    try {
        supabaseAdmin.functions.invoke('send-email', {
            body: {
                actionId: 'invoice_supplement_submitted',
                record: { ...updatedRecord, filesInfo: filesInfo.join(', ') }
            }
        }).catch(e => console.warn('Lỗi gọi gửi email biên nhận qua Edge Function:', e));
    } catch(e) {
        console.warn('Lỗi khối try-catch biên nhận:', e);
    }

    await logAction('SUPPLEMENT_FILES', { orderNumber }, orderNumber, 'order');

    // --- ADDED ADMIN NOTIFICATION ---
    await createNotification({ 
        message: `Hồ sơ bổ sung cho đơn hàng ${orderNumber} đã được tải lên.`, 
        type: 'info', 
        recipient: 'ADMINS', 
        targetView: 'admin', 
        targetId: orderNumber 
    });

    return { status: 'SUCCESS', message: 'Đã bổ sung hồ sơ thành công (file cũ đã tự động xóa).' };
};
export const updateOrderDetails = async (orderNumber: string, details: Partial<Order>): Promise<ApiResult> => {
    try {
        let matchedVin: string | null = null;

        // 1. Luôn thử ghép nếu đơn hàng đang ở trạng thái 'Chưa ghép' hoặc cấu hình có thay đổi
        const { data: currentOrder } = await supabase.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
        const isUnmatched = currentOrder && currentOrder.ket_qua === 'Chưa ghép' && !currentOrder.vin;

        const criticalFieldsChanged = !!(details["Dòng xe"] || details["Phiên bản"] || details["Ngoại thất"] || details["Nội thất"]);
        if (currentOrder && (criticalFieldsChanged || isUnmatched)) {
            const dongXe = details["Dòng xe"] || currentOrder.dong_xe;
            const phienBan = details["Phiên bản"] || currentOrder.phien_ban;
            const ngoaiThat = details["Ngoại thất"] || currentOrder.ngoai_that;
            const noiThat = details["Nội thất"] || currentOrder.noi_that;

            // Tìm xe Chưa ghép trong kho phù hợp nhất (FIFO)
            const { data: matchedCars } = await supabase.from('khoxe')
                .select('vin')
                .eq('trang_thai', 'Chưa ghép')
                .eq('dong_xe', dongXe)
                .eq('phien_ban', phienBan)
                .eq('ngoai_that', ngoaiThat)
                .eq('noi_that', noiThat)
                .order('ngay_nhap', { ascending: true })
                .limit(1);

            if (matchedCars && matchedCars.length > 0) {
                matchedVin = matchedCars[0].vin;
            }
        }

        // 2. Cập nhật Supabase (siêu nhanh, dưới 100ms)
        const updateData: any = {};
        if (details["Tên khách hàng"]) updateData.ten_khach_hang = details["Tên khách hàng"];
        if (details["Số đơn hàng"]) updateData.so_don_hang = details["Số đơn hàng"];
        if (details["Dòng xe"]) updateData.dong_xe = details["Dòng xe"];
        if (details["Phiên bản"]) updateData.phien_ban = details["Phiên bản"];
        if (details["Ngoại thất"]) updateData.ngoai_that = details["Ngoại thất"];
        if (details["Nội thất"]) updateData.noi_that = details["Nội thất"];
        if (details["Ngày cọc"]) updateData.ngay_coc = details["Ngày cọc"];
        if (details["Tên tư vấn bán hàng"]) updateData.ten_tu_van_ban_hang = details["Tên tư vấn bán hàng"];

        if (matchedVin) {
            updateData.vin = matchedVin;
            updateData.ket_qua = 'Đã ghép';
            updateData.thoi_gian_ghep = new Date().toISOString();
        }

        if (Object.keys(updateData).length > 0) {
            const { error: donhangError } = await supabase
                .from('donhang')
                .update(updateData)
                .eq('so_don_hang', orderNumber);
            if (donhangError) throw donhangError;

            // ĐỒNG BỘ: Cập nhật sang bảng yeucauxhd nếu tồn tại
            const yeuUpdate: any = { ...updateData };
            // Map tên cột khác nhau
            if (yeuUpdate.ten_tu_van_ban_hang) {
                yeuUpdate.tvbh = yeuUpdate.ten_tu_van_ban_hang;
                delete yeuUpdate.ten_tu_van_ban_hang;
            }
            
            await supabase.from('yeucauxhd').update(yeuUpdate).eq('so_don_hang', orderNumber);
        }

        if (matchedVin) {
            // Cập nhật khóa xe
            const { error: khoxeError } = await supabase
                .from('khoxe')
                .update({ trang_thai: 'Đã ghép' })
                .eq('vin', matchedVin);
            if (khoxeError) throw khoxeError;

            // Xóa hàng chờ vì xe đã được ghép chính thức
            await supabase.from('car_hold_activities').delete().eq('vin', matchedVin).eq('type', 'QUEUE');
        }

        // CHỦ ĐỘNG GỌI ROBOT THÔNG BÁO GÁN VIN TỰ ĐỘNG
        if (matchedVin) {
             const { data: fullOrder } = await supabase.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
             supabaseAdmin.functions.invoke('send-email', {
                 body: { 
                     actionId: 'match_success', 
                     record: fullOrder || { so_don_hang: orderNumber, vin: matchedVin, ...updateData } 
                 }
             }).then();
        }

        return {
            status: 'SUCCESS',
            message: matchedVin ? `Cập nhật thành công! Mối nối tự động ghép với VIN: ${matchedVin}` : "Cập nhật thông tin đơn hàng thành công.",
            autoMatched: !!matchedVin,
            vin: matchedVin
        };

    } catch (e: any) {
        console.error("Supabase updateOrderDetails error:", e);
        throw new Error(e.message || "Lỗi khi cập nhật");
    }
};

/**
 * [MỚI] Siêu chỉnh sửa dành cho Admin
 * Đồng bộ hóa dữ liệu trên tất cả các bảng: donhang, yeucauxhd, yeucauvc, archived_orders
 */
export const superUpdateOrderDetails = async (oldOrderNumber: string, details: any): Promise<ApiResult> => {
    try {
        const orderId = String(oldOrderNumber || '').trim();
        if (!orderId) throw new Error("Mã đơn hàng không hợp lệ.");

        console.log(`[SUPER EDIT] Starting for ${orderId}`, details);

        // 1. Lấy thông tin hiện tại để xử lý logic VIN
        const { data: currentOrder, error: fetchError } = await supabase
            .from('donhang')
            .select('*')
            .eq('so_don_hang', orderId)
            .maybeSingle();

        if (fetchError) throw new Error(`Lỗi khi kiểm tra đơn hàng: ${fetchError.message}`);
        if (!currentOrder) throw new Error(`Không thấy đơn hàng ${orderId} trong hệ thống 'donhang'.`);

        const oldVin = currentOrder.vin;
        const newVin = details['VIN'] || details['vin'];
        const isVinChanged = newVin !== undefined && newVin !== oldVin;

        // 2. Chuẩn bị dữ liệu map cho từng bảng
        const mappings = {
            donhang: {
                ten_tu_van_ban_hang: details['Tên tư vấn bán hàng'],
                ten_khach_hang: details['Tên khách hàng'],
                so_don_hang: details['Số đơn hàng'],
                dong_xe: details['Dòng xe'],
                phien_ban: details['Phiên bản'],
                ngoai_that: details['Ngoại thất'],
                noi_that: details['Nội thất'],
                vin: details['VIN'],
                so_may: details['Số máy'] || details['SỐ MÁY'],
                ma_dms: details['Mã DMS'],
                ngay_coc: details['Ngày cọc'],
                ket_qua: details['Kết quả'],
                trang_thai_vc: details['Trạng thái VC'],
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'],
                link_hoa_don_da_xuat: details['LinkHoaDonDaXuat'],
                thoi_gian_can_xe: details['Thời gian cần xe'] || details['thoi_gian_can_xe']
            },
            yeucauxhd: {
                so_don_hang: details['Số đơn hàng'],
                ten_khach_hang: details['Tên khách hàng'],
                tvbh: details['Tên tư vấn bán hàng'],
                dong_xe: details['Dòng xe'],
                phien_ban: details['Phiên bản'],
                ngoai_that: details['Ngoại thất'],
                noi_that: details['Nội thất'],
                vin: details['VIN'],
                so_may: details['Số máy'] || details['SỐ MÁY'],
                ngay_coc: details['Ngày cọc'],
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'],
                url_hoa_don_da_xuat: details['LinkHoaDonDaXuat'],
                thoi_gian_can_xe: details['Thời gian cần xe'] || details['thoi_gian_can_xe']
            },
            yeucauvc: {
                so_don_hang: details['Số đơn hàng'],
                ten_khach_hang: details['Tên khách hàng'],
                vin: details['VIN']
            },
            archived_orders: {
                so_don_hang: details['Số đơn hàng'] || details['SỐ ĐƠN HÀNG'],
                ten_khach_hang: details['Tên khách hàng'],
                vin: details['VIN'] || details['SỐ VIN'],
                so_may: details['Số máy'] || details['SỐ MÁY'],
                dong_xe: details['Dòng xe'],
                phien_ban: details['Phiên bản'],
                ngoai_that: details['Ngoại thất'],
                noi_that: details['Nội thất'],
                tvbh: details['Tên tư vấn bán hàng'],
                ngay_coc: details['Ngày cọc'],
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'] || details['NGÀY XUẤT HÓA ĐƠN'],
                url_hoa_don_da_xuat: details['LinkHoaDonDaXuat'],
                trang_thai_vc: details['Trạng thái VC']
            }
        };

        // Lọc các giá trị undefined và chuẩn hóa chuỗi rỗng thành null để tránh lỗi Postgres (đặc biệt là cột timestamp)
        const cleanData = (obj: any) => {
            const result: any = {};
            Object.keys(obj).forEach(key => {
                if (obj[key] === undefined) return;
                
                const val = obj[key];
                if (typeof val === 'string' && val.trim() === '') {
                    result[key] = null;
                } else {
                    result[key] = val;
                }
            });
            return result;
        };

        const donhangUpdate = cleanData(mappings.donhang);
        const yeucauxhdUpdate = cleanData(mappings.yeucauxhd);
        const yeucauvcUpdate = cleanData(mappings.yeucauvc);
        const archivedUpdate = cleanData(mappings.archived_orders);

        // 3. Thực hiện Update
        const updates = [];

        if (Object.keys(donhangUpdate).length > 0) {
            updates.push(supabase.from('donhang').update(donhangUpdate).eq('so_don_hang', orderId));
        }

        if (Object.keys(yeucauxhdUpdate).length > 0) {
            updates.push(supabase.from('yeucauxhd').update(yeucauxhdUpdate).eq('so_don_hang', orderId));
        }

        if (Object.keys(yeucauvcUpdate).length > 0) {
            updates.push(supabase.from('yeucauvc').update(yeucauvcUpdate).eq('so_don_hang', orderId));
        }

        if (Object.keys(archivedUpdate).length > 0) {
            updates.push(supabase.from('archived_orders').update(archivedUpdate).eq('so_don_hang', orderId));
        }

        // 4. Xử lý logic Kho xe nếu có VIN
        const currentVin = newVin || oldVin;
        if (currentVin && currentVin !== 'N/A' && currentVin !== '') {
            const khoxeUpdate = cleanData({
                dong_xe: details['Dòng xe'],
                phien_ban: details['Phiên bản'],
                ngoai_that: details['Ngoại thất'],
                noi_that: details['Nội thất'],
                so_may: details['Số máy'] || details['SỐ MÁY'],
                ma_dms: details['Mã DMS']
            });
            if (Object.keys(khoxeUpdate).length > 0) {
                updates.push(supabase.from('khoxe').update(khoxeUpdate).eq('vin', currentVin));
            }
        }

        // 4b. Xử lý logic Ghép/Nhả xe nếu VIN thay đổi
        if (isVinChanged) {
            // Nhả xe cũ
            if (oldVin && oldVin !== 'N/A' && oldVin !== '') {
                updates.push(supabase.from('khoxe').update({
                    trang_thai: 'Chưa ghép',
                    nguoi_giu_xe: null,
                    thoi_gian_het_han_giu: null
                }).eq('vin', oldVin));
            }

            // Gắn xe mới
            if (newVin && newVin !== 'N/A' && newVin !== '') {
                const tvbh = details['Tên tư vấn bán hàng'] || currentOrder.ten_tu_van_ban_hang;
                updates.push(supabase.from('khoxe').update({
                    trang_thai: 'Đã ghép',
                    nguoi_giu_xe: tvbh,
                    thoi_gian_het_han_giu: 'Vô thời hạn'
                }).eq('vin', newVin));

                // Xóa hàng chờ cho VIN mới
                updates.push(supabase.from('car_hold_activities').delete().eq('vin', newVin).eq('type', 'QUEUE'));
            }
        }
        
        // 5. Cập nhật uy tín nếu trạng thái chuyển sang 'Đã xuất hóa đơn'
        if (donhangUpdate.ket_qua === 'Đã xuất hóa đơn') {
            const vinToInvoice = donhangUpdate.vin || oldVin;
            if (vinToInvoice && vinToInvoice !== 'N/A') {
                updates.push(supabase.from('car_hold_activities')
                    .update({ status: 'invoiced' })
                    .eq('vin', vinToInvoice)
                    .eq('status', 'matched'));
                
                // Đánh dấu kho xe là đã bán
                updates.push(supabase.from('khoxe').update({ trang_thai: 'Đã bán' }).eq('vin', vinToInvoice));
            }
        }

        const subResults = [];
        for (const updateQuery of updates) {
            const res = await updateQuery;
            subResults.push(res);
            if (res.error) break; // Dừng lại ngay nếu có lỗi để tránh lỗi dây chuyền
        }
        
        // Kiểm tra lỗi trong các kết quả con
        const subErrors = subResults.filter(r => r.error).map(r => r.error?.message);
        if (subErrors.length > 0) {
            console.error("[SUPER EDIT] Sync errors:", subErrors);
            throw new Error(`Đã xảy ra lỗi đồng bộ: ${subErrors.join('; ')}`);
        }

        await logAction('SUPER_EDIT', { oldOrderNumber, details }, details['Số đơn hàng'] || oldOrderNumber, 'admin');

        return {
            status: 'SUCCESS',
            message: 'Siêu chỉnh sửa và đồng bộ dữ liệu thành công.'
        };

    } catch (e: any) {
        console.error("Supabase superUpdateOrderDetails error:", e);
        throw new Error(e.message || "Lỗi khi thực hiện siêu chỉnh sửa");
    }
};



export const changeOrderConfiguration = async (orderNumber: string, newConfig: Partial<Order>): Promise<ApiResult> => {
    try {
        // 1. Lấy thông tin đơn hàng hiện tại để kiểm tra VIN
        const { data: order, error: fetchErr } = await supabase
            .from('donhang')
            .select('*')
            .eq('so_don_hang', orderNumber)
            .single();

        if (fetchErr) throw fetchErr;

        // 2. Nếu đã ghép xe, thực hiện nhả xe (Release VIN)
        if (order.vin) {
            const { error: releaseErr } = await supabase
                .from('khoxe')
                .update({
                    trang_thai: 'Chưa ghép',
                    nguoi_giu_xe: null,
                    thoi_gian_het_han_giu: null
                })
                .eq('vin', order.vin);
            
            if (releaseErr) console.error("Error releasing VIN:", releaseErr);
        }

        // 3. Chuẩn bị dữ liệu cập nhật cho đơn hàng
        const updateData: any = {
            dong_xe: newConfig["Dòng xe"],
            phien_ban: newConfig["Phiên bản"],
            ngoai_that: newConfig["Ngoại thất"],
            noi_that: newConfig["Nội thất"],
            vin: null, // Reset VIN
            ket_qua: 'Chưa ghép', // Đưa về trạng thái chưa ghép để hệ thống hoặc admin ghép lại
            thoi_gian_ghep: null
        };

        // 4. Thực hiện cập nhật đơn hàng
        const { error: updateErr } = await supabase
            .from('donhang')
            .update(updateData)
            .eq('so_don_hang', orderNumber);

        if (updateErr) throw updateErr;

        // ĐỒNG BỘ: Cập nhật sang bảng yeucauxhd nếu tồn tại
        const yeuUpdate = {
            dong_xe: updateData.dong_xe,
            phien_ban: updateData.phien_ban,
            ngoai_that: updateData.ngoai_that,
            noi_that: updateData.noi_that,
            vin: ''
        };
        await supabase.from('yeucauxhd').update(yeuUpdate).eq('so_don_hang', orderNumber);

        // 5. Thử ghép xe tự động ngay lập tức với cấu hình mới
        // (Tận dụng logic tương tự updateOrderDetails)
        const { data: matchedCars } = await supabase.from('khoxe')
            .select('vin')
            .eq('trang_thai', 'Chưa ghép')
            .eq('dong_xe', updateData.dong_xe)
            .eq('phien_ban', updateData.phien_ban)
            .eq('ngoai_that', updateData.ngoai_that)
            .eq('noi_that', updateData.noi_that)
            .order('ngay_nhap', { ascending: true })
            .limit(1);

        let finalMessage = "Đã thay đổi cấu hình xe thành công.";
        let autoMatched = false;
        let finalVin = null;

        if (matchedCars && matchedCars.length > 0) {
            const newVin = matchedCars[0].vin;
            await supabase.from('donhang').update({
                vin: newVin,
                ket_qua: 'Đã ghép',
                thoi_gian_ghep: new Date().toISOString()
            }).eq('so_don_hang', orderNumber);

            await supabase.from('khoxe').update({ trang_thai: 'Đã ghép' }).eq('vin', newVin);
            
            // Xóa hàng chờ vì xe đã được ghép chính thức
            await supabase.from('car_hold_activities').delete().eq('vin', newVin).eq('type', 'QUEUE');
            
            finalMessage += ` Hệ thống đã tự động ghép với xe mới (VIN: ${newVin})`;
            autoMatched = true;
            finalVin = newVin;

            // CHỦ ĐỘNG GỌI ROBOT THÔNG BÁO GÁN VIN TỰ ĐỘNG
            supabaseAdmin.functions.invoke('send-email', {
                body: { 
                    actionId: 'match_success', 
                    record: { 
                        so_don_hang: orderNumber, 
                        vin: newVin,
                        ten_khach_hang: order.ten_khach_hang,
                        ten_ban_hang: order.ten_tu_van_ban_hang,
                        dong_xe: updateData.dong_xe,
                        phien_ban: updateData.phien_ban,
                        ngoai_that: updateData.ngoai_that,
                        noi_that: updateData.noi_that
                    } 
                }
            }).then();
        }

        // 6. Lấy dữ liệu mới nhất để trả về cho UI cập nhật tức thì
        const { data: updatedOrder } = await supabase
            .from('donhang')
            .select('*')
            .eq('so_don_hang', orderNumber)
            .single();

        await logAction('CHANGE_CONFIG', { orderNumber, oldConfig: { dong_xe: order.dong_xe, phien_ban: order.phien_ban, color: order.ngoai_that }, newConfig }, orderNumber, 'order');

        // Chuyển đổi về format Tiếng Việt của Frontend
        const formattedOrder = updatedOrder ? {
            'Tên tư vấn bán hàng': updatedOrder.ten_tu_van_ban_hang,
            'Tên khách hàng': updatedOrder.ten_khach_hang,
            'Dòng xe': updatedOrder.dong_xe,
            'Phiên bản': updatedOrder.phien_ban,
            'Ngoại thất': updatedOrder.ngoai_that,
            'Nội thất': updatedOrder.noi_that,
            'Số đơn hàng': updatedOrder.so_don_hang,
            'Ngày cọc': updatedOrder.ngay_coc,
            'Thời gian nhập': updatedOrder.thoi_gian_nhap,
            'Kết quả': updatedOrder.ket_qua,
            'VIN': updatedOrder.vin,
            'Thời gian ghép': updatedOrder.thoi_gian_ghep,
            'Trạng thái VC': updatedOrder.trang_thai_vc
        } : null;

        return { 
            status: 'SUCCESS', 
            message: finalMessage,
            autoMatched,
            vin: finalVin,
            updatedOrder: formattedOrder
        };

    } catch (e: any) {
        console.error("Supabase changeOrderConfiguration error:", e);
        throw new Error(e.message || "Lỗi khi thay đổi cấu hình xe");
    }
};

export const fetchAllArchivedData = async (): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown User";
        const userRole = getStorageItem("userRole");
        const actualUsername = getStorageItem("currentUser") || "";
        
        // Admin if: Name matches ADMIN_USER OR role is Quản trị viên OR username is 'admin'
        const isAdmin = currentUser === ADMIN_USER || userRole === 'Quản trị viên' || actualUsername.toLowerCase() === 'admin';

        // Query the dedicated archival table
        let query = supabase.from('archived_orders')
            .select('*')
            .order('ngay_xuat_hoa_don', { ascending: false });

        // Apply filters if not admin
        if (!isAdmin) {
            query = query.eq('tvbh', currentUser);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Map database columns to the frontend Order format
        const formattedData = data.map((order: any) => ({
            'Tên tư vấn bán hàng': order.tvbh,
            'Tên khách hàng': order.ten_khach_hang,
            'Dòng xe': order.dong_xe,
            'Phiên bản': order.phien_ban,
            'Ngoại thất': order.ngoai_that,
            'Nội thất': order.noi_that,
            'Số đơn hàng': order.so_don_hang,
            'SỐ ĐƠN HÀNG': order.so_don_hang,
            'Ngày cọc': order.ngay_coc,
            'VIN': order.vin,
            'SỐ VIN': order.vin,
            'Ngày xuất hóa đơn': order.ngay_xuat_hoa_don,
            'NGÀY XUẤT HÓA ĐƠN': order.ngay_xuat_hoa_don,
            'Kết quả': order.ket_qua || 'Đã xuất hóa đơn',
            'Số máy': order.so_may,
            'SỐ MÁY': order.so_may,
            'LinkHopDong': order.url_hop_dong,
            'LinkDeNghiXHD': order.url_de_nghi_xhd,
            'LinkHoaDonDaXuat': order.url_hoa_don_da_xuat,
            'Trạng thái VC': order.trang_thai_vc
        }));

        return {
            status: 'SUCCESS',
            message: 'Fetched archived orders from Supabase',
            data: formattedData
        };
    } catch (err: any) {
        console.error("Supabase fetchAllArchivedData error: ", err);
        return {
            status: 'ERROR',
            message: err.message || "Không thể tải dữ liệu lưu trữ"
        };
    }
};

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

        // Map back to camelCase standard expected by frontend components
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
        console.error("Supabase fetchNotifications error:", err);
        // Fallback to GAS if needed
        const currentUser = getStorageItem("currentConsultant") || ADMIN_USER;
        return getApi({ 
            action: 'getNotifications', 
            currentUser: currentUser, 
            isAdmin: String(currentUser === ADMIN_USER) 
        });
    }
};
export const markAllNotificationsAsRead = async () => {
    try {
        const currentUser = getStorageItem("currentConsultant") || getStorageItem("currentUser") || ADMIN_USER;
        const userRole = getStorageItem("userRole");
        const actualUsername = getStorageItem("currentUser") || "";
        
        const isAdmin = currentUser === ADMIN_USER || userRole === 'Quản trị viên' || actualUsername.toLowerCase() === 'admin';

        let query = supabase.from('interactions')
            .update({ is_read: true })
            .eq('category', 'NOTIFICATION')
            .eq('is_read', false);

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
        console.error("Supabase markAllNotificationsAsRead error:", err);
        return postApi({ 
            action: 'markAllNotificationsAsRead', 
            currentUser: getStorageItem("currentConsultant") || ADMIN_USER 
        });
    }
};
export const markNotificationAsRead = async (notificationId: string) => {
    try {
        if (notificationId && String(notificationId).includes('-')) {
            const { error } = await supabase.from('interactions').update({ is_read: true }).eq('id', notificationId);
            if (error) throw error;
            return { status: 'SUCCESS' };
        } else {
            return postApi({ action: 'markNotificationAsRead', notificationId });
        }
    } catch (err: any) {
        console.error("Supabase markNotificationAsRead error:", err);
        return postApi({ action: 'markNotificationAsRead', notificationId });
    }
};

/**
 * [MỚI] Tạo thông báo mới trên Supabase - Đã cải tiến để gộp thông báo trùng lặp
 */
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

        // 1. Kiểm tra xem có thông báo CHƯA ĐỌC nào cùng mục tiêu không
        if (targetId && targetView && recipient !== 'ALL') {
            const { data: existing } = await supabase
                .from('interactions')
                .select('id, message, metadata')
                .eq('category', 'NOTIFICATION')
                .eq('recipient', recipient)
                .eq('target_view', targetView)
                .eq('target_id', targetId)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existing) {
                // Đã có thông báo chưa đọc, ta cập nhật nội dung và thời gian để nó nhảy lên đầu
                let newMessage = payload.message;
                const metadata = existing.metadata || {};
                const count = (metadata.count || 1) + 1;
                
                // Nếu là thông báo chat hoặc phản hồi, có thể thêm số lượng vào
                if (payload.message.includes('phản hồi') || payload.message.includes(':')) {
                    newMessage = `(${count}) ${payload.message}`;
                }

                await supabase
                    .from('interactions')
                    .update({
                        message: newMessage,
                        created_at: new Date().toISOString(), // Đưa lên đầu danh sách
                        actor_id: actorId,
                        actor_name: actorName,
                        metadata: { ...metadata, count }
                    })
                    .eq('id', existing.id);
                
                return; // Kết thúc sớm, không insert mới
            }
        }

        // 2. Nếu không có hoặc là thông báo chung (ALL), tạo mới như bình thường
        await supabase.from('interactions').insert({
            category: 'NOTIFICATION',
            message: payload.message,
            type: payload.type || 'info',
            recipient: recipient,
            target_view: targetView,
            target_id: targetId,
            actor_id: actorId,
            actor_name: actorName,
            is_read: false,
            metadata: { count: 1 }
        });
    } catch (err) {
        console.warn("Failed to create notification in interactions:", err);
    }
};

// --- REALTIME CHAT FUNCTIONS (SUPABASE) ---

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

        // Map Supabase fields to the ChatMessage interface
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
        
        // Use ID if provided, fallback to timestamp and sender (for backward compatibility if needed)
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

        // Map Supabase fields to the ChatMessage interface
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
        // Fallback to getApi only if absolutely necessary, but GAS likely doesn't support it either
        try {
            return await getApi({ action: 'getPinnedMessages' });
        } catch (e) {
            return { status: 'ERROR', message: err.message };
        }
    }
};

// --- SOLD CARS API FUNCTIONS (Refactored to ./api/soldCarsService.ts) ---



export const requestVinClub = async (payload: {
    orderNumber: string;
    customerType: string;
    dmsCode?: string;
    vin?: string;
    files?: Record<string, File | null>;
}): Promise<ApiResult> => {
    try {
        const { orderNumber, customerType, dmsCode, vin, files } = payload;
        const requestedBy = getStorageItem("currentConsultant") || "Unknown User";
        const now = new Date();

        // 1. Fetch order data to get customer name
        // Use a more robust check: query both tables to ensure we have data and know where it exists
        const [activeRes, archivedRes] = await Promise.all([
            supabase.from('donhang').select('ten_khach_hang, ten_tu_van_ban_hang, vin').eq('so_don_hang', orderNumber).maybeSingle(),
            supabase.from('archived_orders').select('ten_khach_hang, tvbh, vin').eq('so_don_hang', orderNumber).maybeSingle()
        ]);

        const activeOrderData = activeRes.data;
        const archivedOrderData = archivedRes.data;
        
        if (!activeOrderData && !archivedOrderData) {
            throw new Error(`Không tìm thấy đơn hàng ${orderNumber} hoặc đơn hàng thiếu thông tin.`);
        }

        // Prefer active data if both exist (unlikely but possible)
        const orderData = activeOrderData || {
            ten_khach_hang: archivedOrderData!.ten_khach_hang,
            ten_tu_van_ban_hang: archivedOrderData!.tvbh,
            vin: archivedOrderData!.vin
        };

        const hasActive = !!activeOrderData;
        const hasArchived = !!archivedOrderData;

        const customerName = orderData.ten_khach_hang;
        const vehicleVin = vin || orderData.vin;

        if (!vehicleVin) {
            throw new Error(`Đơn hàng ${orderNumber} chưa có số VIN. Vui lòng cập nhật và thử lại.`);
        }

        // 2. Check for existing requests in Supabase
        const { data: existingReq, error: checkErr } = await supabase
            .from('yeucauvc')
            .select('trang_thai_xu_ly')
            .eq('so_don_hang', orderNumber)
            .neq('trang_thai_xu_ly', 'Từ chối ycvc')
            .neq('trang_thai_xu_ly', 'Hủy')
            .maybeSingle();

        if (checkErr) console.error("Error checking existing VC request:", checkErr);

        if (existingReq) {
            throw new Error(`Đơn hàng ${orderNumber} đã có yêu cầu VinClub đang xử lý (Trạng thái: ${existingReq.trang_thai_xu_ly}).`);
        }

        // 3. Upload files to Supabase Storage
        const uploadedFileUrls: Record<string, string> = {};
        if (files) {
            const uploadPromises = Object.entries(files).map(async ([key, file]) => {
                if (file) {
                    const ext = file.name.split('.').pop();
                    const timestamp = Date.now();
                    const path = `${orderNumber}/VC_${key}_${timestamp}.${ext}`;
                    const url = await uploadToSupabase(file, path, 'vinclub-requests');
                    uploadedFileUrls[key] = url;
                }
            });
            await Promise.all(uploadPromises);
        }

        // 4. Insert request into yeucauvc table
        const { error: insertErr } = await supabaseAdmin
            .from('yeucauvc')
            .insert({
                so_don_hang: orderNumber,
                ten_khach_hang: customerName,
                thoi_gian_yc: now.toISOString(),
                nguoi_yc: requestedBy,
                loai_yc: customerType === 'personal' ? 'Cá Nhân' : 'Công Ty',
                trang_thai_xu_ly: 'Chờ duyệt ycvc',
                file_urls: uploadedFileUrls,
                ma_kh_dms: dmsCode || '',
                vin: vehicleVin
            })
            .select()
            .single();

        if (insertErr) throw insertErr;

        await logAction('REQUEST_VINCLUB', { orderNumber, customerType, vin: vehicleVin }, orderNumber, 'order');

        // 5. Update status in all relevant tables
        const updatePromises = [];
        if (hasActive) {
            updatePromises.push(supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Chờ duyệt VC' }).eq('so_don_hang', orderNumber));
        }
        if (hasArchived) {
            updatePromises.push(supabaseAdmin.from('archived_orders').update({ trang_thai_vc: 'Chờ duyệt VC' }).eq('so_don_hang', orderNumber));
        }
        
        const updateResults = await Promise.all(updatePromises);
        updateResults.forEach((res, idx) => {
            if (res.error) console.error(`Error updating table ${idx === 0 && hasActive ? 'donhang' : 'archived_orders'} for VC:`, res.error);
        });

        // 6. Trigger GAS for notifications
        postApi({
            action: 'requestVinClubNotificationOnly',
            orderNumber,
            customerName,
            requestedBy,
            vin: vehicleVin
        }).catch(e => console.error("GAS Notification Error:", e));

        // Create the full updated order object to return
        const data = orderData as any;
        const updatedOrder = { 
            ...data,
            "Số đơn hàng": orderNumber, 
            "Trạng thái VC": 'Chờ duyệt VC',
            // Also include fields we might need for consistent UI
            "Tên khách hàng": customerName,
            "Tên tư vấn bán hàng": data.ten_tu_van_ban_hang || data.tvbh,
            "VIN": vehicleVin,
            "Kết quả": data.ket_qua || 'Đã xuất hóa đơn'
        };

        return { 
            status: 'SUCCESS', 
            message: 'Yêu cầu VinClub đã được gửi thành công.',
            updatedOrder
        };

    } catch (err: any) {
        console.error("requestVinClub error:", err);
        return { status: 'ERROR', message: err.message };
    }
};

export const getGlobalNotification = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'global_notification')
            .single();
        
        if (error) throw error;
        return { 
            status: 'SUCCESS', 
            message: 'Fetched global notification from Supabase',
            data: data.value 
        };
    } catch (err) {
        console.error("Supabase getGlobalNotification error:", err);
        return getApi({ action: 'getGlobalNotification' });
    }
};

export const updateGlobalNotification = async (notification: { content: string; isActive: boolean; type: string }): Promise<ApiResult> => {
    try {
        const updatedBy = getStorageItem("currentConsultant") || ADMIN_USER;
        const { error } = await supabase
            .from('app_settings')
            .upsert({ 
                key: 'global_notification',
                value: notification, 
                updated_at: new Date().toISOString(),
                updated_by: updatedBy
            }, { onConflict: 'key' });
        
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Cập nhật thông báo thành công.' };
    } catch (err) {
        console.error("Supabase updateGlobalNotification error:", err);
        return postApi({ action: 'updateGlobalNotification', ...notification });
    }
};

// --- APP SETTINGS HELPER FUNCTIONS (SUPABASE) ---

/**
 * Lấy một cài đặt chung từ bảng app_settings.
 * @param key Khóa của cài đặt (ví dụ: 'chat_visibility', 'stock_visibility')
 */
export const getAppSetting = async (key: string): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', key)
            .single();
        
        if (error) throw error;
        return { 
            status: 'SUCCESS', 
            message: `Fetched ${key} from Supabase`,
            data: data.value 
        };
    } catch (err) {
        console.error(`Supabase getAppSetting error for ${key}:`, err);
        // Fallback to legacy GAS if Supabase fails
        const legacyAction = key === 'chat_visibility' ? 'getChatVisibility' : 
                          key === 'stock_visibility' ? 'getStockVisibility' : null;
        if (legacyAction) {
            return getApi({ action: legacyAction });
        }
        return { status: 'ERROR', message: (err as Error).message };
    }
};

/**
 * Cập nhật một cài đặt chung trong bảng app_settings.
 * @param key Khóa của cài đặt
 * @param value Giá trị JSONB mới
 */
export const updateAppSetting = async (key: string, value: any): Promise<ApiResult> => {
    try {
        const updatedBy = getStorageItem("currentConsultant") || ADMIN_USER;
        const { error } = await supabase
            .from('app_settings')
            .upsert({ 
                key: key,
                value: value, 
                updated_at: new Date().toISOString(),
                updated_by: updatedBy
            }, { onConflict: 'key' });
        
        if (error) throw error;

        // Log the action for transparency
        logAction('UPDATE_SETTING', { key, value }, key, 'SETTINGS');

        return { status: 'SUCCESS', message: `Đã cập nhật ${key} thành công.` };
    } catch (err) {
        console.error(`Supabase updateAppSetting error for ${key}:`, err);
        // Fallback to legacy GAS if Supabase fails
        const legacyAction = key === 'chat_visibility' ? 'toggleChatVisibility' : 
                          key === 'stock_visibility' ? 'toggleStockVisibility' : null;
        if (legacyAction) {
            return postApi({ action: legacyAction, isAdmin: true });
        }
        return { status: 'ERROR', message: (err as Error).message };
    }
};

// --- END APP SETTINGS ---

/**
 * [MỚI] Ghi nhật ký hoạt động (Audit Logs) trực tiếp lên Supabase
 */
export const logAction = async (action: string, details: any = {}, targetId?: string, targetType?: string): Promise<void> => {
    try {
        const userEmail = getStorageItem("userEmail") || getStorageItem("currentConsultant");
        const userFullName = getStorageItem("currentUser") || "Unknown";
        
        await supabaseAdmin.from('interactions').insert({
            category: 'LOG',
            type: action,
            message: typeof details === 'string' ? details : (details.message || action),
            actor_id: userEmail,
            actor_name: userFullName,
            target_id: targetId,
            target_view: targetType, // Map targetType to target_view for compatibility
            metadata: details
        });
    } catch (err) {
        console.warn("Failed to log action to Supabase:", err);
    }
};

/**
 * [MỚI] Lấy nhật ký hoạt động từ Supabase cho trang Admin
 */
export const getAuditLogs = async (limit: number = 100): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase
            .from('interactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;

        return {
            status: 'SUCCESS',
            message: 'Fetched audit logs from Supabase',
            data: data || []
        };
    } catch (err: any) {
        console.error("Supabase getAuditLogs error:", err);
        return { status: 'ERROR', message: err.message };
    }
};


// --- Admin Actions ---

export const getUsers = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('username, full_name, role, manager_id, is_blocked, block_reason');
        
        if (error) throw error;
        
        return { 
            status: 'SUCCESS', 
            message: 'Fetched users from Supabase',
            users: data.map(u => ({ 
                username: u.username, 
                name: u.full_name, 
                role: u.role,
                manager_id: u.manager_id,
                is_blocked: u.is_blocked,
                block_reason: u.block_reason
            })) 
        };
    } catch (error) {
        console.error("Failed to fetch users from Supabase (Admin Client):", error);
        return getApi({ action: 'getUsers' });
    }
};

export const toggleUserBlock = async (username: string, isBlocked: boolean, reason?: string): Promise<ApiResult> => {
    try {
        const adminUser = getStorageItem("currentConsultant") || "Admin";
        
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                is_blocked: isBlocked,
                block_reason: isBlocked ? reason : null,
                blocked_at: isBlocked ? new Date().toISOString() : null,
                blocked_by: isBlocked ? adminUser : null
            })
            .eq('username', username);

        if (error) throw error;
        
        await logAction(isBlocked ? 'BLOCK_USER' : 'UNBLOCK_USER', { username, reason }, username, 'admin');
        
        return { 
            status: 'SUCCESS', 
            message: isBlocked ? `Đã khóa tài khoản ${username}` : `Đã mở khóa tài khoản ${username}` 
        };
    } catch (error: any) {
        console.error('Error in toggleUserBlock:', error);
        return { status: 'ERROR', message: error.message };
    }
};

export const getTeamData = async (): Promise<ApiResult> => {
    try {
        console.log("Fetching team data from Supabase...");
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('username, full_name, manager_id');
        
        if (error) {
            console.error("Supabase Error fetching teams:", error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.warn("No user data returned from Supabase users table.");
            return { status: 'SUCCESS', message: 'No users found', teamData: {} };
        }

        const teamData: Record<string, string[]> = {};
        const usernameToFullName: Record<string, string> = {};
        
        data.forEach(u => {
            usernameToFullName[u.username] = u.full_name || u.username;
        });
        
        let foundTeams = 0;
        data.forEach(user => {
            if (user.manager_id) {
                const leaderName = usernameToFullName[user.manager_id] || user.manager_id;
                if (!teamData[leaderName]) {
                    teamData[leaderName] = [];
                    foundTeams++;
                }
                teamData[leaderName].push(user.full_name || user.username);
            }
        });

        console.log(`Team Data processed: found ${foundTeams} teams.`, teamData);
        
        return { status: 'SUCCESS', message: `Found ${foundTeams} teams`, teamData };
    } catch (error) {
        console.error("Critical error in getTeamData Supabase:", error);
        return getApi({ action: 'getTeamData' });
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

        // Define helper for mapping and searching
        const performSearch = async (tableName: string, columns: string[], ownerColumn?: string) => {
            let query = supabase.from(tableName).select('*');
            
            // Apply term search on specified columns
            const filterStr = columns.map(col => `${col}.ilike.${term}`).join(',');
            query = query.or(filterStr);

            // Apply ownership filter if not admin
            if (!isAdmin && ownerColumn) {
                query = query.eq(ownerColumn, currentUser);
            }

            const { data, error } = await query.limit(50);
            if (error) {
                console.warn(`Search error on ${tableName}:`, error);
                return [];
            }
            return data || [];
        };

        const searchPromises: Promise<void>[] = [];

        if (scope === 'active' || scope === 'all') {
            // 1. Search Active Orders
            searchPromises.push(performSearch('donhang', ['so_don_hang', 'ten_khach_hang', 'vin'], 'ten_tu_van_ban_hang').then(res => {
                if (res.length > 0) searchResults['Đơn hàng'] = res.map(o => ({
                    'Số đơn hàng': o.so_don_hang,
                    'Tên khách hàng': o.ten_khach_hang,
                    'VIN': o.vin,
                    'Kết quả': o.ket_qua,
                    'Dòng xe': o.dong_xe,
                    'Tên tư vấn bán hàng': o.ten_tu_van_ban_hang
                }));
            }));

            // 2. Search VC Requests
            searchPromises.push(performSearch('yeucauvc', ['so_don_hang', 'ten_khach_hang', 'vin'], 'nguoi_yc').then(res => {
                if (res.length > 0) searchResults['Yêu cầu VinClub'] = res.map(o => ({
                    'Số đơn hàng': o.so_don_hang,
                    'Tên khách hàng': o.ten_khach_hang,
                    'Thời gian YC': o.thoi_gian_yc,
                    'Trạng thái xử lý': o.trang_thai_xu_ly,
                    'Người YC': o.nguoi_yc
                }));
            }));

            // 3. Search Invoice Requests
            searchPromises.push(performSearch('yeucauxhd', ['so_don_hang', 'ten_khach_hang', 'vin'], 'tvbh').then(res => {
                if (res.length > 0) searchResults['Yêu cầu hóa đơn'] = res.map(o => ({
                    'Số đơn hàng': o.so_don_hang,
                    'Tên khách hàng': o.ten_khach_hang,
                    'Ngày yêu cầu': o.ngay_yeu_cau,
                    'Trạng thái': o.trang_thai_vc || 'Chờ duyệt',
                    'TVBH': o.tvbh
                }));
            }));

            // 4. Search Stock (Warehouse)
            // Sales only see cars they are holding or unassigned
            searchPromises.push(performSearch('khoxe', ['vin', 'ma_dms']).then(res => {
                let filtered = res;
                if (!isAdmin) {
                    filtered = res.filter(c => !c.nguoi_giu_xe || c.nguoi_giu_xe === currentUser);
                }
                if (filtered.length > 0) searchResults['Kho xe'] = filtered.map(o => ({
                    'VIN': o.vin,
                    'Mã DMS': o.ma_dms,
                    'Dòng xe': o.dong_xe,
                    'Ngoại thất': o.ngoai_that,
                    'Nội thất': o.noi_that,
                    'Trạng thái': o.trang_thai
                }));
            }));
        }

        if (scope === 'archive' || scope === 'all') {
            // 5. Search Archive
            searchPromises.push(performSearch('archived_orders', ['so_don_hang', 'ten_khach_hang', 'vin'], 'tvbh').then(res => {
                if (res.length > 0) searchResults['Dữ liệu lưu trữ'] = res.map(o => ({
                    'Số đơn hàng': o.so_don_hang,
                    'Tên khách hàng': o.ten_khach_hang,
                    'Ngày xuất hóa đơn': o.ngay_xuat_hoa_don,
                    'VIN': o.vin,
                    'TVBH': o.tvbh
                }));
            }));
        }

        await Promise.all(searchPromises);

        return {
            status: 'SUCCESS',
            message: 'Search completed via Supabase',
            data: searchResults
        };

    } catch (err: any) {
        console.error("Supabase globalSearch error:", err);
        // Fallback to GAS only if keyword is long enough
        return getApi({
            action: 'searchGlobal',
            keyword,
            scope,
            isAdmin: String(getStorageItem("userRole") === 'Quản trị viên')
        });
    }
};

export const performAdminAction = async (action: string, params: Record<string, any>): Promise<ApiResult> => {
    const currentUser = getStorageItem("currentUser") || "Unknown Admin";

    // --- DUAL-WRITE SUPABASE CHO ADMIN ---
    try {
        if (action === 'deleteOrderLogic') {
            const orderNumber = params.orderNumber;
            // 0. Fetch full order for snapshot
            const { data: orderSnap, error: fetchErr } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
            if (fetchErr) throw fetchErr;
            
            if (orderSnap && orderSnap.vin) {
                await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', orderSnap.vin);
            }
            
            const { error: updateErr } = await supabaseAdmin.from('donhang').update({
                ket_qua: 'Đã hủy',
                ghi_chu_huy: `Bị Admin xóa khỏi hệ thống.`,
                thoi_gian_huy: new Date().toISOString()
            }).eq('so_don_hang', orderNumber);
            if (updateErr) throw updateErr;

            // 1. Log with full snapshot
            await logAction('DELETE_ORDER', { orderNumber, snapshot: orderSnap }, orderNumber, 'order');

            return { status: 'SUCCESS', message: 'Đã cập nhật (xóa) trên Supabase thành công!' };
        }

        if (action === 'cancelRequest') {
            const orderNumbers = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
            for (let orderNo of orderNumbers) {
                // 0. Snapshot for recovery
                const { data: orderSnap, error: fetchErr } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderNo).single();
                if (fetchErr) throw fetchErr;
                
                if (orderSnap && orderSnap.vin) {
                    await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', orderSnap.vin);
                }
                const { error: updateErr } = await supabaseAdmin.from('donhang').update({
                    ket_qua: 'Đã hủy',
                    ghi_chu_huy: `Bị Admin hủy. Lý do: ${params.reason}`,
                    thoi_gian_huy: new Date().toISOString()
                }).eq('so_don_hang', orderNo);
                if (updateErr) throw updateErr;

                // 0.5 Log with snapshot
                await logAction('CANCEL_REQUEST', { orderNumber: orderNo, reason: params.reason, snapshot: orderSnap }, orderNo, 'order');

                // Đồng thời cập nhật bảng yeucauxhd nếu tồn tại
                await supabaseAdmin.from('yeucauxhd').update({
                    trang_thai: 'Đã hủy',
                    ghi_chu_admin: params.reason
                }).eq('so_don_hang', orderNo);

                // Gửi email thông báo hủy đơn
                try {
                    supabaseAdmin.functions.invoke('send-email', {
                        body: { 
                            actionId: 'order_self_cancelled', 
                            record: { 
                                ...(orderSnap || {}),
                                so_don_hang: orderNo,
                                ghi_chu_huy: params.reason,
                                is_waiting: false,
                                status: 'Đã hủy'
                            } 
                        }
                    }).catch(e => console.warn(`Email cancel error [${orderNo}]:`, e));
                } catch (_) {}
            }
            return { status: 'SUCCESS', message: 'Đã hủy yêu cầu trên Supabase thành công' };
        }

        if (action === 'findAndAddCarByVin') {
            const vin = params.vin.trim().toUpperCase();
            if (vin.length !== 17) return { status: 'ERROR', message: 'Số VIN không hợp lệ (phải đủ 17 ký tự).' };

            // Proactively fetch from thongtinxe using Admin client and Case-Insensitive search
            const { data: master } = await supabaseAdmin
                .from('thongtinxe')
                .select('*')
                .ilike('vin', vin) // Case-insensitive and more robust
                .maybeSingle();

            const modelName = master?.mo_ta || '';
            const finalModel = modelName.toLowerCase().includes('limo green') ? 'LIMO' : modelName;

            const { error: insertErr } = await supabaseAdmin.from('khoxe').insert([{
                vin: vin,
                dong_xe: finalModel,
                phien_ban: '', // Bắt buộc điền tay theo yêu cầu (luôn để trống khi thêm mới)
                ngoai_that: getExteriorColorName(master?.ngoai_that || ''),
                noi_that: getInteriorColorName(master?.noi_that || ''),
                so_may: master?.so_may || '',
                ma_dms: master?.khu_vuc || '',
                trang_thai: 'Chưa ghép',
                ngay_nhap: new Date().toISOString()
            }]);

            if (insertErr) {
                if (insertErr.code === '23505') return { status: 'ERROR', message: `Xe với VIN ${vin} đã tồn tại trong kho.` };
                throw insertErr;
            }

            await logAction('ADD_CAR', { vin }, vin, 'stock');

            // Chỉ gửi thông báo nhập kho khi xe có đầy đủ thông tin (dòng xe, ngoại thất, nội thất, mã DMS)
            const hasCompleteInfo = finalModel && getExteriorColorName(master?.ngoai_that || '') && getInteriorColorName(master?.noi_that || '') && (master?.khu_vuc || '');
            if (hasCompleteInfo) {
                createNotification({
                    message: `<b>${finalModel}</b> (${vin}) đã nhập kho. Sẵn sàng giao dịch!`,
                    type: 'stock_hero',
                    targetView: 'stock',
                    targetId: vin
                });
            }

            return { status: 'SUCCESS', message: master ? `Đã thêm xe ${vin} thành công.` : `Đã thêm xe ${vin} (VIN này chưa có trong danh mục thongtinxe - cần bổ sung thông tin).` };
        }

        if (action === 'bulkAddCarsByVin') {
            const vinText = params.vins || '';
            const vinList = vinText.split(/[\s,\n]+/)
                .map((v: string) => v.trim().toUpperCase())
                .filter((v: string) => v.length === 17);
            
            if (vinList.length === 0) return { status: 'ERROR', message: 'Không tìm thấy số VIN hợp lệ (phải đủ 17 ký tự).' };

            const uniqueVins: string[] = Array.from(new Set(vinList));
            
            // 1. Fetch all master data in ONE request using Admin client
            const { data: masters } = await supabaseAdmin
                .from('thongtinxe')
                .select('*')
                .in('vin', uniqueVins);
            
            const masterMap = new Map();
            masters?.forEach(m => masterMap.set(m.vin.trim().toUpperCase(), m));

            const results = { success: 0, failed: 0, skipped: 0 };

            // 2. Insert with pre-filled data using Admin client
            for (const vin of uniqueVins) {
                const master = masterMap.get(vin);
                const modelName = master?.mo_ta || '';
                const finalModel = modelName.toLowerCase().includes('limo green') ? 'LIMO' : modelName;

                const { error: insertErr } = await supabaseAdmin.from('khoxe').insert([{
                    vin,
                    dong_xe: finalModel,
                    phien_ban: '', // Bắt buộc điền tay theo yêu cầu (luôn để trống khi thêm mới)
                    ngoai_that: getExteriorColorName(master?.ngoai_that || ''),
                    noi_that: getInteriorColorName(master?.noi_that || ''),
                    so_may: master?.so_may || '',
                    ma_dms: master?.khu_vuc || '',
                    trang_thai: 'Chưa ghép',
                    ngay_nhap: new Date().toISOString()
                }]);

                if (insertErr) {
                    if (insertErr.code === '23505') results.skipped++;
                    else results.failed++;
                } else {
                    results.success++;
                    await logAction('ADD_CAR_BULK', { vin }, vin, 'stock');
                }
            }

            if (results.success > 0) {
                createNotification({
                    message: `Đã cập nhật <b>${results.success} xe mới</b> vào kho dữ liệu.`,
                    type: 'stock_hero',
                    targetView: 'stock'
                });
            }

            return { 
                status: 'SUCCESS', 
                message: `Xử lý hoàn tất: Thêm mới ${results.success} xe. Bỏ qua ${results.skipped} xe trùng. Thất bại: ${results.failed}.`
            };
        }

        if (action === 'bulkAddCarsDetailed') {
            const carData = params.carData ? JSON.parse(params.carData) : [];
            if (carData.length === 0) return { status: 'ERROR', message: 'Không tìm thấy dữ liệu xe hợp lệ.' };

            const results = { success: 0, failed: 0, skipped: 0 };

            for (const car of carData) {
                const { error: insertErr } = await supabaseAdmin.from('khoxe').insert([{
                    vin: String(car.vin || '').trim().toUpperCase(),
                    dong_xe: String(car.dong_xe || '').trim(),
                    phien_ban: String(car.phien_ban || '').trim(),
                    ngoai_that: getExteriorColorName(String(car.ngoai_that || '').trim()),
                    noi_that: getInteriorColorName(String(car.noi_that || '').trim()),
                    so_may: String(car.so_may || '').trim(),
                    ma_dms: String(car.ma_dms || '').trim(),
                    trang_thai: 'Chưa ghép',
                    ngay_nhap: new Date().toISOString()
                }]);

                if (insertErr) {
                    if (insertErr.code === '23505') results.skipped++;
                    else {
                        console.error("Insert failed for car:", car, insertErr);
                        results.failed++;
                    }
                } else {
                    results.success++;
                    await logAction('ADD_CAR_BULK_DETAILED', { vin: car.vin }, car.vin, 'stock');
                }
            }

            if (results.success > 0) {
                createNotification({
                    message: `Đã cập nhật <b>${results.success} xe mới</b> vào kho dữ liệu.`,
                    type: 'stock_hero',
                    targetView: 'stock'
                });
            }

            return { 
                status: 'SUCCESS', 
                message: `Xử lý hoàn tất: Thêm mới ${results.success} xe. Bỏ qua ${results.skipped} xe trùng. Thất bại: ${results.failed}.`
            };
        }

        if (action === 'deleteCarFromStockLogic') {
            const vin = params.vinToDelete;
            const reason = params.reason;

            // 0. Fetch full car record for snapshot
            const { data: carSnap, error: fetchCarErr } = await supabaseAdmin.from('khoxe').select('*').eq('vin', vin).maybeSingle();
            if (fetchCarErr) throw fetchCarErr;

            // 0.5 Check if the car is currently matched to an order
            const { data: matchedOrder, error: fetchOrderErr } = await supabaseAdmin.from('donhang').select('so_don_hang').eq('vin', vin).maybeSingle();
            if (fetchOrderErr) throw fetchOrderErr;

            if (matchedOrder) {
                // Unmatch the order first
                const { error: unmatchErr } = await supabaseAdmin.from('donhang').update({
                    ket_qua: 'Chưa ghép',
                    vin: null,
                    thoi_gian_ghep: null
                }).eq('so_don_hang', matchedOrder.so_don_hang);
                if (unmatchErr) throw unmatchErr;
            }

            // 1. Log to audit logs with reason and snapshot
            await logAction('DELETE_CAR', { vin, reason, snapshot: carSnap }, vin, 'stock');

            // 2. Delete from Supabase
            const { error: delErr } = await supabaseAdmin.from('khoxe').delete().eq('vin', vin);
            if (delErr) throw delErr;

            return { status: 'SUCCESS', message: `Đã xóa xe ${vin} khỏi Supabase thành công.` + (matchedOrder ? ` (Đã tự động hủy ghép ĐH ${matchedOrder.so_don_hang})` : '') };
        }

        if (action === 'restoreCarToStockLogic') {
            const vin = params.vinToRestore;
            
            // 1. Try to find the latest snapshot from audit logs
            const { data: logs, error: logErr } = await supabaseAdmin
                .from('interactions')
                .select('metadata')
                .eq('target_id', vin)
                .eq('type', 'DELETE_CAR')
                .order('created_at', { ascending: false })
                .limit(1);
            if (logErr) throw logErr;

            let carData: any = null;
            if (logs && logs.length > 0 && logs[0].metadata?.snapshot) {
                // USE SNAPSHOT: Restore exactly how it was
                const snap = logs[0].metadata.snapshot;
                carData = { ...snap };
                delete carData.id; // Let Supabase generate new UI if needed
                carData.trang_thai = 'Chưa ghép';
                carData.nguoi_giu_xe = null;
                carData.thoi_gian_het_han_giu = null;
                carData.ngay_nhap = new Date().toISOString(); // Reset import date to now
            } else {
                // FALLBACK: Fetch from thongtinxe (master data)
                const { data: carMaster, error: masterErr } = await supabaseAdmin
                    .from('thongtinxe')
                    .select('vin, so_may, mo_ta, phien_ban, ngoai_that, noi_that, khu_vuc')
                    .eq('vin', vin)
                    .maybeSingle();
                if (masterErr) throw masterErr;

                carData = { 
                    vin, 
                    trang_thai: 'Chưa ghép', 
                    ngay_nhap: new Date().toISOString(),
                    dong_xe: carMaster?.mo_ta || '',
                    phien_ban: carMaster?.phien_ban || '',
                    ngoai_that: getExteriorColorName(carMaster?.ngoai_that || ''),
                    noi_that: getInteriorColorName(carMaster?.noi_that || ''),
                    ma_dms: carMaster?.khu_vuc || '',
                    so_may: carMaster?.so_may || ''
                };
            }

            const { error: insertErr } = await supabaseAdmin.from('khoxe').insert([carData]);
            if (insertErr) throw insertErr;

            await logAction('RESTORE_CAR', { vin }, vin, 'stock');
            return { status: 'SUCCESS', message: `Đã phục hồi xe ${vin} lên Supabase thành công (Dựa trên dữ liệu ${logs?.[0]?.metadata?.snapshot ? 'nhật ký' : 'danh mục'}).` };
        }



        if (action === 'approveSelectedInvoiceRequest') {
            const orderNumbers = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
            for (let orderNo of orderNumbers) {
                const trimmedNo = orderNo.trim();
                const { data: order, error: fetchErr } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang').eq('so_don_hang', trimmedNo).single();
                if (fetchErr) throw fetchErr;
                
                const { error: err2 } = await supabaseAdmin.from('donhang').update({ ket_qua: 'Đã phê duyệt' }).eq('so_don_hang', trimmedNo);
                if (err2) throw err2;

                // CẬP NHẬT: Đồng bộ thái trạng phê duyệt sang bảng yêu cầu (để Realtime Update và Kích hoạt Warehouse)
                const { error: err3 } = await supabaseAdmin.from('yeucauxhd').update({ trang_thai_vc: 'Đã phê duyệt' }).eq('so_don_hang', trimmedNo);
                if (err3) console.error(`Sync error yeucauxhd [${trimmedNo}]:`, err3);

                if (order?.ten_tu_van_ban_hang) {
                    await createNotification({
                        message: `Yêu cầu xuất hóa đơn cho ĐH ${trimmedNo} đã được phê duyệt.`,
                        type: 'success',
                        recipient: order.ten_tu_van_ban_hang,
                        targetView: 'orders',
                        targetId: trimmedNo
                    });
                }


            }

            await logAction('APPROVE_INVOICE_REQUEST', { orderNumbers }, orderNumbers.join(','), 'invoice_bulk');

            return { status: 'SUCCESS', message: 'Đã phê duyệt thành công' };
        }

        if (action === 'markAsPendingSignature') {
            const orderNumbers = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
            const customDate = params.ngay_xuat_hoa_don;
            
            for (let orderNo of orderNumbers) {
                const trimmedNo = orderNo.trim();
                const updatePayload: any = { ket_qua: 'Chờ ký hóa đơn' };
                
                if (customDate) {
                    updatePayload.ngay_xuat_hoa_don = customDate;
                }

                const { data: order, error: fetchErr } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang').eq('so_don_hang', trimmedNo).single();
                if (fetchErr) throw fetchErr;

                const { error: err2 } = await supabaseAdmin.from('donhang').update(updatePayload).eq('so_don_hang', trimmedNo);
                if (err2) throw err2;

                const { error: err3 } = await supabaseAdmin.from('yeucauxhd').update({ trang_thai_vc: 'Chờ ký hóa đơn' }).eq('so_don_hang', trimmedNo);
                if (err3) throw err3;

                if (order?.ten_tu_van_ban_hang) {
                    await createNotification({
                        message: `Hóa đơn cho ĐH ${trimmedNo} đã sẵn sàng, vui lòng ký hóa đơn.`,
                        type: 'info',
                        recipient: order.ten_tu_van_ban_hang,
                        targetView: 'orders',
                        targetId: trimmedNo
                    });
                }
            }

            await logAction('PENDING_SIGNATURE', { orderNumbers }, orderNumbers.join(','), 'invoice_bulk');

            return { status: 'SUCCESS', message: 'Đã chuyển trạng thái sang Chờ ký hóa đơn' };
        }

        if (action === 'requestSupplementForInvoice') {
            const orderNumbers = params.orderNumbers ? JSON.parse(params.orderNumbers) : [];
            for (let orderNo of orderNumbers) {
                const trimmedNo = orderNo.trim();
                const { data: order, error: fetchErr } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang, vin').eq('so_don_hang', trimmedNo).single();
                if (fetchErr) throw fetchErr;

                const { error: err1 } = await supabaseAdmin.from('yeucauxhd').update({
                    ghi_chu_admin: params.reason,
                    trang_thai_vc: 'Yêu cầu bổ sung'
                }).eq('so_don_hang', trimmedNo);
                if (err1) throw err1;

                const { error: err2 } = await supabaseAdmin.from('donhang').update({ ket_qua: 'Yêu cầu bổ sung' }).eq('so_don_hang', trimmedNo);
                if (err2) throw err2;

                if (order?.ten_tu_van_ban_hang) {
                    if (order.vin) {
                        await supabaseAdmin.from('car_hold_activities').insert({
                            vin: order.vin,
                            username: order.ten_tu_van_ban_hang,
                            tvbh_name: order.ten_tu_van_ban_hang,
                            type: 'PENALTY',
                            status: 'supplement_requested',
                            reason: `Yêu cầu bổ sung HS: ${params.reason.substring(0, 50)}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        });
                    }

                    await createNotification({
                        message: `Yêu cầu xuất hóa đơn cho ĐH ${trimmedNo} cần bổ sung: ${params.reason}`,
                        type: 'warning',
                        recipient: order.ten_tu_van_ban_hang,
                        targetView: 'orders',
                        targetId: trimmedNo
                    });
                    
                    // Gửi email yêu cầu bổ sung cho TVBH đồng bộ
                    try {
                        const payload = {
                            actionId: 'invoice_supplement_requested',
                            record: {
                                tvbh: order.ten_tu_van_ban_hang,
                                ten_khach_hang: 'Khách hàng', // Không có sẵn trong o, tạm để KH
                                so_don_hang: trimmedNo,
                                vin: order.vin || '',
                                ghi_chu_admin: params.reason
                            }
                        };
                        supabaseAdmin.functions.invoke('send-email', { body: payload })
                            .then(({ error }) => { if (error) console.warn('Lỗi gửi mail supplement_requested:', error) })
                            .catch(err => console.warn('Lỗi gọi gửi mail supplement_requested:', err));
                    } catch (err) {
                        console.warn('Lỗi gọi gửi mail supplement_requested:', err);
                    }
                }
            }

            await logAction('REQUEST_SUPPLEMENT', { orderNumbers, reason: params.reason }, orderNumbers.join(','), 'invoice_bulk');

            return { status: 'SUCCESS', message: 'Đã gửi yêu cầu bổ sung' };
        }



        if (action === 'handleBulkUploadIssuedInvoices') {
            const filesData = params.filesData ? JSON.parse(params.filesData) : [];
            for (let fileInfo of filesData) {
                const orderNo = fileInfo.orderNumber.trim();
                const { data: order, error: fetchErr } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang, vin').eq('so_don_hang', orderNo).single();
                if (fetchErr) throw fetchErr;

                const yeucauxhdUpdate: any = {};
                if (fileInfo.invoiceUrl) yeucauxhdUpdate.url_hoa_don_da_xuat = fileInfo.invoiceUrl;
                const { error: err1 } = await supabaseAdmin.from('yeucauxhd').update(yeucauxhdUpdate).eq('so_don_hang', orderNo);
                if (err1) throw err1;

                const { error: err2 } = await supabaseAdmin.from('donhang').update({ ket_qua: 'Đã xuất hóa đơn' }).eq('so_don_hang', orderNo);
                if (err2) throw err2;
                
                // Cập nhật điểm uy tín: Chuyển hoạt động từ 'matched' sang 'invoiced'
                if (order?.vin) {
                    const { error: activityErr } = await supabaseAdmin.from('car_hold_activities')
                        .update({ status: 'invoiced' })
                        .eq('vin', order.vin)
                        .eq('status', 'matched');
                    if (activityErr) console.error(`Sync error car_hold_activities [${orderNo}]:`, activityErr); // Log but don't throw for this secondary update
                }

                if (order?.ten_tu_van_ban_hang) {
                    await createNotification({
                        message: `Đã có hóa đơn cho ĐH ${orderNo}.`,
                        type: 'success',
                        recipient: order.ten_tu_van_ban_hang,
                        targetView: 'sold',
                        targetId: orderNo
                    });
                }
            }

            await logAction('UPLOAD_INVOICE_BULK', { count: filesData.length }, 'bulk', 'invoice');

            return { status: 'SUCCESS', message: 'Đã xuất hóa đơn thành công' };
        }

        if (action === 'unmatchOrder') {
            const orderNumber = params.orderNumber;
            const reason = params.reason || 'Không có lý do';
            const unmatchType = params.unmatchType || 'Hủy ghép & Đợi xe khác (Chờ xe)';
            
            const ketQuaMoi = unmatchType.includes('Chờ xe') ? 'Chưa ghép' : 'Đã hủy';

            // Fetch bản ghi đầy đủ TRƯỚC khi update để lấy thông tin phục vụ gửi Mail
            const { data: fullOrder, error: fetchErr } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
            if (fetchErr) throw fetchErr;

            if (fullOrder && fullOrder.vin) {
                // Nhả xe trong kho
                const { error: khoxeUpdateErr } = await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', fullOrder.vin);
                if (khoxeUpdateErr) throw khoxeUpdateErr;
            }
            
            // Cập nhật đơn hàng
            const updatePayload: any = {
                ket_qua: ketQuaMoi,
                vin: null,
                thoi_gian_ghep: null
            };
            if (ketQuaMoi === 'Đã hủy') {
                updatePayload.ghi_chu_huy = `Bị Admin hủy ghép. Lý do: ${reason}`;
                updatePayload.thoi_gian_huy = new Date().toISOString();
            }

            const { error: donhangUpdateErr } = await supabaseAdmin.from('donhang').update(updatePayload).eq('so_don_hang', orderNumber);
            if (donhangUpdateErr) throw donhangUpdateErr;

            // Xử lý yeucauxhd nếu có (đảm bảo đồng bộ)
            if (ketQuaMoi === 'Đã hủy') {
                 await supabaseAdmin.from('yeucauxhd').update({ trang_thai: 'Đã hủy', ghi_chu_admin: reason }).eq('so_don_hang', orderNumber);
            } else {
                 await supabaseAdmin.from('yeucauxhd').update({ vin: null }).eq('so_don_hang', orderNumber);
            }

            if (fullOrder?.ten_tu_van_ban_hang) {
                // 1. Thông báo nội bộ
                await createNotification({
                    message: `Đơn hàng ${orderNumber} đã bị hủy ghép xe (${ketQuaMoi}). Lý do: ${reason}`,
                    type: 'danger',
                    recipient: fullOrder.ten_tu_van_ban_hang,
                    targetView: 'orders',
                    targetId: orderNumber
                });

                // 2. Gửi email thông báo (actionId: order_self_cancelled)
                const emailRecord = {
                    ...fullOrder,
                    ghi_chu_huy: `Admin hủy ghép. Lý do: ${reason}`,
                    is_waiting: ketQuaMoi === 'Chưa ghép',
                    status: ketQuaMoi
                };

                supabaseAdmin.functions.invoke('send-email', {
                    body: {
                        actionId: 'order_self_cancelled',
                        record: emailRecord
                    }
                }).then(({ error }) => { if (error) console.warn('Lỗi gửi mail unmatchOrder:', error) });
            }

            await logAction('UNMATCH_ORDER', { orderNumber, reason, ketQuaMoi }, orderNumber, 'order');

            return { status: 'SUCCESS', message: 'Đã hủy ghép xe thành công' };
        }

        if (action === 'updateRowData' && params.sheetName === 'Xuathoadon') {
            const orderNumber = params.primaryKeyValue;
            const updateObj: any = {};
            // Map đầy đủ tất cả các trường theo cấu trúc sheet Xuathoadon
            if (params["Số máy"] !== undefined) updateObj.so_may = params["Số máy"];
            if (params["CHÍNH SÁCH"] !== undefined) updateObj.chinh_sach = params["CHÍNH SÁCH"];
            if (params["Hoa hồng ứng"] !== undefined) updateObj.hoa_hong_ung = params["Hoa hồng ứng"];
            if (params["Điểm Vpoint sử dụng"] !== undefined) updateObj.vpoint = params["Điểm Vpoint sử dụng"];
            if (params["NGÀY XUẤT HÓA ĐƠN"] !== undefined) updateObj.ngay_xuat_hoa_don = params["NGÀY XUẤT HÓA ĐƠN"];
            if (params["KẾT QUẢ GỬI MAIL"] !== undefined) updateObj.ket_qua_gui_mail = params["KẾT QUẢ GỬI MAIL"];
            if (params["URL Hóa Đơn Đã Xuất"] !== undefined) updateObj.url_hoa_don_da_xuat = params["URL Hóa Đơn Đã Xuất"];
            if (params["Trạng thái VC"] !== undefined) updateObj.trang_thai_vc = params["Trạng thái VC"];
            if (params["Ghi chú AI"] !== undefined) updateObj.ghi_chu_ai = params["Ghi chú AI"];

            // Pre-seed user_reputation_cache với đúng username (không dấu cách)
            // để tránh trigger trong DB bị lỗi constraint no_spaces_in_reputation_username
            try {
                const { data: orderRow } = await supabaseAdmin
                    .from('yeucauxhd')
                    .select('tvbh')
                    .eq('so_don_hang', orderNumber)
                    .maybeSingle();

                if (orderRow?.tvbh) {
                    const { data: userRow } = await supabaseAdmin
                        .from('users')
                        .select('username')
                        .ilike('full_name', orderRow.tvbh.trim())
                        .maybeSingle();

                    if (userRow?.username) {
                        await supabaseAdmin
                            .from('user_reputation_cache')
                            .upsert({ username: userRow.username }, { onConflict: 'username', ignoreDuplicates: true });
                    }
                }
            } catch (_e) {
                // Không block việc update nếu pre-seed thất bại
                console.warn('Pre-seed user_reputation_cache failed (non-critical):', _e);
            }

            const { error: updateErr } = await supabaseAdmin.from('yeucauxhd').update(updateObj).eq('so_don_hang', orderNumber);
            if (updateErr) throw updateErr;

            await logAction('EDIT_INVOICE_DETAILS', { orderNumber, updates: updateObj }, orderNumber, 'order');

            return { status: 'SUCCESS', message: 'Đã cập nhật thông tin hóa đơn trên Supabase' };
        }

        if (action === 'manualMatchCar') {
            const orderNumber = params.orderNumber;
            const vin = params.vin;
            const { data: order, error: fetchErr } = await supabaseAdmin.from('donhang').select('ten_tu_van_ban_hang').eq('so_don_hang', orderNumber).single();
            if (fetchErr) throw fetchErr;

            const { error: khoxeUpdateErr } = await supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: currentUser, thoi_gian_het_han_giu: 'Vô thời hạn' }).eq('vin', vin);
            if (khoxeUpdateErr) throw khoxeUpdateErr;

            const { error: donhangUpdateErr } = await supabaseAdmin.from('donhang').update({ vin, ket_qua: 'Đã ghép', thoi_gian_ghep: new Date().toISOString() }).eq('so_don_hang', orderNumber);
            if (donhangUpdateErr) throw donhangUpdateErr;

            if (order?.ten_tu_van_ban_hang) {
                await createNotification({
                    message: `Admin đã ghép xe (VIN: ${vin}) cho ĐH ${orderNumber} của bạn.`,
                    type: 'success',
                    recipient: order.ten_tu_van_ban_hang,
                    targetView: 'orders',
                    targetId: orderNumber
                });
            }

            // GỬI EMAIL THÔNG BÁO (Đồng bộ với ghép tự động)
            const { data: fullOrder } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
            if (fullOrder) {
                supabaseAdmin.functions.invoke('send-email', {
                    body: { 
                        actionId: 'match_success', 
                        record: fullOrder 
                    }
                }).then(({ error }) => { if (error) console.warn('Lỗi gửi mail manualMatchCar:', error) });
            }

            await logAction('MANUAL_MATCH', { orderNumber, vin }, orderNumber, 'order');

            return { status: 'SUCCESS', message: 'Đã ghép xe trên Supabase thành công' };
        }

        if (action === 'revertOrderStatus') {
            const tr = params.orderNumber?.trim();
            if (!tr) return { status: 'ERROR', message: 'Số đơn hàng không hợp lệ.' };
            
            // Tìm kiếm không phân biệt chữ hoa/thường bằng ilike
            const { data: o } = await supabaseAdmin.from('donhang').select('*').ilike('so_don_hang', tr).limit(1).maybeSingle();
            
            if (!o) {
                return { status: 'ERROR', message: `Không tìm thấy đơn hàng: ${tr}` };
            }
            
            if (o) {
                let ns = ''; 
                const realOrderNumber = o.so_don_hang;
                const currentStatus = (o.ket_qua || '').trim();
                
                switch (currentStatus) { 
                    case 'Đã hoàn tất': 
                        ns = 'Đã xuất hóa đơn'; 
                        break; 
                    case 'Đã xuất hóa đơn': 
                        ns = 'Chờ ký hóa đơn'; 
                        break; 
                    case 'Chờ ký hóa đơn': 
                        ns = 'Đã phê duyệt'; 
                        await supabaseAdmin.from('donhang').update({ ngay_xuat_hoa_don: null }).eq('so_don_hang', realOrderNumber); 
                        await supabaseAdmin.from('yeucauxhd').update({ ngay_xuat_hoa_don: null }).eq('so_don_hang', realOrderNumber); 
                        break; 
                    case 'Đã phê duyệt': 
                        ns = 'Chờ phê duyệt'; 
                        await supabaseAdmin.from('yeucauxhd').update({ ghi_chu_admin: 'Admin đã hoàn tác về Chờ phê duyệt' }).eq('so_don_hang', realOrderNumber);
                        break; 
                    case 'Chờ phê duyệt': 
                    case 'Yêu cầu bổ sung': 
                        ns = 'Đã ghép'; 
                        // [Nâng cấp]: Xoá hoàn toàn hồ sơ yêu cầu XHĐ để phục hồi nguyên bản trạng thái ghép xe chưa yc
                        const { error: delErr } = await supabaseAdmin.from('yeucauxhd').delete().eq('so_don_hang', realOrderNumber);
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
                        await supabaseAdmin.from('donhang').update({ ket_qua: 'Chưa ghép', vin: null, thoi_gian_ghep: null }).eq('so_don_hang', realOrderNumber); 
                        await logAction('REVERT_STATUS', { orderNumber: realOrderNumber, from: o.ket_qua, to: 'Chưa ghép' }, realOrderNumber, 'order'); 
                        break; 
                    case 'Đã hủy': 
                        const { data: ls } = await supabaseAdmin.from('interactions').select('metadata').eq('target_id', realOrderNumber).eq('category', 'LOG').in('type', ['DELETE_ORDER', 'CANCEL_REQUEST']).order('created_at', { ascending: false }).limit(1); 
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
                            await supabaseAdmin.from('donhang').update(sn).eq('so_don_hang', realOrderNumber); 
                            break; 
                        } 
                        ns = 'Chưa ghép'; 
                        break; 
                    default: 
                        break; 
                }
                
                if (ns) {
                     const { error: updErr } = await supabaseAdmin.from('donhang').update({ ket_qua: ns, ghi_chu_huy: null, thoi_gian_huy: null }).eq('so_don_hang', realOrderNumber);
                     if (updErr) throw new Error(`Lỗi cập nhật Đơn hàng: ${updErr.message}`);
                     const rc = o.ten_tu_van_ban_hang || (o as any).tvbh; 
                     if (rc) await createNotification({ message: `Đơn hàng ${realOrderNumber} đã được Admin chuyển về: ${ns}`, type: 'info', recipient: rc, targetView: 'orders', targetId: realOrderNumber });
                     await logAction('REVERT_STATUS', { orderNumber: realOrderNumber, from: o.ket_qua, to: ns }, realOrderNumber, 'order');
                } else {
                     return { status: 'ERROR', message: `Không hỗ trợ hoàn tác từ trạng thái "${currentStatus}".` };
                }
            }
            return { status: 'SUCCESS', message: 'Hoàn tác trạng thái thành công.' };
        }
        if (action === 'advanceOrderStatus') {
            const orderNumber = params.orderNumber;
            const { data: order, error: fetchErr } = await supabaseAdmin.from('donhang').select('ket_qua, ten_tu_van_ban_hang, vin').eq('so_don_hang', orderNumber).single();
            if (fetchErr) throw fetchErr;

            const currentStatus = order.ket_qua;
            let newStatus = '';

            switch (currentStatus) {
                case 'Đã ghép':
                    newStatus = 'Chờ phê duyệt';
                    break;
                case 'Chờ phê duyệt':
                case 'Yêu cầu bổ sung':
                    newStatus = 'Đã phê duyệt';
                    break;
                case 'Đã phê duyệt':
                    newStatus = 'Chờ ký hóa đơn';
                    break;
                case 'Chờ ký hóa đơn':
                    newStatus = 'Đã xuất hóa đơn';
                    break;
                case 'Đã xuất hóa đơn':
                    newStatus = 'Đã hoàn tất';
                    break;
                default:
                    return { status: 'ERROR', message: `Không thể tự động tiến tới trạng thái từ: ${currentStatus}` };
            }

            const { error: updateErr } = await supabaseAdmin.from('donhang').update({ 
                ket_qua: newStatus,
                ghi_chu_huy: null,
                thoi_gian_huy: null 
            }).eq('so_don_hang', orderNumber);
            if (updateErr) throw updateErr;

            // Sync with yeucauxhd
            if (['Chờ phê duyệt', 'Đã phê duyệt', 'Chờ ký hóa đơn', 'Đã xuất hóa đơn'].includes(newStatus)) {
                await supabaseAdmin.from('yeucauxhd').update({ trang_thai_vc: newStatus }).eq('so_don_hang', orderNumber);
            }

            if (order?.ten_tu_van_ban_hang || (order as any)?.tvbh) {
                await createNotification({
                    message: `Đơn hàng ${orderNumber} đã được Admin chuyển trạng thái tiến tới: ${newStatus}`,
                    type: 'info',
                    recipient: order.ten_tu_van_ban_hang || (order as any).tvbh,
                    targetView: 'orders',
                    targetId: orderNumber
                });
            }

            await logAction('ADVANCE_STATUS', { orderNumber, from: currentStatus, to: newStatus }, orderNumber, 'order');
            return { status: 'SUCCESS', message: `Đã tiến tới "${newStatus}" thành công`, newStatus };
        }

        if (action === 'approveVcRequest') {
            const orderNumber = params.orderNumber;
            const { data: vcReq } = await supabaseAdmin.from('yeucauvc').select('nguoi_yc').eq('so_don_hang', orderNumber).single();

            await supabaseAdmin.from('yeucauvc').update({ trang_thai_xu_ly: 'Đã phê duyệt' }).eq('so_don_hang', orderNumber);
            await supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Đã phê duyệt VC' }).eq('so_don_hang', orderNumber);
            
            if (vcReq?.nguoi_yc) {
                await createNotification({
                    message: `Yêu cầu VinClub cho ĐH ${orderNumber} đã được phê duyệt.`,
                    type: 'success',
                    recipient: vcReq.nguoi_yc,
                    targetView: 'orders',
                    targetId: orderNumber
                });
            }

            await logAction('APPROVE_VC', { orderNumber }, orderNumber, 'vc');
            return { status: 'SUCCESS', message: 'Đã phê duyệt yêu cầu VC thành công!' };
        }

        if (action === 'rejectVcRequest') {
            const orderNumber = params.orderNumber;
            const reason = params.reason || '';
            const { data: vcReq } = await supabaseAdmin.from('yeucauvc').select('nguoi_yc').eq('so_don_hang', orderNumber).single();

            await supabaseAdmin.from('yeucauvc').update({ trang_thai_xu_ly: 'Từ chối ycvc', ghi_chu: reason }).eq('so_don_hang', orderNumber);
            await supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Từ chối VC' }).eq('so_don_hang', orderNumber);
            
            if (vcReq?.nguoi_yc) {
                const { data: orderVin } = await supabaseAdmin.from('donhang').select('vin').eq('so_don_hang', orderNumber).single();
                if (orderVin?.vin) {
                    await supabaseAdmin.from('car_hold_activities').insert({
                        vin: orderVin.vin,
                        username: vcReq.nguoi_yc,
                        tvbh_name: vcReq.nguoi_yc,
                        type: 'PENALTY',
                        status: 'vc_rejected',
                        reason: `Từ chối VC: ${reason.substring(0, 50)}`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }

                await createNotification({
                    message: `Yêu cầu VinClub cho ĐH ${orderNumber} đã bị từ chối. Lý do: ${reason}`,
                    type: 'danger',
                    recipient: vcReq.nguoi_yc,
                    targetView: 'orders',
                    targetId: orderNumber
                });
            }

            await logAction('REJECT_VC', { orderNumber, reason }, orderNumber, 'vc');
            return { status: 'SUCCESS', message: 'Đã từ chối yêu cầu VC.' };
        }

        if (action === 'confirmVcUnc') {
            const orderNumber = params.orderNumber;
            const { data: vcReq } = await supabaseAdmin.from('yeucauvc').select('nguoi_yc').eq('so_don_hang', orderNumber).single();

            await supabaseAdmin.from('yeucauvc').update({ trang_thai_xu_ly: 'Đã xác thực UNC' }).eq('so_don_hang', orderNumber);
            await supabaseAdmin.from('donhang').update({ trang_thai_vc: 'Đã có VC' }).eq('so_don_hang', orderNumber);
            
            if (vcReq?.nguoi_yc) {
                await createNotification({
                    message: `Chứng từ UNC VinClub cho ĐH ${orderNumber} đã được xác thực.`,
                    type: 'success',
                    recipient: vcReq.nguoi_yc,
                    targetView: 'orders',
                    targetId: orderNumber
                });
            }

            await logAction('CONFIRM_VC_UNC', { orderNumber }, orderNumber, 'vc');
            return { status: 'SUCCESS', message: 'Đã xác nhận UNC thành công.' };
        }
    } catch (e: any) {
        console.error("Supabase Admin Action Error:", e);
        // Nếu đây là một action nằm trong danh sách được xử lý bởi Supabase ở trên, 
        // ta trả về lỗi luôn thay vì fallthrough sang GAS để tránh báo "Thành công" giả.
        const handledActions = [
            'deleteOrderLogic', 'cancelRequest', 'findAndAddCarByVin', 'bulkAddCarsByVin', 'bulkAddCarsDetailed',
            'deleteCarFromStockLogic', 'restoreCarToStockLogic', 'approveSelectedInvoiceRequest',
            'markAsPendingSignature', 'requestSupplementForInvoice', 'unmatchOrder',
            'updateRowData', 'manualMatchCar', 'revertOrderStatus', 'advanceOrderStatus', 'approveVcRequest', 'rejectVcRequest',
            'confirmVcUnc', 'syncNewUser'
        ];
        if (handledActions.includes(action)) {
            return { status: 'ERROR', message: `Lỗi Supabase: ${e.message || 'Không xác định'}` };
        }
    }
    // -------------------------------------
    if (action === 'archiveInvoicedOrdersMonthly') {
        await logAction('ARCHIVE_DATA', {}, 'system', 'archive');
        try {
            const now = new Date();
            // Lấy ngày mùng 1 của tháng hiện tại (first of month)
            const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const { data: invoicedOrders, error: fetchErr } = await supabaseAdmin
                .from('yeucauxhd')
                .select('*')
                .not('ngay_xuat_hoa_don', 'is', null)
                .limit(10000);

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
                    hoa_hong_ung: typeof y.hoa_hong_ung === 'number' ? y.hoa_hong_ung : 0,
                    vpoint: typeof y.vpoint === 'number' ? y.vpoint : 0,
                    url_hop_dong: y.url_hop_dong,
                    url_de_nghi_xhd: y.url_de_nghi_xhd,
                    url_hoa_don_da_xuat: y.url_hoa_don_da_xuat,
                    trang_thai_vc: y.trang_thai_vc,
                    ket_qua: 'Đã xuất hóa đơn',
                    created_at: parseDateSafe(y.created_at) || new Date().toISOString()
                }));

                archivedCount = archivePayload.length;
                const soDonHangs = archivePayload.map(o => o.so_don_hang);

                // Kiểm tra các đơn đã lưu trữ để tránh trùng lặp do thiếu ON CONFLICT (unique constraint)
                const { data: existingArchived } = await supabaseAdmin.from('archived_orders').select('so_don_hang').in('so_don_hang', soDonHangs);
                const existingSet = new Set(existingArchived?.map(a => a.so_don_hang) || []);
                const newPayload = archivePayload.filter(a => !existingSet.has(a.so_don_hang));

                if (newPayload.length > 0) {
                    const { error: insertErr } = await supabaseAdmin.from('archived_orders').insert(newPayload);
                    if (insertErr) throw insertErr;
                }

                // Use bulk delete to avoid large parameter lists (batch 100 at a time)
                for (let i = 0; i < soDonHangs.length; i += 100) {
                    const batch = soDonHangs.slice(i, i + 100);
                    
                    // Xóa file trong kho lưu trữ (yeucauxhd-files) để giải phóng dung lượng (Egress/Storage)
                    for (const orderNo of batch) {
                        try {
                            const { data: files } = await supabaseAdmin.storage.from('yeucauxhd-files').list(orderNo);
                            if (files && files.length > 0) {
                                const toDelete = files.map(f => `${orderNo}/${f.name}`);
                                await supabaseAdmin.storage.from('yeucauxhd-files').remove(toDelete);
                            }
                        } catch (e) { console.warn(`Lỗi xóa file kho của ${orderNo}`, e); }
                    }

                    const { error: delYeuCauErr } = await supabaseAdmin.from('yeucauxhd').delete().in('so_don_hang', batch);
                    if (delYeuCauErr) console.warn("Lỗi xóa yeucauxhd:", delYeuCauErr);
                    const { error: delDonHangErr } = await supabaseAdmin.from('donhang').delete().in('so_don_hang', batch);
                    if (delDonHangErr) console.warn("Lỗi xóa donhang:", delDonHangErr);
                }
            }

            return { status: 'SUCCESS', message: `Đã lưu trữ ${archivedCount} đơn hàng thành công.` };
        } catch (err: any) {
            console.error('Archive error:', err);
            return { status: 'ERROR', message: `Lỗi lưu trữ: ${err.message}` };
        }
    }
    if (action === 'addUser') {
        try {
            const username = generateUsernameFromFullName(params.fullName);
            const rawPassword = generateRandomPassword();
            const passwordHash = await hashPassword(rawPassword);
            
            const { error: insErr } = await supabaseAdmin.from('users').insert({
                username: username,
                email: params.email,
                full_name: params.fullName,
                role: 'Tư vấn bán hàng',
                password_hash: passwordHash
            });

            if (insErr) {
                if (insErr.code === '23505') {
                    return { status: 'ERROR', message: `Người dùng với tên đăng nhập (${username}) hoặc email này đã tồn tại.` };
                }
                throw insErr;
            }



            console.log(`[AddUser] Đang gửi email chào mừng cho ${username} (${params.email})...`);

            // Gửi email chào mừng kèm mật khẩu và link web (Await để đảm bảo gửi thành công trước khi báo kết thúc)
            try {
                await supabaseAdmin.functions.invoke('send-email', {
                    body: {
                        actionId: 'welcome_new_user',
                        record: {
                            full_name: params.fullName,
                            username: username,
                            password: rawPassword,
                            email: params.email,
                            web_link: `https://srthuanan.github.io/ordermanagement?action=first-login&user=${username}`
                        }
                    }
                });
            } catch (e) {
                console.warn('Lỗi gửi mail chào mừng:', e);
            }

            await logAction('ADD_USER', { fullName: params.fullName, email: params.email, username }, params.email, 'user');
            return { status: 'SUCCESS', message: `Tạo người dùng thành công! Username: ${username}, Password: ${rawPassword}. Thông tin đã được gửi qua email.` };
        } catch (err: any) {
            console.error('[AddUser Error] Chi tiết lỗi:', err);
            return { status: 'ERROR', message: `Lỗi thêm TVBH: ${err.message}` };
        }
    }

    if (action === 'syncNewUser') {
        try {
            const username = generateUsernameFromFullName(params.fullName);
            
            // 1. Kiểm tra xem người dùng đã tồn tại qua Email chưa để lấy đúng username
            const { data: existingUser } = await supabaseAdmin
                .from('users')
                .select('username')
                .eq('email', params.email)
                .maybeSingle();

            const targetUsername = existingUser ? existingUser.username : username;

            // 2. Sử dụng upsert dựa trên username (Primary Key)
            const { error: insErr } = await supabaseAdmin.from('users').upsert({
                username: targetUsername,
                email: params.email,
                full_name: params.fullName,
                role: params.role || 'Tư vấn bán hàng',
                password_hash: 'INVITED_VIA_AUTH'
            }, { onConflict: 'username' });

            if (insErr) throw insErr;
            
            await logAction('SYNC_USER', { fullName: params.fullName, email: params.email, username: targetUsername }, params.email, 'user');
            return { status: 'SUCCESS', message: `Đã đồng bộ người dùng ${targetUsername} thành công.` };
        } catch (err: any) {
            console.error('[SyncNewUser Error]:', err);
            return { status: 'ERROR', message: `Lỗi đồng bộ TVBH: ${err.message}` };
        }
    }
        if (action === 'generateInviteLink') {
            try {
                const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                const expiry = new Date();
                expiry.setHours(expiry.getHours() + 48); // Hết hạn sau 48 giờ

                // Tạo một username tạm thời
                const tempUsername = 'pending_' + Math.random().toString(36).substring(2, 7);

                // Lưu thông tin vào bảng users (tận dụng cột otp_code và otp_expiry có sẵn)
                const { error: insErr } = await supabaseAdmin.from('users').insert({
                    username: tempUsername,
                    full_name: params.fullName,
                    role: params.role || 'Tư vấn bán hàng',
                    otp_code: token,
                    otp_expiry: expiry.toISOString(),
                    email: 'pending_' + token + '@placeholder.com', // Email tạm thời
                    password_hash: 'PENDING_ONBOARDING'
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

    // Fallback for actions not handled by Supabase Directly
    return await postApi({ action, ...params });
};

export const getOrderHistory = async (orderNumber: string): Promise<ApiResult> => {
    return getApi({ action: 'getOrderHistory', orderNumber });
}

export const uploadBulkInvoices = async (filesData: any[]): Promise<ApiResult> => {
    try {
        for (let fileInfo of filesData) {
            const orderNo = fileInfo.orderNumber.trim();
            const timestamp = Date.now();

            // 1. Fetch customer name (thử từ donhang trước, fallback yeucauxhd)
            let customerNameData = 'KH';
            const { data: orderData } = await supabase.from('donhang')
                .select('ten_khach_hang, ten_tu_van_ban_hang')
                .eq('so_don_hang', orderNo)
                .single();

            if (orderData?.ten_khach_hang) {
                customerNameData = orderData.ten_khach_hang;
            } else {
                // Fallback từ yeucauxhd
                const { data: yeuCauData } = await supabase.from('yeucauxhd')
                    .select('ten_khach_hang, ten_tu_van_ban_hang')
                    .eq('so_don_hang', orderNo)
                    .single();
                if (yeuCauData?.ten_khach_hang) {
                    customerNameData = yeuCauData.ten_khach_hang;
                }
            }

            const sanitizeFileName = (name: string): string => {
                return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._\-]/g, '').toUpperCase();
            };
            const customerNameSafe = sanitizeFileName(customerNameData);

            // 2. Upload to Supabase Storage if fileObject is provided
            let urlHoaDonDaXuat = '';
            if (fileInfo.fileObject) {
                const ext = fileInfo.fileObject.name.split('.').pop();
                const path = `${orderNo}/HOADON_${customerNameSafe}_${timestamp}.${ext}`;
                urlHoaDonDaXuat = await uploadToSupabase(fileInfo.fileObject, path);
            }

            // 3. Update yeucauxhd — ghi nhận URL và ngày xuất
            const yeucauxhdUpdate: any = {
                ket_qua_gui_mail: '',
            };
            if (urlHoaDonDaXuat) {
                yeucauxhdUpdate.url_hoa_don_da_xuat = urlHoaDonDaXuat;
            }
            const { error: yeuErr } = await supabaseAdmin.from('yeucauxhd')
                .update(yeucauxhdUpdate)
                .eq('so_don_hang', orderNo);
            if (yeuErr) console.error(`[uploadBulkInvoices] yeucauxhd update error [${orderNo}]:`, yeuErr.message);

            // 4. Update donhang — đổi trạng thái và ghi link hóa đơn
            const donhangUpdate: any = {
                ket_qua: 'Đã xuất hóa đơn',
            };
            if (urlHoaDonDaXuat) {
                donhangUpdate.link_hoa_don_da_xuat = urlHoaDonDaXuat;
            }
            const { error: donErr } = await supabaseAdmin.from('donhang')
                .update(donhangUpdate)
                .eq('so_don_hang', orderNo);
            if (donErr) console.error(`[uploadBulkInvoices] donhang update error [${orderNo}]:`, donErr.message);

            await logAction('UPLOAD_INVOICE', { orderNumber: orderNo }, orderNo, 'order');

            // 5. Gửi email & Lưu trữ Drive
            if (urlHoaDonDaXuat) {
                // Chuẩn bị nội dung base64 (xóa prefix nếu có)
                const base64Clean = fileInfo.base64Data?.includes(',') 
                    ? fileInfo.base64Data.split(',')[1] 
                    : fileInfo.base64Data;

                // Call Edge Function directly for the new email template
                supabaseAdmin.functions.invoke('send-email', {
                    body: { 
                        actionId: 'invoice_issued', 
                        record: { 
                            so_don_hang: orderNo,
                            ten_khach_hang: customerNameData,
                            ten_tu_van_ban_hang: orderData?.ten_tu_van_ban_hang,
                            url_hoa_don_da_xuat: urlHoaDonDaXuat,
                            invoice_content: base64Clean
                        } 
                    }
                }).catch(e => console.error(`[uploadBulkInvoices] Email error [${orderNo}]:`, e));

                // Still notify GAS for archiving to Drive, but GAS should NOT send email anymore
                postApi({ action: 'notifyInvoiceUploaded', orderNumber: orderNo, skipEmail: true })
                    .catch(e => console.error(`[uploadBulkInvoices] Archive error [${orderNo}]:`, e));
            }
        }

        return { status: 'SUCCESS', message: `Đã xuất ${filesData.length} hóa đơn thành công! Hệ thống đang gửi email thông báo...` };
    } catch (e: any) {
        return { status: 'ERROR', message: e.message || 'Lỗi khi xuất hóa đơn hàng loạt' };
    }
};


// --- Test Drive Actions ---




export const getTestDriveSchedule = async (): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('test_drive_schedule').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        // Map from snake_case database to camelCase frontend expected
        const schedule = data.map(item => ({
            soPhieu: item.so_phieu,
            ngayThuXe: item.ngay_thu_xe,
            loaiXe: item.loai_xe,
            thoiGianKhoiHanh: item.thoi_gian_khoi_hanh,
            thoiGianTroVe: item.thoi_gian_tro_ve,
            loTrinh: item.lo_trinh,
            tenKhachHang: item.ten_khach_hang,
            dienThoai: item.dien_thoai,
            email: item.email,
            diaChi: item.dia_chi,
            tuLai: String(item.tu_lai),
            dacDiem: item.dac_diem,
            gplxSo: item.gplx_so,
            hieuLucGPLX: item.hieu_luc_gplx,
            ngayCamKet: item.ngay_cam_ket,
            tenTuVan: item.ten_tu_van,
            odoBefore: item.odo_before,
            imagesBefore: item.images_before, // jsonb gets parsed automatically
            odoAfter: item.odo_after,
            imagesAfter: item.images_after,
            bienSo: item.bien_so,
            coSo: item.co_so,
            gplxHang: item.gplx_hang,
            cmndO: item.cmnd_o,
            cmndNoiCap: item.cmnd_noi_cap,
            cmndNgayCap: item.cmnd_ngay_cap,
        }));
        return { status: 'SUCCESS', data: schedule, message: "Lấy lịch lái thử thành công." };
    } catch (err: any) {
        console.error(err);
        return { status: 'ERROR', message: "Lỗi tải lịch lái thử: " + err.message };
    }
};

export const saveTestDriveBooking = async (bookingData: any): Promise<ApiResult> => {
    try {
        const mappedData = {
                so_phieu: bookingData.soPhieu,
                ngay_thu_xe: bookingData.ngayThuXe,
                loai_xe: bookingData.loaiXe,
                thoi_gian_khoi_hanh: bookingData.thoiGianKhoiHanh,
                thoi_gian_tro_ve: bookingData.thoiGianTroVe,
                lo_trinh: bookingData.loTrinh,
                ten_khach_hang: bookingData.tenKhachHang,
                dien_thoai: bookingData.dienThoai,
                email: bookingData.email,
                dia_chi: bookingData.diaChi,
                tu_lai: String(bookingData.tuLai),
                dac_diem: bookingData.dacDiem,
                gplx_so: bookingData.gplxSo,
                hieu_luc_gplx: bookingData.hieuLucGPLX,
                ngay_cam_ket: bookingData.ngayCamKet,
                ten_tu_van: bookingData.tenTuVan,
                odo_before: bookingData.odoBefore,
                images_before: bookingData.imagesBefore,
                odo_after: bookingData.odoAfter,
                images_after: bookingData.imagesAfter,
                bien_so: bookingData.bienSo,
                co_so: bookingData.coSo,
                gplx_hang: bookingData.gplxHang,
                cmnd_o: bookingData.cmndO,
                cmnd_noi_cap: bookingData.cmndNoiCap,
                cmnd_ngay_cap: bookingData.cmndNgayCap,
        };
        const { data, error } = await supabase.from('test_drive_schedule').upsert(mappedData).select().single();
        if (error) throw error;
        
        // Map back to camelCase
        const newRecord = {
            soPhieu: data.so_phieu,
            ngayThuXe: data.ngay_thu_xe,
            loaiXe: data.loai_xe,
            thoiGianKhoiHanh: data.thoi_gian_khoi_hanh,
            thoiGianTroVe: data.thoi_gian_tro_ve,
            loTrinh: data.lo_trinh,
            tenKhachHang: data.ten_khach_hang,
            dienThoai: data.dien_thoai,
            email: data.email,
            diaChi: data.dia_chi,
            tuLai: String(data.tu_lai),
            dacDiem: data.dac_diem,
            gplxSo: data.gplx_so,
            hieuLucGPLX: data.hieu_luc_gplx,
            ngayCamKet: data.ngay_cam_ket,
            tenTuVan: data.ten_tu_van,
            odoBefore: data.odo_before,
            imagesBefore: data.images_before,
            odoAfter: data.odo_after,
            imagesAfter: data.images_after,
            bienSo: data.bien_so,
            coSo: data.co_so,
            gplxHang: data.gplx_hang,
            cmndO: data.cmnd_o,
            cmndNoiCap: data.cmnd_noi_cap,
            cmndNgayCap: data.cmnd_ngay_cap,
        };

        return { status: 'SUCCESS', message: 'Lưu lịch lái thử thành công.', newRecord };
    } catch (err: any) {
        console.error(err);
        return { status: 'ERROR', message: "Lỗi lưu lịch lái thử: " + err.message };
    }
};

export const updateTestDriveCheckin = async (payload: {
    soPhieu: string;
    odoBefore?: string;
    imagesBefore?: { name: string; type: string; data: string }[];
    odoAfter?: string;
    imagesAfter?: { name: string; type: string; data: string }[];
    updateMode?: 'append';
}): Promise<ApiResult> => {
    try {
        const updates: any = {};
        
        const uploadBase64ToStorage = async (images: { name: string; type: string; data: string }[], prefix: string) => {
            const uploadPromises = images.map(async (img) => {
                // More robust Base64 to Blob conversion
                const byteCharacters = atob(img.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: img.type });
                
                const safeName = img.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const path = `test-drive/${payload.soPhieu}/${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}_${safeName}`;
                
                const { error } = await supabaseAdmin.storage.from('yeucauxhd-files').upload(path, blob, { upsert: true });
                if (error) throw error;
                
                const { data } = supabase.storage.from('yeucauxhd-files').getPublicUrl(path);
                return data.publicUrl;
            });
            return Promise.all(uploadPromises);
        };

        // Fetch existing data for merge
        const { data: existingRecord, error: fetchErr } = await supabase.from('test_drive_schedule').select('images_before, images_after').eq('so_phieu', payload.soPhieu).maybeSingle();
        if (fetchErr) throw fetchErr;

        if (payload.odoBefore) updates.odo_before = payload.odoBefore;
        if (payload.imagesBefore && payload.imagesBefore.length > 0) {
            const newUrls = await uploadBase64ToStorage(payload.imagesBefore, 'before');
            const existBefore = Array.isArray(existingRecord?.images_before) ? existingRecord.images_before : [];
            updates.images_before = [...existBefore, ...newUrls];
        }
        
        if (payload.odoAfter) updates.odo_after = payload.odoAfter;
        if (payload.imagesAfter && payload.imagesAfter.length > 0) {
            const newUrls = await uploadBase64ToStorage(payload.imagesAfter, 'after');
            const existAfter = Array.isArray(existingRecord?.images_after) ? existingRecord.images_after : [];
            updates.images_after = [...existAfter, ...newUrls];
        }
        
        const { data: updatedData, error } = await supabase.from('test_drive_schedule').update(updates).eq('so_phieu', payload.soPhieu).select().single();
        if (error) throw error;
        
        // Map back to camelCase
        const updatedRecord = {
            soPhieu: updatedData.so_phieu,
            ngayThuXe: updatedData.ngay_thu_xe,
            loaiXe: updatedData.loai_xe,
            thoiGianKhoiHanh: updatedData.thoi_gian_khoi_hanh,
            thoiGianTroVe: updatedData.thoi_gian_tro_ve,
            loTrinh: updatedData.lo_trinh,
            tenKhachHang: updatedData.ten_khach_hang,
            dienThoai: updatedData.dien_thoai,
            email: updatedData.email,
            diaChi: updatedData.dia_chi,
            tuLai: String(updatedData.tu_lai),
            dacDiem: updatedData.dac_diem,
            gplxSo: updatedData.gplx_so,
            hieuLucGPLX: updatedData.hieu_luc_gplx,
            ngayCamKet: updatedData.ngay_cam_ket,
            tenTuVan: updatedData.ten_tu_van,
            odoBefore: updatedData.odo_before,
            imagesBefore: updatedData.images_before,
            odoAfter: updatedData.odo_after,
            imagesAfter: updatedData.images_after,
            bienSo: updatedData.bien_so,
            coSo: updatedData.co_so,
            gplxHang: updatedData.gplx_hang,
            cmndO: updatedData.cmnd_o,
            cmndNoiCap: updatedData.cmnd_noi_cap,
            cmndNgayCap: updatedData.cmnd_ngay_cap,
        };

        return { status: 'SUCCESS', message: 'Cập nhật ảnh và ODO thành công.', updatedRecord };
    } catch (err: any) {
        console.error(err);
        return { status: 'ERROR', message: "Lỗi cập nhật hình ảnh lái thử: " + err.message };
    }
};

export const updateCarInfo = async (vin: string, updates: Partial<StockVehicle>): Promise<ApiResult> => {
    try {
        const dbUpdates: any = {};
        if (updates['Dòng xe'] !== undefined) dbUpdates.dong_xe = updates['Dòng xe'];
        if (updates['Phiên bản'] !== undefined) dbUpdates.phien_ban = updates['Phiên bản'];
        if (updates['Ngoại thất'] !== undefined) dbUpdates.ngoai_that = updates['Ngoại thất'];
        if (updates['Nội thất'] !== undefined) dbUpdates.noi_that = updates['Nội thất'];
        if (updates['Mã DMS'] !== undefined) dbUpdates.ma_dms = updates['Mã DMS'];
        if (updates['Số máy'] !== undefined) dbUpdates.so_may = updates['Số máy'];
        if (updates.VIN !== undefined) dbUpdates.vin = updates.VIN;

        // [QUAN TRỌNG]: Xóa car_hold_activities trước khi đổi VIN (FK constraint)
        // car_hold_activities là lịch sử giữ xe - xóa an toàn, không ảnh hưởng nghiệp vụ
        if (updates.VIN !== undefined && updates.VIN !== vin) {
            await supabaseAdmin.from('car_hold_activities').delete().eq('vin', vin);
        }

        const { error } = await supabaseAdmin.from('khoxe').update(dbUpdates).eq('vin', vin);
        if (error) throw error;

        if (updates.VIN !== undefined && updates.VIN !== vin) {
            // Cập nhật các bảng con SAU khi khoxe đã đổi VIN thành công
            await supabaseAdmin.from('donhang').update({ vin: updates.VIN }).eq('vin', vin);
            await supabaseAdmin.from('yeucauxhd').update({ vin: updates.VIN }).eq('vin', vin);
            await supabaseAdmin.from('yeucauvc').update({ vin: updates.VIN }).eq('vin', vin);

            // [THÔNG BÁO THAY VIN]: Gửi email + notification cho TVBH khi xe đã ghép bị đổi VIN
            const { data: matchedOrder } = await supabaseAdmin.from('donhang').select('so_don_hang, ten_tu_van_ban_hang, ten_khach_hang, dong_xe, phien_ban, ngoai_that, noi_that').eq('vin', updates.VIN).limit(1).maybeSingle();
            if (matchedOrder && matchedOrder.ten_tu_van_ban_hang) {
                const tvbh = matchedOrder.ten_tu_van_ban_hang;
                // Gửi notification trong app
                await createNotification({
                    message: `Đơn hàng ${matchedOrder.so_don_hang} đã được Admin thay VIN: ${vin} → ${updates.VIN}`,
                    type: 'warning',
                    recipient: tvbh,
                    targetView: 'orders',
                    targetId: matchedOrder.so_don_hang
                });
                // Gửi email thông báo
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
                    else console.log(`[EMAIL] Đã gửi mail thay VIN cho ${tvbh} (${vin} → ${updates.VIN})`);
                }).catch(e => console.warn('[EMAIL] Lỗi Edge Function thay VIN:', e));

                await logAction('REPLACE_VIN', { orderNumber: matchedOrder.so_don_hang, oldVin: vin, newVin: updates.VIN }, matchedOrder.so_don_hang, 'order');
            }
        }

        // [THÔNG BÁO NHẬP KHO]: Gửi khi xe vừa được bổ sung đầy đủ thông tin
        const finalVin = updates.VIN || vin;
        const { data: updatedCar } = await supabaseAdmin.from('khoxe').select('dong_xe, phien_ban, ngoai_that, noi_that, ma_dms').eq('vin', finalVin).limit(1).maybeSingle();
        if (updatedCar && updatedCar.dong_xe && updatedCar.phien_ban && updatedCar.ngoai_that && updatedCar.noi_that && updatedCar.ma_dms) {
            const justChanged = dbUpdates.dong_xe !== undefined || dbUpdates.phien_ban !== undefined || dbUpdates.ngoai_that !== undefined || dbUpdates.noi_that !== undefined || dbUpdates.ma_dms !== undefined;
            if (justChanged) {
                createNotification({ message: `<b>${updatedCar.dong_xe}</b> - ${updatedCar.phien_ban} (${finalVin}) đã nhập kho. Sẵn sàng giao dịch!`, type: 'stock_hero', targetView: 'stock', targetId: finalVin });
            }
        }

        return { status: 'SUCCESS', message: 'Cập nhật thông tin xe thành công.' };
    } catch (error: any) {
        console.error("Error in updateCarInfo:", error);
        return { status: 'ERROR', message: error.message };
    }
};

export const deleteTestDriveBooking = async (soPhieu: string): Promise<ApiResult> => {
    try {
        const { error } = await supabase.from('test_drive_schedule').delete().eq('so_phieu', soPhieu);
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Xóa lịch lái thử thành công.' };
    } catch (err: any) {
        console.error(err);
        return { status: 'ERROR', message: "Lỗi xóa lịch lái thử: " + err.message };
    }
};
/**
 * TVBH submits a car inquiry.
 * Automatically checks khoxe for matching cars with 'Chưa ghép' or 'Đang giữ' status.
 */
export const submitCarInquiry = async (inquiry: {
    tvbh_name: string;
    tvbh_email: string;
    model: string;
    version: string;
    exterior_color: string;
    interior_color: string;
}): Promise<ApiResult> => {
    try {
        // 1. Auto check in khoxe
        const { data: matchingCars, error: stockErr } = await supabase
            .from('khoxe')
            .select('vin, trang_thai')
            .eq('dong_xe', inquiry.model)
            .eq('phien_ban', inquiry.version)
            .eq('ngoai_that', inquiry.exterior_color)
            .eq('noi_that', inquiry.interior_color)
            .in('trang_thai', ['Chưa ghép', 'Đang giữ']);

        if (stockErr) throw stockErr;

        let status: any = 'pending';
        let matchedVin = null;
        let adminResponse = null;

        if (matchingCars && matchingCars.length > 0) {
            status = 'auto_found';
            matchedVin = matchingCars[0].vin;
            adminResponse = `Hệ thống tự động tìm thấy ${matchingCars.length} xe phù hợp. Xe đầu tiên: ${matchedVin}`;
        }

        // 2. Insert inquiry
        const insertPayload: any = {
            ...inquiry,
            status,
            matched_vin: matchedVin,
            admin_response: adminResponse,
            is_read_by_admin: false,
            is_read_by_tvbh: false
        };

        // Only add responded_at if status is auto_found
        if (status === 'auto_found') {
            insertPayload.responded_at = new Date().toISOString();
        }

        const { data: insertedData, error: insertErr } = await supabase
            .from('car_inquiries')
            .insert(insertPayload)
            .select()
            .single();

        if (insertErr) throw insertErr;

        // 3. Create notification for Admin
        await createNotification({
            message: `[Tra cứu kho] ${inquiry.tvbh_name} vừa tạo yêu cầu mới: ${inquiry.model} ${inquiry.version}`,
            type: 'info',
            recipient: 'ADMINS',
            targetView: 'inquiries',
            targetId: (insertedData as any).id
        });

        return { 
            status: 'SUCCESS', 
            message: status === 'auto_found' ? 'Hệ thống đã tự động tìm thấy xe!' : 'Yêu cầu của bạn đã được gửi tới Admin.',
            inquiry: insertedData 
        };
    } catch (error: any) {
        console.error('Error in submitCarInquiry:', error);
        return { status: 'ERROR', message: error.message };
    }
};

export const getCarInquiries = async (email?: string): Promise<any[]> => {
    try {
        // Tự động dọn dẹp các yêu cầu cũ (tạm thời tắt dọn dẹp theo responded_at nếu chưa có cột)
        /* 
        try {
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            
            await supabaseAdmin.from('car_inquiries')
                .delete()
                .lt('responded_at', twoDaysAgo.toISOString())
                .in('status', ['auto_found', 'manual_responded', 'held']);
        } catch (cleanupErr) {
            console.warn("Cleanup old inquiries failed:", cleanupErr);
        }
        */

        let query = supabase.from('car_inquiries').select('*').order('created_at', { ascending: false });
        if (email) {
            query = query.eq('tvbh_email', email);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error in getCarInquiries:', error);
        return [];
    }
};

export const respondToCarInquiry = async (id: string, response: string, matched_vin?: string, status: any = 'manual_responded'): Promise<ApiResult> => {
    try {
        // 1. Get inquiry details to know who to notify
        const { data: inquiry, error: getErr } = await supabase
            .from('car_inquiries')
            .select('tvbh_email, model, version, tvbh_name')
            .eq('id', id)
            .single();
        
        if (getErr) throw getErr;

        // 2. Update the inquiry record
        const updates: any = {
            admin_response: response,
            status,
            is_read_by_tvbh: false
        };
        
        if (matched_vin) updates.matched_vin = matched_vin;

        const { error: updateErr } = await supabaseAdmin.from('car_inquiries').update(updates).eq('id', id);
        if (updateErr) throw updateErr;

        // 3. Create notification for TVBH (Only if not just a silent status change like auto_checking)
        if (status !== 'auto_checking') {
            let message = `[Tra cứu kho] Admin đã phản hồi yêu cầu ${inquiry.model}: ${response || 'Đã cập nhật trạng thái'}`;
            if (status === 'held') message = `[Tra cứu kho] Admin đã GIỮ XE cho bạn: ${inquiry.model} ${inquiry.version}`;
            if (status === 'auto_found') message = `[Tra cứu kho] Hệ thống tìm thấy xe phù hợp: ${inquiry.model}`;

            await createNotification({
                message,
                type: status === 'held' ? 'success' : 'info',
                recipient: inquiry.tvbh_email,
                targetView: 'inquiry',
                targetId: id
            });
        }

        return { status: 'SUCCESS', message: 'Đã phản hồi yêu cầu.' };
    } catch (error: any) {
        console.error('Error in respondToCarInquiry:', error);
        return { status: 'ERROR', message: error.message };
    }
};

export const markInquiryAsRead = async (id: string, forWhom: 'admin' | 'tvbh'): Promise<void> => {
    try {
        const field = forWhom === 'admin' ? 'is_read_by_admin' : 'is_read_by_tvbh';
        await supabase.from('car_inquiries').update({ [field]: true }).eq('id', id);

        // Đồng thời đánh dấu các thông báo liên quan là ĐÃ ĐỌC
        const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
        const currentEmail = getStorageItem("userEmail") || getStorageItem("currentConsultant") || (user?.email);
        
        if (currentEmail) {
            await supabase.from('interactions')
                .update({ is_read: true })
                .eq('category', 'NOTIFICATION')
                .eq('target_id', id)
                .eq('target_view', forWhom === 'admin' ? 'inquiries' : 'inquiry')
                .eq('recipient', forWhom === 'admin' ? 'ADMINS' : currentEmail);
        }
    } catch (error) {
        console.error('Error in markInquiryAsRead:', error);
    }
};

export const deleteCarInquiry = async (id: string): Promise<ApiResult> => {
    try {
        const { error } = await supabaseAdmin.from('car_inquiries').delete().eq('id', id);
        if (error) throw error;
        return { status: 'SUCCESS', message: 'Đã xóa yêu cầu.' };
    } catch (error: any) {
        console.error('Error in deleteCarInquiry:', error);
        return { status: 'ERROR', message: error.message };
    }
};

/**
 * MINI-CHAT: Car Inquiry Comments
 */

export const getInquiryComments = async (inquiryId: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('car_inquiries')
            .select('chat_history')
            .eq('id', inquiryId)
            .single();
        if (error) throw error;
        return data?.chat_history || [];
    } catch (error) {
        console.error('Error in getInquiryComments:', error);
        return [];
    }
};

export const addInquiryComment = async (comment: {
    inquiry_id: string;
    sender_email: string;
    sender_name: string;
    content: string;
    is_admin_comment?: boolean;
}): Promise<ApiResult> => {
    try {
        // 1. Get current chat history
        const { data: inquiry, error: getError } = await supabase
            .from('car_inquiries')
            .select('chat_history, tvbh_email')
            .eq('id', comment.inquiry_id)
            .single();
        
        if (getError) throw getError;

        const newComment = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
            ...comment,
            created_at: new Date().toISOString()
        };

        const updatedHistory = [...(inquiry.chat_history || []), newComment];

        // 2. Update the inquiry record
        const { error: updateError } = await supabaseAdmin
            .from('car_inquiries')
            .update({ 
                chat_history: updatedHistory,
                is_read_by_tvbh: comment.is_admin_comment ? false : true,
                is_read_by_admin: comment.is_admin_comment ? true : false
            })
            .eq('id', comment.inquiry_id);
        
        if (updateError) throw updateError;
        
        // 3. Create notification for admin if TVBH is sender
        if (!comment.is_admin_comment) {
            await createNotification({
                message: `[Tra cứu kho] ${comment.sender_name}: ${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}`,
                type: 'info',
                recipient: 'ADMINS',
                targetView: 'inquiries',
                targetId: comment.inquiry_id
            });
        }
        
        // 4. Create notification for TVBH if Admin is sender
        if (comment.is_admin_comment && (inquiry as any).tvbh_email) {
            await createNotification({
                message: `[Tra cứu kho] Admin đã phản hồi: ${comment.content.substring(0, 50)}${comment.content.length > 50 ? '...' : ''}`,
                type: 'success',
                recipient: (inquiry as any).tvbh_email,
                targetView: 'inquiry',
                targetId: comment.inquiry_id
            });
        }

        return { status: 'SUCCESS', message: 'Đã gửi phản hồi.', data: newComment };
    } catch (error: any) {
        console.error('Error in addInquiryComment:', error);
        return { status: 'ERROR', message: error.message };
    }
};

export const processExpiredQueuePriorities = async () => {
    try {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60000).toISOString();
        const { data: expiredPrios } = await supabaseAdmin.from('car_hold_activities')
            .select('*')
            .eq('type', 'QUEUE')
            .eq('status', 'prioritized')
            .lt('updated_at', fifteenMinsAgo);

        if (!expiredPrios || expiredPrios.length === 0) return;

        for (const expPrio of expiredPrios) {
            // Lượt ưu tiên đã hết hạn -> Xóa người cũ
            await supabaseAdmin.from('car_hold_activities').delete().eq('id', expPrio.id);

            // Chuyển sang người kế tiếp (nếu có)
            const { data: fullQueue } = await supabaseAdmin.from('car_hold_activities')
                .select('*')
                .eq('vin', expPrio.vin)
                .eq('type', 'QUEUE')
                .in('status', ['waiting', 'notified'])
                .order('created_at', { ascending: true });

            if (fullQueue && fullQueue.length > 0) {
                let next = null;
                for (const candidate of fullQueue) {
                    // Check limits using cache for performance
                    const { data: activeHolds } = await supabase.from('khoxe').select('vin', { count: 'exact', head: true }).eq('username_giu_xe', candidate.username).eq('trang_thai', 'Đang giữ');
                    const candHoldsCount = activeHolds?.length || 0;
                    
                    const candRep = await getHoldReputation(candidate.username);
                    let candMax = 0;
                    if (candRep.score >= 85) candMax = 5;
                    else if (candRep.score >= 65) candMax = 4;
                    else if (candRep.score >= 40) candMax = 3;
                    else if (candRep.score >= 15) candMax = 2;
                    else if (candRep.score > 0) candMax = 1;
                    else candMax = 0;

                    if (candRep.isChampion) candMax++;

                    const { data: candPrio } = await supabaseAdmin.from('car_hold_activities').select('id').eq('username', candidate.username).eq('status', 'prioritized').limit(1);

                    if (candHoldsCount < candMax && (!candPrio || candPrio.length === 0)) {
                        next = candidate;
                        break;
                    }
                }

                if (next) {
                    const nowStr = new Date().toISOString();
                    await supabaseAdmin.from('car_hold_activities').update({ status: 'prioritized', updated_at: nowStr }).eq('id', next.id);
                    await createNotification({
                        message: `Xe ${expPrio.vin} đã hết lượt ưu tiên của người trước. Giờ đến lượt bạn (15p)!`,
                        type: 'success',
                        recipient: next.username,
                        targetView: 'stock',
                        targetId: expPrio.vin
                    });
                }
            }
        }
    } catch (e) {
        console.error("Error auto-processing expired queues:", e);
    }
};

export const getAllHoldQueues = async () => {
    try {
        await processExpiredQueuePriorities();
        const { data, error } = await supabase.from('car_hold_activities')
            .select('*')
            .eq('type', 'QUEUE')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        return data as any[];
    } catch (err) {
        return [];
    }
};
export const getVehiclesByVins = async (vins: string[]) => {
    try {
        if (!vins.length) return [];
        const { data, error } = await supabase.from('khoxe')
            .select('*')
            .in('vin', vins);
        
        if (error) throw error;
        return data as any[];
    } catch (err) {
        console.error("Error in getVehiclesByVins:", err);
        return [];
    }
};

export const getAllUsersReputations = async () => {
    try {
        // Fetch from cache and join with users for blocked status
        const { data: cacheData, error: cacheError } = await supabaseAdmin
            .from('user_reputation_cache')
            .select('*');
        
        if (cacheError) throw cacheError;

        const { data: usersData, error: usersError } = await supabaseAdmin
            .from('users')
            .select('username, full_name, is_blocked, blocked_until');
        
        if (usersError) throw usersError;

        const { data: currentHoldsData } = await supabase.from('khoxe')
            .select('username_giu_xe')
            .eq('trang_thai', 'Đang giữ')
            .not('username_giu_xe', 'is', null)
            .neq('username_giu_xe', '');
        
        const currentHoldsMap: Record<string, number> = {};
        (currentHoldsData || []).forEach(c => {
            currentHoldsMap[c.username_giu_xe] = (currentHoldsMap[c.username_giu_xe] || 0) + 1;
        });

        const cacheMap = (cacheData || []).reduce((acc: any, row: any) => ({ ...acc, [row.username]: row }), {});

        const reputations = (usersData || []).map(user => {
            const row = cacheMap[user.username] || { 
                score: 100, 
                total_holds: 0, 
                matched_holds: 0,
                is_champion: false
            };
            const score = row.score;
            let maxHolds = 0;
            let rankName = "";

            if (score >= 85) { maxHolds = 5; rankName = "Tinh Anh"; }
            else if (score >= 65) { maxHolds = 4; rankName = "Chuyên nghiệp"; }
            else if (score >= 40) { maxHolds = 3; rankName = "Tiêu chuẩn"; }
            else if (score >= 15) { maxHolds = 2; rankName = "Cơ bản"; }
            else if (score > 0) { maxHolds = 1; rankName = "Thử thách"; }
            else { maxHolds = 0; rankName = "Bị khóa"; }

            if (row.is_champion) {
                maxHolds += 1;
                rankName += " (Quán Quân)";
            }

            return {
                email: user.username,
                name: user.full_name || user.username,
                total: row.total_holds || 0,
                matched: row.matched_holds || 0,
                score: score,
                is_blocked: user.is_blocked,
                blocked_until: user.blocked_until,
                isChampion: row.is_champion || false,
                currentHolds: currentHoldsMap[user.username] || 0,
                maxHolds: maxHolds,
                rankName: rankName
            };
        });

        return reputations.sort((a, b) => b.score - a.score || b.total - a.total);
    } catch (err) {
        console.error("Error in getAllUsersReputations:", err);
        return [];
    }
};

export const updateUserReputation = async (username: string, targetScore: number, reason: string) => {
    try {
        const adminUser = getStorageItem("currentConsultant") || "Admin";
        
        // 1. Lấy điểm hệ thống hiện tại
        const currentRep = await getHoldReputation(username);
        const systemScore = Number(currentRep.systemScore !== undefined ? currentRep.systemScore : currentRep.score) || 100;
        const adjustment = Number(targetScore) - systemScore;

        if (isNaN(adjustment)) {
            throw new Error("Không thể tính toán mức điều chỉnh. Dữ liệu không hợp lệ.");
        }

        const { error } = await supabase
            .from('reputation_adjustments')
            .upsert({
                username: username,
                adjustment_value: adjustment,
                system_score_at_update: systemScore,
                target_score: targetScore,
                updated_at: new Date().toISOString(),
                updated_by: adminUser,
                reason: reason
            });

        if (error) throw error;
        
        await logAction('UPDATE_REPUTATION', { username, targetScore, adjustment, reason }, username, 'admin');
        
        return { status: 'SUCCESS', message: `Đã cập nhật mức điều chỉnh cho ${username}. Điểm mục tiêu: ${targetScore}%.` };
    } catch (error: any) {
        console.error('Error in updateUserReputation:', error);
        return { status: 'ERROR', message: error.message };
    }
};

export const getUserReputationHistory = async (email: string) => {
    try {
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data, error } = await supabase.from('car_hold_activities')
            .select('*')
            .eq('username', email)
            .in('type', ['HOLD', 'PENALTY', 'BONUS'])
            .gte('created_at', startOfCurrentMonth.toISOString())
            .order('created_at', { ascending: true });
        
        if (error) throw error;

        const history: any[] = [];
        const vinHistory: Record<string, number> = {};
        let releaseCount = 0;

        data.forEach(h => {
            const start = new Date(h.created_at).getTime();
            const end = new Date(h.updated_at || h.created_at).getTime();
            const hours = (end - start) / (1000 * 60 * 60);

            // 1. Success Bonus
            if (h.status === 'matched' || h.status === 'invoiced') {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: h.vin,
                    reason: 'Khớp xe thành công (hoặc xuất hóa đơn)',
                    pointChange: 8,
                    type: 'success'
                });
                
                if (h.status === 'invoiced') {
                    history.push({
                        id: Math.random().toString(36).substring(7),
                        date: h.updated_at,
                        vin: h.vin,
                        reason: 'Thưởng xuất hóa đơn',
                        pointChange: 4,
                        type: 'success'
                    });
                }
                
                if (hours <= 6) {
                    history.push({
                        id: Math.random().toString(36).substring(7),
                        date: h.updated_at || h.created_at,
                        vin: h.vin,
                        reason: `Khớp xe nhanh (${hours.toFixed(1)}h)`,
                        pointChange: 4,
                        type: 'success'
                    });
                }
            }

            // 2. Penalties
            if (h.status === 'expired') {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: h.vin,
                    reason: 'Để xe tự hết hạn',
                    pointChange: -5,
                    type: 'penalty'
                });
                releaseCount++;
            } else if (h.status === 'order_cancelled') {
                const cancelReason = h.reason || '';
                const pointDed = cancelReason.includes('Khách hàng hủy cọc') ? -4 : -2;
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: h.vin,
                    reason: `Hủy đơn: ${cancelReason}`.substring(0, 50) + (cancelReason.length > 50 ? '...' : ''),
                    pointChange: pointDed,
                    type: 'penalty'
                });
            } else if (h.status === 'released') {
                if (hours >= 18) {
                    history.push({
                        id: Math.random().toString(36).substring(7),
                        date: h.updated_at || h.created_at,
                        vin: h.vin,
                        reason: `Nhả xe quá muộn (${Math.floor(hours)}h)`,
                        pointChange: -4,
                        type: 'penalty'
                    });
                } else if (hours >= 12) {
                    history.push({
                        id: Math.random().toString(36).substring(7),
                        date: h.updated_at || h.created_at,
                        vin: h.vin,
                        reason: `Nhả xe chậm (${Math.floor(hours)}h)`,
                        pointChange: -3,
                        type: 'penalty'
                    });
                }
                releaseCount++;
            } else if (h.status === 'supplement_requested') {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: h.vin,
                    reason: h.reason || 'Yêu cầu bổ sung hồ sơ',
                    pointChange: -2,
                    type: 'penalty'
                });
            } else if (h.status === 'vc_rejected') {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: h.vin,
                    reason: h.reason || 'Từ chối yêu cầu VinClub',
                    pointChange: -2,
                    type: 'penalty'
                });
            } else if (h.status === 'extension_requested') {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: h.vin,
                    reason: h.reason || 'Xin gia hạn giữ xe',
                    pointChange: -1,
                    type: 'penalty'
                });
            } else if (h.status === 'extension_rejected') {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: h.vin,
                    reason: h.reason || 'Bị từ chối gia hạn giữ xe',
                    pointChange: -3,
                    type: 'penalty'
                });
            }

            // 3. Giữ chỗ nhiều lần
            vinHistory[h.vin] = (vinHistory[h.vin] || 0) + 1;
            if (vinHistory[h.vin] > 1) {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.created_at,
                    vin: h.vin,
                    reason: `Giữ lại cùng xe nhiều lần (${vinHistory[h.vin]} lần)`,
                    pointChange: -4,
                    type: 'penalty'
                });
            }

            // 4. Spam nhả (churn)
            if (releaseCount > 0 && releaseCount % 5 === 0 && ['released', 'expired'].includes(h.status)) {
                history.push({
                    id: Math.random().toString(36).substring(7),
                    date: h.updated_at || h.created_at,
                    vin: 'HỆ THỐNG',
                    reason: `Tỷ lệ hủy cao (${releaseCount} lần)`,
                    pointChange: -2,
                    type: 'penalty'
                });
            }
        });

        // 5. Admin Adjustments
        const { data: adj } = await supabase
            .from('reputation_adjustments')
            .select('adjustment_value, updated_at, reason')
            .eq('username', email)
            .gte('updated_at', startOfCurrentMonth.toISOString())
            .maybeSingle();

        if (adj && adj.adjustment_value !== 0) {
            history.push({
                id: Math.random().toString(36).substring(7),
                date: adj.updated_at,
                vin: 'ADMIN',
                reason: adj.reason || 'Admin điều chỉnh trực tiếp',
                pointChange: adj.adjustment_value,
                type: adj.adjustment_value > 0 ? 'success' : 'penalty'
            });
        }

        // 6. Ngâm đơn quá lâu (> 5 ngày)
        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
        const { data: lethargicOrders } = await supabase.from('donhang')
            .select('so_don_hang, thoi_gian_ghep, vin')
            .eq('ten_tu_van_ban_hang', email)
            .eq('ket_qua', 'Đã ghép')
            .lte('thoi_gian_ghep', fiveDaysAgo.toISOString());

        if (lethargicOrders && lethargicOrders.length > 0) {
            lethargicOrders.forEach(o => {
                const tzDiffHours = (new Date().getTime() - new Date(o.thoi_gian_ghep || new Date()).getTime()) / (1000 * 60 * 60);
                const days = Math.floor(tzDiffHours / 24);
                history.push({
                    id: o.so_don_hang,
                    date: new Date().toISOString(),
                    vin: o.vin || '—',
                    reason: `Ngâm đơn quá lâu (${days} ngày)`,
                    pointChange: -3,
                    type: 'penalty'
                });
            });
        }

        return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (err) {
        console.error("Error fetching reputation history:", err);
        return [];
    }
};
export const updateOrderPolicy = async (orderNumber: string, policy: string): Promise<ApiResult> => {
    try {
        const { error } = await supabase.from('donhang').update({ chinh_sach: policy }).eq('so_don_hang', orderNumber);
        if (error) throw error;
        
        // Also update yeucauxhd if exists
        await supabase.from('yeucauxhd').update({ chinh_sach: policy }).eq('so_don_hang', orderNumber);

        // Try to log action
        try {
            const { logAction } = await import('./api/baseService');
            await logAction('UPDATE_POLICY', { orderNumber, policy }, orderNumber, 'order');
        } catch (e) {}

        return { status: 'SUCCESS', message: 'Cập nhật chính sách thành công.' };
    } catch (e: any) {
        return { status: 'ERROR', message: e.message || 'Lỗi khi cập nhật chính sách' };
    }
};
