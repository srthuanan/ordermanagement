import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, StockVehicle, ActionType } from '../../types';
import CarImage from '../ui/CarImage';
import Button from '../ui/Button';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { getExteriorColorStyle, getInteriorColorStyle, getBackgroundColorStyle } from '../../utils/styleUtils';


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
    activeTab: 'pending' | 'paired';
    selectedOrderId: string | null;
    onTabChange: (tab: 'pending' | 'paired') => void;
    onOrderSelect: (orderId: string | null) => void;
    processingId?: string | null;
    processingActionType?: ActionType | null;
    isLoading?: boolean;
    onNavigateToTab?: (view: any, subState?: { folder?: string; id?: string }) => void;
}


const MatchingCockpitView: React.FC<MatchingCockpitViewProps> = ({
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

    // 1. Target Orders (The data is already filtered in parent useAdminData)
    const filteredOrders = useMemo(() => {
        const raw = activeTab === 'pending' ? pendingOrders : pairedOrders;
        if (activeTab === 'pending') {
            return [...raw].sort((a, b) => {
                const dateA = a['Ngày cọc'] ? moment(a['Ngày cọc']).valueOf() : 0;
                const dateB = b['Ngày cọc'] ? moment(b['Ngày cọc']).valueOf() : 0;
                return dateA - dateB; // Oldest deposit first for priority
            });
        }
        return raw;
    }, [activeTab, pendingOrders, pairedOrders]);
    const copyWithFeedback = useCopyFeedback();

    const selectedOrder = useMemo(() => filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId), [filteredOrders, selectedOrderId]);

    // Auto-select first
    useEffect(() => {
        // Only select if we have orders and nothing selected, or if the current selection is no longer in the list (e.g. switched tabs)
        if (filteredOrders.length > 0) {
            const currentInList = filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId);
            if (!currentInList) {
                onOrderSelect(filteredOrders[0]['Số đơn hàng']);
            }
        }
    }, [filteredOrders, activeTab]); // Depend on activeTab to reset on switch

    // Normalize strings for matching (Vietnamese NFC/NFD issue)
    const normalizeStr = (str: any) => {
        if (!str) return '';
        return String(str).normalize('NFC').trim();
    };

    // 2. Matching Logic
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


    // Mobile View State
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');

    const handleTabSwitch = (tab: 'pending' | 'paired') => {
        onTabChange(tab);
        setMobileView('list');
    };

    const handleOrderClick = (orderId: string) => {
        onOrderSelect(orderId);
        setMobileView('detail');
    };

    const tabs = [
        { id: 'pending', label: 'Chờ Ghép Xe', icon: 'fa-clock', count: pendingOrders.length },
        { id: 'paired', label: 'Đã Ghép Xe', icon: 'fa-check-circle', count: pairedOrders.length },
    ];

    const renderOrder = (order: Order) => {
        const isSelected = selectedOrderId === order['Số đơn hàng'];
        const isPending = isPendingOrder(order);
        const matchCount = isPending ? getStockStatus(order) : 0;

        return (
            <div
                key={order['Số đơn hàng']}
                onClick={() => handleOrderClick(order['Số đơn hàng'])}
                className={`px-4 py-3 cursor-pointer transition-all duration-300 group relative border-l-2 ${isSelected
                    ? 'bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border-accent-primary z-10'
                    : 'bg-transparent border-transparent hover:bg-slate-50/80 hover:border-slate-200'
                    }`}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className={`text-[13px] font-bold truncate mb-1 transition-colors ${isSelected ? 'text-accent-primary' : 'text-slate-700 group-hover:text-accent-primary'}`}>
                            {order['Tên khách hàng']}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 leading-none">
                                <span>{order['Dòng xe']}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span className="truncate">{order['Phiên bản']}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-1" style={getExteriorColorStyle(order['Ngoại thất'])}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={getBackgroundColorStyle(order['Ngoại thất'])}></div>
                                    {order['Ngoại thất']}
                                </div>
                                {isPending && matchCount > 0 && (
                                    <div className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 font-black uppercase tracking-tighter">
                                        {matchCount} xe sẵn có
                                    </div>
                                )}
                                {order['Thời gian cần xe'] && (
                                    <div className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-black uppercase tracking-tighter flex items-center gap-1">
                                        <i className="fas fa-calendar-check text-[8px]"></i>
                                        {moment(order['Thời gian cần xe']).format('DD/MM')}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="w-14 h-9 flex-shrink-0">
                        <CarImage
                            model={order['Dòng xe']}
                            exteriorColor={order['Ngoại thất']}
                            className="w-full h-full object-contain opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 drop-shadow-sm"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-slate-50 rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />
            {/* Column 1: Tabs (replacing Folders) */}
            <div className={`w-full md:w-64 flex-shrink-0 border-r border-slate-200 bg-white/50 backdrop-blur-sm flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 space-y-1.5 overflow-y-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabSwitch(tab.id as 'pending' | 'paired')}
                            className={`w-full group relative flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${activeTab === tab.id
                                ? 'bg-white text-accent-primary shadow-lg shadow-black/5 ring-1 ring-black/5'
                                : 'text-slate-500 hover:bg-white/60 hover:text-slate-900'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === tab.id ? 'bg-accent-primary text-white shadow-[0_4px_10px_rgba(var(--accent-primary-rgb),0.3)]' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600'}`}>
                                    <i className={`fas ${tab.icon} text-xs`}></i>
                                </div>
                                <span className={`text-[13px] font-black uppercase tracking-tight transition-all ${activeTab === tab.id ? 'translate-x-0.5' : ''}`}>{tab.label}</span>
                            </div>
                            {tab.count > 0 && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-lg flex items-center justify-center font-black ${activeTab === tab.id ? 'bg-accent-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                            {activeTab === tab.id && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent-primary rounded-full"></div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Column 2: List */}
            <div className={`w-full md:w-72 flex-shrink-0 border-r border-border-primary flex flex-col bg-white/90 relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                {/* Mobile Back Button */}
                <div className="md:hidden p-2 border-b border-border-secondary flex items-center gap-2">
                    <button onClick={() => setMobileView('folders')} className="p-2 hover:bg-surface-ground rounded-full">
                        <i className="fas fa-arrow-left text-text-secondary"></i>
                    </button>
                    <span className="font-bold text-sm">Danh sách</span>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading && filteredOrders.length === 0 ? (
                        <div className="divide-y divide-border-secondary">
                            {Array.from({ length: 10 }).map((_, i) => (
                                <div key={i} className="p-4 md:p-3 space-y-2">
                                    <div className="skeleton-item h-4 w-3/4 rounded-md"></div>
                                    <div className="skeleton-item h-3 w-1/2 rounded-md"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 h-full bg-slate-50/50">
                            <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-2xl flex items-center justify-center mb-4">
                                <i className="fas fa-inbox text-gray-300 text-2xl"></i>
                            </div>
                            <p className="text-sm font-semibold text-gray-400 text-center">Không có đơn hàng</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border-secondary">
                            {filteredOrders.map(order => renderOrder(order))}
                        </div>
                    )}
                </div>
            </div>

            {/* Column 3: Detail */}
            <div className={`flex-1 flex flex-col bg-surface-ground/90 min-w-0 relative z-10 ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {selectedOrder ? (
                    <>
                        {/* Premium Detail Header */}
                        <div className="px-6 py-4 bg-white/40 backdrop-blur-md border-b border-white/60 flex flex-col md:flex-row justify-between items-start md:items-center shadow-[0_1px_3px_rgba(0,0,0,0.02)] z-10 gap-3 md:gap-0 sticky top-0">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                {/* Mobile Back Button */}
                                <button onClick={() => setMobileView('list')} className="md:hidden p-2 -ml-2 hover:bg-slate-100/50 rounded-full transition-colors">
                                    <i className="fas fa-arrow-left text-slate-500"></i>
                                </button>

                                {/* Elevated Avatar */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-accent-primary/20 rounded-2xl blur-md group-hover:bg-accent-primary/30 transition-all duration-500"></div>
                                    <div className="relative w-11 h-11 rounded-2xl bg-white border border-white shadow-sm flex items-center justify-center text-accent-primary font-black text-xl flex-shrink-0">
                                        {selectedOrder['Tên khách hàng'].charAt(0)}
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2
                                            className="text-lg font-black text-slate-800 tracking-tight leading-tight truncate cursor-pointer hover:text-accent-primary transition-colors"
                                            title="Click để sao chép tên khách hàng"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyWithFeedback(selectedOrder['Tên khách hàng'], e);
                                            }}
                                        >
                                            {selectedOrder['Tên khách hàng']}
                                        </h2>
                                    </div>

                                    <div className="text-[11px] text-slate-500 font-medium flex items-center gap-3 mt-1 flex-wrap">
                                        <div className="flex items-center gap-1.5 bg-white/50 px-2 py-0.5 rounded-lg border border-slate-200/30">
                                            <i className="fas fa-hashtag text-[9px] opacity-40"></i>
                                            <span className="font-mono font-bold text-slate-600 tracking-tight">{selectedOrder['Số đơn hàng']}</span>
                                        </div>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <div className="flex items-center gap-1.5">
                                            <i className="far fa-calendar-alt text-[9px] opacity-40"></i>
                                            <span>{moment(selectedOrder['Thời gian nhập']).format('DD/MM/YYYY')}</span>
                                        </div>
                                        {selectedOrder['Thời gian cần xe'] && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100/50">
                                                    <i className="fas fa-calendar-check text-[10px]"></i>
                                                    <span className="font-black">CẦN XE: {moment(selectedOrder['Thời gian cần xe']).format('DD/MM/YYYY')}</span>
                                                </div>
                                            </>
                                        )}
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <div className="flex items-center gap-1.5">
                                            <i className="fas fa-user-tie text-[9px] opacity-40"></i>
                                            <span className="font-semibold text-slate-600">{selectedOrder['Tên tư vấn bán hàng']}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {activeTab === 'paired' && (
                                    <button
                                        onClick={() => onNavigateToTab?.('invoices', { id: selectedOrder['Số đơn hàng'] })}
                                        className="h-9 px-4 bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-slate-200 group/nav"
                                    >
                                        <i className="fas fa-file-invoice-dollar text-[12px] opacity-50 group-hover/nav:opacity-100"></i>
                                        <span>Xem Hóa Đơn</span>
                                    </button>
                                )}
                                {!!selectedOrder['Trạng thái VC'] && (
                                    <button
                                        onClick={() => onNavigateToTab?.('vc', { id: selectedOrder['Số đơn hàng'] })}
                                        className="h-9 px-4 bg-slate-100 hover:bg-accent-primary hover:text-white text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-slate-200 group/nav"
                                    >
                                        <i className="fas fa-crown text-[12px] opacity-50 group-hover/nav:opacity-100"></i>
                                        <span>Xử Lý VC</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden">
                            <div className="h-full">
                                {isPendingOrder(selectedOrder) ? (
                                    /* Pending View - Horizontal Split Layout / Vertical on mobile */
                                    <div className="h-full flex flex-col lg:flex-row gap-4 p-2 lg:p-4 overflow-y-auto lg:overflow-hidden">

                                        {/* LEFT: Car Info Card - 60% */}
                                        <div className="flex-[3] min-w-0 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden flex flex-col">
                                            {/* Status Banner */}
                                            <div className="relative overflow-hidden px-4 py-3 flex-shrink-0">
                                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent pointer-events-none"></div>
                                                <div className="relative flex items-center justify-between gap-3 z-10">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white shadow-[0_8px_20px_rgba(245,158,11,0.3)] flex items-center justify-center flex-shrink-0 -rotate-3">
                                                            <i className="fas fa-hourglass-half text-sm animate-pulse"></i>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <h2 className="text-[13px] font-black text-slate-800 tracking-tight uppercase">Đang Chờ Ghép Xe</h2>
                                                                <div className="bg-amber-100 text-amber-600 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest">Priority</div>
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2">
                                                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 italic">Ngày cọc: {selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : 'N/A'}</span>
                                                                {!selectedOrder['Thời gian cần xe'] && <p className="text-[10px] text-slate-500 font-medium truncate italic">Hệ thống đang tìm xe phù hợp nhất.</p>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* Cancel button */}
                                                    <Button
                                                        onClick={() => onAction('cancel', selectedOrder)}
                                                        variant="ghost"
                                                        size="sm"
                                                        leftIcon={<i className="fas fa-trash-alt text-[10px]"></i>}
                                                        className="font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        isLoading={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'cancel'}
                                                        disabled={!!processingId}
                                                    >
                                                        Hủy đơn hàng
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="h-px w-full bg-slate-100 flex-shrink-0"></div>

                                            {/* Car Image */}
                                            <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-36 h-36 bg-amber-400/5 blur-[60px] rounded-full pointer-events-none"></div>
                                                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-20"></div>
                                                <CarImage
                                                    model={selectedOrder['Dòng xe']}
                                                    exteriorColor={selectedOrder['Ngoại thất']}
                                                    className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)]"
                                                />
                                            </div>

                                            <div className="h-px w-full bg-slate-100 flex-shrink-0"></div>

                                            {/* Car Specs */}
                                            <div className="p-4 flex-shrink-0">
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">{selectedOrder['Dòng xe']}</h3>
                                                    <span className="text-xs text-slate-400 font-bold uppercase">{selectedOrder['Phiên bản']}</span>
                                                </div>
                                                <div className="h-0.5 w-12 bg-amber-500 rounded-full mb-3"></div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full shadow-sm border border-black/10" style={getBackgroundColorStyle(selectedOrder['Ngoại thất'])}></div>
                                                            NGOẠI THẤT
                                                        </div>
                                                        <div className="text-[11px] font-bold truncate" style={getExteriorColorStyle(selectedOrder['Ngoại thất'])}>{selectedOrder['Ngoại thất']}</div>
                                                    </div>
                                                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                        <div className="text-[8px] text-slate-400 font-black uppercase tracking-[0.15em] mb-1 flex items-center gap-1">
                                                            <div className="w-2 h-2 rounded-full shadow-sm border border-black/10" style={getBackgroundColorStyle(selectedOrder['Nội thất'])}></div>
                                                            NỘI THẤT
                                                        </div>
                                                        <div className="text-[11px] font-bold truncate" style={getInteriorColorStyle(selectedOrder['Nội thất'])}>{selectedOrder['Nội thất']}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RIGHT: Matching Stock List - 40% */}
                                        <div className="flex-[2] min-w-0 bg-white/60 backdrop-blur-sm rounded-3xl border border-slate-200 overflow-hidden flex flex-col min-h-0">
                                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                                        <i className="fas fa-search-plus text-xs"></i>
                                                    </div>
                                                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">Kho Xe Phù Hợp Thực Tế</h3>
                                                </div>
                                                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-3 py-1 rounded-full font-black border border-emerald-200">
                                                    {matchingSuggestions.length} XE SẴN CÓ
                                                </span>
                                            </div>

                                            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                                                {matchingSuggestions.length > 0 ? matchingSuggestions.map(car => (
                                                    <div key={car.VIN} className="group bg-white rounded-2xl p-3 border border-slate-100 hover:border-accent-primary hover:shadow-xl hover:shadow-accent-primary/5 transition-all duration-300 flex items-center gap-4 relative overflow-hidden">
                                                        <div className="flex-1">
                                                            <div>
                                                                <div className="text-[8px] text-slate-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                                                    <i className="fas fa-fingerprint text-[7px]"></i>SỐ VIN
                                                                </div>
                                                                <div className="text-[11px] font-mono font-black text-slate-800 tracking-wider group-hover:text-accent-primary transition-colors select-all leading-none">{car.VIN}</div>
                                                            </div>
                                                        </div>

                                                        <Button
                                                            onClick={() => onAction('pair', selectedOrder, { vin: car.VIN })}
                                                            variant="primary"
                                                            size="sm"
                                                            leftIcon={<i className="fas fa-link text-[10px]"></i>}
                                                            className="px-4 font-bold"
                                                            isLoading={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'pair'}
                                                            disabled={!!processingId}
                                                        >
                                                            Ghép Xe
                                                        </Button>
                                                    </div>
                                                )) : (
                                                    <div className="flex flex-col items-center justify-center h-full px-4 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                                                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-3">
                                                            <i className="fas fa-search text-slate-200 text-xl"></i>
                                                        </div>
                                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Không có xe phù hợp</h4>
                                                        <p className="text-[11px] text-slate-300 font-medium text-center mt-1">Hệ thống không tìm thấy xe nào có thông số tương ứng trong kho.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Paired View */
                                    <div className="h-full flex flex-col p-2 lg:p-4">
                                        <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-white/60 overflow-hidden flex flex-col min-h-0 relative">
                                            {/* Top Status Banner */}
                                            <div className="relative overflow-hidden px-6 py-4 flex-shrink-0">
                                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none"></div>
                                                <div className="relative flex items-center justify-between z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] flex items-center justify-center flex-shrink-0 rotate-3">
                                                            <i className="fas fa-check-double text-lg"></i>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <h2 className="text-base font-black text-slate-800 tracking-tight uppercase">Đã Ghép Thành Công</h2>
                                                                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 font-medium">Xe đã được hệ thống ghi nhận và phân bổ thành công.</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => onAction('unmatch', selectedOrder)}
                                                        className={`group relative px-5 py-2 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[11px] font-bold transition-all duration-300 active:scale-95 flex items-center gap-2 overflow-hidden ${(processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'unmatch') ? 'opacity-50 cursor-wait' : ''}`}
                                                        disabled={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'unmatch'}
                                                    >
                                                        <div className="absolute inset-0 bg-rose-500 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-10"></div>
                                                        {(processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'unmatch') ? (
                                                            <i className="fas fa-spinner fa-spin text-rose-500"></i>
                                                        ) : (
                                                            <i className="fas fa-unlink text-[10px] group-hover:-rotate-45 transition-transform"></i>
                                                        )}
                                                        <span className="relative z-10">Hủy Ghép Xe</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-60"></div>

                                            {/* Main Info Area */}
                                            <div className="flex-1 flex flex-col p-4 lg:p-6 gap-4 lg:gap-6 min-h-0 overflow-y-auto lg:overflow-visible custom-scrollbar">
                                                <div className="flex-1 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0 items-center lg:items-center">
                                                    {/* Visual Presentation */}
                                                    <div className="w-full lg:w-[45%] flex-shrink-0 relative">
                                                        <div className="relative aspect-[16/10] bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center p-4 overflow-hidden group">
                                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-emerald-400/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-400/10 transition-colors duration-500"></div>
                                                            <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-20"></div>
                                                            <CarImage
                                                                model={selectedOrder['Dòng xe']}
                                                                exteriorColor={selectedOrder['Ngoại thất']}
                                                                className="w-full h-full object-contain relative z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] transition-all duration-700 ease-out group-hover:scale-105 group-hover:-rotate-1"
                                                            />
                                                        </div>
                                                        <div className="absolute -top-3 -right-3 bg-white shadow-xl shadow-black/5 px-4 py-2 rounded-2xl border border-slate-50 rotate-6 transform transition-transform group-hover:rotate-0">
                                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Original Match</span>
                                                        </div>
                                                    </div>

                                                    {/* Text Info */}
                                                    <div className="flex-1 flex flex-col justify-center min-w-0 w-full">
                                                        <div className="mb-6">
                                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                                <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-bold rounded-full uppercase tracking-widest shadow-lg shadow-black/10 flex items-center gap-1.5">
                                                                    <i className="fas fa-car-side text-[10px]"></i>SẴN SÀNG GIAO
                                                                </span>
                                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-full border border-emerald-100 uppercase tracking-widest flex items-center gap-1.5">
                                                                    <i className="fas fa-shield-check text-[10px]"></i>CHỨNG THỰC VIN
                                                                </span>
                                                            </div>
                                                            <h3 className="text-4xl xl:text-5xl font-black text-slate-800 tracking-tighter mb-1 uppercase italic">{selectedOrder['Dòng xe']}</h3>
                                                            <p className="text-lg text-slate-500 font-semibold tracking-wide uppercase opacity-70 mb-4">{selectedOrder['Phiên bản']}</p>
                                                            <div className="h-1 w-20 bg-emerald-500 rounded-full"></div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="group bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-black/5 p-4 rounded-2xl border border-slate-100 transition-all duration-300">
                                                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm border border-black/10 transition-transform group-hover:scale-125" style={getBackgroundColorStyle(selectedOrder['Ngoại thất'])}></div>
                                                                    NGOẠI THẤT
                                                                </div>
                                                                <div className="text-sm font-bold truncate group-hover:scale-105 transition-transform origin-left" style={getExteriorColorStyle(selectedOrder['Ngoại thất'])}>{selectedOrder['Ngoại thất']}</div>
                                                            </div>
                                                            <div className="group bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-black/5 p-4 rounded-2xl border border-slate-100 transition-all duration-300">
                                                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full shadow-sm border border-black/10 transition-transform group-hover:scale-125" style={getBackgroundColorStyle(selectedOrder['Nội thất'])}></div>
                                                                    NỘI THẤT
                                                                </div>
                                                                <div className="text-sm font-bold truncate group-hover:scale-105 transition-transform origin-left" style={getInteriorColorStyle(selectedOrder['Nội thất'])}>{selectedOrder['Nội thất']}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* VIN Security Strip */}
                                                <div className="mt-auto relative group">
                                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 rounded-[1.5rem] blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                                                    <div className="relative bg-[#0F172A] rounded-2xl p-4 lg:p-5 overflow-hidden flex items-center justify-between border border-white/5 shadow-2xl">
                                                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:32px] opacity-10"></div>
                                                        <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
                                                        <div className="relative z-10">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                                                    <i className="fas fa-fingerprint text-emerald-500 text-[10px]"></i>
                                                                </div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SỐ KHUNG (VIN) CHÍNH THỨC</span>
                                                            </div>
                                                            <div onClick={(e) => copyWithFeedback(selectedOrder.VIN || '', e)} className="group/vin relative inline-flex items-center gap-4 cursor-pointer">
                                                                <span className="font-mono text-2xl lg:text-3xl xl:text-4xl font-black text-white tracking-[0.3em] transition-all group-hover:text-emerald-300 select-all">{selectedOrder.VIN}</span>
                                                                <div className="text-slate-500 group-hover:text-emerald-400 opacity-40 group-hover:opacity-100 transition-all flex flex-col items-center">
                                                                    <i className="fas fa-copy text-sm mb-1"></i>
                                                                    <span className="text-[8px] font-bold uppercase tracking-tighter">COPY</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="hidden md:flex flex-col items-end gap-2 relative z-10">
                                                            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">ĐÃ PHÊ DUYỆT</span>
                                                            </div>
                                                            <div className="text-[8px] text-slate-500 font-mono uppercase tracking-tighter text-right">
                                                                Hệ thống ghi nhận lúc:<br />
                                                                {selectedOrder['Thời gian ghép'] ? moment(selectedOrder['Thời gian ghép']).format('HH:mm DD/MM/YYYY') : moment().format('HH:mm DD/MM/YYYY')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* VC / Invoice nav buttons */}
                                            <div className="px-6 pb-4 flex-shrink-0 flex items-center gap-2">
                                                {onNavigateToTab && selectedOrder['LinkHoaDonDaXuat'] && (
                                                    <Button onClick={() => onNavigateToTab?.('invoices')} variant="secondary" size="sm" leftIcon={<i className="fas fa-file-invoice-dollar text-[10px]"></i>} className="font-bold">
                                                        Hóa Đơn
                                                    </Button>
                                                )}
                                                {onNavigateToTab && selectedOrder['Trạng thái VC'] && (
                                                    <Button onClick={() => onNavigateToTab?.('vc')} variant="secondary" size="sm" leftIcon={<i className="fas fa-id-card text-[10px]"></i>} className="font-bold">
                                                        Xử Lý VC
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 w-full h-full bg-slate-50">
                        <div className="relative w-24 h-24 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-6">
                            <div className="absolute inset-0 border border-gray-200/60 rounded-full transform scale-110"></div>
                            <div className="absolute inset-0 border border-gray-100 rounded-full transform scale-125"></div>
                            <i className="fas fa-hand-pointer text-gray-300 text-4xl"></i>
                        </div>
                        <h3 className="text-lg font-bold text-gray-600 mb-1 tracking-tight">Chưa chọn đơn hàng</h3>
                        <p className="text-sm text-gray-400 max-w-xs text-center">Vui lòng chọn một đơn hàng từ danh sách để bắt đầu.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


export default MatchingCockpitView;
