import React, { useEffect, useState } from 'react';
import { getAuditLogs, getActiveUsers } from '../../services/apiService';
import { AuditLog } from '../../types';

const TrackingDashboard: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'logs' | 'users'>('logs');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [logsRes, usersRes] = await Promise.all([
                getAuditLogs(100),
                getActiveUsers()
            ]);

            if (logsRes.status === 'SUCCESS') setLogs(logsRes.data || []);
            if (usersRes.status === 'SUCCESS') setActiveUsers(usersRes.data || []);
        } catch (error) {
            console.error("Failed to fetch tracking data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getActionBadgeClass = (action: string) => {
        if (action.includes('DELETE')) return 'bg-red-100 text-red-700 border-red-200';
        if (action.includes('APPROVE')) return 'bg-green-100 text-green-700 border-green-200';
        if (action.includes('CANCEL')) return 'bg-orange-100 text-orange-700 border-orange-200';
        if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-700 border-blue-200';
        return 'bg-slate-100 text-slate-700 border-slate-200';
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
            {/* Header Sticky */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <i className="fas fa-microscope text-accent-primary"></i>
                        Giám Sát Hệ Thống
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">Theo dõi hoạt động và trạng thái người dùng thời gian thực (Supabase Logs)</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                        onClick={() => setActiveTab('logs')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'logs' ? 'bg-white text-accent-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <i className="fas fa-list-ul mr-2"></i> Nhật Ký
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-accent-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <i className="fas fa-users mr-2"></i> Đang Online
                        {activeUsers.length > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-green-500 text-white text-[9px] rounded-full">{activeUsers.length}</span>
                        )}
                    </button>
                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="p-1.5 text-slate-400 hover:text-accent-primary transition-colors disabled:opacity-50"
                        title="Làm mới"
                    >
                        <i className={`fas fa-sync-alt text-xs ${isLoading ? 'fa-spin' : ''}`}></i>
                    </button>
                </div>
            </header>

            {/* Content Area */}
            <main className="flex-grow overflow-hidden flex flex-col p-4 md:p-6">
                {activeTab === 'logs' ? (
                    <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-10 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider w-48">Thời gian</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider w-40">Hành động</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider w-56">Người thực hiện</th>
                                        <th className="px-6 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {logs.length === 0 && !isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                                <i className="fas fa-history text-4xl mb-3 opacity-20"></i>
                                                <p className="text-sm font-medium">Chưa có nhật ký hoạt động nào</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-xs font-mono text-slate-500">{formatTime(log.timestamp)}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 rounded-md border text-[10px] font-black uppercase tracking-tight ${getActionBadgeClass(log.action)}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-slate-700">{log.user_full_name}</span>
                                                        <span className="text-[10px] text-slate-400">{log.user_email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        {log.target_id && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase">{log.target_type || 'ID'}:</span>
                                                                <span className="text-xs font-mono font-bold text-accent-primary">{log.target_id}</span>
                                                            </div>
                                                        )}
                                                        <div className="text-xs text-slate-600 truncate max-w-md italic" title={JSON.stringify(log.details)}>
                                                            {JSON.stringify(log.details)}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* Active Users Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
                        {activeUsers.length === 0 ? (
                            <div className="col-span-full py-20 text-center">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <i className="fas fa-user-slash text-2xl text-slate-300"></i>
                                </div>
                                <h3 className="text-slate-400 font-bold uppercase tracking-widest text-sm">Không có ai đang online</h3>
                            </div>
                        ) : (
                            activeUsers.map((user) => (
                                <div key={user.username} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-4 group">
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary/10 to-accent-primary/5 flex items-center justify-center text-accent-primary text-xl font-black">
                                            {user.full_name?.[0] || user.username[0].toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="font-bold text-slate-800 text-sm truncate">{user.full_name || user.username}</h4>
                                        <p className="text-[10px] text-slate-400 truncate mb-2">{user.username}</p>
                                        <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                            <span className="text-[9px] font-bold uppercase">vừa truy cập {formatTime(user.last_active_at).split(' ')[0]}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </main>

            {/* Footer Status */}
            <footer className="flex-shrink-0 bg-slate-50 border-t border-slate-200 px-6 py-2.5 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <i className="fas fa-database"></i> Supabase Connected
                    </span>
                    <span className="flex items-center gap-1.5">
                        <i className="fas fa-clock"></i> Cập nhật tự động: 60s
                    </span>
                </div>
                <div>
                    ADMINISTRATOR MONITORING PANEL v2.0
                </div>
            </footer>
        </div>
    );
};

export default TrackingDashboard;
