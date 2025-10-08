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
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose, onSuccess, showToast, hideToast, existingOrderNumbers, initialVehicle }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div 
                className="bg-surface-ground w-full max-w-6xl max-h-[95vh] flex flex-col rounded-2xl shadow-2xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-center p-5 border-b border-border-primary flex-shrink-0 bg-surface-card rounded-t-2xl relative">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-primary to-accent-secondary rounded-t-xl"></div>
                    <div className="text-center animate-fade-in-down">
                        <h2 className="text-2xl font-bold text-gradient tracking-wide uppercase">Yêu Cầu Ghép Xe</h2>
                        <p className="text-sm text-text-secondary mt-1">Điền thông tin và tải lên Ủy nhiệm chi để gửi yêu cầu.</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-slate-500/10 transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                <main className="overflow-y-auto flex-grow bg-surface-ground">
                    <RequestForm
                        onSuccess={onSuccess}
                        showToast={showToast}
                        hideToast={hideToast}
                        existingOrderNumbers={existingOrderNumbers}
                        initialVehicle={initialVehicle}
                    />
                </main>
            </div>
        </div>
    );
};

export default CreateRequestModal;
