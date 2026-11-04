import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Bell, BellPlus, CheckCheck, ChevronRight, Info, PackageCheck, ShieldAlert, X } from 'lucide-react';
import { Notification } from '../../types';
import './notification-sheet.css';

interface Props {
    isOpen: boolean;
    notifications: Notification[];
    unreadCount: number;
    pendingSwapCount: number;
    onClose: () => void;
    onNotificationClick: (notification: Notification, event: React.MouseEvent) => void;
    onMarkAllAsRead: (event: React.MouseEvent) => void;
    onOpenSwapInbox: () => void;
    onRequestPermission: () => Promise<boolean>;
}

export const getNotificationText = (message: string): string => message
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/^[\s📢📣🔔✅🚗]+/u, '')
    .replace(/\s+/g, ' ').trim();

export const getNotificationTime = (timestamp: string): string => {
    const time = new Date(timestamp).getTime();
    if (!Number.isFinite(time)) return '';
    const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ`;
    if (minutes < 10080) return `${Math.floor(minutes / 1440)} ngày`;
    return new Date(timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
};

const NotificationSheet: React.FC<Props> = ({ isOpen, notifications, unreadCount, pendingSwapCount, onClose, onNotificationClick, onMarkAllAsRead, onOpenSwapInbox, onRequestPermission }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [closing, setClosing] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported');
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isOpen) {
            setClosing(false);
            if (!dialog.open) dialog.showModal();
            dialog.focus();
            if ('Notification' in window) setPermission(window.Notification.permission);
        } else if (dialog.open) {
            setClosing(true);
            const timer = window.setTimeout(() => { dialog.close(); setClosing(false); }, 180);
            return () => window.clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [isOpen]);

    const requestPermission = async () => {
        setRequesting(true);
        try { await onRequestPermission(); } finally {
            if ('Notification' in window) setPermission(window.Notification.permission);
            setRequesting(false);
        }
    };

    return <dialog ref={dialogRef} id="notification-sheet" className="notification-sheet" data-closing={closing} tabIndex={-1} aria-labelledby="notification-sheet-title" onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation(); }} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
        if (event.target === event.currentTarget) { window.dispatchEvent(new CustomEvent('close-all-sheets')); onClose(); }
    }}>
        <div className="notification-sheet-panel">
            <div className="notification-sheet-heading">
                <div><h2 id="notification-sheet-title">Thông báo</h2><p>{notifications.length} thông báo{unreadCount > 0 ? ` · ${unreadCount} chưa đọc` : ' · Đã cập nhật'}</p></div>
                <button type="button" className="notification-sheet-close" onClick={onClose} aria-label="Đóng thông báo"><X size={16} /></button>
            </div>
            <div className="notification-sheet-toolbar">
                <button type="button" className="notification-sheet-swap" onClick={() => { onClose(); onOpenSwapInbox(); }}>
                    <ArrowLeftRight size={13} strokeWidth={1.8} />
                    <span>Hộp thư đổi xe</span>
                    {pendingSwapCount > 0 && <span className="notification-sheet-swap-count">{pendingSwapCount}</span>}
                </button>
                <div className="notification-sheet-utilities">
                    {permission !== 'unsupported' && permission !== 'granted' && <button type="button" disabled={requesting} onClick={() => { void requestPermission(); }} title={permission === 'denied' ? 'Thông báo đang bị chặn trong cài đặt trình duyệt' : 'Cho phép thông báo trên trình duyệt'}><BellPlus size={13} /><span>{permission === 'denied' ? 'Đang chặn' : 'Bật thông báo'}</span></button>}
                    {unreadCount > 0 && <button type="button" onClick={onMarkAllAsRead} title="Đánh dấu tất cả đã đọc"><CheckCheck size={14} /><span>Đọc tất cả</span></button>}
                </div>
            </div>
            {pendingSwapCount > 0 && <button type="button" className="notification-sheet-swap-note" onClick={() => { onClose(); onOpenSwapInbox(); }}>{pendingSwapCount} yêu cầu đổi xe đang chờ bạn xử lý <ChevronRight size={13} /></button>}
            <div className="notification-sheet-list">
                {notifications.length ? notifications.map(item => {
                    const text = getNotificationText(item.message || '');
                    const warehouse = item.type === 'stock_hero' || /xe rảnh|được nhả|giữ xe|nhập kho|về bãi/i.test(text);
                    const warning = ['error', 'danger', 'warning'].includes(item.type);
                    const Icon = warning ? ShieldAlert : warehouse ? PackageCheck : Info;
                    const title = item.metadata?.title || (warehouse ? 'Kho xe' : warning ? 'Cần lưu ý' : 'Hệ thống');
                    return <button type="button" key={item.id} className="notification-sheet-item" data-unread={!item.isRead} onClick={event => onNotificationClick(item, event)}>
                        <span className={`notification-sheet-item-icon ${warning ? 'is-warning' : warehouse ? 'is-stock' : ''}`}><Icon size={15} strokeWidth={1.75} /></span>
                        <span className="notification-sheet-item-copy"><span className="notification-sheet-item-meta"><strong>{title}</strong><time dateTime={item.timestamp}>{getNotificationTime(item.timestamp)}</time></span><span className="notification-sheet-item-message">{text}</span></span>
                        <span className="notification-sheet-unread" aria-label={!item.isRead ? 'Chưa đọc' : undefined} />
                    </button>;
                }) : <div className="notification-sheet-empty"><Bell size={24} strokeWidth={1.3} /><strong>Bạn đã xem hết thông báo</strong><p>Thông báo mới sẽ xuất hiện tại đây.</p></div>}
            </div>
        </div>
    </dialog>;
};

export default NotificationSheet;
