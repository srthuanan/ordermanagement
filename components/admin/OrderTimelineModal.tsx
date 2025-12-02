import React, { useState, useCallback } from 'react';
import moment from 'moment';
import * as apiService from '../../services/apiService';
import { useModalBackground } from '../../utils/styleUtils';

interface TimelineItemData {
    'Thời gian': string;
    'Hành động': string;
    'Chi tiết': string;
    'Người thực hiện': string;
}

interface OrderTimelineModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TimelineItem: React.FC<{ item: TimelineItemData }> = ({ item }) => (
    <div className="relative pl-6 py-2 group">
        <div className="absolute top-2 left-0 w-4 h-4 rounded-full bg-accent-primary/20 border-4 border-surface-card group-hover:bg-accent-primary transition-colors"></div>
        <div className="pl-2">
            <p className="font-bold text-text-primary">{item['Hành động']}</p>
            <p className="text-sm text-text-secondary mt-1">{item['Chi tiết']}</p>
            <div className="text-xs text-text-secondary mt-2 flex items-center gap-2">
                <span><i className="fas fa-user fa-fw mr-1.5"></i>{item['Người thực hiện']}</span>
                <span><i className="fas fa-clock fa-fw mr-1.5"></i>{moment(item['Thời gian']).format('HH:mm DD/MM/YYYY')}</span>
            </div>
        </div>
        <div className="absolute top-4 left-[7px] h-full border-l-2 border-dashed border-border-primary group-last:border-none"></div>
    </div>
);


const OrderTimelineModal: React.FC<OrderTimelineModalProps> = ({ isOpen, onClose }) => {
    const [orderNumber, setOrderNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<TimelineItemData[] | null>(null);
    const bgStyle = useModalBackground();

    const handleSearch = useCallback(async () => {
        if (!orderNumber.trim()) {
            setError('Vui lòng nhập số đơn hàng.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setHistory(null);
        try {
            const result = await apiService.getOrderHistory(orderNumber.trim());
            if (result.history && result.history.length > 0) {
                setHistory(result.history);
            } else {
                setError(`Không tìm thấy lịch sử cho đơn hàng "${orderNumber.trim()}".`);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [orderNumber]);

    const handleClose = () => {
        setOrderNumber('');
        setHistory(null);
        setError(null);
        setIsLoading(false);
        onClose();
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4" onClick={onClose}>
            <div className="bg-surface-card w-full md:max-w-3xl h-[100dvh] md:h-auto md:max-h-[85vh] rounded-none md:rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col" onClick={e => e.stopPropagation()} style={bgStyle}>
                <header className="flex items-center justify-between p-2.5 border-b border-border-primary flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                            <i className="fas fa-history text-lg text-accent-primary"></i>
                        </div>
                        <h2 className="text-xl font-bold text-text-primary">Tra Cứu Lịch Sử Đơn Hàng</h2>
                    </div>
                    <button onClick={handleClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover"><i className="fas fa-times"></i></button>
                </header>
                <main className="p-4 md:p-6 overflow-y-auto flex-grow min-h-0 hidden-scrollbar">
                    <div className="flex items-center gap-1.5">
                        <input
                            type="text"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Nhập Số đơn hàng..."
                            className="flex-grow bg-surface-ground border border-border-primary rounded-lg p-2 focus:ring-accent-primary focus:border-accent-primary transition futuristic-input"
                        />
                        <button onClick={handleSearch} disabled={isLoading} className="btn-primary flex-shrink-0">
                            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>}
                        </button>
                    </div>
                    <div className="min-h-[20rem]">
                        {isLoading && <div className="flex justify-center items-center h-full pt-16"><i className="fas fa-spinner fa-spin text-3xl text-accent-primary"></i></div>}
                        {error && <div className="text-center pt-16 text-danger bg-danger-bg p-4 rounded-lg">{error}</div>}
                        {!isLoading && !error && !history && (
                            <div className="text-center pt-16 text-text-secondary">
                                <i className="fas fa-history text-4xl mb-4"></i>
                                <p>Nhập số đơn hàng để bắt đầu tra cứu.</p>
                            </div>
                        )}
                        {history && (
                            <div className="mt-4 border-t border-border-primary">
                                {history.map((item, index) => <TimelineItem key={index} item={item} />)}
                            </div>
                        )}
                    </div>
                </main>
                <footer className="p-2 border-t border-border-primary flex justify-end items-center gap-2 bg-surface-ground rounded-b-2xl flex-shrink-0">
                    <button onClick={handleClose} className="btn-secondary">Đóng</button>
                </footer>
            </div>
        </div>
    );
};

export default OrderTimelineModal;