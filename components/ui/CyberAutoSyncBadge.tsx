import React, { useState, useEffect, useCallback } from 'react';
import { getCyberSyncStatus } from '../../services/api/stockService';

interface CyberSyncStatus {
    last_run: string | null;
    last_updated_count: number;
    last_total_cars: number;
    last_status: 'idle' | 'running' | 'ok' | 'error';
    last_error: string | null;
    interval_hours: number;
    next_run: string | null;
    server_time: string;
}

interface CyberAutoSyncBadgeProps {
    /** Khi click badge → mở modal thủ công */
    onOpenManual?: () => void;
}

/** Format khoảng cách thời gian sang dạng thân thiện tiếng Việt */
function timeAgo(isoString: string | null): string {
    if (!isoString) return 'Chưa chạy';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH} giờ trước`;
    return `${Math.floor(diffH / 24)} ngày trước`;
}

export const CyberAutoSyncBadge: React.FC<CyberAutoSyncBadgeProps> = ({ onOpenManual }) => {
    const [status, setStatus] = useState<CyberSyncStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showTooltip, setShowTooltip] = useState(false);

    const fetchStatus = useCallback(async () => {
        const data = await getCyberSyncStatus();
        if (data) setStatus(data as CyberSyncStatus);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchStatus();
        // Poll every 5 minutes to stay fresh
        const interval = setInterval(fetchStatus, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Đang load hoặc server chưa sẵn sàng → ẩn hoàn toàn
    if (isLoading) return null;


    // Không kết nối được server → ẩn badge (không làm rối header)
    if (!status) return null;


    const isRunning = status.last_status === 'running';
    const isError   = status.last_status === 'error';
    const isOk      = status.last_status === 'ok';

    const labelColor = isRunning ? 'text-blue-300'
        : isError   ? 'text-red-300'
        : isOk      ? 'text-emerald-300'
        : 'text-slate-400';

    const borderColor = isRunning ? 'border-blue-700/50 bg-blue-950/40'
        : isError   ? 'border-red-700/50 bg-red-950/30'
        : isOk      ? 'border-emerald-700/40 bg-emerald-950/30'
        : 'border-slate-700/50 bg-slate-800/60';


    return (
        <div className="relative">
            <button
                onClick={onOpenManual}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                title="Đồng bộ vị trí kho tự động từ CyberSoft"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${borderColor}`}
            >
                {/* Pulsing dot */}
                <span className="relative flex h-2 w-2">
                    <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isRunning ? 'animate-ping bg-blue-400' : ''}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isRunning ? 'bg-blue-400' : isError ? 'bg-red-400' : isOk ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                </span>

                {/* Label */}
                <span className={`text-[10px] font-semibold tracking-tight ${labelColor}`}>
                    {isRunning ? 'Đang sync...'
                        : isError ? 'Lỗi sync'
                        : `Sync • ${timeAgo(status.last_run)}`}
                </span>

                {/* Clock icon */}
                <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full right-0 mb-2 z-[9999] min-w-[220px] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 text-xs animate-fade-in">
                    <div className="font-bold text-white mb-2 flex items-center gap-1.5">
                        <span className="text-emerald-400">⚡</span>
                        Đồng Bộ Vị Trí Tự Động
                    </div>
                    <div className="space-y-1.5 text-slate-300">
                        <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Trạng thái:</span>
                            <span className={`font-semibold ${labelColor}`}>
                                {isRunning ? '🔄 Đang chạy' : isError ? '❌ Lỗi' : isOk ? '✅ Thành công' : '⏸ Chờ'}
                            </span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Lần cuối:</span>
                            <span>{timeAgo(status.last_run)}</span>
                        </div>
                        {isOk && (
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Đã cập nhật:</span>
                                <span className="text-emerald-300 font-semibold">
                                    {status.last_updated_count}/{status.last_total_cars} xe
                                </span>
                            </div>
                        )}
                        {isError && status.last_error && (
                            <div className="text-red-400 text-[10px] mt-1 border border-red-800/40 rounded p-1.5 bg-red-950/30">
                                {status.last_error.slice(0, 80)}
                            </div>
                        )}
                        <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Chu kỳ:</span>
                            <span>Mỗi {status.interval_hours} giờ</span>
                        </div>
                        {status.next_run && (
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-500">Lần sau:</span>
                                <span>{timeAgo(status.next_run).replace('trước', 'nữa').replace('Vừa xong', 'Sắp tới')}</span>
                            </div>
                        )}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[10px] text-slate-500 text-center">
                        Click để xem chi tiết hoặc sync thủ công
                    </div>
                </div>
            )}
        </div>
    );
};
