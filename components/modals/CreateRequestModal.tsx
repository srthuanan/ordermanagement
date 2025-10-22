import React from 'react';
import RequestForm from '../RequestForm';
import { Order, StockVehicle } from '../../types';

interface CreateRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newOrder: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    existingOrderNumbers: string[];
    initialVehicle?: StockVehicle;
    currentUser: string;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose, onSuccess, showToast, hideToast, existingOrderNumbers, initialVehicle, currentUser }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-surface-card w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl shadow-2xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-center p-5 border-b border-border-primary flex-shrink-0 relative">
                    <div className="text-center animate-fade-in-down">
                        <h2 className="text-2xl font-bold text-gradient">
                            Yêu Cầu Ghép Xe
                        </h2>
                        <p className="text-sm text-text-secondary mt-1">Điền thông tin và tải lên Ủy nhiệm chi để gửi yêu cầu.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </header>
                <main className="overflow-y-auto flex-grow p-6 sm:p-8">
                    <RequestForm
                        onSuccess={onSuccess}
                        showToast={showToast}
                        hideToast={hideToast}
                        existingOrderNumbers={existingOrderNumbers}
                        initialVehicle={initialVehicle}
                        currentUser={currentUser}
                    />
                </main>
            </div>
        </div>
    );
};

export default React.memo(CreateRequestModal);