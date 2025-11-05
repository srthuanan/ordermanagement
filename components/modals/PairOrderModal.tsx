import React, { useState, useEffect, useRef } from 'react';
import { Order } from '../../types';
import yesAnimationUrl from '../../pictures/yes.json?url';
import noAnimationUrl from '../../pictures/no-animation.json?url';

// Choices.js is loaded globally from index.html, declare it for TypeScript
declare const Choices: any;

interface PairOrderModalProps {
    vin: string;
    pendingOrders: Order[];
    onClose: () => void;
    onConfirm: (orderNumber: string, vin: string) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const PairOrderModal: React.FC<PairOrderModalProps> = ({ vin, pendingOrders, onClose, onConfirm, showToast }) => {
    const [selectedOrder, setSelectedOrder] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);
    const choicesRef = useRef<any>(null);

    useEffect(() => {
        if (selectRef.current && pendingOrders.length > 0) {
            // Destroy previous instance if it exists to prevent memory leaks
            if (choicesRef.current) {
                choicesRef.current.destroy();
            }
            const choices = new Choices(selectRef.current, {
                searchEnabled: true,
                itemSelectText: 'Chọn',
                placeholder: true,
                placeholderValue: 'Tìm SĐH hoặc tên khách hàng...',
                removeItemButton: false, // Don't need this for single select
                shouldSort: false, // Keep original order
            });
            choicesRef.current = choices;

            const handleChange = (event: Event) => {
                setSelectedOrder((event.target as HTMLSelectElement).value);
            };

            selectRef.current.addEventListener('change', handleChange);

            // Cleanup function to remove event listener and destroy Choices instance
            return () => {
                if (selectRef.current) {
                    selectRef.current.removeEventListener('change', handleChange);
                }
                if (choicesRef.current) {
                    choicesRef.current.destroy();
                    choicesRef.current = null;
                }
            };
        }
    }, [pendingOrders]);

    const handleSubmit = () => {
        if (!selectedOrder) {
            showToast('Thiếu Thông Tin', 'Vui lòng chọn một đơn hàng để ghép xe.', 'warning', 3000);
            return;
        }
        setIsSubmitting(true);
        onConfirm(selectedOrder, vin);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                className="bg-surface-card w-full max-w-lg rounded-2xl shadow-xl animate-fade-in-scale-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="relative flex flex-col items-center justify-center p-6 text-center bg-surface-card border-b border-border-primary">
                    <div className="animate-fade-in-down">
                        <h2 className="text-xl font-bold text-gradient">Ghép Xe Vào Đơn Hàng</h2>
                        <p className="text-sm text-text-secondary mt-1">Chọn một đơn hàng để ghép với xe đã giữ.</p>
                    </div>
                    <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover">
                        <i className="fas fa-times"></i>
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <div className="p-4 bg-surface-ground rounded-lg border border-border-primary text-center">
                        <p className="text-sm text-text-secondary">Bạn đang ghép xe có số VIN:</p>
                        <p className="font-bold font-mono text-lg text-accent-primary">{vin}</p>
                    </div>
                    
                    {pendingOrders.length > 0 ? (
                        <div>
                            <label htmlFor="order-select" className="block text-sm font-medium text-text-primary mb-2">
                                Chọn từ các đơn hàng đang chờ ghép của bạn:
                            </label>
                            {/* The select element that Choices.js will enhance */}
                            <select ref={selectRef} id="order-select">
                                <option value="">Chọn một đơn hàng</option>
                                {pendingOrders.map(order => (
                                    <option key={order['Số đơn hàng']} value={order['Số đơn hàng']}>
                                        {`${order['Số đơn hàng']} - ${order['Tên khách hàng']} (${order['Dòng xe']})`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="p-4 bg-warning-bg text-yellow-800 rounded-lg text-sm flex items-center gap-3">
                           <i className="fas fa-exclamation-triangle"></i>
                           <span>Bạn không có đơn hàng nào phù hợp đang ở trạng thái "Chưa ghép".</span>
                        </div>
                    )}
                </main>
                <footer className="p-4 border-t border-border-primary flex justify-end gap-3 items-center bg-surface-ground rounded-b-2xl">
                    <div onClick={!isSubmitting ? onClose : undefined} title="Hủy" className={`cursor-pointer ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={noAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                    <div onClick={!isSubmitting && selectedOrder && pendingOrders.length > 0 ? handleSubmit : undefined} title="Xác Nhận Ghép" className={`cursor-pointer ${(isSubmitting || !selectedOrder || pendingOrders.length === 0) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 transition-transform'}`}>
                        <lottie-player src={yesAnimationUrl} background="transparent" speed="1" style={{ width: '60px', height: '60px' }} loop autoplay />
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PairOrderModal;