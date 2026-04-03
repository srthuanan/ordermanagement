import React, { useState } from 'react';
import { Order } from '../../types';
import Button from '../ui/Button';

interface CancelRequestModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, reason: string, unmatchType: string, thoiGianCanXe?: string) => void;
}

const CancelRequestModal: React.FC<CancelRequestModalProps> = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [unmatchType, setUnmatchType] = useState('Hủy luôn đơn hàng (Hủy đơn)');
    const [thoiGianCanXe, setThoiGianCanXe] = useState(order['Thời gian cần xe'] || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!reason.trim()) {
            alert("Vui lòng nhập lý do hủy.");
            return;
        }
        if (unmatchType.includes('Chờ xe') && !thoiGianCanXe) {
            alert("Vui lòng chọn thời gian cần xe để Admin có căn cứ ưu tiên.");
            return;
        }
        setIsSubmitting(true);
        onConfirm(order, reason, unmatchType, unmatchType.includes('Chờ xe') ? thoiGianCanXe : undefined);
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
                className="relative z-10 w-full max-w-[400px] mx-auto px-4 flex flex-col justify-center h-screen md:h-auto pointer-events-none"
            >
                <div
                    className="flex flex-col w-full bg-white md:bg-white/95 md:backdrop-blur-3xl rounded-2xl overflow-hidden shadow-2xl border border-white/20 pointer-events-auto animate-fade-in-scale-up"
                    onClick={(e) => e.stopPropagation()}
                >
                    <header className="relative flex items-center gap-4 p-4 border-b border-gray-100 bg-gradient-to-r from-red-50/50 via-white to-red-50/50">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                            <i className="fas fa-exclamation-triangle text-xl text-red-500"></i>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-slate-800 leading-tight">Xác Nhận Hủy</h2>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all shrink-0">
                            <i className="fas fa-times text-xs"></i>
                        </button>
                    </header>

                    <main className="p-4 space-y-3 overflow-y-auto max-h-[70vh] custom-scrollbar">
                        <p className="text-[13px] text-slate-600 leading-normal">
                            Hủy yêu cầu đơn <strong className="font-mono text-slate-900 bg-gray-100 px-1.5 py-0.5 rounded text-xs">{order["Số đơn hàng"]}</strong> - <strong className="text-slate-900">{order["Tên khách hàng"]}</strong>?
                        </p>

                        <div className="space-y-1.5">
                            <label htmlFor="cancel-type" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                Tùy chọn hủy <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="cancel-type"
                                value={unmatchType}
                                onChange={(e) => setUnmatchType(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-[13px] focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-slate-700"
                            >
                                <option value="Hủy luôn đơn hàng (Hủy đơn)">Hủy luôn đơn hàng (Hủy đơn)</option>
                                <option value="Hủy ghép & Đợi xe khác (Chờ xe)">Hủy ghép & Đợi xe khác (Chờ xe)</option>
                            </select>
                        </div>

                        {unmatchType.includes('Chờ xe') && (
                            <div className="animate-fade-in bg-red-50/50 p-3 rounded-xl border border-red-100/50 space-y-2">
                                <label htmlFor="need-date" className="block text-[11px] font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wider">
                                    <i className="far fa-calendar-alt text-red-500 text-[10px]"></i>
                                    THỜI GIAN CẦN XE <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="need-date"
                                    type="date"
                                    value={thoiGianCanXe}
                                    onChange={(e) => setThoiGianCanXe(e.target.value)}
                                    className="w-full bg-white border border-red-200 rounded-lg p-2 text-[14px] focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none text-slate-700 font-bold"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label htmlFor="cancel-reason" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                Lý do hủy <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="cancel-reason"
                                rows={2}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-[13px] focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all outline-none resize-none text-slate-700 placeholder:text-gray-400"
                                placeholder="Nhập lý do hủy..."
                                autoFocus
                            />
                        </div>
                    </main>

                    <footer className="p-3 border-t border-gray-100 bg-gray-50/50 flex justify-end items-center gap-2">
                        <Button onClick={onClose} disabled={isSubmitting} variant="secondary" className="px-4 py-2 text-xs" leftIcon={<i className="fas fa-times"></i>}>
                            Hủy
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting} variant="danger" className="px-4 py-2 text-xs shadow-lg shadow-red-500/20" isLoading={isSubmitting} leftIcon={<i className="fas fa-trash-alt"></i>}>
                            Xác Nhận Hủy
                        </Button>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default CancelRequestModal;