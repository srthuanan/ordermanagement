import React from 'react';
import { Order } from '../types';
import OrderCard from './OrderCard';
import { useNightMode } from '../hooks/useNightMode';

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
    isReferenceAccount?: boolean;
}

const OrderGridView: React.FC<OrderGridViewProps> = React.memo((props) => {
    const isNight = useNightMode();

    if (props.orders.length === 0) {
        return (
            <div className={`flex-1 flex flex-col items-center justify-center text-center p-8 m-1 ${isNight ? 'text-slate-200' : 'text-slate-700'}`}>
                <div className="text-6xl mb-4 drop-shadow-md animate-bounce" style={{ animationDuration: '2s' }}>🏖️</div>
                <h3 className="text-lg font-bold mb-2">Chưa có đơn hàng nào ở đây cả</h3>
                <p className="text-sm opacity-80 max-w-sm">Hãy nghỉ ngơi, uống một ngụm nước dừa và tận hưởng làn gió biển nhé!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5 p-1">
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