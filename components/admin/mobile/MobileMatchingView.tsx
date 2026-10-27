import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { Search, SlidersHorizontal, X, Car, ChevronLeft } from 'lucide-react';
import { Order, StockVehicle, ActionType } from '../../../types';
import CarImage from '../../ui/CarImage';
import { useCopyFeedback } from '../../../hooks/useCopyFeedback';
import { getCarImage, getExteriorSwatchColor } from '../../../utils/styleUtils';

interface MobileMatchingViewProps {
    pendingOrders: Order[];
    pairedOrders: Order[];
    stockData: StockVehicle[];
    onAction: (type: ActionType, order: Order, data?: any) => void;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
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

export const MobileMatchingView: React.FC<MobileMatchingViewProps> = ({
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
    onNavigateToTab,
    onBackToAdminHome,
    onOpenActionMenu
}) => {
    const copyWithFeedback = useCopyFeedback();
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileScreen, setMobileScreen] = useState<'list' | 'detail'>('list');
    const [selectedModel, setSelectedModel] = useState<string>('all');
    const [selectedTvbh, setSelectedTvbh] = useState<string>('all');
    const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

    const normalizeStr = (str: any) => {
        if (!str) return '';
        return String(str).normalize('NFC').trim();
    };

    // Chuẩn hóa tên khách hàng & TVBH sang dạng Title Case thanh lịch phong cách Apple
    const formatCustomerName = (name?: string) => {
        if (!name) return '—';
        const trimmed = name.trim();
        const abbrevs = new Set(['tnhh', 'tm', 'dv', 'cp', 'mtv', 'cty', 'cpkd', 'xd']);
        return trimmed
            .split(/\s+/)
            .map(w => {
                const lower = w.toLowerCase();
                if (abbrevs.has(lower)) return lower.toUpperCase();
                return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
            })
            .join(' ');
    };

    // Chuẩn hóa tên dòng xe VinFast chuẩn iOS
    const formatCarModel = (model?: string) => {
        if (!model) return '';
        const m = model.trim();
        if (m.toUpperCase().startsWith('VF')) {
            return m.toUpperCase();
        }
        return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
    };

    // Calculate matching stock vehicle count for an order
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

    const allOrdersCombined = useMemo(() => {
        return [...pendingOrders, ...pairedOrders];
    }, [pendingOrders, pairedOrders]);

    // Unique filter options for Bottom Sheet (synchronized with other sheets)
    const uniqueModels = useMemo(() => {
        const set = new Set<string>();
        allOrdersCombined.forEach(o => {
            const m = (o['Dòng xe'] || '').trim();
            if (m) set.add(m);
        });
        return Array.from(set).sort();
    }, [allOrdersCombined]);

    const uniqueTvbhs = useMemo(() => {
        const set = new Set<string>();
        allOrdersCombined.forEach(o => {
            const t = (o['Tên tư vấn bán hàng'] || '').trim();
            if (t) set.add(t);
        });
        return Array.from(set).sort();
    }, [allOrdersCombined]);

    const currentTabOrders = useMemo(() => {
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

    // Filter by model, TVBH, and search query
    const filteredOrders = useMemo(() => {
        let list = currentTabOrders;

        if (selectedModel !== 'all') {
            list = list.filter(o => normalizeStr(o['Dòng xe']).toLowerCase() === selectedModel.toLowerCase());
        }

        if (selectedTvbh !== 'all') {
            list = list.filter(o => normalizeStr(o['Tên tư vấn bán hàng']).toLowerCase() === selectedTvbh.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = normalizeStr(searchQuery).toLowerCase();
            list = list.filter(o => {
                const customer = normalizeStr(o['Tên khách hàng']).toLowerCase();
                const orderNum = normalizeStr(o['Số đơn hàng']).toLowerCase();
                const tvbh = normalizeStr(o['Tên tư vấn bán hàng']).toLowerCase();
                const model = normalizeStr(o['Dòng xe']).toLowerCase();
                const vin = normalizeStr(o['VIN']).toLowerCase();
                const exterior = normalizeStr(o['Ngoại thất']).toLowerCase();
                return customer.includes(q) || orderNum.includes(q) || tvbh.includes(q) || model.includes(q) || vin.includes(q) || exterior.includes(q);
            });
        }

        return list;
    }, [currentTabOrders, selectedModel, selectedTvbh, searchQuery]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedModel !== 'all') count++;
        if (selectedTvbh !== 'all') count++;
        return count;
    }, [selectedModel, selectedTvbh]);

    const handleResetFilters = () => {
        setSelectedModel('all');
        setSelectedTvbh('all');
        setSearchQuery('');
    };

    const selectedOrder = useMemo(() => {
        return (
            pendingOrders.find(o => o['Số đơn hàng'] === selectedOrderId) ||
            pairedOrders.find(o => o['Số đơn hàng'] === selectedOrderId) ||
            null
        );
    }, [selectedOrderId, pendingOrders, pairedOrders]);

    // Matching stock cars for the currently selected order
    const matchingCars = useMemo(() => {
        if (!selectedOrder) return [];
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
        });
    }, [selectedOrder, stockData]);

    const isPaired = selectedOrder ? Boolean(selectedOrder['VIN'] && !String(selectedOrder['Kết quả'] || '').toLowerCase().includes('chưa')) : false;

    const handleSelectOrder = (order: Order) => {
        onOrderSelect(order['Số đơn hàng']);
        setMobileScreen('detail');
    };

    const handleBackToList = () => {
        setMobileScreen('list');
        onOrderSelect(null);
    };

    return (
        <div
            style={{
                fontFamily:
                    '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
            }}
            className="flex h-full w-full flex-col overflow-hidden bg-[#f2f2f7] text-slate-800 select-none"
        >
            {/* ========================================================================= */}
            {/* 🍏 1. APPLE NAVIGATION BAR TRONG SUỐT (FROSTED GLASS IOS HEADER) */}
            {/* ========================================================================= */}
            {mobileScreen === 'list' || !selectedOrder ? (
                <header className="w-full bg-white/85 backdrop-blur-xl border-b border-black/[0.08] px-3.5 pt-2 pb-2.5 flex-shrink-0 z-30 shadow-2xs">
                    <div className="flex items-center justify-between">
                        {/* Back button sang Quản trị */}
                        <div className="w-20 flex justify-start">
                            <button
                                type="button"
                                onClick={onBackToAdminHome}
                                className="flex items-center space-x-0.5 text-slate-700 hover:text-slate-900 active:scale-95 transition-all text-[13px] font-semibold py-1 px-1.5 -ml-1 rounded-lg hover:bg-black/[0.04]"
                            >
                                <ChevronLeft size={17} strokeWidth={2.4} className="-mr-0.5 text-slate-600" />
                                <span>Quản trị</span>
                            </button>
                        </div>

                        {/* Tiêu đề mục căn giữa chuẩn xác 100% phong cách Kho Xe */}
                        <h1 className="text-xs font-bold uppercase tracking-wider text-slate-700 text-center flex-1">
                            GHÉP XE
                        </h1>

                        {/* Nút công cụ quản trị */}
                        <div className="w-20 flex justify-end">
                            <button
                                type="button"
                                onClick={onOpenActionMenu}
                                className="w-8 h-8 rounded-full bg-slate-100/90 text-slate-600 hover:text-blue-600 flex items-center justify-center active:scale-90 transition-all"
                                title="Công cụ quản trị"
                            >
                                <i className="fas fa-ellipsis-h text-[12px]" />
                            </button>
                        </div>
                    </div>
                </header>
            ) : (
                <header className="w-full bg-white/85 backdrop-blur-xl border-b border-black/[0.08] px-3.5 pt-2 pb-2.5 flex-shrink-0 z-30 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <div className="w-24 flex justify-start">
                            <button
                                type="button"
                                onClick={handleBackToList}
                                className="flex items-center space-x-0.5 text-slate-700 hover:text-slate-900 active:scale-95 transition-all text-[13px] font-semibold py-1 px-1.5 -ml-1 rounded-lg hover:bg-black/[0.04]"
                            >
                                <ChevronLeft size={17} strokeWidth={2.4} className="-mr-0.5 text-slate-600" />
                                <span>Ghép Xe</span>
                            </button>
                        </div>

                        <h1 className="text-xs font-bold text-slate-800 tracking-tight text-center flex-1 truncate px-2">
                            {formatCustomerName(selectedOrder['Tên khách hàng'])}
                        </h1>

                        <div className="w-20 flex justify-end">
                            {!isPaired ? (
                                <button
                                    type="button"
                                    onClick={() => onAction('cancel', selectedOrder)}
                                    disabled={processingId === selectedOrder['Số đơn hàng']}
                                    className="text-[12px] font-semibold text-rose-600 px-2 py-1 active:opacity-60 transition-opacity"
                                >
                                    Hủy đơn
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onOpenActionMenu}
                                    className="w-8 h-8 rounded-full bg-slate-100/90 text-slate-600 flex items-center justify-center active:scale-90 transition-all"
                                    title="Tác vụ"
                                >
                                    <i className="fas fa-ellipsis-h text-[12px]" />
                                </button>
                            )}
                        </div>
                    </div>
                </header>
            )}

            {/* Screen Content: List View vs Detail View */}
            {mobileScreen === 'list' || !selectedOrder ? (
                <>
                    {/* iOS Top Segmented Control (Pill Switcher) */}
                    <div className="shrink-0 px-3.5 pt-2 pb-1.5 bg-[#f2f2f7]">
                        <div className="flex items-center gap-1 p-[3px] rounded-xl bg-slate-200/80">
                            {[
                                { id: 'pending', label: 'Chờ ghép', count: pendingOrders.length },
                                { id: 'suggested', label: 'Sẵn xe kho', count: suggestedOrders.length },
                                { id: 'paired', label: 'Đã ghép', count: pairedOrders.length }
                            ].map(tab => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => onTabChange(tab.id as any)}
                                        className={`flex-1 h-[28px] rounded-[9px] text-[11.5px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                            isActive
                                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                                : 'text-slate-600 active:text-slate-900'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full ${
                                            isActive 
                                                ? tab.id === 'suggested' 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : 'bg-blue-100 text-blue-700' 
                                                : 'bg-black/[0.05] text-slate-500'
                                        }`}>
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 📋 2. DANH SÁCH BẢNG CHUẨN 1-1 KHO XE (SMARTPHONE INSET TABLE) */}
                    {/* ========================================================================= */}
                    <main className="flex-1 overflow-y-auto px-3.5 pt-1 pb-2 no-scrollbar">
                        {isLoading ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-8 h-8 border-2 border-slate-800 border-t-transparent rounded-full animate-spin mb-3" />
                                <p className="text-xs font-bold text-slate-700">Đang nạp dữ liệu ghép xe...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                                <div className="w-14 h-14 rounded-2xl bg-white text-slate-400 flex items-center justify-center mb-3 shadow-xs border border-slate-200">
                                    <Car size={26} strokeWidth={1.8} />
                                </div>
                                <h3 className="text-sm font-bold text-slate-700">Không tìm thấy đơn hàng</h3>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                    Thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc.
                                </p>
                                {activeFiltersCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleResetFilters}
                                        className="mt-3.5 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-xs active:scale-95"
                                    >
                                        Đặt lại bộ lọc
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
                                {/* 🏷️ THANH TIÊU ĐỀ CỘT CHUẨN DẠNG BẢNG (APPLE INSET TABLE HEADER) */}
                                <div className="flex items-center px-3 py-1.5 bg-slate-100/75 border-b border-slate-200/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                                    <div className="w-[66px] shrink-0 text-center pr-2 border-r border-slate-200/60">Xe</div>
                                    <div className="flex-1 min-w-0 px-2.5 border-r border-slate-200/60">Cấu hình xe</div>
                                    <div className="flex-1 min-w-0 pl-2.5 pr-1">Khách hàng / TVBH</div>
                                    <div className="w-3 shrink-0"></div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {filteredOrders.map((order, idx) => {
                                        const carModel = (order['Dòng xe'] || '').trim();
                                        const carTrim = (order['Phiên bản'] || '').trim();
                                        const exterior = order['Ngoại thất'] || 'Tiêu chuẩn';
                                        const interior = order['Nội thất'] || 'Tiêu chuẩn';
                                        const carImgUrl = getCarImage(carModel, exterior, carTrim);
                                        const carDisplayName = `${carModel} ${carTrim}`.trim();
                                        const customerName = formatCustomerName(order['Tên khách hàng']);
                                        const tvbhName = order['Tên tư vấn bán hàng'] ? formatCustomerName(order['Tên tư vấn bán hàng']) : 'Chưa phân bổ';

                                        return (
                                            <div
                                                key={order['Số đơn hàng'] || idx}
                                                onClick={() => handleSelectOrder(order)}
                                                className="flex min-h-[68px] cursor-pointer select-none items-center justify-between px-3 py-2 transition-colors hover:bg-slate-50/80 active:bg-slate-100/70"
                                            >
                                                {/* 1. CỘT 1: ẢNH XE 3D */}
                                                <div className="relative flex min-h-10 w-[66px] shrink-0 self-stretch items-center justify-center overflow-hidden border-r border-slate-100/90 pr-2">
                                                    {carImgUrl ? (
                                                        <img
                                                            src={carImgUrl}
                                                            alt={carDisplayName}
                                                            className="h-10 w-full object-contain scale-[0.96] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.10)]"
                                                            loading="lazy"
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                                            <Car size={16} />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 2. CỘT 2: CẤU HÌNH XE (DÒNG XE & MÀU SẮC) */}
                                                <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch border-r border-slate-100/90 px-2.5">
                                                    {/* Dòng 1: Dòng xe & Phiên bản */}
                                                    <div className="flex items-center gap-1 min-w-0">
                                                        <span className="font-bold text-[12px] tracking-tight text-slate-900 truncate">
                                                            {formatCarModel(carModel)}
                                                        </span>
                                                        {carTrim && carTrim.toLowerCase() !== carModel.toLowerCase() && (
                                                            <span className="text-[10px] font-semibold text-slate-600 truncate">
                                                                {carTrim}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Dòng 2: Chấm màu + Tên màu ngoại thất */}
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium truncate">
                                                        <span
                                                            className="h-2 w-2 flex-shrink-0 rounded-full border border-white ring-1 ring-slate-300 shadow-2xs"
                                                            style={{ backgroundColor: getExteriorSwatchColor(exterior) }}
                                                            title={`${exterior} / ${interior}`}
                                                        />
                                                        <span className="truncate text-slate-600" title={exterior}>
                                                            {exterior}
                                                        </span>
                                                        {order['VIN'] && (
                                                            <span className="font-mono text-[8.5px] font-semibold text-slate-600 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                                                {order['VIN'].slice(-8)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 3. CỘT 3: KHÁCH HÀNG & TVBH */}
                                                <div className="flex min-w-0 flex-1 flex-col justify-center space-y-0.5 self-stretch pl-2.5 pr-1">
                                                    {/* Dòng 1: Tên khách hàng */}
                                                    <div className="font-semibold text-[11.5px] text-slate-800 truncate" title={order['Tên khách hàng']}>
                                                        {customerName}
                                                    </div>

                                                    {/* Dòng 2: Tên TVBH */}
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium truncate" title={order['Tên tư vấn bán hàng']}>
                                                        <i className="fas fa-user-tie text-[8px] text-slate-400 flex-shrink-0" />
                                                        <span className="truncate">{tvbhName}</span>
                                                    </div>
                                                </div>

                                                {/* 4. CỘT 4: ICON CHEVRON NHỎ GỌN */}
                                                <div className="flex items-center justify-end shrink-0 pl-1 text-slate-300 w-3">
                                                    <i className="fas fa-chevron-right text-[9.5px]" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </main>

                    {/* ========================================================================= */}
                    {/* 🔍 3. APPLE FLOATING BOTTOM DOCK: TÌM KIẾM & BỘ LỌC ĐỒNG BỘ KHO XE */}
                    {/* ========================================================================= */}
                    <div className="w-full bg-white/92 backdrop-blur-2xl border-t border-black/[0.08] px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(0,0,0,0.06)] z-30 flex-shrink-0 space-y-1">
                        {/* Dải tags bộ lọc đang áp dụng */}
                        {activeFiltersCount > 0 && (
                            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                                <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
                                    Đang lọc:
                                </span>
                                {selectedModel !== 'all' && (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                                        <span>Xe: {selectedModel}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedModel('all')}
                                            className="hover:text-slate-900 active:scale-90 ml-0.5"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                )}
                                {selectedTvbh !== 'all' && (
                                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/80 flex-shrink-0">
                                        <span>TVBH: {selectedTvbh}</span>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedTvbh('all')}
                                            className="hover:text-slate-900 active:scale-90 ml-0.5"
                                        >
                                            <X size={10} />
                                        </button>
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={handleResetFilters}
                                    className="text-[10px] font-medium text-slate-500 hover:text-slate-800 active:scale-95 px-1 py-0.5 flex-shrink-0"
                                >
                                    Xóa tất cả
                                </button>
                            </div>
                        )}

                        {/* Thanh tìm kiếm & Nút Lọc thu nhỏ theo phong cách Apple */}
                        <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                    <Search size={13} strokeWidth={2} />
                                </div>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Tìm số VIN, dòng xe, màu, TVBH, khách hàng..."
                                    className="w-full h-[34px] pl-[30px] pr-[28px] rounded-xl bg-slate-100/90 focus:bg-white text-[11.5px] text-slate-800 placeholder-slate-400 border border-slate-200/80 focus:border-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-200 shadow-2xs transition-all font-sans"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute inset-y-0 right-0 pr-2 flex items-center text-slate-400 hover:text-slate-600 active:scale-90"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsFilterSheetOpen(true)}
                                className={`h-[34px] px-2.5 rounded-xl flex items-center space-x-1 font-medium text-[11px] transition-all active:scale-95 flex-shrink-0 border ${
                                    activeFiltersCount > 0
                                        ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                                        : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200/80 border-slate-200/80 shadow-2xs'
                                }`}
                            >
                                <SlidersHorizontal size={12} strokeWidth={2} />
                                <span>Lọc</span>
                                {activeFiltersCount > 0 && (
                                    <span className="w-3.5 h-3.5 rounded-full bg-white text-slate-700 font-bold text-[9px] flex items-center justify-center -mr-0.5">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 🎛️ 4. APPLE FILTER BOTTOM SHEET (ĐỒNG BỘ 1-1 VỚI KHO XE & HÓA ĐƠN) */}
                    {/* ========================================================================= */}
                    {isFilterSheetOpen && (
                        <div className="fixed inset-0 z-50 flex flex-col justify-end">
                            <div
                                className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                                onClick={() => setIsFilterSheetOpen(false)}
                            />

                            <div className="relative z-10 w-full max-w-md mx-auto bg-white rounded-t-[24px] shadow-[0_-8px_30px_rgba(0,0,0,0.15)] flex flex-col max-h-[55dvh] animate-in slide-in-from-bottom duration-250 overflow-hidden">
                                <div className="pt-2 pb-0.5 flex justify-center">
                                    <div className="w-8 h-1 rounded-full bg-slate-300" />
                                </div>

                                <div className="px-4 py-1.5 border-b border-black/[0.06] flex items-center justify-between">
                                    <div className="w-16 flex justify-start">
                                        {activeFiltersCount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={handleResetFilters}
                                                className="text-[12.5px] font-medium text-slate-500 hover:text-slate-800 active:opacity-60 transition-opacity"
                                            >
                                                Đặt lại
                                            </button>
                                        ) : (
                                            <span className="w-1" />
                                        )}
                                    </div>
                                    <h3 className="text-[13.5px] font-bold text-slate-800 tracking-tight text-center flex-1">
                                        Bộ Lọc Ghép Xe
                                    </h3>
                                    <div className="w-16 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setIsFilterSheetOpen(false)}
                                            className="text-[13.5px] font-bold text-slate-700 hover:text-slate-900 active:opacity-60 transition-opacity"
                                        >
                                            Xong
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 no-scrollbar">
                                    {/* 1. Lọc theo Dòng xe */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                            Dòng xe ({uniqueModels.length})
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedModel('all')}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                    selectedModel === 'all'
                                                        ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                        : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                }`}
                                            >
                                                Tất cả
                                            </button>
                                            {uniqueModels.map(model => (
                                                <button
                                                    key={model}
                                                    type="button"
                                                    onClick={() => setSelectedModel(model)}
                                                    className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                        selectedModel === model
                                                            ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                            : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                    }`}
                                                >
                                                    {formatCarModel(model)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Lọc theo Tư vấn bán hàng */}
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 px-0.5">
                                            Tư vấn bán hàng ({uniqueTvbhs.length})
                                        </label>
                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedTvbh('all')}
                                                className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border ${
                                                    selectedTvbh === 'all'
                                                        ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                        : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                }`}
                                            >
                                                Tất cả
                                            </button>
                                            {uniqueTvbhs.map(tvbh => (
                                                <button
                                                    key={tvbh}
                                                    type="button"
                                                    onClick={() => setSelectedTvbh(tvbh)}
                                                    className={`h-[26px] px-2.5 rounded-full text-[11px] flex items-center space-x-1 transition-all active:scale-95 border max-w-[180px] truncate ${
                                                        selectedTvbh === tvbh
                                                            ? 'bg-slate-700 border-slate-700 text-white font-semibold shadow-2xs'
                                                            : 'bg-slate-100/90 border-slate-200/80 text-slate-700 font-medium hover:bg-slate-200/70'
                                                    }`}
                                                >
                                                    <span className="truncate">{formatCustomerName(tvbh)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 border-t border-black/[0.06] bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setIsFilterSheetOpen(false)}
                                        className="w-full h-[38px] rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-[13px] tracking-tight shadow-xs active:scale-[0.98] transition-all flex items-center justify-center space-x-1"
                                    >
                                        <span>Xem {filteredOrders.length} Yêu Cầu Ghép Xe</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Master-Detail Screen */
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3 space-y-3.5 no-scrollbar">
                        {/* Card 1: 3D Car Visual & Header */}
                        <div className="rounded-[20px] bg-white border border-black/[0.04] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                            {/* Realistic Car Rendering Showcase */}
                            <div className="relative flex h-40 items-center justify-center rounded-[14px] bg-gradient-to-b from-[#F2F2F7] to-white p-2 overflow-hidden mb-3.5 border border-black/[0.03]">
                                <CarImage
                                    model={selectedOrder['Dòng xe']}
                                    exteriorColor={selectedOrder['Ngoại thất']}
                                    version={selectedOrder['Phiên bản']}
                                    className="max-h-full max-w-full object-contain drop-shadow-md transition-transform duration-300"
                                />
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-0.5 text-[9.5px] font-bold text-[#1C1C1E] shadow-2xs backdrop-blur-xs">
                                    <span className={`h-1.5 w-1.5 rounded-full ${isPaired ? 'bg-[#34C759]' : 'bg-[#FF9500] animate-pulse'}`} />
                                    {isPaired ? 'Đã ghép xe' : 'Chờ ghép xe'}
                                </div>
                            </div>

                            {/* Vehicle Title & Order Badge */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                    <h3 className="text-[18px] font-extrabold text-[#1C1C1E] uppercase tracking-tight">
                                        {formatCarModel(selectedOrder['Dòng xe'])} {selectedOrder['Phiên bản']}
                                    </h3>
                                    <p className="text-[11.5px] text-[#8E8E93] mt-0.5">
                                        Đơn hàng: <span className="font-mono font-semibold text-[#1C1C1E]">#{selectedOrder['Số đơn hàng']}</span>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={e => copyWithFeedback(selectedOrder['Số đơn hàng'], e)}
                                    className="shrink-0 text-[11px] font-semibold text-[#007AFF] px-2.5 py-1 rounded-lg bg-blue-50 active:scale-95"
                                >
                                    Copy số đơn
                                </button>
                            </div>

                            {/* iOS Inset Grouped Specs Table */}
                            <div className="rounded-[14px] bg-[#F2F2F7] p-1 space-y-1 text-[12px]">
                                <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-white">
                                    <span className="text-[#8E8E93] font-medium">Ngoại thất</span>
                                    <span className="font-semibold text-[#1C1C1E] flex items-center gap-1.5">
                                        <span className={`h-2.5 w-2.5 rounded-full ${getExteriorSwatchColor(selectedOrder['Ngoại thất'])}`} />
                                        {selectedOrder['Ngoại thất'] || '—'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-white">
                                    <span className="text-[#8E8E93] font-medium">Nội thất</span>
                                    <span className="font-semibold text-[#1C1C1E]">{selectedOrder['Nội thất'] || '—'}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-white">
                                    <span className="text-[#8E8E93] font-medium">Tư vấn bán hàng</span>
                                    <span className="font-semibold text-[#1C1C1E] truncate max-w-[180px]">{formatCustomerName(selectedOrder['Tên tư vấn bán hàng'])}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-2 rounded-[10px] bg-white">
                                    <span className="text-[#8E8E93] font-medium">Ngày đặt cọc</span>
                                    <span className="font-semibold text-[#1C1C1E]">
                                        {selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Customer Bar */}
                            <div className="mt-3 flex items-center justify-between p-2.5 rounded-[12px] bg-blue-50/70 border border-blue-100">
                                <div className="flex items-center gap-2 truncate">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#007AFF] text-white text-[11px]">
                                        <i className="fas fa-user" />
                                    </div>
                                    <div className="truncate">
                                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-[#007AFF] block">Khách hàng</span>
                                        <span className="text-[12.5px] font-bold text-[#1C1C1E] truncate block">
                                            {formatCustomerName(selectedOrder['Tên khách hàng'])}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={e => copyWithFeedback(selectedOrder['Tên khách hàng'], e)}
                                    className="shrink-0 text-[11px] font-semibold text-[#007AFF] px-2 py-1 rounded-md hover:bg-blue-100/60 active:scale-95"
                                >
                                    Sao chép
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Matching Stock Action Section */}
                        {isPaired ? (
                            <div className="rounded-[20px] bg-white border border-black/[0.04] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-3.5">
                                <div className="flex items-center gap-2.5 pb-2.5 border-b border-black/[0.06]">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                        <i className="fas fa-check text-[13px]" />
                                    </div>
                                    <div>
                                        <span className="text-[13px] font-bold text-[#1C1C1E] block">Đã ghép xe thành công</span>
                                        <span className="text-[10.5px] text-[#8E8E93]">Xe đã được phân bổ cho đơn hàng này</span>
                                    </div>
                                </div>

                                {/* VIN Display Card */}
                                <div className="p-3.5 rounded-[14px] bg-slate-900 text-white flex items-center justify-between shadow-xs">
                                    <div>
                                        <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                                            Số VIN Xe Ghép
                                        </span>
                                        <span className="font-mono text-[15px] font-bold text-[#34C759] tracking-wider block">
                                            {selectedOrder['VIN']}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={e => copyWithFeedback(selectedOrder['VIN'] || '', e)}
                                        className="h-8 px-3 rounded-lg bg-white/10 text-white text-[11px] font-semibold active:bg-white/20 transition-all flex items-center gap-1"
                                    >
                                        <i className="fas fa-copy text-[10px]" />
                                        <span>Copy VIN</span>
                                    </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => onAction('unmatch', selectedOrder)}
                                        disabled={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'unmatch'}
                                        className="h-11 rounded-[12px] bg-red-50 text-[#FF3B30] border border-red-200 text-[12.5px] font-bold active:bg-red-100 flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <i className="fas fa-unlink text-[11px]" />
                                        <span>Hủy Ghép Xe</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onNavigateToTab?.('invoices', { id: selectedOrder['Số đơn hàng'] })}
                                        className="h-11 rounded-[12px] bg-[#007AFF] text-white text-[12.5px] font-bold shadow-xs active:bg-[#0A60D4] flex items-center justify-center gap-1.5 transition-all"
                                    >
                                        <i className="fas fa-file-invoice-dollar text-[11px]" />
                                        <span>Xem Hóa Đơn</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-[20px] bg-white border border-black/[0.04] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-3.5">
                                <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.06]">
                                    <div className="flex items-center gap-2">
                                        <i className="fas fa-warehouse text-[13px] text-[#007AFF]" />
                                        <span className="text-[13px] font-bold text-[#1C1C1E]">
                                            Xe trong kho phù hợp ({matchingCars.length})
                                        </span>
                                    </div>
                                    {matchingCars.length > 0 && (
                                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                            Khớp 100%
                                        </span>
                                    )}
                                </div>

                                {matchingCars.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2F2F7] text-[#8E8E93] mb-2.5">
                                            <i className="fas fa-box-open text-xl text-slate-400" />
                                        </div>
                                        <span className="text-[13px] font-bold text-[#1C1C1E]">Chưa có xe phù hợp</span>
                                        <span className="text-[11px] text-[#8E8E93] mt-1 max-w-[240px] leading-relaxed">
                                            Hiện tại kho chưa có xe {formatCarModel(selectedOrder['Dòng xe'])} màu {selectedOrder['Ngoại thất']} ở trạng thái Chưa ghép.
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {matchingCars.map(car => (
                                            <div
                                                key={car.VIN}
                                                className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#F2F2F7]/90 border border-black/[0.04]"
                                            >
                                                <div>
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8E8E93] block">
                                                        Số VIN Khả Dụng
                                                    </span>
                                                    <span className="font-mono text-[13.5px] font-bold text-[#1C1C1E] tracking-wide block">
                                                        {car.VIN}
                                                    </span>
                                                    <div className="mt-1 flex items-center gap-2 text-[10.5px] text-[#6C6C70]">
                                                        <span>Vị trí: <strong className="text-[#1C1C1E]">{car['Vị trí'] || 'Kho Thuận An'}</strong></span>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => onAction('pair', selectedOrder, { vin: car.VIN })}
                                                    disabled={Boolean(processingId)}
                                                    className="h-10 px-4 rounded-[11px] bg-gradient-to-r from-[#007AFF] to-[#0051D5] text-white text-[12px] font-bold shadow-xs active:scale-95 flex items-center gap-1.5 transition-all shrink-0"
                                                >
                                                    {processingId === selectedOrder['Số đơn hàng'] ? (
                                                        <i className="fas fa-spinner fa-spin text-xs" />
                                                    ) : (
                                                        <i className="fas fa-link text-[10.5px]" />
                                                    )}
                                                    <span>Ghép xe</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileMatchingView;
