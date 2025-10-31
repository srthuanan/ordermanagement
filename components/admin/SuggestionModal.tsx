import React, { useState } from 'react';
import moment from 'moment';
import { Order, StockVehicle } from '../../types';

interface SuggestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (orderNumber: string, vin: string) => void;
    order: Order;
    suggestedCars: StockVehicle[];
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, onConfirm, order, suggestedCars }) => {
    const [selectedVin, setSelectedVin] = useState<string>(suggestedCars.length > 0 ? suggestedCars[0].VIN : '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!selectedVin) return;
        setIsSubmitting(true);
        // The parent's handleAdminSubmit will handle closing the modal on success
        await onConfirm(order["Số đơn hàng"], selectedVin);
        // Only set submitting to false if the action fails, allowing retry
        setIsSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-surface-card w-full max-w-2xl rounded-2xl shadow-xl animate-fade-in-scale-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="h-1.5 rounded-t-2xl bg-warning"></div>
                <header className="flex-shrink-0 flex items-start justify-between p-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center bg-yellow-100">
                            <i className="fas fa-lightbulb text-2xl text-amber-500"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-text-primary">Gợi Ý & Ghép Xe Thủ Công</h2>
                            <p className="text-sm text-text-secondary mt-1">Chọn xe phù hợp từ kho để ghép vào đơn hàng.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-surface-hover -mt-2 -mr-2"><i className="fas fa-times"></i></button>
                </header>
                <main className="p-6 space-y-4 overflow-y-auto">
                     <div className="p-4 bg-surface-ground rounded-lg border border-border-primary space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div><span className="text-text-secondary">Khách hàng:</span> <strong className="text-text-primary">{order["Tên khách hàng"]}</strong></div>
                            <div><span className="text-text-secondary">Số ĐH:</span> <strong className="text-text-primary font-mono">{order["Số đơn hàng"]}</strong></div>
                            <div><span className="text-text-secondary">Dòng xe:</span> <strong className="text-text-primary">{order["Dòng xe"]} - {order["Phiên bản"]}</strong></div>
                            <div><span className="text-text-secondary">Màu:</span> <strong className="text-text-primary">{order["Ngoại thất"]} / {order["Nội thất"]}</strong></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold text-text-primary mb-2">Tìm thấy {suggestedCars.length} xe phù hợp trong kho (ưu tiên xe nhập sớm):</h3>
                        {suggestedCars.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto border border-border-primary rounded-lg">
                                <table className="min-w-full text-sm responsive-table">
                                    <thead className="bg-surface-hover sticky top-0">
                                        <tr>
                                            <th className="py-2 px-3 text-left w-10">Chọn</th>
                                            <th className="py-2 px-3 text-left">Số VIN</th>
                                            <th className="py-2 px-3 text-left">Nội Thất</th>
                                            <th className="py-2 px-3 text-left">Ngày Nhập Kho</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-primary bg-surface-card">
                                        {suggestedCars.map((car) => (
                                            <tr key={car.VIN} className="hover:bg-surface-hover">
                                                <td className="py-2.5 px-3" data-label="Chọn">
                                                    <input type="radio" name="suggested-vin" value={car.VIN} checked={selectedVin === car.VIN} onChange={() => setSelectedVin(car.VIN)} className="h-4 w-4 text-accent-primary focus:ring-accent-primary border-border-secondary" />
                                                </td>
                                                <td className="py-2.5 px-3 font-mono text-text-primary" data-label="Số VIN">{car.VIN}</td>
                                                <td className="py-2.5 px-3 text-text-secondary" data-label="Nội Thất">{car["Nội thất"]}</td>
                                                <td className="py-2.5 px-3 text-text-secondary" data-label="Ngày Nhập Kho">{car['Thời gian nhập'] ? moment(car['Thời gian nhập']).format('DD/MM/YYYY') : 'N/A'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-text-secondary bg-surface-ground rounded-lg">
                                <i className="fas fa-box-open fa-2x mb-3"></i>
                                <p>Không tìm thấy xe nào phù hợp trong kho.</p>
                            </div>
                        )}
                    </div>
                </main>
                <footer className="flex-shrink-0 px-6 py-4 flex justify-end items-center gap-3 bg-surface-ground rounded-b-2xl border-t border-border-primary">
                    <button onClick={onClose} disabled={isSubmitting} className="btn-secondary">Hủy</button>
                    <button onClick={handleSubmit} disabled={isSubmitting || !selectedVin || suggestedCars.length === 0} className="btn-primary">
                        {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i> Đang ghép...</> : <><i className="fas fa-link mr-2"></i> Xác Nhận Ghép</>}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SuggestionModal;