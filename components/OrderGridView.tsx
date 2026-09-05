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
    selectedOrderId?: string | null;
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
        <div className="flex flex-col gap-2 p-1 w-full">
            {props.orders.map((order) => (
                <div key={order['Số đơn hàng']} className="relative group/shelf flex flex-col">
                    {/* Order Showcase Tray */}
                    <OrderCard
                        order={order}
                        {...props}
                    />

                    {/* Tempered Glass Shelf Edge (Gờ kệ kính cường lực nâng đỡ) */}
                    <div className={`h-[3px] mx-2.5 rounded-full transition-all duration-300 mt-1 ${
                        props.selectedOrderId === order['Số đơn hàng']
                            ? 'bg-gradient-to-r from-sky-400/50 via-sky-500/90 to-sky-400/50 shadow-[0_2px_8px_rgba(56,189,248,0.5)]'
                            : (isNight 
                                ? 'bg-gradient-to-r from-transparent via-slate-700/60 to-transparent shadow-[0_1px_2px_rgba(0,0,0,0.4)]' 
                                : 'bg-gradient-to-r from-transparent via-slate-300/70 to-transparent shadow-[0_1px_3px_rgba(15,23,42,0.06)]')
                    }`} />
                </div>
            ))}
        </div>
    );
});

export default OrderGridView;