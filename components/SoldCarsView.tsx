import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Order, SortConfig } from '../types';
import HistoryTable from './HistoryTable';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import Pagination from './ui/Pagination';
import SummaryCard from './ui/SummaryCard';
import * as apiService from '../services/apiService';
import { MONTHS } from '../constants';

const PAGE_SIZE = 10;

interface SoldCarsViewProps {
  onViewDetails: (order: Order) => void;
  onCancel: (order: Order) => void;
  onRequestInvoice: (order: Order) => void;
  onSupplement: (order: Order) => void;
  onRequestVC: (order: Order) => void;
  onConfirmVC: (order: Order) => void;
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


const SoldCarsView: React.FC<SoldCarsViewProps> = ({
  onViewDetails, onCancel, onRequestInvoice, onSupplement, onRequestVC, onConfirmVC, showToast
}) => {
  const currentMonthIndex = new Date().getMonth();
  const [activeTab, setActiveTab] = useState<string>(MONTHS[currentMonthIndex]);
  const [viewData, setViewData] = useState<Order[]>([]);
  const [totalData, setTotalData] = useState<Order[]>([]);
  const [cachedData, setCachedData] = useState<Record<string, Order[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({ keyword: '', carModel: [] as string[] });
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  
  const monthlyChartRef = useRef<HTMLCanvasElement>(null);
  const carChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<{ [key: string]: Chart }>({});
  
  const refetch = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        const currentTab = activeTab;

        try {
            if (currentTab === 'Total') {
                const result = await apiService.getAllSoldCarsData();
                if (result.status === 'SUCCESS') {
                    setTotalData(result.data || []);
                    setCachedData(prev => ({ ...prev, Total: result.data || [] }));
                } else { throw new Error(result.message); }
            } else {
                const result = await apiService.getSoldCarsDataByMonth(currentTab);
                if (result.status === 'SUCCESS') {
                    setViewData(result.data || []);
                    setCachedData(prev => ({ ...prev, [currentTab]: result.data || [] }));
                } else { throw new Error(result.message); }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(message);
        } finally {
            setIsLoading(false);
        }
  }, [activeTab]);

  useEffect(() => {
    const fetchDataForTab = async () => {
        if (cachedData[activeTab]) {
            if (activeTab === 'Total') setTotalData(cachedData[activeTab]);
            else setViewData(cachedData[activeTab]);
            setIsLoading(false);
            return;
        }
        refetch();
    };
    fetchDataForTab();
  }, [activeTab, cachedData, refetch]);


  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setCurrentPage(1);
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setCurrentPage(1);
    setFilters({ keyword: '', carModel: [] });
  };

  const handleSort = (key: keyof Order) => {
    setCurrentPage(1);
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const monthlyStats = useMemo(() => {
    const carDataAgg = aggregateData(viewData, 'Dòng xe');
    const tvbhDataAgg = aggregateData(viewData, 'Tên tư vấn bán hàng');
    const topCar = carDataAgg[0] || { key: "-", count: 0 };
    const topTvbh = tvbhDataAgg[0] || { key: "-", count: 0 };
    return {
        total: viewData.length,
        topCar: `${topCar.key} (${topCar.count} xe)`,
        topTvbh: `${topTvbh.key} (${topTvbh.count} xe)`,
    };
  }, [viewData]);
  
  const yearlyStats = useMemo(() => {
    if (totalData.length === 0) return { total: 0, topCar: '-', topTvbh: '-', monthlySales: [], carDistribution: [] };
    const carDataAgg = aggregateData(totalData, 'Dòng xe');
    const tvbhDataAgg = aggregateData(totalData, 'Tên tư vấn bán hàng');
    const topCar = carDataAgg[0] || { key: "-", count: 0 };
    const topTvbh = tvbhDataAgg[0] || { key: "-", count: 0 };
    
    const monthlySales = MONTHS.map((month, index) => ({
      month: `Th ${index + 1}`,
      count: cachedData[month]?.length || 0,
    }));

    return {
        total: totalData.length,
        topCar: `${topCar.key} (${topCar.count} xe)`,
        topTvbh: `${topTvbh.key} (${topTvbh.count} xe)`,
        monthlySales,
        carDistribution: carDataAgg,
        top5Cars: carDataAgg.slice(0, 5),
        top5Tvbh: tvbhDataAgg.slice(0, 5),
    };
  }, [totalData, cachedData]);

  const processedData = useMemo(() => {
    let filteredOrders = [...viewData];
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      filteredOrders = filteredOrders.filter(
        order =>
          order['Tên khách hàng']?.toLowerCase().includes(keyword) ||
          order['Số đơn hàng']?.toLowerCase().includes(keyword) ||
          order.VIN?.toLowerCase().includes(keyword)
      );
    }
    if (filters.carModel.length > 0) {
      filteredOrders = filteredOrders.filter(order => filters.carModel.includes(order['Dòng xe']));
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
  }, [viewData, filters, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return processedData.slice(startIndex, startIndex + PAGE_SIZE);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / PAGE_SIZE);
  const uniqueCarModels = useMemo(() => [...new Set(viewData.map(o => o["Dòng xe"]))].sort(), [viewData]);
  const dropdownConfigs: DropdownFilterConfig[] = [
    { id: 'sold-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
  ].filter(d => d.options.length > 0);
  
  const renderMonthView = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <SummaryCard icon="fa-car" title="Tổng Số Xe (Tháng)" value={monthlyStats.total} />
        <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy (Tháng)" value={monthlyStats.topCar} />
        <SummaryCard icon="fa-user-tie" title="TVBH Xuất Sắc (Tháng)" value={monthlyStats.topTvbh} />
      </div>
      <Filters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        dropdowns={dropdownConfigs}
        searchPlaceholder="Tìm kiếm SĐH, tên khách hàng, số VIN..."
        totalCount={processedData.length}
        onRefresh={refetch}
        isLoading={isLoading}
      />
      <div className="mt-4 flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
        <div className="flex-grow overflow-auto relative">
          <HistoryTable
            orders={paginatedData} onViewDetails={onViewDetails} onCancel={onCancel}
            onRequestInvoice={onRequestInvoice} onSupplement={onSupplement}
            onRequestVC={onRequestVC} onConfirmVC={onConfirmVC}
            sortConfig={sortConfig} onSort={handleSort}
            startIndex={(currentPage - 1) * PAGE_SIZE}
          />
        </div>
        {totalPages > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
      </div>
    </>
  );
  
  useEffect(() => {
    if (activeTab !== 'Total' || !yearlyStats || !monthlyChartRef.current || !carChartRef.current) return;
    
    // Destroy previous charts
    Object.values(chartInstances.current).forEach(chart => chart.destroy());
    chartInstances.current = {};

    const monthlyCtx = monthlyChartRef.current.getContext('2d');
    if (monthlyCtx) {
        chartInstances.current.monthly = new Chart(monthlyCtx, {
            type: 'bar',
            data: {
                labels: yearlyStats.monthlySales.map(d => d.month),
                datasets: [{ label: 'Xe bán', data: yearlyStats.monthlySales.map(d => d.count), backgroundColor: '#0D47A1', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    const carCtx = carChartRef.current.getContext('2d');
    if (carCtx) {
        const top5Cars = yearlyStats.carDistribution.slice(0, 5);
        const otherCount = yearlyStats.carDistribution.slice(5).reduce((acc, curr) => acc + curr.count, 0);
        const chartData = [...top5Cars];
        if (otherCount > 0) chartData.push({ key: 'Khác', count: otherCount });

        chartInstances.current.car = new Chart(carCtx, {
            type: 'pie',
            data: {
                labels: chartData.map(d => d.key),
                datasets: [{ data: chartData.map(d => d.count), backgroundColor: ['#0D47A1', '#1565C0', '#42A5F5', '#90CAF9', '#BBDEFB', '#E3F2FD'], borderWidth: 2, borderColor: '#fff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
        });
    }
     return () => {
      Object.values(chartInstances.current).forEach(chart => chart.destroy());
    };
  }, [activeTab, yearlyStats]);

  const renderTotalView = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SummaryCard icon="fa-car" title="Tổng Số Xe (Năm)" value={yearlyStats.total} />
            <SummaryCard icon="fa-star" title="Dòng Xe Bán Chạy (Năm)" value={yearlyStats.topCar} />
            <SummaryCard icon="fa-user-tie" title="TVBH Xuất Sắc (Năm)" value={yearlyStats.topTvbh} />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-surface-card p-4 rounded-lg border border-border-primary">
                <h3 className="font-bold text-text-primary mb-4">Doanh Số Theo Tháng</h3>
                <div className="h-72"><canvas ref={monthlyChartRef}></canvas></div>
            </div>
            <div className="bg-surface-card p-4 rounded-lg border border-border-primary">
                <h3 className="font-bold text-text-primary mb-4">Phân Bố Dòng Xe</h3>
                <div className="h-72"><canvas ref={carChartRef}></canvas></div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-card p-4 rounded-lg border border-border-primary">
                 <h3 className="font-bold text-text-primary mb-4">Top 5 Dòng Xe Bán Chạy</h3>
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-secondary uppercase bg-surface-ground"><tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Dòng Xe</th><th className="px-4 py-2">Số Lượng</th></tr></thead>
                    <tbody>{yearlyStats.top5Cars.map((item, i) => (<tr key={item.key} className="border-b border-border-primary">
                        <td className="px-4 py-2 font-medium">{i+1}</td><td className="px-4 py-2 font-semibold text-text-primary">{item.key}</td><td className="px-4 py-2">{item.count}</td></tr>))}</tbody>
                 </table>
            </div>
             <div className="bg-surface-card p-4 rounded-lg border border-border-primary">
                 <h3 className="font-bold text-text-primary mb-4">Top 5 TVBH Xuất Sắc</h3>
                 <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-secondary uppercase bg-surface-ground"><tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Tên TVBH</th><th className="px-4 py-2">Số Lượng</th></tr></thead>
                    <tbody>{yearlyStats.top5Tvbh.map((item, i) => (<tr key={item.key} className="border-b border-border-primary">
                        <td className="px-4 py-2 font-medium">{i+1}</td><td className="px-4 py-2 font-semibold text-text-primary">{item.key}</td><td className="px-4 py-2">{item.count}</td></tr>))}</tbody>
                 </table>
            </div>
        </div>
    </div>
  );

  const renderContent = () => {
    if (isLoading) {
        return <div className="flex items-center justify-center h-96"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
    }
    if (error) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center p-8 bg-surface-card rounded-lg shadow-xl">
                    <i className="fas fa-exclamation-triangle fa-3x text-danger"></i>
                    <p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p>
                    <p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p>
                    <button onClick={refetch} className="mt-6 btn-primary">Thử lại</button>
                </div>
            </div>
        );
    }
    return activeTab === 'Total' ? renderTotalView() : renderMonthView();
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 h-full animate-fade-in-up">
      <div className="flex-shrink-0 border-b border-border-primary">
        <div className="flex items-center space-x-2 overflow-x-auto pb-px">
          <button onClick={() => setActiveTab('Total')} className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === 'Total' ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:border-border-secondary hover:text-text-primary'}`}>
            <i className="fas fa-chart-pie mr-2"></i>Tổng Hợp
          </button>
          {MONTHS.map((month, index) => (
            <button key={month} onClick={() => setActiveTab(month)} className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${activeTab === month ? 'border-accent-primary text-accent-primary' : 'border-transparent text-text-secondary hover:border-border-secondary hover:text-text-primary'}`}>
              Tháng {index + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-grow flex flex-col">{renderContent()}</div>
    </div>
  );
};

export default SoldCarsView;