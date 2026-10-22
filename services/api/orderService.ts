import { supabase, supabaseAdmin } from '../supabaseClient';
import { cyberFetch } from './cyberBridge';
import { getStorageItem, mapOrderDbToUi, ApiResult, logAction, uploadToSupabase, getApi, postApi } from './baseService';
import { createNotification } from './notificationService';
import { autoSyncDmsRadarIfNeeded } from './stockService';
import { Order } from '../../types';
import { cleanCyberContractCode, cleanCustomerName, checkCustomerNameMatch } from '../../utils/stringUtils';

export { cleanCustomerName, checkCustomerNameMatch };


export const getPaginatedData = async (_?: string[], __?: string, ___?: boolean): Promise<ApiResult> => {
    try {
        const { data, error } = await supabase.from('donhang').select('*').not('ket_qua', 'ilike', 'Đã hủy%');
        if (error) throw error;

        // Chỉ truy vấn thông tin bổ trợ yeucauxhd cho các đơn hàng active thực tế thay vì nạp toàn bộ bảng
        const activeOrderNumbers = (data || [])
            .map((o: any) => (o.so_don_hang || '').trim())
            .filter((s: string) => s.length > 0);

        let yeucauList: any[] = [];
        if (activeOrderNumbers.length > 0) {
            const chunkSize = 150;
            const chunks: string[][] = [];
            for (let i = 0; i < activeOrderNumbers.length; i += chunkSize) {
                chunks.push(activeOrderNumbers.slice(i, i + chunkSize));
            }
            const chunkResults = await Promise.all(
                chunks.map(chunk =>
                    supabase
                        .from('yeucauxhd')
                        .select('so_don_hang, ghi_chu_admin, url_hop_dong, url_de_nghi_xhd, ngay_coc_ve')
                        .in('so_don_hang', chunk)
                )
            );
            yeucauList = chunkResults.flatMap(r => r.data || []);
        }

        const yeucauMap = new Map(yeucauList.map((y: any) => [y.so_don_hang?.trim(), y]));

        const formattedData = (data || []).map((order: any) => {
            const yc = yeucauMap.get(order.so_don_hang?.trim());
            const cocDate = order.ngay_coc_ve || yc?.ngay_coc_ve || '';
            return {
                'Tên tư vấn bán hàng': order.ten_tu_van_ban_hang, 'Tên khách hàng': order.ten_khach_hang, 'Dòng xe': order.dong_xe,
                'Phiên bản': order.phien_ban, 'Ngoại thất': order.ngoai_that, 'Nội thất': order.noi_that,
                'Số đơn hàng': order.so_don_hang, 'Ngày cọc': order.ngay_coc, 'Thời gian nhập': order.thoi_gian_nhap,
                'Kết quả': order.ket_qua, 'Trạng thái gửi mail': order.trang_thai_gui_mail, 'VIN': order.vin,
                'Thời gian ghép': order.thoi_gian_ghep, 'Số ngày ghép': order.so_ngay_ghep, 'Ngày xuất hóa đơn': order.ngay_xuat_hoa_don,
                'Cảnh báo quá hạn': order.canh_bao_qua_han, 'Cảnh báo sai DMS': order.canh_bao_sai_dms,
                'LinkHoaDonDaXuat': order.link_hoa_don_da_xuat, 'Trạng thái VC': order.trang_thai_vc,
                'Ghi chú hủy': order.ghi_chu_huy, 'Thời gian hủy': order.thoi_gian_huy,
                'CHÍNH SÁCH': order.chinh_sach,
                'LinkHopDong': yc?.url_hop_dong || order.link_hop_dong,
                'LinkDeNghiXHD': yc?.url_de_nghi_xhd || order.link_de_nghi_xhd,
                'Ghi chú Admin': yc?.ghi_chu_admin || '',
                'ghi_chu_admin': yc?.ghi_chu_admin || '',
                'Ngày COC về': cocDate,
                'ngay_coc_ve': cocDate,
                'so_ct_dnx': order.so_ct_dnx || '',
                'so_ct_td4': order.so_ct_td4 || '',
                'ghi_chu_xuat_xe': order.ghi_chu_xuat_xe || '',
                'Số CT DNX': order.so_ct_dnx || '',
                'Số CT TD4': order.so_ct_td4 || '',
                'ma_hd_cyber': order.ma_hd_cyber || '',
                'Mã HĐ Cyber': order.ma_hd_cyber || ''
            };
        });
        return { status: 'SUCCESS', message: 'Fetched orders from Supabase', data: formattedData };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message };
    }
};

export const fetchAllArchivedData = async (): Promise<ApiResult> => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "";
        const userRole = getStorageItem("userRole") || "";
        const actualUsername = (getStorageItem("currentUser") || "").toLowerCase().trim();
        const userEmail = (getStorageItem("userEmail") || "").toLowerCase().trim();
        const isAdmin = actualUsername === 'admin' || userRole === 'Admin' || userRole === 'Quản trị viên' || userEmail === 'showroomthuanan@gmail.com';
        let query = supabase.from('archived_orders').select('*').order('ngay_xuat_hoa_don', { ascending: false });
        if (!isAdmin) query = query.eq('tvbh', currentUser);
        const { data, error } = await query;
        if (error) throw error;
        const formattedData = data.map((order: any) => ({
            'Tên tư vấn bán hàng': order.tvbh, 'Tên khách hàng': order.ten_khach_hang, 'Dòng xe': order.dong_xe,
            'Phiên bản': order.phien_ban, 'Ngoại thất': order.ngoai_that, 'Nội thất': order.noi_that,
            'Số đơn hàng': order.so_don_hang, 'SỐ ĐƠN HÀNG': order.so_don_hang, 'Ngày cọc': order.ngay_coc,
            'VIN': order.vin, 'SỐ VIN': order.vin, 'Ngày xuất hóa đơn': order.ngay_xuat_hoa_don,
            'NGÀY XUẤT HÓA ĐƠN': order.ngay_xuat_hoa_don, 'Kết quả': 'Đã xuất hóa đơn',
            'Số máy': order.so_may, 'SỐ MÁY': order.so_may, 'LinkHopDong': order.url_hop_dong,
            'LinkDeNghiXHD': order.url_de_nghi_xhd, 'LinkHoaDonDaXuat': order.url_hoa_don_da_xuat, 'Trạng thái VC': order.trang_thai_vc,
            'so_ct_dnx': order.so_ct_dnx || '',
            'so_ct_td4': order.so_ct_td4 || '',
            'ghi_chu_xuat_xe': order.ghi_chu_xuat_xe || '',
            'Số CT DNX': order.so_ct_dnx || '',
            'Số CT TD4': order.so_ct_td4 || '',
            'ma_hd_cyber': order.ma_hd_cyber || '',
            'Mã HĐ Cyber': order.ma_hd_cyber || '',
            'Ngày COC về': order.ngay_coc_ve || '',
            'ngay_coc_ve': order.ngay_coc_ve || ''
        }));
        return { status: 'SUCCESS', message: 'Fetched archived orders from Supabase', data: formattedData };
    } catch (err: any) {
        return { status: 'ERROR', message: err.message || "Không thể tải dữ liệu lưu trữ" };
    }
};

export interface DmsVsoExpectedConfig {
    dong_xe?: string;
    phien_ban?: string;
    ma_phien_ban?: string;
    ngoai_that?: string;
    noi_that?: string;
    ten_khach_hang?: string;
}

export interface DmsVsoVerificationResult {
    isValid: boolean;
    reason?: string;
    dmsRecord?: any;
    details?: {
        model?: string;
        version?: string;
        exterior?: string;
        interior?: string;
        status?: string;
        customer?: string;
        salesperson?: string;
        invoiceDate?: string | null;
    };
    errorType?: 'customer' | 'model' | 'version' | 'exterior' | 'interior' | 'invoiced' | 'canceled' | 'not_found' | 'general';
    expectedVal?: string;
    dmsVal?: string;
}

const normalizeNoDiacritics = (str?: string) => (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();

const COLOR_CODE_MAP: Record<string, string[]> = {
    // Mã màu nội thất VinFast thực tế từ DMS
    'CI11': ['den', 'black'],
    'CI1H': ['den', 'black'],
    'CI1M': ['xam den', 'xam', 'den', 'grey', 'gray', 'black', 'ghi'],
    'CI12': ['nau', 'brown', 'saddle'],
    'CI18': ['nau', 'mocha', 'brown'],
    'CI13': ['be', 'beige', 'xam', 'grey', 'gray', 'cotton', 'ghi'],

    // Mã màu ngoại thất VinFast thực tế từ DMS
    'CE11': ['den', 'black', 'jet'],
    'CE18': ['trang', 'white', 'brahminy'],
    '2418': ['trang', 'white'],
    '1118': ['trang', 'white', 'den', 'black'],
    'CE1V': ['xam', 'grey', 'gray', 'neptune', 'xi mang', 'cement'],
    'CE14': ['xam', 'grey', 'gray'],
    'CE12': ['bac', 'silver', 'desat'],
    'CE17': ['bac', 'silver'],
    'CE31': ['bac', 'silver'],
    'CE1M': ['do', 'red'],
    'CE2Q': ['do', 'red', 'ruby'],
    '112Q': ['do', 'red'],
    'CE15': ['xanh', 'blue', 'vinfast blue'],
    'CE1N': ['xanh', 'blue', 'vinfast blue'],
    'CE33': ['xanh', 'blue'],
    '1833': ['xanh', 'blue', 'trang', 'white'],
    '182G': ['xanh', 'blue', 'trang', 'white'],
    'CE1H': ['reu', 'ocean', 'luc bao', 'deep ocean', 'xanh reu'],
    'CE22': ['xanh la', 'green'],
    'CE1W': ['xanh la', 'green'],
    'CE1P': ['ngoc lam', 'mint', 'aqua'],
    'CE19': ['cam', 'orange', 'sunset'],
    '1132': ['cam', 'orange'],
    'CE16': ['vang', 'yellow', 'gold', 'cat'],
    'CE1U': ['vang', 'yellow', 'gold'],
    '181U': ['vang', 'yellow'],
    'CE21': ['hong', 'pink'],
    'CE1X': ['hong', 'pink', 'tim'],
    '1821': ['hong', 'pink'],
    'CE2N': ['nau', 'brown']
};

const COLOR_SYNONYM_GROUPS: string[][] = [
    ['trang', 'white', 'brahminy'],
    ['den', 'black', 'jet'],
    ['do', 'red', 'crimson'],
    ['xam', 'grey', 'gray', 'neptune', 'xi mang', 'cement', 'ghi'],
    ['bac', 'silver', 'desat'],
    ['xanh duong', 'vinfast blue', 'blue', 'xanh'],
    ['reu', 'deep ocean', 'ocean', 'luc bao'],
    ['vang', 'yellow', 'gold', 'cat'],
    ['hong', 'pink'],
    ['aqua', 'mint', 'xanh la', 'xanh lam'],
    ['nau', 'brown', 'saddle'],
    ['be', 'beige', 'cotton']
];

// Map tên màu sang mã ngoại thất VinFast chuẩn
const EXT_NAME_TO_CODE: Record<string, string> = {
    'white': 'CE18', 'trang': 'CE18', 'brahminy': 'CE18',
    'black': 'CE11', 'den': 'CE11', 'jet black': 'CE11',
    'solar ruby': 'CE2Q', 'ruby': 'CE2Q', 'do ruby': 'CE2Q',
    'crimson red': 'CE1M', 'red': 'CE1M', 'do': 'CE1M',
    'neptune grey': 'CE14', 'zenith grey': 'CE1V', 'grey': 'CE1V', 'gray': 'CE1V', 'xam': 'CE1V',
    'silver': 'CE17', 'desat silver': 'CE17', 'bac': 'CE17',
    'vinfast blue': 'CE1N', 'blue': 'CE1N', 'xanh': 'CE1N', 'xanh duong': 'CE1N',
    'deep ocean': 'CE1H', 'ocean': 'CE1H', 'xanh reu': 'CE1H',
    'urban mint': 'CE1W', 'mint': 'CE1W', 'xanh la nhat': 'CE1W',
    'ivy green': 'CE22', 'xanh la': 'CE22',
    'yellow': 'CE1U', 'summer yellow': 'CE1U', 'vang': 'CE1U',
    'sunset orange': 'CE19', 'vitality orange': 'CE32', 'cam': 'CE19',
    'rose pink': 'CE21', 'pink': 'CE21', 'hong': 'CE21',
    'iris berry': 'CE1X', 'purple': 'CE2O', 'tim': 'CE1X'
};

// Nhóm mã màu nội thất tương đương
const INT_CODE_GROUPS: Record<string, string[]> = {
    'CI11': ['CI11', 'CI1H'], // Đen
    'CI1H': ['CI11', 'CI1H'],
    'CI12': ['CI12', 'CI18'], // Nâu / Mocha Nâu
    'CI18': ['CI12', 'CI18'],
    'CI13': ['CI13'],         // Be
    'CI1M': ['CI1M', 'CI13']  // Xám / Xám Đen
};

const INT_NAME_TO_CODE: Record<string, string> = {
    'black': 'CI11', 'den': 'CI11', 'mau den': 'CI11',
    'brown': 'CI12', 'nau': 'CI12', 'mau nau': 'CI12', 'mocha': 'CI18', 'mocha nau': 'CI18',
    'beige': 'CI13', 'be': 'CI13', 'mau be': 'CI13', 'cotton': 'CI13',
    'grey': 'CI1M', 'gray': 'CI1M', 'xam': 'CI1M', 'xam den': 'CI1M', 'ghi': 'CI1M'
};

/**
 * Trích xuất Mã màu ngoại thất VinFast chuẩn (Ví dụ: CE18, CE11, CE2Q, 1118, 1833,...)
 */
export const getExteriorColorCode = (str: string): string => {
    if (!str) return '';
    const clean = str.trim().toUpperCase();

    // 1. Mã trong ngoặc đơn: (CE18), (1118), (182G),...
    const matchParen = clean.match(/\(([A-Z0-9]{4,6})\)/);
    if (matchParen) return matchParen[1];

    // 2. Chuỗi dạng CE... hoặc mã phối 4 ký tự (ví dụ 1118, 1833)
    const matchCE = clean.match(/\b(CE[0-9A-Z]{2,3})\b/);
    if (matchCE) return matchCE[1];

    if (/^[0-9][0-9A-Z]{3}$/.test(clean)) return clean;
    if (/^CE[0-9A-Z]{2,3}$/.test(clean)) return clean;

    // 3. Quy đổi từ tên sang mã chuẩn
    const norm = normalizeNoDiacritics(str);
    for (const [key, code] of Object.entries(EXT_NAME_TO_CODE)) {
        if (norm.includes(key)) return code;
    }
    return '';
};

/**
 * Trích xuất Mã màu nội thất VinFast chuẩn (Ví dụ: CI11, CI12, CI18, CI1H, CI13, CI1M)
 */
export const getInteriorColorCode = (str: string): string => {
    if (!str) return '';
    const clean = str.trim().toUpperCase();

    // 1. Mã trong ngoặc: (CI11), (CI12)...
    const matchParen = clean.match(/\(([A-Z0-9]{4,6})\)/);
    if (matchParen) return matchParen[1];

    // 2. Chuỗi dạng CI...
    const matchCI = clean.match(/\b(CI[0-9A-Z]{2,3})\b/);
    if (matchCI) return matchCI[1];

    if (/^CI[0-9A-Z]{2,3}$/.test(clean)) return clean;

    // 3. Quy đổi từ tên sang mã chuẩn
    const norm = normalizeNoDiacritics(str);
    for (const [key, code] of Object.entries(INT_NAME_TO_CODE)) {
        if (norm.includes(key)) return code;
    }
    return '';
};

/**
 * So sánh 2 mã màu ngoại thất bằng mã
 */
export const compareExteriorColorCodes = (code1: string, code2: string): boolean => {
    if (!code1 || !code2) return true;
    return code1.toUpperCase().trim() === code2.toUpperCase().trim();
};

/**
 * So sánh 2 mã màu nội thất bằng mã (có xét nhóm mã tương đương của VinFast)
 */
export const compareInteriorColorCodes = (code1: string, code2: string): boolean => {
    if (!code1 || !code2) return true;
    const c1 = code1.toUpperCase().trim();
    const c2 = code2.toUpperCase().trim();
    if (c1 === c2) return true;

    const group1 = INT_CODE_GROUPS[c1];
    if (group1 && group1.includes(c2)) return true;

    return false;
};

/**
 * Bảng tra cứu Mã Phiên Bản DMS VinFast (Cột ten_phien_ban trong donhanghienhuu)
 */
export const DMS_VERSION_CODE_MAP: Record<string, { model: string; version: string; name: string }> = {
    // VF 3
    'TI1BV': { model: 'VF3', version: 'PLUS', name: 'VF 3 Plus' },
    'TI1AV': { model: 'VF3', version: 'PLUS', name: 'VF 3 Plus' },
    'TI1CV': { model: 'VF3', version: 'ECO', name: 'VF 3 Eco' },
    'TI1DV': { model: 'VF3', version: 'PLUS', name: 'VF 3 Facelift Plus' },
    'TI1EV': { model: 'VF3', version: 'ECO', name: 'VF 3 Facelift Eco' },
    'GI10V': { model: 'VF3', version: 'BASE', name: 'VF 3 Tiêu chuẩn' },
    'GI1PV': { model: 'VF3', version: 'BASE', name: 'VF 3 Tiêu chuẩn' },

    // VF 5
    'GA1RV': { model: 'VF5', version: 'PLUS', name: 'VF 5 Plus' },
    'GA12V': { model: 'VF5', version: 'PLUS', name: 'VF 5 Plus' },
    'GA12P': { model: 'VF5', version: 'PLUS', name: 'VF 5 Plus' },
    'GA1QV': { model: 'VF5', version: 'PLUS', name: 'VF 5 Plus' },
    'GA1KV': { model: 'VF5', version: 'ECO', name: 'VF 5 Eco' },
    'GA1XV': { model: 'VF5', version: 'PLUS', name: 'Herio Green' },

    // VF 6
    'HB14V': { model: 'VF6', version: 'PLUS', name: 'VF 6 Plus' },
    'JB12V': { model: 'VF6', version: 'PLUS', name: 'VF 6 Plus' },
    'CB12V': { model: 'VF6', version: 'PLUS', name: 'VF 6 Plus Pin CKD' },
    'JB10V': { model: 'VF6', version: 'ECO', name: 'VF 6 Eco' },
    'CB10V': { model: 'VF6', version: 'ECO', name: 'VF 6 Base Pin CKD' },

    // VF 7
    'GC12V': { model: 'VF7', version: 'PLUS', name: 'VF 7 Plus Trần Thép' },
    'GC15V': { model: 'VF7', version: 'PLUS', name: 'VF 7 Plus Trần Kính' },
    'GC12P': { model: 'VF7', version: 'PLUS', name: 'VF 7 Plus' },
    'HC1BV': { model: 'VF7', version: 'ECO', name: 'VF 7 Eco' },
    'HC1CV': { model: 'VF7', version: 'ECO', name: 'VF 7 Eco BCO3' },
    'HC1DV': { model: 'VF7', version: 'ECO', name: 'VF 7 Eco Tiêu chuẩn' },
    'HC1QV': { model: 'VF7', version: 'ECO', name: 'VF 7 Eco' },
    'HC1RV': { model: 'VF7', version: 'ECO', name: 'VF 7 Eco' },

    // VF 8
    'ND32V': { model: 'VF8', version: 'PLUS', name: 'VF 8 Plus' },
    'ND42V': { model: 'VF8', version: 'PLUS', name: 'VF 8 Plus Pin CATL' },
    'HD14V': { model: 'VF8', version: 'PLUS', name: 'VF 8 Plus Limited' },
    'ND12V': { model: 'VF8', version: 'PLUS', name: 'VF 8 Plus' },
    'MD12V': { model: 'VF8', version: 'PLUS', name: 'VF 8 Plus' },
    'ND31V': { model: 'VF8', version: 'ECO', name: 'VF 8 Eco' },
    'ND41V': { model: 'VF8', version: 'ECO', name: 'VF 8 Eco Pin CATL' },
    'HD13V': { model: 'VF8', version: 'ECO', name: 'VF 8 Eco Limited' },
    'MD11V': { model: 'VF8', version: 'ECO', name: 'VF 8 Eco' },
    'ND20V': { model: 'VF8', version: 'ECO', name: 'VF 8 Eco' },
    'HC11V': { model: 'VF8', version: 'BASE', name: 'VF 8 Comfort SVOLT' },

    // VF 9
    'NE3MV': { model: 'VF9', version: 'PLUS', name: 'VF 9 Plus 7 Chỗ' },
    'NE3NV': { model: 'VF9', version: 'PLUS', name: 'VF 9 Plus 6 Chỗ' },
    'NE12V': { model: 'VF9', version: 'PLUS', name: 'VF 9 Plus' },
    'NE16V': { model: 'VF9', version: 'PLUS', name: 'VF 9 Plus' },
    'NE3LV': { model: 'VF9', version: 'ECO', name: 'VF 9 Eco 7 Chỗ' },
    'NE11V': { model: 'VF9', version: 'ECO', name: 'VF 9 Eco' },
    'NE15V': { model: 'VF9', version: 'ECO', name: 'VF 9 Eco' },

    // EC Van
    'TG10V': { model: 'ECVAN', version: 'BASE', name: 'EC Van Bản Tiêu Chuẩn' },
    'TG11V': { model: 'ECVAN', version: 'PLUS', name: 'EC Van Bản Nâng Cao' },
    'TG12V': { model: 'ECVAN', version: 'SLIDING', name: 'EC Van Cửa Trượt' },

    // Limo Green / MPV 7
    'SL1VV': { model: 'LIMO', version: 'LIMO', name: 'Limo Green' },
    'SL1WV': { model: 'LIMO', version: 'MPV7', name: 'MPV 7 (VF Limo)' },

    // VF 2 / Minio
    'TH14V': { model: 'VF2', version: 'ECO', name: 'VF 2' },
    'TH13V': { model: 'VF2', version: 'MINIO', name: 'Minio Green' },
    'TH12V': { model: 'VF2', version: 'ECO', name: 'VF 2' },
    'TH15V': { model: 'VF2', version: 'BCO2', name: 'VF 2 BCO2' },

    // VF Wild
    'HJ01V': { model: 'VFWILD', version: 'BASE', name: 'VF Wild Base Comfort' },
    'HJ03V': { model: 'VFWILD', version: 'PLUS', name: 'VF Wild High Premium' },
    // VF e34
    'GK1DI': { model: 'VFE34', version: 'BASE', name: 'VF e34' }
};

/**
 * Chuẩn hóa Dòng xe về Mã chuẩn (VF3, VF5, VF6, VF7, VF8, VF9, VFE34, MINIO, ECVAN, LIMO, VF2)
 */
export const getModelCode = (model: string): string => {
    if (!model) return '';
    const clean = model.trim().toUpperCase();
    if (DMS_VERSION_CODE_MAP[clean]) {
        return DMS_VERSION_CODE_MAP[clean].model;
    }
    const c = clean.replace(/[^A-Z0-9]/g, '');
    if (c.includes('VF3') || c === 'VF3') return 'VF3';
    if (c.includes('VF5') || c === 'VF5') return 'VF5';
    if (c.includes('VF6') || c === 'VF6') return 'VF6';
    if (c.includes('VF7') || c === 'VF7') return 'VF7';
    if (c.includes('VF8') || c === 'VF8') return 'VF8';
    if (c.includes('VF9') || c === 'VF9') return 'VF9';
    if (c.includes('VF2') || c === 'VF2') return 'VF2';
    if (c.includes('VFE34') || c.includes('E34')) return 'VFE34';
    if (c.includes('MINIO')) return 'VF2';
    if (c.includes('ECVAN') || c.includes('VAN')) return 'ECVAN';
    if (c.includes('LIMO')) return 'LIMO';
    return c;
};

/**
 * Chuẩn hóa Phiên bản xe về Mã chuẩn (BASE, PLUS, ECO, STD, PREMIUM, SLIDING, MPV7, LIMO, MINIO, S)
 */
export const getVersionCode = (version: string): string => {
    if (!version) return '';
    const clean = version.trim().toUpperCase();

    // 1. Nếu là mã 5 ký tự VinFast DMS trực tiếp (GA1RV, JB12V, TI1BV, TG10V,...)
    if (DMS_VERSION_CODE_MAP[clean]) {
        return DMS_VERSION_CODE_MAP[clean].version;
    }

    // 2. Nếu có mã trong ngoặc: ví dụ "Plus (GA1RV)"
    const matchParen = clean.match(/\(([A-Z0-9]{4,6})\)/);
    if (matchParen && DMS_VERSION_CODE_MAP[matchParen[1]]) {
        return DMS_VERSION_CODE_MAP[matchParen[1]].version;
    }

    const norm = normalizeNoDiacritics(version).toUpperCase();
    if (norm.includes('CUA TRUOT') || norm.includes('SLIDING')) return 'SLIDING';
    if (norm.includes('PLUS') || norm.includes('NANG CAO') || norm.includes('METAL')) return 'PLUS';
    if (norm.includes('ECO')) return 'ECO';
    if (norm.includes('BASE') || norm.includes('TIEU CHUAN')) return 'BASE';
    if (norm.includes('STANDARD') || norm.includes('STD')) return 'STD';
    if (norm.includes('PREMIUM')) return 'PREMIUM';
    if (norm.includes('MPV') || norm.includes('7 CHO')) return 'MPV7';
    if (norm.includes('LIMO')) return 'LIMO';
    if (norm.includes('MINIO')) return 'MINIO';
    if (norm.includes('S')) return 'S';
    return norm.replace(/[^A-Z0-9]/g, '');
};

/**
 * Tự động giải mã hoặc suy luận Mã Phiên Bản DMS 5 ký tự (GA1RV, TI1BV, JB12V, GC12V...)
 * cho xe trong kho hoặc đơn hàng.
 */
export const resolveMaterialVersionCode = (dongXe?: string, phienBan?: string, rawMaPhienBan?: string): string => {
    const cleanVer = (phienBan || '').trim().toUpperCase();
    const normVer = normalizeNoDiacritics(phienBan || '').toUpperCase();
    const isSliding = normVer.includes('TRUOT') || normVer.includes('SLIDING');

    // 1. Nếu rawMaPhienBan đã có sẵn và hợp lệ
    const cleanRaw = (rawMaPhienBan || '').trim().toUpperCase();
    if (cleanRaw && DMS_VERSION_CODE_MAP[cleanRaw]) {
        if (isSliding && cleanRaw === 'TG11V') return 'TG12V';
        return cleanRaw;
    }
    const matchDmsPart = cleanRaw.match(/(?:^|_)([A-Z0-9]{4,6})(?:_|$)/);
    if (matchDmsPart && DMS_VERSION_CODE_MAP[matchDmsPart[1]]) {
        return matchDmsPart[1];
    }
    if (cleanRaw && cleanRaw.length >= 4 && cleanRaw.length <= 6 && /^[A-Z0-9]+$/.test(cleanRaw)) {
        if (isSliding && cleanRaw === 'TG11V') return 'TG12V';
        return cleanRaw;
    }

    if (!cleanVer && !dongXe) return cleanRaw || '';

    // 2. Nếu phienBan chính là mã DMS (ví dụ: GA1RV, TI1BV...)
    if (DMS_VERSION_CODE_MAP[cleanVer]) {
        return cleanVer;
    }

    // 3. Nếu phienBan có mã trong ngoặc: ví dụ "Plus (GA1RV)" hoặc "(TI1BV)"
    const matchParen = cleanVer.match(/\(([A-Z0-9]{4,6})\)/);
    if (matchParen) {
        return matchParen[1].toUpperCase();
    }

    // 4. Suy luận tự động dựa trên Cặp (Dòng xe + Nhóm phiên bản)
    const modelCode = getModelCode(dongXe || '');
    const verCode = getVersionCode(cleanVer);

    if (modelCode === 'VF3') {
        if (verCode === 'ECO') return 'TI1CV';
        if (verCode === 'BASE') return 'GI10V';
        return 'TI1BV'; // VF 3 Plus mặc định
    }
    if (modelCode === 'VF5') {
        if (verCode === 'ECO') return 'GA1KV';
        return 'GA1RV'; // VF 5 Plus mặc định
    }
    if (modelCode === 'VF6') {
        if (verCode === 'ECO' || verCode === 'BASE') return 'JB10V';
        return 'JB12V'; // VF 6 Plus mặc định
    }
    if (modelCode === 'VF7') {
        if (verCode === 'ECO' || verCode === 'BASE') return 'HC1BV';
        const norm = cleanVer.toLowerCase();
        if (norm.includes('kinh') || norm.includes('glass')) return 'GC15V';
        return 'GC12V'; // VF 7 Plus trần thép mặc định
    }
    if (modelCode === 'VF8') {
        if (verCode === 'ECO') return 'ND31V';
        return 'ND32V'; // VF 8 Plus mặc định
    }
    if (modelCode === 'VF9') {
        if (verCode === 'ECO') return 'NE3LV';
        return 'NE3MV'; // VF 9 Plus 7 chỗ mặc định
    }
    if (modelCode === 'ECVAN') {
        if (verCode === 'SLIDING' || isSliding) return 'TG12V';
        if (verCode === 'PLUS') return 'TG11V';
        return 'TG10V';
    }
    if (modelCode === 'LIMO') {
        if (verCode === 'MPV7') return 'SL1WV';
        return 'SL1VV';
    }
    if (modelCode === 'VF2') {
        return 'TH14V';
    }
    if (modelCode === 'VFE34') {
        return 'GK1DI';
    }

    return cleanRaw || '';
};

/**
 * Trích xuất mã màu chung (tương thích ngược)
 */
export const extractColorCode = (str: string): string => {
    return getExteriorColorCode(str) || getInteriorColorCode(str);
};

export const checkColorMatch = (inputColor: string, dmsColorName: string, dmsColorCode?: string, isInterior = false): boolean => {
    if (!inputColor) return true;

    if (isInterior) {
        const c1 = getInteriorColorCode(inputColor);
        const c2 = dmsColorCode ? (getInteriorColorCode(dmsColorCode) || dmsColorCode.trim().toUpperCase()) : getInteriorColorCode(dmsColorName);
        if (c1 && c2) {
            return compareInteriorColorCodes(c1, c2);
        }
    } else {
        const c1 = getExteriorColorCode(inputColor);
        const c2 = dmsColorCode ? (getExteriorColorCode(dmsColorCode) || dmsColorCode.trim().toUpperCase()) : getExteriorColorCode(dmsColorName);
        if (c1 && c2) {
            return compareExteriorColorCodes(c1, c2);
        }
    }

    const inputCode = extractColorCode(inputColor);
    const dmsCode = (dmsColorCode ? extractColorCode(dmsColorCode) || dmsColorCode.trim().toUpperCase() : '') || extractColorCode(dmsColorName);

    if (inputCode && dmsCode) {
        return inputCode === dmsCode;
    }

    const c1 = normalizeNoDiacritics(inputColor);
    const c2 = normalizeNoDiacritics(dmsColorName || '');

    const activeCode = inputCode || dmsCode;
    if (activeCode && COLOR_CODE_MAP[activeCode]) {
        const mappedKeywords = COLOR_CODE_MAP[activeCode];
        const textToCheck = inputCode ? c2 : c1;
        if (mappedKeywords.some(kw => textToCheck.includes(kw))) {
            return true;
        }
    }

    if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) return true;

    for (const group of COLOR_SYNONYM_GROUPS) {
        const has1 = group.some(g => c1.includes(g));
        const has2 = group.some(g => c2.includes(g));
        if (has1 && has2) return true;
    }
    return false;
};

export const checkModelMatch = (inputModel: string, dmsModelOrProduct: string, dmsVersion: string): boolean => {
    if (!inputModel) return true;
    const m1 = getModelCode(inputModel);
    const m2 = getModelCode(dmsModelOrProduct) || getModelCode(dmsVersion);
    if (m1 && m2) return m1 === m2;

    const cleanInput = inputModel.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanDms = `${dmsModelOrProduct} ${dmsVersion}`.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (cleanDms.includes(cleanInput)) return true;
    const inputParts = normalizeNoDiacritics(inputModel).split(' ').filter(Boolean);
    return inputParts.every(p => cleanDms.includes(p));
};

export const checkVersionMatch = (inputVersion: string, dmsVersion: string): boolean => {
    if (!inputVersion || !dmsVersion) return true;
    const v1 = getVersionCode(inputVersion);
    const v2 = getVersionCode(dmsVersion);
    if (v1 && v2) return v1 === v2;

    const keyTerms = ['plus', 'eco', 'base', 's', 'standard', 'tieu chuan', 'nang cao', 'premium'];
    const s1 = normalizeNoDiacritics(inputVersion);
    const s2 = normalizeNoDiacritics(dmsVersion);
    const v1Terms = keyTerms.filter(t => s1.includes(t));
    const v2Terms = keyTerms.filter(t => s2.includes(t));

    if (v1Terms.length > 0 && v2Terms.length > 0) {
        const hasCommon = v1Terms.some(t => v2Terms.includes(t));
        if (!hasCommon) return false;
    }
    return true;
};

export const verifyDmsVso = async (
    soDonHang: string,
    expected?: DmsVsoExpectedConfig,
    forceLiveSync = false
): Promise<DmsVsoVerificationResult> => {
    const cleanNo = (soDonHang || '').trim().toUpperCase().replace(/-VS0-/g, '-VSO-');
    if (!cleanNo) {
        return { isValid: false, reason: 'Chưa nhập số đơn hàng VSO.' };
    }

    try {
        let dmsRecord: any = null;

        // Nếu ép buộc đồng bộ live (hoặc khi TVBH vừa sửa trên DMS và bấm nút Tra lại)
        if (forceLiveSync) {
            try {
                const liveRes = await cyberFetch(`/api/dms/lookup-vso?vso=${encodeURIComponent(cleanNo)}`);
                if (liveRes.ok) {
                    const liveData = await liveRes.json();
                    if (liveData && liveData.found) {
                        if (!liveData.isOpen) {
                            const rawStatus = (liveData.order?.trang_thai || liveData.reason || '').toLowerCase();
                            const normStatus = normalizeNoDiacritics(rawStatus);
                            const isCanceled = normStatus.includes('huy') || normStatus.includes('cancel') || normStatus.includes('void');
                            const isInv = normStatus.includes('hoa don') || normStatus.includes('invoiced') || normStatus.includes('da xuat');
                            return {
                                isValid: false,
                                reason: isCanceled 
                                    ? 'Đơn VSO trên DMS đã bị Hủy. Đổi sang số VSO đúng (đang Mở) cho đơn hàng rồi bấm Tra lại.'
                                    : isInv 
                                    ? 'Đơn VSO trên DMS đã xuất Hóa đơn (Đơn đã đóng). Đổi sang số VSO đúng (đang Mở) cho đơn hàng rồi bấm Tra lại.'
                                    : `VSO trên DMS đã ở trạng thái ${liveData.order?.trang_thai || 'Hóa đơn'}. Đổi sang số VSO đúng rồi bấm Tra lại.`,
                                errorType: isCanceled ? 'canceled' : isInv ? 'invoiced' : 'general',
                                dmsRecord: liveData.order
                            };
                        }
                        dmsRecord = liveData.order;
                    }
                }
            } catch (liveErr) {
                console.warn('[verifyDmsVso] Ép tra cứu Live DMS thất bại, chuyển sang tra cứu database:', liveErr);
            }
        }

        // 1. Nếu chưa có từ Live, kiểm tra trong bảng donhanghienhuu
        if (!dmsRecord) {
            const { data: dmsList, error } = await supabase
                .from('donhanghienhuu')
                .select('*')
                .ilike('so_don_hang_ban', cleanNo)
                .limit(1);

            if (error) {
                console.warn('[verifyDmsVso] Lỗi query donhanghienhuu:', error);
            }

            dmsRecord = dmsList && dmsList.length > 0 ? dmsList[0] : null;

            if (!dmsRecord) {
                const { data: fallbackList } = await supabase
                    .from('donhanghienhuu')
                    .select('*')
                    .or(`so_don_hang_ban.ilike.%${cleanNo}%`)
                    .limit(1);
                if (fallbackList && fallbackList.length > 0) {
                    dmsRecord = fallbackList[0];
                }
            }
        }

        // BƯỚC 1B: LIVE FALLBACK - Nếu chưa có trong donhanghienhuu, truy vấn trực tiếp từ DMS Dynamics
        if (!dmsRecord) {
            try {
                const liveRes = await cyberFetch(`/api/dms/lookup-vso?vso=${encodeURIComponent(cleanNo)}`);
                if (liveRes.ok) {
                    const liveData = await liveRes.json();
                    if (liveData && liveData.found) {
                        if (!liveData.isOpen) {
                            const rawStatus = (liveData.order?.trang_thai || liveData.reason || '').toLowerCase();
                            const normStatus = normalizeNoDiacritics(rawStatus);
                            const isCanceled = normStatus.includes('huy') || normStatus.includes('cancel') || normStatus.includes('void');
                            const isInv = normStatus.includes('hoa don') || normStatus.includes('invoiced') || normStatus.includes('da xuat');
                            return {
                                isValid: false,
                                reason: isCanceled 
                                    ? 'Đơn VSO trên DMS đã bị Hủy. Đổi sang số VSO đúng (đang Mở) cho đơn hàng rồi bấm Tra lại.'
                                    : isInv 
                                    ? 'Đơn VSO trên DMS đã xuất Hóa đơn (Đơn đã đóng). Đổi sang số VSO đúng (đang Mở) cho đơn hàng rồi bấm Tra lại.'
                                    : `VSO trên DMS đã ở trạng thái ${liveData.order?.trang_thai || 'Hóa đơn'}. Đổi sang số VSO đúng rồi bấm Tra lại.`,
                                errorType: isCanceled ? 'canceled' : isInv ? 'invoiced' : 'general',
                                dmsRecord: liveData.order
                            };
                        }
                        dmsRecord = liveData.order;
                    }
                }
            } catch (liveErr) {
                console.warn('[verifyDmsVso] Live DMS lookup failed:', liveErr);
            }
        }

        // ĐIỀU KIỆN 1: Phải có thật trên DMS
        if (!dmsRecord) {
            return {
                isValid: false,
                reason: `Không tìm thấy VSO ${cleanNo} trên DMS.`
            };
        }

        const dmsModel = dmsRecord.mo_ta_san_pham || '';
        const dmsVersion = dmsRecord.ten_phien_ban || '';
        const dmsExterior = dmsRecord.mau_ngoai_that || '';
        const dmsExteriorCode = dmsRecord.ma_mau_ngoai_that || '';
        const dmsInterior = dmsRecord.mau_noi_that || '';
        const dmsInteriorCode = dmsRecord.ma_mau_noi_that || '';
        const dmsStatus = dmsRecord.trang_thai || 'Mở';
        const dmsInvDate = dmsRecord.ngay_xuat_hoa_don || null;
        const dmsCustomer = dmsRecord.khach_hang_tiem_nang || '';
        const dmsSalesperson = dmsRecord.tu_van_ban_hang || '';

        const formatDispColor = (colorName?: string, colorCode?: string) => {
            const name = (colorName || '').trim();
            const code = (colorCode || '').trim();
            if (!code) return name;
            if (!name) return code;
            if (name.toUpperCase().includes(code.toUpperCase())) return name;
            return `${name} (${code})`;
        };

        const formatDispVersion = (verCode?: string) => {
            const code = (verCode || '').trim().toUpperCase();
            if (!code) return '';
            if (DMS_VERSION_CODE_MAP[code]) {
                return `${code} (${DMS_VERSION_CODE_MAP[code].name})`;
            }
            return code;
        };

        const details = {
            model: dmsModel,
            version: formatDispVersion(dmsVersion),
            exterior: formatDispColor(dmsExterior, dmsExteriorCode),
            interior: formatDispColor(dmsInterior, dmsInteriorCode),
            status: dmsStatus,
            customer: dmsCustomer,
            salesperson: dmsSalesperson,
            invoiceDate: dmsInvDate
        };

        // ĐIỀU KIỆN 2: Trạng thái phải là Mở (Chưa xuất hóa đơn, chưa hủy)
        if (dmsInvDate) {
            return {
                isValid: false,
                reason: `VSO ${cleanNo} đã xuất hóa đơn trên DMS ngày ${dmsInvDate}. Chỉ được yêu cầu ghép xe cho đơn hàng có trạng thái MỞ.`,
                dmsRecord,
                details
            };
        }

        const statusNorm = normalizeNoDiacritics(dmsStatus);
        if (statusNorm.includes('huy') || statusNorm.includes('cancel') || statusNorm.includes('void')) {
            return {
                isValid: false,
                reason: `Đơn VSO trên DMS đã bị HỦY. Đổi sang số VSO đúng (đang Mở) cho đơn hàng rồi bấm Tra lại.`,
                errorType: 'canceled',
                dmsRecord,
                details
            };
        }

        if (statusNorm.includes('hoa don') || statusNorm.includes('invoiced') || statusNorm.includes('da xuat')) {
            return {
                isValid: false,
                reason: `Đơn VSO trên DMS đã xuất Hóa đơn. Đổi sang số VSO đúng (đang Mở) cho đơn hàng rồi bấm Tra lại.`,
                errorType: 'invoiced',
                dmsRecord,
                details
            };
        }

        // ĐIỀU KIỆN 3 & 4: Đối chiếu cấu hình xe SO SÁNH BẰNG MÃ
        if (expected) {
            // 3.1 Dòng xe (Model) - So sánh bằng mã dòng xe
            if (expected.dong_xe) {
                const expModelCode = getModelCode(expected.dong_xe);
                const dmsModelCode = getModelCode(dmsModel) || getModelCode(dmsVersion);
                if (expModelCode && dmsModelCode && expModelCode !== dmsModelCode) {
                    const dispExpModel = expected.dong_xe || expModelCode;
                    const dispDmsModel = dmsModel || dmsVersion || dmsModelCode;
                    return {
                        isValid: false,
                        reason: `Lệch Dòng xe: Xe là [${dispExpModel}] ⇄ DMS là [${dispDmsModel}].`,
                        errorType: 'model',
                        expectedVal: dispExpModel,
                        dmsVal: dispDmsModel,
                        dmsRecord,
                        details
                    };
                }
            }

            // 3.2 Phiên bản (Version) - Bắt buộc so sánh bằng mã phiên bản vật tư DMS trực tiếp
            if ((expected.phien_ban || expected.ma_phien_ban) && (dmsVersion || dmsRecord.ma_phien_ban)) {
                const rawExpVerCode = (expected.ma_phien_ban || expected.phien_ban || '').trim().toUpperCase();
                const expVerCode = resolveMaterialVersionCode(expected.dong_xe, expected.phien_ban, rawExpVerCode);
                const rawDmsVerCode = (dmsVersion || dmsRecord.ma_phien_ban || '').trim().toUpperCase();
                const dmsVerCode = resolveMaterialVersionCode(dmsModel, dmsVersion, rawDmsVerCode);

                if (expVerCode && dmsVerCode && expVerCode !== dmsVerCode) {
                    const dispExpVer = DMS_VERSION_CODE_MAP[expVerCode]?.name || expected.phien_ban || expVerCode;
                    const dispDmsVer = formatDispVersion(dmsVersion) || dmsVerCode;
                    return {
                        isValid: false,
                        reason: `Lệch Phiên bản: Xe là [${dispExpVer} (${expVerCode})] ⇄ DMS là [${dispDmsVer} (${dmsVerCode})].`,
                        errorType: 'version',
                        expectedVal: `${dispExpVer} (${expVerCode})`,
                        dmsVal: `${dispDmsVer} (${dmsVerCode})`,
                        dmsRecord,
                        details
                    };
                } else if (!expVerCode || !dmsVerCode) {
                    const expVerGroup = getVersionCode(expected.phien_ban || '');
                    const dmsVerGroup = getVersionCode(dmsVersion);
                    if (expVerGroup && dmsVerGroup && expVerGroup !== dmsVerGroup) {
                        const dispDmsVer = formatDispVersion(dmsVersion);
                        return {
                            isValid: false,
                            reason: `Lệch Phiên bản: Xe là [${expected.phien_ban}] ⇄ DMS là [${dispDmsVer}].`,
                            errorType: 'version',
                            expectedVal: expected.phien_ban,
                            dmsVal: dispDmsVer,
                            dmsRecord,
                            details
                        };
                    }
                }
            }

            // 4.1 Màu ngoại thất - BẮT BUỘC SO SÁNH BẰNG MÃ MÀU NGOẠI THẤT
            if (expected.ngoai_that) {
                const expExtCode = getExteriorColorCode(expected.ngoai_that);
                const dmsExtCode = dmsExteriorCode ? (getExteriorColorCode(dmsExteriorCode) || dmsExteriorCode.trim().toUpperCase()) : getExteriorColorCode(dmsExterior);
                if (expExtCode && dmsExtCode) {
                    if (!compareExteriorColorCodes(expExtCode, dmsExtCode)) {
                        const dispDms = formatDispColor(dmsExterior, dmsExteriorCode);
                        const expShow = expExtCode ? `${expected.ngoai_that} (${expExtCode})` : expected.ngoai_that;
                        const dmsShow = dmsExtCode ? `${dispDms} (${dmsExtCode})` : dispDms;
                        return {
                            isValid: false,
                            reason: `Lệch Ngoại thất: Xe là [${expShow}] ⇄ DMS là [${dmsShow}].`,
                            errorType: 'exterior',
                            expectedVal: expShow,
                            dmsVal: dmsShow,
                            dmsRecord,
                            details
                        };
                    }
                } else {
                    const extOk = checkColorMatch(expected.ngoai_that, dmsExterior, dmsExteriorCode, false);
                    if (!extOk) {
                        const dispDms = formatDispColor(dmsExterior, dmsExteriorCode);
                        return {
                            isValid: false,
                            reason: `Lệch Ngoại thất: Xe là [${expected.ngoai_that}] ⇄ DMS là [${dispDms}].`,
                            errorType: 'exterior',
                            expectedVal: expected.ngoai_that,
                            dmsVal: dispDms,
                            dmsRecord,
                            details
                        };
                    }
                }
            }

            // 4.2 Màu nội thất - BẮT BUỘC SO SÁNH BẰNG MÃ MÀU NỘI THẤT
            if (expected.noi_that) {
                const expIntCode = getInteriorColorCode(expected.noi_that);
                const dmsIntCode = dmsInteriorCode ? (getInteriorColorCode(dmsInteriorCode) || dmsInteriorCode.trim().toUpperCase()) : getInteriorColorCode(dmsInterior);
                if (expIntCode && dmsIntCode) {
                    if (!compareInteriorColorCodes(expIntCode, dmsIntCode)) {
                        const dispDms = formatDispColor(dmsInterior, dmsInteriorCode);
                        const expShow = expIntCode ? `${expected.noi_that} (${expIntCode})` : expected.noi_that;
                        const dmsShow = dmsIntCode ? `${dispDms} (${dmsIntCode})` : dispDms;
                        return {
                            isValid: false,
                            reason: `Lệch Nội thất: Xe là [${expShow}] ⇄ DMS là [${dmsShow}].`,
                            errorType: 'interior',
                            expectedVal: expShow,
                            dmsVal: dmsShow,
                            dmsRecord,
                            details
                        };
                    }
                } else {
                    const intOk = checkColorMatch(expected.noi_that, dmsInterior, dmsInteriorCode, true);
                    if (!intOk) {
                        const dispDms = formatDispColor(dmsInterior, dmsInteriorCode);
                        return {
                            isValid: false,
                            reason: `Lệch Nội thất: Xe là [${expected.noi_that}] ⇄ DMS là [${dispDms}].`,
                            errorType: 'interior',
                            expectedVal: expected.noi_that,
                            dmsVal: dispDms,
                            dmsRecord,
                            details
                        };
                    }
                }
            }

            // 4.3 Tên khách hàng - SO SÁNH TÊN KHÁCH HÀNG GIỮA ĐƠN HÀNG VÀ DMS
            if (expected.ten_khach_hang && dmsCustomer) {
                if (!checkCustomerNameMatch(expected.ten_khach_hang, dmsCustomer)) {
                    return {
                        isValid: false,
                        reason: `Lệch Tên khách hàng: Đơn là [${expected.ten_khach_hang}] ⇄ DMS là [${dmsCustomer}].`,
                        errorType: 'customer',
                        expectedVal: expected.ten_khach_hang,
                        dmsVal: dmsCustomer,
                        dmsRecord,
                        details
                    };
                }
            }
        }

        return {
            isValid: true,
            dmsRecord,
            details
        };
    } catch (err: any) {
        console.error('[verifyDmsVso] Exception:', err);
        return {
            isValid: true,
            reason: `Cảnh báo kiểm tra DMS: ${err.message || 'Lỗi mạng'}`
        };
    }
};

export const addRequest = async (formData: Record<string, string>, _chicFile: File) => {
    const payloadData: Record<string, string> = { ...formData };
    if (!payloadData.dong_xe?.trim() || !payloadData.phien_ban?.trim() || !payloadData.ngoai_that?.trim() || !payloadData.noi_that?.trim()) {
        return { status: 'ERROR', message: 'Thông tin cấu hình xe không hợp lệ. Vui lòng chọn đầy đủ Dòng xe, Phiên bản, Màu ngoại thất và Nội thất.' };
    }

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
            // Tầng 1: Khớp tuyệt đối màu chính
            const { data: availableCars } = await supabase.from('khoxe').select('vin, ngoai_that, noi_that, ma_dms').eq('trang_thai', 'Chưa ghép').eq('dong_xe', payloadData.dong_xe).eq('phien_ban', payloadData.phien_ban).eq('ngoai_that', payloadData.ngoai_that).order('ngay_nhap', { ascending: true });
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
        const isFlexMatch = String(payloadData.is_flex_match) === 'true';
        const ngoaiThatFlex = Array.isArray(payloadData.ngoai_that_flex) ? payloadData.ngoai_that_flex : typeof payloadData.ngoai_that_flex === 'string' ? JSON.parse(payloadData.ngoai_that_flex || '[]') : [];
        const noiThatFlex = Array.isArray(payloadData.noi_that_flex) ? payloadData.noi_that_flex : typeof payloadData.noi_that_flex === 'string' ? JSON.parse(payloadData.noi_that_flex || '[]') : [];

        const insertPayload: Record<string, any> = {
            ten_tu_van_ban_hang: payloadData.ten_ban_hang, ten_khach_hang: payloadData.ten_khach_hang, dong_xe: payloadData.dong_xe, phien_ban: payloadData.phien_ban, ngoai_that: payloadData.ngoai_that, noi_that: payloadData.noi_that, so_don_hang: payloadData.so_don_hang, ma_hd_cyber: cleanCyberContractCode(payloadData.ma_hd_cyber) || null, ngay_coc: payloadData.ngay_coc || null, thoi_gian_can_xe: payloadData.thoi_gian_can_xe || null, thoi_gian_nhap: nowISO, ket_qua: ketQua, vin: vinDk, thoi_gian_ghep: pairedTime, is_flex_match: isFlexMatch, ngoai_that_flex: ngoaiThatFlex, noi_that_flex: noiThatFlex, chinh_sach: payloadData.chinh_sach || ''
        };
        const { error } = await supabase.from('donhang').upsert(insertPayload, { onConflict: 'so_don_hang' });
        if (error) throw error;
        if (vinDk) {
            await supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: payloadData.ten_ban_hang, thoi_gian_het_han_giu: 'Vô thời hạn', is_extension_requested: false }).eq('vin', vinDk);
            await supabase.from('car_hold_activities').update({ updated_at: nowISO, status: 'matched' }).eq('vin', vinDk).eq('status', 'active');
            await supabase.from('car_hold_activities').delete().eq('vin', vinDk).eq('type', 'QUEUE');
        }
        // GỬI EMAIL THÔNG BÁO (match_success nếu đã ghép ngay, match_request_pending nếu chờ xe)
        const currentUserObj: any = getStorageItem('user');
        const userEmail = (currentUserObj && typeof currentUserObj === 'object') ? currentUserObj.email : undefined;

        if (vinDk) {
            supabaseAdmin.functions.invoke('send-email', {
                body: { 
                    actionId: 'match_success', 
                    record: insertPayload,
                    targetTvbh: payloadData.ten_ban_hang,
                    recipient_email: userEmail
                }
            }).then(({ error }) => { if (error) console.warn('Lỗi gửi mail addRequest match_success:', error) });
        } else {
            supabaseAdmin.functions.invoke('send-email', {
                body: { 
                    actionId: 'match_request_pending', 
                    record: insertPayload,
                    targetTvbh: payloadData.ten_ban_hang,
                    recipient_email: userEmail
                }
            }).then(({ error }) => { if (error) console.warn('Lỗi gửi mail addRequest match_request_pending:', error) });
        }

        // Kích hoạt quét ngầm DMS Radar theo quy định khi TVBH tạo đơn hàng mới / yêu cầu ghép xe
        autoSyncDmsRadarIfNeeded(false, true).catch(e => console.warn('[DmsSync] addRequest trigger error:', e));

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

        const { data: carData } = await supabase.from('khoxe').select('ma_dms, so_may').eq('vin', vin).maybeSingle();
        if (carData && carData.ma_dms) {
            const orderPrefix = orderNumber.substring(0, 6).toUpperCase();
            if (orderPrefix !== carData.ma_dms.toUpperCase()) return { status: 'ERROR', message: `Mã DMS của xe (${carData.ma_dms.toUpperCase()}) không khớp với 6 ký tự đầu của Số đơn hàng (${orderPrefix}).` };
        }
        let matchedSoMay = carData?.so_may;
        if (!matchedSoMay) {
            const { data: ttxData } = await supabase.from('thongtinxe').select('so_may').eq('vin', vin).maybeSingle();
            matchedSoMay = ttxData?.so_may;
        }
        await supabase.from('donhang').update({ ket_qua: 'Đã ghép', vin: vin, so_may: matchedSoMay || null, thoi_gian_ghep: pairedTime }).eq('so_don_hang', orderNumber);
        await supabase.from('yeucauxhd').update({ vin: vin, so_may: matchedSoMay || null }).eq('so_don_hang', orderNumber);
        
        if (orderData?.ten_tu_van_ban_hang) {
            const { data: activeHold } = await supabase.from('car_hold_activities').select('id').eq('vin', vin).eq('status', 'active').single();
            if (activeHold) await supabase.from('car_hold_activities').update({ updated_at: pairedTime, status: 'matched' }).eq('id', activeHold.id);
            else await supabase.from('car_hold_activities').insert({ vin: vin, username: orderData.ten_tu_van_ban_hang, tvbh_name: orderData.ten_tu_van_ban_hang, type: 'HOLD', status: 'matched', created_at: pairedTime, updated_at: pairedTime });
        }
        await supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép', nguoi_giu_xe: pairedBy, thoi_gian_het_han_giu: 'Vô thời hạn' }).eq('vin', vin);
        await supabase.from('car_hold_activities').delete().eq('vin', vin).eq('type', 'QUEUE');
        await logAction('PAIR_VIN', { orderNumber, vin }, orderNumber, 'order');
        
        try {
            await createNotification({ message: `TVBH ${pairedBy} đã ghép xe ${vin} cho ĐH ${orderNumber}.`, type: 'info', recipient: 'ADMINS', targetView: 'admin', targetId: orderNumber });
            
            // GỬI EMAIL THÔNG BÁO (match_success)
            const { data: fullOrder } = await supabaseAdmin.from('donhang').select('*').eq('so_don_hang', orderNumber).single();
            if (fullOrder) {
                supabaseAdmin.functions.invoke('send-email', {
                    body: { 
                        actionId: 'match_success', 
                        record: fullOrder 
                    }
                }).then(({ error }) => { if (error) console.warn('Lỗi gửi mail pairVinToOrder:', error) });
            }
        } catch(e) {}
        
        // Kích hoạt quét ngầm DMS Radar theo quy định khi ghép xe thành công
        autoSyncDmsRadarIfNeeded(false, true).catch(e => console.warn('[DmsSync] pairVinToOrder trigger error:', e));

        return { status: 'SUCCESS', message: 'Ghép xe thành công!' };
    } catch (e: any) {
        return { status: 'ERROR', message: e.message };
    }
};

export const cancelRequest = async (orderNumber: string, reason: string, unmatchType: string = 'Hủy luôn đơn hàng (Hủy đơn)', _thoiGianCanXe?: string) => {
    try {
        const currentUser = getStorageItem("currentConsultant") || "Unknown";
        
        const { data: order } = await supabase.from('donhang').select('vin, ket_qua').eq('so_don_hang', orderNumber).maybeSingle();
        if (order && (order.ket_qua || '').toLowerCase().trim().normalize('NFC') === 'đã xuất hóa đơn') {
            throw new Error("Đơn hàng này đã xuất hóa đơn, không thể thực hiện quá trình hủy bỏ được nữa.");
        }

        const ketQuaMoi = unmatchType.includes('Chờ xe') ? 'Chưa ghép' : 'Đã hủy';
        
        if (order && order.vin) {
            await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', order.vin);
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
        if (details["CHÍNH SÁCH"] !== undefined || details.chinh_sach !== undefined) updateData.chinh_sach = details["CHÍNH SÁCH"] || details.chinh_sach;
        if (details["Mã HĐ Cyber"] !== undefined || details.ma_hd_cyber !== undefined) {
            const rawCyber = details["Mã HĐ Cyber"] !== undefined ? details["Mã HĐ Cyber"] : details.ma_hd_cyber;
            updateData.ma_hd_cyber = rawCyber ? (cleanCyberContractCode(rawCyber) || null) : null;
        }
        if (matchedVin) { updateData.vin = matchedVin; updateData.ket_qua = 'Đã ghép'; updateData.thoi_gian_ghep = new Date().toISOString(); }
        if (Object.keys(updateData).length > 0) {
            const { error: donhangError } = await supabase.from('donhang').update(updateData).eq('so_don_hang', orderNumber);
            if (donhangError) throw donhangError;
            const yeuUpdate: any = { ...updateData };
            if (yeuUpdate.ten_tu_van_ban_hang) { yeuUpdate.tvbh = yeuUpdate.ten_tu_van_ban_hang; delete yeuUpdate.ten_tu_van_ban_hang; }
            await supabase.from('yeucauxhd').update(yeuUpdate).eq('so_don_hang', orderNumber);
        }
        if (matchedVin) {
            await supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép' }).eq('vin', matchedVin);
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
                so_don_hang: details['Số đơn hàng'],
                ten_tu_van_ban_hang: details['Tên tư vấn bán hàng'], 
                ten_khach_hang: details['Tên khách hàng'], 
                dong_xe: details['Dòng xe'], 
                phien_ban: details['Phiên bản'], 
                ngoai_that: details['Ngoại thất'], 
                noi_that: details['Nội thất'], 
                vin: details['VIN'], 
                ngay_coc: details['Ngày cọc'] || null, 
                thoi_gian_can_xe: details['Thời gian cần xe'] !== undefined ? (details['Thời gian cần xe'] || null) : undefined,
                ket_qua: details['Kết quả'], 
                trang_thai_vc: details['Trạng thái VC'], 
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'] || null, 
                link_hoa_don_da_xuat: details['LinkHoaDonDaXuat'],
                so_may: details['Số máy'] || details['SỐ MÁY'],
                ma_dms: details['Mã DMS'],
                ma_hd_cyber: cleanCyberContractCode(details['Mã HĐ Cyber'] || details['ma_hd_cyber'] || details['Số hợp đồng'] || details['so_hop_dong']) || null,
                chinh_sach: details['CHÍNH SÁCH'] || details['chinh_sach']
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
                ma_dms: details['Mã DMS'],
                ngay_coc: details['Ngày cọc'] || null, 
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'] || null, 
                url_hoa_don_da_xuat: details['LinkHoaDonDaXuat'],
                chinh_sach: details['CHÍNH SÁCH'] || details['chinh_sach']
            },
            yeucauvc: { 
                so_don_hang: details['Số đơn hàng'],
                ten_khach_hang: details['Tên khách hàng'], 
                vin: details['VIN'],
                ma_kh_dms: details['Mã DMS']
            },
            archived_orders: {
                so_don_hang: details['Số đơn hàng'],
                ten_khach_hang: details['Tên khách hàng'], 
                vin: details['VIN'] || details['SỐ VIN'], 
                so_may: details['Số máy'] || details['SỐ MÁY'], 
                dong_xe: details['Dòng xe'], 
                phien_ban: details['Phiên bản'], 
                ngoai_that: details['Ngoại thất'], 
                noi_that: details['Nội thất'], 
                ma_dms: details['Mã DMS'],
                tvbh: details['Tên tư vấn bán hàng'], 
                ngay_coc: details['Ngày cọc'] || null, 
                ngay_xuat_hoa_don: details['Ngày xuất hóa đơn'] || details['NGÀY XUẤT HÓA ĐƠN'] || null, 
                url_hoa_don_da_xuat: details['LinkHoaDonDaXuat'], 
                trang_thai_vc: details['Trạng thái VC'],
                chinh_sach: details['CHÍNH SÁCH'] || details['chinh_sach']
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
        const newOrOldMatch = `so_don_hang.eq.${oldOrderNumber},so_don_hang.eq.${details['Số đơn hàng'] || oldOrderNumber}`;
        const updates = [];
        if (Object.keys(cleanYeucauxhd).length > 0) updates.push(supabaseAdmin.from('yeucauxhd').update(cleanYeucauxhd).or(newOrOldMatch));
        if (Object.keys(cleanYeucauvc).length > 0) updates.push(supabaseAdmin.from('yeucauvc').update(cleanYeucauvc).or(newOrOldMatch));
        if (Object.keys(cleanArchived).length > 0) updates.push(supabaseAdmin.from('archived_orders').update(cleanArchived).or(newOrOldMatch));

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

        if (order.vin) await supabaseAdmin.from('khoxe').update({ trang_thai: 'Chưa ghép', nguoi_giu_xe: null, thoi_gian_het_han_giu: null }).eq('vin', order.vin);
        const updateData: any = { dong_xe: newConfig["Dòng xe"], phien_ban: newConfig["Phiên bản"], ngoai_that: newConfig["Ngoại thất"], noi_that: newConfig["Nội thất"], vin: null, so_may: null, ket_qua: 'Chưa ghép', thoi_gian_ghep: null };
        const { error: updateErr } = await supabase.from('donhang').update(updateData).eq('so_don_hang', orderNumber);
        if (updateErr) throw updateErr;
        await supabase.from('yeucauxhd').update({ dong_xe: updateData.dong_xe, phien_ban: updateData.phien_ban, ngoai_that: updateData.ngoai_that, noi_that: updateData.noi_that, vin: null, so_may: null }).eq('so_don_hang', orderNumber);
        const { data: matchedCars } = await supabase.from('khoxe').select('vin').eq('trang_thai', 'Chưa ghép').eq('dong_xe', updateData.dong_xe).eq('phien_ban', updateData.phien_ban).eq('ngoai_that', updateData.ngoai_that).eq('noi_that', updateData.noi_that).order('ngay_nhap', { ascending: true }).limit(1);
        let finalMessage = "Đã thay đổi cấu hình xe thành công.";
        let autoMatched = false, finalVin = null;
        if (matchedCars && matchedCars.length > 0) {
            finalVin = matchedCars[0].vin;
            const { data: cInfo } = await supabase.from('thongtinxe').select('so_may').eq('vin', finalVin).maybeSingle();
            let autoSoMay = cInfo?.so_may;
            if (!autoSoMay) {
                const { data: kInfo } = await supabase.from('khoxe').select('so_may').eq('vin', finalVin).maybeSingle();
                autoSoMay = kInfo?.so_may;
            }
            await supabase.from('donhang').update({ vin: finalVin, so_may: autoSoMay || null, ket_qua: 'Đã ghép', thoi_gian_ghep: new Date().toISOString() }).eq('so_don_hang', orderNumber);
            await supabase.from('yeucauxhd').update({ vin: finalVin, so_may: autoSoMay || null }).eq('so_don_hang', orderNumber);
            await supabaseAdmin.from('khoxe').update({ trang_thai: 'Đã ghép' }).eq('vin', finalVin);
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
    return getApi({ action: 'getOrderHistory', orderNumber });
};

export const requestVinClub = async (payload: { orderNumber: string; customerType: string; dmsCode?: string; vin?: string; files?: Record<string, File | null>; }): Promise<ApiResult> => {
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
        const currentUser = getStorageItem("currentConsultant") || getStorageItem("currentUser") || "";
        const userRole = getStorageItem("userRole") || "";
        const actualUsername = (getStorageItem("currentUser") || "").toLowerCase().trim();
        const userEmail = (getStorageItem("userEmail") || "").toLowerCase().trim();
        const isAdmin = actualUsername === 'admin' || userRole === 'Admin' || userRole === 'Quản trị viên' || userEmail === 'showroomthuanan@gmail.com';

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
        try {
            return await getApi({ action: 'getYeuCauVcData' });
        } catch (gasErr) {
            return { status: 'ERROR', message: err.message };
        }
    }
};

export const updateOrderPolicy = async (orderNumber: string, policy: string): Promise<ApiResult> => {
    try {
        const { error } = await supabase.from('donhang').update({ chinh_sach: policy }).eq('so_don_hang', orderNumber);
        if (error) throw error;
        
        // Also update yeucauxhd if exists
        await supabase.from('yeucauxhd').update({ chinh_sach: policy }).eq('so_don_hang', orderNumber);

        await logAction('UPDATE_POLICY', { orderNumber, policy }, orderNumber, 'order');
        return { status: 'SUCCESS', message: 'Cập nhật chính sách thành công.' };
    } catch (e: any) {
        return { status: 'ERROR', message: e.message || 'Lỗi khi cập nhật chính sách' };
    }
};

export interface OrderAuditLogItem {
    id: string;
    createdAt: string;
    type: string;
    actionTitle: string;
    actorName: string;
    actorId?: string;
    message?: string;
    reason?: string;
    vin?: string;
    metadata?: any;
    icon: string;
    badgeBg: string;
    dotColor: string;
}

/**
 * Tải danh sách nhật ký thay đổi của một đơn hàng cụ thể (Order Audit Trail)
 */
export const getOrderAuditLogs = async (orderNumber: string): Promise<ApiResult> => {
    try {
        if (!orderNumber) return { status: 'SUCCESS', message: 'No order number provided', data: [] };

        const { data, error } = await supabase
            .from('interactions')
            .select('*')
            .or(`target_id.eq."${orderNumber}",metadata->>orderNumber.eq."${orderNumber}"`)
            .order('created_at', { ascending: false })
            .limit(200);

        // Bỏ qua lỗi timeout (57014) - trả về mảng rỗng thay vì crash UI
        if (error) {
            if (error.code === '57014') {
                console.warn('[AuditLog] Query timeout - bảng interactions quá lớn, cần index. Trả về rỗng.');
                return { status: 'SUCCESS', message: 'Timeout - returned empty', data: [] };
            }
            throw error;
        }

        // Loại bỏ các thông báo đẩy (push notification) gửi chuông để tránh lặp với bản ghi hành động hệ thống (LOG)
        const filteredRecords = (data || []).filter((item: any) => {
            if (item.category === 'NOTIFICATION') return false;
            if (['success', 'info', 'warning', 'danger'].includes((item.type || '').toLowerCase())) return false;
            return true;
        });

        const parseActionInfo = (type: string, metadata: any = {}, msg: string = '') => {
            const rawType = (type || '').toUpperCase();
            switch (rawType) {
                case 'MANUAL_MATCH':
                case 'PAIR_VIN':
                    return {
                        title: 'Ghép xe vào đơn hàng',
                        icon: 'fa-link',
                        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        dotColor: 'bg-emerald-500 ring-emerald-100',
                        vin: metadata.vin
                    };
                case 'AUTO_MATCH_BACKUP':
                    return {
                        title: 'Hệ thống tự động ghép xe',
                        icon: 'fa-wand-magic-sparkles',
                        badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
                        dotColor: 'bg-purple-500 ring-purple-100',
                        vin: metadata.vin
                    };
                case 'UNMATCH_ORDER':
                    return {
                        title: 'Hủy ghép xe',
                        icon: 'fa-link-slash',
                        badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
                        dotColor: 'bg-rose-500 ring-rose-100',
                        reason: metadata.reason
                    };
                case 'REPLACE_VIN':
                case 'SWAP_VIN_SUCCESS':
                    return {
                        title: 'Đổi số VIN khác',
                        icon: 'fa-arrows-rotate',
                        badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
                        dotColor: 'bg-sky-500 ring-sky-100',
                        vin: metadata.newVin || metadata.vinB || metadata.vin
                    };
                case 'CHANGE_CONFIG':
                    return {
                        title: 'Thay đổi cấu hình xe',
                        icon: 'fa-pen-to-square',
                        badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
                        dotColor: 'bg-amber-500 ring-amber-100'
                    };
                case 'SUPER_EDIT':
                    return {
                        title: 'Chỉnh sửa toàn bộ đơn hàng (Admin)',
                        icon: 'fa-sliders',
                        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        dotColor: 'bg-indigo-500 ring-indigo-100'
                    };
                case 'CANCEL_REQUEST':
                    return {
                        title: 'Yêu cầu hủy đơn hàng',
                        icon: 'fa-ban',
                        badgeBg: 'bg-red-50 text-red-700 border-red-200',
                        dotColor: 'bg-red-500 ring-red-100',
                        reason: metadata.reason
                    };
                case 'REQUEST_INVOICE':
                    return {
                        title: 'Yêu cầu xuất hóa đơn',
                        icon: 'fa-file-invoice-dollar',
                        badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
                        dotColor: 'bg-blue-500 ring-blue-100',
                        reason: metadata.aiNote
                    };
                case 'EDIT_INVOICE_DETAILS':
                    return {
                        title: 'Cập nhật thông tin hóa đơn',
                        icon: 'fa-file-pen',
                        badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
                        dotColor: 'bg-cyan-500 ring-cyan-100'
                    };
                case 'UPLOAD_INVOICE':
                    return {
                        title: 'Đã xuất hóa đơn thành công',
                        icon: 'fa-receipt',
                        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        dotColor: 'bg-emerald-500 ring-emerald-100'
                    };
                case 'UPDATE_POLICY':
                    return {
                        title: 'Cập nhật chính sách ưu đãi',
                        icon: 'fa-gift',
                        badgeBg: 'bg-pink-50 text-pink-700 border-pink-200',
                        dotColor: 'bg-pink-500 ring-pink-100'
                    };
                case 'SUPPLEMENT_FILES':
                case 'REQUEST_SUPPLEMENT':
                    return {
                        title: 'Bổ sung hồ sơ / chứng từ',
                        icon: 'fa-paperclip',
                        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
                        dotColor: 'bg-amber-500 ring-amber-100',
                        reason: metadata.reason
                    };
                case 'PENDING_SIGNATURE':
                    return {
                        title: 'Chờ ký điện tử hóa đơn',
                        icon: 'fa-signature',
                        badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                        dotColor: 'bg-indigo-500 ring-indigo-100'
                    };
                case 'ADVANCE_STATUS':
                case 'REVERT_STATUS':
                    return {
                        title: `Thay đổi trạng thái (${metadata.from || ''} ➔ ${metadata.to || ''})`,
                        icon: 'fa-arrow-right-arrow-left',
                        badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                        dotColor: 'bg-slate-500 ring-slate-100'
                    };
                case 'REQUEST_VINCLUB':
                case 'APPROVE_VC':
                case 'REJECT_VC':
                case 'CONFIRM_VC_UNC':
                    return {
                        title: 'Cập nhật yêu cầu VinClub',
                        icon: 'fa-crown',
                        badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
                        dotColor: 'bg-amber-500 ring-amber-100'
                    };
                case 'CREATE_ORDER':
                    return {
                        title: 'Tạo đơn hàng mới',
                        icon: 'fa-plus-circle',
                        badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        dotColor: 'bg-emerald-500 ring-emerald-100'
                    };
                default:
                    return {
                        title: msg || type,
                        icon: 'fa-clock-rotate-left',
                        badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
                        dotColor: 'bg-slate-400 ring-slate-100'
                    };
            }
        };

        const logs: OrderAuditLogItem[] = filteredRecords.map((item: any) => {
            const meta = item.metadata || {};
            const actionInfo = parseActionInfo(item.type, meta, item.message);
            const rawActor = (item.actor_name || item.actor_id || '').trim();
            const isActorAdmin = rawActor.toLowerCase() === 'admin' 
                || rawActor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') === 'pham thanh nhan'
                || rawActor.toLowerCase() === 'showroomthuanan@gmail.com';
            const actor = isActorAdmin ? 'Admin' : (rawActor || 'Hệ thống');

            return {
                id: item.id,
                createdAt: item.created_at,
                type: item.type,
                actionTitle: actionInfo.title,
                actorName: actor,
                actorId: item.actor_id,
                message: item.message,
                reason: actionInfo.reason || meta.reason || meta.ghi_chu_huy || meta.aiNote,
                vin: actionInfo.vin || meta.vin || meta.VIN || meta.newVin,
                metadata: meta,
                icon: actionInfo.icon,
                badgeBg: actionInfo.badgeBg,
                dotColor: actionInfo.dotColor
            };
        });

        return { status: 'SUCCESS', message: 'Fetched order audit logs', data: logs };
    } catch (err: any) {
        console.error('Error fetching order audit logs:', err);
        return { status: 'ERROR', message: err.message || 'Lỗi khi tải lịch sử đơn hàng', data: [] };
    }
};

