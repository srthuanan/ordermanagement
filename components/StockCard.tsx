import React, { useState } from 'react';
import moment from 'moment';
import { StockVehicle } from '../types';
import Button from './ui/Button';
import CarImage from './ui/CarImage'; // Import the new component
import StatusBadge from './ui/StatusBadge';
import sandTimerAnimationUrl from '../pictures/sand-timer.json?url';
import pairCarAnimationUrl from '../pictures/pair-animation.json?url';
import noAnimationUrl from '../pictures/no-animation.json?url';
import yesAnimationUrl from '../pictures/yes.json?url';

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
    const [confirmAction, setConfirmAction] = useState<{ action: 'hold' | 'release' } | null>(null);

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

    const renderActions = () => {
        if (isProcessing) {
            return (
                <div className="flex items-center justify-center w-full h-9">
                    <i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i>
                </div>
            );
        }

        if (confirmAction) {
            return (
                <div className="flex justify-center items-center gap-2 w-full animate-fade-in" style={{ animationDuration: '150ms' }}>
                    <div onClick={(e) => { e.stopPropagation(); setConfirmAction(null); }} className="cursor-pointer hover:scale-110 transition-transform" title="Hủy">
                        <lottie-player src={noAnimationUrl} background="transparent" speed="1" style={{ width: '28px', height: '28px' }} loop autoplay />
                    </div>
                    <div onClick={(e) => {
                        e.stopPropagation();
                        if (confirmAction.action === 'hold') {
                            onHoldCar(vehicle.VIN);
                        } else {
                            onReleaseCar(vehicle.VIN);
                        }
                        setConfirmAction(null);
                    }} className="cursor-pointer hover:scale-110 transition-transform" title="Xác nhận">
                        <lottie-player src={yesAnimationUrl} background="transparent" speed="1" style={{ width: '28px', height: '28px' }} loop autoplay />
                    </div>
                </div>
            );
        }

        if (isAvailable) {
            return (
                <div
                    className="cursor-pointer transition-transform hover:scale-110"
                    onClick={(e) => { e.stopPropagation(); setConfirmAction({ action: 'hold' }); }}
                    title="Giữ xe (tạm thời)"
                >
                    <lottie-player
                        src={sandTimerAnimationUrl}
                        background="transparent"
                        speed="1"
                        style={{ width: '28px', height: '28px' }}
                        loop
                        autoplay
                    ></lottie-player>
                </div>
            );
        }

        if (isHeldByCurrentUser) {
            return (
                <>
                    <div
                        className="cursor-pointer transition-transform hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); setConfirmAction({ action: 'release' }); }}
                        title="Hủy giữ xe"
                    >
                        <lottie-player
                            src={noAnimationUrl}
                            background="transparent"
                            speed="1"
                            style={{ width: '28px', height: '28px' }}
                            loop
                            autoplay
                        ></lottie-player>
                    </div>
                    <div
                        className="cursor-pointer transition-transform hover:scale-110"
                        onClick={(e) => { e.stopPropagation(); onCreateRequestForVehicle(vehicle); }}
                        title="Tạo yêu cầu cho xe đã giữ"
                    >
                        <lottie-player
                            src={pairCarAnimationUrl}
                            background="transparent"
                            speed="1"
                            style={{ width: '28px', height: '28px' }}
                            loop
                            autoplay
                        ></lottie-player>
                    </div>
                </>
            );
        }

        if (isHeldByOther) {
            return (
                <>
                    <Button disabled variant="ghost" className="action-btn !p-0 w-7 h-7 rounded-full" title={`Đang được giữ bởi ${vehicle["Người Giữ Xe"]}`}>
                        <i className="fas fa-lock text-xs"></i>
                    </Button>
                    {isAdmin && (
                        <Button variant="danger" className="action-btn admin-release-action !p-0 w-7 h-7 rounded-full" onClick={(e) => { e.stopPropagation(); setConfirmAction({ action: 'release' }); }} title="Admin Hủy Giữ">
                            <i className="fas fa-user-shield text-xs"></i>
                        </Button>
                    )}
                </>
            );
        }

        return null;
    };

    return (
        <div className="relative flex flex-col gap-2 rounded-xl bg-white/70 backdrop-blur-sm p-2 shadow-md border border-light-border hover:shadow-lg transition-all duration-200 ease-out active:scale-[0.98] group">
            <div className="cursor-pointer" onClick={() => onShowDetails(vehicle)}>
                {/* Car Image with Animation and Glow */}
                <div className="car-image-container relative flex items-center justify-center py-2 overflow-hidden rounded-lg bg-gradient-to-br from-gray-50 to-white">
                    {/* Floor Glow */}
                    <div className="absolute bottom-0 w-3/4 h-4 bg-black/10 rounded-[100%] blur-sm animate-shadow-pulse transform translate-y-1"></div>

                    {/* Animated Car */}
                    <div className="relative z-10 w-full h-full flex items-center justify-center transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-1 animate-float">
                        <CarImage
                            model={vehicle['Dòng xe']}
                            exteriorColor={vehicle['Ngoại thất']}
                            className="car-image object-contain max-h-full drop-shadow-xl"
                            alt={`VinFast ${vehicle['Dòng xe']}`}
                        />
                    </div>

                    {/* Shine Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-15deg] w-full h-full animate-shine opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                    <div className="flex items-baseline gap-1.5 overflow-hidden">
                        <span className="text-light-text-primary text-base font-bold whitespace-nowrap group-hover:text-accent-primary transition-colors">
                            {vehicle['Dòng xe']}
                        </span>
                        <span className="text-light-text-secondary text-sm font-medium truncate" title={vehicle['Phiên bản']}>
                            {vehicle['Phiên bản']}
                        </span>
                    </div>
                    <div
                        className="cursor-pointer"
                        title="Click để sao chép VIN"
                        onClick={(e) => handleCopyVin(e, vehicle.VIN)}
                    >
                        <p className="text-light-text-secondary text-xs font-mono truncate">
                            VIN: <span className="text-sm font-bold text-accent-primary hover:text-accent-primary-hover hover:underline transition-colors">{vehicle.VIN}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-light-text-secondary">
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[50%]" title={`Ngoại thất: ${vehicle['Ngoại thất']}`}>
                            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>palette</span>
                            <p className="text-xs truncate">{vehicle['Ngoại thất']}</p>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[50%]" title={`Nội thất: ${vehicle['Nội thất']}`}>
                            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: '14px' }}>chair</span>
                            <p className="text-xs truncate">{vehicle['Nội thất']}</p>
                        </div>
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

            <div className="border-t border-dashed border-border-primary mt-auto pt-1 flex items-center justify-center gap-2 h-8">
                {renderActions()}
            </div>
        </div>
    );
};

export default StockCard;