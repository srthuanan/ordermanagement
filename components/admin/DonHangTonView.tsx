import React, { useState, useMemo, useEffect } from 'react';
import * as apiService from '../../services/apiService';
import { supabase } from '../../services/supabaseClient';
import moment from 'moment';
import AnimatedBackground from '../ui/AnimatedBackground';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import { exportOrdersToExcel } from '../../utils/excelUtils';

interface DonHangTonViewProps {
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    isActive?: boolean;
    pairedData?: any[];
    processedInvoices?: any[];
}

const CopyableField: React.FC<{ text: string; showToast?: Function; className?: string; label?: string; wrap?: boolean }> = ({ text, className, label, wrap = false }) => {
    const copyWithFeedback = useCopyFeedback();
    if (!text || text === 'N/A') {
        return <div className={className}>{label ? `${label}: ` : ''}N/A</div>;
    }
    return (
        <span
            className={`cursor-pointer hover:underline inline-flex items-center gap-1 ${className}`}
            title={`Click để sao chép: ${text}`}
            onClick={(e) => { e.stopPropagation(); copyWithFeedback(text, e); }}
        >
            {label ? <span>{label}: </span> : null}
            <span className={wrap ? 'break-words' : 'truncate'}>{text}</span>
            <i className="far fa-copy text-[10px] opacity-60 hover:opacity-100"></i>
        </span>
    );
};

export const DonHangTonView: React.FC<DonHangTonViewProps> = ({ showToast, isActive: _isActive = true, pairedData = [], processedInvoices = [] }) => {
    const [backlogOrders, setBacklogOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncingCyber, setIsSyncingCyber] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTVBH, setSelectedTVBH] = useState('all');
    const [selectedModel, setSelectedModel] = useState('all');
    const [selectedMonthYear, setSelectedMonthYear] = useState('all');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'coc_desc' | 'coc_asc'>('date_desc');

    const copyWithFeedback = useCopyFeedback();

    const fetchBacklogOrders = async () => {
        setIsLoading(true);
        try {
            const res = await apiService.getBacklogOrders();
            if (res.status === 'SUCCESS' && res.data) {
                const modelPatterns = [
                    { pattern: /^VF\s*MPV\s*7/i, model: 'VF MPV 7' },
                    { pattern: /^EC\s*VAN/i, model: 'EC VAN' },
                    { pattern: /^MINIO\s*GREEN/i, model: 'MINIO GREEN' },
                    { pattern: /^LIMO\s*GREEN/i, model: 'LIMO GREEN' },
                    { pattern: /^VF\s*9/i, model: 'VF 9' },
                    { pattern: /^VF\s*8/i, model: 'VF 8' },
                    { pattern: /^VF\s*7/i, model: 'VF 7' },
                    { pattern: /^VF\s*6/i, model: 'VF 6' },
                    { pattern: /^VF\s*5/i, model: 'VF 5' },
                    { pattern: /^VF\s*3/i, model: 'VF 3' },
                    { pattern: /^VF\s*2/i, model: 'VF 2' },
                    { pattern: /^VF\s*e34/i, model: 'VFe34' },
                ];

                const enriched = res.data.map((o: any) => {
                    const full = o.phien_ban || '';
                    let model = 'N/A';
                    let version = full;

                    for (const { pattern, model: mName } of modelPatterns) {
                        if (pattern.test(full)) {
                            model = mName;
                            version = full.replace(pattern, '').trim() || 'Tiêu chuẩn';
                            break;
                        }
                    }

                    if (model === 'N/A' && full) {
                        const parts = full.split(' ');
                        model = parts[0];
                        version = parts.slice(1).join(' ') || 'Tiêu chuẩn';
                    }

                    const isProcessed = processedInvoices.some(inv => inv['Số đơn hàng'] === o.so_don_hang) || full.toUpperCase().includes('ĐÃ XUẤT HÓA ĐƠN');

                    if (isProcessed) {
                        try {
                            supabase.from('donhang_ton').delete().eq('id', o.id).then();
                        } catch (e) {
                            console.error('Failed to auto-delete processed backlog order:', e);
                        }
                    }

                    const pairedInfo = pairedData.find(pd => pd['Số đơn hàng'] === o.so_don_hang);
                    const realVin = (o.vin && o.vin !== 'N/A') ? o.vin : (pairedInfo?.VIN || o.donhanghienhuu?.so_vin || 'N/A');

                    return {
                        ...o,
                        displayModel: model,
                        displayVersion: version,
                        vin: realVin,
                        isProcessed
                    };
                });

                setBacklogOrders(enriched.filter((o: any) => !o.isProcessed));
            } else {
                showToast('Lỗi', res.message || 'Lỗi khi tải đơn hàng tồn', 'error');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Exception loading backlog orders', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBacklogOrders();

        const channel = supabase
            .channel('donhang_ton_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'donhang_ton' }, () => {
                fetchBacklogOrders();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Unique model options with count
    const modelStats = useMemo(() => {
        const counts = new Map<string, number>();
        backlogOrders.forEach(o => {
            const m = o.displayModel || 'Khác';
            counts.set(m, (counts.get(m) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([model, count]) => ({ model, count }));
    }, [backlogOrders]);

    // Unique TVBH list with count & total deposit
    const tvbhList = useMemo(() => {
        const statsMap = new Map<string, { count: number; totalCoc: number }>();
        backlogOrders.forEach(o => {
            const name = o.tvbh_name || 'Khác';
            const cur = statsMap.get(name) || { count: 0, totalCoc: 0 };
            cur.count += 1;
            cur.totalCoc += Number(o.tien_coc || 0);
            statsMap.set(name, cur);
        });

        return Array.from(statsMap.entries())
            .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
            .map(([name, s]) => ({
                name,
                count: s.count,
                totalCoc: s.totalCoc
            }));
    }, [backlogOrders]);

    // Unique Month/Year list with order count
    const monthYearList = useMemo(() => {
        const counts = new Map<string, { key: string; label: string; count: number }>();
        backlogOrders.forEach(o => {
            const rawDate = o.ngay_hop_dong || o.ngay_giao_dich;
            if (!rawDate) return;
            const m = moment(rawDate);
            if (m.isValid()) {
                const key = m.format('YYYY-MM');
                const label = `Tháng ${m.format('MM/YYYY')}`;
                const cur = counts.get(key) || { key, label, count: 0 };
                cur.count += 1;
                counts.set(key, cur);
            }
        });
        return Array.from(counts.values()).sort((a, b) => b.key.localeCompare(a.key));
    }, [backlogOrders]);

    // Overall KPI statistics
    const kpiStats = useMemo(() => {
        const totalCount = backlogOrders.length;
        const totalCoc = backlogOrders.reduce((sum, o) => sum + Number(o.tien_coc || 0), 0);
        const activeTvbhCount = tvbhList.length;
        const topModel = modelStats.length > 0 ? `${modelStats[0].model} (${modelStats[0].count})` : 'N/A';
        const topTvbh = tvbhList.length > 0 ? `${tvbhList[0].name} (${tvbhList[0].count} đơn)` : 'N/A';

        return { totalCount, totalCoc, activeTvbhCount, topModel, topTvbh };
    }, [backlogOrders, tvbhList, modelStats]);

    // Filter and sort orders
    const filteredOrders = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();

        return backlogOrders
            .filter(order => {
                const matchTVBH = selectedTVBH === 'all' || order.tvbh_name === selectedTVBH;
                const matchModel = selectedModel === 'all' || order.displayModel === selectedModel;

                const matchMonthYear = selectedMonthYear === 'all' || (() => {
                    const rawDate = order.ngay_hop_dong || order.ngay_giao_dich;
                    if (!rawDate) return false;
                    const m = moment(rawDate);
                    return m.isValid() && m.format('YYYY-MM') === selectedMonthYear;
                })();

                const matchSearch = !q || (
                    (order.khach_hang && order.khach_hang.toLowerCase().includes(q)) ||
                    (order.so_dien_thoai && order.so_dien_thoai.includes(q)) ||
                    (order.tvbh_name && order.tvbh_name.toLowerCase().includes(q)) ||
                    (order.so_hop_dong && order.so_hop_dong.toLowerCase().includes(q)) ||
                    (order.so_don_hang && order.so_don_hang.toLowerCase().includes(q)) ||
                    (order.vin && order.vin.toLowerCase().includes(q)) ||
                    (order.displayModel && order.displayModel.toLowerCase().includes(q))
                );

                return matchTVBH && matchModel && matchMonthYear && matchSearch;
            })
            .sort((a, b) => {
                if (sortBy === 'date_desc') {
                    return new Date(b.ngay_hop_dong || b.ngay_giao_dich || 0).getTime() - new Date(a.ngay_hop_dong || a.ngay_giao_dich || 0).getTime();
                }
                if (sortBy === 'date_asc') {
                    return new Date(a.ngay_hop_dong || a.ngay_giao_dich || 0).getTime() - new Date(b.ngay_hop_dong || b.ngay_giao_dich || 0).getTime();
                }
                if (sortBy === 'coc_desc') {
                    return Number(b.tien_coc || 0) - Number(a.tien_coc || 0);
                }
                if (sortBy === 'coc_asc') {
                    return Number(a.tien_coc || 0) - Number(b.tien_coc || 0);
                }
                return 0;
            });
    }, [backlogOrders, selectedTVBH, selectedModel, selectedMonthYear, searchQuery, sortBy]);

    // Selected order for detail drawer
    const selectedOrder = useMemo(() => {
        return backlogOrders.find(o => o.id === selectedOrderId) || null;
    }, [backlogOrders, selectedOrderId]);

    const handleSelectOrder = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedOrderId(id);
        setIsDrawerOpen(true);
    };

    const handleUpdateProgress = async (id: string, newProgress: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setBacklogOrders(prev => prev.map(o => o.id === id ? { ...o, tien_do: newProgress } : o));
        try {
            await apiService.updateBacklogTienDo(id, newProgress);
            showToast?.('Đã cập nhật', `Đã cập nhật tiến độ sang "${newProgress}"`, 'success');
        } catch (e: any) {
            showToast?.('Lỗi cập nhật', e.message || 'Không thể lưu tiến độ', 'error');
        }
    };

    const handleExportExcel = () => {
        if (filteredOrders.length === 0) {
            showToast('Thông báo', 'Không có đơn hàng nào để xuất', 'warning');
            return;
        }

        const exportData = filteredOrders.map((o, idx) => ({
            'STT': idx + 1,
            'Tên Khách Hàng': o.khach_hang || '',
            'Số Điện Thoại': o.so_dien_thoai || '',
            'Tư Vấn Bán Hàng': o.tvbh_name || '',
            'Dòng Xe': o.displayModel || '',
            'Phiên Bản': o.displayVersion || '',
            'Ngoại Thất': o.ngoai_that || '',
            'Nội Thất': o.noi_that || '',
            'Tiền Cọc Đã Nộp (VNĐ)': Number(o.tien_coc || 0),
            'Giá Trị Hợp Đồng (VNĐ)': Number(o.gia_tri_hd || 0),
            'Số HĐ Cyber': o.so_hop_dong || o.so_don_hang || '',
            'Số VIN': o.vin || '',
            'Ngày Hợp Đồng': o.ngay_hop_dong ? moment(o.ngay_hop_dong).format('DD/MM/YYYY') : '',
            'Trạng Thái Cyber': o.ten_post || '',
            'Ghi Chú': o.ghi_chu || ''
        }));

        exportOrdersToExcel(exportData, `Don_Hang_Coc_Ton_${moment().format('YYYYMMDD_HHmm')}`);
        showToast('Thành công', `Đã xuất ${filteredOrders.length} đơn hàng cọc tồn ra Excel`, 'success');
    };

    const handleSyncCyber = async () => {
        setIsSyncingCyber(true);
        showToast('Đang kết nối', 'Đang truy vấn dữ liệu cọc tồn mới nhất từ CyberSoft...', 'info');
        try {
            const res = await apiService.triggerCyberDonHangTonSync();
            if (res.success) {
                showToast('Thành công', res.message || 'Đồng bộ dữ liệu Cyber thành công!', 'success');
                await fetchBacklogOrders();
            } else {
                showToast('Cảnh báo', res.error || res.message || 'Không thể đồng bộ từ Cyber', 'warning');
            }
        } catch (e: any) {
            showToast('Lỗi', e.message || 'Lỗi khi đồng bộ Cyber', 'error');
        } finally {
            setIsSyncingCyber(false);
        }
    };

    const handleCopyZaloSummary = (order: any, e: React.MouseEvent) => {
        e.stopPropagation();
        const text = `🚗 ĐƠN CỌC TỒN VINFAST THUẬN AN
• Khách hàng: ${order.khach_hang || 'N/A'}
• SĐT: ${order.so_dien_thoai || 'N/A'}
• TVBH: ${order.tvbh_name || 'N/A'}
• Dòng xe: ${order.displayModel} - ${order.displayVersion}
• Màu sắc: ${order.ngoai_that} / ${order.noi_that}
• Tiền cọc: ${Number(order.tien_coc || 0).toLocaleString('vi-VN')} đ
• Số HĐ: ${order.so_hop_dong || order.so_don_hang}
• Ngày HĐ: ${moment(order.ngay_hop_dong || order.ngay_giao_dich).format('DD/MM/YYYY')}
• Trạng thái: ${order.ten_post || 'Chờ giao xe'}`;

        copyWithFeedback(text, e);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden relative">
            <AnimatedBackground />

            {/* TOP KPI STATS BAR */}
            <div className="flex-shrink-0 p-3 md:p-4 pb-2 z-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3">
                    {/* Stat 1: Total Orders */}
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                            <i className="fas fa-file-invoice text-base"></i>
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Đơn Cọc Tồn</div>
                            <div className="text-lg md:text-xl font-black text-slate-800 leading-tight">
                                {kpiStats.totalCount} <span className="text-xs font-semibold text-slate-400">đơn</span>
                            </div>
                            <div className="text-[10px] text-blue-600 font-medium truncate">Từ 01/07/2026 đến nay</div>
                        </div>
                    </div>

                    {/* Stat 2: Total Deposit Amount */}
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center gap-3 bg-gradient-to-br from-white to-emerald-50/30">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100/80 border border-emerald-200 flex items-center justify-center text-emerald-600 flex-shrink-0">
                            <i className="fas fa-coins text-base"></i>
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider truncate">Tổng Tiền Cọc Đã Thu</div>
                            <div className="text-lg md:text-xl font-black text-emerald-700 font-mono leading-tight">
                                {(kpiStats.totalCoc / 1_000_000).toLocaleString('vi-VN')} <span className="text-xs font-bold">triệu</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">{kpiStats.totalCoc.toLocaleString('vi-VN')} đ</div>
                        </div>
                    </div>

                    {/* Stat 3: Active Sales */}
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                            <i className="fas fa-users text-base"></i>
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">TVBH Có Đơn Tồn</div>
                            <div className="text-lg md:text-xl font-black text-slate-800 leading-tight">
                                {kpiStats.activeTvbhCount} <span className="text-xs font-semibold text-slate-400">nhân sự</span>
                            </div>
                            <div className="text-[10px] text-indigo-600 font-medium truncate">Top 1: {kpiStats.topTvbh}</div>
                        </div>
                    </div>

                    {/* Stat 4: Top Model */}
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                            <i className="fas fa-car-side text-base"></i>
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Dòng Xe Cọc Nhiều Nhất</div>
                            <div className="text-base md:text-lg font-black text-slate-800 leading-tight truncate">
                                {kpiStats.topModel}
                            </div>
                            <div className="text-[10px] text-slate-400 font-medium truncate">Showroom VinFast Thuận An</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROLS & TOOLBAR */}
            <div className="flex-shrink-0 px-3 md:px-4 py-2 z-10">
                <div className="bg-white/95 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
                    {/* Search & Select TVBH */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm khách hàng, SĐT, số HĐ, VIN, TVBH..."
                                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-hidden transition-all text-slate-700 placeholder-slate-400"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            )}
                        </div>

                        {/* Month/Year Filter Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedMonthYear}
                                onChange={(e) => setSelectedMonthYear(e.target.value)}
                                className="py-1.5 pl-8 pr-7 bg-slate-50 hover:bg-slate-100 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-hidden text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="all">Tất cả các tháng ({backlogOrders.length})</option>
                                {monthYearList.map(m => (
                                    <option key={m.key} value={m.key}>
                                        {m.label} ({m.count} đơn)
                                    </option>
                                ))}
                            </select>
                            <i className="fas fa-calendar-alt absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-blue-600 pointer-events-none"></i>
                            <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none"></i>
                        </div>

                        {/* TVBH Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedTVBH}
                                onChange={(e) => setSelectedTVBH(e.target.value)}
                                className="py-1.5 pl-3 pr-7 bg-slate-50 hover:bg-slate-100 text-xs font-semibold rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-hidden text-slate-700 appearance-none cursor-pointer"
                            >
                                <option value="all">Tất cả TVBH ({backlogOrders.length})</option>
                                {tvbhList.map(t => (
                                    <option key={t.name} value={t.name}>
                                        {t.name} ({t.count} đơn - {(t.totalCoc / 1_000_000).toLocaleString('vi-VN')} tr)
                                    </option>
                                ))}
                            </select>
                            <i className="fas fa-chevron-down absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none"></i>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="relative hidden lg:block">
                            <select
                                value={sortBy}
                                onChange={(e: any) => setSortBy(e.target.value)}
                                className="py-1.5 pl-3 pr-7 bg-slate-50 hover:bg-slate-100 text-xs font-medium rounded-xl border border-slate-200 focus:border-blue-500 focus:outline-hidden text-slate-600 appearance-none cursor-pointer"
                            >
                                <option value="date_desc">Ngày ký: Mới nhất</option>
                                <option value="date_asc">Ngày ký: Cũ nhất</option>
                                <option value="coc_desc">Tiền cọc: Cao nhất</option>
                                <option value="coc_asc">Tiền cọc: Thấp nhất</option>
                            </select>
                            <i className="fas fa-sort absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none"></i>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5 self-end md:self-auto">
                        {/* Sync from Cyber Button */}
                        <button
                            onClick={handleSyncCyber}
                            disabled={isSyncingCyber}
                            className={`px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 ${isSyncingCyber ? 'opacity-80 cursor-wait' : ''}`}
                            title="Đồng bộ ngay dữ liệu cọc tồn từ CyberSoft (Hệ thống tự động chạy ngầm mỗi 3 tiếng)"
                        >
                            <i className={`fas fa-rotate text-xs ${isSyncingCyber ? 'fa-spin' : ''}`}></i>
                            <span>{isSyncingCyber ? 'Đang đồng bộ...' : 'Đồng bộ từ Cyber'}</span>
                            <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full font-mono hidden md:inline">3h/lần</span>
                        </button>

                        {/* Export Excel Button */}
                        <button
                            onClick={handleExportExcel}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                            title="Xuất file Excel"
                        >
                            <i className="fas fa-file-excel text-xs"></i>
                            <span className="hidden sm:inline">Xuất Excel</span>
                        </button>

                        {/* Refresh Button */}
                        <button
                            onClick={fetchBacklogOrders}
                            disabled={isLoading}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                            title="Làm mới dữ liệu"
                        >
                            <i className={`fas fa-sync-alt text-xs ${isLoading ? 'fa-spin' : ''}`}></i>
                        </button>
                    </div>
                </div>

                {/* Quick Model Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 no-scrollbar">
                    <button
                        onClick={() => setSelectedModel('all')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 ${selectedModel === 'all' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                    >
                        Tất cả dòng xe ({backlogOrders.length})
                    </button>
                    {modelStats.map(item => (
                        <button
                            key={item.model}
                            onClick={() => setSelectedModel(item.model === selectedModel ? 'all' : item.model)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5 ${selectedModel === item.model ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                        >
                            <span>{item.model}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${selectedModel === item.model ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {item.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 min-h-0 px-3 md:px-4 pb-3 flex flex-col z-10 overflow-hidden">
                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white/80 rounded-2xl border border-slate-200">
                        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs font-bold text-slate-500">Đang tải danh sách đơn cọc tồn...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white/80 rounded-2xl border border-slate-200 p-8 text-center">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 text-2xl mb-3">
                            <i className="fas fa-filter"></i>
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 mb-1">Không tìm thấy đơn cọc nào</h3>
                        <p className="text-xs text-slate-400 max-w-sm mb-4">
                            Không có kết quả nào khớp với bộ lọc hoặc từ khóa tìm kiếm hiện tại.
                        </p>
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedTVBH('all'); setSelectedModel('all'); setSelectedMonthYear('all'); }}
                            className="px-4 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-bold rounded-xl transition-all"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-0 overflow-hidden">
                        {/* Status bar */}
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-700">Đang hiển thị {filteredOrders.length} / {backlogOrders.length} đơn</span>
                                {(selectedModel !== 'all' || selectedTVBH !== 'all' || selectedMonthYear !== 'all' || searchQuery) && (
                                    <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-semibold">
                                        Đã lọc
                                    </span>
                                )}
                            </div>
                            <div className="font-medium text-emerald-700 font-mono">
                                Tổng cọc: {filteredOrders.reduce((s, o) => s + Number(o.tien_coc || 0), 0).toLocaleString('vi-VN')} đ
                            </div>
                        </div>

                        {/* DATA TABLE */}
                        <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-100/80 sticky top-0 z-10 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                                            <th className="py-2.5 px-3 min-w-[200px]">Khách Hàng</th>
                                            <th className="py-2.5 px-3 min-w-[140px]">TVBH Phụ Trách</th>
                                            <th className="py-2.5 px-3 min-w-[140px]">Dòng Xe & Phiên Bản</th>
                                            <th className="py-2.5 px-3 min-w-[130px]">Màu Sắc</th>
                                            <th className="py-2.5 px-3 text-right min-w-[120px]">Tiền Cọc Đã Nộp</th>
                                            <th className="py-2.5 px-3 min-w-[160px]">Số Hợp Đồng Cyber</th>
                                            <th className="py-2.5 px-3 min-w-[110px]">Ngày Ký HĐ</th>
                                            <th className="py-2.5 px-3 min-w-[130px]">Trạng Thái Cyber</th>
                                            <th className="py-2.5 px-3 min-w-[240px] text-center">Tiến Độ TVBH</th>
                                            <th className="py-2.5 px-3 text-center w-20">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredOrders.map((order, idx) => {
                                            const daysAgo = moment().diff(moment(order.ngay_hop_dong || order.ngay_giao_dich), 'days');
                                            return (
                                                <tr
                                                    key={order.id}
                                                    onClick={() => handleSelectOrder(order.id)}
                                                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                                                >
                                                    <td className="py-2.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                                                        {idx + 1}
                                                    </td>

                                                    {/* Customer */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                                            {order.khach_hang}
                                                        </div>
                                                        {order.so_dien_thoai ? (
                                                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                                                                <i className="fas fa-phone-alt text-[9px] text-slate-400"></i>
                                                                <CopyableField text={order.so_dien_thoai} showToast={showToast} className="text-slate-600 font-bold" />
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-300 italic">Chưa có SĐT</span>
                                                        )}
                                                    </td>

                                                    {/* TVBH */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 flex-shrink-0">
                                                                {order.tvbh_name?.[0]?.toUpperCase() || 'S'}
                                                            </div>
                                                            <span className="font-semibold text-slate-700 truncate max-w-[130px]">{order.tvbh_name}</span>
                                                        </div>
                                                    </td>

                                                    {/* Car Model & Version */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-100 text-xs mb-0.5">
                                                            <i className="fas fa-car text-[10px]"></i>
                                                            <span>{order.displayModel}</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-normal truncate max-w-[180px]">
                                                            {order.displayVersion || 'Tiêu chuẩn'}
                                                        </div>
                                                    </td>

                                                    {/* Colors */}
                                                    <td className="py-2.5 px-3 text-[11px] text-slate-600">
                                                        <div><span className="text-slate-400 text-[10px]">Ngoại:</span> <span className="font-semibold">{order.ngoai_that || 'N/A'}</span></div>
                                                        <div><span className="text-slate-400 text-[10px]">Nội:</span> <span className="font-semibold">{order.noi_that || 'N/A'}</span></div>
                                                    </td>

                                                    {/* Deposit Amount */}
                                                    <td className="py-2.5 px-3 text-right">
                                                        <div className="text-sm font-black text-emerald-700 font-mono">
                                                            {Number(order.tien_coc || 0).toLocaleString('vi-VN')} đ
                                                        </div>
                                                        {order.gia_tri_hd > 0 && (
                                                            <div className="text-[10px] text-slate-400 font-mono">
                                                                HĐ: {(order.gia_tri_hd / 1_000_000).toLocaleString('vi-VN')} tr
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Contract & Cyber */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-mono text-xs font-bold text-slate-700 truncate max-w-[160px]">
                                                            <CopyableField text={order.so_hop_dong || order.so_don_hang} showToast={showToast} />
                                                        </div>
                                                    </td>

                                                    {/* Date & Aging */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="font-medium text-slate-700">
                                                            {moment(order.ngay_hop_dong || order.ngay_giao_dich).format('DD/MM/YYYY')}
                                                        </div>
                                                        <div className="text-[10px] text-slate-400">
                                                            Tồn {daysAgo} ngày
                                                        </div>
                                                    </td>

                                                    {/* Cyber Status */}
                                                    <td className="py-2.5 px-3">
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[130px]">
                                                            {order.ten_post || 'Hợp đồng mới'}
                                                        </span>
                                                    </td>

                                                    {/* TVBH Progress Select */}
                                                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <div className="inline-flex items-center justify-center gap-1 p-1 bg-slate-100/90 rounded-lg border border-slate-200">
                                                            {(['Chờ xe', 'Cần xe', 'Hoàn cọc', 'Hủy cọc']).map(status => {
                                                                const isSelected = (order.tien_do || 'Chờ xe') === status;
                                                                return (
                                                                    <button
                                                                        key={status}
                                                                        type="button"
                                                                        onClick={(e) => handleUpdateProgress(order.id, status, e)}
                                                                        className={`px-1.5 py-0.5 rounded text-[10px] font-black transition-all cursor-pointer ${
                                                                            isSelected 
                                                                                ? (status === 'Cần xe' 
                                                                                    ? 'bg-emerald-600 text-white shadow-xs' 
                                                                                    : status === 'Hoàn cọc' 
                                                                                    ? 'bg-amber-500 text-white shadow-xs' 
                                                                                    : status === 'Hủy cọc' 
                                                                                    ? 'bg-rose-600 text-white shadow-xs' 
                                                                                    : 'bg-sky-600 text-white shadow-xs')
                                                                                : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                                                        }`}
                                                                    >
                                                                        {status}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        <button
                                                            onClick={(e) => handleCopyZaloSummary(order, e)}
                                                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                            title="Sao chép tóm tắt gửi Zalo"
                                                        >
                                                            <i className="fas fa-share-nodes text-xs"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                    </div>
                )}
            </div>

            {/* SLIDE-OVER DRAWER FOR DETAILED ORDER VIEW */}
            {isDrawerOpen && selectedOrder && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
                        onClick={() => setIsDrawerOpen(false)}
                    />

                    {/* Drawer Content */}
                    <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col z-10 animate-slide-left border-l border-slate-200">
                        {/* Drawer Header */}
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-black shadow-xs">
                                    {selectedOrder.khach_hang?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{selectedOrder.khach_hang}</h2>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                        <span>TVBH: <strong className="text-slate-600">{selectedOrder.tvbh_name}</strong></span>
                                        <span>•</span>
                                        <span className="text-blue-600 font-bold">{selectedOrder.ten_post || 'Hợp đồng mới'}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
                            >
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>

                        {/* Drawer Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {/* Deposit Highlight Card */}
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
                                <div className="flex items-center justify-between text-xs text-emerald-100 mb-1">
                                    <span className="font-bold uppercase tracking-wider">Tiền cọc thực tế đã nộp</span>
                                    <i className="fas fa-check-circle text-emerald-200"></i>
                                </div>
                                <div className="text-2xl font-black font-mono tracking-tight mb-2">
                                    {Number(selectedOrder.tien_coc || 0).toLocaleString('vi-VN')} VNĐ
                                </div>
                                <div className="pt-2 border-t border-emerald-400/40 flex items-center justify-between text-xs text-emerald-100">
                                    <span>Tổng giá trị hợp đồng:</span>
                                    <span className="font-mono font-bold text-white">
                                        {selectedOrder.gia_tri_hd > 0 ? `${Number(selectedOrder.gia_tri_hd).toLocaleString('vi-VN')} đ` : 'Chưa cập nhật'}
                                    </span>
                                </div>
                            </div>

                            {/* Customer Phone Card */}
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
                                        <i className="fas fa-phone-alt"></i>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Số Điện Thoại Khách</div>
                                        <div className="text-sm font-black text-slate-800 font-mono">
                                            {selectedOrder.so_dien_thoai || 'Chưa có thông tin'}
                                        </div>
                                    </div>
                                </div>
                                {selectedOrder.so_dien_thoai && (
                                    <div className="flex items-center gap-1.5">
                                        <a
                                            href={`tel:${selectedOrder.so_dien_thoai}`}
                                            className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                                        >
                                            <i className="fas fa-phone mr-1 text-[10px]"></i> Gọi
                                        </a>
                                        <CopyableField
                                            text={selectedOrder.so_dien_thoai}
                                            showToast={showToast}
                                            className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Section 1: Vehicle Configuration */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                                    <i className="fas fa-car text-blue-600"></i>
                                    <span>Cấu hình xe cọc</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5 text-xs">
                                    <div className="p-2.5 bg-slate-50 rounded-xl">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Dòng xe</div>
                                        <div className="text-sm font-black text-blue-700">{selectedOrder.displayModel}</div>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Phiên bản</div>
                                        <div className="text-xs font-bold text-slate-800 truncate">{selectedOrder.displayVersion || 'Tiêu chuẩn'}</div>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Ngoại thất</div>
                                        <div className="text-xs font-bold text-slate-700">{selectedOrder.ngoai_that || 'N/A'}</div>
                                    </div>
                                    <div className="p-2.5 bg-slate-50 rounded-xl">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Nội thất</div>
                                        <div className="text-xs font-bold text-slate-700">{selectedOrder.noi_that || 'N/A'}</div>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Số khung / VIN</span>
                                    <CopyableField
                                        text={selectedOrder.vin || 'Chưa gán VIN'}
                                        showToast={showToast}
                                        className="text-xs font-mono font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            {/* Section 2: Contract & Cyber Details */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                                    <i className="fas fa-file-contract text-blue-600"></i>
                                    <span>Hợp đồng & Chứng từ Cyber</span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Số HĐ Cyber:</span>
                                        <CopyableField
                                            text={selectedOrder.so_hop_dong || selectedOrder.so_don_hang}
                                            showToast={showToast}
                                            className="font-mono font-bold text-blue-600"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Ngày lập hợp đồng:</span>
                                        <span className="font-semibold text-slate-800">
                                            {moment(selectedOrder.ngay_hop_dong || selectedOrder.ngay_giao_dich).format('DD/MM/YYYY')}
                                            <span className="text-[10px] text-slate-400 ml-1.5 font-normal">
                                                ({moment().diff(moment(selectedOrder.ngay_hop_dong || selectedOrder.ngay_giao_dich), 'days')} ngày trước)
                                            </span>
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                                        <span className="text-slate-400">Trạng thái trên Cyber:</span>
                                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                            {selectedOrder.ten_post || 'Hợp đồng mới'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between py-1">
                                        <span className="text-slate-400">Mã chứng từ (STT REC):</span>
                                        <span className="font-mono text-[11px] text-slate-500">{selectedOrder.stt_rec || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Notes & History */}
                            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    <i className="fas fa-sticky-note text-amber-500 mr-1.5"></i>
                                    Ghi chú hệ thống
                                </div>
                                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs text-amber-900 leading-relaxed font-medium">
                                    {selectedOrder.ghi_chu || 'Không có ghi chú thêm.'}
                                </div>
                            </div>
                        </div>

                        {/* Drawer Footer Actions */}
                        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-2">
                            <button
                                onClick={(e) => handleCopyZaloSummary(selectedOrder, e)}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
                            >
                                <i className="fas fa-copy"></i>
                                <span>Sao chép thông tin gửi Zalo</span>
                            </button>
                            <button
                                onClick={() => setIsDrawerOpen(false)}
                                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DonHangTonView;
