import React, { useState, useEffect, useMemo, useCallback } from 'react';
import moment from 'moment';
import { SwapRequestItem, getSwapRequests, adminApproveSwapRequest, rejectSwapRequest } from '../../services/api/swapService';
import { Order } from '../../types';
import CarImage from '../ui/CarImage';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { AdminDirectSwapFormInline } from './AdminDirectSwapFormInline';

interface AdminSwapManagementViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onRefreshAppData?: () => void;
    allOrders?: Order[];
}

export const AdminSwapManagementView: React.FC<AdminSwapManagementViewProps> = ({
    showToast,
    onRefreshAppData,
    allOrders = []
}) => {
    const [requests, setRequests] = useState<SwapRequestItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFolder, setSelectedFolder] = useState<string>('waiting_admin');
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState<string>('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [isDirectSwapActive, setIsDirectSwapActive] = useState(false);
    const [mobileView, setMobileView] = useState<'folders' | 'list' | 'detail'>('folders');
    const copyWithFeedback = useCopyFeedback();

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSwapRequests();
            if (res.status === 'SUCCESS' && res.data) {
                setRequests(res.data);
            }
        } catch (e: any) {
            showToast('Lỗi', 'Không thể tải danh sách yêu cầu đổi xe', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Folder definitions matching InvoiceInboxView style
    const folders = useMemo(() => [
        {
            id: 'waiting_admin',
            label: 'Chờ Admin Phê Duyệt',
            icon: 'fa-user-shield',
            count: requests.filter(r => r.status === 'waiting_admin').length
        },
        {
            id: 'pending_tvbh2',
            label: 'Chờ TVBH 2 Đồng Ý',
            icon: 'fa-clock',
            count: requests.filter(r => r.status === 'pending_tvbh2').length
        },
        {
            id: 'approved',
            label: 'Đã Hoàn Tất Tráo VIN',
            icon: 'fa-check-circle',
            count: requests.filter(r => r.status === 'approved').length
        },
        {
            id: 'rejected_cancelled',
            label: 'Đã Từ Chối / Hủy',
            icon: 'fa-times-circle',
            count: requests.filter(r => r.status === 'rejected' || r.status === 'cancelled' || r.status === 'expired').length
        },
        {
            id: 'all',
            label: 'Tất Cả Yêu Cầu',
            icon: 'fa-layer-group',
            count: requests.length
        }
    ], [requests]);

    // Filter requests based on selected folder
    const filteredRequests = useMemo(() => {
        switch (selectedFolder) {
            case 'waiting_admin':
                return requests.filter(r => r.status === 'waiting_admin');
            case 'pending_tvbh2':
                return requests.filter(r => r.status === 'pending_tvbh2');
            case 'approved':
                return requests.filter(r => r.status === 'approved');
            case 'rejected_cancelled':
                return requests.filter(r => r.status === 'rejected' || r.status === 'cancelled' || r.status === 'expired');
            case 'all':
            default:
                return requests;
        }
    }, [requests, selectedFolder]);

    // Auto-select first request in list if current selection is not in filtered set
    useEffect(() => {
        if (filteredRequests.length > 0) {
            if (!selectedRequestId || !filteredRequests.some(r => r.id === selectedRequestId)) {
                setSelectedRequestId(filteredRequests[0].id);
            }
        } else {
            setSelectedRequestId(null);
        }
    }, [filteredRequests, selectedRequestId]);

    const activeRequest = useMemo(() => {
        return requests.find(r => r.id === selectedRequestId) || null;
    }, [requests, selectedRequestId]);

    const handleAdminApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await adminApproveSwapRequest(id);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', res.message || 'Đã phê duyệt tráo VIN xe thành công!', 'success');
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
        setProcessingId(id);
        try {
            const res = await rejectSwapRequest(id, rejectReason);
            if (res.status === 'SUCCESS') {
                showToast('Thành công', 'Đã từ chối yêu cầu trao đổi xe', 'success');
                setShowRejectForm(false);
                setRejectReason('');
                await loadData();
            } else {
                showToast('Lỗi', res.message || 'Lỗi từ chối', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Đã xảy ra lỗi', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: SwapRequestItem['status']) => {
        switch (status) {
            case 'pending_tvbh2':
                return (
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-extrabold text-[10px] rounded-full border border-amber-200 shadow-2xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Chờ TVBH 2 đồng ý
                    </span>
                );
            case 'waiting_admin':
                return (
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full border border-blue-200 shadow-2xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                        Chờ Admin duyệt
                    </span>
                );
            case 'approved':
                return (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded-full border border-emerald-200 shadow-2xs flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-check text-emerald-500 text-xs"></i>
                        Đã tráo VIN
                    </span>
                );
            case 'rejected':
                return (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-extrabold text-[10px] rounded-full border border-rose-200 shadow-2xs flex items-center gap-1.5">
                        <i className="fa-solid fa-circle-xmark text-rose-500 text-xs"></i>
                        Đã từ chối
                    </span>
                );
            case 'cancelled':
                return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full border border-slate-200">Đã hủy</span>;
            case 'expired':
                return <span className="px-2.5 py-1 bg-gray-100 text-gray-500 font-bold text-[10px] rounded-full border border-gray-200">Hết hạn</span>;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-full bg-slate-50 md:rounded-xl shadow-md border-0 md:border border-slate-200 overflow-hidden animate-fade-in relative z-0">
            <AnimatedBackground />

            <div className={`w-full md:w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col relative z-10 ${mobileView !== 'folders' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-slate-100/80 text-slate-800 border-b border-slate-200 flex flex-col gap-2">
                    <button
                        onClick={() => {
                            setIsDirectSwapActive(true);
                            setMobileView('detail');
                        }}
                        className={`w-full py-2 font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 border ${
                            isDirectSwapActive
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                        title="Tráo VIN trực tiếp 2 chiều giữa 2 đơn hàng bất kỳ cùng cấu hình"
                    >
                        <i className="fa-solid fa-bolt text-xs text-amber-500"></i>
                        <span>Tráo VIN Trực Tiếp</span>
                    </button>
                </div>
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {folders.map(folder => {
                        const isActive = selectedFolder === folder.id;
                        return (
                            <button
                                key={folder.id}
                                onClick={() => {
                                    setSelectedFolder(folder.id);
                                    setMobileView('list');
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-xs font-bold'
                                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <i className={`fas ${folder.icon} w-4 text-center text-xs opacity-80`}></i>
                                    <span>{folder.label}</span>
                                </div>
                                {folder.count > 0 && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}>
                                        {folder.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className={`w-full md:w-80 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white relative z-10 ${mobileView !== 'list' ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setMobileView('folders')} className="md:hidden p-1 text-slate-500 hover:text-slate-800">
                            <i className="fas fa-arrow-left text-xs"></i>
                        </button>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            {folders.find(f => f.id === selectedFolder)?.label} ({filteredRequests.length})
                        </span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-16 text-slate-400 text-xs font-semibold gap-2">
                            <i className="fas fa-spinner fa-spin text-slate-600 text-base"></i> Đang tải dữ liệu...
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <i className="fa-solid fa-folder-open text-3xl mb-2 text-slate-300"></i>
                            <span className="text-xs font-bold">Không có yêu cầu nào</span>
                        </div>
                    ) : (
                        filteredRequests.map(req => {
                            const isSelected = !isDirectSwapActive && selectedRequestId === req.id;
                            return (
                                <div
                                    key={req.id}
                                    onClick={(e) => {
                                        setSelectedRequestId(req.id);
                                        setIsDirectSwapActive(false);
                                        setMobileView('detail');
                                        copyWithFeedback(req.tvbhA || '', e);
                                    }}
                                    className={`p-3 cursor-pointer transition-all duration-150 relative border-l-4 ${
                                        isSelected
                                            ? 'bg-slate-100/90 border-blue-600 font-semibold'
                                            : 'border-transparent hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-bold text-slate-900 truncate">
                                            ĐH: {req.orderA}
                                        </span>
                                        {getStatusBadge(req.status)}
                                    </div>

                                    <div className="text-[11px] text-slate-600 font-medium mb-1 flex items-center justify-between">
                                        <span>TVBH 1: <strong className="text-slate-800 font-semibold">{req.tvbhA}</strong></span>
                                        <span className="text-slate-300">➔</span>
                                        <span>TVBH 2: <strong className="text-slate-800 font-semibold">{req.tvbhB}</strong></span>
                                    </div>

                                    <div className="text-[10px] text-slate-500 flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 font-mono">
                                        <span>VIN: {req.vinB}</span>
                                        <span className="text-slate-400">{moment(req.createdAt).format('DD/MM/YYYY HH:mm')}</span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <div className={`flex-1 flex flex-col bg-white relative z-10 overflow-hidden ${mobileView !== 'detail' ? 'hidden md:flex' : 'flex'}`}>
                {isDirectSwapActive ? (
                    <AdminDirectSwapFormInline
                        orders={allOrders}
                        showToast={showToast}
                        onCancel={() => setIsDirectSwapActive(false)}
                        onSuccess={() => {
                            setIsDirectSwapActive(false);
                            loadData();
                            if (onRefreshAppData) onRefreshAppData();
                        }}
                    />
                ) : activeRequest ? (
                    <div className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6">
                        <div className="md:hidden flex items-center gap-2 pb-3 border-b border-slate-200">
                            <button onClick={() => setMobileView('list')} className="p-1.5 text-slate-600 bg-slate-100 rounded-lg">
                                <i className="fas fa-arrow-left text-xs"></i> Quay lại
                            </button>
                        </div>

                        <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl flex items-center justify-between shadow-md">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg font-black shadow-inner">
                                    <i className="fa-solid fa-right-left"></i>
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-base leading-tight">Yêu Cầu Trao Đổi VIN Xe</h4>
                                    <p className="text-xs text-slate-300 font-medium">Mã yêu cầu: <span className="font-mono text-amber-300">{activeRequest.id}</span></p>
                                </div>
                            </div>
                            <div>{getStatusBadge(activeRequest.status)}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                                        <i className="fa-solid fa-user text-amber-600"></i> TVBH Đề Nghị (TVBH 1)
                                    </span>
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded-md text-[11px]">
                                        {activeRequest.tvbhA}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Mã Đơn Hàng:</span>
                                        <span 
                                            className="font-mono font-bold cursor-pointer text-blue-600 hover:underline"
                                            onClick={(e) => copyWithFeedback(activeRequest.orderA, e)}
                                        >
                                            {activeRequest.orderA}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">VIN sở hữu hiện tại:</span>
                                        <span className="font-mono font-bold text-slate-900">{activeRequest.vinA || 'Chưa ghép (Chờ xe)'}</span>
                                    </div>
                                </div>

                                <div className="h-24 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center relative">
                                    <CarImage
                                        model={activeRequest.config.dong_xe}
                                        exteriorColor={activeRequest.config.ngoai_that}
                                        className="h-full object-contain"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 relative overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                                        <i className="fa-solid fa-user-check text-indigo-600"></i> TVBH Sở Hữu Xe (TVBH 2)
                                    </span>
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-extrabold rounded-md text-[11px]">
                                        {activeRequest.tvbhB}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-xs text-slate-700 font-medium">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">Mã Đơn Hàng:</span>
                                        <span 
                                            className="font-mono font-bold cursor-pointer text-blue-600 hover:underline"
                                            onClick={(e) => copyWithFeedback(activeRequest.orderB || 'N/A', e)}
                                        >
                                            {activeRequest.orderB || 'Chưa ghép'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-500">VIN xe hoán đổi:</span>
                                        <span className="font-mono font-bold text-indigo-700">{activeRequest.vinB}</span>
                                    </div>
                                </div>

                                <div className="h-24 bg-white rounded-xl border border-slate-200 p-2 flex items-center justify-center relative">
                                    <CarImage
                                        model={activeRequest.config.dong_xe}
                                        exteriorColor={activeRequest.config.ngoai_that}
                                        className="h-full object-contain"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
                            <div className="font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                                <i className="fa-solid fa-sliders text-amber-600"></i> Thông Tin Cấu Hình Xe Đồng Bộ 100%:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-semibold text-slate-800">
                                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                                    <span className="text-[10px] text-slate-400 block font-bold">DÒNG XE</span>
                                    <span className="font-extrabold text-amber-900">{activeRequest.config.dong_xe || 'N/A'}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                                    <span className="text-[10px] text-slate-400 block font-bold">PHIÊN BẢN</span>
                                    <span className="font-extrabold text-amber-900">{activeRequest.config.phien_ban || 'N/A'}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                                    <span className="text-[10px] text-slate-400 block font-bold">NGOẠI THẤT</span>
                                    <span className="font-extrabold text-amber-900">{activeRequest.config.ngoai_that || 'N/A'}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-amber-100">
                                    <span className="text-[10px] text-slate-400 block font-bold">NỘI THẤT</span>
                                    <span className="font-extrabold text-amber-900">{activeRequest.config.noi_that || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
                            <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                <i className="fa-solid fa-comment-dots text-amber-600"></i> Lý do tráo đổi xe:
                            </span>
                            <p className="text-slate-700 italic bg-white p-3 rounded-xl border border-slate-200/80 font-medium">
                                "{activeRequest.reason || 'Không có lý do chi tiết'}"
                            </p>
                        </div>

                        {activeRequest.rejectReason && (
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs space-y-1">
                                <span className="font-extrabold text-rose-800 flex items-center gap-1.5">
                                    <i className="fa-solid fa-circle-exclamation text-rose-600"></i> Lý do từ chối:
                                </span>
                                <p className="text-rose-900 font-medium">{activeRequest.rejectReason}</p>
                            </div>
                        )}

                        {(activeRequest.status === 'waiting_admin' || activeRequest.status === 'pending_tvbh2') && (
                            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
                                {showRejectForm ? (
                                    <div className="w-full flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Nhập lý do từ chối..."
                                            className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500"
                                        />
                                        <button
                                            onClick={() => handleReject(activeRequest.id)}
                                            disabled={processingId === activeRequest.id}
                                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
                                        >
                                            Xác Nhận Từ Chối
                                        </button>
                                        <button
                                            onClick={() => setShowRejectForm(false)}
                                            className="px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setShowRejectForm(true)}
                                            disabled={processingId === activeRequest.id}
                                            className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center gap-1.5"
                                        >
                                            <i className="fa-solid fa-xmark"></i> Từ Chối
                                        </button>
                                        <button
                                            onClick={() => handleAdminApprove(activeRequest.id)}
                                            disabled={processingId === activeRequest.id}
                                            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                        >
                                            {processingId === activeRequest.id ? (
                                                <i className="fa-solid fa-spinner fa-spin"></i>
                                            ) : (
                                                <i className="fa-solid fa-user-shield"></i>
                                            )}
                                            <span>Admin Phê Duyệt Tráo VIN Ngay</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                        <i className="fa-solid fa-right-left text-4xl mb-3 text-slate-300"></i>
                        <span className="text-xs font-bold uppercase tracking-wider">Chọn một yêu cầu để xem chi tiết</span>
                        <button
                            onClick={() => {
                                setIsDirectSwapActive(true);
                                setMobileView('detail');
                            }}
                            className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-bolt text-xs"></i>
                            <span>Hoặc Bấm Tráo VIN Trực Tiếp</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
