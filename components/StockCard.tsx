import React, { useState, useRef, useEffect, useCallback } from 'react';
import moment from 'moment';
import { StockVehicle } from '../types';
import StatusBadge from './ui/StatusBadge';
import { getExteriorColorStyle } from '../utils/styleUtils';

interface StockCardProps {
  vehicle: StockVehicle;
  onHoldCar: (vin: string) => void;
  onReleaseCar: (vin: string) => void;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
  currentUser: string;
  isAdmin: boolean;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  highlightedVins: Set<string>;
  processingVin: string | null;
}

const HoldCountdown: React.FC<{ expirationTime: string }> = ({ expirationTime }) => {
    const calculateRemainingTime = useCallback(() => {
        const expiration = moment(expirationTime);
        const now = moment();
        const duration = moment.duration(expiration.diff(now));
        if (duration.asSeconds() <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
        return { total: duration.asSeconds(), hours: Math.floor(duration.asHours()), minutes: duration.minutes(), seconds: duration.seconds() };
    }, [expirationTime]);
    const [remainingTime, setRemainingTime] = useState(calculateRemainingTime());
    useEffect(() => {
        const timer = setInterval(() => setRemainingTime(calculateRemainingTime()), 1000);
        return () => clearInterval(timer);
    }, [calculateRemainingTime]);
    if (remainingTime.total <= 0) return <div className="text-xs font-mono text-danger font-semibold">Hết hạn</div>;
    const isUrgent = remainingTime.total < 5 * 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return (
        <div className={`text-xs font-mono font-semibold flex items-center gap-1.5 ${isUrgent ? 'text-danger animate-pulse' : 'text-text-secondary'}`}>
            <i className="far fa-clock"></i>
            <span>{remainingTime.hours > 0 && `${pad(remainingTime.hours)}:`}{pad(remainingTime.minutes)}:{pad(remainingTime.seconds)}</span>
        </div>
    );
};

const StockCard: React.FC<StockCardProps> = ({ vehicle, onHoldCar, onReleaseCar, onCreateRequestForVehicle, currentUser, isAdmin, showToast, highlightedVins, processingVin }) => {
    const [confirmAction, setConfirmAction] = useState<{ vin: string; action: 'hold' | 'release' } | null>(null);
    const confirmRef = useRef<HTMLDivElement>(null);
    const isHighlighted = highlightedVins.has(vehicle.VIN);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (confirmRef.current && !confirmRef.current.contains(event.target as Node)) setConfirmAction(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleCopyVin = (e: React.MouseEvent, vin: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vin).then(() => showToast('Đã Sao Chép', `Số VIN ${vin} đã được sao chép.`, 'success', 2000))
            .catch(() => showToast('Lỗi Sao Chép', 'Không thể truy cập clipboard.', 'error', 3000));
    };

    const isHeldByCurrentUser = vehicle["Trạng thái"] === 'Đang giữ' && vehicle["Người Giữ Xe"]?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC');
    const isAvailable = vehicle["Trạng thái"] === 'Chưa ghép';
    const isHeldByOther = vehicle["Trạng thái"] === 'Đang giữ' && !isHeldByCurrentUser;
    const isProcessing = processingVin === vehicle.VIN;
    const isHeld = vehicle["Trạng thái"] === 'Đang giữ';

    return (
        <div className={`bg-surface-card rounded-xl shadow-md border border-border-primary flex flex-col transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isHighlighted ? 'highlight-row' : ''}`}>
            {/* Header */}
            <div className="p-4 border-b border-border-primary flex items-start gap-4">
                <div className="w-12 h-12 flex-shrink-0 bg-surface-ground rounded-lg flex items-center justify-center">
                    <i className="fas fa-car-side text-2xl text-accent-secondary"></i>
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-base text-text-primary truncate" title={vehicle['Dòng xe']}>{vehicle['Dòng xe']}</h3>
                    <p className="text-xs text-text-secondary truncate" title={vehicle['Phiên bản']}>{vehicle['Phiên bản']}</p>
                </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3 flex-grow">
                <div className="group flex items-center justify-between text-sm cursor-pointer" onClick={(e) => handleCopyVin(e, vehicle.VIN)} title="Click để sao chép VIN">
                    <span className="text-text-secondary">VIN</span>
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-text-primary">{vehicle.VIN}</span>
                        <i className="fas fa-copy text-text-placeholder opacity-0 group-hover:opacity-100 transition-opacity"></i>
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Ngoại thất</span>
                    <span className="font-medium text-text-primary truncate max-w-[120px]" style={getExteriorColorStyle(vehicle['Ngoại thất'])} title={vehicle['Ngoại thất']}>{vehicle['Ngoại thất']}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">Nội thất</span>
                    <span className="font-medium text-text-primary">{vehicle['Nội thất']}</span>
                </div>
            </div>
            
            {/* Status */}
            <div className="px-4 pb-4 space-y-2">
                <StatusBadge status={vehicle['Trạng thái']} />
                {isHeld && vehicle["Người Giữ Xe"] && (
                    <div className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                        <i className="far fa-user text-text-secondary" title="Người giữ xe"></i>
                        <span className="truncate" title={vehicle["Người Giữ Xe"]}>{vehicle["Người Giữ Xe"]}</span>
                    </div>
                )}
                {isHeld && vehicle["Thời Gian Hết Hạn Giữ"] && <HoldCountdown expirationTime={vehicle["Thời Gian Hết Hạn Giữ"]} />}
            </div>

            {/* Actions */}
            <div className="p-3 bg-surface-ground rounded-b-xl border-t border-border-primary relative">
                <div className="flex items-center justify-center gap-2 h-9">
                    {isProcessing ? (
                        <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                    ) : isAvailable ? (
                        <button className="action-btn hold-action" onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'hold' }); }} title="Giữ xe (tạm thời)">
                            <i className="fas fa-stopwatch-20"></i>
                        </button>
                    ) : isHeldByCurrentUser ? (
                        <>
                            <button className="action-btn release-action" onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'release' }); }} title="Hủy giữ xe">
                                <i className="fas fa-undo"></i>
                            </button>
                            <button className="action-btn pair-action" onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }} title="Tạo yêu cầu cho xe đã giữ">
                                <i className="fas fa-link"></i>
                            </button>
                        </>
                    ) : isHeldByOther ? (
                        <>
                            <button disabled className="action-btn" title={`Đang được giữ bởi ${vehicle["Người Giữ Xe"]}`}>
                                <i className="fas fa-lock"></i>
                            </button>
                            {isAdmin && (
                                <button className="action-btn admin-release-action" onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'release' }); }} title="Admin Hủy Giữ">
                                    <i className="fas fa-user-shield"></i>
                                </button>
                            )}
                        </>
                    ) : (
                        <span className="text-xs text-text-secondary">—</span>
                    )}
                </div>
                {confirmAction?.vin === vehicle.VIN && (
                    <div ref={confirmRef} onClick={e => e.stopPropagation()} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-64 bg-surface-overlay p-4 rounded-lg shadow-xl border border-border-primary animate-fade-in-scale-up" style={{ animationDuration: '150ms' }}>
                        <p className="text-sm font-semibold text-text-primary text-center">{confirmAction.action === 'hold' ? 'Xác nhận giữ xe này?' : 'Xác nhận hủy giữ xe?'}</p>
                        <div className="flex justify-center gap-3 mt-4">
                            <button onClick={() => setConfirmAction(null)} className="flex-1 btn-secondary !py-1.5 !text-xs">Không</button>
                            <button onClick={() => { if (confirmAction.action === 'hold') onHoldCar(confirmAction.vin); else onReleaseCar(confirmAction.vin); setConfirmAction(null); }} className={`flex-1 !py-1.5 !text-xs ${confirmAction.action === 'hold' ? 'btn-primary' : 'btn-danger'}`}>Có, Xác nhận</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockCard;