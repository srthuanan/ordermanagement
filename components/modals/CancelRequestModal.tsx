import React, { useState } from 'react';
import { Order } from '../../types';
import yesAnimationUrl from '../../pictures/yes.json?url';
import noAnimationUrl from '../../pictures/no-animation.json?url';
import { useModalBackground } from '../../utils/styleUtils';

interface CancelRequestModalProps {
    order: Order;
    onClose: () => void;
    onConfirm: (order: Order, reason: string) => void;
}

const CancelRequestModal: React.FC<CancelRequestModalProps> = ({ order, onClose, onConfirm }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const bgStyle = useModalBackground();

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
                style={bgStyle}
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
                <footer className="p-4 border-t border-border-primary flex justify-end gap-3 items-center bg-surface-ground rounded-b-2xl">
                    <div onClick={!isSubmitting ? onClose : undefined} title="Hủy" className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={noAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                    <div onClick={!isSubmitting ? handleSubmit : undefined} title="Xác Nhận Hủy" className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={yesAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default CancelRequestModal;