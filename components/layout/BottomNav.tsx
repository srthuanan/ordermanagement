import React from 'react';
import { ActiveView } from '../../hooks/useAppNavigation';

interface BottomNavProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    isCurrentUserAdmin: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView, isCurrentUserAdmin }) => {
    const navItems = [
        { id: 'orders', label: 'Ghép Xe', icon: 'fa-car-side' },
        { id: 'stock', label: 'Kho Xe', icon: 'fa-warehouse' },
        { id: 'laithu', label: 'Lái Thử', icon: 'fa-gauge-high' },
        { id: 'sold', label: 'Lịch Sử', icon: 'fa-receipt' },
    ];

    if (isCurrentUserAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: 'fa-user-shield' });
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 lg:hidden pb-safe">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveView(item.id as ActiveView)}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <i className={`fas ${item.icon} text-lg ${isActive ? 'animate-bounce-short' : ''}`}></i>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
