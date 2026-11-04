import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CarFront, X } from 'lucide-react';
export const preloadRequestForm = () => import('../RequestForm');
const RequestForm = React.lazy(preloadRequestForm);
import { AnalyticsData, Order, StockVehicle } from '../../types';
import './create-request-sheet.css';

interface ImageSource {
    src: string;
    originalUrl?: string;
    label: string;
}

interface CreateRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newOrder: Order) => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    hideToast: () => void;
    existingOrderNumbers: string[];
    initialVehicle?: StockVehicle;
    currentUser: string;
    vehicleAnalyticsData: AnalyticsData;
    onOpenImagePreview: (images: ImageSource[], startIndex: number, customerName: string) => void;
}

const CreateRequestModal: React.FC<CreateRequestModalProps> = ({ isOpen, onClose, onSuccess, showToast, hideToast, existingOrderNumbers, initialVehicle, currentUser, vehicleAnalyticsData, onOpenImagePreview }) => {
    const sheetRef = useRef<HTMLElement>(null);
    const layerRef = useRef<HTMLDivElement>(null);
    const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [closing, setClosing] = useState(false);
    const requestClose = useCallback(() => {
        if (closeTimer.current) return;
        setClosing(true);
        closeTimer.current = setTimeout(onClose, 180);
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;
        setClosing(false);
        const previousFocus = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        sheetRef.current?.focus();
        return () => {
            if (closeTimer.current) clearTimeout(closeTimer.current);
            closeTimer.current = null;
            document.body.style.overflow = previousOverflow;
            if (previousFocus?.isConnected) previousFocus.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div ref={layerRef} className="create-request-sheet-layer fixed" data-closing={closing}>
            <div className="create-request-sheet-backdrop" onClick={() => { window.dispatchEvent(new CustomEvent('close-all-sheets')); requestClose(); }} aria-hidden="true" />
            <section ref={sheetRef} className="create-request-sheet" role="dialog" aria-modal="true" aria-labelledby="create-request-sheet-title" tabIndex={-1} onKeyDown={event => {
                const nested = (event.target as HTMLElement).closest('.fixed');
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    if (nested === layerRef.current) { event.preventDefault(); requestClose(); }
                    return;
                }
                if (event.key !== 'Tab') return;
                const scope = nested && nested !== layerRef.current ? nested : sheetRef.current;
                const buttons = Array.from(scope?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || []).filter(node => node.offsetParent !== null);
                const first = buttons[0], last = buttons[buttons.length - 1];
                if (!first) { event.preventDefault(); return; }
                if (event.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }}>
                <header className="create-request-sheet-heading"><div className="create-request-sheet-heading-copy"><span className="create-request-sheet-icon"><CarFront size={18} strokeWidth={1.7} /></span><div><h2 id="create-request-sheet-title">Yêu cầu ghép xe</h2><p>Chọn cấu hình và hoàn tất thông tin đơn hàng</p></div></div><button type="button" className="create-request-sheet-close" onClick={requestClose} aria-label="Đóng yêu cầu ghép xe"><X size={16} /></button></header>
                <div className="create-request-sheet-body">
                    <React.Suspense fallback={<div role="status" style={{ padding: 24, color: '#7b879a', fontSize: 13 }}>Đang tải biểu mẫu…</div>}>
                    <RequestForm
                        onSuccess={onSuccess}
                        showToast={showToast}
                        hideToast={hideToast}
                        existingOrderNumbers={existingOrderNumbers}
                        initialVehicle={initialVehicle}
                        currentUser={currentUser}
                        vehicleAnalyticsData={vehicleAnalyticsData}
                        onOpenImagePreview={onOpenImagePreview}
                    />
                    </React.Suspense>
                </div>
                <div className="create-request-sheet-grip" aria-hidden="true"><span /></div>
            </section>
        </div>, document.body
    );
};

export default React.memo(CreateRequestModal);
