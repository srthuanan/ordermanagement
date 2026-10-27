import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, StockVehicle, ActionType } from '../../types';
import CarImage from '../ui/CarImage';
import Button from '../ui/Button';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import MarqueeText from '../ui/MarqueeText';
import MobileMatchingView from './mobile/MobileMatchingView';

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
    onBackToAdminHome?: () => void;
    onOpenActionMenu?: () => void;
}

export const MatchingCockpitView: React.FC<MatchingCockpitViewProps> = ({
    pendingOrders,
    pairedOrders,
    stockData,
    onAction,
    showToast,
    activeTab,
    selectedOrderId,
    onTabChange,
    onOrderSelect,
    processingId,
    processingActionType,
    isLoading = false,
    onNavigateToTab,
    onBackToAdminHome,
    onOpenActionMenu
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

    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('list');

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
            <button
                type="button"
                key={order['Số đơn hàng']}
                onClick={() => {
                    handleOrderClick(order['Số đơn hàng']);
                }}
                className={`relative mx-2 my-1.5 w-[calc(100%-16px)] rounded-[14px] border p-2.5 text-left transition-all duration-150 md:m-0 md:w-full md:rounded-none md:border-x-0 md:border-y-0 md:border-l-4 md:p-3 ${
                    isSelected
                        ? 'border-blue-200 bg-blue-50/70 font-bold md:border-blue-600 md:bg-slate-100/90'
                        : 'border-slate-200 bg-white hover:bg-slate-50 md:border-transparent'
                }`}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 truncate text-[11.5px] font-bold uppercase text-slate-900">{order['Tên khách hàng'] || '—'}</div>
                        <div className="truncate text-[9.5px] font-medium text-slate-600">{order['Dòng xe']} {order['Phiên bản']}</div>
                        <div className="mt-1 truncate font-mono text-[8px] text-slate-400">{order['Số đơn hàng']}</div>
                    </div>
                    <div className="shrink-0 text-right">
                        {activeTab !== 'paired' && <span className="inline-flex h-[19px] items-center rounded-full bg-emerald-50 px-2 text-[8px] font-bold text-emerald-700 ring-1 ring-emerald-200">{getStockStatus(order)} xe</span>}
                        {activeTab === 'paired' && <span className="inline-flex h-[19px] items-center rounded-full bg-blue-50 px-2 text-[8px] font-bold text-blue-700 ring-1 ring-blue-200">Đã ghép</span>}
                        <i className="fas fa-chevron-right ml-2 text-[8px] text-slate-300" />
                    </div>
                </div>
            </button>
        );
    };

    return (
        <>
            {/* Dedicated iOS Mobile Matching View (< 768px) */}
            <div className="flex md:hidden h-full w-full flex-col overflow-hidden bg-[#F2F2F7]">
                <MobileMatchingView
                    pendingOrders={pendingOrders}
                    pairedOrders={pairedOrders}
                    stockData={stockData}
                    onAction={onAction}
                    showToast={showToast}
                    activeTab={activeTab}
                    selectedOrderId={selectedOrderId}
                    onTabChange={onTabChange}
                    onOrderSelect={onOrderSelect}
                    processingId={processingId}
                    processingActionType={processingActionType}
                    isLoading={isLoading}
                    onNavigateToTab={onNavigateToTab}
                    onBackToAdminHome={onBackToAdminHome}
                    onOpenActionMenu={onOpenActionMenu}
                />
            </div>

            {/* Desktop 3-Column Cockpit (>= 768px): 100% Preserved */}
            <div className="hidden md:flex h-full bg-slate-50 md:rounded-xl shadow-md border border-slate-200 overflow-hidden animate-fade-in relative z-0">
                <AnimatedBackground />

            {/* Column 1: Navigation Folders */}
            <div className="hidden w-full flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex md:w-64 relative z-10">

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
                <div className="shrink-0 border-b border-slate-200 bg-[#f2f2f7] p-2 md:bg-slate-50 md:p-3">
                    <div className="grid grid-cols-3 gap-1 rounded-[12px] bg-slate-200/70 p-1 md:hidden">
                        {tabs.map(tab => (
                            <button key={tab.id} type="button" onClick={() => handleTabSwitch(tab.id as any)} className={`h-8 rounded-[9px] px-1 text-[8.5px] font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}>
                                <span className="block truncate">{tab.label.replace(' Xe', '')}</span>
                                <span className="ml-1 text-[7.5px] tabular-nums">{tab.count}</span>
                            </button>
                        ))}
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">{tabs.find(t => t.id === activeTab)?.label} ({filteredOrders.length})</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f2f2f7] md:divide-y md:divide-slate-100 md:bg-white">
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
                        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-2.5 shadow-2xs md:p-4">
                            <div className="flex min-w-0 items-center gap-2 md:gap-3.5">
                                <button onClick={() => setMobileView('list')} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 md:hidden">
                                    <i className="fas fa-chevron-left text-[10px]"></i>
                                </button>
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-blue-600 text-sm font-black text-white shadow-2xs md:h-11 md:w-11 md:rounded-2xl md:text-base">
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
                                    <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[8px] font-medium text-slate-500 md:gap-2.5 md:text-xs md:text-slate-600">
                                        <span>Đơn hàng: <strong className="font-mono text-slate-900">{selectedOrder['Số đơn hàng']}</strong></span>
                                        <span className="hidden text-slate-300 md:inline">|</span>
                                        <span className="hidden md:inline">TVBH: <strong className="text-slate-900">{selectedOrder['Tên tư vấn bán hàng']}</strong></span>
                                        <span className="hidden text-slate-300 md:inline">|</span>
                                        <span className="hidden md:inline">Cọc: <strong className="text-slate-800">{selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : 'N/A'}</strong></span>
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
                        <div className="grid flex-1 grid-cols-1 gap-2 p-2 md:gap-4 md:p-4 lg:grid-cols-12">
                            {/* Left Panel: Vehicle Spec & Image (Col 7) */}
                            <div className="flex flex-col justify-between space-y-2 rounded-[16px] border border-slate-200 bg-white p-2.5 shadow-2xs md:space-y-4 md:rounded-2xl md:p-4 lg:col-span-7">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2 md:pb-3">
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
                                <div className="relative flex h-28 items-center justify-center rounded-xl border border-slate-100 bg-slate-50/80 p-2 md:h-56 md:p-3">
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
                            <div className="flex flex-col justify-between space-y-2 rounded-[16px] border border-slate-200 bg-white p-2.5 shadow-2xs md:space-y-3 md:rounded-2xl md:p-4 lg:col-span-5">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                        <i className="fa-solid fa-warehouse text-blue-600"></i> Kho Xe Phù Hợp Thực Tế
                                    </span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md border border-emerald-200">
                                        {matchingSuggestions.length} Xe Sẵn Có
                                    </span>
                                </div>

                                <div className="max-h-52 flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar md:max-h-80 md:space-y-2">
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
        </>
    );
};
export default MatchingCockpitView;
