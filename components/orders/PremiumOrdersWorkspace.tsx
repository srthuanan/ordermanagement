import React, { useMemo } from 'react';
import { BarChart3, LoaderCircle, Plus } from 'lucide-react';
import moment from 'moment';
import { Order } from '../../types';
import InvoiceCompactFilters from '../admin/InvoiceCompactFilters';
import { DropdownFilterConfig } from '../ui/Filters';
import './orders-premium.css';
import '../admin/admin-toolbar.css';

interface Props {
    orders: Order[];
    visibleOrders: Order[];
    filteredCount: number;
    selectedOrderId?: string;
    filters: { keyword: string; tvbh?: string[]; carModel: string[]; version: string[]; status: string[]; exterior: string[] };
    onFilterChange: (value: Partial<Props['filters']>) => void;
    onReset: () => void;
    onSelect: (order: Order) => void;
    onRefresh: () => void;
    onCreateOrder?: () => void;
    onStats?: (anchor?: HTMLElement) => void;
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
    const dropdownConfigs: DropdownFilterConfig[] = useMemo(() => {
        const unique = (key: keyof Order) => [...new Set(props.orders.map(order => String(order[key] || '')).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
        return [
            { id: 'order-filter-tvbh', key: 'tvbh', label: 'TVBH', options: unique('Tên tư vấn bán hàng'), icon: 'fa-user-tie' },
            { id: 'order-filter-dongxe', key: 'carModel', label: 'Dòng Xe', options: unique('Dòng xe'), icon: 'fa-car' },
            { id: 'order-filter-version', key: 'version', label: 'Phiên Bản', options: unique('Phiên bản'), icon: 'fa-cogs' },
            { id: 'order-filter-exterior', key: 'exterior', label: 'Ngoại Thất', options: unique('Ngoại thất'), icon: 'fa-palette' },
            { id: 'order-filter-status', key: 'status', label: 'Trạng Thái', options: [...new Set(props.orders.map(order => order['Trạng thái VC'] || order['Kết quả'] || 'Chưa ghép'))].filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi')), icon: 'fa-tag' },
        ];
    }, [props.orders]);

    return <div className="premium-orders">
        <aside className="premium-orders-sidebar" aria-label="Danh sách đơn hàng">
            <div className="premium-list-heading"><h1>Đơn hàng <span>{props.filteredCount}</span></h1><div>
                <button type="button" aria-label="Thống kê đơn hàng" title="Thống kê" onClick={e => props.onStats?.(e.currentTarget)}><BarChart3 size={16} /></button>
                {props.onCreateOrder && <button type="button" aria-label="Tạo đơn hàng mới" title="Tạo đơn hàng mới" onClick={props.onCreateOrder}><Plus size={16} /></button>}
            </div></div>
            <div className="invoice-sidebar-filter-target">
                <InvoiceCompactFilters
                    filters={props.filters}
                    dropdowns={dropdownConfigs}
                    searchPlaceholder="Tìm SĐH, Tên KH, VIN…"
                    sidebar
                    onChange={props.onFilterChange}
                    onReset={props.onReset}
                    onRefresh={props.onRefresh}
                    totalCount={props.filteredCount}
                    isLoading={props.loading}
                />
            </div>
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
