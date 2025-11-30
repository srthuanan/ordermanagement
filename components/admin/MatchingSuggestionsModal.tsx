import React, { useMemo } from 'react';
import { Order, StockVehicle } from '../../types';
import { useModalBackground, getExteriorColorStyle, getInteriorColorStyle } from '../../utils/styleUtils';
import moment from 'moment';

interface MatchingSuggestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    matches: { order: Order; cars: StockVehicle[] }[];
    onConfirmMatch: (orderNumber: string, vin: string) => void;
}

const MatchingSuggestionsModal: React.FC<MatchingSuggestionsModalProps> = ({ isOpen, onClose, matches, onConfirmMatch }) => {
    const bgStyle = useModalBackground();

    const sortedMatches = useMemo(() => {
        return [...matches].sort((a, b) => {
            const getTimestamp = (dateStr: any) => {
                if (!dateStr) return Number.MAX_SAFE_INTEGER; // Put undefined dates at the end
                const m = moment(dateStr);
                return m.isValid() ? m.valueOf() : Number.MAX_SAFE_INTEGER;
            };
            const dateA = getTimestamp(a.order['Ngày cọc']);
            const dateB = getTimestamp(b.order['Ngày cọc']);
            return dateA - dateB;
        });
    }, [matches]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
            <div 
                className="bg-surface-card w-full max-w-3xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[85vh]" 
                onClick={e => e.stopPropagation()} 
                style={bgStyle}
            >
                <header className="flex-shrink-0 flex items-center justify-between p-3 border-b border-border-primary bg-surface-card/80 backdrop-blur-sm rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary animate-pulse">
                            <i className="fas fa-magic text-sm"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gradient leading-tight">Gợi Ý Ghép Xe</h2>
                            <p className="text-xs text-text-secondary">Tìm thấy <strong className="text-accent-primary">{matches.length}</strong> đơn hàng phù hợp.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </header>

                <main className="flex-grow overflow-y-auto p-2 bg-surface-ground/50 hidden-scrollbar">
                    <div className="space-y-2">
                        {sortedMatches.map(({ order, cars }, index) => {
                            const bestCar = cars[0]; // Assume the first one is the best match (e.g. oldest stock)
                            return (
                                <div key={order['Số đơn hàng']} className="bg-surface-card border border-border-primary rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row gap-3 items-center animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }}>
                                    {/* Order Info */}
                                    <div className="flex-1 min-w-0 w-full relative">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-[10px] font-mono text-text-secondary bg-surface-ground px-1 rounded border border-border-secondary/50">{order['Số đơn hàng']}</span>
                                            {order['Ngày cọc'] && (
                                                <span className="text-[10px] text-accent-secondary font-medium"><i className="fas fa-money-bill-wave mr-1"></i>{moment(order['Ngày cọc']).format('DD/MM')}</span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-text-primary text-sm truncate">{order['Tên khách hàng']}</h3>
                                        <div className="text-xs text-text-secondary mt-0.5 flex flex-wrap gap-x-2">
                                            <span className="font-medium text-text-primary">{order['Dòng xe']} {order['Phiên bản']}</span>
                                            <span className="flex items-center gap-1" style={getExteriorColorStyle(order['Ngoại thất'])}>
                                                • {order['Ngoại thất']}
                                            </span>
                                            <span className="flex items-center gap-1" style={getInteriorColorStyle(order['Nội thất'])}>
                                                / {order['Nội thất']}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Connector */}
                                    <div className="hidden sm:flex flex-col items-center justify-center text-border-secondary">
                                        <i className="fas fa-chevron-right text-sm"></i>
                                    </div>

                                    {/* Stock Info & Action */}
                                    <div className="flex-shrink-0 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-border-primary pt-2 sm:pt-0 sm:pl-3 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                        <div className="text-left sm:text-right">
                                            <div className="flex items-center sm:justify-end gap-1.5 mb-0.5">
                                                <span className="text-[10px] font-bold text-success bg-success-bg px-1.5 rounded-full">Kho: {cars.length}</span>
                                            </div>
                                            <p className="font-mono font-bold text-base text-text-primary tracking-wide">{bestCar.VIN}</p>
                                        </div>
                                        <button 
                                            onClick={() => onConfirmMatch(order['Số đơn hàng'], bestCar.VIN)}
                                            className="btn-primary !px-3 !py-1.5 !text-xs !h-auto shadow-sm hover:shadow transition-all active:scale-95 flex-shrink-0 whitespace-nowrap"
                                        >
                                            <i className="fas fa-link mr-1.5"></i>Ghép Ngay
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </main>

                <footer className="flex-shrink-0 p-2.5 border-t border-border-primary bg-surface-card rounded-b-2xl flex justify-end">
                    <button onClick={onClose} className="btn-secondary !py-1.5 !px-4 !text-sm">Đóng</button>
                </footer>
            </div>
        </div>
    );
};

export default MatchingSuggestionsModal;