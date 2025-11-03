import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StockVehicle, StockSortConfig } from './types';
import StockTable from './components/StockTable';
import StockGridView from './components/StockGridView';
import Filters, { DropdownFilterConfig } from './components/ui/Filters';
import Pagination from './components/ui/Pagination';
import StockVehicleDetailModal from './components/ui/StockVehicleDetailModal';
import * as apiService from './services/apiService';

const PAGE_SIZE = 10;

interface StockViewProps {
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  hideToast: () => void;
  currentUser: string;
  isAdmin: boolean;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
  stockData: StockVehicle[];
  setStockData: React.Dispatch<React.SetStateAction<StockVehicle[]>>;
  isLoading: boolean;
  error: string | null;
  refetchStock: (isSilent?: boolean) => void;
  highlightedVins: Set<string>;
}

const StockView: React.FC<StockViewProps> = ({ 
    showToast, 
    hideToast, 
    currentUser, 
    isAdmin, 
    onCreateRequestForVehicle,
    stockData,
    setStockData,
    isLoading,
    error,
    refetchStock,
    highlightedVins
}) => {
    const [filters, setFilters] = useState({
        keyword: '',
        carModel: [] as string[],
        version: [] as string[],
        status: [] as string[],
        exterior: [] as string[],
        interior: [] as string[],
    });
    const [sortConfig, setSortConfig] = useState<StockSortConfig | null>({ key: 'VIN', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [processingAction, setProcessingAction] = useState<{ vin: string; initialStatus: string } | null>(null);
    const [view, setView] = useState<'table' | 'grid'>('grid');
    const [stockVehicleToView, setStockVehicleToView] = useState<StockVehicle | null>(null);
    
    useEffect(() => {
        if (!processingAction) return;
    
        const currentVehicle = stockData.find(v => v.VIN === processingAction.vin);
        // Check if the status has changed
        if (currentVehicle && currentVehicle['Trạng thái'] !== processingAction.initialStatus) {
            setProcessingAction(null);
        }
    
        // Add a timeout as a safeguard to prevent spinner from getting stuck
        const timer = setTimeout(() => {
            if (processingAction) {
                console.warn(`Spinner for VIN ${processingAction.vin} timed out after 15 seconds.`);
                setProcessingAction(null);
            }
        }, 15000); // 15s timeout
    
        return () => clearTimeout(timer);
    }, [stockData, processingAction]);

    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setCurrentPage(1);
        setFilters({
            keyword: '',
            carModel: [],
            version: [],
            status: [],
            exterior: [],
            interior: [],
        });
    }, []);

    const handleSort = (key: keyof StockVehicle) => {
        setCurrentPage(1);
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
        setSortConfig({ key, direction });
    };

    const handleShowDetails = (vehicle: StockVehicle) => {
        setStockVehicleToView(vehicle);
    };

    const handleHoldCar = async (vin: string) => {
        const vehicle = stockData.find(v => v.VIN === vin);
        if (!vehicle) return;

        setProcessingAction({ vin, initialStatus: vehicle['Trạng thái'] });
        showToast('Đang xử lý...', `Đang giữ xe VIN ${vin}.`, 'loading');
        try {
            const result = await apiService.holdCar(vin);
            hideToast();
            showToast('Giữ Xe Thành Công', result.message, 'success', 3000);
            
            if (result.updatedVehicle) {
                setStockData(currentData =>
                    currentData.map(vehicle =>
                        vehicle.VIN === vin ? result.updatedVehicle : vehicle
                    )
                );
            } else {
                refetchStock(true); // Fallback
            }
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể giữ xe.';
            showToast('Giữ Xe Thất Bại', message, 'error', 5000);
            setProcessingAction(null);
        }
    };

    const handleReleaseCar = async (vin: string) => {
        const vehicle = stockData.find(v => v.VIN === vin);
        if (!vehicle) return;

        setProcessingAction({ vin, initialStatus: vehicle['Trạng thái'] });
        showToast('Đang xử lý...', `Đang hủy giữ xe VIN ${vin}.`, 'loading');
        try {
            const result = await apiService.releaseCar(vin);
            hideToast();
            showToast('Hủy Giữ Thành Công', result.message, 'info', 3000);
    
            if (result.updatedVehicle) {
                setStockData(currentData =>
                    currentData.map(vehicle =>
                        vehicle.VIN === vin ? result.updatedVehicle : vehicle
                    )
                );
            } else {
                refetchStock(true); // Fallback
            }
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể hủy giữ xe.';
            showToast('Hủy Giữ Thất Bại', message, 'error', 5000);
            setProcessingAction(null);
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
         if (filters.version.length > 0) {
            filteredVehicles = filteredVehicles.filter(vehicle => filters.version.includes(vehicle["Phiên bản"]));
        }
        if (filters.status.length > 0) {
            filteredVehicles = filteredVehicles.filter(vehicle => filters.status.includes(vehicle["Trạng thái"]));
        }
        if (filters.exterior.length > 0) {
            filteredVehicles = filteredVehicles.filter(vehicle => filters.exterior.includes(vehicle["Ngoại thất"]));
        }
         if (filters.interior.length > 0) {
            filteredVehicles = filteredVehicles.filter(vehicle => filters.interior.includes(vehicle["Nội thất"]));
        }
        
        // Sort: "Đang giữ" on top, then by user-selected column
        filteredVehicles.sort((a, b) => {
            const aIsHeld = a['Trạng thái'] === 'Đang giữ';
            const bIsHeld = b['Trạng thái'] === 'Đang giữ';
    
            if (aIsHeld && !bIsHeld) return -1;
            if (!aIsHeld && bIsHeld) return 1;
    
            if (sortConfig) {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue === null || aValue === undefined || aValue === '') return 1;
                if (bValue === null || bValue === undefined || bValue === '') return -1;
    
                if (aValue < bValue) { return sortConfig.direction === 'asc' ? -1 : 1; }
                if (aValue > bValue) { return sortConfig.direction === 'asc' ? 1 : -1; }
            }
            
            return 0; // if no sortConfig or values are equal
        });

        return filteredVehicles;
    }, [stockData, filters, sortConfig]);

    const handleVehicleNavigation = (direction: 'prev' | 'next') => {
        if (!stockVehicleToView) return;
    
        const currentIndex = processedData.findIndex(v => v.VIN === stockVehicleToView.VIN);
        if (currentIndex === -1) return;
    
        let nextIndex;
        if (direction === 'prev') {
            nextIndex = currentIndex - 1;
        } else {
            nextIndex = currentIndex + 1;
        }
    
        if (nextIndex >= 0 && nextIndex < processedData.length) {
            setStockVehicleToView(processedData[nextIndex]);
        }
    };

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return processedData.slice(startIndex, startIndex + PAGE_SIZE);
    }, [processedData, currentPage]);
    
    const totalPages = Math.ceil(processedData.length / PAGE_SIZE);
    const uniqueCarModels = useMemo(() => [...new Set(stockData.map(v => v["Dòng xe"]))].sort(), [stockData]);
    const uniqueVersions = useMemo(() => [...new Set(stockData.map(v => v["Phiên bản"]))].sort(), [stockData]);
    const uniqueStatuses = useMemo(() => [...new Set(stockData.map(v => v["Trạng thái"]))].sort(), [stockData]);
    const uniqueExteriors = useMemo(() => [...new Set(stockData.map(v => v["Ngoại thất"]))].sort(), [stockData]);
    const uniqueInteriors = useMemo(() => [...new Set(stockData.map(v => v["Nội thất"]))].sort(), [stockData]);

    const dropdownConfigs: DropdownFilterConfig[] = [
        { id: 'stock-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
        { id: 'stock-filter-version', key: 'version', label: 'Phiên Bản', options: uniqueVersions, icon: 'fa-cogs' },
        { id: 'stock-filter-status', key: 'status', label: 'Trạng Thái', options: uniqueStatuses, icon: 'fa-tag' },
        { id: 'stock-filter-exterior', key: 'exterior', label: 'Ngoại Thất', options: uniqueExteriors, icon: 'fa-palette' },
        { id: 'stock-filter-interior', key: 'interior', label: 'Nội Thất', options: uniqueInteriors, icon: 'fa-chair' },
    ].filter(d => d.options.length > 0);

    const renderContent = () => {
        const animationClass = 'animate-fade-in-up';
        if (isLoading && stockData.length === 0) {
            return ( 
                 <div className={`flex flex-col gap-4 sm:gap-6 h-full ${animationClass}`}>
                    <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-4">
                        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
                            <div className="w-full lg:flex-grow">
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="skeleton-item h-8 rounded-lg" style={{flexBasis: '280px', flexGrow: 1}}></div>
                                    <div className="skeleton-item h-8 w-24 rounded-lg"></div>
                                    <div className="skeleton-item h-8 w-24 rounded-lg"></div>
                                    <div className="skeleton-item h-8 w-24 rounded-lg"></div>
                                    <div className="skeleton-item h-8 w-8 !rounded-lg ml-auto"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                        <div className="flex-grow overflow-auto">
                           <div className="p-4 space-y-2">
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div key={i} className="skeleton-item h-12 w-full"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        if (error) {
            return ( <div className={`flex items-center justify-center h-96 ${animationClass}`}><div className="text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu kho</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={() => refetchStock()} className="mt-6 btn-primary">Thử lại</button></div></div>);
        }
        
        const commonProps = {
            sortConfig,
            onSort: handleSort,
            startIndex: (currentPage - 1) * PAGE_SIZE,
            onHoldCar: handleHoldCar,
            onReleaseCar: handleReleaseCar,
            onCreateRequestForVehicle,
            onShowDetails: handleShowDetails,
            currentUser,
            isAdmin,
            showToast,
            highlightedVins,
            processingVin: processingAction?.vin || null
        };
        
        return ( 
            <div className={`flex flex-col gap-4 sm:gap-6 h-full ${animationClass}`}>
                <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-4">
                    <div className="flex flex-col xl:flex-row gap-4 xl:items-start">
                        <div className="w-full xl:flex-grow">
                            <Filters 
                                filters={filters} 
                                onFilterChange={handleFilterChange} 
                                onReset={handleResetFilters} 
                                dropdowns={dropdownConfigs}
                                searchPlaceholder="Tìm VIN, dòng xe, phiên bản, màu sắc..."
                                totalCount={processedData.length}
                                onRefresh={() => refetchStock()}
                                isLoading={isLoading}
                                plain={true}
                                size="compact"
                                viewSwitcherEnabled={true}
                                activeView={view}
                                onViewChange={setView}
                            />
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    {view === 'table' ? (
                        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full">
                            <div className="flex-grow overflow-auto relative">
                                <StockTable vehicles={paginatedData} {...commonProps} />
                            </div>
                            {totalPages > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                        </div>
                    ) : (
                        <>
                            <StockGridView vehicles={paginatedData} {...commonProps} />
                            {totalPages > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                        </>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            <StockVehicleDetailModal
                isOpen={!!stockVehicleToView}
                onClose={() => setStockVehicleToView(null)}
                vehicle={stockVehicleToView}
                onHoldCar={handleHoldCar}
                onReleaseCar={handleReleaseCar}
                onCreateRequestForVehicle={onCreateRequestForVehicle}
                currentUser={currentUser}
                isAdmin={isAdmin}
                processingVin={processingAction?.vin || null}
                vehicleList={processedData}
                onNavigate={handleVehicleNavigation}
            />
        </>
    );
}

export default React.memo(StockView);