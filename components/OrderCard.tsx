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
            className="relative overflow-hidden rounded-xl bg-slate-50 p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ease-out active:scale-[0.98] cursor-pointer flex flex-col group"
            onClick={() => onViewDetails(order)}
        >
            {/* Content */}
            <div className="relative z-10 flex flex-col flex-grow gap-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <p className="text-slate-800 text-sm font-bold uppercase leading-tight truncate" title={order["Tên khách hàng"]}>
                            {order["Tên khách hàng"]}
                        </p>
                        <p className="text-gray-500 text-[10px] font-mono truncate mt-0.5" title={order["Số đơn hàng"]}>
                            {order["Số đơn hàng"]}
                        </p>
                    </div>
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

                <div className="my-2 border-t border-dashed border-gray-300"></div>

                <div className="space-y-0.5">
                    <p className="text-slate-800 text-sm font-medium truncate" title={`${order["Dòng xe"]} / ${order["Phiên bản"]}`}>
                        {order["Dòng xe"]} / {order["Phiên bản"]}
                    </p>
                    <p className="text-slate-500 text-xs truncate" title={`${order["Ngoại thất"]} / ${order["Nội thất"]}`}>
                        <span style={getExteriorColorStyle(order['Ngoại thất'])}>{order["Ngoại thất"]}</span>
                        <span className="text-gray-400"> / </span>
                        <span>{order["Nội thất"]}</span>
                    </p>
                </div>

                <div className="my-2 border-t border-dashed border-gray-300"></div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-auto">
                    <span>Tư vấn</span>
                    <span className="font-medium uppercase text-slate-700 truncate">{order["Tên tư vấn bán hàng"]}</span>
                </div>

                {/* Status Badge - Optional, keeping it for functionality but maybe adjusting position if needed. 
                    The screenshot doesn't explicitly show it, but it's important info. 
                    I'll keep it at the bottom or top right? 
                    The screenshot doesn't show it. I'll hide it for now to match the "clean" look or put it very subtly.
                    Actually, status is critical. I'll leave it out for now to strictly follow the screenshot, 
                    or maybe the user wants it hidden? 
                    The user said "change interface...". 
                    I will comment it out for now to match the screenshot exactly.
                */}
                {/* <div className="mt-2">
                    <StatusBadge status={statusText} />
                </div> */}
            </div>
        </div>
    );
};

export default OrderCard;