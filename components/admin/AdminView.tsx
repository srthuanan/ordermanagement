import React, { useState, useRef, useEffect } from 'react';
import { Order, StockVehicle, AdminSubView } from '../../types';
import AdminInvoiceTable from './AdminInvoiceTable';
import InvoiceInboxView from './InvoiceInboxView';
import MatchingCockpitView from './MatchingCockpitView';
import AdminVcRequestTable from './AdminVcRequestTable';
import TotalViewDashboard from './TotalViewDashboard';
import ActionModal from './ActionModal';
import { RequestWithImageModal, UploadInvoiceModal } from './AdminActionModals';
import OrderTimelineModal from './OrderTimelineModal';
import SuggestionModal from './SuggestionModal';
import MatchingSuggestionsModal from './MatchingSuggestionsModal';
import BulkUploadModal from './BulkUploadModal';
import EditOrderModal from '../modals/EditOrderModal';
import { useAdminFilters } from '../../hooks/useAdminFilters';
import { useAdminActions } from '../../hooks/useAdminActions';
import { useAdminData } from '../../hooks/useAdminData';
import AdminFilterPanel from './AdminFilterPanel';
import { TeamManagementComponent, TeamEditorModal } from './TeamManagement';
import BulkActionBar from './BulkActionBar';

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
    soldData: Order[];
    teamData: Record<string, string[]>;
    allUsers: User[];
    isLoadingXuathoadon: boolean;
    isLoadingHistory: boolean;
    errorXuathoadon: string | null;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
    onOpenFilePreview: (url: string, label: string) => void;
    isSidebarCollapsed: boolean;
    initialState: { targetTab?: AdminSubView; orderToShow?: Order } | null;
    clearInitialState: () => void;
    onNavigateTo: (view: 'orders' | 'stock' | 'sold' | 'admin' | 'laithu') => void;
    onShowOrderDetails: (order: Order) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, allOrders, xuathoadonData, stockData, soldData, teamData, allUsers, isLoadingXuathoadon, isLoadingHistory, errorXuathoadon, onOpenImagePreview, onOpenFilePreview, isSidebarCollapsed, initialState, clearInitialState, onNavigateTo, onShowOrderDetails }) => {

    const [showMatchingModal, setShowMatchingModal] = useState(false);

    // 1. Filters Hook
    const {
        adminView, setAdminView,
        invoiceFilters, pendingFilters, pairedFilters, vcFilters, matchingFilters,
        handleFilterChange, handleReset,
        setInvoiceFilters, setPendingFilters, setPairedFilters
    } = useAdminFilters({ initialState, clearInitialState });

    // 2. Data Hook
    const {
        pendingSortConfig, setPendingSortConfig,
        pairedSortConfig, setPairedSortConfig,
        vcSortConfig, setVcSortConfig,
        vcRequestsData, isLoadingVc, errorVc,
        selectedRows, setSelectedRows, handleToggleAll,
        fetchVcData,
        processedInvoices, invoiceRequests, pendingData, pairedData, vcRequests,
        suggestionsMap, filterOptions, ordersWithMatches,
        allPendingOrderNumbers, allPairedOrderNumbers, allVcOrderNumbers
    } = useAdminData({
        allOrders, xuathoadonData, stockData,
        invoiceFilters, pendingFilters, pairedFilters, vcFilters,
        adminView,
        isSidebarCollapsed
    });

    // 3. Actions Hook
    const actions = useAdminActions({
        showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, fetchVcData,
        teamData, allOrders, suggestionsMap,
        selectedRows, setSelectedRows, setShowMatchingModal
    });

    // 4. Custom Tab Handlers
    const handleTabChangeFromDashboard = (view: AdminSubView, filters: any = {}) => {
        setAdminView(view);
        if (view === 'invoices') setInvoiceFilters(prev => ({ ...prev, ...filters }));
        if (view === 'pending') {
            setPendingFilters(prev => ({ ...prev, ...filters }));
            if (ordersWithMatches.length > 0) setShowMatchingModal(true);
        }
        if (view === 'paired') setPairedFilters(prev => ({ ...prev, ...filters }));
    };

    const handleManualTabChange = (view: AdminSubView) => {
        setAdminView(view);
        if (view === 'pending' && ordersWithMatches.length > 0) setShowMatchingModal(true);
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

    const adminTools = [
        { title: 'Lưu Trữ Hóa Đơn', icon: 'fa-archive', action: () => actions.setAdminModal('archive') },
        { title: 'Tải Lên HĐ Hàng Loạt', icon: 'fa-file-upload', action: () => actions.setIsBulkUploadModalOpen(true) },
        { title: 'Thêm Xe Mới', icon: 'fa-plus-circle', action: () => actions.setAdminModal('addCar') },
        { title: 'Xóa Xe Khỏi Kho', icon: 'fa-trash-alt', action: () => actions.setAdminModal('deleteCar') },
        { title: 'Phục Hồi Xe', icon: 'fa-undo', action: () => actions.setAdminModal('restoreCar') },
        { title: 'Thêm Nhân Viên', icon: 'fa-user-plus', action: () => actions.setAdminModal('addUser') },
        { title: 'Xóa Đơn Hàng', icon: 'fa-times-circle', action: () => actions.setAdminModal('deleteOrder') },
        { title: 'Hoàn Tác Trạng Thái', icon: 'fa-history', action: () => actions.setAdminModal('revertOrder') },
        { title: 'Tra Cứu Lịch Sử', icon: 'fa-search', action: () => actions.setAdminModal('timeline') },
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

        switch (adminView) {
            case 'dashboard': {
                return (
                    <TotalViewDashboard
                        allOrders={allOrders}
                        stockData={stockData}
                        soldData={soldData}
                        teamData={teamData}
                        allUsers={allUsers}
                        onTabChange={handleTabChangeFromDashboard}
                        onNavigateTo={onNavigateTo}
                        onShowOrderDetails={onShowOrderDetails}
                        invoiceData={processedInvoices}
                    />
                );
            }
            case 'invoices': {
                return (
                    <div key="invoices" className="flex-1 flex flex-col min-h-0 animate-fade-in">
                        <InvoiceInboxView
                            orders={invoiceRequests}
                            onAction={actions.handleAction}
                            showToast={showToast}
                            onOpenFilePreview={onOpenFilePreview}
                            onUpdateInvoiceDetails={actions.handleEditInvoiceDetails}
                        />
                    </div>
                );
            }
            case 'matching': {
                return (
                    <div key="matching" className="flex-1 flex flex-col min-h-0 animate-fade-in">
                        <MatchingCockpitView
                            pendingOrders={pendingData}
                            pairedOrders={pairedData}
                            stockData={stockData}
                            onAction={actions.handleAction}
                            filters={matchingFilters}
                        />
                    </div>
                );
            }
            case 'pending':
            case 'paired': {
                const data = adminView === 'pending' ? pendingData : pairedData;
                const allIds = adminView === 'pending' ? allPendingOrderNumbers : allPairedOrderNumbers;
                const sortConf = adminView === 'pending' ? pendingSortConfig : pairedSortConfig;
                const onSortHandler = adminView === 'pending' ? setPendingSortConfig : setPairedSortConfig;

                return (
                    <div key={adminView} className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0 animate-fade-in">
                        {selectedRows.size > 0 && <BulkActionBar view={adminView} selectedRows={selectedRows} setSelectedRows={setSelectedRows} setBulkActionModal={actions.setBulkActionModal} />}
                        <div className="flex-grow overflow-auto relative hidden-scrollbar">
                            <AdminInvoiceTable
                                viewType={adminView}
                                orders={data}
                                sortConfig={sortConf}
                                onSort={(sortKey: keyof Order) => onSortHandler((p: any) => ({ key: sortKey, direction: p?.key === sortKey && p.direction === 'asc' ? 'desc' : 'asc' }))}
                                selectedRows={selectedRows}
                                onToggleRow={(id: string) => setSelectedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                                onToggleAllRows={() => handleToggleAll(allIds)}
                                onAction={actions.handleAction}
                                showToast={showToast}
                                suggestions={suggestionsMap}
                                onShowSuggestions={(order, cars) => actions.setSuggestionModalState({ order, cars })}
                                onOpenFilePreview={onOpenFilePreview}
                                onUpdateInvoiceDetails={actions.handleEditInvoiceDetails}
                            />
                        </div>
                    </div>
                );
            }
            case 'vc': {
                return (
                    <div key={adminView} className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0 animate-fade-in">
                        {selectedRows.size > 0 && <BulkActionBar view={adminView} selectedRows={selectedRows} setSelectedRows={setSelectedRows} setBulkActionModal={actions.setBulkActionModal} />}
                        <div className="flex-grow overflow-auto relative hidden-scrollbar">
                            <AdminVcRequestTable
                                requests={vcRequests}
                                sortConfig={vcSortConfig}
                                onSort={(key: any) => setVcSortConfig((p: any) => ({ key, direction: p?.key === key && p.direction === 'asc' ? 'desc' : 'asc' }))}
                                selectedRows={selectedRows}
                                onToggleRow={(id: string) => setSelectedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                                onToggleAllRows={() => handleToggleAll(allVcOrderNumbers)}
                                onAction={actions.handleAction}
                                showToast={showToast}
                                onOpenImagePreview={onOpenImagePreview}
                                onDownloadAll={actions.handleDownloadAllVcImages}
                            />
                        </div>
                    </div>
                );
            }
            case 'phongkd': {
                return (
                    <div key={adminView} className="animate-fade-in">
                        <TeamManagementComponent
                            teamData={teamData}
                            onEditTeam={(leader, members) => actions.setEditingTeam({ leader, members })}
                            onAddNewTeam={() => actions.setIsAddingNewTeam(true)}
                            onDeleteTeam={actions.handleDeleteTeam}
                        />
                    </div>
                );
            }
            default: return null;
        }
    };

    const tabs: AdminSubView[] = ['dashboard', 'invoices', 'matching', 'vc', 'phongkd'];
    const labels: Record<AdminSubView, string> = { dashboard: 'Tổng Quan', invoices: 'Xử Lý Hóa Đơn', pending: 'Chờ Ghép', paired: 'Đã Ghép', matching: 'Ghép Xe', vc: 'Xử Lý VC', phongkd: 'Phòng KD' };
    const counts: Record<AdminSubView, number | null> = { dashboard: null, invoices: invoiceRequests.length, pending: pendingData.length, paired: pairedData.length, matching: pendingData.length + pairedData.length, vc: vcRequests.length, phongkd: Object.keys(teamData).length };

    // Modal Inputs
    const addCarInputs = [{ id: 'vin', label: 'Số VIN (17 ký tự)', placeholder: 'Nhập 17 ký tự VIN...', isVIN: true }];
    const deleteCarInputs = [
        { id: 'vinToDelete', label: 'Số VIN cần xóa (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true },
        { id: 'reason', label: 'Lý do xóa (bắt buộc)', placeholder: 'VD: Xe bán lô, xe điều chuyển...', type: 'textarea' as const }
    ];
    const restoreCarInputs = [{ id: 'vinToRestore', label: 'Số VIN cần phục hồi (17 ký tự)', placeholder: 'Nhập chính xác 17 ký tự VIN...', isVIN: true }];
    const deleteOrderInputs = [{ id: 'orderNumber', label: 'Nhập Số đơn hàng để xác nhận', placeholder: 'Ví dụ: SO-123456...' }];
    const revertOrderInputs = [{ id: 'orderNumber', label: 'Nhập Số đơn hàng cần hoàn tác', placeholder: 'Ví dụ: N31913-VSO-25-08-0019' }];
    const addUserInputs = [
        { id: 'fullName', label: 'Họ và Tên', placeholder: 'VD: Nguyễn Văn A', type: 'text' as const },
        { id: 'email', label: 'Email', placeholder: 'VD: an.nguyen@email.com', type: 'text' as const },
    ];
    const cancelRequestInputs = [{ id: 'reason', label: 'Lý do hủy (bắt buộc)', placeholder: 'VD: Khách hàng đổi ý, sai thông tin...', type: 'textarea' as const }];
    const unmatchInputs = [{ id: 'reason', label: 'Lý do hủy ghép (bắt buộc)', placeholder: 'VD: Sai thông tin xe...', type: 'textarea' as const }];

    return (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary mb-2">
                <div className="p-2 flex items-center justify-between gap-1 flex-nowrap">
                    <div className="admin-tabs-container flex items-center border border-border-primary rounded-lg bg-surface-ground p-0.5 overflow-x-auto hidden-scrollbar">
                        {tabs.map(view => {
                            const count = counts[view];
                            return (
                                <button
                                    key={view}
                                    onClick={() => handleManualTabChange(view)}
                                    className={`px-2 py-1 rounded-md text-sm font-semibold transition-colors whitespace-nowrap ${adminView === view ? 'bg-white text-accent-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    {labels[view]}
                                    {count !== null && <span className="text-xs font-mono ml-1 px-1 py-0.5 rounded-full bg-black/5 text-black/50">{count}</span>}
                                </button>
                            )
                        })}
                    </div>
                    <div className="relative" ref={actionMenuRef}>
                        <button onClick={() => setIsActionMenuOpen(prev => !prev)} title="Thao Tác Nhanh" className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-surface-ground text-text-secondary hover:text-accent-primary hover:bg-surface-accent transition-all">
                            <i className="fas fa-bolt text-lg text-accent-primary"></i>
                        </button>
                        {isActionMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-64 bg-surface-card border shadow-lg rounded-lg z-30 p-0.5 animate-fade-in-scale-up" style={{ animationDuration: '150ms' }}>
                                {adminTools.map(tool => (
                                    <button key={tool.title} onClick={() => { tool.action(); setIsActionMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-2 py-1.5 text-sm rounded-md text-text-primary hover:bg-surface-hover">
                                        <i className={`fas ${tool.icon} fa-fw w-5 text-center text-accent-secondary`}></i>
                                        <span>{tool.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
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
                />
            </div>

            <div className="flex-grow min-h-0 flex flex-col">
                {renderCurrentView()}
            </div>

            {actions.suggestionModalState && <SuggestionModal isOpen={!!actions.suggestionModalState} onClose={() => actions.setSuggestionModalState(null)} order={actions.suggestionModalState.order} suggestedCars={actions.suggestionModalState.cars} onConfirm={actions.handleConfirmSuggestion} showToast={showToast} />}
            <MatchingSuggestionsModal
                isOpen={showMatchingModal}
                onClose={() => setShowMatchingModal(false)}
                matches={ordersWithMatches}
                onConfirmMatch={actions.handleConfirmSuggestion}
            />
            {actions.invoiceModalState && (
                <>
                    {/* Invoice Actions */}
                    <ActionModal isOpen={actions.invoiceModalState.type === 'approve'} onClose={() => actions.setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu" description="Xác nhận phê duyệt yêu cầu xuất hóa đơn cho đơn hàng:" targetId={actions.invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-double" onSubmit={() => actions.handleAdminSubmit('approveSelectedInvoiceRequest', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]) }, 'Đã phê duyệt yêu cầu.')} />
                    <RequestWithImageModal isOpen={actions.invoiceModalState.type === 'supplement'} onClose={() => actions.setInvoiceModalState(null)} title="Yêu Cầu Bổ Sung" orderNumber={actions.invoiceModalState.order['Số đơn hàng']} reasonLabel="Nội dung yêu cầu (bắt buộc):" onSubmit={(reason: string, images: string[]) => actions.handleAdminSubmit('requestSupplementForInvoice', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]), reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã gửi yêu cầu bổ sung.')} icon="fa-exclamation-triangle" theme="warning" />
                    <ActionModal isOpen={actions.invoiceModalState.type === 'pendingSignature'} onClose={() => actions.setInvoiceModalState(null)} title="Chuyển Trạng Thái" description="Chuyển đơn hàng sang 'Chờ Ký Hóa Đơn'?" targetId={actions.invoiceModalState.order['Số đơn hàng']} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={() => actions.handleAdminSubmit('markAsPendingSignature', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]) }, 'Đã chuyển trạng thái.')} />
                    <UploadInvoiceModal isOpen={actions.invoiceModalState.type === 'uploadInvoice'} onClose={() => actions.setInvoiceModalState(null)} order={actions.invoiceModalState.order as Order} onSubmit={async (file: File) => {
                        const fileToBase64 = (f: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = e => rej(e); });
                        const base64Data = await fileToBase64(file);
                        return actions.handleAdminSubmit('handleBulkUploadIssuedInvoices', { filesData: JSON.stringify([{ orderNumber: actions.invoiceModalState!.order['Số đơn hàng'], base64Data, mimeType: file.type, fileName: file.name }]) }, 'Đã tải lên hóa đơn thành công.');
                    }} />
                    <ActionModal isOpen={actions.invoiceModalState.type === 'cancel'} onClose={() => actions.setInvoiceModalState(null)} title="Hủy Yêu Cầu Xuất Hóa Đơn" description="Hành động này sẽ hủy yêu cầu và thông báo cho TVBH." targetId={actions.invoiceModalState.order['Số đơn hàng']} inputs={cancelRequestInputs} submitText="Xác Nhận Hủy" submitColor="danger" icon="fa-trash-alt" onSubmit={(data: Record<string, string>) => actions.handleAdminSubmit('cancelRequest', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]), reason: data.reason }, 'Đã hủy yêu cầu.')} />
                    <ActionModal isOpen={actions.invoiceModalState.type === 'unmatch'} onClose={() => actions.setInvoiceModalState(null)} title="Hủy Ghép Xe" description="Hủy ghép xe cho đơn hàng:" targetId={actions.invoiceModalState.order['Số đơn hàng']} inputs={unmatchInputs} submitText="Xác Nhận Hủy Ghép" submitColor="danger" icon="fa-unlink" onSubmit={(data: Record<string, string>) => actions.handleAdminSubmit('unmatchOrder', { orderNumber: actions.invoiceModalState!.order['Số đơn hàng'], reason: data.reason }, 'Đã hủy ghép xe.', 'both')} />
                    <ActionModal isOpen={actions.invoiceModalState.type === 'resend'} onClose={() => actions.setInvoiceModalState(null)} title="Gửi Lại Email" description="Gửi lại email thông báo cho đơn hàng:" targetId={actions.invoiceModalState.order['Số đơn hàng']} submitText="Gửi Lại" submitColor="primary" icon="fa-paper-plane" onSubmit={() => actions.handleAdminSubmit('resendEmail', { orderNumbers: JSON.stringify([actions.invoiceModalState!.order['Số đơn hàng']]), emailType: 'invoice_issued' }, 'Đã gửi lại email.')} />

                    {/* VC Actions */}
                    <ActionModal isOpen={actions.invoiceModalState.type === 'approveVc'} onClose={() => actions.setInvoiceModalState(null)} title="Phê Duyệt Yêu Cầu VC" description="Xác nhận phê duyệt yêu cầu cấp VinClub cho đơn hàng:" targetId={actions.invoiceModalState.order['Số đơn hàng']} submitText="Phê Duyệt" submitColor="success" icon="fa-check-circle" onSubmit={() => actions.handleAdminSubmit('approveVcRequest', { orderNumber: actions.invoiceModalState!.order['Số đơn hàng'] }, 'Đã phê duyệt yêu cầu VC.')} />
                    <RequestWithImageModal isOpen={actions.invoiceModalState.type === 'rejectVc'} onClose={() => actions.setInvoiceModalState(null)} title="Từ Chối Yêu Cầu VC" orderNumber={actions.invoiceModalState.order['Số đơn hàng']} reasonLabel="Lý do từ chối (bắt buộc):" onSubmit={(reason: string, images: string[]) => actions.handleAdminSubmit('rejectVcRequest', { orderNumber: actions.invoiceModalState!.order['Số đơn hàng'], reason, pastedImagesBase64: JSON.stringify(images) }, 'Đã từ chối yêu cầu VC.')} icon="fa-ban" theme="danger" />
                </>
            )}

            {/* Bulk Action Modals */}
            {actions.bulkActionModal && (
                <>
                    <ActionModal isOpen={actions.bulkActionModal.type === 'approve'} onClose={actions.handleCloseBulkActionModal} title="Phê duyệt hàng loạt" description={`Xác nhận phê duyệt ${selectedRows.size} yêu cầu đã chọn?`} submitText="Phê duyệt" submitColor="success" icon="fa-check-double" onSubmit={actions.handleBulkApproveSubmit} />
                    <ActionModal isOpen={actions.bulkActionModal.type === 'pendingSignature'} onClose={actions.handleCloseBulkActionModal} title="Chuyển trạng thái hàng loạt" description={`Chuyển ${selectedRows.size} đơn hàng đã chọn sang "Chờ Ký Hóa Đơn"?`} submitText="Xác Nhận" submitColor="primary" icon="fa-signature" onSubmit={actions.handleBulkPendingSignatureSubmit} />
                    <RequestWithImageModal isOpen={actions.bulkActionModal.type === 'supplement'} onClose={actions.handleCloseBulkActionModal} title="Y/C Bổ sung hàng loạt" orderNumber={`${selectedRows.size} đơn hàng`} reasonLabel="Nội dung yêu cầu (bắt buộc):" icon="fa-exclamation-triangle" theme="warning" onSubmit={actions.handleBulkSupplementSubmit} />
                    <ActionModal isOpen={actions.bulkActionModal.type === 'cancel'} onClose={actions.handleCloseBulkActionModal} title="Hủy hàng loạt" description={`Bạn có chắc muốn hủy ${selectedRows.size} yêu cầu đã chọn? Hành động này sẽ chuyển các mục vào phần "Đã Hủy".`} inputs={cancelRequestInputs} submitText="Xác Nhận Hủy" submitColor="danger" icon="fa-trash-alt" onSubmit={actions.handleBulkCancelSubmit} />
                </>
            )}

            <ActionModal isOpen={actions.adminModal === 'archive'} onClose={actions.handleCloseAdminModal} title="Lưu Trữ Hóa Đơn" description="Lưu trữ hóa đơn đã xuất của tháng trước sang một sheet riêng." submitText="Xác Nhận Lưu Trữ" submitColor="primary" icon="fa-archive" onSubmit={actions.handleArchiveSubmit} />
            <ActionModal isOpen={actions.adminModal === 'addCar'} onClose={actions.handleCloseAdminModal} title="Thêm Xe Mới vào Kho" description="Hệ thống sẽ tự động tra cứu thông tin xe từ số VIN." inputs={addCarInputs} submitText="Thêm Xe" submitColor="primary" icon="fa-plus-circle" onSubmit={actions.handleAddCarSubmit} />
            <ActionModal isOpen={actions.adminModal === 'deleteCar'} onClose={actions.handleCloseAdminModal} title="Xóa Xe Khỏi Kho" description="Xe sẽ bị xóa khỏi trang Kho Xe và thông tin sẽ được lưu vào nhật ký. Có thể phục hồi lại sau bằng chức năng 'Phục Hồi Xe'." inputs={deleteCarInputs} submitText="Xác Nhận Xóa" submitColor="danger" icon="fa-trash-alt" onSubmit={actions.handleDeleteCarSubmit} />
            <ActionModal isOpen={actions.adminModal === 'restoreCar'} onClose={actions.handleCloseAdminModal} title="Phục Hồi Xe Đã Xóa" description="Dựa vào nhật ký xe đã xóa, hệ thống sẽ thêm xe trở lại Kho Xe với trạng thái 'Chưa ghép'." inputs={restoreCarInputs} submitText="Phục Hồi Xe" submitColor="primary" icon="fa-undo" onSubmit={actions.handleRestoreCarSubmit} />
            <ActionModal isOpen={actions.adminModal === 'addUser'} onClose={actions.handleCloseAdminModal} title="Thêm Nhân Viên Mới" description="Thêm một tài khoản nhân viên mới. Hệ thống sẽ tự động tạo tên đăng nhập, mật khẩu và gửi email thông báo." inputs={addUserInputs} submitText="Thêm & Gửi Email" submitColor="primary" icon="fa-user-plus" onSubmit={actions.handleAddUserSubmit} />
            <ActionModal isOpen={actions.adminModal === 'deleteOrder'} onClose={actions.handleCloseAdminModal} title="Xóa Đơn Hàng" description="CẢNH BÁO: Đơn hàng sẽ bị xóa vĩnh viễn và chuyển vào mục 'Đã Hủy'." inputs={deleteOrderInputs} submitText="Tôi hiểu, Xóa Đơn Hàng" submitColor="danger" icon="fa-times-circle" onSubmit={actions.handleDeleteOrderSubmit} />
            <ActionModal isOpen={actions.adminModal === 'revertOrder'} onClose={actions.handleCloseAdminModal} title="Hoàn Tác Trạng Thái" description="Khôi phục lại trạng thái cuối cùng của đơn hàng trong nhật ký." inputs={revertOrderInputs} submitText="Thực Hiện Hoàn Tác" submitColor="primary" icon="fa-history" onSubmit={actions.handleRevertOrderSubmit} />

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
        </div>
    );
};

export default React.memo(AdminView);
