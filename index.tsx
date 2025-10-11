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
    // TẠM THỜI: Bỏ qua đăng nhập để tạo tài khoản admin đầu tiên.
    // BƯỚC 1 HOÀN TÁC: Sau khi tạo admin xong, hãy đổi `true` thành `false`.
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<ToastState>(null);

    useEffect(() => {
        
        const loggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
        setIsAuthenticated(loggedIn);
        setIsLoading(false);
    }, []);

    const handleLoginSuccess = useCallback(() => {
        setIsAuthenticated(true);
    }, []);

    const handleLogout = useCallback(() => {
        sessionStorage.clear();
        // Sau khi hoàn tác, dòng này sẽ hoạt động đúng.
        setIsAuthenticated(false);
        showToast('Đăng Xuất Thành Công', 'Bạn đã đăng xuất khỏi hệ thống.', 'info', 3000);
    }, []);

    const showToast = (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => {
        const toastDuration = type === 'loading' ? (duration ?? 0) : (duration ?? 5000);
        setToast({ show: true, title, message, type, duration: toastDuration });
    };
    
    const hideToast = () => setToast(null);
    
    // NEW FUNCTION: Handles multiple asynchronous requests with progress updates.
    const runBulkAction = async (items: any[], actionAsync: (item: any) => Promise<any>, toastTitle: string) => {
        let successCount = 0;
        let errorCount = 0;
        const total = items.length;
    
        showToast(toastTitle, `Bắt đầu xử lý ${total} mục...`, 'loading');
    
        for (let i = 0; i < total; i++) {
            showToast(toastTitle, `Đang xử lý ${i + 1} / ${total}...`, 'loading');
            try {
                await actionAsync(items[i]);
                successCount++;
            } catch (error) {
                console.error(`Lỗi xử lý mục ${i + 1}:`, error);
                errorCount++;
            }
        }
    
        hideToast();
        const successMessage = `Hoàn tất! Thành công: ${successCount}. Thất bại: ${errorCount}.`;
        showToast('Hoàn Tất', successMessage, errorCount > 0 ? 'warning' : 'success', 5000);
    };


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