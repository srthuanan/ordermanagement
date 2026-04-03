import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Order, StockVehicle, AdminSubView } from '../../types';
import InvoiceInboxView from './InvoiceInboxView';
import MatchingCockpitView from './MatchingCockpitView';
import VcInboxView from './VcInboxView';
import ActionModal from './ActionModal';
import { RequestWithImageModal, UploadInvoiceModal } from './AdminActionModals';
import OrderTimelineModal from './OrderTimelineModal';
import SuggestionModal from './SuggestionModal';
import MatchingSuggestionsModal from './MatchingSuggestionsModal';
import BulkUploadModal from './BulkUploadModal';
import BulkAddCarExcelModal from './BulkAddCarExcelModal';
import EditOrderModal from '../modals/EditOrderModal';
import ThongTinXeUploadModal from './ThongTinXeUploadModal';
import { useAdminFilters } from '../../hooks/useAdminFilters';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useAdminData } from '../../hooks/useAdminData';
import AdminFilterPanel from './AdminFilterPanel';
import { TeamManagementComponent, TeamEditorModal } from './TeamManagement';
import ActiveUsersModal from './ActiveUsersModal';
import TvbhEmailManager from './TvbhEmailManager';
import AnnouncementModal from './AnnouncementModal';
import { useGlobalNotification } from '../../hooks/useGlobalNotification';
import TrackingDashboard from './TrackingDashboard';
import AdminStats from './AdminStats';
import IncompleteCarsView from './IncompleteCarsView';
import SuperManagementView from './SuperManagementView';
import InquiryManagementView from './InquiryManagementView';
import HoldManagementView from './HoldManagementView';
import PolicyManagementView from './PolicyManagementView';
import { exportOrderReport, exportAllSavedOrdersToExcel } from '../../utils/excelUtils';
import DonHangTonView from './DonHangTonView';

import * as apiService from '../../services/apiService';

type User = { name: string, role: string, username: string };

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
    isLoadingHistory: boolean;
    errorXuathoadon: string | null;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    isSidebarCollapsed: boolean;
    initialState: { targetTab?: AdminSubView; orderToShow?: Order; inquiryId?: string } | null;
    clearInitialState: () => void;
}

const AdminView: React.FC<AdminViewProps> = ({ showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, allOrders, xuathoadonData, stockData, teamData, allUsers, isLoadingXuathoadon, isLoadingHistory, onOpenImagePreview, onOpenFilePreview, isSidebarCollapsed, initialState, clearInitialState }) => {

    const [showMatchingModal, setShowMatchingModal] = useState(false);
    const [isActiveUsersModalOpen, setIsActiveUsersModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isTvbhEmailManagerOpen, setIsTvbhEmailManagerOpen] = useState(false);
    const { notification, updateNotification } = useGlobalNotification();

    // Persistent View State
    const [viewState, setViewState] = useState({
        invoices: { folder: 'pending_approval', orderId: null as string | null },
        matching: { tab: 'pending', orderId: null as string | null },
        vc: { folder: 'pending', requestId: null as string | null }
    });

    const handleInvoiceStateChange = (updates: Partial<typeof viewState.invoices>) => {
        setViewState(prev => ({ ...prev, invoices: { ...prev.invoices, ...updates } }));
    };

    const handleMatchingStateChange = (updates: Partial<typeof viewState.matching>) => {
        setViewState(prev => ({ ...prev, matching: { ...prev.matching, ...updates } }));
    };

    const handleVcStateChange = (updates: Partial<typeof viewState.vc>) => {
        setViewState(prev => ({ ...prev, vc: { ...prev.vc, ...updates } }));
    };

    // 1. Filters Hook
    const filterState = useAdminFilters({ initialState, clearInitialState });
    const {
        adminView, setAdminView,
        handleFilterChange, handleReset,
        invoiceFilters, pendingFilters, pairedFilters, vcFilters, matchingFilters,
        matchingTab, setMatchingTab,
        targetOrderId, setTargetOrderId,
        targetInquiryId, setTargetInquiryId
    } = filterState;

    // Khi targetOrderId thay đổi (từ navigate bên ngoài), set selectedOrderId cho đúng tab ngay lập tức
    useEffect(() => {
        if (targetOrderId) {
            if (adminView === 'invoices') {
                handleInvoiceStateChange({ orderId: targetOrderId });
            } else if (adminView === 'matching') {
                handleMatchingStateChange({ orderId: targetOrderId });
            } else if (adminView === 'vc') {
                handleVcStateChange({ requestId: targetOrderId });
            }
            setTargetOrderId(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetOrderId, adminView]);

    // 2. Data Hook
    const {
        isLoadingVc,
        selectedRows, setSelectedRows,
        fetchVcData,
        processedInvoices, invoiceRequests, pendingData, pairedData, vcRequests,
        suggestionsMap, ordersWithMatches, filterOptions
    } = useAdminData({
        allOrders, xuathoadonData, stockData,
        invoiceFilters: filterState.invoiceFilters,
        pendingFilters: filterState.pendingFilters,
        pairedFilters: filterState.pairedFilters,
        vcFilters: filterState.vcFilters,
        matchingFilters: filterState.matchingFilters,
        adminView,
        isSidebarCollapsed
    });

    // 3. Actions Hook
    const actions = useAdminActions({
        showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, fetchVcData,
        teamData, allUsers, allOrders, suggestionsMap,
        selectedRows, setSelectedRows, setShowMatchingModal
    });

    // 4. Custom Tab Handlers


    const handleManualTabChange = (view: AdminSubView) => {
        setAdminView(view);
        if (view === 'pending' && ordersWithMatches.length > 0) setShowMatchingModal(true);
    };

    const navigateToTab = (view: AdminSubView, subState?: { folder?: string; id?: string }) => {
        setAdminView(view);
        if (view === 'invoices' && subState) {
            handleInvoiceStateChange({ folder: subState.folder, orderId: subState.id });
        } else if (view === 'matching' && subState) {
            handleMatchingStateChange({ tab: subState.folder as any, orderId: subState.id });
        } else if (view === 'vc' && subState) {
            handleVcStateChange({ folder: subState.folder, requestId: subState.id });
        }
    };

    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) { setIsActionMenuOpen(false); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const tabs: AdminSubView[] = ['invoices', 'matching', 'vc', 'inquiries', 'don_ton', 'holds', 'super_edit', 'stats', 'policies', 'incomplete_cars', 'phongkd'];
    const labels: Record<AdminSubView, string> = {
        invoices: 'HÓA ĐƠN',
        pending: 'CHỜ GHÉP',
        paired: 'ĐÃ GHÉP',
        matching: 'GHÉP XE',
        vc: 'XỬ LÝ VC',
        phongkd: 'PHÒNG KD',
        tracking: 'GIÁM SÁT',
        stats: 'THỐNG KÊ',
        incomplete_cars: 'BỔ SUNG PB',
        inquiries: 'TRA CỨU KHO',
        holds: 'QUẢN LÝ GIỮ',
        super_edit: 'QUẢN LÝ NÂNG CAO',
        policies: 'CHÍNH SÁCH',
        don_ton: 'ĐƠN TỒN DMS'
    };
    const [unreadInquiryCount, setUnreadInquiryCount] = useState<number>(0);

    useEffect(() => {
        const fetchUnreadCount = async () => {
            try {
                const data = await apiService.getCarInquiries();
                const unread = data.filter(i => !i.is_read_by_admin).length;
                setUnreadInquiryCount(unread);
            } catch (e) {
                console.error("Error fetching unread inquiries:", e);
            }
        };
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000); // 30s once
        return () => clearInterval(interval);
    }, []);

    const counts: Record<AdminSubView, number | null> = { 
        invoices: invoiceRequests.length, 
        pending: pendingData.length, 
        paired: pairedData.length, 
        matching: pendingData.length + pairedData.length, 
        vc: vcRequests.length, 
        phongkd: Object.keys(teamData).length, 
        tracking: null, 
        stats: null, 
        incomplete_cars: stockData.filter(car => !car['Phiên bản'] || car['Phiên bản'].trim() === '').length, 
        super_edit: null, 
        inquiries: unreadInquiryCount || null,
        holds: null,
        policies: null,
        don_ton: null
    };


    const adminTools = [
        { title: 'Thêm Xe Mới', icon: 'fa-plus-circle', action: () => actions.setAdminModal('addCar') },
        { title: 'Thêm Xe Hàng Loạt', icon: 'fa-layer-group', action: () => actions.setAdminModal('bulkAddCar') },
        { title: 'Nhập Xe Từ Excel', icon: 'fa-file-excel', action: () => actions.setAdminModal('bulkAddCarExcel') },
        { title: 'Xóa Xe Khỏi Kho', icon: 'fa-trash-alt', action: () => actions.setAdminModal('deleteCar') },
        { title: 'Phục Hồi Xe', icon: 'fa-undo', action: () => actions.setAdminModal('restoreCar') },
        { title: 'Thêm Nhân Viên', icon: 'fa-user-plus', action: () => actions.setAdminModal('addUser') },
        { title: 'Xóa Đơn Hàng', icon: 'fa-times-circle', action: () => actions.setAdminModal('deleteOrder') },
        { title: 'Hoàn Tác Trạng Thái', icon: 'fa-history', action: () => actions.setAdminModal('revertOrder') },
        { title: 'Tiến Tới Trạng Thái', icon: 'fa-step-forward', action: () => actions.setAdminModal('advanceOrder') },
        { title: 'Tải Lên HĐ Hàng Loạt', icon: 'fa-file-upload', action: () => actions.setIsBulkUploadModalOpen(true) },
        { title: 'Xuất Toàn Bộ Hệ Thống KH', icon: 'fa-file-excel', action: () => exportAllSavedOrdersToExcel(showToast) },
        { title: 'Xuất Báo Cáo Ghép Xe', icon: 'fa-file-export', action: () => exportOrderReport(pendingData, pairedData) },
        { title: 'Cài Đặt Thông Báo', icon: 'fa-bullhorn', action: () => setIsAnnouncementModalOpen(true) },
        { title: 'Tra Cứu Hoạt Động', icon: 'fa-microscope', action: () => setAdminView('tracking') },
        { title: 'Cập Nhật Core/thongtinxe', icon: 'fa-database', action: () => actions.setAdminModal('thongTinXeExcel') },
        { title: 'Lưu Trữ Hóa Đơn Tháng Trước', icon: 'fa-archive', action: () => actions.setAdminModal('archive') },
    ];

    // Modal Inputs
    const addCarInputs = [{ id: 'vin', label: 'Số VIN (17 ký tự)', placeholder: 'Nhập 17 ký tự VIN...', isVIN: true }];
    const bulkAddCarInputs = [{ id: 'vins', label: 'Danh sách số VIN & Phiên bản (Copy trực tiếp từ Excel)', placeholder: 'VD:\nVIN1\tPhiên bản 1\nVIN2\tPhiên bản 2\nHoặc chỉ nhập VIN Mỗi dòng', type: 'textarea' as const }];
    const deleteCarInputs = [
        { id: 'vinToDelete', label: 'Số VIN cần xóa (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true },
        { id: 'reason', label: 'Lý do xóa (bắt buộc)', placeholder: 'VD: Xe bán lô, xe điều chuyển...', type: 'textarea' as const }
    ];
    const restoreCarInputs = [{ id: 'vinToRestore', label: 'Số VIN cần phục hồi (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }];
    const deleteOrderInputs = [{ id: 'orderNumber', label: 'Nhập Số đơn hàng để xác nhận', placeholder: 'Ví dụ: SO-123456...' }];
    const revertOrderInputs = [{ id: 'orderNumber', label: 'Nhập Số đơn hàng cần hoàn tác', placeholder: 'Ví dụ: N31913-VSO-25-08-0019' }];
    const advanceOrderInputs = [{ id: 'orderNumber', label: 'Nhập Số đơn hàng cần tiến tới trạng thái', placeholder: 'Ví dụ: N31913-VSO-25-08-0019' }];
    const addUserInputs = [
        { id: 'fullName', label: 'Họ và Tên', placeholder: 'VD: Nguyễn Văn A', type: 'text' as const },
        { id: 'email', label: 'Email', placeholder: 'VD: an.nguyen@email.com', type: 'text' as const },
    ];
    const cancelRequestInputs = [{ id: 'reason', label: 'Lý do hủy (bắt buộc)', placeholder: 'VD: Khách hàng đổi ý, sai thông tin...', type: 'textarea' as const }];
    const unmatchInputs = [
        { id: 'unmatch_type', label: 'Tùy chọn hủy ghép', placeholder: 'Chọn loại...', type: 'select' as const, options: ['Hủy luôn đơn hàng (Hủy đơn)', 'Hủy ghép & Đợi xe khác (Chờ xe)'] },
        { id: 'reason', label: 'Lý do hủy ghép (bắt buộc)', placeholder: 'VD: Sai thông tin xe...', type: 'textarea' as const }
    ];
    const pendingSignatureInputs = [{ id: 'ngay_xuat_hoa_don', label: 'Ngày xuất hóa đơn (Để trống nếu lấy ngày hiện tại)', type: 'date' as const }];

    const renderCurrentView = () => {


        return (
            <>

                <div className={adminView === 'invoices' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <InvoiceInboxView
                        isLoading={isLoadingXuathoadon}
                        orders={invoiceRequests}
                        onAction={actions.handleAction}
                        showToast={showToast}
                        onOpenFilePreview={onOpenFilePreview}
                        onUpdateInvoiceDetails={actions.handleEditInvoiceDetails}
                        selectedFolder={viewState.invoices.folder as any}
                        selectedOrderId={viewState.invoices.orderId}
                        onFolderChange={(folder) => handleInvoiceStateChange({ folder })}
                        onOrderSelect={(orderId) => handleInvoiceStateChange({ orderId })}
                        processingId={actions.processingId}
                        processingActionType={actions.processingActionType}
                    />
                </div>

                {/* Matching View */}
                <div className={adminView === 'matching' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <MatchingCockpitView
                        isLoading={isLoadingHistory}
                        pendingOrders={pendingData}
                        pairedOrders={pairedData}
                        stockData={stockData}
                        onAction={actions.handleAction}
                        filters={filterState.matchingFilters}
                        showToast={showToast}
                        activeTab={matchingTab}
                        selectedOrderId={viewState.matching.orderId}
                        onTabChange={(tab) => { handleMatchingStateChange({ tab }); setMatchingTab(tab); }}
                        onOrderSelect={(orderId) => handleMatchingStateChange({ orderId })}
                        processingId={actions.processingId}
                        processingActionType={actions.processingActionType}
                        onNavigateToTab={navigateToTab}
                    />
                </div>



                {/* VC View */}
                <div className={adminView === 'vc' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <VcInboxView
                        isLoading={isLoadingVc}
                        requests={vcRequests}
                        onAction={actions.handleAction}
                        showToast={showToast}
                        onOpenImagePreview={onOpenImagePreview}
                        onDownloadAll={actions.handleDownloadAllVcImages}
                        selectedFolder={viewState.vc.folder as any}
                        selectedRequestId={viewState.vc.requestId}
                        onFolderChange={(folder) => handleVcStateChange({ folder })}
                        onRequestSelect={(requestId) => handleVcStateChange({ requestId })}
                        processingId={actions.processingId}
                        processingActionType={actions.processingActionType}
                        onNavigateToTab={navigateToTab}
                    />
                </div>

                {/* Team Management View */}
                <div className={adminView === 'phongkd' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <TeamManagementComponent
                        teamData={teamData}
                        onEditTeam={(leader, members) => actions.setEditingTeam({ leader, members })}
                        onAddNewTeam={() => actions.setIsAddingNewTeam(true)}
                        onDeleteTeam={actions.handleDeleteTeam}
                    />
                </div>

                {/* Tracking View */}
                <div className={adminView === 'tracking' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <TrackingDashboard />
                </div>

                {/* Stats View */}
                <div className={adminView === 'stats' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <AdminStats xuathoadonData={xuathoadonData} pendingData={pendingData} pairedData={pairedData} />
                </div>

                {/* Incomplete Cars View */}
                <div className={adminView === 'incomplete_cars' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <IncompleteCarsView
                        stockData={stockData}
                        onRefresh={() => refetchStock()}
                        showToast={showToast}
                    />
                </div>

                {/* Super Edit View */}
                <div className={adminView === 'super_edit' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <SuperManagementView
                        allOrders={allOrders}
                        showToast={showToast}
                        onSuccess={() => {
                            refetchHistory(true);
                            refetchXuathoadon(true);
                        }}
                    />
                </div>

                {/* Inquiries View */}
                <div className={adminView === 'inquiries' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <InquiryManagementView 
                        showToast={showToast} 
                        initialInquiryId={targetInquiryId || undefined}
                        onProcessed={() => setTargetInquiryId(null)}
                    />
                </div>

                {/* Hold Management View */}
                <div className={adminView === 'holds' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <HoldManagementView 
                        showToast={showToast}
                        onOpenFilePreview={onOpenFilePreview}
                    />
                </div>

                {/* Policies View */}
                <div className={adminView === 'policies' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <PolicyManagementView showToast={showToast} />
                </div>

                {/* Backlog Orders View */}
                <div className={adminView === 'don_ton' ? 'flex-1 flex flex-col min-h-0 overflow-y-auto' : 'hidden'}>
                    <DonHangTonView 
                        showToast={showToast} 
                        isActive={adminView === 'don_ton'} 
                        pairedData={pairedData}
                        processedInvoices={processedInvoices}
                    />
                </div>
            </>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-white border-b border-border-primary shadow-sm z-[60]">
                {/* Row 1: Navigation & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between px-2 py-0.5 border-b border-border-secondary/50 gap-1 md:gap-0">
                    {/* Tabs (Minimalist Segmented Control) */}
                    <div className="flex p-1 bg-slate-50 rounded-xl border border-slate-200/60 overflow-x-auto md:overflow-hidden no-scrollbar w-full md:w-auto gap-0.5">
                        {tabs.map(view => {
                            const count = counts[view];
                            const isActive = adminView === view;
                            return (
                                <button
                                    key={view}
                                    onClick={() => handleManualTabChange(view)}
                                    className={`
                                        relative px-4 py-2 lg:py-1.5 min-w-[100px] lg:min-w-[90px] min-h-[38px] lg:min-h-0 text-[10px] lg:text-[9.5px] font-black tracking-wider transition-all duration-300 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap flex-shrink-0
                                        ${isActive
                                            ? 'bg-white text-slate-700 shadow-sm z-10'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-white/40'}
                                    `}
                                >
                                    <span className="relative z-10">{labels[view]}</span>
                                    {count !== null && (
                                        <span className={`
                                            relative z-10 text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors duration-300
                                            ${isActive ? 'bg-slate-100 text-slate-600' : 'bg-slate-200/30 text-slate-400'}
                                        `}>
                                            {count}
                                        </span>
                                    )}
                                    {isActive && (
                                        <div className="absolute inset-0 bg-white rounded-lg animate-in fade-in duration-300"></div>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Divider - Hidden on mobile */}
                    <div className="hidden md:block h-8 w-px bg-border-secondary/50 mx-2"></div>

                    {/* Empty spacer or additional controls */}
                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-3">
                        {/* Filters (Right) */}
                        <div id="admin-filter-portal-target" className="flex-grow md:flex-grow-0 flex justify-end items-center min-w-0 md:mr-4">
                            <AdminFilterPanel
                                adminView={adminView}
                                invoiceFilters={invoiceFilters}
                                pendingFilters={pendingFilters}
                                pairedFilters={pairedFilters}
                                vcFilters={vcFilters}
                                matchingFilters={matchingFilters}
                                handleFilterChange={handleFilterChange}
                                handleReset={handleReset}

                                filterOptions={filterOptions}
                                invoiceRequests={invoiceRequests}
                                pendingData={pendingData}
                                pairedData={pairedData}
                                vcRequests={vcRequests}
                                refetchXuathoadon={refetchXuathoadon}
                                refetchHistory={refetchHistory}
                                fetchVcData={fetchVcData}
                                isLoadingXuathoadon={isLoadingXuathoadon}
                                isLoadingHistory={isLoadingHistory}
                                isLoadingVc={isLoadingVc}
                                activeMatchingTab={viewState.matching.tab as any}
                            />
                        </div>

                        {/* portal for lightning bolt menu is now handled outside this flow */}
                    </div>
                </div>

            </div>

            {/* PORTAL: Admin Lightning Action Menu into Header */}
            {document.getElementById('admin-portal-target') && createPortal(
                <div className="relative mr-0.5" ref={actionMenuRef}>
                    <button
                        onClick={() => setIsActionMenuOpen(prev => !prev)}
                        title="Thao Tác Nhanh Quản Trị"
                        className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isActionMenuOpen ? 'bg-accent-primary text-white shadow-md' : 'bg-transparent text-gray-400 hover:text-accent-primary hover:bg-white hover:shadow-sm'}`}
                    >
                        <i className="fas fa-bolt text-[13px]"></i>
                    </button>
                    {isActionMenuOpen && (
                        <div className="fixed sm:absolute top-[56px] sm:top-full left-2 right-2 sm:left-auto sm:right-0 sm:mt-3 w-auto sm:w-64 bg-white border border-border-primary shadow-[0_10px_40px_rgba(0,0,0,0.12)] rounded-2xl z-[110] p-1.5 animate-fade-in-scale-up origin-top sm:origin-top-right">
                            <div className="px-3 py-2 border-b border-slate-50 mb-1.5">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Công cụ quản trị</span>
                            </div>
                            <div className="grid grid-cols-1 gap-0.5 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                                {adminTools.map(tool => (
                                    <button 
                                        key={tool.title} 
                                        onClick={() => { tool.action(); setIsActionMenuOpen(false); }} 
                                        className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 text-xs rounded-lg text-slate-700 hover:bg-slate-50 transition-colors group"
                                    >
                                        <div className="w-6 h-6 rounded border border-slate-100/50 bg-slate-100 flex-shrink-0 flex items-center justify-center text-slate-500 group-hover:bg-accent-primary group-hover:text-white group-hover:border-accent-primary transition-all">
                                            <i className={`fas ${tool.icon} text-[10px]`}></i>
                                        </div>
                                        <span className="font-semibold text-slate-700/90">{tool.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>,
                document.getElementById('admin-portal-target')!
            )}


            <div className="flex-grow min-h-0 flex flex-col">
                {renderCurrentView()}
            </div>

            {/* PORTAL FOR ALL ADMIN MODALS: Ensures they work from any tab via the Lightning Bolt menu */}
            {createPortal(
                <>
                    {actions.suggestionModalState && <SuggestionModal isOpen={!!actions.suggestionModalState} onClose={() => actions.setSuggestionModalState(null)} order={actions.suggestionModalState.order} suggestedCars={actions.suggestionModalState.cars} onConfirm={actions.handleConfirmSuggestion} showToast={showToast} />}
                    <MatchingSuggestionsModal
                        isOpen={showMatchingModal}
                        onClose={() => setShowMatchingModal(false)}
                        matches={ordersWithMatches}
                        onConfirmMatch={actions.handleConfirmSuggestion}
                        processingId={actions.processingId}
                        processingActionType={actions.processingActionType}
                    />
                    {
                        actions.invoiceModalState && (
                            <>
                                {/* Invoice Actions */}
                                <ActionModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'approve'} onClose={() => actions.setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu" description="Xác nhận phê duyệt yêu cầu xuất hóa đơn cho đơn hàng:" targetId={actions.invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-double" onSubmit={() => actions.handleAdminSubmit('approveSelectedInvoiceRequest', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]) }, 'Đã phê duyệt yêu cầu.')} />
                                <RequestWithImageModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'supplement'} onClose={() => actions.setInvoiceModalState(null)} title="Yêu Cầu Bổ Sung" orderNumber={actions.invoiceModalState.order['Số đơn hàng']} reasonLabel="Nội dung yêu cầu (bắt buộc):" onSubmit={(reason: string, images: string[]) => actions.handleAdminSubmit('requestSupplementForInvoice', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]), reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã gửi yêu cầu bổ sung.')} icon="fa-exclamation-triangle" theme="warning" />
                                <ActionModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'pendingSignature'} onClose={() => actions.setInvoiceModalState(null)} title="Chuyển Trạng Thái" description="Xác nhận chuyển đơn hàng sang 'Chờ Ký Hóa Đơn'. Bạn có thể chọn lùi ngày xuất hóa đơn nếu cần." targetId={actions.invoiceModalState.order['Số đơn hàng']} inputs={pendingSignatureInputs} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={(data) => actions.handleAdminSubmit('markAsPendingSignature', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]), ngay_xuat_hoa_don: data.ngay_xuat_hoa_don }, 'Đã chuyển trạng thái.')} />
                                <UploadInvoiceModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'uploadInvoice'} onClose={() => actions.setInvoiceModalState(null)} order={actions.invoiceModalState.order as Order} onSubmit={async (file: File) => {
//                                     showToast('Đang xử lý', 'Đang tải lên hóa đơn...', 'loading');
                                    const fileToBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = e => rej(e); });
                                    const base64Data = await fileToBase64(file);
                                    try {
                                        const res = await apiService.uploadBulkInvoices([{ orderNumber: actions.invoiceModalState!.order['Số đơn hàng'], base64Data, mimeType: file.type, fileName: file.name, fileObject: file }]);
                                        if (res.status === 'SUCCESS') {
                                            showToast('Thành công!', res.message, 'success');
                                            refetchHistory(true);
                                            refetchXuathoadon(true);
                                            actions.setInvoiceModalState(null);
                                            return true;
                                        } else {
                                            showToast('Lỗi', res.message, 'error');
                                            return false;
                                        }
                                    } catch (e: any) {
                                        showToast('Lỗi', e.message || 'Lỗi', 'error');
                                        return false;
                                    }
                                }} />
                                <ActionModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'cancel'} onClose={() => actions.setInvoiceModalState(null)} title={adminView === 'matching' ? "Hủy Đơn Hàng" : "Hủy Yêu Cầu Xuất Hóa Đơn"} description={adminView === 'matching' ? "Hành động này sẽ hủy đơn hàng và thông báo cho TVBH." : "Hành động này sẽ hủy yêu cầu và thông báo cho TVBH."} targetId={actions.invoiceModalState.order['Số đơn hàng']} inputs={cancelRequestInputs} submitText={adminView === 'matching' ? "Xác Nhận Hủy Đơn" : "Xác Nhận Hủy"} submitColor="danger" icon="fa-trash-alt" onSubmit={(data: Record<string, string>) => actions.handleAdminSubmit('cancelRequest', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]), reason: data.reason }, adminView === 'matching' ? 'Đã hủy đơn hàng.' : 'Đã hủy yêu cầu.')} />
                                <ActionModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'unmatch'} onClose={() => actions.setInvoiceModalState(null)} title="Hủy Ghép Xe" description="Hủy ghép xe cho đơn hàng:" targetId={actions.invoiceModalState.order['Số đơn hàng']} inputs={unmatchInputs} submitText="Xác Nhận Hủy Ghép" submitColor="danger" icon="fa-unlink" onSubmit={(data: Record<string, string>) => actions.handleAdminSubmit('unmatchOrder', { orderNumber: actions.invoiceModalState!.order['Số đơn hàng'], reason: data.reason, unmatchType: data.unmatch_type }, 'Đã hủy ghép xe.', 'both')} />

                                {/* VC Actions */}
                                <ActionModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'approveVc'} onClose={() => actions.setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu VC" description="Xác nhận phê duyệt yêu cầu cấp VinClub cho đơn hàng:" targetId={actions.invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-circle" onSubmit={() => actions.handleAdminSubmit('approveVcRequest', { orderNumber: actions.invoiceModalState!.order['Số đơn hàng'] }, 'Đã phê duyệt yêu cầu VC.')} />
                                <RequestWithImageModal showToast={showToast} isOpen={actions.invoiceModalState.type === 'rejectVc'} onClose={() => actions.setInvoiceModalState(null)} title="Từ Chối Yêu Cầu VC" orderNumber={actions.invoiceModalState.order['Số đơn hàng']} reasonLabel="Lý do từ chối (bắt buộc):" onSubmit={(reason: string, images: string[]) => actions.handleAdminSubmit('rejectVcRequest', { orderNumber: actions.invoiceModalState!.order['Số đơn hàng'], reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã từ chối yêu cầu VC.')} icon="fa-ban" theme="danger" />
                            </>
                        )
                    }

                    {/* Bulk Action Modals */}
                    {
                        actions.bulkActionModal && (
                            <>
                                <ActionModal showToast={showToast} isOpen={actions.bulkActionModal.type === 'approve'} onClose={actions.handleCloseBulkActionModal} title="Phê duyệt hàng loạt" description={`Xác nhận phê duyệt ${selectedRows.size} yêu cầu đã chọn?`} submitText="Phê duyệt" submitColor="success" icon="fa-check-double" onSubmit={actions.handleBulkApproveSubmit} />
                                <ActionModal showToast={showToast} isOpen={actions.bulkActionModal.type === 'pendingSignature'} onClose={actions.handleCloseBulkActionModal} title="Chuyển trạng thái hàng loạt" description={`Chuyển ${selectedRows.size} đơn hàng đã chọn sang "Chờ Ký Hóa Đơn"?`} inputs={pendingSignatureInputs} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={(data) => actions.handleBulkPendingSignatureSubmit(data)} />
                                <RequestWithImageModal showToast={showToast} isOpen={actions.bulkActionModal.type === 'supplement'} onClose={actions.handleCloseBulkActionModal} title="Y/C Bổ sung hàng loạt" orderNumber={`${selectedRows.size} đơn hàng`} reasonLabel="Nội dung yêu cầu (bắt buộc):" icon="fa-exclamation-triangle" theme="warning" onSubmit={actions.handleBulkSupplementSubmit} />
                                <ActionModal showToast={showToast} isOpen={actions.bulkActionModal.type === 'cancel'} onClose={actions.handleCloseBulkActionModal} title="Hủy hàng loạt" description={`Bạn có chắc muốn hủy ${selectedRows.size} yêu cầu đã chọn? Hành động này sẽ chuyển các mục vào phần "Đã Hủy".`} inputs={cancelRequestInputs} submitText="Xác Nhận Hủy" submitColor="danger" icon="fa-trash-alt" onSubmit={actions.handleBulkCancelSubmit} />
                            </>
                        )
                    }

                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'archive'} onClose={actions.handleCloseAdminModal} title="Lưu Trữ Hóa Đơn" description="Chuyển các đơn hàng đã xuất hóa đơn của tháng trước từ bảng yeucauxhd sang kho lưu trữ (archived_orders). Đồng thời dọn dẹp dữ liệu cũ khỏi bảng donhang." submitText="Xác Nhận Lưu Trữ" submitColor="primary" icon="fa-archive" onSubmit={actions.handleArchiveSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'addCar'} onClose={actions.handleCloseAdminModal} title="Thêm Xe Mới vào Kho" description="Hệ thống sẽ tự động tra cứu thông tin xe từ số VIN." inputs={addCarInputs} submitText="Thêm Xe" submitColor="primary" icon="fa-plus-circle" onSubmit={actions.handleAddCarSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'bulkAddCar'} onClose={actions.handleCloseAdminModal} title="Thêm Xe Hàng Loạt" description="Nhập danh sách các số VIN để thêm hàng loạt vào kho." inputs={bulkAddCarInputs} submitText="Thêm Hàng Loạt" submitColor="primary" icon="fa-layer-group" onSubmit={actions.handleBulkAddCarSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'deleteCar'} onClose={actions.handleCloseAdminModal} title="Xóa Xe Khỏi Kho" description="Xe sẽ bị xóa khỏi trang Kho Xe và thông tin sẽ được lưu vào nhật ký. Có thể phục hồi lại sau bằng chức năng 'Phục Hồi Xe'." inputs={deleteCarInputs} submitText="Xác Nhận Xóa" submitColor="danger" icon="fa-trash-alt" onSubmit={actions.handleDeleteCarSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'restoreCar'} onClose={actions.handleCloseAdminModal} title="Phục Hồi Xe Đã Xóa" description="Dựa vào nhật ký xe đã xóa, hệ thống sẽ thêm xe trở lại Kho Xe với trạng thái 'Chưa ghép'." inputs={restoreCarInputs} submitText="Phục Hồi Xe" submitColor="primary" icon="fa-undo" onSubmit={actions.handleRestoreCarSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'addUser'} onClose={actions.handleCloseAdminModal} title="Thêm Nhân Viên Mới" description="Thêm một tài khoản nhân viên mới. Hệ thống sẽ tự động tạo tên đăng nhập, mật khẩu và gửi email thông báo." inputs={addUserInputs} submitText="Thêm & Gửi Email" submitColor="primary" icon="fa-user-plus" onSubmit={actions.handleAddUserSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'deleteOrder'} onClose={actions.handleCloseAdminModal} title="Xóa Đơn Hàng" description="CẢNH BÁO: Đơn hàng sẽ bị xóa vĩnh viễn và chuyển vào mục 'Đã Hủy'." inputs={deleteOrderInputs} submitText="Tôi hiểu, Xóa Đơn Hàng" submitColor="danger" icon="fa-times-circle" onSubmit={actions.handleDeleteOrderSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'revertOrder'} onClose={actions.handleCloseAdminModal} title="Hoàn Tác Trạng Thái" description="Khôi phục lại trạng thái cuối cùng của đơn hàng." inputs={revertOrderInputs} submitText="Thực Hiện Hoàn Tác" submitColor="primary" icon="fa-history" onSubmit={actions.handleRevertOrderSubmit} />
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'advanceOrder'} onClose={actions.handleCloseAdminModal} title="Tiến Tới Trạng Thái" description="Đẩy đơn hàng này tiến lên trạng thái tiếp theo trong quy trình." inputs={advanceOrderInputs} submitText="Thực Hiện Tiến Tới" submitColor="primary" icon="fa-step-forward" onSubmit={actions.handleAdvanceOrderSubmit} />
                    <BulkAddCarExcelModal 
                        isOpen={actions.adminModal === 'bulkAddCarExcel'} 
                        onClose={actions.handleCloseAdminModal} 
                        showToast={showToast} 
                        onSuccess={(carData) => actions.handleBulkAddCarDetailedSubmit(carData)} 
                    />
                    <ThongTinXeUploadModal 
                        isOpen={actions.adminModal === 'thongTinXeExcel'} 
                        onClose={actions.handleCloseAdminModal} 
                        showToast={showToast} 
                        onSuccess={() => {
                            refetchStock(true);
                            refetchHistory(true);
                        }} 
                    />

                    <OrderTimelineModal isOpen={actions.adminModal === 'timeline'} onClose={() => actions.setAdminModal(null)} />
                    <BulkUploadModal
                        isOpen={actions.isBulkUploadModalOpen}
                        onClose={() => actions.setIsBulkUploadModalOpen(false)}
                        showToast={showToast}
                        hideToast={hideToast}
                        onSuccess={() => {
                            refetchHistory(true);
                            refetchXuathoadon(true);
                        }}
                    />
                    <EditOrderModal
                        isOpen={!!actions.editingOrder}
                        onClose={() => actions.setEditingOrder(null)}
                        onSuccess={actions.handleEditSuccess}
                        order={actions.editingOrder}
                        showToast={showToast}
                        existingOrderNumbers={allOrders.map(o => o['Số đơn hàng'])}
                    />

                    <TeamEditorModal
                        isOpen={!!actions.editingTeam || actions.isAddingNewTeam}
                        onClose={() => {
                            actions.setEditingTeam(null);
                            actions.setIsAddingNewTeam(false);
                        }}
                        onSave={actions.handleSaveTeam}
                        teamData={teamData}
                        allUsers={allUsers}
                        editingTeam={actions.editingTeam}
                    />
                    <ActiveUsersModal
                        isOpen={isActiveUsersModalOpen}
                        onClose={() => setIsActiveUsersModalOpen(false)}
                        showToast={showToast}
                    />
                    {isAnnouncementModalOpen && (
                        <AnnouncementModal
                            isOpen={isAnnouncementModalOpen}
                            onClose={() => setIsAnnouncementModalOpen(false)}
                            currentNotification={notification}
                            onSave={async (newNotification) => {
                                await updateNotification(newNotification);
                                showToast('Thành công', 'Đã cập nhật thông báo hệ thống.', 'success');
                            }}
                        />
                    )}
                    <TvbhEmailManager
                        isOpen={isTvbhEmailManagerOpen}
                        onClose={() => setIsTvbhEmailManagerOpen(false)}
                        showToast={showToast}
                    />
                </>,
                document.body
            )}
        </div >
    );
};

export default React.memo(AdminView);
