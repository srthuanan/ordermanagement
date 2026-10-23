import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    fetchDnxReconciliationData, 
    DnxReconciliationItem,
    fetchTd4ReconciliationData,
    Td4ReconciliationItem,
    fetchInvoicedMissingYardReconciliationData,
    InvoicedMissingYardItem,
    fetchK83ReconciliationData,
    K83ReconciliationItem
} from '../../services/api/satelliteWarehouseService';
import { ReconciliationDetailModal } from './ReconciliationDetailModal';
import { VinJourneySummaryCard } from './VinJourneySummaryCard';
import { 
    triggerCyberTonKhoSync, 
    searchCyberFactoryPlan, 
    fetchCrossShowroomAllocations, 
    fetchOtherShowroomAllocations,
    transferBusinessLocation, 
    CrossShowroomAllocationItem 
} from '../../services/api/stockService';

export const VINFAST_SHOWROOMS = [
    { code: '02.01.08', name: 'Ô tô Vinfast Thuận An (Minh Đạo)' },
    { code: '02.01.21', name: 'Ô tô Vinfast Minh Đạo - Phạm Văn Đồng' },
    { code: '02.01.20', name: 'Ô tô Vinfast Minh Đạo - Hà Huy Giáp' },
    { code: '02.01.14', name: 'Ô tô Vinfast Dĩ An' },
    { code: '02.01.07', name: 'Ô tô Vinfast 03/2' },
    { code: '02.01.12', name: 'Ô tô Vinfast Vũng Tàu' },
    { code: '02.01.05', name: 'Ô tô Vinfast Times City' },
    { code: '02.01.18', name: 'Ô tô Vinfast Minh Đạo - Nguyễn Trãi' },
    { code: '02.01.19', name: 'Ô tô Vinfast Minh Đạo - Ocean Park 2' },
    { code: '02.01.15', name: 'Ô tô Vinfast Sóc Sơn' },
    { code: '02.01.13', name: 'Ô tô Vinfast Thảo Điền' },
    { code: '02.01.10', name: 'Ô tô Vinfast Long Thành' },
    { code: '02.01.11', name: 'Ô tô Vinfast Biên Hòa' },
    { code: '02.01.16', name: 'Ô tô Vinfast Cần Thơ' },
    { code: '02.01.17', name: 'Ô tô Vinfast An Giang' },
    { code: '02.01.01', name: 'Ô tô Vinfast Hải Phòng' },
    { code: '02.01.02', name: 'Ô tô Vinfast Quảng Ninh' },
    { code: '02.01.03', name: 'Ô tô Vinfast Thái Nguyên' },
    { code: '02.01.04', name: 'Ô tô Vinfast Phú Thọ' },
    { code: '02.01.06', name: 'Ô tô Vinfast Smart City' },
    { code: '02.01.09', name: 'Ô tô Vinfast Nam Định' },
    { code: '02.01.22', name: 'Ô tô Vinfast Bắc Ninh' },
    { code: '02.01.23', name: 'Ô tô Vinfast Vĩnh Phúc' },
    { code: '02.01.24', name: 'Ô tô Vinfast Thanh Hóa' }
];

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
    initialReconcileTab?: 'td4' | 'dnx' | 'missing_yard' | 'k83_reconcile' | 'all' | 'thuan_an_allocations' | 'other_sr_allocations';
    initialAllocSubMode?: 'allocated_unbilled' | 'cross_showroom_billed';
    onCountsChange?: (counts: { carsCount: number; td4Count: number; dnxCount: number; missingYardCount: number; k83Count?: number; k83DiffCount?: number; allAlertCount: number; thuanAnAllocationsCount?: number; crossPendingCount?: number; otherShowroomAllocationsCount?: number; otherAllocPendingCount?: number }) => void;
    onNavigateToTab?: (tab: string, options?: any) => void;
    initialSearchVin?: string;
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
    initialReconcileTab = 'all',
    initialAllocSubMode = 'allocated_unbilled',
    onCountsChange,
    onNavigateToTab,
    initialSearchVin = ''
}) => {
    // 2 View Modes chính:
    // 'inventory': Tồn kho 3 kho bãi vệ tinh
    // 'reconcile': Trung tâm Đối chiếu & Cảnh báo lệch kho (Cyber vs Bãi thực tế)
    const [viewMode, setViewMode] = useState<'inventory' | 'reconcile'>(initialViewMode);

    // Sub-Tab bên trong Trung tâm Đối Chiếu:
    // 'td4': Chi tiết Đầu Ra: Xe đã có phiếu TD4 nhưng bãi vẫn báo tồn kho
    // 'dnx': Chi tiết Đầu Vào: Xe ĐNX về bãi Thuận An chưa nhập K83 trên Cyber
    // 'missing_yard': Cảnh báo Xuất HĐ nhưng chưa có TD4 mà mất tồn bãi
    // 'k83_reconcile': Tra soát tồn kho Cyber K83 vs Bãi Thuận An thực tế
    // 'thuan_an_allocations': Toàn bộ xe được phân bổ cho Thuận An từ CyberSoft
    // 'other_sr_allocations': Xe phân bổ Showroom khác nhưng Thuận An xuất hóa đơn
    const [reconcileSubTab, setReconcileSubTab] = useState<'td4' | 'dnx' | 'missing_yard' | 'k83_reconcile' | 'all' | 'thuan_an_allocations' | 'other_sr_allocations'>(initialReconcileTab || 'k83_reconcile');

    // Đồng bộ khi parent truyền prop thay đổi
    useEffect(() => {
        if (initialViewMode) setViewMode(initialViewMode);
    }, [initialViewMode]);

    useEffect(() => {
        if (initialReconcileTab) setReconcileSubTab(initialReconcileTab);
    }, [initialReconcileTab]);

    useEffect(() => {
        if (initialSearchVin) {
            setSearchQuery(initialSearchVin);
            setManualJourneyVin(initialSearchVin);
        }
    }, [initialSearchVin]);

    // Filters cho Bảng Tổng Hợp ('all')
    const [allAlertFilter, setAllAlertFilter] = useState<'all' | 'yard_not_cyber' | 'cyber_not_yard' | 'td4' | 'missing_yard'>('all');
    const [allAlertSearch, setAllAlertSearch] = useState('');
    const [selectedAllRowIdx, setSelectedAllRowIdx] = useState<number>(0);

    // 1. DỮ LIỆU 3 KHO VỆ TINH (GOOGLE SHEETS)
    const [isLoading, setIsLoading] = useState(false);
    const [cars, setCars] = useState<SatelliteCarItem[]>([]);
    
    // Filters kho vệ tinh
    const [khoFilter, setKhoFilter] = useState<'all' | 'q12' | 'ql13' | 'tada'>('all');
    const [modelFilter, setModelFilter] = useState<string>('all');
    const [showroomFilter, setShowroomFilter] = useState<string>('thuan_an');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ton' | 'giao'>('ton');
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
                const raw = (car.soKhung || '').trim().toUpperCase();
                const match17 = raw.match(/[A-Z0-9]{17}/);
                const clean = match17 ? match17[0] : raw.split('(')[0].split(' ')[0].split('-')[0].trim();
                if (clean) {
                    map.set(clean, car);
                    if (clean.length >= 6) {
                        map.set(clean.slice(-6), car);
                    }
                    if (raw !== clean) {
                        map.set(raw, car);
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

    // 5. DỮ LIỆU ĐỐI SOÁT TỒN KHO CYBER K83 vs BÃI THUẬN AN THỰC TẾ
    const [k83Items, setK83Items] = useState<K83ReconciliationItem[]>([]);
    const [isLoadingK83, setIsLoadingK83] = useState(false);
    const [k83StatusFilter, setK83StatusFilter] = useState<'all' | 'diff' | 'yard_only' | 'cyber_only' | 'matched'>('diff');
    const [k83ModelFilter, setK83ModelFilter] = useState<string>('all');
    const [k83TvbhFilter, setK83TvbhFilter] = useState<string>('all');
    const [k83Search, setK83Search] = useState('');
    const [selectedK83RowIdx, setSelectedK83RowIdx] = useState<number>(0);

    // 6. DỮ LIỆU XE PHÂN BỔ THUẬN AN TỪ CYBERSOFT (MÃ TTCP: 02.01.08)
    const [thuanAnAllocations, setThuanAnAllocations] = useState<any[]>([]);
    const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
    const [allocModelFilter, setAllocModelFilter] = useState<string>('all');
    const [allocLocationFilter, setAllocLocationFilter] = useState<string>('all');
    const [allocSearch, setAllocSearch] = useState('');
    const [selectedAllocRowIdx, setSelectedAllocRowIdx] = useState<number>(0);

    // 6.2 DỮ LIỆU XE PHÂN BỔ THUẬN AN NHƯNG SHOWROOM KHÁC ĐÃ XUẤT HÓA ĐƠN
    const [allocSubMode, setAllocSubMode] = useState<'allocated_unbilled' | 'cross_showroom_billed'>(initialAllocSubMode || 'allocated_unbilled');

    useEffect(() => {
        if (initialAllocSubMode) setAllocSubMode(initialAllocSubMode);
    }, [initialAllocSubMode]);

    const [crossAllocations, setCrossAllocations] = useState<CrossShowroomAllocationItem[]>([]);
    const [isLoadingCrossAllocations, setIsLoadingCrossAllocations] = useState(false);
    const [crossFromDate, setCrossFromDate] = useState<string>('2026-01-01');
    const [crossSearch, setCrossSearch] = useState('');
    const [selectedCrossVins, setSelectedCrossVins] = useState<Set<string>>(new Set());
    const [selectedCrossRowIdx, setSelectedCrossRowIdx] = useState<number>(0);

    // 6.3 DỮ LIỆU XE PHÂN BỔ SHOWROOM KHÁC NHƯNG THUẬN AN XUẤT HÓA ĐƠN
    const [otherAllocations, setOtherAllocations] = useState<CrossShowroomAllocationItem[]>([]);
    const [isLoadingOtherAllocations, setIsLoadingOtherAllocations] = useState(false);
    const [otherAllocFromDate, setOtherAllocFromDate] = useState<string>('2026-08-01');
    const [otherAllocSearch, setOtherAllocSearch] = useState('');
    const [selectedOtherAllocRowIdx, setSelectedOtherAllocRowIdx] = useState<number>(0);
    const [otherAllocStatusFilter, setOtherAllocStatusFilter] = useState<'all' | 'pending' | 'transferred'>('pending');

    // Modal Điều Chuyển Địa Điểm Kinh Doanh (ĐĐKD)
    const [transferModalCars, setTransferModalCars] = useState<CrossShowroomAllocationItem[]>([]);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferTargetTtcp, setTransferTargetTtcp] = useState<string>('02.01.21');
    const [transferReason, setTransferReason] = useState<string>('');
    const [isTransferring, setIsTransferring] = useState(false);

    // 7. MODAL XEM CHI TIẾT LỖI VÀ HƯỚNG XỬ LÝ VI PHẠM
    const [detailModalItem, setDetailModalItem] = useState<any | null>(null);
    const [detailModalType, setDetailModalType] = useState<'missing_yard' | 'td4' | 'dnx' | 'k83_reconcile' | 'all'>('all');
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const handleOpenDetailModal = (item: any, type: 'missing_yard' | 'td4' | 'dnx' | 'k83_reconcile' | 'all') => {
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

            // Trích xuất tháng hiện hành từ tên sheet (VD: "Tháng 10 - 2026" -> "10")
            const activeSheetName = String(info.sheetName || '').trim();
            const activeMonthMatch = activeSheetName.match(/(\d+)/);
            const activeMonth = activeMonthMatch ? activeMonthMatch[1] : '';

            const rows = data.slice(headerIdx + 1);
            rows.forEach((r, rIdx) => {
                if (!r || r.length === 0) return;
                const rawVin = String(r[5] || '').trim();
                const loaiXe = String(r[4] || '').trim();
                const showroom = String(r[3] || '').trim();

                if (!rawVin && !loaiXe) return;

                // Chỉ tính 17 ký tự VIN chuẩn (loại bỏ phần chú thích TRƯNG BÀY, TB,...)
                const match17 = rawVin.toUpperCase().match(/[A-Z0-9]{17}/);
                const vin = match17 ? match17[0] : rawVin.split('(')[0].split(' ')[0].split('-')[0].trim().toUpperCase();

                const isRawTrungBay = rawVin.toUpperCase().includes('TRƯNG BÀY') || rawVin.toUpperCase().includes('TRUNG BAY') || rawVin.toUpperCase().includes('(TB)');
                const rawNote = String(r[13] || '').trim();
                const finalNote = isRawTrungBay 
                    ? (rawNote ? `${rawNote} • Xe trưng bày` : 'Xe trưng bày') 
                    : rawNote;

                const rowMonth = String(r[1] || '').trim();
                const isCurrentMonthRow = !activeMonth || rowMonth.includes(activeMonth) || rowMonth === activeMonth;

                const ngayGiao = String(r[10] || '').trim();
                const colTonKho = String(r[17] || '').trim();

                // Điều kiện xe tồn kho thực tế tại bãi:
                // 1. Thuộc tab tháng hiện hành (loại bỏ tàn dư dữ liệu các tháng cũ đã chốt sổ)
                // 2. Chưa có ngày xuất giao
                // 3. Cột TỒN KHO (cột R / 17) có giá trị 1 (hoặc không bị gạch '-' / 0)
                const hasNoNgayGiao = !ngayGiao || ngayGiao === '' || ngayGiao.toLowerCase() === 'none';
                const isColTonKhoValid = !colTonKho || colTonKho === '1' || colTonKho === '1.0';
                const isTonKho = isCurrentMonthRow && hasNoNgayGiao && isColTonKhoValid;
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
                    note: finalNote,
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

    // Fetch fresh K83 vs Bãi Thuận An reconciliation data
    const handleFetchK83 = useCallback(async (currentCars?: SatelliteCarItem[], silent = false) => {
        if (!silent) setIsLoadingK83(true);
        try {
            if (!silent) {
                try {
                    await triggerCyberTonKhoSync();
                } catch (cyberSyncErr) {
                    console.warn('Lỗi kích hoạt đồng bộ Cyber trực tiếp:', cyberSyncErr);
                }
            }
            const carList = currentCars || cars;
            const data = await fetchK83ReconciliationData(allOrders, carList);
            setK83Items(data);
            if (!silent) {
                const diffs = data.filter(d => d.reconcileType !== 'MATCHED').length;
                showToast('Tra soát K83 vs Bãi', `Đã đồng bộ Cyber mới nhất & đối chiếu ${data.length} xe (Phát hiện ${diffs} xe lệch giữa K83 và bãi Thuận An).`, diffs > 0 ? 'warning' : 'success');
            }
        } catch (err: any) {
            console.error('K83 fetch error:', err);
            if (!silent) {
                showToast('Lỗi tra soát K83', err.message || 'Không thể tải dữ liệu đối chiếu K83', 'error');
            }
        } finally {
            if (!silent) setIsLoadingK83(false);
        }
    }, [allOrders, cars, showToast]);

    // Fetch fresh Xe Phân Bổ Cho Thuận An trực tiếp từ CyberSoft ERP (Mã TTCP: 02.01.08)
    const handleFetchThuanAnAllocations = useCallback(async (forceRefresh = false, silent = false) => {
        if (!silent) setIsLoadingAllocations(true);
        try {
            const res = await searchCyberFactoryPlan({
                ttcp: '02.01.08',
                limit: 500,
                force: forceRefresh
            } as any);

            let carList: any[] = [];
            if (res && res.cars) {
                carList = res.cars;
            } else if (Array.isArray(res)) {
                carList = res;
            }

            setThuanAnAllocations(carList);
            if (!silent) {
                showToast('Phân Bổ Thuận An', `Đã tải ${carList.length} xe phân bổ cho Thuận An từ CyberSoft.`, 'success');
            }
        } catch (err: any) {
            console.error('Lỗi tải xe phân bổ Thuận An:', err);
            if (!silent) {
                showToast('Lỗi tải dữ liệu', err.message || 'Không thể tải danh sách xe phân bổ từ CyberSoft', 'error');
            }
        } finally {
            if (!silent) setIsLoadingAllocations(false);
        }
    }, [showToast]);

    // Fetch fresh Xe Phân Bổ Cho Thuận An nhưng SR khác đã xuất HĐ từ CyberSoft
    const handleFetchCrossAllocations = useCallback(async (customDate?: string, forceRefresh = false, silent = false) => {
        if (!silent) setIsLoadingCrossAllocations(true);
        try {
            const dateToQuery = customDate || crossFromDate || '2026-01-01';
            const res = await fetchCrossShowroomAllocations({
                fromDate: dateToQuery,
                force: forceRefresh
            });
            if (res && res.cars) {
                setCrossAllocations(res.cars);
                if (!silent) {
                    showToast('Xe khác SR xuất HĐ', `Đã tìm thấy ${res.cars.length} xe (Có ${res.total_pending} xe chưa làm ĐNX điều chuyển).`, res.total_pending > 0 ? 'warning' : 'success');
                }
            }
        } catch (err: any) {
            console.error('Lỗi tải xe khác SR xuất HĐ:', err);
            if (!silent) {
                showToast('Lỗi tải dữ liệu', err.message || 'Không thể tải danh sách xe khác SR xuất HĐ', 'error');
            }
        } finally {
            if (!silent) setIsLoadingCrossAllocations(false);
        }
    }, [crossFromDate, showToast]);

    // Fetch fresh Xe Phân Bổ Showroom khác nhưng Thuận An xuất HĐ
    const handleFetchOtherAllocations = useCallback(async (customDate?: string, forceRefresh = false, silent = false) => {
        if (!silent) setIsLoadingOtherAllocations(true);
        try {
            const dateToQuery = customDate || otherAllocFromDate || '2026-08-01';
            const res = await fetchOtherShowroomAllocations({
                fromDate: dateToQuery,
                force: forceRefresh
            });
            if (res && res.cars) {
                setOtherAllocations(res.cars);
                if (!silent) {
                    showToast('SR khác PB - Thuận An XHĐ', `Đã tìm thấy ${res.cars.length} xe (Có ${res.total_pending} xe chưa làm ĐNX điều chuyển về Thuận An).`, res.total_pending > 0 ? 'warning' : 'success');
                }
            }
        } catch (err: any) {
            console.error('Lỗi tải xe SR khác PB - Thuận An XHĐ:', err);
            if (!silent) {
                showToast('Lỗi tải dữ liệu', err.message || 'Không thể tải danh sách xe SR khác PB - Thuận An XHĐ', 'error');
            }
        } finally {
            if (!silent) setIsLoadingOtherAllocations(false);
        }
    }, [otherAllocFromDate, showToast]);

    // Thực thi điều chuyển địa điểm kinh doanh trên CyberSoft
    const handleExecuteTransfer = async () => {
        if (!transferModalCars.length) {
            showToast('Cảnh báo', 'Vui lòng chọn ít nhất 1 xe để điều chuyển', 'warning');
            return;
        }
        if (!transferTargetTtcp) {
            showToast('Cảnh báo', 'Vui lòng chọn Showroom nhận (Mã TTCP)', 'warning');
            return;
        }

        const toShowroomObj = VINFAST_SHOWROOMS.find(s => s.code === transferTargetTtcp);
        const toShowroomName = toShowroomObj?.name || transferTargetTtcp;
        const vins = transferModalCars.map(c => c.vin);

        setIsTransferring(true);
        try {
            const res = await transferBusinessLocation({
                vins,
                to_ttcp: transferTargetTtcp,
                to_ttcp_name: toShowroomName,
                reason: transferReason || `Điều chuyển địa điểm kinh doanh sang ${toShowroomName}`,
                user_name: '02.NHANPT'
            });

            if (res.success) {
                showToast('Điều chuyển thành công', `Đã tạo ĐNX số ${res.so_ct || ''} điều chuyển ${vins.length} xe sang ${toShowroomName}`, 'success', 5000);
                setIsTransferModalOpen(false);
                setSelectedCrossVins(new Set());
                setTransferModalCars([]);
                // Reload cả 2 bảng
                handleFetchCrossAllocations(crossFromDate, true, true);
                handleFetchThuanAnAllocations(true, true);
            } else {
                showToast('Lỗi điều chuyển', res.error || 'Không thể thực hiện điều chuyển trên CyberSoft', 'error', 6000);
            }
        } catch (err: any) {
            showToast('Lỗi điều chuyển', err.message || 'Lỗi kết nối máy chủ CyberSoft', 'error', 6000);
        } finally {
            setIsTransferring(false);
        }
    };

    const handleOpenTransferModal = (carsToTransfer: CrossShowroomAllocationItem[]) => {
        if (!carsToTransfer.length) return;
        setTransferModalCars(carsToTransfer);
        const firstCar = carsToTransfer[0] as any;
        const rawCode = (firstCar?.ma_ttcp_xuat || firstCar?.ttcp_xuat || '').trim();
        const rawName = (firstCar?.ten_ttcp_xuat || '').trim().toLowerCase();

        // Tự động tìm showroom tương ứng theo mã TTCP xuất hoặc theo tên showroom xuất HĐ
        let matchedShowroom = VINFAST_SHOWROOMS.find(s => rawCode && s.code === rawCode);
        if (!matchedShowroom && rawName) {
            matchedShowroom = VINFAST_SHOWROOMS.find(s => 
                s.name.toLowerCase().includes(rawName) || 
                rawName.includes(s.name.toLowerCase()) ||
                (s.code && rawName.includes(s.code))
            );
        }

        const suggestedTtcp = matchedShowroom?.code || rawCode || '02.01.20';
        const targetName = matchedShowroom?.name || firstCar?.ten_ttcp_xuat || suggestedTtcp;
        setTransferTargetTtcp(suggestedTtcp);
        setTransferReason(`Điều chuyển địa điểm kinh doanh sang ${targetName} (xe đã xuất hóa đơn)`);
        setIsTransferModalOpen(true);
    };


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
            if (k83Items.length === 0) {
                handleFetchK83(undefined, true);
            }
            if (crossAllocations.length === 0) {
                handleFetchCrossAllocations('2026-01-01', false, true);
            }
            if (otherAllocations.length === 0) {
                handleFetchOtherAllocations('2026-08-01', false, true);
            }
        }
    }, [isActive, cars.length, reconcileItems.length, td4Items.length, missingYardItems.length, k83Items.length, crossAllocations.length, otherAllocations.length, handleFetchReconcile, handleFetchTd4, handleFetchMissingYard, handleFetchK83, handleFetchCrossAllocations, handleFetchOtherAllocations]);

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
            type: 'YARD_NOT_IN_CYBER' | 'CYBER_NOT_IN_YARD' | 'TD4' | 'MISSING_YARD';
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

        // Bộ Set lưu trữ các số VIN đã được xử lý để triệt tiêu 100% tình trạng trùng lặp lỗi
        const processedVins = new Set<string>();

        // Tập hợp các số khung đã có TD4 để loại bỏ hoàn toàn khỏi đối chiếu ĐNX
        const td4VinSet = new Set<string>();
        td4Items.forEach(t => {
            const v = (t.vin || '').trim().toUpperCase();
            if (v) {
                td4VinSet.add(v);
                if (v.length >= 6) td4VinSet.add(v.slice(-6));
            }
        });

        // ---------------------------------------------------------------------
        // ƯU TIÊN 1: VI PHẠM TỒN KHO TD4 (ĐÃ DUYỆT XUẤT XE QUÁ 48H NHƯNG CHƯA ĐI)
        // ---------------------------------------------------------------------
        td4Items.filter(item => item.isViolation === true).forEach(item => {
            const v = (item.vin || '').trim().toUpperCase();
            if (!v || processedVins.has(v) || (v.length >= 6 && processedVins.has(v.slice(-6)))) {
                return;
            }
            processedVins.add(v);
            if (v.length >= 6) processedVins.add(v.slice(-6));

            list.push({
                id: `td4-${item.vin}`,
                type: 'TD4',
                typeLabel: 'TD4 Quá Hạn Tồn Bãi',
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
                alertTitle: item.warningNote || 'VI PHẠM QUY ĐỊNH: ĐÃ DUYỆT PHIẾU TD4 QUÁ 48H NHƯNG BÃI VẪN BÁO TỒN KHO',
                actionRequired: 'Khẩn trương kiểm tra thực tế: Nếu xe đã giao thì cập nhật ngày xuất bãi ngay, nếu chưa giao thì báo cáo lý do!',
                severity: 'critical'
            });
        });

        // ---------------------------------------------------------------------
        // ƯU TIÊN 2: XUẤT BÃI KHÔNG CÓ LỆNH (ĐÃ XUẤT HÓA ĐƠN NHƯNG MẤT TỒN BÃI)
        // ---------------------------------------------------------------------
        missingYardItems.filter(item => item.isViolation).forEach(item => {
            const v = (item.vin || '').trim().toUpperCase();
            if (!v || processedVins.has(v) || (v.length >= 6 && processedVins.has(v.slice(-6)))) {
                return;
            }
            processedVins.add(v);
            if (v.length >= 6) processedVins.add(v.slice(-6));

            const isDnx = item.satelliteStatus === 'IN_TRANSIT_DNX';
            const isDispatchedNoOrder = item.satelliteStatus === 'ALREADY_DISPATCHED_WITHOUT_TD4';

            list.push({
                id: `missing-${item.vin}`,
                type: isDispatchedNoOrder ? 'MISSING_YARD' : 'CYBER_NOT_IN_YARD',
                typeLabel: isDnx 
                    ? 'ĐNX Đang Luân Chuyển' 
                    : isDispatchedNoOrder 
                        ? 'Xuất Bãi Trái Quy Trình' 
                        : 'Sổ K83 Chưa Có Bãi',
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
                    : isDispatchedNoOrder 
                        ? 'XUẤT BÃI KHÔNG CÓ LỆNH — CHƯA CÓ TD4 & KHÔNG CÓ ĐNX' 
                        : 'SỔ CYBER ĐÃ NHẬP K83 — NHƯNG BÃI THỰC TẾ CHƯA CÓ XE',
                actionRequired: isDnx 
                    ? 'Theo dõi xe về bãi nhận và hoàn tất nhập kho K83 trên Cyber khi xe đến' 
                    : isDispatchedNoOrder 
                        ? 'Khẩn trương kiểm tra vị trí xe thực tế! Nguy cơ giao xe không lệnh hoặc sai lệch dữ liệu kho!' 
                        : 'Khẩn trương đối chiếu Kế toán kho và Thủ kho bãi nhận để xác định xe thực tế đang ở vị trí nào',
                severity: isDnx ? 'warning' : 'critical'
            });
        });

        // ---------------------------------------------------------------------
        // ƯU TIÊN 3: ĐNX LUÂN CHUYỂN XE (VỀ BÃI CHƯA NHẬP CYBER HOẶC SỔ K83 THIẾU BÃI)
        // ---------------------------------------------------------------------
        reconcileItems.forEach(item => {
            const v = (item.vin || '').trim().toUpperCase();
            if (!v || processedVins.has(v) || (v.length >= 6 && processedVins.has(v.slice(-6)))) {
                return;
            }
            if (td4VinSet.has(v) || (v.length >= 6 && td4VinSet.has(v.slice(-6)))) {
                return; // Bỏ qua phiếu ĐNX nếu xe đã có phiếu TD4
            }
            if (item.reconcileStatus === 'ALREADY_IN_CYBER') {
                return; // Khớp hoàn hảo cả Cyber K83 và bãi thực tế, không đưa vào danh sách cảnh báo sai lệch
            }

            const isAtThuanAn = item.reconcileStatus === 'AT_THUAN_AN';
            const isCyberNotYard = item.reconcileStatus === 'CYBER_K83_NOT_IN_YARD';

            // Chỉ đưa các trường hợp sai lệch thực tế vào danh sách cảnh báo tổng hợp
            if (!isAtThuanAn && !isCyberNotYard) {
                return;
            }

            processedVins.add(v);
            if (v.length >= 6) processedVins.add(v.slice(-6));

            list.push({
                id: `dnx-${item.vin}`,
                type: isAtThuanAn ? 'YARD_NOT_IN_CYBER' : 'CYBER_NOT_IN_YARD',
                typeLabel: isAtThuanAn 
                    ? 'Về Bãi Chưa Nhập K83' 
                    : 'Sổ K83 Chưa Có Bãi',
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
                    ? 'XE ĐÃ VỀ BÃI THUẬN AN — CHƯA LÀM PNK NHẬP KHO K83' 
                    : 'SỔ CYBER CÒN TỒN K83 — NHƯNG BÃI THỰC TẾ KHÔNG CÓ XE',
                actionRequired: isAtThuanAn 
                    ? 'TVBH báo Admin/Kế toán làm phiếu PNK nhập kho Cyber K83 để kịp tiến độ giao xe' 
                    : 'Khẩn trương đối chiếu Kế toán kho và Thủ kho bãi nhận để xác định xe thực tế đang ở vị trí nào',
                severity: 'critical'
            });
        });

        // ---------------------------------------------------------------------
        // ƯU TIÊN 4: ĐỐI SOÁT TỒN KHO K83 vs BÃI THUẬN AN THỰC TẾ (CÁC XE CÒN LẠI)
        // ---------------------------------------------------------------------
        k83Items.filter(item => item.reconcileType !== 'MATCHED').forEach(item => {
            const rawV = (item.vin || '').trim().toUpperCase();
            const match17 = rawV.match(/[A-Z0-9]{17}/);
            const v = match17 ? match17[0] : rawV.split('(')[0].split(' ')[0].split('-')[0].trim();
            if (!v || processedVins.has(v) || (v.length >= 6 && processedVins.has(v.slice(-6)))) {
                return; // Đã nằm trong danh sách cảnh báo TD4 / HĐ Mất Bãi / ĐNX
            }

            processedVins.add(v);
            if (v.length >= 6) processedVins.add(v.slice(-6));

            const isCyberOnly = item.reconcileType === 'CYBER_K83_ONLY';
            list.push({
                id: `k83-${v}`,
                type: isCyberOnly ? 'CYBER_NOT_IN_YARD' : 'YARD_NOT_IN_CYBER',
                typeLabel: isCyberOnly ? 'Sổ K83 Chưa Có Bãi' : 'Về Bãi Chưa Nhập K83',
                vin: v,
                carModel: item.carModel,
                color: item.color,
                tvbh: item.tvbhCyber || (item.yardCar && item.yardCar.tvbh) || 'Chưa rõ',
                customerName: item.customerName || (item.yardCar && item.yardCar.customerName) || 'Chưa rõ',
                orderNumber: item.orderNumber || item.soHdCyber || '',
                soChungTu: item.soCtDnx || item.soCtTd4 || item.soHdCyber || 'K83',
                ngayChungTu: item.ngayCtDnx || item.ngayCtTd4 || item.ngayHdCyber || '',
                khoCyber: item.hasCyberK83 ? 'Sổ Cyber: Tồn K83' : 'Sổ Cyber: Chưa có K83',
                khoThucTe: item.hasYardStock ? `Bãi: ${item.khoName || 'Thuận An'}` : (item.otherYardLocation ? `Tại: ${item.otherYardLocation}` : 'Không có trong bãi'),
                mucPin: item.mucPin || '-',
                ngayNhanBai: item.ngayNhanYard || item.ngayGiaoYard || '',
                alertTitle: isCyberOnly 
                    ? 'SỔ CYBER CÒN TỒN K83 — NHƯNG BÃI THỰC TẾ KHÔNG CÓ XE' 
                    : 'XE ĐÃ VỀ BÃI THUẬN AN — CHƯA LÀM PNK NHẬP KHO K83',
                actionRequired: item.actionRequired || item.discrepancyReason || (isCyberOnly ? 'Khẩn trương đối chiếu Kế toán kho và Thủ kho để xác định xe thực tế đang ở vị trí nào' : 'TVBH báo Admin/Kế toán làm phiếu PNK nhập kho Cyber K83 để kịp tiến độ giao xe'),
                severity: 'critical'
            });
        });

        return list;
    }, [reconcileItems, td4Items, missingYardItems, k83Items]);

    // Filter cho Bảng Tổng Hợp
    const filteredAllAlerts = useMemo(() => {
        return allCombinedAlerts.filter(item => {
            if (allAlertFilter === 'yard_not_cyber' && item.type !== 'YARD_NOT_IN_CYBER') return false;
            if (allAlertFilter === 'cyber_not_yard' && item.type !== 'CYBER_NOT_IN_YARD') return false;
            if (allAlertFilter === 'td4' && item.type !== 'TD4') return false;
            if (allAlertFilter === 'missing_yard' && item.type !== 'MISSING_YARD') return false;

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
        setIsLoadingK83(true);
        try {
            // 1. Kích hoạt lấy dữ liệu mới nhất trực tiếp từ CyberSoft MSSQL (Tồn kho & Trạng thái xe) và lưu vào Supabase
            try {
                await triggerCyberTonKhoSync();
            } catch (cyberSyncErr) {
                console.warn('Lỗi kích hoạt đồng bộ Cyber trực tiếp:', cyberSyncErr);
            }

            // 2. Tải mới nhất trực tiếp từ Google Sheets của 3 bãi xe
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

            // 3. Chạy đối soát song song cả 4 phân hệ với dữ liệu bãi mới nhất và CSDL Cyber/Supabase
            await Promise.all([
                handleFetchReconcile(freshCars, true),
                handleFetchTd4(freshCars, true),
                handleFetchMissingYard(freshCars, true),
                handleFetchK83(freshCars, true),
                handleFetchThuanAnAllocations(true, true),
                handleFetchOtherAllocations(otherAllocFromDate, true, true)
            ]);
            showToast('Làm mới hoàn tất', 'Đã đồng bộ trực tiếp từ CyberSoft MSSQL và Google Sheets!', 'success');
        } catch (err: any) {
            console.error('Refresh all error:', err);
            showToast('Lỗi làm mới', err.message || 'Không thể làm mới dữ liệu đối chiếu', 'error');
        } finally {
            setIsLoadingReconcile(false);
            setIsLoadingTd4(false);
            setIsLoadingMissingYard(false);
            setIsLoadingK83(false);
            setIsLoadingAllocations(false);
            setIsLoadingOtherAllocations(false);
        }
    };

    // Copy Báo Cáo Tra Soát K83 vs Bãi Thuận An Gửi Nhóm Zalo
    const handleCopyZaloK83List = () => {
        const yardOnly = k83Items.filter(c => c.reconcileType === 'YARD_ONLY');
        const cyberOnly = k83Items.filter(c => c.reconcileType === 'CYBER_K83_ONLY');
        const matched = k83Items.filter(c => c.reconcileType === 'MATCHED');

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        let text = `⚖️ BÁO CÁO TRA SOÁT TỒN KHO: CYBER K83 vs BÃI THUẬN AN THỰC TẾ\n`;
        text += `(Thời điểm kiểm tra: ${timeStr})\n`;
        text += `📊 TỔNG QUAN TỒN KHO:\n`;
        text += ` • Tồn sổ Cyber K83: ${matched.length + cyberOnly.length} xe\n`;
        text += ` • Tồn thực tế bãi Thuận An: ${matched.length + yardOnly.length} xe\n`;
        text += ` • Khớp cả hai: ${matched.length} xe\n`;
        text += ` • TỔNG LỆCH KHO: ${yardOnly.length + cyberOnly.length} xe (Thừa bãi TT: ${yardOnly.length} | Thừa Cyber K83: ${cyberOnly.length})\n`;
        text += `========================================\n\n`;

        // 1. Thừa bãi thực tế
        text += `🚨 1. THỪA BÃI THUẬN AN THỰC TẾ (CYBER K83 CHƯA GHI NHẬN TỒN): ${yardOnly.length} xe\n`;
        text += `👉 CẦN XỬ LÝ: Kế toán & TVBH làm thủ tục nhập kho K83 / lập ĐNX ngay:\n`;
        text += `----------------------------------------\n`;
        if (yardOnly.length === 0) {
            text += `   (Tuyệt vời! Không có xe lệch)\n`;
        } else {
            yardOnly.forEach((c, idx) => {
                text += ` ${idx + 1}. VIN: ${c.vin}\n`;
                text += `    • Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''} | Pin: ${c.mucPin || '-'}\n`;
                text += `    • Trạng thái Cyber: ${c.tenKhoCyber} (${c.maKhoCyber})\n`;
                if (c.hasDnx) text += `    • ĐNX: ${c.soCtDnx} (Ngày: ${c.ngayCtDnx || 'N/A'})\n`;
                text += `    • Lệch: ${c.discrepancyReason}\n`;
                text += `    ➔ Hướng xử lý: ${c.actionRequired}\n`;
            });
        }
        text += `\n`;

        // 2. Thừa Cyber K83
        text += `⚠️ 2. THỪA SỔ CYBER K83 (BÃI THUẬN AN THỰC TẾ KHÔNG CÓ XE): ${cyberOnly.length} xe\n`;
        text += `👉 CẦN XỬ LÝ: Rà soát xe đã xuất giao lập TD4, hoặc điều chuyển xe từ bãi khác về:\n`;
        text += `----------------------------------------\n`;
        if (cyberOnly.length === 0) {
            text += `   (Tuyệt vời! Không có xe lệch)\n`;
        } else {
            cyberOnly.forEach((c, idx) => {
                text += ` ${idx + 1}. VIN: ${c.vin}\n`;
                text += `    • Xe: ${c.carModel} ${c.color ? `(${c.color})` : ''}\n`;
                text += `    • TVBH: ${c.tvbhCyber || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                if (c.soHdCyber) text += `    • HĐ Cyber: ${c.soHdCyber} (${c.ngayHdCyber || 'N/A'})\n`;
                if (c.hasTd4) text += `    • Phiếu TD4: ${c.soCtTd4} [${c.td4MaPostLabel || 'Đang duyệt'}]${c.ngayCtTd4 ? ` (Ngày lập: ${c.ngayCtTd4.slice(0, 10)})` : ''}\n`;
                if (c.hasDnx) text += `    • Lệnh ĐNX: ${c.soCtDnx} (${c.dnxTenKhoXuat || c.dnxMaKhoXuat || 'K83'} ➔ ${c.dnxTenKhoNhan || c.dnxMaKhoNhan || 'Kho khác'})\n`;
                text += `    • Lệch: ${c.discrepancyReason}\n`;
                text += `    ➔ Hướng xử lý: ${c.actionRequired}\n`;
            });
        }
        text += `\n========================================\n`;
        text += `👉 Đề nghị Quản lý bãi, Kế toán kho và các TVBH phối hợp rà soát xử lý dứt điểm các trường hợp trên!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép Báo cáo tra soát K83 vs Bãi Thuận An (${yardOnly.length + cyberOnly.length} xe lệch)!`, 'success', 2500);
    };

    // Copy Báo Cáo Tổng Hợp Gửi Zalo (Đồng bộ 100% từ danh sách cảnh báo duy nhất allCombinedAlerts)
    const handleCopyZaloAllReconcile = () => {
        if (allCombinedAlerts.length === 0) {
            showToast('Thông báo', 'Tuyệt vời! Hiện không có trường hợp sai lệch kho nào.', 'success');
            return;
        }

        const td4Alerts = allCombinedAlerts.filter(c => c.type === 'TD4');
        const missingYardAlerts = allCombinedAlerts.filter(c => c.type === 'MISSING_YARD');
        const yardNotCyberAlerts = allCombinedAlerts.filter(c => c.type === 'YARD_NOT_IN_CYBER');
        const cyberNotYardAlerts = allCombinedAlerts.filter(c => c.type === 'CYBER_NOT_IN_YARD');

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        let text = `🚨 BÁO CÁO TỔNG HỢP SAI LỆCH KHO: CYBERSOFT vs BÃI XE THỰC TẾ\n`;
        text += `(Thời điểm kiểm tra: ${timeStr} - Tổng cộng: ${allCombinedAlerts.length} trường hợp lệch)\n`;
        text += `========================================\n\n`;

        // 1. TD4 Vi Phạm Tồn Bãi
        if (td4Alerts.length > 0) {
            text += `🚨 1. TD4 QUÁ HẠN TỒN BÃI (ĐÃ DUYỆT XUẤT XE QUÁ 48H): ${td4Alerts.length} xe\n`;
            text += `👉 Đề nghị kiểm tra gấp: Đã giao thì cập nhật xuất bãi ngay, chưa giao thì giải trình:\n`;
            text += `----------------------------------------\n`;
            td4Alerts.forEach((c, i) => {
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • TD4: ${c.soChungTu} (${c.ngayChungTu ? formatDate(c.ngayChungTu) : 'N/A'})\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}${c.orderNumber ? ` | HĐ: ${c.orderNumber}` : ''}\n`;
                text += `    • Vị trí bãi: ${c.khoThucTe} (Pin: ${c.mucPin})\n`;
            });
            text += `\n`;
        }

        // 2. Xuất Bãi Không Có Lệnh
        if (missingYardAlerts.length > 0) {
            text += `🚨 2. XUẤT HÓA ĐƠN — MẤT TỒN BÃI THỰC TẾ: ${missingYardAlerts.length} xe\n`;
            text += `👉 Nguy cơ xuất bãi chui / lệch dữ liệu kho nghiêm trọng:\n`;
            text += `----------------------------------------\n`;
            missingYardAlerts.forEach((c, i) => {
                text += ` ${i + 1}. VIN: ${c.vin}\n`;
                text += `    • HĐ: ${c.soChungTu} (${c.ngayChungTu ? formatDate(c.ngayChungTu) : 'N/A'})\n`;
                text += `    • TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `    • Tình trạng: ${c.alertTitle}\n`;
            });
            text += `\n`;
        }

        // 3. Về Bãi Chưa Nhập K83
        if (yardNotCyberAlerts.length > 0) {
            text += `📥 3. XE ĐÃ VỀ BÃI THUẬN AN — CHƯA NHẬP KHO K83: ${yardNotCyberAlerts.length} xe\n`;
            text += `👉 Đề nghị Kế toán kho làm phiếu PNK nhập kho Cyber K83 để kịp tiến độ giao xe:\n`;
            text += `----------------------------------------\n`;
            yardNotCyberAlerts.forEach((c, i) => {
                text += ` ${i + 1}. VIN: ${c.vin} | ${c.carModel} (${c.color || '-'})\n`;
                text += `    • CT: ${c.soChungTu} | TVBH: ${c.tvbh || 'Chưa rõ'} | KH: ${c.customerName || 'Chưa rõ'}\n`;
                text += `    • Tình trạng: ${c.alertTitle}\n`;
                text += `    • Vị trí bãi: ${c.khoThucTe}\n`;
            });
            text += `\n`;
        }

        // 4. Sổ K83 Còn Tồn Nhưng Thiếu Bãi
        if (cyberNotYardAlerts.length > 0) {
            text += `⚖️ 4. SỔ CYBER K83 CÒN TỒN — NHƯNG BÃI THỰC TẾ KHÔNG CÓ XE: ${cyberNotYardAlerts.length} xe\n`;
            text += `👉 Cần rà soát lập ĐNX điều chuyển hoặc kiểm tra lại thực tế vị trí xe:\n`;
            text += `----------------------------------------\n`;
            cyberNotYardAlerts.forEach((c, i) => {
                text += ` ${i + 1}. VIN: ${c.vin} | ${c.carModel} (${c.color || '-'})\n`;
                text += `    • Tình trạng: ${c.alertTitle}\n`;
                text += `    • Thực tế: ${c.khoThucTe} | Cyber: ${c.khoCyber}\n`;
            });
            text += `\n`;
        }

        text += `========================================\n`;
        text += `👉 Đề nghị Quản lý bãi, Kế toán kho và các TVBH phối hợp xử lý dứt điểm các trường hợp lệch trên!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép Báo cáo tổng hợp đối soát (${allCombinedAlerts.length} xe)!`, 'success', 2500);
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

    // Copy Zalo Danh Sách Xe Phân Bổ Cho Thuận An Từ CyberSoft
    const handleCopyZaloAllocations = () => {
        if (filteredAllocations.length === 0) {
            showToast('Thông báo', 'Không có dữ liệu xe phân bổ để sao chép', 'warning');
            return;
        }
        if (allocSubMode === 'cross_showroom_billed') {
            if (filteredCrossAllocations.length === 0) {
                showToast('Thông báo', 'Không có xe nào khớp điều kiện lọc để sao chép', 'info');
                return;
            }
            const now = new Date();
            const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
            let text = `🚨 DANH SÁCH XE PHÂN BỔ THUẬN AN — SHOWROOM KHÁC ĐÃ XUẤT HÓA ĐƠN\n`;
            text += `(Thời điểm kiểm tra: ${dateStr} - Tổng: ${filteredCrossAllocations.length} xe | Chưa lập ĐNX: ${countCrossPending} xe)\n`;
            text += `* Quy định: Phải lập ĐNX điều chuyển địa điểm kinh doanh (Mã GD 9) để trừ hạn mức phân bổ\n`;
            text += `────────────────────────────────────────\n`;
            filteredCrossAllocations.forEach((c, idx) => {
                const statusStr = c.has_transferred ? `✅ Đã có ĐNX (${c.so_ct_dnx || ''})` : `🚨 CHƯA ĐIỀU CHUYỂN ĐĐKD`;
                text += `${idx + 1}. VIN: ${c.vin} | ${c.dong_xe || ''} ${c.phien_ban || ''} | Màu: ${c.ten_mau || c.ma_mau || '-'}\n`;
                text += `   • SR xuất HĐ: ${c.ten_ttcp_xuat || c.ma_ttcp_xuat} | HĐ: ${c.so_hd || '-'} (${c.ngay_hd || ''})\n`;
                text += `   • TVBH: ${c.tvbh_xuat || '-'} | KH: ${c.ten_khach_hang || '-'}\n`;
                text += `   • Trạng thái: ${statusStr}\n`;
            });
            text += `────────────────────────────────────────\n`;
            navigator.clipboard.writeText(text);
            showToast('Đã sao chép Zalo', `Đã sao chép ${filteredCrossAllocations.length} xe khác SR xuất HĐ!`, 'success');
            return;
        }

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        let text = `📋 DANH SÁCH XE PHÂN BỔ CHO SHOWROOM THUẬN AN (CYBERSOFT)\n`;
        text += `(Thời điểm kiểm tra: ${dateStr} - Tổng: ${filteredAllocations.length} xe)\n`;
        text += `────────────────────────────────────────\n`;

        filteredAllocations.forEach((c, idx) => {
            const loc = c.current_physical_warehouse || c.vi_tri_kho || 'Đang vận tải';
            text += `${idx + 1}. ${c.vin} | ${c.dong_xe || ''} ${c.phien_ban || ''} | Màu: ${c.ten_mau || c.ma_mau || '-'} | DMS: ${c.ma_dms || '-'} | Kho: ${loc}\n`;
        });
        text += `────────────────────────────────────────\n`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép ${filteredAllocations.length} xe phân bổ gửi Zalo!`, 'success');
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

    // -------------------------------------------------------------
    // K83 VS BÃI THUẬN AN COMPUTED DATA
    // -------------------------------------------------------------
    const countK83Matched = useMemo(() => k83Items.filter(c => c.reconcileType === 'MATCHED').length, [k83Items]);
    const countK83CyberOnly = useMemo(() => k83Items.filter(c => c.reconcileType === 'CYBER_K83_ONLY').length, [k83Items]);
    const countK83YardOnly = useMemo(() => k83Items.filter(c => c.reconcileType === 'YARD_ONLY').length, [k83Items]);
    const countK83Diff = useMemo(() => countK83CyberOnly + countK83YardOnly, [countK83CyberOnly, countK83YardOnly]);
    const countK83TotalCyber = useMemo(() => countK83Matched + countK83CyberOnly, [countK83Matched, countK83CyberOnly]);
    const countK83TotalYard = useMemo(() => countK83Matched + countK83YardOnly, [countK83Matched, countK83YardOnly]);

    const uniqueK83Models = useMemo(() => {
        const set = new Set<string>();
        k83Items.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [k83Items]);

    const uniqueK83Tvbhs = useMemo(() => {
        const set = new Set<string>();
        k83Items.forEach(c => {
            if (c.tvbhCyber && c.tvbhCyber !== 'Chưa rõ') set.add(c.tvbhCyber.trim());
        });
        return Array.from(set).sort();
    }, [k83Items]);

    const filteredK83Items = useMemo(() => {
        return k83Items.filter(c => {
            if (k83StatusFilter === 'diff' && c.reconcileType === 'MATCHED') return false;
            if (k83StatusFilter === 'yard_only' && c.reconcileType !== 'YARD_ONLY') return false;
            if (k83StatusFilter === 'cyber_only' && c.reconcileType !== 'CYBER_K83_ONLY') return false;
            if (k83StatusFilter === 'matched' && c.reconcileType !== 'MATCHED') return false;

            if (k83ModelFilter !== 'all' && c.carModel.trim() !== k83ModelFilter) return false;
            if (k83TvbhFilter !== 'all' && (c.tvbhCyber || '').trim() !== k83TvbhFilter) return false;

            if (k83Search.trim()) {
                const q = k83Search.toLowerCase().trim();
                const matchVin = c.vin.toLowerCase().includes(q);
                const matchModel = c.carModel.toLowerCase().includes(q);
                const matchColor = c.color.toLowerCase().includes(q);
                const matchTvbh = (c.tvbhCyber || '').toLowerCase().includes(q);
                const matchKh = (c.customerName || '').toLowerCase().includes(q);
                const matchHd = (c.soHdCyber || c.orderNumber || '').toLowerCase().includes(q);
                const matchDnx = (c.soCtDnx || '').toLowerCase().includes(q);
                const matchTd4 = (c.soCtTd4 || '').toLowerCase().includes(q);
                const matchReason = c.discrepancyReason.toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchColor && !matchTvbh && !matchKh && !matchHd && !matchDnx && !matchTd4 && !matchReason) return false;
            }
            return true;
        });
    }, [k83Items, k83StatusFilter, k83ModelFilter, k83TvbhFilter, k83Search]);

    // Unique models for Allocations dropdown
    const uniqueAllocModels = useMemo(() => {
        const set = new Set<string>();
        thuanAnAllocations.forEach(c => {
            const m = (c.dong_xe || '').trim();
            if (m) set.add(m);
        });
        return Array.from(set).sort();
    }, [thuanAnAllocations]);

    // Unique locations for Allocations dropdown
    const uniqueAllocLocations = useMemo(() => {
        const set = new Set<string>();
        thuanAnAllocations.forEach(c => {
            const loc = (c.current_physical_warehouse || c.vi_tri_kho || 'Đang vận tải').trim();
            if (loc) set.add(loc);
        });
        return Array.from(set).sort();
    }, [thuanAnAllocations]);

    // Filtered Allocations
    const filteredAllocations = useMemo(() => {
        return thuanAnAllocations.filter(c => {
            if (allocModelFilter !== 'all' && (c.dong_xe || '').trim() !== allocModelFilter) {
                return false;
            }
            if (allocLocationFilter !== 'all') {
                const loc = (c.current_physical_warehouse || c.vi_tri_kho || 'Đang vận tải').trim();
                if (loc !== allocLocationFilter) return false;
            }
            if (allocSearch.trim()) {
                const q = allocSearch.toLowerCase().trim();
                const matchVin = (c.vin || '').toLowerCase().includes(q);
                const matchModel = (c.dong_xe || '').toLowerCase().includes(q) || (c.ten_kx || '').toLowerCase().includes(q);
                const matchColor = (c.ten_mau || '').toLowerCase().includes(q) || (c.ma_mau || '').toLowerCase().includes(q);
                const matchDms = (c.ma_dms || '').toLowerCase().includes(q);
                const matchNote = (c.ghi_chu || '').toLowerCase().includes(q);
                const matchLoc = (c.current_physical_warehouse || c.vi_tri_kho || '').toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchColor && !matchDms && !matchNote && !matchLoc) return false;
            }
            return true;
        });
    }, [thuanAnAllocations, allocModelFilter, allocLocationFilter, allocSearch]);

    // Counters for Allocations
    const countAllocInTransit = useMemo(() => {
        return thuanAnAllocations.filter(c => {
            const loc = (c.current_physical_warehouse || c.vi_tri_kho || '').toLowerCase();
            return !loc || loc.includes('vận tải') || loc.includes('nhà máy');
        }).length;
    }, [thuanAnAllocations]);

    const countAllocAtYard = useMemo(() => {
        return Math.max(0, thuanAnAllocations.length - countAllocInTransit);
    }, [thuanAnAllocations.length, countAllocInTransit]);

    // Filtered Cross-Showroom Allocations (Xe khác SR đã xuất hóa đơn)
    const filteredCrossAllocations = useMemo(() => {
        return crossAllocations.filter(c => {
            // Theo yêu cầu: Chỉ hiển thị các xe CHƯA điều chuyển, xe đã điều chuyển không cần hiển thị
            if (c.has_transferred) return false;

            if (crossSearch.trim()) {
                const q = crossSearch.toLowerCase().trim();
                const matchVin = (c.vin || '').toLowerCase().includes(q);
                const matchModel = (c.dong_xe || '').toLowerCase().includes(q) || (c.ten_kx || '').toLowerCase().includes(q);
                const matchColor = (c.ten_mau || '').toLowerCase().includes(q) || (c.ma_mau || '').toLowerCase().includes(q);
                const matchKh = (c.ten_khach_hang || '').toLowerCase().includes(q);
                const matchHd = (c.so_hd || '').toLowerCase().includes(q);
                const matchSr = (c.ten_ttcp_xuat || '').toLowerCase().includes(q) || (c.ma_ttcp_xuat || '').toLowerCase().includes(q);
                const matchTvbh = (c.tvbh_xuat || '').toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchColor && !matchKh && !matchHd && !matchSr && !matchTvbh) return false;
            }
            return true;
        });
    }, [crossAllocations, crossSearch]);

    const countCrossPending = useMemo(() => crossAllocations.filter(c => !c.has_transferred).length, [crossAllocations]);
    const countCrossTransferred = useMemo(() => crossAllocations.filter(c => c.has_transferred).length, [crossAllocations]);

    // Filtered Other-Showroom Allocations (Xe SR khác phân bổ nhưng Thuận An xuất HĐ)
    const filteredOtherAllocations = useMemo(() => {
        return otherAllocations.filter(c => {
            if (otherAllocStatusFilter === 'pending' && c.has_transferred) return false;
            if (otherAllocStatusFilter === 'transferred' && !c.has_transferred) return false;

            if (otherAllocSearch.trim()) {
                const q = otherAllocSearch.toLowerCase().trim();
                const matchVin = (c.vin || '').toLowerCase().includes(q);
                const matchModel = (c.dong_xe || '').toLowerCase().includes(q) || (c.ten_kx || '').toLowerCase().includes(q);
                const matchColor = (c.ten_mau || '').toLowerCase().includes(q) || (c.ma_mau || '').toLowerCase().includes(q);
                const matchKh = (c.ten_khach_hang || '').toLowerCase().includes(q);
                const matchHd = (c.so_hd || '').toLowerCase().includes(q);
                const matchSr = (c.ten_ttcp_phan_bo || '').toLowerCase().includes(q) || (c.ttcp_phan_bo || '').toLowerCase().includes(q);
                const matchTvbh = (c.tvbh_xuat || '').toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchColor && !matchKh && !matchHd && !matchSr && !matchTvbh) return false;
            }
            return true;
        });
    }, [otherAllocations, otherAllocStatusFilter, otherAllocSearch]);

    const countOtherAllocPending = useMemo(() => otherAllocations.filter(c => !c.has_transferred).length, [otherAllocations]);
    const countOtherAllocTransferred = useMemo(() => otherAllocations.filter(c => c.has_transferred).length, [otherAllocations]);

    // Sao chép danh sách xe SR khác phân bổ nhưng Thuận An xuất HĐ gửi Zalo
    const handleCopyZaloOtherAllocations = () => {
        const listToCopy = filteredOtherAllocations;
        if (!listToCopy.length) {
            showToast('Thông báo', 'Không có xe nào trong danh sách để sao chép', 'info');
            return;
        }

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        let text = `📋 DANH SÁCH XE PHÂN BỔ SHOWROOM KHÁC — THUẬN AN XUẤT HÓA ĐƠN\n`;
        text += `(Thời điểm kiểm tra: ${timeStr} | Kỳ xem: Từ ${otherAllocFromDate} | Tổng: ${listToCopy.length} xe)\n`;
        text += `👉 Đề nghị Kế toán & Quản lý các Showroom hỗ trợ lập phiếu ĐNX (Mã GD = 9) điều chuyển ĐĐKD về cho Showroom Thuận An (02.01.08):\n`;
        text += `========================================\n\n`;

        // Gom theo Showroom phân bổ
        const bySr = new Map<string, typeof listToCopy>();
        listToCopy.forEach(c => {
            const srName = c.ten_ttcp_phan_bo || c.ttcp_phan_bo || 'Showroom khác';
            if (!bySr.has(srName)) bySr.set(srName, []);
            bySr.get(srName)!.push(c);
        });

        bySr.forEach((cars, srName) => {
            text += `🏢 ${srName.toUpperCase()} (${cars.length} xe):\n`;
            cars.forEach((c, idx) => {
                text += `  ${idx + 1}. VIN: ${c.vin}\n`;
                text += `     • Dòng xe: ${c.dong_xe || c.loai_xe} (${c.ten_mau || c.ma_mau})\n`;
                text += `     • HĐ Thuận An: ${c.so_hd} (Ngày: ${c.ngay_hd || 'N/A'})\n`;
                text += `     • KH: ${c.ten_khach_hang || 'Chưa rõ'} | TVBH xuất: ${c.tvbh_xuat || 'Chưa rõ'}\n`;
                text += `     • Trạng thái: ${c.has_transferred ? '✅ Đã có ĐNX' : '🚨 Chưa lập ĐNX về Thuận An'}\n`;
            });
            text += `\n`;
        });

        text += `========================================\n`;
        text += `👉 Kính nhờ Kế toán các đơn vị kiểm tra và hoàn tất điều chuyển ĐĐKD sớm nhất! Trân trọng cảm ơn!`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách ${listToCopy.length} xe gửi Zalo!`, 'success', 2500);
    };

    // Báo số lượng cho parent
    useEffect(() => {
        if (onCountsChange) {
            onCountsChange({
                carsCount: cars.filter(c => c.isTonKho).length,
                td4Count: countTd4Approved,
                dnxCount: countAlertThuanAn,
                missingYardCount: missingYardItems.filter(c => c.isViolation).length,
                k83Count: k83Items.length,
                k83DiffCount: countK83Diff,
                allAlertCount: allCombinedAlerts.length,
                thuanAnAllocationsCount: thuanAnAllocations.length,
                crossPendingCount: countCrossPending,
                otherShowroomAllocationsCount: otherAllocations.length,
                otherAllocPendingCount: countOtherAllocPending
            });
        }
    }, [cars.length, countTd4Approved, countAlertThuanAn, missingYardItems, k83Items.length, countK83Diff, allCombinedAlerts.length, thuanAnAllocations.length, countCrossPending, otherAllocations.length, countOtherAllocPending, onCountsChange]);

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
                                onNavigateToTab={onNavigateToTab}
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
                    {/* THANH CÔNG CỤ DUY NHẤT (Single Ribbon Toolbar ~36px) */}
                    <div className="bg-[#F8FAFC] border-b border-slate-300 px-2 py-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-800 shrink-0 shadow-2xs">
                        {/* 3 Tabs Phân Hệ Đối Soát Tinh Gọn (Đã gom Cảnh Báo Sai Lệch & Tra Soát K83 làm 1) */}
                        <div className="flex items-center gap-1 bg-slate-200/90 p-0.5 rounded-lg border border-slate-300">
                            {/* Tab 1: Cảnh Báo Sai Lệch Kho (Kho K83 vs Bãi Thuận An thực tế) */}
                            <button
                                type="button"
                                onClick={() => {
                                    setReconcileSubTab('k83_reconcile');
                                    setK83StatusFilter('diff');
                                }}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    reconcileSubTab === 'k83_reconcile' || reconcileSubTab === 'all' || reconcileSubTab === 'td4' || reconcileSubTab === 'dnx' || reconcileSubTab === 'missing_yard'
                                        ? 'bg-white text-rose-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className="fa-solid fa-triangle-exclamation text-[11px] text-amber-500"></i>
                                <span>Cảnh Báo Sai Lệch</span>
                                {countK83Diff > 0 ? (
                                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-rose-600 text-white font-mono font-bold animate-pulse">
                                        {countK83Diff}
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-emerald-600 text-white font-mono font-bold">
                                        Khớp
                                    </span>
                                )}
                            </button>

                            {/* Tab 3: SR Khác Xuất HĐ */}
                            <button
                                type="button"
                                onClick={() => setReconcileSubTab('thuan_an_allocations')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    reconcileSubTab === 'thuan_an_allocations'
                                        ? 'bg-white text-rose-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className="fa-solid fa-file-invoice text-[11px] text-rose-500"></i>
                                <span>SR Khác Xuất HĐ</span>
                                {countCrossPending > 0 ? (
                                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-rose-600 text-white font-mono font-bold animate-pulse" title="Cần lập ĐNX điều chuyển ĐĐKD">
                                        {countCrossPending}
                                    </span>
                                ) : (
                                    <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-slate-300 text-slate-700 font-mono font-bold">
                                        0
                                    </span>
                                )}
                            </button>

                            {/* Tab 4: SR Khác PB – TA Xuất HĐ */}
                            <button
                                type="button"
                                onClick={() => setReconcileSubTab('other_sr_allocations')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    reconcileSubTab === 'other_sr_allocations'
                                        ? 'bg-white text-indigo-700 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                            >
                                <i className="fa-solid fa-arrow-right-arrow-left text-[11px] text-indigo-500"></i>
                                <span>SR Khác PB – TA Xuất HĐ</span>
                                <div className="flex items-center gap-1">
                                    {otherAllocations.length > 0 && (
                                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-indigo-100 text-indigo-800 font-mono font-bold">
                                            {otherAllocations.length}
                                        </span>
                                    )}
                                    {countOtherAllocPending > 0 && (
                                        <span className="px-1.5 py-0.2 text-[9px] rounded-full bg-amber-500 text-white font-mono font-bold animate-pulse" title={`${countOtherAllocPending} xe chưa có ĐNX về Thuận An`}>
                                            {countOtherAllocPending}
                                        </span>
                                    )}
                                </div>
                            </button>
                        </div>

                        {/* Bộ Lọc Tuỳ Biến Theo Phân Hệ Đang Chọn */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {reconcileSubTab === 'k83_reconcile' && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Trạng thái:</span>
                                        <select
                                            value={k83StatusFilter}
                                            onChange={e => setK83StatusFilter(e.target.value as any)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] font-bold text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[175px]"
                                        >
                                            <option value="diff">🚨 Chỉ xem xe lệch ({countK83Diff})</option>
                                            <option value="all">Tất cả ({k83Items.length} xe)</option>
                                            <option value="yard_only">🚨 Thừa bãi TT ({countK83YardOnly})</option>
                                            <option value="cyber_only">⚠️ Thừa Cyber K83 ({countK83CyberOnly})</option>
                                            <option value="matched">✅ Khớp chuẩn ({countK83Matched})</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">TVBH:</span>
                                        <select
                                            value={k83TvbhFilter}
                                            onChange={e => setK83TvbhFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                                        >
                                            <option value="all">Tất cả ({uniqueK83Tvbhs.length})</option>
                                            {uniqueK83Tvbhs.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                                        <select
                                            value={k83ModelFilter}
                                            onChange={e => setK83ModelFilter(e.target.value)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[100px]"
                                        >
                                            <option value="all">Tất cả dòng</option>
                                            {uniqueK83Models.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

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

                            {reconcileSubTab === 'thuan_an_allocations' && (
                                <>
                                    {allocSubMode === 'allocated_unbilled' ? (
                                        <>
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Dòng xe:</span>
                                                <select
                                                    value={allocModelFilter}
                                                    onChange={e => setAllocModelFilter(e.target.value)}
                                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[110px]"
                                                >
                                                    <option value="all">Tất cả ({thuanAnAllocations.length})</option>
                                                    {uniqueAllocModels.map(m => (
                                                        <option key={m} value={m}>{m}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Vị trí kho:</span>
                                                <select
                                                    value={allocLocationFilter}
                                                    onChange={e => setAllocLocationFilter(e.target.value)}
                                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[140px]"
                                                >
                                                    <option value="all">Tất cả vị trí</option>
                                                    {uniqueAllocLocations.map(l => (
                                                        <option key={l} value={l}>{l}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-1">
                                                <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Kỳ xem:</span>
                                                <select
                                                    value={crossFromDate}
                                                    onChange={e => {
                                                        const newDate = e.target.value;
                                                        setCrossFromDate(newDate);
                                                        handleFetchCrossAllocations(newDate, true, false);
                                                    }}
                                                    className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] font-bold text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[125px]"
                                                >
                                                    <option value="2026-01-01">📅 Toàn bộ 2026</option>
                                                    <option value="2026-08-01">📅 Từ 01/08/2026</option>
                                                    <option value="2026-09-01">📅 Từ 01/09/2026</option>
                                                    <option value="2026-10-01">📅 Từ 01/10/2026</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <span className="h-5 px-1.5 bg-rose-50 border border-rose-300 rounded-xs text-[10px] sm:text-[11px] font-bold text-rose-800 flex items-center gap-1 shadow-inner">
                                                    <i className="fa-solid fa-circle-exclamation text-rose-600 text-[9px]"></i>
                                                    <span>Chưa điều chuyển: <strong>{countCrossPending}</strong> xe</span>
                                                </span>
                                            </div>

                                            {selectedCrossVins.size > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const carsToTransfer = crossAllocations.filter(c => selectedCrossVins.has(c.vin));
                                                        handleOpenTransferModal(carsToTransfer);
                                                    }}
                                                    className="h-5 px-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xs text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer animate-pulse"
                                                >
                                                    <i className="fa-solid fa-bolt text-[9px]"></i>
                                                    <span>Điều chuyển ĐĐKD ({selectedCrossVins.size})</span>
                                                </button>
                                            )}
                                        </>
                                    )}
                                </>
                            )}

                            {reconcileSubTab === 'other_sr_allocations' && (
                                <>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Kỳ xem:</span>
                                        <select
                                            value={otherAllocFromDate}
                                            onChange={e => {
                                                const newDate = e.target.value;
                                                setOtherAllocFromDate(newDate);
                                                handleFetchOtherAllocations(newDate, true, false);
                                            }}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] font-bold text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[125px]"
                                        >
                                            <option value="2026-08-01">📅 Từ 01/08/2026</option>
                                            <option value="2026-09-01">📅 Từ 01/09/2026</option>
                                            <option value="2026-10-01">📅 Từ 01/10/2026</option>
                                            <option value="2026-01-01">📅 Toàn bộ 2026</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Trạng thái:</span>
                                        <select
                                            value={otherAllocStatusFilter}
                                            onChange={e => setOtherAllocStatusFilter(e.target.value as any)}
                                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] font-bold text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[165px]"
                                        >
                                            <option value="pending">🚨 Chưa có ĐNX về ({countOtherAllocPending})</option>
                                            <option value="all">Tất cả ({otherAllocations.length} xe)</option>
                                            <option value="transferred">✅ Đã có ĐNX ({countOtherAllocTransferred})</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <span className="h-5 px-1.5 bg-indigo-50 border border-indigo-200 rounded-xs text-[10px] sm:text-[11px] font-bold text-indigo-800 flex items-center gap-1 shadow-inner">
                                            <i className="fa-solid fa-bell text-indigo-600 text-[9px]"></i>
                                            <span>Chờ ĐNX về TA: <strong>{countOtherAllocPending}</strong> xe</span>
                                        </span>
                                    </div>
                                </>
                            )}

                            {(reconcileSubTab === 'all' || reconcileSubTab === 'td4' || reconcileSubTab === 'dnx' || reconcileSubTab === 'missing_yard') && (
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Lọc loại:</span>
                                    <select
                                        value={allAlertFilter}
                                        onChange={e => {
                                            setAllAlertFilter(e.target.value as any);
                                            setReconcileSubTab('all');
                                        }}
                                        className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] font-bold text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[230px]"
                                    >
                                        <option value="all">🚨 Tất cả cảnh báo ({allCombinedAlerts.length})</option>
                                        <option value="yard_not_cyber">🚨 Về bãi chưa nhập K83 ({allCombinedAlerts.filter(c => c.type === 'YARD_NOT_IN_CYBER').length})</option>
                                        <option value="cyber_not_yard">⚠️ Sổ K83 thiếu bãi ({allCombinedAlerts.filter(c => c.type === 'CYBER_NOT_IN_YARD').length})</option>
                                        <option value="td4">🚨 TD4 quá hạn tồn bãi ({allCombinedAlerts.filter(c => c.type === 'TD4').length})</option>
                                        <option value="missing_yard">⚠️ Xuất bãi trái quy trình ({allCombinedAlerts.filter(c => c.type === 'MISSING_YARD').length})</option>
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
                                        reconcileSubTab === 'other_sr_allocations' ? otherAllocSearch :
                                        reconcileSubTab === 'thuan_an_allocations' ? (allocSubMode === 'cross_showroom_billed' ? crossSearch : allocSearch) :
                                        reconcileSubTab === 'k83_reconcile' ? k83Search :
                                        reconcileSubTab === 'td4' ? td4Search :
                                        reconcileSubTab === 'dnx' ? reconcileSearch :
                                        reconcileSubTab === 'missing_yard' ? missingYardSearch : allAlertSearch
                                    }
                                    onChange={e => {
                                        if (reconcileSubTab === 'other_sr_allocations') setOtherAllocSearch(e.target.value);
                                        else if (reconcileSubTab === 'thuan_an_allocations') {
                                            if (allocSubMode === 'cross_showroom_billed') setCrossSearch(e.target.value);
                                            else setAllocSearch(e.target.value);
                                        }
                                        else if (reconcileSubTab === 'k83_reconcile') setK83Search(e.target.value);
                                        else if (reconcileSubTab === 'td4') setTd4Search(e.target.value);
                                        else if (reconcileSubTab === 'dnx') setReconcileSearch(e.target.value);
                                        else if (reconcileSubTab === 'missing_yard') setMissingYardSearch(e.target.value);
                                        else setAllAlertSearch(e.target.value);
                                    }}
                                    placeholder="Tìm VIN, số phiếu, TVBH, KH..."
                                    className="h-5 w-36 sm:w-48 px-1.5 pr-4 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-900 outline-none focus:border-blue-600 shadow-inner"
                                />
                                {(reconcileSubTab === 'other_sr_allocations' ? otherAllocSearch : reconcileSubTab === 'thuan_an_allocations' ? (allocSubMode === 'cross_showroom_billed' ? crossSearch : allocSearch) : reconcileSubTab === 'k83_reconcile' ? k83Search : reconcileSubTab === 'td4' ? td4Search : reconcileSubTab === 'dnx' ? reconcileSearch : reconcileSubTab === 'missing_yard' ? missingYardSearch : allAlertSearch) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (reconcileSubTab === 'other_sr_allocations') setOtherAllocSearch('');
                                            else if (reconcileSubTab === 'thuan_an_allocations') {
                                                if (allocSubMode === 'cross_showroom_billed') setCrossSearch('');
                                                else setAllocSearch('');
                                            }
                                            else if (reconcileSubTab === 'k83_reconcile') setK83Search('');
                                            else if (reconcileSubTab === 'td4') setTd4Search('');
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
                                onClick={() => {
                                    if (reconcileSubTab === 'other_sr_allocations') {
                                        handleFetchOtherAllocations(otherAllocFromDate, true, false);
                                    } else if (reconcileSubTab === 'thuan_an_allocations') {
                                        if (allocSubMode === 'cross_showroom_billed') {
                                            handleFetchCrossAllocations(crossFromDate, true, false);
                                        } else {
                                            handleFetchThuanAnAllocations(true);
                                        }
                                    } else {
                                        handleFetchAllReconcile();
                                    }
                                }}
                                disabled={isLoadingReconcile || isLoadingTd4 || isLoadingMissingYard || isLoadingK83 || isLoadingAllocations || isLoadingCrossAllocations || isLoadingOtherAllocations}
                                className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer disabled:opacity-50 text-[10px] sm:text-[11px]"
                                title="Nạp lại dữ liệu"
                            >
                                <i className={`fas fa-rotate text-blue-600 text-[10px] ${isLoadingReconcile || isLoadingTd4 || isLoadingMissingYard || isLoadingK83 || isLoadingAllocations || isLoadingCrossAllocations || isLoadingOtherAllocations ? 'animate-spin' : ''}`}></i>
                                <span className="hidden sm:inline">Làm mới</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (reconcileSubTab === 'other_sr_allocations') handleCopyZaloOtherAllocations();
                                    else if (reconcileSubTab === 'thuan_an_allocations') handleCopyZaloAllocations();
                                    else if (reconcileSubTab === 'k83_reconcile') handleCopyZaloK83List();
                                    else if (reconcileSubTab === 'td4') handleCopyZaloTd4List();
                                    else if (reconcileSubTab === 'dnx') handleCopyZaloDnxList();
                                    else if (reconcileSubTab === 'missing_yard') handleCopyZaloMissingYardList();
                                    else handleCopyZaloAllReconcile();
                                }}
                                className={`px-2 py-0.5 text-white rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer ${
                                    reconcileSubTab === 'other_sr_allocations' ? 'bg-indigo-700 hover:bg-indigo-800' : reconcileSubTab === 'thuan_an_allocations' ? 'bg-emerald-700 hover:bg-emerald-800' : reconcileSubTab === 'k83_reconcile' ? 'bg-sky-700 hover:bg-sky-800' : reconcileSubTab === 'td4' ? 'bg-purple-700 hover:bg-purple-800' : reconcileSubTab === 'dnx' ? 'bg-red-600 hover:bg-red-700' : reconcileSubTab === 'missing_yard' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
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
                                                                {c.type === 'YARD_NOT_IN_CYBER' ? (
                                                                    <span className="px-1 py-0.1 text-[8.5px] bg-red-100 text-red-700 font-extrabold rounded border border-red-300 shrink-0">
                                                                        🚨 CHƯA NHẬP K83
                                                                    </span>
                                                                ) : c.type === 'CYBER_NOT_IN_YARD' ? (
                                                                    <span className="px-1 py-0.1 text-[8.5px] bg-indigo-100 text-indigo-900 font-extrabold rounded border border-indigo-300 shrink-0">
                                                                        ⚠️ SỔ K83 THIẾU BÃI
                                                                    </span>
                                                                ) : c.type === 'TD4' ? (
                                                                    <span className="px-1 py-0.1 text-[8.5px] bg-purple-100 text-purple-900 font-extrabold rounded border border-purple-300 shrink-0">
                                                                        🚨 TD4 QUÁ HẠN
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-1 py-0.1 text-[8.5px] bg-amber-100 text-amber-900 font-extrabold rounded border border-amber-300 shrink-0">
                                                                        ⚠️ XUẤT TRÁI PHÉP
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
                                                            <div className={`font-bold truncate ${c.type === 'YARD_NOT_IN_CYBER' ? 'text-red-700' : c.type === 'TD4' ? 'text-purple-900' : c.type === 'CYBER_NOT_IN_YARD' ? 'text-indigo-900' : 'text-amber-800'}`} title={c.alertTitle}>
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
                                        Tổng sai lệch: <strong className="text-red-700 font-mono">{allCombinedAlerts.length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-red-700 font-bold">
                                        🚨 Về bãi chưa nhập K83: <strong className="font-mono">{allCombinedAlerts.filter(c => c.type === 'YARD_NOT_IN_CYBER').length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-indigo-800 font-bold">
                                        ⚠️ Sổ K83 thiếu bãi: <strong className="font-mono">{allCombinedAlerts.filter(c => c.type === 'CYBER_NOT_IN_YARD').length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-purple-800 font-bold">
                                        🚨 TD4 quá hạn tồn: <strong className="font-mono">{allCombinedAlerts.filter(c => c.type === 'TD4').length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-amber-800 font-bold">
                                        ⚠️ Xuất trái quy trình: <strong className="font-mono">{allCombinedAlerts.filter(c => c.type === 'MISSING_YARD').length}</strong> xe
                                    </span>
                                </div>
                                <div className="text-slate-500 text-[10px] italic">
                                    * Chọn dòng hoặc nhấp đúp để sao chép số khung. Dùng ô "Lọc loại" trên thanh công cụ để lọc nhanh.
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

            {/* ========================================================================= */}
            {/* SUB-VIEW 4: TRA SOÁT TỒN KHO CYBER K83 VÀ BÃI THUẬN AN THỰC TẾ             */}
            {/* ========================================================================= */}
            {reconcileSubTab === 'k83_reconcile' && (
                <>
                    {/* KPI SUMMARY CARDS */}
                    <div className="bg-gradient-to-r from-slate-100 via-sky-50 to-amber-50 p-2 border-b border-[#CCCCCC] shrink-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                            {/* 1. Tổng Tồn Sổ Cyber K83 */}
                            <div 
                                onClick={() => setK83StatusFilter('all')}
                                className="bg-white/90 border border-blue-200 rounded p-1.5 shadow-2xs cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                            >
                                <div className="text-[10px] text-blue-800 font-bold uppercase flex items-center justify-between">
                                    <span>Sổ Cyber K83</span>
                                    <i className="fas fa-book text-blue-500"></i>
                                </div>
                                <div className="text-lg font-black text-blue-900 mt-0.5 leading-none font-mono">
                                    {countK83TotalCyber} <span className="text-[10px] font-normal text-slate-500">xe</span>
                                </div>
                                <div className="text-[9.5px] text-slate-500 mt-1 truncate">Mã kho K83 hệ thống</div>
                            </div>

                            {/* 2. Tổng Bãi Thuận An Thực Tế */}
                            <div 
                                onClick={() => setK83StatusFilter('all')}
                                className="bg-white/90 border border-emerald-200 rounded p-1.5 shadow-2xs cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
                            >
                                <div className="text-[10px] text-emerald-800 font-bold uppercase flex items-center justify-between">
                                    <span>Bãi Thuận An TT</span>
                                    <i className="fas fa-warehouse text-emerald-500"></i>
                                </div>
                                <div className="text-lg font-black text-emerald-900 mt-0.5 leading-none font-mono">
                                    {countK83TotalYard} <span className="text-[10px] font-normal text-slate-500">xe</span>
                                </div>
                                <div className="text-[9.5px] text-slate-500 mt-1 truncate">Thực tế nằm tại bãi</div>
                            </div>

                            {/* 3. Khớp Chuẩn Cả Hai */}
                            <div 
                                onClick={() => setK83StatusFilter('matched')}
                                className={`border rounded p-1.5 shadow-2xs cursor-pointer transition-all ${
                                    k83StatusFilter === 'matched' 
                                        ? 'bg-emerald-100 border-emerald-500 ring-1 ring-emerald-400' 
                                        : 'bg-white/90 border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/50'
                                }`}
                            >
                                <div className="text-[10px] text-emerald-700 font-bold uppercase flex items-center justify-between">
                                    <span>Khớp Chuẩn</span>
                                    <i className="fas fa-check-circle text-emerald-600"></i>
                                </div>
                                <div className="text-lg font-black text-emerald-700 mt-0.5 leading-none font-mono">
                                    {countK83Matched} <span className="text-[10px] font-normal text-slate-500">xe</span>
                                </div>
                                <div className="text-[9.5px] text-emerald-600 mt-1 truncate">Có K83 & có tại bãi</div>
                            </div>

                            {/* 4. Thừa Sổ Cyber K83 / Thiếu Bãi */}
                            <div 
                                onClick={() => setK83StatusFilter('cyber_only')}
                                className={`border rounded p-1.5 shadow-2xs cursor-pointer transition-all ${
                                    k83StatusFilter === 'cyber_only' 
                                        ? 'bg-rose-100 border-rose-500 ring-1 ring-rose-400' 
                                        : 'bg-white/90 border-rose-300 hover:border-rose-500 hover:bg-rose-50/50'
                                }`}
                            >
                                <div className="text-[10px] text-rose-700 font-bold uppercase flex items-center justify-between">
                                    <span>Thừa Cyber K83</span>
                                    <i className="fas fa-arrow-circle-down text-rose-600"></i>
                                </div>
                                <div className="text-lg font-black text-rose-700 mt-0.5 leading-none font-mono">
                                    {countK83CyberOnly} <span className="text-[10px] font-normal text-slate-500">xe</span>
                                </div>
                                <div className="text-[9.5px] text-rose-600 mt-1 truncate">Sổ K83 còn, bãi thiếu</div>
                            </div>

                            {/* 5. Thừa Bãi TT / Thiếu Sổ K83 */}
                            <div 
                                onClick={() => setK83StatusFilter('yard_only')}
                                className={`border rounded p-1.5 shadow-2xs cursor-pointer transition-all ${
                                    k83StatusFilter === 'yard_only' 
                                        ? 'bg-amber-100 border-amber-500 ring-1 ring-amber-400' 
                                        : 'bg-white/90 border-amber-300 hover:border-amber-500 hover:bg-amber-50/50'
                                }`}
                            >
                                <div className="text-[10px] text-amber-700 font-bold uppercase flex items-center justify-between">
                                    <span>Thừa Bãi TT</span>
                                    <i className="fas fa-arrow-circle-up text-amber-600"></i>
                                </div>
                                <div className="text-lg font-black text-amber-700 mt-0.5 leading-none font-mono">
                                    {countK83YardOnly} <span className="text-[10px] font-normal text-slate-500">xe</span>
                                </div>
                                <div className="text-[9.5px] text-amber-600 mt-1 truncate">Bãi có xe, sổ Cyber thiếu</div>
                            </div>

                            {/* 6. Tổng Lệch Cần Xử Lý */}
                            <div 
                                onClick={() => setK83StatusFilter('diff')}
                                className={`border rounded p-1.5 shadow-2xs cursor-pointer transition-all ${
                                    k83StatusFilter === 'diff' 
                                        ? 'bg-red-100 border-red-500 ring-2 ring-red-400' 
                                        : 'bg-gradient-to-br from-red-50 to-rose-100 border-red-300 hover:border-red-500'
                                }`}
                            >
                                <div className="text-[10px] text-red-800 font-extrabold uppercase flex items-center justify-between">
                                    <span>Tổng Lệch</span>
                                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                                </div>
                                <div className="text-lg font-black text-red-700 mt-0.5 leading-none font-mono">
                                    {countK83Diff} <span className="text-[10px] font-normal text-slate-500">xe</span>
                                </div>
                                <div className="text-[9.5px] text-red-600 font-semibold mt-1 truncate">Cần xác minh & xử lý</div>
                            </div>
                        </div>
                    </div>

                    {/* DATA TABLE (K83 VS BÃI THUẬN AN) */}
                    <div className="flex-1 overflow-auto bg-white">
                        {isLoadingK83 ? (
                            <div className="p-12 text-center text-slate-500 text-xs">
                                <i className="fas fa-spinner fa-spin mr-2 text-blue-600 text-base"></i>
                                Đang tải và đối soát dữ liệu kho Cyber K83 với bãi Thuận An thực tế...
                            </div>
                        ) : filteredK83Items.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 text-xs">
                                <i className="fas fa-clipboard-check text-green-500 text-3xl mb-2 block"></i>
                                {k83StatusFilter === 'diff'
                                    ? 'Tuyệt vời! Toàn bộ xe tồn kho K83 và bãi xe Thuận An thực tế hoàn toàn khớp chuẩn.'
                                    : 'Không tìm thấy xe nào phù hợp với bộ lọc hiện tại.'}
                            </div>
                        ) : (
                            <table className="w-full text-[11px] text-left border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-[#E8F0FE] text-slate-800 font-bold border-b border-[#CCCCCC] sticky top-0 z-10 select-none shadow-2xs text-[10.5px]">
                                        <th className="py-1 px-1 text-center w-7 border-r border-[#CCCCCC]">#</th>
                                        <th className="py-1 px-2 border-r border-[#CCCCCC] w-[18%]">Số VIN & Phân Loại</th>
                                        <th className="py-1 px-2 border-r border-[#CCCCCC] w-[15%]">Dòng Xe & Màu</th>
                                        <th className="py-1 px-2 border-r border-[#CCCCCC] w-[18%]">Sổ Cyber (Kho K83)</th>
                                        <th className="py-1 px-2 border-r border-[#CCCCCC] w-[18%]">Thực Tế Bãi Thuận An</th>
                                        <th className="py-1 px-2 border-r border-[#CCCCCC] w-[14%]">TVBH & Hợp Đồng</th>
                                        <th className="py-1 px-2 w-[17%]">Lệch Ở Đâu & Hướng Xử Lý</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E1E1E1]">
                                    {filteredK83Items.map((item, idx) => {
                                        const isSelected = selectedK83RowIdx === idx;
                                        const isCyberOnly = item.reconcileType === 'CYBER_K83_ONLY';
                                        const isYardOnly = item.reconcileType === 'YARD_ONLY';
                                        const isMatched = item.reconcileType === 'MATCHED';

                                        return (
                                            <tr
                                                key={item.id}
                                                onClick={() => {
                                                    setSelectedK83RowIdx(idx);
                                                    handleOpenDetailModal(item, 'k83_reconcile');
                                                }}
                                                className={`cursor-pointer transition-colors ${
                                                    isSelected
                                                        ? 'bg-blue-100 font-medium'
                                                        : isCyberOnly
                                                            ? 'bg-rose-50/50 hover:bg-rose-100/60'
                                                            : isYardOnly
                                                                ? 'bg-amber-50/50 hover:bg-amber-100/60'
                                                                : 'bg-emerald-50/20 hover:bg-emerald-100/30'
                                                }`}
                                            >
                                                {/* STT */}
                                                <td className="py-1 px-1 text-center text-slate-500 font-mono text-[10px] border-r border-[#EBEBEB]">
                                                    {idx + 1}
                                                </td>

                                                {/* Số VIN & Phân Loại Lệch */}
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
                                                    <div className="mt-0.5">
                                                        {isCyberOnly && (
                                                            <span className="inline-block px-1 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300 rounded-xs">
                                                                Thừa Cyber / Thiếu Bãi
                                                            </span>
                                                        )}
                                                        {isYardOnly && (
                                                            <span className="inline-block px-1 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded-xs">
                                                                Thừa Bãi / Thiếu Cyber
                                                            </span>
                                                        )}
                                                        {isMatched && (
                                                            <span className="inline-block px-1 py-0.2 text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xs">
                                                                Khớp Chuẩn
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Dòng Xe & Màu */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate">{item.carModel || '-'}</div>
                                                    <div className="text-[10px] text-slate-500 truncate">{item.color || '-'}</div>
                                                </td>

                                                 {/* Sổ Cyber (Kho K83) */}
                                                 <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                     {item.hasCyberK83 ? (
                                                         <div>
                                                             <span className="inline-flex items-center gap-1 px-1 py-0.2 text-[9.5px] font-bold bg-blue-100 text-blue-900 border border-blue-300 rounded-xs">
                                                                 <i className="fas fa-check text-[8px] text-blue-600"></i> Kho K83
                                                             </span>
                                                             <div className="text-[10px] text-slate-600 mt-0.5 space-y-0.5">
                                                                 {item.soHdCyber && (
                                                                     <div className="text-amber-800 font-medium truncate">
                                                                         HĐ: {item.soHdCyber}
                                                                     </div>
                                                                 )}
                                                                 {item.soCtTd4 ? (
                                                                     <div>
                                                                         <span className={`inline-flex items-center gap-1 px-1 py-0.2 text-[8.5px] font-bold rounded-xs border ${
                                                                             item.isTd4Approved 
                                                                                 ? 'bg-purple-100 text-purple-900 border-purple-300' 
                                                                                 : 'bg-amber-100 text-amber-900 border-amber-300'
                                                                         }`}>
                                                                             <i className={`fas ${item.isTd4Approved ? 'fa-check-double text-purple-600' : 'fa-clock text-amber-600'} text-[7.5px]`}></i>
                                                                             TD4: {item.soCtTd4} {item.td4MaPostLabel ? `[${item.td4MaPostLabel}]` : ''}
                                                                         </span>
                                                                     </div>
                                                                 ) : null}
                                                                 {item.soCtDnx ? (
                                                                     <div>
                                                                         <span className="inline-flex items-center gap-1 px-1 py-0.2 text-[8.5px] font-bold rounded-xs bg-purple-100 text-purple-900 border border-purple-300" title={`Lộ trình ĐNX: ${item.dnxTenKhoXuat || item.dnxMaKhoXuat || 'K83'} ➔ ${item.dnxTenKhoNhan || item.dnxMaKhoNhan || 'Showroom'}`}>
                                                                             <i className="fas fa-file-invoice text-[7.5px] text-purple-600"></i>
                                                                             ĐNX: {item.soCtDnx}
                                                                         </span>
                                                                         {(item.dnxMaKhoXuat || item.dnxMaKhoNhan) && (
                                                                             <div className="text-[9px] text-purple-700 font-mono mt-0.5 truncate">
                                                                                 {item.dnxTenKhoXuat || item.dnxMaKhoXuat} ➔ {item.dnxTenKhoNhan || item.dnxMaKhoNhan}
                                                                             </div>
                                                                         )}
                                                                     </div>
                                                                 ) : null}
                                                                 {!item.soCtTd4 && !item.soCtDnx && !item.soHdCyber ? (
                                                                     <span className="text-slate-500">Xe mới chưa gắn HĐ</span>
                                                                 ) : null}
                                                             </div>
                                                         </div>
                                                     ) : (
                                                         <div className="space-y-0.5">
                                                             <div className="text-rose-700 text-[10px] font-semibold flex items-center gap-1">
                                                                 <i className="fas fa-times-circle text-[8.5px]"></i>
                                                                 <span>Thiếu sổ K83</span>
                                                             </div>
                                                             {item.maKhoCyber && item.maKhoCyber !== 'CHƯA_NHẬP' ? (
                                                                 <div className="text-[9.5px] text-slate-600 truncate" title={item.tenKhoCyber || item.maKhoCyber}>
                                                                     Sổ: <span className="font-semibold text-slate-800">{item.tenKhoCyber || item.maKhoCyber}</span>
                                                                 </div>
                                                             ) : (
                                                                 <div className="text-[9.5px] text-slate-500 italic">Chưa nhập Cyber</div>
                                                             )}
                                                             {item.hasDnx ? (
                                                                 <div className="mt-0.5">
                                                                     <span className="inline-flex items-center gap-1 px-1 py-0.2 text-[8.5px] font-bold rounded-xs bg-amber-100 text-amber-900 border border-amber-300" title={`Lộ trình ĐNX: ${item.dnxTenKhoXuat || item.dnxMaKhoXuat || item.maKhoCyber} ➔ ${item.dnxTenKhoNhan || item.dnxMaKhoNhan || 'K83'}`}>
                                                                         <i className="fas fa-file-invoice text-[7.5px] text-amber-600"></i>
                                                                         ĐNX: {item.soCtDnx} (Chờ PNK)
                                                                     </span>
                                                                     {(item.dnxMaKhoXuat || item.dnxMaKhoNhan) && (
                                                                         <div className="text-[9px] text-amber-800 font-mono mt-0.5 truncate">
                                                                             {item.dnxTenKhoXuat || item.dnxMaKhoXuat} ➔ {item.dnxTenKhoNhan || item.dnxMaKhoNhan}
                                                                         </div>
                                                                     )}
                                                                 </div>
                                                             ) : (
                                                                 <div className="mt-0.5">
                                                                     <span className="inline-flex items-center gap-1 px-1 py-0.2 text-[8px] font-medium rounded-xs bg-rose-50 text-rose-700 border border-rose-200">
                                                                         Chưa có ĐNX
                                                                     </span>
                                                                 </div>
                                                             )}
                                                         </div>
                                                     )}
                                                 </td>

                                                {/* Thực Tế Bãi Thuận An */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    {item.hasYardStock ? (
                                                        <div>
                                                            <span className="inline-flex items-center gap-1 px-1 py-0.2 text-[9.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xs">
                                                                <i className="fas fa-check text-[8px] text-emerald-600"></i> Bãi Thuận An
                                                            </span>
                                                            <div className="text-[10px] text-slate-600 mt-0.5 truncate">
                                                                {item.mucPin ? `Pin: ${item.mucPin}` : ''}
                                                                {item.ngayNhanYard ? ` | Nhận: ${item.ngayNhanYard}` : ''}
                                                            </div>
                                                        </div>
                                                    ) : item.otherYardInfo?.khoName ? (
                                                        <div>
                                                            <span className={`inline-flex items-center gap-1 px-1 py-0.2 text-[9.5px] font-bold rounded-xs border ${
                                                                item.otherYardInfo.isTonKho
                                                                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                                                                    : 'bg-slate-100 text-slate-800 border-slate-300'
                                                            }`}>
                                                                <i className={`fas ${item.otherYardInfo.isTonKho ? 'fa-map-marker-alt text-purple-600' : 'fa-truck-arrow-right text-slate-600'} text-[8px]`}></i> {item.otherYardInfo.khoName}
                                                            </span>
                                                            {item.otherYardInfo.isTonKho ? (
                                                                <div className="text-[9.5px] text-purple-700 mt-0.5 italic truncate">
                                                                    Đang lưu tại bãi ngoài ({item.otherYardInfo.khoName})
                                                                </div>
                                                            ) : (
                                                                <div className="text-[9.5px] text-slate-600 mt-0.5 italic truncate">
                                                                    {item.otherYardInfo.ngayGiao ? `Đã xuất ngày: ${item.otherYardInfo.ngayGiao.slice(0, 10)}` : 'Đã xuất khỏi bãi'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-rose-700 italic text-[10px] font-medium">
                                                            <i className="fas fa-times-circle mr-1"></i>
                                                            Không có tại bãi Thuận An
                                                        </div>
                                                    )}
                                                </td>

                                                {/* TVBH & Hợp Đồng */}
                                                <td className="py-1 px-2 border-r border-[#EBEBEB] overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate" title={item.tvbhCyber}>
                                                        {item.tvbhCyber || 'Chưa rõ'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 truncate" title={item.customerName}>
                                                        {item.customerName || (item.orderNumber ? `HĐ: ${item.orderNumber}` : '-')}
                                                    </div>
                                                </td>

                                                {/* Lệch Ở Đâu & Hướng Xử Lý */}
                                                <td className="py-1 px-2 overflow-hidden">
                                                    <div className={`text-[10px] font-bold leading-tight truncate ${
                                                        isCyberOnly ? 'text-rose-700' : isYardOnly ? 'text-amber-800' : 'text-emerald-700'
                                                    }`} title={item.discrepancyReason}>
                                                        {item.discrepancyReason}
                                                    </div>
                                                    <div className="text-[9.5px] text-slate-600 mt-0.5 truncate" title={item.actionRequired}>
                                                        👉 {item.actionRequired}
                                                    </div>
                                                    {/* CÁC NÚT THAO TÁC LIÊN KẾT NHANH */}
                                                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                                                        {onNavigateToTab && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onNavigateToTab('de_nghi_xuat', {
                                                                            vin: item.vin,
                                                                            fromWarehouse: item.tenKhoCyber?.includes('QL13') ? 'K87' : 'K87',
                                                                            toWarehouse: 'K83',
                                                                            customerName: item.customerName
                                                                        });
                                                                    }}
                                                                    className="px-1.5 py-0.5 rounded-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                                    title="Chuyển sang Lập Phiếu ĐNX cho xe này"
                                                                >
                                                                    <i className="fa-solid fa-truck text-[8px]"></i>
                                                                    <span>Lập ĐNX</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onNavigateToTab('tra_cuu_phieu', { vin: item.vin });
                                                                    }}
                                                                    className="px-1.5 py-0.5 rounded-xs bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                                    title="Tra cứu toàn bộ phiếu của xe này"
                                                                >
                                                                    <i className="fa-solid fa-file-invoice text-[8px] text-blue-600"></i>
                                                                    <span>Phiếu</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onNavigateToTab('ton_kho', { vin: item.vin });
                                                                    }}
                                                                    className="px-1.5 py-0.5 rounded-xs bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                                    title="Xem sổ tồn Cyber của xe này"
                                                                >
                                                                    <i className="fa-solid fa-warehouse text-[8px] text-blue-600"></i>
                                                                    <span>Sổ Tồn</span>
                                                                </button>
                                                            </>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setManualJourneyVin(item.vin);
                                                            }}
                                                            className="px-1.5 py-0.5 rounded-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                                                            title="Mở bảng tổng hợp hành trình xe"
                                                        >
                                                            <i className="fa-solid fa-route text-[8px]"></i>
                                                            <span>Hành Trình</span>
                                                        </button>
                                                    </div>
                                                    {item.responsiblePerson && (
                                                        <div className="mt-0.5">
                                                            <span className="inline-block px-1 py-0.1 text-[8.5px] font-semibold bg-slate-100 text-slate-700 border border-slate-300 rounded-xs">
                                                                Trách nhiệm: {item.responsiblePerson}
                                                            </span>
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

                    {/* STATUS BAR (K83 Reconcile) */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Hiển thị: <strong className="text-blue-900">{filteredK83Items.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span>
                                Tồn Cyber K83: <strong className="text-blue-800">{countK83TotalCyber}</strong> xe
                            </span>
                            <span>•</span>
                            <span>
                                Bãi Thuận An TT: <strong className="text-emerald-800">{countK83TotalYard}</strong> xe
                            </span>
                            <span>•</span>
                            <span>
                                Khớp: <strong className="text-emerald-700">{countK83Matched}</strong>
                            </span>
                            <span>•</span>
                            <span>
                                Tổng Lệch: <strong className="text-red-700">{countK83Diff}</strong> xe
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-500 italic">
                            * Bấm vào từng dòng để xem hướng dẫn xử lý chi tiết và gửi Zalo cho bộ phận liên quan.
                        </div>
                    </div>
                </>
            )}

            {/* SUB-VIEW 6: XE PHÂN BỔ THUẬN AN TỪ CYBERSOFT */}
            {reconcileSubTab === 'thuan_an_allocations' && (
                <>
                    {allocSubMode === 'cross_showroom_billed' ? (
                        <>
                            {/* DATA GRID CHO XE KHÁC SR XUẤT HÓA ĐƠN */}
                            <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                                {filteredCrossAllocations.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                        <i className="fa-solid fa-circle-check text-4xl mb-2 text-emerald-500"></i>
                                        <span className="text-xs font-bold text-slate-800">
                                            Tuyệt vời! Hiện không có xe nào chưa điều chuyển địa điểm kinh doanh.
                                        </span>
                                        <span className="text-[10px] text-slate-500 mt-1">
                                            Tất cả các xe phân bổ Thuận An đã xuất HĐ ở Showroom khác đều đã hoàn tất lập phiếu ĐNX điều chuyển (Đã chuyển {countCrossTransferred} xe).
                                        </span>
                                        {!isLoadingCrossAllocations && (
                                            <button
                                                type="button"
                                                onClick={() => handleFetchCrossAllocations(crossFromDate, true, false)}
                                                className="mt-3 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded border border-slate-300 shadow-2xs cursor-pointer flex items-center gap-1"
                                            >
                                                <i className="fas fa-rotate text-blue-600 mr-1"></i> Kiểm tra lại từ CyberSoft
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <table className="table-fixed w-full text-left border-collapse text-[11px] font-sans">
                                        <thead className="bg-[#FFEAEA] text-slate-800 sticky top-0 z-10 select-none border-b border-[#F5C2C7] text-[10px] sm:text-[11px]">
                                            <tr>
                                                <th className="py-1 px-1 border-r border-[#F5C2C7] w-7 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={filteredCrossAllocations.length > 0 && filteredCrossAllocations.every(c => selectedCrossVins.has(c.vin))}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedCrossVins);
                                                            if (e.target.checked) {
                                                                filteredCrossAllocations.forEach(c => newSet.add(c.vin));
                                                            } else {
                                                                filteredCrossAllocations.forEach(c => newSet.delete(c.vin));
                                                            }
                                                            setSelectedCrossVins(newSet);
                                                        }}
                                                        className="cursor-pointer"
                                                    />
                                                </th>
                                                <th className="py-1 px-1 border-r border-[#F5C2C7] w-7 text-center font-bold">#</th>
                                                <th className="py-1 px-2 border-r border-[#F5C2C7] font-bold w-[20%]">Số VIN & Mã DMS</th>
                                                <th className="py-1 px-2 border-r border-[#F5C2C7] font-bold w-[18%]">Dòng Xe & Màu Sắc</th>
                                                <th className="py-1 px-2 border-r border-[#F5C2C7] font-bold w-[25%]">SR Xuất HĐ & Ngày HĐ</th>
                                                <th className="py-1 px-2 border-r border-[#F5C2C7] font-bold w-[20%]">Trạng Thái Điều Chuyển</th>
                                                <th className="py-1 px-2 font-bold w-[17%] text-center">Thao Tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filteredCrossAllocations.map((c, idx) => {
                                                const isSelected = selectedCrossRowIdx === idx;
                                                const isChecked = selectedCrossVins.has(c.vin);
                                                return (
                                                    <tr
                                                        key={c.vin || idx}
                                                        onClick={() => setSelectedCrossRowIdx(idx)}
                                                        onDoubleClick={() => copyVin(c.vin)}
                                                        className={`hover:bg-rose-50/70 transition-colors cursor-pointer ${
                                                            isSelected ? 'bg-rose-100/90 font-medium' : idx % 2 === 1 ? 'bg-[#FFFDFC]' : 'bg-white'
                                                        }`}
                                                    >
                                                        <td className="py-1 px-1 border-r border-slate-200 text-center" onClick={e => e.stopPropagation()}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={(e) => {
                                                                    const newSet = new Set(selectedCrossVins);
                                                                    if (e.target.checked) newSet.add(c.vin);
                                                                    else newSet.delete(c.vin);
                                                                    setSelectedCrossVins(newSet);
                                                                }}
                                                                className="cursor-pointer"
                                                            />
                                                        </td>
                                                        <td className="py-1 px-1 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-slate-900 truncate">{c.vin}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); copyVin(c.vin); }}
                                                                    className="text-slate-400 hover:text-rose-700 text-[10px] shrink-0"
                                                                    title="Copy số khung"
                                                                >
                                                                    <i className={`fa-regular ${copiedVin === c.vin ? 'fa-check text-green-600' : 'fa-copy'}`}></i>
                                                                </button>
                                                            </div>
                                                            <div className="text-[10px] text-blue-800 font-mono mt-0.5 truncate">
                                                                DMS: <strong>{c.ma_dms || '-'}</strong>
                                                                {c.so_may ? ` • Máy: ${c.so_may}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div className="font-bold text-slate-900 truncate">
                                                                {c.dong_xe || c.ten_kx || '-'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                                                {c.ten_mau || c.ma_mau || '-'}
                                                                {c.ten_mau_nt ? ` / ${c.ten_mau_nt}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden text-[10.5px]">
                                                            <div className="font-bold text-rose-900 truncate" title={c.ten_ttcp_xuat}>
                                                                <i className="fa-solid fa-store mr-1 text-[9px] text-rose-600"></i>
                                                                {c.ten_ttcp_xuat || c.ma_ttcp_xuat || 'SR khác'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-700 truncate mt-0.5">
                                                                HĐ: <strong>{c.so_hd || '-'}</strong> {c.ngay_hd ? `(${formatDate(c.ngay_hd)})` : ''}
                                                            </div>
                                                            <div className="text-[9.5px] text-slate-500 truncate mt-0.2">
                                                                KH: {c.ten_khach_hang || '-'} {c.tvbh_xuat ? `• TVBH: ${c.tvbh_xuat}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            {c.has_transferred ? (
                                                                <div>
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9.5px] font-bold rounded-xs bg-emerald-100 text-emerald-900 border border-emerald-300">
                                                                        <i className="fa-solid fa-circle-check text-[8px] text-emerald-600"></i>
                                                                        Đã có ĐNX Điều chuyển
                                                                    </span>
                                                                    <div className="text-[9.5px] text-slate-600 font-mono mt-0.5 truncate">
                                                                        Số ĐNX: <strong>{c.so_ct_dnx}</strong> {c.ngay_ct_dnx ? `(${formatDate(c.ngay_ct_dnx)})` : ''}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9.5px] font-bold rounded-xs bg-rose-100 text-rose-900 border border-rose-300 animate-pulse">
                                                                        <i className="fa-solid fa-triangle-exclamation text-[8px] text-rose-600"></i>
                                                                        Chưa điều chuyển ĐĐKD
                                                                    </span>
                                                                    <div className="text-[9px] text-rose-700 italic mt-0.5 truncate">
                                                                        Cần lập ĐNX chuyển sang {c.ten_ttcp_xuat?.split('-')[0] || c.ma_ttcp_xuat}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-1 px-2 overflow-hidden text-center">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenTransferModal([c]);
                                                                }}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-bold shadow-xs cursor-pointer inline-flex items-center gap-1 ${
                                                                    c.has_transferred
                                                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                                                        : 'bg-purple-700 hover:bg-purple-800 text-white animate-pulse'
                                                                }`}
                                                            >
                                                                <i className="fa-solid fa-bolt text-[9px]"></i>
                                                                <span>{c.has_transferred ? 'Chuyển lại' : 'Điều chuyển ĐĐKD'}</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* STATUS BAR CHO XE KHÁC SR XUẤT HĐ */}
                            <div className="bg-[#FFEAEA] border-t border-[#F5C2C7] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                                <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-800 flex-wrap">
                                    <span className="font-bold text-rose-800">
                                        🚨 Chưa lập ĐNX điều chuyển ĐĐKD: <strong className="font-mono text-rose-900">{countCrossPending}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-emerald-800 font-medium">
                                        ✅ Đã hoàn tất điều chuyển: <strong className="font-mono">{countCrossTransferred}</strong> xe
                                    </span>
                                    {selectedCrossVins.size > 0 && (
                                        <>
                                            <span>•</span>
                                            <span className="text-purple-800 font-bold">
                                                Đã chọn: <strong className="font-mono">{selectedCrossVins.size}</strong> xe
                                            </span>
                                        </>
                                    )}
                                </div>
                                <div className="text-slate-600 text-[10px] italic">
                                    * Quy trình: Xe phân bổ cho Thuận An nhưng SR khác xuất HĐ phải lập ĐNX điều chuyển địa điểm kinh doanh (Mã GD 9) để trừ hạn mức phân bổ.
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* DATA GRID CHO XE PHÂN BỔ TỒN THUẬN AN */}
                            <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                                {filteredAllocations.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                        <i className="fa-solid fa-car text-4xl mb-2 text-slate-300"></i>
                                        <span className="text-xs font-semibold text-slate-600">
                                            {isLoadingAllocations ? 'Đang tải danh sách xe phân bổ từ CyberSoft...' : 'Không có xe nào khớp điều kiện tìm kiếm'}
                                        </span>
                                        {!isLoadingAllocations && (
                                            <button
                                                type="button"
                                                onClick={() => handleFetchThuanAnAllocations(true)}
                                                className="mt-3 px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs cursor-pointer"
                                            >
                                                <i className="fas fa-rotate mr-1"></i> Tải lại từ CyberSoft
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <table className="table-fixed w-full text-left border-collapse text-[11px] font-sans">
                                        <thead className="bg-[#EBEADB] text-slate-700 sticky top-0 z-10 select-none border-b border-[#CCCCCC] text-[10px] sm:text-[11px]">
                                            <tr>
                                                <th className="py-1 px-1 border-r border-[#CCCCCC] w-7 text-center font-bold">#</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[22%]">Số VIN & Mã DMS</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[23%]">Dòng Xe & Phiên Bản</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[18%]">Màu Sắc (Ngoại/Nội)</th>
                                                <th className="py-1 px-2 border-r border-[#CCCCCC] font-bold w-[18%]">Vị Trí / Kho Cyber</th>
                                                <th className="py-1 px-2 font-bold w-[19%]">Ngày Lập & Ghi Chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {filteredAllocations.map((c, idx) => {
                                                const isSelected = selectedAllocRowIdx === idx;
                                                const loc = c.current_physical_warehouse || c.vi_tri_kho || 'Đang vận tải';
                                                const isInTransit = !loc || loc.toLowerCase().includes('vận tải') || loc.toLowerCase().includes('nhà máy');
                                                return (
                                                    <tr
                                                        key={c.vin || idx}
                                                        onClick={() => setSelectedAllocRowIdx(idx)}
                                                        onDoubleClick={() => copyVin(c.vin)}
                                                        className={`hover:bg-emerald-50/70 transition-colors cursor-pointer ${
                                                            isSelected ? 'bg-emerald-100/90 font-medium' : idx % 2 === 1 ? 'bg-[#F9F9F6]' : 'bg-white'
                                                        }`}
                                                    >
                                                        <td className="py-1 px-1 border-r border-slate-200 text-center text-slate-500 font-mono text-[10px]">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-mono font-bold text-slate-900 truncate">{c.vin}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); copyVin(c.vin); }}
                                                                    className="text-slate-400 hover:text-emerald-700 text-[10px] shrink-0"
                                                                    title="Copy số khung"
                                                                >
                                                                    <i className={`fa-regular ${copiedVin === c.vin ? 'fa-check text-green-600' : 'fa-copy'}`}></i>
                                                                </button>
                                                            </div>
                                                            <div className="text-[10px] text-blue-800 font-mono mt-0.5 truncate">
                                                                DMS: <strong>{c.ma_dms || '-'}</strong>
                                                                {c.so_may ? ` • Máy: ${c.so_may}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div className="font-bold text-slate-900 truncate">
                                                                {c.dong_xe || c.ten_kx || '-'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                                                {c.phien_ban || c.ten_kx || '-'}
                                                                {c.nam_sx ? ` • SX: ${c.nam_sx}` : ''}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden text-[10.5px]">
                                                            <div className="font-semibold text-slate-800 truncate" title={c.ten_mau || c.ma_mau}>
                                                                Ngoại: <strong className="text-slate-900">{c.ten_mau || c.ma_mau || '-'}</strong>
                                                            </div>
                                                            <div className="text-[10px] text-slate-600 truncate mt-0.5" title={c.ten_mau_nt || c.ma_mau_nt}>
                                                                Nội: {c.ten_mau_nt || c.ma_mau_nt || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                            <div>
                                                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 text-[9.5px] font-bold rounded-xs border ${
                                                                    isInTransit 
                                                                        ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                                                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                                                }`}>
                                                                    <i className={`fas ${isInTransit ? 'fa-truck' : 'fa-warehouse'} text-[8px]`}></i>
                                                                    {loc}
                                                                </span>
                                                            </div>
                                                            {c.ma_kho && (
                                                                <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                                                                    Mã kho: {c.ma_kho}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-1 px-2 overflow-hidden text-[10.5px]">
                                                            <div className="text-slate-800 font-mono text-[10px] truncate">
                                                                {c.ngay_ct ? `Ngày KH: ${formatDate(c.ngay_ct)}` : (c.ngay_phan_bo ? `Ngày PB: ${formatDate(c.ngay_phan_bo)}` : '-')}
                                                            </div>
                                                            <div className="text-[9.5px] text-slate-600 truncate mt-0.5" title={c.ghi_chu}>
                                                                {c.ghi_chu || '-'}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* STATUS BAR CHO XE PHÂN BỔ TỒN */}
                            <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                                <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                                    <span className="font-bold">
                                        Tổng xe phân bổ tồn: <strong className="text-emerald-800 font-mono">{thuanAnAllocations.length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span>
                                        Đang hiển thị: <strong className="text-blue-800 font-mono">{filteredAllocations.length}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-amber-800 font-medium">
                                        Đang vận tải: <strong className="font-mono">{countAllocInTransit}</strong> xe
                                    </span>
                                    <span>•</span>
                                    <span className="text-emerald-800 font-medium">
                                        Đã về bãi/kho: <strong className="font-mono">{countAllocAtYard}</strong> xe
                                    </span>
                                </div>
                                <div className="text-slate-500 text-[10px] italic">
                                    * Dữ liệu xe phân bổ cho Thuận An (Mã TTCP: 02.01.08) trực tiếp từ CyberSoft ERP.
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {/* SUB-VIEW 7: XE PHÂN BỔ SHOWROOM KHÁC NHƯNG THUẬN AN XUẤT HÓA ĐƠN */}
            {reconcileSubTab === 'other_sr_allocations' && (
                <>
                    {/* DATA GRID */}
                    <div className="flex-1 min-h-0 bg-white overflow-auto relative">
                        {filteredOtherAllocations.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <i className="fa-solid fa-circle-check text-4xl mb-2 text-indigo-500"></i>
                                <span className="text-xs font-bold text-slate-800">
                                    Không có xe nào cần điều chuyển theo bộ lọc hiện tại.
                                </span>
                                <span className="text-[10px] text-slate-500 mt-1">
                                    {otherAllocations.length === 0 
                                        ? 'Bấm nút "Làm mới" bên trên để tải dữ liệu trực tiếp từ CyberSoft MSSQL.' 
                                        : `Tổng cộng có ${otherAllocations.length} xe trong kỳ từ ${otherAllocFromDate}.`}
                                </span>
                                {!isLoadingOtherAllocations && (
                                    <button
                                        type="button"
                                        onClick={() => handleFetchOtherAllocations(otherAllocFromDate, true, false)}
                                        className="mt-3 px-2 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded border border-indigo-300 shadow-2xs cursor-pointer flex items-center gap-1"
                                    >
                                        <i className="fas fa-rotate text-indigo-600 mr-1"></i> Tải dữ liệu từ CyberSoft
                                    </button>
                                )}
                            </div>
                        ) : (
                            <table className="table-fixed w-full text-left border-collapse text-[11px] font-sans">
                                <thead className="bg-[#EEF2FF] text-slate-800 sticky top-0 z-10 select-none border-b border-[#C7D2FE] text-[10px] sm:text-[11px]">
                                    <tr>
                                        <th className="py-1 px-1 border-r border-[#C7D2FE] w-8 text-center font-bold">#</th>
                                        <th className="py-1 px-2 border-r border-[#C7D2FE] font-bold w-[22%]">Số VIN & Mã DMS</th>
                                        <th className="py-1 px-2 border-r border-[#C7D2FE] font-bold w-[18%]">Dòng Xe & Màu Sắc</th>
                                        <th className="py-1 px-2 border-r border-[#C7D2FE] font-bold w-[22%]">SR Được Phân Bổ Gốc</th>
                                        <th className="py-1 px-2 border-r border-[#C7D2FE] font-bold w-[22%]">Hóa Đơn Thuận An Xuất</th>
                                        <th className="py-1 px-2 font-bold w-[16%] text-center">Trạng Thái ĐNX</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {filteredOtherAllocations.map((c, idx) => {
                                        const isSelected = selectedOtherAllocRowIdx === idx;
                                        return (
                                            <tr
                                                key={c.vin || idx}
                                                onClick={() => setSelectedOtherAllocRowIdx(idx)}
                                                onDoubleClick={() => copyVin(c.vin)}
                                                className={`hover:bg-indigo-50/70 transition-colors cursor-pointer ${
                                                    isSelected ? 'bg-indigo-100/80 ring-1 ring-inset ring-indigo-400' : idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                                                }`}
                                            >
                                                <td className="py-1 px-1 border-r border-slate-200 text-center font-mono text-[10px] text-slate-500">
                                                    {idx + 1}
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-200 overflow-hidden">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-bold text-indigo-900 select-all tracking-tight">
                                                            {c.vin}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                copyVin(c.vin);
                                                            }}
                                                            title="Sao chép số VIN"
                                                            className="text-slate-400 hover:text-indigo-600 cursor-pointer p-0.5 text-[9px]"
                                                        >
                                                            <i className="fa-regular fa-copy"></i>
                                                        </button>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                        Mã DMS: <strong className="text-slate-700">{c.ma_dms || '-'}</strong>
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-200 overflow-hidden text-[10.5px]">
                                                    <div className="font-bold text-slate-800 truncate" title={`${c.dong_xe || c.loai_xe || ''} ${c.phien_ban || c.ten_kx || ''}`}>
                                                        {c.dong_xe || c.loai_xe || '-'}
                                                    </div>
                                                    <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                                        Màu: <span className="font-medium text-slate-800">{c.ten_mau || c.ma_mau || '-'}</span>
                                                        {c.ten_mau_nt && <span className="text-slate-500 ml-1">/ {c.ten_mau_nt}</span>}
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-200 overflow-hidden text-[10.5px]">
                                                    <div className="flex items-center gap-1">
                                                        <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[10px] truncate" title={c.ten_ttcp_phan_bo || c.ttcp_phan_bo}>
                                                            🏢 {c.ten_ttcp_phan_bo || c.ttcp_phan_bo || 'Showroom khác'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9.5px] text-slate-500 font-mono mt-0.5">
                                                        Mã TTCP: {c.ttcp_phan_bo || '-'}
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 border-r border-slate-200 overflow-hidden text-[10.5px]">
                                                    <div className="font-bold text-emerald-800 flex items-center gap-1">
                                                        <i className="fa-solid fa-file-invoice text-[9px]"></i>
                                                        <span>HĐ: {c.so_hd || 'Chưa rõ'}</span>
                                                        {c.ngay_hd && (
                                                            <span className="text-[9.5px] font-normal text-slate-500">
                                                                ({formatDate(c.ngay_hd)})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-700 truncate mt-0.5">
                                                        KH: <strong className="text-slate-900">{c.ten_khach_hang || 'Chưa rõ'}</strong>
                                                        {c.tvbh_xuat && (
                                                            <span className="text-slate-500 ml-1">({c.tvbh_xuat})</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-1 px-2 text-center overflow-hidden">
                                                    {c.has_transferred ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold">
                                                            <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                                            <span>Đã có ĐNX {c.so_ct_transfer || ''}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded text-[10px] font-bold animate-pulse" title="Cần liên hệ Showroom phân bổ lập ĐNX chuyển về Thuận An">
                                                            <i className="fa-solid fa-clock-rotate-left text-rose-600"></i>
                                                            <span>Chờ SR khác chuyển</span>
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* STATUS BAR CHO XE SR KHÁC PHÂN BỔ - THUẬN AN XUẤT HĐ */}
                    <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                        <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                            <span className="font-bold">
                                Tổng xe phát hiện: <strong className="text-indigo-900 font-mono">{otherAllocations.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span>
                                Đang hiển thị: <strong className="text-blue-800 font-mono">{filteredOtherAllocations.length}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-rose-800 font-bold">
                                Chưa lập ĐNX về Thuận An: <strong className="font-mono">{countOtherAllocPending}</strong> xe
                            </span>
                            <span>•</span>
                            <span className="text-emerald-800 font-medium">
                                Đã hoàn tất: <strong className="font-mono">{countOtherAllocTransferred}</strong> xe
                            </span>
                        </div>
                        <div className="text-slate-500 text-[10px] italic">
                            * Kỳ xem từ {otherAllocFromDate}. Các xe này cần Showroom phân bổ lập ĐNX (Mã GD = 9) chuyển về Thuận An (02.01.08).
                        </div>
                    </div>
                </>
            )}
                </>
            )}

            {/* MODAL ĐIỀU CHUYỂN ĐỊA ĐIỂM KINH DOANH (ĐĐKD) */}
            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in font-sans">
                    <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden flex flex-col">
                        {/* HEADER */}
                        <div className="bg-[#0284C7] text-white px-3 py-2 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-truck-ramp-box text-base"></i>
                                <span className="font-bold text-xs sm:text-sm">
                                    Điều Chuyển Địa Điểm Kinh Doanh (ĐĐKD)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => !isTransferring && setIsTransferModalOpen(false)}
                                disabled={isTransferring}
                                className="text-white/80 hover:text-white text-sm cursor-pointer disabled:opacity-50"
                            >
                                ✕
                            </button>
                        </div>

                        {/* BODY */}
                        <div className="p-3.5 space-y-3 text-[11px] overflow-auto max-h-[75vh]">
                            {/* DANH SÁCH XE */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Danh sách xe điều chuyển ({transferModalCars.length} xe):
                                </label>
                                <div className="border border-slate-200 rounded p-1.5 max-h-36 overflow-auto bg-slate-50 space-y-1">
                                    {transferModalCars.map((c, i) => (
                                        <div key={c.vin || i} className="flex items-center justify-between bg-white p-1 rounded border border-slate-200 text-[10.5px]">
                                            <span className="font-mono font-bold text-blue-900">{c.vin}</span>
                                            <span className="text-slate-600">{c.dong_xe || c.ten_kx} • {c.ten_mau || c.ma_mau}</span>
                                            <span className="text-rose-700 font-medium text-[10px]">{c.ten_ttcp_xuat || c.ma_ttcp_xuat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CHỌN SHOWROOM NHẬN */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Showroom nhận điều chuyển (Mã TTCP nhận): <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={transferTargetTtcp}
                                    onChange={(e) => {
                                        setTransferTargetTtcp(e.target.value);
                                        const found = VINFAST_SHOWROOMS.find(s => s.code === e.target.value);
                                        if (found) {
                                            setTransferReason(`Điều chuyển địa điểm kinh doanh sang ${found.name} (xe đã xuất hóa đơn)`);
                                        }
                                    }}
                                    disabled={isTransferring}
                                    className="w-full h-7 px-2 bg-white border border-[#7F9DB9] rounded text-[11px] font-bold text-slate-800 outline-none focus:border-blue-600 shadow-inner"
                                >
                                    {VINFAST_SHOWROOMS.map(s => (
                                        <option key={s.code} value={s.code}>
                                            [{s.code}] {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* LÝ DO / DIỄN GIẢI */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">
                                    Diễn giải / Lý do lập phiếu ĐNX:
                                </label>
                                <input
                                    type="text"
                                    value={transferReason}
                                    onChange={e => setTransferReason(e.target.value)}
                                    disabled={isTransferring}
                                    placeholder="Nhập diễn giải cho phiếu điều chuyển..."
                                    className="w-full h-7 px-2 bg-white border border-[#7F9DB9] rounded text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner"
                                />
                            </div>

                            {/* HƯỚNG DẪN QUY TRÌNH */}
                            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[10px] text-amber-900 space-y-1">
                                <div className="font-bold flex items-center gap-1">
                                    <i className="fa-solid fa-circle-info text-amber-600"></i>
                                    <span>Tác vụ CyberSoft tự động:</span>
                                </div>
                                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                                    <li>Lập Phiếu Đề Nghị Xuất Xe (<strong>DNX</strong>) trên CyberSoft với Mã Giao Dịch <strong>9 (Khác ĐĐKD)</strong>.</li>
                                    <li>Mã TTCP xuất: <strong>02.01.08</strong> (Thuận An) ➔ Mã TTCP nhận: <strong>{transferTargetTtcp}</strong>.</li>
                                    <li>Cập nhật phân bổ <strong>CTKH.Ma_TTCP_I</strong> để xe không còn trừ vào chỉ tiêu Thuận An.</li>
                                </ul>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="bg-[#ECE9D8] px-3 py-2 border-t border-[#CCCCCC] flex items-center justify-end gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsTransferModalOpen(false)}
                                disabled={isTransferring}
                                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 text-xs font-semibold cursor-pointer disabled:opacity-50"
                            >
                                Hủy Bỏ
                            </button>
                            <button
                                type="button"
                                onClick={handleExecuteTransfer}
                                disabled={isTransferring}
                                className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {isTransferring ? (
                                    <>
                                        <i className="fas fa-rotate animate-spin text-[10px]"></i>
                                        <span>Đang xử lý trên CyberSoft...</span>
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-check text-[10px]"></i>
                                        <span>Xác Nhận Điều Chuyển ĐĐKD</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
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
