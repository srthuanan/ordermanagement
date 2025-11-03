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

interface SoldCarsViewProps {
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
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


// --- Sub-component for Monthly View ---
interface MonthViewProps {
    month: string;
    data: Order[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
    showToast: SoldCarsViewProps['showToast'];
}
const MonthView: React.FC<MonthViewProps> = ({ data, isLoading, error, refetch, showToast }) => {
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
                <div className="lg:col-span-1 hidden lg:block sticky top-24 detail-panel"><SoldCarDetailPanel order={selectedDetailOrder} showToast={showToast} /></div>
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
    
    // FIX: Added a useEffect to handle chart creation and destruction.
    useEffect(() => {
        if (carChartRef.current && stats.carDistribution.length > 0) {
            const ctx = carChartRef.current.getContext('2d');
            if (!ctx) return;

            if (carChartInstance.current) {
                carChartInstance.current.destroy();
            }

            const chartData = {
                labels: stats.carDistribution.map(d => d.key),
                datasets: [{
                    data: stats.carDistribution.map(d => d.count),
                    backgroundColor: [
                        '#42A5F5', '#66BB6A', '#FFA726', '#26A69A', '#AB47BC', 
                        '#EC407A', '#FF7043', '#78909C', '#5C6BC0', '#8D6E63'
                    ].slice(0, stats.carDistribution.length),
                    hoverBackgroundColor: [
                        '#64B5F6', '#81C784', '#FFB74D', '#4DB6AC', '#BA68C8', 
                        '#F06292', '#FF8A65', '#90A4AE', '#7986CB', '#A1887F'
                    ].slice(0, stats.carDistribution.length)
                }]
            };

            carChartInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 10,
                                color: '#64748B',
                                font: {
                                    size: 10
                                }
                            }
                        },
                         tooltip: {
                            backgroundColor: '#FFFFFF',
                            titleColor: '#0F172A',
                            bodyColor: '#64748B',
                            borderColor: '#E2E8F0',
                            borderWidth: 1,
                        }
                    },
                    cutout: '60%',
                }
            });
        }
        return () => {
            if (carChartInstance.current) {
                carChartInstance.current.destroy();
            }
        };
    }, [stats.carDistribution]);


    if (isLoading && soldData.length === 0) {
        return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
    }
    if (error) {
        return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;
    }

    // FIX: Added a return statement with JSX to render the dashboard.
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard icon="fa-car" title="Tổng Xe Bán (năm)" value={stats.total} />
                <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy" value={stats.topCarDisplay} />
                <SummaryCard icon="fa-crown" title="TVBH Xuất Sắc" value={stats.topTvbhDisplay} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Leaderboard title="BXH Dòng Xe (Năm)" icon="fa-trophy" items={stats.topCars} color="blue" />
                </div>
                <div className="lg:col-span-1">
                    <Leaderboard title="BXH TVBH (Năm)" icon="fa-crown" items={stats.topTvbh} color="green" />
                </div>
                <div className="lg:col-span-1 bg-surface-card p-4 rounded-xl border border-border-primary shadow-md flex flex-col h-96 transition-all duration-300 hover:shadow-glow-accent hover:-translate-y-1">
                    <h3 className="font-bold text-text-primary text-base mb-3">Phân Bổ Dòng Xe</h3>
                    <div className="h-full flex-grow flex items-center justify-center min-h-0">
                        <canvas ref={carChartRef}></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main View ---
const SoldCarsView: React.FC<SoldCarsViewProps> = ({ showToast }) => {
    const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
    const { soldData, isLoading, error, refetch } = useSoldCarsApi();

    const monthlyData = useMemo(() => {
        const grouped: Record<string, Order[]> = {};
        soldData.forEach(order => {
            if (order['Thời gian nhập']) {
                try {
                    const monthName = MONTHS[new Date(order['Thời gian nhập']).getMonth()];
                    if (monthName) {
                        if (!grouped[monthName]) {
                            grouped[monthName] = [];
                        }
                        grouped[monthName].push(order);
                    }
                } catch {}
            }
        });
        return grouped;
    }, [soldData]);

    const yearlyData = useMemo(() => {
        const monthlySalesData: Record<string, number> = {};
        MONTHS.forEach(m => monthlySalesData[m] = 0);
        Object.entries(monthlyData).forEach(([month, orders]) => {
            monthlySalesData[month] = orders.length;
        });
        return MONTHS.map((month, index) => ({ month: `T${index + 1}`, count: monthlySalesData[month] || 0 }));
    }, [monthlyData]);

    const handleMonthChange = (monthIndex: number | null) => {
        if (monthIndex === null) {
            setSelectedMonth(null);
        } else {
            setSelectedMonth(MONTHS[monthIndex]);
        }
    };
    
    const selectedMonthIndex = selectedMonth !== null ? MONTHS.indexOf(selectedMonth) : null;

    if (selectedMonth) {
        const monthData = monthlyData[selectedMonth] || [];
        return (
            <div className="flex flex-col h-full animate-fade-in-up">
                <header className="flex-shrink-0 flex items-center justify-between mb-4 pb-3 border-b border-border-primary">
                    <h2 className="text-2xl font-bold text-text-primary">Doanh số Tháng {selectedMonth}</h2>
                    <button onClick={() => setSelectedMonth(null)} className="btn-secondary">
                        <i className="fas fa-arrow-left mr-2"></i>Xem Tổng Quan Năm
                    </button>
                </header>
                <div className="flex-grow overflow-y-auto">
                    <MonthView month={selectedMonth} data={monthData} isLoading={isLoading} error={error} refetch={refetch} showToast={showToast} />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-text-primary">Tổng Quan Doanh Số Bán Hàng</h2>
            <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md">
                <h3 className="font-bold text-text-primary text-base mb-3">Doanh Số Toàn Cầu Theo Tháng (Click để xem chi tiết)</h3>
                <SalesChart salesData={yearlyData} onMonthClick={handleMonthChange} selectedMonthIndex={selectedMonthIndex} />
            </div>
            <TotalDashboard soldData={soldData} isLoading={isLoading} error={error} refetch={refetch} />
        </div>
    );
};

export default SoldCarsView;
