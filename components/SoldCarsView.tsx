import React, { useState, useMemo, useCallback } from 'react';
import { Order, SortConfig } from '../types';
import HistoryTable from './HistoryTable';
import Pagination from './ui/Pagination';
import SoldCarDetailPanel from './ui/SoldCarDetailPanel';
import SummaryCard from './ui/SummaryCard';

import Filters, { DropdownFilterConfig } from './ui/Filters';
import DateFilter from './ui/DateFilter';
import { MONTHS } from '../constants';
import moment from 'moment';
import { includesNormalized } from '../utils/stringUtils';

// Chart.js is loaded globally via index.html
declare const Chart: any;

interface SoldCarsViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    soldData: Order[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
    isSidebarCollapsed: boolean;
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

const SoldCarsView: React.FC<SoldCarsViewProps> = ({ showToast, soldData, isLoading, error, refetch, isSidebarCollapsed }) => {
    const PAGE_SIZE = isSidebarCollapsed ? 14 : 12;

    // State for Date Filter
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = All Year
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // State for Filters & Sorting
    const [filters, setFilters] = useState({
        keyword: '',
        tvbh: [] as string[],
        carModel: [] as string[],
        version: [] as string[],
        exterior: [] as string[]
    });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
    const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

    // Filter Data by Date
    const dateFilteredData = useMemo(() => {
        return soldData.filter(order => {
            if (!order['Thời gian nhập']) return false;
            const orderDate = moment(order['Thời gian nhập']);
            const orderYear = orderDate.year();
            const orderMonth = orderDate.month(); // 0-11

            if (orderYear !== selectedYear) return false;
            if (selectedMonth !== null && orderMonth !== selectedMonth) return false;
            return true;
        });
    }, [soldData, selectedMonth, selectedYear]);

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
        setCurrentPage(1);
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

    // Pagination
    const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);
    const paginatedData = useMemo(() => sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [sortedData, currentPage, PAGE_SIZE]);

    // Handlers
    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setCurrentPage(1);
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

    if (error) {
        return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;
    }

    return (
        <div className="flex flex-col h-full animate-fade-in space-y-3 p-2 md:p-0">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-card p-3 rounded-xl shadow-sm border border-border-primary">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-primary/10 rounded-lg">
                        <i className="fa-solid fa-chart-line text-accent-primary text-xl"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Lịch Sử Bán Hàng</h2>
                        <p className="text-xs text-text-secondary">Theo dõi doanh số và hiệu quả kinh doanh</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DateFilter
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        onMonthChange={setSelectedMonth}
                        onYearChange={setSelectedYear}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SummaryCard icon="fa-car" title={`Tổng Xe (${selectedMonth !== null ? MONTHS[selectedMonth] : 'Năm'})`} value={stats.total} size="compact" />
                <SummaryCard icon="fa-trophy" title="Xe Bán Chạy Nhất" value={stats.topCarDisplay} size="compact" />
                <SummaryCard icon="fa-crown" title="TVBH Xuất Sắc Nhất" value={stats.topTvbhDisplay} size="compact" />
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col lg:flex-row gap-3 min-h-0">
                {/* Left Column: List & Filters */}
                <div className="flex-1 flex flex-col bg-surface-card rounded-xl shadow-md border border-border-primary min-w-0">
                    <div className="p-3 border-b border-border-primary">
                        <Filters
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onReset={handleResetFilters}
                            dropdowns={dropdownConfigs}
                            searchPlaceholder="Tìm kiếm..."
                            totalCount={sortedData.length}
                            onRefresh={refetch}
                            isLoading={isLoading}
                            plain
                            size="compact"
                            searchable={false}
                        />
                    </div>
                    <div className="flex-grow overflow-auto hidden-scrollbar p-1">
                        <HistoryTable
                            orders={paginatedData}
                            onRowClick={handleRowClick}
                            selectedOrder={selectedDetailOrder}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            startIndex={(currentPage - 1) * PAGE_SIZE}
                            viewMode="sold"
                        />
                    </div>
                    <div className="p-2 border-t border-border-primary">
                        {totalPages > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => { }} isLoadingArchives={false} isLastArchive={true} />}
                    </div>
                </div>

                {/* Right Column: Details (Desktop) or Drawer (Mobile) */}
                <div className={`
                    fixed inset-y-0 right-0 w-full md:w-[400px] bg-surface-card shadow-2xl z-50 transform transition-transform duration-300 ease-in-out
                    lg:relative lg:transform-none lg:w-[450px] lg:shadow-none lg:z-0 lg:flex lg:flex-col lg:bg-transparent
                    ${isDetailDrawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    {/* Mobile Close Button */}
                    <div className="lg:hidden absolute top-4 right-4 z-50">
                        <button onClick={() => setIsDetailDrawerOpen(false)} className="p-2 bg-surface-ground rounded-full shadow-md text-text-secondary">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {/* Detail Panel Content */}
                    <div className="h-full flex flex-col bg-surface-card lg:rounded-xl lg:border lg:border-border-primary lg:shadow-md overflow-hidden">
                        <div className="p-3 border-b border-border-primary bg-surface-ground/50">
                            <h3 className="font-bold text-text-primary">Chi Tiết Đơn Hàng</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto hidden-scrollbar p-0">
                            <SoldCarDetailPanel order={selectedDetailOrder} showToast={showToast} />
                        </div>

                        {/* Mini Charts removed as per user request */}
                    </div>
                </div>
            </div>

            {/* Mobile Overlay for Drawer */}
            {isDetailDrawerOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsDetailDrawerOpen(false)}></div>
            )}
        </div>
    );
};

export default SoldCarsView;