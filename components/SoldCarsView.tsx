import React, { useState, useMemo, useCallback } from 'react';
import { Order, SortConfig } from '../types';
import HistoryTable from './HistoryTable';
import Pagination from './ui/Pagination';
import { MONTHS } from '../constants';
import SoldCarDetailPanel from './ui/SoldCarDetailPanel';
import SummaryCard from './ui/SummaryCard';
import Leaderboard from './ui/Leaderboard';
import SalesChart from './ui/SalesChart';
import MultiSelectDropdown from './ui/MultiSelectDropdown';

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
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const [selectedLeaderboardItem, setSelectedLeaderboardItem] = useState<{ type: 'tvbh' | 'car'; key: string } | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [selectedTvbh, setSelectedTvbh] = useState<string[]>([]);
  
  const uniqueTvbh = useMemo(() => [...new Set(soldData.map(o => synchronizeTvbhName(o['Tên tư vấn bán hàng'])).filter(Boolean))].sort(), [soldData]);

  const resetFilters = useCallback(() => {
    setSelectedMonthIndex(null);
    setSelectedLeaderboardItem(null);
    setSelectedTvbh([]);
    setCurrentPage(1);
  }, []);

  const handleTvbhFilterChange = useCallback((v: string[]) => {
    setSelectedTvbh(v);
    setCurrentPage(1);
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
    if (selectedMonthIndex !== null) {
        const selectedMonthName = MONTHS[selectedMonthIndex];
        data = data.filter(order => {
            try {
                const date = new Date(order['Thời gian nhập']);
                return !isNaN(date.getTime()) && MONTHS[date.getMonth()] === selectedMonthName;
            } catch { return false; }
        });
    }

    if (selectedLeaderboardItem) {
        if (selectedLeaderboardItem.type === 'tvbh') {
            data = data.filter(o => synchronizeTvbhName(o['Tên tư vấn bán hàng']) === selectedLeaderboardItem.key);
        } else if (selectedLeaderboardItem.type === 'car') {
            data = data.filter(o => o['Dòng xe'] === selectedLeaderboardItem.key);
        }
    }
    
    if (selectedTvbh.length > 0) {
        data = data.filter(o => selectedTvbh.includes(synchronizeTvbhName(o['Tên tư vấn bán hàng'])));
    }
    
    return data;
  }, [soldData, selectedMonthIndex, selectedLeaderboardItem, selectedTvbh]);

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

  const renderActiveFilters = () => {
    const filters = [];
    if (selectedMonthIndex !== null) {
      filters.push({
        key: `month-${selectedMonthIndex}`,
        value: `Tháng ${selectedMonthIndex + 1}`,
        onRemove: () => setSelectedMonthIndex(null)
      });
    }
    if (selectedLeaderboardItem) {
      filters.push({
        key: `leaderboard-${selectedLeaderboardItem.key}`,
        value: selectedLeaderboardItem.key,
        onRemove: () => setSelectedLeaderboardItem(null)
      });
    }
    selectedTvbh.forEach(tvbh => {
      filters.push({
        key: `tvbh-${tvbh}`,
        value: tvbh,
        onRemove: () => setSelectedTvbh(prev => prev.filter(t => t !== tvbh))
      });
    });

    if (filters.length === 0) return null;

    return (
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <span className="text-sm font-medium text-text-secondary">Đang lọc theo:</span>
        {filters.map(f => (
          <div key={f.key} className="flex items-center gap-2 bg-accent-primary/10 text-accent-primary text-xs font-semibold pl-2.5 pr-1.5 py-1 rounded-full animate-fade-in-up" style={{animationDuration: '300ms'}}>
            <span>{f.value}</span>
            <button onClick={f.onRemove} className="w-4 h-4 rounded-full bg-accent-primary/20 hover:bg-accent-primary/40 flex items-center justify-center flex-shrink-0"><i className="fas fa-times text-xs"></i></button>
          </div>
        ))}
        <button onClick={resetFilters} className="ml-auto text-xs text-accent-secondary hover:text-accent-primary font-semibold transition-all flex items-center gap-1.5">
            <i className="fas fa-times-circle"></i>
            <span>Xóa Lọc</span>
        </button>
      </div>
    );
  };
  
  if (isLoading && soldData.length === 0) return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
  if (error) return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetch} className="mt-6 btn-primary">Thử lại</button></div>;
    
  const isYearlyView = selectedMonthIndex === null;
  const buttonClass = "px-2 py-1 text-xs font-semibold rounded-lg border transition-colors duration-200 shadow-sm";
  const activeClass = "bg-accent-primary text-white border-accent-primary";
  const inactiveClass = "bg-surface-card text-text-secondary border-border-primary hover:bg-surface-accent hover:border-accent-primary/50";
  
  const monthSelector = (
      <div className="bg-surface-card p-2 rounded-xl border border-border-primary shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                  <button
                      onClick={() => { setSelectedMonthIndex(null); setCurrentPage(1); }}
                      className={`${buttonClass} ${selectedMonthIndex === null ? activeClass : inactiveClass}`}
                  >
                      <i className="fas fa-calendar-alt mr-2"></i> Cả Năm
                  </button>
                  <div className="h-6 w-px bg-border-primary mx-1 hidden sm:block"></div>
                  {MONTHS.map((_, index) => (
                      <button
                          key={index}
                          onClick={() => { setSelectedMonthIndex(index); setCurrentPage(1); }}
                          className={`${buttonClass} ${selectedMonthIndex === index ? activeClass : inactiveClass}`}
                      >
                          Tháng {index + 1}
                      </button>
                  ))}
               </div>
               <MultiSelectDropdown
                  id="sold-tvbh-filter"
                  label="Lọc theo TVBH"
                  options={uniqueTvbh}
                  selectedOptions={selectedTvbh}
                  onChange={handleTvbhFilterChange}
                  icon="fa-filter"
                  size="compact"
                  displayMode="selection"
              />
          </div>
      </div>
  );

  const tableSection = (
      <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full">
          <div className="p-4 border-b border-border-primary flex-shrink-0">
              <h3 className="font-bold text-text-primary text-base">Chi Tiết Giao Dịch</h3>
              {renderActiveFilters()}
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

  if (!isYearlyView) {
      return (
          <div className="flex flex-col h-full animate-fade-in-up">
              <div className="flex-shrink-0 space-y-6">
                  {monthSelector}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow mt-6 min-h-0">
                  <div className="lg:col-span-2 flex flex-col h-full min-h-0">
                      {tableSection}
                  </div>
                  <div className="lg:col-span-1 hidden lg:block h-full min-h-0">
                      <SoldCarDetailPanel order={selectedDetailOrder} />
                  </div>
              </div>
          </div>
      );
  }

  // Yearly view with normal page scroll
  return (
    <div className="space-y-6 animate-fade-in-up">
      {monthSelector}
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon="fa-car" title="Tổng Số Xe Bán" value={stats.total} />
          <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy" value={stats.topCarDisplay} valueClassName="text-xl" />
          <SummaryCard icon="fa-crown" title="TVBH Xuất Sắc" value={stats.topTvbhDisplay} valueClassName="text-xl" />
          <SummaryCard icon="fa-chart-pie" title="Tổng Doanh Số (Năm)" value={soldData.length} />
      </div>
      
      {/* Chart */}
      <div className="bg-surface-card p-4 rounded-xl border border-border-primary shadow-md transition-all duration-300 hover:shadow-glow-accent hover:-translate-y-1">
          <h3 className="font-bold text-text-primary text-base mb-3">Doanh Số Theo Tháng</h3>
          <SalesChart salesData={yearlyData} onMonthClick={(index) => { setSelectedMonthIndex(index); setCurrentPage(1); }} selectedMonthIndex={selectedMonthIndex} />
      </div>
      
      {/* Leaderboards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Leaderboard title="BXH Dòng Xe" icon="fa-trophy" items={stats.topCars} color="blue" />
          <Leaderboard title="BXH TVBH" icon="fa-crown" items={stats.topTvbh} color="green" />
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

export default React.memo(SoldCarsView);