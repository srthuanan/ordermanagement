import { useState, useEffect, useRef, useCallback } from 'react';
import { Notification as SystemNotification } from '../types';
import * as apiService from '../services/apiService';
import { supabase } from '../services/supabaseClient';

export const useNotification = (showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void) => {
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const notificationContainerRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const result = await apiService.fetchNotifications();
            const fetchedNotifications = result.notifications || [];
            const fetchedUnreadCount = result.unreadCount || 0;
            
            setNotifications(fetchedNotifications);
            setUnreadCount(prevUnreadCount => {
                const nextUnreadCount = fetchedUnreadCount;
                if (nextUnreadCount > prevUnreadCount) {
                    const badge = document.getElementById('notification-badge');
                    badge?.classList.add('animate-pop');
                    setTimeout(() => badge?.classList.remove('animate-pop'), 300);
                }

                // Update Badging API (PWA)
                if ('setAppBadge' in navigator) {
                    if (nextUnreadCount > 0) {
                        (navigator as any).setAppBadge(nextUnreadCount).catch(console.error);
                    } else {
                        (navigator as any).clearAppBadge().catch(console.error);
                    }
                }

                return nextUnreadCount;
            });

        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 60000); // Tăng lên 1 phút vì đã có realtime
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    // --- BROWSER PUSH NOTIFICATIONS ---
    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) return false;
        if (window.Notification.permission === 'granted') return true;
        
        const permission = await window.Notification.requestPermission();
        return permission === 'granted';
    }, []);

    const showBrowserNotification = useCallback((notification: SystemNotification) => {
        if (!('Notification' in window) || window.Notification.permission !== 'granted') return;

        const { message, type } = notification;
        const baseUrl = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
        const icon = `${baseUrl}logoweb.png`;
        
        // Derive title from type or use constant
        const titleMap: Record<string, string> = {
            'success': 'Thành công',
            'error': 'Lỗi hệ thống',
            'warning': 'Cảnh báo',
            'info': 'Thông tin mới',
            'danger': 'Khẩn cấp',
            'stock_hero': 'Kho xe mới'
        };
        const title = titleMap[type] || 'Thông báo mới';

        try {
            const n = new window.Notification(title, {
                body: message || 'Bạn có thông báo mới',
                icon: icon,
                badge: icon,
                requireInteraction: true
            });

            n.onclick = () => {
                window.focus();
                n.close();
            };
        } catch (e) {
            console.error("Failed to show notification:", e);
        }
    }, []);


    // --- REALTIME NOTIFICATIONS ---
    useEffect(() => {
        const channel = supabase
            .channel('db-changes-notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'interactions' }, (payload) => {
                const newInteraction = payload.new as any;
                if (newInteraction.category === 'NOTIFICATION') {
                    console.log('New notification detected:', payload);
                    const newNotif = {
                        ...newInteraction,
                        timestamp: newInteraction.created_at,
                        createdBy: newInteraction.actor_name,
                        targetView: newInteraction.target_view,
                        targetId: newInteraction.target_id
                    } as unknown as SystemNotification;
                    
                    if (document.visibilityState !== 'visible') {
                        showBrowserNotification(newNotif);
                    }
                    fetchNotifications();
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'interactions' }, () => fetchNotifications())
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'interactions' }, () => fetchNotifications())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchNotifications, showBrowserNotification]);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationContainerRef.current && !notificationContainerRef.current.contains(event.target as Node)) {
                setIsNotificationPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllAsReadInternal = useCallback(async () => {
        if (unreadCount === 0) return;
        const currentNotifications = [...notifications];
        const currentUnreadCount = unreadCount;
        
        // Optimistic UI update
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
    }, [unreadCount, notifications, showToast]);

    const toggleNotificationPanel = () => {
        setIsNotificationPanelOpen(prev => {
            const next = !prev;
            if (next === true && unreadCount > 0) {
                // Tự động đánh dấu đã đọc khi mở bảng thông báo
                markAllAsReadInternal();
            }
            return next;
        });
    };

    const handleMarkAllAsRead = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await markAllAsReadInternal();
    };

    const handleNotificationClick = async (
        notification: SystemNotification,
        event: React.MouseEvent,
        navigationOptions?: {
            allHistoryData?: any[];
            setSelectedOrder?: (order: any) => void;
            setActiveView?: (view: any) => void;
            setStockFilter?: (vin: string) => void;
            showInquiryInAdmin?: (inquiryId: string) => void;
            setTargetInquiryIdForTVBH?: (id: string) => void;
            setExtensionVehicle?: (vin: string) => void;
        }
    ) => {
        event.stopPropagation();
        const { allHistoryData = [], setSelectedOrder, setActiveView, setStockFilter, showInquiryInAdmin, setTargetInquiryIdForTVBH, setExtensionVehicle } = navigationOptions || {};

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

        // Logic điều hướng dựa trên Target View & Target ID
        if (notification.targetView) {
            if (setActiveView) setActiveView(notification.targetView as any);
            
            // Nếu là đơn hàng, mở chi tiết đơn hàng
            if (notification.targetView === 'orders' && notification.targetId && setSelectedOrder && allHistoryData.length > 0) {
                const order = allHistoryData.find(o => o['Số đơn hàng'] === notification.targetId);
                if (order) setSelectedOrder(order);
            }
            
            // Nếu là kho xe, có thể filter theo VIN
            if (notification.targetView === 'stock' && notification.targetId && setStockFilter) {
                setStockFilter(notification.targetId);
                // Nếu là thông báo nhắc nhở gia hạn (có chữ gia hạn trong tin nhắn), mở luôn modal
                if (notification.message.toLowerCase().includes('gia hạn') && setExtensionVehicle) {
                    setExtensionVehicle(notification.targetId);
                }
            }

            // Nếu là tra cứu kho (TVBH nhắn tin cho admin)
            if (notification.targetView === 'inquiries' && notification.targetId && showInquiryInAdmin) {
                showInquiryInAdmin(notification.targetId);
            }

            // Nếu là tra cứu kho (Admin nhắn cho TVBH)
            if (notification.targetView === 'inquiry' && notification.targetId && setTargetInquiryIdForTVBH) {
                setTargetInquiryIdForTVBH(notification.targetId);
            }
        } else if (notification.link) {
            // Logic cũ dự phòng cho các link GAS hoặc liên kết ngoài
            const orderNumberMatch = notification.link.match(/orderNumber=([^&]+)/);
            if (orderNumberMatch && orderNumberMatch[1] && allHistoryData.length > 0 && setSelectedOrder) {
                const order = allHistoryData.find(o => o['Số đơn hàng'] === decodeURIComponent(orderNumberMatch[1]));
                if (order) setSelectedOrder(order);
                else window.location.href = notification.link;
            } else {
                window.location.href = notification.link;
            }
        }
        
        setIsNotificationPanelOpen(false);
    };

    return {
        notifications,
        unreadCount,
        isNotificationPanelOpen,
        notificationContainerRef,
        toggleNotificationPanel,
        handleMarkAllAsRead,
        handleNotificationClick,
        setIsNotificationPanelOpen,
        fetchNotifications,
        requestNotificationPermission
    };
};

