import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StockVehicle, StockSortConfig, Order, AdminSubView } from '../types';
import Button from './ui/Button';
import StockGridView from './StockGridView';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import { includesNormalized } from '../utils/stringUtils';


interface StockViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    currentUser: string;
    isAdmin: boolean;
    onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
    stockData: StockVehicle[];
    isLoading: boolean;
    error: string | null;
    refetchStock: (isSilent?: boolean) => void;
    highlightedVins: Set<string>;
    onHoldCar: (vin: string) => void;
    onReleaseCar: (vin: string) => void;
    processingVin: string | null;
    isSidebarCollapsed: boolean;
    allOrders: Order[];
    showOrderInAdmin: (order: Order, targetTab: AdminSubView) => void;
    showAdminTab: (targetTab: AdminSubView) => void;
}

const StockView: React.FC<StockViewProps> = ({
    showToast,
    currentUser,
    isAdmin,
    onCreateRequestForVehicle,
    stockData,
    isLoading,
    error,
    refetchStock,
    highlightedVins,
    onHoldCar,
    onReleaseCar,
    processingVin,
    allOrders,
    showOrderInAdmin,
    showAdminTab
}) => {
    const [filters, setFilters] = useState({
        keyword: '',
        carModel: [] as string[],
        version: [] as string[],
        status: [] as string[],
        exterior: [] as string[],
    });
    const [sortConfig, setSortConfig] = useState<StockSortConfig | null>({ key: 'VIN', direction: 'asc' });

    // Infinite Scroll State
    const [visibleCount, setVisibleCount] = useState(20); // Initial count
    const [batchSize, setBatchSize] = useState(20); // Items to add on scroll
    const containerRef = useRef<HTMLDivElement>(null);
    const loadMoreRef = useRef<HTMLDivElement>(null);


    // Dynamic Batch Size Calculation
    const calculateBatchSize = useCallback(() => {
        if (!containerRef.current) return;

        // Find the grid container (the one with overflow-y-auto)
        const gridContainer = containerRef.current.querySelector('.flex-grow.overflow-y-auto');
        const gridElement = gridContainer?.querySelector('.grid');

        if (!gridContainer || !gridElement) {
            // Fallback
            setBatchSize(20);
            return;
        }

        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;

        if (containerHeight === 0 || containerWidth === 0) {
            setBatchSize(20);
            return;
        }

        const minCardWidth = 190;
        const gap = 8;
        let cardHeight = 230;

        // Measure actual columns and card height if grid exists
        let columns = Math.floor((containerWidth - 8 + gap) / (minCardWidth + gap));

        if (gridElement) {
            const gridStyle = window.getComputedStyle(gridElement);
            const gridCols = gridStyle.gridTemplateColumns;
            if (gridCols && gridCols !== 'none') {
                columns = gridCols.split(' ').length;
            }
            const firstCard = gridElement.querySelector('.relative.flex.flex-col');
            if (firstCard) {
                const measuredHeight = firstCard.getBoundingClientRect().height;
                if (measuredHeight > 0) {
                    cardHeight = measuredHeight;
                }
            }
        }

        const availableHeight = containerHeight - 50;
        const rows = availableHeight >= cardHeight
            ? Math.ceil((availableHeight - cardHeight / 2) / (cardHeight + gap))
            : 0;

        const optimalRows = Math.max(2, rows);
        const optimalColumns = Math.max(1, columns);

        // Load roughly 2 screens worth of data at a time
        const newBatchSize = Math.max(12, optimalRows * optimalColumns * 2);
        setBatchSize(newBatchSize);

        // If visible count is very low (e.g. initial load), set it to at least one batch
        setVisibleCount(prev => Math.max(prev, newBatchSize));

    }, []);


    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            calculateBatchSize();
        });

        observer.observe(container);
        calculateBatchSize(); // Initial calculation

        return () => observer.disconnect();
    }, [calculateBatchSize]);


    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setVisibleCount(batchSize); // Reset to first batch
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, [batchSize]);

    const handleResetFilters = useCallback(() => {
        setVisibleCount(batchSize);
        setFilters({
            keyword: '',
            carModel: [],
            version: [],
            status: [],
            exterior: [],
        });
    }, [batchSize]);

    const handleSort = (key: keyof StockVehicle) => {
        setVisibleCount(batchSize);
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
        setSortConfig({ key, direction });
    };

    const handleShowDetails = (vehicle: StockVehicle) => {
        const status = vehicle['Trạng thái'];

        if (isAdmin && status !== 'Chưa ghép') {
            if (status === 'Đã ghép') {
                const order = allOrders.find(o => o.VIN === vehicle.VIN);
                if (order) {
                    showOrderInAdmin(order, 'paired');
                } else {
                    showToast('Không Tìm Thấy', `Không tìm thấy đơn hàng đã ghép với xe VIN ${vehicle.VIN}.`, 'warning', 4000);
                }
            } else if (status === 'Đang giữ') {
                showAdminTab('pending');
            }
        }
    };

    const processedData = useMemo(() => {
        let filteredVehicles = [...stockData];
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            filteredVehicles = filteredVehicles.filter(vehicle =>
                includesNormalized(vehicle.VIN, keyword) ||
                includesNormalized(vehicle["Dòng xe"], keyword) ||
                includesNormalized(vehicle["Phiên bản"], keyword) ||
                includesNormalized(vehicle["Ngoại thất"], keyword) ||
                includesNormalized(vehicle["Nội thất"], keyword) ||
                includesNormalized(vehicle["Vị trí"], keyword) ||
                includesNormalized(vehicle["Người Giữ Xe"], keyword)
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


    const visibleData = useMemo(() => {
        return processedData.slice(0, visibleCount);
    }, [processedData, visibleCount]);

    // Intersection Observer for Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    if (visibleCount < processedData.length) {
                        setVisibleCount((prev) => Math.min(prev + batchSize, processedData.length));
                    }
                }
            },
            { threshold: 0.1, rootMargin: '100px' } // Load more before reaching the very bottom
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => {
            if (loadMoreRef.current) {
                observer.unobserve(loadMoreRef.current);
            }
        };
    }, [visibleCount, processedData.length, batchSize]);


    // Recalculate batch size when data changes (after render)
    useEffect(() => {
        const timer = setTimeout(() => {
            calculateBatchSize();
        }, 200);
        return () => clearTimeout(timer);
    }, [visibleData.length, calculateBatchSize]);

    const uniqueCarModels = useMemo(() => [...new Set(stockData.map(v => v["Dòng xe"]).filter(v => v))].sort(), [stockData]);
    const uniqueVersions = useMemo(() => [...new Set(stockData.map(v => v["Phiên bản"]).filter(v => v))].sort(), [stockData]);
    const uniqueStatuses = useMemo(() => [...new Set(stockData.map(v => v["Trạng thái"]).filter(v => v))].sort(), [stockData]);
    const uniqueExteriors = useMemo(() => [...new Set(stockData.map(v => v["Ngoại thất"]).filter(v => v))].sort(), [stockData]);


    const dropdownConfigs: DropdownFilterConfig[] = [
        { id: 'stock-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
        { id: 'stock-filter-version', key: 'version', label: 'Phiên Bản', options: uniqueVersions, icon: 'fa-cogs' },
        { id: 'stock-filter-status', key: 'status', label: 'Trạng Thái', options: uniqueStatuses, icon: 'fa-tag' },
        { id: 'stock-filter-exterior', key: 'exterior', label: 'Ngoại Thất', options: uniqueExteriors, icon: 'fa-palette' },
    ].filter(d => d.options.length > 0);

    const renderContent = () => {
        const animationClass = 'animate-fade-in-up';
        if (isLoading && stockData.length === 0) {
            return (
                <div className={`flex flex-col h-full ${animationClass}`}>
                    <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="skeleton-item h-12 rounded-full" style={{ flexBasis: '320px', flexGrow: 1 }}></div>
                            <div className="skeleton-item h-12 w-32 rounded-full"></div>
                            <div className="skeleton-item h-12 w-32 rounded-full"></div>
                            <div className="skeleton-item h-12 w-12 !rounded-full ml-auto"></div>
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
            return (<div className={`flex items-center justify-center h-96 ${animationClass}`}><div className="text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu kho</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><Button onClick={() => refetchStock()} variant="primary" className="mt-6">Thử lại</Button></div></div>);
        }

        const commonProps = {
            sortConfig,
            onSort: handleSort,
            startIndex: 0, // Infinite scroll always starts from 0
            onHoldCar: onHoldCar,
            onReleaseCar: onReleaseCar,
            onCreateRequestForVehicle,
            onShowDetails: handleShowDetails,
            currentUser,
            isAdmin,
            showToast,
            highlightedVins,
            processingVin: processingVin
        };

        return (
            <div className={`flex flex-col h-full ${animationClass}`}>
                <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-2 relative z-20">
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
                        viewSwitcherEnabled={false}
                        activeView={'grid'}
                        onViewChange={() => { }}
                        searchable={false}
                    />
                </div>
                <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
                    <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full">
                        <div className="flex-grow overflow-y-auto relative hidden-scrollbar p-1">
                            <StockGridView vehicles={visibleData} {...commonProps} />

                            {/* Load More Trigger */}
                            {visibleCount < processedData.length && (
                                <div ref={loadMoreRef} className="h-10 w-full flex items-center justify-center py-4">
                                    <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                                </div>
                            )}
                        </div>
                    </div>
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

export default React.memo(StockView);