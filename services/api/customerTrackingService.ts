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
    ngay_hop_dong: string;
    ngay_giao_xe_du_kien?: string;
    ngay_xuat_hoa_don?: string;
    link_hoa_don?: string;
    tvbh_name: string;
    tvbh_phone?: string;
    showroom: string;
    current_milestone: number; // 1 -> 5
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
 * Chuẩn hóa số điện thoại Việt Nam (0901234567, +84901234567, 84901234567 -> 0901234567)
 */
export const normalizePhone = (phone: string): string => {
    let clean = (phone || '').replace(/[^0-9]/g, '');
    if (clean.startsWith('84') && clean.length >= 11) {
        clean = '0' + clean.slice(2);
    }
    return clean;
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

    if (raw.includes('vf 3') || raw.includes('vf3')) {
        return `/pictures/vf3-${ceCode === 'ce18' ? 'ce18' : ceCode === 'ce11' ? 'ce18' : ceCode}.webp`;
    }
    if (raw.includes('vf 5') || raw.includes('vf5')) {
        return `/pictures/vf5-${ceCode}.webp`;
    }
    if (raw.includes('vf 6') || raw.includes('vf6')) {
        return `/pictures/vf6-${ceCode}.webp`;
    }
    if (raw.includes('vf 7') || raw.includes('vf7')) {
        return `/pictures/vf7-${ceCode}.webp`;
    }
    if (raw.includes('vf 8') || raw.includes('vf8')) {
        return `/pictures/vf8-${ceCode}.webp`;
    }
    if (raw.includes('vf 9') || raw.includes('vf9')) {
        return `/pictures/vf9-${ceCode}.webp`;
    }
    if (raw.includes('vf 2') || raw.includes('vf2')) {
        return `/pictures/vf2-${ceCode === 'ce11' ? 'ce18' : ceCode}.png`;
    }
    if (raw.includes('limo')) {
        return `/pictures/vflimo-${ceCode}.webp`;
    }
    if (raw.includes('minio')) {
        return `/pictures/minio-${ceCode}.webp`;
    }
    if (raw.includes('herio')) {
        return `/pictures/herio-${ceCode}.webp`;
    }

    return '/pictures/vf5-ce18.webp';
};

/**
 * Tra cứu toàn diện đơn hàng của khách hàng theo Số Điện Thoại
 */
export const searchCustomerOrders = async (inputPhone: string): Promise<CustomerTrackingOrder[]> => {
    const cleanPhone = normalizePhone(inputPhone);
    if (!cleanPhone || cleanPhone.length < 9) {
        return [];
    }

    // 1. Tìm trong bảng donhang_ton
    const { data: tonData } = await supabase
        .from('donhang_ton')
        .select('*')
        .ilike('so_dien_thoai', `%${cleanPhone.slice(-9)}%`)
        .order('created_at', { ascending: false });

    // 2. Tìm trong bảng cyber_xep_xe
    const { data: xepXeData } = await supabase
        .from('cyber_xep_xe')
        .select('*')
        .ilike('dien_thoai', `%${cleanPhone.slice(-9)}%`)
        .order('ngay_ct', { ascending: false });

    const results: CustomerTrackingOrder[] = [];
    const processedVins = new Set<string>();
    const processedOrders = new Set<string>();

    // 3. Gom danh sách VIN để truy vấn vị trí kho và Telemetry
    const allVins: string[] = [];
    (tonData || []).forEach(item => {
        if (item.vin && item.vin.trim().length > 6) allVins.push(item.vin.trim().toUpperCase());
    });
    (xepXeData || []).forEach(item => {
        if (item.so_khung && item.so_khung.trim().length > 6) allVins.push(item.so_khung.trim().toUpperCase());
    });

    const uniqueVins = [...new Set(allVins)];

    // 4. Lấy thông tin kho và Telemetry nếu có VIN
    let khoxeMap = new Map<string, any>();
    let telemetryMap = new Map<string, any>();
    let donhangMap = new Map<string, any>();

    if (uniqueVins.length > 0) {
        const [{ data: kxList }, { data: telList }, { data: dhList }] = await Promise.all([
            supabase.from('khoxe').select('vin, trang_thai, vi_tri_kho, ngay_nhap').in('vin', uniqueVins),
            supabase.from('car_telemetry').select('vin, lat, lng, speed, captured_at').in('vin', uniqueVins),
            supabase.from('donhang').select('vin, so_ct_dnx, so_ct_td4, ngay_xuat_hoa_don, link_hoa_don_da_xuat, ngay_coc_ve').in('vin', uniqueVins)
        ]);

        (kxList || []).forEach(k => khoxeMap.set(k.vin?.trim().toUpperCase(), k));
        (telList || []).forEach(t => telemetryMap.set(t.vin?.trim().toUpperCase(), t));
        (dhList || []).forEach(d => donhangMap.set(d.vin?.trim().toUpperCase(), d));
    }

    // 5. Xử lý dữ liệu từ donhang_ton
    for (const item of (tonData || [])) {
        const vin = (item.vin || '').trim().toUpperCase();
        const orderKey = item.so_don_hang || item.so_hop_dong || item.id;
        if (processedOrders.has(orderKey)) continue;
        processedOrders.add(orderKey);
        if (vin) processedVins.add(vin);

        const khoxeInfo = vin ? khoxeMap.get(vin) : null;
        const telInfo = vin ? telemetryMap.get(vin) : null;
        const dhInfo = vin ? donhangMap.get(vin) : null;

        const hasVin = Boolean(vin && vin.length > 6);
        const hasYard = Boolean(khoxeInfo && khoxeInfo.vi_tri_kho && !khoxeInfo.vi_tri_kho.toLowerCase().includes('vận tải'));
        const hasInvoice = Boolean(dhInfo?.ngay_xuat_hoa_don || dhInfo?.so_ct_td4 || (item.ma_post && Number(item.ma_post) >= 4));
        const isReadyDelivery = Boolean(hasInvoice && hasYard);

        let curMilestone = 1;
        if (isReadyDelivery) curMilestone = 5;
        else if (hasInvoice) curMilestone = 4;
        else if (hasYard) curMilestone = 3;
        else if (hasVin) curMilestone = 2;

        const milestones: CustomerMilestone[] = [
            {
                stage: 1,
                title: 'Tiếp nhận Đơn hàng & Đặt cọc',
                subtitle: item.ngay_hop_dong ? `Ngày cọc: ${item.ngay_hop_dong}` : 'Đã xác nhận cọc',
                status: 'COMPLETED',
                date: item.ngay_hop_dong || '',
                note: `Đã vào cọc ${Number(item.tien_coc || 0).toLocaleString('vi-VN')} đ`
            },
            {
                stage: 2,
                title: 'Nhà máy Phân bổ & Ghép xe',
                subtitle: hasVin ? `Số khung (VIN): ${vin}` : 'Đang chờ nhà máy phân bổ số khung',
                status: hasVin ? 'COMPLETED' : 'IN_PROGRESS',
                note: hasVin ? 'Xe đã được định danh chính thức' : 'Hệ thống đang ưu tiên điều phối xe'
            },
            {
                stage: 3,
                title: 'Vận chuyển về Showroom',
                subtitle: hasYard ? `Đã có mặt tại bãi xe Showroom Thuận An` : (hasVin ? 'Đang trên xe chuyên dụng về Showroom' : 'Chờ vận tải'),
                status: hasYard ? 'COMPLETED' : (hasVin ? 'IN_PROGRESS' : 'PENDING'),
                note: khoxeInfo?.vi_tri_kho ? `Vị trí: ${khoxeInfo.vi_tri_kho}` : ''
            },
            {
                stage: 4,
                title: 'Hồ sơ & Hóa đơn GTGT',
                subtitle: hasInvoice ? 'Đã xuất hóa đơn, hồ sơ bấm biển sẵn sàng' : 'Chuẩn bị xuất hóa đơn xe',
                status: hasInvoice ? 'COMPLETED' : (hasYard ? 'IN_PROGRESS' : 'PENDING'),
                date: dhInfo?.ngay_xuat_hoa_don || '',
                note: dhInfo?.link_hoa_don_da_xuat ? 'Hóa đơn điện tử đã phát hành' : ''
            },
            {
                stage: 5,
                title: 'Sẵn sàng Bàn giao xe',
                subtitle: isReadyDelivery ? 'Xe đã kiểm tra PDI hoàn tất, sẵn sàng làm lễ bàn giao!' : 'Đang chuẩn bị kiểm tra xe trước khi giao',
                status: isReadyDelivery ? 'COMPLETED' : 'PENDING',
                note: 'Tư vấn bán hàng sẽ liên hệ hẹn giờ làm lễ nhận xe'
            }
        ];

        results.push({
            id: item.id,
            so_don_hang: item.so_don_hang || item.so_hop_dong || '',
            so_hop_dong: item.so_hop_dong || item.so_don_hang || '',
            khach_hang: item.khach_hang || 'Quý khách hàng',
            so_dien_thoai: item.so_dien_thoai || cleanPhone,
            dong_xe: item.phien_ban || 'VinFast Electric Car',
            phien_ban: item.phien_ban || '',
            ngoai_that: item.ngoai_that || 'Tiêu chuẩn',
            noi_that: item.noi_that || 'Tiêu chuẩn',
            car_image: getCarModelImage(item.phien_ban, item.phien_ban, item.ngoai_that),
            vin: vin,
            so_may: dhInfo?.so_may || '',
            tien_coc: Number(item.tien_coc || 0),
            da_thanh_toan: Number(item.tien_coc || 0),
            con_no: Math.max(0, Number(item.gia_tri_hd || 0) - Number(item.tien_coc || 0)),
            ngay_hop_dong: item.ngay_hop_dong || '',
            ngay_xuat_hoa_don: dhInfo?.ngay_xuat_hoa_don || '',
            link_hoa_don: dhInfo?.link_hoa_don_da_xuat || '',
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
            vi_tri_xe: khoxeInfo?.vi_tri_kho || (hasYard ? 'Bãi xe Showroom Thuận An' : (hasVin ? 'Đang vận chuyển' : 'Nhà máy VinFast Hải Phòng')),
            trang_thai_kho: khoxeInfo?.trang_thai
        });
    }

    // 6. Xử lý bổ sung từ cyber_xep_xe nếu chưa có trong results
    for (const item of (xepXeData || [])) {
        const vin = (item.so_khung || '').trim().toUpperCase();
        if (vin && processedVins.has(vin)) continue;
        const orderCode = item.so_ct || item.ma_hd || item.stt_rec;
        if (processedOrders.has(orderCode)) continue;

        processedOrders.add(orderCode);
        if (vin) processedVins.add(vin);

        const khoxeInfo = vin ? khoxeMap.get(vin) : null;
        const telInfo = vin ? telemetryMap.get(vin) : null;
        const dhInfo = vin ? donhangMap.get(vin) : null;

        const hasVin = Boolean(vin && vin.length > 6);
        const hasYard = Boolean(khoxeInfo && khoxeInfo.vi_tri_kho && !khoxeInfo.vi_tri_kho.toLowerCase().includes('vận tải'));
        const hasInvoice = Boolean(dhInfo?.ngay_xuat_hoa_don || dhInfo?.so_ct_td4);
        const isReadyDelivery = Boolean(hasInvoice && hasYard);

        let curMilestone = 1;
        if (isReadyDelivery) curMilestone = 5;
        else if (hasInvoice) curMilestone = 4;
        else if (hasYard) curMilestone = 3;
        else if (hasVin) curMilestone = 2;

        const milestones: CustomerMilestone[] = [
            {
                stage: 1,
                title: 'Tiếp nhận Đơn hàng & Đặt cọc',
                subtitle: item.ngay_ct ? `Ngày ký: ${item.ngay_ct}` : 'Đã duyệt hợp đồng',
                status: 'COMPLETED',
                date: item.ngay_ct || '',
                note: `Đã thanh toán: ${Number(item.da_tt || 0).toLocaleString('vi-VN')} đ`
            },
            {
                stage: 2,
                title: 'Nhà máy Phân bổ & Ghép xe',
                subtitle: hasVin ? `Số khung (VIN): ${vin}` : 'Đang chờ phân bổ số khung',
                status: hasVin ? 'COMPLETED' : 'IN_PROGRESS',
                note: item.so_may ? `Số máy: ${item.so_may}` : 'Đã có số khung định danh'
            },
            {
                stage: 3,
                title: 'Vận chuyển về Showroom',
                subtitle: hasYard ? 'Đã có mặt tại bãi Showroom Thuận An' : (hasVin ? 'Đang trên đường vận tải' : 'Chờ vận tải'),
                status: hasYard ? 'COMPLETED' : (hasVin ? 'IN_PROGRESS' : 'PENDING'),
                note: khoxeInfo?.vi_tri_kho ? `Vị trí bãi: ${khoxeInfo.vi_tri_kho}` : ''
            },
            {
                stage: 4,
                title: 'Hồ sơ & Hóa đơn GTGT',
                subtitle: hasInvoice ? 'Đã xuất hóa đơn GTGT hoàn tất' : 'Chuẩn bị xuất hóa đơn',
                status: hasInvoice ? 'COMPLETED' : (hasYard ? 'IN_PROGRESS' : 'PENDING'),
                date: dhInfo?.ngay_xuat_hoa_don || ''
            },
            {
                stage: 5,
                title: 'Sẵn sàng Bàn giao xe',
                subtitle: item.ngay_gx ? `Lịch hẹn giao: ${item.ngay_gx}` : (isReadyDelivery ? 'Xe đã sẵn sàng bàn giao' : 'Đang chuẩn bị bàn giao'),
                status: isReadyDelivery ? 'COMPLETED' : 'PENDING',
                date: item.ngay_gx || ''
            }
        ];

        results.push({
            id: item.stt_rec || orderCode,
            so_don_hang: item.so_ct || item.ma_hd || '',
            so_hop_dong: item.so_ct || item.ma_hd || '',
            khach_hang: item.ten_kh || 'Quý khách hàng',
            so_dien_thoai: item.dien_thoai || cleanPhone,
            dong_xe: item.ten_kx || 'Xe VinFast',
            phien_ban: item.ten_kx || '',
            ngoai_that: item.ten_mau || 'Tiêu chuẩn',
            noi_that: item.ten_mau_nt || 'Tiêu chuẩn',
            car_image: getCarModelImage(item.ten_kx, item.ten_kx, item.ten_mau),
            vin: vin,
            so_may: item.so_may || dhInfo?.so_may || '',
            tien_coc: Number(item.da_tt || 0),
            da_thanh_toan: Number(item.da_tt || 0),
            con_no: Number(item.con_no || 0),
            ngay_hop_dong: item.ngay_ct || '',
            ngay_giao_xe_du_kien: item.ngay_gx || '',
            ngay_xuat_hoa_don: dhInfo?.ngay_xuat_hoa_don || '',
            link_hoa_don: dhInfo?.link_hoa_don_da_xuat || '',
            tvbh_name: item.ten_hs || 'Tư Vấn Bán Hàng VinFast',
            showroom: 'Showroom VinFast Thuận An (Bình Dương)',
            current_milestone: curMilestone,
            milestones,
            telemetry: telInfo ? {
                lat: Number(telInfo.lat),
                lng: Number(telInfo.lng),
                speed: Number(telInfo.speed || 0),
                captured_at: telInfo.captured_at
            } : null,
            vi_tri_xe: khoxeInfo?.vi_tri_kho || (hasYard ? 'Bãi xe Showroom Thuận An' : (hasVin ? 'Đang vận chuyển' : 'Nhà máy VinFast')),
            trang_thai_kho: khoxeInfo?.trang_thai
        });
    }

    return results;
};
