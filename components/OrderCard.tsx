import React from 'react';
import { Order } from '../types';
import StatusBadge from './ui/StatusBadge';
import CarImage from './ui/CarImage';
import { getBackgroundColorStyle } from '../utils/styleUtils';
import { useNightMode } from '../hooks/useNightMode';
import MarqueeText from './ui/MarqueeText';

interface OrderCardProps {
    order: Order;
    onViewDetails: (order: Order) => void;
    onCancel: (order: Order) => void;
    onRequestInvoice: (order: Order) => void;
    onSupplement: (order: Order) => void;
    onEdit?: (order: Order) => void;
    onConfirmVC: (order: Order) => void;
    processingOrder: string | null;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
    showAdminTab?: (targetTab: any) => void;
    isReferenceAccount?: boolean;
    selectedOrderId?: string | null;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onViewDetails, processingOrder, showOrderInAdmin, isReferenceAccount, selectedOrderId }) => {
    const [copiedLabel, setCopiedLabel] = React.useState<string | null>(null);
    const statusText = order["Kết quả"] || order["Trạng thái VC"] || "Chưa ghép";
    const isProcessing = processingOrder === order["Số đơn hàng"];
    const isNight = useNightMode();
    const isSelected = selectedOrderId === order["Số đơn hàng"];

    // Status color mapping
    const getStatusAccent = () => {
        const s = statusText.toLowerCase();
        if (s.includes('đã xuất') || s.includes('hoàn thành')) return { dot: 'bg-emerald-400', ring: 'ring-emerald-400/30', glow: 'shadow-emerald-100' };
        if (s.includes('đã ghép') || s.includes('đã phê duyệt')) return { dot: 'bg-sky-400', ring: 'ring-sky-400/30', glow: 'shadow-sky-100' };
        if (s.includes('chờ') || s.includes('pending')) return { dot: 'bg-amber-400', ring: 'ring-amber-400/30', glow: 'shadow-amber-100' };
        if (s.includes('hủy') || s.includes('từ chối')) return { dot: 'bg-rose-400', ring: 'ring-rose-400/30', glow: 'shadow-rose-100' };
        return { dot: 'bg-slate-300', ring: 'ring-slate-300/30', glow: 'shadow-slate-100' };
    };

    const accent = getStatusAccent();

    const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
            setCopiedLabel(label);
            setTimeout(() => setCopiedLabel(null), 1800);
        });
    };

    // Admin shortcut buttons
    const adminButton = (() => {
        if (isReferenceAccount || !showOrderInAdmin) return null;
        const ketQua = (order["Kết quả"] || '').toLowerCase();
        const INVOICE_STATUSES = ['chờ phê duyệt', 'đã phê duyệt', 'yêu cầu bổ sung', 'đã bổ sung', 'chờ ký hóa đơn', 'đã xuất hóa đơn'];
        const hasInvoiceData = !!order.LinkHoaDonDaXuat || INVOICE_STATUSES.includes(ketQua);
        const vcStatus = (order["Trạng thái VC"] || '').toLowerCase();
        const hasVC = hasInvoiceData && (
            vcStatus === 'chờ duyệt ycvc' || vcStatus.includes('đã duyệt') || vcStatus.includes('hoàn thành') ||
            vcStatus.includes('đã phê duyệt') || vcStatus.includes('từ chối') || vcStatus.includes('hủy') ||
            vcStatus.includes('đã cấp') || vcStatus.includes('đã có vc')
        );

        const btnCls = `w-6 h-6 flex items-center justify-center rounded-md transition-all ${
            isNight ? 'bg-slate-700 text-slate-300 hover:bg-sky-600 hover:text-white' : 'bg-slate-100 hover:bg-sky-500 hover:text-white text-slate-500'
        }`;

        if (!hasInvoiceData && !!order.VIN) {
            return (
                <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'matching'); }} className={btnCls} title="Ghép xe">
                    <i className="fas fa-car text-[9px]"></i>
                </button>
            );
        }
        if (hasInvoiceData) {
            return (
                <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'invoices'); }} className={btnCls} title="Hóa đơn">
                        <i className="fas fa-file-invoice-dollar text-[9px]"></i>
                    </button>
                    {hasVC && (
                        <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'vc'); }} className={btnCls} title="VinClub">
                            <i className="fas fa-id-card text-[9px]"></i>
                        </button>
                    )}
                </div>
            );
        }
        return null;
    })();

    return (
        <div
            onClick={() => onViewDetails(order)}
            className={`group relative flex items-stretch gap-0 rounded-2xl border cursor-pointer transition-all duration-300 active:scale-[0.99] overflow-hidden select-none ${
                isSelected
                    ? (isNight
                        ? 'bg-sky-950/80 border-sky-400 shadow-[0_10px_25px_-5px_rgba(14,165,233,0.3),inset_0_1px_1px_rgba(255,255,255,0.15)] ring-2 ring-sky-400/50 -translate-y-0.5'
                        : 'bg-gradient-to-r from-sky-50 via-white to-sky-50/70 border-sky-400 shadow-[0_10px_25px_-4px_rgba(14,165,233,0.22),inset_0_1px_2px_rgba(255,255,255,1)] ring-2 ring-sky-400/40 -translate-y-0.5')
                    : (isNight
                        ? 'bg-slate-800/90 border-slate-700/80 hover:border-slate-500 hover:bg-slate-800 hover:-translate-y-0.5 hover:shadow-lg'
                        : 'bg-white/95 backdrop-blur-xl border-slate-200/90 shadow-[0_3px_10px_-2px_rgba(15,23,42,0.05),inset_0_1px_1px_rgba(255,255,255,1)] hover:border-sky-300/80 hover:bg-white hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50')
            }`}
        >
            {/* Left accent bar with status color */}
            <div className={`w-[4px] flex-shrink-0 self-stretch rounded-l-2xl transition-all duration-300 ${
                isSelected ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]' : `${accent.dot} opacity-70 group-hover:opacity-100`
            }`} />

            {/* Main content */}
            <div className="flex-1 min-w-0 flex items-center gap-3 px-3 py-2.5">

                {/* Showroom Showcase Car Pedestal (Bệ đỡ mô hình xe) */}
                <div className={`w-16 h-11 flex-shrink-0 relative overflow-hidden rounded-xl transition-all duration-300 flex items-center justify-center p-0.5 ${
                    isNight 
                        ? 'bg-gradient-to-b from-slate-700/70 via-slate-800/80 to-slate-900 border border-slate-600/50 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.4)]' 
                        : 'bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/80 border border-slate-200/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.9),0_2px_6px_rgba(15,23,42,0.06)]'
                } group-hover:scale-105`}>
                    {/* Pedestal Ground Shadow */}
                    <div className="absolute bottom-1 left-2 right-2 h-2 bg-slate-900/10 rounded-full blur-[2px] pointer-events-none" />

                    <CarImage
                        model={order['Dòng xe']}
                        exteriorColor={order['Ngoại thất']}
                        version={order['Phiên bản']}
                        className="w-full h-full object-contain object-center relative z-10"
                        alt=""
                        hideDecal
                    />
                </div>

                {/* Text info */}
                <div className="flex-1 min-w-0">

                    {/* Customer name */}
                    <MarqueeText
                        text={copiedLabel === 'customer' ? '✓ Đã sao chép' : (order["Tên khách hàng"] || '—')}
                        className={`text-[13px] font-extrabold leading-tight cursor-pointer transition-colors mb-1 uppercase tracking-tight ${
                            copiedLabel === 'customer'
                                ? 'text-emerald-500'
                                : (isNight ? 'text-slate-100 hover:text-cyan-300' : 'text-slate-800 hover:text-sky-600')
                        }`}
                        onClick={(e) => handleCopy(e, order["Tên khách hàng"], 'customer')}
                        title={order["Tên khách hàng"]}
                    />

                    {/* Vehicle + color row */}
                    <div className="flex items-center gap-1.5">
                        <span className={`text-[10.5px] font-semibold truncate ${isNight ? 'text-slate-400' : 'text-slate-600'}`}>
                            {order["Dòng xe"]}{order["Phiên bản"] ? ` · ${order["Phiên bản"]}` : ''}
                        </span>
                        {order["Ngoại thất"] && (
                            <>
                                <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isNight ? 'bg-slate-600' : 'bg-slate-300'}`} />
                                <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/15 flex-shrink-0 shadow-xs"
                                    style={getBackgroundColorStyle(order['Ngoại thất'])}
                                    title={order["Ngoại thất"]}
                                />
                            </>
                        )}
                        {order.is_flex_match && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 rounded-md" title={`Màu ngoại thất phụ: ${(order.ngoai_that_flex || []).join(', ') || 'Tất cả'}`}>
                                <i className="fas fa-random text-[8px]"></i> Flex
                            </span>
                        )}
                    </div>
                </div>

                {/* Right section: status + admin buttons */}
                <div className="flex flex-col items-end justify-between gap-1.5 flex-shrink-0 self-stretch py-0.5">
                    {isProcessing ? (
                        <div className={`flex items-center gap-1 text-[10px] font-semibold ${isNight ? 'text-sky-400' : 'text-sky-500'}`}>
                            <i className="fas fa-spinner fa-spin text-[9px]"></i>
                            <span>Đang xử lý</span>
                        </div>
                    ) : (
                        <StatusBadge status={statusText} size="sm" />
                    )}
                    {adminButton && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {adminButton}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(OrderCard);