import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../services/supabaseClient';
import { getBacklogOrders, updateBacklogTienDo } from '../../services/api/adminService';
import { useCopyFeedback } from '../../hooks/useCopyFeedback';
import moment from 'moment';
import * as XLSX from 'xlsx';
import TabbedFilter from '../ui/TabbedFilter';
import MultiSelectDropdown from '../ui/MultiSelectDropdown';

export type BacklogProgressType = 'Chờ xe' | 'Cần xe' | 'Hoàn cọc' | 'Hủy cọc';

interface TVBHBacklogOrdersViewProps {
    currentUser: string;
    currentUserName?: string;
    userRole?: string;
    isCurrentUserAdmin?: boolean;
    showToast?: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info') => void;
    onBackToDms?: () => void;
    orders?: any[];
    onSelectOrder?: (order: any) => void;
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
        activeBtnCls: 'bg-sky-500 text-white font-bold shadow-2xs',
        idleBtnCls: 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
    },
    'Cần xe': {
        shortLabel: '⚡ Cần',
        label: 'Cần xe',
        icon: 'fa-bolt',
        activeBtnCls: 'bg-emerald-600 text-white font-bold shadow-2xs',
        idleBtnCls: 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
    },
    'Hoàn cọc': {
        shortLabel: 'Hoàn',
        label: 'Hoàn cọc',
        icon: 'fa-rotate-left',
        activeBtnCls: 'bg-amber-600 text-white font-bold shadow-2xs',
        idleBtnCls: 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
    },
    'Hủy cọc': {
        shortLabel: 'Hủy',
        label: 'Hủy cọc',
        icon: 'fa-ban',
        activeBtnCls: 'bg-rose-600 text-white font-bold shadow-2xs',
        idleBtnCls: 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'
    }
};

export const TVBHBacklogOrdersView: React.FC<TVBHBacklogOrdersViewProps> = ({
    currentUser,
    currentUserName,
    userRole,
    isCurrentUserAdmin = false,
    showToast,
    onBackToDms,
    orders = [],
    onSelectOrder
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

    // Filters (Matching Đơn Hàng tab)
    const [activeTab, setActiveTab] = useState<string>('all');
    const [progressFilter, setProgressFilter] = useState<string[]>([]);
    const [pairingFilter, setPairingFilter] = useState<string[]>([]);
    const [tvbhFilter, setTvbhFilter] = useState<string[]>([]);
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

    // Tự động đối soát và liên kết với các đơn hàng đã ghép xe trên DMS (donhang)
    useEffect(() => {
        let isMounted = true;
        const autoLinkPairedOrders = async () => {
            try {
                const { data: pairedRows } = await supabase
                    .from('donhang')
                    .select('so_don_hang, ma_hd_cyber, vin, ket_qua, ten_khach_hang')
                    .not('vin', 'is', null);

                if (!isMounted) return;

                const lookup: Record<string, { vin: string; so_don_hang?: string }> = {};

                if (pairedRows) {
                    pairedRows.forEach(r => {
                        const shd = (r.ma_hd_cyber || '').trim();
                        const sdh = (r.so_don_hang || '').trim();
                        const vin = (r.vin || '').trim();
                        if (shd && vin) lookup[shd] = { vin, so_don_hang: sdh };
                        if (sdh && vin) lookup[sdh] = { vin, so_don_hang: sdh };
                    });
                }

                if (orders && orders.length > 0) {
                    orders.forEach(o => {
                        const shd = (o['Mã HĐ Cyber'] || o.ma_hd_cyber || '').trim();
                        const sdh = (o['Số đơn hàng'] || o.so_don_hang || '').trim();
                        const vin = (o.VIN || o['Số khung'] || o.vin || '').trim();
                        if (shd && vin) lookup[shd] = { vin, so_don_hang: sdh };
                        if (sdh && vin) lookup[sdh] = { vin, so_don_hang: sdh };
                    });
                }

                setBacklogOrders(prev => {
                    let changed = false;
                    const next = prev.map(item => {
                        const shd = (item.so_hop_dong || '').trim();
                        const sdh = (item.so_don_hang || '').trim();
                        const match = lookup[shd] || (sdh && lookup[sdh]);

                        if (match && match.vin) {
                            const needsVinUpdate = !item.vin || item.vin !== match.vin;
                            const needsSdhUpdate = match.so_don_hang && item.so_don_hang !== match.so_don_hang;

                            if (needsVinUpdate || needsSdhUpdate) {
                                changed = true;
                                if (needsVinUpdate) {
                                    supabase.from('donhang_ton')
                                        .update({ 
                                            vin: match.vin, 
                                            so_don_hang: match.so_don_hang || item.so_don_hang 
                                        })
                                        .eq('id', item.id)
                                        .then();
                                }
                                return {
                                    ...item,
                                    vin: match.vin,
                                    so_don_hang: match.so_don_hang || item.so_don_hang
                                };
                            }
                        }
                        return item;
                    });

                    return changed ? next : prev;
                });
            } catch (err) {
                console.error('Lỗi tự động liên kết đơn hàng đã ghép:', err);
            }
        };

        if (backlogOrders.length > 0) {
            autoLinkPairedOrders();
        }

        return () => {
            isMounted = false;
        };
    }, [backlogOrders.length, orders]);

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

    // Unique Car Models with counts for Cockpit Segmented Rail
    const modelTabs = useMemo(() => {
        const counts: Record<string, number> = {};
        baseOrdersForUser.forEach(o => {
            const pb = o.phien_ban || '';
            const match = pb.match(/^(VF\s*[0-9]|VF\s*e34|LIMO|MINIO|EC\s*VAN)/i);
            const m = match ? match[0].toUpperCase() : pb.split(' ')[0] || 'Khác';
            counts[m] = (counts[m] || 0) + 1;
        });
        return Object.keys(counts).sort().map(m => ({
            id: m,
            label: m,
            count: counts[m]
        }));
    }, [baseOrdersForUser]);

    const uniqueModels = useMemo(() => modelTabs.map(t => t.id), [modelTabs]);

    // Danh sách TVBH cho bộ lọc:
    // - Admin: Tất cả TVBH
    // - TPKD: CHỈ CÁC TVBH trong phòng kinh doanh của mình
    // - TVBH thường: Rỗng (không hiển thị dropdown)
    const tvbhOptions = useMemo(() => {
        if (!isCurrentUserAdmin && !isManager) return [];
        return Array.from(new Set(baseOrdersForUser.map(o => o.tvbh_name).filter(Boolean))).sort();
    }, [baseOrdersForUser, isCurrentUserAdmin, isManager]);

    const tabs = useMemo(() => [
        { id: 'all', label: 'Tất cả', count: baseOrdersForUser.length },
        ...modelTabs
    ], [baseOrdersForUser.length, modelTabs]);

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
            if (progressFilter.length > 0) {
                const td = (o.tien_do || 'Chờ xe').trim();
                if (!progressFilter.includes(td)) return false;
            }

            // Pairing Filter
            if (pairingFilter.length === 1) {
                if (pairingFilter.includes('Đã ghép') && (!o.vin || o.vin.length < 5)) return false;
                if (pairingFilter.includes('Chưa ghép') && o.vin && o.vin.length >= 5) return false;
            }

            // TVBH Filter (Cho Admin và TPKD)
            if ((isCurrentUserAdmin || isManager) && tvbhFilter.length > 0) {
                if (!tvbhFilter.includes(o.tvbh_name)) return false;
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
    }, [baseOrdersForUser, activeTab, progressFilter, pairingFilter, tvbhFilter, isCurrentUserAdmin, isManager, searchValue]);

    const canReset = activeTab !== 'all' || progressFilter.length > 0 || pairingFilter.length > 0 || tvbhFilter.length > 0 || !!searchValue;

    // Reset filters
    const handleResetFilters = () => {
        setActiveTab('all');
        setProgressFilter([]);
        setPairingFilter([]);
        setTvbhFilter([]);
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

    const extraActions = (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={() => fetchOrders(true)}
                disabled={isRefreshing}
                className="h-7 lg:h-[26px] px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] lg:text-[10px] font-semibold flex items-center gap-1 shadow-2xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                title="Tải lại dữ liệu cọc tồn từ Cyber ERP"
            >
                <i className={`fas fa-rotate text-sky-600 text-[10px] ${isRefreshing ? 'animate-spin' : ''}`}></i>
                <span className="hidden sm:inline">Làm mới</span>
            </button>

            <button
                type="button"
                onClick={handleExportExcel}
                className="h-7 lg:h-[26px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] lg:text-[10px] font-semibold rounded-xl shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shrink-0"
                title="Tải file Excel cọc tồn"
            >
                <i className="fas fa-file-excel text-[10px]"></i>
                <span>Xuất Excel</span>
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full font-sans select-none">
            {/* 1. COMMAND FILTER RAIL (100% Đồng bộ với Tab Đơn Hàng) */}
            <div className="flex-shrink-0 relative z-20">
                <TabbedFilter
                    tabs={tabs}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    searchValue={searchValue}
                    onSearchChange={setSearchValue}
                    searchPlaceholder="Tên, SĐT, số HĐ, VIN..."
                    onReset={handleResetFilters}
                    canReset={canReset}
                    extraActions={extraActions}
                >
                    {/* Lọc Tiến độ */}
                    <div className="min-w-[76px] xl:min-w-[85px] flex-shrink-0">
                        <MultiSelectDropdown
                            id="tien_do"
                            label="Tiến độ"
                            options={['Chờ xe', 'Cần xe', 'Hoàn cọc', 'Hủy cọc']}
                            selectedOptions={progressFilter}
                            onChange={setProgressFilter}
                            icon="fa-tasks"
                            displayMode="selection"
                            size="compact"
                            variant="modern"
                            align="right"
                        />
                    </div>

                    {/* Lọc Ghép xe */}
                    <div className="min-w-[76px] xl:min-w-[85px] flex-shrink-0">
                        <MultiSelectDropdown
                            id="ghep_xe"
                            label="Ghép xe"
                            options={['Đã ghép', 'Chưa ghép']}
                            selectedOptions={pairingFilter}
                            onChange={setPairingFilter}
                            icon="fa-car"
                            displayMode="selection"
                            size="compact"
                            variant="modern"
                            align="right"
                        />
                    </div>

                    {/* Lọc TVBH */}
                    {(isCurrentUserAdmin || isManager) && tvbhOptions.length > 0 && (
                        <div className="min-w-[76px] xl:min-w-[85px] flex-shrink-0">
                            <MultiSelectDropdown
                                id="tvbh"
                                label={isManager ? "TVBH" : "Tư vấn"}
                                options={tvbhOptions}
                                selectedOptions={tvbhFilter}
                                onChange={setTvbhFilter}
                                icon="fa-user-tie"
                                displayMode="selection"
                                size="compact"
                                variant="modern"
                                searchable={true}
                                align="right"
                            />
                        </div>
                    )}
                </TabbedFilter>
            </div>

            {/* 2. TABLE CARD CONTAINER */}
            <div className="flex-1 flex flex-col min-h-0 mt-1">
                <div className="bg-white relative rounded-2xl shadow-sm border border-slate-200/70 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white w-full">
                {isLoading && backlogOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
                        <div className="w-9 h-9 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-xs font-bold text-slate-700">Đang nạp dữ liệu hợp đồng cọc tồn từ Cyber ERP...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200/80 text-slate-400 flex items-center justify-center text-lg mb-2 shadow-2xs">
                            <i className="fas fa-file-invoice-dollar"></i>
                        </div>
                        <p className="text-xs font-bold text-slate-800">Chưa có hợp đồng cọc tồn nào trong danh sách</p>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
                            {canReset
                                ? 'Không có hợp đồng nào khớp với điều kiện tìm kiếm. Hãy thử xóa bộ lọc.'
                                : isCurrentUserAdmin
                                    ? 'Hiện tại showroom không có hợp đồng cọc tồn nào chưa ghép xe.'
                                    : isManager
                                        ? 'Phòng kinh doanh của bạn hiện tại không có hợp đồng cọc tồn nào.'
                                        : 'Bạn hiện tại không có hợp đồng cọc tồn nào cần theo dõi.'}
                        </p>
                        {canReset && (
                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="mt-3 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs cursor-pointer"
                            >
                                Xóa điều kiện lọc
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="w-full table-fixed border-collapse text-xs">
                        <thead className="bg-slate-50/90 sticky top-0 z-20 shadow-2xs border-b border-slate-200/80 backdrop-blur-xs">
                            <tr className="text-slate-500 text-center font-bold text-[11px] h-8 uppercase tracking-wider">
                                <th className="w-9 border-r border-slate-200/60 p-0 text-center select-none">#</th>
                                <th className="w-24 sm:w-28 px-1 border-r border-slate-200/60 text-center">Số HĐ / Ngày</th>
                                <th className="w-[22%] px-2 border-r border-slate-200/60 text-left">Khách Hàng / SĐT</th>
                                <th className="w-[20%] px-2 border-r border-slate-200/60 text-left">Dòng Xe & Màu</th>
                                <th className="w-22 sm:w-26 px-1.5 border-r border-slate-200/60 text-right">Tiền Cọc</th>
                                <th className="w-26 sm:w-30 px-1 border-r border-slate-200/60 text-center">Số VIN</th>
                                {(isCurrentUserAdmin || isManager) && (
                                    <th className="w-24 sm:w-28 px-2 border-r border-slate-200/60 text-left">Tư Vấn BH</th>
                                )}
                                <th className="w-32 sm:w-36 px-1 text-center">Tiến Độ Cọc</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-xs">
                            {filteredOrders.map((order, idx) => {
                                const isSelected = selectedRowIdx === idx;
                                const currentProgress: BacklogProgressType = (order.tien_do as BacklogProgressType) || 'Chờ xe';
                                const isRowUpdating = updatingId === order.id;

                                return (
                                    <tr
                                        key={order.id || order.so_don_hang}
                                        onClick={() => setSelectedRowIdx(idx)}
                                        className={`cursor-pointer border-b border-slate-100 text-xs transition-colors ${
                                            isSelected 
                                                ? 'bg-sky-50/80 ring-1 ring-inset ring-sky-500/25' 
                                                : 'hover:bg-slate-50/70 text-slate-800'
                                        }`}
                                    >
                                        {/* 1. STT */}
                                        <td className="border-r border-slate-200/60 text-center font-mono text-slate-400 p-0 select-none py-2 text-xs">
                                            {idx + 1}
                                        </td>

                                        {/* 2. Số HĐ & Ngày ký */}
                                        <td className="px-1 border-r border-slate-200/60 text-center py-2">
                                            <div 
                                                onClick={(e) => { e.stopPropagation(); copyWithFeedback(order.so_hop_dong || order.so_don_hang, e); }}
                                                title="Click copy số HĐ"
                                                className="font-mono font-bold text-slate-800 hover:text-sky-600 cursor-pointer truncate text-[11px]"
                                            >
                                                {order.so_hop_dong || order.so_don_hang}
                                            </div>
                                            <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                                                {moment(order.ngay_hop_dong || order.ngay_giao_dich).format('DD/MM/YYYY')}
                                            </div>
                                        </td>

                                        {/* 3. Tên khách hàng & SĐT */}
                                        <td className="px-2 border-r border-slate-200/60 text-left py-2">
                                            <div
                                                onClick={(e) => { e.stopPropagation(); copyWithFeedback(order.khach_hang, e); }}
                                                title="Click copy tên khách hàng"
                                                className="font-bold text-slate-900 uppercase truncate hover:text-sky-600 cursor-pointer text-[12px]"
                                            >
                                                {order.khach_hang || '—'}
                                            </div>
                                            <div className="text-[11px] font-mono mt-0.5">
                                                {order.so_dien_thoai ? (
                                                    <a
                                                        href={`tel:${order.so_dien_thoai}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-sky-700 font-semibold hover:underline inline-flex items-center gap-1"
                                                        title="Bấm gọi điện"
                                                    >
                                                        <i className="fas fa-phone-alt text-[8px] text-sky-500"></i>
                                                        {order.so_dien_thoai}
                                                    </a>
                                                ) : (
                                                    <span className="text-slate-400 italic">Chưa có SĐT</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 4. Dòng xe & Màu sắc */}
                                        <td className="px-2 border-r border-slate-200/60 text-left py-2">
                                            <div className="font-semibold text-slate-800 truncate text-[12px]" title={order.phien_ban}>
                                                {order.phien_ban || '—'}
                                            </div>
                                            <div className="text-[11px] text-slate-500 truncate mt-0.5 font-medium">
                                                {order.ngoai_that ? (
                                                    <span className="uppercase">
                                                        {order.ngoai_that}
                                                        {order.noi_that && order.noi_that !== 'Tiêu chuẩn' && ` • ${order.noi_that}`}
                                                    </span>
                                                ) : (
                                                    <span>{order.noi_that || 'Tiêu chuẩn'}</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* 5. Tiền cọc */}
                                        <td className="px-1.5 border-r border-slate-200/60 text-right py-2">
                                            <div className="font-mono font-bold text-emerald-700 text-xs truncate">
                                                {formatVND(order.tien_coc)}
                                            </div>
                                        </td>

                                        {/* 6. Số VIN & Liên Kết Đơn Hàng Đã Ghép */}
                                        <td className="px-1 border-r border-slate-200/60 text-center font-mono py-2">
                                            {order.vin && order.vin.length > 5 ? (
                                                <div className="flex flex-col items-center justify-center gap-0.5">
                                                    <span 
                                                        onClick={(e) => { e.stopPropagation(); copyWithFeedback(order.vin, e); }}
                                                        title="Số VIN đã ghép xe - Bấm để copy"
                                                        className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer truncate max-w-full text-[10.5px] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/80 shadow-2xs"
                                                    >
                                                        <i className="fas fa-car text-[8px] text-emerald-600 shrink-0"></i>
                                                        <span className="truncate">{order.vin}</span>
                                                        <i className="far fa-copy text-[7.5px] text-emerald-500 shrink-0"></i>
                                                    </span>

                                                    {/* Link đơn hàng DMS & vị trí kho xe */}
                                                    {order.so_don_hang && order.so_don_hang !== order.so_hop_dong ? (
                                                        <div className="flex items-center justify-center gap-1 text-[9.5px] text-slate-500 font-mono">
                                                            <span 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (onSelectOrder && orders) {
                                                                        const matched = orders.find(ord => 
                                                                            ord['Số đơn hàng'] === order.so_don_hang || 
                                                                            ord['Mã HĐ Cyber'] === order.so_hop_dong || 
                                                                            ord.id === order.so_don_hang
                                                                        );
                                                                        if (matched) onSelectOrder(matched);
                                                                        else copyWithFeedback(order.so_don_hang, e);
                                                                    } else {
                                                                        copyWithFeedback(order.so_don_hang, e);
                                                                    }
                                                                }}
                                                                title={`Mã đơn hàng DMS: ${order.so_don_hang}${onSelectOrder ? ' (Bấm để xem chi tiết đơn)' : ' (Bấm để copy)'}`}
                                                                className="text-sky-700 hover:underline cursor-pointer truncate max-w-[95px] inline-flex items-center gap-0.5 font-semibold"
                                                            >
                                                                <i className="fas fa-link text-[7.5px]"></i>
                                                                <span>{order.so_don_hang}</span>
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.dispatchEvent(new CustomEvent('navigate-stock', { detail: { vin: order.vin } }));
                                                                }}
                                                                title="Xem vị trí xe trong kho"
                                                                className="text-slate-400 hover:text-sky-600 cursor-pointer p-0.5"
                                                            >
                                                                <i className="fas fa-location-dot text-[8.5px]"></i>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1 text-[9px] text-emerald-700 font-medium">
                                                            <span>Đã ghép xe</span>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.dispatchEvent(new CustomEvent('navigate-stock', { detail: { vin: order.vin } }));
                                                                }}
                                                                title="Xem vị trí xe trong kho"
                                                                className="text-slate-400 hover:text-sky-600 cursor-pointer p-0.5"
                                                            >
                                                                <i className="fas fa-location-dot text-[8.5px]"></i>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-[11px] block truncate">
                                                    Chưa ghép xe
                                                </span>
                                            )}
                                        </td>

                                        {/* 7. Tên TVBH (Chỉ Admin & TPKD) */}
                                        {(isCurrentUserAdmin || isManager) && (
                                            <td className="px-2 border-r border-slate-200/60 text-left py-2">
                                                <div className="font-semibold uppercase text-slate-700 truncate text-[11px]" title={order.tvbh_name}>
                                                    {order.tvbh_name || '—'}
                                                </div>
                                            </td>
                                        )}

                                        {/* 8. Tiến độ cọc: 4 nút micro gọn gàng trong capsule */}
                                        <td className="px-1 text-center py-2">
                                            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200/60 gap-0.5 select-none w-full justify-center" onClick={(e) => e.stopPropagation()}>
                                                {(['Chờ xe', 'Cần xe', 'Hoàn cọc', 'Hủy cọc'] as BacklogProgressType[]).map(status => {
                                                    const isCurrent = currentProgress === status;
                                                    const cfg = PROGRESS_STYLES[status];

                                                    return (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            disabled={isRowUpdating}
                                                            onClick={() => handleProgressChange(order.id, status, currentProgress)}
                                                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all flex items-center justify-center cursor-pointer shrink-0 ${
                                                                isCurrent
                                                                    ? `${cfg.activeBtnCls} shadow-xs`
                                                                    : `${cfg.idleBtnCls}`
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
                </div>
            </div>
        </div>
    );
};

export default TVBHBacklogOrdersView;
