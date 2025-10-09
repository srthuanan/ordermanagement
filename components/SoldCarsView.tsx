import React, { useState, useMemo, useEffect } from 'react';
import { Order, SortConfig } from '../types';
import HistoryTable from './HistoryTable';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import Pagination from './ui/Pagination';
import { MONTHS } from '../constants';
import SoldCarDetailPanel from './ui/SoldCarDetailPanel';
import StatsOverview from './ui/StatsOverview';
import TotalViewDashboard from './ui/TotalViewDashboard';

const PAGE_SIZE = 10;

interface SoldCarsViewProps {
  soldData: Order[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Helper functions for data aggregation
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


const SoldCarsView: React.FC<SoldCarsViewProps> = ({
  soldData, isLoading, error, refetch
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('Total');
  const [filters, setFilters] = useState({ tvbh: [] as string[], keyword: '' });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  
  const displayData = useMemo(() => {
    if (selectedPeriod === 'Total') {
        return soldData;
    }
    return soldData.filter(order => {
        try {
            const date = new Date(order['Thời gian nhập']);
            if (isNaN(date.getTime())) return false; // Guard against invalid dates
            const monthName = MONTHS[date.getMonth()];
            return monthName === selectedPeriod;
        } catch {
            return false;
        }
    });
  }, [soldData, selectedPeriod]);

  useEffect(() => {
    setCurrentPage(1);
    setFilters({ tvbh: [], keyword: '' });
  }, [selectedPeriod]);


  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    setFilters({ tvbh: [], keyword: '' });
  };

  const handleSort = (key: keyof Order) => {
    setCurrentPage(1);
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const processedData = useMemo(() => {
    let filteredOrders = [...displayData];
    if (filters.tvbh.length > 0) {
      filteredOrders = filteredOrders.filter(order => 
        filters.tvbh.includes(synchronizeTvbhName(order['Tên tư vấn bán hàng']))
      );
    }
    if (sortConfig !== null) {
      filteredOrders.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === null || aValue === undefined || aValue === '') return 1;
        if (bValue === null || bValue === undefined || bValue === '') return -1;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filteredOrders;
  }, [displayData, filters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return processedData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [processedData, currentPage]);
  
  useEffect(() => {
    if (selectedPeriod !== 'Total') {
        const isSelectedOrderVisible = processedData.some(o => o['Số đơn hàng'] === selectedDetailOrder?.['Số đơn hàng']);
        if (processedData.length > 0 && !isSelectedOrderVisible) {
            setSelectedDetailOrder(processedData[0]);
        } else if (processedData.length === 0) {
            setSelectedDetailOrder(null);
        }
    }
  }, [processedData, selectedDetailOrder, selectedPeriod]);

  const stats = useMemo(() => {
    const carDataAgg = aggregateData(processedData, 'Dòng xe');
    const tvbhDataAgg = aggregateData(processedData, 'Tên tư vấn bán hàng');
    const topCar = carDataAgg[0] || { key: "-", count: 0 };
    // FIX: Renamed local variable to avoid confusion and corrected the returned object structure.
    const topTvbhInfo = tvbhDataAgg[0] || { key: "-", count: 0 };
    
    const monthlySalesData: Record<string, number> = {};
    MONTHS.forEach((m: string) => monthlySalesData[m] = 0);
    processedData.forEach(order => {
        if (order['Thời gian nhập']) {
            try {
                const date = new Date(order['Thời gian nhập']);
                if (!isNaN(date.getTime())) {
                    const monthName = MONTHS[date.getMonth()];
                    if (monthName) {
                        monthlySalesData[monthName] = (monthlySalesData[monthName] || 0) + 1;
                    }
                }
            } catch (e) {
                // ignore invalid dates
            }
        }
    });
    const monthlySales = MONTHS.map((month: string, index: number) => ({ month: `T${index + 1}`, count: monthlySalesData[month] || 0 }));


    return {
        total: processedData.length,
        topCar: `${topCar.key} (${topCar.count} xe)`,
        topTvbhSummary: `${topTvbhInfo.key} (${topTvbhInfo.count} xe)`,
        monthlySales: monthlySales,
        carDistribution: carDataAgg,
        topCars: carDataAgg.slice(0, 10),
        topTvbh: tvbhDataAgg.slice(0, 10),
    };
  }, [processedData]);

  const totalPages = Math.ceil(processedData.length / PAGE_SIZE);
  const uniqueTvbh = useMemo(() => [...new Set(displayData.map(o => synchronizeTvbhName(o["Tên tư vấn bán hàng"])))].filter(name => name && name !== 'N/A').sort(), [displayData]);

  const dropdownConfigs: DropdownFilterConfig[] = [
    { 
        id: 'sold-filter-tvbh', 
        key: 'tvbh', 
        label: 'Tư Vấn Bán Hàng', 
        options: uniqueTvbh, 
        icon: 'fa-user-tie',
    },
  ].filter(d => d.options.length > 0);
  
  const renderContent = () => {
    if (isLoading && displayData.length === 0) {
        return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
    }
    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8 bg-surface-card rounded-lg shadow-xl">
                    <i className="fas fa-exclamation-triangle fa-3x text-danger"></i>
                    <p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p>
                    <p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p>
                    <button onClick={refetch} className="mt-6 btn-primary">Thử lại</button>
                </div>
            </div>
        );
    }
    
    if (selectedPeriod === 'Total') {
        return (
            <div className="space-y-6">
                <TotalViewDashboard yearlyStats={stats} />
            </div>
        );
    }
    
    // Monthly View
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Left Column: Filters & Stats */}
            <div className="lg:col-span-3 space-y-6 flex flex-col">
                <StatsOverview stats={{ total: stats.total, topCar: stats.topCar, topTvbh: stats.topTvbhSummary }} />
                <Filters
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                    dropdowns={dropdownConfigs}
                    searchPlaceholder=""
                    totalCount={processedData.length}
                    onRefresh={refetch}
                    isLoading={isLoading}
                    hideSearch={true}
                />
            </div>

            {/* Center Column: Data Table */}
            <div className="lg:col-span-6 flex flex-col min-h-0 h-full">
                <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                    <div className="flex-grow overflow-auto relative">
                        <HistoryTable
                            orders={paginatedData}
                            onRowClick={setSelectedDetailOrder}
                            selectedOrder={selectedDetailOrder}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            startIndex={(currentPage - 1) * PAGE_SIZE}
                            viewMode="sold"
                        />
                    </div>
                    {totalPages > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                </div>
            </div>

            {/* Right Column: Contextual Info */}
            <div className="lg:col-span-3 h-full flex flex-col gap-6">
                <SoldCarDetailPanel order={selectedDetailOrder} />
            </div>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      <div className="flex-shrink-0 flex items-center justify-between gap-4 pb-4 border-b border-border-primary">
          <h2 className="text-xl font-bold text-text-primary">Báo Cáo Xe Đã Bán</h2>
          <div className="flex items-center gap-4">
            <select 
              value={selectedPeriod} 
              onChange={e => setSelectedPeriod(e.target.value)}
              className="w-48 pl-3 pr-8 py-2 bg-surface-card text-text-primary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all text-sm font-semibold"
            >
              <option value="Total">Cả Năm</option>
              {MONTHS.map((month: string, index: number) => (
                <option key={month} value={month}>Tháng {index + 1}</option>
              ))}
            </select>
            <button onClick={refetch} disabled={isLoading} className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-surface-card text-text-secondary border border-border-primary hover:text-accent-primary hover:bg-surface-accent transition-all disabled:opacity-50" aria-label="Làm mới" title="Làm mới">
                <i className={`fas fa-sync-alt ${isLoading ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
      </div>
      <div className="flex-grow pt-6 flex flex-col min-h-0">{renderContent()}</div>
    </div>
  );
};

export default SoldCarsView;