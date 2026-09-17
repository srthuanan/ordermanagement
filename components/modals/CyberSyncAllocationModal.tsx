import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { syncCyberAllocations, undoCyberAllocations } from '../../services/api/stockService';

interface CyberSyncAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

export const CyberSyncAllocationModal: React.FC<CyberSyncAllocationModalProps> = ({
    isOpen,
    onClose,
    showToast,
    onSuccess
}) => {
    // Mặc định từ ngày 1 đầu tháng đến hôm nay
    const getFormattedDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

    const [fromDate, setFromDate] = useState<string>(getFormattedDate(firstDay));
    const [toDate, setToDate] = useState<string>(getFormattedDate(now));
    const [isLoading, setIsLoading] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);
    const [previewCars, setPreviewCars] = useState<any[]>([]);
    const [hasLoadedPreview, setHasLoadedPreview] = useState(false);
    const [syncStats, setSyncStats] = useState<{ total: number; success: number; fail: number } | null>(null);
    const [syncedVins, setSyncedVins] = useState<string[]>(() => {
        try {
            const saved = sessionStorage.getItem('last_cyber_synced_vins');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        if (isOpen) {
            setPreviewCars([]);
            setHasLoadedPreview(false);
            setSyncStats(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // 1. Xem trước danh sách xe từ CyberSoft
    const handlePreview = async () => {
        setIsLoading(true);
        setSyncStats(null);
        try {
            const res = await syncCyberAllocations({ fromDate, toDate, preview: true });
            if (res && res.success) {
                setPreviewCars(res.cars || []);
                setHasLoadedPreview(true);
                showToast('Đã tải xem trước', `Tìm thấy ${res.total || 0} xe phân bổ cho Thuận An.`, 'info');
            } else {
                throw new Error(res?.error || 'Không thể lấy dữ liệu từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi xem trước', err.message || 'Lỗi kết nối CyberSoft', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Thực hiện đồng bộ chính thức vào Supabase khoxe
    const handleSync = async () => {
        setIsLoading(true);
        try {
            showToast('Đang đồng bộ...', 'Đang nạp xe phân bổ từ CyberSoft vào Kho xe...', 'loading', 3000);
            const res = await syncCyberAllocations({ fromDate, toDate, preview: false });
            if (res && res.success) {
                setSyncStats({
                    total: res.total || 0,
                    success: res.success_count || 0,
                    fail: res.fail_count || 0
                });

                const vins = res.vins || (previewCars.length > 0 ? previewCars.map((c: any) => c.vin) : []) || [];
                if (vins.length > 0) {
                    setSyncedVins(vins);
                    sessionStorage.setItem('last_cyber_synced_vins', JSON.stringify(vins));
                }

                showToast('Đồng bộ hoàn tất!', `Đã nạp thành công ${res.success_count || 0}/${res.total || 0} xe vào Kho xe.`, 'success', 5000);
                if (onSuccess) onSuccess();
            } else {
                throw new Error(res?.error || 'Đồng bộ thất bại.');
            }
        } catch (err: any) {
            showToast('Lỗi đồng bộ', err.message || 'Không thể nạp xe vào Kho xe', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 3. Hoàn tác các xe vừa nạp
    const handleUndo = async () => {
        if (!syncedVins || syncedVins.length === 0) {
            showToast('Không có dữ liệu', 'Không tìm thấy danh sách xe vừa nạp để hoàn tác.', 'warning');
            return;
        }

        const confirmMsg = `Bạn có chắc chắn muốn hoàn tác và XÓA ${syncedVins.length} xe vừa nạp khỏi Kho xe không?\n\nLưu ý: Chỉ những xe chưa bị ghép mới được hoàn tác xóa khỏi hệ thống.`;
        if (!window.confirm(confirmMsg)) {
            return;
        }

        setIsUndoing(true);
        try {
            showToast('Đang hoàn tác...', `Đang xóa ${syncedVins.length} xe khỏi Kho xe...`, 'loading', 3000);
            const res = await undoCyberAllocations(syncedVins);
            if (res && res.success) {
                showToast('Hoàn tác thành công!', `Đã xóa thành công ${res.deletedCount} xe khỏi Kho xe.`, 'success', 5000);
                setSyncedVins([]);
                sessionStorage.removeItem('last_cyber_synced_vins');
                setSyncStats(null);
                if (onSuccess) onSuccess();
            } else {
                throw new Error(res?.error || 'Hoàn tác thất bại.');
            }
        } catch (err: any) {
            showToast('Lỗi hoàn tác', err.message || 'Không thể xóa xe khỏi Kho xe', 'error');
        } finally {
            setIsUndoing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-800 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
                            <i className="fas fa-bolt text-yellow-300 text-lg"></i>
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold">Đồng bộ Kế hoạch Nhà máy Giao</h3>
                            <p className="text-xs text-sky-100 flex items-center gap-1.5">
                                <span>Phân hệ CyberSoft ERP (K10)</span>
                                <span>•</span>
                                <span className="bg-sky-400/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                                    Showroom Ô tô VinFast Thuận An (02.01.08)
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                    >
                        <i className="fas fa-times text-sm"></i>
                    </button>
                </div>

                {/* Filter Controls */}
                <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600">Từ ngày:</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            disabled={isLoading}
                            className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600">Đến ngày:</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            disabled={isLoading}
                            className="text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                        <Button
                            variant="secondary"
                            onClick={handlePreview}
                            disabled={isLoading}
                            className="text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
                        >
                            <i className="fas fa-search text-xs"></i>
                            <span>Xem trước</span>
                        </Button>

                        <Button
                            variant="primary"
                            onClick={handleSync}
                            disabled={isLoading}
                            className="text-xs px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <i className="fas fa-spinner fa-spin text-xs"></i>
                                    <span>Đang đồng bộ...</span>
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-arrow-down text-xs"></i>
                                    <span>Nạp vào Kho xe</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Content / Preview Area */}
                <div className="p-5 flex-1 overflow-y-auto min-h-[250px] bg-slate-100/50">
                    {syncStats && (
                        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 animate-fade-in shadow-xs">
                            <div className="flex items-center gap-2">
                                <i className="fas fa-circle-check text-emerald-600 text-base"></i>
                                <div>
                                    <p className="font-bold">Đồng bộ thành công: Đã cập nhật {syncStats.success} xe vào hệ thống Kho xe.</p>
                                    <p className="text-[11px] text-emerald-600 font-medium">Bảng khoxe Supabase</p>
                                </div>
                            </div>
                            {syncedVins.length > 0 && (
                                <button
                                    onClick={handleUndo}
                                    disabled={isUndoing}
                                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm flex-shrink-0"
                                    title="Xóa các xe vừa nạp khỏi Kho xe"
                                >
                                    <i className={`fas ${isUndoing ? 'fa-spinner fa-spin' : 'fa-rotate-left'} text-xs`}></i>
                                    <span>{isUndoing ? 'Đang xóa...' : `Hoàn tác (${syncedVins.length} xe)`}</span>
                                </button>
                            )}
                        </div>
                    )}

                    {!hasLoadedPreview && !isLoading && !syncStats && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl mb-3 shadow-inner">
                                <i className="fas fa-truck-ramp-box"></i>
                            </div>
                            <h4 className="text-sm font-bold text-slate-700 mb-1">Chưa tải dữ liệu xem trước</h4>
                            <p className="text-xs max-w-md text-slate-500">
                                Hãy chọn khoảng ngày phân bổ phía trên rồi bấm <b>"Xem trước"</b> để kiểm tra danh sách xe được nhà máy giao cho Showroom Thuận An, hoặc bấm <b>"Nạp vào Kho xe"</b> để đồng bộ thẳng vào hệ thống.
                            </p>
                        </div>
                    )}

                    {isLoading && (
                        <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-3">
                            <i className="fas fa-circle-notch fa-spin text-3xl text-blue-600"></i>
                            <span className="text-xs font-semibold">Đang liên kết dữ liệu với máy chủ CyberSoft ERP...</span>
                        </div>
                    )}

                    {hasLoadedPreview && !isLoading && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-700">
                                    Danh sách xe phân bổ cho Thuận An ({previewCars.length} xe)
                                </span>
                                <span className="text-[11px] text-slate-500">
                                    Từ {fromDate} đến {toDate}
                                </span>
                            </div>

                            {previewCars.length === 0 ? (
                                <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                                    Không có xe nào được phân bổ cho Thuận An trong khoảng ngày đã chọn.
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="max-h-[350px] overflow-y-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                                                <tr>
                                                    <th className="py-2.5 px-3">STT</th>
                                                    <th className="py-2.5 px-3">Dòng xe / Phiên bản</th>
                                                    <th className="py-2.5 px-3">Ngoại thất / Nội thất</th>
                                                    <th className="py-2.5 px-3">Số khung (VIN)</th>
                                                    <th className="py-2.5 px-3">Số máy</th>
                                                    <th className="py-2.5 px-3">Mã DMS</th>
                                                    <th className="py-2.5 px-3">Kho</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                                {previewCars.map((car, idx) => (
                                                    <tr key={car.vin || idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="py-2 px-3 font-semibold text-slate-400">{idx + 1}</td>
                                                        <td className="py-2 px-3 font-bold text-blue-900">
                                                            {car.dong_xe} {car.phien_ban && <span className="font-normal text-slate-500">({car.phien_ban})</span>}
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <div className="font-medium text-slate-800">{car.ngoai_that || '-'}</div>
                                                            {car.noi_that && <div className="text-[10px] text-slate-400">{car.noi_that}</div>}
                                                        </td>
                                                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{car.vin}</td>
                                                        <td className="py-2 px-3 font-mono text-[11px] text-slate-600">{car.so_may || '-'}</td>
                                                        <td className="py-2 px-3 font-semibold text-slate-800">{car.ma_dms || '-'}</td>
                                                        <td className="py-2 px-3 text-slate-600">{car.vi_tri || 'Kho Thuận An'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <i className="fas fa-shield-halved text-blue-600"></i>
                            <span>Dữ liệu bảo mật - Tự động upsert theo số VIN</span>
                        </span>
                        {syncedVins.length > 0 && (
                            <button
                                onClick={handleUndo}
                                disabled={isUndoing || isLoading}
                                className="text-amber-700 hover:text-red-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Hoàn tác lần nạp xe gần nhất"
                            >
                                <i className={`fas ${isUndoing ? 'fa-spinner fa-spin' : 'fa-rotate-left'} text-xs`}></i>
                                <span>Hoàn tác ({syncedVins.length} xe vừa nạp)</span>
                            </button>
                        )}
                    </div>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading || isUndoing}
                        className="text-xs px-4 py-1.5"
                    >
                        Đóng
                    </Button>
                </div>

            </div>
        </div>
    );
};
