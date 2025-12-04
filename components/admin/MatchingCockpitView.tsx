import React, { useMemo, useEffect, useState } from 'react';
import moment from 'moment';
import { Order, StockVehicle, ActionType } from '../../types';
import CarImage from '../ui/CarImage';
import Button from '../ui/Button';


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
}

const MatchingCockpitView: React.FC<MatchingCockpitViewProps> = ({ pendingOrders, pairedOrders, stockData, onAction, filters, showToast, activeTab, selectedOrderId, onTabChange, onOrderSelect }) => {

    // Mobile Tab State
    const [mobileTab, setMobileTab] = useState<'requests' | 'radar'>('requests');

    // Helper to check if order is pending
    const isPendingOrder = (order: Order) => {
        return !order['VIN'] || String(order['Kết quả'] || '').toLowerCase().includes('chưa');
    };

    // 1. Filter Orders
    const filteredOrders = useMemo(() => {
        const keyword = filters?.keyword?.toLowerCase() || '';

        // If searching, search in both lists. Otherwise use active tab.
        let source = activeTab === 'pending' ? pendingOrders : pairedOrders;
        if (keyword) {
            source = [...pendingOrders, ...pairedOrders];
        }

        return source.filter(order => {
            // Keyword Filter
            const matchesKeyword =
                !keyword ||
                order['Tên khách hàng'].toLowerCase().includes(keyword) ||
                order['Số đơn hàng'].toLowerCase().includes(keyword) ||
                order['Dòng xe'].toLowerCase().includes(keyword);

            if (!matchesKeyword) return false;

            // Dropdown Filters
            if (filters) {
                if (filters.tvbh && filters.tvbh.length > 0 && !filters.tvbh.includes(order['Tên tư vấn bán hàng'])) return false;
                if (filters.dongXe && filters.dongXe.length > 0 && !filters.dongXe.includes(order['Dòng xe'])) return false;
                if (filters.version && filters.version.length > 0 && !filters.version.includes(order['Phiên bản'])) return false;
                if (filters.ngoaiThat && filters.ngoaiThat.length > 0 && !filters.ngoaiThat.includes(order['Ngoại thất'])) return false;
            }

            return true;
        });
    }, [activeTab, pendingOrders, pairedOrders, filters]);

    const selectedOrder = useMemo(() => filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId), [filteredOrders, selectedOrderId]);

    // Auto-select first order if none selected or tab changes
    useEffect(() => {
        if (filteredOrders.length > 0) {
            const firstId = filteredOrders[0]['Số đơn hàng'];
            if (firstId) onOrderSelect(firstId);
        }
    }, [activeTab, onOrderSelect]); // Trigger on tab change

    // Ensure selection on initial load if nothing selected
    useEffect(() => {
        if (!selectedOrderId && filteredOrders.length > 0) {
            const firstId = filteredOrders[0]['Số đơn hàng'];
            if (firstId) onOrderSelect(firstId);
        }
    }, [filteredOrders, selectedOrderId, onOrderSelect]);

    // 2. Smart Matching Logic (For Pending Orders)
    const matchingSuggestions = useMemo(() => {
        if (!selectedOrder || !isPendingOrder(selectedOrder)) return [];

        return stockData.filter(car => {
            // Strict match: Model, Exterior, Interior, Version
            const modelMatch = car['Dòng xe'] === selectedOrder['Dòng xe'];
            const exteriorMatch = car['Ngoại thất'] === selectedOrder['Ngoại thất'];
            const interiorMatch = car['Nội thất'] === selectedOrder['Nội thất'];
            const versionMatch = !selectedOrder['Phiên bản'] || car['Phiên bản'] === selectedOrder['Phiên bản']; // Optional check if order has version

            // Status check: Must be available
            const isAvailable = !car['Trạng thái'] || car['Trạng thái'] === 'Chưa ghép';

            return modelMatch && exteriorMatch && interiorMatch && versionMatch && isAvailable;
        }).map(car => {
            return { ...car, matchScore: 100 };
        });
    }, [selectedOrder, stockData]);

    // 3. Stock Availability Indicator (Traffic Light)
    const getStockStatus = (order: Order) => {
        const exactMatch = stockData.some(car =>
            car['Dòng xe'] === order['Dòng xe'] &&
            car['Ngoại thất'] === order['Ngoại thất'] &&
            car['Nội thất'] === order['Nội thất'] &&
            (!car['Trạng thái'] || car['Trạng thái'] === 'Chưa ghép')
        );

        if (exactMatch) return 'success'; // Green

        const partialMatch = stockData.some(car =>
            car['Dòng xe'] === order['Dòng xe'] &&
            (!car['Trạng thái'] || car['Trạng thái'] === 'Chưa ghép')
        );

        if (partialMatch) return 'warning'; // Yellow
        return 'danger'; // Red
    };

    const handleCopy = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        showToast('Đã sao chép!', `${label} đã được sao chép.`, 'success', 2000);
    };

    const handleOrderClick = (orderId: string) => {
        onOrderSelect(orderId);
        setMobileTab('radar');
    };

    // Swipe Navigation Logic
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe || isRightSwipe) {
            const currentIndex = filteredOrders.findIndex(o => o['Số đơn hàng'] === selectedOrderId);
            if (currentIndex === -1) return;

            if (isLeftSwipe && currentIndex < filteredOrders.length - 1) {
                // Next Order
                onOrderSelect(filteredOrders[currentIndex + 1]['Số đơn hàng']);
            } else if (isRightSwipe && currentIndex > 0) {
                // Previous Order
                onOrderSelect(filteredOrders[currentIndex - 1]['Số đơn hàng']);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-surface-card rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in relative">
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex border-b border-border-primary bg-white flex-shrink-0">
                <button
                    onClick={() => setMobileTab('requests')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'requests' ? 'border-accent-primary text-accent-primary bg-accent-primary/5' : 'border-transparent text-text-secondary'}`}
                >
                    Yêu Cầu ({filteredOrders.length})
                </button>
                <button
                    onClick={() => setMobileTab('radar')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'radar' ? 'border-accent-primary text-accent-primary bg-accent-primary/5' : 'border-transparent text-text-secondary'}`}
                >
                    Chi Tiết ({selectedOrder ? '1' : '0'})
                </button>
            </div>

            <div className="flex-1 flex min-h-0 relative">
                {/* Left Column: Request Stream (40%) */}
                <div className={`w-full md:w-2/5 flex flex-col border-r border-border-primary bg-white absolute md:relative inset-0 z-10 md:z-auto transition-transform duration-300 ${mobileTab === 'requests' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                    {/* Tabs */}
                    <div className="flex border-b border-border-primary bg-surface-ground flex-shrink-0">
                        <button
                            onClick={() => onTabChange('pending')}
                            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'pending' && !filters?.keyword ? 'bg-white text-accent-primary border-t-2 border-t-accent-primary' : 'text-text-secondary hover:bg-surface-hover border-t-2 border-t-transparent'}`}
                        >
                            Chờ Ghép <span className="ml-2 bg-accent-primary text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
                        </button>
                        <button
                            onClick={() => onTabChange('paired')}
                            className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'paired' && !filters?.keyword ? 'bg-white text-success border-t-2 border-t-success' : 'text-text-secondary hover:bg-surface-hover border-t-2 border-t-transparent'}`}
                        >
                            Đã Ghép <span className="ml-2 bg-success text-white text-xs px-2 py-0.5 rounded-full">{pairedOrders.length}</span>
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                        <div className="divide-y divide-border-secondary">
                            {filteredOrders.map(order => {
                                const isSelected = selectedOrderId === order['Số đơn hàng'];
                                const isPending = isPendingOrder(order);
                                const stockStatus = isPending ? getStockStatus(order) : null;

                                // Calculate exact matches count for display
                                const exactMatchesCount = isPending ? stockData.filter(car =>
                                    car['Dòng xe'] === order['Dòng xe'] &&
                                    car['Ngoại thất'] === order['Ngoại thất'] &&
                                    car['Nội thất'] === order['Nội thất'] &&
                                    (!order['Phiên bản'] || car['Phiên bản'] === order['Phiên bản']) &&
                                    (!car['Trạng thái'] || car['Trạng thái'] === 'Chưa ghép')
                                ).length : 0;

                                return (
                                    <div
                                        key={order['Số đơn hàng']}
                                        onClick={() => handleOrderClick(order['Số đơn hàng'])}
                                        className={`p-3 cursor-pointer transition-all relative group ${isSelected ? 'bg-accent-primary/5 border-l-4 border-accent-primary' : 'hover:bg-surface-hover border-l-4 border-transparent'}`}
                                    >
                                        {isPending ? (
                                            // PENDING ORDER LAYOUT
                                            <>
                                                <div className={`absolute right-2 top-2 w-2 h-2 rounded-full ${stockStatus === 'success' ? 'bg-success' : stockStatus === 'warning' ? 'bg-warning' : 'bg-danger'}`}></div>
                                                <div className="pr-4">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className={`text-sm truncate ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>{order['Tên khách hàng']}</h3>
                                                    </div>
                                                    <div className="text-xs text-text-secondary mb-0.5">
                                                        <span className="font-medium text-text-primary">{order['Dòng xe']} {order['Phiên bản']}</span>
                                                    </div>
                                                    <div className="text-xs text-text-secondary mb-1">
                                                        {order['Ngoại thất']} / {order['Nội thất']}
                                                    </div>

                                                    {exactMatchesCount > 0 && (
                                                        <div className="mt-1 inline-block">
                                                            <span className="bg-success/10 text-success text-[10px] px-2 py-0.5 rounded-full shadow-sm border border-success/20">
                                                                {exactMatchesCount} xe phù hợp
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Detailed Info for Pending */}
                                                    <div className="mt-2 pt-2 border-t border-border-secondary/50 text-[10px] text-text-secondary space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <i className="fas fa-user-tie text-text-placeholder w-3"></i>
                                                            <span className="truncate">{order['Tên tư vấn bán hàng']}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <div title="Ngày cọc">
                                                                <i className="fas fa-money-bill-wave text-text-placeholder w-3"></i>
                                                                {order['Ngày cọc'] ? moment(order['Ngày cọc']).format('DD/MM') : '--'}
                                                            </div>
                                                            <div title="Ngày yêu cầu">
                                                                <i className="fas fa-clock text-text-placeholder w-3"></i>
                                                                {moment(order['Thời gian nhập']).format('DD/MM')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            // PAIRED ORDER LAYOUT
                                            <div className="">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h3 className={`text-sm truncate ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>{order['Tên khách hàng']}</h3>
                                                    <span className="text-[10px] text-white bg-success px-1.5 py-0.5 rounded shadow-sm font-mono">
                                                        {order.VIN?.slice(-7)}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-text-secondary mb-1.5 truncate">
                                                    <span className="font-medium text-text-primary">{order['Dòng xe']}</span>
                                                    <span className="mx-1">•</span>
                                                    <span>{order['Ngoại thất']}/{order['Nội thất']}</span>
                                                </div>

                                                {/* Compact Footer */}
                                                <div className="flex justify-between items-center text-[10px] text-text-secondary pt-1.5 border-t border-border-secondary/50">
                                                    <div className="flex items-center gap-1.5 truncate max-w-[60%]">
                                                        <i className="fas fa-user-tie text-text-placeholder"></i>
                                                        <span className="truncate">{order['Tên tư vấn bán hàng']}</span>
                                                    </div>
                                                    {order['Thời gian ghép'] && (
                                                        <div className="flex items-center gap-1 text-accent-primary font-medium whitespace-nowrap">
                                                            <i className="fas fa-clock text-[9px]"></i>
                                                            <span>{moment().diff(moment(order['Thời gian ghép']), 'days')} ngày</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {filteredOrders.length === 0 && (
                                <div className="text-center py-8 text-text-placeholder text-sm">Không tìm thấy đơn hàng</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Stock Radar / Detail (60%) */}
                <div
                    className={`w-full md:w-3/5 flex flex-col bg-surface-ground min-w-0 absolute md:relative inset-0 z-0 md:z-auto transition-transform duration-300 ${mobileTab === 'radar' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {selectedOrder ? (
                        <div className="flex-1 flex flex-col">
                            {/* Header */}
                            <div className="px-4 py-2 bg-white border-b border-border-primary flex justify-between items-start shadow-sm z-10 flex-shrink-0">
                                <div>
                                    <h2
                                        onClick={() => handleCopy(selectedOrder['Tên khách hàng'], 'Tên khách hàng')}
                                        className="text-base font-bold text-text-primary mb-1 cursor-pointer hover:text-accent-primary transition-colors"
                                        title="Click để sao chép tên khách hàng"
                                    >
                                        {selectedOrder['Tên khách hàng']}
                                    </h2>
                                    <div className="flex items-center gap-2 text-[10px] md:text-sm text-text-secondary">
                                        <span
                                            onClick={() => handleCopy(selectedOrder['Số đơn hàng'], 'Số đơn hàng')}
                                            className="font-mono bg-surface-ground px-2 py-0.5 rounded border border-border-secondary cursor-pointer hover:bg-accent-primary/10 hover:border-accent-primary/30 transition-colors"
                                            title="Click để sao chép số đơn hàng"
                                        >
                                            {selectedOrder['Số đơn hàng']}
                                        </span>
                                        <span><i className="fas fa-user-tie mr-1"></i>{selectedOrder['Tên tư vấn bán hàng']}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm md:text-lg font-bold text-accent-primary">{selectedOrder['Dòng xe']}</div>
                                    <div className="text-[10px] md:text-sm text-text-secondary">{selectedOrder['Ngoại thất']} / {selectedOrder['Nội thất']}</div>
                                    <div className="text-[10px] md:text-xs text-text-secondary mt-0.5">{selectedOrder['Phiên bản']}</div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                                <div className="max-w-4xl mx-auto space-y-4">
                                    {/* Detailed Order Info Section */}
                                    <div className="bg-white p-2 md:p-3 rounded-xl border border-border-primary shadow-sm">
                                        <h3 className="text-[10px] md:text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 border-b border-border-secondary pb-1.5">Thông Tin Chi Tiết</h3>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3">
                                            <div>
                                                <label className="text-[9px] md:text-[10px] text-text-secondary block mb-0.5 uppercase">Ngày Yêu Cầu</label>
                                                <div className="text-xs md:text-sm font-medium text-text-primary">{moment(selectedOrder['Thời gian nhập']).format('DD/MM/YYYY')}</div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] md:text-[10px] text-text-secondary block mb-0.5 uppercase">Ngày Cọc</label>
                                                <div className="text-xs md:text-sm font-medium text-text-primary">{selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : 'N/A'}</div>
                                            </div>
                                        </div>

                                        {/* Documents */}
                                        <div className="flex gap-2 flex-wrap border-t border-border-secondary pt-3">
                                            {[{ key: 'LinkHopDong', label: 'Hợp đồng', icon: 'fa-file-contract' }, { key: 'LinkDeNghiXHD', label: 'Đề nghị XHĐ', icon: 'fa-file-invoice' }].map(doc => {
                                                const url = selectedOrder[doc.key];
                                                if (!url) return null;
                                                return (

                                                    <a key={doc.key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-2 py-1 md:px-3 md:py-1.5 bg-surface-ground border border-border-secondary rounded-lg hover:bg-surface-hover transition-colors text-xs text-text-primary">
                                                        <i className={`fas ${doc.icon} text-accent-primary`}></i>
                                                        <span>{doc.label}</span>
                                                        <i className="fas fa-external-link-alt text-[10px] text-text-placeholder ml-1"></i>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {isPendingOrder(selectedOrder) ? (
                                        <>
                                            <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <i className="fas fa-satellite-dish text-accent-primary"></i> Radar Kho Xe ({matchingSuggestions.length})
                                            </h3>

                                            {matchingSuggestions.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {matchingSuggestions.map(car => (
                                                        <div key={car.VIN} className="bg-white p-4 rounded-xl border border-border-primary shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${car.matchScore === 100 ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                                                    {car.matchScore}%
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-text-primary">{car['Dòng xe']}</div>
                                                                    <div className="text-sm text-text-secondary mb-1">
                                                                        {car['Ngoại thất']} / {car['Nội thất']} <span className="text-text-placeholder">•</span> {car['Phiên bản']}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-mono bg-surface-ground px-1.5 py-0.5 rounded border border-border-secondary text-text-secondary">VIN: {car.VIN}</span>
                                                                        {car['Vị trí'] && <span className="text-xs bg-info/10 text-info px-1.5 py-0.5 rounded"><i className="fas fa-map-marker-alt mr-1"></i>{car['Vị trí']}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                onClick={() => onAction('pair', selectedOrder, { vin: car.VIN })}
                                                                variant="primary"
                                                                className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 shadow-sm"
                                                                rightIcon={<i className="fas fa-link"></i>}
                                                            >
                                                                Ghép Ngay
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-64 text-text-placeholder">
                                                    <i className="fas fa-search-minus text-4xl mb-3 opacity-50"></i>
                                                    <p>Không tìm thấy xe phù hợp trong kho</p>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        // Paired View Actions (Compact Horizontal Layout)
                                        <div className="bg-white rounded-xl border border-border-primary shadow-sm overflow-hidden animate-fade-in-up flex flex-col md:flex-row">
                                            {/* Left: Car Image & Visuals (35%) */}
                                            <div className="md:w-5/12 bg-gradient-to-br from-surface-ground to-white relative flex items-center justify-center p-2 md:p-3 border-b md:border-b-0 md:border-r border-border-secondary/50">
                                                <div className="absolute inset-0 bg-gradient-radial from-success/5 to-transparent opacity-50 rounded-full blur-2xl transform scale-75"></div>
                                                <CarImage
                                                    model={selectedOrder['Dòng xe']}
                                                    exteriorColor={selectedOrder['Ngoại thất']}
                                                    className="w-full max-h-24 md:max-h-40 object-contain relative z-10 drop-shadow-lg hover:scale-105 transition-transform duration-500"
                                                />
                                            </div>

                                            {/* Right: Info & Actions (65%) */}
                                            <div className="flex-1 p-2 md:p-3 flex flex-col justify-center relative overflow-hidden">
                                                {/* Decorative Background */}
                                                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-success/5 rounded-full blur-2xl"></div>

                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <span className="bg-success/10 text-success px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 border border-success/20 shadow-sm">
                                                            <i className="fas fa-check-circle"></i> Ghép Xe Thành Công
                                                        </span>
                                                    </div>

                                                    {/* VIN - Highlighted */}
                                                    <div className="mb-2 md:mb-3">
                                                        <label className="text-[9px] md:text-[10px] text-text-secondary font-bold uppercase tracking-widest mb-1 block opacity-70">Số VIN Đã Gán</label>
                                                        <div
                                                            onClick={() => handleCopy(selectedOrder.VIN || '', 'Số VIN')}
                                                            className="inline-block px-2 py-1 md:px-3 md:py-1.5 rounded-xl bg-accent-primary/10 border border-accent-primary/20 shadow-sm cursor-pointer hover:bg-accent-primary/20 transition-colors group/vin"
                                                            title="Click để sao chép số VIN"
                                                        >
                                                            <div className="text-lg md:text-3xl font-black text-accent-primary tracking-widest flex items-center gap-2 md:gap-3">
                                                                {selectedOrder.VIN}
                                                                <i className="fas fa-copy text-sm md:text-lg opacity-0 group-hover/vin:opacity-50 transition-opacity"></i>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="flex items-start gap-2 md:gap-4 md:gap-8 mb-2 md:mb-3 border-t border-b border-border-secondary/30 py-2">
                                                        <div>
                                                            <span className="text-text-secondary block text-[10px] font-bold uppercase tracking-wider mb-0.5">Thời gian ghép</span>
                                                            <div className="flex items-center gap-1.5 text-text-primary">
                                                                <i className="fas fa-calendar-alt text-text-placeholder text-[10px]"></i>
                                                                <span className="font-medium text-base">
                                                                    {selectedOrder['Thời gian ghép'] ? moment(selectedOrder['Thời gian ghép']).format('HH:mm DD/MM') : '--'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span className="text-text-secondary block text-[10px] font-bold uppercase tracking-wider mb-0.5">Đã ghép được</span>
                                                            <div className="flex items-center gap-1.5 text-accent-primary">
                                                                <i className="fas fa-hourglass-half text-[10px]"></i>
                                                                <span className="font-bold text-base">
                                                                    {selectedOrder['Thời gian ghép'] ? `${moment().diff(moment(selectedOrder['Thời gian ghép']), 'days')} ngày` : '--'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action */}
                                                    <div>
                                                        <Button
                                                            onClick={() => onAction('unmatch', selectedOrder)}
                                                            variant="danger"
                                                            size="sm"
                                                            leftIcon={<div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"><i className="fas fa-unlink text-[10px]"></i></div>}
                                                        >
                                                            Hủy Ghép Xe
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder">
                            <i className="fas fa-satellite text-6xl mb-4 opacity-20"></i>
                            <p className="text-lg font-medium">Chọn đơn hàng để bắt đầu ghép xe</p>
                            <p className="text-sm opacity-70">Hệ thống sẽ tự động tìm xe phù hợp</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchingCockpitView;
