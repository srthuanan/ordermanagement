import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LoginScreen from './components/LoginScreen';
import Toast from './components/ui/Toast';
import SuccessAnimation from './components/ui/SuccessAnimation';
import * as apiService from './services/apiService';

type ToastState = {
    show: boolean;
    message: string;
    title: string;
    type: 'success' | 'error' | 'loading' | 'warning' | 'info';
    duration?: number;
} | null;

type SuccessInfo = {
    title: string;
    message: string;
} | null;

const Root = () => {
    // TẠM THỜI: Bỏ qua đăng nhập để tạo tài khoản admin đầu tiên.
    // BƯỚC 1 HOÀN TÁC: Sau khi tạo admin xong, hãy đổi `true` thành `false`.
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>(null);
    const [successInfo, setSuccessInfo] = useState<SuccessInfo>(null);

    useEffect(() => {
        
        const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        setIsAuthenticated(loggedIn);
        setIsLoading(false);

        if (loggedIn) {
            // Start sending presence heartbeats if logged in
            apiService.recordUserPresence(); // Initial call
            const presenceInterval = setInterval(apiService.recordUserPresence, 2 * 60 * 1000); // Every 2 minutes
            return () => clearInterval(presenceInterval);
        }
    }, [isAuthenticated]);

    const handleLoginSuccess = useCallback(() => {
        setIsAuthenticated(true);
    }, []);

    const showToast = useCallback((title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => {
        if (type === 'success') {
            setSuccessInfo({ title, message });
        } else {
            const toastDuration = type === 'loading' ? (duration ?? 0) : (duration ?? 5000);
            setToast({ show: true, title, message, type, duration: toastDuration });
        }
    }, []);
    
    const hideToast = useCallback(() => setToast(null), []);
    const hideSuccess = useCallback(() => setSuccessInfo(null), []);

    const handleLogout = useCallback(() => {
        sessionStorage.clear();
        // Sau khi hoàn tác, dòng này sẽ hoạt động đúng.
        setIsAuthenticated(false);
        showToast('Đăng Xuất Thành Công', 'Bạn đã đăng xuất khỏi hệ thống.', 'info', 3000);
    }, [showToast]);
    
    if (isLoading) {
        // You can return a loading spinner here if needed
        return null;
    }

    return (
        <>
            {isAuthenticated ? (
                <App onLogout={handleLogout} showToast={showToast} hideToast={hideToast} />
            ) : (
                <LoginScreen onLoginSuccess={handleLoginSuccess} showToast={showToast} />
            )}
            {toast && <Toast {...toast} onClose={hideToast} />}
            {successInfo && <SuccessAnimation show={true} title={successInfo.title} message={successInfo.message} onClose={hideSuccess} duration={3000} />}
        </>
    );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);