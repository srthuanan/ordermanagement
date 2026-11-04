import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { SwapRequestItem, getSwapRequests, tvbhAcceptSwapRequest, adminApproveSwapRequest, rejectSwapRequest, cancelSwapRequest } from '../../services/api/swapService';

interface SwapInboxModalProps {
    currentUser: string;
    isAdmin: boolean;
    onClose?: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onRefreshAppData?: () => void;
    embedded?: boolean;
}

export const SwapInboxModal: React.FC<SwapInboxModalProps> = ({
    currentUser,
    isAdmin,
    onClose,
    showToast,
    onRefreshAppData,
    embedded = false
}) => {
    const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'admin'>(isAdmin ? 'admin' : 'received');
    const [requests, setRequests] = useState<SwapRequestItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectReasonText, setRejectReasonText] = useState<{ [id: string]: string }>({});
    const [showRejectInput, setShowRejectInput] = useState<{ [id: string]: boolean }>({});

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSwapRequests();
            if (res.status === 'SUCCESS' && res.data) {
                setRequests(res.data);
            }
        } catch (e: any) {
            showToast('Lỗi', 'Không thể tải hộp thư đổi xe', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (embedded || !onClose) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [embedded, onClose]);

    const handleTvbhAccept = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await tvbhAcceptSwapRequest(id);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message || 'Đã chấp nhận đổi xe!', 'success');
                await loadData();
            } else {
                showToast('Lỗi', res.message || 'Lỗi xử lý', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Đã xảy ra lỗi', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleAdminApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await adminApproveSwapRequest(id);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message || 'Đã phê duyệt tráo xe!', 'success');
                if (onRefreshAppData) onRefreshAppData();
                await loadData();
            } else {
                showToast('Lỗi', res.message || 'Lỗi phê duyệt', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Đã xảy ra lỗi', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        const text = rejectReasonText[id] || '';
        setProcessingId(id);
        try {
            const res = await rejectSwapRequest(id, text);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã từ chối yêu cầu đổi xe', 'success');
                await loadData();
            } else {
                showToast('Lỗi', res.message || 'Lỗi xử lý', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Đã xảy ra lỗi', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancel = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await cancelSwapRequest(id);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã hủy đề nghị đổi xe', 'success');
                await loadData();
            } else {
                showToast('Lỗi', res.message || 'Lỗi xử lý', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Đã xảy ra lỗi', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const receivedRequests = requests.filter(r => r.tvbhB.toLowerCase() === currentUser.toLowerCase());
    const sentRequests = requests.filter(r => r.tvbhA.toLowerCase() === currentUser.toLowerCase());
    const adminWaitingRequests = requests.filter(r => r.status === 'waiting_admin' || r.status === 'pending_tvbh2');

    const displayedRequests = activeTab === 'received' ? receivedRequests : (activeTab === 'sent' ? sentRequests : adminWaitingRequests);

    const getStatusBadge = (status: SwapRequestItem['status']) => {
        switch (status) {
            case 'pending_tvbh2':
                return (
                    <span className="swp-badge is-warning">
                        <span className="swp-dot" />
                        Chờ TVBH 2 đồng ý
                    </span>
                );
            case 'waiting_admin':
                return (
                    <span className="swp-badge is-info">
                        <span className="swp-dot" />
                        Chờ Admin phê duyệt
                    </span>
                );
            case 'approved':
                return (
                    <span className="swp-badge is-success">
                        Đã hoàn tất tráo VIN
                    </span>
                );
            case 'rejected':
                return (
                    <span className="swp-badge is-danger">
                        Đã từ chối
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="swp-badge is-muted">
                        Đã hủy
                    </span>
                );
            case 'expired':
                return (
                    <span className="swp-badge is-muted">
                        Hết hạn (24h)
                    </span>
                );
            default:
                return null;
        }
    };

    const styles = (
        <style>{`
            .swp-sheet {
                position: fixed;
                inset: 0 0 0 64px;
                width: calc(100vw - 64px);
                height: 100dvh;
                z-index: 1005;
                display: flex;
                align-items: stretch;
                justify-content: flex-start;
                background: rgba(15, 23, 42, 0.08);
                overflow: hidden;
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            @media (max-width: 768px) {
                .swp-sheet {
                    inset: 0;
                    width: 100vw;
                }
            }
            .swp-sheet-panel {
                width: clamp(460px, 46vw, 680px);
                max-width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #ffffff;
                color: #17263b;
                border-right: 1px solid #e2e8f0;
                box-shadow: 18px 0 42px -14px rgba(20, 34, 54, 0.16);
                animation: swpSlideInLeft 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
            }
            .swp-embedded-panel {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                background: #ffffff;
                color: #17263b;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                overflow: hidden;
            }
            @keyframes swpSlideInLeft {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
            }
            .swp-header {
                padding: 22px 24px 14px;
                border-bottom: 1px solid #e9edf2;
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
                flex-shrink: 0;
            }
            .swp-title {
                margin: 0;
                color: #17263b;
                font-size: 20px;
                font-weight: 650;
                letter-spacing: -0.5px;
                line-height: 1.25;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .swp-role-tag {
                padding: 2px 7px;
                border-radius: 5px;
                background: #eff6ff;
                color: #2563eb;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0;
            }
            .swp-subtitle {
                margin: 4px 0 0;
                color: #7b879a;
                font-size: 11px;
                line-height: 1.45;
            }
            .swp-header-actions {
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .swp-icon-btn {
                width: 28px;
                height: 28px;
                border: 0;
                border-radius: 6px;
                background: transparent;
                color: #7b879a;
                display: grid;
                place-items: center;
                cursor: pointer;
                transition: background 0.15s, color 0.15s;
            }
            .swp-icon-btn:hover {
                background: #edf1f6;
                color: #17263b;
            }
            .swp-tabs {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 10px 24px;
                background: #f8fafc;
                border-bottom: 1px solid #e9edf2;
                flex-shrink: 0;
            }
            .swp-tab {
                height: 30px;
                padding: 0 12px;
                border-radius: 7px;
                border: 1px solid transparent;
                background: transparent;
                color: #64748b;
                font-size: 11.5px;
                font-weight: 500;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                cursor: pointer;
                transition: all 0.15s;
            }
            .swp-tab:hover {
                color: #17263b;
                background: #edf1f6;
            }
            .swp-tab.is-active {
                background: #ffffff;
                color: #17263b;
                font-weight: 600;
                border-color: #dbe3ee;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
            }
            .swp-tab-count {
                padding: 1px 6px;
                border-radius: 999px;
                background: #eff6ff;
                color: #2563eb;
                font-size: 10px;
                font-weight: 600;
            }
            .swp-body {
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                padding: 18px 24px 24px;
                display: flex;
                flex-direction: column;
                gap: 14px;
            }
            .swp-empty {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 64px 20px;
                text-align: center;
                color: #94a3b8;
                gap: 6px;
            }
            .swp-empty-icon {
                width: 44px;
                height: 44px;
                border-radius: 10px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                display: grid;
                place-items: center;
                color: #64748b;
                margin-bottom: 6px;
            }
            .swp-empty strong {
                color: #17263b;
                font-size: 13px;
                font-weight: 600;
            }
            .swp-empty p {
                margin: 0;
                color: #7b879a;
                font-size: 11.5px;
            }
            .swp-card {
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #ffffff;
                padding: 14px 16px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .swp-card-top {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding-bottom: 10px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 11px;
                color: #64748b;
            }
            .swp-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                padding: 2px 8px;
                border-radius: 6px;
                font-size: 10.5px;
                font-weight: 600;
            }
            .swp-badge .swp-dot {
                width: 5px;
                height: 5px;
                border-radius: 50%;
                background: currentColor;
            }
            .swp-badge.is-warning {
                background: #fffbeb;
                color: #b45309;
                border: 1px solid #fde68a;
            }
            .swp-badge.is-info {
                background: #eff6ff;
                color: #2563eb;
                border: 1px solid #bfdbfe;
            }
            .swp-badge.is-success {
                background: #ecfdf5;
                color: #059669;
                border: 1px solid #a7f3d0;
            }
            .swp-badge.is-danger {
                background: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
            }
            .swp-badge.is-muted {
                background: #f8fafc;
                color: #64748b;
                border: 1px solid #e2e8f0;
            }
            .swp-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }
            @media (max-width: 560px) {
                .swp-grid {
                    grid-template-columns: 1fr;
                }
            }
            .swp-party {
                padding: 10px 12px;
                border-radius: 8px;
                border: 1px solid #e9edf2;
                background: #f8fafc;
                font-size: 11.5px;
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            .swp-party-head {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 6px;
                font-size: 11px;
                color: #64748b;
                font-weight: 500;
                margin-bottom: 2px;
            }
            .swp-party-head strong {
                color: #17263b;
                font-weight: 600;
            }
            .swp-kv {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                color: #64748b;
                font-size: 11px;
            }
            .swp-kv code {
                font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: 11px;
                font-weight: 600;
                color: #17263b;
            }
            .swp-meta-box {
                padding: 9px 12px;
                border-radius: 8px;
                border: 1px solid #e9edf2;
                background: #ffffff;
                font-size: 11.5px;
                color: #475569;
                line-height: 1.5;
            }
            .swp-meta-box strong {
                color: #17263b;
                font-weight: 600;
            }
            .swp-actions {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 8px;
                padding-top: 10px;
                border-top: 1px solid #f1f5f9;
            }
            .swp-btn-secondary {
                height: 32px;
                padding: 0 12px;
                border-radius: 7px;
                border: 1px solid #e2e8f0;
                background: #ffffff;
                color: #475569;
                font-size: 11.5px;
                font-weight: 500;
                cursor: pointer;
            }
            .swp-btn-secondary:hover:not(:disabled) {
                background: #f8fafc;
                color: #17263b;
            }
            .swp-btn-danger {
                height: 32px;
                padding: 0 12px;
                border-radius: 7px;
                border: 1px solid #fecaca;
                background: #fef2f2;
                color: #dc2626;
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
            }
            .swp-btn-danger:hover:not(:disabled) {
                background: #fee2e2;
            }
            .swp-btn-primary {
                height: 32px;
                padding: 0 14px;
                border-radius: 7px;
                border: 0;
                background: #17263b;
                color: #ffffff;
                font-size: 11.5px;
                font-weight: 600;
                cursor: pointer;
            }
            .swp-btn-primary:hover:not(:disabled) {
                background: #0f172a;
            }
            .swp-input {
                width: 100%;
                height: 34px;
                padding: 0 11px;
                border: 1px solid #cbd5e1;
                border-radius: 7px;
                font-size: 12px;
                color: #17263b;
                outline: none;
            }
            .swp-input:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
            }
        `}</style>
    );

    const innerContent = (
        <div className={embedded ? 'swp-embedded-panel' : 'swp-sheet-panel'}>
            <header className="swp-header">
                <div>
                    <h2 className="swp-title">
                        <span>Hộp thư đổi xe</span>
                        {isAdmin && <span className="swp-role-tag">Admin</span>}
                    </h2>
                    <p className="swp-subtitle">Theo dõi, phê duyệt và quản lý luồng tráo VIN giữa các TVBH</p>
                </div>
                <div className="swp-header-actions">
                    <button
                        type="button"
                        onClick={loadData}
                        className="swp-icon-btn"
                        title="Làm mới danh sách"
                        aria-label="Làm mới danh sách"
                    >
                        <i className={`fas fa-rotate-right text-[12px] ${isLoading ? 'fa-spin' : ''}`} />
                    </button>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="swp-icon-btn"
                            aria-label="Đóng"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </header>

            <div className="swp-tabs">
                {!isAdmin && (
                    <>
                        <button
                            type="button"
                            onClick={() => setActiveTab('received')}
                            className={`swp-tab ${activeTab === 'received' ? 'is-active' : ''}`}
                        >
                            <span>Đề nghị nhận được</span>
                            {receivedRequests.filter(r => r.status === 'pending_tvbh2').length > 0 && (
                                <span className="swp-tab-count">
                                    {receivedRequests.filter(r => r.status === 'pending_tvbh2').length}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('sent')}
                            className={`swp-tab ${activeTab === 'sent' ? 'is-active' : ''}`}
                        >
                            <span>Đề nghị đã gửi</span>
                            <span className="swp-tab-count">{sentRequests.length}</span>
                        </button>
                    </>
                )}
                {isAdmin && (
                    <button
                        type="button"
                        onClick={() => setActiveTab('admin')}
                        className={`swp-tab ${activeTab === 'admin' ? 'is-active' : ''}`}
                    >
                        <span>Tất cả yêu cầu tráo xe</span>
                        <span className="swp-tab-count">{adminWaitingRequests.length}</span>
                    </button>
                )}
            </div>

            <div className="swp-body">
                {isLoading ? (
                    <div className="swp-empty">
                        <i className="fas fa-spinner fa-spin text-lg text-slate-400" />
                        <p>Đang tải hộp thư trao đổi xe...</p>
                    </div>
                ) : displayedRequests.length === 0 ? (
                    <div className="swp-empty">
                        <div className="swp-empty-icon">
                            <i className="fas fa-right-left text-sm" />
                        </div>
                        <strong>Không có yêu cầu đổi xe nào trong danh sách</strong>
                        <p>Các đề nghị đổi xe sẽ xuất hiện tại đây khi được khởi tạo.</p>
                    </div>
                ) : (
                    displayedRequests.map((item) => (
                        <div key={item.id} className="swp-card">
                            <div className="swp-card-top">
                                <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                                {getStatusBadge(item.status)}
                            </div>

                            <div className="swp-grid">
                                <div className="swp-party">
                                    <div className="swp-party-head">
                                        <span>TVBH 1 (Bên đề nghị)</span>
                                        <strong>{item.tvbhA}</strong>
                                    </div>
                                    <div className="swp-kv">
                                        <span>Đơn hàng</span>
                                        <code>{item.orderA}</code>
                                    </div>
                                    <div className="swp-kv">
                                        <span>VIN hiện tại</span>
                                        <code>{item.vinA || 'Chưa ghép'}</code>
                                    </div>
                                </div>

                                <div className="swp-party">
                                    <div className="swp-party-head">
                                        <span>TVBH 2 (Bên sở hữu xe)</span>
                                        <strong>{item.tvbhB}</strong>
                                    </div>
                                    <div className="swp-kv">
                                        <span>Đơn hàng</span>
                                        <code>{item.orderB || 'Tự động chọn'}</code>
                                    </div>
                                    <div className="swp-kv">
                                        <span>VIN đề nghị đổi</span>
                                        <code>{item.vinB}</code>
                                    </div>
                                </div>
                            </div>

                            <div className="swp-meta-box">
                                <strong>Cấu hình xe:</strong>{' '}
                                {item.config.dong_xe} · {item.config.phien_ban} · Ngoại thất {item.config.ngoai_that} · Nội thất {item.config.noi_that}
                            </div>

                            <div className="swp-meta-box">
                                <strong>Lý do đề nghị:</strong> {item.reason || 'Không có ghi chú'}
                            </div>

                            {item.rejectReason && (
                                <div className="swp-meta-box" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c' }}>
                                    <strong style={{ color: '#991b1b' }}>Lý do từ chối:</strong> {item.rejectReason}
                                </div>
                            )}

                            {showRejectInput[item.id] && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <input
                                        type="text"
                                        value={rejectReasonText[item.id] || ''}
                                        onChange={(e) => setRejectReasonText(prev => ({ ...prev, [item.id]: e.target.value }))}
                                        placeholder="Nhập lý do từ chối trao đổi xe..."
                                        className="swp-input"
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowRejectInput(prev => ({ ...prev, [item.id]: false }))}
                                            className="swp-btn-secondary"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleReject(item.id)}
                                            className="swp-btn-danger"
                                        >
                                            Xác nhận từ chối
                                        </button>
                                    </div>
                                </div>
                            )}

                            {((activeTab === 'received' && item.status === 'pending_tvbh2' && !showRejectInput[item.id]) ||
                              (activeTab === 'sent' && (item.status === 'pending_tvbh2' || item.status === 'waiting_admin')) ||
                              (isAdmin && (item.status === 'waiting_admin' || item.status === 'pending_tvbh2') && !showRejectInput[item.id])) && (
                                <div className="swp-actions">
                                    {activeTab === 'received' && item.status === 'pending_tvbh2' && !showRejectInput[item.id] && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setShowRejectInput(prev => ({ ...prev, [item.id]: true }))}
                                                disabled={processingId === item.id}
                                                className="swp-btn-danger"
                                            >
                                                Từ chối
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTvbhAccept(item.id)}
                                                disabled={processingId === item.id}
                                                className="swp-btn-primary"
                                            >
                                                {processingId === item.id ? 'Đang xử lý...' : 'Đồng ý trao đổi'}
                                            </button>
                                        </>
                                    )}

                                    {activeTab === 'sent' && (item.status === 'pending_tvbh2' || item.status === 'waiting_admin') && (
                                        <button
                                            type="button"
                                            onClick={() => handleCancel(item.id)}
                                            disabled={processingId === item.id}
                                            className="swp-btn-secondary"
                                        >
                                            Hủy đề nghị
                                        </button>
                                    )}

                                    {isAdmin && (item.status === 'waiting_admin' || item.status === 'pending_tvbh2') && !showRejectInput[item.id] && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setShowRejectInput(prev => ({ ...prev, [item.id]: true }))}
                                                disabled={processingId === item.id}
                                                className="swp-btn-danger"
                                            >
                                                Từ chối
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleAdminApprove(item.id)}
                                                disabled={processingId === item.id}
                                                className="swp-btn-primary"
                                            >
                                                {processingId === item.id ? 'Đang xử lý...' : 'Phê duyệt tráo VIN'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    if (embedded) {
        return (
            <>
                {styles}
                {innerContent}
            </>
        );
    }

    return ReactDOM.createPortal(
        <div
            className="swp-sheet"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    window.dispatchEvent(new CustomEvent('close-all-sheets'));
                    if (onClose) onClose();
                }
            }}
        >
            {styles}
            {innerContent}
        </div>,
        document.body
    );
};
