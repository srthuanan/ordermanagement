import React from 'react';

export type ButtonStatus = 'idle' | 'loading' | 'success' | 'error';

interface AsyncButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    status?: ButtonStatus;
    loadingText?: string;
    successText?: string;
    errorText?: string;
    idleText?: React.ReactNode;
    icon?: string;
    variant?: 'primary' | 'danger' | 'success' | 'secondary' | 'ghost';
    className?: string;
}

export const AsyncButton: React.FC<AsyncButtonProps> = ({
    status = 'idle',
    loadingText = 'Đang xử lý...',
    successText = 'Thành công!',
    errorText = 'Thất bại!',
    idleText,
    icon,
    variant = 'primary',
    className = '',
    children,
    disabled,
    ...props
}) => {
    const baseVariants = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm border border-transparent',
        danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm border border-transparent',
        success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-transparent',
        secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
        ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 border border-transparent',
    };

    const statusVariants = {
        idle: baseVariants[variant],
        loading: 'bg-slate-700 text-white cursor-wait opacity-90',
        success: 'bg-emerald-600 text-white animate-pulse',
        error: 'bg-rose-600 text-white animate-shake',
    };

    const currentStyle = statusVariants[status] || baseVariants[variant];

    return (
        <button
            {...props}
            disabled={disabled || status === 'loading'}
            className={`relative inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 select-none ${currentStyle} ${className}`}
        >
            {status === 'loading' && (
                <>
                    <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                    <span>{loadingText}</span>
                </>
            )}

            {status === 'success' && (
                <>
                    <i className="fa-solid fa-check text-xs"></i>
                    <span>{successText}</span>
                </>
            )}

            {status === 'error' && (
                <>
                    <i className="fa-solid fa-xmark text-xs"></i>
                    <span>{errorText}</span>
                </>
            )}

            {status === 'idle' && (
                <>
                    {icon && <i className={`fa-solid ${icon} text-xs`}></i>}
                    {idleText || children}
                </>
            )}
        </button>
    );
};

export default AsyncButton;
