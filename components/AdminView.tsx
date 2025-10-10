import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import 'moment/locale/vi';
import { Order, SortConfig, StockVehicle, VcRequest, ActionType } from '../types';
import Pagination from './ui/Pagination';
import AdminInvoiceTable from './admin/AdminInvoiceTable';
import AdminVcRequestTable from './admin/AdminVcRequestTable';
import ActionModal from './admin/ActionModal';
import { RequestWithImageModal, UploadInvoiceModal } from './admin/AdminActionModals';
import OrderTimelineModal from './admin/OrderTimelineModal';
import BulkInvoiceUploadModal from './admin/BulkInvoiceUploadModal';
import SuggestionModal from './admin/SuggestionModal';
import * as apiService from '../services/apiService';
import Filters, { DropdownFilterConfig } from './ui/Filters';


const PAGE_SIZE = 15;

interface AdminViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    refetchHistory: (isSilent?: boolean) => void;
    refetchStock: (isSilent?: boolean) => void;
    refetchXuathoadon: (isSilent?: boolean) => void;
    allOrders: Order[];
    xuathoadonData: Order[];
    stockData: StockVehicle[];
    isLoadingXuathoadon: boolean;
    errorXuathoadon: string | null;
    onOpenImagePreview: (imageUrl: string, originalUrl: string, fileLabel: string, customerName: string) => void;
}

type ModalState = {
    type: ActionType;
    order: Order | VcRequest;
} | null;

type AdminModalType = 'archive' | 'addCar' | 'deleteCar' | 'restoreCar' | 'deleteOrder' | 'revertOrder' | 'timeline' | 'bulkUpload';
type AdminSubView = 'invoices' | 'pending' | 'paired' | 'vc';

const AdminView: React.FC<AdminViewProps> = ({ showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, allOrders, xuathoadonData, stockData, isLoadingXuathoadon, errorXuathoadon, onOpenImagePreview }) => {
    const [adminView, setAdminView] = useState<AdminSubView>('invoices');
    
    // State for sorting and pagination for each tab
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    
    const [pendingSortConfig, setPendingSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [pendingCurrentPage, setPendingCurrentPage] = useState(1);

    const [pairedSortConfig, setPairedSortConfig] = useState<SortConfig | null>({ key: 'Thời gian ghép', direction: 'desc' });
    const [pairedCurrentPage, setPairedCurrentPage] = useState(1);

    const [vcSortConfig, setVcSortConfig] = useState<SortConfig | null>({ key: 'Thời gian YC', direction: 'desc' });
    const [vcCurrentPage, setVcCurrentPage] = useState(1);
    
    const [vcRequestsData, setVcRequestsData] = useState<VcRequest[]>([]);
    const [isLoadingVc, setIsLoadingVc] = useState(true);
    const [errorVc, setErrorVc] = useState<string | null>(null);

    // State for filtering
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [invoiceFilters, setInvoiceFilters] = useState<{ tvbh: string[], dongXe: string[], trangThai: string[] }>({ tvbh: [], dongXe: [], trangThai: [] });
    const [pendingFilters, setPendingFilters] = useState<{ tvbh: string[], dongXe: string[] }>({ tvbh: [], dongXe: [] });
    const [pairedFilters, setPairedFilters] = useState<{ tvbh: string[], dongXe: string[] }>({ tvbh: [], dongXe: [] });
    const [vcFilters, setVcFilters] = useState<{ nguoiyc: string[], trangthai: string[] }>({ nguoiyc: [], trangthai: [] });


    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [invoiceModalState, setInvoiceModalState] = useState<ModalState>(null);
    const [suggestionModalState, setSuggestionModalState] = useState<{ order: Order; cars: StockVehicle[] } | null>(null);
    const [adminModal, setAdminModal] = useState<AdminModalType | null>(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    const fetchVcData = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoadingVc(true);
        setErrorVc(null);
        try {
            const result = await apiService.getApi({ action: 'getYeuCauVcData' });
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


     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleFilterChange = (newFilters: Partial<{ [key: string]: string | string[] | undefined }>) => {
        if (adminView === 'invoices') {
            setInvoiceFilters(prev => ({ ...prev, ...newFilters as Partial<typeof prev> }));
        } else if (adminView === 'pending') {
            setPendingFilters(prev => ({ ...prev, ...newFilters as Partial<typeof prev> }));
        } else if (adminView === 'paired') {
            setPairedFilters(prev => ({ ...prev, ...newFilters as Partial<typeof prev> }));
        } else if (adminView === 'vc') {
            setVcFilters(prev => ({ ...prev, ...newFilters as Partial<typeof prev> }));
        }
        
        setCurrentPage(1);
        setPendingCurrentPage(1);
        setPairedCurrentPage(1);
        setVcCurrentPage(1);
    };

    const handleReset = () => {
        if (adminView === 'invoices') {
            setInvoiceFilters({ tvbh: [], dongXe: [], trangThai: [] });
        } else if (adminView === 'pending') {
            setPendingFilters({ tvbh: [], dongXe: [] });
        } else if (adminView === 'paired') {
            setPairedFilters({ tvbh: [], dongXe: [] });
        } else if (adminView === 'vc') {
            setVcFilters({ nguoiyc: [], trangthai: [] });
        }
        setCurrentPage(1);
        setPendingCurrentPage(1);
        setPairedCurrentPage(1);
        setVcCurrentPage(1);
    };


    const { 
        invoiceRequests, 
        pendingData,
        pairedData,
        vcRequests,
        suggestionsMap,
        filterOptions,
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

        const allVcRequests: VcRequest[] = vcRequestsData;
        const allPending = allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase().includes('chưa'));
        const allPaired = allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase() === 'đã ghép');

        const suggestions = new Map<string, StockVehicle[]>();
        if(stockData && allPending.length > 0) {
            const availableCars = stockData.filter(car => car['Trạng thái']?.toLowerCase() === 'chưa ghép');
            const normalize = (str?: string) => str?.toLowerCase().trim().normalize('NFC') || '';
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

        const applyFilters = (data: (Order | VcRequest)[], filters: Record<string, string[]>, view: AdminSubView) => {
            return data.filter(row => {
                const tvbhMatch = view === 'vc' ? (filters.nguoiyc.length === 0 || filters.nguoiyc.includes((row as VcRequest)['Người YC'])) : (filters.tvbh.length === 0 || filters.tvbh.includes(row['Tên tư vấn bán hàng']));
                const dongXeMatch = view !== 'vc' && (filters.dongXe.length === 0 || filters.dongXe.includes(row['Dòng xe']));
                
                let trangThaiMatch = true;
                if (view === 'invoices' && filters.trangThai) {
                    trangThaiMatch = filters.trangThai.length === 0 || filters.trangThai.includes((row as any)['Trạng thái xử lý']);
                } else if (view === 'vc' && filters.trangthai) {
                    trangThaiMatch = filters.trangthai.length === 0 || filters.trangthai.includes((row as VcRequest)['Trạng thái xử lý']);
                }
                
                return tvbhMatch && (view === 'vc' || dongXeMatch) && trangThaiMatch;
            });
        };

        const filteredInvoices = applyFilters(processedInvoices, invoiceFilters, 'invoices') as Order[];
        const filteredPending = applyFilters(allPending, pendingFilters, 'pending') as Order[];
        const filteredPaired = applyFilters(allPaired, pairedFilters, 'paired') as Order[];
        const filteredVc = applyFilters(allVcRequests, vcFilters, 'vc') as VcRequest[];
        
        const applySort = (data: (Order | VcRequest)[], sortConfig: SortConfig | null) => {
            let sorted = [...data];
            if (sortConfig) {
                 sorted.sort((a, b) => {
                    const aVal = a[sortConfig.key]; const bVal = b[sortConfig.key];
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

        const getFilterOptions = (data: any[], keys: string[]) => {
            const options: Record<string, Set<string>> = {};
            keys.forEach(key => options[key] = new Set());
            data.forEach(row => {
                keys.forEach(key => {
                    const value = key === 'Kết quả' ? (row as any)['Trạng thái xử lý'] : row[key];
                    if (value) options[key].add(value as string);
                });
            });
            const result: Record<string, string[]> = {};
            keys.forEach(key => result[key] = Array.from(options[key]).sort());
            return result;
        };
        
        return { 
            invoiceRequests: applySort(filteredInvoices, sortConfig) as Order[],
            pendingData: applySort(filteredPending, pendingSortConfig) as Order[],
            pairedData: applySort(filteredPaired, pairedSortConfig) as Order[],
            vcRequests: applySort(filteredVc, vcSortConfig) as VcRequest[],
            suggestionsMap: suggestions,
            filterOptions: {
                invoices: getFilterOptions(processedInvoices, ['Tên tư vấn bán hàng', 'Dòng xe', 'Kết quả']),
                pending: getFilterOptions(allPending, ['Tên tư vấn bán hàng', 'Dòng xe']),
                paired: getFilterOptions(allPaired, ['Tên tư vấn bán hàng', 'Dòng xe']),
                vc: getFilterOptions(allVcRequests, ['Người YC', 'Trạng thái xử lý']),
            }
        };
    }, [allOrders, xuathoadonData, stockData, sortConfig, pendingSortConfig, pairedSortConfig, vcSortConfig, invoiceFilters, pendingFilters, pairedFilters, vcFilters, vcRequestsData]);

    const paginatedInvoices = useMemo(() => invoiceRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [invoiceRequests, currentPage]);
    const paginatedPendingData = useMemo(() => pendingData.slice((pendingCurrentPage - 1) * PAGE_SIZE, pendingCurrentPage * PAGE_SIZE), [pendingData, pendingCurrentPage]);
    const paginatedPairedData = useMemo(() => pairedData.slice((pairedCurrentPage - 1) * PAGE_SIZE, pairedCurrentPage * PAGE_SIZE), [pairedData, pairedCurrentPage]);
    const paginatedVcData = useMemo(() => vcRequests.slice((vcCurrentPage - 1) * PAGE_SIZE, vcCurrentPage * PAGE_SIZE), [vcRequests, vcCurrentPage]);
    
    const totalInvoicePages = Math.ceil(invoiceRequests.length / PAGE_SIZE);
    const totalPendingPages = Math.ceil(pendingData.length / PAGE_SIZE);
    const totalPairedPages = Math.ceil(pairedData.length / PAGE_SIZE);
    const totalVcPages = Math.ceil(vcRequests.length / PAGE_SIZE);

    const handleAdminSubmit = async (
        action: string, 
        params: Record<string, any>, 
        successMessage: string, 
        refetchType: 'history' | 'stock' | 'both' = 'history'
    ) => {
        showToast('Đang xử lý...', 'Vui lòng chờ trong giây lát.', 'loading');
        try {
            const result = await apiService.performAdminAction(action, params);
            setInvoiceModalState(null);
            setAdminModal(null);
            setSuggestionModalState(null);
            setSelectedRows(new Set());
            
            hideToast();
            showToast('Thành công!', result.message || successMessage, 'success');
            
            if (refetchType === 'history' || refetchType === 'both') {
                refetchHistory(true); 
                refetchXuathoadon(true);
            }
            if (refetchType === 'stock' || refetchType === 'both') {
                refetchStock(true);
            }
            if (action.includes('VcRequest')) {
                fetchVcData(true);
            }
            return true;
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
            showToast('Thao tác thất bại', message, 'error');
            return false;
        }
    };
    
    const handleAction = (type: ActionType, order: Order | VcRequest) => {
        if (type === 'manualMatch') {
            const suggestedCars = suggestionsMap.get(order['Số đơn hàng']) || [];
            setSuggestionModalState({ order: order as Order, cars: suggestedCars });
        } else if (type === 'requestInvoice') {
            const orderToRequest = allOrders.find(o => o['Số đơn hàng'] === order['Số đơn hàng']);
            if(orderToRequest) {
                console.log("Requesting invoice for:", orderToRequest);
                showToast('Chức năng đang phát triển', 'Yêu cầu xuất hóa đơn từ Admin Panel sẽ sớm được cập nhật.', 'info');
            }
        }
        else {
            setInvoiceModalState({ type, order });
        }
    };

    const handleShowSuggestions = (order: Order, cars: StockVehicle[]) => {
        setSuggestionModalState({ order, cars });
    };

    const handleConfirmSuggestion = async (orderNumber: string, vin: string) => {
        await handleAdminSubmit( 'manualMatchCar', { orderNumber, vin }, `Đã ghép thành công ĐH ${orderNumber}.`, 'both' );
    };
    
    const adminTools = [ { title: 'Lưu Trữ Hóa Đơn', icon: 'fa-archive', action: () => setAdminModal('archive') }, { title: 'Tải Lên Hàng Loạt', icon: 'fa-file-upload', action: () => setAdminModal('bulkUpload') }, { title: 'Thêm Xe Mới', icon: 'fa-plus-circle', action: () => setAdminModal('addCar') }, { title: 'Xóa Xe Khỏi Kho', icon: 'fa-trash-alt', action: () => setAdminModal('deleteCar') }, { title: 'Phục Hồi Xe', icon: 'fa-undo', action: () => setAdminModal('restoreCar') }, { title: 'Xóa Đơn Hàng', icon: 'fa-times-circle', action: () => setAdminModal('deleteOrder') }, { title: 'Hoàn Tác Trạng Thái', icon: 'fa-history', action: () => setAdminModal('revertOrder') }, { title: 'Tra Cứu Lịch Sử', icon: 'fa-search', action: () => setAdminModal('timeline') }, ];

    const renderFilterPanel = () => {
        let currentFilters: any;
        let currentOptions: any;
        let dropdownConfigs: DropdownFilterConfig[] = [];

        switch(adminView) {
            case 'invoices':
                currentFilters = invoiceFilters;
                currentOptions = filterOptions.invoices;
                dropdownConfigs = [
                    { id: 'admin-filter-tvbh', key: 'tvbh', label: 'Tất cả TVBH', options: currentOptions['Tên tư vấn bán hàng'], icon: 'fa-user-tie', displayMode: 'selection'},
                    { id: 'admin-filter-dongxe', key: 'dongXe', label: 'Tất cả Dòng Xe', options: currentOptions['Dòng xe'], icon: 'fa-car', displayMode: 'selection'},
                    { id: 'admin-filter-status', key: 'trangThai', label: 'Tất cả Trạng Thái', options: currentOptions['Kết quả'], icon: 'fa-tag', displayMode: 'selection'}
                ];
                break;
            case 'pending':
                currentFilters = pendingFilters;
                currentOptions = filterOptions.pending;
                dropdownConfigs = [
                    { id: 'admin-filter-tvbh', key: 'tvbh', label: 'Tất cả TVBH', options: currentOptions['Tên tư vấn bán hàng'], icon: 'fa-user-tie', displayMode: 'selection'},
                    { id: 'admin-filter-dongxe', key: 'dongXe', label: 'Tất cả Dòng Xe', options: currentOptions['Dòng xe'], icon: 'fa-car', displayMode: 'selection'}
                ];
                break;
            case 'paired':
                 currentFilters = pairedFilters;
                currentOptions = filterOptions.paired;
                dropdownConfigs = [
                    { id: 'admin-filter-tvbh', key: 'tvbh', label: 'Tất cả TVBH', options: currentOptions['Tên tư vấn bán hàng'], icon: 'fa-user-tie', displayMode: 'selection'},
                    { id: 'admin-filter-dongxe', key: 'dongXe', label: 'Tất cả Dòng Xe', options: currentOptions['Dòng xe'], icon: 'fa-car', displayMode: 'selection'}
                ];
                break;
             case 'vc':
                currentFilters = vcFilters;
                currentOptions = filterOptions.vc;
                dropdownConfigs = [
                    { id: 'admin-filter-nguoiyc', key: 'nguoiyc', label: 'Tất cả Người YC', options: currentOptions['Người YC'], icon: 'fa-user-tie', displayMode: 'selection'},
                    { id: 'admin-filter-trangthai-vc', key: 'trangthai', label: 'Tất cả Trạng Thái', options: currentOptions['Trạng thái xử lý'], icon: 'fa-tag', displayMode: 'selection'}
                ];
                break;
        }

        return (
             <div className={`transition-all duration-300 ease-in-out ${isFilterPanelOpen ? 'max-h-96' : 'max-h-0 !p-0 !mt-0 !mb-0 overflow-hidden'}`}>
                <div className="bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-4">
                     <Filters 
                        filters={currentFilters}
                        onFilterChange={handleFilterChange}
                        onReset={handleReset}
                        dropdowns={dropdownConfigs}
                        searchPlaceholder=""
                        totalCount={0}
                        onRefresh={() => {}}
                        isLoading={false}
                        hideSearch={true}
                        size="compact"
                    />
                </div>
            </div>
        );
    };

    const renderCurrentView = () => {
        if (adminView === 'invoices' && isLoadingXuathoadon) {
            return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
        }
        if (adminView === 'invoices' && errorXuathoadon) {
            return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu hóa đơn</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{errorXuathoadon}</p><button onClick={() => refetchXuathoadon()} className="mt-6 btn-primary">Thử lại</button></div>;
        }
        if (adminView === 'vc' && isLoadingVc) {
            return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
        }
        if (adminView === 'vc' && errorVc) {
            return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải Yêu cầu VC</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{errorVc}</p><button onClick={() => fetchVcData()} className="mt-6 btn-primary">Thử lại</button></div>;
        }

        switch(adminView) {
            case 'invoices':
            case 'pending':
            case 'paired': {
                 const data = adminView === 'invoices' ? paginatedInvoices : adminView === 'pending' ? paginatedPendingData : paginatedPairedData;
                 const totalPages = adminView === 'invoices' ? totalInvoicePages : adminView === 'pending' ? totalPendingPages : totalPairedPages;
                 const activePage = adminView === 'invoices' ? currentPage : adminView === 'pending' ? pendingCurrentPage : pairedCurrentPage;
                 const onPageChange = adminView === 'invoices' ? setCurrentPage : adminView === 'pending' ? setPendingCurrentPage : setPairedCurrentPage;
                 const sortConf = adminView === 'invoices' ? sortConfig : adminView === 'pending' ? pendingSortConfig : pairedSortConfig;
                 const onSort = adminView === 'invoices' ? setSortConfig : adminView === 'pending' ? setPendingSortConfig : setPairedSortConfig;
                 return (
                     <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                        <div className="flex-grow overflow-auto relative">
                            <AdminInvoiceTable viewType={adminView} orders={data} sortConfig={sortConf} onSort={(key: keyof Order) => onSort((p: SortConfig | null) => ({ key, direction: p?.key === key && p.direction === 'asc' ? 'desc' : 'asc' }))} selectedRows={selectedRows} onToggleRow={(id: string) => setSelectedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })} onToggleAllRows={() => { if (selectedRows.size === data.length) setSelectedRows(new Set()); else setSelectedRows(new Set(data.map(o => o['Số đơn hàng']))); }} onAction={handleAction} showToast={showToast} suggestions={suggestionsMap} onShowSuggestions={handleShowSuggestions} />
                        </div>
                        {totalPages > 0 && <Pagination currentPage={activePage} totalPages={totalPages} onPageChange={onPageChange} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                    </div>
                 );
            }
             case 'vc': {
                return (
                    <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                        <div className="flex-grow overflow-auto relative">
                            <AdminVcRequestTable 
                                requests={paginatedVcData} 
                                sortConfig={vcSortConfig}
                                onSort={(key: keyof VcRequest) => setVcSortConfig((p: SortConfig | null) => ({ key, direction: p?.key === key && p.direction === 'asc' ? 'desc' : 'asc' }))}
                                selectedRows={selectedRows} 
                                onToggleRow={(id: string) => setSelectedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })} 
                                onToggleAllRows={() => { if (selectedRows.size === paginatedVcData.length) setSelectedRows(new Set()); else setSelectedRows(new Set(paginatedVcData.map(o => o['Số đơn hàng']))); }} 
                                onAction={handleAction} 
                                showToast={showToast} 
                                onOpenImagePreview={onOpenImagePreview}
                            />
                        </div>
                        {totalVcPages > 0 && <Pagination currentPage={vcCurrentPage} totalPages={totalVcPages} onPageChange={setVcCurrentPage} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                    </div>
                );
            }
            default: return null;
        }
    };
    
    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex flex-col h-full">
                 <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 flex items-center gap-2 mb-4">
                    <div className="flex items-center border border-border-primary rounded-lg bg-surface-ground p-0.5">
                        {(['invoices', 'pending', 'paired', 'vc'] as AdminSubView[]).map(view => {
                            const labels: Record<AdminSubView, string> = { invoices: 'Xử Lý Hóa Đơn', pending: 'Chờ Ghép', paired: 'Đã Ghép', vc: 'Xử Lý VC' };
                            const counts: Record<AdminSubView, number> = { invoices: invoiceRequests.length, pending: pendingData.length, paired: pairedData.length, vc: vcRequests.length };
                            return ( <button key={view} onClick={() => setAdminView(view)} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${adminView === view ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`} > {labels[view]} <span className="text-xs font-mono ml-1 px-1.5 py-0.5 rounded-full bg-black/5 text-black/50">{counts[view]}</span> </button> );
                        })}
                    </div>
                    <div className="flex-grow"></div>
                     <button onClick={() => setIsFilterPanelOpen(p => !p)} title="Lọc dữ liệu" className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all ${isFilterPanelOpen ? '!bg-surface-accent !text-accent-primary' : ''}`}>
                        <i className="fas fa-filter"></i>
                    </button>
                    <button 
                        onClick={async () => {
                            showToast('Đang làm mới...', 'Làm mới dữ liệu từ máy chủ.', 'loading');
                            await Promise.all([refetchHistory(true), refetchXuathoadon(true), refetchStock(true), fetchVcData(true)]);
                            hideToast();
                            showToast('Làm mới thành công', 'Dữ liệu đã được cập nhật.', 'success', 2000);
                        }} 
                        title="Làm mới tất cả dữ liệu" 
                        className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all">
                        <i className="fas fa-sync-alt text-lg"></i>
                    </button>
                    <div className="relative" ref={actionMenuRef}>
                        <button onClick={() => setIsActionMenuOpen(prev => !prev)} title="Thao Tác Nhanh" className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all"><i className="fas fa-bolt text-lg text-accent-primary"></i></button>
                        {isActionMenuOpen && ( <div className="absolute top-full right-0 mt-2 w-64 bg-surface-card border shadow-lg rounded-lg z-30 p-1 animate-fade-in-scale-up" style={{animationDuration: '150ms'}}>{adminTools.map(tool => (<button key={tool.title} onClick={() => { tool.action(); setIsActionMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-md text-text-primary hover:bg-surface-hover"><i className={`fas ${tool.icon} fa-fw w-5 text-center text-accent-secondary`}></i><span>{tool.title}</span></button>))}</div>)}
                    </div>
                </div>
                {renderFilterPanel()}
                {renderCurrentView()}
            </div>
            {suggestionModalState && <SuggestionModal isOpen={!!suggestionModalState} onClose={() => setSuggestionModalState(null)} order={suggestionModalState.order} suggestedCars={suggestionModalState.cars} onConfirm={handleConfirmSuggestion} />}
            {invoiceModalState && (
                <>
                    {/* Invoice Actions */}
                    <ActionModal isOpen={invoiceModalState.type === 'approve'} onClose={() => setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu" description="Xác nhận phê duyệt yêu cầu xuất hóa đơn cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-double" onSubmit={() => handleAdminSubmit('approveSelectedInvoiceRequest', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]) }, 'Đã phê duyệt yêu cầu.')} />
                    <RequestWithImageModal isOpen={invoiceModalState.type === 'supplement'} onClose={() => setInvoiceModalState(null)} title="Yêu Cầu Bổ Sung" orderNumber={invoiceModalState.order['Số đơn hàng']} reasonLabel="Nội dung yêu cầu (bắt buộc):" onSubmit={(reason: string, images: string[]) => handleAdminSubmit('requestSupplementForInvoice', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã gửi yêu cầu bổ sung.')} icon="fa-exclamation-triangle" theme="warning" />
                    <RequestWithImageModal isOpen={invoiceModalState.type === 'vinclub'} onClose={() => setInvoiceModalState(null)} title="Yêu Cầu Xác Thực VinClub" orderNumber={invoiceModalState.order['Số đơn hàng']} reasonLabel="Ghi chú (Tùy chọn):" onSubmit={(reason: string, images: string[]) => handleAdminSubmit('requestVinClubVerification', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã gửi yêu cầu VinClub.')} icon="fa-id-card" theme="primary" />
                    <ActionModal isOpen={invoiceModalState.type === 'pendingSignature'} onClose={() => setInvoiceModalState(null)} title="Chuyển Trạng Thái" description="Chuyển đơn hàng sang 'Chờ Ký Hóa Đơn'?" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={() => handleAdminSubmit('markAsPendingSignature', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]) }, 'Đã chuyển trạng thái.')} />
                    <UploadInvoiceModal isOpen={invoiceModalState.type === 'uploadInvoice'} onClose={() => setInvoiceModalState(null)} order={invoiceModalState.order as Order} onSubmit={async (file: File) => {
                        const fileToBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = e => rej(e); });
                        const base64Data = await fileToBase64(file);
                        return handleAdminSubmit('handleBulkUploadIssuedInvoices', { filesData: JSON.stringify([{ orderNumber: invoiceModalState.order['Số đơn hàng'], base64Data, mimeType: file.type, fileName: file.name }])}, 'Đã tải lên hóa đơn thành công.');
                    }} />
                    <ActionModal isOpen={invoiceModalState.type === 'cancel'} onClose={() => setInvoiceModalState(null)} title="Hủy Yêu Cầu Xuất Hóa Đơn" description="Hành động này sẽ hủy yêu cầu và thông báo cho TVBH." targetId={invoiceModalState.order['Số đơn hàng']} inputs={[{ id: 'reason', label: 'Lý do hủy (bắt buộc)', placeholder: 'VD: Khách hàng đổi ý, sai thông tin...', type: 'textarea' }]} submitText="Xác Nhận Hủy" submitColor="danger" icon="fa-trash-alt" onSubmit={(data: Record<string, string>) => handleAdminSubmit('cancelRequest', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason: data.reason }, 'Đã hủy yêu cầu.')} />
                    <ActionModal isOpen={invoiceModalState.type === 'unmatch'} onClose={() => setInvoiceModalState(null)} title="Hủy Ghép Xe" description="Hủy ghép xe cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} inputs={[{ id: 'reason', label: 'Lý do hủy ghép (bắt buộc)', placeholder: 'VD: Sai thông tin xe...', type: 'textarea' }]} submitText="Xác Nhận Hủy Ghép" submitColor="danger" icon="fa-unlink" onSubmit={(data: Record<string, string>) => handleAdminSubmit('unmatchOrder', { orderNumber: invoiceModalState.order['Số đơn hàng'], reason: data.reason }, 'Đã hủy ghép xe.', 'both')} />
                    <ActionModal isOpen={invoiceModalState.type === 'resend'} onClose={() => setInvoiceModalState(null)} title="Gửi Lại Email" description="Gửi lại email thông báo cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Gửi Lại" submitColor="primary" icon="fa-paper-plane" onSubmit={() => handleAdminSubmit('resendEmail', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), emailType: 'invoice_issued' }, 'Đã gửi lại email.')} />
                    
                    {/* VC Actions */}
                    <ActionModal isOpen={invoiceModalState.type === 'approveVc'} onClose={() => setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu VC" description="Xác nhận phê duyệt yêu cầu cấp VinClub cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-circle" onSubmit={() => handleAdminSubmit('approveVcRequest', { orderNumber: invoiceModalState.order['Số đơn hàng'] }, 'Đã phê duyệt yêu cầu VC.')} />
                    <RequestWithImageModal isOpen={invoiceModalState.type === 'rejectVc'} onClose={() => setInvoiceModalState(null)} title="Từ Chối Yêu Cầu VC" orderNumber={invoiceModalState.order['Số đơn hàng']} reasonLabel="Lý do từ chối (bắt buộc):" onSubmit={(reason: string, images: string[]) => handleAdminSubmit('rejectVcRequest', { orderNumber: invoiceModalState.order['Số đơn hàng'], reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã từ chối yêu cầu VC.')} icon="fa-ban" theme="danger" />
                </>
            )}
            <ActionModal isOpen={adminModal === 'archive'} onClose={() => setAdminModal(null)} title="Lưu Trữ Hóa Đơn" description="Lưu trữ hóa đơn đã xuất của tháng trước sang một sheet riêng." submitText="Xác Nhận Lưu Trữ" submitColor="primary" icon="fa-archive" onSubmit={() => handleAdminSubmit('archiveInvoicedOrdersMonthly', {}, 'Đã lưu trữ hóa đơn thành công.', 'history')} />
            <ActionModal isOpen={adminModal === 'addCar'} onClose={() => setAdminModal(null)} title="Thêm Xe Mới vào Kho" description="Hệ thống sẽ tự động tra cứu thông tin xe từ số VIN." inputs={[{ id: 'vin', label: 'Số VIN (17 ký tự)', placeholder: 'Nhập 17 ký tự VIN...', isVIN: true }]} submitText="Thêm Xe" submitColor="primary" icon="fa-plus-circle" onSubmit={(data: Record<string, string>) => handleAdminSubmit('findAndAddCarByVin', { vin: data.vin }, 'Thêm xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'deleteCar'} onClose={() => setAdminModal(null)} title="Xóa Xe Khỏi Kho" description="Xe sẽ bị ẩn khỏi kho và ghi vào nhật ký xóa. Có thể phục hồi lại sau." inputs={[{ id: 'vinToDelete', label: 'Số VIN cần xóa (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }, { id: 'reason', label: 'Lý do xóa (bắt buộc)', placeholder: 'VD: Xe bán lô, xe điều chuyển...', type: 'textarea' }]} submitText="Xác Nhận Xóa" submitColor="danger" icon="fa-trash-alt" onSubmit={(data: Record<string, string>) => handleAdminSubmit('deleteCarFromStockLogic', data, 'Đã xóa xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'restoreCar'} onClose={() => setAdminModal(null)} title="Phục Hồi Xe Đã Xóa" description="Xe sẽ được phục hồi về trạng thái 'Chưa ghép' và hiển thị lại trong kho." inputs={[{ id: 'vinToRestore', label: 'Số VIN cần phục hồi (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }]} submitText="Phục Hồi Xe" submitColor="primary" icon="fa-undo" onSubmit={(data: Record<string, string>) => handleAdminSubmit('restoreCarToStockLogic', data, 'Đã phục hồi xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'deleteOrder'} onClose={() => setAdminModal(null)} title="Xóa Đơn Hàng" description="CẢNH BÁO: Đơn hàng sẽ bị xóa vĩnh viễn và chuyển vào mục 'Đã Hủy'." inputs={[{ id: 'orderNumber', label: 'Nhập Số đơn hàng để xác nhận', placeholder: 'Ví dụ: SO-123456...' }]} submitText="Tôi hiểu, Xóa Đơn Hàng" submitColor="danger" icon="fa-times-circle" onSubmit={(data: Record<string, string>) => handleAdminSubmit('deleteOrderLogic', data, 'Đã xóa đơn hàng thành công.', 'history')} />
            <ActionModal isOpen={adminModal === 'revertOrder'} onClose={() => setAdminModal(null)} title="Hoàn Tác Trạng Thái" description="Khôi phục lại trạng thái cuối cùng của đơn hàng trong nhật ký." inputs={[{ id: 'orderNumber', label: 'Nhập Số đơn hàng cần hoàn tác', placeholder: 'Ví dụ: N31913-VSO-25-08-0019' }]} submitText="Thực Hiện Hoàn Tác" submitColor="primary" icon="fa-history" onSubmit={(data: Record<string, string>) => handleAdminSubmit('revertOrderStatus', data, 'Đã hoàn tác trạng thái đơn hàng.', 'history')} />
            <OrderTimelineModal isOpen={adminModal === 'timeline'} onClose={() => setAdminModal(null)} />
            <BulkInvoiceUploadModal isOpen={adminModal === 'bulkUpload'} onClose={() => setAdminModal(null)} onSuccess={() => { refetchHistory(); setAdminModal(null); }} showToast={showToast} hideToast={hideToast} />
        </div>
    );
};

export default AdminView;