import React, { useState, useRef, useEffect } from 'react';
import { ActiveView } from '../../hooks/useAppNavigation';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';

interface BottomNavProps {
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    isCurrentUserAdmin: boolean;
    currentUser: string;
    userRole: string;
    onLogout: () => void;
    setIsChangePasswordModalOpen: (isOpen: boolean) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({
    activeView,
    setActiveView,
    isCurrentUserAdmin,
    currentUser,
    userRole,
    onLogout,
    setIsChangePasswordModalOpen
}) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const navItems = [
        { id: 'orders', label: 'Ghép Xe', icon: 'fa-car-side' },
        { id: 'stock', label: 'Kho Xe', icon: 'fa-warehouse' },
        { id: 'laithu', label: 'Lái Thử', icon: 'fa-gauge-high' },
        { id: 'sold', label: 'Lịch Sử', icon: 'fa-receipt' },
    ];

    if (isCurrentUserAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: 'fa-user-shield' });
    }

    // Close profile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileOpen]);

    return (
        <>
            {/* Profile Menu Backdrop & Content */}
            {isProfileOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileOpen(false)}></div>
                    <div ref={profileMenuRef} className="relative bg-surface-card rounded-t-2xl shadow-2xl border-t border-border-primary p-4 animate-slide-up-fade">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border-primary/50">
                            <Avatar name={currentUser} size="lg" />
                            <div>
                                <h3 className="font-bold text-lg text-text-primary">{currentUser}</h3>
                                <p className="text-sm text-text-secondary capitalize">{userRole}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Button
                                onClick={() => { setIsChangePasswordModalOpen(true); setIsProfileOpen(false); }}
                                variant="secondary"
                                fullWidth
                                className="justify-start gap-3 py-3 text-base"
                            >
                                <i className="fas fa-key text-text-secondary w-6 text-center"></i>
                                <span>Đổi mật khẩu</span>
                            </Button>
                            <Button
                                onClick={() => { onLogout(); setIsProfileOpen(false); }}
                                variant="ghost"
                                fullWidth
                                className="justify-start gap-3 py-3 text-base text-danger hover:bg-danger-bg hover:text-danger"
                            >
                                <i className="fas fa-sign-out-alt w-6 text-center"></i>
                                <span>Đăng xuất</span>
                            </Button>
                        </div>

                        <div className="mt-6 pt-2 text-center">
                            <button onClick={() => setIsProfileOpen(false)} className="w-12 h-1 bg-gray-300 rounded-full mx-auto"></button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 lg:hidden pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { setActiveView(item.id as ActiveView); setIsProfileOpen(false); }}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <i className={`fas ${item.icon} text-lg ${isActive ? 'animate-bounce-short' : ''}`}></i>
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}

                    {/* Personal Tab */}
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isProfileOpen ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <i className={`fas fa-user-circle text-lg ${isProfileOpen ? 'animate-bounce-short' : ''}`}></i>
                        <span className="text-[10px] font-medium">Cá nhân</span>
                    </button>
                </div>
            </div>
        </>
    );
};

export default BottomNav;
