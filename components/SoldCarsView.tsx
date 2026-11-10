import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Order, SortConfig } from '../types';

import { useSoldCarsApi } from '../hooks/useSoldCarsApi';
import SoldCarDetailPanel from './ui/SoldCarDetailPanel';

import { DropdownFilterConfig } from './ui/Filters';

import { MONTHS } from '../constants';
import moment from 'moment';
import { exportOrdersToExcel } from '../utils/excelUtils';
import { includesNormalized } from '../utils/stringUtils';

import './sold/sold-workspace.css';

interface SoldCarsViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    isSidebarCollapsed: boolean;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
    showAdminTab?: (targetTab: any) => void;
    isAdmin?: boolean;
    mobileMode?: boolean;
    onBack?: () => void;
}

const synchronizeTvbhName = (name?: string): string => {
    if (!name || typeof name !== 'string') return 'N/A';
    return String(name).normalize("NFC").trim().toLowerCase()
        .split(/\s+/).filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

const aggregateData = (data: Order[], key: keyof Order): { key: string, count: number }[] => {
    const stats: Record<string, number> = {};
    if (!data) return [];
    data.forEach(row => {
        let value = row[key];
        if (key === 'Tên tư vấn bán hàng') {
            value = synchronizeTvbhName(value as string);
        }
        const strValue = String(value || '').trim();
        if (strValue && strValue !== 'N/A') {
            stats[strValue] = (stats[strValue] || 0) + 1;
        }
    });
    return Object.entries(stats).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
};

const SoldCarsView: React.FC<SoldCarsViewProps> = ({ showOrderInAdmin, showAdminTab, isAdmin, mobileMode = false, onBack }) => {
    const INITIAL_LOAD_COUNT = 20;
    const LOAD_MORE_STEP = 20;

    // State for Date Filter
    // Default to current month and year
    const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // Fetch data based on selected filters
    const { soldData, isLoading, error, refetch } = useSoldCarsApi(selectedMonth, selectedYear);
    const [filters, setFilters] = useState({
        keyword: '',
        tvbh: [] as string[],
        carModel: [] as string[],
        version: [] as string[],
        exterior: [] as string[]
    });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [visibleItemsCount, setVisibleItemsCount] = useState(INITIAL_LOAD_COUNT);
    const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const [mobileDraftFilters, setMobileDraftFilters] = useState({
        carModel: [] as string[],
        tvbh: [] as string[],
        version: [] as string[],
        exterior: [] as string[]
    });

    const handleExportExcel = () => {
        if (!soldData || soldData.length === 0) {
            alert('Không có dữ liệu để tải xuống.');
            return;
        }
        const exportData = soldData.map((order, index) => {
            const policy = order["CHÍNH SÁCH"] || order["chinh_sach"] || (order as any)["Chính sách"] || '';
            const depositDate = order["Ngày cọc"] || order["ngay_coc"] || (order as any)["ngày_coc"] || '';
            const invoiceDate = order["Ngày xuất hóa đơn"] || order["ngay_xuat_hoa_don"] || (order as any)["Ngay_xuat_hoa_don"] || '';
            
            const formattedDepositDate = depositDate ? moment(depositDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD/MM/YYYY']).format('DD/MM/YYYY') : '';
            const formattedInvoiceDate = invoiceDate ? moment(invoiceDate, [moment.ISO_8601, 'YYYY-MM-DD', 'DD/MM/YYYY']).format('DD/MM/YYYY') : '';

            return {
                "STT": index + 1,
                "Số đơn hàng": order["Số đơn hàng"] || '',
                "Tên khách hàng": order["Tên khách hàng"] || '',
                "Dòng xe": order["Dòng xe"] || '',
                "Phiên bản": order["Phiên bản"] || '',
                "Ngoại thất": order["Ngoại thất"] || '',
                "Nội thất": order["Nội thất"] || '',
                "Số máy": order["Số máy"] || '',
                "Số khung (VIN)": order["VIN"] || '',
                "Mã DMS": order["Mã DMS"] || '',
                "Chính sách": policy,
                "Hoa hồng ứng trước": order["Hoa hồng ứng trước"] || order["Hoa hồng ứng"] || order["hoa_hong_ung"] || order.hoa_hong_ung || (order as any)["Hoa hồng ứng trước"] || (order as any)["Hoa hồng ứng"] || (order as any)["hoa_hong_ung"] || '',
                "Tên TVBH": order["Tên tư vấn bán hàng"] || '',
                "Ngày cọc": formattedDepositDate && formattedDepositDate !== 'Invalid date' ? formattedDepositDate : depositDate,
                "Thời gian ghép": order["Thời gian ghép"] ? moment(order["Thời gian ghép"]).format('DD/MM/YYYY') : '',
                "Ngày xuất hóa đơn": formattedInvoiceDate && formattedInvoiceDate !== 'Invalid date' ? formattedInvoiceDate : invoiceDate,
                "Link hóa đơn": order.LinkHoaDonDaXuat || order.link_hoa_don_da_xuat || ''
            };
        });
        const monthStr = selectedMonth !== null ? (selectedMonth + 1).toString().padStart(2, '0') : 'Năm';
        const filename = `LichSuBanHang_Thang_${monthStr}_${selectedYear}`;
        exportOrdersToExcel(exportData, filename);
    };

    // Sentinel ref for infinite scroll
    const observerTarget = useRef<HTMLDivElement>(null);

    // Filter Data by Date
    const dateFilteredData = useMemo(() => {
        return soldData;
    }, [soldData]);

    // Filter Data by Keywords/Dropdowns
    const displayData = useMemo(() => {
        let filteredData = [...dateFilteredData];
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            filteredData = filteredData.filter(o =>
                includesNormalized(o['Tên khách hàng'], keyword) ||
                includesNormalized(o['Số đơn hàng'], keyword) ||
                includesNormalized(o.VIN, keyword) ||
                includesNormalized(o['Dòng xe'], keyword) ||
                includesNormalized(o['Phiên bản'], keyword) ||
                includesNormalized(o['Ngoại thất'], keyword) ||
                includesNormalized(o['Tên tư vấn bán hàng'], keyword)
            );
        }
        if (filters.carModel.length > 0) {
            filteredData = filteredData.filter(o => filters.carModel.includes(o['Dòng xe']));
        }
        if (filters.version.length > 0) {
            filteredData = filteredData.filter(o => filters.version.includes(o['Phiên bản']));
        }
        if (filters.exterior.length > 0) {
            filteredData = filteredData.filter(o => filters.exterior.includes(o['Ngoại thất']));
        }

        if (filters.tvbh.length > 0) {
            filteredData = filteredData.filter(o => filters.tvbh.includes(synchronizeTvbhName(o['Tên tư vấn bán hàng'])));
        }
        return filteredData;
    }, [dateFilteredData, filters]);

    // Calculate Stats
    const stats = useMemo(() => {
        const carDataAgg = aggregateData(displayData, 'Dòng xe');
        const tvbhDataAgg = aggregateData(displayData, 'Tên tư vấn bán hàng');
        const topCar = carDataAgg[0] || { key: "—", count: 0 };
        const topSalesperson = tvbhDataAgg[0] || { key: "—", count: 0 };
        return {
            total: displayData.length,
            topCarDisplay: `${topCar.key} (${topCar.count})`,
            topTvbhDisplay: `${topSalesperson.key} (${topSalesperson.count})`,
            topCars: carDataAgg.slice(0, 5),
            topTvbh: tvbhDataAgg.slice(0, 5),
        };
    }, [displayData]);

    // Sorting
    const handleSort = (key: keyof Order) => {
        setVisibleItemsCount(INITIAL_LOAD_COUNT);
        setSortConfig((prev: SortConfig | null) => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const sortedData = useMemo(() => {
        let sortableData = [...displayData];
        if (sortConfig) {
            sortableData.sort((a, b) => {
                const aVal = a[sortConfig.key]; const bVal = b[sortConfig.key];
                if (aVal === null || aVal === undefined || aVal === '') return 1;
                if (bVal === null || bVal === undefined || bVal === '') return -1;
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableData;
    }, [displayData, sortConfig]);

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && visibleItemsCount < sortedData.length) {
                    setVisibleItemsCount(prev => prev + LOAD_MORE_STEP);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [sortedData.length, visibleItemsCount]);

    const visibleData = useMemo(() => sortedData.slice(0, visibleItemsCount), [sortedData, visibleItemsCount]);

    useEffect(() => {
        if (mobileMode || !isDetailDrawerOpen) return;
        const onEscape = (event: KeyboardEvent) => {if(event.key==='Escape')setIsDetailDrawerOpen(false);};
        document.addEventListener('keydown',onEscape);
        return () => document.removeEventListener('keydown',onEscape);
    }, [mobileMode,isDetailDrawerOpen]);

    useEffect(() => {
        if (!mobileMode && !isLoading && selectedDetailOrder && !displayData.some(order => order['Số đơn hàng']===selectedDetailOrder['Số đơn hàng'])) {
            setSelectedDetailOrder(null);
            setIsDetailDrawerOpen(false);
        }
    }, [displayData,isLoading,mobileMode,selectedDetailOrder]);

    // Handlers
    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setVisibleItemsCount(INITIAL_LOAD_COUNT);
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setVisibleItemsCount(INITIAL_LOAD_COUNT);
        setFilters({
            keyword: '',
            tvbh: [],
            carModel: [],
            version: [],
            exterior: []
        });
    }, []);

    const handleRowClick = (order: Order) => {
        setSelectedDetailOrder(order);
        setIsDetailDrawerOpen(true);
    };

    const uniqueTvbh = useMemo(() => [...new Set(soldData.map(o => synchronizeTvbhName(o['Tên tư vấn bán hàng'])).filter(Boolean))].sort(), [soldData]);
    const uniqueCarModels = useMemo(() => [...new Set(soldData.map(o => o['Dòng xe']).filter(Boolean))].sort(), [soldData]);
    const uniqueVersions = useMemo(() => [...new Set(soldData.map(o => o['Phiên bản']).filter(Boolean))].sort(), [soldData]);
    const uniqueExteriors = useMemo(() => [...new Set(soldData.map(o => o['Ngoại thất']).filter(Boolean))].sort(), [soldData]);

    const dropdownConfigs: DropdownFilterConfig[] = [
        { id: 'sold-filter-tvbh', key: 'tvbh', label: 'Tư vấn', options: uniqueTvbh, icon: 'fa-user-tie' },
        { id: 'sold-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
        { id: 'sold-filter-version', key: 'version', label: 'Phiên Bản', options: uniqueVersions, icon: 'fa-cogs' },
        { id: 'sold-filter-exterior', key: 'exterior', label: 'Ngoại Thất', options: uniqueExteriors, icon: 'fa-palette' },
    ];

    const skeletons = useMemo(() => Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="p-4 border-b border-border-secondary flex items-center justify-between animate-fade-in">
            <div className="flex-1 space-y-2">
                <div className="skeleton-item h-4 w-3/4 rounded-md"></div>
                <div className="skeleton-item h-3 w-1/2 rounded-md"></div>
            </div>
            <div className="skeleton-item h-3 w-20 rounded-md"></div>
        </div>
    )), []);

    if (error && mobileMode) {
        return (
            <div className="flex h-full min-h-0 flex-col bg-[#f2f2f7]">
                <div className="relative flex h-12 shrink-0 items-center border-b border-slate-200 bg-white px-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex h-8 items-center gap-0.5 rounded-lg px-1 text-[13px] font-semibold text-slate-700 active:bg-slate-100"
                    >
                        <i className="fas fa-chevron-left text-[11px]" />
                        <span>Back</span>
                    </button>
                    <span className="absolute left-1/2 -translate-x-1/2 text-[12px] font-bold uppercase tracking-[0.13em] text-slate-800">Lịch Sử Bán Hàng</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-rose-400 shadow-sm ring-1 ring-slate-200"><i className="fas fa-cloud-exclamation text-xl" /></div>
                    <p className="mt-4 text-sm font-semibold text-slate-800">Không thể tải dữ liệu</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{error}</p>
                    <button type="button" onClick={refetch} className="mt-4 h-9 rounded-xl bg-slate-800 px-4 text-xs font-semibold text-white active:scale-95">Thử lại</button>
                </div>
            </div>
        );
    }

    if (mobileMode) {
        const activeFilterCount = filters.carModel.length + filters.tvbh.length + filters.version.length + filters.exterior.length;
        const yearOptions = Array.from({ length: 7 }, (_, index) => new Date().getFullYear() + 1 - index);

        const openMobileFilters = () => {
            setMobileDraftFilters({
                carModel: [...filters.carModel],
                tvbh: [...filters.tvbh],
                version: [...filters.version],
                exterior: [...filters.exterior]
            });
            setIsMobileFilterOpen(true);
        };

        const toggleMobileFilter = (key: 'carModel' | 'tvbh' | 'version' | 'exterior', value: string) => {
            setMobileDraftFilters((prev) => ({
                ...prev,
                [key]: prev[key].includes(value)
                    ? prev[key].filter((item) => item !== value)
                    : [...prev[key], value]
            }));
        };

        const applyMobileFilters = () => {
            handleFilterChange(mobileDraftFilters);
            setIsMobileFilterOpen(false);
        };

        const removeAppliedMobileFilter = (key: 'carModel' | 'tvbh' | 'version' | 'exterior', value: string) => {
            handleFilterChange({ [key]: filters[key].filter((item) => item !== value) });
        };

        const mobileDraftResultCount = dateFilteredData.filter((order) => {
            const matchesKeyword = !filters.keyword || [
                order['Tên khách hàng'], order['Số đơn hàng'], order.VIN,
                order['Dòng xe'], order['Phiên bản'], order['Ngoại thất'], order['Tên tư vấn bán hàng']
            ].some((value) => includesNormalized(value, filters.keyword.toLowerCase()));
            const matchesModel = mobileDraftFilters.carModel.length === 0 || mobileDraftFilters.carModel.includes(order['Dòng xe']);
            const matchesTvbh = mobileDraftFilters.tvbh.length === 0 || mobileDraftFilters.tvbh.includes(synchronizeTvbhName(order['Tên tư vấn bán hàng']));
            const matchesVersion = mobileDraftFilters.version.length === 0 || mobileDraftFilters.version.includes(order['Phiên bản']);
            const matchesExterior = mobileDraftFilters.exterior.length === 0 || mobileDraftFilters.exterior.includes(order['Ngoại thất']);
            return matchesKeyword && matchesModel && matchesTvbh && matchesVersion && matchesExterior;
        }).length;

        const renderFilterChips = (
            key: 'carModel' | 'tvbh' | 'version' | 'exterior',
            options: string[],
            emptyText: string
        ) => (
            options.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                    {options.map((option) => {
                        const selected = mobileDraftFilters[key].includes(option);
                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => toggleMobileFilter(key, option)}
                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${selected
                                    ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                    : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                }`}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
            ) : <p className="text-xs text-slate-400">{emptyText}</p>
        );

        return (
            <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#f2f2f7] text-slate-900">
                <div className="relative flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="inline-flex h-8 items-center gap-0.5 rounded-lg px-1 text-[13px] font-semibold text-slate-700 active:bg-slate-100"
                    >
                        <i className="fas fa-chevron-left text-[11px]" />
                        <span>Back</span>
                    </button>
                    <span className="absolute left-1/2 -translate-x-1/2 text-[12px] font-bold uppercase tracking-[0.13em] text-slate-800">
                        Lịch Sử Bán Hàng
                    </span>
                    <button
                        type="button"
                        onClick={refetch}
                        aria-label="Làm mới"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95"
                    >
                        <i className={`fas fa-rotate-right text-[11px] ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="shrink-0 space-y-2 border-b border-slate-200 bg-[#f2f2f7] px-3 pb-2.5 pt-2.5">
                    <div className="grid grid-cols-[1fr_88px_auto] gap-1.5">
                        <label className="relative">
                            <select
                                value={selectedMonth === null ? 'all' : selectedMonth}
                                onChange={(event) => setSelectedMonth(event.target.value === 'all' ? null : Number(event.target.value))}
                                className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-7 text-[12px] font-semibold text-slate-700 outline-none"
                            >
                                <option value="all">Cả năm</option>
                                {MONTHS.map((month, index) => <option key={month} value={index}>{month}</option>)}
                            </select>
                            <i className="fas fa-chevron-down pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400" />
                        </label>
                        <label className="relative">
                            <select
                                value={selectedYear}
                                onChange={(event) => setSelectedYear(Number(event.target.value))}
                                className="h-9 w-full appearance-none rounded-xl border border-slate-200 bg-white px-2.5 pr-6 text-[12px] font-semibold text-slate-700 outline-none"
                            >
                                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
                            </select>
                            <i className="fas fa-chevron-down pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-400" />
                        </label>
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                aria-label="Xuất Excel"
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 active:scale-95"
                            >
                                <i className="fas fa-file-excel text-[13px]" />
                            </button>
                        )}
                    </div>

                    <div className="grid h-11 grid-cols-3 overflow-hidden rounded-[10px] border border-slate-200 bg-white">
                        <div className="flex flex-col items-center justify-center px-1.5 text-center">
                            <p className="text-[13px] font-bold leading-none tabular-nums text-slate-900">{stats.total}</p>
                            <p className="mt-1 text-[8px] font-medium uppercase leading-none tracking-wide text-slate-400">Xe đã bán</p>
                        </div>
                        <div className="flex min-w-0 flex-col items-center justify-center border-x border-slate-100 px-1.5 text-center">
                            <p className="w-full truncate text-[10px] font-bold leading-none text-slate-800">{stats.topCars[0]?.key || '—'}</p>
                            <p className="mt-1 text-[8px] font-medium uppercase leading-none tracking-wide text-slate-400">Top xe</p>
                        </div>
                        <div className="flex min-w-0 flex-col items-center justify-center px-1.5 text-center">
                            <p className="w-full truncate text-[10px] font-bold leading-none text-slate-800">{stats.topTvbh[0]?.key || '—'}</p>
                            <p className="mt-1 text-[8px] font-medium uppercase leading-none tracking-wide text-slate-400">Top TVBH</p>
                        </div>
                    </div>

                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[#f2f2f7] overscroll-contain px-2 py-2">
                    {isLoading && soldData.length === 0 ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                            {Array.from({ length: 8 }).map((_, index) => (
                                <div key={index} className="flex h-[58px] animate-pulse items-center gap-2 px-2.5">
                                    <div className="h-7 w-7 rounded-full bg-slate-100" />
                                    <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-slate-100" /><div className="h-2.5 w-1/2 rounded bg-slate-100" /></div>
                                </div>
                            ))}
                        </div>
                    ) : visibleData.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-300"><i className="fas fa-receipt text-xl" /></div>
                            <p className="mt-3 text-sm font-semibold text-slate-700">Không tìm thấy dữ liệu</p>
                            <p className="mt-1 text-xs text-slate-400">Hãy đổi thời gian hoặc điều kiện lọc.</p>
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
                            <div className="sticky top-0 z-10 grid h-7 grid-cols-[28px_minmax(0,1fr)_74px_8px] items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 text-[8.5px] font-bold uppercase tracking-wider text-slate-400">
                                <span className="text-center">#</span>
                                <span>Khách hàng / Xe</span>
                                <span className="text-right">Ngày bán</span>
                                <span />
                            </div>
                            <div className="divide-y divide-slate-100">
                                {visibleData.map((order, index) => {
                                    const invoiceDate = order['Ngày xuất hóa đơn'] || order['Thời gian nhập'];
                                    const formattedDate = invoiceDate && moment(invoiceDate).isValid() ? moment(invoiceDate).format('DD/MM/YY') : '—';
                                    return (
                                        <button
                                            key={order['Số đơn hàng'] || `${order.VIN}-${index}`}
                                            type="button"
                                            onClick={() => handleRowClick(order)}
                                        className="grid min-h-[48px] w-full grid-cols-[28px_minmax(0,1fr)_74px_8px] items-center gap-2 px-2.5 py-1.5 text-left active:bg-slate-50"
                                    >
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold tabular-nums text-slate-500">{index + 1}</span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-[11.5px] font-bold uppercase leading-tight text-slate-900">{order['Tên khách hàng'] || 'Chưa cập nhật'}</span>
                                                <span className="mt-1 block truncate text-[9.5px] font-medium leading-tight text-slate-500">{order['Dòng xe']} {order['Phiên bản']}</span>
                                            </span>
                                            <span className="min-w-0 text-right">
                                                <span className="block text-[9.5px] font-semibold tabular-nums text-slate-700">{formattedDate}</span>
                                            </span>
                                            <i className="fas fa-chevron-right text-[8px] text-slate-300" />
                                        </button>
                                    );
                                })}
                            </div>
                            <div ref={observerTarget} className="flex h-10 items-center justify-center text-[10px] text-slate-400">
                                {visibleItemsCount < sortedData.length && <><i className="fas fa-spinner fa-spin mr-1.5" />Đang tải thêm...</>}
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full bg-white/92 backdrop-blur-2xl border-t border-black/[0.08] px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-30 flex-shrink-0 space-y-1">
                    {activeFilterCount > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                            <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wider text-slate-400">Đang lọc:</span>
                            {([
                                ['carModel', filters.carModel],
                                ['tvbh', filters.tvbh],
                                ['version', filters.version],
                                ['exterior', filters.exterior]
                            ] as const).flatMap(([key, values]) => values.map((value) => (
                                <span key={`${key}-${value}`} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                                    <span>{value}</span>
                                    <button type="button" onClick={() => removeAppliedMobileFilter(key, value)} className="hover:text-slate-900 active:scale-90 ml-0.5">
                                        <i className="fas fa-times text-[8px]" />
                                    </button>
                                </span>
                            )))}
                            <button type="button" onClick={() => handleFilterChange({ carModel: [], tvbh: [], version: [], exterior: [] })} className="text-[10px] font-medium text-slate-500 hover:text-slate-800 active:scale-95 px-1 py-0.5 flex-shrink-0">Xóa tất cả</button>
                        </div>
                    )}
                    <div className="flex items-center space-x-2">
                        <label className="relative flex-1">
                            <i className="fas fa-search absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" />
                            <input
                                value={filters.keyword}
                                onChange={(event) => handleFilterChange({ keyword: event.target.value })}
                                placeholder="Tìm tên khách, số VIN, số đơn..."
                                className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
                            />
                            {filters.keyword && (
                                <button type="button" onClick={() => handleFilterChange({ keyword: '' })} className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90">
                                    <i className="fas fa-times text-[10px]" />
                                </button>
                            )}
                        </label>
                        <button
                            type="button"
                            onClick={openMobileFilters}
                            className={`h-[34px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${activeFilterCount ? 'bg-slate-700 text-white border-slate-700 shadow-xs' : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'}`}
                        >
                            <i className="fas fa-sliders text-[11px]" />
                            <span>Lọc</span>
                            {activeFilterCount > 0 && <span className="w-3.5 h-3.5 rounded-full bg-white text-slate-700 font-bold text-[9px] flex items-center justify-center -mr-0.5">{activeFilterCount}</span>}
                        </button>
                    </div>
                </div>

                {isDetailDrawerOpen && selectedDetailOrder && (
                    <div className="fixed inset-0 z-[110] flex items-end justify-center">
                        <button
                            type="button"
                            aria-label="Đóng chi tiết bán hàng"
                            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px] animate-in fade-in duration-200"
                            onClick={() => setIsDetailDrawerOpen(false)}
                        />
                        <section
                            role="dialog"
                            aria-modal="true"
                            aria-label="Chi tiết bán hàng"
                            className="relative z-10 flex max-h-[calc(100dvh-8px)] w-full max-w-md flex-col overflow-hidden rounded-t-[26px] bg-[#f2f2f7] shadow-[0_-16px_50px_rgba(15,23,42,0.22)] animate-in slide-in-from-bottom duration-300"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="shrink-0 bg-white px-3 pb-1.5 pt-1.5">
                                <div className="mx-auto h-1 w-9 rounded-full bg-slate-300" />
                                <div className="relative mt-0.5 flex h-8 items-center justify-center">
                                    <h2 className="text-[12px] font-bold uppercase tracking-[0.13em] text-slate-800">Chi Tiết Bán Hàng</h2>
                                    <button
                                        type="button"
                                        onClick={() => setIsDetailDrawerOpen(false)}
                                        aria-label="Đóng"
                                        className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:scale-95 active:bg-slate-200"
                                    >
                                        <i className="fas fa-times text-[12px]" />
                                    </button>
                                </div>
                            </div>
                            <div className="min-h-0 overflow-hidden border-t border-black/[0.06]">
                                <SoldCarDetailPanel
                                    order={selectedDetailOrder}
                                    showOrderInAdmin={showOrderInAdmin}
                                    showAdminTab={showAdminTab}
                                    isAdmin={isAdmin}
                                    mobileMode
                                />
                            </div>
                        </section>
                    </div>
                )}

                {isMobileFilterOpen && (
                    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" onClick={() => setIsMobileFilterOpen(false)} />
                        <div
                            className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[55dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="pt-2 pb-0.5 flex justify-center">
                                <div className="w-8 h-1 rounded-full bg-slate-300" />
                            </div>

                            <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-4 py-1.5">
                                <div className="flex w-16 justify-start">
                                    {(mobileDraftFilters.carModel.length + mobileDraftFilters.tvbh.length + mobileDraftFilters.version.length + mobileDraftFilters.exterior.length) > 0 ? (
                                        <button
                                            type="button"
                                            onClick={() => setMobileDraftFilters({ carModel: [], tvbh: [], version: [], exterior: [] })}
                                            className="text-[12.5px] font-medium text-slate-500 hover:text-slate-800 active:opacity-60 transition-opacity"
                                        >
                                            Đặt lại
                                        </button>
                                    ) : <span className="w-1" />}
                                </div>
                                <h3 className="flex-1 text-center text-[13.5px] font-bold tracking-tight text-slate-800">Bộ Lọc</h3>
                                <div className="flex w-16 justify-end">
                                    <button type="button" onClick={applyMobileFilters} className="text-[13.5px] font-bold text-slate-700 hover:text-slate-900 active:opacity-60 transition-opacity">Xong</button>
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 no-scrollbar">
                                <section>
                                    <h3 className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Dòng xe</h3>
                                    {renderFilterChips('carModel', uniqueCarModels, 'Chưa có dữ liệu dòng xe')}
                                </section>
                                <section>
                                    <h3 className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Tư vấn bán hàng</h3>
                                    {renderFilterChips('tvbh', uniqueTvbh, 'Chưa có dữ liệu tư vấn viên')}
                                </section>
                                <section>
                                    <h3 className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Phiên bản</h3>
                                    {renderFilterChips('version', uniqueVersions, 'Chưa có dữ liệu phiên bản')}
                                </section>
                                <section>
                                    <h3 className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ngoại thất</h3>
                                    {renderFilterChips('exterior', uniqueExteriors, 'Chưa có dữ liệu màu xe')}
                                </section>
                            </div>

                            <div className="p-3 border-t border-black/[0.06] bg-white pb-[max(12px,env(safe-area-inset-bottom))]">
                                <button
                                    type="button"
                                    onClick={applyMobileFilters}
                                    className="w-full h-[38px] rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
                                >
                                    <span>Xem {mobileDraftResultCount} Đơn Hàng</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const activeFilterCount = filters.tvbh.length + filters.carModel.length + filters.version.length + filters.exterior.length;
    const periodLabel = selectedMonth === null ? 'Năm ' + selectedYear : MONTHS[selectedMonth] + ' / ' + selectedYear;
    const facetFields: Record<string, keyof Order> = { carModel:'Dòng xe', version:'Phiên bản', exterior:'Ngoại thất', tvbh:'Tên tư vấn bán hàng' };
    const invoiceDate = (order: Order) => {
        const raw = order['Ngày xuất hóa đơn'] || order.ngay_xuat_hoa_don || order['Thời gian nhập'];
        if (!raw || raw === 'null' || raw === '—') return '—';
        const date = moment(raw, [moment.ISO_8601,'YYYY-MM-DD','DD/MM/YYYY','DD/MM/YYYY HH:mm:ss'], true);
        return date.isValid() ? date.format('DD/MM/YYYY') : '—';
    };
    return <div className="sold-workspace">
        <aside className="sold-sidebar" aria-label="Bộ lọc lịch sử bán hàng">
            <div className="sold-sidebar-heading"><h1>Lịch sử <span>{soldData.length}</span></h1><button type="button" title="Làm mới lịch sử" aria-label="Làm mới lịch sử" onClick={refetch} disabled={isLoading}><i className={isLoading ? 'fas fa-spinner fa-spin' : 'fas fa-rotate'} /></button></div>
            <div className="sold-search"><label><i className="fas fa-search" /><input aria-label="Tìm lịch sử bán hàng" value={filters.keyword} onChange={event => handleFilterChange({keyword:event.target.value})} placeholder="Tìm khách hàng, mã đơn, VIN…" />{filters.keyword && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => handleFilterChange({keyword:''})}><i className="fas fa-times" /></button>}</label></div>
            {(activeFilterCount > 0 || filters.keyword) && <div className="sold-filter-summary"><span>{displayData.length} kết quả</span><button type="button" onClick={handleResetFilters}>Xóa bộ lọc</button></div>}
            <div className="sold-sidebar-scroll">
                <section className="sold-facet-group"><h2>Kỳ xuất hóa đơn</h2><div className="sold-period-fields"><label><span>Tháng</span><select aria-label="Tháng lịch sử" value={selectedMonth === null ? 'all' : selectedMonth} onChange={event => {setSelectedMonth(event.target.value === 'all' ? null : Number(event.target.value));setVisibleItemsCount(INITIAL_LOAD_COUNT);setSelectedDetailOrder(null);setIsDetailDrawerOpen(false);}}><option value="all">Cả năm</option>{MONTHS.map((month,index) => <option key={month} value={index}>{month}</option>)}</select></label><label><span>Năm</span><select aria-label="Năm lịch sử" value={selectedYear} onChange={event => {setSelectedYear(Number(event.target.value));setVisibleItemsCount(INITIAL_LOAD_COUNT);setSelectedDetailOrder(null);setIsDetailDrawerOpen(false);}}>{[...new Set([selectedYear,...Array.from({length:14},(_,index)=>new Date().getFullYear()+3-index)])].sort((a,b)=>b-a).map(year=><option key={year} value={year}>{year}</option>)}</select></label></div></section>
                {dropdownConfigs.map(facet => {
                    const key=facet.key as 'carModel'|'version'|'exterior'|'tvbh'; const selected=filters[key]; const field=facetFields[key];
                    const facetData = key==='exterior'||key==='version' ? soldData.filter(o=>!filters.carModel.length||filters.carModel.includes(o['Dòng xe'])) : soldData;
                    const options=key==='exterior'||key==='version' ? [...new Set(facetData.map(o=>String(o[field]||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi')) : facet.options;
                    return <details className="sold-facet-group" key={facet.id} open={key==='carModel'||key==='exterior'}><summary>{key==='tvbh'?'Tư vấn bán hàng':facet.label}</summary><div className="sold-facet-list"><button type="button" className="sold-facet-item" aria-pressed={!selected.length} onClick={() => handleFilterChange(key==='carModel'?{carModel:[],version:[],exterior:[]}:{[key]:[]})}><span>Tất cả {key==='tvbh'?'tư vấn':facet.label.toLowerCase()}</span><small>{facetData.length}</small></button>{options.map(value => <button type="button" key={value} className="sold-facet-item" aria-pressed={selected.includes(value)} onClick={() => handleFilterChange(key==='carModel'?{carModel:selected.includes(value)?selected.filter(v=>v!==value):[...selected,value],version:[],exterior:[]}:{[key]:selected.includes(value)?selected.filter(v=>v!==value):[...selected,value]})}><span>{value}</span><small>{facetData.filter(o=>(key==='tvbh'?synchronizeTvbhName(o[field] as string):o[field])===value).length}</small></button>)}</div></details>;
                })}
            </div><div className="sold-sidebar-footer"><span>{periodLabel}</span><span>{displayData.length} xe</span></div>
        </aside>
        <main className="sold-main">
            <header className="sold-page-heading"><div><h2>Lịch sử bán hàng</h2><p>{periodLabel} · {stats.total} xe theo bộ lọc</p></div>{isAdmin && <button type="button" onClick={handleExportExcel} disabled={isLoading||!soldData.length} title="Xuất toàn bộ dữ liệu của kỳ đang chọn"><i className="fas fa-file-excel" />Xuất Excel</button>}</header>
            <div className="sold-period-summary"><div><span>Xe đã bán</span><strong>{stats.total}</strong></div><div><span>Dòng xe nhiều nhất</span><strong>{stats.topCarDisplay}</strong></div><div><span>TVBH nhiều nhất</span><strong>{stats.topTvbhDisplay}</strong></div></div>
            <div className="sold-content">
                <section className="sold-list-column" aria-label="Danh sách bán hàng">
                    <div className="sold-list-toolbar"><span>{displayData.length} đơn hàng</span><div><select aria-label="Sắp xếp lịch sử" value={sortConfig?.key||'Thời gian nhập'} onChange={event => handleSort(event.target.value as keyof Order)}><option value="Thời gian nhập">Thời gian nhập</option><option value="Ngày xuất hóa đơn">Ngày xuất hóa đơn</option><option value="Tên khách hàng">Tên khách hàng</option><option value="Dòng xe">Dòng xe</option></select><button type="button" aria-label="Đổi chiều sắp xếp" onClick={() => handleSort(sortConfig?.key||'Thời gian nhập')}><i className={sortConfig?.direction==='asc'?'fas fa-arrow-up-short-wide':'fas fa-arrow-down-wide-short'} /></button></div></div>
                    <div className="sold-order-list" aria-busy={isLoading}>
                        {error ? <div className="sold-message" role="alert"><strong>Không thể tải lịch sử</strong><p>{error}</p><button type="button" onClick={refetch}>Thử lại</button></div> : isLoading&&!soldData.length ? <div className="sold-skeletons">{skeletons}</div> : <>
                            {visibleData.map(order => <button type="button" key={order['Số đơn hàng']} className="sold-order-row" aria-pressed={selectedDetailOrder?.['Số đơn hàng']===order['Số đơn hàng']} onClick={() => handleRowClick(order)}><span className="sold-row-top"><strong>{order['Tên khách hàng']||'Chưa có tên khách hàng'}</strong><time>{invoiceDate(order)}</time></span><span className="sold-row-vehicle">{order['Dòng xe']}</span></button>)}
                            {!visibleData.length && <div className="sold-message"><strong>Không có đơn hàng phù hợp</strong><p>Thử đổi kỳ xuất hóa đơn hoặc bộ lọc.</p><button type="button" onClick={handleResetFilters}>Xóa bộ lọc</button></div>}
                            <div ref={observerTarget} className="sold-load-more">{visibleItemsCount<sortedData.length && <button type="button" onClick={() => setVisibleItemsCount(prev=>prev+LOAD_MORE_STEP)}>Xem thêm đơn hàng</button>}</div>
                        </>}
                    </div><div className="sold-list-footer">{visibleData.length} / {displayData.length} đơn hàng</div>
                </section>
                <section className={'sold-detail-column'+(isDetailDrawerOpen?' is-open':'')} aria-label="Chi tiết bán hàng"><button type="button" className="sold-detail-close" aria-label="Đóng chi tiết bán hàng" onClick={() => setIsDetailDrawerOpen(false)}><i className="fas fa-times" /></button><SoldCarDetailPanel order={selectedDetailOrder} showOrderInAdmin={showOrderInAdmin} showAdminTab={showAdminTab} isAdmin={isAdmin} /></section>
            </div>
        </main>
        {isDetailDrawerOpen && <button type="button" className="sold-detail-backdrop" aria-label="Đóng chi tiết bán hàng" onClick={() => setIsDetailDrawerOpen(false)} />}
    </div>;
};

export default SoldCarsView;
