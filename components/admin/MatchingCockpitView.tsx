import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { Order, StockVehicle, ActionType } from '../../types';

interface MatchingCockpitViewProps {
    pendingOrders: Order[];
    pairedOrders: Order[];
    stockData: StockVehicle[];
    onAction: (type: ActionType, order: Order, data?: any) => void;
    filters?: {
        keyword: string;
        tvbh: string[];
        dongXe: string[];
        ngoaiThat: string[];
        noiThat: string[];
    };
}

const MatchingCockpitView: React.FC<MatchingCockpitViewProps> = ({ pendingOrders, pairedOrders, stockData, onAction, filters }) => {
    const [activeTab, setActiveTab] = useState<'pending' | 'paired'>('pending');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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
                if (filters.ngoaiThat && filters.ngoaiThat.length > 0 && !filters.ngoaiThat.includes(order['Ngoại thất'])) return false;
                if (filters.noiThat && filters.noiThat.length > 0 && !filters.noiThat.includes(order['Nội thất'])) return false;
            }

            return true;
        });
    }, [activeTab, pendingOrders, pairedOrders, filters]);

    const selectedOrder = useMemo(() => filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId), [filteredOrders, selectedOrderId]);

    // Auto-select first order
    useEffect(() => {
        if (!selectedOrderId && filteredOrders.length > 0) {
            setSelectedOrderId(filteredOrders[0]['Số đơn hàng']);
        }
    }, [filteredOrders, selectedOrderId]);

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

    return (
        <div className="flex h-full bg-surface-card rounded-xl shadow-md border border-border-primary overflow-hidden animate-fade-in">
            {/* Left Column: Request Stream (40%) */}
            <div className="w-2/5 flex flex-col border-r border-border-primary bg-white">
                {/* Tabs */}
                <div className="flex border-b border-border-primary bg-surface-ground">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'pending' && !filters?.keyword ? 'bg-white text-accent-primary border-t-2 border-t-accent-primary' : 'text-text-secondary hover:bg-surface-hover border-t-2 border-t-transparent'}`}
                    >
                        Chờ Ghép <span className="ml-2 bg-accent-primary text-white text-xs px-2 py-0.5 rounded-full">{pendingOrders.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('paired')}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'paired' && !filters?.keyword ? 'bg-white text-success border-t-2 border-t-success' : 'text-text-secondary hover:bg-surface-hover border-t-2 border-t-transparent'}`}
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
                                    onClick={() => setSelectedOrderId(order['Số đơn hàng'])}
                                    className={`p-3 cursor-pointer transition-all relative group ${isSelected ? 'bg-accent-primary/5 border-l-4 border-accent-primary' : 'hover:bg-surface-hover border-l-4 border-transparent'}`}
                                >
                                    {isPending ? (
                                        // PENDING ORDER LAYOUT
                                        <>
                                            <div className={`absolute right-2 top-2 w-2 h-2 rounded-full ${stockStatus === 'success' ? 'bg-success' : stockStatus === 'warning' ? 'bg-warning' : 'bg-danger'}`}></div>
                                            <div className="pr-4">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>{order['Tên khách hàng']}</h3>
                                                </div>
                                                <div className="text-xs text-text-secondary mb-0.5">
                                                    <span className="font-medium text-text-primary">{order['Dòng xe']} {order['Phiên bản']}</span>
                                                </div>
                                                <div className="text-xs text-text-secondary mb-1">
                                                    {order['Ngoại thất']} / {order['Nội thất']}
                                                </div>

                                                {exactMatchesCount > 0 && (
                                                    <div className="mt-1 inline-block">
                                                        <span className="bg-success/10 text-success text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border border-success/20">
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
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-accent-primary' : 'text-text-primary'}`}>{order['Tên khách hàng']}</h3>
                                                <span className="text-[10px] font-bold text-white bg-success px-2 py-0.5 rounded shadow-sm font-mono">
                                                    {order.VIN?.slice(-7)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-text-secondary mb-0.5">
                                                <span className="font-medium text-text-primary">{order['Dòng xe']} {order['Phiên bản']}</span>
                                            </div>
                                            <div className="text-xs text-text-secondary mb-1">
                                                {order['Ngoại thất']} / {order['Nội thất']}
                                            </div>

                                            {/* Detailed Info for Paired */}
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
                                                <div className="flex justify-between bg-surface-ground/50 rounded px-1 py-0.5">
                                                    <div title="Ngày ghép">
                                                        <i className="fas fa-link text-text-placeholder w-3"></i>
                                                        {order['Thời gian ghép'] ? moment(order['Thời gian ghép']).format('DD/MM') : '--'}
                                                    </div>
                                                    {order['Thời gian ghép'] && (
                                                        <div className="font-bold text-accent-primary">
                                                            {moment().diff(moment(order['Thời gian ghép']), 'days')} ngày
                                                        </div>
                                                    )}
                                                </div>
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
            <div className="w-3/5 flex flex-col bg-surface-ground min-w-0">
                {selectedOrder ? (
                    <div className="flex-1 flex flex-col">
                        {/* Header */}
                        <div className="px-6 py-4 bg-white border-b border-border-primary flex justify-between items-start shadow-sm z-10">
                            <div>
                                <h2 className="text-xl font-bold text-text-primary mb-1">{selectedOrder['Tên khách hàng']}</h2>
                                <div className="flex items-center gap-3 text-sm text-text-secondary">
                                    <span className="font-mono bg-surface-ground px-2 py-0.5 rounded border border-border-secondary">{selectedOrder['Số đơn hàng']}</span>
                                    <span><i className="fas fa-user-tie mr-1"></i>{selectedOrder['Tên tư vấn bán hàng']}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-accent-primary">{selectedOrder['Dòng xe']}</div>
                                <div className="text-sm text-text-secondary">{selectedOrder['Ngoại thất']} / {selectedOrder['Nội thất']}</div>
                                <div className="text-xs text-text-secondary mt-0.5">{selectedOrder['Phiên bản']}</div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-4">
                                {/* Detailed Order Info Section */}
                                <div className="bg-white p-4 rounded-xl border border-border-primary shadow-sm">
                                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 border-b border-border-secondary pb-2">Thông Tin Chi Tiết</h3>

                                    {/* Highlighted VIN for Paired Orders */}
                                    {!isPendingOrder(selectedOrder) && selectedOrder.VIN && (
                                        <div className="mb-4 bg-success/10 border border-success/30 rounded-lg p-3 flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-success font-semibold uppercase">Số VIN Đã Ghép</div>
                                                <div className="text-2xl font-mono font-bold text-success">{selectedOrder.VIN}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-success font-semibold uppercase">Thời Gian Ghép</div>
                                                <div className="font-medium text-success-dark">
                                                    {selectedOrder['Thời gian ghép'] ? moment(selectedOrder['Thời gian ghép']).format('HH:mm DD/MM/YYYY') : 'N/A'}
                                                </div>
                                                {selectedOrder['Thời gian ghép'] && (
                                                    <div className="text-xs text-success mt-1">
                                                        Đã ghép <span className="font-bold">{moment().diff(moment(selectedOrder['Thời gian ghép']), 'days')}</span> ngày
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Ngày Yêu Cầu</label>
                                            <div className="text-sm font-medium text-text-primary">{moment(selectedOrder['Thời gian nhập']).format('DD/MM/YYYY')}</div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-text-secondary block mb-0.5 uppercase">Ngày Cọc</label>
                                            <div className="text-sm font-medium text-text-primary">{selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : 'N/A'}</div>
                                        </div>
                                    </div>

                                    {/* Documents */}
                                    <div className="flex gap-2 flex-wrap border-t border-border-secondary pt-3">
                                        {[{ key: 'LinkHopDong', label: 'Hợp đồng', icon: 'fa-file-contract' }, { key: 'LinkDeNghiXHD', label: 'Đề nghị XHĐ', icon: 'fa-file-invoice' }].map(doc => {
                                            const url = selectedOrder[doc.key];
                                            if (!url) return null;
                                            return (
                                                <a key={doc.key} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-surface-ground border border-border-secondary rounded-lg hover:bg-surface-hover transition-colors text-xs text-text-primary">
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
                                                        <button
                                                            onClick={() => onAction('pair', selectedOrder, { vin: car.VIN })}
                                                            className="btn-primary px-4 py-2 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                                                        >
                                                            Ghép Ngay <i className="fas fa-link ml-1"></i>
                                                        </button>
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
                                    // Paired View Actions
                                    <div className="bg-white p-6 rounded-xl border border-border-primary shadow-sm text-center">
                                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                            <i className="fas fa-check"></i>
                                        </div>
                                        <h3 className="text-xl font-bold text-text-primary mb-2">Đã Ghép Xe Thành Công</h3>
                                        <div className="text-sm text-text-secondary mb-6">Đơn hàng này đã được gán số VIN</div>

                                        <div className="mt-4">
                                            <button
                                                onClick={() => onAction('unmatch', selectedOrder)}
                                                className="btn-danger px-6 py-2 rounded-lg shadow-sm"
                                            >
                                                <i className="fas fa-unlink mr-2"></i> Hủy Ghép Xe
                                            </button>
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
    );
};

export default MatchingCockpitView;
