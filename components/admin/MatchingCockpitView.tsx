import React, { useMemo, useEffect, useState } from 'react';
import { includesNormalized } from '../../utils/stringUtils';
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
        const keyword = filters?.keyword || '';

        // If searching, search in both lists. Otherwise use active tab.
        let source = activeTab === 'pending' ? pendingOrders : pairedOrders;
        if (keyword) {
            source = [...pendingOrders, ...pairedOrders];
        }

        return source.filter(order => {
            // Keyword Filter
            const matchesKeyword =
                !keyword ||
                includesNormalized(order['Tên khách hàng'], keyword) ||
                includesNormalized(order['Số đơn hàng'], keyword) ||
                includesNormalized(order['Dòng xe'], keyword) ||
                includesNormalized(order['VIN'], keyword) ||
                includesNormalized(order['Phiên bản'], keyword) ||
                includesNormalized(order['Ngoại thất'], keyword) ||
                includesNormalized(order['Nội thất'], keyword) ||
                includesNormalized(order['Tên tư vấn bán hàng'], keyword) ||
                includesNormalized(order['CHÍNH SÁCH'], keyword) ||
                includesNormalized(order['Số động cơ'], keyword);

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
        if (filteredOrders.length > 0 && !selectedOrderId) {
            onOrderSelect(filteredOrders[0]['Số đơn hàng']);
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
            const versionMatch = !selectedOrder['Phiên bản'] || car['Phiên bản'] === selectedOrder['Phiên bản'];

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

    return (
        <div className="flex flex-col h-full bg-surface-card rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in relative">
            {/* Mobile Tab Switcher */}
            <div className="md:hidden flex border-b border-border-primary bg-white flex-shrink-0">
                <button
                    onClick={() => setMobileTab('requests')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'requests' ? 'border-accent-primary text-accent-primary bg-accent-primary/5' : 'border-transparent text-text-secondary'}`}
                >
                    Danh Sách ({filteredOrders.length})
                </button>
                <button
                    onClick={() => setMobileTab('radar')}
                    className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${mobileTab === 'radar' ? 'border-accent-primary text-accent-primary bg-accent-primary/5' : 'border-transparent text-text-secondary'}`}
                >
                    Chi Tiết ({selectedOrder ? '1' : '0'})
                </button>
            </div>

            <div className="flex-1 flex min-h-0 relative">
                {/* Left Column: The Queue (30%) */}
                <div className={`w-full md:w-[30%] flex flex-col border-r border-border-primary bg-surface-ground absolute md:relative inset-0 z-10 md:z-auto transition-transform duration-300 ${mobileTab === 'requests' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                    {/* Tabs */}
                    <div className="flex border-b border-border-primary bg-white flex-shrink-0">
                        <button
                            onClick={() => onTabChange('pending')}
                            className={`flex-1 py-3 text-xs font-bold transition-colors uppercase tracking-wider ${activeTab === 'pending' ? 'text-accent-primary border-b-2 border-accent-primary bg-accent-primary/5' : 'text-text-secondary hover:bg-surface-hover border-b-2 border-transparent'}`}
                        >
                            Chờ Ghép ({pendingOrders.length})
                        </button>
                        <button
                            onClick={() => onTabChange('paired')}
                            className={`flex-1 py-3 text-xs font-bold transition-colors uppercase tracking-wider ${activeTab === 'paired' ? 'text-success border-b-2 border-success bg-success/5' : 'text-text-secondary hover:bg-surface-hover border-b-2 border-transparent'}`}
                        >
                            Đã Ghép ({pairedOrders.length})
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
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
                                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 relative border ${isSelected ? 'bg-white border-accent-primary shadow-md ring-1 ring-accent-primary/20' : 'bg-white border-border-secondary hover:border-accent-primary/50 hover:shadow-sm'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`text-sm font-bold truncate pr-2 ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>{order['Tên khách hàng']}</h3>
                                        {isPending && (
                                            <div className="flex items-center gap-1">
                                                {exactMatchesCount > 0 && (
                                                    <span className="text-[9px] font-bold text-white bg-success px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                                                        CÓ XE
                                                    </span>
                                                )}
                                                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stockStatus === 'success' ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]' : stockStatus === 'warning' ? 'bg-warning' : 'bg-danger'}`}></div>
                                            </div>
                                        )}
                                        {!isPending && (
                                            <div className="flex items-center gap-1">
                                                <span className="text-[10px] font-mono font-bold text-success bg-success/10 px-1.5 py-0.5 rounded border border-success/20">
                                                    {order.VIN?.slice(-6)}
                                                </span>
                                                <i className="fas fa-check-circle text-success text-xs"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-text-secondary mb-1 truncate">
                                        <span className="font-medium text-text-primary">{order['Dòng xe']}</span>
                                        <span className="mx-1 text-text-placeholder">|</span>
                                        <span>{order['Phiên bản']}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-text-secondary mt-2 pt-2 border-t border-border-secondary/30">
                                        <span className="truncate max-w-[60%]">{order['Tên tư vấn bán hàng']}</span>
                                        <span className="font-mono">{moment(order['Thời gian nhập']).format('DD/MM')}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredOrders.length === 0 && (
                            <div className="text-center py-8 text-text-placeholder text-sm">Không tìm thấy đơn hàng</div>
                        )}
                    </div>
                </div>

                {/* Right Column: The Cockpit (70%) */}
                <div
                    className={`w-full md:w-[70%] flex flex-col bg-surface-ground min-w-0 absolute md:relative inset-0 z-0 md:z-auto transition-transform duration-300 ${mobileTab === 'radar' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}
                >
                    {selectedOrder ? (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* 1. Customer Hero Card */}
                            <div className="m-3 md:m-4 p-4 bg-white rounded-2xl border border-border-primary shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0 relative overflow-hidden">
                                {/* Background Decor */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-xl md:text-2xl font-bold text-text-primary">{selectedOrder['Tên khách hàng']}</h2>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-surface-ground border border-border-secondary text-text-secondary">{selectedOrder['Số đơn hàng']}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-2.5 py-1 rounded-lg bg-accent-primary/10 text-accent-primary text-xs font-bold border border-accent-primary/20">
                                            {selectedOrder['Dòng xe']}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg bg-surface-ground text-text-primary text-xs font-medium border border-border-secondary">
                                            {selectedOrder['Phiên bản']}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg bg-surface-ground text-text-primary text-xs font-medium border border-border-secondary flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-gray-800"></span>
                                            {selectedOrder['Ngoại thất']} / {selectedOrder['Nội thất']}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex gap-4 text-right relative z-10">
                                    <div>
                                        <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Ngày Yêu Cầu</div>
                                        <div className="text-sm font-bold text-text-primary">{moment(selectedOrder['Thời gian nhập']).format('DD/MM/YYYY')}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Ngày Cọc</div>
                                        <div className="text-sm font-bold text-text-primary">{selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : '--'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Radar Section (Only for Pending) */}
                            {isPendingOrder(selectedOrder) ? (
                                <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-3 md:px-4 pb-3 md:pb-4">
                                    {/* Radar Visual */}
                                    <div className="flex-1 bg-gradient-to-b from-gray-900 to-gray-800 rounded-2xl shadow-inner border border-gray-700 relative overflow-hidden flex items-center justify-center mb-3 group">
                                        {/* Grid Lines */}
                                        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                                        {/* Radar Circles */}
                                        <div className="absolute w-[500px] h-[500px] border border-emerald-500/20 rounded-full animate-[ping_3s_linear_infinite]"></div>
                                        <div className="absolute w-[350px] h-[350px] border border-emerald-500/30 rounded-full"></div>
                                        <div className="absolute w-[200px] h-[200px] border border-emerald-500/50 rounded-full"></div>

                                        {/* Scanning Line */}
                                        <div className="absolute w-full h-1/2 top-0 bg-gradient-to-b from-transparent to-emerald-500/10 origin-bottom animate-[spin_4s_linear_infinite] border-b border-emerald-500/50"></div>

                                        {/* Center: Best Match or Scanning */}
                                        <div className="relative z-10 flex flex-col items-center">
                                            {matchingSuggestions.length > 0 ? (
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full animate-pulse"></div>
                                                    <div className="bg-white p-2 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.4)] border-4 border-emerald-500 relative z-10 w-32 h-32 flex items-center justify-center overflow-hidden">
                                                        <CarImage
                                                            model={selectedOrder['Dòng xe']}
                                                            exteriorColor={selectedOrder['Ngoại thất']}
                                                            className="w-full h-full object-contain transform scale-125"
                                                        />
                                                    </div>
                                                    <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg whitespace-nowrap z-20">
                                                        Best Match
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center text-emerald-500/50">
                                                    <i className="fas fa-satellite-dish text-4xl mb-2 animate-bounce"></i>
                                                    <span className="text-sm font-mono tracking-widest">SCANNING...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Floating Stats */}
                                        <div className="absolute top-4 left-4 text-emerald-500/80 font-mono text-xs">
                                            <div>RADAR: ACTIVE</div>
                                            <div>TARGET: {selectedOrder['Dòng xe']}</div>
                                        </div>
                                        <div className="absolute bottom-4 right-4 text-emerald-500/80 font-mono text-xs text-right">
                                            <div>MATCHES: {matchingSuggestions.length}</div>
                                            <div>STATUS: {matchingSuggestions.length > 0 ? 'FOUND' : 'SEARCHING'}</div>
                                        </div>
                                    </div>

                                    {/* 3. Stock Grid (Results) */}
                                    <div className="h-48 md:h-60 bg-white rounded-2xl border border-border-primary shadow-sm flex flex-col overflow-hidden">
                                        <div className="px-4 py-2 border-b border-border-secondary bg-surface-ground flex justify-between items-center">
                                            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Kho Xe Phù Hợp ({matchingSuggestions.length})</h3>
                                            <button className="text-accent-primary text-xs hover:underline">Xem tất cả kho</button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                                            {matchingSuggestions.length > 0 ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {matchingSuggestions.map(car => (
                                                        <div key={car.VIN} className="flex items-center justify-between p-3 bg-white border border-border-secondary rounded-xl hover:border-accent-primary hover:shadow-md transition-all group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm border border-emerald-100">
                                                                    {car.matchScore}%
                                                                </div>
                                                                <div>
                                                                    <div className="text-xs font-bold text-text-primary">{car.VIN}</div>
                                                                    <div className="text-[10px] text-text-secondary">{car['Ngoại thất']} / {car['Nội thất']}</div>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                onClick={() => onAction('pair', selectedOrder, { vin: car.VIN })}
                                                                variant="primary"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                Ghép
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-text-placeholder">
                                                    <p className="text-sm">Chưa tìm thấy xe phù hợp trong kho.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Paired View - Redesigned
                                <div className="flex-1 p-4 flex flex-col items-center justify-center relative overflow-hidden">
                                    {/* Background Ambient Glow */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-accent-primary/5 pointer-events-none"></div>
                                    <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-success/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

                                    <div className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-2xl text-center max-w-2xl w-full relative z-10 animate-scale-in">
                                        {/* Success Badge */}
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 text-success font-bold text-sm mb-6 border border-success/20 shadow-sm">
                                            <i className="fas fa-check-circle"></i>
                                            ĐÃ GHÉP XE THÀNH CÔNG
                                        </div>

                                        {/* Car Image */}
                                        <div className="relative mb-8 group h-48 flex items-center justify-center">
                                            <div className="absolute inset-x-0 bottom-0 h-4 bg-black/20 blur-xl rounded-[100%] transform scale-x-75 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <CarImage
                                                model={selectedOrder['Dòng xe']}
                                                exteriorColor={selectedOrder['Ngoại thất']}
                                                className="w-full h-full object-contain drop-shadow-2xl transform transition-transform duration-500 hover:scale-110"
                                            />
                                        </div>

                                        {/* VIN Display */}
                                        <div className="mb-8">
                                            <div className="text-xs text-text-secondary uppercase tracking-widest font-bold mb-2">Số Khung (VIN)</div>
                                            <div
                                                className="text-3xl md:text-5xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-text-primary to-text-secondary tracking-wider cursor-pointer hover:opacity-80 transition-opacity select-all"
                                                onClick={() => handleCopy(selectedOrder.VIN || '', 'VIN')}
                                                title="Click để sao chép"
                                            >
                                                {selectedOrder.VIN}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex justify-center">
                                            <Button
                                                onClick={() => onAction('unmatch', selectedOrder)}
                                                variant="danger"
                                                className="px-8 py-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                                            >
                                                <i className="fas fa-unlink mr-2"></i>
                                                Hủy Ghép Xe
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-text-placeholder bg-surface-ground">
                            <i className="fas fa-satellite text-6xl mb-4 opacity-10"></i>
                            <p className="text-lg font-medium opacity-50">Chọn đơn hàng để bắt đầu</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchingCockpitView;

