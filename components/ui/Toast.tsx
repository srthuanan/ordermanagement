import React, { useEffect, useState, useRef, useCallback } from 'react';

interface ToastProps {
    id: string;
    show: boolean;
    title: string;
    message?: string;
    type: 'success' | 'error' | 'loading' | 'warning' | 'info';
    onClose: (id: string) => void;
    duration?: number;
    index: number;
}

/**
 * Luxury Glassmorphic Dynamic Pill HUD (Linear & Apple Design Language)
 * - Nền kính quang học đa tầng (Optical Multi-layer Glassmorphism)
 * - Ánh phản quang viền siêu mỏng (Subtle Inner Hairline Specular Glow)
 * - Kiểu chữ cao cấp, tương phản hoàn hảo, sang trọng & chuyên nghiệp
 */
const Toast: React.FC<ToastProps> = ({ id, title, message, type, onClose, duration, index }) => {
    const [isExiting, setIsExiting] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    // Thời gian hiển thị thông minh: Thành công tan biến sau 1.6s, Lỗi cho phép đọc trong 3.5s
    const autoDuration = duration ?? (type === 'error' ? 3600 : type === 'loading' ? 12000 : 1600);

    const handleClose = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsExiting(true);
        setTimeout(() => {
            onClose(id);
        }, 220);
    }, [onClose, id]);

    useEffect(() => {
        if (autoDuration > 0) {
            timeoutRef.current = window.setTimeout(handleClose, autoDuration);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [autoDuration, handleClose]);

    // Xử lý câu chữ chuyên nghiệp
    const renderBody = () => {
        if (type === 'error') {
            const errorDetail = message || title || 'Đã xảy ra lỗi trong quá trình xử lý';
            return (
                <div className="flex items-center gap-2 min-w-0 max-w-[420px]">
                    <span className="text-[12.5px] font-bold text-rose-600 uppercase tracking-wider text-[11px] whitespace-nowrap bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100">
                        Thất bại
                    </span>
                    <span className="text-[12.5px] font-medium text-slate-700 truncate" title={errorDetail}>
                        {errorDetail}
                    </span>
                </div>
            );
        }

        if (type === 'success') {
            let successText = title || message || 'Thao tác thành công';
            if (!successText.toLowerCase().includes('thành công') && !successText.toLowerCase().includes('hoàn tất')) {
                successText = `${successText} thành công`;
            }
            return (
                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                    <span className="text-[13px] font-semibold text-slate-800 tracking-tight whitespace-nowrap">
                        {successText}
                    </span>
                </div>
            );
        }

        if (type === 'loading') {
            return (
                <div className="flex items-center gap-2 min-w-0 pr-1">
                    <span className="text-[13px] font-medium text-slate-700 tracking-tight whitespace-nowrap">
                        {title || message || 'Hệ thống đang xử lý...'}
                    </span>
                </div>
            );
        }

        // Warning / Info
        return (
            <div className="flex items-center gap-2 min-w-0 max-w-[380px] pr-1">
                <span className="text-[13px] font-semibold text-slate-800 whitespace-nowrap">{title}</span>
                {message && <span className="text-[12px] font-normal text-slate-500 truncate">• {message}</span>}
            </div>
        );
    };

    // Thiết kế icon cao cấp theo từng loại
    const typeStyles = {
        success: {
            icon: 'fa-check',
            iconColor: 'text-emerald-600',
            badgeBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
            accentGlow: 'hover:border-emerald-300/80',
        },
        error: {
            icon: 'fa-xmark',
            iconColor: 'text-rose-600',
            badgeBg: 'bg-rose-500/10 border-rose-500/20 text-rose-600',
            accentGlow: 'hover:border-rose-300/80',
        },
        loading: {
            icon: 'fa-circle-notch fa-spin',
            iconColor: 'text-indigo-600',
            badgeBg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600',
            accentGlow: 'hover:border-indigo-300/80',
        },
        warning: {
            icon: 'fa-triangle-exclamation',
            iconColor: 'text-amber-600',
            badgeBg: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
            accentGlow: 'hover:border-amber-300/80',
        },
        info: {
            icon: 'fa-circle-info',
            iconColor: 'text-sky-600',
            badgeBg: 'bg-sky-500/10 border-sky-500/20 text-sky-600',
            accentGlow: 'hover:border-sky-300/80',
        },
    };

    const style = typeStyles[type] || typeStyles.info;
    const topOffset = 18 + index * 46;

    const animationStyle = isExiting
        ? 'opacity-0 scale-95 -translate-y-2.5 blur-[1px]'
        : 'opacity-100 scale-100 translate-y-0 blur-none';

    return (
        <div
            className={`fixed left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300 cubic-bezier(0.16,1,0.3,1) flex justify-center pointer-events-none ${animationStyle}`}
            style={{ top: `${topOffset}px` }}
        >
            <div
                onClick={handleClose}
                className={`pointer-events-auto group relative flex items-center gap-3 bg-white/92 hover:bg-white backdrop-blur-2xl border border-slate-200/80 hover:border-slate-300 rounded-2xl px-3.5 py-2 shadow-[0_12px_36px_-6px_rgba(15,23,42,0.12),0_4px_12px_-2px_rgba(15,23,42,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] cursor-pointer transition-all duration-200 active:scale-[0.98] select-none ${style.accentGlow}`}
                role="status"
            >
                {/* Luxury Micro Badge Icon */}
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 shadow-sm ${style.badgeBg}`}>
                    <i className={`fas ${style.icon} ${style.iconColor} text-[9.5px]`}></i>
                </div>

                {/* Body Content */}
                {renderBody()}

                {/* Close Button on Hover */}
                <button
                    onClick={handleClose}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all -mr-0.5 ml-1"
                >
                    <i className="fas fa-times text-[8.5px]"></i>
                </button>
            </div>
        </div>
    );
};

export default Toast;