import React, { useState, useEffect, useCallback } from 'react';
import { StockVehicle } from '../../types';
import moment from 'moment';
import CarImage from './CarImage'; // Import the new component
import StatusBadge from './StatusBadge';
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
    if (!isOpen || !vehicle) return null;

    const isHeldByCurrentUser = vehicle["Trạng thái"] === 'Đang giữ' && vehicle["Người Giữ Xe"]?.trim().toLowerCase().normalize('NFC') === currentUser?.trim().toLowerCase().normalize('NFC');
    const isAvailable = vehicle["Trạng thái"] === 'Chưa ghép';
    const isHeldByOther = vehicle["Trạng thái"] === 'Đang giữ' && !isHeldByCurrentUser;
    const isProcessing = processingVin === vehicle.VIN;
    
    const currentIndex = vehicleList.findIndex(v => v.VIN === vehicle.VIN);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < vehicleList.length - 1;

    const handleHold = () => { onHoldCar(vehicle.VIN); onClose(); };
    const handleRelease = () => { onReleaseCar(vehicle.VIN); onClose(); };
    const handleCreateRequest = () => { onCreateRequestForVehicle(vehicle); onClose(); };

    const renderActions = () => {
        if (isProcessing) {
            return <div className="flex-grow flex items-center justify-center"><i className="fas fa-spinner fa-spin text-accent-primary text-xl"></i></div>;
        }
        if (isAvailable) {
            return (
                <button onClick={handleHold} className="btn-primary"><i className="fas fa-stopwatch-20 mr-2"></i>Giữ Xe</button>
            );
        }
        if (isHeldByCurrentUser) {
            return (
                <>
                    <button onClick={handleRelease} className="btn-danger"><i className="fas fa-undo mr-2"></i>Hủy Giữ</button>
                    <button onClick={handleCreateRequest} className="btn-primary"><i className="fas fa-link mr-2"></i>Tạo Yêu Cầu</button>
                </>
            );
        }
        if (isHeldByOther && isAdmin) {
            return <button onClick={handleRelease} className="btn-danger"><i className="fas fa-user-shield mr-2"></i>Admin Hủy Giữ</button>;
        }
        return null;
    };


    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {hasPrev && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate('prev'); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center text-2xl hover:bg-white/40 transition-colors z-10 hidden md:flex"
                    title="Xe trước"
                >
                    <i className="fas fa-chevron-left"></i>
                </button>
            )}
            <div className="bg-surface-card w-full max-w-md rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()} style={bgStyle}>
                <header className="flex items-start justify-between p-5 border-b border-border-primary">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Chi Tiết Xe</h2>
                        <p className="text-sm font-semibold text-accent-secondary mt-0.5">{vehicle.VIN}</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                <main className="p-6">
                    <div className="flex items-center justify-center h-48 mb-6">
                        <CarImage
                             model={vehicle['Dòng xe']} 
                             exteriorColor={vehicle['Ngoại thất']}
                             className="h-full w-auto object-contain"
                             alt={vehicle['Dòng xe']}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                        <InfoRow label="Dòng xe" value={vehicle['Dòng xe']} icon="fa-car-side" />
                        <InfoRow label="Phiên bản" value={vehicle['Phiên bản']} icon="fa-cogs" />
                        <InfoRow label="Ngoại thất" value={vehicle['Ngoại thất']} icon="fa-palette" valueStyle={getExteriorColorStyle(vehicle['Ngoại thất'])} />
                        <InfoRow label="Nội thất" value={vehicle['Nội thất']} icon="fa-chair" valueStyle={getInteriorColorStyle(vehicle['Nội thất'])} />
                    </div>

                    <div className="pt-4 mt-4 border-t border-border-primary">
                        <div className="flex items-center justify-between">
                             <span className="text-sm font-medium text-text-secondary">Trạng thái</span>
                             <StatusBadge status={vehicle['Trạng thái']} />
                        </div>
                        {vehicle['Trạng thái'] === 'Đang giữ' && (
                            <div className="mt-3 space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-text-secondary">Người giữ:</span>
                                    <span className="font-semibold text-text-primary">{vehicle['Người Giữ Xe']}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-text-secondary">Hết hạn:</span>
                                    {vehicle['Thời Gian Hết Hạn Giữ'] ? 
                                        <HoldCountdown expirationTime={vehicle['Thời Gian Hết Hạn Giữ']} /> : 
                                        <span className="font-semibold text-text-primary">N/A</span>
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                </main>
                 <footer className="p-4 border-t flex justify-between items-center gap-3 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} className="btn-secondary">Đóng</button>
                    <div className="flex items-center gap-3">
                        {renderActions()}
                    </div>
                </footer>
            </div>
             {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNavigate('next'); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/20 text-white rounded-full flex items-center justify-center text-2xl hover:bg-white/40 transition-colors z-10 hidden md:flex"
                    title="Xe tiếp theo"
                >
                    <i className="fas fa-chevron-right"></i>
                </button>
            )}
        </div>
    );
};

export default StockVehicleDetailModal;