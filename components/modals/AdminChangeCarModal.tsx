import React, { useState, useMemo, useEffect } from 'react';
import { Order, StockVehicle } from '../../types';
import { adminChangeOrderVehicle } from '../../services/api/orderService';
import { adminDirectSwap } from '../../services/api/swapService';
import { supabase } from '../../services/supabaseClient';
import { formatShortWarehouseName } from '../../utils/stringUtils';

interface AdminChangeCarModalProps {
    order: Order;
    stockData?: StockVehicle[];
    allOrders?: Order[];
    onClose: () => void;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: (newVin?: string) => void;
}

export const AdminChangeCarModal: React.FC<AdminChangeCarModalProps> = ({
    order,
    stockData = [],
    allOrders = [],
    onClose,
    showToast,
    onSuccess
}) => {
    const [mode, setMode] = useState<'STOCK' | 'SWAP_ORDER'>('STOCK');
    const [searchQuery, setSearchQuery] = useState('');
    const [strictColorMatch, setStrictColorMatch] = useState(true);
    const [selectedVin, setSelectedVin] = useState<string>('');
    const [selectedSwapOrderNo, setSelectedSwapOrderNo] = useState<string>('');
    const [reason, setReason] = useState('Admin điều phối xe showroom');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [liveStockCars, setLiveStockCars] = useState<StockVehicle[]>(stockData);
    const [isLoadingLiveStock, setIsLoadingLiveStock] = useState(false);

    const orderNumber = order['Số đơn hàng'];
    const currentVin = (order.VIN || '').trim();
    const customerName = order['Tên khách hàng'] || 'Chưa có tên KH';
    const tvbhName = order['Tên tư vấn bán hàng'] || 'TVBH';
    const model = (order['Dòng xe'] || '').trim();
    const version = (order['Phiên bản'] || '').trim();
    const exterior = (order['Ngoại thất'] || '').trim();
    const interior = (order['Nội thất'] || '').trim();

    // Tải dữ liệu kho xe mới nhất từ Supabase
    useEffect(() => {
        let isMounted = true;
        const fetchLatestStock = async () => {
            setIsLoadingLiveStock(true);
            try {
                const { data, error } = await supabase
                    .from('khoxe')
                    .select('*')
                    .eq('dong_xe', model)
                    .order('ngay_nhap', { ascending: true });

                if (!error && data && isMounted) {
                    const mapped: StockVehicle[] = data.map((c: any) => ({
                        VIN: c.vin,
                        'Dòng xe': c.dong_xe,
                        'Phiên bản': c.phien_ban,
                        'Ngoại thất': c.ngoai_that,
                        'Nội thất': c.noi_that,
                        'Trạng thái': c.trang_thai,
                        'Người Giữ Xe': c.nguoi_giu_xe,
                        'Thời Gian Hết Hạn Giữ': c.thoi_gian_het_han_giu,
                        'Vị trí': c.vi_tri || c.kho || '',
                        'Số máy': c.so_may,
                        'Mã DMS': c.ma_dms,
                        'Thời gian nhập': c.ngay_nhap
                    }));
                    setLiveStockCars(mapped);
                }
            } catch (e) {
                console.warn('Lỗi tải lại kho xe:', e);
            } finally {
                if (isMounted) setIsLoadingLiveStock(false);
            }
        };

        fetchLatestStock();
        return () => { isMounted = false; };
    }, [model]);

    const norm = (str?: string) => (str || '').toLowerCase().trim().normalize('NFC');

    // Danh sách xe trong kho có sẵn
    const availableStockCars = useMemo(() => {
        const orderPrefix = orderNumber.substring(0, 6).toUpperCase();

        return liveStockCars.filter(car => {
            if (currentVin && car.VIN.trim().toUpperCase() === currentVin.toUpperCase()) return false;

            const carStatus = (car['Trạng thái'] || '').trim().toLowerCase();
            if (carStatus !== 'chưa ghép' && carStatus !== '') return false;

            if (car['Mã DMS']) {
                const carDms = car['Mã DMS'].toUpperCase();
                if (carDms !== orderPrefix) return false;
            }

            const carModel = (car['Dòng xe'] || '').trim();
            if (model && norm(carModel) !== norm(model)) return false;

            const carVer = (car['Phiên bản'] || '').trim();
            if (version && norm(carVer) !== norm(version)) return false;

            if (strictColorMatch) {
                const carExt = norm(car['Ngoại thất']);
                const carInt = norm(car['Nội thất']);
                const ordExt = norm(exterior);
                const ordInt = norm(interior);
                const extMatch = carExt.includes(ordExt) || ordExt.includes(carExt);
                const intMatch = carInt.includes(ordInt) || ordInt.includes(carInt);
                if (!extMatch || !intMatch) return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchVin = car.VIN.toLowerCase().includes(q);
                const matchExt = (car['Ngoại thất'] || '').toLowerCase().includes(q);
                const matchInt = (car['Nội thất'] || '').toLowerCase().includes(q);
                const matchLoc = (car['Vị trí'] || '').toLowerCase().includes(q);
                if (!matchVin && !matchExt && !matchInt && !matchLoc) return false;
            }

            return true;
        });
    }, [liveStockCars, currentVin, orderNumber, model, version, exterior, interior, strictColorMatch, searchQuery]);

    // Danh sách đơn hàng khác cùng cấu hình để hoán đổi
    const eligibleSwapOrders = useMemo(() => {
        return allOrders.filter(o => {
            if (o['Số đơn hàng'] === orderNumber) return false;
            const res = (o['Kết quả'] || '').trim().toLowerCase();
            if (res.includes('hóa đơn') || res.includes('hủy')) return false;

            if (norm(o['Dòng xe']) !== norm(model)) return false;
            if (norm(o['Phiên bản']) !== norm(version)) return false;
            if (norm(o['Ngoại thất']) !== norm(exterior)) return false;
            if (norm(o['Nội thất']) !== norm(interior)) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchNo = (o['Số đơn hàng'] || '').toLowerCase().includes(q);
                const matchCust = (o['Tên khách hàng'] || '').toLowerCase().includes(q);
                const matchSale = (o['Tên tư vấn bán hàng'] || '').toLowerCase().includes(q);
                const matchVin = (o.VIN || '').toLowerCase().includes(q);
                if (!matchNo && !matchCust && !matchSale && !matchVin) return false;
            }

            return true;
        });
    }, [allOrders, orderNumber, model, version, exterior, interior, searchQuery]);

    const handleConfirm = async () => {
        if (mode === 'STOCK') {
            if (!selectedVin) {
                showToast?.('Cảnh báo', 'Vui lòng bấm chọn một số VIN trong danh sách xe kho!', 'warning');
                return;
            }

            setIsSubmitting(true);
            try {
                const res = await adminChangeOrderVehicle({
                    orderNumber,
                    newVin: selectedVin,
                    reason: reason.trim()
                });

                if (res.status === 'SUCCESS') {
                    showToast?.('Thành công', res.message || `Đã đổi ghép sang VIN ${selectedVin} thành công!`, 'success');
                    onSuccess?.(selectedVin);
                    onClose();
                } else {
                    showToast?.('Lỗi', res.message || 'Không thể đổi xe', 'error');
                }
            } catch (err: any) {
                showToast?.('Lỗi', err.message || 'Đã xảy ra lỗi khi đổi xe', 'error');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            if (!selectedSwapOrderNo) {
                showToast?.('Cảnh báo', 'Vui lòng chọn 1 đơn hàng đối ứng để hoán đổi xe!', 'warning');
                return;
            }

            setIsSubmitting(true);
            try {
                const res = await adminDirectSwap({
                    orderA: orderNumber,
                    orderB: selectedSwapOrderNo,
                    reason: reason.trim()
                });

                if (res.status === 'SUCCESS') {
                    showToast?.('Thành công', res.message || 'Đã hoán đổi xe trực tiếp giữa 2 đơn hàng thành công!', 'success');
                    onSuccess?.();
                    onClose();
                } else {
                    showToast?.('Lỗi', res.message || 'Không thể hoán đổi xe', 'error');
                }
            } catch (err: any) {
                showToast?.('Lỗi', err.message || 'Đã xảy ra lỗi khi hoán đổi xe', 'error');
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
            {/* Modal Card - Thiết kế đồng bộ 100% với form Chỉnh sửa đơn hàng (Clean Minimalist Card) */}
            <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/90 text-slate-800">
                {/* Header thanh lịch đồng bộ với inline-action-header */}
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                            <i className="fa-solid fa-arrows-rotate text-sky-600 text-xs"></i>
                            Đổi ghép xe
                        </strong>
                        <span className="text-xs text-slate-400 font-mono">
                            {orderNumber}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                        title="Đóng"
                    >
                        <i className="fa-solid fa-xmark text-sm"></i>
                    </button>
                </div>

                {/* Body Area */}
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                    {/* Note trạng thái xe hiện tại - dùng chuẩn inline-action-note */}
                    <div className="inline-action-note" data-tone={currentVin ? 'amber' : 'green'}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs">
                                <i className={`fas ${currentVin ? 'fa-lock' : 'fa-circle-info'}`}></i>
                                <strong>VIN hiện tại:</strong>
                                {currentVin ? (
                                    <span className="font-mono font-bold tracking-wide px-1.5 py-0.5 rounded bg-amber-100/90 text-amber-900">
                                        {currentVin}
                                    </span>
                                ) : (
                                    <span className="italic">Chưa ghép xe</span>
                                )}
                            </div>
                            <div className="text-[11px] font-medium opacity-90">
                                KH: <strong>{customerName}</strong> • TVBH: <strong>{tvbhName}</strong>
                            </div>
                        </div>
                        <div className="text-[11px] mt-1 opacity-80">
                            Cấu hình: <strong>{model} {version}</strong> | Ngoại thất: <strong>{exterior}</strong> | Nội thất: <strong>{interior}</strong>
                        </div>
                    </div>

                    {/* Tabs chuyển đổi giữa Kho xe rảnh và Tráo đổi với Đơn khác */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
                            <button
                                type="button"
                                onClick={() => setMode('STOCK')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    mode === 'STOCK'
                                        ? 'bg-white text-slate-800 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <i className="fa-solid fa-warehouse text-[10px] text-sky-600"></i>
                                <span>Xe rảnh trong kho ({availableStockCars.length})</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('SWAP_ORDER')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                    mode === 'SWAP_ORDER'
                                        ? 'bg-white text-slate-800 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <i className="fa-solid fa-right-left text-[10px] text-slate-600"></i>
                                <span>Tráo đổi đơn khác ({eligibleSwapOrders.length})</span>
                            </button>
                        </div>

                        {mode === 'STOCK' && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] text-slate-600 font-medium">
                                <input
                                    type="checkbox"
                                    checked={strictColorMatch}
                                    onChange={(e) => setStrictColorMatch(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                                />
                                <span>Khớp 100% màu</span>
                            </label>
                        )}
                    </div>

                    {/* Search Field */}
                    <div className="inline-action-field">
                        <input
                            type="text"
                            placeholder={mode === 'STOCK' ? 'Tìm theo số VIN, màu ngoại/nội thất, vị trí kho...' : 'Tìm theo mã đơn hàng, tên KH, TVBH, số VIN...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs"
                        />
                    </div>

                    {/* Danh sách xe / đơn hàng */}
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-0.5">
                        {mode === 'STOCK' ? (
                            isLoadingLiveStock ? (
                                <div className="p-6 text-center text-slate-400 text-xs">
                                    <i className="fa-solid fa-circle-notch fa-spin text-base text-sky-500 mb-1.5"></i>
                                    <p>Đang kiểm tra kho xe thời gian thực...</p>
                                </div>
                            ) : availableStockCars.length === 0 ? (
                                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-xs font-semibold text-slate-600">Không có xe rảnh phù hợp trong kho</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {strictColorMatch
                                            ? 'Hãy thử bỏ tích "Khớp 100% màu" để tìm các màu khác cùng dòng xe.'
                                            : 'Toàn bộ xe cùng dòng đã được giữ hoặc đã ghép đơn.'}
                                    </p>
                                </div>
                            ) : (
                                availableStockCars.map(car => {
                                    const isSelected = selectedVin === car.VIN;
                                    const isExactColor = norm(car['Ngoại thất']) === norm(exterior) && norm(car['Nội thất']) === norm(interior);
                                    const whName = formatShortWarehouseName(car['Vị trí'] || '');

                                    return (
                                        <div
                                            key={car.VIN}
                                            onClick={() => setSelectedVin(car.VIN)}
                                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                                isSelected
                                                    ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-300/40 shadow-xs'
                                                    : 'bg-white hover:bg-slate-50/80 border-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                        ? 'border-sky-600 bg-sky-600 text-white'
                                                        : 'border-slate-300 bg-white'
                                                }`}>
                                                    {isSelected && <i className="fa-solid fa-check text-[8px]"></i>}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono font-bold text-xs text-slate-900">
                                                            {car.VIN}
                                                        </span>
                                                        {isExactColor ? (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                Khớp 100% màu
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                                Khác màu
                                                            </span>
                                                        )}
                                                        {whName && (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                                                                {whName}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="text-[10.5px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                        <span>Ngoại thất: <strong className="text-slate-700">{car['Ngoại thất']}</strong></span>
                                                        <span>•</span>
                                                        <span>Nội thất: <strong className="text-slate-700">{car['Nội thất']}</strong></span>
                                                        {car['Số máy'] && (
                                                            <>
                                                                <span>•</span>
                                                                <span>Máy: <span className="font-mono text-slate-600">{car['Số máy']}</span></span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                                                    isSelected
                                                        ? 'bg-sky-600 text-white shadow-xs'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {isSelected ? 'Đã Chọn' : 'Chọn'}
                                            </button>
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            eligibleSwapOrders.length === 0 ? (
                                <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-xs font-semibold text-slate-600">Không tìm thấy đơn hàng cùng cấu hình để hoán đổi</p>
                                </div>
                            ) : (
                                eligibleSwapOrders.map(o => {
                                    const isSelected = selectedSwapOrderNo === o['Số đơn hàng'];
                                    const targetVin = (o.VIN || '').trim();

                                    return (
                                        <div
                                            key={o['Số đơn hàng']}
                                            onClick={() => setSelectedSwapOrderNo(o['Số đơn hàng'])}
                                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                                                isSelected
                                                    ? 'bg-sky-50/70 border-sky-400 ring-2 ring-sky-300/40 shadow-xs'
                                                    : 'bg-white hover:bg-slate-50/80 border-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                    isSelected
                                                        ? 'border-sky-600 bg-sky-600 text-white'
                                                        : 'border-slate-300 bg-white'
                                                }`}>
                                                    {isSelected && <i className="fa-solid fa-check text-[8px]"></i>}
                                                </div>

                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            {o['Số đơn hàng']}
                                                        </span>
                                                        <span className="font-bold text-xs text-slate-800 truncate">
                                                            {o['Tên khách hàng']}
                                                        </span>
                                                        <span className="text-[10.5px] text-slate-500">
                                                            (TVBH: {o['Tên tư vấn bán hàng']})
                                                        </span>
                                                    </div>

                                                    <div className="text-[10.5px] text-slate-600 mt-0.5 flex items-center gap-1.5">
                                                        <span>VIN đối ứng:</span>
                                                        {targetVin ? (
                                                            <span className="font-mono font-bold text-sky-700 bg-sky-100/70 px-1 py-0.2 rounded">
                                                                {targetVin}
                                                            </span>
                                                        ) : (
                                                            <span className="italic text-slate-400">Chưa có VIN</span>
                                                        )}
                                                        <span>• Trạng thái: {o['Kết quả'] || 'Chưa ghép'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                                                    isSelected
                                                        ? 'bg-sky-600 text-white shadow-xs'
                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            >
                                                {isSelected ? 'Đã Chọn' : 'Chọn'}
                                            </button>
                                        </div>
                                    );
                                })
                            )
                        )}
                    </div>

                    {/* Lý do đổi xe */}
                    <div className="inline-action-field pt-1">
                        <label>Lý do đổi xe (ghi nhật ký Audit Log):</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nhập lý do đổi xe..."
                            className="w-full text-xs"
                        />
                    </div>
                </div>

                {/* Footer đồng bộ với inline-policy-footer */}
                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-slate-500 hover:text-slate-800 text-xs font-medium px-2 py-1 transition-colors cursor-pointer"
                    >
                        Đóng
                    </button>

                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSubmitting || (mode === 'STOCK' ? !selectedVin : !selectedSwapOrderNo)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-1.5 shadow-xs"
                    >
                        {isSubmitting ? (
                            <>
                                <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                                <span>Đang xử lý...</span>
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-check text-xs"></i>
                                <span>Xác nhận đổi xe</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default AdminChangeCarModal;
