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
            {/* Full-Screen Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                {/* Animated Gradient Orbs */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-amber-500/15 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-blue-500/15 to-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '12s', animationDelay: '4s' }} />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            {/* Floating Content Container */}
            <div
                className="relative z-10 w-full max-w-7xl mx-auto px-2 md:px-4 py-8 flex flex-col justify-center min-h-[100dvh] pointer-events-none"
            >
                <div
                    className="flex flex-col w-full h-[90vh] animate-fade-in-scale-up pointer-events-auto border border-white/20 rounded-2xl overflow-hidden shadow-2xl bg-white/95 backdrop-blur-3xl relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="flex-shrink-0">
                    <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50 rounded-xl md:rounded-2xl p-3 md:p-4 border-b border-amber-200/30 shadow-sm relative overflow-hidden group">
                        {/* Decorative background element from Details Modal */}
                        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/20 transition-all duration-700"></div>

                        <div className="flex items-center justify-between relative z-10">
                            {/* Branding Layout from Details Modal */}
                            <div className="flex items-center gap-4">
                                <div className="w-1.5 h-10 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full shadow-sm"></div>
                                <div className="flex flex-col">
                                    <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                                        YÊU CẦU <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-amber-800">GHÉP XE</span>
                                    </h1>
                                    <div className="flex items-center gap-3 mt-1 pl-1">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500/80">
                                            <i className="fas fa-user-circle text-amber-500"></i>
                                            <span className="uppercase tracking-wider">{currentUser}</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500/80">
                                            <i className="fas fa-calendar-alt text-amber-500"></i>
                                            <span>{new Date().toLocaleDateString('vi-VN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Close Button Style from Details Modal */}
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/50 hover:bg-white text-gray-400 hover:text-gray-900 transition-all hover:rotate-90 hover:scale-110 shadow-sm border border-gray-100"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                </header>
                <main className="flex-1 min-h-0 overflow-hidden relative">
                    <div className="h-full bg-white/95 backdrop-blur-3xl rounded-xl md:rounded-2xl shadow-2xl border border-white/20 overflow-hidden flex flex-col relative">
                        {/* High Contrast Grid Pattern for White background */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-100"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:128px_128px] pointer-events-none opacity-100"></div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-0 overflow-hidden relative z-10">
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