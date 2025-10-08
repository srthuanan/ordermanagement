import React, { useEffect, useState, useRef } from 'react';

interface ToastProps {
    show: boolean; // This prop is always true when the component is mounted
    title: string;
    message: string;
    type: 'success' | 'error' | 'loading' | 'warning' | 'info';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ title, message, type, onClose, duration }) => {
    const [isExiting, setIsExiting] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    // Effect to handle auto-dismiss
    useEffect(() => {
        // Only set a timeout if it's an auto-dismissing type with a duration
        if (type !== 'loading' && duration && duration > 0) {
            timeoutRef.current = window.setTimeout(() => {
                handleClose();
            }, duration);
        }

        // Cleanup function to clear timeout if component unmounts or re-renders with new props
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [title, message, type, duration]); // Rerun effect when a new toast is shown

    const handleClose = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsExiting(true);
        // Allow time for the exit animation before calling onClose to unmount
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const hasProgressBar = type !== 'loading' && duration && duration > 0;

    const typeDetails = {
        success: { icon: 'fa-check-circle', baseClass: 'toast-success', accentColor: 'var(--tw-color-success, #388E3C)' },
        error: { icon: 'fa-times-circle', baseClass: 'toast-error', accentColor: 'var(--tw-color-danger, #D32F2F)' },
        loading: { icon: 'fa-spinner fa-spin', baseClass: 'toast-loading', accentColor: 'var(--tw-color-accent-primary, #0D47A1)' },
        warning: { icon: 'fa-exclamation-triangle', baseClass: 'toast-warning', accentColor: 'var(--tw-color-warning, #F57C00)' },
        info: { icon: 'fa-info-circle', baseClass: 'toast-info', accentColor: 'var(--tw-color-accent-secondary, #42A5F5)' },
    };

    const currentType = typeDetails[type];
    const animationClass = isExiting ? 'toast-hidden' : 'toast-visible';

    return (
        <div 
            className={`toast-container ${currentType.baseClass} ${animationClass}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div className="toast-content">
                <div className="toast-icon">
                    <i className={`fas ${currentType.icon}`}></i>
                </div>
                <div className="toast-body">
                    <p className="toast-title">{title}</p>
                    <p className="toast-message">{message}</p>
                </div>
                <div className="toast-close">
                    <button onClick={handleClose} aria-label="Đóng">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>
            {hasProgressBar && (
                <div className="toast-progress-container">
                    <div 
                        className="toast-progress-bar"
                        style={{ animationDuration: `${duration}ms`, backgroundColor: currentType.accentColor }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default Toast;
