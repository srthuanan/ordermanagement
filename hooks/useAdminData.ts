import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { Order, VcRequest, StockVehicle, SortConfig, VcSortConfig, AdminSubView } from '../types';
import * as apiService from '../services/apiService';
import { includesNormalized } from '../utils/stringUtils';

interface UseAdminDataProps {
    allOrders: Order[];
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
    allOrders, stockData, invoiceFilters, pendingFilters, pairedFilters, vcFilters, matchingFilters, adminView, isSidebarCollapsed
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

    // INVOICE Data State (Local fetch for faster Admin view)
    const { data: xhdRes, error: errorXhdRaw, mutate: mutateXhd } = useSWR('xuathoadonData', async () => {
        const { supabase: s } = await import('../services/supabaseClient');
        const { data, error } = await s
            .from('yeucauxhd')
            .select('*')
            .order('ngay_yeu_cau', { ascending: false })
            .limit(300);
        if (error) throw error;
        return data || [];
    }, {
        refreshInterval: 15000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
    });

    const localXuathoadonRaw = xhdRes || [];
    const isLoadingXuathoadon = !xhdRes && !errorXhdRaw;
    const fetchXuathoadonData = () => mutateXhd();

    const localXuathoadonData = useMemo(() => {
        return localXuathoadonRaw.map((row: any) => ({
            'Tên khách hàng': row.ten_khach_hang,
            'Số đơn hàng': row.so_don_hang,
            'Dòng xe': row.dong_xe,
            'Phiên bản': row.phien_ban,
            'Ngoại thất': row.ngoai_that,
            'Nội thất': row.noi_that,
            'Tên tư vấn bán hàng': row.tvbh,
            'VIN': row.vin,
            'Ngày cọc': row.ngay_coc,
            'Thời gian nhập': row.ngay_yeu_cau,
            'Kết quả': row.trang_thai || 'Chờ phê duyệt',
            'CHÍNH SÁCH': row.chinh_sach,
            'Hoa hồng ứng': row.hoa_hong_ung,
            'Điểm Vpoint sử dụng': row.vpoint,
            'LinkHopDong': row.url_hop_dong,
            'LinkDeNghiXHD': row.url_de_nghi_xhd,
            'Ngày xuất hóa đơn': row.ngay_xuat_hoa_don,
            'SỐ ĐƠN HÀNG': row.so_don_hang,
            'TÊN KHÁCH HÀNG': row.ten_khach_hang,
            'TƯ VẤN BÁN HÀNG': row.tvbh,
            'SỐ VIN': row.vin,
            'Số máy': row.so_may,
            'SỐ MÁY': row.so_may,
            'NGÀY YÊU CẦU XHĐ': row.ngay_yeu_cau,
            'NGÀY XUẤT HÓA ĐƠN': row.ngay_xuat_hoa_don,
            'Trạng thái VC': row.trang_thai_vc || '',
            'Ghi chú AI': row.ghi_chu_ai,
            'Xe xăng VIN': row.xe_xang_vin,
            'Xe xăng Hãng': row.xe_xang_hang,
            'Xe xăng Model': row.xe_xang_model,
            '_sourceId': row.id,
        }));
    }, [localXuathoadonRaw]);

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


    // 1. Map for Stock (static lookup)
    const stockMap = useMemo(() => {
        const sMap = new Map<string, StockVehicle>();
        stockData.forEach(car => { if (car.VIN) sMap.set(car.VIN, car); });
        return sMap;
    }, [stockData]);

    // 2. Map for Orders (active lookup)
    const orderStatusMap = useMemo(() => {
        const oStatusMap = new Map<string, Order>();
        allOrders.forEach(order => { 
            if (order['Số đơn hàng']) {
                if (order.VIN && stockMap.has(order.VIN)) {
                    const matchedCar = stockMap.get(order.VIN)!;
                    order["Số máy"] = matchedCar["Số máy"] || matchedCar.so_may;
                    order["Mã DMS"] = matchedCar["Mã DMS"] || matchedCar.ma_dms;
                }
                oStatusMap.set(order['Số đơn hàng'], order); 
            }
        });
        return oStatusMap;
    }, [allOrders, stockMap]);

    // 3. Process Invoices (Merge Invoice Req with Order Status)
    const processedInvoices = useMemo(() => {
        const isValidUrl = (url: any) => typeof url === 'string' && url.length > 10 && (url.startsWith('http') || url.includes('.com'));
        
        return localXuathoadonData
            .filter(invoice => invoice && invoice['SỐ ĐƠN HÀNG'])
            .map(row => {
                const invoice = row as any;
                const orderNumber = invoice['SỐ ĐƠN HÀNG'];
                const correspondingOrder = orderStatusMap.get(orderNumber);
                
                let bestUrl = invoice['LinkHoaDonDaXuat'] || invoice['URL Hóa Đơn Đã Xuất'];
                if (!isValidUrl(bestUrl) && correspondingOrder) bestUrl = (correspondingOrder as any)['LinkHoaDonDaXuat'];

                let urlHopDongTemp = invoice['LinkHopDong'] || invoice['URL Hợp Đồng'];
                if (!isValidUrl(urlHopDongTemp) && correspondingOrder) urlHopDongTemp = (correspondingOrder as any)['LinkHopDong'];

                let urlDeNghiTemp = invoice['LinkDeNghiXHD'] || invoice['URL Đề Nghị XHĐ'];
                if (!isValidUrl(urlDeNghiTemp) && correspondingOrder) urlDeNghiTemp = (correspondingOrder as any)['LinkDeNghiXHD'];

                const mergedOrder: Order = {
                    ...invoice,
                    "Số đơn hàng": orderNumber,
                    "Tên khách hàng": invoice['TÊN KHÁCH HÀNG'] || invoice['Tên khách hàng'],
                    "VIN": invoice['SỐ VIN'] || invoice['VIN'],
                    "Thời gian nhập": invoice['NGÀY YÊU CẦU XHĐ'] || invoice['Thời gian nhập'],
                    "LinkHopDong": isValidUrl(urlHopDongTemp) ? urlHopDongTemp : '',
                    "LinkDeNghiXHD": isValidUrl(urlDeNghiTemp) ? urlDeNghiTemp : '',
                    "LinkHoaDonDaXuat": isValidUrl(bestUrl) ? bestUrl : '',
                    "Kết quả": correspondingOrder?.["Trạng thái VC"] || correspondingOrder?.["Kết quả"] || 'Đã xuất hóa đơn',
                };
                (mergedOrder as any)['Trạng thái xử lý'] = mergedOrder["Kết quả"];
                return mergedOrder;
            });
    }, [localXuathoadonData, orderStatusMap]);

    // 4. Group Pending/Paired
    const { allPending, allPaired } = useMemo(() => ({
        allPending: allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase().includes('chưa')),
        allPaired: allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase() === 'đã ghép')
    }), [allOrders]);

    // 2. Expensive Matching Logic (Suggestions) - Only runs when data actually changes
    const { suggestionsMap, ordersWithMatches } = useMemo(() => {
        const suggestions = new Map<string, StockVehicle[]>();
        if (stockData && allPending.length > 0) {
            const availableCars = stockData.filter(car => car['Trạng thái']?.toLowerCase() === 'chưa ghép');
            const normalize = (str?: string) => (str || '').toLowerCase().trim().normalize('NFC');
            availableCars.forEach(car => {
                allPending.forEach(order => {
                    if (normalize(car['Dòng xe']) === normalize(order['Dòng xe']) && 
                        normalize(car['Phiên bản']) === normalize(order['Phiên bản']) && 
                        normalize(car['Ngoại thất']) === normalize(order['Ngoại thất']) && 
                        normalize(order['Nội thất']).includes(normalize(car['Nội thất']))) {
                        const existing = suggestions.get(order['Số đơn hàng']) || [];
                        suggestions.set(order['Số đơn hàng'], [...existing, car]);
                    }
                });
            });
            suggestions.forEach((cars) => cars.sort((a, b) => new Date(a['Thời gian nhập'] || 0).getTime() - new Date(b['Thời gian nhập'] || 0).getTime()));
        }

        const matches = allPending
            .filter(order => suggestions.has(order['Số đơn hàng']))
            .map(order => ({ order, cars: suggestions.get(order['Số đơn hàng']) || [] }));

        return { suggestionsMap: suggestions, ordersWithMatches: matches };
    }, [stockData, allPending]);

    // 3. VC Data Formatting
    const allVcRequests = useMemo(() => {
        return vcRequestsData.map((vcReq: any) => {
            const correspondingOrder = orderStatusMap.get(vcReq['Số đơn hàng']);
            return {
                ...vcReq,
                VIN: correspondingOrder?.VIN || vcReq.VIN,
                "Dòng xe": correspondingOrder?.['Dòng xe'],
                "Phiên bản": correspondingOrder?.['Phiên bản'],
                "Ngoại thất": correspondingOrder?.['Ngoại thất'],
                "Nội thất": correspondingOrder?.['Nội thất'],
            };
        });
    }, [vcRequestsData, orderStatusMap]);

    // 4. Filtering and Sorting Logic
    const { invoiceRequests, pendingData, pairedData, vcRequests } = useMemo(() => {
        const applyFilters = (data: (Order | VcRequest)[], filters: Record<string, any>, view: AdminSubView) => {
            const lowerKeyword = filters.keyword?.toLowerCase() ?? '';
            return data.filter(row => {
                const tvbhMatch = view === 'vc' ? (filters.nguoiyc.length === 0 || filters.nguoiyc.includes((row as VcRequest)['Người YC'])) : (filters.tvbh.length === 0 || filters.tvbh.includes(row['Tên tư vấn bán hàng']));
                const dongXeMatch = view !== 'vc' ? (filters.dongXe.length === 0 || filters.dongXe.includes(row['Dòng xe'])) : true;
                const versionMatch = view !== 'vc' ? (filters.version?.length === 0 || !filters.version || filters.version.includes(row['Phiên bản'])) : true;
                
                let exteriorMatch = true;
                if (view === 'matching') {
                    exteriorMatch = filters.ngoaiThat?.length === 0 || !filters.ngoaiThat || filters.ngoaiThat.includes(row['Ngoại thất']);
                } else if (view !== 'vc') {
                    exteriorMatch = filters.exterior?.length === 0 || !filters.exterior || filters.exterior.includes(row['Ngoại thất']);
                }

                let trangThaiMatch = true;
                if (view === 'invoices' && filters.trangThai) {
                    trangThaiMatch = filters.trangThai.length === 0 || filters.trangThai.includes((row as any)['Trạng thái xử lý']);
                } else if (view === 'vc' && filters.trangthai) {
                    trangThaiMatch = filters.trangthai.length === 0 || filters.trangthai.includes((row as VcRequest)['Trạng thái xử lý']);
                }

                const keywordMatch = !lowerKeyword || (
                    includesNormalized(row['Số đơn hàng'], lowerKeyword) ||
                    includesNormalized(row['Tên khách hàng'], lowerKeyword) ||
                    includesNormalized(row.VIN, lowerKeyword) ||
                    includesNormalized(row['Dòng xe'], lowerKeyword) ||
                    includesNormalized(row['Phiên bản'], lowerKeyword)
                );

                return tvbhMatch && dongXeMatch && versionMatch && exteriorMatch && trangThaiMatch && keywordMatch;
            });
        };

        const applySort = (data: (Order | VcRequest)[], sort: SortConfig | VcSortConfig | null) => {
            if (!sort) return [...data];
            return [...data].sort((a, b) => {
                const aVal = a[sort.key as keyof (Order & VcRequest)];
                const bVal = b[sort.key as keyof (Order & VcRequest)];
                if (['Thời gian nhập', 'Thời gian ghép', 'Thời gian YC'].includes(String(sort.key))) {
                    const timeA = aVal ? new Date(aVal as string).getTime() : 0;
                    const timeB = bVal ? new Date(bVal as string).getTime() : 0;
                    return sort.direction === 'asc' ? timeA - timeB : timeB - timeA;
                }
                const sA = String(aVal || ''); const sB = String(bVal || '');
                return sort.direction === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
            });
        };

        const fPending = applyFilters(allPending, adminView === 'matching' ? matchingFilters : pendingFilters, adminView === 'matching' ? 'matching' : 'pending') as Order[];
        fPending.sort((a, b) => (suggestionsMap.has(a['Số đơn hàng']) ? -1 : 1) - (suggestionsMap.has(b['Số đơn hàng']) ? -1 : 1));

        return {
            invoiceRequests: applySort(applyFilters(processedInvoices, invoiceFilters, 'invoices'), sortConfig) as Order[],
            pendingData: applySort(fPending, pendingSortConfig) as Order[],
            pairedData: applySort(applyFilters(allPaired, adminView === 'matching' ? matchingFilters : pairedFilters, adminView === 'matching' ? 'matching' : 'paired'), pairedSortConfig) as Order[],
            vcRequests: applySort(applyFilters(allVcRequests, vcFilters, 'vc'), vcSortConfig) as VcRequest[],
        };
    }, [processedInvoices, allPending, allPaired, allVcRequests, invoiceFilters, pendingFilters, pairedFilters, vcFilters, matchingFilters, sortConfig, pendingSortConfig, pairedSortConfig, vcSortConfig, suggestionsMap, adminView]);

    const filterOptions = useMemo(() => {
        const getOpts = (data: any[], keys: string[]) => {
            const res: Record<string, string[]> = {};
            keys.forEach(key => {
                const set = new Set<string>();
                data.forEach(row => {
                    const val = (key === 'Kết quả' || key === 'Trạng thái xử lý') ? (row as any)['Trạng thái xử lý'] : row[key];
                    if (val) set.add(val);
                });
                res[key] = Array.from(set).sort();
            });
            return res;
        };

        return {
            invoices: getOpts(processedInvoices, ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất', 'Kết quả']),
            pending: getOpts(allPending, ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất']),
            paired: getOpts(allPaired, ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất']),
            vc: getOpts(allVcRequests, ['Người YC', 'Trạng thái xử lý']),
            matching: getOpts([...allPending, ...allPaired], ['Tên tư vấn bán hàng', 'Dòng xe', 'Phiên bản', 'Ngoại thất'])
        };
    }, [processedInvoices, allPending, allPaired, allVcRequests]);

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
        isLoadingXuathoadon, fetchXuathoadonData,
        selectedRows, setSelectedRows, handleToggleAll,
        fetchVcData,
        processedInvoices, invoiceRequests, pendingData, pairedData, vcRequests,
        suggestionsMap, filterOptions, ordersWithMatches,
        paginatedInvoices, totalInvoicePages,
        allInvoiceOrderNumbers, allPendingOrderNumbers, allPairedOrderNumbers, allVcOrderNumbers
    };
};
