import React, { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    fullWidth?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-lg font-bold transition-all duration-300 ease-in-out focus:outline-none focus:ring-1 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed tracking-tight whitespace-nowrap active:scale-[0.98]";

    const variants = {
        primary: "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 shadow-sm active:bg-blue-200",
        secondary: "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 shadow-sm",
        outline: "bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300",
        ghost: "bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        danger: "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 shadow-sm active:bg-rose-200",
        success: "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm active:bg-emerald-200",
    };

    const sizes = {
        sm: "text-[11px] px-3 py-1.5 h-8 lg:text-[10px] lg:px-2.5 lg:py-1 lg:h-7 gap-1",
        md: "text-[13px] px-5 py-2 h-10 lg:text-[12px] lg:px-4 lg:py-1.5 lg:h-9 gap-1.5",
        lg: "text-[15px] px-7 py-3 h-12 lg:text-[14px] lg:px-6 lg:py-2.5 lg:h-11 gap-2",
    };

    return (
        <button
            className={`
                ${baseStyles}
                ${variants[variant]}
                ${sizes[size]}
                ${fullWidth ? 'w-full' : ''}
                ${isLoading ? 'cursor-wait opacity-80' : ''}
                ${className}
            `}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <i className="fas fa-spinner fa-spin mr-2"></i>
            )}
            {!isLoading && leftIcon && (
                <span className="inline-flex">{leftIcon}</span>
            )}
            {children}
            {!isLoading && rightIcon && (
                <span className="inline-flex">{rightIcon}</span>
            )}
        </button>
    );
};

export default Button;
