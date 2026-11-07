import React, { useState, useMemo, useEffect } from 'react';
import { Order, StockVehicle } from '../../types';
import { adminChangeOrderVehicle } from '../../services/api/orderService';
import { adminDirectSwap } from '../../services/api/swapService';
import { supabase } from '../../services/supabaseClient';
import { formatShortWarehouseName } from '../../utils/stringUtils';

interface AdminChangeCarSheetInlineProps {
    order: Order;
    stockData?: StockVehicle[];
    allOrders?: Order[];
    onClose: () => void;
    onBackToEdit?: () => void;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: (newVin?: string) => void;
}

export const AdminChangeCarSheetInline: React.FC<AdminChangeCarSheetInlineProps> = ({
    order,
    stockData = [],
    allOrders = [],
    onClose,
    onBackToEdit,
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

    // Tự động tải tồn kho mới nhất từ Supabase
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
                console.warn('Lỗi tải tồn kho:', e);
            } finally {
                if (isMounted) setIsLoadingLiveStock(false);
            }
        };

        fetchLatestStock();
        return () => { isMounted = false; };
    }, [model]);

    const norm = (str?: string) => (str || '').toLowerCase().trim().normalize('NFC');

    // Lọc danh sách xe trong kho có sẵn
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

    // Lọc danh sách đơn hàng đối ứng để tráo đổi
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

    const handleConfirm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'STOCK') {
            if (!selectedVin) {
                showToast?.('Cảnh báo', 'Vui lòng chọn một số VIN trong kho!', 'warning');
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
                    showToast?.('Thành công', res.message || `Đã đổi sang VIN ${selectedVin} thành công!`, 'success');
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
                showToast?.('Cảnh báo', 'Vui lòng chọn 1 đơn hàng đối ứng để hoán đổi!', 'warning');
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
                    showToast?.('Thành công', res.message || 'Đã hoán đổi xe giữa 2 đơn hàng thành công!', 'success');
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
        <form onSubmit={handleConfirm} className="flex flex-col min-h-0 flex-1">
            {/* Header đồng bộ 100% với form Chỉnh sửa đơn hàng */}
            <div className="inline-action-header">
                <div className="flex items-center gap-1.5">
                    {onBackToEdit && (
                        <button
                            type="button"
                            onClick={onBackToEdit}
                            className="w-5 h-5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer mr-0.5"
                            title="Quay lại Chỉnh sửa đơn hàng"
                        >
                            <i className="fa-solid fa-arrow-left text-[10px]"></i>
                        </button>
                    )}
                    <strong>
                        <i className="fa-solid fa-arrows-rotate text-amber-500 text-[10px] mr-1"></i>
                        Đổi ghép xe
                    </strong>
                </div>
                <small>{orderNumber}</small>
                <button type="button" onClick={onClose} title="Đóng">
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            {/* Body */}
            <div className="inline-action-body">
                {/* Note trạng thái xe hiện tại */}
                <div className="inline-action-note" data-tone={currentVin ? 'amber' : 'green'}>
                    <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                            <i className={`fas ${currentVin ? 'fa-lock' : 'fa-circle-info'}`}></i>
                            <strong>VIN hiện tại:</strong>
                            {currentVin ? (
                                <span className="font-mono font-bold px-1.5 py-0.2 rounded bg-amber-200/70 text-amber-900">
                                    {currentVin}
                                </span>
                            ) : (
                                <span className="italic">Chưa ghép xe</span>
                            )}
                        </div>
                        <span className="text-[10px] opacity-75">
                            KH: <strong>{customerName}</strong> • TVBH: <strong>{tvbhName}</strong>
                        </span>
                    </div>
                    <div className="text-[10px] mt-0.5 opacity-80 truncate">
                        Cấu hình: <strong>{model} {version}</strong> • {exterior} / {interior}
                    </div>
                </div>

                {/* Chuyển đổi tab Kho xe rảnh / Tráo đổi đơn khác */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                    <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setMode('STOCK')}
                            className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                mode === 'STOCK'
                                    ? 'bg-white text-slate-800 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <i className="fa-solid fa-warehouse text-[9px] text-sky-600"></i>
                            <span>Xe kho ({availableStockCars.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('SWAP_ORDER')}
                            className={`px-2 py-0.5 rounded text-[10.5px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                mode === 'SWAP_ORDER'
                                    ? 'bg-white text-slate-800 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <i className="fa-solid fa-right-left text-[9px] text-slate-600"></i>
                            <span>Đơn khác ({eligibleSwapOrders.length})</span>
                        </button>
                    </div>

                    {mode === 'STOCK' && (
                        <label className="flex items-center gap-1 cursor-pointer select-none text-[10.5px] text-slate-600 font-medium">
                            <input
                                type="checkbox"
                                checked={strictColorMatch}
                                onChange={(e) => setStrictColorMatch(e.target.checked)}
                                className="w-3 h-3 rounded text-sky-600 focus:ring-sky-500 border-slate-300"
                            />
                            <span>Khớp màu 100%</span>
                        </label>
                    )}
                </div>

                {/* Tìm kiếm */}
                <div className="inline-action-field">
                    <input
                        type="text"
                        placeholder={mode === 'STOCK' ? 'Tìm theo số VIN, màu ngoại/nội thất, kho...' : 'Tìm theo mã đơn, tên KH, TVBH, số VIN...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Danh sách xe / đơn hàng */}
                <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-0.5">
                    {mode === 'STOCK' ? (
                        isLoadingLiveStock ? (
                            <div className="py-5 text-center text-slate-400 text-[11px]">
                                <i className="fa-solid fa-circle-notch fa-spin text-sm text-sky-500 mb-1"></i>
                                <p>Đang kiểm tra tồn kho...</p>
                            </div>
                        ) : availableStockCars.length === 0 ? (
                            <div className="py-5 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500">
                                <p className="text-[11px] font-semibold">Không có xe rảnh phù hợp trong kho</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {strictColorMatch ? 'Thử bỏ tích "Khớp màu 100%" để xem màu khác.' : 'Kho hiện không còn xe rảnh dòng này.'}
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
                                        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                            isSelected
                                                ? 'bg-sky-50/80 border-sky-400 shadow-2xs'
                                                : 'bg-white hover:bg-slate-50/80 border-slate-200/90'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                isSelected
                                                    ? 'border-sky-600 bg-sky-600 text-white'
                                                    : 'border-slate-300 bg-white'
                                            }`}>
                                                {isSelected && <i className="fa-solid fa-check text-[7px]"></i>}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-mono font-bold text-[11px] text-slate-900">
                                                        {car.VIN}
                                                    </span>
                                                    {isExactColor ? (
                                                        <span className="px-1 py-0.1 rounded text-[8.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            Khớp màu
                                                        </span>
                                                    ) : (
                                                        <span className="px-1 py-0.1 rounded text-[8.5px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                            Khác màu
                                                        </span>
                                                    )}
                                                    {whName && (
                                                        <span className="px-1 py-0.1 rounded text-[8.5px] font-medium bg-sky-50 text-sky-700 border border-sky-200">
                                                            {whName}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                    <span>{car['Ngoại thất']}</span> • <span>{car['Nội thất']}</span>
                                                    {car['Số máy'] && <span> • Máy: <span className="font-mono">{car['Số máy']}</span></span>}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-sky-600 text-white shadow-2xs'
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
                            <div className="py-5 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500">
                                <p className="text-[11px] font-semibold">Không tìm thấy đơn hàng cùng cấu hình</p>
                            </div>
                        ) : (
                            eligibleSwapOrders.map(o => {
                                const isSelected = selectedSwapOrderNo === o['Số đơn hàng'];
                                const targetVin = (o.VIN || '').trim();

                                return (
                                    <div
                                        key={o['Số đơn hàng']}
                                        onClick={() => setSelectedSwapOrderNo(o['Số đơn hàng'])}
                                        className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                            isSelected
                                                ? 'bg-sky-50/80 border-sky-400 shadow-2xs'
                                                : 'bg-white hover:bg-slate-50/80 border-slate-200/90'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                                isSelected
                                                    ? 'border-sky-600 bg-sky-600 text-white'
                                                    : 'border-slate-300 bg-white'
                                            }`}>
                                                {isSelected && <i className="fa-solid fa-check text-[7px]"></i>}
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1 flex-wrap text-[10.5px]">
                                                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1 py-0.1 rounded">
                                                        {o['Số đơn hàng']}
                                                    </span>
                                                    <span className="font-semibold text-slate-800 truncate max-w-[130px]">
                                                        {o['Tên khách hàng']}
                                                    </span>
                                                    <span className="text-[9.5px] text-slate-400">
                                                        ({o['Tên tư vấn bán hàng']})
                                                    </span>
                                                </div>

                                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                    VIN: {targetVin ? <span className="font-mono font-bold text-sky-700">{targetVin}</span> : <span className="italic">Chưa có VIN</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all shrink-0 ${
                                                isSelected
                                                    ? 'bg-sky-600 text-white shadow-2xs'
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
                <div className="inline-action-field pt-0.5">
                    <label>Lý do đổi xe (ghi nhận Audit Log):</label>
                    <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Nhập lý do đổi xe..."
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="inline-policy-footer">
                <button
                    type="button"
                    className="inline-action-cancel"
                    onClick={onClose}
                    disabled={isSubmitting}
                >
                    Đóng
                </button>

                <button
                    type="submit"
                    disabled={isSubmitting || (mode === 'STOCK' ? !selectedVin : !selectedSwapOrderNo)}
                >
                    {isSubmitting ? (
                        <>
                            <i className="fa-solid fa-circle-notch fa-spin mr-1"></i>
                            Đang xử lý...
                        </>
                    ) : (
                        '✓ Xác nhận đổi xe'
                    )}
                </button>
            </div>
        </form>
    );
};
export default AdminChangeCarSheetInline;

