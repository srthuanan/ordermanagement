import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, SortConfig, StockVehicle, ActionType } from '../types';
import Pagination from './ui/Pagination';
import AdminInvoiceTable from './admin/AdminInvoiceTable';
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
}

type ModalState = {
    type: ActionType;
    order: Order;
} | null;

type AdminModalType = 'archive' | 'addCar' | 'deleteCar' | 'restoreCar' | 'deleteOrder' | 'revertOrder' | 'timeline' | 'bulkUpload';
type AdminSubView = 'invoices' | 'pending' | 'paired';

const AdminView: React.FC<AdminViewProps> = ({ showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, allOrders, xuathoadonData, stockData }) => {
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

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                const mergedOrder: Order = { "Số đơn hàng": orderNumber, "Tên khách hàng": invoice['TÊN KHÁCH HÀNG'], "Dòng xe": invoice['DÒNG XE'], "Phiên bản": invoice['PHIÊN BẢN'], "Ngoại thất": invoice['NGOẠI THẤT'], "Nội thất": invoice['NỘI THẤT'], "Thời gian nhập": invoice['NGÀY YÊU CẦU XHĐ'], "Tên tư vấn bán hàng": invoice['TƯ VẤN BÁN HÀNG'], "Kết quả": 'N/A', "VIN": invoice['SỐ VIN'], "Số động cơ": invoice['SỐ ĐỘNG CƠ'], "LinkHopDong": invoice['URL Hợp Đồng'], "LinkDeNghiXHD": invoice['URL Đề Nghị XHĐ'], "LinkHoaDonDaXuat": invoice['URL Hóa Đơn Đã Xuất'], };
                if (correspondingOrder) {
                    mergedOrder["Kết quả"] = correspondingOrder["Trạng thái VC"] || correspondingOrder["Kết quả"] || 'Không rõ';
                    Object.assign(mergedOrder, (({ "Tên khách hàng": a, "Tên tư vấn bán hàng": b, "Dòng xe": c, "Phiên bản": d, VIN: e }) => ({ "Tên khách hàng": a, "Tên tư vấn bán hàng": b, "Dòng xe": c, "Phiên bản": d, VIN: e }))(Object.fromEntries(Object.entries(correspondingOrder).map(([k, v]) => [k, mergedOrder[k as keyof Order] || v]))));
                } else { mergedOrder["Kết quả"] = 'Đã xuất hóa đơn'; }
                (mergedOrder as any)['Trạng thái xử lý'] = mergedOrder["Kết quả"];
                return mergedOrder;
        });

        const allPending = allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase().includes('chưa'));
        const allPaired = allOrders.filter(o => String(o['Kết quả'] || '').toLowerCase() === 'đã ghép');

        // Suggestions logic
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

        // Filtering logic
        const applyFilters = (data: Order[], filters: Record<string, string[]>) => {
            return data.filter(row => {
                const tvbhMatch = filters.tvbh.length === 0 || filters.tvbh.includes(row['Tên tư vấn bán hàng']);
                const dongXeMatch = filters.dongXe.length === 0 || filters.dongXe.includes(row['Dòng xe']);
                
                // FIX: Only apply trangThai filter if it exists in the filter object
                let trangThaiMatch = true; // Default to true
                if (filters.trangThai) { // Check if the property exists
                    trangThaiMatch = filters.trangThai.length === 0 || filters.trangThai.includes((row as any)['Trạng thái xử lý']);
                }
                
                return tvbhMatch && dongXeMatch && trangThaiMatch;
            });
        };
        

        const filteredInvoices = applyFilters(processedInvoices, invoiceFilters);
        const filteredPending = applyFilters(allPending, pendingFilters);
        const filteredPaired = applyFilters(allPaired, pairedFilters);
        
        // Sorting logic
        const applySort = (data: Order[], sortConfig: SortConfig | null) => {
            let sorted = [...data];
            if (sortConfig) {
                 sorted.sort((a, b) => {
                    const aVal = a[sortConfig.key]; const bVal = b[sortConfig.key];
                    if (['Thời gian nhập', 'Thời gian ghép'].includes(String(sortConfig.key))) {
                        const timeA = aVal ? new Date(aVal).getTime() : 0; const timeB = bVal ? new Date(bVal).getTime() : 0;
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

        const getFilterOptions = (data: Order[], keys: (keyof Order)[]) => {
            const options: Record<string, Set<string>> = {};
            keys.forEach(key => options[key as string] = new Set());
            data.forEach(row => {
                keys.forEach(key => {
                    const value = key === 'Kết quả' ? (row as any)['Trạng thái xử lý'] : row[key];
                    if (value) options[key as string].add(value as string);
                });
            });
            const result: Record<string, string[]> = {};
            keys.forEach(key => result[key as string] = Array.from(options[key as string]).sort());
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
        refetchType: 'history' | 'stock' | 'both' = 'history'
    ) => {
        showToast('Đang xử lý...', 'Vui lòng chờ trong giây lát.', 'loading');
        try {
            const result = await apiService.performAdminAction(action, params);
            // Close modals immediately on success
            setInvoiceModalState(null);
            setAdminModal(null);
            setSuggestionModalState(null);
            setSelectedRows(new Set());
            
            // Show success toast and then refetch in the background
            hideToast();
            showToast('Thành công!', result.message || successMessage, 'success');
            
            // Refetch data silently in the background without awaiting
            // This makes the UI feel instantly responsive.
            if (refetchType === 'history' || refetchType === 'both') {
                refetchHistory(true); 
                refetchXuathoadon(true);
            }
            if (refetchType === 'stock' || refetchType === 'both') {
                refetchStock(true);
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
            setSuggestionModalState({ order, cars: suggestedCars });
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
        const currentFilters = adminView === 'invoices' ? invoiceFilters : adminView === 'pending' ? pendingFilters : pairedFilters;
        const currentOptions = filterOptions[adminView];
        // FIX: Replaced the problematic `setFilters` variable with explicit, type-safe state updates.
        // This resolves the TypeScript error by ensuring the correct state setter is always called with the correct data shape.
        const handleFilterChange = (newFilters: Partial<{ tvbh: string[], dongXe: string[], trangThai: string[] }>) => {
            if (adminView === 'invoices') {
                setInvoiceFilters(prev => ({...prev, ...newFilters}));
            } else if (adminView === 'pending') {
                const { trangThai, ...rest } = newFilters;
                setPendingFilters(prev => ({...prev, ...rest}));
            } else { // paired
                const { trangThai, ...rest } = newFilters;
                setPairedFilters(prev => ({...prev, ...rest}));
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
            } else { // paired
                setPairedFilters({ tvbh: [], dongXe: [] });
            }
            setCurrentPage(1); 
            setPendingCurrentPage(1); 
            setPairedCurrentPage(1);
        };

        const dropdownConfigs: DropdownFilterConfig[] = [
            { id: 'admin-filter-tvbh', key: 'tvbh', label: 'Tất cả TVBH', options: currentOptions['Tên tư vấn bán hàng'], icon: 'fa-user-tie', displayMode: 'selection'},
            { id: 'admin-filter-dongxe', key: 'dongXe', label: 'Tất cả Dòng Xe', options: currentOptions['Dòng xe'], icon: 'fa-car', displayMode: 'selection'},
        ];
        if (adminView === 'invoices') {
            dropdownConfigs.push({ id: 'admin-filter-status', key: 'trangThai', label: 'Tất cả Trạng Thái', options: currentOptions['Kết quả'], icon: 'fa-tag', displayMode: 'selection'});
        }

        return (
             <div className={`transition-all duration-300 ease-in-out ${isFilterPanelOpen ? 'max-h-96' : 'max-h-0 !p-0 !mt-0 !mb-0 overflow-hidden'}`}>
                <div className="bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-4">
                     <Filters 
                        filters={currentFilters}
                        onFilterChange={handleFilterChange as any}
                        onReset={handleReset}
                        dropdowns={dropdownConfigs}
                        searchPlaceholder=""
                        totalCount={0} // Not needed here
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
        switch(adminView) {
            case 'invoices':
            case 'pending':
            case 'paired':
                 const isPending = adminView === 'pending';
                 const data = adminView === 'invoices' ? paginatedInvoices : isPending ? paginatedPendingData : paginatedPairedData;
                 const totalPages = adminView === 'invoices' ? totalInvoicePages : isPending ? totalPendingPages : totalPairedPages;
                 const activePage = adminView === 'invoices' ? currentPage : isPending ? pendingCurrentPage : pairedCurrentPage;
                 const onPageChange = adminView === 'invoices' ? setCurrentPage : isPending ? setPendingCurrentPage : setPairedCurrentPage;
                 const sortConf = adminView === 'invoices' ? sortConfig : isPending ? pendingSortConfig : pairedSortConfig;
                 const onSort = adminView === 'invoices' ? setSortConfig : isPending ? setPendingSortConfig : setPairedSortConfig;
                
                 return (
                     <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                        <div className="flex-grow overflow-auto relative">
                            <AdminInvoiceTable viewType={adminView} orders={data} sortConfig={sortConf} onSort={(key) => onSort((p: SortConfig | null) => ({ key, direction: p?.key === key && p.direction === 'asc' ? 'desc' : 'asc' }))} selectedRows={selectedRows} onToggleRow={(id) => setSelectedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })} onToggleAllRows={() => { if (selectedRows.size === data.length) setSelectedRows(new Set()); else setSelectedRows(new Set(data.map(o => o['Số đơn hàng']))); }} onAction={handleAction} showToast={showToast} suggestions={suggestionsMap} onShowSuggestions={handleShowSuggestions} />
                        </div>
                        {totalPages > 0 && <Pagination currentPage={activePage} totalPages={totalPages} onPageChange={onPageChange} onLoadMore={() => {}} isLoadingArchives={false} isLastArchive={true} />}
                    </div>
                 );
            default: return null;
        }
    }
    
    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex flex-col h-full">
                 <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 flex items-center gap-2 mb-4">
                    <div className="flex items-center border border-border-primary rounded-lg bg-surface-ground p-0.5">
                        {(['invoices', 'pending', 'paired'] as AdminSubView[]).map(view => {
                            const labels = { invoices: 'Xử Lý Hóa Đơn', pending: 'Chờ Ghép', paired: 'Đã Ghép'};
                            const counts = { invoices: invoiceRequests.length, pending: pendingData.length, paired: pairedData.length };
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
                            await Promise.all([refetchHistory(), refetchXuathoadon(), refetchStock()]);
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
                    <ActionModal isOpen={invoiceModalState.type === 'approve'} onClose={() => setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu" description="Xác nhận phê duyệt yêu cầu xuất hóa đơn cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-double" onSubmit={() => handleAdminSubmit('approveSelectedInvoiceRequest', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]) }, 'Đã phê duyệt yêu cầu.')} />
                    <RequestWithImageModal isOpen={invoiceModalState.type === 'supplement'} onClose={() => setInvoiceModalState(null)} title="Yêu Cầu Bổ Sung" orderNumber={invoiceModalState.order['Số đơn hàng']} reasonLabel="Nội dung yêu cầu (bắt buộc):" onSubmit={(reason, images) => handleAdminSubmit('requestSupplementForInvoice', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã gửi yêu cầu bổ sung.')} icon="fa-exclamation-triangle" theme="warning" />
                    <RequestWithImageModal isOpen={invoiceModalState.type === 'vinclub'} onClose={() => setInvoiceModalState(null)} title="Yêu Cầu Xác Thực VinClub" orderNumber={invoiceModalState.order['Số đơn hàng']} reasonLabel="Ghi chú (Tùy chọn):" onSubmit={(reason, images) => handleAdminSubmit('requestVinClubVerification', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã gửi yêu cầu VinClub.')} icon="fa-id-card" theme="primary" />
                    <ActionModal isOpen={invoiceModalState.type === 'pendingSignature'} onClose={() => setInvoiceModalState(null)} title="Chuyển Trạng Thái" description="Chuyển đơn hàng sang 'Chờ Ký Hóa Đơn'?" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={() => handleAdminSubmit('markAsPendingSignature', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]) }, 'Đã chuyển trạng thái.')} />
                    <UploadInvoiceModal isOpen={invoiceModalState.type === 'uploadInvoice'} onClose={() => setInvoiceModalState(null)} order={invoiceModalState.order} onSubmit={async (file) => {
                        const fileToBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = e => rej(e); });
                        const base64Data = await fileToBase64(file);
                        return handleAdminSubmit('handleBulkUploadIssuedInvoices', { filesData: JSON.stringify([{ orderNumber: invoiceModalState.order['Số đơn hàng'], base64Data, mimeType: file.type, fileName: file.name }])}, 'Đã tải lên hóa đơn thành công.');
                    }} />
                    <ActionModal isOpen={invoiceModalState.type === 'cancel'} onClose={() => setInvoiceModalState(null)} title="Hủy Yêu Cầu Xuất Hóa Đơn" description="Hành động này sẽ hủy yêu cầu và thông báo cho TVBH." targetId={invoiceModalState.order['Số đơn hàng']} inputs={[{ id: 'reason', label: 'Lý do hủy (bắt buộc)', placeholder: 'VD: Khách hàng đổi ý, sai thông tin...', type: 'textarea' }]} submitText="Xác Nhận Hủy" submitColor="danger" icon="fa-trash-alt" onSubmit={(data) => handleAdminSubmit('cancelRequest', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), reason: data.reason }, 'Đã hủy yêu cầu.')} />
                    <ActionModal isOpen={invoiceModalState.type === 'unmatch'} onClose={() => setInvoiceModalState(null)} title="Hủy Ghép Xe" description="Hủy ghép xe cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} inputs={[{ id: 'reason', label: 'Lý do hủy ghép (bắt buộc)', placeholder: 'VD: Sai thông tin xe...', type: 'textarea' }]} submitText="Xác Nhận Hủy Ghép" submitColor="danger" icon="fa-unlink" onSubmit={(data) => handleAdminSubmit('unmatchOrder', { orderNumber: invoiceModalState.order['Số đơn hàng'], reason: data.reason }, 'Đã hủy ghép xe.', 'both')} />
                    <ActionModal isOpen={invoiceModalState.type === 'resend'} onClose={() => setInvoiceModalState(null)} title="Gửi Lại Email" description="Gửi lại email thông báo cho đơn hàng:" targetId={invoiceModalState.order['Số đơn hàng']} submitText="Gửi Lại" submitColor="primary" icon="fa-paper-plane" onSubmit={() => handleAdminSubmit('resendEmail', { orderNumbers: JSON.stringify([invoiceModalState.order['Số đơn hàng']]), emailType: 'invoice_issued' }, 'Đã gửi lại email.')} />
                </>
            )}
            <ActionModal isOpen={adminModal === 'archive'} onClose={() => setAdminModal(null)} title="Lưu Trữ Hóa Đơn" description="Lưu trữ hóa đơn đã xuất của tháng trước sang một sheet riêng." submitText="Xác Nhận Lưu Trữ" submitColor="primary" icon="fa-archive" onSubmit={() => handleAdminSubmit('archiveInvoicedOrdersMonthly', {}, 'Đã lưu trữ hóa đơn thành công.', 'history')} />
            <ActionModal isOpen={adminModal === 'addCar'} onClose={() => setAdminModal(null)} title="Thêm Xe Mới vào Kho" description="Hệ thống sẽ tự động tra cứu thông tin xe từ số VIN." inputs={[{ id: 'vin', label: 'Số VIN (17 ký tự)', placeholder: 'Nhập 17 ký tự VIN...', isVIN: true }]} submitText="Thêm Xe" submitColor="primary" icon="fa-plus-circle" onSubmit={(data) => handleAdminSubmit('findAndAddCarByVin', { vin: data.vin }, 'Thêm xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'deleteCar'} onClose={() => setAdminModal(null)} title="Xóa Xe Khỏi Kho" description="Xe sẽ bị ẩn khỏi kho và ghi vào nhật ký xóa. Có thể phục hồi lại sau." inputs={[{ id: 'vinToDelete', label: 'Số VIN cần xóa (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }, { id: 'reason', label: 'Lý do xóa (bắt buộc)', placeholder: 'VD: Xe bán lô, xe điều chuyển...', type: 'textarea' }]} submitText="Xác Nhận Xóa" submitColor="danger" icon="fa-trash-alt" onSubmit={(data) => handleAdminSubmit('deleteCarFromStockLogic', data, 'Đã xóa xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'restoreCar'} onClose={() => setAdminModal(null)} title="Phục Hồi Xe Đã Xóa" description="Xe sẽ được phục hồi về trạng thái 'Chưa ghép' và hiển thị lại trong kho." inputs={[{ id: 'vinToRestore', label: 'Số VIN cần phục hồi (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }]} submitText="Phục Hồi Xe" submitColor="primary" icon="fa-undo" onSubmit={(data) => handleAdminSubmit('restoreCarToStockLogic', data, 'Đã phục hồi xe thành công.', 'stock')} />
            <ActionModal isOpen={adminModal === 'deleteOrder'} onClose={() => setAdminModal(null)} title="Xóa Đơn Hàng" description="CẢNH BÁO: Đơn hàng sẽ bị xóa vĩnh viễn và chuyển vào mục 'Đã Hủy'." inputs={[{ id: 'orderNumber', label: 'Nhập Số đơn hàng để xác nhận', placeholder: 'Ví dụ: SO-123456...' }]} submitText="Tôi hiểu, Xóa Đơn Hàng" submitColor="danger" icon="fa-times-circle" onSubmit={(data) => handleAdminSubmit('deleteOrderLogic', data, 'Đã xóa đơn hàng thành công.', 'history')} />
            <ActionModal isOpen={adminModal === 'revertOrder'} onClose={() => setAdminModal(null)} title="Hoàn Tác Trạng Thái" description="Khôi phục lại trạng thái cuối cùng của đơn hàng trong nhật ký." inputs={[{ id: 'orderNumber', label: 'Nhập Số đơn hàng cần hoàn tác', placeholder: 'Ví dụ: N31913-VSO-25-08-0019' }]} submitText="Thực Hiện Hoàn Tác" submitColor="primary" icon="fa-history" onSubmit={(data) => handleAdminSubmit('revertOrderStatus', data, 'Đã hoàn tác trạng thái đơn hàng.', 'history')} />
            <OrderTimelineModal isOpen={adminModal === 'timeline'} onClose={() => setAdminModal(null)} />
            <BulkInvoiceUploadModal isOpen={adminModal === 'bulkUpload'} onClose={() => setAdminModal(null)} onSuccess={() => { refetchHistory(); setAdminModal(null); }} showToast={showToast} hideToast={hideToast} />
        </div>
    );
};

export default AdminView;
