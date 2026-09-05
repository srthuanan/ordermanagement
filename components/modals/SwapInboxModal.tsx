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
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 font-extrabold text-[11px] rounded-full border border-amber-200 shadow-2xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Chờ TVBH 2 đồng ý
                    </span>
                );
            case 'waiting_admin':
                return (
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 font-extrabold text-[11px] rounded-full border border-blue-200 shadow-2xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Chờ Admin phê duyệt
                    </span>
                );
            case 'approved':
                return (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[11px] rounded-full border border-emerald-200 shadow-2xs flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check text-emerald-500"></i>
                        Đã hoàn tất tráo VIN
                    </span>
                );
            case 'rejected':
                return (
                    <span className="px-3 py-1 bg-rose-50 text-rose-700 font-extrabold text-[11px] rounded-full border border-rose-200 shadow-2xs flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-xmark text-rose-500"></i>
                        Đã từ chối
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 font-extrabold text-[11px] rounded-full border border-slate-200 shadow-2xs">
                        Đã hủy
                    </span>
                );
            case 'expired':
                return (
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 font-extrabold text-[11px] rounded-full border border-gray-200 shadow-2xs">
                        Hết hạn (24h)
                    </span>
                );
            default:
                return null;
        }
    };

    const innerContent = (
        <div className={embedded ? "bg-white rounded-2xl w-full h-full flex flex-col overflow-hidden border border-slate-200 shadow-sm" : "bg-white rounded-3xl shadow-[0_30px_90px_-15px_rgba(0,0,0,0.3)] max-w-4xl w-full h-[88vh] flex flex-col overflow-hidden border border-slate-200/80"}>
            {/* Header Premium Gradient */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between flex-shrink-0 border-b border-white/10 relative">
                <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-lg shadow-lg shadow-orange-500/30">
                        <i className="fa-solid fa-right-left"></i>
                    </div>
                    <div>
                        <h3 className="font-extrabold text-lg leading-tight tracking-tight text-white flex items-center gap-2">
                            Quản Lý Trao Đổi Xe
                            <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 bg-white/10 text-amber-300 rounded-md border border-white/10">
                                Admin Dashboard
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-300 font-medium">Theo dõi, phê duyệt và quản lý luồng tráo VIN giữa các TVBH</p>
                    </div>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-slate-300 hover:text-white transition-all border border-white/10"
                    >
                        <i className="fa-solid fa-xmark text-base"></i>
                    </button>
                )}
            </div>

                {/* Tabs Navigation */}
                <div className="px-6 pt-4 bg-slate-50 border-b border-slate-200/80 flex items-center gap-3 flex-shrink-0">
                    {!isAdmin && (
                        <>
                            <button
                                onClick={() => setActiveTab('received')}
                                className={`px-5 py-3 text-xs font-extrabold rounded-t-2xl transition-all flex items-center gap-2.5 ${
                                    activeTab === 'received'
                                        ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                                }`}
                            >
                                <i className="fa-solid fa-inbox text-sm"></i>
                                <span>Đề nghị nhận được</span>
                                {receivedRequests.filter(r => r.status === 'pending_tvbh2').length > 0 && (
                                    <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-2xs">
                                        {receivedRequests.filter(r => r.status === 'pending_tvbh2').length}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('sent')}
                                className={`px-5 py-3 text-xs font-extrabold rounded-t-2xl transition-all flex items-center gap-2.5 ${
                                    activeTab === 'sent'
                                        ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                                }`}
                            >
                                <i className="fa-solid fa-paper-plane text-sm"></i>
                                <span>Đề nghị đã gửi</span>
                                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-black rounded-full">
                                    {sentRequests.length}
                                </span>
                            </button>
                        </>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('admin')}
                            className={`px-5 py-3 text-xs font-extrabold rounded-t-2xl transition-all flex items-center gap-2.5 ${
                                activeTab === 'admin'
                                    ? 'bg-white text-indigo-600 border-t-2 border-indigo-600 shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'
                            }`}
                        >
                            <i className="fa-solid fa-user-shield text-sm"></i>
                            <span>Tất cả yêu cầu tráo xe</span>
                            {adminWaitingRequests.length > 0 && (
                                <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-black rounded-full shadow-2xs">
                                    {adminWaitingRequests.length}
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Body Content */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4 bg-slate-100/60">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
                            <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-500"></i>
                            <span className="text-sm font-semibold">Đang tải hộp thư tráo đổi xe...</span>
                        </div>
                    ) : displayedRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                            <div className="w-16 h-16 rounded-full bg-slate-200/60 flex items-center justify-center text-3xl mb-3 text-slate-400">
                                📭
                            </div>
                            <p className="font-extrabold text-base text-slate-700">Không có yêu cầu đổi xe nào trong danh sách!</p>
                            <p className="text-xs text-slate-500 mt-1">Các đề nghị đổi xe sẽ xuất hiện tại đây khi được khởi tạo.</p>
                        </div>
                    ) : (
                        displayedRequests.map((item) => (
                            <div
                                key={item.id}
                                className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-4"
                            >
                                {/* Top Item Row */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2.5 text-xs text-slate-500 font-semibold">
                                        <i className="fa-regular fa-clock text-slate-400"></i>
                                        <span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                                    </div>
                                    <div>{getStatusBadge(item.status)}</div>
                                </div>

                                {/* Comparison Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    {/* TVBH A (Đề nghị) */}
                                    <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 space-y-1.5">
                                        <div className="font-extrabold text-indigo-900 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <i className="fa-solid fa-user-gear text-indigo-600"></i>
                                                TVBH 1 (Bên đề nghị):
                                            </span>
                                            <span className="px-2 py-0.5 bg-indigo-200/60 text-indigo-900 rounded-md font-bold">
                                                {item.tvbhA}
                                            </span>
                                        </div>
                                        <div className="text-slate-600">
                                            Đơn hàng: <span className="font-mono font-bold text-slate-900">{item.orderA}</span>
                                        </div>
                                        <div className="text-slate-600">
                                            VIN hiện tại: <span className="font-mono font-bold text-indigo-700">{item.vinA || 'Chưa ghép (Chờ xe)'}</span>
                                        </div>
                                    </div>

                                    {/* TVBH B (Nhận) */}
                                    <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100/80 space-y-1.5">
                                        <div className="font-extrabold text-amber-900 flex items-center justify-between">
                                            <span className="flex items-center gap-1.5">
                                                <i className="fa-solid fa-user-check text-amber-600"></i>
                                                TVBH 2 (Bên sở hữu xe):
                                            </span>
                                            <span className="px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-md font-bold">
                                                {item.tvbhB}
                                            </span>
                                        </div>
                                        <div className="text-slate-600">
                                            Đơn hàng: <span className="font-mono font-bold text-slate-900">{item.orderB || 'Tự động chọn'}</span>
                                        </div>
                                        <div className="text-slate-600">
                                            VIN đề nghị đổi: <span className="font-mono font-bold text-amber-700">{item.vinB}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Configuration details */}
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center gap-2 text-xs">
                                    <i className="fa-solid fa-sliders text-indigo-500"></i>
                                    <span className="font-bold text-slate-700">Cấu hình xe khớp 100%:</span>
                                    <span className="font-semibold text-slate-900">
                                        {item.config.dong_xe} - {item.config.phien_ban} | Ngoại thất: <span className="text-indigo-600 font-bold">{item.config.ngoai_that}</span> | Nội thất: <span className="text-indigo-600 font-bold">{item.config.noi_that}</span>
                                    </span>
                                </div>

                                {/* Lý do */}
                                <div className="text-xs text-slate-700 bg-amber-50/30 p-3 rounded-xl border border-amber-100">
                                    <span className="font-extrabold text-amber-900">Lý do đề nghị:</span> {item.reason}
                                </div>

                                {item.rejectReason && (
                                    <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                                        <span className="font-extrabold text-rose-900">Lý do từ chối:</span> {item.rejectReason}
                                    </div>
                                )}

                                {/* Reject Input Box if toggled */}
                                {showRejectInput[item.id] && (
                                    <div className="space-y-2 pt-2">
                                        <input
                                            type="text"
                                            value={rejectReasonText[item.id] || ''}
                                            onChange={(e) => setRejectReasonText(prev => ({ ...prev, [item.id]: e.target.value }))}
                                            placeholder="Nhập lý do từ chối trao đổi xe..."
                                            className="w-full px-3 py-2 border border-rose-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowRejectInput(prev => ({ ...prev, [item.id]: false }))}
                                                className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleReject(item.id)}
                                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs"
                                            >
                                                Xác nhận Từ Chối
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons Footer */}
                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                                    {/* Actions for TVBH 2 (Received Pending) */}
                                    {activeTab === 'received' && item.status === 'pending_tvbh2' && !showRejectInput[item.id] && (
                                        <>
                                            <button
                                                onClick={() => setShowRejectInput(prev => ({ ...prev, [item.id]: true }))}
                                                disabled={processingId === item.id}
                                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all active:scale-95 flex items-center gap-1.5"
                                            >
                                                <i className="fa-solid fa-xmark"></i> Từ Chối
                                            </button>
                                            <button
                                                onClick={() => handleTvbhAccept(item.id)}
                                                disabled={processingId === item.id}
                                                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                                            >
                                                {processingId === item.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check-double"></i>}
                                                Đồng Ý Trao Đổi
                                            </button>
                                        </>
                                    )}

                                    {/* Actions for TVBH 1 (Cancel Request) */}
                                    {activeTab === 'sent' && (item.status === 'pending_tvbh2' || item.status === 'waiting_admin') && (
                                        <button
                                            onClick={() => handleCancel(item.id)}
                                            disabled={processingId === item.id}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                                        >
                                            <i className="fa-solid fa-ban"></i> Hủy Đề Nghị
                                        </button>
                                    )}

                                    {/* Actions for Admin */}
                                    {isAdmin && (item.status === 'waiting_admin' || item.status === 'pending_tvbh2') && !showRejectInput[item.id] && (
                                        <>
                                            <button
                                                onClick={() => setShowRejectInput(prev => ({ ...prev, [item.id]: true }))}
                                                disabled={processingId === item.id}
                                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all active:scale-95 flex items-center gap-1.5"
                                            >
                                                <i className="fa-solid fa-xmark"></i> Từ Chối
                                            </button>
                                            <button
                                                onClick={() => handleAdminApprove(item.id)}
                                                disabled={processingId === item.id}
                                                className="px-5 py-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
                                            >
                                                {processingId === item.id ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-user-shield"></i>}
                                                Admin Phê Duyệt Ngay
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
        </div>
    );

    if (embedded) {
        return innerContent;
    }

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
            {innerContent}
        </div>,
        document.body
    );
};
