import React, { useMemo, useState } from 'react';
import moment from 'moment';
import AnchoredCyberSheet from '../ui/AnchoredCyberSheet';
import '../ui/anchored-cyber-sheet.css';

interface Variant {
    variant: string;
    count: number;
    orders?: any[];
}
interface GroupedStat {
    model: string;
    total: number;
    variants: Variant[];
}

interface PendingStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stats: GroupedStat[];
    anchor?: HTMLElement | null;
    currentUser?: string;
    currentUserName?: string;
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

const formatDepositDate = (ord: any) => {
    const raw = ord['Ngày cọc'] || ord.ngay_coc || ord['Thời gian cọc'] || ord['Thời gian nhập'];
    if (!raw) return '—';
    const m = moment(raw, [moment.ISO_8601, 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    if (!m.isValid()) return String(raw);
    const hasTime = m.hours() !== 0 || m.minutes() !== 0;
    const isCoc = !!(ord['Ngày cọc'] || ord.ngay_coc || ord['Thời gian cọc']);
    return `${isCoc ? 'Cọc: ' : 'Tạo: '}${m.format(hasTime ? 'DD/MM HH:mm' : 'DD/MM/YYYY')}`;
};

const PendingStatsModal: React.FC<PendingStatsModalProps> = ({
    isOpen,
    onClose,
    stats,
    anchor,
    currentUser,
    currentUserName
}) => {
    const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const flattenedStats = useMemo(() => {
        return stats
            .flatMap(group =>
                group.variants.map(variant => {
                    const [phienBanNgoaiThat, noiThat] = variant.variant.split(' / ');
                    const parts = phienBanNgoaiThat.split(' - ');
                    const phienBan = parts.length > 1 ? parts.slice(0, -1).join(' - ') : '';
                    const ngoaiThat = parts.length > 1 ? parts[parts.length - 1] : phienBanNgoaiThat;

                    const orders = variant.orders || [];
                    const myOrdersWithIndex = orders
                        .map((ord, idx) => ({ order: ord, position: idx + 1 }))
                        .filter(item => {
                            const tvbh = item.order['Tên tư vấn bán hàng'];
                            return isNameMatch(tvbh, currentUser) || isNameMatch(tvbh, currentUserName);
                        });

                    const myPositions = myOrdersWithIndex.map(item => item.position);

                    return {
                        id: `${group.model}-${variant.variant}`,
                        model: group.model,
                        phienBan,
                        ngoaiThat,
                        noiThat,
                        title: phienBan ? `${group.model} - ${phienBan}` : `${group.model}`,
                        subtitle: noiThat ? `${ngoaiThat} / ${noiThat}` : ngoaiThat,
                        count: variant.count,
                        orders,
                        myPositions,
                        hasMyOrder: myPositions.length > 0,
                        bestMyPosition: myPositions.length > 0 ? Math.min(...myPositions) : null
                    };
                })
            )
            .sort((a, b) => b.count - a.count);
    }, [stats, currentUser, currentUserName]);

    const totalVehicles = useMemo(() => {
        return flattenedStats.reduce((sum, item) => sum + item.count, 0);
    }, [flattenedStats]);

    const myTotalOrders = useMemo(() => {
        return flattenedStats.reduce((sum, item) => sum + item.myPositions.length, 0);
    }, [flattenedStats]);

    // Filtered by tab and search query
    const displayStats = useMemo(() => {
        let result = flattenedStats;
        if (activeTab === 'mine') {
            result = result.filter(item => item.hasMyOrder);
            // Sort by best position ascending in 'mine' view
            result.sort((a, b) => (a.bestMyPosition || 999) - (b.bestMyPosition || 999));
        }
        if (searchQuery.trim()) {
            const q = normalizeStr(searchQuery);
            result = result.filter(item => {
                const titleMatch = normalizeStr(item.title).includes(q);
                const subMatch = normalizeStr(item.subtitle).includes(q);
                const orderMatch = item.orders.some(o =>
                    normalizeStr(o['Số đơn hàng']).includes(q) ||
                    normalizeStr(o['Tên khách hàng']).includes(q) ||
                    normalizeStr(o['Tên tư vấn bán hàng']).includes(q)
                );
                return titleMatch || subMatch || orderMatch;
            });
        }
        return result;
    }, [flattenedStats, activeTab, searchQuery]);

    if (!isOpen) return null;

    return (
        <AnchoredCyberSheet
            anchor={anchor}
            onClose={onClose}
            label="Thống Kê Xe Chờ Ghép"
            className="is-stats-sheet"
        >
            <div className="am-anchored-panel">
                {/* Header */}
                <div className="am-header">
                    <div className="flex items-center gap-2">
                        <i className="fa-solid fa-chart-pie text-blue-600 text-[13px]" />
                        <div>
                            <h3 className="am-title">Thống Kê Xe Chờ Ghép</h3>
                            <p className="am-subtitle">Ưu tiên ghép xe theo thời gian đặt cọc (FIFO)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {totalVehicles > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold font-mono bg-blue-50 text-blue-700 border border-blue-200/60">
                                {totalVehicles} xe
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="am-close-btn"
                            title="Đóng (Esc)"
                            aria-label="Đóng"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                </div>

                {/* Sub-header Filter & Tabs */}
                <div className="p-2.5 pb-2 border-b border-slate-100 flex flex-col gap-2 bg-[#fcfdff]">
                    {/* Tab Selection */}
                    <div className="flex items-center gap-1.5 p-0.5 bg-slate-100/80 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'all'
                                    ? 'bg-white text-slate-800 shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <span>Tất cả cấu hình</span>
                            <span className="font-mono text-[10px] text-slate-400">({flattenedStats.length})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('mine')}
                            className={`flex-1 py-1 px-2.5 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'mine'
                                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                                    : 'text-slate-600 hover:text-amber-700'
                            }`}
                        >
                            <i className="fa-solid fa-star text-[10px] text-amber-400"></i>
                            <span>Xe chờ của tôi</span>
                            <span className={`font-mono text-[10.5px] px-1 rounded ${activeTab === 'mine' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'}`}>
                                {myTotalOrders}
                            </span>
                        </button>
                    </div>

                    {/* Quick Search */}
                    <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10.5px] text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm nhanh cấu hình, màu, mã đơn, khách..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-7 pl-7 pr-7 text-[11px] border border-slate-200/80 rounded-md bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <i className="fa-solid fa-xmark text-[11px]" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Content */}
                <div className="p-0 overflow-y-auto max-h-[380px] border-b border-slate-100">
                    {displayStats.length > 0 ? (
                        <div className="divide-y divide-slate-100">
                            {displayStats.map((item, index) => {
                                const isExpanded = expandedId === item.id;
                                return (
                                    <div key={item.id} className={`${item.hasMyOrder ? 'bg-amber-50/20' : ''}`}>
                                        <div
                                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                            className="p-2.5 px-3 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                                        >
                                            {/* Rank */}
                                            <div className="w-6 text-center font-mono text-[11.5px] font-semibold text-slate-400">
                                                {index + 1}
                                            </div>

                                            {/* Vehicle Title & Subtitle */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-semibold text-slate-800 text-[12px] leading-tight">
                                                        {item.title}
                                                    </span>
                                                    {item.hasMyOrder && (
                                                        <span
                                                            className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                                                            title={`Bạn đang có đơn chờ vị trí #${item.myPositions.join(', #')} trong tổng số ${item.count} xe`}
                                                        >
                                                            <i className="fa-solid fa-star text-[9px] text-amber-600" />
                                                            <span>Vị trí của bạn: #{item.myPositions.join(', #')} / {item.count}</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10.5px] text-slate-400 mt-0.5 truncate">
                                                    {item.subtitle}
                                                </div>
                                            </div>

                                            {/* Count & Toggle */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className={`inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded font-mono text-xs font-bold ${
                                                    item.hasMyOrder ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {item.count}
                                                </span>
                                                <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-slate-400 transition-transform`} />
                                            </div>
                                        </div>

                                        {/* Expanded Queue details */}
                                        {isExpanded && (
                                            <div className="bg-slate-50/90 border-t border-b border-slate-200/60 p-2.5 flex flex-col gap-1.5">
                                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
                                                    <span>Hàng đợi ghép xe (Ưu tiên cọc sớm nhất):</span>
                                                    <span>{item.orders.length} đơn hàng</span>
                                                </div>
                                                <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto">
                                                    {item.orders.map((ord, idx) => {
                                                        const isMine = isNameMatch(ord['Tên tư vấn bán hàng'], currentUser) || isNameMatch(ord['Tên tư vấn bán hàng'], currentUserName);
                                                        const dateStr = formatDepositDate(ord);
                                                        return (
                                                            <div
                                                                key={ord['Số đơn hàng'] || idx}
                                                                className={`flex items-center justify-between p-1.5 px-2 rounded-md text-xs transition-colors ${
                                                                    isMine
                                                                        ? 'bg-amber-100/90 border border-amber-300 text-amber-950 font-medium shadow-2xs'
                                                                        : 'bg-white border border-slate-200/70 text-slate-700'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10.5px] font-bold flex-shrink-0 ${
                                                                        isMine ? 'bg-amber-600 text-white shadow-2xs' : idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                                                                    }`}>
                                                                        #{idx + 1}
                                                                    </span>
                                                                    <div className="min-w-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-semibold truncate">{ord['Tên khách hàng'] || 'Chưa có tên'}</span>
                                                                            {isMine && (
                                                                                <span className="px-1 py-0.2 bg-amber-600 text-white text-[9px] font-bold rounded">
                                                                                    BẠN
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-400 font-mono truncate">
                                                                            {ord['Số đơn hàng']} · TVBH: {ord['Tên tư vấn bán hàng'] || '—'}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex-shrink-0 font-mono text-[10.5px] text-slate-600">
                                                                    {dateStr}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                            <i className="fa-solid fa-inbox text-slate-300 text-2xl mb-1" />
                            <span>{activeTab === 'mine' ? 'Bạn hiện không có đơn hàng nào chờ ghép xe.' : 'Không có yêu cầu chờ ghép phù hợp.'}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="am-footer flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                        Tổng cộng: <b className="text-slate-800 font-mono">{totalVehicles}</b> xe
                        {myTotalOrders > 0 && (
                            <> · Bạn có: <b className="text-amber-700 font-mono font-bold">{myTotalOrders}</b> xe chờ</>
                        )}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="am-btn-cancel"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </AnchoredCyberSheet>
    );
};

export default PendingStatsModal;