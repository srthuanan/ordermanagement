import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { StockVehicle, Order } from '../../types';
import { createSwapRequest } from '../../services/api/swapService';

interface SwapCarModalProps {
    targetVehicle: StockVehicle;
    userOrders: Order[];
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

export const SwapCarModal: React.FC<SwapCarModalProps> = ({
    targetVehicle,
    userOrders,
    onClose,
    showToast,
    onSuccess
}) => {
    const [selectedOrderNo, setSelectedOrderNo] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lọc danh sách Đơn hàng của TVBH hiện tại thỏa mãn CÙNG CẤU HÌNH 100% với targetVehicle
    const eligibleOrders = useMemo(() => {
        const tModel = (targetVehicle["Dòng xe"] || '').trim().toLowerCase();
        const tVer = (targetVehicle["Phiên bản"] || '').trim().toLowerCase();
        const tExt = (targetVehicle["Ngoại thất"] || '').trim().toLowerCase();
        const tInt = (targetVehicle["Nội thất"] || '').trim().toLowerCase();

        return userOrders.filter(o => {
            const oStatus = (o["Kết quả"] || '').toLowerCase();
            if (oStatus.includes('đã xuất hóa đơn') || oStatus.includes('hủy')) return false;

            const oModel = (o["Dòng xe"] || '').trim().toLowerCase();
            const oVer = (o["Phiên bản"] || '').trim().toLowerCase();
            const oExt = (o["Ngoại thất"] || '').trim().toLowerCase();
            const oInt = (o["Nội thất"] || '').trim().toLowerCase();

            return oModel === tModel && oVer === tVer && oExt === tExt && oInt === tInt;
        });
    }, [userOrders, targetVehicle]);

    // Tự động chọn đơn đầu tiên nếu có
    React.useEffect(() => {
        if (eligibleOrders.length > 0 && !selectedOrderNo) {
            setSelectedOrderNo(eligibleOrders[0]["Số đơn hàng"]);
        }
    }, [eligibleOrders, selectedOrderNo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrderNo) {
            showToast('Cảnh báo', 'Bạn cần chọn 1 đơn hàng của mình cùng cấu hình để hoán đổi!', 'warning');
            return;
        }
        if (!reason.trim()) {
            showToast('Cảnh báo', 'Vui lòng nhập lý do đề nghị trao đổi xe!', 'warning');
            return;
        }

        const selectedOrder = eligibleOrders.find(o => o["Số đơn hàng"] === selectedOrderNo);
        const vinA = selectedOrder?.VIN || '';

        setIsSubmitting(true);
        try {
            const res = await createSwapRequest({
                orderA: selectedOrderNo,
                vinA,
                orderB: '', // Đơn B sẽ được xác định theo VIN B
                vinB: targetVehicle.VIN,
                reason: reason.trim()
            });

            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message || 'Đã gửi đề nghị đổi xe thành công!', 'success');
                if (onSuccess) onSuccess();
                onClose();
            } else {
                showToast('Lỗi', res.message || 'Không thể gửi đề nghị đổi xe', 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Đã xảy ra lỗi khi gửi yêu cầu', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const modalContent = (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-[0_30px_90px_-15px_rgba(0,0,0,0.3)] max-w-lg w-full overflow-hidden border border-slate-200">
                {/* Premium Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl text-white shadow-inner">
                            <i className="fa-solid fa-right-left"></i>
                        </div>
                        <div>
                            <h3 className="font-extrabold text-xl leading-tight">Yêu Cầu Trao Đổi Xe</h3>
                            <p className="text-xs text-amber-100 font-medium">Đổi xe cùng cấu hình với TVBH khác</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white transition-all border border-white/10"
                    >
                        <i className="fa-solid fa-xmark text-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Thẻ xe của TVBH 2 (Target Vehicle) */}
                    <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200/80 text-slate-800 space-y-1.5 text-xs shadow-2xs">
                        <div className="flex items-center justify-between">
                            <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                                <i className="fa-solid fa-car text-amber-600 text-sm"></i>
                                Xe đề nghị đổi (TVBH {targetVehicle.nguoi_giu_xe || 'khác'}):
                            </span>
                            <span className="px-2.5 py-0.5 bg-amber-200/80 text-amber-950 font-mono font-extrabold rounded-lg text-xs">
                                {targetVehicle.VIN}
                            </span>
                        </div>
                        <div className="text-slate-600 font-semibold leading-relaxed">
                            {targetVehicle["Dòng xe"]} - {targetVehicle["Phiên bản"]} | Ngoại thất: <span className="font-extrabold text-amber-900">{targetVehicle["Ngoại thất"]}</span> | Nội thất: <span className="font-extrabold text-amber-900">{targetVehicle["Nội thất"]}</span>
                        </div>
                    </div>

                    {/* Chọn đơn hàng của TVBH 1 */}
                    <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                            1. Chọn đơn hàng sở hữu của bạn:
                        </label>
                        {eligibleOrders.length === 0 ? (
                            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
                                <i className="fa-solid fa-circle-exclamation text-lg text-rose-500"></i>
                                <span>Bạn không có đơn hàng nào có cùng cấu hình 100% để tráo đổi xe này.</span>
                            </div>
                        ) : (
                            <select
                                value={selectedOrderNo}
                                onChange={(e) => setSelectedOrderNo(e.target.value)}
                                className="w-full px-3.5 py-3 bg-slate-50 border border-slate-300/80 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-2xs"
                            >
                                {eligibleOrders.map(o => (
                                    <option key={o["Số đơn hàng"]} value={o["Số đơn hàng"]}>
                                        ĐH: {o["Số đơn hàng"]} - KH: {o["Tên khách hàng"]} ({o.VIN ? `Đã ghép VIN ${o.VIN}` : 'Chưa ghép (Chờ xe)'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Nhập lý do */}
                    <div>
                        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                            2. Lý do đề nghị đổi xe:
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Ví dụ: Khách anh A cần nhận xe gấp tại Hà Nội, đổi với xe bãi Nam Định của em B..."
                            className="w-full p-3.5 bg-slate-50 border border-slate-300/80 rounded-2xl text-xs text-slate-800 font-medium focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden transition-all shadow-2xs"
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || eligibleOrders.length === 0}
                            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi đề nghị...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-paper-plane"></i> Gửi Đề Nghị Đổi Xe
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return ReactDOM.createPortal(modalContent, document.body);
};
