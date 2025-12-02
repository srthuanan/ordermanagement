import React from 'react';
import { Order } from '../types';
import StatusBadge from './ui/StatusBadge';
import ActionMenu from './ui/ActionMenu';
import CarImage from './ui/CarImage';
import { getExteriorColorStyle } from '../utils/styleUtils';

interface OrderCardProps {
    order: Order;
    onViewDetails: (order: Order) => void;
    onCancel: (order: Order) => void;
    onRequestInvoice: (order: Order) => void;
    onSupplement: (order: Order) => void;
    onEdit?: (order: Order) => void;
    onRequestVC: (order: Order) => void;
    onConfirmVC: (order: Order) => void;
    processingOrder: string | null;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onViewDetails, onCancel, onRequestInvoice, onSupplement, onEdit, onRequestVC, onConfirmVC, processingOrder }) => {
    const statusText = order["Trạng thái VC"] || order["Kết quả"] || "Chưa ghép";
    const isProcessing = processingOrder === order["Số đơn hàng"];

    return (
        <div
            className="relative overflow-hidden rounded-xl bg-white p-3 shadow-md border border-light-border hover:shadow-lg transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer flex flex-col group"
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
                    <p className="text-light-text-primary text-sm font-bold leading-tight pr-2 truncate" title={order["Tên khách hàng"]}>
                        {order["Tên khách hàng"]}
                    </p>
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {isProcessing ? (
                            <div className="flex items-center justify-center w-8 h-8">
                                <i className="fas fa-spinner fa-spin text-accent-primary text-lg"></i>
                            </div>
                        ) : (
                            <ActionMenu
                                order={order}
                                onViewDetails={onViewDetails}
                                onCancel={onCancel}
                                onRequestInvoice={onRequestInvoice}
                                onSupplement={onSupplement}
                                onEdit={onEdit}
                                onRequestVC={onRequestVC}
                                onConfirmVC={onConfirmVC}
                            />
                        )}
                    </div>
                </div>
                <p className="text-light-text-secondary text-xs font-mono truncate" title={order["Số đơn hàng"]}>
                    {order["Số đơn hàng"]}
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
                <div className="mt-auto pt-2">
                    <StatusBadge status={statusText} />
                </div>
            </div>
        </div>
    );
};

export default OrderCard;