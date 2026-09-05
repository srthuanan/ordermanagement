import React from 'react';

interface InlineErrorProps {
    message?: string | null;
    className?: string;
    onDismiss?: () => void;
}

export const InlineError: React.FC<InlineErrorProps> = ({ message, className = '', onDismiss }) => {
    if (!message) return null;

    return (
        <div 
            className={`flex items-center gap-2 p-3 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/70 rounded-xl animate-fade-in ${className}`}
            role="alert"
        >
            <i className="fa-solid fa-triangle-exclamation text-rose-500 flex-shrink-0"></i>
            <span className="flex-1 leading-snug">{message}</span>
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="flex-shrink-0 text-rose-400 hover:text-rose-700 transition-colors p-0.5 rounded-full"
                >
                    <i className="fa-solid fa-xmark text-xs"></i>
                </button>
            )}
        </div>
    );
};

export default InlineError;
