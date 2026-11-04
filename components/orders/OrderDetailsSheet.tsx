import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';
import { AdminSubView, Order } from '../../types';
import StatusBadge from '../ui/StatusBadge';

interface Props { order: Order; children: React.ReactNode; onClose: () => void; onNavigate: (direction: 'prev' | 'next') => void; canPrevious: boolean; canNext: boolean; onOpenAdmin?: (order: Order, tab: AdminSubView) => void; }

const OrderDetailsSheet: React.FC<Props> = ({ order, children, onClose, onNavigate, canPrevious, canNext, onOpenAdmin }) => {
    const sheetRef = useRef<HTMLElement>(null);
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    useEffect(() => {
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        sheetRef.current?.focus();
        return () => { document.body.style.overflow = previousOverflow; if (previousFocus?.isConnected) previousFocus.focus(); };
    }, []);
    useEffect(() => {
        const main = sheetRef.current?.querySelector('main');
        if (main) main.scrollTop = 0;
    }, [order['Số đơn hàng']]);
    return createPortal(<div className="orders-ios-workspace orders-side-sheet-layer"><div className="orders-side-sheet-backdrop" onClick={onClose} aria-hidden="true" /><section className="orders-side-sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="orders-side-sheet-title" tabIndex={-1} onKeyDown={event => {
        if (event.key === 'Escape') {
            event.stopPropagation();
            const nested = (event.target as HTMLElement).closest('.fixed');
            if (!nested || nested.classList.contains('orders-side-sheet-layer')) { event.preventDefault(); closeRef.current(); }
        }
        if (event.key !== 'Tab') return;
        const nodes = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])') || []).filter(node => node.offsetParent !== null);
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}><header className="orders-side-sheet-header"><div className="orders-side-sheet-heading"><span>Chi tiết đơn hàng</span><h2 id="orders-side-sheet-title">{order['Tên khách hàng'] || 'Đơn hàng'}</h2><small>{order['Số đơn hàng']}</small></div><div className="orders-side-sheet-controls">{onOpenAdmin && <details className="orders-sheet-admin-menu"><summary aria-label="Thao tác quản trị" title="Thao tác quản trị"><MoreHorizontal size={16} /></summary><div>{([{ tab: 'matching', label: 'Ghép xe' }, { tab: 'invoices', label: 'Hóa đơn' }, { tab: 'vc', label: 'VinClub' }] as const).map(action => <button key={action.tab} type="button" onClick={() => { onClose(); onOpenAdmin(order, action.tab); }}>{action.label}</button>)}</div></details>}<button type="button" onClick={() => onNavigate('prev')} disabled={!canPrevious} title="Đơn trước" aria-label="Đơn trước"><ChevronLeft size={16} /></button><button type="button" onClick={() => onNavigate('next')} disabled={!canNext} title="Đơn tiếp theo" aria-label="Đơn tiếp theo"><ChevronRight size={16} /></button><button type="button" onClick={onClose} title="Đóng chi tiết" aria-label="Đóng chi tiết"><X size={17} /></button></div><StatusBadge status={order['Kết quả'] || 'Chưa ghép'} size="sm" /></header><div className="orders-side-sheet-content">{children}</div></section></div>, document.body);
};

export default OrderDetailsSheet;
