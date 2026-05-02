import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Order, SortConfig } from '../types';
import HistoryTable from './HistoryTable';
import { useSoldCarsApi } from '../hooks/useSoldCarsApi';
import SoldCarDetailPanel from './ui/SoldCarDetailPanel';

import { DropdownFilterConfig } from './ui/Filters';
import TabbedFilter from './ui/TabbedFilter';
import MultiSelectDropdown from './ui/MultiSelectDropdown';
import DateFilter from './ui/DateFilter';
import { MONTHS } from '../constants';
import { includesNormalized } from '../utils/stringUtils';
import AnimatedBackground from './ui/AnimatedBackground';

// Chart.js is loaded globally via index.html
declare const Chart: any;

interface SoldCarsViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    isSidebarCollapsed: boolean;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
    showAdminTab?: (targetTab: any) => void;
    isAdmin?: boolean;
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
        const strValue = String(value).trim();
        if (strValue && strValue !== 'N/A') {
            stats[strValue] = (stats[strValue] || 0) + 1;
        }
    });
    return Object.entries(stats).map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
};

const SoldCarsView: React.FC<SoldCarsViewProps> = ({ showOrderInAdmin, showAdminTab, isAdmin }) => {
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

    if (error) {
        return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;
    }

    // --- TABS LOGIC ---
    const carModelTabs = uniqueCarModels.map(model => ({
        id: model,
        label: model,
        count: soldData.filter(o => o['Dòng xe'] === model).length
    }));

    const totalCount = soldData.length;
    const tabs = [
        { id: 'all', label: 'Tất cả', count: totalCount },
        ...carModelTabs
    ];

    const activeTab = (filters.carModel && filters.carModel.length === 1) ? filters.carModel[0] : 'all';

    const handleTabChange = (tabId: string) => {
        handleFilterChange({ carModel: tabId === 'all' ? [] : [tabId] });
    };

    const activeDropdowns = dropdownConfigs.filter(d => d.key !== 'carModel');

    return (
        <div className="flex flex-col h-full space-y-2 p-1 md:p-0">
            {/* Header with Tabs & Filters */}
            <div className="flex-shrink-0 bg-white/40 backdrop-blur-md rounded-xl border border-white/60 p-1.5 shadow-sm">
                <TabbedFilter
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    searchValue={filters.keyword || ''}
                    onSearchChange={(val) => handleFilterChange({ keyword: val })}
                    onReset={handleResetFilters}
                    canReset={true}
                    extraActions={
                        <DateFilter
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            onMonthChange={setSelectedMonth}
                            onYearChange={setSelectedYear}
                        />
                    }
                >
                    {activeDropdowns.map(dropdown => (
                        <div key={dropdown.id} className="min-w-[100px]">
                            <MultiSelectDropdown
                                id={dropdown.id}
                                label={dropdown.label}
                                options={dropdown.options}
                                selectedOptions={(filters[dropdown.key as keyof typeof filters] || []) as string[]}
                                onChange={(selected) => handleFilterChange({ [dropdown.key]: selected })}
                                icon={dropdown.icon}
                                displayMode="selection"
                                size="compact"
                                variant="modern"
                                searchable={true}
                                align="right"
                            />
                        </div>
                    ))}
                </TabbedFilter>
            </div>

            {/* Stats Cards - More Compact */}
            <div className="grid grid-cols-3 gap-2 px-1">
                {isLoading && soldData.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white/40 backdrop-blur-sm rounded-lg p-2 border border-white/60 h-14 animate-pulse"></div>
                    ))
                ) : (
                    <>
                        <div className="bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/80 shadow-[0_2px_8_rgba(0,0,0,0.04)] flex items-center gap-2.5 group hover:shadow-md transition-all">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                <i className="fas fa-car text-sm"></i>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{selectedMonth !== null ? MONTHS[selectedMonth] : 'Năm'}</p>
                                <p className="text-sm font-bold text-gray-800">{stats.total} Xe</p>
                            </div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/80 shadow-[0_2px_8_rgba(0,0,0,0.04)] flex items-center gap-2.5 group hover:shadow-md transition-all">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                                <i className="fas fa-trophy text-sm"></i>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Top Xe</p>
                                <p className="text-sm font-bold text-gray-800 truncate">{stats.topCarDisplay}</p>
                            </div>
                        </div>
                        <div className="bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/80 shadow-[0_2px_8_rgba(0,0,0,0.04)] flex items-center gap-2.5 group hover:shadow-md transition-all">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                                <i className="fas fa-crown text-sm"></i>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Top TVBH</p>
                                <p className="text-sm font-bold text-gray-800 truncate">{stats.topTvbhDisplay}</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col lg:flex-row gap-2 min-h-0">
                {/* Left Column: List */}
                <div className="flex-1 flex flex-col relative rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.03)] border border-white/60 min-w-0 overflow-hidden bg-white/40">
                    <AnimatedBackground />
                    <div className="flex-grow overflow-auto hidden-scrollbar relative z-10">
                        {isLoading && soldData.length === 0 ? (
                            <div className="p-2 space-y-1">
                                {skeletons}
                            </div>
                        ) : (
                            <>
                                <HistoryTable
                                    orders={visibleData}
                                    onRowClick={handleRowClick}
                                    selectedOrder={selectedDetailOrder}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                    startIndex={0}
                                    viewMode="sold"
                                />
                                {/* Intersection Observer Target */}
                                <div ref={observerTarget} className="h-10 w-full flex items-center justify-center py-4">
                                    {visibleItemsCount < sortedData.length && (
                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Đang tải thêm...
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Details */}
                <div className={`
                    fixed inset-y-0 right-0 w-full md:w-[400px] bg-white z-[9999] transform transition-transform duration-300 ease-in-out
                    lg:relative lg:transform-none lg:w-[420px] lg:z-0 lg:flex lg:flex-col lg:bg-transparent
                    ${isDetailDrawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    <div className="h-full flex flex-col lg:bg-white/60 lg:backdrop-blur-md lg:rounded-2xl lg:border lg:border-white/80 lg:shadow-[0_4px_30px_rgba(0,0,0,0.03)] overflow-hidden">
                        <div className="p-3 border-b border-white/60 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-gray-500">Chi Tiết Đơn Hàng</h3>
                            <button onClick={() => setIsDetailDrawerOpen(false)} className="lg:hidden p-1.5 bg-gray-100 rounded-full text-gray-400">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto hidden-scrollbar">
                            <SoldCarDetailPanel
                                order={selectedDetailOrder}
                                showOrderInAdmin={showOrderInAdmin}
                                showAdminTab={showAdminTab}
                                isAdmin={isAdmin}
                            />
                        </div>
                    </div>
                </div>
            </div>


            {/* Mobile Overlay for Drawer */}
            {isDetailDrawerOpen && (
                <div className="fixed inset-0 bg-black/50 z-[9990] lg:hidden" onClick={() => setIsDetailDrawerOpen(false)}></div>
            )}
        </div>
    );
};

export default SoldCarsView;