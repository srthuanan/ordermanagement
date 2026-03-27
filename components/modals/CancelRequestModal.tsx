import React, { useState } from 'react';
import { Order } from '../../types';
import Button from '../ui/Button';

interface CancelRequestModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, reason: string, unmatchType: string) => void;
}

const CancelRequestModal: React.FC<CancelRequestModalProps> = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [unmatchType, setUnmatchType] = useState('Hủy luôn đơn hàng (Hủy đơn)');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!reason.trim()) {
            alert("Vui lòng nhập lý do hủy.");
            return;
        }
        setIsSubmitting(true);
        onConfirm(order, reason, unmatchType);
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-fade-in overflow-hidden" onClick={onClose}>
            {/* Full-Screen Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-blue-900/30 to-slate-800/40">
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-red-500/20 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-gradient-to-tl from-red-500/20 to-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/20" />
            </div>

            <div
                className="relative z-10 w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-center h-full md:h-auto pointer-events-none"
            >
                <div
                    className="flex flex-col w-full bg-white md:bg-white/95 md:backdrop-blur-3xl rounded-3xl overflow-hidden shadow-2xl border border-white/20 pointer-events-auto animate-fade-in-scale-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="relative flex flex-col items-center justify-center p-6 text-center border-b border-gray-100 bg-gradient-to-r from-red-50 via-white to-red-50">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                            <i className="fas fa-exclamation-triangle text-3xl text-red-500"></i>
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Xác Nhận Hủy</h2>
                        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-white/50 hover:bg-white text-gray-400 hover:text-gray-600 transition-all">
                            <i className="fas fa-times"></i>
                        </button>
                    </header>

                    <main className="p-6 space-y-4">
                        <p className="text-center text-slate-600">
                            Bạn có chắc chắn muốn hủy yêu cầu cho đơn hàng <strong className="font-mono text-slate-900 bg-gray-100 px-2 py-0.5 rounded">{order["Số đơn hàng"]}</strong> của khách hàng <strong className="text-slate-900">{order["Tên khách hàng"]}</strong>?
                        </p>

                        <div className="mt-4">
                            <label htmlFor="cancel-type" className="block text-sm font-semibold text-slate-700 mb-2">
                                Tùy chọn hủy <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="cancel-type"
                                value={unmatchType}
                                onChange={(e) => setUnmatchType(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-slate-700"
                            >
                                <option value="Hủy luôn đơn hàng (Hủy đơn)">Hủy luôn đơn hàng (Hủy đơn)</option>
                                <option value="Hủy ghép & Đợi xe khác (Chờ xe)">Hủy ghép & Đợi xe khác (Chờ xe)</option>
                            </select>
                        </div>

                        <div className="mt-4">
                            <label htmlFor="cancel-reason" className="block text-sm font-semibold text-slate-700 mb-2">
                                Lý do hủy <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="cancel-reason"
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none resize-none text-slate-700 placeholder:text-gray-400"
                                placeholder="Nhập lý do hủy tại đây..."
                                autoFocus
                            />
                        </div>
                    </main>

                    <footer className="shrink-0 p-3 md:p-4 border-t border-red-200/30 bg-gradient-to-r from-red-50/95 via-white/95 to-red-50/95 backdrop-blur-xl flex justify-end items-center gap-3 relative z-10 shadow-inner">
                        <Button onClick={onClose} disabled={isSubmitting} variant="secondary" size="sm" leftIcon={<i className="fas fa-times"></i>}>
                            Hủy
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} variant="danger" size="sm" isLoading={isSubmitting} leftIcon={<i className="fas fa-trash-alt"></i>}>
                            Xác Nhận Hủy
                        </Button>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default CancelRequestModal;