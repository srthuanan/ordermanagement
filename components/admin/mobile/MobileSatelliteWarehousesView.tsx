import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search,
    SlidersHorizontal,
    X,
    RotateCw,
    Copy,
    Check,
    ChevronRight,
    Warehouse,
    BatteryCharging,
    Clock
} from 'lucide-react';
import { formatShortWarehouseName } from '../../../utils/stringUtils';

const CACHE_KEY = 'satellite_warehouses_cache_v1';
const API_URL = 'https://script.google.com/macros/s/AKfycbylEAT8IqQVmKsulKUB5imIUcWm3h7a6Mfe-MQyhF3T5Wu2JWcbO3Q6a1aXZLN7exnV/exec';

export interface MobileSatelliteCarItem {
    id: string;
    khoKey: 'q12' | 'ql13' | 'tada';
    khoName: string;
    stt: string | number;
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
    soNgayTonKho: string | number;
    note: string;
    tinhTrang: string;
    isThuanAn: boolean;
    isTonKho: boolean;
}

interface MobileSatelliteWarehousesViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    allOrders?: any[];
    onNavigateToTab?: (tab: string, options?: any) => void;
}

const formatDate = (val: any): string => {
    if (!val) return '';
    if (val instanceof Date) {
        return `${String(val.getDate()).padStart(2, '0')}/${String(val.getMonth() + 1).padStart(2, '0')}/${val.getFullYear()}`;
    }
    const str = String(val).trim();
    if (str.includes('T')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) {
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
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
    if (numMatch) return { display: str, percent: parseInt(numMatch[1], 10) };
    const rawNum = parseFloat(str);
    if (!isNaN(rawNum)) {
        const pct = rawNum <= 1 ? Math.round(rawNum * 100) : Math.round(rawNum);
        return { display: `${pct}%`, percent: pct };
    }
    return { display: str, percent: null };
};

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

export const MobileSatelliteWarehousesView: React.FC<MobileSatelliteWarehousesViewProps> = ({
    showToast
}) => {
    const [cars, setCars] = useState<MobileSatelliteCarItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [khoFilter, setKhoFilter] = useState<'all' | 'q12' | 'ql13' | 'tada'>('all');
    const [statusFilter, setStatusFilter] = useState<'ton' | 'all' | 'giao'>('ton');
    const [showroomFilter, setShowroomFilter] = useState<'thuan_an' | 'all'>('thuan_an');
    const [modelFilter, setModelFilter] = useState<string>('all');
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [inspectedCar, setInspectedCar] = useState<MobileSatelliteCarItem | null>(null);
    const [copiedVin, setCopiedVin] = useState<string | null>(null);
    const [displayLimit, setDisplayLimit] = useState(100);

    // Parse API raw response
    const parseApiResponse = useCallback((warehouses: Record<string, any>): MobileSatelliteCarItem[] => {
        const parsedList: MobileSatelliteCarItem[] = [];

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

    // Load from local cache on mount
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

    // Fetch fresh from Google Sheets
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
                showToast('Thành công', `Đã cập nhật ${parsed.length} xe từ 3 kho bãi vệ tinh!`, 'success');
            }
        } catch (err: any) {
            console.error('Fetch error:', err);
            if (!silent) {
                showToast('Lỗi cập nhật', err.message || 'Không thể kết nối đến Google Sheets', 'error');
            }
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleCopyVin = (vin: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vin);
        setCopiedVin(vin);
        showToast('Đã sao chép', `Đã copy VIN: ${vin}`, 'success', 1500);
        setTimeout(() => setCopiedVin(null), 1500);
    };

    // Filtered cars
    const filteredCars = useMemo(() => {
        return cars.filter(c => {
            if (khoFilter !== 'all' && c.khoKey !== khoFilter) return false;
            if (modelFilter !== 'all' && c.loaiXe.trim() !== modelFilter) return false;
            if (showroomFilter === 'thuan_an' && !c.isThuanAn) return false;
            if (statusFilter === 'ton' && !c.isTonKho) return false;
            if (statusFilter === 'giao' && c.isTonKho) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchVin = c.soKhung.toLowerCase().includes(q);
                const matchModel = c.loaiXe.toLowerCase().includes(q);
                const matchColor = c.mauSac.toLowerCase().includes(q);
                const matchSr = c.showroomQuanLy.toLowerCase().includes(q);
                const matchNote = c.note.toLowerCase().includes(q);
                const matchKho = c.khoName.toLowerCase().includes(q);
                if (!matchVin && !matchModel && !matchColor && !matchSr && !matchNote && !matchKho) return false;
            }
            return true;
        });
    }, [cars, khoFilter, modelFilter, showroomFilter, statusFilter, searchQuery]);

    // Unique models for filter
    const uniqueModels = useMemo(() => {
        const set = new Set<string>();
        cars.forEach(c => {
            if (c.loaiXe) set.add(c.loaiXe.trim());
        });
        return Array.from(set).sort();
    }, [cars]);

    // Active filters count
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (khoFilter !== 'all') count++;
        if (statusFilter !== 'ton') count++;
        if (showroomFilter !== 'thuan_an') count++;
        if (modelFilter !== 'all') count++;
        return count;
    }, [khoFilter, statusFilter, showroomFilter, modelFilter]);

    // Metric counts
    const countTonBai = useMemo(() => cars.filter(c => c.isTonKho).length, [cars]);
    const countThuanAn = useMemo(() => cars.filter(c => c.isThuanAn && c.isTonKho).length, [cars]);
    const countQ12 = useMemo(() => cars.filter(c => c.khoKey === 'q12' && c.isTonKho).length, [cars]);
    const countQl13 = useMemo(() => cars.filter(c => c.khoKey === 'ql13' && c.isTonKho).length, [cars]);

    const displayedCars = useMemo(() => {
        return filteredCars.slice(0, displayLimit);
    }, [filteredCars, displayLimit]);

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#f2f2f7] relative">
            {/* 1. TOP QUICK METRIC STRIP */}
            <div className="shrink-0 bg-white border-b border-slate-200/80 px-3 py-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] font-semibold">
                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('ton');
                            setShowroomFilter('thuan_an');
                            setKhoFilter('all');
                        }}
                        className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                            statusFilter === 'ton' && showroomFilter === 'thuan_an' && khoFilter === 'all'
                                ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                        }`}
                    >
                        <span>🟢 Thuận An tồn</span>
                        <span className="text-[10px] font-bold opacity-80">({countThuanAn})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('ton');
                            setShowroomFilter('all');
                            setKhoFilter('all');
                        }}
                        className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                            statusFilter === 'ton' && showroomFilter === 'all' && khoFilter === 'all'
                                ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                        }`}
                    >
                        <span>Tồn 3 kho</span>
                        <span className="text-[10px] font-bold opacity-80">({countTonBai})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setKhoFilter('q12');
                            setStatusFilter('ton');
                        }}
                        className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                            khoFilter === 'q12'
                                ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                        }`}
                    >
                        <span>Quận 12</span>
                        <span className="text-[10px] font-bold opacity-80">({countQ12})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setKhoFilter('ql13');
                            setStatusFilter('ton');
                        }}
                        className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                            khoFilter === 'ql13'
                                ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                        }`}
                    >
                        <span>QL 13</span>
                        <span className="text-[10px] font-bold opacity-80">({countQl13})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setStatusFilter('all');
                            setShowroomFilter('all');
                            setKhoFilter('all');
                        }}
                        className={`h-[26px] px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                            statusFilter === 'all' && showroomFilter === 'all' && khoFilter === 'all'
                                ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium'
                        }`}
                    >
                        <span>Tất cả</span>
                        <span className="text-[10px] font-bold opacity-80">({cars.length})</span>
                    </button>
                </div>
            </div>

            {/* 2. TABLE BODY */}
            <main className="flex-1 overflow-y-auto px-3 pt-2 pb-16 no-scrollbar">
                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs font-bold text-slate-700">Đang tải dữ liệu 3 kho bãi từ Google Sheets...</p>
                    </div>
                ) : displayedCars.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                            <Warehouse size={26} strokeWidth={1.8} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">Không tìm thấy xe trong bãi</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Thử điều chỉnh lại bộ lọc hoặc bấm nút Làm mới để cập nhật bảng xe mới nhất.
                        </p>
                        <div className="mt-3.5 flex items-center gap-2">
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="px-3 py-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95"
                                >
                                    Xóa từ khóa
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => handleFetchData(false)}
                                className="px-3.5 py-1.5 rounded-full bg-slate-800 text-white text-xs font-semibold shadow-xs active:scale-95"
                            >
                                Làm mới dữ liệu
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                        {/* Table Header */}
                        <div className="flex items-center px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                            <div className="flex-1 min-w-0 pr-3 border-r border-slate-200/60">Cấu hình xe</div>
                            <div className="flex-1 min-w-0 pl-3 pr-1">Vị trí bãi / Trạng thái</div>
                            <div className="w-3 shrink-0"></div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-slate-100">
                            {displayedCars.map((item) => {
                                const isThuanAn = item.isThuanAn;
                                const isTon = item.isTonKho;
                                const shortWh = formatShortWarehouseName(item.khoName);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setInspectedCar(item)}
                                        className="flex min-h-[62px] cursor-pointer select-none items-center justify-between px-3.5 py-2.5 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70"
                                    >
                                        {/* CỘT 1: CẤU HÌNH XE */}
                                        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 pr-3">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-bold text-[13px] tracking-tight text-slate-900 truncate">
                                                    {formatCarModel(item.loaiXe)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 font-medium truncate">
                                                <span
                                                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                                                    style={{ backgroundColor: getExteriorSwatchColor(item.mauSac) }}
                                                    title={item.mauSac}
                                                />
                                                <span className="truncate text-slate-600" title={item.mauSac}>
                                                    {item.mauSac || 'Màu tiêu chuẩn'}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleCopyVin(item.soKhung, e)}
                                                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-1 py-0.5 font-mono text-[9.5px] font-semibold text-slate-700 hover:bg-slate-200 active:scale-95"
                                                    title={`VIN: ${item.soKhung}`}
                                                >
                                                    {copiedVin === item.soKhung ? (
                                                        <Check size={10} className="text-emerald-600" />
                                                    ) : (
                                                        <Copy size={10} className="text-slate-400" />
                                                    )}
                                                    <span>{item.soKhung.length >= 8 ? item.soKhung.slice(-8) : item.soKhung}</span>
                                                </button>
                                            </div>

                                            {item.note && (
                                                <p className="text-[10px] text-amber-700 italic truncate line-clamp-1">
                                                    {item.note}
                                                </p>
                                            )}
                                        </div>

                                        {/* CỘT 2: VỊ TRÍ BÃI / TRẠNG THÁI */}
                                        <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1 self-stretch pl-3 pr-1">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700">
                                                    <Warehouse size={10} className="text-slate-400" />
                                                    <span className="truncate">{shortWh}</span>
                                                </span>

                                                {isThuanAn && (
                                                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-700 border border-emerald-200/60">
                                                        Thuận An
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                                                {isTon ? (
                                                    <span className="rounded-full bg-emerald-100/80 px-2 py-0.5 font-bold text-emerald-800">
                                                        Đang tồn bãi
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-slate-200/80 px-2 py-0.5 font-medium text-slate-600">
                                                        Đã xuất / Giao
                                                    </span>
                                                )}

                                                {item.mucPin && item.mucPin !== '-' && (
                                                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700 border border-amber-200/60">
                                                        <BatteryCharging size={9} />
                                                        <span>{item.mucPin}</span>
                                                    </span>
                                                )}

                                                {item.soNgayTonKho && String(item.soNgayTonKho).trim() !== '' && (
                                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 font-medium">
                                                        <Clock size={9} />
                                                        <span>{item.soNgayTonKho} ngày</span>
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
                )}

                {/* Progressive load more */}
                {filteredCars.length > displayLimit && (
                    <div className="mt-3 text-center pb-2">
                        <button
                            type="button"
                            onClick={() => setDisplayLimit(prev => Math.min(prev + 100, filteredCars.length))}
                            className="px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-2xs active:scale-95"
                        >
                            Xem thêm (Hiển thị {displayLimit}/{filteredCars.length} xe)
                        </button>
                    </div>
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
                            placeholder="Tìm VIN, dòng xe, màu, bãi..."
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

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={() => handleFetchData(false)}
                        disabled={isLoading}
                        className="h-[34px] px-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 active:scale-95 disabled:opacity-50"
                        title="Làm mới dữ liệu bãi xe"
                    >
                        <RotateCw size={13} className={isLoading ? 'animate-spin text-blue-600' : ''} />
                    </button>

                    {/* Filter Button */}
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
                            <h3 className="text-sm font-bold text-slate-800">Bộ Lọc Bãi Xe (3 Kho)</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setKhoFilter('all');
                                    setStatusFilter('ton');
                                    setShowroomFilter('thuan_an');
                                    setModelFilter('all');
                                    setSearchQuery('');
                                }}
                                className="text-xs font-semibold text-blue-600 active:opacity-70"
                            >
                                Đặt lại
                            </button>
                        </div>

                        {/* Filter Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
                            {/* Kho Bãi */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Kho bãi thực tế
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: 'all', label: `Tất cả (${cars.length})` },
                                        { id: 'tada', label: `Kho Thuận An (${cars.filter(c => c.khoKey === 'tada').length})` },
                                        { id: 'q12', label: `Kho Quận 12 (${cars.filter(c => c.khoKey === 'q12').length})` },
                                        { id: 'ql13', label: `Kho QL 13 (${cars.filter(c => c.khoKey === 'ql13').length})` }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setKhoFilter(opt.id as any)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                khoFilter === opt.id
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tình Trạng Tồn Kho */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Tình trạng xe
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: 'ton', label: `Còn tồn bãi (${countTonBai})` },
                                        { id: 'all', label: `Tất cả (${cars.length})` },
                                        { id: 'giao', label: `Đã xuất / Giao (${cars.length - countTonBai})` }
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

                            {/* Showroom Quản Lý */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Showroom quản lý
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: 'thuan_an', label: `🟢 Thuận An (${cars.filter(c => c.isThuanAn).length})` },
                                        { id: 'all', label: `Tất cả showroom (${cars.length})` }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setShowroomFilter(opt.id as any)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                showroomFilter === opt.id
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
                                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => setModelFilter('all')}
                                        className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                            modelFilter === 'all'
                                                ? 'bg-slate-800 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Tất cả
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
                        </div>

                        {/* Bottom CTA */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                            <button
                                type="button"
                                onClick={() => setIsFilterSheetOpen(false)}
                                className="w-full h-[38px] rounded-full bg-slate-700 text-white text-xs font-bold shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
                            >
                                <span>Xem {filteredCars.length} Xe Bãi Vệ Tinh</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. INSPECTION BOTTOM SHEET */}
            {inspectedCar && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setInspectedCar(null)}
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
                                    {formatCarModel(inspectedCar.loaiXe)}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">{inspectedCar.mauSac}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setInspectedCar(null)}
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
                                        {inspectedCar.soKhung}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => handleCopyVin(inspectedCar.soKhung, e)}
                                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs border border-slate-200"
                                    >
                                        <Copy size={11} />
                                        <span>Copy</span>
                                    </button>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Vị trí bãi</div>
                                    <div className="font-bold text-slate-800 text-[12px]">{inspectedCar.khoName}</div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Showroom quản lý</div>
                                    <div className="font-bold text-slate-800 text-[12px]">{inspectedCar.showroomQuanLy || '—'}</div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Mức pin</div>
                                    <div className="font-bold text-amber-600 text-[12px] flex items-center gap-1">
                                        <BatteryCharging size={13} />
                                        <span>{inspectedCar.mucPin || '—'}</span>
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Lưu bãi</div>
                                    <div className="font-bold text-slate-800 text-[12px]">
                                        {inspectedCar.soNgayTonKho ? `${inspectedCar.soNgayTonKho} ngày` : '—'}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Ngày nhận xe</div>
                                    <div className="font-medium text-slate-800 text-[11px]">{inspectedCar.ngayNhan || '—'}</div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Bên giao</div>
                                    <div className="font-medium text-slate-800 text-[11px] truncate">{inspectedCar.benGiao || '—'}</div>
                                </div>
                            </div>

                            {/* Note / Tình trạng */}
                            {inspectedCar.note && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200/60 p-2.5 text-amber-800">
                                    <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-amber-600">
                                        Ghi chú kho
                                    </div>
                                    <p className="text-[11.5px] leading-relaxed">{inspectedCar.note}</p>
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
                            <button
                                type="button"
                                onClick={() => setInspectedCar(null)}
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

export default React.memo(MobileSatelliteWarehousesView);
