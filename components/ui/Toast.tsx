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

const Toast: React.FC<ToastProps> = ({ id, title, message, type, onClose, duration, index }) => {
    const [isExiting, setIsExiting] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const handleClose = useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsExiting(true);
        setTimeout(() => {
            onClose(id);
        }, 300);
    }, [onClose, id]);

    useEffect(() => {
        // Safety: Loading toasts should not stay forever. Defaulting to 20s if not specified.
        const effectiveDuration = (type === 'loading' && (!duration || duration <= 0)) ? 20000 : duration;

        if (effectiveDuration && effectiveDuration > 0) {
            timeoutRef.current = window.setTimeout(handleClose, effectiveDuration);
        }
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [title, message, type, duration, handleClose]);

    const typeDetails = {
        success: { icon: 'fa-check', color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
        error: { icon: 'fa-times', color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/20' },
        loading: { icon: 'fa-spinner fa-spin', color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
        warning: { icon: 'fa-exclamation', color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
        info: { icon: 'fa-info', color: 'text-sky-500', bg: 'bg-sky-500/5', border: 'border-sky-500/20' },
    };

    const style = (typeDetails as any)[type] || typeDetails.info;
    const bottomOffset = index * 64 + 20; // Căn khoảng cách từ mép dưới lên
    const animationClass = isExiting
        ? 'opacity-0 translate-y-10 scale-95 blur-sm' // Khi tắt: Trượt xuống dưới, mờ đi
        : 'opacity-100 translate-y-0 scale-100 blur-none'; // Khi bật: Hiển thị mượt mà

    return (
        <div
            className={`fixed right-4 z-[9999] transition-all duration-500 ease-out flex justify-end w-full max-w-sm pointer-events-none ${animationClass}`}
            style={{ bottom: `${bottomOffset}px` }}
        >
            <div
                className={`pointer-events-auto flex items-center gap-3 bg-white/95 backdrop-blur-2xl border ${style.border} rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] min-w-[280px] max-w-[360px] cursor-default`}
                role="alert"
            >
                {/* Icon Circle */}
                <div className={`w-6 h-6 rounded-full ${style.bg} ${style.color} flex items-center justify-center flex-shrink-0`}>
                    <i className={`fas ${style.icon} text-[11px]`}></i>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 leading-tight">{title}</p>
                    {message && (
                        <p className="text-[10px] text-slate-500 leading-normal line-clamp-1 mt-0.5">{message}</p>
                    )}
                </div>

                {/* Close Button */}
                {type !== 'loading' && (
                    <button
                        onClick={handleClose}
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all ml-1"
                    >
                        <i className="fas fa-times text-[9px]"></i>
                    </button>
                )}
            </div>
        </div>
    );
};

export default Toast;