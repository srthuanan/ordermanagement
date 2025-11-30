import { useState, useMemo, useCallback, useEffect } from 'react';
import { Order, SortConfig } from '../types';

interface UseOrderFilteringProps {
    allHistoryData: Order[];
    isSidebarCollapsed: boolean;
    activeView: string;
    orderView: 'table' | 'grid';
}

export const useOrderFiltering = ({ allHistoryData, isSidebarCollapsed, activeView, orderView }: UseOrderFilteringProps) => {
    const [filters, setFilters] = useState({ keyword: '', carModel: [] as string[], status: [] as string[] });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);

    const PAGE_SIZE = useMemo(() => {
        if (activeView === 'orders' && orderView === 'grid') {
            return isSidebarCollapsed ? 15 : 12;
        }
        return isSidebarCollapsed ? 14 : 12;
    }, [activeView, orderView, isSidebarCollapsed]);

    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setCurrentPage(1);
        setFilters({ keyword: '', carModel: [], status: [] });
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
            filteredOrders = filteredOrders.filter(order => order["Tên khách hàng"]?.toLowerCase().includes(keyword) || order["Số đơn hàng"]?.toLowerCase().includes(keyword) || order.VIN?.toLowerCase().includes(keyword));
        }
        if (filters.carModel.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.carModel.includes(order["Dòng xe"]));
        }
        if (filters.status.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.status.includes(order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép"));
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

    const totalPages = Math.ceil(processedData.length / PAGE_SIZE);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage, PAGE_SIZE]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return processedData.slice(startIndex, startIndex + PAGE_SIZE);
    }, [processedData, currentPage, PAGE_SIZE]);

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
        PAGE_SIZE
    };
};
