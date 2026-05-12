import React from 'react';
import { Order } from '../types';
import StatusBadge from './ui/StatusBadge';
import CarImage from './ui/CarImage';
import { getExteriorColorStyle } from '../utils/styleUtils';


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

    return (
        <div
            className="group relative overflow-hidden rounded-2xl glass-card p-4 shadow-sm active:scale-[0.98] cursor-pointer flex flex-col h-full min-h-[160px]"
            onClick={() => onViewDetails(order)}
        >
            {/* Background Image - clearer with animation */}
            <div className="absolute -right-10 -bottom-6 w-48 z-0 transition-all duration-700 ease-out group-hover:scale-125 group-hover:-translate-x-4 group-hover:-translate-y-2 group-hover:opacity-100 group-hover:rotate-0 opacity-60 transform -rotate-12 animate-drive-in-right origin-bottom-right">
                <CarImage
                    model={order['Dòng xe']}
                    exteriorColor={order['Ngoại thất']}
                    className="w-full h-auto object-contain drop-shadow-xl"
                    alt=""
                />
            </div>



            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent z-5"></div>


            {/* Content */}
            <div className="relative z-10 flex flex-col flex-grow gap-1.5 min-w-0">

                <div className="flex justify-between items-start">
                    <p
                        className={`text-sm font-bold leading-tight pr-2 truncate cursor-pointer transition-colors ${copiedLabel === 'customer' ? 'text-green-500' : 'text-light-text-primary hover:text-accent-primary'}`}
                        title="Click để sao chép tên khách hàng"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(order["Tên khách hàng"]).then(() => {
                                setCopiedLabel('customer');
                                setTimeout(() => setCopiedLabel(null), 2000);
                            });
                        }}
                    >
                        {copiedLabel === 'customer' ? <span className="flex items-center gap-1"><i className="fas fa-check text-[10px]"></i> Đã copy</span> : order["Tên khách hàng"]}
                    </p>
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isProcessing && (
                            <div className="flex items-center justify-center w-8 h-8">
                                <i className="fas fa-spinner fa-spin text-accent-primary text-lg"></i>
                            </div>
                        )}
                    </div>
                </div>
                <p
                    className={`text-xs font-mono truncate cursor-pointer transition-colors ${copiedLabel === 'orderId' ? 'text-green-500 font-bold' : 'text-light-text-secondary hover:text-accent-primary'}`}
                    title="Click để sao chép Số đơn hàng"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(order["Số đơn hàng"]).then(() => {
                            setCopiedLabel('orderId');
                            setTimeout(() => setCopiedLabel(null), 2000);
                        });
                    }}
                >
                    {copiedLabel === 'orderId' ? <span className="flex items-center gap-1"><i className="fas fa-check text-[9px]"></i> Đã copy</span> : order["Số đơn hàng"]}
                </p>
                <div className="text-xs text-light-text-secondary space-y-1 my-1 py-1 border-y border-dashed">
                    <p className="truncate" title={`${order["Dòng xe"]} - ${order["Phiên bản"]}`}>
                        <i className="fas fa-car fa-fw mr-1.5 text-slate-400"></i> {order["Dòng xe"]} - {order["Phiên bản"]}
                    </p>
                    <p className="truncate font-medium" title={`${order["Ngoại thất"]} / ${order["Nội thất"]}`}>
                        <i className="fas fa-palette fa-fw mr-1.5 text-slate-400"></i>
                        <span style={getExteriorColorStyle(order['Ngoại thất'])}>{order["Ngoại thất"]}</span>
                        <span> / {order["Nội thất"]}</span>
                    </p>
                </div>
                <div className="flex items-center justify-between text-xs text-light-text-secondary">
                    <div className="flex items-center gap-1.5 truncate" title={`TVBH: ${order["Tên tư vấn bán hàng"]}`}>
                        <i className="fas fa-user-tie fa-fw text-slate-400"></i>
                        <span className="truncate">{order["Tên tư vấn bán hàng"]}</span>
                    </div>
                </div>
                <div className="mt-auto pt-2 flex items-center justify-between">
                    <StatusBadge status={statusText} />

                    {!isReferenceAccount && showOrderInAdmin && (() => {
                        const ketQua = (order["Kết quả"] || '').toLowerCase();
                        // Khớp với TT có trong InvoiceInboxView (tất cả folder)
                        const INVOICE_STATUSES = ['chờ phê duyệt', 'đã phê duyệt', 'yêu cầu bổ sung', 'đã bổ sung', 'chờ ký hóa đơn', 'đã xuất hóa đơn'];
                        const hasInvoiceData = !!order.LinkHoaDonDaXuat || INVOICE_STATUSES.includes(ketQua);
                        // Chỉ hiện nút VC khi có record thực sự trong tab Xử Lý VC (khớp với folder filter của VcInboxView)
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

                        // Giai đoạn 1: Chỉ mới ghép xe, chưa xuất hóa đơn
                        if (!hasInvoiceData && !!order.VIN) {
                            return (
                                <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'matching'); }}
                                    className="w-9 h-9 lg:w-7 lg:h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50 opacity-0 group-hover:opacity-100"
                                    title="Đến Ghép Xe">
                                    <i className="fas fa-car text-[13px] lg:text-[10px]"></i>
                                </button>
                            );
                        }
                        // Giai đoạn 2+3: Đã xuất hóa đơn (+ có thể có VC)
                        if (hasInvoiceData) {
                            return (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'invoices'); }}
                                        className="w-9 h-9 lg:w-7 lg:h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50"
                                        title="Đến Hóa Đơn">
                                        <i className="fas fa-file-invoice-dollar text-[13px] lg:text-[10px]"></i>
                                    </button>
                                    {hasVC && (
                                        <button onClick={(e) => { e.stopPropagation(); showOrderInAdmin(order, 'vc'); }}
                                            className="w-9 h-9 lg:w-7 lg:h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-400 transition-all border border-slate-200/50"
                                            title="Đến Xử Lý VC">
                                            <i className="fas fa-id-card text-[13px] lg:text-[10px]"></i>
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