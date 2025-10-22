import React, { useState, useMemo, useRef, useEffect } from 'react';
import 'moment/locale/vi';
import { Order, SortConfig, StockVehicle, ActionType } from '../types';
import Pagination from './ui/Pagination';
import AdminInvoiceTable from './admin/AdminInvoiceTable';
import ActionModal from './admin/ActionModal';
import { RequestWithImageModal, UploadInvoiceModal } from './admin/AdminActionModals';
import OrderTimelineModal from './admin/OrderTimelineModal';
import SuggestionModal from './admin/SuggestionModal';
import BulkUploadModal from './admin/BulkUploadModal';
import * as apiService from '../services/apiService';
import Filters, { DropdownFilterConfig } from './ui/Filters';
import MultiSelectDropdown from './ui/MultiSelectDropdown';

const PAGE_SIZE = 15;

type User = { name: string, role: string, username: string };

// FIX: Added ImageSource interface to resolve type errors.
interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

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
    // FIX: Corrected the signature for onOpenImagePreview to match the application's standard.
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
}

type ModalState = {
    type: ActionType;
    order: Order;
} | null;

type AdminModalType = 'archive' | 'addCar' | 'deleteCar' | 'restoreCar' | 'deleteOrder' | 'revertOrder' | 'timeline' | 'addUser';
type AdminSubView = 'invoices' | 'pending' | 'paired' | 'phongkd';

const AdminView: React.FC<AdminViewProps> = ({ showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, allOrders, xuathoadonData, stockData, teamData, allUsers, isLoadingXuathoadon, errorXuathoadon }) => {
    const [adminView, setAdminView] = useState<AdminSubView>('invoices');
    
    // State for sorting and pagination for each tab
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    
    const [pendingSortConfig, setPendingSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [pendingCurrentPage, setPendingCurrentPage] = useState(1);

    const [pairedSortConfig, setPairedSortConfig] = useState<SortConfig | null>({ key: 'Thời gian ghép', direction: 'desc' });
    const [pairedCurrentPage, setPairedCurrentPage] = useState(1);
    
    // State for filtering
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [invoiceFilters, setInvoiceFilters] = useState<{ tvbh: string[], dongXe: string[], trangThai: string[] }>({ tvbh: [], dongXe: [], trangThai: [] });
    const [pendingFilters, setPendingFilters] = useState<{ tvbh: string[], dongXe: string[] }>({ tvbh: [], dongXe: [] });
    const [pairedFilters, setPairedFilters] = useState<{ tvbh: string[], dongXe: string[] }>({ tvbh: [], dongXe: [] });


    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [invoiceModalState, setInvoiceModalState] = useState<ModalState>(null);
    const [suggestionModalState, setSuggestionModalState] = useState<{ order: Order; cars: StockVehicle[] } | null>(null);
    const [adminModal, setAdminModal] = useState<AdminModalType | null>(null);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    
    // New state for Bulk Upload Modal
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);

    // Team management modal state
    const [editingTeam, setEditingTeam] = useState<{ leader: string; members: string[] } | null>(null);
    const [isAddingNewTeam, setIsAddingNewTeam] = useState(false);

    const addUserInputs = useMemo(() => [
        { id: 'fullName', label: 'Họ và Tên', placeholder: 'VD: Nguyễn Văn A', type: 'text' as const },
        { id: 'email', label: 'Email', placeholder: 'VD: an.nguyen@email.com', type: 'text' as const },
    ], []);
    
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
        }
        
        setCurrentPage(1);
        setPendingCurrentPage(1);
        setPairedCurrentPage(1);
    };

    const handleReset = () => {
        if (adminView === 'invoices') {
            setInvoiceFilters({ tvbh: [], dongXe: [], trangThai: [] });
        } else if (adminView === 'pending') {
            setPendingFilters({ tvbh: [], dongXe: [] });
        } else if (adminView === 'paired') {
            setPairedFilters({ tvbh: [], dongXe: [] });
        }
        setCurrentPage(1);
        setPendingCurrentPage(1);
        setPairedCurrentPage(1);
    };


    const { 
        invoiceRequests, 
        pendingData,
        pairedData,
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
                    mergedOrder["Kết quả"] = correspondingOrder["Kết quả"] || 'Không rõ';
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

        const applyFilters = (data: Order[], filters: { tvbh?: string[], dongXe?: string[], trangThai?: string[] }, view: AdminSubView) => {
            return data.filter(row => {
                const tvbhMatch = !filters.tvbh || filters.tvbh.length === 0 || filters.tvbh.includes(row['Tên tư vấn bán hàng']);
                const dongXeMatch = !filters.dongXe || filters.dongXe.length === 0 || filters.dongXe.includes(row['Dòng xe']);
                
                let trangThaiMatch = true;
                if (view === 'invoices' && filters.trangThai) {
                    trangThaiMatch = filters.trangThai.length === 0 || filters.trangThai.includes((row as any)['Trạng thái xử lý']);
                }
                
                return tvbhMatch && dongXeMatch && trangThaiMatch;
            });
        };

        const filteredInvoices = applyFilters(processedInvoices, invoiceFilters, 'invoices');
        const filteredPending = applyFilters(allPending, pendingFilters, 'pending');
        const filteredPaired = applyFilters(allPaired, pairedFilters, 'paired');
        
        const applySort = (data: Order[], sortConfig: SortConfig | null) => {
            let sorted = [...data];
            if (sortConfig) {
                 sorted.sort((a, b) => {
                    const aVal = a[sortConfig.key]; const bVal = b[sortConfig.key];
                    if (['Thời gian nhập', 'Thời gian ghép'].includes(String(sortConfig.key))) {
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
            invoiceRequests: applySort(filteredInvoices, sortConfig),
            pendingData: applySort(filteredPending, pendingSortConfig),
            pairedData: applySort(filteredPaired, pairedSortConfig),
            suggestionsMap: suggestions,
            filterOptions: {
                invoices: getFilterOptions(processedInvoices, ['Tên tư vấn bán hàng', 'Dòng xe', 'Kết quả']),
                pending: getFilterOptions(allPending, ['Tên tư vấn bán hàng', 'Dòng xe']),
                paired: getFilterOptions(allPaired, ['Tên tư vấn bán hàng', 'Dòng xe']),
            }
        };
    }, [allOrders, xuathoadonData, stockData, sortConfig, pendingSortConfig, pairedSortConfig, invoiceFilters, pendingFilters, pairedFilters]);

    const paginatedInvoices = useMemo(() => invoiceRequests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE), [invoiceRequests, currentPage]);
    const paginatedPendingData = useMemo(() => pendingData.slice((pendingCurrentPage - 1) * PAGE_SIZE, pendingCurrentPage * PAGE_SIZE), [pendingData, pendingCurrentPage]);
    const paginatedPairedData = useMemo(() => pairedData.slice((pairedCurrentPage - 1) * PAGE_SIZE, pairedCurrentPage * PAGE_SIZE), [pairedData, pairedCurrentPage]);
    
    const totalInvoicePages = Math.ceil(invoiceRequests.length / PAGE_SIZE);
    const totalPendingPages = Math.ceil(pendingData.length / PAGE_SIZE);
    const totalPairedPages = Math.ceil(pairedData.length / PAGE_SIZE);

    const handleAdminSubmit = async (
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
            return true;
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Đã xảy ra lỗi.";
            showToast('Thao tác thất bại', message, 'error');
            return false;
        }
    };
    
    const handleAction = (type: ActionType, order: Order) => {
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
            case 'phongkd':
                return null;
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
            case 'phongkd': {
                return <TeamManagementComponent 
                    teamData={teamData} 
                    allUsers={allUsers}
                    onEditTeam={(leader, members) => setEditingTeam({ leader, members })}
                    onAddNewTeam={() => setIsAddingNewTeam(true)}
                    onDeleteTeam={handleDeleteTeam}
                />;
            }
            default: return null;
        }
    };
    
    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex flex-col h-full">
                 <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 flex items-center gap-2 mb-4">
                    <div className="admin-tabs-container flex items-center border border-border-primary rounded-lg bg-surface-ground p-0.5 overflow-x-auto">
                        {(['invoices', 'pending', 'paired', 'phongkd'] as AdminSubView[]).map(view => {
                            const labels: Record<AdminSubView, string> = { invoices: 'Xử Lý Hóa Đơn', pending: 'Chờ Ghép', paired: 'Đã Ghép', phongkd: 'Phòng KD' };
                            const counts: Record<AdminSubView, number> = { invoices: invoiceRequests.length, pending: pendingData.length, paired: pairedData.length, phongkd: Object.keys(teamData).length };
                            return ( <button key={view} onClick={() => setAdminView(view)} className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${adminView === view ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`} > {labels[view]} <span className="text-xs font-mono ml-1 px-1.5 py-0.5 rounded-full bg-black/5 text-black/50">{counts[view]}</span> </button> );
                        })}
                    </div>
                    <div className="flex-grow"></div>
                     <button onClick={() => setIsFilterPanelOpen(p => !p)} title="Lọc dữ liệu" className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all ${isFilterPanelOpen ? '!bg-surface-accent !text-accent-primary' : ''} ${adminView === 'phongkd' ? 'hidden' : ''}`}>
                        <i className="fas fa-filter"></i>
                    </button>
                    <button 
                        onClick={async () => {
                            showToast('Đang làm mới...', 'Làm mới dữ liệu từ máy chủ.', 'loading');
                            await Promise.all([refetchHistory(true), refetchXuathoadon(true), refetchStock(true), refetchAdminData(true)]);
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
                    <ActionModal isOpen={invoiceModalState.type === 'pendingSignature'} onClose={() => setInvoiceModalState(null)} title="Chuyển Trạng Thái" description="Chuyển đơn hàng sang 'Chờ Ký Hóa Đơn'?" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={() => handleAdminSubmit('markAsPendingSignature', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]) }, 'Đã chuyển trạng thái.')} />
                    <UploadInvoiceModal isOpen={invoiceModalState.type === 'uploadInvoice'} onClose={() => setInvoiceModalState(null)} order={invoiceModalState.order as Order} onSubmit={async (file: File) => {
                        const fileToBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = e => rej(e); });
                        const base64Data = await fileToBase64(file);
                        return handleAdminSubmit('handleBulkUploadIssuedInvoices', { filesData: JSON.stringify([{ orderNumber: invoiceModalState.order['Số đơn hàng'], base64Data, mimeType: file.type, fileName: file.name }])}, 'Đã tải lên hóa đơn thành công.');
                    }} />
                    <ActionModal isOpen={invoiceModalState.type === 'cancel'} onClose={() => setInvoiceModalState(null)} title="Hủy Yêu Cầu Xuất Hóa Đơn" description="Hành động này sẽ hủy yêu cầu và thông báo cho TVBH." targetId={invoiceModalState.order['Số đơn hàng']} inputs={[{ id: 'reason', label: 'Lý do hủy (bắt buộc)', placeholder: 'VD: Khách hàng đổi ý, sai thông tin...', type: 'textarea' }]} submitText="Xác Nhận Hủy" submitColor="danger" icon="fa-trash-alt" onSubmit={(data: Record<string, string>) => handleAdminSubmit('cancelRequest', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason: data.reason }, 'Đã hủy yêu cầu.')} />
                    <ActionModal isOpen={invoiceModalState.type === 'unmatch'} onClose={() => setInvoiceModalState(null)} title="Hủy Ghép Xe" description="Hủy ghép xe cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} inputs={[{ id: 'reason', label: 'Lý do hủy ghép (bắt buộc)', placeholder: 'VD: Sai thông tin xe...', type: 'textarea' }]} submitText="Xác Nhận Hủy Ghép" submitColor="danger" icon="fa-unlink" onSubmit={(data: Record<string, string>) => handleAdminSubmit('unmatchOrder', { orderNumber: invoiceModalState.order['Số đơn hàng'], reason: data.reason }, 'Đã hủy ghép xe.', 'both')} />
                    <ActionModal isOpen={invoiceModalState.type === 'resend'} onClose={() => setInvoiceModalState(null)} title="Gửi Lại Email" description="Gửi lại email thông báo cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Gửi Lại" submitColor="primary" icon="fa-paper-plane" onSubmit={() => handleAdminSubmit('resendEmail', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), emailType: 'invoice_issued' }, 'Đã gửi lại email.')} />
                </>
            )}
            <ActionModal isOpen={adminModal === 'archive'} onClose={() => setAdminModal(null)} title="Lưu Trữ Hóa Đơn" description="Lưu trữ hóa đơn đã xuất của tháng trước sang một sheet riêng." submitText="Xác Nhận Lưu Trữ" submitColor="primary" icon="fa-archive" onSubmit={() => handleAdminSubmit('archiveInvoicedOrdersMonthly', {}, 'Đã lưu trữ hóa đơn thành công.', 'history')} />
            <ActionModal isOpen={adminModal === 'addCar'} onClose={() => setAdminModal(null)} title="Thêm Xe Mới vào Kho" description="Hệ thống sẽ tự động tra cứu thông tin xe từ số VIN." inputs={[{ id: 'vin', label: 'Số VIN (17 ký tự)', placeholder: 'Nhập 17 ký tự VIN...', isVIN: true }]} submitText="Thêm Xe" submitColor="primary" icon="fa-plus-circle" onSubmit={(data: Record<string, string>) => handleAdminSubmit('findAndAddCarByVin', { vin: data.vin }, 'Thêm xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'deleteCar'} onClose={() => setAdminModal(null)} title="Xóa Xe Khỏi Kho" description="Xe sẽ bị ẩn khỏi kho và ghi vào nhật ký xóa. Có thể phục hồi lại sau." inputs={[{ id: 'vinToDelete', label: 'Số VIN cần xóa (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }, { id: 'reason', label: 'Lý do xóa (bắt buộc)', placeholder: 'VD: Xe bán lô, xe điều chuyển...', type: 'textarea' }]} submitText="Xác Nhận Xóa" submitColor="danger" icon="fa-trash-alt" onSubmit={(data: Record<string, string>) => handleAdminSubmit('deleteCarFromStockLogic', data, 'Đã xóa xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'restoreCar'} onClose={() => setAdminModal(null)} title="Phục Hồi Xe Đã Xóa" description="Xe sẽ được phục hồi về trạng thái 'Chưa ghép' và hiển thị lại trong kho." inputs={[{ id: 'vinToRestore', label: 'Số VIN cần phục hồi (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }]} submitText="Phục Hồi Xe" submitColor="primary" icon="fa-undo" onSubmit={(data: Record<string, string>) => handleAdminSubmit('restoreCarToStockLogic', data, 'Đã phục hồi xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'addUser'} onClose={() => setAdminModal(null)} title="Thêm Nhân Viên Mới" description="Thêm một tài khoản nhân viên mới. Hệ thống sẽ tự động tạo tên đăng nhập, mật khẩu và gửi email thông báo." inputs={addUserInputs} submitText="Thêm & Gửi Email" submitColor="primary" icon="fa-user-plus" onSubmit={(data) => handleAdminSubmit('addUser', data, `Đã tạo tài khoản cho ${data.fullName} và gửi email.`, 'admin')} />
            <ActionModal isOpen={adminModal === 'deleteOrder'} onClose={() => setAdminModal(null)} title="Xóa Đơn Hàng" description="CẢNH BÁO: Đơn hàng sẽ bị xóa vĩnh viễn và chuyển vào mục 'Đã Hủy'." inputs={[{ id: 'orderNumber', label: 'Nhập Số đơn hàng để xác nhận', placeholder: 'Ví dụ: SO-123456...' }]} submitText="Tôi hiểu, Xóa Đơn Hàng" submitColor="danger" icon="fa-times-circle" onSubmit={(data: Record<string, string>) => handleAdminSubmit('deleteOrderLogic', data, 'Đã xóa đơn hàng thành công.', 'history')} />
            <ActionModal isOpen={adminModal === 'revertOrder'} onClose={() => setAdminModal(null)} title="Hoàn Tác Trạng Thái" description="Khôi phục lại trạng thái cuối cùng của đơn hàng trong nhật ký." inputs={[{ id: 'orderNumber', label: 'Nhập Số đơn hàng cần hoàn tác', placeholder: 'Ví dụ: N31913-VSO-25-08-0019' }]} submitText="Thực Hiện Hoàn Tác" submitColor="primary" icon="fa-history" onSubmit={(data: Record<string, string>) => handleAdminSubmit('revertOrderStatus', data, 'Đã hoàn tác trạng thái đơn hàng.', 'history')} />
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
    allUsers: User[];
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


export default AdminView;