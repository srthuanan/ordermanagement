import React, { useState, useEffect, useRef } from 'react';
import { ActiveView } from '../../hooks/useAppNavigation';
import Avatar from '../ui/Avatar';
import slidebarnoelImg from '../../pictures/slidebarnoel.png';
import noel1Gif from '../../pictures/noel1.gif';
import noel2Gif from '../../pictures/noel2.gif';
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
    const [noelImageIndex, setNoelImageIndex] = useState(0);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Effect cho slideshow ảnh Noel
    useEffect(() => {
        const interval = setInterval(() => {
            setNoelImageIndex(prev => (prev === 0 ? 1 : 0));
        }, 4000);
        return () => clearInterval(interval);
    }, []);

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

    const sidebarClasses = `fixed top-0 left-0 h-full z-40 bg-surface-card/70 backdrop-blur-xl w-64 transition-all duration-300 ease-in-out flex flex-col border-r border-border-primary/50
        lg:top-4 lg:left-4 lg:h-[calc(100%-2rem)] lg:rounded-2xl lg:border lg:shadow-xl
        ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`;

    return (
        <aside className={sidebarClasses}>
            <div className="flex items-center h-16 border-b border-border-primary/50 flex-shrink-0 px-4">
                <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center justify-center h-full group">
                    <img src={slidebarnoelImg} alt="Order Management Logo" className={`object-contain transition-all duration-300 group-hover:scale-105 ${isSidebarCollapsed ? 'h-10' : 'h-13'}`} />
                </a>
                <Button onClick={toggleSidebar} variant="ghost" className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg !p-0 ml-auto">
                    <i className={`fa-solid fa-chevron-left transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-180' : ''}`}></i>
                </Button>
            </div>

            <nav className="p-2 flex flex-col flex-grow overflow-y-auto relative">
                <div className="space-y-1">
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('orders'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'orders'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                        <i className={`fa-solid fa-car-side fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                        <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Quản lý Ghép xe</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('stock'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'stock'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                        <i className={`fa-solid fa-warehouse fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                        <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Kho Xe</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('laithu'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'laithu'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                        <i className={`fa-solid fa-gauge-high fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                        <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Lái Thử</span>
                    </a>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('sold'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'sold'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                        <i className={`fa-solid fa-receipt fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                        <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Lịch Sử Bán Hàng</span>
                    </a>
                    {isCurrentUserAdmin && (
                        <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('admin'); setIsMobileMenuOpen(false); }} data-active-link={activeView === 'admin'} className="nav-link flex items-center gap-4 px-4 py-3 rounded-lg text-sm transition-colors duration-200 text-text-primary font-semibold hover:bg-surface-hover">
                            <i className={`fa-solid fa-user-shield fa-fw w-5 text-center text-text-secondary text-lg transition-colors ${isSidebarCollapsed ? 'lg:mx-auto' : ''}`}></i>
                            <span className={`whitespace-nowrap transition-opacity duration-200 ${isSidebarCollapsed ? 'lg:opacity-0 lg:hidden' : ''}`}>Admin</span>
                        </a>
                    )}
                </div>

                {/* Animated Noel Images */}
                <div className={`mt-auto w-full overflow-hidden rounded-lg transition-all duration-300 ${isSidebarCollapsed ? 'hidden' : 'block'}`}>
                    <div className="relative w-full" style={{ height: '250px' }}>
                        <img
                            src={noel1Gif}
                            alt="Noel 1"
                            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${noelImageIndex === 0 ? 'opacity-100' : 'opacity-0'}`}
                        />
                        <img
                            src={noel2Gif}
                            alt="Noel 2"
                            className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-1000 ease-in-out ${noelImageIndex === 1 ? 'opacity-100' : 'opacity-0'}`}
                        />
                    </div>
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
