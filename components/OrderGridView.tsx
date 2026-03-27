import React from 'react';
import { Order } from '../types';
import OrderCard from './OrderCard';

interface OrderGridViewProps {
    orders: Order[];
    onViewDetails: (order: Order) => void;
    onCancel: (order: Order) => void;
    onRequestInvoice: (order: Order) => void;
    onSupplement: (order: Order) => void;
    onEdit?: (order: Order) => void;
    onRequestVC: (order: Order) => void;
    onConfirmVC: (order: Order) => void;
    processingOrder: string | null;
    showOrderInAdmin?: (order: Order, targetTab: any) => void;
    showAdminTab?: (targetTab: any) => void;
}

const OrderGridView: React.FC<OrderGridViewProps> = React.memo((props) => {
    if (props.orders.length === 0) {
        return (
            <div className="text-center py-16 text-text-secondary">
                <i className="fas fa-folder-open fa-3x mb-4 text-text-placeholder"></i>
                <p className="font-semibold text-text-primary">Không tìm thấy yêu cầu nào.</p>
                <p className="text-sm">Hãy thử thay đổi bộ lọc hoặc tạo yêu cầu mới.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4 p-1">
            {props.orders.map((order) => (
                <div
                    key={order['Số đơn hàng']}
                    className="animate-entry"
                >
                    <OrderCard
                        order={order}
                        {...props}
                    />
                </div>
            ))}
        </div>
    );
});

export default OrderGridView;