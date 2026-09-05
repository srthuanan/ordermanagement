/// <reference types="vite-plugin-pwa/client" />
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import LoginScreen from './components/LoginScreen';
import ResetPasswordView from './components/ResetPasswordView';
import Toast from './components/ui/Toast';
import SuccessAnimation from './components/ui/SuccessAnimation';
import * as apiService from './services/apiService';
import * as authService from './services/authService';

import UpdateModal from './components/modals/UpdateModal';
import ChangePasswordModal from './components/modals/ChangePasswordModal';
import { PublicLiveMapView } from './components/PublicLiveMapView';
import { registerSW } from 'virtual:pwa-register';
import { VehicleConfigProvider } from './hooks/useVehicleConfig';
import HolidayThemeDecorator from './components/ui/HolidayThemeDecorator';

// Build version from Vite define (timestamp)
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const CACHE_VERSION_KEY = 'app_version';

const clearCacheAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach((name) => {
                caches.delete(name);
            });
        });
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            registrations.forEach((registration) => {
                registration.unregister();
            });
        });
    }
    localStorage.setItem(CACHE_VERSION_KEY, APP_VERSION);
    setTimeout(() => {
        window.location.reload();
    }, 500);
};

// Khởi tạo tự động reload khi có bản PWA mới
const initPWA = () => {
    if ('serviceWorker' in navigator) {
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                window.location.reload();
            }
        });
    }

    const updateSW = registerSW({
        onNeedRefresh() {
            updateSW(true);
        },
        onRegistered(r) {
            r && setInterval(() => {
                r.update();
            }, 60 * 1000);
        }
    });
};

initPWA();

const checkVersion = () => {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    const currentVersion = APP_VERSION;
    if (storedVersion && storedVersion !== currentVersion) {
        clearCacheAndReload();
    } else if (!storedVersion) {
        localStorage.setItem(CACHE_VERSION_KEY, currentVersion);
    }
};

checkVersion();

// 🔒 Global Media & Image Protection: Block Context Menu, Drag & Drop, Copy & Open in New Tab across all UI images
if (typeof window !== 'undefined') {
    const isProtectedMedia = (target: EventTarget | null) => {
        if (!target || !(target instanceof Element)) return false;
        return (
            target instanceof HTMLImageElement ||
            target instanceof SVGElement ||
            Boolean(target.closest('img, svg, picture, video, canvas, [role="img"]'))
        );
    };

    window.addEventListener('contextmenu', (e: MouseEvent) => {
        if (isProtectedMedia(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { capture: true });

    window.addEventListener('dragstart', (e: DragEvent) => {
        if (isProtectedMedia(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { capture: true });

    window.addEventListener('auxclick', (e: MouseEvent) => {
        if (e.button === 1 && isProtectedMedia(e.target)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, { capture: true });
}

type ToastItem = {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'loading' | 'warning' | 'info';
    duration?: number;
};

const Root = () => {
    // Kiểm tra ngay lập tức hash và search lúc vừa nạp Root
    const getInitialAuthFlow = () => {
        if (typeof window === 'undefined') return { isResetting: false, context: 'recovery' as const };
        const fullHash = window.location.hash || '';
        const search = window.location.search || '';
        const isInvite = fullHash.includes('type=invite') || fullHash.includes('invite') || search.includes('type=invite');
        const isRecovery = fullHash.includes('type=recovery') || fullHash.includes('recovery') || fullHash.includes('reset-password') || search.includes('type=recovery');
        return {
            isResetting: isInvite || isRecovery,
            context: isInvite ? ('invite' as const) : ('recovery' as const)
        };
    };

    const initialFlow = getInitialAuthFlow();
    if (initialFlow.isResetting && typeof window !== 'undefined') {
        sessionStorage.clear();
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentConsultant');
    }

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        if (initialFlow.isResetting) return false;
        return sessionStorage.getItem('isLoggedIn') === 'true' || localStorage.getItem('isLoggedIn') === 'true';
    });
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const [successInfo, setSuccessInfo] = useState<{title: string; message: string} | null>(null);
    const [isResettingPassword, setIsResettingPassword] = useState(initialFlow.isResetting);
    const [resetContext, setResetContext] = useState<'recovery' | 'invite'>(initialFlow.context);
    const [directChangePassword, setDirectChangePassword] = useState<{ isOpen: boolean, username: string }>({ isOpen: false, username: '' });
    const [isInitialLoading, setIsInitialLoading] = useState(!initialFlow.isResetting);

    useEffect(() => {
        console.log("Checking URL params...", window.location.search, window.location.hash);
        let authSubscription: any = null;
        
        // Check standard search params
        let params = new URLSearchParams(window.location.search);
        let action = params.get('action');
        let user = params.get('user');

        // Fallback to hash params (common in SPAs / GitHub Pages)
        if (!action && window.location.hash.includes('?')) {
            const hashSearch = window.location.hash.split('?')[1];
            const hashParams = new URLSearchParams(hashSearch);
            action = hashParams.get('action');
            user = hashParams.get('user');
        }

        if (action === 'first-login' && user) {
            console.log("Detected direct-change-password action for user:", user);
            setDirectChangePassword({ isOpen: true, username: user });
            
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            setIsInitialLoading(false);
        } else {
            // Xử lý Double Hash cho Supabase Auth (VD: #/reset-password#access_token=... hoặc #type=invite#access_token=...)
            const fullHash = window.location.hash;
            if (fullHash.includes('access_token=') && fullHash.split('#').length > 2) {
                console.log("[Auth] Detected double hash, cleaning up for Supabase...");
                const parts = fullHash.split('#').filter(p => p.length > 0);
                const tokenPart = parts.find(p => p.includes('access_token='));
                if (tokenPart) {
                    window.location.hash = tokenPart;
                }
            }

            // Lắng nghe sự kiện Auth để bắt luồng Recovery/Invite
            const { data: { subscription } } = authService.supabase.auth.onAuthStateChange(async (event, session) => {
                console.log("[Root Auth Event]", event);
                const currentHash = window.location.hash;
                const isInvite = currentHash.includes('type=invite') || currentHash.includes('invite') || initialFlow.context === 'invite';
                const isRecovery = event === 'PASSWORD_RECOVERY' || currentHash.includes('type=recovery') || currentHash.includes('recovery');

                if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && (isInvite || isRecovery))) {
                    console.log("[Root] Detected Password Recovery / Invite Flow in onAuthStateChange");
                    setResetContext(isInvite ? 'invite' : 'recovery');
                    setIsResettingPassword(true);
                    setIsAuthenticated(false);
                    setIsInitialLoading(false);
                } else if (event === 'SIGNED_IN' && session) {
                    if (!isResettingPassword && !initialFlow.isResetting) {
                        if (sessionStorage.getItem('isLoggedIn') !== 'true') {
                            const restored = await authService.restoreSession();
                            if (restored) setIsAuthenticated(true);
                        }
                    }
                }
            });
            authSubscription = subscription;

            const initAuth = async () => {
                const hash = window.location.hash;
                const isInvite = hash.includes('type=invite') || hash.includes('invite') || initialFlow.context === 'invite';
                const isRecovery = hash.includes('type=recovery') || 
                                 hash.includes('reset-password') ||
                                 hash.includes('recovery') ||
                                 initialFlow.isResetting;
                const hasAccessToken = hash.includes('access_token');

                if (isInvite || isRecovery) {
                    console.log("[Root Init] Entering Password Reset View");
                    setResetContext(isInvite ? 'invite' : 'recovery');
                    setIsResettingPassword(true);
                    setIsAuthenticated(false);
                    setIsInitialLoading(false);
                    return;
                }

                const hasSession = await authService.restoreSession();
                if (hasSession) {
                    console.log("Session restored from Supabase");
                    if (hasAccessToken && (hash.includes('recovery') || hash.includes('invite'))) {
                        setResetContext(hash.includes('invite') ? 'invite' : 'recovery');
                        setIsResettingPassword(true);
                        setIsAuthenticated(false);
                    } else {
                        setIsAuthenticated(true);
                    }
                }
            };
            initAuth().finally(() => {
                setIsInitialLoading(false);
            });
        }

        return () => {
            if (authSubscription) authSubscription.unsubscribe();
        };
    }, []);

    const handleLoginSuccess = useCallback(() => setIsAuthenticated(true), []);
    const handleLogout = useCallback(async () => {
        await authService.logout();
        setIsAuthenticated(false);
    }, []);

    const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => {
        const id = Math.random().toString(36).substr(2, 9);
        const toastDuration = duration ?? 5000;
        setToasts(prev => [...prev.filter(t => t.title !== title), { id, title, message, type, duration: toastDuration }].slice(-3));
    }, []);

    const hideToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
    const hideAllToasts = useCallback(() => setToasts([]), []);

    // Get tokens immediately from URL
    const getTokens = () => {
        const params = new URLSearchParams(window.location.search);
        let vin = params.get('shared_vin') || params.get('vin');
        let token = params.get('token');

        // Fallback to hash
        if ((!vin || !token) && window.location.hash.includes('?')) {
            const hashSearch = window.location.hash.split('?')[1];
            const hashParams = new URLSearchParams(hashSearch);
            if (!vin) vin = hashParams.get('shared_vin') || hashParams.get('vin');
            if (!token) token = hashParams.get('token');
        }
        return { vin, token };
    };

    const { vin: sharedVin, token: shareToken } = getTokens();

    useEffect(() => {
        if (isAuthenticated) {
            apiService.startAutoGpsTracking();
            apiService.recordUserPresence(); 
            const presenceInterval = setInterval(() => apiService.recordUserPresence(), 30 * 1000);
            return () => clearInterval(presenceInterval);
        }
    }, [isAuthenticated]);

    const renderContent = () => {
        if (shareToken) {
            return <PublicLiveMapView shareToken={shareToken} />;
        }

        if (sharedVin) {
            return <PublicLiveMapView sharedVin={sharedVin} />;
        }

        if (isResettingPassword) {
            return (
                <ResetPasswordView 
                    context={resetContext}
                    onSuccess={() => {
                        setIsResettingPassword(false);
                        setIsAuthenticated(true);
                        window.location.hash = '';
                        window.location.reload();
                    }}
                    onCancel={() => {
                        setIsResettingPassword(false);
                        window.location.hash = '';
                    }}
                    showToast={showToast}
                />
            );
        }

        if (isAuthenticated) {
            return <App onLogout={handleLogout} showToast={showToast} hideToast={hideAllToasts} />;
        }

        if (isInitialLoading) {
            return (
                <div className="w-screen h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 animate-fade-in">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-indigo-600"></i>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Đang khởi tạo ứng dụng...</p>
                </div>
            );
        }

        return <LoginScreen onLoginSuccess={handleLoginSuccess} showToast={showToast} />;
    };

    return (
        <SWRConfig value={{ provider: () => new Map() }}>
            <VehicleConfigProvider>
                {renderContent()}
                <ChangePasswordModal 
                    isOpen={directChangePassword.isOpen} 
                    onClose={() => setDirectChangePassword(prev => ({ ...prev, isOpen: false }))} 
                    username={directChangePassword.username}
                    showToast={showToast}
                    isFirstLogin={true}
                />
                {toasts.map((t, index) => <Toast key={t.id} {...t} show={true} index={toasts.length - 1 - index} onClose={hideToast} />)}
                {successInfo && <SuccessAnimation show={true} title={successInfo.title} message={successInfo.message} onClose={() => setSuccessInfo(null)} duration={3000} />}
                <HolidayThemeDecorator isLoggedIn={isAuthenticated} />
                <UpdateModal />
            </VehicleConfigProvider>
        </SWRConfig>
    );
};

import { SWRConfig } from 'swr';
const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <Root />
        </React.StrictMode>
    );
}