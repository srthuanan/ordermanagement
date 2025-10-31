import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import 'moment/locale/vi';
// FIX: Imported VcRequest and VcSortConfig to support the new "Xử Lý VC" view.
import { Order, SortConfig, StockVehicle, VcRequest, ActionType, VcSortConfig } from '../../types';
import Pagination from '../ui/Pagination';
import AdminInvoiceTable from './AdminInvoiceTable';
import AdminVcRequestTable from './AdminVcRequestTable';
import ActionModal from './ActionModal';
import { RequestWithImageModal, UploadInvoiceModal } from './AdminActionModals';
import OrderTimelineModal from './OrderTimelineModal';
import SuggestionModal from './SuggestionModal';
import BulkUploadModal from './BulkUploadModal';
import * as apiService from '../../services/apiService';
import Filters, { DropdownFilterConfig } from '../ui/Filters';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import TotalViewDashboard from '../ui/TotalViewDashboard';


const PAGE_SIZE = 15;

type ActiveView = 'orders' | 'stock' | 'sold' | 'admin' | 'laithu';
// FIX: Defined the User type used for team management.
type User = { name: string; role: string; username: string };

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

// FIX: Added missing props (teamData, allUsers, refetchAdminData) to the interface.
interface AdminViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    refetchHistory: (isSilent?: boolean) => void;
    refetchStock: (isSilent?: boolean) => void;
    refetchXuathoadon: (isSilent?: boolean) => void;
    refetchAdminData: (isSilent?: boolean) => void;
    allOrders: Order[];
    xuathoadonData: Order[];
    stockData: StockVehicle[];
    teamData: Record<string, string[]>;
    allUsers: User[];
    isLoadingXuathoadon: boolean;
    errorXuathoadon: string | null;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    soldData: Order[];
    onNavigateTo?: (view: ActiveView) => void;
    onShowOrderDetails: (order: Order) => void;
}

type ModalState = {
    type: ActionType;
    order: Order | VcRequest;
} | null;

type AdminModalType = 'archive' | 'addCar' | 'deleteCar' | 'restoreCar' | 'deleteOrder' | 'revertOrder' | 'timeline' | 'addUser';
type AdminSubView = 'dashboard' | 'invoices' | 'pending' | 'paired' | 'vc' | 'phongkd';

type DateRange = { start: string; end: string; };

const AdminView: React.FC<AdminViewProps> = ({ showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, allOrders, xuathoadonData, stockData, teamData, allUsers, isLoadingXuathoadon, errorXuathoadon, onOpenImagePreview, onOpenFilePreview, soldData, onNavigateTo, onShowOrderDetails }) => {
    const [adminView, setAdminView] = useState<AdminSubView>('dashboard');
    
    // State for sorting
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [pendingSortConfig, setPendingSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [pairedSortConfig, setPairedSortConfig] = useState<SortConfig | null>({ key: 'Thời gian ghép', direction: 'desc' });
    const [vcSortConfig, setVcSortConfig] = useState<VcSortConfig | null>({ key: 'Thời gian YC', direction: 'desc' });

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pendingCurrentPage, setPendingCurrentPage] = useState(1);
    const [pairedCurrentPage, setPairedCurrentPage] = useState(1);
    const [vcCurrentPage, setVcCurrentPage] = useState(1);
    
    // State for VC tab data
    const [vcRequestsData, setVcRequestsData] = useState<VcRequest[]>([]);
    const [isLoadingVc, setIsLoadingVc] = useState(true);
    const [errorVc, setErrorVc] = useState<string | null>(null);
    
    // State for Filtering
    const [invoiceFilters, setInvoiceFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], trangThai: string[], dateRange?: DateRange }>({ keyword: '', tvbh: [], dongXe: [], trangThai: [] });
    const [pendingFilters, setPendingFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], dateRange?: DateRange }>({ keyword: '', tvbh: [], dongXe: [] });
    const [pairedFilters, setPairedFilters] = useState<{ keyword: string, tvbh: string[], dongXe: string[], dateRange?: DateRange }>({ keyword: '', tvbh: [], dongXe: [] });
    const [vcFilters, setVcFilters] = useState<{ keyword: string, nguoiyc: string[], trangthai: string[], dateRange?: DateRange }>({ keyword: '', nguoiyc: [], trangthai: [] });


    // Other states
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [invoiceModalState, setInvoiceModalState] = useState<ModalState>(null);
    const [bulkActionModal, setBulkActionModal] = useState<{ type: ActionType } | null>(null);
    const [suggestionModalState, setSuggestionModalState] = useState<{ order: Order; cars: StockVehicle[] } | null>(null);
    const [adminModal, setAdminModal] = useState<AdminModalType | null>(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState<{ leader: string; members: string[] } | null>(null);
    const [isAddingNewTeam, setIsAddingNewTeam] = useState(false);

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


     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) { setIsActionMenuOpen(false); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleTabChange = useCallback((view: AdminSubView, filters?: any) => {
        setAdminView(view);
        if (view === 'invoices' && filters?.trangThai) {
            setInvoiceFilters({
                keyword: '',
                tvbh: [],
                dongXe: [],
                trangThai: filters.trangThai,
            });
        }
        setSelectedRows(new Set());
        setCurrentPage(1);
        setPendingCurrentPage(1);
        setPairedCurrentPage(1);
        setVcCurrentPage(1);
    }, []);

     const handleFilterChange = useCallback((newFilters: Partial<{ [key: string]: string | string[] | DateRange | undefined; keyword?: string | undefined; dateRange?: DateRange | undefined; }>) => {
        if (adminView === 'invoices') {
            setInvoiceFilters(prev => ({ ...prev, ...newFilters }));
        } else if (adminView === 'pending') {
            setPendingFilters(prev => ({ ...prev, ...newFilters }));
        } else if (adminView === 'paired') {
            setPairedFilters(prev => ({ ...prev, ...newFilters }));
        } else if (adminView === 'vc') {
            setVcFilters(prev => ({ ...prev, ...newFilters }));
        }
        
        setCurrentPage(1);
        setPendingCurrentPage(1);
        setPairedCurrentPage(1);
        setVcCurrentPage(1);
    }, [adminView]);

    const handleReset = useCallback(() => {
        if (adminView === 'invoices') {
            setInvoiceFilters({ keyword: '', tvbh: [], dongXe: [], trangThai: [] });
        } else if (adminView === 'pending') {
            setPendingFilters({ keyword: '', tvbh: [], dongXe: [] });
        } else if (adminView === 'paired') {
            setPairedFilters({ keyword: '', tvbh: [], dongXe: [] });
        } else if (adminView === 'vc') {
            setVcFilters({ keyword: '', nguoiyc: [], trangthai: [] });
        }
        setCurrentPage(1);
        setPendingCurrentPage(1);
        setPairedCurrentPage(1);
        setVcCurrentPage(1);
    }, [adminView]);

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

        const allVcRequests: VcRequest[] = vcRequestsData.map(vcReq => {
            const correspondingOrder = orderStatusMap.get(vcReq['Số đơn hàng']);
            return {
                ...vcReq,
                VIN: correspondingOrder?.VIN,
            };
        });
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


    const handleAdminSubmit = useCallback(async (
        action: string, 
        params: Record<string, any>, 
        successMessage: string, 
        refetchType: 'history' | 'stock' | 'both' | 'admin' | 'none' = 'history'
    ) => {
        showToast('Đang xử lý...', 'Vui lòng chờ trong giây lát.', 'loading');
        try {
            const result = await apiService.performAdminAction(action, params);
            setInvoiceModalState(null);
            setAdminModal(null);
            setSuggestionModalState(null);
            setSelectedRows(new Set());
            setBulkActionModal(null);
            
            hideToast();
            showToast('Thành công!', result.message || successMessage, 'success');
            
            if (refetchType === 'history' || refetchType === 'both') {
                refetchHistory(true); 
                refetchXuathoadon(true);
            }
            if (refetchType === 'stock' || refetchType === 'both') {
                refetchStock(true);
            }
            if (refetchType === 'admin') {
                refetchAdminData(true);
            }
            if (action.toLowerCase().includes('vcrequest')) {
                fetchVcData(true);
            }
            return true;
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
            showToast('Thao tác thất bại', message, 'error');
            return false;
        }
    }, [showToast, hideToast, refetchHistory, refetchXuathoadon, refetchStock, refetchAdminData, fetchVcData]);

     const handleBulkActionSubmit = useCallback(async (action: ActionType, params: Record<string, any> = {}) => {
        if (selectedRows.size === 0) {
            showToast('Lỗi', 'Không có mục nào được chọn.', 'error');
            return false;
        }
        const orderNumbers = Array.from(selectedRows);
        const successMessage = `Đã thực hiện thao tác cho ${orderNumbers.length} mục.`;

        const apiActionMap: Partial<Record<ActionType, string>> = {
            approve: 'approveSelectedInvoiceRequest',
            pendingSignature: 'markAsPendingSignature',
            supplement: 'requestSupplementForInvoice',
            cancel: 'cancelRequest',
        };
        const apiAction = apiActionMap[action] || action;


        const success = await handleAdminSubmit(
            apiAction,
            { ...params, orderNumbers: JSON.stringify(orderNumbers) },
            successMessage
        );

        if (success) {
            setBulkActionModal(null);
            setSelectedRows(new Set()); // Clear selection on success
        }
        return success;
    }, [selectedRows, handleAdminSubmit, showToast]);

    
    const handleAction = (type: ActionType, order: Order | VcRequest) => {
        const directExecutionActions: ActionType[] = [
            'approve', 'pendingSignature', 'resend', 'approveVc'
        ];

        if (type === 'requestInvoice') {
            showToast('Chức năng đang phát triển', 'Yêu cầu xuất hóa đơn từ Admin Panel sẽ sớm được cập nhật.', 'info');
            return;
        }

        if (directExecutionActions.includes(type)) {
            switch (type) {
                case 'approve':
                    handleAdminSubmit('approveSelectedInvoiceRequest', { orderNumbers: JSON.stringify([order['Số đơn hàng']]) }, 'Đã phê duyệt yêu cầu.');
                    break;
                case 'pendingSignature':
                    handleAdminSubmit('markAsPendingSignature', { orderNumbers: JSON.stringify([order['Số đơn hàng']]) }, 'Đã chuyển trạng thái.');
                    break;
                case 'resend':
                    handleAdminSubmit('resendEmail', { orderNumbers: JSON.stringify([order['Số đơn hàng']]), emailType: 'invoice_issued' }, 'Đã gửi lại email.');
                    break;
                case 'approveVc':
                     handleAdminSubmit('approveVcRequest', { orderNumber: order['Số đơn hàng'] }, 'Đã phê duyệt yêu cầu VC.');
                    break;
            }
        } else if (type === 'manualMatch') {
            const suggestedCars = suggestionsMap.get(order['Số đơn hàng']) || [];
            setSuggestionModalState({ order: order as Order, cars: suggestedCars });
        } else {
            // All other actions need a modal for additional input
            setInvoiceModalState({ type, order });
        }
    };

    const handleDownloadAllVcImages = async (request: VcRequest) => {
        showToast('Đang chuẩn bị...', `Đang chuẩn bị các tệp để tải xuống cho KH: ${request['Tên khách hàng']}.`, 'loading');
    
        const toDownloadableDriveUrl = (url: string): string | null => {
            if (!url || !url.includes('drive.google.com')) return url; // Fallback for non-drive URLs
            const idMatch = url.match(/id=([a-zA-Z0-9_-]{25,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
            if (idMatch && idMatch[1]) {
                return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
            }
            return url; // Fallback if ID extraction fails
        };
    
        let fileUrls: Record<string, string> = {};
        try {
            if (request.FileUrls) fileUrls = JSON.parse(request.FileUrls);
            else if (request['URL hình ảnh']) fileUrls = { unc: request['URL hình ảnh'] };
        } catch (e) {
            hideToast();
            showToast('Lỗi', 'Không thể đọc danh sách tệp.', 'error');
            return;
        }
    
        const downloads = Object.entries(fileUrls);
        if (downloads.length === 0) {
            hideToast();
            showToast('Không có tệp', 'Không tìm thấy tệp nào để tải xuống.', 'info');
            return;
        }
    
        for (let i = 0; i < downloads.length; i++) {
            const [, url] = downloads[i];
            const downloadableUrl = toDownloadableDriveUrl(url);
    
            if (downloadableUrl) {
                // Using an iframe to trigger download is more robust against browser popup blocking
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = downloadableUrl;
                document.body.appendChild(iframe);
    
                // Clean up the iframe after a delay to ensure the download starts
                setTimeout(() => {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 10000); // Remove after 10 seconds
    
                // Wait longer between download attempts to appease browser security
                if (i < downloads.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
    
        hideToast();
        showToast('Hoàn tất', `Đã bắt đầu tải xuống ${downloads.length} tệp.`, 'success');
    };

    const handleShowSuggestions = (order: Order, cars: StockVehicle[]) => {
        setSuggestionModalState({ order, cars });
    };

    const handleConfirmSuggestion = async (orderNumber: string, vin: string) => {
        await handleAdminSubmit( 'manualMatchCar', { orderNumber, vin }, `Đã ghép thành công ĐH ${orderNumber}.`, 'both' );
    };

    const handleSaveTeam = async (newTeamData: Record<string, string[]>) => {
        await handleAdminSubmit('updateTeams', { teams: JSON.stringify(newTeamData) }, 'Cập nhật phòng ban thành công.', 'admin');
        setEditingTeam(null);
        setIsAddingNewTeam(false);
    };

    const handleDeleteTeam = async (leader: string) => {
        const confirmed = window.confirm(`Bạn có chắc chắn muốn giải tán phòng của "${leader}"? Các thành viên sẽ không bị xóa khỏi hệ thống.`);
        if (confirmed) {
            const newTeamData = { ...teamData };
            delete newTeamData[leader];
            await handleSaveTeam(newTeamData);
        }
    };

    // --- Start: Modal Prop Stabilization ---
    const handleCloseAdminModal = useCallback(() => setAdminModal(null), []);
    const handleCloseBulkActionModal = useCallback(() => setBulkActionModal(null), []);

    const addCarInputs = useMemo(() => [{ id: 'vin', label: 'Số VIN (17 ký tự)', placeholder: 'Nhập 17 ký tự VIN...', isVIN: true }], []);
    const deleteCarInputs = useMemo(() => [
        { id: 'vinToDelete', label: 'Số VIN cần xóa (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }, 
        { id: 'reason', label: 'Lý do xóa (bắt buộc)', placeholder: 'VD: Xe bán lô, xe điều chuyển...', type: 'textarea' as const }
    ], []);
    const restoreCarInputs = useMemo(() => [{ id: 'vinToRestore', label: 'Số VIN cần phục hồi (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }], []);
    const deleteOrderInputs = useMemo(() => [{ id: 'orderNumber', label: 'Nhập Số đơn hàng để xác nhận', placeholder: 'Ví dụ: SO-123456...' }], []);
    const revertOrderInputs = useMemo(() => [{ id: 'orderNumber', label: 'Nhập Số đơn hàng cần hoàn tác', placeholder: 'Ví dụ: N31913-VSO-25-08-0019' }], []);
    // FIX: Defined `addUserInputs` to resolve the 'Cannot find name' error.
    const addUserInputs = useMemo(() => [
        { id: 'fullName', label: 'Họ và Tên', placeholder: 'VD: Nguyễn Văn A', type: 'text' as const },
        { id: 'email', label: 'Email', placeholder: 'VD: an.nguyen@email.com', type: 'text' as const },
    ], []);

    const handleArchiveSubmit = useCallback(() => handleAdminSubmit('archiveInvoicedOrdersMonthly', {}, 'Đã lưu trữ hóa đơn thành công.', 'history'), [handleAdminSubmit]);
    const handleAddCarSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('findAndAddCarByVin', { vin: data.vin }, 'Thêm xe thành công.', 'stock'), [handleAdminSubmit]);
    const handleDeleteCarSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('deleteCarFromStockLogic', data, 'Đã xóa xe thành công.', 'stock'), [handleAdminSubmit]);
    const handleRestoreCarSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('restoreCarToStockLogic', data, 'Đã phục hồi xe thành công.', 'stock'), [handleAdminSubmit]);
    const handleAddUserSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('addUser', data, `Đã tạo tài khoản cho ${data.fullName} và gửi email.`, 'admin'), [handleAdminSubmit]);
    const handleDeleteOrderSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('deleteOrderLogic', data, 'Đã xóa đơn hàng thành công.', 'history'), [handleAdminSubmit]);
    const handleRevertOrderSubmit = useCallback((data: Record<string, string>) => handleAdminSubmit('revertOrderStatus', data, 'Đã hoàn tác trạng thái đơn hàng.', 'history'), [handleAdminSubmit]);

    const handleBulkApproveSubmit = useCallback(() => handleBulkActionSubmit('approve'), [handleBulkActionSubmit]);
    const handleBulkPendingSignatureSubmit = useCallback(() => handleBulkActionSubmit('pendingSignature'), [handleBulkActionSubmit]);
    const handleBulkCancelSubmit = useCallback((data: Record<string, any>) => handleBulkActionSubmit('cancel', { reason: data.reason }), [handleBulkActionSubmit]);
    const handleBulkSupplementSubmit = useCallback((reason: string, images: string[]) => handleBulkActionSubmit('supplement', { reason, pastedImagesBase64: JSON.stringify(images) }), [handleBulkActionSubmit]);
    // --- End: Modal Prop Stabilization ---
    
    const adminTools = [
        { title: 'Lưu Trữ Hóa Đơn', icon: 'fa-archive', action: () => setAdminModal('archive') },
        { title: 'Tải Lên HĐ Hàng Loạt', icon: 'fa-file-upload', action: () => setIsBulkUploadModalOpen(true) },
        { title: 'Thêm Xe Mới', icon: 'fa-plus-circle', action: () => setAdminModal('addCar') },
        { title: 'Xóa Xe Khỏi Kho', icon: 'fa-trash-alt', action: () => setAdminModal('deleteCar') },
        { title: 'Phục Hồi Xe', icon: 'fa-undo', action: () => setAdminModal('restoreCar') },
        { title: 'Thêm Nhân Viên', icon: 'fa-user-plus', action: () => setAdminModal('addUser') },
        { title: 'Xóa Đơn Hàng', icon: 'fa-times-circle', action: () => setAdminModal('deleteOrder') },
        { title: 'Hoàn Tác Trạng Thái', icon: 'fa-history', action: () => setAdminModal('revertOrder') },
        { title: 'Tra Cứu Lịch Sử', icon: 'fa-search', action: () => setAdminModal('timeline') },
    ];

    const renderCurrentView = () => {
        if (adminView === 'invoices' && isLoadingXuathoadon && xuathoadonData.length === 0) {
            return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
        }
        if (adminView === 'invoices' && errorXuathoadon) {
            return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu hóa đơn</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{errorXuathoadon}</p><button onClick={() => refetchXuathoadon()} className="mt-6 btn-primary">Thử lại</button></div>;
        }
        if (adminView === 'vc' && isLoadingVc && vcRequestsData.length === 0) {
            return <div className="flex items-center justify-center h-full"><i className="fas fa-spinner fa-spin text-4xl text-accent-primary"></i></div>;
        }
        if (adminView === 'vc' && errorVc) {
            return <div className="flex items-center justify-center h-full text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fas fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải Yêu cầu VC</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{errorVc}</p><button onClick={() => fetchVcData()} className="mt-6 btn-primary">Thử lại</button></div>;
        }

        switch(adminView) {
            case 'dashboard':
                return <TotalViewDashboard 
                    allOrders={allOrders} 
                    stockData={stockData} 
                    soldData={soldData} 
                    teamData={teamData}
                    allUsers={allUsers}
                    onTabChange={handleTabChange}
                    onNavigateTo={onNavigateTo}
                    onShowOrderDetails={onShowOrderDetails}
                />;
            case 'invoices':
            case 'pending':
            case 'paired': {
                 const data = adminView === 'invoices' ? paginatedInvoices : adminView === 'pending' ? paginatedPendingData : paginatedPairedData;
                 const allIds = adminView === 'invoices' ? allInvoiceOrderNumbers : adminView === 'pending' ? allPendingOrderNumbers : allPairedOrderNumbers;
                 const totalPages = adminView === 'invoices' ? totalInvoicePages : adminView === 'pending' ? totalPendingPages : totalPairedPages;
                 const activePage = adminView === 'invoices' ? currentPage : adminView === 'pending' ? pendingCurrentPage : pairedCurrentPage;
                 const onPageChange = adminView === 'invoices' ? setCurrentPage : adminView === 'pending' ? setPendingCurrentPage : setPairedCurrentPage;
                 const sortConf = adminView === 'invoices' ? sortConfig : adminView === 'pending' ? pendingSortConfig : pairedSortConfig;
                 const onSortHandler = adminView === 'invoices' ? setSortConfig : adminView === 'pending' ? setPendingSortConfig : setPairedSortConfig;

                 return (
                     <div key={adminView} className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0 animate-fade-in">
                        {selectedRows.size > 0 && <BulkActionBar view={adminView} />}
                        <div className="flex-grow overflow-auto relative">
                            <AdminInvoiceTable viewType={adminView} orders={data} sortConfig={sortConf} onSort={(sortKey: keyof Order) => onSortHandler((p: SortConfig | null) => ({ key: sortKey, direction: p?.key === sortKey && p.direction === 'asc' ? 'desc' : 'asc' }))} selectedRows={selectedRows} onToggleRow={(id: string) => setSelectedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })} onToggleAllRows={() => handleToggleAll(allIds)} onAction={handleAction} showToast={showToast} suggestions={suggestionsMap} onShowSuggestions={handleShowSuggestions} onOpenFilePreview={onOpenFilePreview} />
                        </div>
                        {totalPages > 0 && <Pagination currentPage={activePage} totalPages={totalPages} onPageChange={onPageChange} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                    </div>
                 );
            }
             case 'vc': {
                return (
                    <div key={adminView} className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0 animate-fade-in">
                        {selectedRows.size > 0 && <BulkActionBar view={adminView} />}
                        <div className="flex-grow overflow-auto relative">
                            <AdminVcRequestTable 
                                requests={paginatedVcData} 
                                sortConfig={vcSortConfig}
                                onSort={(key: keyof VcRequest) => setVcSortConfig((p: VcSortConfig | null) => ({ key, direction: p?.key === key && p.direction === 'asc' ? 'desc' : 'asc' }))}
                                selectedRows={selectedRows} 
                                onToggleRow={(id: string) => setSelectedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })} 
                                onToggleAllRows={() => handleToggleAll(allVcOrderNumbers)} 
                                onAction={handleAction} 
                                showToast={showToast} 
                                onOpenImagePreview={onOpenImagePreview}
                                onDownloadAll={handleDownloadAllVcImages}
                            />
                        </div>
                         {totalVcPages > 0 && <Pagination currentPage={vcCurrentPage} totalPages={totalVcPages} onPageChange={setVcCurrentPage} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                    </div>
                );
            }
            case 'phongkd': {
                return (
                    <div key={adminView} className="animate-fade-in">
                        <TeamManagementComponent
                            teamData={teamData}
                            onEditTeam={(leader, members) => setEditingTeam({ leader, members })}
                            onAddNewTeam={() => setIsAddingNewTeam(true)}
                            onDeleteTeam={handleDeleteTeam}
                        />
                    </div>
                );
            }
            default: return null;
        }
    };

    const bulkActionsForView: Record<AdminSubView, { type: ActionType; label: string; icon: string; isDanger?: boolean }[]> = {
        dashboard: [],
        invoices: [
            { type: 'approve', label: 'Phê duyệt', icon: 'fa-check-double' },
            { type: 'supplement', label: 'Y/C Bổ sung', icon: 'fa-exclamation-triangle' },
            { type: 'pendingSignature', label: 'Chuyển sang "Chờ ký HĐ"', icon: 'fa-signature' },
            { type: 'cancel', label: 'Hủy Yêu cầu', icon: 'fa-trash-alt', isDanger: true },
        ],
        pending: [
            { type: 'cancel', label: 'Hủy Yêu cầu (Xóa)', icon: 'fa-trash-alt', isDanger: true },
        ],
        paired: [], // No bulk actions for paired view based on GAS
        vc: [],     // No bulk actions for VC view based on GAS
        phongkd: [],
    };
    
    const BulkActionBar = ({ view }: { view: AdminSubView }) => {
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const menuRef = useRef<HTMLDivElement>(null);
    
        useEffect(() => {
            const handleClickOutside = (event: MouseEvent) => {
                if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                    setIsMenuOpen(false);
                }
            };
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }, []);
    
        const actions = bulkActionsForView[view];
        if (actions.length === 0) return null;
    
        return (
            <div className="relative z-10 p-3 border-b border-border-primary flex items-center justify-between bg-surface-accent animate-fade-in-down">
                <span className="text-sm font-semibold text-text-primary">
                    Đã chọn: <span className="font-bold text-accent-primary">{selectedRows.size}</span>
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedRows(new Set())} className="btn-secondary !text-xs !py-1 !px-2.5">
                        <i className="fas fa-times mr-1"></i> Bỏ chọn
                    </button>
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setIsMenuOpen(p => !p)} className="btn-primary !text-xs !py-1 !px-3 flex items-center">
                            Thao tác hàng loạt <i className={`fas fa-chevron-down ml-2 text-xs transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}></i>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-1 w-52 bg-surface-card border rounded-lg shadow-lg z-20 p-1">
                                {actions.map(action => (
                                    <button 
                                        key={action.type} 
                                        onClick={() => { setBulkActionModal({ type: action.type as ActionType }); setIsMenuOpen(false); }}
                                        className={`flex items-center gap-3 w-full text-left px-3 py-2 text-sm font-medium rounded-md ${action.isDanger ? 'text-danger hover:bg-danger-bg' : 'text-text-primary hover:bg-surface-hover'}`}
                                    >
                                        <i className={`fas ${action.icon} fa-fw w-5 text-center`}></i>
                                        <span>{action.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };
    
    const renderFilterPanel = () => {
        let currentFilters: any;
        let dropdownConfigs: DropdownFilterConfig[] = [];
        let searchPlaceholder = "Tìm kiếm...";
        let totalCount = 0;
        let onRefresh = () => {};
        let isLoading = false;

        switch(adminView) {
            case 'invoices':
                currentFilters = invoiceFilters;
                dropdownConfigs = [
                    { id: 'admin-filter-tvbh', key: 'tvbh', label: 'TVBH', options: filterOptions.invoices['Tên tư vấn bán hàng'], icon: 'fa-user-tie'},
                    { id: 'admin-filter-dongxe', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.invoices['Dòng xe'], icon: 'fa-car'},
                    { id: 'admin-filter-status', key: 'trangThai', label: 'Trạng Thái', options: filterOptions.invoices['Kết quả'], icon: 'fa-tag'}
                ];
                searchPlaceholder="Tìm SĐH, Tên KH, VIN...";
                totalCount = invoiceRequests.length;
                onRefresh = () => refetchXuathoadon();
                isLoading = isLoadingXuathoadon;
                break;
            case 'pending':
                currentFilters = pendingFilters;
                dropdownConfigs = [
                    { id: 'admin-filter-tvbh-pending', key: 'tvbh', label: 'TVBH', options: filterOptions.pending['Tên tư vấn bán hàng'], icon: 'fa-user-tie'},
                    { id: 'admin-filter-dongxe-pending', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.pending['Dòng xe'], icon: 'fa-car'}
                ];
                searchPlaceholder="Tìm SĐH, Tên KH...";
                totalCount = pendingData.length;
                onRefresh = () => refetchHistory();
                isLoading = false;
                break;
            case 'paired':
                 currentFilters = pairedFilters;
                dropdownConfigs = [
                    { id: 'admin-filter-tvbh-paired', key: 'tvbh', label: 'TVBH', options: filterOptions.paired['Tên tư vấn bán hàng'], icon: 'fa-user-tie'},
                    { id: 'admin-filter-dongxe-paired', key: 'dongXe', label: 'Dòng Xe', options: filterOptions.paired['Dòng xe'], icon: 'fa-car'}
                ];
                searchPlaceholder="Tìm SĐH, Tên KH, VIN...";
                totalCount = pairedData.length;
                onRefresh = () => refetchHistory();
                isLoading = false;
                break;
             case 'vc':
                currentFilters = vcFilters;
                dropdownConfigs = [
                    { id: 'admin-filter-nguoiyc-vc', key: 'nguoiyc', label: 'Người YC', options: filterOptions.vc['Người YC'], icon: 'fa-user-tie'},
                    { id: 'admin-filter-trangthai-vc', key: 'trangthai', label: 'Trạng Thái', options: filterOptions.vc['Trạng thái xử lý'], icon: 'fa-tag'}
                ];
                searchPlaceholder="Tìm SĐH, Tên KH, VIN, Mã DMS...";
                totalCount = vcRequests.length;
                onRefresh = () => fetchVcData();
                isLoading = isLoadingVc;
                break;
            default:
                return null;
        }

        return (
             <Filters 
                filters={currentFilters}
                onFilterChange={handleFilterChange}
                onReset={handleReset}
                dropdowns={dropdownConfigs}
                searchPlaceholder={searchPlaceholder}
                totalCount={totalCount}
                onRefresh={onRefresh}
                isLoading={isLoading}
                hideSearch={false}
                size="compact"
                plain={true}
            />
        );
    };

    const tabs: AdminSubView[] = ['dashboard', 'invoices', 'pending', 'paired', 'vc', 'phongkd'];
    const labels: Record<AdminSubView, string> = { dashboard: 'Tổng Quan', invoices: 'Xử Lý Hóa Đơn', pending: 'Chờ Ghép', paired: 'Đã Ghép', vc: 'Xử Lý VC', phongkd: 'Phòng KD' };
    const counts: Record<AdminSubView, number> = { dashboard: 0, invoices: invoiceRequests.length, pending: pendingData.length, paired: pairedData.length, vc: vcRequests.length, phongkd: Object.keys(teamData).length };
    
    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary mb-4">
                <div className="p-3 flex items-center justify-between gap-2 flex-nowrap">
                    <div className="admin-tabs-container flex items-center border border-border-primary rounded-lg bg-surface-ground p-0.5 overflow-x-auto">
                        {tabs.map(view => (
                            <button
                                key={view}
                                onClick={() => setAdminView(view)}
                                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${adminView === view ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                            >
                                {labels[view]}
                                {view !== 'dashboard' && <span className="text-xs font-mono ml-1 px-1.5 py-0.5 rounded-full bg-black/5 text-black/50">{counts[view]}</span>}
                            </button>
                        ))}
                    </div>
                    <div className="relative" ref={actionMenuRef}>
                        <button onClick={() => setIsActionMenuOpen(prev => !prev)} title="Thao Tác Nhanh" className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all">
                            <i className="fas fa-bolt text-lg text-accent-primary"></i>
                        </button>
                        {isActionMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-surface-card border shadow-lg rounded-lg z-30 p-1 animate-fade-in-scale-up" style={{ animationDuration: '150ms' }}>
                                {adminTools.map(tool => (
                                    <button key={tool.title} onClick={() => { tool.action(); setIsActionMenuOpen(false); }} className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-md text-text-primary hover:bg-surface-hover">
                                        <i className={`fas ${tool.icon} fa-fw w-5 text-center text-accent-secondary`}></i>
                                        <span>{tool.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                 { adminView !== 'phongkd' && adminView !== 'dashboard' && <div className="p-3 border-t border-border-primary">{renderFilterPanel()}</div> }
            </div>
            
            <div className="flex-grow min-h-0 flex flex-col">
                {renderCurrentView()}
            </div>
            
            {suggestionModalState && <SuggestionModal isOpen={!!suggestionModalState} onClose={() => setSuggestionModalState(null)} order={suggestionModalState.order} suggestedCars={suggestionModalState.cars} onConfirm={handleConfirmSuggestion} />}
            {invoiceModalState && (
                <>
                    {/* Invoice Actions */}
                    <ActionModal isOpen={invoiceModalState.type === 'approve'} onClose={() => setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu" description="Xác nhận phê duyệt yêu cầu xuất hóa đơn cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-double" onSubmit={() => handleAdminSubmit('approveSelectedInvoiceRequest', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]) }, 'Đã phê duyệt yêu cầu.')} />
                    <RequestWithImageModal isOpen={invoiceModalState.type === 'supplement'} onClose={() => setInvoiceModalState(null)} title="Yêu Cầu Bổ Sung" orderNumber={invoiceModalState.order['Số đơn hàng']} reasonLabel="Nội dung yêu cầu (bắt buộc):" onSubmit={(reason: string, images: string[]) => handleAdminSubmit('requestSupplementForInvoice', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã gửi yêu cầu bổ sung.')} icon="fa-exclamation-triangle" theme="warning" />
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

            {/* Bulk Action Modals */}
            {bulkActionModal && (
                <>
                    <ActionModal isOpen={bulkActionModal.type === 'approve'} onClose={handleCloseBulkActionModal} title="Phê duyệt hàng loạt" description={`Xác nhận phê duyệt ${selectedRows.size} yêu cầu đã chọn?`} submitText="Phê duyệt" submitColor="success" icon="fa-check-double" onSubmit={handleBulkApproveSubmit} />
                    <ActionModal isOpen={bulkActionModal.type === 'pendingSignature'} onClose={handleCloseBulkActionModal} title="Chuyển trạng thái hàng loạt" description={`Chuyển ${selectedRows.size} đơn hàng đã chọn sang "Chờ Ký Hóa Đơn"?`} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={handleBulkPendingSignatureSubmit} />
                    <RequestWithImageModal isOpen={bulkActionModal.type === 'supplement'} onClose={handleCloseBulkActionModal} title="Y/C Bổ sung hàng loạt" orderNumber={`${selectedRows.size} đơn hàng`} reasonLabel="Nội dung yêu cầu (bắt buộc):" icon="fa-exclamation-triangle" theme="warning" onSubmit={handleBulkSupplementSubmit} />
                    <ActionModal isOpen={bulkActionModal.type === 'cancel'} onClose={handleCloseBulkActionModal} title="Hủy hàng loạt" description={`Bạn có chắc muốn hủy ${selectedRows.size} yêu cầu đã chọn? Hành động này sẽ chuyển các mục vào phần "Đã Hủy".`} inputs={[{ id: 'reason', label: 'Lý do hủy (bắt buộc)', placeholder: 'Nhập lý do chung cho tất cả...', type: 'textarea' }]} submitText="Xác Nhận Hủy" submitColor="danger" icon="fa-trash-alt" onSubmit={handleBulkCancelSubmit} />
                </>
            )}

            <ActionModal isOpen={adminModal === 'archive'} onClose={handleCloseAdminModal} title="Lưu Trữ Hóa Đơn" description="Lưu trữ hóa đơn đã xuất của tháng trước sang một sheet riêng." submitText="Xác Nhận Lưu Trữ" submitColor="primary" icon="fa-archive" onSubmit={handleArchiveSubmit} />
            <ActionModal isOpen={adminModal === 'addCar'} onClose={handleCloseAdminModal} title="Thêm Xe Mới vào Kho" description="Hệ thống sẽ tự động tra cứu thông tin xe từ số VIN." inputs={addCarInputs} submitText="Thêm Xe" submitColor="primary" icon="fa-plus-circle" onSubmit={handleAddCarSubmit} />
            <ActionModal isOpen={adminModal === 'deleteCar'} onClose={handleCloseAdminModal} title="Xóa Xe Khỏi Kho" description="Xe sẽ bị xóa khỏi trang Kho Xe và thông tin sẽ được lưu vào nhật ký. Có thể phục hồi lại sau bằng chức năng 'Phục Hồi Xe'." inputs={deleteCarInputs} submitText="Xác Nhận Xóa" submitColor="danger" icon="fa-trash-alt" onSubmit={handleDeleteCarSubmit} />
            <ActionModal isOpen={adminModal === 'restoreCar'} onClose={handleCloseAdminModal} title="Phục Hồi Xe Đã Xóa" description="Dựa vào nhật ký xe đã xóa, hệ thống sẽ thêm xe trở lại Kho Xe với trạng thái 'Chưa ghép'." inputs={restoreCarInputs} submitText="Phục Hồi Xe" submitColor="primary" icon="fa-undo" onSubmit={handleRestoreCarSubmit} />
            <ActionModal isOpen={adminModal === 'addUser'} onClose={handleCloseAdminModal} title="Thêm Nhân Viên Mới" description="Thêm một tài khoản nhân viên mới. Hệ thống sẽ tự động tạo tên đăng nhập, mật khẩu và gửi email thông báo." inputs={addUserInputs} submitText="Thêm & Gửi Email" submitColor="primary" icon="fa-user-plus" onSubmit={handleAddUserSubmit} />
            <ActionModal isOpen={adminModal === 'deleteOrder'} onClose={handleCloseAdminModal} title="Xóa Đơn Hàng" description="CẢNH BÁO: Đơn hàng sẽ bị xóa vĩnh viễn và chuyển vào mục 'Đã Hủy'." inputs={deleteOrderInputs} submitText="Tôi hiểu, Xóa Đơn Hàng" submitColor="danger" icon="fa-times-circle" onSubmit={handleDeleteOrderSubmit} />
            <ActionModal isOpen={adminModal === 'revertOrder'} onClose={handleCloseAdminModal} title="Hoàn Tác Trạng Thái" description="Khôi phục lại trạng thái cuối cùng của đơn hàng trong nhật ký." inputs={revertOrderInputs} submitText="Thực Hiện Hoàn Tác" submitColor="primary" icon="fa-history" onSubmit={handleRevertOrderSubmit} />
            
            <OrderTimelineModal isOpen={adminModal === 'timeline'} onClose={() => setAdminModal(null)} />
            <BulkUploadModal
                isOpen={isBulkUploadModalOpen}
                onClose={() => setIsBulkUploadModalOpen(false)}
                showToast={showToast}
                hideToast={hideToast}
                onSuccess={() => {
                    refetchHistory(true);
                    refetchXuathoadon(true);
                }}
            />
            <TeamEditorModal
                isOpen={!!editingTeam || isAddingNewTeam}
                onClose={() => {
                    setEditingTeam(null);
                    setIsAddingNewTeam(false);
                }}
                onSave={handleSaveTeam}
                teamData={teamData}
                allUsers={allUsers}
                editingTeam={editingTeam}
            />
        </div>
    );
};


// --- Team Management Components (nested for simplicity) ---

interface TeamManagementProps {
    teamData: Record<string, string[]>;
    onEditTeam: (leader: string, members: string[]) => void;
    onAddNewTeam: () => void;
    onDeleteTeam: (leader: string) => void;
}

const TeamManagementComponent: React.FC<TeamManagementProps> = ({ teamData, onEditTeam, onAddNewTeam, onDeleteTeam }) => {
    const sortedTeams = useMemo(() => Object.entries(teamData).sort(([leaderA], [leaderB]) => leaderA.localeCompare(leaderB)), [teamData]);

    return (
        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-text-primary">Quản lý Phòng Kinh Doanh</h3>
                <button onClick={onAddNewTeam} className="btn-primary"><i className="fas fa-plus mr-2"></i>Tạo Phòng Mới</button>
            </div>
            {sortedTeams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedTeams.map(([leader, members]) => (
                        <div key={leader} className="bg-surface-ground border border-border-primary rounded-lg p-4 flex flex-col">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs text-text-secondary">Trưởng phòng</p>
                                    <p className="font-bold text-accent-primary">{leader}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => onEditTeam(leader, members)} className="w-8 h-8 rounded-full hover:bg-surface-hover text-text-secondary" title="Chỉnh sửa"><i className="fas fa-pen"></i></button>
                                    <button onClick={() => onDeleteTeam(leader)} className="w-8 h-8 rounded-full hover:bg-danger-bg text-text-secondary hover:text-danger" title="Xóa phòng"><i className="fas fa-trash"></i></button>
                                </div>
                            </div>
                            <div className="border-t border-dashed border-border-secondary my-3"></div>
                            <p className="text-xs text-text-secondary mb-2">Thành viên ({members.length})</p>
                            <div className="space-y-2 flex-grow">
                                {members.length > 0 ? members.map(member => (
                                    <div key={member} className="text-sm text-text-primary bg-white p-2 rounded-md shadow-sm">{member}</div>
                                )) : <p className="text-sm text-text-secondary italic">Chưa có thành viên.</p>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-text-secondary">
                    <i className="fas fa-users-slash fa-3x mb-4"></i>
                    <p>Chưa có phòng kinh doanh nào được thiết lập.</p>
                </div>
            )}
        </div>
    );
};

interface TeamEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newTeamData: Record<string, string[]>) => void;
    teamData: Record<string, string[]>;
    allUsers: User[];
    editingTeam: { leader: string; members: string[] } | null;
}

const TeamEditorModal: React.FC<TeamEditorModalProps> = ({ isOpen, onClose, onSave, teamData, allUsers, editingTeam }) => {
    const [selectedLeader, setSelectedLeader] = useState(editingTeam ? editingTeam.leader : '');
    const [selectedMembers, setSelectedMembers] = useState(editingTeam ? editingTeam.members : []);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedLeader(editingTeam ? editingTeam.leader : '');
            setSelectedMembers(editingTeam ? editingTeam.members : []);
        }
    }, [isOpen, editingTeam]);

    const isNewTeam = !editingTeam;

    const { potentialLeaders, availableMembers } = useMemo(() => {
        const allLeaders = new Set(Object.keys(teamData));
        const allMembers = new Set(Object.values(teamData).flat());
        
        const leaders = allUsers.filter(u => u.role === 'Trưởng Phòng Kinh Doanh' && (!allLeaders.has(u.name) || u.name === editingTeam?.leader));
        const members = allUsers.filter(u => u.role === 'Tư vấn bán hàng' && (!allMembers.has(u.name) || editingTeam?.members.includes(u.name)));

        return { potentialLeaders: leaders.map(u => u.name), availableMembers: members.map(u => u.name) };
    }, [allUsers, teamData, editingTeam]);

    const handleSave = async () => {
        if (!selectedLeader) {
            alert('Vui lòng chọn trưởng phòng.');
            return;
        }
        setIsSubmitting(true);
        const newTeamData = { ...teamData };
        if (isNewTeam) {
            newTeamData[selectedLeader] = selectedMembers;
        } else {
            // If leader name is changed (should not happen with current UI but good practice)
            if (editingTeam.leader !== selectedLeader) {
                delete newTeamData[editingTeam.leader];
            }
            newTeamData[selectedLeader] = selectedMembers;
        }
        await onSave(newTeamData);
        setIsSubmitting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-5 border-b"><h2 className="text-xl font-bold text-text-primary">{isNewTeam ? 'Tạo Phòng Mới' : `Chỉnh Sửa Phòng: ${editingTeam.leader}`}</h2></header>
                <main className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">Trưởng Phòng</label>
                        {isNewTeam ? (
                            <select value={selectedLeader} onChange={e => setSelectedLeader(e.target.value)} className="w-full bg-surface-ground border border-border-primary rounded-lg p-2.5 futuristic-input">
                                <option value="" disabled>Chọn một trưởng phòng</option>
                                {potentialLeaders.map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={selectedLeader} readOnly className="w-full bg-surface-input border border-border-primary rounded-lg p-2.5 futuristic-input cursor-not-allowed" />
                        )}
                    </div>
                    <div>
                         <MultiSelectDropdown 
                            id="team-member-select"
                            label="Thành viên"
                            options={availableMembers}
                            selectedOptions={selectedMembers}
                            onChange={setSelectedMembers}
                            icon="fa-users"
                            displayMode="selection"
                         />
                    </div>
                </main>
                <footer className="p-4 border-t flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button onClick={handleSave} disabled={isSubmitting || !selectedLeader} className="btn-primary">
                        {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                    </button>
                </footer>
            </div>
        </div>
    );
};


export default React.memo(AdminView);