import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Order, SortConfig } from './types';
import HistoryTable from './components/HistoryTable';
import Pagination from './components/ui/Pagination';
import SoldCarDetailPanel from './components/ui/SoldCarDetailPanel';
import SummaryCard from './components/ui/SummaryCard';
import Leaderboard from './components/ui/Leaderboard';
import SalesChart from './components/ui/SalesChart';
import Filters, { DropdownFilterConfig } from './components/ui/Filters';
import { MONTHS } from './constants';

// Chart.js is loaded globally via index.html
declare const Chart: any;

const PAGE_SIZE = 10;

// --- SKELETON COMPONENTS ---

const SkeletonSummaryCard = () => (
    <div className="bg-surface-card p-3 rounded-xl border border-border-primary flex items-center gap-3">
        <div className="skeleton-item flex-shrink-0 w-10 h-10 rounded-md"></div>
        <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton-item h-4 w-20"></div>
            <div className="skeleton-item h-5 w-28"></div>
        </div>
    </div>
);

const SkeletonLeaderboard = () => (
    <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md flex flex-col h-96">
        <div className="skeleton-item h-5 w-1/2 mb-4"></div>
        <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-2">
                    <div className="skeleton-item w-8 h-8 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                        <div className="skeleton-item h-4 w-3/4"></div>
                        <div className="skeleton-item h-2 w-full"></div>
                    </div>
                    <div className="skeleton-item h-6 w-8"></div>
                </div>
            ))}
        </div>
    </div>
);

const SkeletonSalesChart = () => (
    <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md">
        <div className="skeleton-item h-5 w-1/3 mb-4"></div>
        <div className="skeleton-item h-80 w-full"></div>
    </div>
);

const TotalDashboardSkeleton = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonSummaryCard />
            <SkeletonSummaryCard />
            <SkeletonSummaryCard />
        </div>
        <SkeletonSalesChart />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonLeaderboard />
            <SkeletonLeaderboard />
        </div>
    </div>
);

const SkeletonHistoryTable = () => (
    <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full min-h-[400px]">
        <div className="p-4 border-b border-border-primary">
            <div className="skeleton-item h-5 w-1/4"></div>
        </div>
        <div className="flex-grow p-4 space-y-3">
            {Array.from({ length: PAGE_SIZE / 2 }).map((_, i) => (
                <div key={i} className="skeleton-item h-10 w-full"></div>
            ))}
        </div>
    </div>
);

const SkeletonDetailPanel = () => (
     <div className="detail-panel h-full">
        <div className="p-4 border-b border-border-primary">
            <div className="skeleton-item h-6 w-1/2"></div>
        </div>
        <div className="p-4 space-y-6">
            <div className="skeleton-item h-20 w-full rounded-lg"></div>
            <div className="space-y-4 mt-4">
                <div className="skeleton-item h-5 w-1/3"></div>
                <div className="pl-4 space-y-3">
                    <div className="skeleton-item h-8 w-full"></div>
                    <div className="skeleton-item h-8 w-full"></div>
                </div>
            </div>
            <div className="space-y-4 mt-4">
                <div className="skeleton-item h-5 w-1/3"></div>
                <div className="pl-4 space-y-3">
                    <div className="skeleton-item h-8 w-full"></div>
                    <div className="skeleton-item h-8 w-full"></div>
                    <div className="skeleton-item h-8 w-full"></div>
                </div>
            </div>
        </div>
    </div>
);

const MonthViewSkeleton = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonSummaryCard />
            <SkeletonSummaryCard />
            <SkeletonSummaryCard />
        </div>
        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary p-4">
            <div className="skeleton-item h-8 w-full"></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start tables-section">
            <div className="lg:col-span-2">
                <SkeletonHistoryTable />
            </div>
            <div className="lg:col-span-1 hidden lg:block sticky top-24">
                <SkeletonDetailPanel />
            </div>
        </div>
    </div>
);

// --- END SKELETON COMPONENTS ---

interface SoldCarsViewProps {
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  soldData: Order[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
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
        const carDataAgg = aggregateData(displayData, 'Dòng xe');
        const tvbhDataAgg = aggregateData(displayData, 'Tên tư vấn bán hàng');
        const topCar = carDataAgg[0] || { key: "—", count: 0 };
        const topSalesperson = tvbhDataAgg[0] || { key: "—", count: 0 };
        return {
            total: displayData.length,
            topCarDisplay: `${topCar.key} (${topCar.count} xe)`,
            topTvbhDisplay: `${topSalesperson.key} (${topSalesperson.count} xe)`,
        };
    }, [displayData]);

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

    if (isLoading && data.length === 0) return <MonthViewSkeleton />;
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
    yearlyData: { month: string; count: number }[];
    onMonthClick: (monthIndex: number | null) => void;
}> = ({ soldData, isLoading, error, refetch, yearlyData, onMonthClick }) => {
    
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
        };
    }, [soldData]);

    if (isLoading && soldData.length === 0) {
        return <TotalDashboardSkeleton />;
    }
    if (error) {
        return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard icon="fa-car" title="Tổng Xe Bán (năm)" value={stats.total} />
                <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy" value={stats.topCarDisplay} />
                <SummaryCard icon="fa-crown" title="TVBH Xuất Sắc" value={stats.topTvbhDisplay} />
            </div>
             <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md">
                <h3 className="font-bold text-text-primary text-base mb-3">Doanh Số Toàn Cầu Theo Tháng (Click để xem chi tiết)</h3>
                <SalesChart salesData={yearlyData} onMonthClick={onMonthClick} selectedMonthIndex={null} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Leaderboard title="BXH Dòng Xe (Năm)" icon="fa-trophy" items={stats.topCars} color="blue" />
                <Leaderboard title="BXH TVBH (Năm)" icon="fa-crown" items={stats.topTvbh} color="green" />
            </div>
        </div>
    );
};

// --- Main View ---
const SoldCarsView: React.FC<SoldCarsViewProps> = ({ showToast, soldData, isLoading, error, refetch }) => {
    const [activeTab, setActiveTab] = useState<string>('Tổng Quan');

    const monthlyData = useMemo(() => {
        const grouped: Record<string, Order[]> = {};
        MONTHS.forEach(month => grouped[month] = []);
        soldData.forEach(order => {
            if (order['Thời gian nhập']) {
                try {
                    const monthName = MONTHS[new Date(order['Thời gian nhập']).getMonth()];
                    if (monthName) {
                        grouped[monthName].push(order);
                    }
                } catch {}
            }
        });
        return grouped;
    }, [soldData]);

    const yearlyData = useMemo(() => {
        return MONTHS.map((month, index) => ({ 
            month: `T${index + 1}`, 
            count: monthlyData[month]?.length || 0 
        }));
    }, [monthlyData]);
    
    const TABS = ['Tổng Quan', ...MONTHS.map((_, i) => `Tháng ${i + 1}`)];
    
    const handleMonthClickFromChart = (monthIndex: number | null) => {
        if (monthIndex !== null) {
            setActiveTab(`Tháng ${monthIndex + 1}`);
        }
    };

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary mb-4">
                <div className="admin-tabs-container p-2 flex items-center border-b border-border-primary overflow-x-auto">
                     {TABS.map((tab, index) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === tab ? 'bg-accent-primary text-white shadow-sm' : 'text-text-secondary hover:bg-surface-hover'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto">
                <div hidden={activeTab !== 'Tổng Quan'}>
                     <TotalDashboard 
                        soldData={soldData}
                        isLoading={isLoading}
                        error={error}
                        refetch={refetch}
                        yearlyData={yearlyData}
                        onMonthClick={handleMonthClickFromChart}
                     />
                </div>
                {MONTHS.map((monthName, index) => (
                    <div key={monthName} hidden={activeTab !== `Tháng ${index + 1}`}>
                        <MonthView 
                            month={`Tháng ${index + 1}`}
                            data={monthlyData[monthName] || []}
                            isLoading={isLoading}
                            error={error}
                            refetch={refetch}
                            showToast={showToast}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SoldCarsView;
