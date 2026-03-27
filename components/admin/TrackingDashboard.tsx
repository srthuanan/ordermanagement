import React, { useEffect, useState, useMemo } from 'react';
import { getAuditLogs, getActiveUsers } from '../../services/apiService';
import { AuditLog } from '../../types';
import { supabase } from '../../services/supabaseClient';

const TrackingDashboard: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'logs' | 'users'>('logs');

    // --- CONNECTIVITY & FILTER STATES ---
    const [filterUser, setFilterUser] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [logsRes, usersRes] = await Promise.all([
                getAuditLogs(150),
                getActiveUsers()
            ]);
            if (logsRes.status === 'SUCCESS') setLogs(logsRes.data || []);
            if (usersRes.status === 'SUCCESS') setActiveUsers(usersRes.data || []);
        } catch (error) {
            console.error("Tracking Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const logsChannel = supabase.channel('dashboard-audit')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
                setLogs(prev => [payload.new as AuditLog, ...prev.slice(0, 149)]);
            }).subscribe();

        const presenceChannel = supabase.channel('dashboard-online')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, () => fetchData())
            .subscribe();

        return () => {
            supabase.removeChannel(logsChannel);
            supabase.removeChannel(presenceChannel);
        };
    }, []);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesUser = !filterUser || log.user_email === filterUser || log.user_full_name === filterUser;
            const matchesSearch = !searchQuery ||
                log.target_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.user_full_name?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesUser && matchesSearch;
        });
    }, [logs, filterUser, searchQuery]);

    const stats = useMemo(() => {
        const today = new Date().toLocaleDateString();
        const todayLogs = logs.filter(l => new Date(l.timestamp).toLocaleDateString() === today);
        return {
            totalToday: todayLogs.length,
            activeCount: activeUsers.length,
            topUser: todayLogs.length > 0 ? todayLogs.reduce((acc: Record<string, number>, curr) => {
                const name = curr.user_full_name || 'Hệ thống';
                acc[name] = (acc[name] || 0) + 1;
                return acc;
            }, {}) : null
        };
    }, [logs, activeUsers]);

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        return {
            time: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
        };
    };

    const actionStyles: Record<string, { label: string, color: string, icon: string, bg: string }> = {
        'DELETE_CAR': { label: 'Xóa Xe', color: 'text-red-700', icon: 'fa-trash', bg: 'bg-red-50' },
        'RESTORE_CAR': { label: 'Phục Hổi', color: 'text-green-700', icon: 'fa-history', bg: 'bg-green-50' },
        'ADD_CAR': { label: 'Thêm Xe', color: 'text-blue-700', icon: 'fa-plus', bg: 'bg-blue-50' },
        'HOLD_CAR': { label: 'Giữ Xe', color: 'text-amber-700', icon: 'fa-lock', bg: 'bg-amber-50' },
        'RELEASE_CAR': { label: 'Nhả Xe', color: 'text-slate-600', icon: 'fa-unlock', bg: 'bg-slate-50' },
        'CREATE_ORDER': { label: 'Lên Đơn', color: 'text-white', icon: 'fa-shopping-cart', bg: 'bg-emerald-600 shadow-emerald-200' },
        'PAIR_VIN': { label: 'Ghép Xe', color: 'text-white', icon: 'fa-link', bg: 'bg-indigo-600 shadow-indigo-200' },
        'APPROVE_INVOICE_REQUEST': { label: 'Duyệt HĐ', color: 'text-white', icon: 'fa-check-double', bg: 'bg-emerald-500 shadow-emerald-100' },
        'REQUEST_INVOICE': { label: 'Yêu Cầu HĐ', color: 'text-white', icon: 'fa-file-invoice', bg: 'bg-blue-600 shadow-blue-100' },
        'UPLOAD_INVOICE': { label: 'Tải HĐ', color: 'text-white', icon: 'fa-upload', bg: 'bg-green-500' },
        'UPLOAD_INVOICE_BULK': { label: 'Xuất Loạt HĐ', color: 'text-white', icon: 'fa-file-export', bg: 'bg-emerald-600' },
        'UPDATE_SETTING': { label: 'Cấu Hình APP', color: 'text-white', icon: 'fa-cog', bg: 'bg-slate-700 shadow-slate-200' },
    };

    return (
        <div className="h-full flex flex-col bg-[#f0f2f5] overflow-hidden">
            {/* Rich Integrated Header */}
            <div className="bg-white px-8 py-6 border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.05)] z-20">
                <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white text-2xl shadow-xl shadow-slate-200 ring-4 ring-slate-50">
                            <i className="fas fa-chart-network animate-pulse"></i>
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">TRUNG TÂM GIÁM SÁT</h1>
                            <div className="flex items-center gap-2">
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Live Showroom Feed</span>
                                <span className="mx-2 text-slate-300">|</span>
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                    {filterUser ? `Đang lọc: ${filterUser}` : 'Tất cả hoạt động'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative group">
                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"></i>
                            <input
                                type="text"
                                placeholder="Tìm VIN, số ĐH, hành động..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs w-full sm:w-72 focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none font-medium"
                            />
                        </div>
                        <button onClick={fetchData} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 hover:shadow-lg transition-all active:scale-95">
                            <i className={`fas fa-sync-alt ${isLoading ? 'fa-spin' : ''}`}></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area with Stats & Feed */}
            <div className="flex-grow overflow-hidden flex flex-col">
                <div className="max-w-7xl mx-auto w-full flex-grow p-6 flex flex-col lg:flex-row gap-6 overflow-hidden">

                    {/* Left: Stats & Online (Warm & Cozy Column) */}
                    <aside className="w-full lg:w-80 flex flex-col gap-6 flex-shrink-0 lg:overflow-y-auto no-scrollbar">
                        {/* Stats Section */}
                        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col gap-6">
                            <div className="flex items-center justify-between pb-4 border-b border-dashed border-slate-100">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tóm tắt hôm nay</h3>
                                <i className="fas fa-calendar-check text-slate-300"></i>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <QuickStat label="Tổng hoạt động" value={stats.totalToday} icon="fa-bolt" color="blue" />
                                <QuickStat label="Đang online" value={stats.activeCount} icon="fa-users" color="emerald" />
                            </div>
                        </div>

                        {/* Connected Online Users */}
                        <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200 flex-grow">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Đang trực tuyến</h3>
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-lg">LIVE</span>
                            </div>
                            <div className="flex flex-col gap-3">
                                {activeUsers.length === 0 ? (
                                    <div className="py-10 text-center text-slate-600 italic text-xs">Phòng làm việc đang trống</div>
                                ) : (
                                    activeUsers.map(user => (
                                        <div
                                            key={user.username}
                                            onClick={() => { setFilterUser(user.username); setActiveTab('logs'); }}
                                            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white font-black group-hover:bg-indigo-600 transition-colors">
                                                {user.full_name?.[0]}
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="text-sm font-bold text-slate-200 truncate group-hover:text-white">{user.full_name}</div>
                                                <div className="text-[10px] text-slate-500 truncate">{user.username}</div>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </aside>

                    {/* Right: Main Log Feed (Full & Detailed) */}
                    <main className="flex-grow bg-white rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="flex items-center px-8 h-16 border-b border-slate-100 flex-shrink-0">
                            <div className="flex items-center gap-8 h-full">
                                <TabBtn active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} label="Nhật ký chi tiết" />
                                <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="Lịch sử truy cập" />
                            </div>
                            <div className="ml-auto flex items-center gap-3">
                                {filterUser && (
                                    <button
                                        onClick={() => setFilterUser(null)}
                                        className="text-[10px] font-black text-red-500 hover:underline uppercase tracking-widest"
                                    >
                                        Bỏ lọc
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-grow overflow-y-auto p-2 no-scrollbar bg-slate-50/20">
                            <div className="flex flex-col gap-2">
                                {filteredLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                        <i className="fas fa-inbox text-5xl mb-4"></i>
                                        <p className="font-bold uppercase tracking-widest text-xs">Không có dữ liệu</p>
                                    </div>
                                ) : (
                                    filteredLogs.map((log) => {
                                        const time = formatTime(log.timestamp);
                                        const style = actionStyles[log.action] || { label: log.action, color: 'text-slate-500', icon: 'fa-dot-circle', bg: 'bg-slate-100' };

                                        return (
                                            <div key={log.id} className="bg-white border border-slate-100 rounded-3xl p-5 flex items-center gap-6 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                                                {/* Time & Connectivity Line */}
                                                <div className="flex flex-col items-center gap-1 w-14 flex-shrink-0">
                                                    <span className="text-sm font-black text-slate-800 tabular-nums leading-none">{time.time}</span>
                                                    <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">{time.date}</span>
                                                </div>

                                                <div className="hidden sm:block h-10 w-px bg-slate-100"></div>

                                                {/* Action Narrative */}
                                                <div className="flex-grow flex flex-col md:flex-row md:items-center gap-4">
                                                    <div
                                                        onClick={() => setFilterUser(log.user_email || null)}
                                                        className="flex items-center gap-3 min-w-[200px] cursor-pointer"
                                                    >
                                                        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-xs group-hover:bg-slate-900 group-hover:text-white transition-colors flex-shrink-0">
                                                            {log.user_full_name?.[0]}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-sm font-black text-slate-800 truncate leading-snug">{log.user_full_name}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{log.target_type === 'stock' ? 'Kho' : 'ĐH'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex-shrink-0 flex items-center">
                                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-sm ${style.bg} ${style.color}`}>
                                                            <i className={`fas ${style.icon} text-[9px] opacity-70`}></i>
                                                            {style.label}
                                                        </span>
                                                    </div>

                                                    <div className="flex-grow">
                                                        <div className="flex items-center gap-3">
                                                            {log.target_id && (
                                                                <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded-xl text-[10px] font-black transition-transform hover:scale-105 cursor-help">
                                                                    <i className="fas fa-hashtag text-[8px] text-white/40"></i>
                                                                    {log.target_id}
                                                                </span>
                                                            )}
                                                            {log.details?.reason ? (
                                                                <span className="text-xs text-slate-600 border-l-2 border-indigo-200 pl-3 italic truncate max-w-sm">
                                                                    {log.details.reason}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-300 font-medium italic">Thao tác xử lý tự động</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Micro Connectivity Status */}
            <footer className="h-10 bg-white border-t border-slate-200 px-8 flex items-center justify-between z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Connection Stable</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <i className="fas fa-fingerprint text-slate-300 text-[10px]"></i>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Security Authenticated</span>
                    </div>
                </div>
                <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest opacity-40">
                    X-Audit Engine v4.2
                </div>
            </footer>
        </div>
    );
};

/* --- Helpers --- */

const QuickStat = ({ label, value, icon, color }: any) => {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50',
        emerald: 'text-emerald-600 bg-emerald-50',
    };
    return (
        <div className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colors[color]}`}>
                    <i className={`fas ${icon} text-xs`}></i>
                </div>
                <span className="text-xs font-bold text-slate-500">{label}</span>
            </div>
            <span className="text-lg font-black text-slate-800 tabular-nums">{value}</span>
        </div>
    );
};

const TabBtn = ({ active, onClick, label }: any) => (
    <button
        onClick={onClick}
        className={`h-full flex items-center px-2 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all ${active ? 'border-indigo-600 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
    >
        {label}
    </button>
);

export default TrackingDashboard;
