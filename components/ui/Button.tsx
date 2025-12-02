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
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.98]";

    const variants = {
        primary: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-[5px_5px_10px_rgba(59,130,246,0.3),-5px_-5px_10px_rgba(255,255,255,0.1)] hover:shadow-[7px_7px_14px_rgba(59,130,246,0.4),-7px_-7px_14px_rgba(255,255,255,0.2)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.1)] border-none",
        secondary: "bg-[#f0f2f5] text-slate-700 shadow-[5px_5px_10px_#d1d5db,-5px_-5px_10px_#ffffff] hover:shadow-[7px_7px_14px_#d1d5db,-7px_-7px_14px_#ffffff] active:shadow-[inset_4px_4px_8px_#d1d5db,inset_-4px_-4px_8px_#ffffff] border-none",
        outline: "bg-transparent border-2 border-blue-500 text-blue-600 shadow-none hover:bg-blue-50 active:bg-blue-100",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:shadow-none active:bg-slate-200",
        danger: "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-[5px_5px_10px_rgba(239,68,68,0.3),-5px_-5px_10px_rgba(255,255,255,0.1)] hover:shadow-[7px_7px_14px_rgba(239,68,68,0.4),-7px_-7px_14px_rgba(255,255,255,0.2)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.1)] border-none",
        success: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[5px_5px_10px_rgba(16,185,129,0.3),-5px_-5px_10px_rgba(255,255,255,0.1)] hover:shadow-[7px_7px_14px_rgba(16,185,129,0.4),-7px_-7px_14px_rgba(255,255,255,0.2)] active:shadow-[inset_4px_4px_8px_rgba(0,0,0,0.2),inset_-4px_-4px_8px_rgba(255,255,255,0.1)] border-none",
    };

    const sizes = {
        sm: "text-xs px-3 py-1.5 h-8 gap-1.5",
        md: "text-sm px-4 py-2 h-10 gap-2",
        lg: "text-base px-6 py-2.5 h-12 gap-2.5",
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
