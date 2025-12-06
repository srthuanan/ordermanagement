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
    const [pageSize, setPageSize] = useState(() => {
        if (activeView === 'orders' && orderView === 'grid') {
            return isSidebarCollapsed ? 15 : 12;
        }
        return isSidebarCollapsed ? 14 : 12;
    });
    const containerRef = useRef<HTMLDivElement>(null);

    const calculatePageSize = useCallback(() => {
        if (!containerRef.current) return;

        if (activeView === 'orders' && orderView === 'grid') {
            // Find the grid container
            const gridContainer = containerRef.current.querySelector('.flex-grow.overflow-y-auto');
            const gridElement = gridContainer?.querySelector('.grid');

            if (!gridContainer || !gridElement) {
                // Fallback
                const fallbackSize = isSidebarCollapsed ? 15 : 12;
                setPageSize(fallbackSize);
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
                const gridStyle = window.getComputedStyle(gridElement);
                const gridCols = gridStyle.gridTemplateColumns;
                if (gridCols && gridCols !== 'none') {
                    columns = gridCols.split(' ').length;
                }

                const firstCard = gridElement.querySelector('.bg-white.rounded-xl');
                if (firstCard) {
                    cardHeight = firstCard.getBoundingClientRect().height;
                }
            }

            // Calculate rows to fill available height
            const paginationOffset = 50;
            const availableHeight = containerHeight - paginationOffset;
            const rows = availableHeight >= cardHeight
                ? Math.ceil((availableHeight - cardHeight / 2) / (cardHeight + gap))
                : 0;

            const optimalRows = Math.max(2, rows);
            const optimalColumns = Math.max(1, columns);

            setPageSize(optimalRows * optimalColumns);
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
            calculatePageSize();
        });

        observer.observe(container);
        calculatePageSize();

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
            exterior: []
        });
    }, []);

    const handleSort = (key: keyof Order) => {
        setCurrentPage(1);
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
        const startIndex = (currentPage - 1) * pageSize;
        return processedData.slice(startIndex, startIndex + pageSize);
    }, [processedData, currentPage, pageSize]);

    // Recalculate when data changes (after render)
    useEffect(() => {
        const timer = setTimeout(() => {
            calculatePageSize();
        }, 200);
        return () => clearTimeout(timer);
    }, [paginatedData.length, calculatePageSize]);

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
        containerRef
    };
};
