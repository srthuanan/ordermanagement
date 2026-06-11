import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import DataRecoveryModal from './DataRecoveryModal';
import { useGlobalNotification } from '../../hooks/useGlobalNotification';
import AdminStats from './AdminStats';
import IncompleteCarsView from './IncompleteCarsView';
import SuperManagementView from './SuperManagementView';
import InquiryManagementView from './InquiryManagementView';
import HoldManagementView from './HoldManagementView';
import PolicyManagementView from './PolicyManagementView';
import { exportOrderReport, exportAllSavedOrdersToExcel } from '../../utils/excelUtils';
import DonHangTonView from './DonHangTonView';
import AIKnowledgeManagement from './AIKnowledgeManagement';
import PolicySummaryView from './PolicySummaryView';
import PricingCalculatorView from './PricingCalculatorView';
import MaintenanceFeeManager from './MaintenanceFeeManager';
import VehicleConfigManager from './VehicleConfigManager';

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
    isReferenceAccount?: boolean;
}

const AdminView: React.FC<AdminViewProps> = ({ showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon, refetchAdminData, allOrders, xuathoadonData, stockData, teamData, allUsers, isLoadingHistory, onOpenImagePreview, onOpenFilePreview, isSidebarCollapsed, initialState, clearInitialState, isReferenceAccount: _isReferenceAccount }) => {

    const [showMatchingModal, setShowMatchingModal] = useState(false);
    const [isActiveUsersModalOpen, setIsActiveUsersModalOpen] = useState(false);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isTvbhEmailManagerOpen, setIsTvbhEmailManagerOpen] = useState(false);
    const [isDataRecoveryModalOpen, setIsDataRecoveryModalOpen] = useState(false);
    const { notification, updateNotification } = useGlobalNotification();

    // Persistent View State
    const [viewState, setViewState] = useState(() => {
        try {
            const saved = localStorage.getItem('adminViewState');
            return saved ? JSON.parse(saved) : {
                invoices: { folder: 'pending_approval', orderId: null as string | null },
                matching: { tab: 'pending' as 'pending' | 'paired' | 'suggested', orderId: null as string | null },
                vc: { folder: 'pending', requestId: null as string | null }
            };
        } catch {
            return {
                invoices: { folder: 'pending_approval', orderId: null as string | null },
                matching: { tab: 'pending' as 'pending' | 'paired' | 'suggested', orderId: null as string | null },
                vc: { folder: 'pending', requestId: null as string | null }
            };
        }
    });

    useEffect(() => {
        localStorage.setItem('adminViewState', JSON.stringify(viewState));
    }, [viewState]);

    const [hiddenTabs, setHiddenTabs] = useState<AdminSubView[]>(() => {
        try {
            const saved = localStorage.getItem('adminHiddenTabs');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('adminHiddenTabs', JSON.stringify(hiddenTabs));
    }, [hiddenTabs]);

    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'adminHiddenTabs' && e.newValue) {
                try {
                    setHiddenTabs(JSON.parse(e.newValue));
                } catch (err) {
                    console.error("Failed to sync hiddenTabs from storage event", err);
                }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const toggleTabVisibility = (view: AdminSubView) => {
        setHiddenTabs(prev => 
            prev.includes(view) ? prev.filter(v => v !== view) : [...prev, view]
        );
    };

    const [isManageTabsModalOpen, setIsManageTabsModalOpen] = useState(false);

    const handleInvoiceStateChange = (updates: Partial<typeof viewState.invoices>) => {
        setViewState((prev: any) => ({ ...prev, invoices: { ...prev.invoices, ...updates } }));
    };

    const handleMatchingStateChange = (updates: Partial<typeof viewState.matching>) => {
        setViewState((prev: any) => ({ ...prev, matching: { ...prev.matching, ...updates } }));
    };

    const handleVcStateChange = (updates: Partial<typeof viewState.vc>) => {
        setViewState((prev: any) => ({ ...prev, vc: { ...prev.vc, ...updates } }));
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
        isLoadingXuathoadon: isLoadingXuathoadonLocal,
        selectedRows, setSelectedRows,
        fetchVcData,
        fetchXuathoadonData,
        processedInvoices, invoiceRequests, pendingData, pairedData, vcRequests,
        suggestionsMap, ordersWithMatches, filterOptions
    } = useAdminData({
        allOrders, stockData,
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
        showToast, hideToast, refetchHistory, refetchStock, refetchXuathoadon: fetchXuathoadonData, refetchAdminData, fetchVcData,
        teamData, allUsers, allOrders, suggestionsMap,
        selectedRows, setSelectedRows, setShowMatchingModal
    });

    // 4. Custom Tab Handlers




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

    const [currentCategory, setCurrentCategory] = useState<'orders' | 'inventory' | 'system' | 'stats'>(() => {
        return (localStorage.getItem('adminCurrentCategory') as any) || 'orders';
    });

    useEffect(() => {
        localStorage.setItem('adminCurrentCategory', currentCategory);
    }, [currentCategory]);

    const categories = {
        orders: {
            label: 'ĐƠN HÀNG',
            icon: 'fa-file-invoice-dollar',
            views: ['matching', 'invoices', 'policy_summary', 'pricing_calculator', 'don_ton'] as AdminSubView[]
        },
        inventory: {
            label: 'KHO XE',
            icon: 'fa-car-side',
            views: ['inquiries', 'holds'] as AdminSubView[]
        },
        system: {
            label: 'HỆ THỐNG',
            icon: 'fa-cogs',
            views: ['super_edit', 'incomplete_cars', 'policies', 'ai_knowledge', 'phongkd', 'maintenance_fee', 'vehicle_config'] as AdminSubView[]
        },
        stats: {
            label: 'THỐNG KÊ',
            icon: 'fa-chart-pie',
            views: ['stats'] as AdminSubView[]
        }
    };

    // Auto-redirect if current adminView is hidden
    useEffect(() => {
        if (hiddenTabs.includes(adminView)) {
            // Find first visible tab in current category
            const visibleInCurrent = categories[currentCategory].views.filter(v => !hiddenTabs.includes(v));
            if (visibleInCurrent.length > 0) {
                setAdminView(visibleInCurrent[0]);
            } else {
                // If all in current are hidden, find first visible in ANY category
                const allVisible = Object.values(categories).flatMap(c => c.views).filter(v => !hiddenTabs.includes(v));
                if (allVisible.length > 0) {
                    setAdminView(allVisible[0]);
                }
            }
        }
    }, [hiddenTabs, adminView, currentCategory, categories]);

    const labels: Record<AdminSubView, string> = {
        invoices: 'HÓA ĐƠN',
        pending: 'CHỜ GHÉP',
        paired: 'ĐÃ GHÉP',
        matching: 'GHÉP XE',
        vc: 'XỬ LÝ VC',
        phongkd: 'PHÒNG KD',
        stats: 'THỐNG KÊ',
        incomplete_cars: 'BỔ SUNG PB',
        inquiries: 'TRA CỨU KHO',
        holds: 'QUẢN LÝ GIỮ',
        super_edit: 'QUẢN LÝ NÂNG CAO',
        policies: 'CHÍNH SÁCH',
        don_ton: 'ĐƠN TỒN DMS',
        policy_summary: 'TỔNG HỢP CS',
        pricing_calculator: 'CÔNG CỤ TÍNH GIÁ',
        ai_knowledge: 'TRI THỨC AI',
        ai_health: 'SỨC KHỎE AI',
        management: 'QUẢN TRỊ',
        inventory: 'KHO XE',
        system: 'HỆ THỐNG',
        maintenance_fee: 'KINH PHÍ WEB',
        vehicle_config: 'CẤU HÌNH XE'
    };
    const [unreadInquiryCount, setUnreadInquiryCount] = useState<number>(0);

    useEffect(() => {
        // Tự động chuyển Category khi adminView thay đổi (ví dụ khi bấm Notification)
        Object.entries(categories).forEach(([key, cat]) => {
            if (cat.views.includes(adminView)) {
                setCurrentCategory(key as any);
            }
        });
    }, [adminView]);

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

    const suggestedCount = useMemo(() => {
        const normalizeStr = (str: any) => {
            if (!str) return '';
            return String(str).normalize('NFC').trim();
        };

        return pendingData.filter(order => {
            const oModel = normalizeStr(order['Dòng xe']);
            const oExterior = normalizeStr(order['Ngoại thất']);
            const oInterior = normalizeStr(order['Nội thất']);
            const oVersion = normalizeStr(order['Phiên bản']);

            const exactMatches = stockData.filter(car =>
                normalizeStr(car['Dòng xe']) === oModel &&
                normalizeStr(car['Ngoại thất']) === oExterior &&
                normalizeStr(car['Nội thất']) === oInterior &&
                (!oVersion || normalizeStr(car['Phiên bản']) === oVersion) &&
                (!car['Trạng thái'] || car['Trạng thái'] === 'Chưa ghép')
            );
            return exactMatches.length > 0;
        }).length;
    }, [pendingData, stockData]);

    const counts: Record<AdminSubView, number | null> = { 
        invoices: invoiceRequests.length, 
        pending: pendingData.length, 
        paired: pairedData.length, 
        matching: pendingData.length + pairedData.length, 
        vc: vcRequests.length, 
        phongkd: Object.keys(teamData).length, 
        stats: null, 
        incomplete_cars: stockData.filter(car => !car['Phiên bản'] || car['Phiên bản'].trim() === '').length, 
        super_edit: null, 
        inquiries: unreadInquiryCount || null,
        holds: null,
        policies: null,
        don_ton: null,
        policy_summary: allOrders.filter(o => o['CHÍNH SÁCH'] && o['CHÍNH SÁCH'].trim() !== '' && (o['Kết quả'] === 'Đã ghép' || o['Kết quả'] === 'Chưa ghép')).length,
        pricing_calculator: null,
        ai_knowledge: null,
        ai_health: null,
        management: null,
        inventory: null,
        system: null,
        maintenance_fee: null,
        vehicle_config: null
    };


    const adminTools = [
        { title: 'Hộp thư Xử lý VC', icon: 'fa-file-invoice-dollar text-red-500', action: () => setAdminView('vc') },
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
        { title: 'Cài Đặt Hiển Thị Tab', icon: 'fa-eye-slash', action: () => setIsManageTabsModalOpen(true) },
        { title: 'Cài Đặt Thông Báo', icon: 'fa-bullhorn', action: () => setIsAnnouncementModalOpen(true) },
        { title: 'Khôi Phục CSDL Lõi', icon: 'fa-database text-red-500', action: () => setIsDataRecoveryModalOpen(true) },
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
        { id: 'fullName', label: 'Họ và Tên Nhân Viên', placeholder: 'VD: Nguyễn Văn A', type: 'text' as const },
        { id: 'email', label: 'Email Nhân Viên', placeholder: 'VD: nhanvien@vinfast.vn', type: 'email' as const },
        { 
            id: 'role', 
            label: 'Chức Vụ / Vai Trò', 
            type: 'select' as const, 
            options: ['Tư vấn bán hàng', 'Trưởng Phòng Kinh Doanh', 'Admin', 'Kế Toán', 'Điều Phối'] 
        },
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
                        isLoading={isLoadingXuathoadonLocal}
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

                {/* Policy Summary View */}
                <div className={adminView === 'policy_summary' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <PolicySummaryView orders={allOrders} showToast={showToast} />
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

                {/* AI Knowledge Management View */}
                <div className={adminView === 'ai_knowledge' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <AIKnowledgeManagement />
                </div>

                {/* Pricing Calculator View */}
                <div className={adminView === 'pricing_calculator' ? 'flex-1 flex flex-col min-h-0' : 'hidden'}>
                    <PricingCalculatorView />
                </div>
                {/* Maintenance Fee View */}
                <div className={adminView === 'maintenance_fee' ? 'flex-1 flex flex-col min-h-0 overflow-y-auto' : 'hidden'}>
                    <MaintenanceFeeManager showToast={showToast} />
                </div>

                {/* Vehicle Config Manager */}
                <div className={adminView === 'vehicle_config' ? 'flex-1 flex flex-col min-h-0 overflow-y-auto' : 'hidden'}>
                    <VehicleConfigManager showToast={showToast} />
                </div>
            </>
        );
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-slate-50/50">
            {/* COMPACT LEFT SIDEBAR: Main Categories */}
            <div className="hidden md:flex w-[56px] flex-shrink-0 flex-col bg-white border-r border-slate-200 z-[60] shadow-sm">
                <div className="flex flex-col items-center py-6 gap-4">
                    <div className="flex flex-col gap-2 w-full px-2">
                        {Object.entries(categories).map(([key, cat]) => {
                            const isActive = currentCategory === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setCurrentCategory(key as any);
                                        const visibleInCat = cat.views.filter(v => !hiddenTabs.includes(v));
                                        if (visibleInCat.length > 0) {
                                            setAdminView(visibleInCat[0]);
                                        }
                                    }}
                                    title={cat.label}
                                    className={`
                                        relative w-full aspect-square flex items-center justify-center rounded-xl transition-all duration-300 group
                                        ${isActive 
                                            ? 'bg-red-50 text-red-600 shadow-sm border border-red-100' 
                                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}
                                    `}
                                >
                                    <div className={`
                                        w-8 h-8 rounded-lg flex items-center justify-center transition-all
                                        ${isActive ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 group-hover:bg-slate-200'}
                                    `}>
                                        <i className={`fas ${cat.icon} text-[12px]`}></i>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header for Content Pane: Sub-tabs & Filters */}
                <div className="flex-shrink-0 bg-white border-b border-slate-200 z-[50]">
                    {/* MOBILE TOP NAV (Shown only on small screens) */}
                    <div className="flex md:hidden items-center gap-1 overflow-x-auto no-scrollbar p-2 border-b border-border-secondary/20 bg-slate-900">
                        {Object.entries(categories).map(([key, cat]) => {
                            const isActive = currentCategory === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setCurrentCategory(key as any);
                                        const visibleInCat = cat.views.filter(v => !hiddenTabs.includes(v));
                                        if (visibleInCat.length > 0) {
                                            setAdminView(visibleInCat[0]);
                                        }
                                    }}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all
                                        ${isActive ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}
                                    `}
                                >
                                    <i className={`fas ${cat.icon} text-[10px]`}></i>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{cat.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50/50 gap-4">
                        <div className="flex items-center overflow-x-auto no-scrollbar gap-1 flex-1">
                            {categories[currentCategory].views.filter(view => !hiddenTabs.includes(view)).map(view => {
                                const count = counts[view];
                                const isActive = adminView === view;
                                return (
                                    <button
                                        key={view}
                                        onClick={() => setAdminView(view)}
                                        className={`
                                            relative px-3 py-1.5 min-w-[80px] text-[9.5px] font-bold tracking-tight transition-all duration-300 rounded-lg flex items-center justify-center gap-2 whitespace-nowrap
                                            ${isActive
                                                ? 'bg-white text-red-600 shadow-sm border border-red-100'
                                                : 'text-slate-400 hover:text-slate-600'}
                                        `}
                                    >
                                        <span>{labels[view]}</span>
                                        {count !== null && (
                                            <span className={`
                                                text-[8px] font-mono px-1 py-0.5 rounded
                                                ${isActive ? 'bg-red-50 text-red-500' : 'bg-slate-200/50 text-slate-400'}
                                            `}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex-shrink-0 flex items-center">
                            <div id="admin-filter-portal-target" className="flex items-center">
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
                                    refetchXuathoadon={fetchXuathoadonData}
                                    refetchHistory={refetchHistory}
                                    fetchVcData={fetchVcData}
                                    isLoadingXuathoadon={isLoadingXuathoadonLocal}
                                    isLoadingHistory={isLoadingHistory}
                                    isLoadingVc={isLoadingVc}
                                    activeMatchingTab={matchingTab}
                                    suggestedCount={suggestedCount}
                                />
                            </div>
                            
                            {/* PORTAL: Admin Lightning Action Menu into local header if needed, but portal stays the same */}
                        </div>
                    </div>
                </div>

                <div className="flex-grow min-h-0 flex flex-col relative overflow-hidden">
                    {renderCurrentView()}
                </div>
            </div>

            {/* PORTAL: Admin Lightning Action Menu into Global Header */}
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
                        <div className="fixed sm:absolute top-[56px] sm:top-full left-2 right-2 sm:left-auto sm:right-0 sm:mt-3 w-auto sm:w-64 bg-white border border-border-primary shadow-[0_10px_40px_rgba(0,0,0,0.12)] rounded-2xl z-[12000] p-1.5 animate-fade-in-scale-up origin-top sm:origin-top-right">
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
                    <ActionModal showToast={showToast} isOpen={actions.adminModal === 'addUser'} onClose={actions.handleCloseAdminModal} title="Mời Nhân Viên Mới" description="Hệ thống sẽ tạo một Link mời riêng biệt. Admin hãy COPY và GỬI Link này cho nhân viên để họ tự đăng ký Email và Mật khẩu." inputs={addUserInputs} submitText="Tạo Link Mời" submitColor="primary" icon="fa-user-plus" onSubmit={actions.handleAddUserSubmit} />
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
                    <DataRecoveryModal
                        isOpen={isDataRecoveryModalOpen}
                        onClose={() => setIsDataRecoveryModalOpen(false)}
                        showToast={showToast}
                    />
                    
                    {isManageTabsModalOpen && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[150] flex items-center justify-center p-2 sm:p-6">
                            <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] sm:rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up border border-white/20">
                                {/* Header */}
                                <div className="p-4 sm:p-6 border-b border-slate-100/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3 sm:gap-4">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg transform -rotate-3">
                                            <i className="fas fa-th-large text-sm sm:text-lg"></i>
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-800 text-lg sm:text-2xl tracking-tight">Cấu Hình Tab</h3>
                                            <p className="text-[10px] sm:text-sm text-slate-400 font-medium">Bật/tắt các thẻ chức năng quan trọng</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsManageTabsModalOpen(false)} 
                                        className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl sm:rounded-2xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all shadow-sm group"
                                    >
                                        <i className="fas fa-times group-hover:rotate-90 transition-transform duration-300 text-xs sm:text-base"></i>
                                    </button>
                                </div>

                                {/* Body - Horizontal Grid */}
                                <div className="p-4 sm:p-8 bg-slate-50/30 overflow-y-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                                        {Object.entries(categories).map(([catKey, cat]) => (
                                            <div key={catKey} className="flex flex-col h-full bg-white/50 p-4 sm:p-6 rounded-3xl border border-slate-100/50 shadow-sm">
                                                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-600 text-white flex items-center justify-center text-[10px] sm:text-[11px] shadow-md shadow-red-100">
                                                        <i className={`fas ${cat.icon}`}></i>
                                                    </div>
                                                    <div className="text-[10px] sm:text-[12px] font-black text-slate-800 uppercase tracking-widest">{cat.label}</div>
                                                </div>
                                                
                                                <div className="flex flex-col gap-2 sm:gap-3">
                                                    {cat.views.map(view => {
                                                        const isVisible = !hiddenTabs.includes(view);
                                                        return (
                                                            <div 
                                                                key={view} 
                                                                onClick={() => toggleTabVisibility(view)}
                                                                className={`
                                                                    group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-300
                                                                    ${isVisible 
                                                                        ? 'bg-white shadow-sm border border-slate-200' 
                                                                        : 'bg-slate-100/50 opacity-50 border border-transparent'}
                                                                    hover:border-red-200 hover:shadow-md
                                                                `}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`
                                                                        w-8 h-8 rounded-lg flex items-center justify-center transition-all
                                                                        ${isVisible ? 'bg-red-50 text-red-600 font-bold' : 'bg-slate-200 text-slate-400'}
                                                                    `}>
                                                                        <i className={`fas ${isVisible ? 'fa-check' : 'fa-eye-slash'} text-[10px]`}></i>
                                                                    </div>
                                                                    <span className={`text-[12.5px] font-bold tracking-tight ${isVisible ? 'text-slate-700' : 'text-slate-400'}`}>
                                                                        {labels[view]}
                                                                    </span>
                                                                </div>
                                                                
                                                                <div className={`
                                                                    w-8 h-4 rounded-full transition-colors duration-300 flex items-center px-0.5
                                                                    ${isVisible ? 'bg-red-600' : 'bg-slate-300'}
                                                                `}>
                                                                    <div className={`
                                                                        w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 transform
                                                                        ${isVisible ? 'translate-x-4' : 'translate-x-0'}
                                                                    `}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4 sm:p-8 border-t border-slate-100/50 bg-white flex justify-end">
                                    <button 
                                        onClick={() => setIsManageTabsModalOpen(false)}
                                        className="w-full sm:w-auto px-10 py-3.5 bg-slate-900 text-white rounded-2xl text-xs sm:text-sm font-black hover:bg-red-600 transition-all shadow-xl hover:shadow-red-200 active:scale-95"
                                    >
                                        LƯU CẤU HÌNH & ĐÓNG
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>,
                document.body
            )}
        </div>
    );
};

export default React.memo(AdminView);
