import React, { useState, useRef, useEffect, useCallback } from 'react';
import moment from 'moment';
import { StockVehicle } from '../types';
import CarImage from './ui/CarImage'; // Import the new component
import StatusBadge from './ui/StatusBadge';

const HoldCountdown: React.FC<{ expirationTime: string }> = ({ expirationTime }) => {
    const calculateRemainingTime = useCallback(() => {
        const expiration = moment(expirationTime);
        const now = moment();
        const duration = moment.duration(expiration.diff(now));
        
        if (duration.asSeconds() <= 0) {
            return { total: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            total: duration.asSeconds(),
            hours: Math.floor(duration.asHours()),
            minutes: duration.minutes(),
            seconds: duration.seconds(),
        };
    }, [expirationTime]);

    const [remainingTime, setRemainingTime] = useState(calculateRemainingTime());

    useEffect(() => {
        const timer = setInterval(() => {
            setRemainingTime(calculateRemainingTime());
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateRemainingTime]);

    if (remainingTime.total <= 0) {
        return <div className="text-xs font-mono text-danger font-semibold">Hết hạn</div>;
    }

    const isUrgent = remainingTime.total < 5 * 60; // Less than 5 minutes

    const pad = (num: number) => num.toString().padStart(2, '0');

    return (
        <div className={`text-xs font-mono font-semibold flex items-center gap-1.5 ${isUrgent ? 'text-danger animate-pulse' : 'text-light-text-secondary'}`}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>timer</span>
            <span>
                {remainingTime.hours > 0 && `${pad(remainingTime.hours)}:`}
                {pad(remainingTime.minutes)}:{pad(remainingTime.seconds)}
            </span>
        </div>
    );
};


interface StockCardProps {
  vehicle: StockVehicle;
  onHoldCar: (vin: string) => void;
  onReleaseCar: (vin: string) => void;
  onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
  onShowDetails: (vehicle: StockVehicle) => void;
  currentUser: string;
  isAdmin: boolean;
  showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
  highlightedVins: Set<string>;
  processingVin: string | null;
}

const StockCard: React.FC<StockCardProps> = ({ 
    vehicle,
    onHoldCar,
    onReleaseCar,
    onCreateRequestForVehicle,
    onShowDetails,
    currentUser,
    isAdmin,
    showToast,
    processingVin
}) => {
    const [confirmAction, setConfirmAction] = useState<{ vin: string; action: 'hold' | 'release' } | null>(null);
    const confirmRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (confirmRef.current && !confirmRef.current.contains(event.target as Node)) {
            setConfirmAction(null);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    const handleCopyVin = (e: React.MouseEvent, vin: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(vin).then(() => {
            showToast('Đã Sao Chép', `Số VIN ${vin} đã được sao chép thành công.`, 'success', 2000);
        }).catch(err => {
            console.error('Lỗi sao chép VIN: ', err);
            showToast('Sao Chép Thất Bại', 'Không thể truy cập vào clipboard của bạn.', 'error', 3000);
        });
    };

    const daysInStock = vehicle['Thời gian nhập'] ? moment().diff(moment(vehicle['Thời gian nhập']), 'days') : null;
    
    const isHeldByCurrentUser = vehicle["Trạng thái"] === 'Đang giữ' && vehicle["Người Giữ Xe"]?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC');
    const isAvailable = vehicle["Trạng thái"] === 'Chưa ghép';
    const isHeldByOther = vehicle["Trạng thái"] === 'Đang giữ' && !isHeldByCurrentUser;
    const isProcessing = processingVin === vehicle.VIN;
    const isHeld = vehicle["Trạng thái"] === 'Đang giữ';

    const renderActions = () => {
        if (isProcessing) {
            return (
                <div className="flex items-center justify-center w-full h-9">
                    <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                </div>
            );
        }

        if (isAvailable) {
            return (
                <>
                    <button className="action-btn hold-action" onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'hold' }); }} title="Giữ xe (tạm thời)">
                        <i className="fas fa-stopwatch-20"></i>
                    </button>
                </>
            );
        }

        if (isHeldByCurrentUser) {
            return (
                <>
                    <button className="action-btn release-action" onClick={(e) => { e.stopPropagation(); setConfirmAction({ vin: vehicle.VIN, action: 'release' }); }} title="Hủy giữ xe">
                        <i className="fas fa-undo"></i>
                    </button>
                    <button className="action-btn pair-action" onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }} title="Tạo yêu cầu cho xe đã giữ">
                        <i className="fas fa-link"></i>
                    </button>
                </>
            );
        }

        if (isHeldByOther) {
             return (
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
            );
        }
        
        return null;
    };

    return (
        <div className="relative flex flex-col gap-2 rounded-xl bg-white p-2 shadow-md border border-light-border hover:shadow-lg transition-all duration-200 ease-out active:scale-[0.98]">
            <div className="cursor-pointer" onClick={() => onShowDetails(vehicle)}>
                <div className="car-image-container">
                    <CarImage 
                        model={vehicle['Dòng xe']} 
                        exteriorColor={vehicle['Ngoại thất']} 
                        className="car-image" 
                        alt={`VinFast ${vehicle['Dòng xe']}`}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <p className="text-light-text-primary text-sm font-semibold leading-tight truncate pt-1" title={`${vehicle['Dòng xe']} ${vehicle['Phiên bản']}`}>
                        {vehicle['Dòng xe']} {vehicle['Phiên bản'] !== 'Base' && vehicle['Phiên bản'] !== 'Plus' ? vehicle['Phiên bản'] : ''}
                    </p>
                    <div
                        className="cursor-pointer"
                        title="Click để sao chép VIN"
                        onClick={(e) => handleCopyVin(e, vehicle.VIN)}
                    >
                        <p className="text-light-text-secondary text-xs font-mono truncate">
                            VIN: <span className="text-sm font-bold text-accent-primary hover:text-accent-primary-hover hover:underline transition-colors">{vehicle.VIN}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-light-text-secondary">
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>water_drop</span>
                        <p className="text-xs truncate">{vehicle['Ngoại thất']}</p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                        <StatusBadge status={vehicle['Trạng thái']} />
                        {daysInStock !== null && (
                            <div className="flex items-center gap-1 text-light-text-secondary">
                                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                                <p className="text-xs">{daysInStock} ngày</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="border-t border-dashed border-border-primary mt-auto pt-1.5 flex items-center justify-center gap-2">
                {renderActions()}
            </div>
            
             {confirmAction && (
                <div
                    ref={confirmRef}
                    onClick={e => e.stopPropagation()}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-30 w-64 bg-surface-overlay p-4 rounded-lg shadow-xl border border-border-primary animate-fade-in-scale-up"
                    style={{ animationDuration: '150ms' }}
                >
                    <p className="text-sm font-semibold text-text-primary text-center">
                    {confirmAction.action === 'hold' ? 'Xác nhận giữ xe này?' : 'Xác nhận hủy giữ xe?'}
                    </p>
                    <p className="text-xs text-text-secondary text-center mt-1">
                    VIN: <span className="font-mono">{confirmAction.vin}</span>
                    </p>
                    <div className="flex justify-center gap-3 mt-4">
                    <button
                        onClick={() => setConfirmAction(null)}
                        className="flex-1 btn-secondary !py-1.5 !text-xs"
                    >
                        Không
                    </button>
                    <button
                        onClick={() => {
                        if (confirmAction.action === 'hold') {
                            onHoldCar(confirmAction.vin);
                        } else {
                            onReleaseCar(confirmAction.vin);
                        }
                        setConfirmAction(null);
                        }}
                        className={`flex-1 !py-1.5 !text-xs ${confirmAction.action === 'hold' ? 'btn-primary' : 'btn-danger'}`}
                    >
                        Có, Xác nhận
                    </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockCard;