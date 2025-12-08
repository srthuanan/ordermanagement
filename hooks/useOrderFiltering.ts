import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Order, SortConfig } from '../types';
import { includesNormalized } from '../utils/stringUtils';

interface UseOrderFilteringProps {
    allHistoryData: Order[];
    isSidebarCollapsed: boolean;
    activeView: string;
    orderView: 'table' | 'grid';
}

export const useOrderFiltering = ({ allHistoryData, isSidebarCollapsed, activeView, orderView }: UseOrderFilteringProps) => {
    const [filters, setFilters] = useState({
        keyword: '',
        carModel: [] as string[],
        version: [] as string[],
        status: [] as string[],
        exterior: [] as string[]
    });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);

    // Infinite Scroll State for Grid View
    const [visibleCount, setVisibleCount] = useState(20);
    const [batchSize, setBatchSize] = useState(20);

    const [pageSize, setPageSize] = useState(() => {
        if (activeView === 'orders' && orderView === 'grid') {
            return isSidebarCollapsed ? 15 : 12;
        }
        return isSidebarCollapsed ? 14 : 12;
    });
    const containerRef = useRef<HTMLDivElement>(null);

    const calculateLayout = useCallback(() => {
        if (!containerRef.current) return;

        if (activeView === 'orders' && orderView === 'grid') {
            // Find the grid container
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

                const firstCard = gridElement.querySelector('.bg-white.rounded-xl');
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

            // For infinite scroll, load roughly 2 screens worth
            const newBatchSize = Math.max(12, optimalRows * optimalColumns * 2);
            setBatchSize(newBatchSize);

            // Ensure visible count is at least one batch
            setVisibleCount(prev => Math.max(prev, newBatchSize));

        } else {
            // Table view - keep simple calculation
            const fallbackSize = isSidebarCollapsed ? 14 : 12;
            setPageSize(fallbackSize);
        }
    }, [activeView, orderView, isSidebarCollapsed]);

    // ResizeObserver to recalculate on container size change
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver(() => {
            calculateLayout();
        });

        observer.observe(container);
        calculateLayout();

        return () => observer.disconnect();
    }, [calculateLayout]);

    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setCurrentPage(1);
        setVisibleCount(batchSize); // Reset infinite scroll
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, [batchSize]);

    const handleResetFilters = useCallback(() => {
        setCurrentPage(1);
        setVisibleCount(batchSize);
        setFilters({
            keyword: '',
            carModel: [],
            version: [],
            status: [],
            exterior: []
        });
    }, [batchSize]);

    const handleSort = (key: keyof Order) => {
        setCurrentPage(1);
        setVisibleCount(batchSize);
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
        setSortConfig({ key, direction });
    };

    const processedData = useMemo(() => {
        let filteredOrders = [...allHistoryData];
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            filteredOrders = filteredOrders.filter(order =>
                includesNormalized(order["Tên khách hàng"], keyword) ||
                includesNormalized(order["Số đơn hàng"], keyword) ||
                includesNormalized(order.VIN, keyword) ||
                includesNormalized(order["Dòng xe"], keyword) ||
                includesNormalized(order["Phiên bản"], keyword) ||
                includesNormalized(order["Ngoại thất"], keyword) ||
                includesNormalized(order["Nội thất"], keyword) ||
                includesNormalized(order["Tên tư vấn bán hàng"], keyword) ||
                includesNormalized(order["CHÍNH SÁCH"], keyword) ||
                includesNormalized(order["Số động cơ"], keyword)
            );
        }
        if (filters.carModel.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.carModel.includes(order["Dòng xe"]));
        }
        if (filters.version.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.version.includes(order["Phiên bản"]));
        }
        if (filters.status.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.status.includes(order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép"));
        }
        if (filters.exterior.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.exterior.includes(order["Ngoại thất"]));
        }

        if (sortConfig !== null) {
            filteredOrders.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === null || aValue === undefined || aValue === '') return 1;
                if (bValue === null || bValue === undefined || bValue === '') return -1;
                if (aValue < bValue) { return sortConfig.direction === 'asc' ? -1 : 1; }
                if (aValue > bValue) { return sortConfig.direction === 'asc' ? 1 : -1; }
                return 0;
            });
        }
        return filteredOrders;
    }, [allHistoryData, filters, sortConfig]);

    const totalPages = Math.ceil(processedData.length / pageSize);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage, pageSize]);


    const paginatedData = useMemo(() => {
        if (orderView === 'grid') {
            return processedData.slice(0, visibleCount);
        }
        const startIndex = (currentPage - 1) * pageSize;
        return processedData.slice(startIndex, startIndex + pageSize);
    }, [processedData, currentPage, pageSize, orderView, visibleCount]);

    // Recalculate when data changes (after render)
    useEffect(() => {
        const timer = setTimeout(() => {
            calculateLayout();
        }, 200);
        return () => clearTimeout(timer);
    }, [paginatedData.length, calculateLayout]);

    return {
        filters,
        sortConfig,
        currentPage,
        setCurrentPage,
        handleFilterChange,
        handleResetFilters,
        handleSort,
        processedData,
        paginatedData,
        totalPages,
        pageSize,
        containerRef,
        visibleCount,
        setVisibleCount,
        batchSize
    };
};
