import React, { useState, useMemo } from 'react';
import { StockVehicle, StockSortConfig } from '../types';
import StockTable from './StockTable';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import Pagination from './ui/Pagination';
import * as apiService from '../services/apiService';

const PAGE_SIZE = 10;

interface StockViewProps {
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  hideToast: () => void;
  currentUser: string;
  isAdmin: boolean;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
  stockData: StockVehicle[];
  isLoading: boolean;
  error: string | null;
  refetchStock: () => void;
  highlightedVins: Set<string>;
}

const StockView: React.FC<StockViewProps> = ({ 
    showToast, 
    hideToast, 
    currentUser, 
    isAdmin, 
    onCreateRequestForVehicle,
    stockData,
    isLoading,
    error,
    refetchStock,
    highlightedVins
}) => {
    const [filters, setFilters] = useState({
        keyword: '',
        carModel: [] as string[],
        status: [] as string[],
        exterior: [] as string[],
    });
    const [sortConfig, setSortConfig] = useState<StockSortConfig | null>({ key: 'VIN', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [processingVin, setProcessingVin] = useState<string | null>(null);
    
    const handleFilterChange = (newFilters: Partial<typeof filters>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    const handleResetFilters = () => {
        setCurrentPage(1);
        setFilters({
            keyword: '',
            carModel: [],
            status: [],
            exterior: [],
        });
    };

    const handleSort = (key: keyof StockVehicle) => {
        setCurrentPage(1);
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
        setSortConfig({ key, direction });
    };

    const handleHoldCar = async (vin: string) => {
        setProcessingVin(vin);
        showToast('Đang Giữ Xe', `Đang thực hiện giữ xe VIN: ${vin}`, 'loading');

        try {
            await apiService.holdCar(vin);
            hideToast();
            showToast('Giữ Xe Thành Công', `Xe VIN ${vin} đã được giữ thành công.`, 'success', 3000);
            await refetchStock();
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể giữ xe.';
            showToast('Giữ Xe Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const handleReleaseCar = async (vin: string) => {
        setProcessingVin(vin);
        showToast('Đang Hủy Giữ', `Đang hủy giữ xe VIN: ${vin}`, 'loading');

        try {
            await apiService.releaseCar(vin);
            hideToast();
            showToast('Hủy Giữ Thành Công', `Đã hủy giữ xe VIN ${vin}.`, 'info', 3000);
            await refetchStock();
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể hủy giữ xe.';
            showToast('Hủy Giữ Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const processedData = useMemo(() => {
        let filteredVehicles = [...stockData];
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            filteredVehicles = filteredVehicles.filter(vehicle =>
                vehicle.VIN?.toLowerCase().includes(keyword) ||
                vehicle["Dòng xe"]?.toLowerCase().includes(keyword) ||
                vehicle["Phiên bản"]?.toLowerCase().includes(keyword) ||
                vehicle["Ngoại thất"]?.toLowerCase().includes(keyword) ||
                vehicle["Nội thất"]?.toLowerCase().includes(keyword) ||
                vehicle["Vị trí"]?.toLowerCase().includes(keyword) ||
                vehicle["Người Giữ Xe"]?.toLowerCase().includes(keyword)
            );
        }
        if (filters.carModel.length > 0) {
            filteredVehicles = filteredVehicles.filter(vehicle => filters.carModel.includes(vehicle["Dòng xe"]));
        }
        if (filters.status.length > 0) {
            filteredVehicles = filteredVehicles.filter(vehicle => filters.status.includes(vehicle["Trạng thái"]));
        }
        if (filters.exterior.length > 0) {
            filteredVehicles = filteredVehicles.filter(vehicle => filters.exterior.includes(vehicle["Ngoại thất"]));
        }
        if (sortConfig !== null) {
            filteredVehicles.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === null || aValue === undefined || aValue === '') return 1;
                if (bValue === null || bValue === undefined || bValue === '') return -1;

                if (aValue < bValue) { return sortConfig.direction === 'asc' ? -1 : 1; }
                if (aValue > bValue) { return sortConfig.direction === 'asc' ? 1 : -1; }
                return 0;
            });
        }
        return filteredVehicles;
    }, [stockData, filters, sortConfig]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return processedData.slice(startIndex, startIndex + PAGE_SIZE);
    }, [processedData, currentPage]);
    
    const totalPages = Math.ceil(processedData.length / PAGE_SIZE);
    const uniqueCarModels = useMemo(() => [...new Set(stockData.map(v => v["Dòng xe"]))].sort(), [stockData]);
    const uniqueStatuses = useMemo(() => [...new Set(stockData.map(v => v["Trạng thái"]))].sort(), [stockData]);
    const uniqueExteriors = useMemo(() => [...new Set(stockData.map(v => v["Ngoại thất"]))].sort(), [stockData]);

    const dropdownConfigs: DropdownFilterConfig[] = [
        { id: 'stock-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
        { id: 'stock-filter-status', key: 'status', label: 'Trạng Thái', options: uniqueStatuses, icon: 'fa-tag' },
        { id: 'stock-filter-exterior', key: 'exterior', label: 'Ngoại Thất', options: uniqueExteriors, icon: 'fa-palette' },
    ].filter(d => d.options.length > 0);

    const renderContent = () => {
        const animationClass = 'animate-fade-in-up';
        if (isLoading && stockData.length === 0) {
             const skeletons = Array.from({ length: 7 }, (_, i) => (
                <tr key={i}>
                    <td colSpan={8} className="py-1 px-4 sm:px-6">
                         <div className="flex items-center space-x-4 p-4 w-full">
                            <div className="skeleton-item h-6 w-6 !rounded-full"></div>
                            <div className="skeleton-item h-4 w-40"></div>
                            <div className="skeleton-item h-4 w-24"></div>
                            <div className="skeleton-item h-4 flex-1"></div>
                            <div className="skeleton-item h-4 flex-1 hidden md:block"></div>
                            <div className="skeleton-item h-4 w-20 hidden md:block"></div>
                            <div className="skeleton-item h-8 w-24 !rounded-full"></div>
                            <div className="skeleton-item h-8 w-24 !rounded-md"></div>
                        </div>
                    </td>
                </tr>
            ));
            return ( 
                 <div className={`flex flex-col gap-4 sm:gap-6 h-full ${animationClass}`}>
                    <Filters 
                        filters={filters} 
                        onFilterChange={handleFilterChange} 
                        onReset={handleResetFilters} 
                        dropdowns={dropdownConfigs}
                        searchPlaceholder="Tìm VIN, dòng xe, phiên bản, màu sắc..."
                        totalCount={0}
                        onRefresh={refetchStock}
                        isLoading={isLoading}
                        size="compact"
                    />
                     <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                        <div className="flex-grow overflow-auto">
                            <table className="min-w-full">
                                <tbody className="divide-y divide-border-primary">{skeletons}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }
        if (error) {
            return ( <div className={`flex items-center justify-center h-96 ${animationClass}`}><div className="text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu kho</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={refetchStock} className="mt-6 btn-primary">Thử lại</button></div></div>);
        }
        return ( 
            <div className={`flex flex-col gap-4 sm:gap-6 h-full ${animationClass}`}>
                <Filters 
                    filters={filters} 
                    onFilterChange={handleFilterChange} 
                    onReset={handleResetFilters} 
                    dropdowns={dropdownConfigs}
                    searchPlaceholder="Tìm VIN, dòng xe, phiên bản, màu sắc..."
                    totalCount={processedData.length}
                    onRefresh={refetchStock}
                    isLoading={isLoading}
                    size="compact"
                />
                <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                    <div className="flex-grow overflow-auto relative">
                         <StockTable 
                            vehicles={paginatedData} 
                            sortConfig={sortConfig} 
                            onSort={handleSort} 
                            startIndex={(currentPage - 1) * PAGE_SIZE} 
                            onHoldCar={handleHoldCar}
                            onReleaseCar={handleReleaseCar}
                            onCreateRequestForVehicle={onCreateRequestForVehicle}
                            currentUser={currentUser}
                            isAdmin={isAdmin}
                            showToast={showToast}
                            highlightedVins={highlightedVins}
                            processingVin={processingVin}
                         />
                    </div>
                    {totalPages > 0 && 
                        <Pagination 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPageChange={setCurrentPage} 
                            onLoadMore={() => {}} // No archive loading for stock
                            isLoadingArchives={false}
                            isLastArchive={true} // No archive loading for stock
                        />}
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}
        </>
    );
}

export default StockView;