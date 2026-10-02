import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { getBacklogOrders, updateBacklogTienDo } from '../../services/api/adminService';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import moment from 'moment';
import * as XLSX from 'xlsx';

export type BacklogProgressType = 'Chờ xe' | 'Cần xe' | 'Hoàn cọc' | 'Hủy cọc';

interface TVBHBacklogOrdersViewProps {
    currentUser: string;
    currentUserName?: string;
    userRole?: string;
    isCurrentUserAdmin?: boolean;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    onBackToDms?: () => void;
}

const normalizeStr = (s?: string): string => {
    if (!s) return '';
    return s.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d");
};

const isNameMatch = (orderTvbh?: string, targetName?: string): boolean => {
    const a = normalizeStr(orderTvbh);
    const b = normalizeStr(targetName);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
};

const formatVND = (num?: number | string): string => {
    const val = Number(num || 0);
    if (!val) return '0 ₫';
    return val.toLocaleString('vi-VN') + ' ₫';
};

const PROGRESS_STYLES: Record<BacklogProgressType, {
    shortLabel: string;
    label: string;
    icon: string;
    activeBtnCls: string;
    idleBtnCls: string;
}> = {
    'Chờ xe': {
        shortLabel: 'Chờ',
        label: 'Chờ xe',
        icon: 'fa-hourglass-half',
        activeBtnCls: 'bg-sky-600 text-white font-bold shadow-2xs',
        idleBtnCls: 'bg-white hover:bg-sky-50 text-slate-700 border-[#B5B5B5]'
    },
    'Cần xe': {
        shortLabel: '⚡ Cần',
        label: 'Cần xe',
        icon: 'fa-bolt',
        activeBtnCls: 'bg-emerald-600 text-white font-bold shadow-2xs',
        idleBtnCls: 'bg-white hover:bg-emerald-50 text-slate-700 border-[#B5B5B5]'
    },
    'Hoàn cọc': {
        shortLabel: 'Hoàn',
        label: 'Hoàn cọc',
        icon: 'fa-rotate-left',
        activeBtnCls: 'bg-amber-500 text-white font-bold shadow-2xs',
        idleBtnCls: 'bg-white hover:bg-amber-50 text-slate-700 border-[#B5B5B5]'
    },
    'Hủy cọc': {
        shortLabel: 'Hủy',
        label: 'Hủy cọc',
        icon: 'fa-ban',
        activeBtnCls: 'bg-rose-600 text-white font-bold shadow-2xs',
        idleBtnCls: 'bg-white hover:bg-rose-50 text-slate-700 border-[#B5B5B5]'
    }
};

export const TVBHBacklogOrdersView: React.FC<TVBHBacklogOrdersViewProps> = ({
    currentUser,
    currentUserName,
    userRole,
    isCurrentUserAdmin = false,
    showToast,
    onBackToDms
}) => {
    const copyWithFeedback = useCopyFeedback();
    const [backlogOrders, setBacklogOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Active row index in Cyber table
    const [selectedRowIdx, setSelectedRowIdx] = useState<number>(0);

    // Identify if current user is a Sales Manager (TPKD)
    const isManager = useMemo(() => {
        if (isCurrentUserAdmin) return false;
        const r = (userRole || '').toLowerCase();
        return r.includes('trưởng phòng') || r.includes('tpkd') || r.includes('trưởng nhóm');
    }, [isCurrentUserAdmin, userRole]);

    // Team members list for TPKD
    const [teamMembers, setTeamMembers] = useState<string[]>([]);

    useEffect(() => {
        if (!isManager) return;

        let isMounted = true;
        const loadTeamMembers = async () => {
            try {
                const { data } = await supabase
                    .from('users')
                    .select('username, full_name, manager_id');

                if (!isMounted) return;

                if (data && data.length > 0) {
                    const myUname = (currentUserName || '').toLowerCase().trim();
                    const myFullNameNorm = normalizeStr(currentUser);

                    // Always include manager's own name and username
                    const members: string[] = [currentUser];
                    if (currentUserName) members.push(currentUserName);

                    data.forEach(u => {
                        const mgrId = (u.manager_id || '').toLowerCase().trim();
                        if (mgrId && (mgrId === myUname || mgrId === myFullNameNorm)) {
                            if (u.full_name) members.push(u.full_name);
                            if (u.username) members.push(u.username);
                        }
                    });

                    setTeamMembers(Array.from(new Set(members.filter(Boolean))));
                }
            } catch (err) {
                console.error('Lỗi lấy danh sách thành viên phòng kinh doanh:', err);
            }
        };

        loadTeamMembers();

        return () => {
            isMounted = false;
        };
    }, [isManager, currentUserName, currentUser]);

    // Filters (CyberSoft style toolbar)
    const [activeTab, setActiveTab] = useState<string>('all');
    const [progressFilter, setProgressFilter] = useState<string>('all');
    const [tvbhFilter, setTvbhFilter] = useState<string>('all');
    const [searchValue, setSearchValue] = useState<string>('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Fetch backlog orders from Supabase
    const fetchOrders = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const res = await getBacklogOrders();
            if (res.status === 'SUCCESS' && Array.isArray(res.data)) {
                setBacklogOrders(res.data);
            }
        } catch (err: any) {
            console.error('Lỗi tải danh sách đơn cọc tồn:', err);
            showToast?.('Lỗi tải dữ liệu', err.message || 'Không thể tải danh sách đơn tồn', 'error');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchOrders();

        const channel = supabase
            .channel('realtime_donhang_ton_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'donhang_ton' }, () => {
                fetchOrders(true);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchOrders]);

    // Handle quick status change on single row
    const handleProgressChange = async (orderId: string, newProgress: BacklogProgressType, currentVal: string) => {
        if (newProgress === currentVal) return;

        // Optimistic UI update
        setBacklogOrders(prev => prev.map(o => o.id === orderId ? { ...o, tien_do: newProgress } : o));
        setUpdatingId(orderId);

        try {
            const res = await updateBacklogTienDo(orderId, newProgress);
            if (res.status === 'SUCCESS') {
                showToast?.('Đã cập nhật', `Tiến độ chuyển sang: "${newProgress}"`, 'success');
            } else {
                setBacklogOrders(prev => prev.map(o => o.id === orderId ? { ...o, tien_do: currentVal } : o));
                showToast?.('Lỗi cập nhật', res.message || 'Không thể lưu tiến độ', 'error');
            }
        } catch (e: any) {
            setBacklogOrders(prev => prev.map(o => o.id === orderId ? { ...o, tien_do: currentVal } : o));
            showToast?.('Lỗi cập nhật', e.message || 'Đã có lỗi xảy ra', 'error');
        } finally {
            setUpdatingId(null);
        }
    };

    // PHÂN QUYỀN TRUY CẬP ĐƠN HÀNG CỌC TỒN:
    // 1. Admin: Xem toàn bộ showroom
    // 2. TPKD (Trưởng Phòng): Chỉ xem được đơn của các TVBH trong phòng kinh doanh của mình và của bản thân
    // 3. TVBH thường: Đơn hàng của ai thì MỚI CÓ QUYỀN thấy (tuyệt đối không thấy của người khác)
    const baseOrdersForUser = useMemo(() => {
        if (isCurrentUserAdmin) {
            return backlogOrders;
        }

        if (isManager) {
            if (teamMembers.length === 0) {
                // Đang tải danh sách phòng, fallback an toàn chỉ thấy của bản thân
                return backlogOrders.filter(o => 
                    isNameMatch(o.tvbh_name, currentUser) || 
                    isNameMatch(o.tvbh_name, currentUserName)
                );
            }

            return backlogOrders.filter(o => 
                teamMembers.some(member => isNameMatch(o.tvbh_name, member))
            );
        }

        // TVBH thường: chỉ thấy đơn của chính mình
        return backlogOrders.filter(o => 
            isNameMatch(o.tvbh_name, currentUser) || 
            isNameMatch(o.tvbh_name, currentUserName)
        );
    }, [backlogOrders, isCurrentUserAdmin, isManager, teamMembers, currentUser, currentUserName]);

    // Unique Car Models for Cyber Toolbar Dropdown
    const uniqueModels = useMemo(() => {
        const counts: Record<string, number> = {};
        baseOrdersForUser.forEach(o => {
            const pb = o.phien_ban || '';
            const match = pb.match(/^(VF\s*[0-9]|VF\s*e34|LIMO|MINIO|EC\s*VAN)/i);
            const m = match ? match[0].toUpperCase() : pb.split(' ')[0] || 'Khác';
            counts[m] = (counts[m] || 0) + 1;
        });
        return Object.keys(counts).sort();
    }, [baseOrdersForUser]);

    // Danh sách TVBH cho bộ lọc:
    // - Admin: Tất cả TVBH
    // - TPKD: CHỈ CÁC TVBH trong phòng kinh doanh của mình
    // - TVBH thường: Rỗng (không hiển thị dropdown)
    const tvbhOptions = useMemo(() => {
        if (!isCurrentUserAdmin && !isManager) return [];
        return Array.from(new Set(baseOrdersForUser.map(o => o.tvbh_name).filter(Boolean))).sort();
    }, [baseOrdersForUser, isCurrentUserAdmin, isManager]);

    // Filtered data for table
    const filteredOrders = useMemo(() => {
        const q = searchValue.trim().toLowerCase();

        return baseOrdersForUser.filter(o => {
            // Model Filter
            if (activeTab !== 'all') {
                const pb = (o.phien_ban || '').toUpperCase();
                if (!pb.startsWith(activeTab)) return false;
            }

            // Progress Filter
            if (progressFilter !== 'all') {
                const td = (o.tien_do || 'Chờ xe').trim();
                if (td !== progressFilter) return false;
            }

            // TVBH Filter (Cho Admin và TPKD)
            if ((isCurrentUserAdmin || isManager) && tvbhFilter !== 'all') {
                if (o.tvbh_name !== tvbhFilter) return false;
            }

            // Search Keyword
            if (q) {
                const matchKh = (o.khach_hang || '').toLowerCase().includes(q);
                const matchSdt = (o.so_dien_thoai || '').includes(q);
                const matchSoHd = (o.so_hop_dong || o.so_don_hang || '').toLowerCase().includes(q);
                const matchVin = (o.vin || '').toLowerCase().includes(q);
                const matchModel = (o.phien_ban || '').toLowerCase().includes(q);
                const matchTvbh = (o.tvbh_name || '').toLowerCase().includes(q);

                if (!matchKh && !matchSdt && !matchSoHd && !matchVin && !matchModel && !matchTvbh) {
                    return false;
                }
            }

            return true;
        });
    }, [baseOrdersForUser, activeTab, progressFilter, tvbhFilter, isCurrentUserAdmin, isManager, searchValue]);

    // Summary counts
    const { totalFilteredCoc, countCanXe, countChoXe, countHoanCoc, countHuyCoc } = useMemo(() => {
        let total = 0;
        let canXe = 0;
        let choXe = 0;
        let hoanCoc = 0;
        let huyCoc = 0;

        filteredOrders.forEach(o => {
            total += Number(o.tien_coc || 0);
            const td = (o.tien_do || 'Chờ xe').trim();
            if (td === 'Cần xe') canXe++;
            else if (td === 'Hoàn cọc') hoanCoc++;
            else if (td === 'Hủy cọc') huyCoc++;
            else choXe++;
        });

        return {
            totalFilteredCoc: total,
            countCanXe: canXe,
            countChoXe: choXe,
            countHoanCoc: hoanCoc,
            countHuyCoc: huyCoc
        };
    }, [filteredOrders]);

    // Reset filters
    const handleResetFilters = () => {
        setActiveTab('all');
        setProgressFilter('all');
        setTvbhFilter('all');
        setSearchValue('');
    };

    // Export to Excel
    const handleExportExcel = () => {
        if (filteredOrders.length === 0) return;
        const exportData = filteredOrders.map((o, idx) => ({
            'STT': idx + 1,
            'Số HĐ': o.so_hop_dong || o.so_don_hang || '',
            'Ngày ký': o.ngay_hop_dong ? moment(o.ngay_hop_dong).format('DD/MM/YYYY') : '',
            'Tên khách hàng': o.khach_hang || '',
            'Số điện thoại': o.so_dien_thoai || '',
            'Dòng xe / Phiên bản': o.phien_ban || '',
            'Ngoại thất': o.ngoai_that || '',
            'Nội thất': o.noi_that || '',
            'Tiền cọc (VNĐ)': Number(o.tien_coc || 0),
            'Số VIN': o.vin || '',
            'Tư vấn bán hàng': o.tvbh_name || '',
            'Tiến độ': o.tien_do || 'Chờ xe',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "CocTon");
        XLSX.writeFile(wb, `Danh_Sach_Coc_Ton_${moment().format('YYYYMMDD_HHmm')}.xlsx`);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 w-full bg-[#ECE9D8] rounded border-2 border-[#0055EA] shadow-xl overflow-hidden font-sans select-none h-full">
            {/* 1. CYBERSOFT TITLE BAR */}
            <div className="h-7 bg-gradient-to-r from-[#0058EE] via-[#3593FF] to-[#288EFF] px-2 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-1.5 overflow-hidden pr-2">
                    <span className="w-3.5 h-3.5 bg-gradient-to-br from-amber-400 to-red-500 rounded-xs flex items-center justify-center text-[9px] font-black text-slate-900 shadow-xs border border-white/40 shrink-0">
                        <i className="fas fa-file-invoice-dollar text-[7px] text-white"></i>
                    </span>
                    <span className="font-bold text-[11px] text-white tracking-tight drop-shadow-xs truncate">
                        Quản lý hợp đồng cọc tồn - Ô tô VinFast Thuận An
                    </span>
                    <span className="text-[10px] text-blue-100 font-medium ml-1 hidden lg:inline shrink-0">
                        {isCurrentUserAdmin 
                            ? '— Toàn showroom' 
                            : isManager 
                                ? `— Phòng KD: ${currentUserName || currentUser}` 
                                : `— TVBH: ${currentUserName || currentUser}`}
                    </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    {onBackToDms && (
                        <button 
                            type="button" 
                            onClick={onBackToDms}
                            className="w-4 h-3.5 bg-[#0058EE] hover:bg-[#0048CC] text-white text-[10px] font-bold flex items-center justify-center border border-white/30 rounded-xs cursor-pointer"
                            title="Quay về danh sách đơn hàng"
                        >_</button>
                    )}
                    <button 
                        type="button" 
                        className="w-4 h-3.5 bg-[#0058EE] text-white text-[9px] font-bold flex items-center justify-center border border-white/30 rounded-xs"
                    >□</button>
                    {onBackToDms && (
                        <button 
                            type="button" 
                            onClick={onBackToDms}
                            className="w-4 h-3.5 bg-[#E81123] hover:bg-[#C80113] text-white text-[10px] font-bold flex items-center justify-center border border-white/30 rounded-xs cursor-pointer"
                            title="Đóng cửa sổ"
                        >✕</button>
                    )}
                </div>
            </div>

            {/* 2. CYBERSOFT TOOLBAR (Ribbon - Responsive without horizontal scroll) */}
            <div className="bg-[#F0F0F0] border-b border-[#CCCCCC] px-1.5 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-800 shrink-0">
                <div className="flex items-center gap-1 flex-wrap">
                    {/* Nút Làm Mới */}
                    <button 
                        type="button" 
                        onClick={() => fetchOrders(true)}
                        disabled={isRefreshing}
                        className="px-1.5 py-0.5 bg-white hover:bg-slate-100 border border-[#B5B5B5] rounded-xs shadow-2xs flex items-center gap-1 font-semibold text-slate-800 active:translate-y-px cursor-pointer disabled:opacity-50"
                        title="Tải lại dữ liệu cọc tồn từ Cyber ERP"
                    >
                        <i className={`fas fa-rotate text-blue-600 text-[10px] ${isRefreshing ? 'animate-spin' : ''}`}></i>
                        <span className="hidden sm:inline">Làm mới</span>
                    </button>

                    <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5 hidden sm:block"></div>

                    {/* Lọc Dòng Xe */}
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Xe:</span>
                        <select
                            value={activeTab}
                            onChange={e => setActiveTab(e.target.value)}
                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[110px]"
                        >
                            <option value="all">Tất cả ({baseOrdersForUser.length})</option>
                            {uniqueModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>

                    {/* Lọc Tiến Độ */}
                    <div className="flex items-center gap-1">
                        <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">Tiến độ:</span>
                        <select
                            value={progressFilter}
                            onChange={e => setProgressFilter(e.target.value)}
                            className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[110px]"
                        >
                            <option value="all">Tất cả</option>
                            <option value="Chờ xe">Chờ xe</option>
                            <option value="Cần xe">⚡ Cần xe</option>
                            <option value="Hoàn cọc">Hoàn cọc</option>
                            <option value="Hủy cọc">Hủy cọc</option>
                        </select>
                    </div>

                    {/* Lọc TVBH (Chỉ hiển thị cho Admin và TPKD) */}
                    {(isCurrentUserAdmin || isManager) && tvbhOptions.length > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px]">
                                {isManager ? 'TVBH:' : 'Tư vấn:'}
                            </span>
                            <select
                                value={tvbhFilter}
                                onChange={e => setTvbhFilter(e.target.value)}
                                className="h-5 px-1 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner max-w-[120px]"
                            >
                                <option value="all">Tất cả ({tvbhOptions.length})</option>
                                {tvbhOptions.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    )}


                </div>

                {/* Filter input Người liên hệ / Tìm kiếm */}
                <div className="flex items-center gap-1 ml-auto">
                    <span className="font-semibold text-slate-700 text-[10px] sm:text-[11px] hidden sm:inline">Tìm:</span>
                    <div className="relative">
                        <input 
                            type="text"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            placeholder="Tên, SĐT, số HĐ, VIN..."
                            className="w-32 sm:w-44 h-5 px-1.5 bg-white border border-[#7F9DB9] rounded-xs text-[10px] sm:text-[11px] text-slate-800 outline-none focus:border-blue-600 shadow-inner pr-4"
                        />
                        {searchValue && (
                            <button 
                                type="button" 
                                onClick={() => setSearchValue('')} 
                                className="absolute right-1 top-0.5 text-slate-400 hover:text-slate-600 text-[10px] cursor-pointer"
                            >✕</button>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. CYBERSOFT DATAGRID BODY: CLEAN WHITE BACKGROUND, FILLS 100% WIDTH, NO HORIZONTAL SCROLL! */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white w-full">
                {isLoading && backlogOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
                        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs font-bold text-slate-700">Đang nạp dữ liệu hợp đồng cọc tồn từ Cyber ERP...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center text-xl mb-2 shadow-xs">
                            <i className="fas fa-file-invoice-dollar"></i>
                        </div>
                        <p className="text-xs font-bold text-slate-700">Chưa có hợp đồng cọc tồn nào trong danh sách</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                            {searchValue || activeTab !== 'all' || progressFilter !== 'all' || tvbhFilter !== 'all'
                                ? 'Không có hợp đồng nào khớp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc.'
                                : isCurrentUserAdmin
                                    ? 'Hiện tại showroom không có hợp đồng cọc tồn nào chưa ghép xe.'
                                    : isManager
                                        ? 'Phòng kinh doanh của bạn hiện tại không có hợp đồng cọc tồn nào.'
                                        : 'Bạn hiện tại không có hợp đồng cọc tồn nào cần theo dõi.'}
                        </p>
                        {(searchValue || activeTab !== 'all' || progressFilter !== 'all' || tvbhFilter !== 'all') && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="mt-3 px-3 py-1 bg-white hover:bg-slate-100 border border-[#B5B5B5] text-slate-700 text-xs font-bold rounded-xs shadow-2xs cursor-pointer"
                            >
                                Xóa điều kiện lọc
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full table-fixed border-collapse text-[11px] font-sans" style={{ fontFamily: 'Tahoma, Arial, Segoe UI, sans-serif' }}>
                        {/* Table Header with Smart Proportional Fixed Widths (Zero Horizontal Scroll!) */}
                        <thead className="bg-[#EDF2F8] sticky top-0 z-20 shadow-xs border-b border-[#C4D3E3]">
                            <tr className="text-slate-700 text-center font-bold text-[11px] h-7">
                                <th className="w-7 sm:w-8 border-r border-[#C4D3E3] bg-[#E2EAF2] text-[10px] text-slate-600 font-bold p-0 text-center select-none">
                                    #
                                </th>
                                <th className="w-24 sm:w-28 px-1 border-r border-[#C4D3E3] text-center">Số HĐ / Ngày</th>
                                <th className="w-[22%] px-1.5 border-r border-[#C4D3E3] text-left">Khách Hàng / SĐT</th>
                                <th className="w-[20%] px-1.5 border-r border-[#C4D3E3] text-left">Dòng Xe & Màu</th>
                                <th className="w-20 sm:w-24 px-1 border-r border-[#C4D3E3] text-right">Tiền Cọc</th>
                                <th className="w-24 sm:w-28 px-1 border-r border-[#C4D3E3] text-center">Số VIN</th>
                                {(isCurrentUserAdmin || isManager) && (
                                    <th className="w-24 sm:w-28 px-1.5 border-r border-[#C4D3E3] text-left">Tư Vấn BH</th>
                                )}
                                <th className="w-32 sm:w-36 px-1 text-center">Tiến Độ Cọc</th>
                            </tr>
                        </thead>

                        {/* Table Body (Clean white rows with clear contrast & zero horizontal scroll) */}
                        <tbody className="divide-y divide-slate-200">
                            {filteredOrders.map((order, idx) => {
                                const isSelected = selectedRowIdx === idx;
                                const currentProgress: BacklogProgressType = (order.tien_do as BacklogProgressType) || 'Chờ xe';
                                const isRowUpdating = updatingId === order.id;

                                return (
                                    <tr
                                        key={order.id || order.so_don_hang}
                                        onClick={() => setSelectedRowIdx(idx)}
                                        className={`cursor-pointer border-b border-slate-200 text-[11px] leading-tight transition-colors ${
                                            isSelected 
                                                ? 'bg-blue-100/90 font-bold text-slate-900 outline outline-1 outline-blue-600 z-10' 
                                                : idx % 2 === 1 
                                                    ? 'bg-slate-50/60 hover:bg-sky-50/80 text-slate-800' 
                                                    : 'bg-white hover:bg-sky-50/80 text-slate-800'
                                        }`}
                                    >
                                        {/* 1. STT with ▶ active indicator */}
                                        <td className="border-r border-[#C4D3E3] bg-[#EDF2F8] text-[10px] text-center font-mono text-slate-600 p-0 select-none py-1">
                                            <span className="flex items-center justify-center gap-0.5">
                                                {isSelected ? <span className="text-[8px] text-slate-900 font-black">▶</span> : null}
                                                <span>{idx + 1}</span>
                                            </span>
                                        </td>

                                        {/* 2. Số HĐ & Ngày ký (Stacked neatly) */}
                                        <td className="px-1 border-r border-slate-200 text-center py-1">
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); copyWithFeedback(order.so_hop_dong || order.so_don_hang, e); }}
                                                title="Click copy số HĐ"
                                                className="font-mono font-bold text-blue-900 hover:underline hover:text-blue-700 cursor-pointer truncate text-[11px]"
                                            >
                                                {order.so_hop_dong || order.so_don_hang}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                                                {moment(order.ngay_hop_dong || order.ngay_giao_dich).format('DD/MM/YYYY')}
                                            </div>
                                        </td>

                                        {/* 3. Tên khách hàng & SĐT (Stacked neatly) */}
                                        <td className="px-1.5 border-r border-slate-200 text-left py-1">
                                            <div
                                                onClick={(e) => { e.stopPropagation(); copyWithFeedback(order.khach_hang, e); }}
                                                title="Click copy tên khách hàng"
                                                className="font-bold text-slate-900 uppercase truncate hover:text-blue-700 cursor-pointer text-[11px]"
                                            >
                                                {order.khach_hang || '—'}
                                            </div>
                                            <div className="text-[10px] font-mono mt-0.5">
                                                {order.so_dien_thoai ? (
                                                    <a
                                                        href={`tel:${order.so_dien_thoai}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-sky-800 font-bold hover:underline inline-flex items-center gap-1"
                                                        title="Bấm gọi điện"
                                                    >
                                                        <i className="fas fa-phone-alt text-[8px] text-sky-600"></i>
                                                        {order.so_dien_thoai}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Chưa có SĐT</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 4. Dòng xe & Màu sắc (Stacked neatly) */}
                                        <td className="px-1.5 border-r border-slate-200 text-left py-1">
                                            <div className="font-semibold text-slate-900 truncate text-[11px]" title={order.phien_ban}>
                                                {order.phien_ban || '—'}
                                            </div>
                                            <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                                {order.ngoai_that ? (
                                                    <span className="uppercase font-medium text-slate-700">
                                                        {order.ngoai_that}
                                                        {order.noi_that && order.noi_that !== 'Tiêu chuẩn' && ` • ${order.noi_that}`}
                                                    </span>
                                                ) : (
                                                    <span>{order.noi_that || 'Tiêu chuẩn'}</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 5. Tiền cọc */}
                                        <td className="px-1 border-r border-slate-200 text-right py-1">
                                            <div className="font-mono font-bold text-emerald-800 text-[11px] truncate">
                                                {formatVND(order.tien_coc)}
                                            </div>
                                        </td>

                                        {/* 6. Số VIN */}
                                        <td className="px-1 border-r border-slate-200 text-center font-mono py-1">
                                            {order.vin && order.vin.length > 5 ? (
                                                <span 
                                                    onClick={(e) => { e.stopPropagation(); copyWithFeedback(order.vin, e); }}
                                                    title="Click copy số VIN"
                                                    className="font-bold text-emerald-800 hover:underline cursor-pointer truncate block text-[10px]"
                                                >
                                                    {order.vin}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 italic text-[10px] block truncate">
                                                    Chưa ghép xe
                                                </span>
                                            )}
                                        </td>

                                        {/* 7. Tên TVBH (Chỉ Admin & TPKD) */}
                                        {(isCurrentUserAdmin || isManager) && (
                                            <td className="px-1.5 border-r border-slate-200 text-left py-1">
                                                <div className="font-semibold uppercase text-slate-800 truncate text-[11px]" title={order.tvbh_name}>
                                                    {order.tvbh_name || '—'}
                                                </div>
                                            </td>
                                        )}

                                        {/* 8. Tiến độ cọc: 4 nút micro gọn gàng không tràn màn hình */}
                                        <td className="px-0.5 text-center py-1">
                                            <div className="inline-flex items-center justify-center gap-0.5 select-none w-full" onClick={(e) => e.stopPropagation()}>
                                                {(['Chờ xe', 'Cần xe', 'Hoàn cọc', 'Hủy cọc'] as BacklogProgressType[]).map(status => {
                                                    const isCurrent = currentProgress === status;
                                                    const cfg = PROGRESS_STYLES[status];

                                                    return (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            disabled={isRowUpdating}
                                                            onClick={() => handleProgressChange(order.id, status, currentProgress)}
                                                            className={`px-1 py-0.5 rounded-xs text-[9.5px] border transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                                                                isCurrent
                                                                    ? `${cfg.activeBtnCls} border-transparent ring-1 ring-black/20`
                                                                    : `${cfg.idleBtnCls} hover:bg-slate-100`
                                                            } ${isRowUpdating ? 'opacity-50 cursor-wait' : ''}`}
                                                            title={`Đổi tiến độ sang "${cfg.label}"`}
                                                        >
                                                            <span>{cfg.shortLabel}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* 4. CYBERSOFT STATUS & EXECUTION BAR (Bottom bar matching CrmLeadImporterView) */}
            <div className="bg-[#ECE9D8] border-t border-[#CCCCCC] px-2 py-0.5 flex flex-wrap items-center justify-between gap-1 text-[11px] select-none shrink-0 font-sans">
                <div className="flex items-center gap-1.5 sm:gap-2.5 text-slate-700 flex-wrap">
                    <span className="font-bold">
                        Tổng: <strong>{filteredOrders.length}</strong> HĐ
                    </span>
                    <span>•</span>
                    <span className="text-blue-700 font-bold hidden sm:inline">
                        Dòng: <strong>{filteredOrders.length > 0 ? selectedRowIdx + 1 : 0}</strong>
                    </span>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-emerald-800 font-bold">
                        Cọc: <strong className="font-mono text-emerald-900">{formatVND(totalFilteredCoc)}</strong>
                    </span>
                    <span>•</span>
                    <span className="px-1 py-0.1 rounded-xs text-[9.5px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                        Chờ: {countChoXe}
                    </span>
                    <span className="px-1 py-0.1 rounded-xs text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ⚡ Cần: {countCanXe}
                    </span>
                    {(countHoanCoc > 0 || countHuyCoc > 0) && (
                        <span className="px-1 py-0.1 rounded-xs text-[9.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            Hoàn/Hủy: {countHoanCoc + countHuyCoc}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 ml-auto">
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-400 rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Tải file Excel"
                    >
                        <i className="fas fa-file-excel text-emerald-600"></i>
                        <span>Xuất Excel</span>
                    </button>

                    {onBackToDms && (
                        <button
                            type="button"
                            onClick={onBackToDms}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-[#B5B5B5] rounded-xs text-[10px] sm:text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Quay về danh sách đơn hàng DMS"
                        >
                            <i className="fas fa-arrow-left text-[9px] text-slate-500"></i>
                            <span>Về Đơn Hàng</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TVBHBacklogOrdersView;
