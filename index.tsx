/// <reference types="vite-plugin-pwa/client" />
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import LoginScreen from './components/LoginScreen';
import Toast from './components/ui/Toast';
import SuccessAnimation from './components/ui/SuccessAnimation';


import * as apiService from './services/apiService';
import UpdateModal from './components/modals/UpdateModal';

// Build version from Vite define (timestamp)
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
import { registerSW } from 'virtual:pwa-register';

const CACHE_VERSION_KEY = 'app_version';

const clearCacheAndReload = () => {
    console.log('New version detected. Clearing all storage and cache...');

    // 1. Clear Caches
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach((name) => {
                caches.delete(name);
            });
        });
    }

    // 2. Unregister Service Workers
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                registration.unregister();
            });
        });
    }

    // 3. Clear Storage (Nuclear option: requested by user to wipe everything)
    sessionStorage.clear();
    localStorage.clear();
    
    // 4. Record the new version and reload
    localStorage.setItem(CACHE_VERSION_KEY, APP_VERSION);
    
    // Small delay to ensure storage operations complete before reload
    setTimeout(() => {
        window.location.reload();
    }, 500);
};

const checkVersion = () => {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const currentVersion = APP_VERSION;

    if (storedVersion && storedVersion !== currentVersion) {
        clearCacheAndReload();
    } else if (!storedVersion) {
        localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
    }
};

// Khởi tạo tự động reload khi có bản PWA mới
const initPWA = () => {
    // 1. Tự động reload khi Service Worker được cập nhật
    if ('serviceWorker' in navigator) {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }

    // 2. Định kỳ kiểm tra bản cập nhật
    const updateSW = registerSW({
        onNeedRefresh() {
            // Nếu cấu hình autoUpdate bị ghi đè, force update
            updateSW(true);
        },
        onRegistered(r) {
            r && setInterval(() => {
                r.update();
            }, 60 * 1000); // Kiểm tra cập nhật mỗi phút (hoặc tùy chỉnh)
        }
    });
};

initPWA();
checkVersion(); // Fallback check the version key

type ToastItem = {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'loading' | 'warning' | 'info';
    duration?: number;
};

type SuccessInfo = {
    title: string;
    message: string;
} | null;

const Root = () => {
    // TẠM THỜI: Bỏ qua đăng nhập để tạo tài khoản admin đầu tiên.
    // BƯỚC 1 HOÀN TÁC: Sau khi tạo admin xong, hãy đổi `true` thành `false`.
    const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('isLoggedIn') === 'true');
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [successInfo, setSuccessInfo] = useState<SuccessInfo>(null);






    const handleLoginSuccess = useCallback(() => {
        setIsAuthenticated(true);
    }, []);

    const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toastDuration = type === 'loading' ? (duration ?? 0) : (duration ?? 5000);

        setToasts(prev => {
            // 1. Dọn dẹp mạnh tay: Khi có bất kỳ thông báo kết thúc nào (Success, Error, Info), 
            // chúng ta sẽ dọn dẹp TOÀN BỘ các thông báo loading đang chạy.
            let next = (type === 'success' || type === 'error' || type === 'info')
                ? prev.filter(t => t.type !== 'loading')
                : [...prev];

            // Nếu là cùng tiêu đề, cũng dọn dẹp để cập nhật cái mới
            if (type === 'loading') {
                next = next.filter(t => t.title !== title);
            }

            // 2. Logic cập nhật: Nếu đã có toast cùng type + title, chỉ cập nhật message
            const existingIndex = next.findIndex(t => t.type === type && t.title === title);
            if (existingIndex !== -1) {
                const updated = [...next];
                updated[existingIndex] = { ...updated[existingIndex], message };
                return updated;
            }

            // 3. Giới hạn số lượng toast (tối đa 3)
            if (next.length >= 3) {
                const indexToRemove = next.findIndex(t => t.type !== 'loading');
                if (indexToRemove !== -1) {
                    next.splice(indexToRemove, 1);
                } else {
                    next.shift();
                }
            }

            return [...next, { id, title, message, type, duration: toastDuration }];
        });
    }, []);

    const hideToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const hideAllToasts = useCallback(() => setToasts([]), []);

    const hideSuccess = useCallback(() => setSuccessInfo(null), []);

    const handleLogout = useCallback(() => {
        sessionStorage.clear();
        // Sau khi hoàn tác, dòng này sẽ hoạt động đúng.
        setIsAuthenticated(false);
        // showToast('Đăng Xuất Thành Công', 'Bạn đã đăng xuất khỏi hệ thống.', 'info', 3000); // Removed redundant toast
    }, []);

    useEffect(() => {
        const loggedIn = isAuthenticated;

        if (loggedIn) {
            const checkBlockStatus = async () => {
                const username = localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser");
                if (username && username.toLowerCase() !== 'admin') {
                    const { data } = await apiService.supabase
                        .from('users')
                        .select('is_blocked, blocked_until')
                        .eq('username', username)
                        .maybeSingle();
                    
                    if (data?.is_blocked) {
                        const now = new Date();
                        const blockedUntil = data.blocked_until ? new Date(data.blocked_until) : null;
                        
                        // Nếu còn trong thời gian bị khóa
                        if (!blockedUntil || now < blockedUntil) {
                            console.warn("User is blocked. Logging out...");
                            handleLogout();
                            showToast('Tài khoản bị khóa', 'Tài khoản của bạn đang bị khóa do vi phạm. Vui lòng thử lại sau.', 'error');
                        }
                    }
                }
            };

            // Start sending presence heartbeats if logged in
            apiService.recordUserPresence(); 
            checkBlockStatus(); // Initial check

            const presenceInterval = setInterval(() => {
                apiService.recordUserPresence();
                checkBlockStatus();
            }, 30 * 1000); // 30 seconds for faster enforcement
            
            // Listen for immediate block events from API
            const handleImmediateBlock = (e: any) => {
                const reason = e.detail?.reason || 'Vi phạm quy định';
                console.warn("Immediate block event received. Logging out...");
                handleLogout();
                showToast('Tài khoản bị khóa', `Tài khoản đã bị hệ thống khóa: ${reason}`, 'error');
            };

            window.addEventListener('user-blocked', handleImmediateBlock);

            return () => {
                clearInterval(presenceInterval);
                window.removeEventListener('user-blocked', handleImmediateBlock);
            };
        }
    }, [isAuthenticated, handleLogout, showToast]);



    return (
        <>
            {isAuthenticated ? (
                <App onLogout={handleLogout} showToast={showToast} hideToast={hideAllToasts} />
            ) : (
                <LoginScreen onLoginSuccess={handleLoginSuccess} showToast={showToast} />
            )}

            {toasts.map((t, index) => (
                <Toast
                    key={t.id}
                    {...t}
                    show={true}
                    index={toasts.length - 1 - index}
                    onClose={hideToast}
                />
            ))}

            {successInfo && <SuccessAnimation show={true} title={successInfo.title} message={successInfo.message} onClose={hideSuccess} duration={3000} />}
            <UpdateModal />

        </>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

function localStorageProvider() {
    // When initializing, we restore the data from `localStorage` into a map.
    const map = new Map(JSON.parse(localStorage.getItem('app-cache') || '[]'))

    // Before unloading the app, we write back all the data into `localStorage`.
    window.addEventListener('beforeunload', () => {
        const appCache = JSON.stringify(Array.from(map.entries()))
        localStorage.setItem('app-cache', appCache)
    })

    // We still use the map for write & read for performance.
    return map
}

import { SWRConfig } from 'swr';

root.render(
    <React.StrictMode>
        <SWRConfig value={{ provider: localStorageProvider as any }}>
            <Root />
        </SWRConfig>
    </React.StrictMode>
);