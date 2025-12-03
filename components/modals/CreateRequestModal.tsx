import React from 'react';
import RequestForm from '../RequestForm';
import { AnalyticsData, Order, StockVehicle } from '../../types';
import { useModalBackground } from '../../utils/styleUtils';
import Button from '../ui/Button';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface CreateRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newOrder: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    existingOrderNumbers: string[];
    initialVehicle?: StockVehicle;
    currentUser: string;
    vehicleAnalyticsData: AnalyticsData;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose, onSuccess, showToast, hideToast, existingOrderNumbers, initialVehicle, currentUser, vehicleAnalyticsData, onOpenImagePreview }) => {
    const bgStyle = useModalBackground();
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-0 md:p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-[image:var(--modal-bg-image)] bg-cover bg-center w-full h-[100dvh] md:h-[90vh] md:max-w-7xl flex flex-col md:rounded-2xl shadow-2xl animate-fade-in-scale-up border border-white/20"
                onClick={(e) => e.stopPropagation()}
                style={bgStyle}
            >
                <div className="absolute inset-0 bg-white/75 backdrop-blur-[3px] z-0 md:rounded-2xl"></div>
                <header className="flex items-center justify-center p-4 sm:p-5 border-b border-border-primary flex-shrink-0 relative z-10">
                    <div className="text-center animate-fade-in-down">
                        <h2 className="text-xl sm:text-2xl font-bold text-gradient">
                            YÊU CẦU GHÉP XE
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">Điền thông tin và tải lên Ủy nhiệm chi để gửi yêu cầu.</p>
                    </div>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="absolute top-3 right-3 md:top-4 md:right-4 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors !p-0"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </Button>
                </header>

                <main className="flex-grow min-h-0 flex flex-col overflow-hidden relative z-10">
                    <RequestForm
                        onSuccess={onSuccess}
                        showToast={showToast}
                        hideToast={hideToast}
                        existingOrderNumbers={existingOrderNumbers}
                        initialVehicle={initialVehicle}
                        currentUser={currentUser}
                        vehicleAnalyticsData={vehicleAnalyticsData}
                        onOpenImagePreview={onOpenImagePreview}
                    />
                </main>
            </div>
        </div>
    );
};

export default React.memo(CreateRequestModal);