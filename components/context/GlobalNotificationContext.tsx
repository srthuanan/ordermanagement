import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import { getGlobalNotification, updateGlobalNotification as apiUpdateGlobalNotification } from '../../services/apiService';

export interface GlobalNotification {
    content: string;
    isActive: boolean;
    type: 'info' | 'warning' | 'success' | 'danger' | 'tet';
    timestamp?: number; // Add timestamp for history
}

interface GlobalNotificationContextType {
    notification: GlobalNotification | null;
    loading: boolean;
    error: string | null;
    fetchNotification: () => Promise<void>;
    updateNotification: (newNotification: GlobalNotification) => Promise<boolean>;
    dismissNotification: () => void;
    isDismissed: boolean;
    history: GlobalNotification[];
    clearHistory: () => void;
}

const GlobalNotificationContext = createContext<GlobalNotificationContextType | undefined>(undefined);

const NOTIFICATION_SOUND = "data:audio/mp3;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAG84n418458PHF9P9+f/44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3//44hwn/3///+5BkAABYxIvBQhgACxiReChDAA==";

export const GlobalNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notification, setNotification] = useState<GlobalNotification | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isDismissed, setIsDismissed] = useState<boolean>(false);
    const [history, setHistory] = useState<GlobalNotification[]>([]);

    const prevNotificationRef = useRef<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initialize audio
    useEffect(() => {
        audioRef.current = new Audio(NOTIFICATION_SOUND);
        audioRef.current.volume = 0.5;

        // Load history from local storage
        try {
            const savedHistory = localStorage.getItem('notificationHistory');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (error) {
            console.error("Failed to load notification history:", error);
        }
    }, []);

    const playSound = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log("Audio play failed (user interaction needed first):", e));
        }
    };

    const addToHistory = (notif: GlobalNotification) => {
        const notifWithTimestamp = { ...notif, timestamp: Date.now() };
        setHistory(prev => {
            // Avoid duplicates at the top of the list
            if (prev.length > 0 && prev[0].content === notif.content && prev[0].type === notif.type) {
                return prev;
            }
            const newHistory = [notifWithTimestamp, ...prev].slice(0, 20); // Keep last 20
            localStorage.setItem('notificationHistory', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const fetchNotification = useCallback(async () => {
        try {
            if (!notification) setLoading(true);

            const result = await getGlobalNotification();
            if (result.status === 'SUCCESS' && result.data) {
                const newContent = result.data.content || '';
                const newType = result.data.type || 'info';
                const newIsActive = !!result.data.isActive;

                const newNotif: GlobalNotification = {
                    content: newContent,
                    isActive: newIsActive,
                    type: newType
                };

                // Check for changes to trigger sound/reset dismiss/add history
                const uniqueKey = `${newContent}-${newType}`;

                if (uniqueKey !== prevNotificationRef.current) {
                    prevNotificationRef.current = uniqueKey;

                    if (newIsActive) {
                        setNotification(newNotif);

                        // Kiểm tra xem thông báo này đã bị ẩn trước đó chưa (trong localStorage)
                        const dismissedKey = localStorage.getItem('dismissedGlobalNotification');
                        if (dismissedKey === uniqueKey) {
                            setIsDismissed(true);
                        } else {
                            setIsDismissed(false);
                            playSound();
                            addToHistory(newNotif);
                        }
                    } else {
                        setNotification(null);
                    }
                }
                setError(null);
            } else {
                setNotification(null);
            }
        } catch (err) {
            console.error("Failed to fetch global notification:", err);
            if (!notification) setError("Không thể tải thông báo.");
        } finally {
            setLoading(false);
        }
    }, [notification]);

    const updateNotification = async (newNotification: GlobalNotification) => {
        try {
            setLoading(true);
            const result = await apiUpdateGlobalNotification(newNotification);
            if (result.status === 'SUCCESS') {
                setNotification(newNotification);
                setIsDismissed(false);
                // Xóa trạng thái ẩn cũ khi có thông báo mới được phát hành
                localStorage.removeItem('dismissedGlobalNotification');

                prevNotificationRef.current = `${newNotification.content}-${newNotification.type}`;
                if (newNotification.isActive) {
                    addToHistory(newNotification);
                }
                return true;
            } else {
                throw new Error(result.message);
            }
        } catch (err) {
            console.error("Failed to update global notification:", err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const dismissNotification = () => {
        setIsDismissed(true);
        // Lưu trạng thái ẩn vào localStorage
        if (notification) {
            const uniqueKey = `${notification.content}-${notification.type}`;
            localStorage.setItem('dismissedGlobalNotification', uniqueKey);
        }
    };

    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('notificationHistory');
    };

    useEffect(() => {
        fetchNotification();
        const intervalId = setInterval(fetchNotification, 30 * 1000); // 30 seconds
        return () => clearInterval(intervalId);
    }, []);

    return (
        <GlobalNotificationContext.Provider value={{
            notification,
            loading,
            error,
            fetchNotification,
            updateNotification,
            dismissNotification,
            isDismissed,
            history,
            clearHistory
        }}>
            {children}
        </GlobalNotificationContext.Provider>
    );
};

export const useGlobalNotificationContext = () => {
    const context = useContext(GlobalNotificationContext);
    if (context === undefined) {
        throw new Error('useGlobalNotificationContext must be used within a GlobalNotificationProvider');
    }
    return context;
};
