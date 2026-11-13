import React, { useState, useMemo } from 'react';
import moment from 'moment';
import { Order, StockVehicle, User } from '../../types';
import '../orders/orders-premium.css';

interface TPKDReportViewProps {
    allOrders: Order[];
    stockData: StockVehicle[];
    teamData: Record<string, string[]>;
    allUsers?: User[];
    currentUser: string;
    currentUserName: string;
    userRole: string;
    isAdmin: boolean;
    onBack?: () => void;
    mobileMode?: boolean;
    onSelectOrder?: (order: Order) => void;
}

const normalizeStr = (s?: string): string => {
    if (!s) return '';
    return s.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
};

const isNameMatch = (a?: string, b?: string): boolean => {
    const na = normalizeStr(a);
    const nb = normalizeStr(b);
    if (!na || !nb) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
};

const getDepositDate = (order: Order) => {
    return order['Ngày cọc'] || (order as any).ngay_coc || (order as any)['Thời gian cọc'] || order['Thời gian nhập'];
};

const formatDepositDisplay = (raw?: string) => {
    if (!raw) return '—';
    const m = moment(raw, [moment.ISO_8601, 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
    if (!m.isValid()) return String(raw);
    const hasTime = m.hours() !== 0 || m.minutes() !== 0;
    return m.format(hasTime ? 'DD/MM HH:mm' : 'DD/MM/YYYY');
};

export default function TPKDReportView({
    allOrders,
    stockData,
    teamData,
    allUsers = [],
    currentUser,
    currentUserName,
    isAdmin,
    onBack,
    mobileMode,
    onSelectOrder
}: TPKDReportViewProps) {
    // 1. Danh sách Trưởng phòng kinh doanh
    const teamLeaders = useMemo(() => Object.keys(teamData).sort((a, b) => a.localeCompare(b, 'vi')), [teamData]);

    // 2. Xác định chính xác Trưởng phòng kinh doanh của user hiện tại
    const myLeaderKey = useMemo(() => {
        // Tìm thông tin user từ allUsers
        const userObj = allUsers.find(u =>
            (u.username && (u.username.toLowerCase() === currentUserName.toLowerCase() || u.username.toLowerCase() === currentUser.toLowerCase())) ||
            (u.name && (normalizeStr(u.name) === normalizeStr(currentUser) || normalizeStr(u.name) === normalizeStr(currentUserName)))
        );

        const possibleNames = [
            userObj?.name,
            currentUser,
            currentUserName
        ].filter(Boolean) as string[];

        // Bước 1: Kiểm tra xem user có phải chính là key leader trong teamData không
        for (const leader of teamLeaders) {
            const normL = normalizeStr(leader);
            if (possibleNames.some(n => {
                const normN = normalizeStr(n);
                return normL === normN || normL.includes(normN) || normN.includes(normL);
            })) {
                return leader;
            }
        }

        // Bước 2: Kiểm tra xem user có nằm trong danh sách thành viên của phòng nào không
        for (const [leader, members] of Object.entries(teamData)) {
            if (members.some(m => possibleNames.some(n => isNameMatch(m, n)))) {
                return leader;
            }
        }

        return null;
    }, [teamLeaders, teamData, allUsers, currentUser, currentUserName]);

    // Admin có thể chọn xem toàn bộ hoặc từng phòng, TPKD LUÔN LUÔN BỊ KHÓA CHẶT VÀO PHÒNG CỦA MÌNH
    const [selectedTeamLeader, setSelectedTeamLeader] = useState<string | 'all'>(() => {
        if (isAdmin) return 'all';
        return myLeaderKey || '';
    });

    const effectiveTeamLeader = useMemo(() => {
        if (!isAdmin) {
            return myLeaderKey;
        }
        return selectedTeamLeader;
    }, [isAdmin, myLeaderKey, selectedTeamLeader]);

    const [activeSidebarTab, setActiveSidebarTab] = useState<'members' | 'pending' | 'paired'>('members');
    const [mainBoardTab, setMainBoardTab] = useState<'pending' | 'paired'>('pending');
    const [timeFilter, setTimeFilter] = useState<'this_month' | 'last_month' | 'all'>('this_month');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMember, setSelectedMember] = useState<string | null>(null);

    // 3. Danh sách nhân sự trong phòng (TPKD CHỈ THẤY TVBH THUỘC PHÒNG MÌNH)
    const activeTeamMembers = useMemo(() => {
        // Chỉ DUY NHẤT Admin mới được quyền xem 'all' (toàn bộ showroom)
        if (isAdmin && effectiveTeamLeader === 'all') {
            const allMembers = new Set<string>();
            Object.entries(teamData).forEach(([leader, members]) => {
                allMembers.add(leader);
                members.forEach(m => allMembers.add(m));
            });
            return Array.from(allMembers).sort((a, b) => a.localeCompare(b, 'vi'));
        }

        // Nếu xác định được phòng (hoặc Admin chọn 1 phòng cụ thể)
        if (effectiveTeamLeader && teamData[effectiveTeamLeader]) {
            const members = teamData[effectiveTeamLeader] || [];
            return [effectiveTeamLeader, ...members].sort((a, b) => a.localeCompare(b, 'vi'));
        }

        // FALLBACK AN TOÀN TUYỆT ĐỐI CHO TPKD:
        // Nếu chưa cấu hình kịp trong teamData, CHỈ ĐƯỢC THẤY CHÍNH MÌNH, TUYỆT ĐỐI KHÔNG HIỂN THỊ TVBH PHÒNG KHÁC!
        return [currentUser, currentUserName].filter(Boolean);
    }, [isAdmin, effectiveTeamLeader, teamData, currentUser, currentUserName]);

    // 3. Toàn bộ đơn hàng của phòng
    const teamOrders = useMemo(() => {
        let orders = allOrders.filter(o => {
            const orderTvbh = o['Tên tư vấn bán hàng'];
            return activeTeamMembers.some(member => isNameMatch(orderTvbh, member));
        });

        // Lọc theo thời gian cọc
        if (timeFilter !== 'all') {
            const targetMonth = timeFilter === 'this_month'
                ? moment().format('YYYY-MM')
                : moment().subtract(1, 'month').format('YYYY-MM');

            orders = orders.filter(o => {
                const dateRaw = getDepositDate(o);
                if (!dateRaw) return true;
                const m = moment(dateRaw, [moment.ISO_8601, 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
                return m.isValid() ? m.format('YYYY-MM') === targetMonth : true;
            });
        }

        return orders;
    }, [allOrders, activeTeamMembers, timeFilter]);

    // 4. Lọc đơn theo TVBH đang chọn (nếu có)
    const displayedOrders = useMemo(() => {
        if (!selectedMember) return teamOrders;
        return teamOrders.filter(o => isNameMatch(o['Tên tư vấn bán hàng'], selectedMember));
    }, [teamOrders, selectedMember]);

    // 5. Hàng đợi FIFO toàn showroom
    const globalWaitingQueues = useMemo(() => {
        const queueMap = new Map<string, { rank: number; total: number }>();
        const allPendingOrders = allOrders.filter(o =>
            (o['Kết quả'] || '').toLowerCase().includes('chưa') &&
            !(o['Kết quả'] || '').toLowerCase().includes('hủy')
        );

        const groups: Record<string, Order[]> = {};
        allPendingOrders.forEach(ord => {
            const key = `${ord['Dòng xe']} · ${ord['Phiên bản'] || ''} · ${ord['Ngoại thất'] || ''} / ${ord['Nội thất'] || ''}`.trim();
            if (!groups[key]) groups[key] = [];
            groups[key].push(ord);
        });

        Object.entries(groups).forEach(([_, groupOrders]) => {
            const sorted = [...groupOrders].sort((a, b) => {
                const rawA = getDepositDate(a);
                const rawB = getDepositDate(b);
                const dateA = moment(rawA, [moment.ISO_8601, 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
                const dateB = moment(rawB, [moment.ISO_8601, 'YYYY-MM-DDTHH:mm:ss', 'YYYY-MM-DDTHH:mm', 'DD/MM/YYYY HH:mm:ss', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD']);
                if (!dateA.isValid()) return 1;
                if (!dateB.isValid()) return -1;
                return dateA.valueOf() - dateB.valueOf();
            });

            sorted.forEach((ord, idx) => {
                queueMap.set(ord['Số đơn hàng'], { rank: idx + 1, total: sorted.length });
            });
        });

        return queueMap;
    }, [allOrders]);

    // 6. Tồn kho rảnh sẵn sàng ghép
    const availableStock = useMemo(() => {
        return stockData.filter(s => (s['Trạng thái'] || '').toLowerCase().includes('chưa'));
    }, [stockData]);

    const getMatchingStockCount = (order: Order) => {
        return availableStock.filter(s =>
            isNameMatch(s['Dòng xe'], order['Dòng xe']) &&
            (!order['Phiên bản'] || isNameMatch(s['Phiên bản'], order['Phiên bản'])) &&
            (!order['Ngoại thất'] || isNameMatch(s['Ngoại thất'], order['Ngoại thất']))
        ).length;
    };

    // 7. KPIs tổng hợp
    const kpis = useMemo(() => {
        const source = displayedOrders;
        let pending = 0;
        let paired = 0;
        let invoicing = 0;
        let invoiced = 0;

        source.forEach(o => {
            const status = (o['Kết quả'] || o['Trạng thái VC'] || '').toLowerCase();
            if (status.includes('hủy') || status.includes('từ chối')) {
                // bỏ qua
            } else if (status.includes('đã xuất') || status.includes('hoàn tất') || o['Ngày xuất hóa đơn']) {
                invoiced++;
            } else if (status.includes('chờ ký') || status.includes('yêu cầu') || status.includes('chờ duyệt') || status.includes('phê duyệt')) {
                invoicing++;
            } else if (status.includes('đã ghép') || o.VIN) {
                paired++;
            } else {
                pending++;
            }
        });

        const activeTotal = pending + paired + invoicing + invoiced;
        const completeRate = activeTotal > 0 ? Math.round(((invoiced + paired + invoicing) / activeTotal) * 100) : 0;

        return { total: activeTotal, pending, paired, invoicing, invoiced, completeRate };
    }, [displayedOrders]);

    // 8. Thống kê theo nhân sự
    const memberStats = useMemo(() => {
        return activeTeamMembers.map(member => {
            const mOrders = teamOrders.filter(o => isNameMatch(o['Tên tư vấn bán hàng'], member));
            let pending = 0;
            let paired = 0;
            let invoicing = 0;
            let invoiced = 0;

            mOrders.forEach(o => {
                const status = (o['Kết quả'] || o['Trạng thái VC'] || '').toLowerCase();
                if (status.includes('hủy') || status.includes('từ chối')) {
                    // skip
                } else if (status.includes('đã xuất') || status.includes('hoàn tất') || o['Ngày xuất hóa đơn']) {
                    invoiced++;
                } else if (status.includes('chờ ký') || status.includes('yêu cầu') || status.includes('chờ duyệt') || status.includes('phê duyệt')) {
                    invoicing++;
                } else if (status.includes('đã ghép') || o.VIN) {
                    paired++;
                } else {
                    pending++;
                }
            });

            const total = pending + paired + invoicing + invoiced;
            const isLeader = Boolean(effectiveTeamLeader && effectiveTeamLeader !== 'all' && isNameMatch(member, effectiveTeamLeader));

            return {
                member,
                isLeader,
                total,
                pending,
                paired,
                invoicing,
                invoiced,
                rate: total > 0 ? Math.round(((invoiced + paired) / total) * 100) : 0
            };
        }).sort((a, b) => b.total - a.total);
    }, [activeTeamMembers, teamOrders, effectiveTeamLeader]);

    // 9. Đơn chờ xe của phòng (FIFO theo ngày cọc)
    const teamPendingOrders = useMemo(() => {
        return displayedOrders.filter(o => {
            const status = (o['Kết quả'] || o['Trạng thái VC'] || '').toLowerCase();
            return status.includes('chưa') && !status.includes('hủy');
        }).sort((a, b) => {
            const qA = globalWaitingQueues.get(a['Số đơn hàng'])?.rank || 999;
            const qB = globalWaitingQueues.get(b['Số đơn hàng'])?.rank || 999;
            return qA - qB;
        });
    }, [displayedOrders, globalWaitingQueues]);

    // 10. Đơn đã ghép / xuất HĐ
    const teamPairedOrders = useMemo(() => {
        return displayedOrders.filter(o => {
            const status = (o['Kết quả'] || o['Trạng thái VC'] || '').toLowerCase();
            return (status.includes('đã ghép') || status.includes('chờ') || status.includes('đã xuất') || !!o.VIN) && !status.includes('hủy');
        });
    }, [displayedOrders]);

    // Tìm kiếm trong sidebar
    const filteredSidebarMembers = useMemo(() => {
        if (!searchQuery.trim()) return memberStats;
        const q = normalizeStr(searchQuery);
        return memberStats.filter(m => normalizeStr(m.member).includes(q));
    }, [memberStats, searchQuery]);

    const filteredSidebarPending = useMemo(() => {
        if (!searchQuery.trim()) return teamPendingOrders;
        const q = normalizeStr(searchQuery);
        return teamPendingOrders.filter(o =>
            normalizeStr(o['Tên khách hàng']).includes(q) ||
            normalizeStr(o['Số đơn hàng']).includes(q) ||
            normalizeStr(o['Tên tư vấn bán hàng']).includes(q) ||
            normalizeStr(o['Dòng xe']).includes(q) ||
            normalizeStr(o['Phiên bản'] || '').includes(q)
        );
    }, [teamPendingOrders, searchQuery]);

    const filteredSidebarPaired = useMemo(() => {
        if (!searchQuery.trim()) return teamPairedOrders;
        const q = normalizeStr(searchQuery);
        return teamPairedOrders.filter(o =>
            normalizeStr(o['Tên khách hàng']).includes(q) ||
            normalizeStr(o['Số đơn hàng']).includes(q) ||
            normalizeStr(o['Tên tư vấn bán hàng']).includes(q) ||
            normalizeStr(o['Dòng xe']).includes(q) ||
            normalizeStr(o.VIN || '').includes(q)
        );
    }, [teamPairedOrders, searchQuery]);

    const periodLabel = timeFilter === 'this_month' ? 'Tháng Này' : timeFilter === 'last_month' ? 'Tháng Trước' : 'Tất Cả';

    return (
        <div className="premium-orders tpkd-workspace">
            {/* SIDEBAR BÊN TRÁI: ĐỒNG BỘ 100% THEO CHUẨN TAB ĐƠN HÀNG */}
            <aside className="premium-orders-sidebar" aria-label="Danh sách nhân sự và đơn hàng">
                {/* Header danh sách */}
                <div className="premium-list-heading">
                    <h1>
                        Báo cáo PKD <span>{activeSidebarTab === 'members' ? memberStats.length : activeSidebarTab === 'pending' ? teamPendingOrders.length : teamPairedOrders.length}</span>
                    </h1>
                    <div className="flex items-center gap-1.5">
                        {mobileMode && onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                title="Quay lại"
                            >
                                <i className="fa-solid fa-chevron-left text-xs" />
                            </button>
                        )}
                        {/* Selector phòng ban cho Admin */}
                        {isAdmin && teamLeaders.length > 0 && (
                            <select
                                value={selectedTeamLeader}
                                onChange={e => {
                                    setSelectedTeamLeader(e.target.value);
                                    setSelectedMember(null);
                                }}
                                className="h-7 text-[11px] font-semibold bg-white border border-slate-200 rounded-md px-2 shadow-2xs outline-none text-slate-700 cursor-pointer max-w-[130px] truncate"
                                title="Chọn phòng kinh doanh"
                            >
                                <option value="all">Toàn bộ SR</option>
                                {teamLeaders.map(leader => (
                                    <option key={leader} value={leader}>PKD {leader}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* 3 Tab chuyển chế độ danh sách */}
                <div className="px-4 pb-2">
                    <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg text-center text-xs">
                        <button
                            type="button"
                            onClick={() => setActiveSidebarTab('members')}
                            className={`py-1 rounded-md text-[11px] font-semibold transition-all ${
                                activeSidebarTab === 'members'
                                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            TVBH ({memberStats.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSidebarTab('pending')}
                            className={`py-1 rounded-md text-[11px] font-semibold transition-all ${
                                activeSidebarTab === 'pending'
                                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Chờ xe ({teamPendingOrders.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveSidebarTab('paired')}
                            className={`py-1 rounded-md text-[11px] font-semibold transition-all ${
                                activeSidebarTab === 'paired'
                                    ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Đã ghép ({teamPairedOrders.length})
                        </button>
                    </div>
                </div>

                {/* Ô tìm kiếm nhanh */}
                <div className="premium-list-search">
                    <label>
                        <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs" />
                        <input
                            type="text"
                            placeholder={
                                activeSidebarTab === 'members'
                                    ? 'Tìm tên TVBH trong phòng...'
                                    : 'Tìm SĐH, Tên KH, VIN, TVBH...'
                            }
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </label>
                </div>

                {/* Danh sách cuộn chuẩn Tab Đơn Hàng */}
                <div className="premium-order-list">
                    {/* Chế độ 1: Danh sách TVBH */}
                    {activeSidebarTab === 'members' && (
                        <>
                            {selectedMember && (
                                <div className="px-4 py-1.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs">
                                    <span className="text-blue-900 font-medium">Đang lọc: <strong>{selectedMember}</strong></span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMember(null)}
                                        className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                                    >
                                        Bỏ lọc
                                    </button>
                                </div>
                            )}
                            {filteredSidebarMembers.map(m => {
                                const isSelected = selectedMember === m.member;
                                return (
                                    <button
                                        type="button"
                                        key={m.member}
                                        className="premium-order-row"
                                        aria-pressed={isSelected}
                                        onClick={() => {
                                            setSelectedMember(prev => prev === m.member ? null : m.member);
                                        }}
                                    >
                                        <span className="premium-row-top">
                                            <strong>{m.member} {m.isLeader && '⭐ (TPKD)'}</strong>
                                            <span className="premium-status" data-tone={m.rate >= 70 ? 'green' : m.rate >= 40 ? 'blue' : 'amber'}>
                                                <i />
                                                {m.rate}% đạt
                                            </span>
                                        </span>
                                        <span className="premium-row-bottom">
                                            <span>{m.total} đơn · {m.pending} chờ · {m.paired} ghép · {m.invoiced} HĐ</span>
                                            <time>{m.total > 0 ? `${m.invoiced} đã giao` : '—'}</time>
                                        </span>
                                        <span className="premium-row-id">
                                            {m.isLeader ? 'Trưởng phòng kinh doanh' : 'Tư vấn bán hàng'}
                                        </span>
                                    </button>
                                );
                            })}
                        </>
                    )}

                    {/* Chế độ 2: Hàng đợi chờ xe FIFO */}
                    {activeSidebarTab === 'pending' && (
                        filteredSidebarPending.map(order => {
                            const q = globalWaitingQueues.get(order['Số đơn hàng']);
                            const stockCount = getMatchingStockCount(order);
                            const depDate = formatDepositDisplay(getDepositDate(order));

                            return (
                                <button
                                    type="button"
                                    key={order['Số đơn hàng']}
                                    className="premium-order-row"
                                    onClick={() => onSelectOrder?.(order)}
                                    title="Bấm để xem chi tiết đơn hàng"
                                >
                                    <span className="premium-row-top">
                                        <strong>{order['Tên khách hàng'] || 'Chưa có tên'}</strong>
                                        <span className="premium-status" data-tone="amber">
                                            <i />
                                            #{q?.rank || '—'} / {q?.total || '—'} toàn SR
                                        </span>
                                    </span>
                                    <span className="premium-row-bottom">
                                        <span>{order['Dòng xe']} · {order['Phiên bản'] || '—'}</span>
                                        <time>Cọc: {depDate}</time>
                                    </span>
                                    <span className="premium-row-id flex items-center justify-between">
                                        <span>#{order['Số đơn hàng']} · {order['Tên tư vấn bán hàng']}</span>
                                        {stockCount > 0 && (
                                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                                Kho có {stockCount} xe!
                                            </span>
                                        )}
                                    </span>
                                </button>
                            );
                        })
                    )}

                    {/* Chế độ 3: Đã ghép VIN & Xuất HĐ */}
                    {activeSidebarTab === 'paired' && (
                        filteredSidebarPaired.map(order => {
                            const status = order['Kết quả'] || order['Trạng thái VC'] || 'Đã ghép';
                            const hasInvoiced = Boolean(order['Ngày xuất hóa đơn'] || order.LinkHoaDonDaXuat);

                            return (
                                <button
                                    type="button"
                                    key={order['Số đơn hàng']}
                                    className="premium-order-row"
                                    onClick={() => onSelectOrder?.(order)}
                                    title="Bấm để xem chi tiết đơn hàng"
                                >
                                    <span className="premium-row-top">
                                        <strong>{order['Tên khách hàng'] || 'Chưa có tên'}</strong>
                                        <span className="premium-status" data-tone={hasInvoiced ? 'green' : 'blue'}>
                                            <i />
                                            {hasInvoiced ? 'Đã xuất HĐ' : status}
                                        </span>
                                    </span>
                                    <span className="premium-row-bottom">
                                        <span>{order['Dòng xe']} · {order['Phiên bản'] || '—'}</span>
                                        <time>{order['Ngày xuất hóa đơn'] || order['Thời gian ghép'] || '—'}</time>
                                    </span>
                                    <span className="premium-row-id">
                                        VIN: <span className="font-mono">{order.VIN || '—'}</span> · {order['Tên tư vấn bán hàng']}
                                    </span>
                                </button>
                            );
                        })
                    )}

                    {((activeSidebarTab === 'members' && filteredSidebarMembers.length === 0) ||
                      (activeSidebarTab === 'pending' && filteredSidebarPending.length === 0) ||
                      (activeSidebarTab === 'paired' && filteredSidebarPaired.length === 0)) && (
                        <div className="premium-list-message">
                            <strong>Không tìm thấy kết quả</strong>
                            <p>Thử đổi từ khóa hoặc bộ lọc phòng ban.</p>
                        </div>
                    )}
                </div>

                {/* Footer đếm số lượng */}
                <div className="premium-list-footer">
                    {activeSidebarTab === 'members'
                        ? `${filteredSidebarMembers.length} TVBH trong phòng`
                        : `${displayedOrders.length} đơn hàng trong chu kỳ ${periodLabel}`}
                </div>
            </aside>

            {/* NỘI DUNG CHI TIẾT BÊN PHẢI: CHUẨN AUTOMOTIVE COCKPIT & TRI-BOARD */}
            <section className="premium-order-content" aria-label="Báo cáo chi tiết phòng kinh doanh">
                {/* Header chi tiết */}
                <header className="premium-detail-heading">
                    <div className="premium-detail-breadcrumb">
                        Báo cáo PKD <span>/</span> {!isAdmin ? `Phòng ${effectiveTeamLeader || currentUser}` : effectiveTeamLeader === 'all' ? 'Toàn Showroom' : `Phòng ${effectiveTeamLeader}`}
                        {selectedMember && (
                            <>
                                <span>/</span> {selectedMember}
                            </>
                        )}
                    </div>
                    <div className="premium-detail-title-row">
                        <div>
                            <h2>
                                {selectedMember ? selectedMember : (!isAdmin ? `Phòng Kinh Doanh: ${effectiveTeamLeader || currentUser}` : effectiveTeamLeader === 'all' ? 'Tổng Quan Showroom' : `Phòng Kinh Doanh: ${effectiveTeamLeader}`)}
                            </h2>
                            <p>
                                Quản lý: <span>{!isAdmin ? (effectiveTeamLeader || currentUser) : effectiveTeamLeader === 'all' ? 'Ban Giám Đốc / Admin' : effectiveTeamLeader}</span>
                                <span>·</span>
                                Chu kỳ: <span>{periodLabel}</span>
                                {selectedMember && (
                                    <>
                                        <span>·</span> Nhân sự TVBH
                                    </>
                                )}
                            </p>
                        </div>

                        {/* Bộ nút chọn chu kỳ thời gian */}
                        <div className="premium-detail-actions">
                            <button
                                type="button"
                                className={timeFilter === 'this_month' ? 'premium-primary' : ''}
                                onClick={() => setTimeFilter('this_month')}
                            >
                                Tháng Này
                            </button>
                            <button
                                type="button"
                                className={timeFilter === 'last_month' ? 'premium-primary' : ''}
                                onClick={() => setTimeFilter('last_month')}
                            >
                                Tháng Trước
                            </button>
                            <button
                                type="button"
                                className={timeFilter === 'all' ? 'premium-primary' : ''}
                                onClick={() => setTimeFilter('all')}
                            >
                                Tất Cả
                            </button>
                        </div>
                    </div>
                </header>

                {/* Hero Zone: 6 Chỉ Số KPI Tinh Gọn (Tesla / Porsche Quiet Luxury Cockpit) */}
                <div className="px-6 py-4 border-b border-slate-200/80 bg-white flex-shrink-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổng Đơn</span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black font-mono text-slate-900">{kpis.total}</span>
                                <span className="text-[10.5px] text-slate-400">đơn</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                <i className="fa-solid fa-hourglass-half text-[9px] text-amber-500" /> Chờ Ghép Xe
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black font-mono text-amber-700">{kpis.pending}</span>
                                <span className="text-[10.5px] font-bold text-amber-600 font-mono">
                                    {kpis.total > 0 ? Math.round((kpis.pending / kpis.total) * 100) : 0}%
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                                <i className="fa-solid fa-link text-[9px] text-blue-500" /> Đã Ghép VIN
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black font-mono text-blue-700">{kpis.paired}</span>
                                <span className="text-[10.5px] font-bold text-blue-600 font-mono">
                                    {kpis.total > 0 ? Math.round((kpis.paired / kpis.total) * 100) : 0}%
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center gap-1">
                                <i className="fa-solid fa-file-signature text-[9px] text-purple-500" /> Chờ Duyệt / Ký
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black font-mono text-purple-700">{kpis.invoicing}</span>
                                <span className="text-[10.5px] text-purple-500 font-medium">hồ sơ</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                <i className="fa-solid fa-check-circle text-[9px] text-emerald-500" /> Đã Xuất HĐ
                            </span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black font-mono text-emerald-700">{kpis.invoiced}</span>
                                <span className="text-[10.5px] font-bold text-emerald-600 font-mono">
                                    {kpis.total > 0 ? Math.round((kpis.invoiced / kpis.total) * 100) : 0}%
                                </span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tỷ Lệ Hoàn Tất</span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className="text-2xl font-black font-mono text-slate-900">{kpis.completeRate}%</span>
                                <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, kpis.completeRate)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BẢNG 2 CỘT RỘNG RÃI: HIỆU SUẤT TVBH & HÀNG ĐỢI TIẾN ĐỘ XE */}
                <div className="px-6 py-4 flex-1 min-h-0 overflow-hidden flex flex-col">
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-5 overflow-hidden">
                        {/* CỘT 1: HIỆU SUẤT & NHÂN SỰ TVBH TRONG PHÒNG */}
                        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col min-h-0 overflow-hidden">
                            <header className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 flex-shrink-0 bg-slate-50/50">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                                        <i className="fa-solid fa-users" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-900 tracking-tight">Hiệu suất TVBH</h3>
                                        <span className="text-[10px] text-slate-400">
                                            {activeTeamMembers.length} nhân sự · Bấm chọn TVBH để lọc đơn
                                        </span>
                                    </div>
                                </div>
                                {selectedMember && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedMember(null)}
                                        className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                        title="Bỏ lọc TVBH"
                                    >
                                        <span>Đang lọc: {selectedMember}</span>
                                        <i className="fa-solid fa-xmark text-[9px]" />
                                    </button>
                                )}
                            </header>

                            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
                                {memberStats.map(m => {
                                    const isSelected = selectedMember === m.member;
                                    return (
                                        <div
                                            key={m.member}
                                            onClick={() => setSelectedMember(prev => prev === m.member ? null : m.member)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                isSelected
                                                    ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-300'
                                                    : 'bg-white border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-xs font-bold text-slate-900 truncate">{m.member}</span>
                                                    {m.isLeader && (
                                                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                                            TPKD
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right shrink-0 flex items-baseline gap-1">
                                                    <span className={`text-sm font-mono font-black ${
                                                        m.rate >= 70 ? 'text-emerald-600' : m.rate >= 40 ? 'text-blue-600' : 'text-amber-600'
                                                    }`}>
                                                        {m.rate}%
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">hoàn tất</span>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2.5">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        m.rate >= 70 ? 'bg-emerald-500' : m.rate >= 40 ? 'bg-blue-500' : 'bg-amber-500'
                                                    }`}
                                                    style={{ width: `${Math.min(100, m.rate)}%` }}
                                                />
                                            </div>

                                            {/* Breakdown stats */}
                                            <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                                                <div className="p-1 rounded-md bg-slate-50 border border-slate-100">
                                                    <span className="text-slate-400 block">Tổng</span>
                                                    <strong className="text-slate-800 font-mono text-[11px]">{m.total}</strong>
                                                </div>
                                                <div className="p-1 rounded-md bg-amber-50/60 border border-amber-100 text-amber-900">
                                                    <span className="text-amber-700 block">Chờ xe</span>
                                                    <strong className="font-mono text-[11px]">{m.pending}</strong>
                                                </div>
                                                <div className="p-1 rounded-md bg-blue-50/60 border border-blue-100 text-blue-900">
                                                    <span className="text-blue-700 block">Đã ghép</span>
                                                    <strong className="font-mono text-[11px]">{m.paired}</strong>
                                                </div>
                                                <div className="p-1 rounded-md bg-emerald-50/60 border border-emerald-100 text-emerald-900">
                                                    <span className="text-emerald-700 block">Đã xuất HĐ</span>
                                                    <strong className="font-mono text-[11px]">{m.invoiced}</strong>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* CỘT 2: HÀNG ĐỢI XE CHỜ & TIẾN ĐỘ ĐƠN HÀNG */}
                        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col min-h-0 overflow-hidden">
                            <header className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-shrink-0 bg-slate-50/50">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMainBoardTab('pending')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            mainBoardTab === 'pending'
                                                ? 'bg-amber-500 text-white shadow-2xs'
                                                : 'text-slate-600 hover:bg-slate-200/60'
                                        }`}
                                    >
                                        <i className="fa-solid fa-clock-rotate-left text-[10px]" />
                                        <span>Chờ xe FIFO ({teamPendingOrders.length})</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMainBoardTab('paired')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            mainBoardTab === 'paired'
                                                ? 'bg-blue-600 text-white shadow-2xs'
                                                : 'text-slate-600 hover:bg-slate-200/60'
                                        }`}
                                    >
                                        <i className="fa-solid fa-car-side text-[10px]" />
                                        <span>Đã ghép & HĐ ({teamPairedOrders.length})</span>
                                    </button>
                                </div>
                                <span className="text-[10.5px] text-slate-400 hidden sm:inline">
                                    Bấm thẻ để mở chi tiết ↗
                                </span>
                            </header>

                            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2.5">
                                {mainBoardTab === 'pending' ? (
                                    teamPendingOrders.length > 0 ? (
                                        teamPendingOrders.map(order => {
                                            const q = globalWaitingQueues.get(order['Số đơn hàng']);
                                            const stockCount = getMatchingStockCount(order);
                                            const depDate = formatDepositDisplay(getDepositDate(order));

                                            return (
                                                <div
                                                    key={order['Số đơn hàng']}
                                                    onClick={() => onSelectOrder?.(order)}
                                                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-amber-50/40 hover:border-amber-300 transition-all cursor-pointer group shadow-2xs"
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                                                                {order['Tên khách hàng'] || 'Chưa có tên'}
                                                            </h4>
                                                            <p className="text-[10.5px] text-slate-500 mt-0.5">
                                                                TVBH: <strong className="text-slate-800">{order['Tên tư vấn bán hàng']}</strong>
                                                                {order['Số hợp đồng'] && <span className="ml-1.5 text-slate-400">· HĐ: {order['Số hợp đồng']}</span>}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                                                #{q?.rank || '—'} / {q?.total || '—'} toàn SR
                                                            </span>
                                                            <span className="text-[9.5px] font-semibold text-blue-600 group-hover:underline flex items-center gap-0.5">
                                                                <span>Chi tiết</span>
                                                                <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
                                                        <span className="font-semibold">{order['Dòng xe']} · {order['Phiên bản'] || '—'}</span>
                                                        <span className="text-slate-500 text-[10px]">{order['Ngoại thất'] || '—'} / {order['Nội thất'] || '—'}</span>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                                                        <span className="flex items-center gap-1">
                                                            <i className="fa-solid fa-calendar-check text-[9px] text-slate-400" />
                                                            Ngày cọc: <strong className="text-slate-800 font-mono">{depDate}</strong>
                                                        </span>
                                                        {stockCount > 0 ? (
                                                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                                                <i className="fa-solid fa-warehouse text-[9px]" />
                                                                Kho sẵn sàng {stockCount} xe!
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">Chờ xe nhà máy</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12 text-slate-400">
                                            <i className="fa-solid fa-car-side text-3xl mb-2 text-slate-300 block" />
                                            <span className="text-xs">Không có đơn hàng nào đang chờ xe</span>
                                        </div>
                                    )
                                ) : (
                                    teamPairedOrders.length > 0 ? (
                                        teamPairedOrders.map(order => {
                                            const status = order['Kết quả'] || order['Trạng thái VC'] || 'Đã ghép';
                                            const hasInvoiced = Boolean(order['Ngày xuất hóa đơn'] || order.LinkHoaDonDaXuat);

                                            return (
                                                <div
                                                    key={order['Số đơn hàng']}
                                                    onClick={() => onSelectOrder?.(order)}
                                                    className="p-3.5 rounded-xl border border-slate-200/80 bg-white hover:bg-blue-50/40 hover:border-blue-300 transition-all cursor-pointer group shadow-2xs"
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                                                                {order['Tên khách hàng'] || 'Chưa có tên'}
                                                            </h4>
                                                            <p className="text-[10.5px] text-slate-500 mt-0.5">
                                                                TVBH: <strong className="text-slate-800">{order['Tên tư vấn bán hàng']}</strong>
                                                                {order['Số hợp đồng'] && <span className="ml-1.5 text-slate-400">· HĐ: {order['Số hợp đồng']}</span>}
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                                hasInvoiced
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                            }`}>
                                                                {hasInvoiced ? 'Đã xuất HĐ' : status}
                                                            </span>
                                                            <span className="text-[9.5px] font-semibold text-blue-600 group-hover:underline flex items-center gap-0.5">
                                                                <span>Chi tiết</span>
                                                                <i className="fa-solid fa-arrow-up-right-from-square text-[8px]" />
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-2 rounded-lg bg-slate-50/80 border border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
                                                        <span className="font-semibold">{order['Dòng xe']} · {order['Phiên bản'] || '—'}</span>
                                                        <span className="font-mono font-bold text-blue-700 text-xs">{order.VIN || '—'}</span>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                                                        <span>Mã ĐH: <strong className="font-mono text-slate-700">#{order['Số đơn hàng']}</strong></span>
                                                        <span className="text-slate-500">
                                                            {order['Ngày xuất hóa đơn'] ? `HĐ: ${order['Ngày xuất hóa đơn']}` : order['Thời gian ghép'] ? `Ghép: ${order['Thời gian ghép']}` : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-12 text-slate-400">
                                            <i className="fa-solid fa-file-invoice text-3xl mb-2 text-slate-300 block" />
                                            <span className="text-xs">Chưa có đơn hàng nào đã ghép hoặc xuất HĐ</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </section>
        </div>
    );
}
