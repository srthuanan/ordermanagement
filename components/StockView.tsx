import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { StockVehicle, StockSortConfig, Order, AdminSubView } from '../types';
import Button from './ui/Button';
import StockGridView from './StockGridView';
import { DropdownFilterConfig } from './ui/Filters';
import TabbedFilter from './ui/TabbedFilter';
import MultiSelectDropdown from './ui/MultiSelectDropdown';
import { includesNormalized } from '../utils/stringUtils';
import AnimatedBackground from './ui/AnimatedBackground';


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
    onJoinQueue: (vin: string) => void;
    onLeaveQueue: (vin: string) => void;
    onOpenExtensionModal: (vehicle: StockVehicle) => void;
    processingVin: string | null;
    isSidebarCollapsed: boolean;
    allOrders: Order[];
    showOrderInAdmin?: (order: Order, targetTab: AdminSubView) => void;
    showAdminTab?: (targetTab: AdminSubView) => void;
    forcedSearch?: string;
    queuedVins: string[];
    canHoldMore: boolean;
    onNavigateToInquiry: () => void;
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
    onJoinQueue,
    onLeaveQueue,
    onOpenExtensionModal,
    processingVin,
    allOrders,
    showOrderInAdmin,
    showAdminTab,
    forcedSearch,
    queuedVins,
    canHoldMore,
    onNavigateToInquiry
}) => {
    const [filters, setFilters] = useState({
        keyword: '',
        carModel: [] as string[],
        version: [] as string[],
        status: [] as string[],
        exterior: [] as string[],
    });

    // Listen for external search commands (e.g. from notifications)
    useEffect(() => {
        if (forcedSearch) {
            setFilters(prev => ({ ...prev, keyword: forcedSearch }));
            setVisibleCount(20);
            if (containerRef.current) {
                const scrollContainer = containerRef.current.querySelector('.flex-grow.overflow-y-auto');
                if (scrollContainer) scrollContainer.scrollTop = 0;
            }
        }
    }, [forcedSearch]);
    const [sortConfig, setSortConfig] = useState<StockSortConfig | null>({ key: 'Ngày nhập', direction: 'desc' });

    // Stock Welcome Video/Popup Tracker
    const [showStockWelcome, setShowStockWelcome] = useState(false);
    const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const resetIdleTimer = useCallback(() => {
        if (isAdmin || localStorage.getItem('hasSeenStockWelcome_v1')) return;
        if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
        
        idleTimeoutRef.current = setTimeout(() => {
            setShowStockWelcome(true);
        }, 15000); // 15 seconds of inactivity
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin || localStorage.getItem('hasSeenStockWelcome_v1') || showStockWelcome) return;

        resetIdleTimer(); // Start timer on mount
        
        let throttleTimer = false;
        const handleActivity = () => {
            if (!throttleTimer) {
                resetIdleTimer();
                throttleTimer = true;
                setTimeout(() => { throttleTimer = false; }, 1000);
            }
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('touchstart', handleActivity);
        window.addEventListener('scroll', handleActivity, true);

        return () => {
            if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('scroll', handleActivity, true);
        };
    }, [isAdmin, showStockWelcome, resetIdleTimer]);

    const handleAcknowledgeAndNavigate = () => {
        localStorage.setItem('hasSeenStockWelcome_v1', 'true');
        setShowStockWelcome(false);
        onNavigateToInquiry();
    };

    const handleAcknowledgeAndClose = () => {
        localStorage.setItem('hasSeenStockWelcome_v1', 'true');
        setShowStockWelcome(false);
    };

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
                    showOrderInAdmin?.(order, 'matching');
                } else {
                    showToast('Không Tìm Thấy', `Không tìm thấy đơn hàng đã ghép với xe VIN ${vehicle.VIN}.`, 'warning', 4000);
                }
            } else if (status === 'Đang giữ') {
                showAdminTab?.('pending');
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


        // Sort: "Đang giữ" on top, then by Model Priority list, then by user-selected column
        filteredVehicles.sort((a, b) => {
            const aIsHeld = a['Trạng thái'] === 'Đang giữ';
            const bIsHeld = b['Trạng thái'] === 'Đang giữ';

            if (aIsHeld && !bIsHeld) return -1;
            if (!aIsHeld && bIsHeld) return 1;

            // Priority 2: Missing Version (User wants to find these to fill them)
            const aNoVersion = !a['Phiên bản'] || a['Phiên bản'].trim() === '';
            const bNoVersion = !b['Phiên bản'] || b['Phiên bản'].trim() === '';
            if (aNoVersion && !bNoVersion) return -1;
            if (!aNoVersion && bNoVersion) return 1;

            // Model Priority Definition
            const getModelPriority = (vehicle: StockVehicle) => {
                const model = (vehicle['Dòng xe'] || '').toUpperCase();
                // Priority Order: Ec van, herio, minio, limo, vf3, vf5, vf6, vf7, vf8, vf9
                if (includesNormalized(model, 'EC VAN')) return 1;
                if (includesNormalized(model, 'HERIO')) return 2;
                if (includesNormalized(model, 'MINIO')) return 3;
                if (includesNormalized(model, 'LIMO')) return 4;
                if (includesNormalized(model, 'VF 3') || model.includes('VF3')) return 5;
                if (includesNormalized(model, 'VF 5') || model.includes('VF5')) return 6;
                if (includesNormalized(model, 'VF 6') || model.includes('VF6')) return 7;
                if (includesNormalized(model, 'VF 7') || model.includes('VF7')) return 8;
                if (includesNormalized(model, 'VF 8') || model.includes('VF8')) return 9;
                if (includesNormalized(model, 'VF 9') || model.includes('VF9')) return 10;
                return 999;
            };

            const aPriority = getModelPriority(a);
            const bPriority = getModelPriority(b);

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

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

        // --- TABS LOGIC ---
        const carModelTabs = uniqueCarModels.map(model => ({
            id: model,
            label: model,
            count: stockData.filter(v => v['Dòng xe'] === model).length
        }));

        const totalCount = stockData.length;
        const tabs = [
            { id: 'all', label: 'Tất cả', count: totalCount },
            ...carModelTabs
        ];

        const activeTab = (filters.carModel && filters.carModel.length === 1) ? filters.carModel[0] : 'all';

        const handeTabChange = (tabId: string) => {
            handleFilterChange({ carModel: tabId === 'all' ? [] : [tabId] });
        };

        // Filter out carModel from dropdowns as it is now in tabs
        const activeDropdowns = dropdownConfigs.filter(d => d.key !== 'carModel');

        const skeletons = Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm h-56 flex flex-col justify-between">
                <div>
                    <div className="skeleton-item h-32 w-full rounded-lg mb-4"></div>
                    <div className="space-y-2">
                        <div className="skeleton-item h-4 w-3/4"></div>
                        <div className="skeleton-item h-3 w-1/2"></div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <div className="skeleton-item h-4 w-1/4"></div>
                    <div className="skeleton-item h-8 w-20 rounded-full"></div>
                </div>
            </div>
        ));

        if (error) {
            return (<div className={`flex items-center justify-center h-96 ${animationClass}`}><div className="text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu kho</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><Button onClick={() => refetchStock()} variant="primary" className="mt-6">Thử lại</Button></div></div>);
        }

        const commonProps = {
            sortConfig,
            onSort: handleSort,
            startIndex: 0, // Infinite scroll always starts from 0
            onHoldCar: onHoldCar,
            onReleaseCar: onReleaseCar,
            onJoinQueue: onJoinQueue,
            onLeaveQueue: onLeaveQueue,
            onOpenExtensionModal: onOpenExtensionModal,
            onCreateRequestForVehicle,
            onShowDetails: handleShowDetails,
            currentUser,
            isAdmin,
            showToast,
            highlightedVins,
            processingVin: processingVin,
            queuedVins: queuedVins,
            canHoldMore: canHoldMore
        };

        return (
            <div className={`flex flex-col h-full`}>
                <div className="flex-shrink-0 relative z-20">
                    <TabbedFilter
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={handeTabChange}
                        searchValue={filters.keyword || ''}
                        onSearchChange={(val) => handleFilterChange({ keyword: val })}
                        onReset={handleResetFilters}
                        canReset={true}
                    >
                        {/* Render Secondary Filters */}
                        {activeDropdowns.map(dropdown => (
                            <div key={dropdown.id} className="min-w-[110px]">
                                <MultiSelectDropdown
                                    id={dropdown.id}
                                    label={dropdown.label}
                                    options={dropdown.options}
                                    selectedOptions={(filters[dropdown.key as keyof typeof filters] || []) as string[]}
                                    onChange={(selected) => handleFilterChange({ [dropdown.key]: selected })}
                                    icon={dropdown.icon}
                                    align="right"
                                    displayMode="selection"
                                    size="compact"
                                    variant="modern"
                                    searchable={true}
                                />
                            </div>
                        ))}
                    </TabbedFilter>
                </div>
                <div ref={containerRef} className="flex-1 flex flex-col min-h-0 -mt-2">
                    <div className="bg-slate-50 relative rounded-xl shadow-md border border-border-primary flex flex-col h-full overflow-hidden">
                        <AnimatedBackground />
                        <div className="flex-grow overflow-y-auto relative hidden-scrollbar p-1 z-10">
                            {isLoading && stockData.length === 0 ? (
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2 p-1">
                                    {skeletons}
                                </div>
                            ) : (
                                <StockGridView vehicles={visibleData} {...commonProps} />
                            )}

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
            {showStockWelcome && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-[100] flex items-start justify-center pt-24 sm:pt-32 p-4 animate-fade-in transition-all duration-500">
                    <div className="bg-white/90 backdrop-blur-2xl rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] max-w-sm w-full overflow-hidden border border-white/60 relative p-5 ring-1 ring-slate-900/5 transform transition-all hover:-translate-y-1 animate-[bounce_3s_infinite]">
                        {/* Decorative Top Gradient Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                        <button 
                            onClick={handleAcknowledgeAndClose}
                            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200/50 text-slate-400 transition-colors z-10"
                        >
                            <i className="fas fa-times text-[10px]"></i>
                        </button>

                        <div className="flex items-start gap-4 mb-4">
                            {/* Small Icon */}
                            <div className="flex-shrink-0 relative w-10 h-10">
                                <div className="absolute inset-0 bg-blue-400 blur-md opacity-30 rounded-full animate-pulse"></div>
                                <div className="relative w-full h-full bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border border-white shadow-inner">
                                    <i className="fas fa-car-side text-blue-600 text-[10px] transform -scale-x-100 absolute bottom-3"></i>
                                    <i className="fas fa-search text-amber-500 text-xs absolute top-2 right-2"></i>
                                </div>
                            </div>
                            
                            <div className="pr-2">
                                <h3 className="text-sm font-black text-slate-800 tracking-tight mb-1">Chưa Tìm Thấy Xe Cần?</h3>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Đừng cố tìm! Hãy để <span className="text-blue-600 font-bold">Admin hệ thống</span> rà soát toàn nguồn xe giúp bạn.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={handleAcknowledgeAndNavigate} 
                                className="flex-1 group relative flex justify-center py-2 px-3 border border-transparent text-xs font-black rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] items-center gap-1.5"
                            >
                                <i className="fas fa-bolt text-amber-300 text-[10px]"></i>
                                Gửi Yêu Cầu Tìm
                            </button>
                            
                            <button 
                                onClick={handleAcknowledgeAndClose} 
                                className="px-4 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-xl transition-colors border border-transparent hover:border-slate-200"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default React.memo(StockView);