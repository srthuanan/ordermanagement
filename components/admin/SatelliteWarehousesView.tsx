import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    fetchDnxReconciliationData, 
    DnxReconciliationItem,
    fetchTd4ReconciliationData,
    Td4ReconciliationItem,
    fetchInvoicedMissingYardReconciliationData,
    InvoicedMissingYardItem
} from '../../services/api/satelliteWarehouseService';
import { ReconciliationDetailModal } from './ReconciliationDetailModal';
import { VinJourneySummaryCard } from './VinJourneySummaryCard';

export interface SatelliteCarItem {
    id: string;
    khoKey: 'q12' | 'ql13' | 'tada';
    khoName: string;
    stt: number | string;
    thangNhap: string;
    khoXe: string;
    showroomQuanLy: string;
    loaiXe: string;
    soKhung: string;
    mauSac: string;
    mucPin: string;
    mucPinPercent: number | null;
    benGiao: string;
    ngayNhan: string;
    ngayGiao: string;
    khoaSo: string;
    soNgayTonKho: number | string;
    note: string;
    tinhTrang: string;
    isThuanAn: boolean;
    isTonKho: boolean;
}

interface SatelliteWarehousesViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    isActive?: boolean;
    allOrders?: any[];
    stockData?: any[];
    initialViewMode?: 'inventory' | 'reconcile';
    initialReconcileTab?: 'td4' | 'dnx' | 'missing_yard' | 'all';
    onCountsChange?: (counts: { carsCount: number; td4Count: number; dnxCount: number; missingYardCount: number; allAlertCount: number }) => void;
}

const API_URL = "https://script.google.com/macros/s/AKfycbylEAT8IqQVmKsulKUB5imIUcWm3h7a6Mfe-MQyhF3T5Wu2JWcbO3Q6a1aXZLN7exnV/exec";
const CACHE_KEY = "satellite_warehouses_cache_v1";

const formatDate = (val: any): string => {
    if (!val) return '';
    const str = String(val).trim();
    if (str.includes('T') && str.endsWith('Z')) {
        try {
            const d = new Date(str);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            }
        } catch {
            return str;
        }
    }
    return str;
};

const parsePin = (val: any): { display: string; percent: number | null } => {
    if (val === undefined || val === null || val === '') return { display: '-', percent: null };
    if (typeof val === 'number') {
        const pct = val <= 1 ? Math.round(val * 100) : Math.round(val);
        return { display: `${pct}%`, percent: pct };
    }
    const str = String(val).trim();
    const numMatch = str.match(/(\d+)%/);
    if (numMatch) {
        return { display: str, percent: parseInt(numMatch[1], 10) };
    }
    const rawNum = parseFloat(str);
    if (!isNaN(rawNum)) {
        const pct = rawNum <= 1 ? Math.round(rawNum * 100) : Math.round(rawNum);
        return { display: `${pct}%`, percent: pct };
    }
    return { display: str, percent: null };
};

export const SatelliteWarehousesView: React.FC<SatelliteWarehousesViewProps> = ({ 
    showToast, 
    isActive = true,
    allOrders = [],
    stockData: _stockData = [],
    initialViewMode = 'inventory',
    initialReconcileTab = 'td4',
    onCountsChange
}) => {
    // 2 View Modes chính:
    // 'inventory': Tồn kho 3 kho bãi vệ tinh
    // 'reconcile': Trung tâm Đối chiếu & Cảnh báo lệch kho (Cyber vs Bãi thực tế)
    const [viewMode, setViewMode] = useState<'inventory' | 'reconcile'>(initialViewMode);

    // Sub-Tab bên trong Trung tâm Đối Chiếu:
    // 'td4': Chi tiết Đầu Ra: Xe đã có phiếu TD4 nhưng bãi vẫn báo tồn kho
    // 'dnx': Chi tiết Đầu Vào: Xe ĐNX về bãi Thuận An chưa nhập K83 trên Cyber
    // 'missing_yard': Cảnh báo Xuất HĐ nhưng chưa có TD4 mà mất tồn bãi
    // 'all': Bảng tổng hợp toàn bộ sai lệch
    const [reconcileSubTab, setReconcileSubTab] = useState<'td4' | 'dnx' | 'missing_yard' | 'all'>(initialReconcileTab);

    // Đồng bộ khi parent truyền prop thay đổi
    useEffect(() => {
        if (initialViewMode) setViewMode(initialViewMode);
    }, [initialViewMode]);

    useEffect(() => {
        if (initialReconcileTab) setReconcileSubTab(initialReconcileTab);
    }, [initialReconcileTab]);

    // Filters cho Bảng Tổng Hợp ('all')
    const [allAlertFilter, setAllAlertFilter] = useState<'all' | 'dnx' | 'td4' | 'missing_yard'>('all');
    const [allAlertSearch, setAllAlertSearch] = useState('');
    const [selectedAllRowIdx, setSelectedAllRowIdx] = useState<number>(0);

    // 1. DỮ LIỆU 3 KHO VỆ TINH (GOOGLE SHEETS)
    const [isLoading, setIsLoading] = useState(false);
    const [cars, setCars] = useState<SatelliteCarItem[]>([]);
    
    // Filters kho vệ tinh
    const [khoFilter, setKhoFilter] = useState<'all' | 'q12' | 'ql13' | 'tada'>('all');
    const [modelFilter, setModelFilter] = useState<string>('all');
    const [showroomFilter, setShowroomFilter] = useState<string>('thuan_an');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ton' | 'giao'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedVin, setCopiedVin] = useState<string | null>(null);
    const [selectedRowIdx, setSelectedRowIdx] = useState<number>(0);
    const [manualJourneyVin, setManualJourneyVin] = useState<string | null>(null);
    const [dismissedJourneyVin, setDismissedJourneyVin] = useState<string | null>(null);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Debounce tìm kiếm để chống giật lag khi gõ phím
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setDismissedJourneyVin(null);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Map tra cứu xe tồn theo số VIN tối ưu O(1) để render bảng mượt mà tuyệt đối
    const tonCarsByVinMap = useMemo(() => {
        const map = new Map<string, SatelliteCarItem>();
        cars.forEach(car => {
            if (car.isTonKho) {
                const clean = (car.soKhung || '').trim().toUpperCase();
                if (clean) {
                    map.set(clean, car);
                    if (clean.length >= 6) {
                        map.set(clean.slice(-6), car);
                    }
                }
            }
        });
        return map;
    }, [cars]);

    // Xác định số VIN đang cần xem hành trình A-Z (ưu tiên số VIN gõ trong ô tìm kiếm hoặc click chọn)
    const activeJourneyVin = useMemo(() => {
        let targetVin: string | null = null;
        if (manualJourneyVin) {
            targetVin = manualJourneyVin;
        } else {
            const q = debouncedSearchQuery.trim().toUpperCase();
            if (q.length >= 8) {
                const match = cars.find(c => {
                    const v = (c.soKhung || '').trim().toUpperCase();
                    return v === q || (q.length >= 8 && v.endsWith(q));
                });
                if (match) targetVin = match.soKhung.trim().toUpperCase();
            }
        }

        // Nếu người dùng đã bấm nút đóng (✕) cho số VIN này thì ẩn hoàn toàn
        if (targetVin && targetVin === dismissedJourneyVin) {
            return null;
        }

        return targetVin;
    }, [manualJourneyVin, debouncedSearchQuery, cars, dismissedJourneyVin]);

    // 2. DỮ LIỆU BẢNG ĐỐI CHIẾU ĐNX XUẤT ĐIỀU CHUYỂN
    const [reconcileItems, setReconcileItems] = useState<DnxReconciliationItem[]>([]);
    const [isLoadingReconcile, setIsLoadingReconcile] = useState(false);
    const [reconcileStatusFilter, setReconcileStatusFilter] = useState<'all' | 'thuan_an' | 'cyber_not_yard' | 'transit_yard' | 'in_transit' | 'already_in_cyber'>('thuan_an');
    const [reconcileTvbhFilter, setReconcileTvbhFilter] = useState<string>('all');
    const [reconcileModelFilter, setReconcileModelFilter] = useState<string>('all');
    const [reconcileSearch, setReconcileSearch] = useState('');
    const [selectedReconcileRowIdx, setSelectedReconcileRowIdx] = useState<number>(0);

    // 3. DỮ LIỆU ĐỐI CHIẾU VI PHẠM TỒN KHO TD4
    const [td4Items, setTd4Items] = useState<Td4ReconciliationItem[]>([]);
    const [isLoadingTd4, setIsLoadingTd4] = useState(false);
    const [td4YardFilter, setTd4YardFilter] = useState<'all' | 'thuan_an' | 'other'>('all');
    const [td4ApprovalFilter, setTd4ApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
    const [td4TvbhFilter, setTd4TvbhFilter] = useState<string>('all');
    const [td4ModelFilter, setTd4ModelFilter] = useState<string>('all');
    const [td4Search, setTd4Search] = useState('');
    const [selectedTd4RowIdx, setSelectedTd4RowIdx] = useState<number>(0);

    // 4. DỮ LIỆU CẢNH BÁO XE XUẤT HÓA ĐƠN — CHƯA TD4 NHƯNG MẤT TỒN BÃI THỰC TẾ
    const [missingYardItems, setMissingYardItems] = useState<InvoicedMissingYardItem[]>([]);
    const [isLoadingMissingYard, setIsLoadingMissingYard] = useState(false);
    const [missingYardTvbhFilter, setMissingYardTvbhFilter] = useState<string>('all');
    const [missingYardModelFilter, setMissingYardModelFilter] = useState<string>('all');
    const [missingYardSearch, setMissingYardSearch] = useState('');
    const [selectedMissingYardRowIdx, setSelectedMissingYardRowIdx] = useState<number>(0);

    // 5. MODAL XEM CHI TIẾT LỖI VÀ HƯỚNG XỬ LÝ VI PHẠM
    const [detailModalItem, setDetailModalItem] = useState<any | null>(null);
    const [detailModalType, setDetailModalType] = useState<'missing_yard' | 'td4' | 'dnx' | 'all'>('all');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const handleOpenDetailModal = (item: any, type: 'missing_yard' | 'td4' | 'dnx' | 'all') => {
        setDetailModalItem(item);
        setDetailModalType(type);
        setIsDetailModalOpen(true);
    };

    // Parser for API Data
    const parseApiResponse = useCallback((warehouses: Record<string, any>): SatelliteCarItem[] => {
        const parsedList: SatelliteCarItem[] = [];

        Object.entries(warehouses).forEach(([khoKey, info]) => {
            const data: any[][] = info.data || [];
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
            rows.forEach((r, rIdx) => {
                if (!r || r.length === 0) return;
                const vin = String(r[5] || '').trim();
                const loaiXe = String(r[4] || '').trim();
                const showroom = String(r[3] || '').trim();

                if (!vin && !loaiXe) return;

                const ngayGiao = String(r[10] || '').trim();
                const isTonKho = !ngayGiao || ngayGiao === '' || ngayGiao.toLowerCase() === 'none';
                const isThuanAn = showroom.toLowerCase().includes('thuận an') || showroom.toLowerCase().includes('thuan an');
                const pinInfo = parsePin(r[7]);

                let cleanKhoName = (info.khoName || khoKey || '').replace(/Kho /gi, '').trim();
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

                parsedList.push({
                    id: `${khoKey}-${rIdx}-${vin}`,
                    khoKey: khoKey as any,
                    khoName: `Kho ${cleanKhoName}`,
                    stt: r[0] || (rIdx + 1),
                    thangNhap: String(r[1] || ''),
                    khoXe: String(r[2] || ''),
                    showroomQuanLy: showroom,
                    loaiXe: loaiXe,
                    soKhung: vin,
                    mauSac: String(r[6] || ''),
                    mucPin: pinInfo.display,
                    mucPinPercent: pinInfo.percent,
                    benGiao: String(r[8] || ''),
                    ngayNhan: formatDate(r[9]),
                    ngayGiao: formatDate(r[10]),
                    khoaSo: formatDate(r[11]),
                    soNgayTonKho: r[12] || '',
                    note: String(r[13] || ''),
                    tinhTrang: String(r[18] || r[17] || ''),
                    isThuanAn,
                    isTonKho
                });
            });
        });

        return parsedList;
    }, []);

    // Load from cache on mount
    useEffect(() => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const obj = JSON.parse(cached);
                if (obj.warehouses) {
                    const parsed = parseApiResponse(obj.warehouses);
                    setCars(parsed);
                }
            }
        } catch (e) {
            console.error('Error loading warehouse cache', e);
        }
    }, [parseApiResponse]);

    // Fetch fresh satellite data
    const handleFetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
            const json = await res.json();
            if (json.status !== 'SUCCESS') throw new Error(json.message || 'Lỗi lấy dữ liệu');

            localStorage.setItem(CACHE_KEY, JSON.stringify(json));
            const parsed = parseApiResponse(json.warehouses || {});
            setCars(parsed);
            if (!silent) {
                showToast('Thành công', `Đã cập nhật ${parsed.length} xe từ 3 kho thành công!`, 'success');
            }
            // Tự động làm mới cả đối chiếu ĐNX, TD4 và Missing Yard
            handleFetchReconcile(parsed, true);
            handleFetchTd4(parsed, true);
            handleFetchMissingYard(parsed, true);
        } catch (err: any) {
            console.error('Fetch error:', err);
            if (!silent) {
                showToast('Lỗi cập nhật', err.message || 'Không thể kết nối đến Google Sheets', 'error');
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    // Fetch fresh Missing Yard violation data
    const handleFetchMissingYard = useCallback(async (currentCars?: SatelliteCarItem[], silent = false) => {
        if (!silent) setIsLoadingMissingYard(true);
        try {
            const carList = currentCars || cars;
            const data = await fetchInvoicedMissingYardReconciliationData(allOrders, carList);
            setMissingYardItems(data);
            if (!silent) {
                showToast('Kiểm soát hóa đơn', `Phát hiện ${data.length} xe đã xuất HĐ, chưa có TD4 nhưng bãi thực tế không có xe!`, data.length > 0 ? 'warning' : 'success');
            }
        } catch (err: any) {
            console.error('Missing yard fetch error:', err);
            if (!silent) {
                showToast('Lỗi đối soát', err.message || 'Không thể tải dữ liệu kiểm soát hóa đơn bãi ngoài', 'error');
            }
        } finally {
            if (!silent) setIsLoadingMissingYard(false);
        }
    }, [allOrders, cars, showToast]);

    // Fetch fresh reconciliation data (ĐNX)
    const handleFetchReconcile = useCallback(async (currentCars?: SatelliteCarItem[], silent = false) => {
        if (!silent) setIsLoadingReconcile(true);
        try {
            const carList = currentCars || cars;
            const data = await fetchDnxReconciliationData(allOrders, carList);
            const unreceived = data.filter(d => !d.isTonKhoCyberK83);
            setReconcileItems(unreceived);
            if (!silent) {
                const alertCount = unreceived.filter(d => d.reconcileStatus === 'AT_THUAN_AN').length;
                showToast('Đối chiếu hoàn tất', `Tìm thấy ${unreceived.length} xe ĐNX chưa nhập K83 (${alertCount} xe đã về bãi Thuận An).`, 'success');
            }
        } catch (err: any) {
            console.error('Reconcile fetch error:', err);
            if (!silent) {
                showToast('Lỗi đối chiếu', err.message || 'Không thể tải dữ liệu đối chiếu ĐNX', 'error');
            }
        } finally {
            if (!silent) setIsLoadingReconcile(false);
        }
    }, [allOrders, cars, showToast]);

    // Fetch fresh TD4 violation data
    const handleFetchTd4 = useCallback(async (currentCars?: SatelliteCarItem[], silent = false) => {
        if (!silent) setIsLoadingTd4(true);
        try {
            const carList = currentCars || cars;
            const data = await fetchTd4ReconciliationData(allOrders, carList);
            setTd4Items(data);
            if (!silent) {
                showToast('Cảnh báo TD4', `Phát hiện ${data.length} xe có phiếu TD4 nhưng vẫn còn tồn bãi thực tế!`, data.length > 0 ? 'warning' : 'success');
            }
        } catch (err: any) {
            console.error('TD4 fetch error:', err);
            if (!silent) {
                showToast('Lỗi đối chiếu TD4', err.message || 'Không thể tải dữ liệu xe tồn TD4', 'error');
            }
        } finally {
            if (!silent) setIsLoadingTd4(false);
        }
    }, [allOrders, cars, showToast]);

    // Auto fetch on first open
    useEffect(() => {
        if (isActive) {
            if (cars.length === 0) {
                handleFetchData(true);
            }
            if (reconcileItems.length === 0) {
                handleFetchReconcile(undefined, true);
            }
            if (td4Items.length === 0) {
                handleFetchTd4(undefined, true);
            }
            if (missingYardItems.length === 0) {
                handleFetchMissingYard(undefined, true);
            }
        }
    }, [isActive, cars.length, reconcileItems.length, td4Items.length, missingYardItems.length, handleFetchReconcile, handleFetchTd4, handleFetchMissingYard]);

    // Copy VIN
    const copyVin = (vin: string) => {
        if (!vin) return;
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        showToast('Đã copy', `Đã copy số VIN: ${vin}`, 'info', 1500);
        setTimeout(() => setCopiedVin(null), 2000);
    };

    // Copy Danh Sách Gửi Zalo (ĐNX - Cả xe về bãi chưa nhập Cyber và xe Sổ Cyber có K83 nhưng chưa có bãi)
    const handleCopyZaloDnxList = () => {
        const alertThuanAnCars = reconcileItems.filter(c => c.reconcileStatus === 'AT_THUAN_AN');
        const alertCyberNotYardCars = reconcileItems.filter(c => c.reconcileStatus === 'CYBER_K83_NOT_IN_YARD');

        if (alertThuanAnCars.length === 0 && alertCyberNotYardCars.length === 0) {
            showToast('Thông báo', 'Hiện không có trường hợp lệch tồn ĐNX nào cần cảnh báo', 'info');
            return;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `📋 BÁO CÁO ĐỐI SOÁT LUÂN CHUYỂN ĐNX: SỔ CYBER vs BÃI THỰC TẾ\n`;
        text += `(Cập nhật lúc: ${timeStr} - Về bãi chưa nhập Cyber: ${alertThuanAnCars.length} | Sổ Cyber có K83 nhưng chưa có bãi: ${alertCyberNotYardCars.length})\n`;
        text += `----------------------------------------\n`;
        
        if (alertThuanAnCars.length > 0) {
            text += `🚨 1. XE ĐÃ VỀ BÃI THỰC TẾ THUẬN AN — CHƯA LÀM PNK CYBER (${alertThuanAnCars.length} xe):\n`;
            text += `👉 Đề nghị TVBH khẩn trương liên hệ Admin/Kế toán làm thủ tục PNK nhập kho Cyber để kịp tiến độ giao xe:\n`;
            alertThuanAnCars.forEach((c, i) => {
                const pin = c.satelliteYard?.mucPin || '-';
                const ngayNhan = c.satelliteYard?.ngayNhan || '';
                text += `   ${i + 1}. VIN: ${c.vin} | ĐNX: ${c.soCtDnx || 'Chưa rõ'}\n`;
                text += `      - TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `      - Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Pin: ${pin} | Về bãi: ${ngayNhan}\n`;
            });
            text += `----------------------------------------\n`;
        }

        if (alertCyberNotYardCars.length > 0) {
            text += `⚠️ 2. SỔ CYBER ĐÃ NHẬP K83 — NHƯNG BÃI THỰC TẾ CHƯA CÓ XE (${alertCyberNotYardCars.length} xe):\n`;
            text += `👉 Đề nghị Kế toán kho và Thủ kho đối chiếu khẩn cấp để xác định vị trí thực tế của xe:\n`;
            alertCyberNotYardCars.forEach((c, i) => {
                text += `   ${i + 1}. VIN: ${c.vin} | ĐNX: ${c.soCtDnx || 'Chưa rõ'}\n`;
                text += `      - TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `      - Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''}\n`;
                text += `      - Tình trạng: ${c.reconcileNote}\n`;
            });
            text += `----------------------------------------\n`;
        }

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách đối soát ĐNX (${alertThuanAnCars.length + alertCyberNotYardCars.length} xe)!`, 'success', 2500);
    };

    // Copy Danh Sách Gửi Zalo (Cảnh Báo Tồn TD4)
    const handleCopyZaloTd4List = () => {
        if (td4Items.length === 0) {
            showToast('Thông báo', 'Tuyệt vời! Không có xe nào vi phạm tồn kho TD4.', 'success');
            return;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 CẢNH BÁO VI PHẠM TỒN KHO TD4 (XE CÓ PHIẾU GIAO XE TD4 NHƯNG VẪN CÒN TỒN BÃI)\n`;
        text += `(Cập nhật lúc: ${timeStr} - Tổng: ${td4Items.length} xe vi phạm)\n`;
        text += `QUY TẮC: "Phiếu TD4 có nghĩa là đã giao xe, KHÔNG ĐƯỢC PHÉP TỒN Ở BẤT KỲ ĐÂU!"\n`;
        text += `----------------------------------------\n`;
        
        td4Items.forEach((c, i) => {
            const sat = c.satelliteYard;
            text += `${i + 1}. VIN: ${c.vin}\n`;
            text += `   - TD4: ${c.soCtTd4} (Ngày lập: ${c.ngayCtTd4 || 'N/A'})\n`;
            text += `   - TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}${c.orderNumber ? ` | HĐ: ${c.orderNumber}` : ''}\n`;
            text += `   - Vị trí tồn: ${sat.khoName} | Pin: ${sat.pin} | Ngày nhận bãi: ${sat.ngayNhan || 'N/A'}\n`;
        });
        
        text += `----------------------------------------\n`;
        text += `👉 Đề nghị các TVBH và bộ phận Kho/Giao xe kiểm tra khẩn cấp: Nếu xe đã giao thực tế thì cập nhật ngày xuất bãi ngay, nếu xe chưa giao thì báo cáo lý do xe có TD4 vẫn còn tồn bãi!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách ${td4Items.length} xe vi phạm tồn TD4!`, 'warning', 2500);
    };



    // =========================================================================
    // DỮ LIỆU TỔNG HỢP TOÀN BỘ CẢNH BÁO LỆCH KHO (ĐẦU VÀO ĐNX & ĐẦU RA TD4)
    // =========================================================================
    const allCombinedAlerts = useMemo(() => {
        const list: {
            id: string;
            type: 'DNX' | 'TD4';
            typeLabel: string;
            vin: string;
            carModel: string;
            color: string;
            tvbh: string;
            customerName: string;
            orderNumber: string;
            soChungTu: string;
            ngayChungTu: string;
            khoCyber: string;
            khoThucTe: string;
            mucPin: string;
            ngayNhanBai: string;
            alertTitle: string;
            actionRequired: string;
            severity: 'critical' | 'warning';
        }[] = [];

        // Tập hợp các số khung đã có TD4 để loại bỏ hoàn toàn khỏi đối chiếu ĐNX
        // Quy tắc: "Nếu xe đã có TD4 thì bỏ qua phiếu ĐNX"
        const td4VinSet = new Set<string>();
        td4Items.forEach(t => {
            const v = (t.vin || '').trim().toUpperCase();
            if (v) {
                td4VinSet.add(v);
                if (v.length >= 6) td4VinSet.add(v.slice(-6));
            }
        });

        // 1. Chiều Nhập: Các xe ĐNX (Đã tự động bỏ qua nếu xe đã có TD4)
        reconcileItems.forEach(item => {
            const v = (item.vin || '').trim().toUpperCase();
            if (td4VinSet.has(v) || (v.length >= 6 && td4VinSet.has(v.slice(-6)))) {
                return; // Bỏ qua phiếu ĐNX nếu xe đã có phiếu TD4
            }
            if (item.reconcileStatus === 'ALREADY_IN_CYBER') {
                return; // Khớp hoàn hảo cả Cyber K83 và bãi thực tế, không đưa vào danh sách cảnh báo sai lệch
            }

            const isAtThuanAn = item.reconcileStatus === 'AT_THUAN_AN';
            const isCyberNotYard = item.reconcileStatus === 'CYBER_K83_NOT_IN_YARD';

            // Chỉ đưa các trường hợp sai lệch/vi phạm thực tế vào danh sách cảnh báo tổng hợp
            if (!isAtThuanAn && !isCyberNotYard) {
                return;
            }

            list.push({
                id: `dnx-${item.vin}`,
                type: 'DNX',
                typeLabel: isAtThuanAn 
                    ? 'ĐNX Về Bãi Chưa Nhập K83' 
                    : isCyberNotYard 
                        ? 'Sổ K83 Chưa Có Bãi' 
                        : 'ĐNX Đang Luân Chuyển',
                vin: item.vin,
                carModel: item.carModel,
                color: item.color,
                tvbh: item.tvbh || 'Chưa rõ',
                customerName: item.customerName || 'Chưa rõ',
                orderNumber: item.orderNumber || '',
                soChungTu: item.soCtDnx || 'Chưa rõ',
                ngayChungTu: item.ngayCtDnx || '',
                khoCyber: item.isTonKhoCyberK83 ? 'Đã có tồn K83 trên Cyber' : `Chưa có tồn K83 (${item.tenKhoCyber || item.maKhoCyber || 'Đang vận tải'})`,
                khoThucTe: item.satelliteYard ? `${item.satelliteYard.khoName}${item.satelliteYard.isTonKho ? '' : ' (Đã xuất)'}` : 'Chưa ghi nhận bãi',
                mucPin: item.satelliteYard?.mucPin || '-',
                ngayNhanBai: item.satelliteYard?.ngayNhan || '',
                alertTitle: isAtThuanAn 
                    ? 'XE ĐÃ VỀ BÃI THUẬN AN — CHƯA LÀM PNK CYBER' 
                    : isCyberNotYard 
                        ? 'SỔ CYBER ĐÃ NHẬP K83 — NHƯNG BÃI THỰC TẾ CHƯA CÓ XE' 
                        : (item.satelliteYard ? 'Tại bãi trung chuyển QL13/Q12' : 'Đang vận chuyển'),
                actionRequired: isAtThuanAn 
                    ? 'TVBH báo Admin/Kế toán làm phiếu PNK nhập kho Cyber để kịp tiến độ giao xe' 
                    : isCyberNotYard 
                        ? 'Khẩn trương đối chiếu Kế toán kho và Thủ kho bãi nhận để xác định xe thực tế đang ở vị trí nào' 
                        : 'Theo dõi điều phối xe về Showroom Thuận An',
                severity: isAtThuanAn || isCyberNotYard ? 'critical' : 'warning'
            });
        });

        // 2. Chiều Xuất: Các xe đã có phiếu TD4 và ĐÃ ĐƯỢC DUYỆT (isViolation !== false) nhưng bãi thực tế vẫn báo tồn kho
        td4Items.filter(item => item.isViolation !== false).forEach(item => {
            list.push({
                id: `td4-${item.vin}`,
                type: 'TD4',
                typeLabel: 'TD4 Vi Phạm Tồn Bãi',
                vin: item.vin,
                carModel: item.carModel,
                color: item.color,
                tvbh: item.tvbh || 'Chưa rõ',
                customerName: item.customerName || 'Chưa rõ',
                orderNumber: item.orderNumber || '',
                soChungTu: item.soCtTd4 || 'Chưa rõ',
                ngayChungTu: item.ngayCtTd4 || '',
                khoCyber: `Đã xuất TD4 (${item.tenKhoCyber || item.maKhoCyber || 'Cyber'})`,
                khoThucTe: item.satelliteYard.khoName,
                mucPin: item.satelliteYard.pin || '-',
                ngayNhanBai: item.satelliteYard.ngayNhan || '',
                alertTitle: 'VI PHẠM QUY ĐỊNH: ĐÃ CÓ PHIẾU TD4 NHƯNG BÃI VẪN BÁO TỒN KHO',
                actionRequired: 'Khẩn trương kiểm tra thực tế: Nếu xe đã giao thì cập nhật ngày xuất bãi ngay, nếu chưa giao thì báo cáo lý do!',
                severity: 'critical'
            });
        });

        // 3. Chiều Xuất Hóa Đơn: Đã xuất HĐ nhưng chưa có TD4 mà mất tồn bãi thực tế (vi phạm)
        missingYardItems.filter(item => item.isViolation).forEach(item => {
            const isDnx = item.satelliteStatus === 'IN_TRANSIT_DNX';
            list.push({
                id: `missing-${item.vin}`,
                type: 'MISSING_YARD' as any,
                typeLabel: isDnx ? 'ĐNX Đang Luân Chuyển' : 'Xuất Bãi Trái Quy Trình',
                vin: item.vin,
                carModel: item.carModel,
                color: item.color,
                tvbh: item.tvbh || 'Chưa rõ',
                customerName: item.customerName || 'Chưa rõ',
                orderNumber: item.orderNumber || '',
                soChungTu: isDnx ? (item.soCtDnx || item.maHdCyber || 'ĐNX') : (item.maHdCyber || 'HĐ'),
                ngayChungTu: isDnx ? (item.ngayCtDnx || item.ngayXuatHoaDon || '') : (item.ngayXuatHoaDon || ''),
                khoCyber: `Kho Cyber: ${item.tenKhoCyber || item.maKhoCyber}`,
                khoThucTe: item.khoBaiThucTe ? `${item.khoBaiThucTe}${item.ngayXuatBaiThucTe ? ` (Rời bãi: ${item.ngayXuatBaiThucTe})` : ''}` : 'Không có trong 3 bãi',
                mucPin: '-',
                ngayNhanBai: item.ngayXuatBaiThucTe || '',
                alertTitle: isDnx 
                    ? `ĐANG LUÂN CHUYỂN THEO ĐNX (${item.soCtDnx || 'ĐNX'}) — CHỜ KHO NHẬN NHẬP KHO` 
                    : (item.satelliteStatus === 'ALREADY_DISPATCHED_WITHOUT_TD4' 
                        ? 'XUẤT BÃI KHÔNG CÓ LỆNH — CHƯA CÓ TD4 & KHÔNG CÓ ĐNX' 
                        : 'SỔ CYBER CÓ KHO NHƯNG KHÔNG TỒN TẠI TRONG 3 BÃI NGOÀI'),
                actionRequired: isDnx 
                    ? 'Theo dõi xe về bãi nhận và hoàn tất nhập kho K83 trên Cyber khi xe đến' 
                    : 'Khẩn trương kiểm tra vị trí xe thực tế! Nguy cơ giao xe không lệnh hoặc sai lệch dữ liệu kho!',
                severity: isDnx ? 'warning' : 'critical'
            });
        });

        return list;
    }, [reconcileItems, td4Items, missingYardItems]);

    // Filter cho Bảng Tổng Hợp
    const filteredAllAlerts = useMemo(() => {
        return allCombinedAlerts.filter(item => {
            if (allAlertFilter === 'dnx' && item.type !== 'DNX') return false;
            if (allAlertFilter === 'td4' && item.type !== 'TD4') return false;
            if (allAlertFilter === 'missing_yard' && (item.type as any) !== 'MISSING_YARD') return false;

            if (allAlertSearch.trim()) {
                const q = allAlertSearch.toLowerCase().trim();
                const matchVin = item.vin.toLowerCase().includes(q);
                const matchCt = item.soChungTu.toLowerCase().includes(q);
                const matchTvbh = item.tvbh.toLowerCase().includes(q);
                const matchKh = item.customerName.toLowerCase().includes(q);
                const matchHd = item.orderNumber.toLowerCase().includes(q);
                const matchModel = item.carModel.toLowerCase().includes(q);
                const matchKho = item.khoThucTe.toLowerCase().includes(q);
                if (!matchVin && !matchCt && !matchTvbh && !matchKh && !matchHd && !matchModel && !matchKho) return false;
            }
            return true;
        });
    }, [allCombinedAlerts, allAlertFilter, allAlertSearch]);

    // Làm mới toàn bộ đối chiếu (kéo dữ liệu mới nhất từ Google Sheets 3 bãi và CSDL CyberSoft)
    const handleFetchAllReconcile = async () => {
        setIsLoadingReconcile(true);
        setIsLoadingTd4(true);
        setIsLoadingMissingYard(true);
        try {
            // 1. Tải mới nhất trực tiếp từ Google Sheets của 3 bãi xe
            let freshCars = cars;
            try {
                const res = await fetch(API_URL);
                if (res.ok) {
                    const json = await res.json();
                    if (json.status === 'SUCCESS' && json.warehouses) {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(json));
                        freshCars = parseApiResponse(json.warehouses || {});
                        setCars(freshCars);
                    }
                }
            } catch (sheetErr) {
                console.warn('Lỗi tải Google Sheets, sử dụng cache/state hiện tại:', sheetErr);
            }

            // 2. Chạy đối soát song song cả 3 phân hệ với dữ liệu bãi mới nhất và CSDL Cyber/Supabase
            await Promise.all([
                handleFetchReconcile(freshCars, true),
                handleFetchTd4(freshCars, true),
                handleFetchMissingYard(freshCars, true)
            ]);
            showToast('Làm mới hoàn tất', 'Đã tải dữ liệu mới nhất từ Google Sheets và CSDL đối chiếu CyberSoft!', 'success');
        } catch (err: any) {
            console.error('Refresh all error:', err);
            showToast('Lỗi làm mới', err.message || 'Không thể làm mới dữ liệu đối chiếu', 'error');
        } finally {
            setIsLoadingReconcile(false);
            setIsLoadingTd4(false);
            setIsLoadingMissingYard(false);
        }
    };

    // Copy Báo Cáo Tổng Hợp Gửi Zalo (Cả ĐNX & TD4)
    const handleCopyZaloAllReconcile = () => {
        const dnxAlerts = reconcileItems.filter(c => c.reconcileStatus === 'AT_THUAN_AN');
        const cyberNotYardAlerts = reconcileItems.filter(c => c.reconcileStatus === 'CYBER_K83_NOT_IN_YARD');
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 BÁO CÁO TỔNG HỢP SAI LỆCH KHO: CYBERSOFT vs BÃI XE THỰC TẾ\n`;
        text += `(Thời điểm kiểm tra: ${timeStr} - Tổng cộng: ${dnxAlerts.length + cyberNotYardAlerts.length + td4Items.length + missingYardItems.length} trường hợp lệch)\n`;
        text += `========================================\n\n`;

        // 1. Chiều Nhập (ĐNX Chưa Nhập Cyber)
        text += `📥 1. ĐẦU VÀO (ĐNX ĐÃ VỀ BÃI THUẬN AN — CHƯA NHẬP K83 CYBER): ${dnxAlerts.length} xe\n`;
        text += `👉 Đề nghị TVBH khẩn trương báo Admin/Kế toán làm PNK để kịp tiến độ giao xe:\n`;
        text += `----------------------------------------\n`;
        if (dnxAlerts.length === 0) {
            text += `   (Không có xe nào tồn đọng)\n`;
        } else {
            dnxAlerts.forEach((c, i) => {
                const pin = c.satelliteYard?.mucPin || '-';
                const ngayNhan = c.satelliteYard?.ngayNhan || '';
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • ĐNX: ${c.soCtDnx || 'Chưa rõ'} (Ngày: ${c.ngayCtDnx || 'N/A'})\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `    • Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Pin: ${pin} | Về bãi: ${ngayNhan}\n`;
            });
        }
        text += `\n`;

        // 1B. Lệch Sổ K83 vs Bãi (Đã làm PNK K83 nhưng bãi chưa có xe)
        if (cyberNotYardAlerts.length > 0) {
            text += `⚠️ 1B. LỆCH SỔ SÁCH (SỔ CYBER ĐÃ NHẬP K83 — BÃI THỰC TẾ CHƯA CÓ XE): ${cyberNotYardAlerts.length} xe\n`;
            text += `👉 Đề nghị Kế toán kho và Thủ kho đối chiếu kiểm tra vị trí xe thực tế:\n`;
            text += `----------------------------------------\n`;
            cyberNotYardAlerts.forEach((c, i) => {
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • ĐNX: ${c.soCtDnx || 'Chưa rõ'} | TVBH: ${c.tvbh || 'Chưa rõ'}\n`;
                text += `    • Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''}\n`;
                text += `    • Tình trạng: ${c.reconcileNote}\n`;
            });
            text += `\n`;
        }

        // 2. Chiều Xuất (TD4 Vi Phạm Tồn)
        text += `🚨 2. ĐẦU RA (ĐÃ LẬP PHIẾU TD4 — BÃI THỰC TẾ VẪN BÁO TỒN KHO): ${td4Items.length} xe\n`;
        text += `👉 QUY TẮC: Phiếu TD4 là đã giao xe, KHÔNG ĐƯỢC PHÉP TỒN Ở BẤT KỲ ĐÂU!\n`;
        text += `----------------------------------------\n`;
        if (td4Items.length === 0) {
            text += `   (Tuyệt vời! Không có xe nào vi phạm tồn TD4)\n`;
        } else {
            td4Items.forEach((c, i) => {
                const sat = c.satelliteYard;
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • TD4: ${c.soCtTd4} (Ngày lập: ${c.ngayCtTd4 || 'N/A'})\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}${c.orderNumber ? ` | HĐ: ${c.orderNumber}` : ''}\n`;
                text += `    • Bãi tồn: ${sat.khoName} | Pin: ${sat.pin} | Nhận bãi: ${sat.ngayNhan || 'N/A'}\n`;
            });
        }
        text += `\n`;

        // 3. Chiều Xuất Hóa Đơn (Đã Xuất HĐ nhưng chưa có TD4 mà mất tồn bãi)
        text += `⚠️ 3. XUẤT HÓA ĐƠN CHƯA TD4 — MẤT TỒN BÃI THỰC TẾ: ${missingYardItems.length} xe\n`;
        text += `👉 CẢNH BÁO NGUY CƠ: Xe chưa có phiếu TD4 không được phép rời bãi!\n`;
        text += `----------------------------------------\n`;
        if (missingYardItems.length === 0) {
            text += `   (Tuyệt vời! Không có xe vi phạm)\n`;
        } else {
            missingYardItems.forEach((c, i) => {
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `    • Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Ngày xuất HĐ: ${c.ngayXuatHoaDon ? c.ngayXuatHoaDon.slice(0, 10) : 'N/A'}\n`;
                text += `    • Tình trạng: ${c.satelliteStatusLabel}\n`;
            });
        }
        text += `\n========================================\n`;
        text += `👉 Đề nghị Quản lý bãi, Kế toán và các TVBH phối hợp xử lý dứt điểm các trường hợp lệch trên!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép Báo cáo tổng hợp đối soát (${dnxAlerts.length + td4Items.length + missingYardItems.length} xe)!`, 'success', 2500);
    };

    // Copy Zalo Danh Sách Xe Xuất HĐ Mất Tồn Bãi (Phân loại rõ vi phạm và xe đi theo ĐNX)
    const handleCopyZaloMissingYardList = () => {
        if (missingYardItems.length === 0) {
            showToast('Thông báo', 'Tuyệt vời! Không có xe nào đã xuất HĐ mà mất tồn bãi.', 'success');
            return;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 BÁO CÁO CẢNH BÁO XE XUẤT HÓA ĐƠN — MẤT TỒN BÃI THỰC TẾ\n`;
        text += `(Cập nhật lúc: ${timeStr} - Tổng: ${missingYardItems.length} xe vi phạm)\n`;
        text += `QUY TẮC: "Chưa có phiếu TD4 và không có ĐNX KHÔNG ĐƯỢC PHÉP rời khỏi bãi xe showroom!"\n`;
        text += `----------------------------------------\n`;

        missingYardItems.forEach((c, i) => {
            text += `${i + 1}. VIN: ${c.vin}\n`;
            text += `   - TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
            text += `   - Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Ngày HĐ: ${c.ngayXuatHoaDon ? c.ngayXuatHoaDon.slice(0, 10) : 'N/A'}\n`;
            text += `   - Trạng thái: ${c.satelliteStatusLabel}\n`;
            text += `   - Kho Cyber: ${c.tenKhoCyber || c.maKhoCyber}\n`;
        });
        text += `----------------------------------------\n`;
        text += `👉 Đề nghị TVBH và Quản lý Kho bãi kiểm tra khẩn cấp vị trí thực tế của các xe trên!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách đối soát (${missingYardItems.length} xe)!`, 'info', 2500);
    };



    // Models for dropdown (3 Kho)
    const uniqueModels = useMemo(() => {
        const set = new Set<string>();
        cars.forEach(c => {
            if (c.loaiXe) set.add(c.loaiXe.trim());
        });
        return Array.from(set).sort();
    }, [cars]);

    // TVBHs for dropdown (ĐNX)
    const uniqueReconcileTvbhs = useMemo(() => {
        const set = new Set<string>();
        reconcileItems.forEach(c => {
            if (c.tvbh) set.add(c.tvbh.trim());
        });
        return Array.from(set).sort();
    }, [reconcileItems]);

    // Models for dropdown (ĐNX)
    const uniqueReconcileModels = useMemo(() => {
        const set = new Set<string>();
        reconcileItems.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [reconcileItems]);

    // TVBHs for dropdown (TD4)
    const uniqueTdTvbhs = useMemo(() => {
        const set = new Set<string>();
        td4Items.forEach(c => {
            if (c.tvbh) set.add(c.tvbh.trim());
        });
        return Array.from(set).sort();
    }, [td4Items]);

    // Models for dropdown (TD4)
    const uniqueTdModels = useMemo(() => {
        const set = new Set<string>();
        td4Items.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [td4Items]);

    // Filtered cars (3 Kho)
    const filteredCars = useMemo(() => {
        return cars.filter(c => {
            if (khoFilter !== 'all' && c.khoKey !== khoFilter) return false;
            if (modelFilter !== 'all' && c.loaiXe.trim() !== modelFilter) return false;
            
            if (showroomFilter === 'thuan_an' && !c.isThuanAn) return false;
            if (showroomFilter === 'other' && c.isThuanAn) return false;

            if (statusFilter === 'ton' && !c.isTonKho) return false;
            if (statusFilter === 'giao' && c.isTonKho) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchVin = c.soKhung.toLowerCase().includes(q);
                const matchModel = c.loaiXe.toLowerCase().includes(q);
                const matchColor = c.mauSac.toLowerCase().includes(q);
                const matchSr = c.showroomQuanLy.toLowerCase().includes(q);
                const matchNote = c.note.toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchColor && !matchSr && !matchNote) return false;
            }
            return true;
        });
    }, [cars, khoFilter, modelFilter, showroomFilter, statusFilter, searchQuery]);

    // Phân trang tăng dần (Progressive Chunk Rendering) chống lag khi danh sách có hàng ngàn xe (4.291 xe)
    const [displayLimit, setDisplayLimit] = useState(100);

    useEffect(() => {
        setDisplayLimit(100);
    }, [khoFilter, modelFilter, showroomFilter, statusFilter, debouncedSearchQuery]);

    const handleTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        if (scrollHeight - scrollTop - clientHeight < 300) {
            setDisplayLimit(prev => Math.min(prev + 100, filteredCars.length));
        }
    }, [filteredCars.length]);

    const visibleCars = useMemo(() => {
        return filteredCars.slice(0, displayLimit);
    }, [filteredCars, displayLimit]);

    // Filtered cars (ĐNX)
    const filteredReconcileItems = useMemo(() => {
        return reconcileItems.filter(c => {
            if (reconcileStatusFilter === 'thuan_an' && c.reconcileStatus !== 'AT_THUAN_AN') return false;
            if (reconcileStatusFilter === 'cyber_not_yard' && c.reconcileStatus !== 'CYBER_K83_NOT_IN_YARD') return false;
            if (reconcileStatusFilter === 'transit_yard' && c.reconcileStatus !== 'AT_TRANSIT_YARD') return false;
            if (reconcileStatusFilter === 'in_transit' && c.reconcileStatus !== 'IN_TRANSIT') return false;
            if (reconcileStatusFilter === 'already_in_cyber' && c.reconcileStatus !== 'ALREADY_IN_CYBER') return false;

            if (reconcileTvbhFilter !== 'all' && c.tvbh.trim() !== reconcileTvbhFilter) return false;
            if (reconcileModelFilter !== 'all' && c.carModel.trim() !== reconcileModelFilter) return false;

            if (reconcileSearch.trim()) {
                const q = reconcileSearch.toLowerCase().trim();
                const matchVin = c.vin.toLowerCase().includes(q);
                const matchDnx = c.soCtDnx.toLowerCase().includes(q);
                const matchTvbh = c.tvbh.toLowerCase().includes(q);
                const matchKh = c.customerName.toLowerCase().includes(q);
                const matchHd = (c.orderNumber || '').toLowerCase().includes(q);
                const matchModel = c.carModel.toLowerCase().includes(q);
                if (!matchVin && !matchDnx && !matchTvbh && !matchKh && !matchHd && !matchModel) return false;
            }
            return true;
        });
    }, [reconcileItems, reconcileStatusFilter, reconcileTvbhFilter, reconcileModelFilter, reconcileSearch]);

    // Filtered cars (TD4)
    const filteredTd4Items = useMemo(() => {
        return td4Items.filter(c => {
            if (td4ApprovalFilter === 'approved' && c.isViolation === false) return false;
            if (td4ApprovalFilter === 'pending' && c.isViolation !== false) return false;

            if (td4YardFilter === 'thuan_an' && !c.isTonThuanAn) return false;
            if (td4YardFilter === 'other' && c.isTonThuanAn) return false;

            if (td4TvbhFilter !== 'all' && c.tvbh.trim() !== td4TvbhFilter) return false;
            if (td4ModelFilter !== 'all' && c.carModel.trim() !== td4ModelFilter) return false;

            if (td4Search.trim()) {
                const q = td4Search.toLowerCase().trim();
                const matchVin = c.vin.toLowerCase().includes(q);
                const matchTd4 = c.soCtTd4.toLowerCase().includes(q);
                const matchTvbh = c.tvbh.toLowerCase().includes(q);
                const matchKh = c.customerName.toLowerCase().includes(q);
                const matchHd = (c.orderNumber || '').toLowerCase().includes(q);
                const matchModel = c.carModel.toLowerCase().includes(q);
                if (!matchVin && !matchTd4 && !matchTvbh && !matchKh && !matchHd && !matchModel) return false;
            }
            return true;
        });
    }, [td4Items, td4ApprovalFilter, td4YardFilter, td4TvbhFilter, td4ModelFilter, td4Search]);

    // Counts for status bar (3 Kho)
    const countThuanAn = useMemo(() => filteredCars.filter(c => c.isThuanAn).length, [filteredCars]);
    const countTonBai = useMemo(() => filteredCars.filter(c => c.isTonKho).length, [filteredCars]);
    const countDaGiao = useMemo(() => filteredCars.filter(c => !c.isTonKho).length, [filteredCars]);

    // Counts for Reconciliation Stats (ĐNX)
    const countAlertThuanAn = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'AT_THUAN_AN').length, [reconcileItems]);
    const countCyberNotYard = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'CYBER_K83_NOT_IN_YARD').length, [reconcileItems]);
    const countTransitYard = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'AT_TRANSIT_YARD').length, [reconcileItems]);
    const countInTransit = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'IN_TRANSIT').length, [reconcileItems]);
    const countAlreadyInCyber = useMemo(() => reconcileItems.filter(c => c.reconcileStatus === 'ALREADY_IN_CYBER').length, [reconcileItems]);

    // Counts for TD4 Stats
    const countTd4Approved = useMemo(() => td4Items.filter(c => c.isViolation !== false).length, [td4Items]);
    const countTd4Pending = useMemo(() => td4Items.filter(c => c.isViolation === false).length, [td4Items]);
    const countTd4ThuanAn = useMemo(() => td4Items.filter(c => c.isTonThuanAn).length, [td4Items]);
    const countTd4Other = useMemo(() => td4Items.filter(c => !c.isTonThuanAn).length, [td4Items]);

    // TVBHs for dropdown (Missing Yard)
    const uniqueMissingYardTvbhs = useMemo(() => {
        const set = new Set<string>();
        missingYardItems.forEach(c => {
            if (c.tvbh) set.add(c.tvbh.trim());
        });
        return Array.from(set).sort();
    }, [missingYardItems]);

    // Models for dropdown (Missing Yard)
    const uniqueMissingYardModels = useMemo(() => {
        const set = new Set<string>();
        missingYardItems.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [missingYardItems]);

    // Filtered cars (Missing Yard)
    const filteredMissingYardItems = useMemo(() => {
        return missingYardItems.filter(c => {
            if (missingYardTvbhFilter !== 'all' && c.tvbh.trim() !== missingYardTvbhFilter) return false;
            if (missingYardModelFilter !== 'all' && c.carModel.trim() !== missingYardModelFilter) return false;

            if (missingYardSearch.trim()) {
                const q = missingYardSearch.toLowerCase().trim();
                const matchVin = c.vin.toLowerCase().includes(q);
                const matchTvbh = c.tvbh.toLowerCase().includes(q);
                const matchKh = c.customerName.toLowerCase().includes(q);
                const matchHd = (c.orderNumber || '').toLowerCase().includes(q) || (c.maHdCyber || '').toLowerCase().includes(q);
                const matchModel = c.carModel.toLowerCase().includes(q);
                const matchKho = c.khoBaiThucTe ? c.khoBaiThucTe.toLowerCase().includes(q) : false;
                const matchDnx = (c.soCtDnx || '').toLowerCase().includes(q);
                if (!matchVin && !matchTvbh && !matchKh && !matchHd && !matchModel && !matchKho && !matchDnx) return false;
            }
            return true;
        });
    }, [missingYardItems, missingYardTvbhFilter, missingYardModelFilter, missingYardSearch]);

    // Báo số lượng cho parent
    useEffect(() => {
        if (onCountsChange) {
            onCountsChange({
                carsCount: cars.length,
                td4Count: countTd4Approved,
                dnxCount: countAlertThuanAn,
                missingYardCount: missingYardItems.filter(c => c.isViolation).length,
                allAlertCount: allCombinedAlerts.length
            });
        }
    }, [cars.length, countTd4Approved, countAlertThuanAn, missingYardItems, allCombinedAlerts.length, onCountsChange]);

    return (
        <div className="flex-1 flex flex-col min-h-0 w-full bg-[#ECE9D8] rounded border border-[#CCCCCC] shadow-sm overflow-hidden font-sans select-none h-full">

            {/* ========================================================================= */}
            {/* CHẾ ĐỘ 1: TỒN KHO 3 KHO VỆ TINH */}
            {/* ========================================================================= */}
            {viewMode === 'inventory' && (
                <>
                    {/* CYBERSOFT TOOLBAR (Ribbon) */}
                    <div className="bg-[#F0F0F0] border-b border-[#CCCCCC] px-1.5 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-800 shrink-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button 
                                type="button" 
                                onClick={() => handleFetchData(false)}
                                disabled={isLoading}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer disabled:opacity-50"
                                title="Làm mới dữ liệu từ Google Sheets"
                            >
                                <i className={`fas fa-rotate text-blue-600 text-[10px] ${isLoading ? 'animate-spin' : ''}`}></i>
                                <span>Làm mới</span>
                            </button>

                            <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5 hidden sm:block"></div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Kho:</span>
                                <select
                                    value={khoFilter}
                                    onChange={e => setKhoFilter(e.target.value as any)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[135px]"
                                >
                                    <option value="all">Tất cả (3 kho - {cars.length})</option>
                                    <option value="q12">Kho Quận 12 ({cars.filter(c => c.khoKey === 'q12').length})</option>
                                    <option value="ql13">Kho QL 13 ({cars.filter(c => c.khoKey === 'ql13').length})</option>
                                    <option value="tada">Kho Thuận An ({cars.filter(c => c.khoKey === 'tada').length})</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                <select
                                    value={modelFilter}
                                    onChange={e => setModelFilter(e.target.value)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[110px]"
                                >
                                    <option value="all">Tất cả ({cars.length})</option>
                                    {uniqueModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">SR Quản lý:</span>
                                <select
                                    value={showroomFilter}
                                    onChange={e => setShowroomFilter(e.target.value)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[155px]"
                                >
                                    <option value="thuan_an">🟢 Thuận An ({cars.filter(c => c.isThuanAn).length} xe)</option>
                                    <option value="all">Tất cả các showroom ({cars.length})</option>
                                    <option value="other">Showroom khác</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Tình trạng:</span>
                                <select
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value as any)}
                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[125px]"
                                >
                                    <option value="all">Tất cả</option>
                                    <option value="ton">⚡ Còn tồn bãi ({cars.filter(c => c.isTonKho).length})</option>
                                    <option value="giao">Đã xuất / Giao ({cars.filter(c => !c.isTonKho).length})</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <span className="text-[10px] sm:text-[11px] text-slate-600 font-medium">Tìm:</span>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="VIN, màu, SR, note..."
                                    className="h-5 w-36 sm:w-48 px-1.5 pr-4 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-900 outline-none focus:border-blue-600 shadow-inner"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[9px]"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* THẺ TỔNG HỢP HÀNH TRÌNH TỪ A ĐẾN Z KHI TÌM VIN HOẶC CHỌN XE */}
                    {activeJourneyVin && (
                        <div className="p-1.5 bg-[#E8EEF5] border-b border-[#B9D5F7] shrink-0">
                            <VinJourneySummaryCard 
                                vin={activeJourneyVin}
                                cars={cars}
                                allOrders={allOrders}
                                showToast={showToast}
                                onClose={() => {
                                    if (activeJourneyVin) {
                                        setDismissedJourneyVin(activeJourneyVin);
                                    }
                                    setManualJourneyVin(null);
                                }}
                            />
                        </div>
                    )}

                    {/* DATA GRID */}
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative" onScroll={handleTableScroll}>
                        {filteredCars.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fas fa-inbox text-3xl mb-2 text-slate-300"></i>
                                <span className="text-xs">
                                    {isLoading ? 'Đang tải dữ liệu từ Google Sheets...' : 'Không có xe nào khớp với điều kiện lọc'}
                                </span>
                            </div>
                        ) : (
                            <table className="table-fixed w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#DDECFE] text-slate-900 sticky top-0 z-10 border-b border-[#9FBCEB] text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1 text-center w-7 border-r border-[#B9D5F7]">#</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[14%]">Kho Bãi & SR</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[21%]">Số VIN & Bên Giao</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[16%]">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[13%]">Pin & Ngày Nhận</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[18%]">Trạng Thái Bãi</th>
                                        <th className="py-1 px-2 w-[18%]">Ghi Chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {visibleCars.map((car, idx) => {
                                        const isSelected = selectedRowIdx === idx;
                                        const pinPct = car.mucPinPercent;
                                        let pinBadge = 'bg-slate-100 text-slate-700 border-slate-300';
                                        if (pinPct !== null) {
                                            if (pinPct < 20) pinBadge = 'bg-red-50 text-red-700 border-red-300';
                                            else if (pinPct < 50) pinBadge = 'bg-amber-50 text-amber-700 border-amber-300';
                                            else pinBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                                        }

                                        return (
                                            <tr
                                                key={car.id}
                                                onClick={() => {
                                                    setSelectedRowIdx(idx);
                                                    setDismissedJourneyVin(null);
                                                    setManualJourneyVin(car.soKhung.trim().toUpperCase());
                                                }}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#CCE8FF] text-slate-900 font-medium' 
                                                        : idx % 2 === 1 
                                                            ? 'bg-[#F9FBFC] hover:bg-[#EBF4FF]' 
                                                            : 'bg-white hover:bg-[#EBF4FF]'
                                                }`}
                                            >
                                                {/* Cột 1: STT */}
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>

                                                {/* Cột 2: Kho Bãi & SR */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-bold text-slate-800 text-[10.5px] truncate">
                                                            {car.khoName.replace('Kho ', '')}
                                                        </span>
                                                        {car.thangNhap && (
                                                            <span className="text-[9px] text-slate-400 font-mono">
                                                                ({car.thangNhap})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-0.5">
                                                        <span className={`px-1 py-0.2 rounded-xs font-semibold text-[9.5px] border inline-block ${
                                                            car.isThuanAn 
                                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                                                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                                        }`}>
                                                            {car.showroomQuanLy || 'Thuận An'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Cột 3: Số VIN & Bên Giao */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-blue-900">
                                                        <span className="truncate">{car.soKhung}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyVin(car.soKhung);
                                                            }}
                                                            className="text-slate-400 hover:text-blue-600 transition-opacity shrink-0 cursor-pointer"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === car.soKhung ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setDismissedJourneyVin(null);
                                                                setManualJourneyVin(car.soKhung.trim().toUpperCase());
                                                            }}
                                                            className="px-1 py-0.2 bg-blue-50 hover:bg-blue-100 rounded text-[9px] font-bold border border-blue-200 text-blue-700 shrink-0 ml-auto flex items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
                                                            title="Xem toàn bộ hành trình A-Z của xe này"
                                                        >
                                                            <i className="fa-solid fa-route text-[8.5px]"></i>
                                                            <span>A-Z</span>
                                                        </button>
                                                    </div>
                                                    <div className="text-[9.5px] text-slate-500 truncate mt-0.5" title={car.benGiao}>
                                                        Giao: {car.benGiao || '-'}
                                                    </div>
                                                </td>

                                                {/* Cột 4: Dòng Xe & Màu */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate">{car.loaiXe || '-'}</div>
                                                    <div className="text-[10px] text-slate-500 truncate">{car.mauSac || '-'}</div>
                                                </td>

                                                {/* Cột 5: Pin & Ngày Nhận */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div>
                                                        <span className={`inline-block px-1.5 py-0.2 rounded-xs text-[10px] font-bold border font-mono ${pinBadge}`}>
                                                            {car.mucPin}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9.5px] text-slate-500 font-mono mt-0.5 truncate">
                                                        {car.ngayNhan || '-'}
                                                    </div>
                                                </td>

                                                {/* Cột 6: Trạng Thái Bãi (Chuẩn hóa rõ ràng, không dùng ký hiệu khó hiểu) */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    {car.isTonKho ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9.5px] font-bold shadow-2xs w-fit">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                ĐANG TỒN BÃI
                                                            </span>
                                                            <span className="text-[9px] text-slate-500 font-medium truncate">
                                                                {car.soNgayTonKho && !isNaN(parseInt(String(car.soNgayTonKho))) && parseInt(String(car.soNgayTonKho)) > 0 
                                                                    ? `Lưu bãi: ${car.soNgayTonKho} ngày` 
                                                                    : (car.note || 'Mới tiếp nhận')}
                                                            </span>
                                                            {car.tinhTrang && (
                                                                <span className="inline-block text-[9px] px-1 py-0.1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xs font-semibold w-fit truncate max-w-[130px]" title={car.tinhTrang}>
                                                                    {car.tinhTrang}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-0.5">
                                                            {(() => {
                                                                const cleanSoKhung = (car.soKhung || '').trim().toUpperCase();
                                                                const otherTonCar = tonCarsByVinMap.get(cleanSoKhung);

                                                                if (otherTonCar && otherTonCar.id !== car.id) {
                                                                    const otherKho = otherTonCar.khoName.replace('Kho ', '').trim();
                                                                    return (
                                                                        <>
                                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[9.5px] font-bold w-fit">
                                                                                <i className="fa-solid fa-arrow-right-arrow-left text-[8px] text-amber-600"></i>
                                                                                ĐÃ CHUYỂN KHO
                                                                            </span>
                                                                            <span className="text-[9px] text-slate-500 truncate" title={`Xuất ngày ${car.ngayGiao} để chuyển sang ${otherKho}`}>
                                                                                ➔ Đã qua: <strong>{otherKho}</strong>
                                                                            </span>
                                                                        </>
                                                                    );
                                                                }

                                                                return (
                                                                    <>
                                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[9.5px] font-semibold w-fit">
                                                                            <i className="fas fa-check text-emerald-600 text-[8px]"></i>
                                                                            ĐÃ XUẤT GIAO
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-500 truncate">
                                                                            Ngày: {car.ngayGiao || '-'}
                                                                        </span>
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Cột 7: Ghi Chú */}
                                                <td className="py-1 px-2 overflow-hidden text-slate-600 text-[10px]">
                                                    <div className="truncate" title={car.note}>
                                                        {car.note || '-'}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (3 Kho) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng: <strong>{filteredCars.length}</strong> xe
                                {visibleCars.length < filteredCars.length && (
                                    <span className="text-slate-500 font-normal ml-1">
                                        (Đang hiển thị <strong>{visibleCars.length}</strong> xe)
                                    </span>
                                )}
                            </span>
                            {visibleCars.length < filteredCars.length && (
                                <button
                                    type="button"
                                    onClick={() => setDisplayLimit(filteredCars.length)}
                                    className="px-1.5 py-0.1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-[9.5px] text-blue-700 font-bold cursor-pointer"
                                    title="Tải hiển thị toàn bộ xe cùng lúc"
                                >
                                    Tải tất cả
                                </button>
                            )}
                            <span>•</span>
                            <span className="text-blue-700 font-bold hidden sm:inline">
                                Dòng: <strong>{filteredCars.length > 0 ? selectedRowIdx + 1 : 0}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-emerald-800 font-bold">
                                Thuận An: <strong className="font-mono text-emerald-900">{countThuanAn}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="px-1 py-0.1 rounded-xs text-[9.5px] font-bold bg-[#E6F4EA] text-[#137333] border border-[#CEEAD6]">
                                ⚡ Tồn bãi: {countTonBai}
                            </span>
                            <span className="px-1 py-0.1 rounded-xs text-[9.5px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                Đã giao: {countDaGiao}
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* ========================================================================= */}
            {/* CHẾ ĐỘ 2: TRUNG TÂM ĐỐI CHIẾU & CẢNH BÁO LỆCH KHO (CYBER vs THỰC TẾ)       */}
            {/* Kết hợp logic toàn diện: Đầu Vào (ĐNX Chưa Nhập) & Đầu Ra (TD4 Vi Phạm Tồn) */}
            {/* ========================================================================= */}
            {viewMode === 'reconcile' && (
                <>
                    {/* THANH CÔNG CỤ DUY NHẤT (Single Ribbon Toolbar ~30px) */}
                    <div className="bg-[#F0F0F0] border-b border-[#CCCCCC] px-1.5 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-800 shrink-0">
                        {/* Nhóm Trái: Segmented Buttons Chuyển Phân Hệ Đối Soát */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <div className="inline-flex items-center bg-slate-200/90 p-0.5 rounded border border-slate-300 gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => setReconcileSubTab('all')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        reconcileSubTab === 'all'
                                            ? 'bg-white text-slate-900 shadow-2xs'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                                    }`}
                                >
                                    <i className="fa-solid fa-list-check text-[10px]"></i>
                                    <span>Tất cả</span>
                                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-slate-100 text-slate-700 font-mono font-bold">
                                        {allCombinedAlerts.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setReconcileSubTab('td4')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        reconcileSubTab === 'td4'
                                            ? 'bg-white text-purple-900 shadow-2xs ring-1 ring-purple-300'
                                            : 'text-slate-600 hover:text-purple-900 hover:bg-slate-100/50'
                                    }`}
                                >
                                    <i className="fa-solid fa-triangle-exclamation text-[10px] text-amber-500"></i>
                                    <span>Xe Tồn TD4</span>
                                    {countTd4Approved > 0 && (
                                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-purple-100 text-purple-800 font-mono font-bold" title={`${countTd4Approved} xe vi phạm / ${countTd4Pending} xe đang duyệt`}>
                                            {countTd4Approved}
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setReconcileSubTab('dnx')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        reconcileSubTab === 'dnx'
                                            ? 'bg-white text-red-900 shadow-2xs ring-1 ring-red-300'
                                            : 'text-slate-600 hover:text-red-900 hover:bg-slate-100/50'
                                    }`}
                                >
                                    <i className="fa-solid fa-arrow-down-to-bracket text-[10px] text-red-500"></i>
                                    <span>ĐNX Về Bãi Chưa Nhập</span>
                                    {countAlertThuanAn > 0 && (
                                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-red-100 text-red-800 font-mono font-bold">
                                            {countAlertThuanAn}
                                        </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setReconcileSubTab('missing_yard')}
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        reconcileSubTab === 'missing_yard'
                                            ? 'bg-white text-amber-900 shadow-2xs ring-1 ring-amber-300'
                                            : 'text-slate-600 hover:text-amber-900 hover:bg-slate-100/50'
                                    }`}
                                >
                                    <i className="fa-solid fa-file-invoice-dollar text-[10px] text-amber-500"></i>
                                    <span>Xuất HĐ Mất Bãi</span>
                                    {missingYardItems.filter(c => c.isViolation).length > 0 && (
                                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-100 text-amber-900 font-mono font-bold">
                                            {missingYardItems.filter(c => c.isViolation).length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5 hidden sm:block"></div>

                            {/* Bộ Lọc Tuỳ Biến Theo Phân Hệ Đang Chọn */}
                            {reconcileSubTab === 'td4' && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Trạng thái:</span>
                                        <select
                                            value={td4ApprovalFilter}
                                            onChange={e => setTd4ApprovalFilter(e.target.value as any)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[155px]"
                                        >
                                            <option value="all">Tất cả ({td4Items.length} xe)</option>
                                            <option value="approved">🚨 Đã duyệt xuất ({countTd4Approved})</option>
                                            <option value="pending">⏳ Đang duyệt ({countTd4Pending})</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Bãi tồn:</span>
                                        <select
                                            value={td4YardFilter}
                                            onChange={e => setTd4YardFilter(e.target.value as any)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[145px]"
                                        >
                                            <option value="all">Tất cả bãi ({td4Items.length})</option>
                                            <option value="thuan_an">Bãi Thuận An ({countTd4ThuanAn})</option>
                                            <option value="other">Bãi QL13/Q12 ({countTd4Other})</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">TVBH:</span>
                                        <select
                                            value={td4TvbhFilter}
                                            onChange={e => setTd4TvbhFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                                        >
                                            <option value="all">Tất cả ({uniqueTdTvbhs.length})</option>
                                            {uniqueTdTvbhs.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                        <select
                                            value={td4ModelFilter}
                                            onChange={e => setTd4ModelFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[100px]"
                                        >
                                            <option value="all">Tất cả dòng</option>
                                            {uniqueTdModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {reconcileSubTab === 'dnx' && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Trạng thái:</span>
                                        <select
                                            value={reconcileStatusFilter}
                                            onChange={e => setReconcileStatusFilter(e.target.value as any)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] font-bold text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[170px]"
                                        >
                                            <option value="thuan_an">🚨 Đã về Thuận An ({countAlertThuanAn})</option>
                                            <option value="cyber_not_yard">⚠️ Sổ K83 chưa có bãi ({countCyberNotYard})</option>
                                            <option value="all">Tất cả xe ĐNX ({reconcileItems.length})</option>
                                            <option value="transit_yard">Tại bãi QL13/Q12 ({countTransitYard})</option>
                                            <option value="in_transit">Đang vận chuyển ({countInTransit})</option>
                                            <option value="already_in_cyber">✅ Đã nhập K83 & có bãi ({countAlreadyInCyber})</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">TVBH:</span>
                                        <select
                                            value={reconcileTvbhFilter}
                                            onChange={e => setReconcileTvbhFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                                        >
                                            <option value="all">Tất cả ({uniqueReconcileTvbhs.length})</option>
                                            {uniqueReconcileTvbhs.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                        <select
                                            value={reconcileModelFilter}
                                            onChange={e => setReconcileModelFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[100px]"
                                        >
                                            <option value="all">Tất cả dòng</option>
                                            {uniqueReconcileModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {reconcileSubTab === 'missing_yard' && (
                                <>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">TVBH:</span>
                                        <select
                                            value={missingYardTvbhFilter}
                                            onChange={e => setMissingYardTvbhFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                                        >
                                            <option value="all">Tất cả ({uniqueMissingYardTvbhs.length})</option>
                                            {uniqueMissingYardTvbhs.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                        <select
                                            value={missingYardModelFilter}
                                            onChange={e => setMissingYardModelFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[100px]"
                                        >
                                            <option value="all">Tất cả dòng</option>
                                            {uniqueMissingYardModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {reconcileSubTab === 'all' && (
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Lọc loại:</span>
                                    <select
                                        value={allAlertFilter}
                                        onChange={e => setAllAlertFilter(e.target.value as any)}
                                        className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[170px]"
                                    >
                                        <option value="all">Tất cả ({allCombinedAlerts.length})</option>
                                        <option value="td4">🚨 Chỉ TD4 vi phạm ({td4Items.length})</option>
                                        <option value="dnx">📥 Chỉ ĐNX chưa nhập ({reconcileItems.length})</option>
                                        <option value="missing_yard">⚠️ Chỉ Xuất HĐ mất bãi ({missingYardItems.length})</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Nhóm Phải: Ô Tìm Kiếm + Cụm Nút Hành Động */}
                        <div className="flex items-center gap-1.5">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={
                                        reconcileSubTab === 'td4' ? td4Search :
                                        reconcileSubTab === 'dnx' ? reconcileSearch :
                                        reconcileSubTab === 'missing_yard' ? missingYardSearch : allAlertSearch
                                    }
                                    onChange={e => {
                                        if (reconcileSubTab === 'td4') setTd4Search(e.target.value);
                                        else if (reconcileSubTab === 'dnx') setReconcileSearch(e.target.value);
                                        else if (reconcileSubTab === 'missing_yard') setMissingYardSearch(e.target.value);
                                        else setAllAlertSearch(e.target.value);
                                    }}
                                    placeholder="Tìm VIN, số phiếu, TVBH, KH..."
                                    className="h-5 w-36 sm:w-48 px-1.5 pr-4 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-900 outline-none focus:border-blue-600 shadow-inner"
                                />
                                {(reconcileSubTab === 'td4' ? td4Search : reconcileSubTab === 'dnx' ? reconcileSearch : reconcileSubTab === 'missing_yard' ? missingYardSearch : allAlertSearch) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (reconcileSubTab === 'td4') setTd4Search('');
                                            else if (reconcileSubTab === 'dnx') setReconcileSearch('');
                                            else if (reconcileSubTab === 'missing_yard') setMissingYardSearch('');
                                            else setAllAlertSearch('');
                                        }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[9px]"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <button 
                                type="button" 
                                onClick={handleFetchAllReconcile}
                                disabled={isLoadingReconcile || isLoadingTd4 || isLoadingMissingYard}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer disabled:opacity-50 text-[10px] sm:text-[11px]"
                                title="Nạp lại dữ liệu"
                            >
                                <i className={`fas fa-rotate text-blue-600 text-[10px] ${isLoadingReconcile || isLoadingTd4 || isLoadingMissingYard ? 'animate-spin' : ''}`}></i>
                                <span className="hidden sm:inline">Làm mới</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (reconcileSubTab === 'td4') handleCopyZaloTd4List();
                                    else if (reconcileSubTab === 'dnx') handleCopyZaloDnxList();
                                    else if (reconcileSubTab === 'missing_yard') handleCopyZaloMissingYardList();
                                    else handleCopyZaloAllReconcile();
                                }}
                                className={`px-2 py-0.5 text-white rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer ${
                                    reconcileSubTab === 'td4' ? 'bg-purple-700 hover:bg-purple-800' : reconcileSubTab === 'dnx' ? 'bg-red-600 hover:bg-red-700' : reconcileSubTab === 'missing_yard' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                                title="Sao chép nội dung gửi nhóm Zalo"
                            >
                                <i className="fa-solid fa-copy"></i>
                                <span>Copy Zalo</span>
                            </button>
                        </div>
                    </div>

                    {/* SUB-VIEW 1: BẢNG TỔNG HỢP TOÀN BỘ SAI LỆCH */}
                    {reconcileSubTab === 'all' && (
                        <>

                            {/* BẢNG DỮ LIỆU TỔNG HỢP */}
                            <div className="flex-1 overflow-auto bg-white relative">
                                {isLoadingReconcile || isLoadingTd4 ? (
                                    <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                                        <i className="fas fa-rotate animate-spin text-2xl text-blue-600"></i>
                                        <span className="text-xs">Đang đối soát dữ liệu CyberSoft và các bãi xe...</span>
                                    </div>
                                ) : filteredAllAlerts.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        <i className="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2"></i>
                                        <div className="text-sm font-bold text-slate-700">Tuyệt vời! Không có sai lệch kho nào.</div>
                                        <div className="text-xs text-slate-500 mt-1">Toàn bộ dữ liệu chứng từ trên CyberSoft và bãi thực tế đều khớp nhau.</div>
                                    </div>
                                ) : (
                                    <table className="table-fixed w-full text-left border-collapse text-[11px] font-sans">
                                        <thead className="bg-[#EBEADB] text-slate-700 sticky top-0 z-10 select-none border-b border-[#CCCCCC] text-[10px] sm:text-[11px]">
                                            <tr>
                                                <th className="py-1 px-1 border-r border-[#CCCCCC] w-7 text-center font-bold">#</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[21%]">Phân Loại & Số VIN</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[18%]">Dòng Xe & Chứng Từ</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[19%]">TVBH & Khách Hàng</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[19%]">Cyber & Bãi Ngoài</th>
                                                <th className="py-1 px-2 font-bold w-[23%]">Tình Trạng & Xử Lý</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filteredAllAlerts.map((c, idx) => {
                                                const isSelected = selectedAllRowIdx === idx;
                                                const isDnx = c.type === 'DNX';
                                                return (
                                                    <tr
                                                        key={c.id}
                                                        onClick={() => {
                                                            setSelectedAllRowIdx(idx);
                                                            handleOpenDetailModal(c, 'all');
                                                        }}
                                                        onDoubleClick={() => copyVin(c.vin)}
                                                        className={`hover:bg-blue-50/70 transition-colors cursor-pointer ${
                                                            isSelected ? 'bg-blue-100/90 font-medium' : idx % 2 === 1 ? 'bg-[#F9F9F6]' : 'bg-white'
                                                        }`}
                                                    >
                                                        <td className="py-1 px-1 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div className="flex items-center gap-1.5">
                                                                {isDnx ? (
                                                                    <span className="px-1 py-0.1 text-[8.5px] bg-red-100 text-red-700 font-extrabold rounded border border-red-300">
                                                                        📥 ĐNX
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-1 py-0.1 text-[8.5px] bg-purple-100 text-purple-900 font-extrabold rounded border border-purple-300">
                                                                        🚨 TD4
                                                                    </span>
                                                                )}
                                                                <span className="font-mono font-bold text-slate-900 truncate">{c.vin}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); copyVin(c.vin); }}
                                                                    className="text-slate-400 hover:text-blue-600 text-[10px] shrink-0"
                                                                    title="Copy số khung"
                                                                >
                                                                    <i className={`fa-regular ${copiedVin === c.vin ? 'fa-check text-green-600' : 'fa-copy'}`}></i>
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div className="font-bold text-slate-800 truncate">{c.carModel} <span className="font-normal text-slate-500 text-[9.5px]">({c.color || '-'})</span></div>
                                                            <div className="text-[9.5px] text-blue-700 font-mono truncate">
                                                                CT: <strong>{c.soChungTu}</strong> {c.ngayChungTu ? `(${formatDate(c.ngayChungTu)})` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div className="font-bold text-slate-900 truncate" title={c.tvbh}>{c.tvbh || 'Chưa gán'}</div>
                                                            <div className="text-[10px] text-slate-600 truncate" title={c.customerName}>
                                                                {c.customerName || '-'}{c.orderNumber ? ` • HĐ: ${c.orderNumber}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden text-[10px]">
                                                            <div className="text-slate-700 truncate" title={c.khoCyber}>
                                                                Cyber: <strong className="text-slate-900">{c.khoCyber}</strong>
                                                            </div>
                                                            <div className="text-slate-600 truncate mt-0.5">
                                                                Bãi: <strong className="text-blue-800">{c.khoThucTe}</strong>
                                                                {c.mucPin && c.mucPin !== '-' ? ` • Pin: ${c.mucPin}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 overflow-hidden text-[10.5px]">
                                                            <div className={`font-bold truncate ${isDnx ? 'text-red-700' : 'text-purple-900'}`} title={c.alertTitle}>
                                                                {c.alertTitle}
                                                            </div>
                                                            <div className="text-[9.5px] text-slate-600 truncate" title={c.actionRequired}>
                                                                👉 {c.actionRequired}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* STATUS BAR CHO BẢNG TỔNG HỢP */}
                            <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                                <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                                    <span className="font-bold">
                                        Tổng sai lệch: <strong className="text-red-700 font-mono">{filteredAllAlerts.length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-red-700 font-bold">
                                        ĐNX chưa nhập K83: <strong className="font-mono">{countAlertThuanAn}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-purple-800 font-bold">
                                        TD4 vi phạm tồn bãi: <strong className="font-mono">{td4Items.length}</strong> xe
                                    </span>
                                </div>
                                <div className="text-slate-500 text-[10px] italic">
                                    * Chọn dòng hoặc nhấp đúp để sao chép số khung. Bấm vào các thẻ chỉ số trên để lọc riêng từng phân hệ.
                                </div>
                            </div>
                        </>
                    )}

                    {/* SUB-VIEW 2: CHI TIẾT ĐỐI CHIẾU ĐNX XUẤT ĐIỀU CHUYỂN */}
                    {reconcileSubTab === 'dnx' && (
                        <>
                            {/* DATA GRID */}
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {filteredReconcileItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fa-solid fa-clipboard-check text-4xl mb-2 text-emerald-400"></i>
                                <span className="text-xs font-semibold text-slate-600">
                                    {isLoadingReconcile ? 'Đang phân tích và đối chiếu dữ liệu...' : 'Không có xe nào khớp điều kiện đối chiếu'}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    Tất cả các xe ĐNX đã được nhập kho Cyber hoặc không có dữ liệu trùng khớp.
                                </span>
                            </div>
                        ) : (
                            <table className="table-fixed w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#DDECFE] text-slate-900 sticky top-0 z-10 border-b border-[#9FBCEB] text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1 text-center w-7 border-r border-[#B9D5F7]">#</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[20%]">Số VIN & Phiếu ĐNX</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[17%]">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[20%]">TVBH & Khách Hàng</th>
                                        <th className="py-1 px-2 border-r border-[#B9D5F7] w-[20%]">Lộ Trình & Vị Trí Bãi</th>
                                        <th className="py-1 px-2 w-[23%]">Kết Quả Đối Chiếu</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredReconcileItems.map((item, idx) => {
                                        const isSelected = selectedReconcileRowIdx === idx;
                                        const isThuanAnAlert = item.reconcileStatus === 'AT_THUAN_AN';
                                        const sat = item.satelliteYard;

                                        return (
                                            <tr
                                                key={item.id || item.vin}
                                                onClick={() => {
                                                    setSelectedReconcileRowIdx(idx);
                                                    handleOpenDetailModal(item, 'dnx');
                                                }}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#CCE8FF] text-slate-900 font-medium' 
                                                        : isThuanAnAlert
                                                            ? 'bg-[#FFF9E6] hover:bg-[#FFF0B3]'
                                                            : idx % 2 === 1 
                                                                ? 'bg-[#F9FBFC] hover:bg-[#EBF4FF]' 
                                                                : 'bg-white hover:bg-[#EBF4FF]'
                                                }`}
                                            >
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>

                                                {/* VIN & ĐNX */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono font-bold text-blue-900 truncate">{item.vin}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); copyVin(item.vin); }}
                                                            className="text-slate-400 hover:text-blue-600 transition-opacity shrink-0"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === item.vin ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 font-medium mt-0.5 truncate">
                                                        ĐNX: <strong className="font-mono text-slate-800">{item.soCtDnx || 'DNX'}</strong>
                                                        {item.ngayCtDnx && <span className="text-slate-400 ml-1 font-mono">({item.ngayCtDnx.slice(0, 10)})</span>}
                                                    </div>
                                                </td>

                                                {/* Dòng xe & Màu */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate">{item.carModel || '-'}</div>
                                                    <div className="text-[10px] text-slate-500 truncate">{item.color || '-'}</div>
                                                </td>

                                                {/* TVBH & Khách hàng */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate" title={item.tvbh}>{item.tvbh || 'Chưa gán'}</div>
                                                    <div className="text-[10px] text-slate-600 truncate" title={item.customerName}>
                                                        {item.customerName || '-'}{item.orderNumber ? ` • HĐ: ${item.orderNumber}` : ''}
                                                    </div>
                                                </td>

                                                {/* Lộ trình & Bãi ngoài */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="text-[10px] text-slate-700 font-mono truncate">
                                                        <span className="font-semibold">{item.khoXuat || 'K87'}</span>
                                                        <span className="text-slate-400 mx-1">➔</span>
                                                        <span className="font-bold text-blue-700">{item.khoNhan || 'K83'}</span>
                                                        <span className="text-slate-400 mx-1">•</span>
                                                        <span className={item.isTonKhoCyberK83 ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                                                            {item.isTonKhoCyberK83 ? 'Đã nhập K83' : 'Chưa nhập K83'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                        {sat && sat.isTonKho ? (
                                                            <span>
                                                                Bãi: <strong className="text-slate-800">{sat.khoName}</strong>
                                                                {sat.ngayNhan ? ` (${sat.ngayNhan.slice(0, 10)})` : ''}
                                                                {sat.mucPin && sat.mucPin !== '-' ? ` • Pin: ${sat.mucPin}` : ''}
                                                            </span>
                                                        ) : sat && !sat.isTonKho && sat.ngayGiao ? (
                                                            <span className="text-rose-700">Đã xuất {sat.khoName} ({sat.ngayGiao.slice(0, 10)})</span>
                                                        ) : (
                                                            <span className="italic text-slate-400">Đang trên đường luân chuyển</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Kết quả đối chiếu */}
                                                <td className="py-1 px-2 overflow-hidden">
                                                    {item.reconcileStatus === 'AT_THUAN_AN' ? (
                                                        <div className="text-red-700 font-bold text-[10px] leading-tight">
                                                            🚨 ĐÃ VỀ BÃI THUẬN AN — CHƯA LÀM PNK CYBER
                                                        </div>
                                                    ) : item.reconcileStatus === 'CYBER_K83_NOT_IN_YARD' ? (
                                                        <div className="text-amber-800 font-bold text-[10px] leading-tight">
                                                            ⚠️ SỔ CYBER ĐÃ NHẬP K83 — CHƯA THẤY BÃI
                                                        </div>
                                                    ) : item.reconcileStatus === 'ALREADY_IN_CYBER' ? (
                                                        <div className="text-emerald-700 font-semibold text-[10px] leading-tight">
                                                            ✓ Đã nhập K83 & có tại bãi thực tế
                                                        </div>
                                                    ) : (
                                                        <div className="text-slate-500 text-[10px] leading-tight truncate">
                                                            {item.reconcileNote || 'Đang vận chuyển giữa các kho'}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (ĐNX) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng đối chiếu: <strong>{filteredReconcileItems.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-red-700 font-bold">
                                🚨 Về bãi Thuận An (Chưa nhập Cyber): <strong className="font-mono text-red-800">{countAlertThuanAn}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-amber-800 font-bold">
                                ⚠️ Sổ K83 chưa có bãi: <strong className="font-mono text-amber-900">{countCyberNotYard}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-sky-800 font-bold hidden sm:inline">
                                🚚 Bãi QL13/Q12: <strong className="font-mono">{countTransitYard}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-emerald-800 font-bold hidden md:inline">
                                ✅ Khớp tồn K83: <strong className="font-mono">{countAlreadyInCyber}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-blue-800 font-bold hidden sm:inline">
                                ⏳ Trên đường: <strong className="font-mono">{countInTransit}</strong>
                            </span>
                        </div>
                    </div>
                </>
            )}

                    {/* SUB-VIEW 3: CHI TIẾT CẢNH BÁO XE TỒN TD4 (XE ĐÃ GIAO NHƯNG VẪN CÒN TỒN BÃI) */}
                    {reconcileSubTab === 'td4' && (
                        <>
                            {/* TD4 DATA GRID */}
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {filteredTd4Items.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fa-solid fa-circle-check text-4xl mb-2 text-emerald-500"></i>
                                <span className="text-xs font-bold text-slate-700">
                                    Tuyệt vời! Không có xe nào vi phạm tồn kho TD4.
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    Tất cả các xe đã lập phiếu TD4 đều đã xuất giao xe đúng quy chuẩn.
                                </span>
                            </div>
                        ) : (
                            <table className="table-fixed w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#FBEAEB] text-slate-900 sticky top-0 z-10 border-b border-red-300 text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1 text-center w-7 border-r border-red-200">#</th>
                                        <th className="py-1 px-2 border-r border-red-200 w-[20%]">Số VIN & Phiếu TD4</th>
                                        <th className="py-1 px-2 border-r border-red-200 w-[17%]">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-red-200 w-[20%]">TVBH & Khách Hàng</th>
                                        <th className="py-1 px-2 border-r border-red-200 w-[20%]">Vị Trí Bãi Đang Tồn</th>
                                        <th className="py-1 px-2 w-[23%]">Cảnh Báo Vi Phạm</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredTd4Items.map((item, idx) => {
                                        const isSelected = selectedTd4RowIdx === idx;
                                        const sat = item.satelliteYard;
                                        const isApprovedViolation = item.isViolation !== false;

                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => {
                                                    setSelectedTd4RowIdx(idx);
                                                    handleOpenDetailModal(item, 'td4');
                                                }}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-[#CCE8FF] text-slate-900 font-medium' 
                                                        : isApprovedViolation
                                                            ? (item.isTonThuanAn ? 'bg-[#FFF2F2] hover:bg-[#FFE5E5]' : 'bg-[#FFF9F9] hover:bg-[#FFEBEB]')
                                                            : idx % 2 === 1 
                                                                ? 'bg-[#F9FBFC] hover:bg-[#EBF4FF]' 
                                                                : 'bg-white hover:bg-[#EBF4FF]'
                                                }`}
                                            >
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>

                                                {/* VIN & TD4 */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono font-bold text-blue-900 truncate">{item.vin}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyVin(item.vin);
                                                            }}
                                                            className="text-slate-400 hover:text-blue-600 transition-opacity shrink-0"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === item.vin ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                    </div>
                                                    <div className="text-[10px] text-purple-900 font-medium mt-0.5 truncate flex items-center gap-1">
                                                        <span>Phiếu TD4: <strong className="font-mono">{item.soCtTd4}</strong></span>
                                                        {item.ngayCtTd4 && <span className="text-slate-500 font-mono">({item.ngayCtTd4.slice(0, 10)})</span>}
                                                    </div>
                                                </td>

                                                {/* Dòng xe & Màu */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate">{item.carModel || '-'}</div>
                                                    <div className="text-[10px] text-slate-500 truncate">{item.color || '-'}</div>
                                                </td>

                                                {/* TVBH & Khách hàng */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate" title={item.tvbh}>{item.tvbh || 'Chưa gán'}</div>
                                                    <div className="text-[10px] text-slate-600 truncate" title={item.customerName}>
                                                        {item.customerName || '-'}{item.orderNumber ? ` • HĐ: ${item.orderNumber}` : ''}
                                                    </div>
                                                </td>

                                                {/* Vị Trí Bãi Đang Tồn */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="truncate">
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-xs font-bold text-[10px] border ${
                                                            item.isTonThuanAn 
                                                                ? 'bg-red-50 text-red-800 border-red-300' 
                                                                : 'bg-amber-50 text-amber-800 border-amber-300'
                                                        }`}>
                                                            <i className="fa-solid fa-location-dot"></i>
                                                            {sat.khoName}
                                                        </span>
                                                        {sat.tinhTrang && (
                                                            <span className="text-[9.5px] text-slate-500 ml-1 truncate">
                                                                {sat.tinhTrang}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">
                                                        Pin: <strong className="text-blue-800">{sat.pin}</strong>
                                                        {sat.ngayNhan && <span className="text-slate-500 ml-1">Nhận: {sat.ngayNhan.slice(0, 10)}</span>}
                                                    </div>
                                                </td>

                                                {/* Cảnh báo vi phạm & Mức duyệt Ma_Post */}
                                                <td className="py-1 px-2 overflow-hidden">
                                                    {isApprovedViolation ? (
                                                        <>
                                                            <div className="text-red-700 font-bold text-[10px] leading-tight flex items-center gap-1">
                                                                <i className="fa-solid fa-triangle-exclamation text-red-600 text-[10px] shrink-0 animate-bounce"></i>
                                                                <span className="truncate">🚨 VI PHẠM TỒN: ĐÃ DUYỆT [{item.maPostLabel || 'Cấp 5+'}]</span>
                                                            </div>
                                                            <div className="text-[9.5px] text-red-600 truncate mt-0.5 font-medium">
                                                                👉 Đã có lệnh xuất xe ra cổng. Kiểm tra giao xe gấp!
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-blue-700 font-bold text-[10px] leading-tight flex items-center gap-1">
                                                                <i className="fa-solid fa-clock text-blue-500 text-[10px] shrink-0"></i>
                                                                <span className="truncate">⏳ ĐANG TRÌNH DUYỆT [{item.maPostLabel || 'Cấp 3/4'}]</span>
                                                            </div>
                                                            <div className="text-[9.5px] text-slate-500 truncate mt-0.5">
                                                                ✓ Chưa duyệt ra cổng. Xe lưu bãi là hợp lệ, đúng quy trình.
                                                            </div>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (TD4) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng TD4 tại bãi: <strong className="text-slate-900">{filteredTd4Items.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-red-700 font-bold">
                                🚨 Vi phạm (đã duyệt): <strong className="font-mono">{countTd4Approved}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-blue-700 font-bold">
                                ⏳ Đang trình duyệt (hợp lệ): <strong className="font-mono">{countTd4Pending}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-purple-800 font-bold hidden sm:inline">
                                Bãi Thuận An: <strong className="font-mono">{countTd4ThuanAn}</strong> xe
                            </span>
                        </div>
                    </div>
                </>
            )}

            {/* SUB-VIEW 4: CHI TIẾT CẢNH BÁO XE XUẤT HÓA ĐƠN — CHƯA TD4 MẤT TỒN BÃI THỰC TẾ */}
            {reconcileSubTab === 'missing_yard' && (
                <>
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {isLoadingMissingYard ? (
                            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                                <i className="fas fa-rotate animate-spin text-2xl text-amber-600"></i>
                                <span className="text-xs">Đang kiểm tra dữ liệu hóa đơn và bãi xe thực tế...</span>
                            </div>
                        ) : filteredMissingYardItems.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fa-solid fa-circle-check text-4xl mb-2 text-emerald-500"></i>
                                <span className="text-xs font-bold text-slate-700">
                                    Tuyệt vời! Không có xe nào xuất HĐ mà mất tồn bãi.
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1">
                                    Tất cả các xe đã xuất hóa đơn nhưng chưa giao đều còn lưu tại bãi xe.
                                </span>
                            </div>
                        ) : (
                            <table className="table-fixed w-full border-collapse text-left text-[11px] text-slate-800 select-text">
                                <thead className="bg-[#FFF8E1] text-slate-900 sticky top-0 z-10 border-b border-amber-300 text-[11px] font-bold shadow-2xs">
                                    <tr>
                                        <th className="py-1 px-1 text-center w-7 border-r border-amber-200">#</th>
                                        <th className="py-1 px-2 border-r border-amber-200 w-[20%]">Số VIN & Hóa Đơn</th>
                                        <th className="py-1 px-2 border-r border-amber-200 w-[17%]">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-amber-200 w-[20%]">TVBH & Khách Hàng</th>
                                        <th className="py-1 px-2 border-r border-amber-200 w-[20%]">Kho Cyber & Bãi Ngoài</th>
                                        <th className="py-1 px-2 w-[23%]">Cảnh Báo & Xử Lý</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredMissingYardItems.map((item, idx) => {
                                        const isSelected = selectedMissingYardRowIdx === idx;
                                        const isViolation = item.isViolation;

                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => {
                                                    setSelectedMissingYardRowIdx(idx);
                                                    handleOpenDetailModal(item, 'missing_yard');
                                                }}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected 
                                                        ? 'bg-red-200 font-medium'
                                                        : isViolation 
                                                            ? 'bg-red-50/50 hover:bg-red-100/50' 
                                                            : 'bg-[#FFFDF5] hover:bg-[#FFF8E1]'
                                                }`}
                                            >
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>

                                                {/* VIN & HĐ */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="flex items-center gap-1">
                                                        <span className="font-mono font-bold text-blue-900 truncate">{item.vin}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); copyVin(item.vin); }}
                                                            className="text-slate-400 hover:text-blue-600 transition-opacity shrink-0"
                                                            title="Sao chép số VIN"
                                                        >
                                                            <i className={`fas ${copiedVin === item.vin ? 'fa-check text-green-600' : 'fa-copy'} text-[10px]`}></i>
                                                        </button>
                                                    </div>
                                                    <div className="text-[10px] text-amber-900 font-medium mt-0.5 truncate">
                                                        HĐ: <strong className="font-mono">{item.maHdCyber || item.orderNumber || 'Đã XHĐ'}</strong>
                                                        {item.ngayXuatHoaDon && <span className="text-slate-500 ml-1 font-mono">({item.ngayXuatHoaDon.slice(0, 10)})</span>}
                                                    </div>
                                                </td>

                                                {/* Dòng xe & Màu */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate">{item.carModel || '-'}</div>
                                                    <div className="text-[10px] text-slate-500 truncate">{item.color || '-'}</div>
                                                </td>

                                                {/* TVBH & Khách hàng */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate" title={item.tvbh}>{item.tvbh || 'Chưa rõ'}</div>
                                                    <div className="text-[10px] text-slate-600 truncate" title={item.customerName}>{item.customerName || '-'}</div>
                                                </td>

                                                {/* Kho Cyber & Bãi ngoài */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="text-[10.5px] font-semibold text-slate-800 truncate" title={item.tenKhoCyber || item.maKhoCyber}>
                                                        Cyber: {item.tenKhoCyber || item.maKhoCyber || 'CyberSoft'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 truncate">
                                                        {item.khoBaiThucTe ? (
                                                            <span>{item.khoBaiThucTe}{item.ngayXuatBaiThucTe ? ` (Xuất: ${item.ngayXuatBaiThucTe.slice(0, 10)})` : ''}</span>
                                                        ) : (
                                                            <span className="text-amber-800 italic">Không có ở 3 bãi</span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Cảnh báo & Xử lý */}
                                                <td className="py-1 px-2 overflow-hidden">
                                                    <div className="text-[10px] font-bold text-red-700 leading-tight">
                                                        {item.satelliteStatusLabel}
                                                    </div>
                                                    <div className="text-[9.5px] text-slate-500 mt-0.5 truncate" title={item.warningNote}>
                                                        {item.warningNote}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR (Missing Yard) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng xe vi phạm mất bãi: <strong className="text-red-700">{filteredMissingYardItems.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-slate-500 text-[10px] italic">
                                * Xe đã xuất hóa đơn nhưng chưa có phiếu TD4 và không có ĐNX mà không còn ở bãi xe.
                            </span>
                        </div>
                    </div>
                </>
            )}
                </>
            )}

            {/* MODAL CHI TIẾT LỖI VÀ HƯỚNG XỬ LÝ VI PHẠM */}
            <ReconciliationDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                item={detailModalItem}
                type={detailModalType}
                showToast={showToast}
            />
        </div>
    );
};

export default SatelliteWarehousesView;
