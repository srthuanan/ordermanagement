import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import LoginScreen from './components/LoginScreen';
import Toast from './components/ui/Toast';

type ToastState = {
    show: boolean;
    message: string;
    title: string;
    type: 'success' | 'error' | 'loading' | 'warning' | 'info';
    duration?: number;
} | null;

const Root = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>(null);

    useEffect(() => {
        // Check session storage on initial load
        const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        setIsAuthenticated(loggedIn);
        setIsLoading(false);
    }, []);

    const handleLoginSuccess = useCallback(() => {
        setIsAuthenticated(true);
    }, []);

    const handleLogout = useCallback(() => {
        sessionStorage.clear();
        setIsAuthenticated(false);
        showToast('Đăng Xuất Thành Công', 'Bạn đã đăng xuất khỏi hệ thống.', 'info', 3000);
    }, []);

    const showToast = (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => {
        const toastDuration = type === 'loading' ? (duration ?? 0) : (duration ?? 5000);
        setToast({ show: true, title, message, type, duration: toastDuration });
    };
    
    const hideToast = () => setToast(null);

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