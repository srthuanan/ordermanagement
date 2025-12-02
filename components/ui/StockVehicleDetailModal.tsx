import React, { useState, useEffect, useCallback } from 'react';
import { StockVehicle } from '../../types';
import moment from 'moment';
import CarImage from './CarImage'; // Import the new component
import StatusBadge from './StatusBadge';
import Button from './Button';
import { getExteriorColorStyle, getInteriorColorStyle, useModalBackground } from '../../utils/styleUtils';

const InfoRow: React.FC<{ label: string; value?: string | number; isMono?: boolean, icon: string, valueStyle?: React.CSSProperties }> = ({ label, value, isMono, icon, valueStyle }) => (
    <div className="flex items-start gap-3 py-2">
        <i className={`fas ${icon} text-accent-secondary text-sm w-5 text-center mt-0.5 flex-shrink-0`}></i>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-text-secondary">{label}</p>
            <p
                className={`text-sm font-semibold text-text-primary truncate ${isMono ? 'font-mono' : ''}`}
                title={String(value || '')}
                style={valueStyle}
            >
                {value || 'N/A'}
            </p>
        </div>
    </div>
);

interface StockVehicleDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: StockVehicle | null;
    onHoldCar: (vin: string) => void;
    onReleaseCar: (vin: string) => void;
    onCreateRequestForVehicle: (vehicle: StockVehicle) => void;
    currentUser: string;
    isAdmin: boolean;
    processingVin: string | null;
    vehicleList: StockVehicle[];
    onNavigate: (direction: 'prev' | 'next') => void;
}

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

    const [remainingTime, setRemainingTime] = useState(calculateRemainingTime);

    useEffect(() => {
        const timer = setInterval(() => {
            setRemainingTime(calculateRemainingTime());
        }, 1000);

        return () => clearInterval(timer);
    }, [calculateRemainingTime]);

    if (remainingTime.total <= 0) {
        return <span className="font-semibold font-mono text-danger">Hết hạn</span>;
    }

    const isUrgent = remainingTime.total < 5 * 60; // Less than 5 minutes

    const pad = (num: number) => num.toString().padStart(2, '0');

    return (
        <span className={`font-semibold font-mono flex items-center gap-1.5 ${isUrgent ? 'text-danger animate-pulse' : 'text-text-primary'}`}>
            <i className="far fa-clock mr-1"></i>
            <span>
                {remainingTime.hours > 0 && `${pad(remainingTime.hours)}:`}
                {pad(remainingTime.minutes)}:{pad(remainingTime.seconds)}
            </span>
        </span>
    );
};


const StockVehicleDetailModal: React.FC<StockVehicleDetailModalProps> = ({ isOpen, onClose, vehicle, onHoldCar, onReleaseCar, onCreateRequestForVehicle, currentUser, isAdmin, processingVin, vehicleList, onNavigate }) => {
    const bgStyle = useModalBackground();

    // Swipe Navigation Logic - Must be before early return
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    if (!isOpen || !vehicle) return null;

    const isHeldByCurrentUser = vehicle["Trạng thái"] === 'Đang giữ' && vehicle["Người Giữ Xe"]?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC');
    const isAvailable = vehicle["Trạng thái"] === 'Chưa ghép';
    const isHeldByOther = vehicle["Trạng thái"] === 'Đang giữ' && !isHeldByCurrentUser;
    const isProcessing = processingVin === vehicle.VIN;

    const currentIndex = vehicleList.findIndex(v => v.VIN === vehicle.VIN);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < vehicleList.length - 1;

    // Swipe Navigation Logic
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && hasNext) {
            onNavigate('next');
        } else if (isRightSwipe && hasPrev) {
            onNavigate('prev');
        }
    };

    const handleHold = () => { onHoldCar(vehicle.VIN); onClose(); };
    const handleRelease = () => { onReleaseCar(vehicle.VIN); onClose(); };
    const handleCreateRequest = () => { onCreateRequestForVehicle(vehicle); onClose(); };

    const getActions = () => {
        if (isProcessing) {
            return <div className="flex-grow flex items-center justify-center"><i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i></div>;
        }
        if (vehicle["Trạng thái"] === 'Chưa ghép') {
            return (
                <Button onClick={handleHold} variant="primary" leftIcon={<i className="fas fa-stopwatch-20"></i>}>
                    Giữ Xe
                </Button>
            );
        }

        if (vehicle["Trạng thái"] === 'Đang giữ') {
            const isHeldByCurrentUser = vehicle["Người Giữ Xe"]?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC');
            if (isHeldByCurrentUser) {
                return (
                    <div className="flex gap-2">
                        <Button onClick={handleRelease} variant="danger" leftIcon={<i className="fas fa-undo"></i>}>
                            Hủy Giữ
                        </Button>
                        <Button onClick={handleCreateRequest} variant="primary" leftIcon={<i className="fas fa-link"></i>}>
                            Tạo Yêu Cầu
                        </Button>
                    </div>
                );
            } else if (isAdmin) {
                return <Button onClick={handleRelease} variant="danger" leftIcon={<i className="fas fa-user-shield"></i>}>Admin Hủy Giữ</Button>;
            }
        }

        if (vehicle["Trạng thái"] === 'Đã ghép') {
            if (isAdmin) {
                return <Button onClick={handleRelease} variant="danger" leftIcon={<i className="fas fa-user-shield"></i>}>Admin Hủy Giữ</Button>;
            }
        }

        return null;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-up"
                onClick={e => e.stopPropagation()}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-secondary bg-surface-ground">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                            <i className="fas fa-car text-xl"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Chi Tiết Xe Kho</h2>
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <span className="font-mono font-bold text-accent-primary">{vehicle.VIN}</span>
                                <span>•</span>
                                <span>{vehicle['Dòng xe']}</span>
                            </div>
                        </div>
                    </div>
                    <Button onClick={onClose} variant="ghost" className="!p-0 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times text-lg"></i>
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: Image & Basic Info */}
                        <div className="space-y-6">
                            {/* Car Image */}
                            <div className="bg-gradient-to-br from-surface-ground to-white rounded-xl p-4 border border-border-secondary flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                                <CarImage
                                    model={vehicle['Dòng xe']}
                                    exteriorColor={vehicle['Ngoại thất']}
                                    className="w-full h-48 object-contain relative z-10 transform group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute bottom-2 right-2">
                                    <StatusBadge status={vehicle["Trạng thái"]} />
                                </div>
                            </div>

                            {/* Basic Specs */}
                            <div className="bg-white rounded-xl border border-border-secondary p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                                    <i className="fas fa-info-circle text-accent-primary"></i>
                                    Thông Tin Cơ Bản
                                </h3>
                                <div className="space-y-3">
                                    <InfoRow label="Dòng xe" value={vehicle['Dòng xe']} icon="fa-car-side" />
                                    <InfoRow label="Phiên bản" value={vehicle['Phiên bản']} icon="fa-code-branch" />
                                    <InfoRow label="Năm SX" value={vehicle['Năm sản xuất']} icon="fa-calendar" />
                                    <InfoRow label="Màu Ngoại thất" value={vehicle['Ngoại thất']} icon="fa-palette" valueStyle={getExteriorColorStyle(vehicle['Ngoại thất'])} />
                                    <InfoRow label="Màu Nội thất" value={vehicle['Nội thất']} icon="fa-chair" valueStyle={getInteriorColorStyle(vehicle['Nội thất'])} />
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Detailed Info & History */}
                        <div className="space-y-6">
                            {/* Technical Details */}
                            <div className="bg-white rounded-xl border border-border-secondary p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                                    <i className="fas fa-cogs text-accent-primary"></i>
                                    Thông Số Kỹ Thuật
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <InfoRow label="Số VIN" value={vehicle.VIN} icon="fa-fingerprint" isMono />
                                        <InfoRow label="Số Máy" value={vehicle['Số máy']} icon="fa-cogs" isMono />
                                    </div>
                                    <div className="space-y-3">
                                        <InfoRow label="Kho xe" value={vehicle['Kho xe']} icon="fa-warehouse" />
                                        <InfoRow label="Vị trí" value={vehicle['Vị trí']} icon="fa-map-marker-alt" />
                                    </div>
                                </div>
                            </div>

                            {/* Status & History */}
                            <div className="bg-white rounded-xl border border-border-secondary p-4 shadow-sm">
                                <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                                    <i className="fas fa-history text-accent-primary"></i>
                                    Trạng Thái & Lịch Sử
                                </h3>
                                <div className="space-y-3">
                                    <InfoRow label="Ngày nhập kho" value={moment(vehicle['Ngày nhập kho']).format('DD/MM/YYYY')} icon="fa-calendar-check" />
                                    <InfoRow label="Tuổi kho" value={`${moment().diff(moment(vehicle['Ngày nhập kho']), 'days')} ngày`} icon="fa-hourglass-half" />
                                    {vehicle["Trạng thái"] === 'Đang giữ' && (
                                        <>
                                            <div className="flex items-center justify-between text-sm py-2">
                                                <span className="text-text-secondary">Người giữ:</span>
                                                <span className="font-semibold text-text-primary">{vehicle['Người Giữ Xe']}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm py-2">
                                                <span className="text-text-secondary">Hết hạn:</span>
                                                {vehicle['Thời Gian Hết Hạn Giữ'] ?
                                                    <HoldCountdown expirationTime={vehicle['Thời Gian Hết Hạn Giữ']} /> :
                                                    <span className="font-semibold text-text-primary">N/A</span>
                                                }
                                            </div>
                                        </>
                                    )}
                                    {vehicle['Ghi chú'] && (
                                        <div className="mt-2 pt-2 border-t border-border-secondary/50">
                                            <label className="text-xs text-text-secondary block mb-1">Ghi chú</label>
                                            <p className="text-sm text-text-primary bg-surface-ground p-2 rounded-lg italic">
                                                "{vehicle['Ghi chú']}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-border-secondary bg-surface-ground flex justify-between items-center">
                    <Button onClick={onClose} variant="secondary">
                        Đóng
                    </Button>
                    <div className="flex gap-2">
                        {getActions()}
                    </div>
                </div>
            </div>
            {hasNext && (
                <Button
                    onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
                    variant="ghost"
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center text-2xl hover:bg-white/40 transition-colors z-10 hidden md:flex !p-0"
                    title="Xe tiếp theo"
                >
                    <i className="fas fa-chevron-right"></i>
                </Button>
            )}
            {hasPrev && (
                <Button
                    onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
                    variant="ghost"
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center text-2xl hover:bg-white/40 transition-colors z-10 hidden md:flex !p-0"
                    title="Xe trước"
                >
                    <i className="fas fa-chevron-left"></i>
                </Button>
            )}
        </div>
    );
};

export default StockVehicleDetailModal;