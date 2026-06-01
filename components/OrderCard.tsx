import React from 'react';
import { Order } from '../types';
import StatusBadge from './ui/StatusBadge';
import CarImage from './ui/CarImage';
import { getExteriorColorStyle } from '../utils/styleUtils';
import { useNightMode } from '../hooks/useNightMode';


// ... (Imports below will be cleaned up by removing unused ones)

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
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onViewDetails, processingOrder, showOrderInAdmin, isReferenceAccount }) => {
    const [copiedLabel, setCopiedLabel] = React.useState<string | null>(null);
    const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";
    const isProcessing = processingOrder === order["Số đơn hàng"];
    const isNight = useNightMode();

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl backdrop-blur-md border shadow-sm p-4 active:scale-[0.98] cursor-pointer flex flex-col h-full min-h-[130px] transition-all duration-300 ${isNight ? 'bg-slate-800/85 border-slate-600 hover:shadow-lg hover:shadow-slate-500/40 hover:border-slate-500 text-slate-100' : 'bg-white/90 border-slate-200/60 hover:shadow-lg hover:shadow-slate-200/60 hover:border-slate-300 text-slate-800'}`}
            onClick={() => onViewDetails(order)}
        >
            {/* Background Image - Slight fade (50%) as requested */}
            <div className={`absolute -right-8 -bottom-4 w-36 z-0 transition-all duration-700 ease-out group-hover:scale-110 group-hover:-translate-x-2 group-hover:-translate-y-1 transform animate-drive-in-right origin-bottom-right ${isNight ? 'opacity-30' : 'opacity-50'}`}>
                <CarImage
                    model={order['Dòng xe']}
                    exteriorColor={order['Ngoại thất']}
                    className="w-full h-auto object-contain drop-shadow-md"
                    alt=""
                />
            </div>

            {/* Content - Modern "Linear" Style */}
            <div className="relative z-10 flex flex-col flex-grow min-w-0">
                {/* Top Row: Order ID */}
                <div className="flex items-center mb-1.5">
                    <p
                        className={`text-[10px] uppercase tracking-wider font-bold cursor-pointer transition-colors ${copiedLabel === 'orderId' ? 'text-green-500' : (isNight ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-500 hover:text-blue-600')}`}
                        title="Click để sao chép Số đơn hàng"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(order["Số đơn hàng"]).then(() => {
                                setCopiedLabel('orderId');
                                setTimeout(() => setCopiedLabel(null), 2000);
                            });
                        }}
                    >
                        {copiedLabel === 'orderId' ? <span className="flex items-center gap-1"><i className="fas fa-check"></i> Copied</span> : `#${order["Số đơn hàng"]}`}
                    </p>
                </div>

                {/* Customer Name */}
                <h3
                    className={`text-[14px] font-semibold leading-tight truncate mb-2.5 cursor-pointer transition-colors ${copiedLabel === 'customer' ? 'text-green-500' : (isNight ? 'text-slate-200 hover:text-cyan-300' : 'text-slate-700 hover:text-blue-600')}`}
                    title="Click để sao chép tên khách hàng"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(order["Tên khách hàng"]).then(() => {
                            setCopiedLabel('customer');
                            setTimeout(() => setCopiedLabel(null), 2000);
                        });
                    }}
                >
                    {copiedLabel === 'customer' ? <span className="flex items-center gap-1"><i className="fas fa-check text-[11px]"></i> Đã copy</span> : order["Tên khách hàng"]}
                </h3>

                {/* Vehicle Data Pills */}
                <div className="flex flex-col items-start gap-1.5 mb-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium border ${isNight ? 'bg-slate-700/60 border-slate-600 text-slate-200' : 'bg-slate-50 border-slate-200/60 text-slate-700'}`}>
                        {order["Dòng xe"]} - {order["Phiên bản"]}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border ${isNight ? 'bg-slate-700/60 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200/60 text-slate-600'}`} title={`${order["Ngoại thất"]} / ${order["Nội thất"]}`}>
                        <span className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-inner shrink-0 bg-current" style={getExteriorColorStyle(order['Ngoại thất'])}></span>
                        <span className="truncate">{order["Ngoại thất"]} / {order["Nội thất"]}</span>
                    </span>
                </div>

                {/* Footer: Status Badge & Actions - Aligned Left to balance the car image on the right */}
                <div className="mt-auto flex items-center justify-start gap-2">
                    
                    <div className="scale-90 origin-left">
                        {isProcessing ? (
                            <i className="fas fa-spinner fa-spin text-accent-primary text-sm"></i>
                        ) : (
                            <StatusBadge status={statusText} size="sm" />
                        )}
                    </div>

                    {!isReferenceAccount && showOrderInAdmin && (() => {
                        const ketQua = (order["Kết quả"] || '').toLowerCase();
                        const INVOICE_STATUSES = ['chờ phê duyệt', 'đã phê duyệt', 'yêu cầu bổ sung', 'đã bổ sung', 'chờ ký hóa đơn', 'đã xuất hóa đơn'];
                        const hasInvoiceData = !!order.LinkHoaDonDaXuat || INVOICE_STATUSES.includes(ketQua);
                        const vcStatus = (order["Trạng thái VC"] || '').toLowerCase();
                        const hasVC = hasInvoiceData && (
                            vcStatus === 'chờ duyệt ycvc' ||
                            vcStatus.includes('đã duyệt') ||
                            vcStatus.includes('hoàn thành') ||
                            vcStatus.includes('đã phê duyệt') ||
                            vcStatus.includes('từ chối') ||
                            vcStatus.includes('hủy') ||
                            vcStatus.includes('đã cấp') ||
                            vcStatus.includes('đã có vc')
                        );

                        if (!hasInvoiceData && !!order.VIN) {
                            return (
                                <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'matching'); }}
                                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all opacity-0 group-hover:opacity-100 ${isNight ? 'bg-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white' : 'bg-slate-50 hover:bg-accent-primary hover:text-white text-slate-500 border border-slate-200'}`}
                                    title="Đến Ghép Xe">
                                    <i className="fas fa-car text-[11px]"></i>
                                </button>
                            );
                        }
                        if (hasInvoiceData) {
                            return (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'invoices'); }}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isNight ? 'bg-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white' : 'bg-slate-50 hover:bg-accent-primary hover:text-white text-slate-500 border border-slate-200'}`}
                                        title="Đến Hóa Đơn">
                                        <i className="fas fa-file-invoice-dollar text-[11px]"></i>
                                    </button>
                                    {hasVC && (
                                        <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'vc'); }}
                                            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all ${isNight ? 'bg-slate-700 text-slate-300 hover:bg-cyan-600 hover:text-white' : 'bg-slate-50 hover:bg-accent-primary hover:text-white text-slate-500 border border-slate-200'}`}
                                            title="Đến Xử Lý VC">
                                            <i className="fas fa-id-card text-[11px]"></i>
                                        </button>
                                    )}
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            </div>
        </div>

    );
};

export default React.memo(OrderCard);