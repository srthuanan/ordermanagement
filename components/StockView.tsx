import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { StockVehicle, StockSortConfig, Order, AdminSubView } from '../types';
import StockTable from './StockTable';
import Button from './ui/Button';
import StockGridView from './StockGridView';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import Pagination from './ui/Pagination';
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
    isSidebarCollapsed,
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
    const [currentPage, setCurrentPage] = useState(1);
    const [view, setView] = useState<'table' | 'grid'>('grid');

    // Dynamic Page Size Calculation
    const [pageSize, setPageSize] = useState(isSidebarCollapsed ? 16 : 14);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const calculatePageSize = useCallback(() => {
        if (!containerRef.current) return;

        if (view === 'grid') {
            // Find the grid container (the one with overflow-y-auto)
            const gridContainer = containerRef.current.querySelector('.flex-grow.overflow-y-auto');
            const gridElement = gridContainer?.querySelector('.grid');

            if (!gridContainer || !gridElement) {
                // Fallback if elements not found
                const minCardWidth = 190;
                const gap = 8;
                const containerWidth = containerRef.current.clientWidth;
                const containerHeight = containerRef.current.clientHeight;
                const availableWidth = containerWidth - 8;
                const availableHeight = containerHeight - 60;
                const columns = Math.floor((availableWidth + gap) / (minCardWidth + gap));
                const rows = Math.max(2, Math.floor(availableHeight / 230));
                setPageSize(rows * Math.max(1, columns));
                return;
            }

            const containerHeight = containerRef.current.clientHeight;
            const containerWidth = containerRef.current.clientWidth;

            const minCardWidth = 190;
            const gap = 8;
            let cardHeight = 230;


            // Measure actual columns and card height if grid exists
            let columns = Math.floor((containerWidth - 8 + gap) / (minCardWidth + gap));

            if (gridElement) {
                // Get actual columns from CSS Grid
                const gridStyle = window.getComputedStyle(gridElement);
                const gridCols = gridStyle.gridTemplateColumns;
                if (gridCols && gridCols !== 'none') {
                    columns = gridCols.split(' ').length;
                }

                // Get actual card height from first card
                const firstCard = gridElement.querySelector('.relative.flex.flex-col');
                if (firstCard) {
                    cardHeight = firstCard.getBoundingClientRect().height;
                }
            }

            // Calculate rows to fill available height (reduced offset for more rows)
            const availableHeight = containerHeight - 50;
            // Use ceiling to be more aggressive in filling space
            const rows = availableHeight >= cardHeight
                ? Math.ceil((availableHeight - cardHeight / 2) / (cardHeight + gap))
                : 0;

            // Ensure at least some items are shown
            const optimalRows = Math.max(2, rows); // At least 2 rows
            const optimalColumns = Math.max(1, columns);

            console.log('Grid calculation:', {
                gridElement: !!gridElement,
                columns,
                cardHeight,
                availableHeight,
                rows,
                optimalRows,
                pageSize: optimalRows * optimalColumns
            });

            setPageSize(optimalRows * optimalColumns);
        } else {
            // Table View Calculation
            const containerHeight = containerRef.current.clientHeight;
            const rowHeight = 50; // Approximate height of a table row
            const headerRowHeight = 50; // Table header

            const availableHeightForRows = containerHeight - headerRowHeight - 60; // Account for pagination
            const rows = Math.floor(availableHeightForRows / rowHeight);

            setPageSize(Math.max(5, rows));
        }
    }, [view]);


    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            calculatePageSize();
        });

        observer.observe(container);
        calculatePageSize(); // Initial calculation

        return () => observer.disconnect();
    }, [calculatePageSize]);






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
        });
    }, []);

    const handleSort = (key: keyof StockVehicle) => {
        setCurrentPage(1);
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
                    // Fallback to showing stock details if order not found
                    // setStockVehicleToView(vehicle);
                }
            } else if (status === 'Đang giữ') {
                // Navigate to the "Pending" tab in Admin view
                showAdminTab('pending');
            }
        } else {
            // Default behavior for "Chưa ghép" or non-admins
            // setStockVehicleToView(vehicle); // Modal removed
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



    const totalPages = Math.ceil(processedData.length / pageSize);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * pageSize;
        return processedData.slice(startIndex, startIndex + pageSize);
    }, [processedData, currentPage, pageSize]);

    // Recalculate page size when data changes (after render)
    useEffect(() => {
        const timer = setTimeout(() => {
            calculatePageSize();
        }, 200); // Increased delay to ensure DOM is fully rendered
        return () => clearTimeout(timer);
    }, [paginatedData.length, calculatePageSize]);

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
            startIndex: (currentPage - 1) * pageSize,
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
                        viewSwitcherEnabled={true}
                        activeView={view}
                        onViewChange={setView}
                        searchable={false}
                    />
                </div>
                <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
                    {view === 'table' ? (
                        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full">
                            <div className="flex-grow overflow-auto relative hidden-scrollbar">
                                <StockTable vehicles={paginatedData} {...commonProps} />
                            </div>
                            {totalPages > 0 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => { }} isLoadingArchives={false} isLastArchive={true} />}
                        </div>
                    ) : (
                        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col h-full">
                            <div className="flex-grow overflow-y-auto relative hidden-scrollbar p-1">
                                <StockGridView vehicles={paginatedData} {...commonProps} />
                            </div>
                            {totalPages > 0 && (
                                <div className="relative z-20">
                                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={() => { }} isLoadingArchives={false} isLastArchive={true} />
                                </div>
                            )}
                        </div>
                    )}
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