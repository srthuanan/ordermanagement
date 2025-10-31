import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Order, SortConfig } from '../types';
import HistoryTable from './HistoryTable';
import Pagination from './ui/Pagination';
import SoldCarDetailPanel from './ui/SoldCarDetailPanel';
import SummaryCard from './ui/SummaryCard';
import Leaderboard from './ui/Leaderboard';
import SalesChart from './ui/SalesChart';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import { MONTHS } from '../constants';
import * as apiService from '../services/apiService';
import { useSoldCarsApi } from '../hooks/useSoldCarsApi';

// Chart.js is loaded globally via index.html
declare const Chart: any;

const PAGE_SIZE = 10;

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


// --- Sub-component for Monthly View ---
interface MonthViewProps {
    month: string;
    data: Order[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}
const MonthView: React.FC<MonthViewProps> = ({ data, isLoading, error, refetch }) => {
    const [filters, setFilters] = useState({ keyword: '', tvbh: [] as string[], carModel: [] as string[] });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);

    useEffect(() => {
        if(data.length > 0) {
            setSelectedDetailOrder(sortedData[0]);
        } else {
            setSelectedDetailOrder(null);
        }
        setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const uniqueTvbh = useMemo(() => [...new Set(data.map(o => synchronizeTvbhName(o['Tên tư vấn bán hàng'])).filter(Boolean))].sort(), [data]);
    const uniqueCarModels = useMemo(() => [...new Set(data.map(o => o['Dòng xe']).filter(Boolean))].sort(), [data]);

    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setCurrentPage(1);
        setFilters({ keyword: '', tvbh: [], carModel: [] });
    }, []);

    const displayData = useMemo(() => {
        let filteredData = [...data];
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            filteredData = filteredData.filter(o =>
                o['Tên khách hàng']?.toLowerCase().includes(keyword) ||
                o['Số đơn hàng']?.toLowerCase().includes(keyword) ||
                o.VIN?.toLowerCase().includes(keyword)
            );
        }
        if (filters.carModel.length > 0) {
            filteredData = filteredData.filter(o => filters.carModel.includes(o['Dòng xe']));
        }
        if (filters.tvbh.length > 0) {
            filteredData = filteredData.filter(o => filters.tvbh.includes(synchronizeTvbhName(o['Tên tư vấn bán hàng'])));
        }
        return filteredData;
    }, [data, filters]);

    const stats = useMemo(() => {
        const carDataAgg = aggregateData(data, 'Dòng xe');
        const tvbhDataAgg = aggregateData(data, 'Tên tư vấn bán hàng');
        const topCar = carDataAgg[0] || { key: "—", count: 0 };
        const topSalesperson = tvbhDataAgg[0] || { key: "—", count: 0 };
        return {
            total: data.length,
            topCarDisplay: `${topCar.key} (${topCar.count} xe)`,
            topTvbhDisplay: `${topSalesperson.key} (${topSalesperson.count} xe)`,
        };
    }, [data]);

    const handleSort = (key: keyof Order) => {
        setCurrentPage(1);
        setSortConfig(prev => ({ key, direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
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
    
    useEffect(() => {
        if (sortedData.length > 0) {
            setSelectedDetailOrder(sortedData[0]);
        }
    }, [sortedData]);


    const paginatedData = useMemo(() => sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [sortedData, currentPage]);
    const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);

    if (isLoading) return <div className="flex items-center justify-center h-full pt-16"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
    if (error) return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;

    const dropdownConfigs: DropdownFilterConfig[] = [
        { id: 'sold-month-filter-tvbh', key: 'tvbh', label: 'Tư vấn', options: uniqueTvbh, icon: 'fa-user-tie' },
        { id: 'sold-month-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
    ];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard icon="fa-car" title="Tổng Xe Bán (Tháng)" value={stats.total} />
                <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy" value={stats.topCarDisplay} />
                <SummaryCard icon="fa-crown" title="TVBH Xuất Sắc" value={stats.topTvbhDisplay} />
            </div>
            <div className="bg-surface-card rounded-xl shadow-md border border-border-primary p-4">
                <Filters filters={filters} onFilterChange={handleFilterChange} onReset={handleResetFilters} dropdowns={dropdownConfigs} searchPlaceholder="Tìm SĐH, Tên KH, VIN..." totalCount={sortedData.length} onRefresh={refetch} isLoading={isLoading} plain size="compact" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start tables-section">
                <div className="lg:col-span-2 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full min-h-[400px]">
                    <div className="p-4 border-b border-border-primary"><h3 className="font-bold text-base">Chi Tiết Giao Dịch</h3></div>
                    <div className="flex-grow overflow-auto"><HistoryTable orders={paginatedData} onRowClick={setSelectedDetailOrder} selectedOrder={selectedDetailOrder} sortConfig={sortConfig} onSort={handleSort} startIndex={(currentPage - 1) * PAGE_SIZE} viewMode="sold" /></div>
                    {totalPages > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                </div>
                <div className="lg:col-span-1 hidden lg:block sticky top-24 detail-panel"><SoldCarDetailPanel order={selectedDetailOrder} /></div>
            </div>
        </div>
    );
};

// --- Sub-component for Total Dashboard View ---
const TotalDashboard: React.FC<{
    soldData: Order[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}> = ({ soldData, isLoading, error, refetch }) => {
    const carChartRef = useRef<HTMLCanvasElement>(null);
    const carChartInstance = useRef<any>(null);

    const stats = useMemo(() => {
        const carDataAgg = aggregateData(soldData, 'Dòng xe');
        const tvbhDataAgg = aggregateData(soldData, 'Tên tư vấn bán hàng');
        const topCar = carDataAgg[0] || { key: "—", count: 0 };
        const topSalesperson = tvbhDataAgg[0] || { key: "—", count: 0 };
        return {
            total: soldData.length,
            topCarDisplay: `${topCar.key} (${topCar.count} xe)`,
            topTvbhDisplay: `${topSalesperson.key} (${topSalesperson.count} xe)`,
            topCars: carDataAgg.slice(0, 10),
            topTvbh: tvbhDataAgg.slice(0, 10),
            carDistribution: carDataAgg,
        };
    }, [soldData]);

    const yearlyData = useMemo(() => {
        const monthlySales: Record<string, number> = {};
        MONTHS.forEach(m => monthlySales[m] = 0);
        soldData.forEach(order => {
            if (order['Thời gian nhập']) {
                try {
                    const date = new Date(order['Thời gian nhập']);
                    if (!isNaN(date.getTime())) {
                        const monthName = MONTHS[date.getMonth()];
                        if (monthName) monthlySales[monthName]++;
                    }
                } catch {}
            }
        });
        return MONTHS.map((month, index) => ({ month: `T${index + 1}`, count: monthlySales[month] || 0 }));
    }, [soldData]);

    useEffect(() => {
        if (!carChartRef.current) return;
        const ctx = carChartRef.current.getContext('2d');
        if (!ctx) return;
        if (carChartInstance.current) carChartInstance.current.destroy();

        const pieData = stats.carDistribution;
        const total = pieData.reduce((s, r) => s + r.count, 0) || 1;

        carChartInstance.current = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: pieData.map(r => r.key),
                datasets: [{
                    data: pieData.map(r => r.count),
                    backgroundColor: ['#0D47A1', '#1565C0', '#1E88E5', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD'],
                    borderColor: '#FFFFFF',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 12, padding: 10 } },
                    tooltip: { callbacks: { label: (c: any) => `${c.label}: ${c.raw} xe (${((Number(c.raw) / total) * 100).toFixed(1)}%)` } }
                }
            }
        });

        return () => carChartInstance.current?.destroy();
    }, [stats.carDistribution]);

    if (isLoading) return <div className="flex items-center justify-center h-full pt-16"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
    if (error) return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard icon="fa-car" title="Tổng Xe Bán (Năm)" value={stats.total} />
                <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy" value={stats.topCarDisplay} />
                <SummaryCard icon="fa-crown" title="TVBH Xuất Sắc" value={stats.topTvbhDisplay} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface-card p-4 rounded-xl border border-border-primary shadow-md"><h3 className="font-bold text-base mb-3">Doanh Số Theo Tháng</h3><SalesChart salesData={yearlyData} onMonthClick={() => {}} selectedMonthIndex={null} /></div>
                <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md"><h3 className="font-bold text-base mb-3">Phân Bố Dòng Xe</h3><div className="h-80"><canvas ref={carChartRef}></canvas></div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Leaderboard title="BXH Dòng Xe (Năm)" icon="fa-trophy" items={stats.topCars} color="blue" />
                <Leaderboard title="BXH TVBH (Năm)" icon="fa-crown" items={stats.topTvbh} color="green" />
            </div>
        </div>
    );
};


// --- Main View Component ---
const SoldCarsView: React.FC = () => {
    const { soldData, isLoading, error, refetch: refetchAll } = useSoldCarsApi();
    const [activeTab, setActiveTab] = useState<'Total' | string>('Total');
    const [monthlyDataCache, setMonthlyDataCache] = useState<Record<string, Order[]>>({});
    const [currentMonthData, setCurrentMonthData] = useState<Order[]>([]);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const [errorMonth, setErrorMonth] = useState<string | null>(null);

    const fetchMonthData = useCallback(async (month: string) => {
        if (monthlyDataCache[month]) {
            setCurrentMonthData(monthlyDataCache[month]);
            return;
        }
        setIsLoadingMonth(true);
        setErrorMonth(null);
        setCurrentMonthData([]);
        try {
            const result = await apiService.getSoldCarsDataByMonth(month);
            if (result.status === 'SUCCESS' && result.data) {
                const sortedData = result.data.sort((a: Order, b: Order) => new Date(b['Thời gian nhập']).getTime() - new Date(a['Thời gian nhập']).getTime());
                setCurrentMonthData(sortedData);
                setMonthlyDataCache(prev => ({ ...prev, [month]: sortedData }));
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            setErrorMonth(err instanceof Error ? err.message : 'Lỗi không xác định');
        } finally {
            setIsLoadingMonth(false);
        }
    }, [monthlyDataCache]);
    
    useEffect(() => {
        if (activeTab !== 'Total') {
            fetchMonthData(activeTab);
        } else {
            setCurrentMonthData([]); // Clear month data when switching to total
        }
    }, [activeTab, fetchMonthData]);

    const tabs = ['Total', ...MONTHS];
    const tabLabels: Record<string, string> = { 'Total': 'Tổng Hợp' };
    MONTHS.forEach((_, i) => tabLabels[MONTHS[i]] = `Tháng ${i + 1}`);

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center border-b border-border-primary overflow-x-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {tabs.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:border-border-secondary hover:text-text-primary'}`}
                    >
                        {tabLabels[tab]}
                    </button>
                ))}
            </div>
            
            <div className="animate-fade-in">
                {activeTab === 'Total' 
                    ? <TotalDashboard soldData={soldData} isLoading={isLoading} error={error} refetch={refetchAll} />
                    : <MonthView month={activeTab} data={currentMonthData} isLoading={isLoadingMonth} error={errorMonth} refetch={() => fetchMonthData(activeTab)} />
                }
            </div>
        </div>
    );
};

export default SoldCarsView;