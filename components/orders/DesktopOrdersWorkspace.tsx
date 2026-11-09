import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, BarChart3, ChevronRight, Filter, LoaderCircle, Plus, RefreshCw, Search, X } from 'lucide-react';
import moment from 'moment';
import { Order, SortConfig } from '../../types';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';
import StatusBadge from '../ui/StatusBadge';

export interface OrdersFilterState { keyword: string; carModel: string[]; version: string[]; status: string[]; exterior: string[]; }
interface Props {
    orders: Order[];
    visibleOrders: Order[];
    filteredCount: number;
    filters: OrdersFilterState;
    onFilterChange: (filters: Partial<OrdersFilterState>) => void;
    onReset: () => void;
    sortConfig: SortConfig | null;
    onSort: (key: keyof Order) => void;
    selectedOrderId?: string;
    processingOrder: string | null;
    onSelect: (order: Order) => void;
    loading: boolean;
    error: string | null;
    readOnly: boolean;
    onCreate: () => void;
    onRefresh: () => void;
    onStats: () => void;
    onLoadMore: () => void;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    hasArchives: boolean;
    loadingArchives: boolean;
    onLoadArchives: () => void;
}

const effectiveStatus = (order: Order) => order['Trạng thái VC'] || order['Kết quả'] || 'Chưa ghép';
const customerInitials = (name: string) => name.trim().split(/\s+/).slice(-2).map(part => part.charAt(0)).join('').toLocaleUpperCase('vi-VN') || 'KH';
const formatDate = (value?: string) => {
    if (!value || value === 'null') return '—';
    const date = moment(value, [moment.ISO_8601, 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY'], true);
    return date.isValid() ? date.format('DD/MM/YYYY') : value;
};

const DesktopOrdersWorkspace: React.FC<Props> = props => {
    const [filtersOpen, setFiltersOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const [localKeyword, setLocalKeyword] = useState(props.filters.keyword);
    const debounceTimerRef = useRef<number | null>(null);

    useEffect(() => {
        setLocalKeyword(props.filters.keyword);
    }, [props.filters.keyword]);

    const handleKeywordChange = (newVal: string) => {
        setLocalKeyword(newVal);
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = window.setTimeout(() => {
            props.onFilterChange({ keyword: newVal });
        }, 250);
    };

    const handleClearKeyword = () => {
        if (debounceTimerRef.current) {
            window.clearTimeout(debounceTimerRef.current);
        }
        setLocalKeyword('');
        props.onFilterChange({ keyword: '' });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
            props.onFilterChange({ keyword: localKeyword });
        }
    };

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                window.clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!filtersOpen) return;
        const outside = (event: PointerEvent) => { if (!filterRef.current?.contains(event.target as Node)) setFiltersOpen(false); };
        document.addEventListener('pointerdown', outside);
        return () => document.removeEventListener('pointerdown', outside);
    }, [filtersOpen]);
    const statuses = useMemo(() => {
        const counts = new Map<string, number>();
        props.orders.forEach(order => { const status = effectiveStatus(order); counts.set(status, (counts.get(status) || 0) + 1); });
        return counts;
    }, [props.orders]);
    const facets = useMemo(() => {
        const unique = (key: keyof Order) => [...new Set(props.orders.map(order => String(order[key] || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        return [
            { key: 'carModel' as const, label: 'Dòng xe', options: unique('Dòng xe') },
            { key: 'version' as const, label: 'Phiên bản', options: unique('Phiên bản') },
            { key: 'status' as const, label: 'Trạng thái', options: [...statuses.keys()] },
            { key: 'exterior' as const, label: 'Ngoại thất', options: unique('Ngoại thất') },
        ];
    }, [props.orders, statuses]);
    const activeCount = props.filters.carModel.length + props.filters.version.length + props.filters.status.length + props.filters.exterior.length;
    const quickStatuses = ['Chưa ghép', 'Đã ghép', 'Chờ phê duyệt', 'Đã xuất hóa đơn'].filter(status => statuses.has(status));
    const columns: { key: keyof Order; label: string; className?: string }[] = [
        { key: 'Tên khách hàng', label: 'Khách hàng / Mã đơn' },
        { key: 'Dòng xe', label: 'Xe / Phiên bản' },
        { key: 'VIN', label: 'Số khung (VIN)' },
        { key: 'Kết quả', label: 'Trạng thái' },
        { key: 'Thời gian nhập', label: 'Ngày tạo' },
        { key: 'Tên tư vấn bán hàng', label: 'Tư vấn bán hàng', className: 'orders-table-consultant' },
    ];
    return <div className="orders-desktop-page">
        <div className="orders-page-heading"><div className="orders-page-title"><h1>Đơn hàng</h1><span>{props.orders.length.toLocaleString('vi-VN')}</span></div>
            <div className="orders-page-tools"><label className="orders-page-search"><Search size={16} /><input aria-label="Tìm đơn hàng" placeholder="Tìm khách hàng, mã đơn, VIN…" value={localKeyword} onChange={event => handleKeywordChange(event.target.value)} onKeyDown={handleKeyDown} />{localKeyword && <button type="button" aria-label="Xóa tìm kiếm" onClick={handleClearKeyword}><X size={13} /></button>}</label>
                <button type="button" className="orders-page-icon-button" onClick={props.onRefresh} disabled={props.loading} title="Tải lại đơn hàng" aria-label="Tải lại đơn hàng"><RefreshCw size={16} className={props.loading ? 'animate-spin' : ''} /></button>
                {!props.readOnly && <button type="button" className="orders-page-create" onClick={props.onCreate}><Plus size={16} /> Tạo đơn</button>}
            </div>
        </div>
        <div className="orders-page-filterbar"><div className="orders-status-tabs" role="group" aria-label="Lọc nhanh trạng thái"><button type="button" aria-pressed={!props.filters.status.length} onClick={() => props.onFilterChange({ status: [] })}>Tất cả<span>{props.orders.length}</span></button>{quickStatuses.map(status => <button type="button" key={status} aria-pressed={props.filters.status.length === 1 && props.filters.status[0] === status} onClick={() => props.onFilterChange({ status: [status] })}>{status}<span>{statuses.get(status)}</span></button>)}</div>
            <div className="orders-filter-actions"><button type="button" className="orders-page-secondary" onClick={props.onStats}><BarChart3 size={14} />Thống kê</button><div ref={filterRef} className="orders-filter-anchor"><button type="button" className="orders-page-secondary" aria-expanded={filtersOpen} aria-controls="orders-filter-panel" onClick={() => setFiltersOpen(open => !open)}><Filter size={14} />Bộ lọc{activeCount > 0 && <b>{activeCount}</b>}</button>
                {filtersOpen && <div id="orders-filter-panel" className="orders-filter-panel" onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); setFiltersOpen(false); } }}><div className="orders-filter-panel-heading"><strong>Lọc đơn hàng</strong><button type="button" onClick={props.onReset}>Đặt lại</button></div><div className="orders-filter-facets">{facets.map(facet => <div key={facet.key}><span>{facet.label}</span><MultiSelectDropdown id={`orders-facet-${facet.key}`} label={facet.label} options={facet.options} icon="fa-filter" selectedOptions={props.filters[facet.key]} onChange={selected => props.onFilterChange({ [facet.key]: selected })} searchable displayMode="selection" size="compact" variant="modern" align="right" /></div>)}</div><button type="button" className="orders-filter-done" onClick={() => setFiltersOpen(false)}>Xong</button></div>}
            </div></div>
        </div>
        {activeCount > 0 && <div className="orders-applied-filters"><span>{props.filteredCount} kết quả</span>{facets.flatMap(facet => props.filters[facet.key].map(value => <button key={`${facet.key}-${value}`} type="button" onClick={() => props.onFilterChange({ [facet.key]: props.filters[facet.key].filter(item => item !== value) })}>{value}<X size={11} /></button>))}<button type="button" className="orders-clear-filters" onClick={props.onReset}>Xóa bộ lọc</button></div>}
        <div className="orders-table-surface"><div className="orders-table-scroll"><table className="orders-full-table" aria-label="Danh sách đơn hàng" aria-busy={props.loading}><thead><tr>{columns.map(column => <th key={column.key} className={column.className} aria-sort={props.sortConfig?.key === column.key ? props.sortConfig.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => props.onSort(column.key)}>{column.label}{props.sortConfig?.key === column.key ? props.sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={11} />}</button></th>)}<th><span className="sr-only">Mở chi tiết</span></th></tr></thead><tbody>
            {props.loading && !props.visibleOrders.length ? Array.from({ length: 8 }, (_, index) => <tr key={index} aria-hidden="true">{columns.map(column => <td key={column.key} className={column.className}><span className="orders-row-skeleton" /></td>)}<td /></tr>)
                : props.visibleOrders.map(order => <tr key={order['Số đơn hàng']} data-selected={props.selectedOrderId === order['Số đơn hàng']} onClick={() => props.onSelect(order)}><td><button type="button" className="orders-table-open" onClick={event => { event.stopPropagation(); props.onSelect(order); }} aria-label={`Mở đơn ${order['Số đơn hàng']} của ${order['Tên khách hàng']}`}><span className="orders-customer-avatar" aria-hidden="true">{customerInitials(order['Tên khách hàng'] || '')}</span><span className="orders-customer-copy"><strong>{order['Tên khách hàng'] || 'Chưa có tên khách hàng'}</strong><small>{order['Số đơn hàng']}</small></span></button></td><td><span className="orders-table-vehicle">{order['Dòng xe']}<span>{order['Phiên bản'] !== order['Dòng xe'] ? order['Phiên bản'] : ''}</span></span><small>{[order['Ngoại thất'], order['Nội thất']].filter(Boolean).join(' / ') || '—'}</small></td><td><span className={`orders-table-vin ${order.VIN ? '' : 'is-empty'}`}>{order.VIN || 'Chưa ghép xe'}</span></td><td><StatusBadge status={order['Kết quả'] || 'Chưa ghép'} size="sm" />{order['Trạng thái VC'] && order['Trạng thái VC'] !== order['Kết quả'] && <small>{order['Trạng thái VC']}</small>}</td><td className="orders-table-date">{formatDate(order['Thời gian nhập'])}</td><td className="orders-table-consultant">{order['Tên tư vấn bán hàng'] || '—'}</td><td>{props.processingOrder === order['Số đơn hàng'] ? <LoaderCircle size={15} className="animate-spin" aria-label="Đang xử lý" /> : <ChevronRight size={15} />}</td></tr>)}
        </tbody></table>
            {props.error && <div className="orders-table-empty" role="alert"><strong>Không thể tải đơn hàng</strong><p>{props.error}</p><button type="button" onClick={props.onRefresh}>Thử lại</button></div>}
            {!props.loading && !props.error && !props.visibleOrders.length && <div className="orders-table-empty"><strong>Không tìm thấy đơn hàng</strong><p>Thử đổi từ khóa hoặc đặt lại bộ lọc.</p><button type="button" onClick={props.onReset}>Đặt lại bộ lọc</button></div>}
            {props.visibleOrders.length < props.filteredCount && <div ref={props.loadMoreRef} className="orders-load-more"><button type="button" onClick={props.onLoadMore}>Xem thêm đơn hàng</button></div>}
            {props.visibleOrders.length >= props.filteredCount && props.hasArchives && <div className="orders-load-more"><button type="button" disabled={props.loadingArchives} onClick={props.onLoadArchives}>{props.loadingArchives ? 'Đang tải lưu trữ…' : 'Tải thêm lưu trữ'}</button></div>}
        </div><div className="orders-table-footer"><span>Hiển thị <b>{props.visibleOrders.length}</b> / {props.filteredCount} đơn hàng</span><span>Chọn một đơn để xem chi tiết</span></div></div>
    </div>;
};

export default DesktopOrdersWorkspace;
