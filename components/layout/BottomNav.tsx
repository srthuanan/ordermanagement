import React from 'react';
import { ActiveView } from '../../hooks/useAppNavigation';

interface BottomNavProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    isCurrentUserAdmin: boolean;
    currentUser: string;
    userRole: string;
    onLogout: () => void;
    setIsChangePasswordModalOpen: (isOpen: boolean) => void;
    isStockEnabled: boolean;
    isCrmEnabled?: boolean;
    reputation?: { score: number; total: number; matched: number };
    isTogglingStock?: boolean;
    handleToggleStockGlobal?: () => void;
    onOpenGlobalSearch: () => void;
    teamData?: Record<string, string[]>;
}

const BottomNav: React.FC<BottomNavProps> = ({
    activeView,
    setActiveView,
    isCurrentUserAdmin,
    currentUser,
    userRole,
    isStockEnabled,
    isCrmEnabled = true,
    teamData
}) => {
    const isTpkd = React.useMemo(() => {
        if (isCurrentUserAdmin) return true;
        if (userRole === 'Trưởng Phòng Kinh Doanh' || userRole?.toLowerCase().includes('trưởng') || userRole?.toLowerCase().includes('tpkd')) return true;
        if (teamData) {
            const normUser = (currentUser || '').toLowerCase().trim();
            return Object.keys(teamData).some(leader => leader.toLowerCase().trim() === normUser);
        }
        return false;
    }, [isCurrentUserAdmin, userRole, teamData, currentUser]);

    const navItems = [
        { id: 'orders', label: 'Đơn Hàng', icon: 'fa-car-side' },
        ...(isStockEnabled || isCurrentUserAdmin ? [{ id: 'stock', label: 'Kho xe', icon: 'fa-warehouse' }] : []),
        ...(isCrmEnabled || isCurrentUserAdmin ? [{ id: 'crm', label: 'KHTN', icon: 'fa-user-plus' }] : []),
        { id: 'laithu', label: 'Lái Thử', icon: 'fa-gauge-high' },
        { id: 'sold', label: 'Lịch Sử', icon: 'fa-receipt' },
        ...(isTpkd ? [{ id: 'tpkd', label: 'Báo Cáo PKD', icon: 'fa-chart-pie' }] : []),
    ];

    if (isCurrentUserAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: 'fa-user-shield' });
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.05)] z-40 lg:hidden pb-safe">
            <div className="flex justify-around items-center h-16 px-1">
                {navItems.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as ActiveView)}
                            className={`flex flex-col items-center justify-center flex-1 h-full space-y-1 relative group transition-all duration-300 ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {isActive && (
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-blue-600 rounded-b-full"></span>
                            )}
                            <i className={`fas ${item.icon} text-[18px] ${isActive ? 'scale-110' : 'group-hover:scale-105'} transition-transform`}></i>
                            <span className={`text-[9px] font-bold ${isActive ? 'opacity-100' : 'opacity-80'}`}>{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
