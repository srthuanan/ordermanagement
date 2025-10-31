import React, { useEffect, useState, useRef, useCallback } from 'react';

interface ToastProps {
    show: boolean; // This prop is always true when the component is mounted
    title: string;
    message?: string;
    type: 'success' | 'error' | 'loading' | 'warning' | 'info';
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ title, message, type, onClose, duration }) => {
    const [isExiting, setIsExiting] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleClose = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsExiting(true);
        // Allow time for the exit animation before calling onClose to unmount
        setTimeout(() => {
            onClose();
        }, 300);
    }, [onClose]);

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
    }, [title, message, type, duration, handleClose]);

    const typeDetails = {
        success: { icon: 'fa-check-circle', bgClass: 'bg-success-bg', textClass: 'text-success' },
        error: { icon: 'fa-times-circle', bgClass: 'bg-danger-bg', textClass: 'text-danger' },
        loading: { icon: 'fa-spinner fa-spin', bgClass: 'bg-surface-accent', textClass: 'text-accent-primary' },
        warning: { icon: 'fa-exclamation-triangle', bgClass: 'bg-warning-bg', textClass: 'text-warning' },
        info: { icon: 'fa-info-circle', bgClass: 'bg-surface-accent', textClass: 'text-accent-primary' },
    };

    const currentType = typeDetails[type];
    const animationClass = isExiting ? 'toast-hidden' : 'toast-visible';

    return (
        <div 
            className={`toast-container ${animationClass}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div className="toast-content">
                <div className={`toast-icon-wrapper ${currentType.bgClass}`}>
                    <i className={`fas ${currentType.icon} ${currentType.textClass}`}></i>
                </div>
                <div className="toast-body">
                    <p className="toast-title">{title}</p>
                </div>
            </div>
        </div>
    );
};

export default Toast;