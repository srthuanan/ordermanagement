import React, { useState, useMemo, useCallback } from 'react';
import { Order, SortConfig } from '../types';
import HistoryTable from './HistoryTable';
import Pagination from './ui/Pagination';
import SoldCarDetailPanel from './ui/SoldCarDetailPanel';
import SummaryCard from './ui/SummaryCard';
import Leaderboard from './ui/Leaderboard';
import SalesChart from './ui/SalesChart';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import { MONTHS } from '../constants';

const PAGE_SIZE = 10;

interface SoldCarsViewProps {
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


const SoldCarsView: React.FC<SoldCarsViewProps> = ({ soldData, isLoading, error, refetch }) => {
  const [filters, setFilters] = useState({
      keyword: '',
      dateRange: { start: '', end: '' },
      tvbh: [] as string[],
      carModel: [] as string[],
  });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);

  const uniqueTvbh = useMemo(() => [...new Set(soldData.map(o => synchronizeTvbhName(o['Tên tư vấn bán hàng'])).filter(Boolean))].sort(), [soldData]);
  const uniqueCarModels = useMemo(() => [...new Set(soldData.map(o => o['Dòng xe']).filter(Boolean))].sort(), [soldData]);

  const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
      setCurrentPage(1);
      setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setCurrentPage(1);
    setFilters({
      keyword: '',
      dateRange: { start: '', end: '' },
      tvbh: [],
      carModel: [],
    });
  }, []);

  const yearlyData = useMemo(() => {
      const monthlySalesData: Record<string, number> = {};
      MONTHS.forEach(m => monthlySalesData[m] = 0);
      soldData.forEach(order => {
          if (order['Thời gian nhập']) {
              try {
                  const date = new Date(order['Thời gian nhập']);
                  if (!isNaN(date.getTime())) {
                      const monthName = MONTHS[date.getMonth()];
                      if (monthName) {
                          monthlySalesData[monthName] = (monthlySalesData[monthName] || 0) + 1;
                      }
                  }
              } catch {}
          }
      });
      return MONTHS.map((month, index) => ({ month: `T${index + 1}`, count: monthlySalesData[month] || 0 }));
  }, [soldData]);

  const displayData = useMemo(() => {
    let data = [...soldData];

    if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        data = data.filter(o => 
            o['Tên khách hàng']?.toLowerCase().includes(keyword) ||
            o['Số đơn hàng']?.toLowerCase().includes(keyword) ||
            o.VIN?.toLowerCase().includes(keyword) ||
            o['Tên tư vấn bán hàng']?.toLowerCase().includes(keyword)
        );
    }
    if (filters.carModel.length > 0) {
        data = data.filter(o => filters.carModel.includes(o['Dòng xe']));
    }
    if (filters.tvbh.length > 0) {
        data = data.filter(o => filters.tvbh.includes(synchronizeTvbhName(o['Tên tư vấn bán hàng'])));
    }
    if (filters.dateRange.start && filters.dateRange.end) {
        const start = new Date(filters.dateRange.start).getTime();
        const end = new Date(filters.dateRange.end).getTime() + 86399999; // include end day
        data = data.filter(o => {
            if (!o['Thời gian nhập']) return false;
            try {
                const orderTime = new Date(o['Thời gian nhập']).getTime();
                return orderTime >= start && orderTime <= end;
            } catch { return false; }
        });
    }
    
    return data;
  }, [soldData, filters]);

  const stats = useMemo(() => {
    const carDataAgg = aggregateData(displayData, 'Dòng xe');
    const tvbhDataAgg = aggregateData(displayData, 'Tên tư vấn bán hàng');
    const topCar = carDataAgg[0] || { key: "—", count: 0 };
    const topSalesperson = tvbhDataAgg[0] || { key: "—", count: 0 };

    return {
        total: displayData.length,
        topCarDisplay: `${topCar.key}`,
        topCarCount: `(${topCar.count} xe)`,
        topTvbhDisplay: `${topSalesperson.key}`,
        topTvbhCount: `(${topSalesperson.count} xe)`,
        topCars: carDataAgg.slice(0, 10),
        topTvbh: tvbhDataAgg.slice(0, 10),
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

  const paginatedData = useMemo(() => sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [sortedData, currentPage]);
  const totalPages = Math.ceil(sortedData.length / PAGE_SIZE);

  const selectedMonthIndex = useMemo(() => {
      if (!filters.dateRange.start) return null;
      try {
          const startDate = new Date(filters.dateRange.start);
          const endDate = filters.dateRange.end ? new Date(filters.dateRange.end) : null;
          if (endDate) {
               const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
               if (diffDays >= 27 && diffDays <= 32 && startDate.getDate() === 1) {
                  return startDate.getMonth();
               }
          }
          return null;
      } catch {
          return null;
      }
  }, [filters.dateRange]);
  
  if (isLoading && soldData.length === 0) return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
  if (error) return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;
    
  const dropdownConfigs: DropdownFilterConfig[] = [
    { id: 'sold-filter-tvbh', key: 'tvbh', label: 'Tư vấn', options: uniqueTvbh, icon: 'fa-user-tie' },
    { id: 'sold-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
  ];

  const filterPanel = (
    <div className="bg-surface-card rounded-xl shadow-md border border-border-primary p-4">
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
          dropdowns={dropdownConfigs}
          searchPlaceholder="Tìm SĐH, Tên KH, VIN..."
          totalCount={sortedData.length}
          onRefresh={refetch}
          isLoading={isLoading}
          dateRangeEnabled
          size="compact"
          plain={true}
        />
    </div>
  );
  
  const tableSection = (
      <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full">
          <div className="p-4 border-b border-border-primary flex-shrink-0">
              <h3 className="font-bold text-text-primary text-base">Chi Tiết Giao Dịch</h3>
          </div>
          <div className="flex-grow overflow-y-auto relative">
              <HistoryTable orders={paginatedData} onRowClick={setSelectedDetailOrder} selectedOrder={selectedDetailOrder} sortConfig={sortConfig} onSort={handleSort} startIndex={(currentPage - 1) * PAGE_SIZE} viewMode="sold" />
          </div>
          {totalPages > 0 &&
              <div className="flex-shrink-0">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => { }} isLoadingArchives={false} isLastArchive={true} />
              </div>
          }
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {filterPanel}
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon="fa-car" title="Tổng Xe Bán (lọc)" value={stats.total} />
          <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy" value={stats.topCarDisplay} valueClassName="text-xl" />
          <SummaryCard icon="fa-crown" title="TVBH Xuất Sắc" value={stats.topTvbhDisplay} valueClassName="text-xl" />
          <SummaryCard icon="fa-chart-pie" title="Tổng Doanh Số (năm)" value={soldData.length} />
      </div>
      
      {/* Chart */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md transition-all duration-300 hover:shadow-glow-accent hover:-translate-y-1">
          <h3 className="font-bold text-text-primary text-base mb-3">Doanh Số Toàn Cầu Theo Tháng</h3>
          <SalesChart salesData={yearlyData} onMonthClick={(index) => {
              if (index === null) {
                  handleFilterChange({ dateRange: { start: '', end: '' } });
              } else {
                  const year = new Date().getFullYear();
                  const startOfMonth = new Date(year, index, 1).toISOString().split('T')[0];
                  const endOfMonth = new Date(year, index + 1, 0).toISOString().split('T')[0];
                  handleFilterChange({ dateRange: { start: startOfMonth, end: endOfMonth } });
              }
          }} selectedMonthIndex={selectedMonthIndex} />
      </div>
      
      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Leaderboard title="BXH Dòng Xe (theo bộ lọc)" icon="fa-trophy" items={stats.topCars} color="blue" />
          <Leaderboard title="BXH TVBH (theo bộ lọc)" icon="fa-crown" items={stats.topTvbh} color="green" />
      </div>

      {/* Table & Detail Panel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
              {tableSection}
          </div>
          <div className="lg:col-span-1 hidden lg:block sticky top-24">
               <SoldCarDetailPanel order={selectedDetailOrder} />
          </div>
      </div>
    </div>
  );
};

export default SoldCarsView;
