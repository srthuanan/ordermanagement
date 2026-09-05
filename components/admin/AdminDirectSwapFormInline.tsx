import React, { useState, useMemo } from 'react';
import { Order } from '../../types';
import { adminDirectSwap } from '../../services/api/swapService';

interface AdminDirectSwapFormInlineProps {
    orders: Order[];
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const AdminDirectSwapFormInline: React.FC<AdminDirectSwapFormInlineProps> = ({
    orders,
    showToast,
    onSuccess,
    onCancel
}) => {
    const [orderANo, setOrderANo] = useState<string>('');
    const [orderBNo, setOrderBNo] = useState<string>('');
    const [searchQueryA, setSearchQueryA] = useState<string>('');
    const [searchQueryB, setSearchQueryB] = useState<string>('');
    const [reason, setReason] = useState<string>('Admin điều phối tráo VIN trực tiếp');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lấy danh sách các đơn hàng đủ điều kiện hoán đổi (Chỉ chấp nhận duy nhất 2 trạng thái: "Đã ghép" hoặc "Chưa ghép")
    const validOrders = useMemo(() => {
        return orders.filter(o => {
            const res = (o['Kết quả'] || '').trim().toLowerCase();
            // Loại bỏ hoàn toàn các đơn liên quan đến Hóa đơn (Yêu cầu XHĐ / Đã xuất HĐ) hoặc Đã Hủy
            if (res.includes('hóa đơn') || res.includes('hủy')) {
                return false;
            }
            // CHỈ GIỮ LẠI ĐƠN CÓ TRẠNG THÁI "ĐÃ GHÉP" HOẶC "CHƯA GHÉP" (hoặc rỗng)
            return res === 'đã ghép' || res === 'chưa ghép' || res === '';
        });
    }, [orders]);

    // CHỈ HIỂN THỊ ĐƠN A CÓ ĐƠN B CÙNG CẤU HÌNH 100% VÀ KHÁC TRẠNG THÁI VIN (1 Đã ghép, 1 Chưa ghép)!
    const eligibleOrdersA = useMemo(() => {
        return validOrders.filter(orderA => {
            const modelA = (orderA['Dòng xe'] || '').trim().toLowerCase();
            const verA = (orderA['Phiên bản'] || '').trim().toLowerCase();
            const extA = (orderA['Ngoại thất'] || '').trim().toLowerCase();
            const intA = (orderA['Nội thất'] || '').trim().toLowerCase();
            const hasVinA = !!(orderA.VIN && orderA.VIN.trim() !== '');

            return validOrders.some(orderB => {
                if (orderB['Số đơn hàng'] === orderA['Số đơn hàng']) return false;
                const modelB = (orderB['Dòng xe'] || '').trim().toLowerCase();
                const verB = (orderB['Phiên bản'] || '').trim().toLowerCase();
                const extB = (orderB['Ngoại thất'] || '').trim().toLowerCase();
                const intB = (orderB['Nội thất'] || '').trim().toLowerCase();
                const hasVinB = !!(orderB.VIN && orderB.VIN.trim() !== '');

                // Cấu hình khớp 100% AND 1 đơn Đã ghép VIN + 1 đơn Chưa ghép VIN
                return modelA === modelB && verA === verB && extA === extB && intA === intB && (hasVinA !== hasVinB);
            });
        });
    }, [validOrders]);

    // Lọc tìm kiếm cho Đơn A
    const filteredOrdersA = useMemo(() => {
        if (!searchQueryA.trim()) return eligibleOrdersA;
        const q = searchQueryA.trim().toLowerCase();
        return eligibleOrdersA.filter(o =>
            (o['Số đơn hàng'] || '').toLowerCase().includes(q) ||
            (o['Tên khách hàng'] || '').toLowerCase().includes(q) ||
            (o['Tên tư vấn bán hàng'] || '').toLowerCase().includes(q) ||
            (o['Dòng xe'] || '').toLowerCase().includes(q) ||
            (o['VIN'] || '').toLowerCase().includes(q)
        );
    }, [eligibleOrdersA, searchQueryA]);

    // Hiển thị tối đa 5 đơn A phù hợp nhất (không cần scroll)
    const displayedOrdersA = useMemo(() => {
        return filteredOrdersA.slice(0, 5);
    }, [filteredOrdersA]);

    // Đơn A được chọn
    const selectedOrderA = useMemo(() => {
        return validOrders.find(o => o['Số đơn hàng'] === orderANo) || null;
    }, [validOrders, orderANo]);

    // Lọc danh sách Đơn B CHỈ HIỂN THỊ CÁC ĐƠN CÓ CÙNG CẤU HÌNH 100% VÀ ĐỐI ỨNG TRẠNG THÁI VIN VỚI ĐƠN A (1 Đã ghép, 1 Chưa ghép)
    const matchingOrdersForB = useMemo(() => {
        if (!selectedOrderA) return [];
        const modelA = (selectedOrderA['Dòng xe'] || '').trim().toLowerCase();
        const verA = (selectedOrderA['Phiên bản'] || '').trim().toLowerCase();
        const extA = (selectedOrderA['Ngoại thất'] || '').trim().toLowerCase();
        const intA = (selectedOrderA['Nội thất'] || '').trim().toLowerCase();
        const hasVinA = !!(selectedOrderA.VIN && selectedOrderA.VIN.trim() !== '');

        return validOrders.filter(o => {
            if (o['Số đơn hàng'] === orderANo) return false;
            const modelB = (o['Dòng xe'] || '').trim().toLowerCase();
            const verB = (o['Phiên bản'] || '').trim().toLowerCase();
            const extB = (o['Ngoại thất'] || '').trim().toLowerCase();
            const intB = (o['Nội thất'] || '').trim().toLowerCase();
            const hasVinB = !!(o.VIN && o.VIN.trim() !== '');

            return modelA === modelB && verA === verB && extA === extB && intA === intB && (hasVinA !== hasVinB);
        });
    }, [selectedOrderA, validOrders, orderANo]);

    // Lọc tìm kiếm cho Đơn B
    const filteredOrdersB = useMemo(() => {
        if (!searchQueryB.trim()) return matchingOrdersForB;
        const q = searchQueryB.trim().toLowerCase();
        return matchingOrdersForB.filter(o =>
            (o['Số đơn hàng'] || '').toLowerCase().includes(q) ||
            (o['Tên khách hàng'] || '').toLowerCase().includes(q) ||
            (o['Tên tư vấn bán hàng'] || '').toLowerCase().includes(q) ||
            (o['VIN'] || '').toLowerCase().includes(q)
        );
    }, [matchingOrdersForB, searchQueryB]);

    // Hiển thị tối đa 5 đơn B phù hợp nhất (không cần scroll)
    const displayedOrdersB = useMemo(() => {
        return filteredOrdersB.slice(0, 5);
    }, [filteredOrdersB]);

    const selectedOrderB = useMemo(() => {
        return matchingOrdersForB.find(o => o['Số đơn hàng'] === orderBNo) || null;
    }, [matchingOrdersForB, orderBNo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderANo || !orderBNo) {
            showToast('Cảnh báo', 'Vui lòng chọn đầy đủ 2 đơn hàng cùng cấu hình để tráo đổi!', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await adminDirectSwap({
                orderA: orderANo,
                orderB: orderBNo,
                reason: reason.trim()
            });

            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message || 'Đã tráo đổi VIN trực tiếp thành công!', 'success');
                if (onSuccess) onSuccess();
            } else {
                showToast('Lỗi', res.message || 'Không thể tráo đổi VIN', 'error');
            }
        } catch (err: any) {
            showToast('Lỗi', err.message || 'Đã xảy ra lỗi khi tráo VIN', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full p-4 space-y-3.5 bg-white">
            {/* Header Thanh Lịch Sáng */}
            <div className="p-3 bg-slate-100 text-slate-900 rounded-xl flex items-center justify-between shadow-2xs border border-slate-200">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs shadow-2xs">
                        <i className="fa-solid fa-bolt"></i>
                    </div>
                    <div>
                        <h4 className="font-extrabold text-xs leading-none text-slate-900">
                            Tráo VIN Trực Tiếp (Admin Power)
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">Chọn 2 đơn hàng cùng cấu hình 100% để tráo VIN 2 chiều tức thì</p>
                    </div>
                </div>
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-all border border-slate-300"
                    >
                        <i className="fa-solid fa-xmark mr-1"></i> Đóng
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 flex-1 flex flex-col justify-between">
                {/* 2-COLUMN LAYOUT - TỰ CO GIÃN KHÔNG DÙNG SCROLL */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* BÊN TRÁI: ĐƠN A */}
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">1</span>
                                <span>Đơn Hàng A (TVBH Đề Nghị)</span>
                            </label>
                            {selectedOrderA && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setOrderANo('');
                                        setOrderBNo('');
                                    }}
                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline"
                                >
                                    Đổi đơn A
                                </button>
                            )}
                        </div>

                        {!selectedOrderA ? (
                            <div className="space-y-1.5">
                                <div className="relative">
                                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                    <input
                                        type="text"
                                        value={searchQueryA}
                                        onChange={(e) => setSearchQueryA(e.target.value)}
                                        placeholder="Gõ từ khóa để lọc nhanh Đơn A..."
                                        className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-medium text-slate-800 focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    {displayedOrdersA.length === 0 ? (
                                        <div className="p-3 text-center text-slate-400 text-[11px] font-medium bg-white rounded-lg border border-slate-200">
                                            Không tìm thấy đơn A phù hợp
                                        </div>
                                    ) : (
                                        displayedOrdersA.map(o => (
                                            <div
                                                key={o['Số đơn hàng']}
                                                onClick={() => {
                                                    setOrderANo(o['Số đơn hàng']);
                                                    setOrderBNo('');
                                                }}
                                                className="p-2 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 cursor-pointer transition-all shadow-2xs hover:border-blue-400"
                                            >
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className="font-extrabold text-slate-900">ĐH: {o['Số đơn hàng']}</span>
                                                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[9px] font-bold rounded border border-slate-200">
                                                        TVBH: {o['Tên tư vấn bán hàng']}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] text-slate-600 mt-0.5">
                                                    <span className="truncate max-w-[140px]">KH: <strong>{o['Tên khách hàng']}</strong></span>
                                                    <span className="font-mono text-slate-700">{o.VIN ? <strong className="text-emerald-700">VIN: {o.VIN}</strong> : <span className="text-slate-400">Chưa ghép</span>}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-white border border-blue-500 rounded-lg space-y-1 shadow-2xs">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-extrabold text-blue-950">ĐH {selectedOrderA['Số đơn hàng']}</span>
                                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-900 text-[9px] font-bold rounded border border-blue-200">
                                        TVBH: {selectedOrderA['Tên tư vấn bán hàng']}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-700 font-medium">KH: <strong>{selectedOrderA['Tên khách hàng']}</strong></div>
                                <div className="text-[11px] text-slate-700 font-medium">VIN: <strong className="font-mono text-emerald-700">{selectedOrderA.VIN || 'Chưa ghép VIN'}</strong></div>
                                <div className="text-[10px] text-slate-500 font-medium truncate">Cấu hình: {selectedOrderA['Dòng xe']} {selectedOrderA['Phiên bản']} | {selectedOrderA['Ngoại thất']} / {selectedOrderA['Nội thất']}</div>
                            </div>
                        )}
                    </div>

                    {/* BÊN PHẢI: ĐƠN B */}
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200 flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">2</span>
                                <span>Đơn Hàng B (Xe Hoán Đổi - Khớp 100%)</span>
                            </label>
                        </div>

                        {!selectedOrderA ? (
                            <div className="p-4 flex flex-col items-center justify-center text-center text-slate-400 text-[11px] italic bg-white rounded-lg border border-dashed border-slate-300 min-h-[110px]">
                                <i className="fa-solid fa-arrow-left text-sm mb-1 text-slate-300"></i>
                                Chọn Đơn Hàng A bên trái để lọc tự động danh sách các đơn B cùng cấu hình.
                            </div>
                        ) : matchingOrdersForB.length === 0 ? (
                            <div className="p-3 flex items-center justify-center text-center text-slate-500 text-[11px] bg-white rounded-lg border border-slate-200 min-h-[110px]">
                                Không tìm thấy đơn B nào cùng cấu hình 100%.
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <div className="relative">
                                    <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]"></i>
                                    <input
                                        type="text"
                                        value={searchQueryB}
                                        onChange={(e) => setSearchQueryB(e.target.value)}
                                        placeholder="Lọc danh sách đơn B..."
                                        className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-medium text-slate-800 focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    {displayedOrdersB.map(o => {
                                        const isSelected = orderBNo === o['Số đơn hàng'];
                                        return (
                                            <div
                                                key={o['Số đơn hàng']}
                                                onClick={() => setOrderBNo(o['Số đơn hàng'])}
                                                className={`p-2 rounded-lg border cursor-pointer transition-all shadow-2xs ${
                                                    isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white hover:bg-slate-100 border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between text-[11px]">
                                                    <span className={`font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>ĐH: {o['Số đơn hàng']}</span>
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-800'}`}>TVBH: {o['Tên tư vấn bán hàng']}</span>
                                                </div>
                                                <div className={`flex items-center justify-between text-[10px] font-medium mt-0.5 ${isSelected ? 'text-slate-100' : 'text-slate-600'}`}>
                                                    <span className="truncate max-w-[140px]">KH: <strong>{o['Tên khách hàng']}</strong></span>
                                                    <span className={`font-mono ${isSelected ? 'text-emerald-200' : 'text-slate-700'}`}>{o.VIN ? <strong>VIN: {o.VIN}</strong> : <span className="opacity-70">Chưa ghép VIN</span>}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* XEM TRƯỚC KẾT QUẢ TRÁO VIN */}
                {selectedOrderA && selectedOrderB && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-300 shadow-2xs space-y-1.5">
                        <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                                <i className="fa-solid fa-right-left text-blue-600"></i> Xem trước kết quả tráo VIN 2 chiều:
                            </span>
                            <span className="px-2 py-0.2 bg-blue-600 text-white rounded text-[9px] font-bold">
                                Khớp cấu hình 100%
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-0.5">
                                <span className="font-bold text-slate-900 block">Đơn A ({selectedOrderA['Tên tư vấn bán hàng']}):</span>
                                <p className="text-slate-700">VIN nhận mới: <strong className="text-emerald-700 font-mono font-bold">{selectedOrderB.VIN || 'Chưa ghép (Chờ xe)'}</strong></p>
                            </div>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 space-y-0.5">
                                <span className="font-bold text-slate-900 block">Đơn B ({selectedOrderB['Tên tư vấn bán hàng']}):</span>
                                <p className="text-slate-700">VIN nhận mới: <strong className="text-emerald-700 font-mono font-bold">{selectedOrderA.VIN || 'Chưa ghép (Chờ xe)'}</strong></p>
                            </div>
                        </div>
                    </div>
                )}

                {/* LÝ DO VÀ NÚT THỰC THI */}
                <div className="space-y-2 pt-1 border-t border-slate-200">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                            Ghi chú / Lý do điều phối:
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 font-medium focus:ring-1 focus:ring-blue-600 focus:bg-white focus:outline-hidden"
                            placeholder="Nhập lý do tráo đổi trực tiếp..."
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        {onCancel && (
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={isSubmitting}
                                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                Quay lại
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isSubmitting || !orderANo || !orderBNo}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin"></i> Đang thực thi...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-bolt text-amber-300"></i> Xác Nhận Tráo VIN Ngay
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};
