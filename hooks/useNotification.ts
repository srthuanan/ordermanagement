import { useState, useEffect, useRef, useCallback } from 'react';
import { Notification } from '../types';
import * as apiService from '../services/apiService';

export const useNotification = (showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
    const notificationContainerRef = useRef<HTMLDivElement>(null);

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
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000);
        return () => clearInterval(intervalId);
    }, [fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationContainerRef.current && !notificationContainerRef.current.contains(event.target as Node)) {
                setIsNotificationPanelOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleNotificationPanel = () => {
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

    const handleNotificationClick = async (
        notification: Notification,
        event: React.MouseEvent,
        allHistoryData: any[],
        setSelectedOrder: (order: any) => void
    ) => {
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
            if (orderNumberMatch && orderNumberMatch[1]) {
                const order = allHistoryData.find(o => o['Số đơn hàng'] === decodeURIComponent(orderNumberMatch[1]));
                if (order) {
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

    return {
        notifications,
        unreadCount,
        isNotificationPanelOpen,
        notificationContainerRef,
        toggleNotificationPanel,
        handleMarkAllAsRead,
        handleNotificationClick,
        setIsNotificationPanelOpen
    };
};
