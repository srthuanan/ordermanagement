import React, { useMemo, useState } from 'react';
import { BarChart3, Filter, LoaderCircle, Plus, Search, X } from 'lucide-react';
import moment from 'moment';
import { Order } from '../../types';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import './orders-premium.css';

interface Props {
    orders: Order[];
    visibleOrders: Order[];
    filteredCount: number;
    selectedOrderId?: string;
    filters: { keyword: string; carModel: string[]; version: string[]; status: string[]; exterior: string[] };
    onFilterChange: (value: Partial<Props['filters']>) => void;
    onReset: () => void;
    onSelect: (order: Order) => void;
    onRefresh: () => void;
    onCreateOrder?: () => void;
    onStats: () => void;
    loading: boolean;
    error: string | null;
    processingOrder: string | null;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    onLoadMore: () => void;
    hasArchives: boolean;
    loadingArchives: boolean;
    onLoadArchives: () => void;
    children: React.ReactNode;
}

export const orderStatusTone = (value: string) => {
    const status = value.toLocaleLowerCase('vi-VN');
    if (/hủy|từ chối/.test(status)) return 'red';
    if (/đã xuất|hoàn tất|hoàn thành/.test(status)) return 'green';
    if (/chờ|yêu cầu bổ sung/.test(status)) return 'amber';
    if (/đã ghép|đã phê duyệt|đã bổ sung/.test(status)) return 'blue';
    return 'gray';
};

export default function PremiumOrdersWorkspace(props: Props) {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const facets = useMemo(() => {
        const unique = (key: keyof Order) => [...new Set(props.orders.map(order => String(order[key] || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        return [
            { key: 'carModel' as const, label: 'Dòng xe', options: unique('Dòng xe') },
            { key: 'version' as const, label: 'Phiên bản', options: unique('Phiên bản') },
            { key: 'status' as const, label: 'Trạng thái', options: [...new Set(props.orders.map(order => order['Trạng thái VC'] || order['Kết quả'] || 'Chưa ghép'))] },
            { key: 'exterior' as const, label: 'Ngoại thất', options: unique('Ngoại thất') },
        ];
    }, [props.orders]);
    const activeCount = facets.reduce((count, facet) => count + props.filters[facet.key].length, 0);
    return <div className="premium-orders">
        <aside className="premium-orders-sidebar" aria-label="Danh sách đơn hàng">
            <div className="premium-list-heading"><h1>Đơn hàng <span>{props.orders.length}</span></h1><div>
                <button type="button" aria-label="Thống kê đơn hàng" title="Thống kê" onClick={props.onStats}><BarChart3 size={16} /></button>
                {props.onCreateOrder && <button type="button" aria-label="Tạo đơn hàng mới" title="Tạo đơn hàng mới" onClick={props.onCreateOrder}><Plus size={16} /></button>}
            </div></div>
            <div className="premium-list-search"><label><Search size={16} /><input aria-label="Tìm đơn hàng" placeholder="Tìm khách hàng, mã đơn, VIN…" value={props.filters.keyword} onChange={event => props.onFilterChange({ keyword: event.target.value })} />{props.filters.keyword && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => props.onFilterChange({ keyword: '' })}><X size={14} /></button>}</label>
                <button type="button" aria-label="Bộ lọc đơn hàng" aria-expanded={filtersOpen} aria-controls="premium-order-filters" className="premium-filter-toggle" onClick={() => setFiltersOpen(open => !open)}><Filter size={16} />{activeCount ? <span>{activeCount}</span> : 'Lọc'}</button>
            </div>
            {filtersOpen && <div id="premium-order-filters" className="premium-filter-panel" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setFiltersOpen(false); } }}>
                <div><strong>Bộ lọc</strong><button type="button" onClick={props.onReset}>Đặt lại</button><button type="button" aria-label="Đóng bộ lọc" onClick={() => setFiltersOpen(false)}><X size={15} /></button></div>
                {facets.map(facet => <div className="premium-filter-facet" key={facet.key}><span>{facet.label}</span><MultiSelectDropdown id={`premium-filter-${facet.key}`} label={facet.label} icon="fa-filter" options={facet.options} selectedOptions={props.filters[facet.key]} onChange={selected => props.onFilterChange({ [facet.key]: selected })} searchable size="compact" displayMode="selection" variant="modern" /></div>)}
                <button type="button" className="premium-filter-done" onClick={() => setFiltersOpen(false)}>Xem {props.filteredCount} đơn hàng</button>
            </div>}
            {(activeCount > 0 || props.filters.keyword) && <div className="premium-filter-summary"><span>{props.filteredCount} kết quả</span><button type="button" onClick={props.onReset}>Xóa bộ lọc</button></div>}
            <div className="premium-order-list" aria-busy={props.loading}>
                {props.loading && !props.visibleOrders.length && <div className="premium-list-message"><LoaderCircle size={20} className="animate-spin" />Đang tải đơn hàng…</div>}
                {props.error && <div className="premium-list-message" role="alert"><strong>Không thể tải đơn hàng</strong><p>{props.error}</p><button type="button" onClick={props.onRefresh}>Thử lại</button></div>}
                {props.visibleOrders.map(order => {
                    const status = order['Kết quả'] || order['Trạng thái VC'] || 'Chưa ghép';
                    const date = moment(order['Thời gian nhập'], [moment.ISO_8601, 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);
                    return <button type="button" key={order['Số đơn hàng']} className="premium-order-row" aria-pressed={props.selectedOrderId === order['Số đơn hàng']} onClick={() => props.onSelect(order)}>
                        <span className="premium-row-top"><strong>{order['Tên khách hàng'] || 'Chưa có tên khách hàng'}</strong>{props.processingOrder === order['Số đơn hàng'] ? <LoaderCircle size={14} className="animate-spin" /> : <span className="premium-status" data-tone={orderStatusTone(status)}><i />{status}</span>}</span>
                        <span className="premium-row-bottom"><span>{order['Dòng xe']} · {order['Phiên bản'] || '—'}</span><time>{date.isValid() ? date.format('DD/MM/YYYY') : '—'}</time></span>
                        <span className="premium-row-id">{order['Số đơn hàng']}</span>
                    </button>;
                })}
                {!props.loading && !props.error && !props.visibleOrders.length && <div className="premium-list-message"><strong>Không tìm thấy đơn hàng</strong><p>Thử đổi từ khóa hoặc bộ lọc.</p><button type="button" onClick={props.onReset}>Đặt lại bộ lọc</button></div>}
                {props.visibleOrders.length < props.filteredCount && <div ref={props.loadMoreRef} className="premium-list-more"><button type="button" onClick={props.onLoadMore}>Xem thêm đơn hàng</button></div>}
                {props.visibleOrders.length >= props.filteredCount && props.hasArchives && <div className="premium-list-more"><button type="button" disabled={props.loadingArchives} onClick={props.onLoadArchives}>{props.loadingArchives ? 'Đang tải…' : 'Tải thêm lưu trữ'}</button></div>}
            </div>
            <div className="premium-list-footer">{props.visibleOrders.length} / {props.filteredCount} đơn hàng</div>
        </aside>
        <section className="premium-order-content" aria-label="Chi tiết đơn hàng">{props.children}</section>
    </div>;
}
