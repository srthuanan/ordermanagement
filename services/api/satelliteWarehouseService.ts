import { StockVehicle } from '../../types';
import { supabase } from '../supabaseClient';

export const SATELLITE_API_URL = "https://script.google.com/macros/s/AKfycbyQ8PIQx9DEI0Caps3q0GBGKcgo7DOV9rP_ykFbCr30WX5kaG8F8SjhblSGgKzadef9/exec";
export const SATELLITE_CACHE_KEY = "satellite_warehouses_cache_v1";

export interface SatelliteCarRecord {
    vin: string;
    khoKey: 'q12' | 'ql13' | 'tada';
    khoName: string;
    standardLocation: string; // e.g., 'Q12 (HCM)', 'QL13 (HCM)', 'Thuận An'
    loaiXe: string;
    mauSac: string;
    mucPin: string;
    ngayNhan: string;
    ngayGiao: string;
    isTonKho: boolean;
}

export interface DnxReconciliationItem {
    id: string;
    vin: string;
    soCtDnx: string;
    ngayCtDnx: string;
    khoXuat: string;
    khoNhan: string;
    maKhoCyber: string;
    tenKhoCyber: string;
    isTonKhoCyberK83: boolean;
    tvbh: string;
    customerName: string;
    orderNumber?: string;
    carModel: string;
    trim?: string;
    color: string;
    
    // Satellite yard info
    satelliteYard?: {
        khoKey: 'q12' | 'ql13' | 'tada';
        khoName: string;
        isTonKho: boolean;
        ngayNhan: string;
        ngayGiao: string;
        mucPin: string;
        note?: string;
    } | null;

    reconcileStatus: 'AT_THUAN_AN' | 'AT_TRANSIT_YARD' | 'IN_TRANSIT' | 'ALREADY_IN_CYBER';
    reconcileNote: string;
    warningLevel: 'danger' | 'warning' | 'info' | 'success';
}

let memoryCache: Map<string, SatelliteCarRecord> | null = null;
let isFetchingBackground = false;

// Format location name standard to match system filters
export const mapKhoToStandardLocation = (khoKey: string): string => {
    switch (khoKey) {
        case 'q12':
            return 'Q12 (HCM)';
        case 'ql13':
            return 'QL13 (HCM)';
        case 'tada':
            return 'Thuận An';
        default:
            return 'Thuận An';
    }
};

/**
 * Phân tích dữ liệu 3 kho thành Map tra cứu theo VIN
 */
export const buildSatelliteCarMap = (warehouses: Record<string, any>): Map<string, SatelliteCarRecord> => {
    const map = new Map<string, SatelliteCarRecord>();

    Object.entries(warehouses).forEach(([khoKey, info]) => {
        const data: any[][] = info?.data || [];
        if (!data || data.length === 0) return;

        let headerIdx = 0;
        for (let idx = 0; idx < Math.min(3, data.length); idx++) {
            const joined = (data[idx] || []).join(' ').toLowerCase();
            if (joined.includes('số khung') || joined.includes('loại xe') || joined.includes('tháng nhập')) {
                headerIdx = idx;
                break;
            }
        }

        const rows = data.slice(headerIdx + 1);
        rows.forEach((r) => {
            if (!r || r.length === 0) return;
            const vin = String(r[5] || '').trim().toUpperCase();
            if (!vin) return;

            const ngayGiao = String(r[10] || '').trim();
            const isTonKho = !ngayGiao || ngayGiao === '' || ngayGiao.toLowerCase() === 'none';

            // Chỉ lấy các xe đang thực tế còn tồn tại bãi
            if (!isTonKho) return;

            let pinStr = String(r[7] || '');
            if (typeof r[7] === 'number') {
                pinStr = `${Math.round(r[7] <= 1 ? r[7] * 100 : r[7])}%`;
            }

            let cleanKhoName = (info?.khoName || khoKey || '').replace(/Kho /gi, '').trim();
            cleanKhoName = cleanKhoName
                .replace(/Dĩ An/gi, '')
                .replace(/Di An/gi, '')
                .replace(/TA\s*-\s*DA/gi, 'Thuận An')
                .replace(/-DA/gi, '')
                .replace(/-\s*DA/gi, '')
                .trim();
            if (!cleanKhoName || khoKey === 'tada' || cleanKhoName.toLowerCase() === 'tada') {
                cleanKhoName = 'Thuận An';
            }

            const record: SatelliteCarRecord = {
                vin,
                khoKey: khoKey as any,
                khoName: cleanKhoName,
                standardLocation: mapKhoToStandardLocation(khoKey),
                loaiXe: String(r[4] || '').trim(),
                mauSac: String(r[6] || '').trim(),
                mucPin: pinStr,
                ngayNhan: String(r[9] || '').slice(0, 10),
                ngayGiao,
                isTonKho
            };

            // Map bằng full VIN
            map.set(vin, record);

            // Map bằng 6 số cuối nếu VIN đủ dài
            if (vin.length >= 6) {
                const suffix = vin.slice(-6);
                if (!map.has(suffix)) {
                    map.set(suffix, record);
                }
            }
        });
    });

    return map;
};

/**
 * Lấy Map dữ liệu xe từ cache
 */
export const getSatelliteCarMap = (): Map<string, SatelliteCarRecord> => {
    if (memoryCache && memoryCache.size > 0) {
        return memoryCache;
    }

    try {
        const cachedStr = typeof localStorage !== 'undefined' ? localStorage.getItem(SATELLITE_CACHE_KEY) : null;
        if (cachedStr) {
            const json = JSON.parse(cachedStr);
            if (json.warehouses) {
                memoryCache = buildSatelliteCarMap(json.warehouses);
                return memoryCache;
            }
        }
    } catch (e) {
        console.error('Error reading satellite cache', e);
    }

    // Nếu chưa có cache, khởi chạy tải ngầm
    triggerBackgroundRefresh();
    return new Map();
};

/**
 * Tải dữ liệu ngầm từ Web App Google Apps Script
 */
export const triggerBackgroundRefresh = async () => {
    if (isFetchingBackground) return;
    isFetchingBackground = true;
    try {
        const res = await fetch(SATELLITE_API_URL);
        if (res.ok) {
            const json = await res.json();
            if (json.status === 'SUCCESS' && json.warehouses) {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(SATELLITE_CACHE_KEY, JSON.stringify(json));
                }
                memoryCache = buildSatelliteCarMap(json.warehouses);
                // Dispatch custom event để các component lắng nghe cập nhật nếu cần
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('satellite_warehouses_updated'));
                }
            }
        }
    } catch (e) {
        console.warn('Background satellite refresh failed', e);
    } finally {
        isFetchingBackground = false;
    }
};

/**
 * Kiểm tra xem vị trí của xe có phải là "Đang vận tải" hay không
 */
export const isCarInTransit = (car: StockVehicle): boolean => {
    const loc = String(car["Vị trí"] || '').trim().toLowerCase();
    return !loc || 
           loc === 'đang vận tải' || 
           loc.includes('vận tải') || 
           loc.includes('hải phòng') ||
           loc === 'hải phòng';
};

/**
 * Làm giàu dữ liệu xe: Những xe Đang Vận Tải sẽ được tra cứu vị trí thực tế từ 3 sheet kho ngoài.
 * Còn lại giữ nguyên 100%.
 */
export const enrichTransitCarsWithRealLocations = (cars: StockVehicle[]): StockVehicle[] => {
    if (!cars || cars.length === 0) return cars;

    const satelliteMap = getSatelliteCarMap();
    if (!satelliteMap || satelliteMap.size === 0) return cars;

    let hasChange = false;
    const enriched = cars.map(car => {
        // Chỉ xử lý những xe đang ở trạng thái vận tải
        if (!isCarInTransit(car)) {
            return car; // Còn lại giữ nguyên 100%
        }

        const vin = String(car.VIN || '').trim().toUpperCase();
        if (!vin) return car;

        // Tra cứu theo full VIN hoặc 6 số cuối
        let match = satelliteMap.get(vin);
        if (!match && vin.length >= 6) {
            match = satelliteMap.get(vin.slice(-6));
        }

        if (match) {
            hasChange = true;
            return {
                ...car,
                "Vị trí": match.standardLocation, // Cập nhật sang vị trí thực tế: 'Q12 (HCM)', 'QL13 (HCM)', 'Thuận An'
                "Vị trí cũ": car["Vị trí"],
                isResolvedFromSatellite: true,
                realWarehouseName: match.khoName,
                realReceivedDate: match.ngayNhan,
                realBattery: match.mucPin
            };
        }

        return car;
    });

    return hasChange ? enriched : cars;
};

/**
 * Tra cứu và đối chiếu danh sách xe đã lập phiếu ĐNX xuất điều chuyển
 * với tồn kho K83 trên CyberSoft và bãi thực tế (3 kho ngoài / Bãi Thuận An).
 * TUYỆT ĐỐI CHỈ ĐỌC (READ-ONLY), KHÔNG GHI HOẶC ĐỒNG BỘ VÀO SUPABASE.
 */
export const fetchDnxReconciliationData = async (
    allOrders: any[] = [],
    satelliteCars: any[] = []
): Promise<DnxReconciliationItem[]> => {
    try {
        // 1. Lấy danh sách toàn bộ xe đã có TD4 trên Cyber để LOẠI BỎ HOÀN TOÀN khỏi đối chiếu ĐNX
        // Quy tắc cốt lõi: "Nếu xe đã có TD4 thì bỏ qua phiếu ĐNX"
        const td4VinSet = new Set<string>();
        try {
            const { data: td4Cars } = await supabase
                .from('cyber_car_status')
                .select('vin, has_td4, so_ct_td4')
                .eq('has_td4', true);
            if (td4Cars) {
                td4Cars.forEach((r: any) => {
                    const vin = String(r.vin || '').trim().toUpperCase();
                    const hasTd = r.has_td4 === true || (r.so_ct_td4 && String(r.so_ct_td4).trim() !== '');
                    if (vin && hasTd) {
                        td4VinSet.add(vin);
                        if (vin.length >= 6) td4VinSet.add(vin.slice(-6));
                    }
                });
            }
        } catch (eTd4) {
            console.warn('[fetchDnxReconciliationData] td4 check warning:', eTd4);
        }

        // Bổ sung các xe có TD4 từ allOrders
        if (allOrders && allOrders.length > 0) {
            allOrders.forEach(o => {
                const soTd4 = String(o.so_ct_td4 || o['Số phiếu TD4'] || o['Số CT TD4'] || '').trim();
                const hasTd4 = o.has_td4 === true || (soTd4 !== '' && soTd4 !== 'null' && soTd4 !== 'None');
                if (hasTd4) {
                    const v = String(o.vin || o.VIN || o['Số khung'] || '').trim().toUpperCase();
                    if (v) {
                        td4VinSet.add(v);
                        if (v.length >= 6) td4VinSet.add(v.slice(-6));
                    }
                }
            });
        }

        const isCarWithTd4 = (vinStr: string): boolean => {
            const clean = vinStr.trim().toUpperCase();
            if (!clean) return false;
            if (td4VinSet.has(clean)) return true;
            if (clean.length >= 6 && td4VinSet.has(clean.slice(-6))) return true;
            return false;
        };

        // 1.1 Lấy danh sách xe đã có ĐNX từ bảng cyber_car_status
        let cyberCars: any[] = [];
        try {
            const { data, error } = await supabase
                .from('cyber_car_status')
                .select('vin, ma_kho, ten_kho, has_dnx, so_ct_dnx, ngay_ct_dnx, dnx_data, so_may, ma_kx, ten_kx, ma_mau, ten_mau, has_td4, so_ct_td4')
                .eq('has_dnx', true);
            if (!error && data) {
                cyberCars = data;
            }
        } catch (eCyber) {
            console.warn('[fetchDnxReconciliationData] cyber_car_status read warning:', eCyber);
        }

        // 2. Lấy các yêu cầu ĐNX điều chuyển từ interactions
        let transferInteractions: any[] = [];
        try {
            const { data, error } = await supabase
                .from('interactions')
                .select('id, actor_name, target_id, metadata, created_at')
                .eq('category', 'TRANSFER_REQUEST')
                .order('created_at', { ascending: false })
                .limit(200);
            if (!error && data) {
                transferInteractions = data;
            }
        } catch (eInter) {
            console.warn('[fetchDnxReconciliationData] interactions read warning:', eInter);
        }

        // 3. Xây dựng Map tra cứu bãi kho vệ tinh (ưu tiên danh sách truyền vào từ state/props)
        const satMap = new Map<string, any>();
        if (satelliteCars && satelliteCars.length > 0) {
            satelliteCars.forEach(c => {
                const rawVin = String(c.soKhung || c.vin || '').trim().toUpperCase();
                if (!rawVin) return;
                const cleanVin = rawVin.split(' ')[0].split('(')[0].trim();
                const isTon = c.isTonKho;
                const info = {
                    khoKey: c.khoKey,
                    khoName: c.khoName,
                    isTonKho: isTon,
                    ngayNhan: c.ngayNhan || '',
                    ngayGiao: c.ngayGiao || '',
                    mucPin: c.mucPin || '-',
                    note: c.note || ''
                };
                if (!satMap.has(cleanVin) || (isTon && !satMap.get(cleanVin)?.isTonKho)) {
                    satMap.set(cleanVin, info);
                }
                if (cleanVin.length >= 6) {
                    const suffix = cleanVin.slice(-6);
                    if (!satMap.has(suffix) || (isTon && !satMap.get(suffix)?.isTonKho)) {
                        satMap.set(suffix, info);
                    }
                }
            });
        } else {
            const satCarMap = getSatelliteCarMap();
            satCarMap.forEach((rec, v) => {
                const info = {
                    khoKey: rec.khoKey,
                    khoName: rec.khoName,
                    isTonKho: rec.isTonKho,
                    ngayNhan: rec.ngayNhan || '',
                    ngayGiao: rec.ngayGiao || '',
                    mucPin: rec.mucPin || '-',
                    note: ''
                };
                if (!satMap.has(v) || (rec.isTonKho && !satMap.get(v)?.isTonKho)) {
                    satMap.set(v, info);
                }
            });
        }

        // 4. Map thông tin đơn hàng / TVBH từ allOrders
        const ordersByVin = new Map<string, any>();
        if (allOrders && allOrders.length > 0) {
            allOrders.forEach(o => {
                const v = String(o.vin || o.VIN || o['Số khung'] || '').trim().toUpperCase();
                if (v) {
                    ordersByVin.set(v, o);
                }
            });
        }

        // 5. Tổng hợp các xe ĐNX (loại trừ toàn bộ các xe đã có phiếu TD4)
        const dnxMap = new Map<string, DnxReconciliationItem>();

        // 5.1 Nguồn cyber_car_status
        cyberCars.forEach(c => {
            const v = String(c.vin || '').trim().toUpperCase();
            if (!v) return;
            // BỎ QUA NẾU XE ĐÃ CÓ PHIẾU TD4
            if (isCarWithTd4(v) || c.has_td4 || c.so_ct_td4) return;
            const dnx = c.dnx_data || {};
            const maKho = (c.ma_kho || '').trim().toUpperCase();
            const tenKho = (c.ten_kho || '').trim();
            const isTonK83 = maKho === 'K83' || tenKho.toLowerCase().includes('thuận an');

            dnxMap.set(v, {
                id: `cyber-${v}`,
                vin: v,
                soCtDnx: c.so_ct_dnx || dnx.so_ct || 'DNX',
                ngayCtDnx: c.ngay_ct_dnx || dnx.ngay_ct || '',
                khoXuat: dnx.ma_kho_xuat || dnx.ten_kho_xuat || 'K87',
                khoNhan: dnx.ma_kho_nhan || dnx.ten_kho_nhan || 'K83',
                maKhoCyber: c.ma_kho || '',
                tenKhoCyber: c.ten_kho || (isTonK83 ? 'Showroom Thuận An (K83)' : 'Đang vận tải'),
                isTonKhoCyberK83: isTonK83,
                tvbh: dnx.nvkd || '',
                customerName: dnx.ten_kh || '',
                orderNumber: '',
                carModel: c.ten_kx || dnx.ten_kx || '',
                trim: '',
                color: c.ten_mau || dnx.ten_mau || '',
                reconcileStatus: 'IN_TRANSIT',
                reconcileNote: '',
                warningLevel: 'info',
                satelliteYard: null
            });
        });

        // 5.2 Nguồn interactions (completed hoặc đã có số ĐNX)
        transferInteractions.forEach(it => {
            const m = it.metadata || {};
            const v = String(m.vin || '').trim().toUpperCase();
            if (!v || isCarWithTd4(v)) return;
            const hasDnx = m.status === 'completed' || !!m.so_ct_dnx;
            if (!hasDnx) return;

            const existing = dnxMap.get(v);
            if (!existing) {
                dnxMap.set(v, {
                    id: it.id,
                    vin: v,
                    soCtDnx: m.so_ct_dnx || 'DNX',
                    ngayCtDnx: m.updated_at || it.created_at || '',
                    khoXuat: m.from_warehouse || 'K87',
                    khoNhan: m.to_warehouse || 'K83',
                    maKhoCyber: '',
                    tenKhoCyber: 'Đang vận tải',
                    isTonKhoCyberK83: false,
                    tvbh: m.consultant_name || it.actor_name || '',
                    customerName: m.customer_name || '',
                    orderNumber: m.order_number || it.target_id || '',
                    carModel: m.car_model || '',
                    trim: m.trim || '',
                    color: m.ext_color || '',
                    reconcileStatus: 'IN_TRANSIT',
                    reconcileNote: '',
                    warningLevel: 'info',
                    satelliteYard: null
                });
            } else {
                if (!existing.tvbh) existing.tvbh = m.consultant_name || it.actor_name || '';
                if (!existing.customerName) existing.customerName = m.customer_name || '';
                if (!existing.orderNumber) existing.orderNumber = m.order_number || it.target_id || '';
                if (!existing.carModel) existing.carModel = m.car_model || '';
                if (!existing.color) existing.color = m.ext_color || '';
            }
        });

        // 5.3 Nguồn allOrders
        ordersByVin.forEach((o, v) => {
            // BỎ QUA NẾU XE ĐÃ CÓ PHIẾU TD4
            if (!v || isCarWithTd4(v)) return;
            const hasDnx = o.has_dnx || o.so_ct_dnx || o['Số CT DNX'];
            if (hasDnx) {
                const existing = dnxMap.get(v);
                if (!existing) {
                    const maKho = (o.ma_kho || o['Mã kho'] || '').toUpperCase();
                    const tenKho = (o.kho_xe || o['Kho xe'] || '').trim();
                    const isTonK83 = maKho === 'K83' || tenKho.toLowerCase().includes('thuận an');
                    dnxMap.set(v, {
                        id: `order-${v}`,
                        vin: v,
                        soCtDnx: o.so_ct_dnx || o['Số CT DNX'] || 'DNX',
                        ngayCtDnx: o.ngay_lap_dnx || '',
                        khoXuat: 'K87',
                        khoNhan: 'K83',
                        maKhoCyber: maKho,
                        tenKhoCyber: tenKho || (isTonK83 ? 'Showroom Thuận An (K83)' : 'Đang vận tải'),
                        isTonKhoCyberK83: isTonK83,
                        tvbh: o.tvbh || o['TVBH'] || '',
                        customerName: o.ten_khach_hang || o['Tên KH'] || '',
                        orderNumber: o.so_hop_dong || o.so_don_hang || o['Số HĐ'] || '',
                        carModel: o.dong_xe || o['Dòng xe'] || '',
                        trim: o.phien_ban || o['Phiên bản'] || '',
                        color: o.mau_ngoai_that || o['Màu'] || '',
                        reconcileStatus: 'IN_TRANSIT',
                        reconcileNote: '',
                        warningLevel: 'info',
                        satelliteYard: null
                    });
                } else {
                    if (!existing.tvbh) existing.tvbh = o.tvbh || o['TVBH'] || '';
                    if (!existing.customerName) existing.customerName = o.ten_khach_hang || o['Tên KH'] || '';
                    if (!existing.orderNumber) existing.orderNumber = o.so_hop_dong || o.so_don_hang || o['Số HĐ'] || '';
                    if (!existing.carModel) existing.carModel = o.dong_xe || o['Dòng xe'] || '';
                    if (!existing.trim) existing.trim = o.phien_ban || o['Phiên bản'] || '';
                    if (!existing.color) existing.color = o.mau_ngoai_that || o['Màu'] || '';
                }
            } else {
                const existing = dnxMap.get(v);
                if (existing) {
                    if (!existing.tvbh) existing.tvbh = o.tvbh || o['TVBH'] || '';
                    if (!existing.customerName) existing.customerName = o.ten_khach_hang || o['Tên KH'] || '';
                    if (!existing.orderNumber) existing.orderNumber = o.so_hop_dong || o.so_don_hang || o['Số HĐ'] || '';
                    if (!existing.carModel) existing.carModel = o.dong_xe || o['Dòng xe'] || '';
                    if (!existing.color) existing.color = o.mau_ngoai_that || o['Màu'] || '';
                }
            }
        });

        // 5.4 Bổ sung TVBH và Tên Khách Hàng cho xe ĐNX nếu còn thiếu
        const missingDnxVins: string[] = [];
        dnxMap.forEach((item, v) => {
            if (!item.tvbh || !item.customerName) {
                missingDnxVins.push(v);
            }
        });

        if (missingDnxVins.length > 0) {
            try {
                const [archRes, dhRes, ycRes] = await Promise.all([
                    supabase.from('archived_orders').select('vin, ten_khach_hang, tvbh, so_don_hang, ma_hd_cyber').in('vin', missingDnxVins),
                    supabase.from('donhang').select('vin, ten_khach_hang, ten_tu_van_ban_hang, so_don_hang, ma_hd_cyber').in('vin', missingDnxVins),
                    supabase.from('yeucauxhd').select('vin, ten_khach_hang, tvbh, so_don_hang, ma_hd_cyber').in('vin', missingDnxVins)
                ]);

                const fillMissing = (row: any) => {
                    const v = String(row.vin || '').trim().toUpperCase();
                    if (!v) return;
                    const item = dnxMap.get(v);
                    if (item) {
                        const tv = row.tvbh || row.ten_tu_van_ban_hang;
                        if (!item.tvbh && tv) item.tvbh = String(tv).trim();
                        if (!item.customerName && row.ten_khach_hang) item.customerName = String(row.ten_khach_hang).trim();
                        if (!item.orderNumber && (row.so_don_hang || row.ma_hd_cyber)) item.orderNumber = String(row.so_don_hang || row.ma_hd_cyber).trim();
                    }
                };
                (archRes.data || []).forEach(fillMissing);
                (dhRes.data || []).forEach(fillMissing);
                (ycRes.data || []).forEach(fillMissing);
            } catch (eDnx) {
                console.warn('[fetchDnxReconciliationData] Lỗi nạp bổ sung TVBH/KH:', eDnx);
            }
        }

        // 6. Đối chiếu từng xe với Bãi Kho Ngoài
        const results: DnxReconciliationItem[] = [];

        dnxMap.forEach((item, v) => {
            if (isCarWithTd4(v) || isCarWithTd4(item.vin)) return;

            let sat = satMap.get(v);
            if (!sat && v.length >= 6) {
                sat = satMap.get(v.slice(-6));
            }

            item.satelliteYard = sat || null;

            if (item.isTonKhoCyberK83) {
                item.reconcileStatus = 'ALREADY_IN_CYBER';
                item.warningLevel = 'success';
                item.reconcileNote = 'Đã có tồn kho K83 trên CyberSoft';
            } else if (sat && sat.isTonKho && (sat.khoKey === 'tada' || String(sat.khoName || '').toLowerCase().includes('thuận an'))) {
                item.reconcileStatus = 'AT_THUAN_AN';
                item.warningLevel = 'danger';
                item.reconcileNote = `🚨 XE ĐÃ VỀ BÃI THỰC TẾ THUẬN AN — TVBH (${item.tvbh || 'Chưa rõ'}) CHƯA BÁO NHẬP KHO CYBER`;
            } else if (sat && sat.isTonKho && (sat.khoKey === 'ql13' || sat.khoKey === 'q12')) {
                item.reconcileStatus = 'AT_TRANSIT_YARD';
                item.warningLevel = 'warning';
                item.reconcileNote = `🚚 Xe còn tại bãi ${sat.khoName || sat.khoKey.toUpperCase()} — Chờ chuyển về bãi Thuận An`;
            } else {
                item.reconcileStatus = 'IN_TRANSIT';
                item.warningLevel = 'info';
                item.reconcileNote = '⏳ Xe đang trên đường vận chuyển (chưa ghi nhận tại bãi thực tế)';
            }

            results.push(item);
        });

        // Ưu tiên xếp xe Đã về bãi Thuận An lên đầu, tiếp đến các bãi ngoài khác, rồi đến đang trên đường
        results.sort((a, b) => {
            const orderMap = { AT_THUAN_AN: 1, AT_TRANSIT_YARD: 2, IN_TRANSIT: 3, ALREADY_IN_CYBER: 4 };
            const diff = orderMap[a.reconcileStatus] - orderMap[b.reconcileStatus];
            if (diff !== 0) return diff;
            return (b.ngayCtDnx || '').localeCompare(a.ngayCtDnx || '');
        });

        return results;
    } catch (err) {
        console.error('[fetchDnxReconciliationData] Error:', err);
        return [];
    }
};

export interface Td4ReconciliationItem {
    id: string;
    vin: string;
    soCtTd4: string;
    ngayCtTd4: string;
    tvbh: string;
    customerName: string;
    orderNumber: string;
    carModel: string;
    trim?: string;
    color: string;
    maKhoCyber: string;
    tenKhoCyber: string;
    satelliteYard: {
        khoKey: string;
        khoName: string;
        ngayNhan: string;
        ngayGiao: string;
        pin: string;
        isTonKho: boolean;
        tinhTrang: string;
        note: string;
        benGiao?: string;
        soNgayTon?: any;
        showroomQuanLy?: string;
    };
    warningNote: string;
    isTonThuanAn: boolean;
}

/**
 * Tra cứu và đối chiếu danh sách xe ĐÃ CÓ PHIẾU TD4 (Đã giao xe) trên CyberSoft
 * nhưng THỰC TẾ VẪN CÒN TỒN TẠI BÃI NGOÀI (Bãi Thuận An, QL13, Q12).
 * QUY TẮC: "TD4 có nghĩa là đã giao xe, KHÔNG ĐƯỢC PHÉP TỒN Ở ĐÂU HẾT!"
 */
export const fetchTd4ReconciliationData = async (
    allOrders: any[] = [],
    satelliteCars: any[] = []
): Promise<Td4ReconciliationItem[]> => {
    try {
        // 1. Lấy xe có phiếu TD4 từ cyber_car_status
        let cyberCars: any[] = [];
        try {
            const { data, error } = await supabase
                .from('cyber_car_status')
                .select('vin, ma_kho, ten_kho, has_td4, so_ct_td4, ngay_ct_td4, td4_data, so_may, ma_kx, ten_kx, ma_mau, ten_mau')
                .eq('has_td4', true);
            if (!error && data) {
                cyberCars = data;
            }
        } catch (e) {
            console.warn('[fetchTd4ReconciliationData] Read error:', e);
        }

        // 2. Map Satellite cars
        const satMap = new Map<string, any>();
        if (satelliteCars && satelliteCars.length > 0) {
            satelliteCars.forEach(c => {
                const rawVin = String(c.soKhung || c.vin || '').trim().toUpperCase();
                if (!rawVin) return;
                const cleanVin = rawVin.split(' ')[0].split('(')[0].trim();
                const isTon = c.isTonKho;
                const info = {
                    khoKey: c.khoKey,
                    khoName: c.khoName,
                    isTonKho: isTon,
                    ngayNhan: c.ngayNhan || '',
                    ngayGiao: c.ngayGiao || '',
                    pin: c.mucPin || '-',
                    tinhTrang: c.tinhTrang || '',
                    note: c.note || '',
                    benGiao: c.benGiao || '',
                    soNgayTon: c.soNgayTonKho || '',
                    showroomQuanLy: c.showroomQuanLy || ''
                };
                if (!satMap.has(cleanVin) || (isTon && !satMap.get(cleanVin)?.isTonKho)) {
                    satMap.set(cleanVin, info);
                }
                if (cleanVin.length >= 6) {
                    const suffix = cleanVin.slice(-6);
                    if (!satMap.has(suffix) || (isTon && !satMap.get(suffix)?.isTonKho)) {
                        satMap.set(suffix, info);
                    }
                }
            });
        } else {
            const satCarMap = getSatelliteCarMap();
            satCarMap.forEach((rec, v) => {
                const info = {
                    khoKey: rec.khoKey,
                    khoName: rec.khoName,
                    isTonKho: rec.isTonKho,
                    ngayNhan: rec.ngayNhan || '',
                    ngayGiao: rec.ngayGiao || '',
                    pin: rec.mucPin || '-',
                    tinhTrang: '',
                    note: ''
                };
                if (!satMap.has(v) || (rec.isTonKho && !satMap.get(v)?.isTonKho)) {
                    satMap.set(v, info);
                }
            });
        }

        // 3. Map allOrders by VIN
        const ordersByVin = new Map<string, any>();
        if (allOrders && allOrders.length > 0) {
            allOrders.forEach(o => {
                const v = String(o.vin || o.VIN || o['Số khung'] || '').trim().toUpperCase();
                if (v) {
                    ordersByVin.set(v, o);
                }
            });
        }

        // 3.1 Thu thập danh sách số khung TD4 thực tế còn tồn bãi để truy vấn bổ sung thông tin Khách hàng & TVBH
        const targetVins: string[] = [];
        cyberCars.forEach(c => {
            const v = String(c.vin || '').trim().toUpperCase();
            if (!v) return;
            const sat = satMap.get(v) || (v.length >= 6 ? satMap.get(v.slice(-6)) : null);
            if (sat && sat.isTonKho) {
                targetVins.push(v);
            }
        });

        // 3.2 Truy vấn đồng thời từ archived_orders, donhang và yeucauxhd
        if (targetVins.length > 0) {
            try {
                const [archRes, dhRes, ycRes] = await Promise.all([
                    supabase
                        .from('archived_orders')
                        .select('vin, ten_khach_hang, tvbh, so_don_hang, ma_hd_cyber, dong_xe, phien_ban')
                        .in('vin', targetVins),
                    supabase
                        .from('donhang')
                        .select('vin, ten_khach_hang, ten_tu_van_ban_hang, so_don_hang, ma_hd_cyber, dong_xe, phien_ban')
                        .in('vin', targetVins),
                    supabase
                        .from('yeucauxhd')
                        .select('vin, ten_khach_hang, tvbh, so_don_hang, ma_hd_cyber, dong_xe, phien_ban')
                        .in('vin', targetVins)
                ]);

                const mergeInfo = (row: any) => {
                    const v = String(row.vin || '').trim().toUpperCase();
                    if (!v) return;
                    const existing = ordersByVin.get(v) || {};
                    const tv = row.tvbh || row.ten_tu_van_ban_hang;
                    ordersByVin.set(v, {
                        ...existing,
                        ...row,
                        tvbh: (tv && String(tv).trim()) || existing.tvbh || '',
                        ten_khach_hang: (row.ten_khach_hang && String(row.ten_khach_hang).trim()) || existing.ten_khach_hang || '',
                        so_hop_dong: (row.ma_hd_cyber && String(row.ma_hd_cyber).trim()) || existing.so_hop_dong || '',
                        so_don_hang: (row.so_don_hang && String(row.so_don_hang).trim()) || existing.so_don_hang || '',
                        dong_xe: (row.dong_xe && String(row.dong_xe).trim()) || existing.dong_xe || '',
                        phien_ban: (row.phien_ban && String(row.phien_ban).trim()) || existing.phien_ban || ''
                    });
                };

                (archRes.data || []).forEach(mergeInfo);
                (dhRes.data || []).forEach(mergeInfo);
                (ycRes.data || []).forEach(mergeInfo);
            } catch (errFallback) {
                console.warn('[fetchTd4ReconciliationData] Lỗi nạp thông tin TVBH & Khách hàng:', errFallback);
            }
        }

        // 4. Lọc xe có TD4 mà vẫn còn tồn bãi thực tế (isTonKho === true)
        const results: Td4ReconciliationItem[] = [];

        cyberCars.forEach(c => {
            const v = String(c.vin || '').trim().toUpperCase();
            if (!v) return;

            let sat = satMap.get(v);
            if (!sat && v.length >= 6) {
                sat = satMap.get(v.slice(-6));
            }

            // CHỈ LẤY NHỮNG XE THỰC TẾ VẪN CÒN TỒN BÃI
            if (!sat || !sat.isTonKho) return;

            const td4 = c.td4_data || {};
            const ord = ordersByVin.get(v) || {};

            const soCtTd4 = c.so_ct_td4 || td4.so_ct || ord.so_ct_td4 || ord['Số CT TD4'] || 'TD4';
            const ngayCtTd4 = c.ngay_ct_td4 || td4.ngay_ct || ord.ngay_giao_xe || '';
            const tvbh = ord.tvbh || ord['TVBH'] || td4.nvkd || '';
            const customerName = ord.ten_khach_hang || ord['Tên KH'] || td4.ten_kh || '';
            const orderNumber = td4.so_hd || ord.so_hop_dong || ord.so_don_hang || ord['Số HĐ'] || '';
            const carModel = ord.dong_xe || ord['Dòng xe'] || c.ten_kx || td4.loai_xe || '';
            const trim = ord.phien_ban || ord['Phiên bản'] || '';
            const color = c.ten_mau || ord.mau_ngoai_that || ord['Màu'] || '';
            const isTonThuanAn = sat.khoKey === 'tada' || String(sat.khoName || '').toLowerCase().includes('thuận an');

            results.push({
                id: `td4-${v}`,
                vin: v,
                soCtTd4,
                ngayCtTd4,
                tvbh,
                customerName,
                orderNumber,
                carModel,
                trim,
                color,
                maKhoCyber: c.ma_kho || '',
                tenKhoCyber: c.ten_kho || '',
                satelliteYard: sat,
                isTonThuanAn,
                warningNote: `🚨 VI PHẠM TỒN KHO TD4: Đã lập phiếu giao xe TD4 (${soCtTd4}) nhưng vẫn còn tồn tại ${sat.khoName} (Pin: ${sat.pin})! Xe có TD4 không được phép tồn ở đâu hết!`
            });
        });

        // Sắp xếp: Ưu tiên xe tồn bãi Thuận An lên trước, tiếp đến ngày lập TD4 mới nhất
        results.sort((a, b) => {
            if (a.isTonThuanAn && !b.isTonThuanAn) return -1;
            if (!a.isTonThuanAn && b.isTonThuanAn) return 1;
            return (b.ngayCtTd4 || '').localeCompare(a.ngayCtTd4 || '');
        });

        return results;
    } catch (err) {
        console.error('[fetchTd4ReconciliationData] Error:', err);
        return [];
    }
};

export interface InvoicedMissingYardItem {
    id: string;
    vin: string;
    carModel: string;
    trim?: string;
    color: string;
    tvbh: string;
    customerName: string;
    orderNumber: string;
    maHdCyber: string;
    ngayXuatHoaDon: string;
    urlHoaDon?: string;
    maKhoCyber: string;
    tenKhoCyber: string;
    satelliteStatus: 'NOT_FOUND_IN_YARD' | 'ALREADY_DISPATCHED_WITHOUT_TD4';
    satelliteStatusLabel: string;
    ngayXuatBaiThucTe?: string;
    khoBaiThucTe?: string;
    warningNote: string;
}

/**
 * Tra cứu và kiểm soát các xe:
 * 1. ĐÃ XUẤT HÓA ĐƠN
 * 2. CHƯA TẠO PHIẾU TD4
 * 3. ĐÃ TỪNG TỒN TẠI Ở BẤT KỲ KHO NÀO TRÊN CYBER
 * 4. NHƯNG KHÔNG TỒN THỰC TẾ TẠI 3 BÃI NGOÀI (Hoặc đã bị ghi nhận xuất bãi trái quy trình)
 * TUYỆT ĐỐI CHỈ ĐỌC (READ-ONLY).
 */
export const fetchInvoicedMissingYardReconciliationData = async (
    allOrders: any[] = [],
    satelliteCars: any[] = []
): Promise<InvoicedMissingYardItem[]> => {
    try {
        // 1. Lấy danh sách xe đã có phiếu TD4 để loại trừ
        const td4VinSet = new Set<string>();
        try {
            const { data: td4Cars } = await supabase
                .from('cyber_car_status')
                .select('vin, has_td4, so_ct_td4')
                .eq('has_td4', true);
            if (td4Cars) {
                td4Cars.forEach((r: any) => {
                    const vin = String(r.vin || '').trim().toUpperCase();
                    const hasTd = r.has_td4 === true || (r.so_ct_td4 && String(r.so_ct_td4).trim() !== '');
                    if (vin && hasTd) {
                        td4VinSet.add(vin);
                        if (vin.length >= 6) td4VinSet.add(vin.slice(-6));
                    }
                });
            }
        } catch (eTd4) {
            console.warn('[fetchInvoicedMissingYard] td4 check warning:', eTd4);
        }

        // Bổ sung các xe có TD4 từ allOrders
        if (allOrders && allOrders.length > 0) {
            allOrders.forEach(o => {
                const soTd4 = String(o.so_ct_td4 || o['Số phiếu TD4'] || o['Số CT TD4'] || '').trim();
                const hasTd4 = o.has_td4 === true || (soTd4 !== '' && soTd4 !== 'null' && soTd4 !== 'None');
                if (hasTd4) {
                    const v = String(o.vin || o.VIN || o['Số khung'] || '').trim().toUpperCase();
                    if (v) {
                        td4VinSet.add(v);
                        if (v.length >= 6) td4VinSet.add(v.slice(-6));
                    }
                }
            });
        }

        const isCarWithTd4 = (vinStr: string): boolean => {
            const clean = vinStr.trim().toUpperCase();
            if (!clean) return false;
            if (td4VinSet.has(clean)) return true;
            if (clean.length >= 6 && td4VinSet.has(clean.slice(-6))) return true;
            return false;
        };

        // 2. Map Satellite cars (3 kho ngoài)
        const satMap = new Map<string, any>();
        if (satelliteCars && satelliteCars.length > 0) {
            satelliteCars.forEach(c => {
                const rawVin = String(c.soKhung || c.vin || '').trim().toUpperCase();
                if (!rawVin) return;
                const cleanVin = rawVin.split(' ')[0].split('(')[0].trim();
                const isTon = c.isTonKho;
                const info = {
                    khoKey: c.khoKey,
                    khoName: c.khoName,
                    isTonKho: isTon,
                    ngayNhan: c.ngayNhan || '',
                    ngayGiao: c.ngayGiao || '',
                    pin: c.mucPin || '-',
                    tinhTrang: c.tinhTrang || '',
                    note: c.note || '',
                    benGiao: c.benGiao || '',
                    soNgayTon: c.soNgayTonKho || '',
                    showroomQuanLy: c.showroomQuanLy || ''
                };
                if (!satMap.has(cleanVin) || (isTon && !satMap.get(cleanVin)?.isTonKho)) {
                    satMap.set(cleanVin, info);
                }
                if (cleanVin.length >= 6) {
                    const suffix = cleanVin.slice(-6);
                    if (!satMap.has(suffix) || (isTon && !satMap.get(suffix)?.isTonKho)) {
                        satMap.set(suffix, info);
                    }
                }
            });
        } else {
            const satCarMap = getSatelliteCarMap();
            satCarMap.forEach((rec, v) => {
                const info = {
                    khoKey: rec.khoKey,
                    khoName: rec.khoName,
                    isTonKho: rec.isTonKho,
                    ngayNhan: rec.ngayNhan || '',
                    ngayGiao: rec.ngayGiao || '',
                    pin: rec.mucPin || '-',
                    tinhTrang: '',
                    note: ''
                };
                if (!satMap.has(v) || (rec.isTonKho && !satMap.get(v)?.isTonKho)) {
                    satMap.set(v, info);
                }
            });
        }

        // 3. Lấy thông tin cyber_car_status để xác định xe từng có mặt trên Cyber
        const cyberMap = new Map<string, any>();
        try {
            const { data: cyberCars } = await supabase
                .from('cyber_car_status')
                .select('vin, ma_kho, ten_kho, has_td4, so_ct_td4, has_dnx, so_ct_dnx, so_may, ma_kx, ten_kx, ma_mau, ten_mau');
            if (cyberCars) {
                cyberCars.forEach((c: any) => {
                    const v = String(c.vin || '').trim().toUpperCase();
                    if (v) {
                        cyberMap.set(v, c);
                        if (v.length >= 6) cyberMap.set(v.slice(-6), c);
                    }
                });
            }
        } catch (eCyber) {
            console.warn('[fetchInvoicedMissingYard] cyber_car_status read warning:', eCyber);
        }

        // 4. Lấy danh sách xe đã xuất hóa đơn từ yeucauxhd, donhang và archived_orders
        const invoicedMap = new Map<string, any>();

        // 4.1 yeucauxhd
        try {
            const { data: yData } = await supabase
                .from('yeucauxhd')
                .select('vin, so_don_hang, ten_khach_hang, tvbh, dong_xe, phien_ban, ngoai_that, ngay_xuat_hoa_don, url_hoa_don_da_xuat, ma_hd_cyber')
                .not('vin', 'is', null);
            if (yData) {
                yData.forEach((row: any) => {
                    const vin = String(row.vin || '').trim().toUpperCase();
                    if (!vin) return;
                    const isXhd = Boolean(row.ngay_xuat_hoa_don || row.url_hoa_don_da_xuat);
                    if (isXhd && !invoicedMap.has(vin)) {
                        invoicedMap.set(vin, {
                            vin,
                            orderNumber: row.so_don_hang || '',
                            customerName: row.ten_khach_hang || '',
                            tvbh: row.tvbh || '',
                            carModel: row.dong_xe || '',
                            trim: row.phien_ban || '',
                            color: row.ngoai_that || '',
                            ngayXuatHoaDon: row.ngay_xuat_hoa_don || '',
                            urlHoaDon: row.url_hoa_don_da_xuat || '',
                            maHdCyber: row.ma_hd_cyber || ''
                        });
                    }
                });
            }
        } catch (eYc) {
            console.warn('[fetchInvoicedMissingYard] yeucauxhd read warning:', eYc);
        }

        // 4.2 donhang & archived_orders
        try {
            const [dhRes, archRes] = await Promise.all([
                supabase.from('donhang').select('vin, so_don_hang, ten_khach_hang, ten_tu_van_ban_hang, dong_xe, phien_ban, mau_ngoai_that, ngay_hoa_don, so_hoa_don, ma_hd_cyber').not('vin', 'is', null).or('ngay_hoa_don.not.is.null,so_hoa_don.not.is.null'),
                supabase.from('archived_orders').select('vin, so_don_hang, ten_khach_hang, tvbh, dong_xe, phien_ban, mau_ngoai_that, ngay_hoa_don, so_hoa_don, ma_hd_cyber').not('vin', 'is', null).or('ngay_hoa_don.not.is.null,so_hoa_don.not.is.null')
            ]);

            const processOrderRow = (row: any) => {
                const vin = String(row.vin || '').trim().toUpperCase();
                if (!vin) return;
                const isXhd = Boolean(row.ngay_hoa_don || row.so_hoa_don);
                if (isXhd && !invoicedMap.has(vin)) {
                    invoicedMap.set(vin, {
                        vin,
                        orderNumber: row.so_don_hang || '',
                        customerName: row.ten_khach_hang || '',
                        tvbh: row.tvbh || row.ten_tu_van_ban_hang || '',
                        carModel: row.dong_xe || '',
                        trim: row.phien_ban || '',
                        color: row.mau_ngoai_that || '',
                        ngayXuatHoaDon: row.ngay_hoa_don || '',
                        urlHoaDon: '',
                        maHdCyber: row.ma_hd_cyber || row.so_hoa_don || ''
                    });
                }
            };

            (dhRes.data || []).forEach(processOrderRow);
            (archRes.data || []).forEach(processOrderRow);
        } catch (eOrders) {
            console.warn('[fetchInvoicedMissingYard] donhang/archived_orders read warning:', eOrders);
        }

        // 5. Đối chiếu logic:
        // Đã xuất hóa đơn + Chưa có TD4 + Đã từng có ở Cyber + Không còn tồn thực tế tại 3 bãi
        const results: InvoicedMissingYardItem[] = [];

        invoicedMap.forEach((inv, v) => {
            // Kiểm tra TD4: nếu đã có TD4 thì bỏ qua
            if (isCarWithTd4(v) || isCarWithTd4(inv.vin)) return;

            // Kiểm tra từng tồn tại trên Cyber (trong cyber_car_status hoặc có mã HĐ cyber)
            const cyber = cyberMap.get(v) || cyberMap.get(inv.vin);

            // Kiểm tra bãi thực tế
            let sat = satMap.get(v);
            if (!sat && v.length >= 6) {
                sat = satMap.get(v.slice(-6));
            }

            const isTonBai = sat ? Boolean(sat.isTonKho) : false;

            // Nếu XE KHÔNG CÒN TỒN BÃI THỰC TẾ
            if (!isTonBai) {
                const isDispatched = sat && sat.ngayGiao && String(sat.ngayGiao).trim() !== '';
                const statusType = isDispatched ? 'ALREADY_DISPATCHED_WITHOUT_TD4' : 'NOT_FOUND_IN_YARD';
                const statusLabel = isDispatched 
                    ? `⚠️ Đã xuất bãi (${sat.khoName}) ngày ${sat.ngayGiao} — Chưa có phiếu TD4!`
                    : '🚨 Không tìm thấy trong 3 bãi ngoài (Thuận An, QL13, Q12)';

                const tenKhoCyber = cyber ? (cyber.ten_kho || cyber.ma_kho || 'CyberSoft') : 'CyberSoft';
                const maKhoCyber = cyber ? (cyber.ma_kho || 'CYBER') : 'CYBER';

                results.push({
                    id: `inv-missing-${v}`,
                    vin: inv.vin,
                    carModel: inv.carModel || (cyber ? cyber.ten_kx : '') || 'Chưa rõ dòng',
                    trim: inv.trim || '',
                    color: inv.color || (cyber ? cyber.ten_mau : '') || '',
                    tvbh: inv.tvbh || 'Chưa rõ',
                    customerName: inv.customerName || 'Chưa rõ',
                    orderNumber: inv.orderNumber || '',
                    maHdCyber: inv.maHdCyber || '',
                    ngayXuatHoaDon: inv.ngayXuatHoaDon || '',
                    urlHoaDon: inv.urlHoaDon || '',
                    maKhoCyber,
                    tenKhoCyber,
                    satelliteStatus: statusType,
                    satelliteStatusLabel: statusLabel,
                    ngayXuatBaiThucTe: sat?.ngayGiao || '',
                    khoBaiThucTe: sat?.khoName || '',
                    warningNote: `CẢNH BÁO NGUY CƠ: Xe đã xuất hóa đơn ngày ${inv.ngayXuatHoaDon ? inv.ngayXuatHoaDon.slice(0, 10) : 'N/A'}, chưa có lệnh giao xe TD4 nhưng bãi thực tế ${statusLabel.toLowerCase()}!`
                });
            }
        });

        // Sắp xếp: Ưu tiên ngày xuất hóa đơn mới nhất
        results.sort((a, b) => (b.ngayXuatHoaDon || '').localeCompare(a.ngayXuatHoaDon || ''));

        return results;
    } catch (err) {
        console.error('[fetchInvoicedMissingYardReconciliationData] Error:', err);
        return [];
    }
};


