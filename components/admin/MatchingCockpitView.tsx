import React, { useState, useMemo, useEffect } from 'react';
import { LoaderCircle } from 'lucide-react';
import moment from 'moment';
import { Order, StockVehicle, ActionType } from '../../types';
import CarImage from '../ui/CarImage';
import Button from '../ui/Button';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import MobileMatchingView from './mobile/MobileMatchingView';
import { getExteriorSwatchColor } from '../../utils/styleUtils';
import '../orders/orders-premium.css';

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
    const searchedOrders = filteredOrders;

    const selectedOrder = useMemo(() => searchedOrders.find(o => o['Số đơn hàng'] === selectedOrderId) || filteredOrders.find(o => o['Số đơn hàng'] === selectedOrderId), [searchedOrders, filteredOrders, selectedOrderId]);

    useEffect(() => {
        if (searchedOrders.length > 0) {
            const currentInList = searchedOrders.find(o => o['Số đơn hàng'] === selectedOrderId);
            if (!currentInList) {
                onOrderSelect(searchedOrders[0]['Số đơn hàng']);
            }
        }
    }, [searchedOrders, activeTab]);

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

    const [, setMobileView] = useState<'folders' | 'list' | 'detail'>('list');

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

            {/* Desktop 2-Column Automotive Cockpit (>= 768px): Matched with Tab Đơn Hàng */}
            <div className="hidden md:grid premium-orders matching-workspace">
                {/* Left Column: Orders Sidebar */}
                <aside className="premium-orders-sidebar" aria-label="Danh sách đơn hàng ghép xe">
                    <div className="premium-list-heading">
                        <h1>Ghép xe <span>{filteredOrders.length}</span></h1>
                        <div className="matching-status-tabs">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabSwitch(tab.id as any)}
                                    title={tab.label}
                                    aria-pressed={activeTab === tab.id}
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-slate-900 text-white font-bold'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {tab.id === 'pending' ? 'Chờ ghép' : tab.id === 'suggested' ? 'Có xe' : 'Đã ghép'} <span>{tab.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div id="matching-sidebar-filter-target" className="invoice-sidebar-filter-target" />

                    <div className="premium-order-list" aria-busy={isLoading}>
                        {isLoading && searchedOrders.length === 0 && (
                            <div className="premium-list-message">
                                <LoaderCircle size={20} className="animate-spin" />
                                Đang tải danh sách…
                            </div>
                        )}
                        {!isLoading && searchedOrders.length === 0 && (
                            <div className="premium-list-message">
                                <strong>Không có đơn hàng</strong>
                                <p>Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
                            </div>
                        )}
                        {searchedOrders.map(order => {
                            const isSelected = selectedOrder?.['Số đơn hàng'] === order['Số đơn hàng'];
                            const isPaired = !isPendingOrder(order);
                            const statusText = isPaired ? 'Đã ghép' : (getStockStatus(order) > 0 ? `Có ${getStockStatus(order)} xe kho` : 'Chờ ghép');
                            const tone = isPaired ? 'blue' : (getStockStatus(order) > 0 ? 'green' : 'amber');
                            const date = moment(order['Ngày cọc'] || order['Thời gian nhập'], [moment.ISO_8601, 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);

                            return (
                                <button
                                    type="button"
                                    key={order['Số đơn hàng']}
                                    className="premium-order-row"
                                    aria-pressed={isSelected}
                                    onClick={() => handleOrderClick(order['Số đơn hàng'])}
                                >
                                    <span className="premium-row-top">
                                        <strong>{order['Tên khách hàng'] || 'Chưa có tên'}</strong>
                                        <span className="premium-status" data-tone={tone}>
                                            <i />
                                            {statusText}
                                        </span>
                                    </span>
                                    <span className="premium-row-bottom">
                                        <span>{order['Dòng xe']} · {order['Phiên bản'] || '—'}</span>
                                        <time>{date.isValid() ? date.format('DD/MM/YYYY') : '—'}</time>
                                    </span>
                                    <span className="premium-row-id">{order['Số đơn hàng']}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="premium-list-footer">
                        {searchedOrders.length} / {filteredOrders.length} đơn hàng
                    </div>
                </aside>

                {/* Right Column: Automotive Cockpit Detail */}
                <section className="premium-order-content" aria-label="Chi tiết đơn hàng ghép xe">
                    {selectedOrder ? (
                        <div className="ios-order-detail-main">
                            <div className="premium-detail-heading">
                                <div className="premium-detail-breadcrumb">
                                    Quản trị <span>/</span> Ghép xe <span>/</span> {selectedOrder['Số đơn hàng']}
                                </div>
                                <div className="premium-detail-title-row">
                                    <div>
                                        <h2>{selectedOrder['Tên khách hàng']}</h2>
                                        <p>Tư vấn bán hàng <span>·</span> {selectedOrder['Tên tư vấn bán hàng'] || 'Chưa gán TVBH'}</p>
                                    </div>
                                    <div className="premium-detail-actions">
                                        <span className="premium-status" data-tone={!isPendingOrder(selectedOrder) ? 'blue' : (matchingSuggestions.length > 0 ? 'green' : 'amber')}>
                                            <i />
                                            {!isPendingOrder(selectedOrder) ? 'Đã ghép xe' : (matchingSuggestions.length > 0 ? `Sẵn sàng ghép (${matchingSuggestions.length} xe)` : 'Đang chờ xe')}
                                        </span>
                                        {activeTab === 'paired' && (
                                            <button
                                                type="button"
                                                onClick={() => onNavigateToTab?.('invoices', { id: selectedOrder['Số đơn hàng'] })}
                                                className="premium-inline-action is-dark"
                                            >
                                                <i className="fa-solid fa-file-invoice-dollar"></i> Xem Hóa Đơn
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="ios-order-detail-body">
                                {/* Automotive Digital Twin Hero Zone */}
                                <div className="premium-vehicle-summary">
                                    <div className="premium-vehicle-photo">
                                        <CarImage
                                            model={selectedOrder['Dòng xe']}
                                            exteriorColor={selectedOrder['Ngoại thất']}
                                            className="max-h-full max-w-full object-contain drop-shadow-md"
                                        />
                                    </div>
                                    <div className="premium-vehicle-info">
                                        <h3>
                                            {selectedOrder['Dòng xe']} <span>{selectedOrder['Phiên bản']}</span>
                                        </h3>
                                        <div className="premium-vehicle-vin">
                                            <span>VIN</span>
                                            {selectedOrder['VIN'] ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => copyWithFeedback(selectedOrder['VIN'] || '', e)}
                                                    title="Click để sao chép số VIN"
                                                >
                                                    <i className="fa-regular fa-copy" />
                                                    {selectedOrder['VIN']}
                                                </button>
                                            ) : (
                                                <small>Chưa ghép xe</small>
                                            )}
                                        </div>
                                        <div className="premium-vehicle-specs">
                                            <div>
                                                <dt>Ngoại thất</dt>
                                                <dd>
                                                    <span
                                                        className="premium-color-swatch"
                                                        style={{ background: getExteriorSwatchColor(selectedOrder['Ngoại thất']) }}
                                                    />
                                                    {selectedOrder['Ngoại thất'] || '—'}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt>Nội thất</dt>
                                                <dd>{selectedOrder['Nội thất'] || '—'}</dd>
                                            </div>
                                            <div>
                                                <dt>Xe kho phù hợp</dt>
                                                <dd className={matchingSuggestions.length > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
                                                    {matchingSuggestions.length} xe sẵn có
                                                </dd>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tri-Board: 3 Frameless Columns */}
                                <div className="premium-tri-board">
                                    {/* Col 1: Vertical Timeline */}
                                    <div className="premium-tri-col">
                                        <div className="premium-tri-head">
                                            <h3>Tiến độ đơn hàng</h3>
                                        </div>
                                        <div className="premium-tri-body">
                                            <div className="premium-timeline is-four-step">
                                                <div data-complete="true">
                                                    <div className="premium-timeline-node"><i className="fas fa-check" /></div>
                                                    <div className="premium-timeline-copy">
                                                        <div>
                                                            <p>Ngày Cọc</p>
                                                            <p>{selectedOrder['Ngày cọc'] ? moment(selectedOrder['Ngày cọc']).format('DD/MM/YYYY') : '—'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div data-complete="true">
                                                    <div className="premium-timeline-node"><i className="fas fa-check" /></div>
                                                    <div className="premium-timeline-copy">
                                                        <div>
                                                            <p>Tạo Yêu Cầu</p>
                                                            <p>{selectedOrder['Thời gian nhập'] ? moment(selectedOrder['Thời gian nhập']).format('DD/MM/YYYY HH:mm') : '—'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div data-complete={!isPendingOrder(selectedOrder)} data-current={isPendingOrder(selectedOrder)}>
                                                    <div className="premium-timeline-node"><i className="fas fa-check" /></div>
                                                    <div className="premium-timeline-copy">
                                                        <div>
                                                            <p>Ghép Số VIN</p>
                                                            <p>{selectedOrder['VIN'] || 'Chưa ghép xe'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div data-complete={!!selectedOrder['Ngày xuất HĐ']}>
                                                    <div className="premium-timeline-node"><i className="fas fa-check" /></div>
                                                    <div className="premium-timeline-copy">
                                                        <div>
                                                            <p>Xuất Hóa Đơn</p>
                                                            <p>{selectedOrder['Ngày xuất HĐ'] ? moment(selectedOrder['Ngày xuất HĐ']).format('DD/MM/YYYY') : 'Chưa xuất HĐ'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Col 2: Order Dossier */}
                                    <div className="premium-tri-col is-bordered">
                                        <div className="premium-tri-head">
                                            <h3>Thông tin & Hồ sơ</h3>
                                        </div>
                                        <div className="premium-tri-body">
                                            <div className="premium-dossier-list">
                                                <div className="premium-dossier-row">
                                                    <span>Số đơn hàng</span>
                                                    <button type="button" className="is-mono" onClick={(e) => copyWithFeedback(selectedOrder['Số đơn hàng'], e)} title="Click để sao chép">
                                                        {selectedOrder['Số đơn hàng']}
                                                    </button>
                                                </div>
                                                <div className="premium-dossier-row">
                                                    <span>Hợp đồng Cyber</span>
                                                    <strong>{selectedOrder['Số hợp đồng'] || '—'}</strong>
                                                </div>
                                                <div className="premium-dossier-row">
                                                    <span>Số máy</span>
                                                    <strong>{selectedOrder['Số máy'] || 'Chưa có'}</strong>
                                                </div>
                                                <div className="premium-dossier-row">
                                                    <span>Số điện thoại</span>
                                                    <strong>{selectedOrder['Số điện thoại'] || selectedOrder['SĐT'] || '—'}</strong>
                                                </div>
                                                <div className="premium-dossier-row">
                                                    <span>Chính sách</span>
                                                    <strong>{selectedOrder['CHÍNH SÁCH'] || '—'}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Col 3: Stock Matches & 1-Click Pair Actions */}
                                    <div className="premium-tri-col is-bordered">
                                        <div className="premium-tri-head">
                                            <h3>Kho xe phù hợp</h3>
                                            <span className="premium-tri-count is-violet">{matchingSuggestions.length} xe</span>
                                        </div>
                                        <div className="premium-tri-body overflow-y-auto">
                                            {matchingSuggestions.length > 0 ? (
                                                <div className="space-y-1.5 py-1">
                                                    {matchingSuggestions.map(car => (
                                                        <div
                                                            key={car.VIN}
                                                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 hover:bg-blue-50/50 hover:border-blue-200 transition-all"
                                                        >
                                                            <div className="min-w-0 pr-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => copyWithFeedback(car.VIN, e)}
                                                                    className="font-mono text-xs font-bold text-slate-800 hover:text-blue-600 block truncate"
                                                                    title="Sao chép VIN"
                                                                >
                                                                    {car.VIN}
                                                                </button>
                                                                <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                                                                    <span>{car['Kho'] || 'Kho chung'}</span>
                                                                    {car['Số máy'] && <span>· Máy: {car['Số máy']}</span>}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => onAction('pair', selectedOrder, { vin: car.VIN })}
                                                                disabled={!!processingId}
                                                                className="premium-inline-action is-dark shrink-0"
                                                                title="Ghép xe này vào đơn hàng"
                                                            >
                                                                <i className="fa-solid fa-link text-[10px]"></i> Ghép
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="premium-policy-empty text-center py-6">
                                                    <i className="fa-solid fa-warehouse text-slate-300 text-xl mb-1 block" />
                                                    <span>Không có xe phù hợp trong kho</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Docked Footer Bar */}
                            <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-3 bg-white">
                                <div className="text-xs text-slate-400">
                                    Đơn hàng: <strong className="font-mono text-slate-700">{selectedOrder['Số đơn hàng']}</strong>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isPendingOrder(selectedOrder) ? (
                                        <Button
                                            onClick={() => onAction('cancel', selectedOrder)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs font-bold text-rose-600 hover:bg-rose-50"
                                            isLoading={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'cancel'}
                                            disabled={!!processingId}
                                        >
                                            <i className="fa-regular fa-trash-can mr-1"></i> Hủy Đơn Hàng
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => onAction('unmatch', selectedOrder)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs font-bold text-rose-600 hover:bg-rose-50"
                                            isLoading={processingId === selectedOrder['Số đơn hàng'] && processingActionType === 'unmatch'}
                                            disabled={!!processingId}
                                        >
                                            <i className="fa-solid fa-link-slash mr-1"></i> Hủy Ghép Xe
                                        </Button>
                                    )}
                                </div>
                            </footer>
                        </div>
                    ) : (
                        <div className="premium-detail-empty">
                            <i className="fa-solid fa-car-side" />
                            <h2>Chưa chọn đơn hàng</h2>
                            <p>Chọn một đơn hàng từ danh sách bên trái để xem chi tiết ghép xe.</p>
                        </div>
                    )}
                </section>
            </div>
        </>
    );
};
export default MatchingCockpitView;
