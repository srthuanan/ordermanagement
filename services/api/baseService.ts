import { supabaseAdmin } from '../supabaseClient';
import { defaultExteriors, API_URL, ADMIN_USER } from '../../constants';
import axios from 'axios';

export const getStorageItem = (key: string) => localStorage.getItem(key) || sessionStorage.getItem(key);

export const SOLD_CARS_API_URL = "https://script.google.com/macros/s/AKfycbzElHHCjX_RnObRE3VX42qlz_PnKiF8SvMKieuOwtsV1VlByJXNeZkZ2MvP9fa4ACIgIQ/exec";

export interface ApiResult {
    status: 'SUCCESS' | 'ERROR';
    message: string;
    [key: string]: any;
}

export const getExteriorColorName = (code: string): string => {
    if (!code) return '';
    const upperCode = code.toUpperCase().trim();
    const match = defaultExteriors.find((name: string) => name.toUpperCase().includes(`(${upperCode})`));
    return match || code;
};

export const getInteriorColorName = (code: string): string => {
    if (!code) return '';
    const upperCode = code.toUpperCase().trim();
    const mapping: Record<string, string> = { 'CI11': 'Black', 'CI1H': 'Black', 'CI12': 'Brown', 'CI18': 'Brown', 'CI13': 'Beige', 'CI1M': 'Grey' };
    return mapping[upperCode] || code;
};

export const postApi = async (payload: Record<string, any>, url: string = API_URL): Promise<ApiResult> => {
    try {
        const bodyParams = new URLSearchParams();
        const token = getStorageItem('token');
        if (token && !payload.token) payload.token = token;
        for (const key in payload) {
            if (payload[key] !== null && payload[key] !== undefined) bodyParams.append(key, String(payload[key]));
        }
        const response = await axios.post(url, bodyParams);
        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
        if (result.status !== 'SUCCESS') {
            if (result.message && result.message.includes('Unauthorized')) { sessionStorage.removeItem('token'); sessionStorage.removeItem('isLoggedIn'); window.location.reload(); }
            throw new Error(result.message || 'API error.');
        }
        return result;
    } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Unknown error.';
        if (msg.includes('Unauthorized')) { sessionStorage.removeItem('token'); sessionStorage.removeItem('isLoggedIn'); window.location.reload(); }
        throw new Error(msg);
    }
};

export const getApi = async (params: Record<string, any>, baseUrl: string = API_URL): Promise<ApiResult> => {
    try {
        const url = new URL(baseUrl);
        const token = getStorageItem('token');
        if (token && !params.token) params.token = token;
        Object.keys(params).forEach(key => { if (params[key] !== undefined && params[key] !== null) url.searchParams.append(key, String(params[key])); });
        const response = await axios.get(url.toString());
        const result = (typeof response.data === 'string') ? JSON.parse(response.data) : response.data;
        if (result.status !== 'SUCCESS') {
            if (result.message && result.message.includes('Unauthorized')) { sessionStorage.removeItem('token'); sessionStorage.removeItem('isLoggedIn'); window.location.reload(); }
            throw new Error(result.message || 'API error.');
        }
        return result;
    } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Unknown error.';
        if (msg.includes('Unauthorized')) { sessionStorage.removeItem('token'); sessionStorage.removeItem('isLoggedIn'); window.location.reload(); }
        throw new Error(msg);
    }
};

export const uploadToSupabase = async (file: File | Blob, path: string, bucket: string = 'yeucauxhd-files'): Promise<string> => {
    const cleanPath = path.split('/').map(part => 
        part.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-zA-Z0-9._\-]/g, '_')
    ).join('/');
    const { error } = await supabaseAdmin.storage.from(bucket).upload(cleanPath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(cleanPath);
    return data.publicUrl;
};


export const logAction = async (action: string, details: any = {}, targetId?: string, targetType?: string): Promise<void> => {
    try {
        const userEmail = getStorageItem("userEmail") || getStorageItem("currentConsultant");
        const userFullName = getStorageItem("currentUser") || "Unknown";
        await supabaseAdmin.from('interactions').insert({
            category: 'LOG', type: action, message: typeof details === 'string' ? details : (details.message || action),
            actor_id: userEmail, actor_name: userFullName, target_id: targetId, target_view: targetType, metadata: details
        });
    } catch (err) {}
};

export const triggerAutoSync = () => {
    postApi({ action: 'forceSync' }).catch(() => {});
};

export const mapOrderDbToUi = (o: any) => ({
    ...o,
    "Số đơn hàng": o.so_don_hang || o["Số đơn hàng"],
    "Tên khách hàng": o.ten_khach_hang || o["Tên khách hàng"],
    "Tên tư vấn bán hàng": o.ten_tu_van_ban_hang || o.tvbh || o["Tên tư vấn bán hàng"],
    "Phân loại": o.phan_loai || o["Phân loại"],
    "Mã DMS": o.ma_dms || o["Mã DMS"],
    "Dòng xe": o.dong_xe || o["Dòng xe"],
    "Phiên bản": o.phien_ban || o["Phiên bản"],
    "Ngoại thất": o.ngoai_that || o["Ngoại thất"],
    "Nội thất": o.noi_that || o["Nội thất"],
    "Dự kiến giao": o.du_kien_giao || o["Dự kiến giao"],
    "Ghi chú": o.ghi_chu || o["Ghi chú"],
    "Kết quả": (o.ngay_xuat_hoa_don || o.url_hoa_don_da_xuat || o.link_hoa_don_da_xuat) ? 'Đã xuất hóa đơn' : (o.ket_qua || o["Kết quả"] || 'Đã xuất hóa đơn'),
    "VIN": o.vin || o.VIN,
    "Số máy": o.so_may || o["Số máy"],
    "Thời gian ghép": o.thoi_gian_ghep || o["Thời gian ghép"],
    "Ghi chú hủy": o.ghi_chu_huy || o["Ghi chú hủy"],
    "Thời gian hủy": o.thoi_gian_huy || o["Thời gian hủy"],
    "Trạng thái VC": o.trang_thai_vc || o["Trạng thái VC"],
    "link_hoa_don_da_xuat": o.link_hoa_don_da_xuat || o.url_hoa_don_da_xuat || o.LinkHoaDonDaXuat,
    "LinkHoaDonDaXuat": o.link_hoa_don_da_xuat || o.url_hoa_don_da_xuat || o.LinkHoaDonDaXuat,
    "LinkHopDong": o.url_hop_dong || o.link_hop_dong || o.LinkHopDong,
    "LinkDeNghiXHD": o.url_de_nghi_xhd || o.link_de_nghi_xhd || o.LinkDeNghiXHD,
    "LinkCCCD": o.url_cccd || o.link_cccd || o.LinkCCCD,
    "LinkTBTV": o.url_tbtv || o.link_tbtv || o.LinkTBTV,
    "LinkGNT": o.url_gnt || o.link_gnt || o.LinkGNT,
    "FileUrls": o.file_urls || o.FileUrls || o.tep_dinh_kem,
    "is_flex_match": o.is_flex_match ?? o.isFlexMatch ?? false,
    "ngoai_that_flex": o.ngoai_that_flex ?? o.ngoaiThatFlex ?? [],
    "noi_that_flex": o.noi_that_flex ?? o.noiThatFlex ?? [],
    "ngay_xuat_hoa_don": o.ngay_xuat_hoa_don || o["Ngày xuất hóa đơn"],
    "Thời gian nhập": o.thoi_gian_nhap || o["Thời gian nhập"],
    "CHÍNH SÁCH": o.chinh_sach || o["CHÍNH SÁCH"],
    "Ngày cọc": o.ngay_coc || o["Ngày cọc"],
    "Ngày xuất hóa đơn": o.ngay_xuat_hoa_don || o["Ngày xuất hóa đơn"],
    "hoa_hong_ung": o.hoa_hong_ung || o["Hoa hồng ứng"],
    "Hoa hồng ứng": o.hoa_hong_ung || o["Hoa hồng ứng"],
    "Hoa hồng ứng trước": o.hoa_hong_ung || o["Hoa hồng ứng trước"],
    "SĐT": o.sdt || o.phone || o.dien_thoai || o['SĐT'] || o['Điện thoại'],
    "Địa chỉ": o.dia_chi || o.address || o['Địa chỉ'],
    "CCCD": o.cccd || o.cmnd || o['CCCD'],
    "Mã số thuế": o.ma_so_thue || o.mst || o['Mã số thuế'],
    "Hình thức thanh toán": o.hinh_thuc_thanh_toan || o['Hình thức thanh toán'],
    "Ngân hàng": o.ngan_hang || o['Ngân hàng'],
});

export const mapStockDbToUi = (s: any) => ({
    "VIN": s.vin, "Dòng xe": s.dong_xe, "Phiên bản": s.phien_ban, "Ngoại thất": s.ngoai_that, "Nội thất": s.noi_that, "Số máy": s.so_may, "Mã DMS": s.ma_dms, "Trạng thái": s.trang_thai, "Người Giữ Xe": s.nguoi_giu_xe, "Thời Gian Hết Hạn Giữ": s.thoi_gian_het_han_giu, "Ghi chú": s.ghi_chu, "Username giữ xe": s.username_giu_xe, "Thời gian nhập": s.ngay_nhap,
    "extension_reason": s.extension_reason,
    id: s.id,
    vin: s.vin,
    dong_xe: s.dong_xe,
    phien_ban: s.phien_ban,
    ngoai_that: s.ngoai_that,
    noi_that: s.noi_that,
    trang_thai: s.trang_thai,
    ma_dms: s.ma_dms
});

export { ADMIN_USER };
