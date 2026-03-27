import React, { useState, useEffect } from 'react';

const CustomTitleBar: React.FC = () => {
    // @ts-ignore
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (!isElectron) return;

        let hideTimeout: NodeJS.Timeout;

        const showAndAutoHide = () => {
            setIsVisible(true);
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        };

        // Initial auto-hide delay
        const initialTimeout = setTimeout(() => {
            setIsVisible(false);
        }, 3000);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                showAndAutoHide();
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (e.clientY < 50) { // Top 50px area triggers it
                showAndAutoHide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('mousemove', handleMouseMove);
            if (hideTimeout) clearTimeout(hideTimeout);
            clearTimeout(initialTimeout);
            if (hideTimeout) clearTimeout(hideTimeout);
            clearTimeout(initialTimeout);
        };
    }, [isElectron]);

    const handleMinimize = () => window.electronAPI?.minimizeWindow();
    const handleMaximize = () => window.electronAPI?.maximizeWindow();
    const handleClose = () => window.electronAPI?.closeWindow();

    if (!isElectron) return null;
    if (!isVisible) return null;

    return (
        <div className="fixed top-0 left-0 w-full h-8 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-3 z-[99999] animate-slide-down select-none text-white shadow-lg" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
            {/* Title / Logo Area */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <i className="fas fa-car-side"></i>
                <span>Order Management</span>
            </div>

            {/* Window Controls (No Drag) */}
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={handleMinimize}
                    className="h-8 w-10 flex items-center justify-center hover:bg-slate-700/50 transition-colors"
                >
                    <i className="fas fa-minus text-[10px]"></i>
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-8 w-10 flex items-center justify-center hover:bg-slate-700/50 transition-colors"
                >
                    <i className="far fa-square text-[10px]"></i>
                </button>
                <button
                    onClick={handleClose}
                    className="h-8 w-10 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                    <i className="fas fa-times text-[10px]"></i>
                </button>
            </div>
        </div>
    );
};

export default CustomTitleBar;
