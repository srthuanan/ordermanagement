import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import moment from 'moment';
import 'moment/locale/vi';
import { Order, SortConfig, Notification, NotificationType, StockVehicle, AnalyticsData, AdminSubView } from './types';
import HistoryTable from './components/HistoryTable';
import StockView from './components/StockView';
import SoldCarsView from './components/SoldCarsView';
import AdminView from './components/admin/AdminView';
import TestDriveForm from './components/testdrive/TestDriveForm';
import OrderDetailsModal from './components/modals/OrderDetailsModal';
import CancelRequestModal from './components/modals/CancelRequestModal';
import RequestInvoiceModal from './components/modals/RequestInvoiceModal';
import SupplementaryFileModal from './components/modals/SupplementaryFileModal';
import CreateRequestModal from './components/modals/CreateRequestModal';
import EditOrderModal from './components/modals/EditOrderModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';
import ImagePreviewModal from './components/modals/ImagePreviewModal';
import ActionModal from './components/admin/ActionModal';
import RequestVcModal from './components/modals/RequestVcModal';
import FilePreviewModal from './components/modals/FilePreviewModal';
import PendingStatsModal from './components/modals/PendingStatsModal';
import Filters, { DropdownFilterConfig } from './components/ui/Filters';
import Pagination from './components/ui/Pagination';
import Avatar from './components/ui/Avatar';
import { useVinFastApi } from './hooks/useVinFastApi';
import { useStockApi } from './hooks/useStockApi';
import { useSoldCarsApi } from './hooks/useSoldCarsApi';
import { useTestDriveApi } from './hooks/useTestDriveApi';
import * as apiService from './services/apiService';
import { normalizeName } from './services/authService';
import { ADMIN_USER } from './constants';
import OrderGridView from './components/OrderGridView';

import logohalloVideo from '/pictures/logohallo.mp4';
import yeucauAnimationUrl from '/pictures/yeucau.json?url';
import boxuongGif from '/pictures/boxuong.gif';
import xacuopGif from '/pictures/xacuop.gif';
import logoChinh from '/pictures/logochinh.png';

moment.locale('vi');

type ActiveView = 'orders' | 'stock' | 'sold' | 'admin' | 'laithu';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface AppProps {
    onLogout: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
}

const App: React.FC<AppProps> = ({ onLogout, showToast, hideToast }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeView, setActiveView] = useState<ActiveView>('orders');
    
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
    const [orderToRequestInvoice, setOrderToRequestInvoice] = useState<Order | null>(null);
    const [orderToSupplement, setOrderToSupplement] = useState<Order | null>(null);
    const [orderToEdit, setOrderToEdit] = useState<Order | null>(null);
    const [orderToRequestVC, setOrderToRequestVC] = useState<Order | null>(null);
    const [orderToConfirmVC, setOrderToConfirmVC] = useState<Order | null>(null);
    const [createRequestData, setCreateRequestData] = useState<{ isOpen: boolean; initialVehicle?: StockVehicle }>({ isOpen: false });
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
    const [imagePreview, setImagePreview] = useState<{ images: ImageSource[], startIndex: number, customerName: string } | null>(null);
    const [filePreview, setFilePreview] = useState<{ url: string, label: string } | null>(null);
    const [isPendingStatsModalOpen, setIsPendingStatsModalOpen] = useState(false);
    const [initialAdminState, setInitialAdminState] = useState<{ targetTab?: AdminSubView; orderToShow?: Order } | null>(null);


    const [filters, setFilters] = useState({ keyword: '', carModel: [] as string[], status: [] as string[] });
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'Thời gian nhập', direction: 'desc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingArchives, setIsLoadingArchives] = useState(false);
    
    const [processingOrder, setProcessingOrder] = useState<string | null>(null);
    const [processingVin, setProcessingVin] = useState<string | null>(null);


    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const notificationContainerRef = useRef<HTMLDivElement>(null);
    
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const currentUser = sessionStorage.getItem("currentConsultant") || ADMIN_USER;
    const currentUserName = sessionStorage.getItem("currentUser") || "User";
    const userRole = sessionStorage.getItem("userRole") || (currentUserName.toLowerCase() === 'admin' ? 'Quản trị viên' : 'Tư vấn bán hàng');
    const isCurrentUserAdmin = currentUserName.toLowerCase() === 'admin';

    const [teamData, setTeamData] = useState<Record<string, string[]>>({});
    const [allUsers, setAllUsers] = useState<{name: string, role: string, username: string}[]>([]);

    const [currentGif, setCurrentGif] = useState(boxuongGif);
    
    const [orderView, setOrderView] = useState<'table' | 'grid'>('grid');
    
    const PAGE_SIZE = useMemo(() => {
        if (activeView === 'orders' && orderView === 'grid') {
            return isSidebarCollapsed ? 15 : 12;
        }
        return isSidebarCollapsed ? 14 : 12;
    }, [activeView, orderView, isSidebarCollapsed]);

    // --- CENTRALIZED DATA FETCHING ---
    const { historyData: allHistoryData, setHistoryData: setAllHistoryData, isLoading: isLoadingHistory, error: errorHistory, refetch: refetchHistory, archivesLoadedFromCache } = useVinFastApi();
    const { stockData, setStockData, isLoading: isLoadingStock, error: errorStock, refetch: refetchStock } = useStockApi();
    const { soldData, isLoading: isLoadingSold, error: errorSold, refetch: refetchSold } = useSoldCarsApi();
    const { testDriveData, setTestDriveData, isLoading: isLoadingTestDrive, refetch: refetchTestDrive } = useTestDriveApi();

    const [xuathoadonData, setXuathoadonData] = useState<Order[]>([]);
    const [isLoadingXuathoadon, setIsLoadingXuathoadon] = useState(true);
    const [errorXuathoadon, setErrorXuathoadon] = useState<string | null>(null);
    
    const refetchXuathoadon = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoadingXuathoadon(true);
        setErrorXuathoadon(null);
        try {
            const result = await apiService.getXuathoadonData();
            setXuathoadonData(result.data || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'An unknown error occurred';
            setErrorXuathoadon(message);
        } finally {
            if (!isSilent) setIsLoadingXuathoadon(false);
        }
    }, []);

    const fetchAdminData = useCallback(async (isSilent = false) => {
        if (!isCurrentUserAdmin && userRole !== 'Trưởng Phòng Kinh Doanh') return;
        try {
            const [teamsResult, usersResult] = await Promise.all([
                apiService.getTeamData(),
                apiService.getUsers()
            ]);

            if (teamsResult.status === 'SUCCESS' && teamsResult.teamData) {
                setTeamData(teamsResult.teamData);
            } else {
                console.error('Failed to fetch team data:', teamsResult.message);
            }

            if (usersResult.status === 'SUCCESS' && usersResult.users) {
                setAllUsers(usersResult.users);
            } else {
                 console.error('Failed to fetch user list:', usersResult.message);
            }
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
            if (!isSilent) showToast('Lỗi Tải Dữ Liệu', 'Không thể tải dữ liệu quản trị phòng ban.', 'error');
        }
    }, [isCurrentUserAdmin, userRole, showToast]);

    useEffect(() => {
        fetchAdminData();
        refetchXuathoadon();
    }, [fetchAdminData, refetchXuathoadon]);


    useEffect(() => {
        const gifInterval = setInterval(() => {
            setCurrentGif((prevGif: string) => (prevGif === boxuongGif ? xacuopGif : boxuongGif));
        }, 5000); // Change every 5 seconds

        return () => clearInterval(gifInterval);
    }, []);
    
    const usersToView = useMemo(() => {
        if (userRole !== 'Trưởng Phòng Kinh Doanh') {
            return undefined;
        }
    
        const normalizedCurrentUser = normalizeName(currentUser);
        const teamMapKey = Object.keys(teamData).find(key => normalizeName(key) === normalizedCurrentUser);
    
        if (teamMapKey && teamData[teamMapKey]) {
            const teamMembers = teamData[teamMapKey];
            return [teamMapKey, ...teamMembers].map(name => normalizeName(name));
        }
        
        return [normalizedCurrentUser];
    }, [currentUser, userRole, teamData]);


    // Filtered data for current user/team
    const historyData = useMemo(() => {
        if (isCurrentUserAdmin) {
            return allHistoryData;
        }
        if (userRole === 'Trưởng Phòng Kinh Doanh' && usersToView) {
            const teamNames = new Set(usersToView.map(name => normalizeName(name)));
            return allHistoryData.filter(order => teamNames.has(normalizeName(order['Tên tư vấn bán hàng'])));
        }
        // Regular user
        const normalizedCurrentUser = normalizeName(currentUser);
        return allHistoryData.filter(order => normalizeName(order['Tên tư vấn bán hàng']) === normalizedCurrentUser);
    }, [allHistoryData, isCurrentUserAdmin, userRole, usersToView, currentUser]);

    
    const [isLastArchive, setIsLastArchive] = useState(archivesLoadedFromCache);

    useEffect(() => {
        setIsLastArchive(archivesLoadedFromCache);
    }, [archivesLoadedFromCache]);


    const vehicleAnalyticsData = useMemo((): AnalyticsData => {
        const pendingRequests = allHistoryData.filter(o => o['Kết quả']?.toLowerCase().includes('chưa'));

        const pendingRequestCount: { [key: string]: number } = {};
        pendingRequests.forEach(order => {
            const { 'Dòng xe': dong_xe, 'Phiên bản': phien_ban, 'Ngoại thất': ngoai_that } = order;
            if (dong_xe && phien_ban && ngoai_that) {
                const vehicleKey = `${dong_xe}|${phien_ban}|${ngoai_that}`.trim().toLowerCase();
                pendingRequestCount[vehicleKey] = (pendingRequestCount[vehicleKey] || 0) + 1;
            }
        });

        const stockStatus: { [key: string]: { count: number, isSlowMoving: boolean } } = {};
        stockData.forEach(vehicle => {
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

    // State and refs for stock polling
    const [highlightedVins, setHighlightedVins] = useState<Set<string>>(new Set());
    const prevStockDataRef = useRef<StockVehicle[]>([]);

    useEffect(() => {
        prevStockDataRef.current = stockData;
    }, [stockData]);

    useEffect(() => {
        const savedState = localStorage.getItem('sidebarState');
        setIsSidebarCollapsed(savedState === 'collapsed');
    }, []);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(prev => {
            const newState = !prev;
            localStorage.setItem('sidebarState', newState ? 'collapsed' : 'expanded');
            return newState;
        });
    };

    const fetchNotifications = useCallback(async () => {
        try {
            const { notifications: fetchedNotifications = [], unreadCount: fetchedUnreadCount = 0 } = await apiService.fetchNotifications();
            setNotifications(fetchedNotifications);
            setUnreadCount(prevUnreadCount => {
                if (fetchedUnreadCount > prevUnreadCount) {
                    const badge = document.getElementById('notification-badge');
                    badge?.classList.add('animate-pop');
                    setTimeout(() => badge?.classList.remove('animate-pop'), 300);
                }
                return fetchedUnreadCount;
            });
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationContainerRef.current && !notificationContainerRef.current.contains(event.target as Node)) {
                setIsNotificationPanelOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);
    
    // Stock data real-time update polling logic, moved from StockView
    const handleRealtimeStockUpdate = useCallback(async () => {
        if (document.hidden) return; // Don't fetch if tab is not visible
        
        try {
            const result = await apiService.getStockData();
            const newData = result.khoxe || [];
            
            const prevData = prevStockDataRef.current;
            if (prevData.length === 0) {
                setStockData(newData);
                return;
            }

            const getStateString = (v: StockVehicle) => `${v['Trạng thái']}|${v['Người Giữ Xe'] || ''}`;
            const prevDataMap = new Map(prevData.map(v => [v.VIN, getStateString(v)]));
            
            const changedVins = new Set<string>();
            newData.forEach((newVehicle: StockVehicle) => {
                if (!newVehicle.VIN) return;
                const prevState = prevDataMap.get(newVehicle.VIN);
                const newState = getStateString(newVehicle);
                if (prevState !== undefined && prevState !== newState) {
                    changedVins.add(newVehicle.VIN);
                }
            });

            setStockData(newData);

            if (changedVins.size > 0) {
                showToast('Cập Nhật Kho Xe', `Có ${changedVins.size} xe vừa thay đổi trạng thái.`, 'info', 4000);
                setHighlightedVins(changedVins);
                setTimeout(() => setHighlightedVins(new Set()), 3000);
            }

        } catch (err) {
            console.warn("Real-time stock update failed:", err);
        }
    }, [showToast, setStockData]);

    useEffect(() => {
        const POLLING_INTERVAL = 15000;
        let intervalId: number | undefined;

        const startPolling = () => {
            stopPolling();
            handleRealtimeStockUpdate();
            intervalId = window.setInterval(handleRealtimeStockUpdate, POLLING_INTERVAL);
        };

        const stopPolling = () => {
            if (intervalId) clearInterval(intervalId);
            intervalId = undefined;
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                startPolling();
            }
        };
        
        if (!isLoadingStock && !errorStock) {
            startPolling();
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isLoadingStock, errorStock, handleRealtimeStockUpdate]);


    const toggleNotificationPanel = async () => {
        setIsNotificationPanelOpen(prev => !prev);
    };

    const handleMarkAllAsRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (unreadCount === 0) return;
        const currentNotifications = [...notifications];
        const currentUnreadCount = unreadCount;
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await apiService.markAllNotificationsAsRead();
        } catch (error) {
            console.error("Failed to mark all notifications as read", error);
            setNotifications(currentNotifications);
            setUnreadCount(currentUnreadCount);
            showToast('Thao Tác Thất Bại', 'Không thể đánh dấu đã đọc tất cả thông báo.', 'error', 3000);
        }
    };

    const handleNotificationClick = async (notification: Notification, event: React.MouseEvent) => {
        event.stopPropagation();
        if (!notification.isRead) {
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
            try {
                await apiService.markNotificationAsRead(notification.id);
            } catch (error) {
                console.error("Failed to mark notification as read", error);
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: false } : n));
                setUnreadCount(prev => prev + 1);
            }
        }
        if (notification.link) {
            const orderNumberMatch = notification.link.match(/orderNumber=([^&]+)/);
            if(orderNumberMatch && orderNumberMatch[1]) {
                const order = allHistoryData.find(o => o['Số đơn hàng'] === decodeURIComponent(orderNumberMatch[1]));
                if(order) {
                    setSelectedOrder(order);
                } else {
                     window.location.href = notification.link;
                }
            } else {
                 window.location.href = notification.link;
            }
        }
        setIsNotificationPanelOpen(false);
    };
    
    // --- ACTION HANDLERS ---
    
    const handleHoldCar = async (vin: string) => {
        setProcessingVin(vin);
        showToast('Đang xử lý...', `Đang giữ xe VIN ${vin}.`, 'loading');
        try {
            const result = await apiService.holdCar(vin);
            hideToast();
            showToast('Giữ Xe Thành Công', result.message, 'success', 3000);
            refetchStock(true);
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể giữ xe.';
            showToast('Giữ Xe Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const handleReleaseCar = async (vin: string) => {
        setProcessingVin(vin);
        showToast('Đang xử lý...', `Đang hủy giữ xe VIN ${vin}.`, 'loading');
        try {
            const result = await apiService.releaseCar(vin);
            hideToast();
            showToast('Hủy Giữ Thành Công', result.message, 'info', 3000);
            refetchStock(true);
        } catch (err) {
            hideToast();
            const message = err instanceof Error ? err.message : 'Không thể hủy giữ xe.';
            showToast('Hủy Giữ Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingVin(null);
        }
    };

    const handleViewDetails = (order: Order) => setSelectedOrder(order);
    const handleCancelOrder = async (order: Order, reason: string) => {
        setProcessingOrder(order["Số đơn hàng"]);
        showToast('Đang Hủy Yêu Cầu', `Hủy yêu cầu cho đơn hàng ${order["Số đơn hàng"]}.`, 'loading');
        try {
            const result = await apiService.cancelRequest(order["Số đơn hàng"], reason);
            await refetchHistory(); 
            hideToast();
            showToast('Hủy Thành Công', result.message, 'success', 3000);
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Hủy Thất Bại', message, 'error', 5000);
        } finally {
            setOrderToCancel(null);
            setProcessingOrder(null);
        }
    };
    
    const handleRequestInvoice = async (order: Order, contractFile: File, proposalFile: File, policy: string[], commission: string) => {
        setProcessingOrder(order["Số đơn hàng"]);
        setOrderToRequestInvoice(null);
        showToast('Đang Gửi Chứng Từ', 'Quá trình này có thể mất một lúc. Vui lòng không đóng trang.', 'loading');

        try {
            const result = await apiService.requestInvoice(order["Số đơn hàng"], contractFile, proposalFile, JSON.stringify(policy), commission);
            await refetchHistory();
            hideToast();
            showToast('Gửi Thành Công', result.message, 'success', 3000);
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Gửi Thất Bại', message, 'error', 5000);
        } finally {
            setProcessingOrder(null);
        }
    };
    
    const handleSupplementFiles = async (order: Order, contractFile: File | null, proposalFile: File | null) => {
        setProcessingOrder(order["Số đơn hàng"]);
        showToast('Đang Bổ Sung Chứng Từ', 'Hệ thống đang xử lý tệp của bạn.', 'loading');
        try {
            const result = await apiService.uploadSupplementaryFiles(order["Số đơn hàng"], contractFile, proposalFile);
            await refetchHistory();
            hideToast();
            showToast('Bổ Sung Thành Công', result.message, 'success', 3000);
        } catch(error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Bổ Sung Thất Bại', message, 'error', 5000);
        } finally {
             setOrderToSupplement(null);
             setProcessingOrder(null);
        }
    };
    
    const handleEditSuccess = (message: string) => {
        setOrderToEdit(null);
        showToast('Cập nhật thành công!', message, 'success');
        refetchHistory(true);
        refetchStock(true);
    };

    const handleConfirmRequestVC = async (payload: any, vin?: string): Promise<boolean> => {
        if (!orderToRequestVC) return false;
        setProcessingOrder(orderToRequestVC["Số đơn hàng"]);
        showToast('Đang gửi YC VinClub', `Vui lòng chờ trong giây lát...`, 'loading');

        const fileToBase64 = (file: File) => {
            return new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve((reader.result as string).split(',')[1]); // Only data part
              reader.onerror = error => reject(error);
            });
        };
        
        try {
            const filesData = [];
            for (const key in payload.files) {
                if (payload.files[key]) {
                    const file = payload.files[key];
                    const base64 = await fileToBase64(file);
                    filesData.push({
                        key: key,
                        name: file.name,
                        type: file.type,
                        data: base64
                    });
                }
            }
            
            const serverPayload = {
                orderNumber: payload.orderNumber,
                customerType: payload.customerType,
                dmsCode: payload.dmsCode,
                filesData: JSON.stringify(filesData),
                vin: vin,
            };

            const result = await apiService.requestVinClub(serverPayload);
            
            hideToast();
            showToast('Thành Công', result.message || 'Yêu cầu VinClub đã được gửi.', 'success');
            
            if (result.updatedOrder) {
                setAllHistoryData(currentOrders => 
                  currentOrders.map(order => 
                    order['Số đơn hàng'] === result.updatedOrder['Số đơn hàng']
                      ? { ...order, ...result.updatedOrder }
                      : order
                  )
                );
            } else {
                refetchHistory(true); // Silent refetch
            }

            setOrderToRequestVC(null);
            return true;
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định.";
            showToast('Yêu Cầu Thất Bại', message, 'error');
            return false;
        } finally {
            setProcessingOrder(null);
        }
    };

    const handleConfirmVC = async (): Promise<boolean> => {
        if (!orderToConfirmVC) return false;
        setProcessingOrder(orderToConfirmVC["Số đơn hàng"]);
        showToast('Đang Xác Thực VC', 'Vui lòng chờ...', 'loading');
        try {
            await apiService.performAdminAction('confirmVcUnc', { orderNumber: orderToConfirmVC['Số đơn hàng'] });
            await refetchHistory();
            hideToast();
            showToast('Thành Công', 'Đã xác thực UNC cho VinClub.', 'success');
            setOrderToConfirmVC(null);
            return true;
        } catch (error) {
            hideToast();
            const message = String(error instanceof Error ? error.message : "Lỗi không xác định");
            showToast('Xác Thực VC Thất Bại', message, 'error');
            return false;
        } finally {
             setProcessingOrder(null);
        }
    };

    const handleCreateRequestClose = useCallback(() => {
        setCreateRequestData({ isOpen: false });
    }, []);

    const handleFormSuccess = useCallback((newOrder: Order) => {
        setCreateRequestData({ isOpen: false });
        setAllHistoryData(prev => [newOrder, ...prev].sort((a,b) => new Date(b['Thời gian nhập']).getTime() - new Date(a['Thời gian nhập']).getTime()));
        showToast('Yêu Cầu Đã Gửi', 'Yêu cầu ghép xe của bạn đã được ghi nhận thành công.', 'success', 4000);
        refetchStock(true);
        setTimeout(() => { setSelectedOrder(newOrder); }, 500);
    }, [setAllHistoryData, showToast, refetchStock]);
    
    const handleFilterChange = useCallback((newFilters: Partial<typeof filters>) => {
        setCurrentPage(1);
        setFilters(prev => ({ ...prev, ...newFilters }));
    }, []);

    const handleResetFilters = useCallback(() => {
        setCurrentPage(1);
        setFilters({ keyword: '', carModel: [], status: [] });
    }, []);

    const handleSort = (key: keyof Order) => {
        setCurrentPage(1);
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; }
        setSortConfig({ key, direction });
    };

    const handleLoadMoreArchives = async () => {
        setIsLoadingArchives(true);
        showToast('Đang Tải Lưu Trữ', 'Đang tải dữ liệu cũ, vui lòng chờ.', 'loading');
        try {
            const result = await apiService.fetchAllArchivedData();
            hideToast();
            if (result.data && result.data.length > 0) {
                sessionStorage.setItem('archivedOrdersData', JSON.stringify(result.data));
                setAllHistoryData(prevData => [...prevData, ...result.data]);
                showToast('Tải Thành Công', `Đã tải thêm ${result.data.length} mục từ kho lưu trữ.`, 'success', 3000);
            } else {
                showToast('Hoàn Tất', 'Không tìm thấy thêm dữ liệu nào trong kho lưu trữ.', 'info', 3000);
            }
            setIsLastArchive(true);
        } catch (error) {
            hideToast();
            const message = error instanceof Error ? error.message : "Lỗi không xác định";
            showToast('Tải Thất Bại', message, 'error', 5000);
        } finally {
            setIsLoadingArchives(false);
        }
    };

    const handleCreateRequestForVehicle = (vehicle: StockVehicle) => {
        setCreateRequestData({ isOpen: true, initialVehicle: vehicle });
    };
    
    const openImagePreviewModal = useCallback((images: ImageSource[], startIndex: number = 0, customerName: string) => {
        setImagePreview({ images, startIndex, customerName });
    }, []);

    const openFilePreviewModal = useCallback((url: string, label: string) => {
        setFilePreview({ url, label });
    }, []);
    
    const showOrderInAdmin = (order: Order, targetTab: AdminSubView) => {
        setActiveView('admin');
        setInitialAdminState({ orderToShow: order, targetTab });
    };

    const showAdminTab = (targetTab: AdminSubView) => {
        setActiveView('admin');
        setInitialAdminState({ targetTab });
    };


    const processedData = useMemo(() => {
        let filteredOrders = [...historyData];
        if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            filteredOrders = filteredOrders.filter(order => order["Tên khách hàng"]?.toLowerCase().includes(keyword) || order["Số đơn hàng"]?.toLowerCase().includes(keyword) || order.VIN?.toLowerCase().includes(keyword));
        }
        if (filters.carModel.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.carModel.includes(order["Dòng xe"]));
        }
        if (filters.status.length > 0) {
            filteredOrders = filteredOrders.filter(order => filters.status.includes(order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép"));
        }
        if (sortConfig !== null) {
            filteredOrders.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue === null || aValue === undefined || aValue === '') return 1;
                if (bValue === null || bValue === undefined || bValue === '') return -1;
                if (aValue < bValue) { return sortConfig.direction === 'asc' ? -1 : 1; }
                if (aValue > bValue) { return sortConfig.direction === 'asc' ? 1 : -1; }
                return 0;
            });
        }
        return filteredOrders;
    }, [historyData, filters, sortConfig]);
    
    const groupedPendingStats = useMemo(() => {
        const dataForStats = allHistoryData;
        const pendingRequests = dataForStats.filter(o => o['Kết quả']?.toLowerCase().includes('chưa'));

        const groupedByModel: Record<string, Order[]> = {};
        pendingRequests.forEach(order => {
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

    const totalPages = Math.ceil(processedData.length / PAGE_SIZE);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [totalPages, currentPage, PAGE_SIZE]);

    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return processedData.slice(startIndex, startIndex + PAGE_SIZE);
    }, [processedData, currentPage, PAGE_SIZE]);

    const handleOrderNavigation = (direction: 'prev' | 'next') => {
        if (!selectedOrder) return;
        const list = processedData; // The list is from App's scope
        const currentIndex = list.findIndex(o => o['Số đơn hàng'] === selectedOrder['Số đơn hàng']);
        if (currentIndex === -1) return;
    
        const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    
        if (nextIndex >= 0 && nextIndex < list.length) {
            setSelectedOrder(list[nextIndex]);
        }
    };
    
    const uniqueCarModels = useMemo(() => [...new Set(allHistoryData.map(o => o["Dòng xe"]))].sort(), [allHistoryData]);
    const uniqueStatuses = useMemo(() => [...new Set(allHistoryData.map(o => o["Trạng thái VC"] || o["Kết quả"] || "Chưa ghép"))].sort(), [allHistoryData]);

    const renderOrdersContent = () => {
        const animationClass = 'animate-fade-in-up';
        const isLoading = isLoadingHistory;
        const error = errorHistory;
        const refetch = refetchHistory;

        const dropdownConfigs: DropdownFilterConfig[] = [
            { id: 'order-filter-car-model', key: 'carModel', label: 'Dòng Xe', options: uniqueCarModels, icon: 'fa-car' },
            { id: 'order-filter-status', key: 'status', label: 'Trạng Thái', options: uniqueStatuses, icon: 'fa-tag' }
        ].filter(d => d.options.length > 0);

        const pendingStatsButton = (
            <button
                onClick={() => setIsPendingStatsModalOpen(true)}
                className="btn-filter h-9 px-4 text-sm font-semibold !text-accent-primary active"
                title="Xem thống kê các xe đang có yêu cầu chờ ghép"
            >
                <i className="fas fa-chart-pie mr-2"></i>
                <span>Thống Kê</span>
            </button>
        );

        if (isLoading && allHistoryData.length === 0) {
            const skeletons = Array.from({ length: 7 }, (_, i) => (
                <tr key={i}>
                    <td colSpan={7} className="py-1 px-4 sm:px-6">
                         <div className="flex items-center space-x-4 p-4 w-full">
                            <div className="skeleton-item h-6 w-6 !rounded-full"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="skeleton-item h-4 w-3/4"></div>
                                <div className="skeleton-item h-3 w-1/2"></div>
                            </div>
                             <div className="flex-1 space-y-2 py-1 hidden md:block">
                                <div className="skeleton-item h-4 w-5/6"></div>
                                <div className="skeleton-item h-3 w-1/3"></div>
                            </div>
                             <div className="flex-1 skeleton-item h-4 w-full hidden md:block"></div>
                             <div className="flex-1 skeleton-item h-4 w-full hidden md:block"></div>
                             <div className="flex-1 skeleton-item h-8 w-24 !rounded-full hidden md:block"></div>
                             <div className="flex-1 skeleton-item h-8 w-8 !rounded-lg hidden md:block"></div>
                        </div>
                    </td>
                </tr>
            ));
            return ( 
                 <div className={`flex flex-col h-full ${animationClass}`}>
                    <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="skeleton-item h-12 rounded-full" style={{flexBasis: '320px', flexGrow: 1}}></div>
                            <div className="skeleton-item h-12 w-32 rounded-full"></div>
                            <div className="skeleton-item h-12 w-32 rounded-full"></div>
                            <div className="skeleton-item h-12 w-12 !rounded-full ml-auto"></div>
                        </div>
                    </div>
                     <div className="flex-1 bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                        <div className="flex-grow overflow-auto">
                            <table className="min-w-full">
                                <tbody className="divide-y divide-border-primary">{skeletons}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }
        if (error) {
            return ( <div className={`flex items-center justify-center h-96 ${animationClass}`}><div className="text-center p-8 bg-surface-card rounded-lg shadow-xl"><i className="fa-solid fa-exclamation-triangle fa-3x text-danger"></i><p className="mt-4 text-lg font-semibold">Không thể tải dữ liệu</p><p className="mt-2 text-sm text-text-secondary max-w-sm">{error}</p><button onClick={() => refetch()} className="mt-6 btn-primary">Thử lại</button></div></div>);
        }
        return ( 
            <div className={`flex flex-col h-full ${animationClass}`}>
                <div className="flex-shrink-0 bg-surface-card rounded-xl shadow-md border border-border-primary p-3 mb-2">
                    <Filters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onReset={handleResetFilters}
                        dropdowns={dropdownConfigs}
                        searchPlaceholder="Tìm kiếm SĐH, tên khách hàng, số VIN..."
                        totalCount={processedData.length}
                        onRefresh={() => refetch()}
                        isLoading={isLoading}
                        size="compact"
                        plain={true}
                        extraActionButton={pendingStatsButton}
                        viewSwitcherEnabled={true}
                        activeView={orderView}
                        onViewChange={setOrderView}
                    />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                    {orderView === 'table' ? (
                        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                            <div className="overflow-auto relative hidden-scrollbar">
                                <HistoryTable
                                    orders={paginatedData}
                                    onViewDetails={handleViewDetails}
                                    onCancel={setOrderToCancel}
                                    onRequestInvoice={setOrderToRequestInvoice}
                                    onSupplement={setOrderToSupplement}
                                    onEdit={setOrderToEdit}
                                    onRequestVC={setOrderToRequestVC}
                                    onConfirmVC={setOrderToConfirmVC}
                                    sortConfig={sortConfig}
                                    onSort={handleSort}
                                    startIndex={(currentPage - 1) * PAGE_SIZE}
                                    processingOrder={processingOrder}
                                />
                            </div>
                            {(totalPages > 0 || !isLastArchive) && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={handleLoadMoreArchives} isLoadingArchives={isLoadingArchives} isLastArchive={isLastArchive} />}
                        </div>
                    ) : (
                        <div className="bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col min-h-0">
                            <div className="overflow-y-auto hidden-scrollbar p-1">
                                <OrderGridView
                                    orders={paginatedData}
                                    onViewDetails={handleViewDetails}
                                    onCancel={setOrderToCancel}
                                    onRequestInvoice={setOrderToRequestInvoice}
                                    onSupplement={setOrderToSupplement}
                                    onEdit={setOrderToEdit}
                                    onRequestVC={setOrderToRequestVC}
                                    onConfirmVC={setOrderToConfirmVC}
                                    processingOrder={processingOrder}
                                />
                            </div>
                           {(totalPages > 0 || !isLastArchive) && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onLoadMore={handleLoadMoreArchives} isLoadingArchives={isLoadingArchives} isLastArchive={isLastArchive} />}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const sidebarClasses = `fixed top-0 left-0 h-full z-40 bg-surface-card/70 backdrop-blur-xl w-64 transition-all duration-300 ease-in-out flex flex-col border-r border-border-primary/50
        lg:top-4 lg:left-4 lg:h-[calc(100%-2rem)] lg:rounded-2xl lg:border lg:shadow-xl
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`;
        
    const mainContentPadding = isSidebarCollapsed ? 'lg:pl-24' : 'lg:pl-[17.5rem]';

    return (
        <>
            <div className="circuit-background"></div>
            <div className="scanline"></div>
            <div id="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}></div>

            <aside className={sidebarClasses}>
                <div className="flex items-center h-16 border-b border-border-primary/50 flex-shrink-0 px-4">
                    <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-center h-full group">
                        <img src={logoChinh} alt="Order Management Logo" className={`object-contain transition-all duration-300 group-hover:scale-105 ${isSidebarCollapsed ? 'h-10' : 'h-13'}`} />
                    </a>
                    <button onClick={toggleSidebar} className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg bg-transparent hover:bg-surface-hover text-text-secondary hover:text-text-primary ml-auto">
                        <i className={`fa-solid fa-chevron-left transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}></i>
                    </button>
                </div>

                <nav className="p-2 flex flex-col flex-grow overflow-y-auto">
                    <div className="space-y-1">
                        <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('orders'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'orders'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                            <i className={`fa-solid fa-car-side fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Quản lý Ghép xe</span>
                        </a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('stock'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'stock'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                            <i className={`fa-solid fa-warehouse fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Kho Xe</span>
                        </a>
                         <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('laithu'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'laithu'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                            <i className={`fa-solid fa-gauge-high fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Lái Thử</span>
                        </a>
                        <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('sold'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'sold'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                            <i className={`fa-solid fa-receipt fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Lịch Sử Bán Hàng</span>
                        </a>
                        {isCurrentUserAdmin && (
                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('admin'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'admin'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                                <i className={`fa-solid fa-user-shield fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                                <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Admin</span>
                            </a>
                        )}
                    </div>

                    <div className={`px-2 pt-4 pb-2 transition-opacity duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
                        <img src={currentGif} alt="Halloween decoration" className="w-full h-auto object-contain" />
                    </div>
                </nav>

                <div ref={profileMenuRef} className="relative flex-shrink-0 border-t border-border-primary/50">
                    {isProfileMenuOpen && (
                        <div className="absolute bottom-full left-2 right-2 mb-2 p-1.5 bg-surface-card rounded-lg shadow-lg border border-border-primary animate-fade-in-up" style={{animationDuration: '200ms'}}>
                            <div className="px-3 py-2 border-b border-border-primary mb-1">
                                <p className="font-bold text-sm text-text-primary truncate">{currentUser}</p>
                                <p className="text-xs text-text-secondary capitalize">{userRole}</p>
                            </div>
                            <button 
                                onClick={() => { setIsChangePasswordModalOpen(true); setIsProfileMenuOpen(false); }} 
                                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md text-text-primary hover:bg-surface-hover"
                            >
                                <i className="fas fa-key fa-fw text-text-secondary"></i>
                                <span>Đổi mật khẩu</span>
                            </button>
                            <button 
                                onClick={() => { onLogout(); setIsProfileMenuOpen(false); }}
                                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md text-danger hover:bg-danger-bg"
                            >
                                <i className="fas fa-sign-out-alt fa-fw"></i>
                                <span>Đăng xuất</span>
                            </button>
                        </div>
                    )}
                    
                    <div className="p-2">
                        <button 
                            onClick={() => setIsProfileMenuOpen(prev => !prev)}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors hover:bg-surface-hover ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}
                        >
                            <div className="relative flex-shrink-0">
                                <Avatar name={currentUser} size="md" />
                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
                            </div>
                            <div className={`transition-opacity duration-200 min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
                                <p className="text-sm font-bold text-text-primary whitespace-nowrap truncate">{currentUser}</p>
                                <p className="text-xs text-text-secondary capitalize truncate">{userRole}</p>
                            </div>
                            {!isSidebarCollapsed && (
                                <i className={`fas fa-chevron-up text-xs text-text-secondary ml-auto transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''} ${isSidebarCollapsed ? 'lg:hidden' : ''}`}></i>
                            )}
                        </button>
                    </div>
                </div>
            </aside>
            
             <div className={`relative h-screen flex flex-col transition-all duration-300 ease-in-out ${mainContentPadding} ${isMobileMenuOpen ? 'translate-x-64' : ''}`}>
                <header className={`relative sticky top-0 w-full z-20 h-14 bg-surface-card/70 backdrop-blur-xl border-b border-border-primary/50 flex items-center justify-between px-4 sm:px-6`}>
                    <div className="flex items-center gap-4">
                         <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden text-text-secondary hover:text-text-primary text-xl">
                            <i className="fa-solid fa-bars"></i>
                        </button>
                    </div>
                    
                    <div className={`absolute -translate-x-1/2 hidden sm:flex items-center left-1/2 ${isSidebarCollapsed ? 'lg:left-[calc(50%-3rem)]' : 'lg:left-[calc(50%-9rem)]'}`}>
                       <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="h-14 object-contain"
                            src={logohalloVideo}
                            aria-label="Order Management Logo"
                        >
                        </video>
                    </div>
                    
                    <div className="flex items-center justify-end space-x-2 sm:space-x-4">
                        <div
                            onClick={() => setCreateRequestData({ isOpen: true })}
                            title="Tạo Yêu Cầu Mới"
                            className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                        >
                            <lottie-player
                                src={yeucauAnimationUrl}
                                background="transparent"
                                speed="1"
                                style={{ width: '250px', height: '120px', marginTop: '-10px', marginBottom: '-10px' }}
                                loop
                                autoplay
                            />
                        </div>
                        
                        <div ref={notificationContainerRef} className="relative notification-bell-container">
                            <button onClick={toggleNotificationPanel} className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-accent-primary transition-colors" title="Thông báo">
                                <i className="fa-solid fa-bell"></i>
                                {unreadCount > 0 && (<span id="notification-badge" className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>)}
                            </button>
                            <div className={`notification-panel ${isNotificationPanelOpen ? 'visible' : ''}`}>
                                <div className="notification-panel-header flex justify-between items-center">
                                    <span>Thông Báo</span>
                                    {unreadCount > 0 && <button onClick={handleMarkAllAsRead} className="text-xs font-medium text-accent-secondary hover:text-accent-primary-hover transition-colors">Đánh dấu đã đọc tất cả</button>}
                                </div>
                                <div className="notification-list">
                                    {notifications.length > 0 ? (
                                        notifications.map(notification => {
                                            const iconMap: Record<NotificationType, string> = { success: 'fa-check', danger: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle', error: 'fa-times-circle' };
                                            const type = notification.type === 'error' ? 'danger' : notification.type;
                                            return (
                                                <div key={notification.id} className={`notification-item ${!notification.isRead ? 'unread' : ''}`} onClick={(e) => handleNotificationClick(notification, e)}>
                                                    <div className={`notification-icon type-${type}`}><i className={`fa-solid ${iconMap[type] || 'fa-bell'}`}></i></div>
                                                    <div className="notification-content">
                                                        <p className="notification-message" dangerouslySetInnerHTML={{__html: notification.message}}></p>
                                                        <p className="notification-time">{moment(notification.timestamp).fromNow()}</p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : ( <div className="no-notifications"><i className="fa-solid fa-bell-slash"></i><p>Không có thông báo nào.</p></div> )}
                                </div>
                            </div>
                        </div>
                         <button onClick={onLogout} className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-danger transition-colors" title="Đăng xuất">
                            <i className="fa-solid fa-sign-out-alt"></i>
                        </button>
                    </div>
                </header>

                <main className={`flex-1 p-2 flex flex-col overflow-y-auto`}>
                    <div hidden={activeView !== 'orders'} className="h-full">
                        {renderOrdersContent()}
                    </div>
                    <div hidden={activeView !== 'stock'} className="h-full">
                        <StockView 
                            stockData={stockData}
                            isLoading={isLoadingStock}
                            error={errorStock}
                            refetchStock={refetchStock}
                            highlightedVins={highlightedVins}
                            showToast={showToast} 
                            currentUser={currentUser} 
                            isAdmin={isCurrentUserAdmin} 
                            onCreateRequestForVehicle={handleCreateRequestForVehicle}
                            onHoldCar={handleHoldCar}
                            onReleaseCar={handleReleaseCar}
                            processingVin={processingVin}
                            isSidebarCollapsed={isSidebarCollapsed}
                            allOrders={allHistoryData}
                            showOrderInAdmin={showOrderInAdmin}
                            showAdminTab={showAdminTab}
                        />
                    </div>
                    <div hidden={activeView !== 'sold'} className="h-full">
                        <SoldCarsView
                          showToast={showToast}
                          soldData={soldData}
                          isLoading={isLoadingSold}
                          error={errorSold}
                          refetch={refetchSold}
                          isSidebarCollapsed={isSidebarCollapsed}
                        />
                    </div>
                    <div hidden={activeView !== 'laithu'} className="h-full">
                        <TestDriveForm
                            showToast={showToast}
                            onOpenImagePreview={openImagePreviewModal}
                            currentUser={currentUser}
                            isAdmin={isCurrentUserAdmin}
                            allTestDrives={testDriveData}
                            setAllTestDrives={setTestDriveData}
                            isLoading={isLoadingTestDrive}
                            refetch={refetchTestDrive}
                        />
                    </div>
                    <div hidden={activeView !== 'admin'} className="h-full">
                        {isCurrentUserAdmin && <AdminView 
                            showToast={showToast} 
                            hideToast={hideToast} 
                            refetchHistory={refetchHistory} 
                            refetchStock={refetchStock}
                            allOrders={allHistoryData}
                            xuathoadonData={xuathoadonData}
                            refetchXuathoadon={refetchXuathoadon}
                            stockData={stockData}
                            isLoadingXuathoadon={isLoadingXuathoadon}
                            errorXuathoadon={errorXuathoadon}
                            onOpenImagePreview={openImagePreviewModal}
                            onOpenFilePreview={openFilePreviewModal}
                            teamData={teamData}
                            allUsers={allUsers}
                            refetchAdminData={fetchAdminData}
                            soldData={soldData}
                            isSidebarCollapsed={isSidebarCollapsed}
                            initialState={initialAdminState}
                            clearInitialState={() => setInitialAdminState(null)}
                            // FIX: Pass missing onNavigateTo and onShowOrderDetails props to AdminView.
                            onNavigateTo={setActiveView}
                            onShowOrderDetails={setSelectedOrder}
                        />}
                    </div>
                </main>
                <footer className="flex-shrink-0 h-8 bg-surface-card/70 backdrop-blur-xl border-t border-border-primary/50 flex items-center justify-center px-4 sm:px-6">
                    <p className="text-xs text-text-secondary">&copy; {new Date().getFullYear()} Order Management</p>
                </footer>
            </div>
            
            <CreateRequestModal
                isOpen={createRequestData.isOpen}
                onClose={handleCreateRequestClose}
                onSuccess={handleFormSuccess}
                showToast={showToast}
                hideToast={hideToast}
                existingOrderNumbers={allHistoryData.map(o => o["Số đơn hàng"])}
                initialVehicle={createRequestData.initialVehicle}
                currentUser={currentUser}
                vehicleAnalyticsData={vehicleAnalyticsData}
                onOpenImagePreview={openImagePreviewModal}
            />
            <ChangePasswordModal
                isOpen={isChangePasswordModalOpen}
                onClose={() => setIsChangePasswordModalOpen(false)}
                showToast={showToast}
                username={currentUserName}
            />
            <OrderDetailsModal 
                order={selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                orderList={processedData}
                onNavigate={handleOrderNavigation}
                onCancel={setOrderToCancel}
                onRequestInvoice={setOrderToRequestInvoice}
                onSupplement={setOrderToSupplement}
                onRequestVC={setOrderToRequestVC}
                onConfirmVC={setOrderToConfirmVC}
                onEdit={setOrderToEdit}
            />
            <EditOrderModal
                isOpen={!!orderToEdit}
                onClose={() => setOrderToEdit(null)}
                onSuccess={handleEditSuccess}
                order={orderToEdit}
                showToast={showToast}
                existingOrderNumbers={allHistoryData
                    .map(o => o["Số đơn hàng"])
                    .filter(num => num !== orderToEdit?.["Số đơn hàng"])
                }
            />
            {orderToCancel && <CancelRequestModal order={orderToCancel} onClose={() => setOrderToCancel(null)} onConfirm={handleCancelOrder} />}
            {orderToRequestInvoice && <RequestInvoiceModal order={orderToRequestInvoice} onClose={() => setOrderToRequestInvoice(null)} onConfirm={handleRequestInvoice} />}
            {orderToSupplement && <SupplementaryFileModal order={orderToSupplement} onClose={() => setOrderToSupplement(null)} onConfirm={handleSupplementFiles} />}
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
            {filePreview && (
                <FilePreviewModal
                    isOpen={!!filePreview}
                    onClose={() => setFilePreview(null)}
                    fileUrl={filePreview.url}
                    fileLabel={filePreview.label}
                />
            )}
            <PendingStatsModal
                isOpen={isPendingStatsModalOpen}
                onClose={() => setIsPendingStatsModalOpen(false)}
                stats={groupedPendingStats}
            />
        </>
    );
};

export default App;