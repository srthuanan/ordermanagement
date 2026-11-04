import React, { useState, useEffect } from 'react';
import { subscribeDaemonStatus, getDaemonStatus, pingLocalDaemon } from '../../services/api/cyberBridge';

export const CyberAutoSyncBadge: React.FC = () => {
    const [daemonStatus, setDaemonStatus] = useState(getDaemonStatus());
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeDaemonStatus((dStatus) => {
            setDaemonStatus(dStatus);
        });
        pingLocalDaemon();
        const interval = setInterval(() => {
            pingLocalDaemon();
        }, 10000);
        return () => {
            unsubscribe();
            clearInterval(interval);
        };
    }, []);

    const isOnline = daemonStatus.isOnline;

    return (
        <div className="relative flex items-center">
            <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => pingLocalDaemon()}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isOnline
                        ? 'hover:bg-emerald-50'
                        : 'hover:bg-rose-50'
                }`}
                title={isOnline ? 'Máy VP: Đang kết nối trực tiếp' : 'Máy VP: Mất kết nối (Dùng Cloud Render)'}
            >
                <span className="relative flex h-2.5 w-2.5">
                    <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isOnline ? 'animate-ping bg-emerald-400' : 'bg-rose-400 opacity-40'
                        }`}
                    />
                    <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-xs ${
                            isOnline
                                ? 'bg-emerald-500 ring-2 ring-emerald-200'
                                : 'bg-rose-500 ring-2 ring-rose-200'
                        }`}
                    />
                </span>
            </button>

            {/* Tooltip giải thích chi tiết khi rê chuột vào */}
            {showTooltip && (
                <div className="absolute top-full right-0 mt-2 z-[9999] min-w-[240px] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl shadow-2xl p-3 text-xs text-white animate-fade-in pointer-events-none">
                    <div className="font-bold flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-slate-200">Đồng Bộ CyberSoft</span>
                        <span
                            className={`text-[9.5px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                isOnline
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                                    : 'bg-rose-950 text-rose-300 border border-rose-600/50'
                            }`}
                        >
                            {isOnline ? '🟢 Máy VP Online' : '🔴 Máy VP Offline'}
                        </span>
                    </div>

                    <div className="mt-2 space-y-1.5 text-slate-300 text-[11px]">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Trạng thái:</span>
                            <span className={isOnline ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                {isOnline ? 'Kết nối trực tiếp máy VP' : 'Mất kết nối máy VP'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Nguồn xử lý:</span>
                            <span className="text-slate-200 font-medium">
                                {isOnline ? 'Local Port 3001 (0 Render)' : 'Cloud Render (Dự phòng)'}
                            </span>
                        </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center">
                        {isOnline ? 'Toàn bộ Web đang chạy trực tiếp trên máy VP' : 'Nhấp đúp start-cyber-sync.bat trên máy VP để kết nối lại'}
                    </div>
                </div>
            )}
        </div>
    );
};
