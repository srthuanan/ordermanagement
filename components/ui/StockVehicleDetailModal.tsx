import React from 'react';
import { StockVehicle } from '../../types';
import moment from 'moment';

const InfoRow: React.FC<{ label: string; value?: string | number; isMono?: boolean }> = ({ label, value, isMono }) => (
    <div className="flex justify-between items-start py-2.5 border-b border-dashed border-border-primary/70">
        <span className="text-sm text-text-secondary flex-shrink-0 pr-4">{label}</span>
        <span className={`text-sm font-semibold text-text-primary text-right ${isMono ? 'font-mono' : ''}`}>{value || 'N/A'}</span>
    </div>
);

interface StockVehicleDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: StockVehicle | null;
}

const StockVehicleDetailModal: React.FC<StockVehicleDetailModalProps> = ({ isOpen, onClose, vehicle }) => {
    if (!isOpen || !vehicle) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl animate-fade-in-scale-up" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-5 border-b border-border-primary">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Chi Tiết Xe Trong Kho</h2>
                        <p className="text-sm font-mono text-accent-primary">{vehicle.VIN}</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                <main className="p-6 space-y-1">
                    <InfoRow label="Dòng xe" value={vehicle['Dòng xe']} />
                    <InfoRow label="Phiên bản" value={vehicle['Phiên bản']} />
                    <InfoRow label="Ngoại thất" value={vehicle['Ngoại thất']} />
                    <InfoRow label="Nội thất" value={vehicle['Nội thất']} />
                    <InfoRow label="Trạng thái" value={vehicle['Trạng thái']} />
                    <InfoRow label="Vị trí" value={vehicle['Vị trí']} />
                    <InfoRow label="Ngày nhập kho" value={vehicle['Thời gian nhập'] ? moment(vehicle['Thời gian nhập']).format('DD/MM/YYYY') : 'N/A'} />
                    {vehicle['Trạng thái'] === 'Đang giữ' && (
                        <>
                            <InfoRow label="Người giữ" value={vehicle['Người Giữ Xe']} />
                            <InfoRow label="Hết hạn giữ" value={vehicle['Thời Gian Hết Hạn Giữ'] ? moment(vehicle['Thời Gian Hết Hạn Giữ']).format('HH:mm DD/MM/YYYY') : 'N/A'} />
                        </>
                    )}
                </main>
                 <footer className="p-4 border-t flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} className="btn-secondary">Đóng</button>
                </footer>
            </div>
        </div>
    );
};

export default StockVehicleDetailModal;
