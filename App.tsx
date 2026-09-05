import React, { useState, useMemo, Suspense, useEffect, useCallback, useRef } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { DropdownFilterConfig } from './components/ui/Filters';
import TabbedFilter from './components/ui/TabbedFilter';
import MultiSelectDropdown from './components/ui/MultiSelectDropdown';

// Lazy Load Components
import StockView from './components/StockView';
import SoldCarsView from './components/SoldCarsView';
import AdminView from './components/admin/AdminView';
import PricingCalculatorIframeView from './components/PricingCalculatorIframeView';
const TestDriveForm = React.lazy(() => import('./components/testdrive/TestDriveForm'));
const VirtualAssistant = React.lazy(() => import('./components/VirtualAssistant'));

// Eager imports for modals (lightweight enough or critical)
import { OrderDetailView } from './components/OrderDetailView';
import CancelRequestModal from './components/modals/CancelRequestModal';
import RequestInvoiceModal from './components/modals/RequestInvoiceModal';
import SupplementaryFileModal from './components/modals/SupplementaryFileModal';
import CreateRequestModal from './components/modals/CreateRequestModal';
import SuperEditModal from './components/modals/SuperEditModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';
import ImagePreviewModal from './components/modals/ImagePreviewModal';
import ActionModal from './components/admin/ActionModal';
import RequestVcModal from './components/modals/RequestVcModal';
import FilePreviewModal from './components/modals/FilePreviewModal';
import PendingStatsModal from './components/modals/PendingStatsModal';
import HoldExtensionModal from './components/modals/HoldExtensionModal';
import FifoAlertModal from './components/modals/FifoAlertModal';
import GlobalSearchModal from './components/modals/GlobalSearchModal';
import OrderGridView from './components/OrderGridView';
import CustomTitleBar from './components/layout/CustomTitleBar';
import ReportBacklogModal from './components/modals/ReportBacklogModal';
import MaintenanceFeeBlocker from './components/MaintenanceFeeBlocker';

import { useAppNavigation } from './hooks/useAppNavigation';
import { useNotification } from './hooks/useNotification';
import { useAppData } from './hooks/useAppData';
import { useOrderOperations } from './hooks/useOrderOperations';
import { useOrderFiltering } from './hooks/useOrderFiltering';
import { useHoldReminder } from './hooks/useHoldReminder';


import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';
import RealtimeFooterClock from './components/layout/RealtimeFooterClock';
import StockArrivalPopup from './components/ui/StockArrivalPopup';
import BroadcastPopup from './components/ui/BroadcastPopup';
// import LuckyMoneyWidget from './components/ui/LuckyMoneyWidget';
import { ADMIN_USER } from './constants';
import * as apiService from './services/apiService';
import { supabase } from './services/apiService';
import { AnalyticsData, Order } from './types';
import { GlobalNotificationProvider } from './components/context/GlobalNotificationContext';


moment.locale('vi');

interface AppProps {
    onLogout: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
}

const LoadingFallback = () => (
    <div className="flex items-center justify-center h-full">
        <div style={{ border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
);

const App: React.FC<AppProps> = ({ onLogout, showToast, hideToast }) => {
    const currentUser = localStorage.getItem("currentConsultant") || sessionStorage.getItem("currentConsultant") || ADMIN_USER;
    const currentUserName = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "User";
    const userRoleRaw = localStorage.getItem("userRole") || sessionStorage.getItem("userRole");

    // Nâng cấp logic check Admin: Dựa trên Username, Role hoặc Tên đầy đủ
    const isCurrentUserAdmin = useMemo(() => {
        const username = currentUserName.toLowerCase();
        const role = userRoleRaw;
        const name = currentUser;
        return username === 'admin' || role === 'Quản trị viên' || name === ADMIN_USER;
    }, [currentUserName, userRoleRaw, currentUser]);

    const userRole = isCurrentUserAdmin ? 'Quản trị viên' : (userRoleRaw || 'Tư vấn bán hàng');
    const isReferenceAccount = userRoleRaw === 'TK Tham khảo';

    const {
        isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, activeView, setActiveView,
        initialAdminState, showOrderInAdmin, showAdminTab, showInquiryInAdmin, clearInitialState
    } = useAppNavigation();

    const {
        allHistoryData, setAllHistoryData, historyData, isLoadingHistory, errorHistory, refetchHistory, archivesLoadedFromCache,
        stockData, queuedVins, isLoadingStock, errorStock, refetchStock, highlightedVins,
        testDriveData, setTestDriveData, isLoadingTestDrive, refetchTestDrive,
        xuathoadonData, isLoadingXuathoadon, errorXuathoadon, refetchXuathoadon,
        teamData, allUsers, fetchAdminData
    } = useAppData({ currentUser, currentUserName, userRole, isCurrentUserAdmin, showToast });

    const {
        notifications, unreadCount, isNotificationPanelOpen, notificationContainerRef,
        toggleNotificationPanel, handleMarkAllAsRead, handleNotificationClick,
        fetchNotifications: fetchNotificationsInternal, requestNotificationPermission
    } = useNotification(showToast);


    const {
        selectedOrder, setSelectedOrder,
        orderToCancel, setOrderToCancel,
        orderToRequestInvoice, setOrderToRequestInvoice,
        orderToSupplement, setOrderToSupplement,
        orderToEdit, setOrderToEdit,
        orderToRequestVC, setOrderToRequestVC,
        orderToConfirmVC, setOrderToConfirmVC,
        orderToSuperEdit, setOrderToSuperEdit,
        createRequestData, setCreateRequestData,
        isChangePasswordModalOpen, setIsChangePasswordModalOpen,
        imagePreview, setImagePreview,
        filePreview, setFilePreview,
        isPendingStatsModalOpen, setIsPendingStatsModalOpen,
        processingOrder, processingVin,
        handleHoldCar, handleReleaseCar, handleJoinQueue, handleLeaveQueue, handleRequestExtension, handleViewDetails, handleCancelOrder, handleRequestInvoice,
        handleSupplementFiles, handleEditSuccess, handleSuperEditSuccess, handleConfirmRequestVC, handleConfirmVC,
        handleCreateRequestForVehicle, handleCreateRequestClose, handleFormSuccess,
        openImagePreviewModal, openFilePreviewModal,
        extensionVehicle, setExtensionVehicle, handleSelectPolicy
    } = useOrderOperations({ showToast, hideToast, refetchHistory, refetchStock, setAllHistoryData, isReferenceAccount });

    const [isBacklogModalOpen, setIsBacklogModalOpen] = useState(false);
    const [mobileSubTab, setMobileSubTab] = useState<'list' | 'detail'>('list');

    const handleSelectOrderMobile = useCallback((order: Order) => {
        handleViewDetails(order);
        setMobileSubTab('detail');
    }, [handleViewDetails]);

    // Tự động nhắc nhở sắp hết hạn giữ xe
    useHoldReminder({ stockData, currentUser, username: currentUserName });

    // Deep link: chuyển hướng sang Bản đồ khi URL có vin
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let vin = params.get('vin');
        if (!vin && window.location.hash.includes('?')) {
            const hashSearch = window.location.hash.split('?')[1];
            const hashParams = new URLSearchParams(hashSearch);
            vin = hashParams.get('vin');
        }
        if (vin) {
            console.log("Deep link detected for VIN:", vin);
            setActiveView('stock');
            setStockSearch(vin);
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, [setActiveView]);

    // State để điều hướng từ thông báo đến đúng xe
    const [stockSearch, setStockSearch] = useState('');

    useEffect(() => {
        const handleNavigateStock = (e: any) => {
            const vin = e.detail?.vin;
            if (vin) {
                // Force state change by clearing first
                setStockSearch('');
                setTimeout(() => {
                    setStockSearch(vin);
                    setActiveView('stock');
                }, 10);
            }
        };
        window.addEventListener('navigate-stock', handleNavigateStock);
        return () => window.removeEventListener('navigate-stock', handleNavigateStock);
    }, [setActiveView]);

    const [isStockEnabled, setIsStockEnabled] = useState(true);
    const [isTogglingStock, setIsTogglingStock] = useState(false);
    const [isChatEnabled, setIsChatEnabled] = useState(true);
    const [isTogglingChat, setIsTogglingChat] = useState(false);

    const fetchAppConfig = useCallback(async () => {
        try {
            const [stockRes, chatRes] = await Promise.all([
                apiService.getAppSetting('stock_visibility'),
                apiService.getAppSetting('chat_visibility')
            ]);

            if (stockRes && stockRes.status === 'SUCCESS' && stockRes.data) {
                setIsStockEnabled(!stockRes.data.isStockHidden);
            }
            if (chatRes && chatRes.status === 'SUCCESS' && chatRes.data) {
                setIsChatEnabled(!chatRes.data.isChatHidden);
            }
        } catch (e) {
            console.error("Failed to fetch app config from Supabase:", e);
        }
    }, []);

    useEffect(() => {
        fetchAppConfig();
        const interval = setInterval(fetchAppConfig, 120000); // Tăng lên 2 phút (chỉ là dự phòng)

        // --- REALTIME SUBSCRIPTION FOR APP SETTINGS ---
        console.log("Initializing App Settings Realtime...");
        const channel = supabase
            .channel('app_settings_sync')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'app_settings' },
                (payload) => {
                    console.log('--- SYSTEM CONFIG CHANGE DETECTED ---', payload);
                    const newData = payload.new as any;

                    if (newData) {
                        if (newData.key === 'stock_visibility') {
                            const isHidden = !!newData.value?.isStockHidden;
                            console.log("Stock visibility changed! Hidden:", isHidden);
                            setIsStockEnabled(!isHidden);
                            // Nếu vừa được mở lại (isHidden = false), refetch ngay lập tức
                            if (!isHidden) {
                                console.log("System re-enabled stock, forcing refetch...");
                                refetchStock();
                            }
                        }
                        if (newData.key === 'chat_visibility') {
                            const isHidden = !!newData.value?.isChatHidden;
                            console.log("Chat visibility changed! Hidden:", isHidden);
                            setIsChatEnabled(!isHidden);
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log('App Settings Subscription Status:', status);
                if (status === 'CHANNEL_ERROR') {
                    console.error("Realtime connection error. Polling will handle updates.");
                }
            });

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, [fetchAppConfig, refetchStock]); // Thêm refetchStock vào dependency

    // NOTE: Global auto-sync via Realtime channel was removed to prevent race conditions 
    // and data duplication. Synchronization is now handled reliably by database triggers
    // at the Supabase level (see 20260410160000_re_enable_gas_sync.sql).


    const prevStockEnabledRef = useRef<boolean | null>(null);
    useEffect(() => {
        if (prevStockEnabledRef.current !== null && prevStockEnabledRef.current !== isStockEnabled) {
            if (!isStockEnabled) {
                showToast('Hệ Thống Tạm Ẩn Kho', 'Quản trị viên đang cập nhật dữ liệu. Kho xe sẽ tạm thời không khả dụng.', 'warning', 10000);
            } else {
                showToast('Hệ Thống Mở Lại Kho', 'Dữ liệu đã được cập nhật xong. Bạn có thể xem kho xe ngay bây giờ.', 'success', 10000);
            }
        }
        prevStockEnabledRef.current = isStockEnabled;
    }, [isStockEnabled, showToast]);

    // --- TÍNH NĂNG TỰ ĐỘNG REFRESH KHI KHO ĐƯỢC MỞ LẠI ---
    const [reputation, setReputation] = useState<{ score: number; total: number; matched: number; bonus?: number, isNewUser?: boolean } | undefined>(undefined);

    // --- REALTIME REPUTATION UPDATES ---
    useEffect(() => {
        const identifier = (currentUserName || currentUser || "").toLowerCase();
        if (!identifier) return;

        const fetchReputation = async () => {
            const res = await apiService.getHoldReputation(identifier);
            setReputation(res);
        };

        fetchReputation();

        // Subscribe to changes for CURRENT user
        const channel = supabase
            .channel(`reputation_${identifier}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_reputation_cache',
                    filter: `username=eq.${identifier}`
                },
                (payload) => {
                    console.log('--- REPUTATION UPDATE DETECTED ---', payload);
                    const row = payload.new as any;
                    if (row) {
                        setReputation({
                            score: row.score,
                            total: row.total_holds,
                            matched: row.matched_holds,
                            isChampion: row.is_champion,
                            isNewUser: row.total_holds === 0,
                            bonus: (row.score >= 90 && row.matched_holds >= 5) ? 1 : 0,
                            last_updated: row.last_updated
                        } as any);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserName, currentUser]); // Removed activeView to keep it focused on data

    const canHoldMore = useMemo(() => {
        // QUYỀN ADMIN: Không bao giờ bị chặn giữ xe
        if (isCurrentUserAdmin) return true;

        // Đếm số xe đang giữ của người dùng hiện tại
        const currentHoldsCount = stockData.filter((v: any) =>
            v['Trạng thái'] === 'Đang giữ' &&
            (v['Người Giữ Xe']?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC') ||
                v['username_giu_xe']?.trim().toLowerCase() === currentUserName?.trim().toLowerCase())
        ).length;

        // Nếu chưa tải xong reputation, nhưng đã giữ >= 5 xe thì khóa tạm thời để an toàn
        if (!reputation) {
            return currentHoldsCount < 5;
        }

        let maxHolds = 0;
        // Logic đồng bộ với apiService.ts: Ưu tiên nhân sự mới (5 xe), Vinh danh quán quân (6 xe)
        if ((reputation.total || 0) === 0) {
            maxHolds = reputation.isNewUser ? 5 : 3;
        } else if (reputation.score < 15) {
            maxHolds = 1;
        } else if (reputation.score < 40) {
            maxHolds = 2;
        } else if (reputation.score < 65) {
            maxHolds = 3;
        } else if (reputation.score < 85) {
            maxHolds = 4;
        } else {
            // Hạng Tinh Anh: 6 xe nếu là Quán quân tháng qua, còn lại 5 xe
            maxHolds = (reputation as any).isChampion ? 6 : 5;
        }

        if (maxHolds > 0 && maxHolds < 5 && reputation.bonus) {
            maxHolds += reputation.bonus;
        }

        return currentHoldsCount < maxHolds;
    }, [reputation, stockData, currentUser, currentUserName]);
    useEffect(() => {
        if (isStockEnabled && activeView === 'stock') {
            console.log("Stock re-enabled, triggering refetch...");
            refetchStock();
        }
    }, [isStockEnabled, activeView, refetchStock]);

    const handleToggleStockGlobal = async () => {
        if (!isCurrentUserAdmin) return;
        setIsTogglingStock(true);
        try {
            const newIsHidden = isStockEnabled; // Nếu đang bật (true) -> ẩn (true)
            const res = await apiService.updateAppSetting('stock_visibility', { isStockHidden: newIsHidden });

            if (res && res.status === 'SUCCESS') {
                setIsStockEnabled(!newIsHidden);
                showToast('Thành công', `Đã ${newIsHidden ? 'Ẩn' : 'Hiện'} kho xe toàn hệ thống.`, 'success');
            } else {
                showToast('Lỗi', res.message || "Không thể thay đổi trạng thái kho xe", 'error');
            }
        } catch (e) {
            console.error("Lỗi khi thay đổi trạng thái kho xe:", e);
            showToast('Lỗi', 'Có lỗi xảy ra khi cập nhật cài đặt.', 'error');
        } finally {
            setIsTogglingStock(false);
        }
    };

    const handleToggleChatGlobal = async () => {
        if (!isCurrentUserAdmin) return;
        setIsTogglingChat(true);
        try {
            const newIsHidden = isChatEnabled;
            const res = await apiService.updateAppSetting('chat_visibility', { isChatHidden: newIsHidden });

            if (res && res.status === 'SUCCESS') {
                setIsChatEnabled(!newIsHidden);
                showToast('Thành công', `Đã ${newIsHidden ? 'Ẩn' : 'Bật'} trợ lý AI toàn hệ thống.`, 'success');
            } else {
                showToast('Lỗi', res.message || "Không thể thay đổi trạng thái AI", 'error');
            }
        } catch (e) {
            console.error("Lỗi khi thay đổi trạng thái AI:", e);
            showToast('Lỗi', 'Có lỗi xảy ra khi cập nhật cài đặt AI.', 'error');
        } finally {
            setIsTogglingChat(false);
        }
    };


    const [isLoadingArchives, setIsLoadingArchives] = useState(false);
    const [isLastArchive, setIsLastArchive] = useState(archivesLoadedFromCache);
    const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

    React.useEffect(() => {
        setIsLastArchive(archivesLoadedFromCache);
    }, [archivesLoadedFromCache]);

    // Update Document Title
    React.useEffect(() => {
        const baseTitles: Record<string, string> = {
            'orders': 'Đơn Hàng',
            'stock': 'Kho Xe',
            'sold': 'Lịch Sử',
            'admin': 'Quản Trị',
            'laithu': 'Lái Thử'
        };

        const title = baseTitles[activeView] || 'Order Management';

        document.title = title;
    }, [activeView]);

    useEffect(() => {
        if (isCurrentUserAdmin) {
            setActiveView('admin');
        }
    }, [isCurrentUserAdmin, setActiveView]);

    // Record user presence on login and when tab becomes active
    useEffect(() => {
        if (currentUser) {
            apiService.recordUserPresence();
        }
    }, [currentUser]);

    // --- GLOBAL KEYBOARD SHORTCUTS ---
    // Ctrl+F / Cmd+F: Focus active search bar
    // Esc: Close any open modal or detail view
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl + F or Cmd + F: Search Shortcut
            if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
                e.preventDefault();
                const activeSearchInput = (
                    document.querySelector('input[placeholder*="Tìm"]') as HTMLInputElement ||
                    document.querySelector('input[type="text"]') as HTMLInputElement
                );
                if (activeSearchInput) {
                    activeSearchInput.focus();
                    activeSearchInput.select();
                } else {
                    setIsGlobalSearchOpen(true);
                }
            }

            // Esc: Close Modal Shortcut
            if (e.key === 'Escape') {
                if (imagePreview) setImagePreview(null);
                else if (filePreview) setFilePreview(null);
                else if (selectedOrder) setSelectedOrder(null);
                else if (orderToCancel) setOrderToCancel(null);
                else if (orderToRequestInvoice) setOrderToRequestInvoice(null);
                else if (orderToSupplement) setOrderToSupplement(null);
                else if (orderToEdit) setOrderToEdit(null);
                else if (orderToRequestVC) setOrderToRequestVC(null);
                else if (orderToConfirmVC) setOrderToConfirmVC(null);
                else if (orderToSuperEdit) setOrderToSuperEdit(null);
                else if (isGlobalSearchOpen) setIsGlobalSearchOpen(false);
                else if (isPendingStatsModalOpen) setIsPendingStatsModalOpen(false);
                else if (isChangePasswordModalOpen) setIsChangePasswordModalOpen(false);
                else if (isBacklogModalOpen) setIsBacklogModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        imagePreview, filePreview, selectedOrder, orderToCancel, orderToRequestInvoice,
        orderToSupplement, orderToEdit, orderToRequestVC, orderToConfirmVC, orderToSuperEdit,
        isGlobalSearchOpen, isPendingStatsModalOpen, isChangePasswordModalOpen, isBacklogModalOpen,
        setImagePreview, setFilePreview, setSelectedOrder, setOrderToCancel, setOrderToRequestInvoice,
        setOrderToSupplement, setOrderToEdit, setOrderToRequestVC, setOrderToConfirmVC, setOrderToSuperEdit
    ]);

    const {
        filters, handleFilterChange, handleResetFilters,
        processedData, paginatedData, containerRef,
        visibleCount, setVisibleCount, batchSize
    } = useOrderFiltering({ allHistoryData: historyData, isSidebarCollapsed, activeView, orderView: 'grid' });

    const loadMoreRef = React.useRef<HTMLDivElement>(null);

    // Intersection Observer for Infinite Scroll in Order Grid View
    React.useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    if (visibleCount < processedData.length) {
                        setVisibleCount((prev: number) => Math.min(prev + batchSize, processedData.length));
                    }
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => {
            if (loadMoreRef.current) {
                observer.unobserve(loadMoreRef.current);
            }
        };
    }, [visibleCount, processedData.length, batchSize, setVisibleCount]);

    const handleLoadMoreArchives = async () => {
        setIsLoadingArchives(true);
        showToast('Đang Tải Lưu Trữ', 'Đang tải dữ liệu cũ, vui lòng chờ.', 'loading');
        try {
            const result = await apiService.fetchAllArchivedData();
            if (result.data && result.data.length > 0) {
                // Xử lý an toàn: Nếu dữ liệu quá lớn, việc setItem có thể gây lỗi QuotaExceededError
                try {
                    sessionStorage.setItem('archivedOrdersData', JSON.stringify(result.data));
                } catch (storageError) {
                    console.warn("Dữ liệu lưu trữ quá lớn cho bộ nhớ đệm, chỉ giữ trong RAM:", storageError);
                    // Vẫn tiếp tục thực hiện, dữ liệu sẽ chỉ tồn tại trong phiên làm việc hiện tại (RAM)
                }

                setAllHistoryData((prevData: Order[]) => {
                    // Tránh duplicate nếu dữ liệu đã tồn tại
                    const existingNumbers = new Set(prevData.map(o => o['Số đơn hàng']));
                    const newData = result.data.filter((o: Order) => !existingNumbers.has(o['Số đơn hàng']));
                    return [...prevData, ...newData];
                });
                showToast('Tải Thành Công', `Đã tải thêm ${result.data.length} mục từ kho lưu trữ.`, 'success', 3000);
            } else {
                showToast('Hoàn Tất', 'Không tìm thấy thêm dữ liệu nào trong kho lưu trữ.', 'info', 3000);
            }
            setIsLastArchive(true);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Tải Thất Bại', message, 'error', 5000);
        } finally {
            setIsLoadingArchives(false);
        }
    };

    const handleOrderNavigation = useCallback((direction: 'prev' | 'next') => {
        if (!selectedOrder) return;
        const list = processedData;
        const currentIndex = list.findIndex(o => o['Số đơn hàng'] === selectedOrder['Số đơn hàng']);
        if (currentIndex === -1) return;

        const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

        if (nextIndex >= 0 && nextIndex < list.length) {
            setSelectedOrder(list[nextIndex]);
        }
    }, [selectedOrder, processedData, setSelectedOrder]);



    useEffect(() => {
        if (activeView === 'orders' && paginatedData.length > 0) {
            if (!selectedOrder || !paginatedData.some(o => o['Số đơn hàng'] === selectedOrder['Số đơn hàng'])) {
                setSelectedOrder(paginatedData[0]);
            }
        }
    }, [activeView, paginatedData, setSelectedOrder]);

    const vehicleAnalyticsData = useMemo((): AnalyticsData => {
        const pendingRequests = allHistoryData.filter((o: any) => o['Kết quả']?.toLowerCase().includes('chưa'));

        const pendingRequestCount: { [key: string]: number } = {};
        pendingRequests.forEach((order: any) => {
            const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban, 'Ngoại thất': ngoai_that } = order;
            if (dong_xe && phien_ban && ngoai_that) {
                const vehicleKey = `${dong_xe}|${phien_ban}|${ngoai_that}`.trim().toLowerCase();
                pendingRequestCount[vehicleKey] = (pendingRequestCount[vehicleKey] || 0) + 1;
            }
        });

        const stockStatus: { [key: string]: { count: number, isSlowMoving: boolean } } = {};
        stockData.forEach((vehicle: any) => {
            const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban, 'Ngoại thất': ngoai_that } = vehicle;
            if (dong_xe && phien_ban && ngoai_that) {
                const vehicleKey = `${dong_xe}|${phien_ban}|${ngoai_that}`.trim().toLowerCase();
                const entry = stockStatus[vehicleKey] || { count: 0, isSlowMoving: false };
                entry.count += 1;

                const importDate = vehicle['Thời gian nhập'] ? moment(vehicle['Thời gian nhập']) : null;
                if (importDate && moment().diff(importDate, 'days') > 30) {
                    entry.isSlowMoving = true;
                }
                stockStatus[vehicleKey] = entry;
            }
        });

        return { pendingRequestCount, stockStatus };
    }, [allHistoryData, stockData]);

    const groupedPendingStats = useMemo(() => {
        const dataForStats = allHistoryData;
        const pendingRequests = dataForStats.filter((o: any) => o['Kết quả']?.toLowerCase().includes('chưa'));

        const groupedByModel: Record<string, any[]> = {};
        pendingRequests.forEach((order: any) => {
            const model = order['Dòng xe'] || 'Không xác định';
            if (!groupedByModel[model]) {
                groupedByModel[model] = [];
            }
            groupedByModel[model].push(order);
        });

        const result = Object.entries(groupedByModel).map(([model, orders]) => {
            const total = orders.length;
            const variantsCount: Record<string, number> = {};

            orders.forEach(order => {
                const phienBan = (order['Phiên bản'] && order['Phiên bản'] !== 'N/A') ? `${order['Phiên bản']} - ` : '';
                const variantKey = `${phienBan}${order['Ngoại thất'] || 'N/A'} / ${order['Nội thất'] || 'N/A'}`;
                variantsCount[variantKey] = (variantsCount[variantKey] || 0) + 1;
            });

            const variants = Object.entries(variantsCount)
                .map(([variant, count]) => ({ variant, count }))
                .sort((a, b) => b.count - a.count);

            return { model, total, variants };
        });

        return result.sort((a, b) => b.total - a.total);
    }, [allHistoryData]);

    const uniqueCarModels = useMemo(() => [...new Set(historyData.map((o: any) => o["Dòng xe"]).filter(Boolean))].sort(), [historyData]);
    const uniqueVersions = useMemo(() => [...new Set(historyData.map((o: any) => o["Phiên bản"]).filter(Boolean))].sort(), [historyData]);
    const uniqueStatuses = useMemo(() => [...new Set(historyData.map((o: any) => o["Trạng thái VC"] || o["Kết quả"] || "Chưa ghép").filter(Boolean))].sort(), [historyData]);
    const uniqueExteriors = useMemo(() => [...new Set(historyData.map((o: any) => o["Ngoại thất"]).filter(Boolean))].sort(), [historyData]);

    const orderModelCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (let i = 0; i < historyData.length; i++) {
            const model = historyData[i]["Dòng xe"];
            if (model) {
                counts[model] = (counts[model] || 0) + 1;
            }
        }
        return counts;
    }, [historyData]);

    const carModelTabs = useMemo(() => {
        return uniqueCarModels.map((model: string) => ({
            id: model,
            label: model,
            count: orderModelCounts[model] || 0
        }));
    }, [uniqueCarModels, orderModelCounts]);

    const renderOrdersContent = () => {
        const animationClass = 'animate-fade-in-up';
        const isLoading = isLoadingHistory;
        const error = errorHistory;

        // --- FILTER CONFIGS ---
        // Exclude 'carModel' from general filters as it is now used for Tabs
        const dropdownConfigs: DropdownFilterConfig[] = [
            { id: 'order-filter-version', key: 'version', label: 'Phiên Bản', options: uniqueVersions as string[], icon: 'fa-cogs' },
            { id: 'order-filter-status', key: 'status', label: 'Trạng Thái', options: uniqueStatuses as string[], icon: 'fa-tag' },
            { id: 'order-filter-exterior', key: 'exterior', label: 'Ngoại Thất', options: uniqueExteriors as string[], icon: 'fa-palette' },
        ].filter(d => d.options.length > 0);

        const statsButton = (
            <button
                onClick={() => setIsPendingStatsModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 lg:py-1 text-[12px] lg:text-[11px] font-semibold rounded-lg transition-all duration-200 outline-none whitespace-nowrap min-h-[32px] lg:min-h-0 bg-white/90 hover:bg-white text-slate-700 hover:text-amber-600 border border-slate-200/80 shadow-xs hover:shadow-sm hover:scale-[1.02] active:scale-95 cursor-pointer"
                title="Thống kê yêu cầu"
            >
                <i className="fas fa-chart-pie text-[12px] lg:text-[11px] text-amber-500"></i>
                <span className="font-bold">Thống kê</span>
            </button>
        );

        // --- TABS LOGIC ---
        const totalCount = historyData.length;
        const tabs = [
            { id: 'all', label: 'Tất cả', count: totalCount as number },
            ...carModelTabs
        ];

        // Determine active tab based on filters
        // If filters.carModel has exactly one item, that's our tab. Otherwise 'all'.
        const activeTab = (filters.carModel && filters.carModel.length === 1) ? filters.carModel[0] : 'all';

        // --- HANDLERS ---
        const handeTabChange = (tabId: string) => {
            const newCarModel = tabId === 'all' ? [] : [tabId];
            handleFilterChange({ carModel: newCarModel });
        };


        const skeletons = Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm h-48 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="skeleton-item h-6 w-1/2 rounded-md"></div>
                        <div className="skeleton-item h-5 w-5 rounded-full"></div>
                    </div>
                    <div className="space-y-3">
                        <div className="skeleton-item h-4 w-3/4"></div>
                        <div className="skeleton-item h-4 w-2/3"></div>
                        <div className="skeleton-item h-4 w-1/2"></div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <div className="skeleton-item h-3 w-1/4"></div>
                    <div className="skeleton-item h-8 w-8 rounded-lg"></div>
                </div>
            </div>
        ));


        if (error) {
            return (<div className={`flex items-center justify-center h-96 ${animationClass}`}><div className="text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fa-solid fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={() => refetchHistory()} className="mt-6 btn-primary">Thử lại</button></div></div>);
        }

        return (
            <div className={`flex flex-col h-full`}>
                <div className="flex-shrink-0 relative z-20">
                    <TabbedFilter
                        tabs={tabs}
                        activeTab={activeTab}
                        onTabChange={handeTabChange}
                        tabsExtra={statsButton}
                        searchValue={filters.keyword || ''}
                        onSearchChange={(val) => handleFilterChange({ keyword: val })}
                        onReset={handleResetFilters}
                        canReset={true} // Simplified check, ideally check if filters are active
                    >
                        {/* Render Secondary Filters */}
                        {dropdownConfigs.map(dropdown => (
                            <div key={dropdown.id} className="min-w-[110px]">
                                <MultiSelectDropdown
                                    id={dropdown.id}
                                    label={dropdown.label}
                                    options={dropdown.options}
                                    selectedOptions={(filters[dropdown.key as keyof typeof filters] || []) as string[]}
                                    onChange={(selected) => handleFilterChange({ [dropdown.key]: selected })}
                                    icon={dropdown.icon}
                                    displayMode="selection"
                                    size="compact"
                                    variant="modern"
                                    searchable={true}
                                    align="right"
                                />
                            </div>
                        ))}
                    </TabbedFilter>
                </div>
                <div ref={containerRef} className="flex-1 flex flex-col min-h-0 mt-1">
                    <div className="bg-slate-50 relative rounded-2xl shadow-sm border border-slate-200/70 flex flex-col h-full overflow-hidden transition-all duration-300">
                        {/* Mobile Sub-Tab Navigation Header (Only visible on < lg screens) */}
                        <div className="flex lg:hidden items-center justify-between bg-slate-100/90 p-1.5 border-b border-slate-200 shrink-0">
                            <div className="flex items-center gap-1 w-full bg-slate-200/80 p-1 rounded-xl">
                                <button
                                    onClick={() => setMobileSubTab('list')}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                                        mobileSubTab === 'list' 
                                            ? 'bg-white text-slate-800 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <i className="fas fa-list-ul text-[11px]"></i>
                                    <span>Danh sách ({processedData.length})</span>
                                </button>

                                <button
                                    onClick={() => setMobileSubTab('detail')}
                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-2 ${
                                        mobileSubTab === 'detail' 
                                            ? 'bg-white text-blue-600 shadow-xs' 
                                            : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                >
                                    <i className="fas fa-info-circle text-[11px]"></i>
                                    <span className="truncate">Chi tiết {selectedOrder ? `(${selectedOrder['Tên khách hàng'] || 'Đơn hàng'})` : ''}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row w-full h-full overflow-hidden">
                            {/* Left Pane: Master Order List (30% width on Desktop, Full height when active on Mobile) */}
                            <div className={`w-full lg:w-[30%] ${mobileSubTab === 'list' ? 'h-full flex' : 'hidden lg:flex'} lg:h-full flex-col overflow-y-auto hidden-scrollbar p-1.5 border-b lg:border-b-0 lg:border-r border-slate-200/70 z-10`}>
                                {isLoading && allHistoryData.length === 0 ? (
                                    <div className="grid grid-cols-1 gap-2.5 p-1">
                                        {skeletons}
                                    </div>
                                ) : (
                                    <OrderGridView
                                        orders={paginatedData}
                                        onViewDetails={handleSelectOrderMobile}
                                        onCancel={setOrderToCancel}
                                        onRequestInvoice={setOrderToRequestInvoice}
                                        onSupplement={setOrderToSupplement}
                                        onEdit={setOrderToEdit}
                                        onRequestVC={setOrderToRequestVC}
                                        onConfirmVC={setOrderToConfirmVC}
                                        processingOrder={processingOrder}
                                        showOrderInAdmin={isCurrentUserAdmin ? showOrderInAdmin : undefined}
                                        showAdminTab={isCurrentUserAdmin ? showAdminTab : undefined}
                                        isReferenceAccount={isReferenceAccount}
                                        selectedOrderId={selectedOrder?.['Số đơn hàng']}
                                    />
                                )}
                                {/* Load More Trigger for Infinite Scroll */}
                                {visibleCount < processedData.length && (
                                    <div ref={loadMoreRef} className="h-12 w-full flex items-center justify-center py-4 shrink-0">
                                        <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                                    </div>
                                )}
                                {/* Load More Archives Trigger (if local data exhausted) */}
                                {visibleCount >= processedData.length && !isLastArchive && (
                                    <div className="p-4 flex justify-center shrink-0">
                                        <button
                                            onClick={handleLoadMoreArchives}
                                            disabled={isLoadingArchives}
                                            className="text-gray-500 hover:text-gray-800 hover:underline text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
                                        >
                                            {isLoadingArchives ? "Đang tải thêm..." : "Tải thêm lưu trữ"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right Pane: Embedded Order Details Panel (70% width on Desktop, Full height when active on Mobile) */}
                            <div className={`w-full lg:w-[70%] ${mobileSubTab === 'detail' ? 'h-full flex' : 'hidden lg:flex'} lg:h-full relative overflow-hidden p-1 flex-col`}>
                                <div className="flex-1 min-h-0 h-full">
                                <OrderDetailView
                                    order={selectedOrder}
                                    orderList={processedData}
                                    onNavigate={handleOrderNavigation}
                                    onCancel={setOrderToCancel}
                                    onRequestInvoice={setOrderToRequestInvoice}
                                    onSupplement={setOrderToSupplement}
                                    onRequestVC={setOrderToRequestVC}
                                    onConfirmVC={setOrderToConfirmVC}
                                    onEdit={(updatedOrder) => handleEditSuccess(undefined, updatedOrder)}
                                    onSelectPolicy={handleSelectPolicy}
                                    isReferenceAccount={isReferenceAccount}
                                    showToast={showToast}
                                    onInvoiceConfirm={handleRequestInvoice}
                                    onCancelConfirm={handleCancelOrder}
                                    stockData={stockData}
                                    onClose={() => {
                                        setSelectedOrder(null);
                                        setMobileSubTab('list');
                                    }}
                                />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    return (
        <>
            <GlobalNotificationProvider>
                <CustomTitleBar />

                {!isCurrentUserAdmin && (
                    <MaintenanceFeeBlocker currentUserName={currentUser || ''} onLogout={onLogout} />
                )}

                <div id="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}></div>

                <div className={`relative h-screen flex flex-col transition-all duration-300 ease-in-out w-full pb-16 lg:pb-0`}>
                    <Header
                        setCreateRequestData={setCreateRequestData}
                        toggleNotificationPanel={toggleNotificationPanel}
                        unreadCount={unreadCount}
                        isNotificationPanelOpen={isNotificationPanelOpen}
                        notifications={notifications}
                        handleMarkAllAsRead={handleMarkAllAsRead}
                        handleNotificationClick={(n, e) => handleNotificationClick(n, e, {
                            isAdmin: isCurrentUserAdmin,
                            allHistoryData,
                            setSelectedOrder,
                            setActiveView,
                            setStockFilter: (vin) => {
                                setStockSearch(vin);
                                setActiveView('stock');
                            },
                            showInquiryInAdmin,
                            showAdminTab,
                            setExtensionVehicle: (vin) => {
                                const car = stockData.find((c: any) => c.VIN === vin);
                                if (car) {
                                    setExtensionVehicle(car);
                                    setActiveView('stock');
                                }
                            }
                        })}
                        onLogout={onLogout}
                        notificationContainerRef={notificationContainerRef}
                        activeView={activeView}
                        setActiveView={setActiveView}
                        isCurrentUserAdmin={isCurrentUserAdmin}
                        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
                        currentUser={currentUser}
                        userRole={userRole}
                        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
                        isStockEnabled={isStockEnabled}
                        isTogglingStock={isTogglingStock}
                        handleToggleStockGlobal={handleToggleStockGlobal}
                        requestNotificationPermission={requestNotificationPermission}
                        reputation={reputation}
                        currentUserName={currentUserName || ''}
                        isChatEnabled={isChatEnabled}
                        isTogglingChat={isTogglingChat}
                        handleToggleChatGlobal={handleToggleChatGlobal}
                        onOpenBacklogReport={() => setIsBacklogModalOpen(true)}
                        isReferenceAccount={isReferenceAccount}
                    />


                    <main className={`flex-1 p-0.5 flex flex-col overflow-y-auto`}>
                        <div hidden={activeView !== 'orders'} className="h-full">
                            {renderOrdersContent()}
                        </div>
                        <div hidden={activeView !== 'stock'} className="h-full relative overflow-hidden flex flex-col">
                            {!isStockEnabled && isCurrentUserAdmin && (
                                <div className="flex-shrink-0 bg-amber-500/10 backdrop-blur-md border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-3 animate-fade-in z-20">
                                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                    <span className="text-sm font-bold text-amber-800 uppercase tracking-wider">Chế độ Admin: Kho xe đang ẩn với nhân viên</span>
                                </div>
                            )}
                            <div className="flex-1 overflow-hidden relative">
                                {(!isStockEnabled && !isCurrentUserAdmin) ? (
                                    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-surface-card relative overflow-hidden">
                                        {/* Background Gradient Detail (Subtle) */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/20 to-transparent"></div>

                                        <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
                                            {/* Central Icon - Minimalist */}
                                            <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 text-3xl mb-8 shadow-sm ring-1 ring-indigo-100">
                                                <i className="fas fa-warehouse animate-pulse"></i>
                                            </div>

                                            <h2 className="text-2xl font-bold text-text-primary mb-3">
                                                Kho Xe Đang Cập Nhật
                                            </h2>

                                            <p className="text-text-secondary text-sm leading-relaxed max-w-sm mb-10">
                                                Quản trị viên đang điều chỉnh dữ liệu để đảm bảo thông tin chính xác nhất. Vui lòng quay lại sau ít phút.
                                            </p>

                                            {/* Modern Dot Loader - Sleek & Syncing */}
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500/80 animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-2 h-2 rounded-full bg-indigo-500/80 animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-2 h-2 rounded-full bg-indigo-500/80 animate-bounce"></span>
                                            </div>
                                        </div>

                                        {/* System Status Bagde (Bottom) */}
                                        <div className="absolute bottom-12 flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-border-primary/50 rounded-full">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                            </span>
                                            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Đang đồng bộ dữ liệu</span>
                                        </div>
                                    </div>
                                ) : (
                                    <StockView
                                        stockData={stockData}
                                        queuedVins={queuedVins}
                                        isLoading={isLoadingStock}
                                        error={errorStock}
                                        refetchStock={refetchStock}
                                        highlightedVins={highlightedVins}
                                        showToast={showToast}
                                        currentUser={currentUser}
                                        isAdmin={isCurrentUserAdmin}
                                        canHoldMore={canHoldMore}
                                        onCreateRequestForVehicle={handleCreateRequestForVehicle}
                                        onHoldCar={handleHoldCar}
                                        onReleaseCar={handleReleaseCar}
                                        onJoinQueue={handleJoinQueue}
                                        onLeaveQueue={handleLeaveQueue}
                                        onOpenExtensionModal={setExtensionVehicle}
                                        processingVin={processingVin}
                                        isSidebarCollapsed={isSidebarCollapsed}
                                        allOrders={allHistoryData}
                                        showOrderInAdmin={isCurrentUserAdmin ? showOrderInAdmin : undefined}
                                        showAdminTab={isCurrentUserAdmin ? showAdminTab : undefined}
                                        forcedSearch={stockSearch}
                                        isReferenceAccount={isReferenceAccount}
                                        onNavigateToInquiry={() => {
                                            setActiveView('inquiry');
                                        }}
                                        onViewCarOnMap={() => {
                                            setActiveView('stock');
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                        <div hidden={activeView !== 'sold'} className="h-full">
                            <SoldCarsView
                                showToast={showToast}
                                isSidebarCollapsed={isSidebarCollapsed}
                                showOrderInAdmin={isCurrentUserAdmin ? showOrderInAdmin : undefined}
                                showAdminTab={isCurrentUserAdmin ? showAdminTab : undefined}
                                isAdmin={isCurrentUserAdmin}
                            />
                        </div>
                        <div hidden={activeView !== 'laithu'} className="h-full">
                            <Suspense fallback={<LoadingFallback />}>
                                <TestDriveForm
                                    showToast={showToast}
                                    hideToast={hideToast}
                                    onOpenImagePreview={openImagePreviewModal}
                                    currentUser={currentUser}
                                    isAdmin={isCurrentUserAdmin}
                                    allTestDrives={testDriveData}
                                    setAllTestDrives={setTestDriveData as any}
                                    isLoading={isLoadingTestDrive}
                                    refetch={refetchTestDrive}
                                    isReferenceAccount={isReferenceAccount}
                                />
                            </Suspense>
                        </div>
                        <div hidden={activeView !== 'pricing'} className="h-full">
                            <PricingCalculatorIframeView />
                        </div>
                        <div hidden={activeView !== 'admin'} className="h-full">
                            {isCurrentUserAdmin &&
                                <AdminView
                                    showToast={showToast}
                                    hideToast={hideToast}
                                    refetchHistory={refetchHistory}
                                    refetchStock={refetchStock}
                                    allOrders={allHistoryData}
                                    xuathoadonData={xuathoadonData}
                                    refetchXuathoadon={refetchXuathoadon}
                                    stockData={stockData}
                                    isLoadingXuathoadon={isLoadingXuathoadon}
                                    isLoadingHistory={isLoadingHistory}
                                    errorXuathoadon={errorXuathoadon}
                                    onOpenImagePreview={openImagePreviewModal}
                                    onOpenFilePreview={openFilePreviewModal}
                                    teamData={teamData}
                                    allUsers={allUsers}
                                    refetchAdminData={fetchAdminData}
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    initialState={initialAdminState}
                                    clearInitialState={clearInitialState}
                                    isReferenceAccount={isReferenceAccount}
                                />
                            }
                        </div>
                    </main >
                    <footer className="hidden lg:flex flex-shrink-0 h-7 px-5 bg-transparent items-center justify-between text-[10px] select-none">
                        <RealtimeFooterClock />
                        <span className="font-bold tracking-[0.22em] text-slate-400/80 uppercase">© 2026 ORDER MANAGEMENT</span>
                    </footer>
                </div >

                <StockArrivalPopup
                    notifications={notifications}
                    onRefresh={fetchNotificationsInternal}
                    onNavigate={(targetView, targetId) => {
                        if (targetView) setActiveView(targetView as any);
                        if (targetView === 'stock' && targetId) {
                            setStockSearch(targetId);
                        }
                    }}
                />

                <BroadcastPopup
                    notifications={notifications}
                    onRefresh={fetchNotificationsInternal}
                />

                <CreateRequestModal
                    isOpen={createRequestData.isOpen}
                    onClose={handleCreateRequestClose}
                    onSuccess={handleFormSuccess}
                    showToast={showToast}
                    hideToast={hideToast}
                    existingOrderNumbers={allHistoryData.map((o: any) => o["Số đơn hàng"])}
                    initialVehicle={createRequestData.initialVehicle}
                    currentUser={currentUser}
                    vehicleAnalyticsData={vehicleAnalyticsData}
                    onOpenImagePreview={openImagePreviewModal}
                />

                <HoldExtensionModal
                    isOpen={!!extensionVehicle}
                    onClose={() => setExtensionVehicle(null)}
                    vehicle={extensionVehicle}
                    onRequestExtension={handleRequestExtension}
                />
                <ChangePasswordModal
                    isOpen={isChangePasswordModalOpen}
                    onClose={() => setIsChangePasswordModalOpen(false)}
                    showToast={showToast}
                    username={currentUserName}
                />


                <SuperEditModal
                    isOpen={!!orderToSuperEdit}
                    onClose={() => setOrderToSuperEdit(null)}
                    onSuccess={handleSuperEditSuccess}
                    order={orderToSuperEdit}
                    showToast={showToast}
                />
                {orderToCancel && <CancelRequestModal order={orderToCancel} onClose={() => setOrderToCancel(null)} onConfirm={handleCancelOrder} />}
                {orderToRequestInvoice && <RequestInvoiceModal order={orderToRequestInvoice} stockData={stockData} showToast={showToast} onClose={() => setOrderToRequestInvoice(null)} onConfirm={handleRequestInvoice} />}
                {orderToSupplement && <SupplementaryFileModal order={orderToSupplement} onClose={() => setOrderToSupplement(null)} onConfirm={handleSupplementFiles} showToast={showToast} />}
                <RequestVcModal
                    order={orderToRequestVC}
                    onClose={() => setOrderToRequestVC(null)}
                    onSubmit={handleConfirmRequestVC}
                />
                {orderToConfirmVC && <ActionModal isOpen={!!orderToConfirmVC} onClose={() => setOrderToConfirmVC(null)} title="Xác Thực UNC VinClub" description="Xác nhận bạn đã nhận được UNC cho yêu cầu VinClub của đơn hàng:" targetId={orderToConfirmVC['Số đơn hàng']} submitText="Đã Nhận UNC" submitColor="success" icon="fa-check-circle" onSubmit={handleConfirmVC} />}
                <ImagePreviewModal
                    isOpen={!!imagePreview}
                    onClose={() => setImagePreview(null)}
                    images={imagePreview?.images || []}
                    startIndex={imagePreview?.startIndex}
                    customerName={imagePreview?.customerName}
                />
                {
                    filePreview && (
                        <FilePreviewModal
                            isOpen={!!filePreview}
                            onClose={() => setFilePreview(null)}
                            fileUrl={filePreview.url}
                            fileLabel={filePreview.label}
                        />
                    )
                }
                <PendingStatsModal
                    isOpen={isPendingStatsModalOpen}
                    onClose={() => setIsPendingStatsModalOpen(false)}
                    stats={groupedPendingStats}
                />
                <GlobalSearchModal
                    isOpen={isGlobalSearchOpen}
                    onClose={() => setIsGlobalSearchOpen(false)}
                    onSelectItem={(item, category) => {
                        setIsGlobalSearchOpen(false);
                        if (category === 'Đơn hàng' || category === 'Dữ liệu lưu trữ') {
                            setSelectedOrder(item);
                            setActiveView(category === 'Đơn hàng' ? 'orders' : 'sold');
                        } else if (category === 'Kho xe') {
                            setActiveView('stock');
                        } else if (category === 'Yêu cầu hóa đơn' || category === 'Yêu cầu VinClub') {
                            // Link to specific status or request if possible
                            setActiveView('admin');
                        }
                    }}
                />



                {!isReferenceAccount && (
                    <ReportBacklogModal
                        isOpen={isBacklogModalOpen}
                        onClose={() => setIsBacklogModalOpen(false)}
                        showToast={showToast}
                        currentUser={currentUser}
                    />
                )}

                {isChatEnabled && (
                    <Suspense fallback={null}>
                        <VirtualAssistant />
                    </Suspense>
                )}

                <BottomNav
                    activeView={activeView}
                    setActiveView={setActiveView}
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    currentUser={currentUser}
                    userRole={userRole}
                    onLogout={onLogout}
                    setIsChangePasswordModalOpen={setIsChangePasswordModalOpen}
                    isStockEnabled={isStockEnabled}
                    reputation={reputation}
                    isTogglingStock={isTogglingStock}
                    handleToggleStockGlobal={handleToggleStockGlobal}
                    onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
                />
                {/* {new Date() >= new Date('2026-01-05T00:00:00') && <LuckyMoneyWidget />} */}
                <FifoAlertModal />
            </GlobalNotificationProvider>
        </>
    );
};

export default App;
