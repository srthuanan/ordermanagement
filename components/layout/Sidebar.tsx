import React, { useState, useEffect, useRef } from 'react';
import { ActiveView } from '../../hooks/useAppNavigation';
import Avatar from '../ui/Avatar';

import Button from '../ui/Button';

interface SidebarProps {
    isSidebarCollapsed: boolean;
    isMobileMenuOpen: boolean;
    setIsMobileMenuOpen: (isOpen: boolean) => void;
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    toggleSidebar: () => void;
    currentUser: string;
    userRole: string;
    isCurrentUserAdmin: boolean;
    onLogout: () => void;
    setIsChangePasswordModalOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    isSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    activeView,
    setActiveView,
    toggleSidebar,
    currentUser,
    userRole,
    isCurrentUserAdmin,
    onLogout,
    setIsChangePasswordModalOpen
}) => {
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Auto-collapse sidebar after 30 seconds when expanded


    // Click outside for profile menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sidebarClasses = `fixed top-0 left-0 h-full z-40 glass-panel w-64 transition-all duration-300 ease-in-out flex flex-col border-r border-border-primary/50
        lg:top-4 lg:left-4 lg:h-[calc(100%-2rem)] lg:rounded-2xl lg:shadow-2xl
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`;

    return (
        <aside className={sidebarClasses}>
            <div className="flex items-center h-20 border-b border-border-primary/30 flex-shrink-0 px-6">
                <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-center h-full group">
                    <span className={`text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-blue-700 uppercase tracking-[0.2em] transition-all duration-300 ${isSidebarCollapsed ? 'text-[10px] tracking-normal' : ''}`}>VinFast</span>
                </a>
                <Button onClick={toggleSidebar} variant="ghost" className="hidden lg:flex items-center justify-center w-8 h-8 rounded-full !p-0 ml-auto hover:bg-white/50">
                    <i className={`fa-solid fa-chevron-left text-[10px] transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`}></i>
                </Button>
            </div>

            <nav className="p-2 flex flex-col flex-grow overflow-y-auto relative">
                <div className="space-y-2 mt-2">
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('orders'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'orders'} className="nav-link group flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all duration-300 text-text-primary font-bold hover:bg-white/50 active:scale-95">
                        <i className={`fa-solid fa-car-side fa-fw w-6 text-center text-text-secondary ${isSidebarCollapsed ? 'lg:mx-auto' : ''} group-hover:text-accent-primary`}></i>
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>Quản lý Ghép xe</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('stock'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'stock'} className="nav-link group flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all duration-300 text-text-primary font-bold hover:bg-white/50 active:scale-95">
                        <i className={`fa-solid fa-warehouse fa-fw w-6 text-center text-text-secondary ${isSidebarCollapsed ? 'lg:mx-auto' : ''} group-hover:text-accent-primary`}></i>
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>Kho Xe</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('laithu'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'laithu'} className="nav-link group flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all duration-300 text-text-primary font-bold hover:bg-white/50 active:scale-95">
                        <i className={`fa-solid fa-gauge-high fa-fw w-6 text-center text-text-secondary ${isSidebarCollapsed ? 'lg:mx-auto' : ''} group-hover:text-accent-primary`}></i>
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>Lái Thử</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('sold'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'sold'} className="nav-link group flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all duration-300 text-text-primary font-bold hover:bg-white/50 active:scale-95">
                        <i className={`fa-solid fa-receipt fa-fw w-6 text-center text-text-secondary ${isSidebarCollapsed ? 'lg:mx-auto' : ''} group-hover:text-accent-primary`}></i>
                        <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>Lịch Sử Bán Hàng</span>
                    </a>
                    {isCurrentUserAdmin && (
                        <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('admin'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'admin'} className="nav-link group flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm transition-all duration-300 text-text-primary font-bold hover:bg-white/50 active:scale-95">
                            <i className={`fa-solid fa-user-shield fa-fw w-6 text-center text-text-secondary ${isSidebarCollapsed ? 'lg:mx-auto' : ''} group-hover:text-accent-primary`}></i>
                            <span className={`whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>Quản trị viên</span>
                        </a>
                    )}
                </div>
            </nav>

            <div ref={profileMenuRef} className="relative flex-shrink-0 border-t border-border-primary/50">
                {isProfileMenuOpen && (
                    <div className="absolute bottom-full left-2 right-2 mb-2 p-1.5 bg-surface-card rounded-lg shadow-lg border border-border-primary animate-fade-in-up" style={{ animationDuration: '200ms' }}>
                        <div className="px-3 py-2 border-b border-border-primary mb-1">
                            <p className="font-bold text-sm text-text-primary truncate">{currentUser}</p>
                            <p className="text-xs text-text-secondary capitalize">{userRole}</p>
                        </div>
                        <Button
                            onClick={() => { setIsChangePasswordModalOpen(true); setIsProfileMenuOpen(false); }}
                            variant="ghost"
                            fullWidth
                            className="justify-start gap-3 px-3 py-2 text-sm rounded-md text-text-primary hover:bg-surface-hover"
                        >
                            <i className="fas fa-key fa-fw text-text-secondary"></i>
                            <span>Đổi mật khẩu</span>
                        </Button>
                        <Button
                            onClick={() => { onLogout(); setIsProfileMenuOpen(false); }}
                            variant="ghost"
                            fullWidth
                            className="justify-start gap-3 px-3 py-2 text-sm rounded-md text-danger hover:bg-danger-bg hover:text-danger"
                        >
                            <i className="fas fa-sign-out-alt fa-fw"></i>
                            <span>Đăng xuất</span>
                        </Button>
                    </div>
                )}

                <div className="p-2">
                    <Button
                        onClick={() => setIsProfileMenuOpen(prev => !prev)}
                        variant="ghost"
                        fullWidth
                        className={`justify-start gap-3 p-2 rounded-lg transition-colors hover:bg-surface-hover ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}
                    >
                        <div className="relative flex-shrink-0">
                            <Avatar name={currentUser} size="md" />
                            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"></span>
                        </div>
                        <div className={`transition-opacity duration-200 min-w-0 flex flex-col items-start ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
                            <p className="text-sm font-bold text-text-primary whitespace-nowrap truncate">{currentUser}</p>
                            <p className="text-xs text-text-secondary capitalize truncate">{userRole}</p>
                        </div>
                        {!isSidebarCollapsed && (
                            <i className={`fas fa-chevron-up text-xs text-text-secondary ml-auto transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''} ${isSidebarCollapsed ? 'lg:hidden' : ''}`}></i>
                        )}
                    </Button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
