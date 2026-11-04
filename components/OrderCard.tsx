import React from 'react';
import { Order } from '../types';
import StatusBadge from './ui/StatusBadge';
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

    // Status color mapping for left accent bar
    const getStatusAccent = () => {
        const s = statusText.toLowerCase();
        if (s.includes('đã xuất') || s.includes('hoàn thành')) return { bar: 'bg-[#28805f]' };
        if (s.includes('đã ghép') || s.includes('đã phê duyệt')) return { bar: 'bg-[#3375cb]' };
        if (s.includes('chờ') || s.includes('pending')) return { bar: 'bg-[#e59b2b]' };
        if (s.includes('hủy') || s.includes('từ chối')) return { bar: 'bg-[#d58e95]' };
        return { bar: 'bg-[#cdd7e5]' };
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

        const btnCls = `w-6 h-6 flex items-center justify-center rounded-lg transition-all border ${
            isNight
                ? 'bg-slate-700/80 border-slate-600 text-slate-300 hover:bg-[#3375cb] hover:text-white hover:border-[#3375cb]'
                : 'bg-[#f1f5fa] border-[#e6edf6] text-[#7a8da7] hover:bg-[#eaf1fb] hover:text-[#3375cb] hover:border-[#c8dcf9]'
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
            data-selected={isSelected}
            className={`ios-order-card group relative flex items-stretch rounded-[12px] border cursor-pointer transition-all duration-200 active:scale-[0.99] overflow-hidden select-none ${
                isSelected
                    ? (isNight
                        ? 'bg-blue-950/40 border-blue-500/80 shadow-[0_2px_12px_-2px_rgba(51,117,203,0.3)] ring-1 ring-blue-500/40'
                        : 'bg-[#eaf2ff] border-[#c8dcf9] shadow-[0_2px_10px_-2px_rgba(40,115,214,0.18),inset_0_0_0_0.5px_#c8dcf9]')
                    : (isNight
                        ? 'bg-slate-800/80 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 shadow-[0_1px_3px_rgba(0,0,0,0.2)]'
                        : 'bg-[#ffffff] border-[#e9eef5] hover:bg-[#f7fafe] hover:border-[#c6d9f3] shadow-[0_1px_3px_rgba(25,50,79,0.03)]')
            }`}
        >
            {/* Left accent bar matching the sheet palette */}
            <div className={`w-[3.5px] flex-shrink-0 self-stretch rounded-l-[12px] transition-all duration-200 ${
                isSelected
                    ? 'bg-[#3375cb] shadow-[0_0_6px_rgba(51,117,203,0.6)]'
                    : `${accent.bar} opacity-60 group-hover:opacity-100`
            }`} />

            {/* Main content */}
            <div className="flex-1 min-w-0 flex items-center justify-between gap-3 px-3.5 py-2.5">

                {/* Text info */}
                <div className="flex-1 min-w-0">

                    {/* Customer name */}
                    <MarqueeText
                        text={copiedLabel === 'customer' ? '✓ Đã sao chép' : (order["Tên khách hàng"] || '—')}
                        className={`text-[13px] leading-snug cursor-pointer transition-colors mb-0.5 truncate uppercase ${
                            copiedLabel === 'customer'
                                ? 'text-emerald-500 font-semibold'
                                : isSelected
                                    ? (isNight ? 'text-blue-300 font-bold' : 'text-[#3375cb] font-bold')
                                    : (isNight ? 'text-slate-100 font-semibold group-hover:text-cyan-300' : 'text-[#304560] font-semibold group-hover:text-[#3375cb]')
                        }`}
                        onClick={(e) => handleCopy(e, order["Tên khách hàng"], 'customer')}
                        title={order["Tên khách hàng"]}
                    />

                    {/* Vehicle + color row */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={`truncate ${
                            isSelected
                                ? (isNight ? 'text-blue-300/80 font-medium' : 'text-[#527fb7] font-medium')
                                : (isNight ? 'text-slate-400 font-normal' : 'text-[#7a8da7] font-normal')
                        }`}>
                            {order["Dòng xe"]}{order["Phiên bản"] ? ` · ${order["Phiên bản"]}` : ''}
                        </span>
                        {order["Ngoại thất"] && (
                            <>
                                <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isNight ? 'bg-slate-600' : 'bg-[#cdd7e5]'}`} />
                                <span
                                    className="w-2.5 h-2.5 rounded-full border border-black/10 flex-shrink-0 shadow-2xs"
                                    style={getBackgroundColorStyle(order['Ngoại thất'])}
                                    title={order["Ngoại thất"]}
                                />
                            </>
                        )}
                        {order.is_flex_match && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#3375cb] bg-[#eaf2ff] border border-[#c8dcf9] px-1.5 py-0.2 rounded-md" title={`Màu ngoại thất phụ: ${(order.ngoai_that_flex || []).join(', ') || 'Tất cả'}`}>
                                <i className="fas fa-random text-[7.5px]"></i> Flex
                            </span>
                        )}
                        {(() => {
                            const coc = order['Ngày COC về'] || order.ngay_coc_ve;
                            const hasCoc = Boolean(coc || (order['Ghi chú Admin'] || order.ghi_chu_admin || '').toString().includes('COC về'));
                            if (!hasCoc) return null;
                            return (
                                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-semibold text-[#28805f] bg-[#edf7f2] border border-[#cce8dc] px-1.5 py-0.2 rounded-md" title={coc ? `Hồ sơ COC về ngày ${coc}` : 'Đã về COC'}>
                                    <i className="fas fa-certificate text-[7px] text-[#28805f]"></i> COC
                                </span>
                            );
                        })()}
                    </div>
                </div>

                {/* Right section: status + admin buttons */}
                <div className="flex flex-col items-end justify-between gap-1.5 flex-shrink-0 self-stretch py-0.5">
                    {isProcessing ? (
                        <div className={`flex items-center gap-1 text-[10px] font-medium ${isNight ? 'text-sky-400' : 'text-[#3375cb]'}`}>
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
