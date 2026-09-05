import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, StockVehicle, ActionType } from '../../types';
import CarImage from '../ui/CarImage';
import Button from '../ui/Button';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import MarqueeText from '../ui/MarqueeText';

// Helper to check if order is pending
const isPendingOrder = (order: Order) => {
    return !order['VIN'] || String(order['Kết quả'] || '').toLowerCase().includes('chưa');
};

interface MatchingCockpitViewProps {
    pendingOrders: Order[];
    pairedOrders: Order[];
    stockData: StockVehicle[];
    onAction: (type: ActionType, order: Order, data?: any) => void;
    filters?: {
        keyword: string;
        tvbh: string[];
        dongXe: string[];
        version: string[];
        ngoaiThat: string[];
    };
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    activeTab: 'pending' | 'paired' | 'suggested';
    selectedOrderId: string | null;
    onTabChange: (tab: 'pending' | 'paired' | 'suggested') => void;
    onOrderSelect: (orderId: string | null) => void;
    processingId?: string | null;
    processingActionType?: ActionType | null;
    isLoading?: boolean;
    onNavigateToTab?: (view: any, subState?: { folder?: string; id?: string }) => void;
}

export const MatchingCockpitView: React.FC<MatchingCockpitViewProps> = ({
    pendingOrders,
    pairedOrders,
    stockData,
    onAction,
    activeTab,
    selectedOrderId,
    onTabChange,
    onOrderSelect,
    processingId,
    processingActionType,
    isLoading = false,
    onNavigateToTab
}) => {
    const normalizeStr = (str: any) => {
        if (!str) return '';
        return String(str).normalize('NFC').trim();
    };

    const getStockStatus = (order: Order) => {
        const oModel = normalizeStr(order['Dòng xe']);
        const oExterior = normalizeStr(order['Ngoại thất']);
        const oInterior = normalizeStr(order['Nội thất']);
        const oVersion = normalizeStr(order['Phiên bản']);

        const exactMatches = stockData.filter(car =>
            normalizeStr(car['Dòng xe']) === oModel &&
            normalizeStr(car['Ngoại thất']) === oExterior &&
            normalizeStr(car['Nội thất']) === oInterior &&
            (!oVersion || normalizeStr(car['Phiên bản']) === oVersion) &&
            (!car['Trạng thái'] || car['Trạng thái'] === 'Chưa ghép')
        );
        return exactMatches.length;
    };

    const suggestedOrders = useMemo(() => {
        return pendingOrders.filter(order => getStockStatus(order) > 0);
    }, [pendingOrders, stockData]);

    const filteredOrders = useMemo(() => {
        let raw = pendingOrders;
        if (activeTab === 'paired') raw = pairedOrders;
        else if (activeTab === 'suggested') raw = suggestedOrders;

        if (activeTab === 'pending' || activeTab === 'suggested') {
            return [...raw].sort((a, b) => {
                const dateA = a['Ngày cọc'] ? moment(a['Ngày cọc']).valueOf() : 0;
                const dateB = b['Ngày cọc'] ? moment(b['Ngày cọc']).valueOf() : 0;
                return dateA - dateB;
            });
        }
        return raw;
    }, [activeTab, pendingOrders, pairedOrders, suggestedOrders]);

    const copyWithFeedback = useCopyFeedback();
    const selectedOrder = useMemo(() => filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId), [filteredOrders, selectedOrderId]);

    useEffect(() => {
        if (filteredOrders.length > 0) {
            const currentInList = filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId);
            if (!currentInList) {
                onOrderSelect(filteredOrders[0]['Số đơn hàng']);
            }
        }
    }, [filteredOrders, activeTab]);

    const matchingSuggestions = useMemo(() => {
        if (!selectedOrder || !isPendingOrder(selectedOrder)) return [];

        const oModel = normalizeStr(selectedOrder['Dòng xe']);
        const oExterior = normalizeStr(selectedOrder['Ngoại thất']);
        const oInterior = normalizeStr(selectedOrder['Nội thất']);
        const oVersion = normalizeStr(selectedOrder['Phiên bản']);

        return stockData.filter(car => {
            const modelMatch = normalizeStr(car['Dòng xe']) === oModel;
            const exteriorMatch = normalizeStr(car['Ngoại thất']) === oExterior;
            const interiorMatch = normalizeStr(car['Nội thất']) === oInterior;
            const versionMatch = !oVersion || normalizeStr(car['Phiên bản']) === oVersion;
            const isAvailable = !car['Trạng thái'] || car['Trạng thái'] === 'Chưa ghép';

            return modelMatch && exteriorMatch && interiorMatch && versionMatch && isAvailable;
        }).map(car => ({ ...car, matchScore: 100 } as StockVehicle & { matchScore: number }));
    }, [selectedOrder, stockData]);

    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    const handleTabSwitch = (tab: 'pending' | 'paired' | 'suggested') => {
        onTabChange(tab);
        setMobileView('list');
    };

    const handleOrderClick = (orderId: string) => {
        onOrderSelect(orderId);
        setMobileView('detail');
    };

    const tabs = [
        { id: 'pending', label: 'Chờ Ghép Xe', icon: 'fa-clock', count: pendingOrders.length },
        { id: 'suggested', label: 'Đơn Có Xe', icon: 'fa-magic', count: suggestedOrders.length },
        { id: 'paired', label: 'Đã Ghép Xe', icon: 'fa-check-circle', count: pairedOrders.length },
    ];

    const renderOrder = (order: Order) => {
        const isSelected = selectedOrderId === order['Số đơn hàng'];

        return (
            <div
                key={order['Số đơn hàng']}
                onClick={(e) => {
                    handleOrderClick(order['Số đơn hàng']);
                    copyWithFeedback(order['Tên khách hàng'], e);
                }}
                className={`p-3 cursor-pointer transition-all duration-150 relative border-l-4 ${
                    isSelected
                        ? 'bg-slate-100/90 border-blue-600 font-bold'
                        : 'border-transparent hover:bg-slate-50'
                }`}
            >
                <div className="text-xs font-extrabold text-slate-900 mb-1 uppercase overflow-hidden">
                    <MarqueeText 
                        text={order['Tên khách hàng'] || '—'}
                        className="text-xs font-extrabold text-slate-900 uppercase"
                    />
                </div>
                <div className="text-[11px] text-slate-600 font-medium truncate">
                    {order['Dòng xe']} {order['Phiên bản']}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />

            {/* Column 1: Navigation Folders */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>

                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabSwitch(tab.id as any)}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <i className={`fas ${tab.icon} w-4 text-center text-xs opacity-80`}></i>
                                    <span>{tab.label}</span>
                                </div>
                                {tab.count > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                        isActive ? 'bg-blue-700 text-white' : 'bg-slate-200/80 text-slate-700 border border-slate-200'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Column 2: Order List */}
            <div className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMobileView('folders')} className="md:hidden p-1 text-slate-500 hover:text-slate-800">
                            <i className="fas fa-arrow-left text-xs"></i>
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            {tabs.find(t => t.id === activeTab)?.label} ({filteredOrders.length})
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 text-xs font-semibold gap-2">
                            <i className="fas fa-spinner fa-spin text-blue-600 text-base"></i> Đang tải dữ liệu...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <i className="fa-solid fa-inbox text-3xl mb-2 text-slate-300"></i>
                            <span className="text-xs font-bold">Không có đơn hàng</span>
                        </div>
                    ) : (
                        filteredOrders.map(order => renderOrder(order))
                    )}
                </div>
            </div>

            {/* Column 3: Order Detail Cockpit */}
            <div className={`flex-1 flex flex-col bg-slate-50 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedOrder ? (
                    <div className="flex-1 flex flex-col h-full overflow-y-auto">
                        {/* Header Banner Phân Bố Thoáng Sạch */}
                        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-3.5">
                                <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 text-slate-500 hover:text-slate-800">
                                    <i className="fas fa-arrow-left text-xs"></i>
                                </button>
                                <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-base font-black shadow-2xs">
                                    {selectedOrder['Tên khách hàng'].charAt(0)}
                                </div>
                                <div className="space-y-1 min-w-0 flex-1 overflow-hidden">
                                    <div className="min-w-0 flex-1 overflow-hidden">
                                        <MarqueeText 
                                            text={selectedOrder['Tên khách hàng'] || '—'}
                                            className="font-black text-base text-slate-900 leading-none cursor-pointer hover:text-blue-600 transition-colors uppercase"
                                            title="Click để sao chép tên khách hàng"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                                        <span>Đơn hàng: <strong className="font-mono text-slate-900">{selectedOrder['Số đơn hàng']}</strong></span>
                                        <span className="text-slate-300">|</span>
                                        <span>TVBH: <strong className="text-slate-900">{selectedOrder['Tên tư vấn bán hàng']}</strong></span>
                                        <span className="text-slate-300">|</span>
                                        <span>Cọc: <strong className="text-slate-800">{selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : 'N/A'}</strong></span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {activeTab === 'paired' && (
                                    <button
                                        onClick={() => onNavigateToTab?.('invoices', { id: selectedOrder['Số đơn hàng'] })}
                                        className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-300 shadow-2xs hover:border-slate-400 flex items-center gap-2"
                                    >
                                        <i className="fa-solid fa-file-invoice-dollar text-blue-600"></i> Xem Hóa Đơn
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Main Cockpit Content Grid */}
                        <div className="p-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
                            {/* Left Panel: Vehicle Spec & Image (Col 7) */}
                            <div className="lg:col-span-7 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isPendingOrder(selectedOrder) ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                                            {isPendingOrder(selectedOrder) ? 'Trạng Thái: Đang Chờ Ghép Xe' : 'Trạng Thái: Đã Ghép Xe Thành Công'}
                                        </span>
                                    </div>
                                    <Button
                                        onClick={() => onAction('cancel', selectedOrder)}
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                        isLoading={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'cancel'}
                                        disabled={!!processingId}
                                    >
                                        Hủy đơn
                                    </Button>
                                </div>

                                {/* Vehicle Visual Presentation */}
                                <div className="h-56 relative flex items-center justify-center bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                                    <CarImage
                                        model={selectedOrder['Dòng xe']}
                                        exteriorColor={selectedOrder['Ngoại thất']}
                                        className="max-h-full max-w-full object-contain drop-shadow-md"
                                    />
                                </div>

                                {/* Spec Details */}
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <div className="flex items-baseline justify-between">
                                        <h4 className="text-base font-bold text-slate-900 uppercase">{selectedOrder['Dòng xe']} {selectedOrder['Phiên bản']}</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                            <span className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Ngoại Thất</span>
                                            <span className="text-slate-700 font-medium">{selectedOrder['Ngoại thất']}</span>
                                        </div>
                                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                                            <span className="text-[10px] text-slate-400 font-medium uppercase block mb-1">Nội Thất</span>
                                            <span className="text-slate-700 font-medium">{selectedOrder['Nội thất']}</span>
                                        </div>
                                    </div>

                                    {!isPendingOrder(selectedOrder) && (
                                        <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-medium block">Số VIN Ghép</span>
                                                <span className="font-mono text-sm font-bold text-emerald-400">{selectedOrder.VIN}</span>
                                            </div>
                                            <button
                                                onClick={() => onAction('unmatch', selectedOrder)}
                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all"
                                                disabled={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'unmatch'}
                                            >
                                                Hủy Ghép
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Matching Stock Vehicles (Col 5) */}
                            <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                        <i className="fa-solid fa-warehouse text-blue-600"></i> Kho Xe Phù Hợp Thực Tế
                                    </span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                                        {matchingSuggestions.length} Xe Sẵn Có
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-2 max-h-80 pr-1 custom-scrollbar">
                                    {matchingSuggestions.length > 0 ? (
                                        matchingSuggestions.map(car => (
                                            <div key={car.VIN} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Số VIN</span>
                                                    <strong className="text-xs font-mono text-slate-900">{car.VIN}</strong>
                                                </div>
                                                <button
                                                    onClick={() => onAction('pair', selectedOrder, { vin: car.VIN })}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 flex items-center gap-1"
                                                    disabled={!!processingId}
                                                >
                                                    <i className="fa-solid fa-link text-[10px]"></i> Ghép Xe
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 text-xs font-medium flex flex-col items-center justify-center h-48 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <i className="fa-solid fa-magnifying-glass text-2xl mb-2 text-slate-300"></i>
                                            <span>Không có xe nào phù hợp trong kho</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                        <i className="fa-solid fa-hand-pointer text-3xl mb-2 text-slate-300"></i>
                        <span className="text-xs font-bold">Vui lòng chọn một đơn hàng để xem chi tiết</span>
                    </div>
                )}
            </div>
        </div>
    );
};
export default MatchingCockpitView;
