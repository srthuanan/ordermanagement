import React, { useState, useMemo } from 'react';
import moment from 'moment';
import {
    Search,
    SlidersHorizontal,
    X,
    RotateCw,
    Copy,
    ChevronRight,
    Phone,
    Share2,
    Car
} from 'lucide-react';
import { getExteriorSwatchColor } from '../../../utils/styleUtils';

export interface MobileDonHangTonViewProps {
    backlogOrders: any[];
    isLoading: boolean;
    isSyncingCyber: boolean;
    onSyncCyber: () => void;
    onRefresh: () => void;
    onUpdateProgress?: (id: string, newProgress: string, e?: React.MouseEvent) => Promise<void>;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

export const MobileDonHangTonView: React.FC<MobileDonHangTonViewProps> = ({
    backlogOrders,
    isLoading,
    isSyncingCyber,
    onSyncCyber,
    onRefresh,
    onUpdateProgress,
    showToast
}) => {
    // Local filters
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModel, setSelectedModel] = useState('all');
    const [selectedTvbh, setSelectedTvbh] = useState('all');
    const [selectedMonthYear, setSelectedMonthYear] = useState('all');
    const [selectedDaysFilter, setSelectedDaysFilter] = useState<'all' | 'over_30' | 'over_60'>('all');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'coc_desc' | 'coc_asc'>('date_desc');

    // UI state
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    // Chuẩn hóa tên dòng xe VinFast
    const formatCarModel = (model?: string): string => {
        if (!model) return 'VF';
        const m = model.trim();
        if (m.toUpperCase().startsWith('VF') && !m.toUpperCase().startsWith('VF ')) {
            return `VF ${m.slice(2).trim()}`;
        }
        return m;
    };

    // Chuẩn hóa tên khách hàng Title Case chuẩn Apple iOS
    const formatCustomerName = (name?: string): string => {
        if (!name) return '—';
        const raw = String(name).trim();
        if (!raw) return '—';

        const words = raw.split(/\s+/);
        const keepUpperSet = new Set(['TNHH', 'CP', 'MTV', 'TM', 'DV', 'XD', 'ĐT', 'KT', 'CN', 'XNK', 'SX', 'BĐS', 'VINFAST', 'VF', 'VSO', 'ARI']);

        return words.map(w => {
            const clean = w.replace(/[^\w\u00C0-\u1EF9]/gi, '');
            if (keepUpperSet.has(clean.toUpperCase())) {
                return w.toUpperCase();
            }
            return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
        }).join(' ');
    };

    // Danh sách dòng xe kèm số lượng
    const modelStats = useMemo(() => {
        const counts = new Map<string, number>();
        backlogOrders.forEach(o => {
            const m = o.displayModel || 'Khác';
            counts.set(m, (counts.get(m) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([model, count]) => ({ model, count }));
    }, [backlogOrders]);

    // Danh sách TVBH kèm số lượng
    const tvbhList = useMemo(() => {
        const counts = new Map<string, { count: number; totalCoc: number }>();
        backlogOrders.forEach(o => {
            const name = o.tvbh_name || 'Khác';
            const cur = counts.get(name) || { count: 0, totalCoc: 0 };
            cur.count += 1;
            cur.totalCoc += Number(o.tien_coc || 0);
            counts.set(name, cur);
        });
        return Array.from(counts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([name, s]) => ({ name, count: s.count, totalCoc: s.totalCoc }));
    }, [backlogOrders]);

    // Danh sách Tháng/Năm
    const monthYearList = useMemo(() => {
        const counts = new Map<string, { key: string; label: string; count: number }>();
        backlogOrders.forEach(o => {
            const rawDate = o.ngay_hop_dong || o.ngay_giao_dich;
            if (!rawDate) return;
            const m = moment(rawDate);
            if (m.isValid()) {
                const key = m.format('YYYY-MM');
                const label = `Tháng ${m.format('MM/YYYY')}`;
                const cur = counts.get(key) || { key, label, count: 0 };
                cur.count += 1;
                counts.set(key, cur);
            }
        });
        return Array.from(counts.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [backlogOrders]);

    // Thống kê tổng hợp 1 dòng
    const kpiSummary = useMemo(() => {
        const totalCount = backlogOrders.length;
        const totalCoc = backlogOrders.reduce((sum, o) => sum + Number(o.tien_coc || 0), 0);
        const topModel = modelStats.length > 0 ? `${modelStats[0].model} (${modelStats[0].count})` : '—';
        const over30Count = backlogOrders.filter(o => {
            const days = moment().diff(moment(o.ngay_hop_dong || o.ngay_giao_dich), 'days');
            return days >= 30;
        }).length;

        return {
            totalCount,
            totalCocMillion: Math.round(totalCoc / 1_000_000),
            totalCocFormatted: totalCoc.toLocaleString('vi-VN'),
            activeTvbhCount: tvbhList.length,
            topModel,
            over30Count
        };
    }, [backlogOrders, modelStats, tvbhList]);

    // Danh sách đơn hàng đã lọc và sắp xếp
    const filteredOrders = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return backlogOrders
            .filter(order => {
                if (selectedModel !== 'all' && order.displayModel !== selectedModel) return false;
                if (selectedTvbh !== 'all' && order.tvbh_name !== selectedTvbh) return false;

                if (selectedMonthYear !== 'all') {
                    const rawDate = order.ngay_hop_dong || order.ngay_giao_dich;
                    if (!rawDate) return false;
                    const m = moment(rawDate);
                    if (!m.isValid() || m.format('YYYY-MM') !== selectedMonthYear) return false;
                }

                if (selectedDaysFilter !== 'all') {
                    const daysAgo = moment().diff(moment(order.ngay_hop_dong || order.ngay_giao_dich), 'days');
                    if (selectedDaysFilter === 'over_30' && daysAgo < 30) return false;
                    if (selectedDaysFilter === 'over_60' && daysAgo < 60) return false;
                }

                if (q) {
                    const matchKh = (order.khach_hang || '').toLowerCase().includes(q);
                    const matchPhone = (order.so_dien_thoai || '').includes(q);
                    const matchHd = (order.so_hop_dong || order.so_don_hang || '').toLowerCase().includes(q);
                    const matchVin = (order.vin || '').toLowerCase().includes(q);
                    const matchTvbh = (order.tvbh_name || '').toLowerCase().includes(q);
                    const matchModel = (order.displayModel || '').toLowerCase().includes(q);
                    if (!matchKh && !matchPhone && !matchHd && !matchVin && !matchTvbh && !matchModel) return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'date_desc') {
                    return new Date(b.ngay_hop_dong || b.ngay_giao_dich || 0).getTime() - new Date(a.ngay_hop_dong || a.ngay_giao_dich || 0).getTime();
                }
                if (sortBy === 'date_asc') {
                    return new Date(a.ngay_hop_dong || a.ngay_giao_dich || 0).getTime() - new Date(b.ngay_hop_dong || b.ngay_giao_dich || 0).getTime();
                }
                if (sortBy === 'coc_desc') {
                    return Number(b.tien_coc || 0) - Number(a.tien_coc || 0);
                }
                if (sortBy === 'coc_asc') {
                    return Number(a.tien_coc || 0) - Number(b.tien_coc || 0);
                }
                return 0;
            });
    }, [backlogOrders, selectedModel, selectedTvbh, selectedMonthYear, selectedDaysFilter, searchQuery, sortBy]);



    // Số lượng filter đang kích hoạt
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (selectedModel !== 'all') count++;
        if (selectedTvbh !== 'all') count++;
        if (selectedMonthYear !== 'all') count++;
        if (selectedDaysFilter !== 'all') count++;
        if (sortBy !== 'date_desc') count++;
        return count;
    }, [selectedModel, selectedTvbh, selectedMonthYear, selectedDaysFilter, sortBy]);

    // Copy số VIN
    const handleCopyVin = (vin: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!vin || vin === 'N/A') return;
        navigator.clipboard.writeText(vin);
        showToast('Đã sao chép VIN', vin, 'success', 2000);
    };

    // Copy tóm tắt Zalo
    const handleCopyZaloSummary = (order: any, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const daysAgo = moment().diff(moment(order.ngay_hop_dong || order.ngay_giao_dich), 'days');
        const text = `📋 ĐƠN CỌC TỒN VINFAST THUẬN AN
• Khách hàng: ${order.khach_hang || 'N/A'}
• SĐT: ${order.so_dien_thoai || 'N/A'}
• TVBH: ${order.tvbh_name || 'N/A'}
• Dòng xe: ${order.displayModel} - ${order.displayVersion || 'Tiêu chuẩn'}
• Màu sắc: ${order.ngoai_that || 'Tiêu chuẩn'}${order.noi_that ? ` / ${order.noi_that}` : ''}
• Tiền cọc: ${Number(order.tien_coc || 0).toLocaleString('vi-VN')} đ
• Số HĐ Cyber: ${order.so_hop_dong || order.so_don_hang || 'Chưa có'}
• Ngày ký: ${moment(order.ngay_hop_dong || order.ngay_giao_dich).format('DD/MM/YYYY')} (Tồn ${daysAgo} ngày)
• Tiến độ: ${order.tien_do || 'Chờ xe'}`;

        navigator.clipboard.writeText(text);
        showToast('Đã sao chép Zalo', `Đã sao chép đơn cọc của ${order.khach_hang}!`, 'success', 2500);
    };

    return (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#f2f2f7] relative">
            {/* 1. TOP APPLE KPI TILES & QUICK PILLS */}
            <div className="shrink-0 bg-white border-b border-black/[0.06] px-3 pt-2 pb-2 shadow-2xs">
                {/* 4 Apple Compact Stats Tiles */}
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                    <div className="bg-[#f2f2f7] rounded-xl p-2 flex flex-col justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">Đơn cọc</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-[15px] font-bold text-slate-900 leading-tight">{kpiSummary.totalCount}</span>
                            <span className="text-[9.5px] font-semibold text-slate-400">đơn</span>
                        </div>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-xl p-2 flex flex-col justify-between">
                        <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-tight">Tổng cọc</span>
                        <div className="flex items-baseline gap-0.5 mt-0.5">
                            <span className="text-[15px] font-bold text-emerald-700 font-mono leading-tight">{kpiSummary.totalCocMillion}</span>
                            <span className="text-[10px] font-bold text-emerald-600">tr</span>
                        </div>
                    </div>

                    <div className="bg-[#f2f2f7] rounded-xl p-2 flex flex-col justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight">TVBH</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-[15px] font-bold text-slate-900 leading-tight">{kpiSummary.activeTvbhCount}</span>
                            <span className="text-[9.5px] font-semibold text-slate-400">người</span>
                        </div>
                    </div>

                    <div className={`rounded-xl p-2 flex flex-col justify-between transition-all ${
                        kpiSummary.over30Count > 0 
                            ? 'bg-amber-50 border border-amber-200/80' 
                            : 'bg-[#f2f2f7]'
                    }`}>
                        <span className={`text-[10px] font-semibold uppercase tracking-tight ${
                            kpiSummary.over30Count > 0 ? 'text-amber-700' : 'text-slate-500'
                        }`}>
                            Tồn ≥30d
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={`text-[15px] font-bold leading-tight ${
                                kpiSummary.over30Count > 0 ? 'text-amber-800' : 'text-slate-900'
                            }`}>
                                {kpiSummary.over30Count}
                            </span>
                            <span className={`text-[9.5px] font-semibold ${
                                kpiSummary.over30Count > 0 ? 'text-amber-600' : 'text-slate-400'
                            }`}>
                                đơn
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Model Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5 text-[11px] font-semibold">
                    <button
                        type="button"
                        onClick={() => setSelectedModel('all')}
                        className={`h-7 px-3 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                            selectedModel === 'all'
                                ? 'bg-blue-600 text-white shadow-xs font-semibold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 font-medium'
                        }`}
                    >
                        <span>Tất cả</span>
                        <span className={`text-[10px] ${selectedModel === 'all' ? 'text-blue-100 font-bold' : 'text-slate-400'}`}>
                            ({backlogOrders.length})
                        </span>
                    </button>

                    {modelStats.map((item) => (
                        <button
                            key={item.model}
                            type="button"
                            onClick={() => setSelectedModel(item.model === selectedModel ? 'all' : item.model)}
                            className={`h-7 px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                                selectedModel === item.model
                                    ? 'bg-blue-600 text-white shadow-xs font-semibold'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 font-medium'
                            }`}
                        >
                            <span>{item.model}</span>
                            <span className={`text-[10px] ${selectedModel === item.model ? 'text-blue-100 font-bold' : 'text-slate-400'}`}>
                                ({item.count})
                            </span>
                        </button>
                    ))}

                    <div className="h-3.5 w-px bg-slate-200 shrink-0 mx-0.5" />

                    <button
                        type="button"
                        onClick={() => setSelectedDaysFilter(selectedDaysFilter === 'over_30' ? 'all' : 'over_30')}
                        className={`h-7 px-2.5 rounded-full shrink-0 flex items-center gap-1 transition-all ${
                            selectedDaysFilter === 'over_30'
                                ? 'bg-amber-500 text-white shadow-xs font-semibold'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/70 font-medium'
                        }`}
                    >
                        <span>Tồn ≥30d</span>
                    </button>
                </div>
            </div>

            {/* 2. TABLE BODY (APPLE INSET TABLE) */}
            <main className="flex-1 overflow-y-auto px-3 pt-2 pb-20 no-scrollbar">
                {isLoading ? (
                    <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                        <p className="text-xs font-bold text-slate-700">Đang tải danh sách đơn cọc tồn...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                        <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                            <Car size={26} strokeWidth={1.8} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700">Không tìm thấy đơn cọc nào</h3>
                        <p className="text-xs text-slate-400 mt-1 max-w-xs">
                            Thử xóa bộ lọc hoặc tìm kiếm theo từ khóa khác.
                        </p>
                        {activeFilterCount > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedModel('all');
                                    setSelectedTvbh('all');
                                    setSelectedMonthYear('all');
                                    setSelectedDaysFilter('all');
                                    setSortBy('date_desc');
                                }}
                                className="mt-3.5 px-3.5 py-1.5 rounded-full bg-slate-800 text-white text-xs font-semibold shadow-xs active:scale-95"
                            >
                                Đặt lại bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-2xs">
                        {/* 🏷️ Header dạng bảng Apple iOS */}
                        <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10.5px] font-bold text-slate-500 uppercase tracking-wider select-none">
                            <span>Khách hàng & Cấu hình xe</span>
                            <span>Tiền cọc & Tiến độ</span>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-slate-100">
                            {filteredOrders.map((order) => {
                                const daysAgo = moment().diff(moment(order.ngay_hop_dong || order.ngay_giao_dich), 'days');
                                const exteriorColor = order.ngoai_that || 'Tiêu chuẩn';
                                const swatchColor = getExteriorSwatchColor(exteriorColor);
                                const customerName = formatCustomerName(order.khach_hang);
                                const carModel = formatCarModel(order.displayModel);
                                const carTrim = order.displayVersion && order.displayVersion !== 'Tiêu chuẩn' ? order.displayVersion : '';
                                const tvbhName = order.tvbh_name ? formatCustomerName(order.tvbh_name) : 'Chưa phân bổ';
                                const contractNo = order.so_hop_dong || order.so_don_hang || '';
                                const vin = order.vin && order.vin !== 'N/A' ? order.vin : '';

                                return (
                                    <div
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className="px-3.5 py-2.5 active:bg-slate-50/90 cursor-pointer select-none transition-colors"
                                    >
                                        {/* LINE 1: KHÁCH HÀNG & TIỀN CỌC + BADGE NGÀY TỒN */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="font-bold text-[13px] text-slate-900 tracking-tight truncate flex-1 min-w-0" title={order.khach_hang}>
                                                {customerName}
                                            </div>

                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className="font-mono font-bold text-emerald-700 text-[12.5px]">
                                                    {Number(order.tien_coc || 0).toLocaleString('vi-VN')} đ
                                                </span>
                                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[9.5px] font-bold border ${
                                                    daysAgo >= 60
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200/60'
                                                        : daysAgo >= 30
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                                                        : 'bg-slate-100 text-slate-600 border-slate-200/60'
                                                }`}>
                                                    Tồn {daysAgo}d
                                                </span>
                                            </div>
                                        </div>

                                        {/* LINE 2: DÒNG XE, BẢN, MÀU NGOẠI THẤT & TIẾN ĐỘ */}
                                        <div className="flex items-center justify-between gap-2 mt-1">
                                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                                <span className="font-semibold text-[12px] text-slate-800 tracking-tight">
                                                    {carModel}
                                                </span>
                                                {carTrim && (
                                                    <span className="text-[11px] font-medium text-slate-500 truncate max-w-[130px]">
                                                        {carTrim}
                                                    </span>
                                                )}
                                                {exteriorColor && (
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] text-slate-500 font-normal shrink-0">
                                                        <span
                                                            className="h-2 w-2 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                                                            style={{ backgroundColor: swatchColor }}
                                                        />
                                                        <span className="truncate max-w-[80px]">{exteriorColor}</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 text-blue-600">
                                                <span className="text-[11px] font-semibold truncate max-w-[95px]">
                                                    {order.tien_do || 'Chờ xe'}
                                                </span>
                                                <ChevronRight size={13} className="text-slate-300 -mr-0.5" />
                                            </div>
                                        </div>

                                        {/* LINE 3: SỐ HỢP ĐỒNG, VIN & TVBH */}
                                        <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-slate-50 text-[10.5px] text-slate-500">
                                            <div className="flex items-center gap-1.5 min-w-0 font-mono text-[10px]">
                                                {contractNo ? (
                                                    <span className="text-slate-600 truncate max-w-[140px]" title={contractNo}>
                                                        HĐ: {contractNo}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Chưa có HĐ</span>
                                                )}

                                                {vin && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyVin(vin, e)}
                                                        className="group inline-flex items-center gap-0.5 rounded bg-slate-100/90 hover:bg-slate-200/80 px-1 py-0.2 font-mono text-[9px] font-semibold text-slate-600 active:scale-95 transition-all"
                                                        title="Bấm copy VIN"
                                                    >
                                                        <span>...{vin.slice(-6)}</span>
                                                        <Copy size={8} className="text-slate-400 group-hover:text-slate-600" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 text-slate-500">
                                                <i className="fas fa-user-tie text-[9px] text-slate-400" />
                                                <span className="truncate max-w-[110px] font-medium text-slate-600">{tvbhName}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* 3. APPLE FLOATING BOTTOM DOCK */}
            <div className="absolute inset-x-0 bottom-0 z-30 border-t border-black/[0.08] bg-white/92 px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-2xl shadow-[0_-6px_20px_rgba(0,0,0,0.06)]">
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
                            placeholder="Tìm khách hàng, SĐT, số HĐ, VIN, TVBH..."
                            className="w-full h-8 pl-7 pr-7 rounded-full bg-slate-100 text-[12px] text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500/50 transition-all border border-transparent focus:border-blue-500"
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

                    {/* Sync from Cyber Button */}
                    <button
                        type="button"
                        onClick={onSyncCyber}
                        disabled={isSyncingCyber}
                        className="h-8 px-3 rounded-full bg-slate-900 hover:bg-black text-white text-[11px] font-semibold flex items-center gap-1.5 shrink-0 active:scale-95 shadow-xs disabled:opacity-60 transition-all"
                        title="Đồng bộ đơn cọc tồn mới nhất từ CyberSoft"
                    >
                        <RotateCw size={11} className={isSyncingCyber ? 'animate-spin text-blue-400' : ''} />
                        <span>{isSyncingCyber ? 'Đồng bộ...' : 'Cyber'}</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={onRefresh}
                        disabled={isLoading}
                        className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 flex items-center justify-center shrink-0 active:scale-90 disabled:opacity-50 transition-all"
                        title="Tải lại dữ liệu"
                    >
                        <RotateCw size={12} className={isLoading ? 'animate-spin text-blue-600' : ''} />
                    </button>

                    {/* Filter Button */}
                    <button
                        type="button"
                        onClick={() => setIsFilterSheetOpen(true)}
                        className={`h-8 px-2.5 rounded-full flex items-center gap-1 text-[11.5px] font-semibold shrink-0 transition-all active:scale-95 ${
                            activeFilterCount > 0
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                        }`}
                    >
                        <SlidersHorizontal size={12} />
                        <span>Lọc</span>
                        {activeFilterCount > 0 && (
                            <span className="w-3.5 h-3.5 rounded-full bg-white text-blue-600 text-[9px] font-bold flex items-center justify-center">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* 4. APPLE FILTER BOTTOM SHEET (55dvh) */}
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
                            <h3 className="text-sm font-bold text-slate-800">Bộ Lọc Đơn Hàng Tồn</h3>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedModel('all');
                                    setSelectedTvbh('all');
                                    setSelectedMonthYear('all');
                                    setSelectedDaysFilter('all');
                                    setSortBy('date_desc');
                                    setSearchQuery('');
                                }}
                                className="text-xs font-semibold text-blue-600 active:opacity-70"
                            >
                                Đặt lại
                            </button>
                        </div>

                        {/* Filter Content */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 no-scrollbar">
                            {/* Thời gian tồn bãi */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Thời gian cọc tồn
                                </label>
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { id: 'all', label: `Tất cả (${backlogOrders.length})` },
                                        { id: 'over_30', label: `Tồn ≥ 30 ngày (${kpiSummary.over30Count})` },
                                        { id: 'over_60', label: `Tồn ≥ 60 ngày` }
                                    ].map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setSelectedDaysFilter(opt.id as any)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                selectedDaysFilter === opt.id
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dòng xe */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Dòng xe
                                </label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedModel('all')}
                                        className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                            selectedModel === 'all'
                                                ? 'bg-slate-800 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Tất cả dòng
                                    </button>
                                    {modelStats.map((m) => (
                                        <button
                                            key={m.model}
                                            type="button"
                                            onClick={() => setSelectedModel(m.model)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                selectedModel === m.model
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {m.model} ({m.count})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* TVBH Phụ Trách */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Tư vấn bán hàng
                                </label>
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTvbh('all')}
                                        className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                            selectedTvbh === 'all'
                                                ? 'bg-slate-800 text-white shadow-2xs'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        Tất cả TVBH
                                    </button>
                                    {tvbhList.map((tv) => (
                                        <button
                                            key={tv.name}
                                            type="button"
                                            onClick={() => setSelectedTvbh(tv.name)}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                selectedTvbh === tv.name
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {tv.name} ({tv.count})
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tháng / Năm */}
                            {monthYearList.length > 0 && (
                                <div>
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                        Tháng giao dịch
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedMonthYear('all')}
                                            className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                selectedMonthYear === 'all'
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            Tất cả tháng
                                        </button>
                                        {monthYearList.map((m) => (
                                            <button
                                                key={m.key}
                                                type="button"
                                                onClick={() => setSelectedMonthYear(m.key)}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] font-semibold transition-all ${
                                                    selectedMonthYear === m.key
                                                        ? 'bg-slate-800 text-white shadow-2xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {m.label} ({m.count})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sắp xếp */}
                            <div>
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                    Thứ tự sắp xếp
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { id: 'date_desc', label: 'Ngày ký: Mới nhất' },
                                        { id: 'date_asc', label: 'Ngày ký: Cũ nhất' },
                                        { id: 'coc_desc', label: 'Tiền cọc: Cao nhất' },
                                        { id: 'coc_asc', label: 'Tiền cọc: Thấp nhất' }
                                    ].map((s) => (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => setSortBy(s.id as any)}
                                            className={`h-[28px] px-2.5 rounded-xl text-[11px] font-semibold text-center transition-all ${
                                                sortBy === s.id
                                                    ? 'bg-slate-800 text-white shadow-2xs'
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {s.label}
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
                                className="w-full h-[38px] rounded-full bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
                            >
                                <span>Xem {filteredOrders.length} Đơn Cọc Tồn</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. ORDER INSPECTION BOTTOM SHEET (65dvh) */}
            {selectedOrder && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                        onClick={() => setSelectedOrder(null)}
                    />
                    <div className="relative w-full max-w-md mx-auto max-h-[68dvh] bg-white rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
                        {/* Drag Handle */}
                        <div className="pt-2.5 pb-1 flex justify-center">
                            <div className="w-9 h-1 rounded-full bg-slate-300" />
                        </div>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 uppercase">
                                    {selectedOrder.khach_hang}
                                </h3>
                                <p className="text-xs text-slate-500 font-medium">
                                    TVBH: <strong className="text-slate-700">{selectedOrder.tvbh_name || 'Chưa gán'}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedOrder(null)}
                                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Body Details */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-xs text-slate-700 no-scrollbar">
                            {/* Deposit Card */}
                            <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-3 shadow-xs">
                                <div className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-0.5">
                                    Tiền cọc thực tế đã nộp
                                </div>
                                <div className="text-xl font-black font-mono tracking-tight">
                                    {Number(selectedOrder.tien_coc || 0).toLocaleString('vi-VN')} VNĐ
                                </div>
                                {selectedOrder.gia_tri_hd > 0 && (
                                    <div className="pt-1.5 mt-1.5 border-t border-emerald-500/40 flex items-center justify-between text-[11px] text-emerald-100">
                                        <span>Giá trị hợp đồng:</span>
                                        <span className="font-mono font-bold text-white">
                                            {Number(selectedOrder.gia_tri_hd).toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Customer Phone Card */}
                            {selectedOrder.so_dien_thoai && (
                                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                            Số điện thoại
                                        </div>
                                        <div className="font-mono font-bold text-sm text-slate-900 select-all">
                                            {selectedOrder.so_dien_thoai}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <a
                                            href={`tel:${selectedOrder.so_dien_thoai}`}
                                            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-semibold active:scale-95 shadow-2xs"
                                        >
                                            <Phone size={11} />
                                            <span>Gọi</span>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                navigator.clipboard.writeText(selectedOrder.so_dien_thoai);
                                                showToast('Đã chép SĐT', selectedOrder.so_dien_thoai, 'success', 2000);
                                            }}
                                            className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs border border-slate-200"
                                        >
                                            <Copy size={11} />
                                            <span>Copy</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Car Configuration Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Dòng xe & Phiên bản</div>
                                    <div className="font-bold text-slate-800 text-[11.5px] truncate">
                                        {formatCarModel(selectedOrder.displayModel)} {selectedOrder.displayVersion || ''}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Ngoại thất / Nội thất</div>
                                    <div className="font-bold text-slate-800 text-[11.5px] truncate">
                                        {selectedOrder.ngoai_that || 'Tiêu chuẩn'}
                                        {selectedOrder.noi_that ? ` / ${selectedOrder.noi_that}` : ''}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Số HĐ Cyber</div>
                                    <div className="font-mono font-bold text-slate-800 text-[11.5px] truncate">
                                        {selectedOrder.so_hop_dong || selectedOrder.so_don_hang || 'Chưa có'}
                                    </div>
                                </div>

                                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                                    <div className="text-[10px] text-slate-400 font-semibold mb-0.5">Ngày ký HĐ</div>
                                    <div className="font-bold text-slate-800 text-[11.5px]">
                                        {selectedOrder.ngay_hop_dong
                                            ? moment(selectedOrder.ngay_hop_dong).format('DD/MM/YYYY')
                                            : selectedOrder.ngay_giao_dich
                                            ? moment(selectedOrder.ngay_giao_dich).format('DD/MM/YYYY')
                                            : 'N/A'}
                                    </div>
                                </div>
                            </div>

                            {/* VIN (if assigned) */}
                            {selectedOrder.vin && selectedOrder.vin !== 'N/A' && (
                                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-2.5 flex items-center justify-between">
                                    <div>
                                        <div className="text-[10px] text-slate-400 font-semibold">Số khung (VIN)</div>
                                        <div className="font-mono font-bold text-slate-900 text-xs">{selectedOrder.vin}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => handleCopyVin(selectedOrder.vin, e)}
                                        className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs border border-slate-200"
                                    >
                                        <Copy size={11} />
                                        <span>Copy</span>
                                    </button>
                                </div>
                            )}

                            {/* Status and Progress */}
                            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100 space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-semibold">Trạng thái Cyber</span>
                                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                        {selectedOrder.ten_post || 'Chờ giao xe'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-semibold">Tiến độ TVBH</span>
                                    <span className="text-[11px] font-bold text-slate-800">
                                        {selectedOrder.tien_do || 'Chờ xe'}
                                    </span>
                                </div>
                                {selectedOrder.ghi_chu && (
                                    <div className="text-[10.5px] text-slate-500 pt-1 border-t border-slate-200/60">
                                        💬 Ghi chú: {selectedOrder.ghi_chu}
                                    </div>
                                )}
                            </div>

                            {/* Progress update pills */}
                            {onUpdateProgress && (
                                <div>
                                    <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                        Cập nhật tiến độ TVBH
                                    </label>
                                    <div className="flex flex-wrap gap-1">
                                        {['Chờ xe', 'Đang giao dịch', 'Chờ KH thanh toán', 'Chuẩn bị giao', 'Hủy cọc'].map((st) => (
                                            <button
                                                key={st}
                                                type="button"
                                                onClick={(e) => onUpdateProgress(selectedOrder.id, st, e)}
                                                className={`px-2 py-1 rounded-full text-[10.5px] font-semibold transition-all ${
                                                    selectedOrder.tien_do === st
                                                        ? 'bg-blue-600 text-white shadow-2xs'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                {st}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-3 border-t border-slate-100 bg-slate-50/70 flex items-center gap-2">
                            <button
                                type="button"
                                onClick={(e) => handleCopyZaloSummary(selectedOrder, e)}
                                className="flex-1 h-[36px] rounded-full bg-slate-800 text-white text-xs font-bold shadow-xs active:scale-98 flex items-center justify-center gap-1.5"
                            >
                                <Share2 size={13} />
                                <span>Copy Zalo</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 h-[36px] rounded-full bg-slate-200 text-slate-700 text-xs font-semibold active:scale-98"
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

export default React.memo(MobileDonHangTonView);
