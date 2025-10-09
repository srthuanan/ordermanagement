import React, { useState } from 'react';
import { Order } from '../../types';

interface CancelRequestModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, reason: string) => void;
}

const CancelRequestModal: React.FC<CancelRequestModalProps> = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (!reason.trim()) {
            alert("Vui lòng nhập lý do hủy.");
            return;
        }
        setIsSubmitting(true);
        onConfirm(order, reason);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-surface-card w-full max-w-md rounded-2xl shadow-xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="relative flex flex-col items-center justify-center p-6 text-center bg-surface-card border-b border-border-primary">
                    <div className="animate-fade-in-down">
                        <h2 className="text-xl font-bold text-danger">Xác Nhận Hủy Yêu Cầu</h2>
                    </div>
                     <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <p className="text-sm text-text-secondary">
                        Bạn có chắc chắn muốn hủy yêu cầu cho đơn hàng <strong className="font-mono text-text-primary">{order["Số đơn hàng"]}</strong> của khách hàng <strong className="text-text-primary">{order["Tên khách hàng"]}</strong>?
                    </p>
                     <div>
                        <label htmlFor="cancel-reason" className="block text-sm font-medium text-text-primary mb-2">
                            Lý do hủy (bắt buộc)
                        </label>
                        <textarea
                            id="cancel-reason"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-surface-card border-border-primary rounded-lg shadow-sm p-2 focus:border-accent-primary transition focus:shadow-glow-accent focus:outline-none"
                            placeholder="VD: Khách hàng đổi ý, sai thông tin..."
                        />
                    </div>
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-end gap-4 bg-surface-ground rounded-b-2xl">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">
                        Không
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!reason.trim() || isSubmitting}
                        className="btn-danger"
                    >
                         {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang hủy...</> : "Xác nhận Hủy"}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CancelRequestModal;