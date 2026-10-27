import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search,
    SlidersHorizontal,
    X,
    RotateCw,
    Copy,
    Check,
    ChevronRight,
    CheckCircle2,
    User,
    Share2
} from 'lucide-react';
import {
    fetchK83ReconciliationData,
    K83ReconciliationItem
} from '../../../services/api/satelliteWarehouseService';
import { 
    triggerCyberTonKhoSync,
    fetchCrossShowroomAllocations,
    fetchOtherShowroomAllocations,
    CrossShowroomAllocationItem
} from '../../../services/api/stockService';

const CACHE_KEY = 'satellite_warehouses_cache_v1';

interface MobileReconcileK83ViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    allOrders?: any[];
    onNavigateToTab?: (tab: string, options?: any) => void;
}

const formatCarModel = (model?: string): string => {
    if (!model) return 'VF';
    const m = model.trim();
    if (m.toUpperCase().startsWith('VF') && !m.toUpperCase().startsWith('VF ')) {
        return `VF ${m.slice(2).trim()}`;
    }
    return m;
};

const getExteriorSwatchColor = (colorName?: string): string => {
    if (!colorName) return '#94a3b8';
    const c = colorName.toLowerCase();
    if (c.includes('white') || c.includes('trắng') || c.includes('blanc') || c.includes('ce18')) return '#f8fafc';
    if (c.includes('black') || c.includes('đen') || c.includes('noir') || c.includes('ce11')) return '#0f172a';
    if (c.includes('red') || c.includes('đỏ') || c.includes('crimson') || c.includes('rouge') || c.includes('ce1m')) return '#dc2626';
    if (c.includes('blue') || c.includes('xanh dương') || c.includes('aquatic') || c.includes('bleu') || c.includes('ce14') || c.includes('sky')) return '#2563eb';
    if (c.includes('green') || c.includes('xanh lá') || c.includes('vert') || c.includes('ce13') || c.includes('emerald')) return '#059669';
    if (c.includes('grey') || c.includes('gray') || c.includes('xám') || c.includes('gris') || c.includes('ce12') || c.includes('zenith')) return '#64748b';
    if (c.includes('silver') || c.includes('bạc') || c.includes('argent') || c.includes('desat')) return '#cbd5e1';
    if (c.includes('pink') || c.includes('hồng') || c.includes('rose') || c.includes('ce2k')) return '#f472b6';
    if (c.includes('orange') || c.includes('cam') || c.includes('vitality') || c.includes('ce1e')) return '#ea580c';
    if (c.includes('yellow') || c.includes('vàng') || c.includes('jaune') || c.includes('ce16')) return '#eab308';
    if (c.includes('purple') || c.includes('tím') || c.includes('violet') || c.includes('iris')) return '#9333ea';
    return '#94a3b8';
};

export const MobileReconcileK83View: React.FC<MobileReconcileK83ViewProps> = ({
    showToast,
    allOrders = []
}) => {
    const [items, setItems] = useState<K83ReconciliationItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'diff' | 'yard_only' | 'cyber_only' | 'td4_yard' | 'matched' | 'all'>('diff');
    const [modelFilter, setModelFilter] = useState<string>('all');
    const [tvbhFilter, setTvbhFilter] = useState<string>('all');
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [inspectedItem, setInspectedItem] = useState<K83ReconciliationItem | null>(null);
    const [copiedVin, setCopiedVin] = useState<string | null>(null);

    // Allocation Sub-Modes (100% Parity with Laptop Interface)
    const [reconcileMode, setReconcileMode] = useState<'k83' | 'cross_alloc' | 'other_alloc'>('k83');
    const [crossAllocations, setCrossAllocations] = useState<CrossShowroomAllocationItem[]>([]);
    const [otherAllocations, setOtherAllocations] = useState<CrossShowroomAllocationItem[]>([]);
    const [isLoadingCross, setIsLoadingCross] = useState(false);
    const [isLoadingOther, setIsLoadingOther] = useState(false);
    const [inspectedAllocCar, setInspectedAllocCar] = useState<CrossShowroomAllocationItem | null>(null);
    const [allocStatusFilter, setAllocStatusFilter] = useState<'pending' | 'all' | 'transferred'>('pending');

    // Load satellite cars from cache
    const getSatelliteCarsFromCache = useCallback((): any[] => {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const obj = JSON.parse(cached);
                if (obj.warehouses) {
                    const parsed: any[] = [];
                    Object.entries(obj.warehouses).forEach(([khoKey, info]: any) => {
                        const data: any[][] = info.data || [];
                        data.slice(1).forEach((r) => {
                            if (!r || r.length === 0) return;
                            const rawVin = String(r[5] || '').trim();
                            if (!rawVin) return;
                            const match17 = rawVin.toUpperCase().match(/[A-Z0-9]{17}/);
                            const vin = match17 ? match17[0] : rawVin.split('(')[0].split(' ')[0].split('-')[0].trim().toUpperCase();
                            const showroom = String(r[3] || '').trim();
                            const ngayGiao = String(r[10] || '').trim();
                            const colTonKho = String(r[17] || '').trim();
                            const isTon = (!ngayGiao || ngayGiao === '' || ngayGiao.toLowerCase() === 'none') && (!colTonKho || colTonKho === '1' || colTonKho === '1.0');
                            const isThuanAn = showroom.toLowerCase().includes('thuận an') || showroom.toLowerCase().includes('thuan an');

                            parsed.push({
                                soKhung: vin,
                                vin,
                                khoKey,
                                khoName: info.khoName || khoKey,
                                showroomQuanLy: showroom,
                                loaiXe: String(r[4] || '').trim(),
                                mauSac: String(r[6] || '').trim(),
                                isThuanAn,
                                isTonKho: isTon
                            });
                        });
                    });
                    return parsed;
                }
            }
        } catch (e) {
            console.error('Error parsing satellite cars cache', e);
        }
        return [];
    }, []);

    // Fetch reconciliation data
    const handleFetchData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            if (!silent) {
                try {
                    await triggerCyberTonKhoSync();
                } catch (cyberErr) {
                    console.warn('Lỗi trigger cyber sync:', cyberErr);
                }
            }
            const satCars = getSatelliteCarsFromCache();
            const data = await fetchK83ReconciliationData(allOrders, satCars);
            setItems(data);
            if (!silent) {
                const diffs = data.filter(d => d.reconcileType !== 'MATCHED' && d.reconcileType !== 'TD4_YARD').length;
                showToast(
                    'Đối soát K83 vs Bãi',
                    `Đã đối chiếu ${data.length} xe (Phát hiện ${diffs} xe lệch giữa K83 và bãi Thuận An).`,
                    diffs > 0 ? 'warning' : 'success'
                );
            }
        } catch (err: any) {
            console.error('Error fetching K83 reconcile data:', err);
            if (!silent) {
                showToast('Lỗi đối soát', err.message || 'Không thể tải dữ liệu đối soát K83', 'error');
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, [allOrders, getSatelliteCarsFromCache, showToast]);

    // Initial load on mount
    useEffect(() => {
        handleFetchData(true);
    }, [handleFetchData]);

    const handleCopyVin = (vin: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        showToast('Đã sao chép', `Đã copy VIN: ${vin}`, 'success', 1500);
        setTimeout(() => setCopiedVin(null), 1500);
    };

    // Metric counts
    const countMatched = useMemo(() => items.filter(c => c.reconcileType === 'MATCHED').length, [items]);
    const countCyberOnly = useMemo(() => items.filter(c => c.reconcileType === 'CYBER_K83_ONLY').length, [items]);
    const countYardOnly = useMemo(() => items.filter(c => c.reconcileType === 'YARD_ONLY').length, [items]);
    const countTd4Yard = useMemo(() => items.filter(c => c.reconcileType === 'TD4_YARD').length, [items]);
    const countDiff = useMemo(() => countCyberOnly + countYardOnly, [countCyberOnly, countYardOnly]);
    const countTotalCyber = useMemo(() => countMatched + countCyberOnly, [countMatched, countCyberOnly]);
    const countTotalYard = useMemo(() => countMatched + countTd4Yard + countYardOnly, [countMatched, countTd4Yard, countYardOnly]);

    // Filtered items
    const filteredItems = useMemo(() => {
        return items.filter(c => {
            if (statusFilter === 'diff' && (c.reconcileType === 'MATCHED' || c.reconcileType === 'TD4_YARD')) return false;
            if (statusFilter === 'yard_only' && c.reconcileType !== 'YARD_ONLY') return false;
            if (statusFilter === 'cyber_only' && c.reconcileType !== 'CYBER_K83_ONLY') return false;
            if (statusFilter === 'td4_yard' && c.reconcileType !== 'TD4_YARD') return false;
            if (statusFilter === 'matched' && c.reconcileType !== 'MATCHED') return false;

            if (modelFilter !== 'all' && c.carModel.trim() !== modelFilter) return false;
            if (tvbhFilter !== 'all' && (c.tvbhCyber || '').trim() !== tvbhFilter) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
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
    }, [items, statusFilter, modelFilter, tvbhFilter, searchQuery]);

    // Unique filter options
    const uniqueModels = useMemo(() => {
        const set = new Set<string>();
        items.forEach(c => {
            if (c.carModel) set.add(c.carModel.trim());
        });
        return Array.from(set).sort();
    }, [items]);

    const uniqueTvbhs = useMemo(() => {
        const set = new Set<string>();
        items.forEach(c => {
            if (c.tvbhCyber && c.tvbhCyber !== 'Chưa rõ') set.add(c.tvbhCyber.trim());
        });
        return Array.from(set).sort();
    }, [items]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (statusFilter !== 'diff') count++;
        if (modelFilter !== 'all') count++;
        if (tvbhFilter !== 'all') count++;
        return count;
    }, [statusFilter, modelFilter, tvbhFilter]);

    // Copy Zalo message report
    const handleCopyZalo = () => {
        const yardOnly = items.filter(c => c.reconcileType === 'YARD_ONLY');
        const cyberOnly = items.filter(c => c.reconcileType === 'CYBER_K83_ONLY');
        const matched = items.filter(c => c.reconcileType === 'MATCHED');
        const td4Yard = items.filter(c => c.reconcileType === 'TD4_YARD');

        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        let text = `⚖️ BÁO CÁO TRA SOÁT TỒN KHO: CYBER K83 vs BÃI THUẬN AN THỰC TẾ\n`;
        text += `(Thời điểm kiểm tra: ${timeStr})\n`;
        text += `📊 TỔNG QUAN TỒN KHO:\n`;
        text += ` • Tồn sổ Cyber K83: ${matched.length + cyberOnly.length} xe\n`;
        text += ` • Tồn thực tế bãi Thuận An: ${matched.length + td4Yard.length + yardOnly.length} xe (Kho K83: ${matched.length} xe | Đã có TD4 chờ giao: ${td4Yard.length} xe)\n`;
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
        showToast('Đã sao chép Zalo', `Đã sao chép Báo cáo đối soát K83 (${yardOnly.length + cyberOnly.length} xe lệch)!`, 'success', 2500);
    };

    // Fetch Cross-Showroom Allocations (Xe phân bổ Thuận An nhưng SR khác xuất HĐ)
    const handleFetchCrossAllocations = useCallback(async (silent = false) => {
        if (!silent) setIsLoadingCross(true);
        try {
            const res = await fetchCrossShowroomAllocations({ fromDate: '2026-01-01', force: !silent });
            if (res && res.cars) {
                setCrossAllocations(res.cars);
                if (!silent) {
                    showToast('SR Khác Xuất HĐ', `Đã tải ${res.cars.length} xe (Có ${res.total_pending} xe chưa làm ĐNX).`, res.total_pending > 0 ? 'warning' : 'success');
                }
            }
        } catch (err: any) {
            if (!silent) showToast('Lỗi tải dữ liệu', err.message || 'Không thể tải xe khác SR xuất HĐ', 'error');
        } finally {
            if (!silent) setIsLoadingCross(false);
        }
    }, [showToast]);

    // Fetch Other-Showroom Allocations (Xe SR khác phân bổ nhưng Thuận An xuất HĐ)
    const handleFetchOtherAllocations = useCallback(async (silent = false) => {
        if (!silent) setIsLoadingOther(true);
        try {
            const res = await fetchOtherShowroomAllocations({ fromDate: '2026-08-01', force: !silent });
            if (res && res.cars) {
                setOtherAllocations(res.cars);
                if (!silent) {
                    showToast('SR Khác PB - TA Xuất', `Đã tải ${res.cars.length} xe (Có ${res.total_pending} xe chưa làm ĐNX về TA).`, res.total_pending > 0 ? 'warning' : 'success');
                }
            }
        } catch (err: any) {
            if (!silent) showToast('Lỗi tải dữ liệu', err.message || 'Không thể tải xe SR khác PB', 'error');
        } finally {
            if (!silent) setIsLoadingOther(false);
        }
    }, [showToast]);

    const countCrossPending = useMemo(() => crossAllocations.filter(c => !c.has_transferred).length, [crossAllocations]);
    const countCrossTransferred = useMemo(() => crossAllocations.filter(c => c.has_transferred).length, [crossAllocations]);

    const countOtherPending = useMemo(() => otherAllocations.filter(c => !c.has_transferred).length, [otherAllocations]);
    const countOtherTransferred = useMemo(() => otherAllocations.filter(c => c.has_transferred).length, [otherAllocations]);

    const filteredCrossAllocations = useMemo(() => {
        return crossAllocations.filter(c => {
            if (allocStatusFilter === 'pending' && c.has_transferred) return false;
            if (allocStatusFilter === 'transferred' && !c.has_transferred) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchVin = (c.vin || '').toLowerCase().includes(q);
                const matchModel = (c.dong_xe || c.ten_kx || '').toLowerCase().includes(q);
                const matchKh = (c.ten_khach_hang || '').toLowerCase().includes(q);
                const matchHd = (c.so_hd || '').toLowerCase().includes(q);
                const matchSr = (c.ten_ttcp_xuat || c.ma_ttcp_xuat || '').toLowerCase().includes(q);
                const matchTvbh = (c.tvbh_xuat || '').toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchKh && !matchHd && !matchSr && !matchTvbh) return false;
            }
            return true;
        });
    }, [crossAllocations, allocStatusFilter, searchQuery]);

    const filteredOtherAllocations = useMemo(() => {
        return otherAllocations.filter(c => {
            if (allocStatusFilter === 'pending' && c.has_transferred) return false;
            if (allocStatusFilter === 'transferred' && !c.has_transferred) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchVin = (c.vin || '').toLowerCase().includes(q);
                const matchModel = (c.dong_xe || c.ten_kx || '').toLowerCase().includes(q);
                const matchKh = (c.ten_khach_hang || '').toLowerCase().includes(q);
                const matchHd = (c.so_hd || '').toLowerCase().includes(q);
                const matchSr = (c.ten_ttcp_phan_bo || c.ttcp_phan_bo || '').toLowerCase().includes(q);
                const matchTvbh = (c.tvbh_xuat || '').toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchKh && !matchHd && !matchSr && !matchTvbh) return false;
            }
            return true;
        });
    }, [otherAllocations, allocStatusFilter, searchQuery]);

    const handleCopyZaloCrossAllocations = () => {
        const listToCopy = filteredCrossAllocations;
        if (!listToCopy.length) {
            showToast('Thông báo', 'Không có xe nào trong danh sách để sao chép', 'info');
            return;
        }
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        let text = `📋 DANH SÁCH XE PHÂN BỔ THUẬN AN — SHOWROOM KHÁC XUẤT HÓA ĐƠN\n`;
        text += `(Thời điểm kiểm tra: ${timeStr} | Tổng: ${listToCopy.length} xe)\n`;
        text += `👉 Đề nghị Kế toán kiểm tra lập phiếu ĐNX (Mã GD = 9) điều chuyển ĐĐKD:\n`;
        text += `========================================\n\n`;
        listToCopy.forEach((c, idx) => {
            text += ` ${idx + 1}. VIN: ${c.vin}\n`;
            text += `    • Xe: ${c.dong_xe || c.ten_kx || 'VF'} (${c.ten_mau || c.ma_mau || '-'})\n`;
            text += `    • SR xuất HĐ: ${c.ten_ttcp_xuat || c.ma_ttcp_xuat || 'Chưa rõ'} | HĐ: ${c.so_hd || 'N/A'}\n`;
            text += `    • KH: ${c.ten_khach_hang || 'Chưa rõ'} | TVBH: ${c.tvbh_xuat || 'Chưa rõ'}\n`;
            text += `    • Trạng thái: ${c.has_transferred ? '✅ Đã điều chuyển' : '🚨 Chưa lập ĐNX điều chuyển'}\n`;
        });
        text += `\n========================================\n`;
        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép danh sách ${listToCopy.length} xe gửi Zalo!`, 'success', 2500);
    };

    const handleCopyZaloOtherAllocations = () => {
        const listToCopy = filteredOtherAllocations;
        if (!listToCopy.length) {
            showToast('Thông báo', 'Không có xe nào trong danh sách để sao chép', 'info');
            return;
        }
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        let text = `📋 DANH SÁCH XE PHÂN BỔ SHOWROOM KHÁC — THUẬN AN XUẤT HÓA ĐƠN\n`;
        text += `(Thời điểm kiểm tra: ${timeStr} | Tổng: ${listToCopy.length} xe)\n`;
        text += `👉 Đề nghị Kế toán & Quản lý các Showroom hỗ trợ lập phiếu ĐNX (Mã GD = 9) điều chuyển ĐĐKD về cho Showroom Thuận An (02.01.08):\n`;
        text += `========================================\n\n`;
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
                text += `     • Xe: ${c.dong_xe || c.ten_kx || 'VF'} (${c.ten_mau || c.ma_mau || '-'})\n`;
                text += `     • HĐ Thuận An: ${c.so_hd || 'N/A'}\n`;
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

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#f2f2f7] relative">
            {/* 0. TOP 3-MODE SEGMENTED BAR */}
            <div className="shrink-0 bg-white border-b border-slate-200/80 px-2.5 py-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setReconcileMode('k83')}
                        className={`h-[28px] px-2.5 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 ${
                            reconcileMode === 'k83'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <span>🚨 Lệch K83</span>
                        <span className="text-[10px] font-extrabold opacity-85">({countDiff})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setReconcileMode('cross_alloc');
                            if (crossAllocations.length === 0 && !isLoadingCross) {
                                handleFetchCrossAllocations(false);
                            }
                        }}
                        className={`h-[28px] px-2.5 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 ${
                            reconcileMode === 'cross_alloc'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <span>SR Khác Xuất HĐ</span>
                        <span className="text-[10px] font-extrabold opacity-85">({countCrossPending})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setReconcileMode('other_alloc');
                            if (otherAllocations.length === 0 && !isLoadingOther) {
                                handleFetchOtherAllocations(false);
                            }
                        }}
                        className={`h-[28px] px-2.5 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 ${
                            reconcileMode === 'other_alloc'
                                ? 'bg-slate-900 text-white shadow-2xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <span>SR Khác PB - TA Xuất</span>
                        <span className="text-[10px] font-extrabold opacity-85">({countOtherPending})</span>
                    </button>
                </div>
            </div>

            {/* 1. TOP COMPACT KPI SUMMARY BAR */}
            {reconcileMode === 'k83' ? (
                <div className="shrink-0 bg-white border-b border-slate-200/80 px-3 py-1.5 shadow-2xs">
                    {/* 1-Line Metric Summary Strip */}
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                            <span>Cyber K83: <strong className="text-slate-900">{countTotalCyber}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Bãi TT: <strong className="text-slate-900">{countTotalYard}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Khớp: <strong className="text-emerald-600">{countMatched}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Tồn TD4: <strong className="text-blue-600">{countTd4Yard}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Thừa K83: <strong className="text-rose-600">{countCyberOnly}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Thừa bãi: <strong className="text-amber-600">{countYardOnly}</strong></span>
                        </div>

                        <div className="shrink-0 pl-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200/60">
                                <span>Lệch: {countDiff}</span>
                            </span>
                        </div>
                    </div>

                    {/* Sub-Type Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 text-[11px] font-semibold">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('diff')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                statusFilter === 'diff'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>🚨 Chỉ xem xe lệch</span>
                            <span className="text-[10px] font-bold opacity-80">({countDiff})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('yard_only')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                statusFilter === 'yard_only'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>Thừa Bãi TT</span>
                            <span className="text-[10px] font-bold opacity-80">({countYardOnly})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('cyber_only')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                statusFilter === 'cyber_only'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>Thừa Cyber K83</span>
                            <span className="text-[10px] font-bold opacity-80">({countCyberOnly})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('td4_yard')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                statusFilter === 'td4_yard'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>TD4 Chờ Giao</span>
                            <span className="text-[10px] font-bold opacity-80">({countTd4Yard})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('matched')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                statusFilter === 'matched'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>Khớp chuẩn</span>
                            <span className="text-[10px] font-bold opacity-80">({countMatched})</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                statusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>Tất cả</span>
                            <span className="text-[10px] font-bold opacity-80">({items.length})</span>
                        </button>
                    </div>
                </div>
            ) : reconcileMode === 'cross_alloc' ? (
                <div className="shrink-0 bg-white border-b border-slate-200/80 px-3 py-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <span>Phân bổ Thuận An: <strong className="text-slate-900">{crossAllocations.length}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Chưa ĐNX: <strong className="text-rose-600">{countCrossPending}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Đã ĐNX: <strong className="text-emerald-600">{countCrossTransferred}</strong></span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200/60">
                            Cần ĐNX: {countCrossPending}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 text-[11px] font-semibold">
                        <button
                            type="button"
                            onClick={() => setAllocStatusFilter('pending')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                allocStatusFilter === 'pending'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>🚨 Chưa lập ĐNX</span>
                            <span className="text-[10px] font-bold opacity-80">({countCrossPending})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAllocStatusFilter('transferred')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                allocStatusFilter === 'transferred'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>✅ Đã có ĐNX</span>
                            <span className="text-[10px] font-bold opacity-80">({countCrossTransferred})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAllocStatusFilter('all')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                allocStatusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>Tất cả</span>
                            <span className="text-[10px] font-bold opacity-80">({crossAllocations.length})</span>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="shrink-0 bg-white border-b border-slate-200/80 px-3 py-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <span>Phân bổ SR khác: <strong className="text-slate-900">{otherAllocations.length}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Chưa ĐNX về TA: <strong className="text-rose-600">{countOtherPending}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Đã ĐNX: <strong className="text-emerald-600">{countOtherTransferred}</strong></span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200/60">
                            Cần ĐNX: {countOtherPending}
                        </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1.5 text-[11px] font-semibold">
                        <button
                            type="button"
                            onClick={() => setAllocStatusFilter('pending')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                allocStatusFilter === 'pending'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>🚨 Chưa lập ĐNX về TA</span>
                            <span className="text-[10px] font-bold opacity-80">({countOtherPending})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAllocStatusFilter('transferred')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                allocStatusFilter === 'transferred'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>✅ Đã có ĐNX</span>
                            <span className="text-[10px] font-bold opacity-80">({countOtherTransferred})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setAllocStatusFilter('all')}
                            className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                allocStatusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                            }`}
                        >
                            <span>Tất cả</span>
                            <span className="text-[10px] font-bold opacity-80">({otherAllocations.length})</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 2. TABLE BODY */}
            <main className="flex-1 overflow-y-auto px-3 pt-2 pb-16 no-scrollbar">
                {reconcileMode === 'k83' ? (
                    isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs font-bold text-slate-700">Đang đối soát dữ liệu Cyber K83 vs Bãi Thuận An...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-14 h-14 rounded-2xl bg-white text-emerald-500 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                            <CheckCircle2 size={28} strokeWidth={1.8} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">Tuyệt vời! Không có xe lệch kho</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Hiện tại dữ liệu giữa Cyber K83 và Bãi Thuận An thực tế hoàn toàn khớp chuẩn.
                        </p>
                        <div className="mt-3.5 flex items-center gap-2">
                            {statusFilter !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className="px-3.5 py-1.5 rounded-full bg-slate-800 text-white text-xs font-semibold shadow-xs active:scale-95"
                                >
                                    Xem tất cả ({items.length} xe)
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => handleFetchData(false)}
                                className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold active:scale-95"
                            >
                                Đối soát lại
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                        {/* Table Header */}
                        <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                            <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Cấu hình xe / Loại lệch</div>
                            <div className="flex-1 min-w-0 pl-3 pr-1">Chi tiết đối soát</div>
                            <div className="w-3 shrink-0"></div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-slate-100">
                            {filteredItems.map((item) => {
                                const isYardOnly = item.reconcileType === 'YARD_ONLY';
                                const isCyberOnly = item.reconcileType === 'CYBER_K83_ONLY';
                                const isTd4Yard = item.reconcileType === 'TD4_YARD';
                                const isMatched = item.reconcileType === 'MATCHED';

                                return (
                                    <div
                                        key={item.vin}
                                        onClick={() => setInspectedItem(item)}
                                        className="flex min-h-[62px] cursor-pointer select-none items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70"
                                    >
                                        {/* CỘT 1: CẤU HÌNH XE / LOẠI LỆCH */}
                                        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1 self-stretch border-r border-slate-100/90 pr-3">
                                            {/* Discrepancy Badge */}
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {isYardOnly && (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9.5px] font-bold text-amber-800 border border-amber-200/60">
                                                        Thừa Bãi / Thiếu Cyber
                                                    </span>
                                                )}
                                                {isCyberOnly && (
                                                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold text-rose-800 border border-rose-200/60">
                                                        Thừa Cyber / Thiếu Bãi
                                                    </span>
                                                )}
                                                {isTd4Yard && (
                                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9.5px] font-bold text-blue-800 border border-blue-200/60">
                                                        Tồn TD4 Chờ Giao
                                                    </span>
                                                )}
                                                {isMatched && (
                                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-800 border border-emerald-200/60">
                                                        Khớp Chuẩn
                                                    </span>
                                                )}
                                            </div>

                                            {/* Model & Version */}
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-bold text-[13px] tracking-tight text-slate-900 truncate">
                                                    {formatCarModel(item.carModel)}
                                                </span>
                                                {item.version && (
                                                    <span className="text-[11px] font-semibold text-slate-600 truncate">
                                                        {item.version}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Color swatch & VIN */}
                                            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium truncate">
                                                <span
                                                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                                                    style={{ backgroundColor: getExteriorSwatchColor(item.color) }}
                                                    title={item.color}
                                                />
                                                <span className="truncate text-slate-600 max-w-[70px]" title={item.color}>
                                                    {item.color || 'Tiêu chuẩn'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCopyVin(item.vin, e)}
                                                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-[9.5px] font-semibold text-slate-700 hover:bg-slate-200 active:scale-95"
                                                    title={`VIN: ${item.vin}`}
                                                >
                                                    {copiedVin === item.vin ? (
                                                        <Check size={10} className="text-emerald-600" />
                                                    ) : (
                                                        <Copy size={10} className="text-slate-400" />
                                                    )}
                                                    <span>{item.vin.length >= 8 ? item.vin.slice(-8) : item.vin}</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* CỘT 2: CHI TIẾT ĐỐI SOÁT */}
                                        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1 self-stretch pl-3 pr-1">
                                            {/* Discrepancy Reason */}
                                            <p className="text-[11px] font-bold text-slate-800 line-clamp-1 truncate">
                                                {item.discrepancyReason}
                                            </p>

                                            {/* Action Required */}
                                            <p className="text-[10px] text-slate-500 line-clamp-1 truncate">
                                                {item.actionRequired}
                                            </p>

                                            {/* TVBH / Voucher Pills */}
                                            <div className="flex items-center gap-1 flex-wrap text-[9.5px]">
                                                {item.tvbhCyber && item.tvbhCyber !== 'Chưa rõ' && (
                                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">
                                                        <User size={8} className="text-slate-400" />
                                                        <span className="truncate max-w-[80px]">{item.tvbhCyber}</span>
                                                    </span>
                                                )}

                                                {item.soCtTd4 && (
                                                    <span className="rounded-full bg-blue-50 px-1.5 py-0.5 font-mono font-semibold text-blue-700 border border-blue-200/60">
                                                        TD4: {item.soCtTd4}
                                                    </span>
                                                )}

                                                {item.soCtDnx && (
                                                    <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 font-mono font-semibold text-indigo-700 border border-indigo-200/60">
                                                        ĐNX: {item.soCtDnx}
                                                    </span>
                                                )}

                                                {item.soHdCyber && (
                                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono font-medium text-slate-600">
                                                        HĐ: {item.soHdCyber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* CHEVRON */}
                                        <div className="flex items-center justify-center pl-1 text-slate-300">
                                            <ChevronRight size={14} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            ) : reconcileMode === 'cross_alloc' ? (
                isLoadingCross ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                            <p className="text-xs font-bold text-slate-700">Đang quét xe phân bổ Thuận An - Showroom khác xuất HĐ...</p>
                        </div>
                    ) : filteredCrossAllocations.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-14 h-14 rounded-2xl bg-white text-emerald-500 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                <CheckCircle2 size={28} strokeWidth={1.8} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">Không có xe phân bổ lệch</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                Tất cả các xe phân bổ cho Thuận An không có showroom khác xuất HĐ mà chưa có ĐNX.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                            <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Cấu hình xe & VIN</div>
                                <div className="flex-1 min-w-0 pl-3 pr-1">Showroom xuất & HĐ</div>
                                <div className="w-3 shrink-0"></div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {filteredCrossAllocations.map((car) => {
                                    const vinStr = car.vin || '';
                                    return (
                                        <div
                                            key={vinStr || car.stt_rec}
                                            onClick={() => setInspectedAllocCar(car)}
                                            className="flex items-center px-3 py-2 min-h-[62px] active:bg-slate-100/80 cursor-pointer select-none transition-colors"
                                        >
                                            {/* LEFT */}
                                            <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-[13px] text-slate-900 tracking-tight leading-tight">
                                                        {car.dong_xe || car.ten_kx || 'VF'}
                                                    </span>
                                                    {car.ten_mau && (
                                                        <span className="rounded-md bg-slate-100 px-1 py-0.5 text-[9.5px] font-medium text-slate-600 truncate max-w-[90px]">
                                                            {car.ten_mau}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyVin(vinStr, e)}
                                                        className="group inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 active:bg-slate-200"
                                                    >
                                                        <span>...{vinStr.slice(-8) || 'N/A'}</span>
                                                        <Copy size={9.5} className="text-slate-400 group-hover:text-slate-600" />
                                                    </button>
                                                    {car.so_so && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {car.so_so}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT */}
                                            <div className="flex-1 min-w-0 pl-3 pr-1 text-[11px] space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800 truncate text-[11.5px]">
                                                        {car.ten_ttcp_xuat || car.ttcp_xuat || 'SR Khác'}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${
                                                        car.has_transferred
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200/60'
                                                    }`}>
                                                        {car.has_transferred ? '✅ Đã ĐNX' : '🚨 Chưa ĐNX'}
                                                    </span>
                                                </div>
                                                <div className="text-slate-600 text-[10.5px] truncate">
                                                    HĐ: <strong className="text-slate-800">{car.so_hd || 'N/A'}</strong> • {car.ten_khach_hang || '—'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    TVBH xuất: <span className="text-slate-600 font-medium">{car.tvbh_xuat || '—'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center pl-1 text-slate-300">
                                                <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                ) : (
                    isLoadingOther ? (
                        <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                            <p className="text-xs font-bold text-slate-700">Đang quét xe phân bổ SR khác - Thuận An xuất HĐ...</p>
                        </div>
                    ) : filteredOtherAllocations.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                            <div className="w-14 h-14 rounded-2xl bg-white text-emerald-500 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                <CheckCircle2 size={28} strokeWidth={1.8} />
                            </div>
                            <h3 className="text-sm font-bold text-slate-700">Không có xe phân bổ lệch</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                Tất cả các xe phân bổ cho Showroom khác mà Thuận An xuất HĐ đều đã có phiếu ĐNX về Thuận An.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                            <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Cấu hình xe & VIN</div>
                                <div className="flex-1 min-w-0 pl-3 pr-1">Showroom PB gốc & HĐ TA</div>
                                <div className="w-3 shrink-0"></div>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {filteredOtherAllocations.map((car) => {
                                    const vinStr = car.vin || '';
                                    return (
                                        <div
                                            key={vinStr || car.stt_rec}
                                            onClick={() => setInspectedAllocCar(car)}
                                            className="flex items-center px-3 py-2 min-h-[62px] active:bg-slate-100/80 cursor-pointer select-none transition-colors"
                                        >
                                            {/* LEFT */}
                                            <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-[13px] text-slate-900 tracking-tight leading-tight">
                                                        {car.dong_xe || car.ten_kx || 'VF'}
                                                    </span>
                                                    {car.ten_mau && (
                                                        <span className="rounded-md bg-slate-100 px-1 py-0.5 text-[9.5px] font-medium text-slate-600 truncate max-w-[90px]">
                                                            {car.ten_mau}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyVin(vinStr, e)}
                                                        className="group inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-800 active:bg-slate-200"
                                                    >
                                                        <span>...{vinStr.slice(-8) || 'N/A'}</span>
                                                        <Copy size={9.5} className="text-slate-400 group-hover:text-slate-600" />
                                                    </button>
                                                    {car.so_so && (
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {car.so_so}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* RIGHT */}
                                            <div className="flex-1 min-w-0 pl-3 pr-1 text-[11px] space-y-0.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800 truncate text-[11.5px]">
                                                        PB: {car.ten_ttcp_phan_bo || car.ttcp_phan_bo || 'SR Khác'}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9px] font-bold border ${
                                                        car.has_transferred
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200/60'
                                                    }`}>
                                                        {car.has_transferred ? '✅ Đã ĐNX' : '🚨 Chưa ĐNX'}
                                                    </span>
                                                </div>
                                                <div className="text-slate-600 text-[10.5px] truncate">
                                                    HĐ TA: <strong className="text-slate-800">{car.so_hd || 'N/A'}</strong> • {car.ten_khach_hang || '—'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    TVBH TA: <span className="text-slate-600 font-medium">{car.tvbh_xuat || '—'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center pl-1 text-slate-300">
                                                <ChevronRight size={14} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}
            </main>

            {/* 3. FLOATING BOTTOM DOCK */}
            <div className="absolute inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/92 px-2 py-1.5 backdrop-blur-2xl">
                <div className="flex items-center gap-1.5">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-0">
                        <div className="pointer-events-none absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                            <Search size={13} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={reconcileMode === 'k83' ? "Tìm VIN, TVBH, số phiếu, dòng xe..." : "Tìm VIN, HĐ, KH, TVBH, showroom..."}
                            className="w-full h-[34px] pl-7 pr-7 rounded-full bg-slate-100 text-[12px] text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Copy Zalo Button */}
                    <button
                        type="button"
                        onClick={reconcileMode === 'k83' ? handleCopyZalo : reconcileMode === 'cross_alloc' ? handleCopyZaloCrossAllocations : handleCopyZaloOtherAllocations}
                        className="h-[34px] px-3 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 shadow-2xs"
                        title="Sao chép danh sách gửi nhóm Zalo"
                    >
                        <Share2 size={12} />
                        <span>Copy Zalo</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={() => {
                            if (reconcileMode === 'k83') handleFetchData(false);
                            else if (reconcileMode === 'cross_alloc') handleFetchCrossAllocations(false);
                            else handleFetchOtherAllocations(false);
                        }}
                        disabled={reconcileMode === 'k83' ? isLoading : reconcileMode === 'cross_alloc' ? isLoadingCross : isLoadingOther}
                        className="h-[34px] px-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
                        title="Đối soát lại"
                    >
                        <RotateCw size={13} className={(reconcileMode === 'k83' ? isLoading : reconcileMode === 'cross_alloc' ? isLoadingCross : isLoadingOther) ? 'animate-spin text-blue-600' : ''} />
                    </button>

                    {/* Filter Button (Only for K83 mode) */}
                    {reconcileMode === 'k83' && (
                        <button
                            type="button"
                            onClick={() => setIsFilterSheetOpen(true)}
                            className={`h-[34px] px-3 rounded-full flex items-center gap-1 text-[11.5px] font-semibold shrink-0 transition-all active:scale-95 ${
                                activeFilterCount > 0
                                    ? 'bg-slate-800 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            <SlidersHorizontal size={12} />
                            <span>Lọc</span>
                            {activeFilterCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* 4. APPLE FILTER BOTTOM SHEET */}
            {isFilterSheetOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setIsFilterSheetOpen(false)}
                    />
                    <div className="relative w-full max-w-md mx-auto max-h-[55dvh] bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                        {/* Drag Handle */}
                        <div className="pt-2.5 pb-1 flex justify-center">
                            <div className="w-9 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* Sheet Header */}
                        <div className="flex items-center justify-between px-4 py-1.5 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800">Bộ Lọc Đối Soát K83</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setStatusFilter('diff');
                                    setModelFilter('all');
                                    setTvbhFilter('all');
                                    setSearchQuery('');
                                }}
                                className="text-xs font-semibold text-blue-600 active:opacity-70"
                            >
                                Đặt lại
                            </button>
                        </div>

                        {/* Filter Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
                            {/* Loại Lệch */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Phân loại đối soát
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: 'diff', label: `🚨 Chỉ xem xe lệch (${countDiff})` },
                                        { id: 'yard_only', label: `Thừa Bãi TT (${countYardOnly})` },
                                        { id: 'cyber_only', label: `Thừa Cyber K83 (${countCyberOnly})` },
                                        { id: 'td4_yard', label: `TD4 Chờ Giao (${countTd4Yard})` },
                                        { id: 'matched', label: `Khớp chuẩn (${countMatched})` },
                                        { id: 'all', label: `Tất cả (${items.length})` }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setStatusFilter(opt.id as any)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                statusFilter === opt.id
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dòng Xe */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Dòng xe
                                </label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => setModelFilter('all')}
                                        className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                            modelFilter === 'all'
                                                ? 'bg-slate-800 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Tất cả dòng
                                    </button>
                                    {uniqueModels.map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setModelFilter(m)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                modelFilter === m
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* TVBH */}
                            {uniqueTvbhs.length > 0 && (
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Tư vấn bán hàng
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setTvbhFilter('all')}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                tvbhFilter === 'all'
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            Tất cả TVBH
                                        </button>
                                        {uniqueTvbhs.map((tv) => (
                                            <button
                                                key={tv}
                                                type="button"
                                                onClick={() => setTvbhFilter(tv)}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                    tvbhFilter === tv
                                                        ? 'bg-slate-800 text-white shadow-2xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {tv}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom CTA */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                            <button
                                type="button"
                                onClick={() => setIsFilterSheetOpen(false)}
                                className="w-full h-[38px] rounded-full bg-slate-700 text-white text-xs font-bold shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
                            >
                                <span>Xem {filteredItems.length} Xe Đối Soát</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. INSPECTION BOTTOM SHEET */}
            {inspectedItem && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setInspectedItem(null)}
                    />
                    <div className="relative w-full max-w-md mx-auto max-h-[65dvh] bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                        {/* Drag Handle */}
                        <div className="pt-2.5 pb-1 flex justify-center">
                            <div className="w-9 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {formatCarModel(inspectedItem.carModel)} {inspectedItem.version}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{inspectedItem.color || 'Màu tiêu chuẩn'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectedItem(null)}
                                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Body Details */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs text-slate-700 no-scrollbar">
                            {/* VIN Card */}
                            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Số khung (VIN)
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-[13px] text-slate-900 select-all">
                                        {inspectedItem.vin}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => handleCopyVin(inspectedItem.vin, e)}
                                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs border border-slate-200"
                                    >
                                        <Copy size={11} />
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </div>

                            {/* Discrepancy Diagnostics */}
                            <div className={`rounded-xl p-3 border ${
                                inspectedItem.reconcileType === 'MATCHED'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : inspectedItem.reconcileType === 'TD4_YARD'
                                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                                    : inspectedItem.reconcileType === 'YARD_ONLY'
                                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                                    : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}>
                                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">
                                    Phát hiện sai lệch
                                </div>
                                <p className="font-bold text-[12.5px] leading-snug mb-1">
                                    {inspectedItem.discrepancyReason}
                                </p>
                                <div className="text-[11px] leading-relaxed opacity-90">
                                    👉 <strong>Hướng xử lý:</strong> {inspectedItem.actionRequired}
                                </div>
                                {inspectedItem.responsiblePerson && (
                                    <div className="mt-1 text-[10.5px] opacity-80">
                                        👤 <strong>Người chịu trách nhiệm:</strong> {inspectedItem.responsiblePerson}
                                    </div>
                                )}
                            </div>

                            {/* Location & Warehouse Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Sổ sách CyberSoft</div>
                                    <div className="font-bold text-slate-800 text-[11.5px]">
                                        {inspectedItem.tenKhoCyber} ({inspectedItem.maKhoCyber})
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Bãi xe thực tế</div>
                                    <div className="font-bold text-slate-800 text-[11.5px]">
                                        {inspectedItem.tenKhoYard || 'Không có xe'}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">TVBH phụ trách</div>
                                    <div className="font-bold text-slate-800 text-[11.5px]">
                                        {inspectedItem.tvbhCyber || '—'}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Khách hàng</div>
                                    <div className="font-bold text-slate-800 text-[11.5px] truncate">
                                        {inspectedItem.customerName || '—'}
                                    </div>
                                </div>
                            </div>

                            {/* Voucher & Document Details */}
                            {(inspectedItem.soCtTd4 || inspectedItem.soCtDnx || inspectedItem.soHdCyber) && (
                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-1">
                                    <div className="text-[10px] text-slate-400 font-semibold">Chứng từ liên quan</div>
                                    {inspectedItem.soCtTd4 && (
                                        <div className="text-[11px] text-slate-700">
                                            • Phiếu TD4: <strong>{inspectedItem.soCtTd4}</strong> {inspectedItem.td4MaPostLabel && `[${inspectedItem.td4MaPostLabel}]`}
                                        </div>
                                    )}
                                    {inspectedItem.soCtDnx && (
                                        <div className="text-[11px] text-slate-700">
                                            • Lệnh ĐNX: <strong>{inspectedItem.soCtDnx}</strong> ({inspectedItem.dnxTenKhoXuat || 'Kho xuất'} ➔ {inspectedItem.dnxTenKhoNhan || 'Kho nhận'})
                                        </div>
                                    )}
                                    {inspectedItem.soHdCyber && (
                                        <div className="text-[11px] text-slate-700">
                                            • Hợp đồng Cyber: <strong>{inspectedItem.soHdCyber}</strong> ({inspectedItem.ngayHdCyber || 'N/A'})
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                            <button
                                type="button"
                                onClick={() => setInspectedItem(null)}
                                className="w-full h-[36px] rounded-full bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-98"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. ALLOCATION CAR INSPECTION SHEET */}
            {inspectedAllocCar && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setInspectedAllocCar(null)}
                    />
                    <div className="relative w-full max-w-md mx-auto max-h-[65dvh] bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                        {/* Drag Handle */}
                        <div className="pt-2.5 pb-1 flex justify-center">
                            <div className="w-9 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {inspectedAllocCar.dong_xe || inspectedAllocCar.ten_kx || 'VinFast'}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    {inspectedAllocCar.ten_mau || inspectedAllocCar.ma_mau || 'Màu tiêu chuẩn'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectedAllocCar(null)}
                                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Body Details */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs text-slate-700 no-scrollbar">
                            {/* VIN Card */}
                            <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                    Số khung (VIN)
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-[13px] text-slate-900 select-all">
                                        {inspectedAllocCar.vin}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => handleCopyVin(inspectedAllocCar.vin, e)}
                                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs border border-slate-200"
                                    >
                                        <Copy size={11} />
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </div>

                            {/* Alert Card */}
                            <div className={`rounded-xl p-3 border ${
                                inspectedAllocCar.has_transferred
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                    : 'bg-rose-50 border-rose-200 text-rose-900'
                            }`}>
                                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">
                                    {reconcileMode === 'cross_alloc'
                                        ? 'Xe Phân Bổ Cho Thuận An — Showroom Khác Xuất HĐ'
                                        : 'Xe Phân Bổ Showroom Khác — Thuận An Xuất HĐ'}
                                </div>
                                <p className="font-bold text-[12.5px] leading-snug mb-1">
                                    {inspectedAllocCar.has_transferred
                                        ? '✅ Đã có phiếu ĐNX điều chuyển ĐĐKD'
                                        : '🚨 Chưa lập phiếu ĐNX (Mã GD = 9) điều chuyển chỉ tiêu'}
                                </p>
                                <div className="text-[11px] leading-relaxed opacity-90">
                                    👉 <strong>Hướng xử lý:</strong> {reconcileMode === 'cross_alloc'
                                        ? `Đề nghị Kế toán liên hệ ${inspectedAllocCar.ten_ttcp_xuat || 'Showroom xuất'} để lập ĐNX điều chuyển ĐĐKD.`
                                        : 'Đề nghị Kế toán Showroom Thuận An lập phiếu ĐNX điều chuyển ĐĐKD về cho Thuận An.'}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">
                                        {reconcileMode === 'cross_alloc' ? 'Showroom xuất HĐ' : 'Showroom phân bổ'}
                                    </div>
                                    <div className="font-bold text-slate-800 text-[11.5px] truncate">
                                        {reconcileMode === 'cross_alloc'
                                            ? (inspectedAllocCar.ten_ttcp_xuat || inspectedAllocCar.ttcp_xuat || '—')
                                            : (inspectedAllocCar.ten_ttcp_phan_bo || inspectedAllocCar.ttcp_phan_bo || '—')}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Số Hợp Đồng</div>
                                    <div className="font-bold text-slate-800 text-[11.5px] truncate">
                                        {inspectedAllocCar.so_hd || '—'}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Tư vấn bán hàng</div>
                                    <div className="font-bold text-slate-800 text-[11.5px] truncate">
                                        {inspectedAllocCar.tvbh_xuat || '—'}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Khách hàng</div>
                                    <div className="font-bold text-slate-800 text-[11.5px] truncate">
                                        {inspectedAllocCar.ten_khach_hang || '—'}
                                    </div>
                                </div>

                                {inspectedAllocCar.so_so && (
                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                        <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Số sổ DMS</div>
                                        <div className="font-mono font-bold text-slate-800 text-[11.5px]">
                                            {inspectedAllocCar.so_so}
                                        </div>
                                    </div>
                                )}

                                {inspectedAllocCar.ngay_hd && (
                                    <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                        <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Ngày hợp đồng</div>
                                        <div className="font-bold text-slate-800 text-[11.5px]">
                                            {inspectedAllocCar.ngay_hd}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                            <button
                                type="button"
                                onClick={() => setInspectedAllocCar(null)}
                                className="w-full h-[36px] rounded-full bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-98"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(MobileReconcileK83View);
