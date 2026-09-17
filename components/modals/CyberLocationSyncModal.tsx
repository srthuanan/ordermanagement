import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { syncCyberLocations } from '../../services/api/stockService';

interface LocationChangeItem {
    vin: string;
    dong_xe: string;
    phien_ban: string;
    ngoai_that: string;
    current_location: string;
    new_location: string;
    cyber_raw_kho: string;
    is_changed: boolean;
}

interface CyberLocationSyncModalProps {
    isOpen: boolean;
    onClose: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
    onSuccess?: () => void;
}

export const CyberLocationSyncModal: React.FC<CyberLocationSyncModalProps> = ({
    isOpen,
    onClose,
    showToast,
    onSuccess
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [changes, setChanges] = useState<LocationChangeItem[]>([]);
    const [totalCars, setTotalCars] = useState(0);
    const [changedCount, setChangedCount] = useState(0);
    const [onlyChangedFilter, setOnlyChangedFilter] = useState(true);
    const [searchVin, setSearchVin] = useState('');

    useEffect(() => {
        if (isOpen) {
            handleScan();
        } else {
            setChanges([]);
            setSearchVin('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // 1. Quét đối soát vị trí thực tế trên CyberSoft
    const handleScan = async () => {
        setIsLoading(true);
        try {
            const res = await syncCyberLocations({ preview: true });
            if (res && res.success) {
                setChanges(res.changes || []);
                setTotalCars(res.total_cars || 0);
                setChangedCount(res.changed_count || 0);

                if (res.changed_count > 0) {
                    showToast(
                        'Đã quét xong CyberSoft',
                        `Tìm thấy ${res.changed_count} xe có vị trí mới từ CyberSoft cần cập nhật!`,
                        'info'
                    );
                } else {
                    showToast(
                        'Đã quét xong CyberSoft',
                        `Tất cả ${res.total_cars || 0} xe trong kho đã khớp 100% vị trí CyberSoft!`,
                        'success'
                    );
                }
            } else {
                throw new Error(res?.error || 'Không thể quét vị trí từ CyberSoft.');
            }
        } catch (err: any) {
            showToast('Lỗi quét vị trí Cyber', err.message || 'Lỗi kết nối CyberSoft', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Thực hiện ghi nhận vị trí mới vào kho xe Supabase
    const handleApplySync = async () => {
        if (changedCount === 0) {
            showToast('Không có thay đổi', 'Vị trí của tất cả các xe đã hoàn toàn trùng khớp.', 'info');
            return;
        }

        setIsUpdating(true);
        try {
            showToast('Đang cập nhật...', `Đang cập nhật vị trí cho ${changedCount} xe từ CyberSoft...`, 'loading', 3000);
            const res = await syncCyberLocations({ preview: false });
            if (res && res.success) {
                showToast(
                    'Cập nhật thành công!',
                    `Đã đồng bộ vị trí thực tế cho ${res.updated_count || changedCount} xe trong kho!`,
                    'success',
                    5000
                );
                if (onSuccess) onSuccess();
                onClose();
            } else {
                throw new Error(res?.error || 'Cập nhật vị trí thất bại.');
            }
        } catch (err: any) {
            showToast('Lỗi cập nhật', err.message || 'Không thể ghi nhận vị trí vào Kho xe', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredList = changes.filter(item => {
        if (onlyChangedFilter && !item.is_changed) return false;
        if (searchVin && !item.vin.toLowerCase().includes(searchVin.toLowerCase())) return false;
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white tracking-wide">
                                    Cập Nhật Vị Trí Kho Trực Tiếp Từ CyberSoft
                                </h3>
                                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full">
                                    Live ERP
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Tra cứu trực tiếp sổ cái kho xe (CT70BEX) trên CyberSoft - Không cần dùng file Excel
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                        disabled={isLoading || isUpdating}
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Sub-header / Stats bar */}
                <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-lg border border-slate-700/60 text-xs">
                            <span className="text-slate-400">Tổng xe trong kho:</span>
                            <span className="font-bold text-white">{totalCars}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-700/40 text-xs">
                            <span className="text-emerald-400">Có vị trí mới:</span>
                            <span className="font-bold text-emerald-300">{changedCount}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-700/40 text-xs">
                            <span className="text-blue-400">Đã khớp:</span>
                            <span className="font-bold text-blue-300">{totalCars - changedCount}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Search by VIN */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm số VIN..."
                                value={searchVin}
                                onChange={e => setSearchVin(e.target.value)}
                                className="bg-slate-800 border border-slate-700 text-xs rounded-lg pl-8 pr-3 py-1.5 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
                            />
                            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>

                        {/* Filter toggle */}
                        <button
                            onClick={() => setOnlyChangedFilter(!onlyChangedFilter)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                                onlyChangedFilter
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${onlyChangedFilter ? 'bg-amber-400' : 'bg-slate-400'}`}></span>
                            Chỉ xe thay đổi ({changedCount})
                        </button>
                    </div>
                </div>

                {/* Body Table */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-sm font-medium">Đang kết nối CyberSoft và tra cứu vị trí kho thực tế...</p>
                            <p className="text-xs text-slate-500">Hệ thống đang truy vấn sổ cái điều chuyển kho xe trên ERP</p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-1">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium text-slate-300">
                                {onlyChangedFilter 
                                    ? 'Không có xe nào thay đổi vị trí kho! Tất cả đã hoàn toàn khớp với CyberSoft.'
                                    : 'Không tìm thấy xe nào phù hợp với bộ lọc.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-3">STT</th>
                                        <th className="py-3 px-3">Số VIN</th>
                                        <th className="py-3 px-3">Dòng xe / Bản</th>
                                        <th className="py-3 px-3">Màu sắc</th>
                                        <th className="py-3 px-3">Vị trí hiện tại</th>
                                        <th className="py-3 px-3">Vị trí trên CyberSoft</th>
                                        <th className="py-3 px-3">Tên kho gốc ERP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                                    {filteredList.map((item, idx) => (
                                        <tr 
                                            key={item.vin} 
                                            className={`transition-colors ${
                                                item.is_changed 
                                                    ? 'bg-emerald-950/25 hover:bg-emerald-900/30' 
                                                    : 'hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <td className="py-2.5 px-3 text-slate-500 font-sans">{idx + 1}</td>
                                            <td className="py-2.5 px-3 font-bold text-white tracking-wide">
                                                {item.vin}
                                            </td>
                                            <td className="py-2.5 px-3 font-sans text-slate-200">
                                                <span className="font-semibold text-emerald-300">{item.dong_xe}</span>
                                                {item.phien_ban && <span className="text-slate-400 text-[10px] ml-1">({item.phien_ban})</span>}
                                            </td>
                                            <td className="py-2.5 px-3 font-sans text-slate-400">
                                                {item.ngoai_that || '-'}
                                            </td>
                                            <td className="py-2.5 px-3 font-sans">
                                                <span className={`px-2 py-0.5 rounded text-[11px] ${
                                                    item.current_location === 'Đang vận tải'
                                                        ? 'bg-amber-950/50 text-amber-400 border border-amber-800/40'
                                                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                                                }`}>
                                                    {item.current_location || 'Chưa có'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 font-sans">
                                                {item.is_changed ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm animate-pulse">
                                                        <span>➔ {item.new_location}</span>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[11px] text-slate-400 bg-slate-800/50 border border-slate-700/50">
                                                        {item.new_location}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2.5 px-3 font-sans text-slate-400 text-[10px] truncate max-w-[160px]" title={item.cyber_raw_kho}>
                                                {item.cyber_raw_kho || '(Chưa nhập kho vật lý)'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-5 py-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={handleScan}
                            disabled={isLoading || isUpdating}
                            className="text-xs text-slate-300 hover:text-white"
                        >
                            <svg className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Quét lại từ CyberSoft
                        </Button>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isLoading || isUpdating}
                            className="text-xs text-slate-400 hover:text-white"
                        >
                            Đóng
                        </Button>

                        <button
                            onClick={handleApplySync}
                            disabled={isLoading || isUpdating || changedCount === 0}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${
                                changedCount > 0
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25 active:scale-95'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                            }`}
                        >
                            {isUpdating ? (
                                <>
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Đang ghi nhận...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Cập nhật vị trí ({changedCount} xe)
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
