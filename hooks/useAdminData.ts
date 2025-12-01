import { useState, useCallback, useEffect, useMemo } from 'react';
import { Order, VcRequest, StockVehicle, SortConfig, VcSortConfig, AdminSubView } from '../types';
import * as apiService from '../services/apiService';

interface UseAdminDataProps {
    allOrders: Order[];
    xuathoadonData: Order[];
    stockData: StockVehicle[];
    invoiceFilters: any;
    pendingFilters: any;
    pairedFilters: any;
    vcFilters: any;
    adminView: AdminSubView;
    isSidebarCollapsed: boolean;
}

export const useAdminData = ({
    allOrders, xuathoadonData, stockData, invoiceFilters, pendingFilters, pairedFilters, vcFilters, isSidebarCollapsed
}: UseAdminDataProps) => {
    const PAGE_SIZE = isSidebarCollapsed ? 14 : 12;

    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [pendingSortConfig, setPendingSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [pairedSortConfig, setPairedSortConfig] = useState<SortConfig | null>({ key: 'Thời gian ghép', direction: 'desc' });
    const [vcSortConfig, setVcSortConfig] = useState<VcSortConfig | null>({ key: 'Thời gian YC', direction: 'desc' });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // VC Data State
    const [vcRequestsData, setVcRequestsData] = useState<VcRequest[]>([]);
    const [isLoadingVc, setIsLoadingVc] = useState(true);
    const [errorVc, setErrorVc] = useState<string | null>(null);


    // Selection State
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

    const fetchVcData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoadingVc(true);
        setErrorVc(null);
        try {
            const result = await apiService.getYeuCauVcData();
            setVcRequestsData(result.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Lỗi không xác định khi tải yêu cầu VC.';
            setErrorVc(message);
        } finally {
            if (!isSilent) setIsLoadingVc(false);
        }
    }, []);


    useEffect(() => {
        fetchVcData();
    }, [fetchVcData]);

    // Heartbeat
    useEffect(() => {
        apiService.recordUserPresence();
        const presenceInterval = setInterval(() => {
            apiService.recordUserPresence();
        }, 120000);
        return () => clearInterval(presenceInterval);
    }, []);

    const {
        processedInvoices,
        invoiceRequests,
        pendingData,
        pairedData,
        vcRequests,
        suggestionsMap,
        filterOptions,
        ordersWithMatches
    } = useMemo(() => {
        const orderStatusMap = new Map<string, Order>();
        allOrders.forEach(order => { if (order['Số đơn hàng']) orderStatusMap.set(order['Số đơn hàng'], order); });

        const processedInvoices: Order[] = xuathoadonData
            .filter(invoice => invoice && invoice['SỐ ĐƠN HÀNG'])
            .map(invoice => {
                const orderNumber = invoice['SỐ ĐƠN HÀNG'];
                const correspondingOrder = orderStatusMap.get(orderNumber);
                const mergedOrder: Order = {
                    "Số đơn hàng": orderNumber,
                    "Tên khách hàng": invoice['TÊN KHÁCH HÀNG'],
                    "Dòng xe": invoice['DÒNG XE'],
                    "Phiên bản": invoice['PHIÊN BẢN'],
                    "Ngoại thất": invoice['NGOẠI THẤT'],
                    "Nội thất": invoice['NỘI THẤT'],
                    "Tên tư vấn bán hàng": invoice['TƯ VẤN BÁN HÀNG'],
                    "VIN": invoice['SỐ VIN'],
                    "Số động cơ": invoice['SỐ ĐỘNG CƠ'],
                    "Thời gian nhập": invoice['NGÀY YÊU CẦU XHĐ'],
                    "Ngày xuất hóa đơn": invoice['NGÀY XUẤT HÓA ĐƠN'],
                    "PO PIN": invoice['PO PIN'],
                    "CHÍNH SÁCH": invoice['CHÍNH SÁCH'],
                    "Ngày cọc": invoice['NGÀY CỌC'],
                    "BÁO BÁN": invoice['BÁO BÁN'],
                    "KẾT QUẢ GỬI MAIL": invoice['KẾT QUẢ GỬI MAIL'],
                    "LinkHopDong": invoice['URL Hợp Đồng'],
                    "LinkDeNghiXHD": invoice['URL Đề Nghị XHĐ'],
                    "LinkHoaDonDaXuat": invoice['URL Hóa Đơn Đã Xuất'],
                    "Kết quả": 'N/A',
                };

                if (correspondingOrder) {
                    mergedOrder["Kết quả"] = correspondingOrder["Trạng thái VC"] || correspondingOrder["Kết quả"] || 'Không rõ';
                    Object.keys(correspondingOrder).forEach(key => {
                        if (!mergedOrder[key as keyof Order]) {
                            mergedOrder[key as keyof Order] = correspondingOrder[key as keyof Order];
                        }
                    });
                } else {
                    mergedOrder["Kết quả"] = 'Đã xuất hóa đơn';
                }
                (mergedOrder as any)['Trạng thái xử lý'] = mergedOrder["Kết quả"];
                return mergedOrder;
            });

        const allVcRequests: VcRequest[] = vcRequestsData.map(vcReq => {
            const correspondingOrder = orderStatusMap.get(vcReq['Số đơn hàng']);
            return {
                ...vcReq,
                VIN: correspondingOrder?.VIN,
                "Dòng xe": correspondingOrder?.['Dòng xe'],
            };
        });
        const allPending = allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase().includes('chưa'));
        const allPaired = allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase() === 'đã ghép');

        const suggestions = new Map<string, StockVehicle[]>();
        if (stockData && allPending.length > 0) {
            const availableCars = stockData.filter(car => car['Trạng thái']?.toLowerCase() === 'chưa ghép');
            const normalize = (str?: string) => (str || '').toLowerCase().trim().normalize('NFC');
            availableCars.forEach(car => {
                allPending.forEach(order => {
                    if (normalize(car['Dòng xe']) === normalize(order['Dòng xe']) && normalize(car['Phiên bản']) === normalize(order['Phiên bản']) && normalize(car['Ngoại thất']) === normalize(order['Ngoại thất']) && normalize(order['Nội thất']).includes(normalize(car['Nội thất']))) {
                        const existing = suggestions.get(order['Số đơn hàng']) || [];
                        suggestions.set(order['Số đơn hàng'], [...existing, car]);
                    }
                });
            });
            suggestions.forEach((cars) => cars.sort((a, b) => new Date(a['Thời gian nhập'] || 0).getTime() - new Date(b['Thời gian nhập'] || 0).getTime()));
        }

        const ordersWithMatches = allPending
            .filter(order => suggestions.has(order['Số đơn hàng']))
            .map(order => ({ order, cars: suggestions.get(order['Số đơn hàng']) || [] }));


        const applyFilters = (data: (Order | VcRequest)[], filters: Record<string, any>, view: AdminSubView) => {
            const lowerKeyword = filters.keyword?.toLowerCase() ?? '';

            return data.filter(row => {
                const tvbhMatch = view === 'vc' ? (filters.nguoiyc.length === 0 || filters.nguoiyc.includes((row as VcRequest)['Người YC'])) : (filters.tvbh.length === 0 || filters.tvbh.includes(row['Tên tư vấn bán hàng']));
                const dongXeMatch = view !== 'vc' ? (filters.dongXe.length === 0 || filters.dongXe.includes(row['Dòng xe'])) : true;

                let trangThaiMatch = true;
                if (view === 'invoices' && filters.trangThai) {
                    trangThaiMatch = filters.trangThai.length === 0 || filters.trangThai.includes((row as any)['Trạng thái xử lý']);
                } else if (view === 'vc' && filters.trangthai) {
                    trangThaiMatch = filters.trangthai.length === 0 || filters.trangthai.includes((row as VcRequest)['Trạng thái xử lý']);
                }

                const dmsCode = (row as VcRequest)['Mã KH DMS'];
                const keywordMatch = !lowerKeyword || (
                    (row['Số đơn hàng'] && row['Số đơn hàng'].toLowerCase().includes(lowerKeyword)) ||
                    (row['Tên khách hàng'] && row['Tên khách hàng'].toLowerCase().includes(lowerKeyword)) ||
                    (row.VIN && row.VIN.toLowerCase().includes(lowerKeyword)) ||
                    (dmsCode && dmsCode.toLowerCase().includes(lowerKeyword))
                );

                return tvbhMatch && dongXeMatch && trangThaiMatch && keywordMatch;
            });
        };

        const filteredInvoices = applyFilters(processedInvoices, invoiceFilters, 'invoices') as Order[];
        const filteredPending = applyFilters(allPending, pendingFilters, 'pending') as Order[];
        const filteredPaired = applyFilters(allPaired, pairedFilters, 'paired') as Order[];
        const filteredVc = applyFilters(allVcRequests, vcFilters, 'vc') as VcRequest[];

        const applySort = (data: (Order | VcRequest)[], sortConfig: SortConfig | VcSortConfig | null) => {
            let sorted = [...data];
            if (sortConfig) {
                sorted.sort((a, b) => {
                    const aVal = a[sortConfig.key as keyof (Order & VcRequest)]; const bVal = b[sortConfig.key as keyof (Order & VcRequest)];
                    if (['Thời gian nhập', 'Thời gian ghép', 'Thời gian YC'].includes(String(sortConfig.key))) {
                        const timeA = aVal ? new Date(aVal as string).getTime() : 0; const timeB = bVal ? new Date(bVal as string).getTime() : 0;
                        if (timeA < timeB) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (timeA > timeB) return sortConfig.direction === 'asc' ? 1 : -1; return 0;
                    }
                    if (!aVal) return 1; if (!bVal) return -1;
                    if (String(aVal) < String(bVal)) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (String(aVal) > String(bVal)) return sortConfig.direction === 'asc' ? 1 : -1; return 0;
                });
            }
            return sorted;
        };

        const sortedPending = applySort(filteredPending, pendingSortConfig) as Order[];

        sortedPending.sort((a, b) => {
            const aHas = suggestions.has(a['Số đơn hàng']);
            const bHas = suggestions.has(b['Số đơn hàng']);
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            return 0;
        });

        const getFilterOptions = (data: any[], keys: string[]) => {
            const options: Record<string, Set<string>> = {};
            keys.forEach(key => options[key] = new Set());
            data.forEach(row => {
                keys.forEach(key => {
                    const value = key === 'Kết quả' || key === 'Trạng thái xử lý' ? (row as any)['Trạng thái xử lý'] : row[key];
                    if (value) options[key].add(value as string);
                });
            });
            const result: Record<string, string[]> = {};
            keys.forEach(key => result[key] = Array.from(options[key]).sort());
            return result;
        };

        return {
            processedInvoices,
            invoiceRequests: applySort(filteredInvoices, sortConfig) as Order[],
            pendingData: sortedPending,
            pairedData: applySort(filteredPaired, pairedSortConfig) as Order[],
            vcRequests: applySort(filteredVc, vcSortConfig) as VcRequest[],
            suggestionsMap: suggestions,
            ordersWithMatches: ordersWithMatches,
            filterOptions: {
                invoices: getFilterOptions(processedInvoices, ['Tên tư vấn bán hàng', 'Dòng xe', 'Kết quả']),
                pending: getFilterOptions(allPending, ['Tên tư vấn bán hàng', 'Dòng xe', 'Ngoại thất', 'Nội thất']),
                paired: getFilterOptions(allPaired, ['Tên tư vấn bán hàng', 'Dòng xe']),
                vc: getFilterOptions(allVcRequests, ['Người YC', 'Trạng thái xử lý']),
            }
        };
    }, [allOrders, xuathoadonData, stockData, sortConfig, pendingSortConfig, pairedSortConfig, vcSortConfig, invoiceFilters, pendingFilters, pairedFilters, vcFilters, vcRequestsData]);

    const paginatedInvoices = useMemo(() => invoiceRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [invoiceRequests, currentPage, PAGE_SIZE]);
    const totalInvoicePages = Math.ceil(invoiceRequests.length / PAGE_SIZE);

    useEffect(() => {
        if (currentPage > totalInvoicePages && totalInvoicePages > 0) {
            setCurrentPage(totalInvoicePages);
        }
    }, [currentPage, totalInvoicePages]);

    const allInvoiceOrderNumbers = useMemo(() => invoiceRequests.map(o => o['Số đơn hàng']), [invoiceRequests]);
    const allPendingOrderNumbers = useMemo(() => pendingData.map(o => o['Số đơn hàng']), [pendingData]);
    const allPairedOrderNumbers = useMemo(() => pairedData.map(o => o['Số đơn hàng']), [pairedData]);
    const allVcOrderNumbers = useMemo(() => vcRequests.map(o => o['Số đơn hàng']), [vcRequests]);

    const handleToggleAll = (allIds: string[]) => {
        if (selectedRows.size >= allIds.length) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(allIds));
        }
    };

    return {
        sortConfig, setSortConfig,
        pendingSortConfig, setPendingSortConfig,
        pairedSortConfig, setPairedSortConfig,
        vcSortConfig, setVcSortConfig,
        currentPage, setCurrentPage,
        vcRequestsData, isLoadingVc, errorVc,
        selectedRows, setSelectedRows, handleToggleAll,
        fetchVcData,
        processedInvoices, invoiceRequests, pendingData, pairedData, vcRequests,
        suggestionsMap, filterOptions, ordersWithMatches,
        paginatedInvoices, totalInvoicePages,
        allInvoiceOrderNumbers, allPendingOrderNumbers, allPairedOrderNumbers, allVcOrderNumbers
    };
};
