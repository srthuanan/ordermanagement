import React from 'react';
import RequestForm from '../RequestForm';
import { AnalyticsData, Order, StockVehicle } from '../../types';

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

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden"
            onClick={onClose}
        >
            {/* Simple dark overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            {/* Floating Content Container */}
            <div
                className="relative z-10 w-full max-w-7xl mx-auto px-2 md:px-4 py-8 flex flex-col justify-center min-h-[100dvh] pointer-events-none"
            >
                <div
                    className="flex flex-col w-full h-[90vh] animate-fade-in-scale-up pointer-events-auto border border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-3xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                <main className="flex-1 min-h-0 overflow-hidden relative">
                    <div className="h-full bg-white rounded-xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                        {/* Content Area */}
                        <div className="flex-1 min-h-0 overflow-hidden relative z-10 bg-slate-50/30">
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
                        </div>
                    </div>
                </main>
                </div>
            </div>
        </div>
    );
};

export default React.memo(CreateRequestModal);