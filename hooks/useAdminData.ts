import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Order, VcRequest, StockVehicle, SortConfig, VcSortConfig, AdminSubView } from '../types';
import * as apiService from '../services/apiService';
import { includesNormalized } from '../utils/stringUtils';

interface UseAdminDataProps {
    allOrders: Order[];
    xuathoadonData: Order[];
    stockData: StockVehicle[];
    invoiceFilters: any;
    pendingFilters: any;
    pairedFilters: any;
    vcFilters: any;
    matchingFilters: any;
    adminView: AdminSubView;
    isSidebarCollapsed: boolean;
}

export const useAdminData = ({
    allOrders, xuathoadonData, stockData, invoiceFilters, pendingFilters, pairedFilters, vcFilters, matchingFilters, adminView, isSidebarCollapsed
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
    const { data: vcRes, error: errorVcRaw, mutate: mutateVc } = useSWR('vcData', async () => {
        const result = await apiService.getYeuCauVcData();
        return result.data || [];
    }, {
        refreshInterval: 30000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    });

    const vcRequestsData = vcRes || [];
    const isLoadingVc = !vcRes && !errorVcRaw;
    const errorVc = errorVcRaw instanceof Error ? errorVcRaw.message : (errorVcRaw ? String(errorVcRaw) : null);
    const fetchVcData = () => mutateVc();

    // Selection State
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

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
        const stockMap = new Map<string, StockVehicle>();
        stockData.forEach(car => { if (car.VIN) stockMap.set(car.VIN, car); });

        const orderStatusMap = new Map<string, Order>();
        allOrders.forEach(order => { 
            if (order['Số đơn hàng']) {
                // Enrich order with matched car info if available
                if (order.VIN && stockMap.has(order.VIN)) {
                    const matchedCar = stockMap.get(order.VIN)!;
                    order["Số động cơ"] = matchedCar["Số máy"] || matchedCar.so_may;
                    order["Mã DMS"] = matchedCar["Mã DMS"] || matchedCar.ma_dms;
                }
                orderStatusMap.set(order['Số đơn hàng'], order); 
            }
        });

        const processedInvoices: Order[] = xuathoadonData
            .filter(invoice => invoice && invoice['SỐ ĐƠN HÀNG'])
            .map(invoice => {
                const orderNumber = invoice['SỐ ĐƠN HÀNG'];
                const correspondingOrder = orderStatusMap.get(orderNumber);
                // Lọc bỏ URL rác (ví dụ: chữ "HOADON" do xuất phát từ file Excel =HYPERLINK)
                const isValidUrl = (url: any) => typeof url === 'string' && url.length > 10 && (url.startsWith('http') || url.includes('.com'));
                let bestUrl = invoice['LinkHoaDonDaXuat'];
                if (!isValidUrl(bestUrl)) bestUrl = invoice['URL Hóa Đơn Đã Xuất'];
                if (!isValidUrl(bestUrl) && correspondingOrder) bestUrl = correspondingOrder['LinkHoaDonDaXuat'];

                let urlHopDongTemp = invoice['LinkHopDong'];
                if (!isValidUrl(urlHopDongTemp)) urlHopDongTemp = invoice['URL Hợp Đồng'];
                if (!isValidUrl(urlHopDongTemp) && correspondingOrder) urlHopDongTemp = correspondingOrder['LinkHopDong'];

                let urlDeNghiTemp = invoice['LinkDeNghiXHD'];
                if (!isValidUrl(urlDeNghiTemp)) urlDeNghiTemp = invoice['URL Đề Nghị XHĐ'];
                if (!isValidUrl(urlDeNghiTemp) && correspondingOrder) urlDeNghiTemp = correspondingOrder['LinkDeNghiXHD'];

                const mergedOrder: Order = {
                    "Số đơn hàng": orderNumber,
                    "Tên khách hàng": invoice['TÊN KHÁCH HÀNG'] || invoice['Tên khách hàng'],
                    "Dòng xe": invoice['DÒNG XE'] || invoice['Dòng xe'],
                    "Phiên bản": invoice['PHIÊN BẢN'] || invoice['Phiên bản'],
                    "Ngoại thất": invoice['NGOẠI THẤT'] || invoice['Ngoại thất'],
                    "Nội thất": invoice['NỘI THẤT'] || invoice['Nội thất'],
                    "Tên tư vấn bán hàng": invoice['TƯ VẤN BÁN HÀNG'] || invoice['Tên tư vấn bán hàng'],
                    "VIN": invoice['SỐ VIN'] || invoice['VIN'],
                    "Số động cơ": invoice['SỐ ĐỘNG CƠ'] || invoice['Số động cơ'],
                    "Mã DMS": invoice['MÃ DMS'] || invoice['Mã DMS'],
                    "Thời gian nhập": invoice['NGÀY YÊU CẦU XHĐ'] || invoice['Thời gian nhập'],
                    "Ngày xuất hóa đơn": invoice['NGÀY XUẤT HÓA ĐƠN'] || invoice['Ngày xuất hóa đơn'],
                    "Hoa hồng ứng": invoice['Hoa hồng ứng'],
                    "Điểm Vpoint sử dụng": invoice['Điểm Vpoint sử dụng'],
                    "CHÍNH SÁCH": invoice['CHÍNH SÁCH'],
                    "Ngày cọc": invoice['NGÀY CỌC'] || invoice['Ngày cọc'],
                    "BÁO BÁN": invoice['BÁO BÁN'],
                    "KẾT QUẢ GỬI MAIL": invoice['KẾT QUẢ GỬI MAIL'],
                    "LinkHopDong": isValidUrl(urlHopDongTemp) ? urlHopDongTemp : '',
                    "LinkDeNghiXHD": isValidUrl(urlDeNghiTemp) ? urlDeNghiTemp : '',
                    "LinkHoaDonDaXuat": isValidUrl(bestUrl) ? bestUrl : '',
                    "Kết quả": 'N/A',
                };

                if (correspondingOrder) {
                    mergedOrder["Kết quả"] = correspondingOrder["Trạng thái VC"] || correspondingOrder["Kết quả"] || 'Không rõ';
                    // Priority merge: Use correspondingOrder data (which is enriched with stock info)
                    mergedOrder["Số động cơ"] = correspondingOrder["Số động cơ"] || mergedOrder["Số động cơ"];
                    mergedOrder["Mã DMS"] = correspondingOrder["Mã DMS"] || mergedOrder["Mã DMS"];
                    
                    Object.keys(correspondingOrder).forEach(key => {
                        // Tránh ghi đè các trường quan trọng đã được lấy từ yeucauxhd (đặc biệt là Thời gian nhập)
                        if (key === 'Thời gian nhập' || key === 'NGÀY YÊU CẦU XHĐ') return;
                        
                        if ((!mergedOrder[key as keyof Order] || (typeof mergedOrder[key as keyof Order] === 'string' && !isValidUrl(mergedOrder[key as keyof Order])))) {
                            (mergedOrder as any)[key] = (correspondingOrder as any)[key] || (mergedOrder as any)[key];
                        }
                    });
                } else {
                    mergedOrder["Kết quả"] = 'Đã xuất hóa đơn';
                }
                (mergedOrder as any)['Trạng thái xử lý'] = mergedOrder["Kết quả"];
                return mergedOrder;
            });

        const allVcRequests: VcRequest[] = vcRequestsData.map((vcReq: any) => {
            const correspondingOrder = orderStatusMap.get(vcReq['Số đơn hàng']);
            return {
                ...vcReq,
                VIN: correspondingOrder?.VIN || correspondingOrder?.['SỐ VIN'] || vcReq.VIN || vcReq['SỐ VIN'],
                "Số động cơ": correspondingOrder?.['Số động cơ'] || correspondingOrder?.['SỐ ĐỘNG CƠ'] || vcReq['Số động cơ'] || vcReq['SỐ ĐỘNG CƠ'],
                "Dòng xe": correspondingOrder?.['Dòng xe'],
                "Phiên bản": correspondingOrder?.['Phiên bản'],
                "Ngoại thất": correspondingOrder?.['Ngoại thất'],
                "Nội thất": correspondingOrder?.['Nội thất'],
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

                const versionMatch = view !== 'vc' ? (filters.version?.length === 0 || !filters.version || filters.version.includes(row['Phiên bản'])) : true;

                let exteriorMatch = true;
                // let interiorMatch = true; // Removed

                if (view === 'matching') {
                    exteriorMatch = filters.ngoaiThat?.length === 0 || !filters.ngoaiThat || filters.ngoaiThat.includes(row['Ngoại thất']);
                    // interiorMatch = filters.noiThat?.length === 0 || !filters.noiThat || filters.noiThat.includes(row['Nội thất']);
                } else if (view !== 'vc') {
                    exteriorMatch = filters.exterior?.length === 0 || !filters.exterior || filters.exterior.includes(row['Ngoại thất']);
                    // interiorMatch = filters.interior?.length === 0 || !filters.interior || filters.interior.includes(row['Nội thất']);
                }

                let trangThaiMatch = true;
                if (view === 'invoices' && filters.trangThai) {
                    trangThaiMatch = filters.trangThai.length === 0 || filters.trangThai.includes((row as any)['Trạng thái xử lý']);
                } else if (view === 'vc' && filters.trangthai) {
                    trangThaiMatch = filters.trangthai.length === 0 || filters.trangthai.includes((row as VcRequest)['Trạng thái xử lý']);
                }

                const dmsCode = (row as VcRequest)['Mã KH DMS'];
                const keywordMatch = !lowerKeyword || (
                    includesNormalized(row['Số đơn hàng'], lowerKeyword) ||
                    includesNormalized(row['Tên khách hàng'], lowerKeyword) ||
                    includesNormalized(row.VIN, lowerKeyword) ||
                    includesNormalized(dmsCode, lowerKeyword) ||
                    includesNormalized(row['Dòng xe'], lowerKeyword) ||
                    includesNormalized(row['Phiên bản'], lowerKeyword) ||
                    includesNormalized(row['Ngoại thất'], lowerKeyword) ||
                    includesNormalized(row['Nội thất'], lowerKeyword) ||
                    includesNormalized(row['Tên tư vấn bán hàng'], lowerKeyword) ||
                    includesNormalized(row['CHÍNH SÁCH'], lowerKeyword) ||
                    includesNormalized(row['Số động cơ'], lowerKeyword)
                );

                return tvbhMatch && dongXeMatch && versionMatch && exteriorMatch && trangThaiMatch && keywordMatch;
            });
        };

        const filteredInvoices = applyFilters(processedInvoices, invoiceFilters, 'invoices') as Order[];
        const filteredPending = applyFilters(allPending, adminView === 'matching' ? matchingFilters : pendingFilters, adminView === 'matching' ? 'matching' : 'pending') as Order[];
        const filteredPaired = applyFilters(allPaired, adminView === 'matching' ? matchingFilters : pairedFilters, adminView === 'matching' ? 'matching' : 'paired') as Order[];
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
                invoices: getFilterOptions(processedInvoices, ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất', 'Kết quả']),
                pending: getFilterOptions(allPending, ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất']),
                paired: getFilterOptions(allPaired, ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất']),
                vc: getFilterOptions(allVcRequests, ['Người YC', 'Trạng thái xử lý']),
                matching: getFilterOptions([...allPending, ...allPaired], ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất'])
            }
        };
    }, [allOrders, xuathoadonData, stockData, sortConfig, pendingSortConfig, pairedSortConfig, vcSortConfig, invoiceFilters, pendingFilters, pairedFilters, vcFilters, matchingFilters, vcRequestsData, adminView]);

    const paginatedInvoices = useMemo(() => invoiceRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [invoiceRequests, currentPage, PAGE_SIZE]);
    const totalInvoicePages = Math.ceil(invoiceRequests.length / PAGE_SIZE);

    useEffect(() => {
        if (currentPage > totalInvoicePages && totalInvoicePages > 0) {
            setCurrentPage(totalInvoicePages);
        }
    }, [currentPage, totalInvoicePages]);

    const allInvoiceOrderNumbers = useMemo(() => invoiceRequests.map((o: any) => o['Số đơn hàng']), [invoiceRequests]);
    const allPendingOrderNumbers = useMemo(() => pendingData.map((o: any) => o['Số đơn hàng']), [pendingData]);
    const allPairedOrderNumbers = useMemo(() => pairedData.map((o: any) => o['Số đơn hàng']), [pairedData]);
    const allVcOrderNumbers = useMemo(() => vcRequests.map((o: any) => o['Số đơn hàng']), [vcRequests]);

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
