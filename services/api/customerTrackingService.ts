import { supabase } from '../supabaseClient';

export interface CustomerMilestone {
    stage: number; // 1 to 5
    title: string;
    subtitle: string;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
    date?: string;
    note?: string;
}

export interface CustomerTrackingOrder {
    id: string;
    so_don_hang: string;
    so_hop_dong: string;
    khach_hang: string;
    so_dien_thoai: string;
    dong_xe: string;
    phien_ban: string;
    ngoai_that: string;
    noi_that: string;
    car_image: string;
    vin: string;
    so_may: string;
    tien_coc: number;
    da_thanh_toan: number;
    con_no: number;
    gia_tri_hd?: number;
    so_ct_dnx?: string;
    so_ct_td4?: string;
    ten_post?: string;
    hinh_thuc_thanh_toan?: string;
    ngan_hang?: string;
    chinh_sach?: string;
    lo_trinh_van_chuyen?: string;
    ngay_hop_dong: string;
    ngay_giao_xe_du_kien?: string;
    ngay_xuat_hoa_don?: string;
    link_hoa_don?: string;
    tvbh_name: string;
    tvbh_phone?: string;
    current_milestone: number; // 1 -> 6
    ngay_coc_ve?: string;
    milestones: CustomerMilestone[];
    telemetry?: {
        lat: number;
        lng: number;
        speed: number;
        captured_at: string;
    } | null;
    vi_tri_xe: string;
    trang_thai_kho?: string;
}

/**
 * Tạo URL tài nguyên tĩnh tương thích cả khi chạy trên /ordermanagement/ (GitHub Pages / Local)
 * lẫn khi chạy trên / (Vercel)
 */
export const getAssetUrl = (relativePath: string): string => {
    const clean = (relativePath || '').replace(/^\/+/, '');
    const isOrderManagementPath = typeof window !== 'undefined' && window.location.pathname.startsWith('/ordermanagement');
    const base = isOrderManagementPath ? '/ordermanagement/' : ((import.meta as any).env?.BASE_URL || '/');
    return `${base.replace(/\/+$/, '')}/${clean}`;
};

/**
 * Chuẩn hóa số điện thoại Việt Nam (0901234567, +84901234567 -> 0901234567)
 */
export const normalizePhone = (phone: string): string => {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('84') && clean.length >= 11) {
        clean = '0' + clean.slice(2);
    }
    return clean;
};

/**
 * Chuẩn hóa tên Dòng xe sang trọng và đúng chuẩn thương mại VinFast
 */
export const normalizeVehicleModelName = (model: string, version?: string): string => {
    const raw = (model || '').trim();
    const upper = raw.toUpperCase();
    if (upper.includes('LIMO GREEN') || upper === 'LIMO GREEN') return 'VinFast Limo Green';
    if (upper === 'LIMO' || upper === 'VF LIMO' || upper.includes('LIMO')) return 'VinFast VF Limo';
    if (upper.includes('VF 3') || upper.includes('VF3')) return 'VinFast VF 3';
    if (upper.includes('VF 5') || upper.includes('VF5')) return 'VinFast VF 5 Plus';
    if (upper.includes('VF 6') || upper.includes('VF6')) return 'VinFast VF 6';
    if (upper.includes('VF 7') || upper.includes('VF7')) return 'VinFast VF 7';
    if (upper.includes('VF 8') || upper.includes('VF8')) return 'VinFast VF 8';
    if (upper.includes('VF 9') || upper.includes('VF9')) return 'VinFast VF 9';
    if (upper.includes('EC VAN') || upper.includes('ECVAN')) return 'VinFast EC Van';
    if (upper.includes('MINIO')) return 'VinFast Minio';
    if (upper.includes('HERIO')) return 'VinFast Herio';
    if (raw.toLowerCase().startsWith('vinfast')) return raw;
    return `VinFast ${raw}`;
};

/**
 * Chuẩn hóa màu ngoại thất xe theo bảng màu thương mại chính thức của VinFast
 */
export const normalizeExteriorColorName = (color: string): string => {
    if (!color) return 'Trắng (Brahminy White)';
    const c = color.trim().toLowerCase();
    if (c.includes('(') && c.includes(')')) return color;
    if (c === 'tiêu chuẩn' || c === 'standard') return 'Trắng (Brahminy White)';
    if (c.includes('trắng') || c.includes('white') || c.includes('18')) return 'Trắng (Brahminy White)';
    if (c.includes('đen') || c.includes('black') || c.includes('11')) return 'Đen (Jet Black)';
    if (c.includes('xám') || c.includes('grey') || c.includes('gray') || c.includes('14')) return 'Xám (Neptune Grey)';
    if (c.includes('zenith') || c.includes('1v')) return 'Xám (Zenith Grey)';
    if (c.includes('bạc') || c.includes('silver') || c.includes('17')) return 'Bạc (Desat Silver)';
    if (c.includes('đỏ') || c.includes('red') || c.includes('1m')) return 'Đỏ (Crimson Red)';
    if (c.includes('solar ruby') || c.includes('2q')) return 'Đỏ (Solar Ruby)';
    if (c.includes('xanh rêu') || c.includes('deep ocean') || c.includes('1h')) return 'Xanh Rêu (Deep Ocean)';
    if (c.includes('bạc hà') || c.includes('mint') || c.includes('1w')) return 'Xanh Bạc Hà (Urban Mint)';
    if (c.includes('vàng') || c.includes('yellow') || c.includes('1u')) return 'Vàng (Summer Yellow)';
    if (c.includes('hồng') || c.includes('pink') || c.includes('21')) return 'Hồng (Rose Pink)';
    if (c.includes('sky blue') || c.includes('2g')) return 'Xanh Trời (Sky Blue)';
    if (c.includes('nâu') || c.includes('brown') || c.includes('2n')) return 'Nâu (Introspective Brown)';
    if (c.includes('moonlit') || c.includes('2j')) return 'Xanh (Moonlit Ocean)';
    if (c.includes('electric blue') || c.includes('1j')) return 'Xanh (Electric Blue)';
    if (c.includes('xanh dương') || c.includes('vinfast blue') || c.includes('1n') || c.includes('xanh')) return 'Xanh (VinFast Blue)';
    return color.charAt(0).toUpperCase() + color.slice(1);
};

/**
 * Chuẩn hóa màu nội thất theo chuẩn VinFast (thay vì 'Tiêu chuẩn')
 */
export const normalizeInteriorColorName = (color: string): string => {
    if (!color) return 'Đen (Black)';
    const c = color.trim().toLowerCase();
    if (c.includes('(') && c.includes(')')) return color;
    if (c.includes('tiêu chuẩn') || c.includes('standard') || c === '') return 'Đen (Black)';
    if (c.includes('nâu') || c.includes('brown') || c.includes('12') || c.includes('18')) return 'Nâu (Brown)';
    if (c.includes('be') || c.includes('beige') || c.includes('13')) return 'Be (Beige)';
    if (c.includes('xám') || c.includes('ghi') || c.includes('grey') || c.includes('gray') || c.includes('1m')) return 'Ghi Xám (Grey)';
    if (c.includes('đen') || c.includes('black') || c.includes('11') || c.includes('1h')) return 'Đen (Black)';
    return color.charAt(0).toUpperCase() + color.slice(1);
};

/**
 * Tìm ảnh xe tương ứng với dòng xe và màu ngoại thất
 */
export const getCarModelImage = (dongXe: string, phienBan: string, ngoaiThat: string): string => {
    const raw = `${dongXe || ''} ${phienBan || ''}`.toLowerCase();
    const color = (ngoaiThat || '').toLowerCase();

    // Map color to CE codes
    let ceCode = 'ce18'; // default white
    if (color.includes('đen') || color.includes('black') || color.includes('11')) ceCode = 'ce11';
    else if (color.includes('xám') || color.includes('grey') || color.includes('gray') || color.includes('14')) ceCode = 'ce14';
    else if (color.includes('bạc') || color.includes('silver') || color.includes('17')) ceCode = 'ce17';
    else if (color.includes('đỏ') || color.includes('red') || color.includes('ruby') || color.includes('1m') || color.includes('2q')) ceCode = 'ce1m';
    else if (color.includes('xanh dương') || color.includes('blue') || color.includes('ocean') || color.includes('1n') || color.includes('1j')) ceCode = 'ce1n';
    else if (color.includes('xanh rêu') || color.includes('green') || color.includes('mint') || color.includes('1w') || color.includes('1h')) ceCode = 'ce1h';
    else if (color.includes('vàng') || color.includes('yellow') || color.includes('1u')) ceCode = 'ce1u';
    else if (color.includes('trắng') || color.includes('white') || color.includes('18')) ceCode = 'ce18';

    if (raw.includes('limo')) {
        return getAssetUrl(`pictures/vflimo-${ceCode === 'ce18' ? 'ce18' : ceCode}.webp`);
    }
    if (raw.includes('vf 3') || raw.includes('vf3')) {
        return getAssetUrl(`pictures/vf3-${ceCode === 'ce18' ? 'ce18' : ceCode === 'ce11' ? 'ce18' : ceCode}.webp`);
    }
    if (raw.includes('vf 5') || raw.includes('vf5')) {
        return getAssetUrl(`pictures/vf5-${ceCode}.webp`);
    }
    if (raw.includes('vf 6') || raw.includes('vf6')) {
        return getAssetUrl(`pictures/vf6-${ceCode}.webp`);
    }
    if (raw.includes('vf 7') || raw.includes('vf7')) {
        return getAssetUrl(`pictures/vf7-${ceCode}.webp`);
    }
    if (raw.includes('vf 8') || raw.includes('vf8')) {
        return getAssetUrl(`pictures/vf8-${ceCode}.webp`);
    }
    if (raw.includes('vf 9') || raw.includes('vf9')) {
        return getAssetUrl(`pictures/vf9-${ceCode}.webp`);
    }
    if (raw.includes('vf 2') || raw.includes('vf2')) {
        return getAssetUrl(`pictures/vf2-${ceCode === 'ce11' ? 'ce18' : ceCode}.png`);
    }
    if (raw.includes('minio')) {
        return getAssetUrl(`pictures/minio-${ceCode}.webp`);
    }
    if (raw.includes('herio')) {
        return getAssetUrl(`pictures/herio-${ceCode}.webp`);
    }

    return getAssetUrl('pictures/vflimo-ce18.webp');
};

/**
 * Tra cứu toàn diện đơn hàng của khách hàng theo Số Điện Thoại
 * Tự động loại bỏ trùng lặp và gộp thông tin từ các phân hệ
 */
async function safeSupabaseQuery<T = any>(queryBuilder: PromiseLike<{ data: T | null; error: any }>): Promise<T[]> {
    try {
        const { data, error } = await queryBuilder;
        if (error) {
            console.warn('[CustomerTracking] Query warning:', error.message || error);
            return [];
        }
        return Array.isArray(data) ? data : (data ? [data] : []);
    } catch (e) {
        console.warn('[CustomerTracking] Query exception:', e);
        return [];
    }
}

/**
 * Tra cứu toàn diện đơn hàng của khách hàng theo Số Điện Thoại, Số HĐ hoặc Số Khung (VIN)
 * Kết hợp đa nguồn: CyberSoft MSSQL, bảng đồng bộ donhang_ton, cyber_xep_xe và donhang
 */
export const searchCustomerOrders = async (inputPhone: string): Promise<CustomerTrackingOrder[]> => {
    const inputTrim = (inputPhone || '').trim();
    if (!inputTrim || inputTrim.length < 6) {
        return [];
    }

    const cleanPhone = normalizePhone(inputTrim);
    const phoneTail = cleanPhone ? cleanPhone.slice(-9) : '';
    const isVinOrContract = inputTrim.length >= 6 && (!/^\d+$/.test(inputTrim) || inputTrim.length === 17);

    // 1. Tìm đồng thời từ donhang_ton và cyber_xep_xe
    let tonData: any[] = [];
    let xepXeData: any[] = [];

    if (phoneTail && phoneTail.length >= 8) {
        const [tonRes, xepXeRes] = await Promise.all([
            safeSupabaseQuery(
                supabase
                    .from('donhang_ton')
                    .select('*')
                    .ilike('so_dien_thoai', `%${phoneTail}%`)
                    .order('created_at', { ascending: false })
            ),
            safeSupabaseQuery(
                supabase
                    .from('cyber_xep_xe')
                    .select('*')
                    .ilike('dien_thoai', `%${phoneTail}%`)
                    .order('ngay_ct', { ascending: false })
            )
        ]);
        tonData = tonRes;
        xepXeData = xepXeRes;
    }

    // Nếu người dùng nhập mã số hợp đồng hoặc số VIN
    if (isVinOrContract) {
        const [tonVinRes, xepXeVinRes] = await Promise.all([
            safeSupabaseQuery(
                supabase
                    .from('donhang_ton')
                    .select('*')
                    .or(`vin.ilike.%${inputTrim}%,so_hop_dong.ilike.%${inputTrim}%`)
            ),
            safeSupabaseQuery(
                supabase
                    .from('cyber_xep_xe')
                    .select('*')
                    .or(`so_khung.ilike.%${inputTrim}%,so_ct.ilike.%${inputTrim}%,ma_hd.ilike.%${inputTrim}%`)
            )
        ]);
        tonData = [...tonData, ...tonVinRes];
        xepXeData = [...xepXeData, ...xepXeVinRes];
    }

    // 2. Gom danh sách VIN & Số hợp đồng để truy vấn chéo dữ liệu chuyên sâu
    const allVins: string[] = [];
    const allContracts: string[] = [];

    const recordVinAndContract = (item: any) => {
        const v = (item.vin || item.so_khung || item.VIN || '').trim().toUpperCase();
        if (v.length > 6) allVins.push(v);
        const c = (item.so_hop_dong || item.so_ct || item.ma_hd || item.ma_hd_cyber || '').trim();
        if (c.length > 3) allContracts.push(c);
    };

    tonData.forEach(recordVinAndContract);
    xepXeData.forEach(recordVinAndContract);

    const uniqueVins = [...new Set(allVins)];
    const uniqueContracts = [...new Set(allContracts)];

    // 3. Truy vấn chuyên sâu: Vị trí bãi xe, GPS Telemetry, Đơn hàng DMS (so_ct_dnx, so_ct_td4, link hoa don)
    let khoxeMap = new Map<string, any>();
    let telemetryMap = new Map<string, any>();
    let donhangMap = new Map<string, any>();

    if (uniqueVins.length > 0) {
        try {
            const [kxList, telList, dhList] = await Promise.all([
                safeSupabaseQuery(
                    supabase.from('khoxe').select('vin, trang_thai, vi_tri, ngay_nhap').in('vin', uniqueVins)
                ),
                safeSupabaseQuery(
                    supabase.from('car_telemetry').select('vin, lat, lng, speed, captured_at').in('vin', uniqueVins)
                ),
                safeSupabaseQuery(
                    supabase.from('donhang').select('vin, so_don_hang, so_ct_dnx, so_ct_td4, ngay_xuat_hoa_don, link_hoa_don_da_xuat, ngay_coc_ve, so_may').in('vin', uniqueVins)
                )
            ]);

            kxList.forEach((k: any) => khoxeMap.set(k.vin?.trim().toUpperCase(), k));
            telList.forEach((t: any) => telemetryMap.set(t.vin?.trim().toUpperCase(), t));
            dhList.forEach((d: any) => donhangMap.set(d.vin?.trim().toUpperCase(), d));
        } catch (e) {
            console.warn('[CustomerTracking] Error querying auxiliary info:', e);
        }
    }

    // 4. Hợp nhất (Deduplicate) đơn hàng dựa trên số hợp đồng / số VIN
    const mergedMap = new Map<string, any>();

    const getMergeKey = (item: any): string => {
        const contract = (item.so_hop_dong || item.so_ct || item.ma_hd || item.ma_hd_cyber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        const vin = (item.vin || item.so_khung || item.VIN || '').trim().toUpperCase();
        if (contract) return `H_${contract}`;
        if (vin && vin.length > 6) return `V_${vin}`;
        return `ID_${item.id || item.stt_rec || Math.random()}`;
    };

    // 4a. Nạp donhang_ton vào trước
    tonData.forEach(item => {
        const key = getMergeKey(item);
        mergedMap.set(key, { ...item, source: 'ton' });
    });

    // 4b. Hợp nhất từ cyber_xep_xe
    xepXeData.forEach(item => {
        const key = getMergeKey(item);
        if (mergedMap.has(key)) {
            const existing = mergedMap.get(key);
            mergedMap.set(key, {
                ...existing,
                vin: existing.vin || item.so_khung || '',
                so_may: existing.so_may || item.so_may || '',
                so_ct: item.so_ct || existing.so_ct || '',
                so_hop_dong: item.so_ct || existing.so_hop_dong || '',
                ngay_hop_dong: existing.ngay_hop_dong || item.ngay_ct || '',
                ngay_gx: item.ngay_gx || existing.ngay_gx || '',
                da_tt: item.da_tt || existing.da_tt || existing.tien_coc || 0,
                con_no: item.con_no !== undefined ? item.con_no : existing.con_no,
                gia_tri_hd: item.tien_nt || existing.gia_tri_hd || 0,
                tvbh_name: existing.tvbh_name || item.ten_hs || 'Tư Vấn Bán Hàng VinFast',
                dong_xe: existing.phien_ban || item.ten_kx || 'Xe VinFast',
                phien_ban: existing.phien_ban || item.ten_kx || '',
                ngoai_that: existing.ngoai_that || item.ten_mau || 'Tiêu chuẩn',
                noi_that: existing.noi_that || item.ten_mau_nt || 'Tiêu chuẩn',
                ma_post: item.ma_post || existing.ma_post || ''
            });
        } else {
            mergedMap.set(key, {
                ...item,
                source: 'xep_xe',
                so_don_hang: item.so_ct || item.ma_hd || '',
                so_hop_dong: item.so_ct || item.ma_hd || '',
                khach_hang: item.ten_kh || 'Quý khách hàng',
                so_dien_thoai: item.dien_thoai || cleanPhone,
                dong_xe: item.ten_kx || 'Xe VinFast',
                phien_ban: item.ten_kx || '',
                ngoai_that: item.ten_mau || 'Tiêu chuẩn',
                noi_that: item.ten_mau_nt || 'Tiêu chuẩn',
                vin: item.so_khung || '',
                so_may: item.so_may || '',
                tien_coc: Number(item.da_tt || 0),
                da_tt: Number(item.da_tt || 0),
                con_no: Number(item.con_no || 0),
                gia_tri_hd: Number(item.tien_nt || 0),
                ngay_hop_dong: item.ngay_ct || '',
                ngay_gx: item.ngay_gx || '',
                tvbh_name: item.ten_hs || 'Tư Vấn Bán Hàng VinFast',
                ma_post: item.ma_post || ''
            });
        }
    });

    const results: CustomerTrackingOrder[] = [];

    // 5. Chuẩn hóa đầu ra thành cấu trúc CustomerTrackingOrder hoàn chỉnh
    for (const [_, item] of mergedMap) {
        const vin = (item.vin || item.so_khung || item.VIN || '').trim().toUpperCase();
        const khoxeInfo = vin ? khoxeMap.get(vin) : null;
        const telInfo = vin ? telemetryMap.get(vin) : null;
        const dhInfo = vin ? donhangMap.get(vin) : null;

        const soCtDnx = item.so_ct_dnx || dhInfo?.so_ct_dnx || '';
        const soCtTd4 = item.so_ct_td4 || dhInfo?.so_ct_td4 || '';

        const hasVin = Boolean(vin && vin.length > 6);
        const viTriKho = khoxeInfo?.vi_tri || khoxeInfo?.vi_tri_kho || '';
        const hasYard = Boolean(viTriKho && !viTriKho.toLowerCase().includes('vận tải'));
        const hasInvoice = Boolean(dhInfo?.ngay_xuat_hoa_don || soCtTd4 || (item.ma_post && Number(item.ma_post) >= 4));
        const ngayCocVe = dhInfo?.ngay_coc_ve || dhInfo?.ngay_coc || item.ngay_coc_ve || '';
        const hasCoc = Boolean(ngayCocVe);
        const isDelivered = Boolean(item.ma_post && Number(item.ma_post) >= 5);

        let curMilestone = 1;
        if (isDelivered) {
            curMilestone = 6;
        } else if (hasCoc) {
            curMilestone = 6; // Đã có COC -> Đang kiểm tra PDI & chuẩn bị bàn giao
        } else if (hasInvoice) {
            curMilestone = 5; // Đã xuất hóa đơn -> Đang chờ COC từ nhà máy
        } else if (hasYard) {
            curMilestone = 4; // Xe đã về bãi (có vị trí kho) -> Đang làm thủ tục xuất hóa đơn!
        } else if (hasVin) {
            curMilestone = 3; // Đã ghép VIN -> Vận chuyển về Showroom
        } else {
            curMilestone = 2; // Đã cọc -> Đang chờ nhà máy ghép VIN
        }

        const giaTriHd = Number(item.gia_tri_hd || item.tien_nt || 0);
        const daThanhToan = Number(item.da_tt || item.tien_thu || item.tien_coc || 0);
        const conNo = Number(item.con_no !== undefined ? item.con_no : (giaTriHd > daThanhToan ? giaTriHd - daThanhToan : 0));
        const tienCoc = Number(item.tien_coc || item.tien_thu || item.da_tt || 0);

        const milestones: CustomerMilestone[] = [
            {
                stage: 1,
                title: 'Tiếp nhận Đơn hàng & Đặt cọc',
                subtitle: item.ngay_hop_dong ? `Ngày lập HĐ: ${item.ngay_hop_dong}` : 'Hợp đồng Cyber đã duyệt',
                status: 'COMPLETED',
                date: item.ngay_hop_dong || '',
                note: `Đã thu cọc: ${tienCoc.toLocaleString('vi-VN')} ₫ ${item.ten_post ? `• Trạng thái: ${item.ten_post}` : ''}`
            },
            {
                stage: 2,
                title: 'Nhà máy Phân bổ & Ghép xe',
                subtitle: hasVin ? `Số khung (VIN): ${vin}` : 'Đang chờ điều phối số khung từ nhà máy',
                status: hasVin ? 'COMPLETED' : 'IN_PROGRESS',
                note: hasVin ? `Đã cấp số máy: ${item.so_may || dhInfo?.so_may || 'Khớp theo xe'}` : 'Hệ thống ưu tiên ghép xe theo số thứ tự hợp đồng'
            },
            {
                stage: 3,
                title: 'Vận chuyển về Showroom',
                subtitle: hasYard ? 'Xe đã cập bến an toàn tại bãi xe Showroom VinFast Thuận An' : (hasVin ? `Đang trên xe chuyên dụng về Showroom${soCtDnx ? ` (${soCtDnx})` : ''}` : 'Chờ vận tải'),
                status: hasYard ? 'COMPLETED' : (hasVin ? 'IN_PROGRESS' : 'PENDING'),
                note: viTriKho ? `Vị trí kho bãi: ${viTriKho}` : (soCtDnx ? `Lệnh điều chuyển: ${soCtDnx}` : '')
            },
            {
                stage: 4,
                title: 'Thủ tục & Xuất hóa đơn GTGT',
                subtitle: hasInvoice ? `Đã phát hành hóa đơn GTGT điện tử${soCtTd4 ? ` (${soCtTd4})` : ''}` : (hasYard ? 'Xe đã có mặt tại bãi, đang làm thủ tục đối soát tài chính để xuất hóa đơn VAT' : 'Chuẩn bị làm thủ tục xuất hóa đơn sau khi xe cập bến Showroom'),
                status: hasInvoice ? 'COMPLETED' : (hasYard ? 'IN_PROGRESS' : 'PENDING'),
                date: dhInfo?.ngay_xuat_hoa_don || '',
                note: dhInfo?.link_hoa_don_da_xuat ? 'Hóa đơn điện tử M-Invoice đã cấp' : 'Hóa đơn VAT sẽ gửi tự động qua email/SMS của Quý khách'
            },
            {
                stage: 5,
                title: 'Hồ sơ xe & Bản gốc COC',
                subtitle: hasCoc ? 'Hồ sơ bản gốc COC đã về Showroom sẵn sàng bấm biển số' : (hasInvoice ? 'Chờ nhà máy VinFast chuyển phát bản gốc COC về Showroom để làm thủ tục bấm biển số' : 'Chờ hoàn tất xuất hóa đơn GTGT để tiếp nhận hồ sơ COC'),
                status: hasCoc ? 'COMPLETED' : (hasInvoice ? 'IN_PROGRESS' : 'PENDING'),
                date: ngayCocVe || '',
                note: hasCoc ? (ngayCocVe ? `Ngày nhận COC: ${ngayCocVe}` : 'Đầy đủ hồ sơ gốc đi đăng ký, đăng kiểm') : 'Bản gốc COC (Chứng nhận xuất xưởng) dùng để nộp thuế trước bạ và bấm biển'
            },
            {
                stage: 6,
                title: 'Kiểm tra PDI & Bàn giao xe',
                subtitle: item.ngay_gx ? `Lịch hẹn giao xe: ${item.ngay_gx}` : (hasCoc ? 'Xe đã kiểm tra PDI hoàn tất, đủ hồ sơ sẵn sàng làm lễ bàn giao xe mới!' : 'Đang chuẩn bị kiểm tra kỹ thuật PDI, vệ sinh và gắn phụ kiện'),
                status: isDelivered ? 'COMPLETED' : (hasCoc ? 'IN_PROGRESS' : 'PENDING'),
                date: item.ngay_gx || '',
                note: 'Tư vấn bán hàng sẽ liên hệ Quý khách xác nhận ngày giờ lành nhận xe'
            }
        ];

        const normalizedModel = normalizeVehicleModelName(item.dong_xe || item.phien_ban || 'Xe VinFast', item.phien_ban);
        const normalizedExterior = normalizeExteriorColorName(item.ngoai_that || item.ten_mau || '');
        const normalizedInterior = normalizeInteriorColorName(item.noi_that || item.ten_mau_nt || '');
        const carImg = getCarModelImage(normalizedModel, item.phien_ban, normalizedExterior);

        results.push({
            id: item.id || item.stt_rec || Math.random().toString(),
            so_don_hang: item.so_don_hang || item.so_hop_dong || '',
            so_hop_dong: item.so_hop_dong || item.so_ct || item.ma_hd || '',
            khach_hang: item.khach_hang || item.ten_kh || 'Quý khách hàng',
            so_dien_thoai: item.so_dien_thoai || item.dien_thoai || cleanPhone,
            dong_xe: normalizedModel,
            phien_ban: item.phien_ban || item.dong_xe || '',
            ngoai_that: normalizedExterior,
            noi_that: normalizedInterior,
            car_image: carImg,
            vin: vin,
            so_may: item.so_may || dhInfo?.so_may || '',
            tien_coc: tienCoc,
            da_thanh_toan: daThanhToan,
            con_no: conNo,
            gia_tri_hd: giaTriHd,
            so_ct_dnx: soCtDnx,
            so_ct_td4: soCtTd4,
            ten_post: item.ten_post || item.status || 'Đã xác nhận',
            hinh_thuc_thanh_toan: item.hinh_thuc_thanh_toan || dhInfo?.hinh_thuc_thanh_toan || (item.ngan_hang ? 'Trả góp qua ngân hàng' : 'Tiền mặt / Chuyển khoản'),
            ngan_hang: item.ngan_hang || dhInfo?.ngan_hang || '',
            chinh_sach: item.chinh_sach || dhInfo?.chinh_sach || '',
            ngay_hop_dong: item.ngay_hop_dong || '',
            ngay_giao_xe_du_kien: item.ngay_gx || '',
            ngay_xuat_hoa_don: dhInfo?.ngay_xuat_hoa_don || '',
            link_hoa_don: dhInfo?.link_hoa_don_da_xuat || '',
            ngay_coc_ve: ngayCocVe,
            tvbh_name: item.tvbh_name || 'Tư Vấn Bán Hàng VinFast',
            showroom: 'Showroom VinFast Thuận An (Bình Dương)',
            current_milestone: curMilestone,
            milestones,
            telemetry: telInfo ? {
                lat: Number(telInfo.lat),
                lng: Number(telInfo.lng),
                speed: Number(telInfo.speed || 0),
                captured_at: telInfo.captured_at
            } : null,
            vi_tri_xe: viTriKho || (hasYard ? 'Bãi xe Showroom Thuận An' : (hasVin ? 'Đang vận chuyển' : 'Nhà máy VinFast Hải Phòng')),
            trang_thai_kho: khoxeInfo?.trang_thai
        });
    }

    return results;
};
