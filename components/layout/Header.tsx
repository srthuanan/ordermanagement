import React from 'react';
import { Notification } from '../../types';

import yeucauAnimationUrl from '../../pictures/yeucau.json?url';
import logoShowroomThuanAn from '../../pictures/logo_showroom_thuan_an.webp';
import logoShowroomThuanAnTrungThu from '../../pictures/logo_showroom_thuan_an_trung_thu.webp';
import logoShowroomThuanAnHalloween from '../../pictures/logo_showroom_thuan_an_halloween.webp';
import tabActiveTrungThuBg from '../../pictures/tab_active_trung_thu_bg.webp';
import { isMidAutumnSeason, isHalloweenSeason } from '../ui/HolidayThemeDecorator';
import Button from '../ui/Button';
import NotificationSheet from './NotificationSheet';
import Avatar from '../ui/Avatar';
import { CyberAutoSyncBadge } from '../ui/CyberAutoSyncBadge';
import { SwapInboxModal } from '../modals/SwapInboxModal';
import { getSwapRequests } from '../../services/api/swapService';


import { ActiveView } from '../../hooks/useAppNavigation';
import { recordAndGetVisitCount } from '../../services/visitCounterService';


interface HeaderProps {
    presentation?: 'navbar' | 'sidebar';
    setCreateRequestData: (data: { isOpen: boolean }) => void;
    toggleNotificationPanel: (open?: boolean) => void;
    unreadCount: number;
    isNotificationPanelOpen: boolean;
    notifications: Notification[];
    handleMarkAllAsRead: (e: React.MouseEvent) => void;
    handleNotificationClick: (notification: Notification, e: React.MouseEvent) => void;
    onLogout: () => void;
    notificationContainerRef: React.RefObject<HTMLDivElement>;
    activeView: ActiveView;
    setActiveView: (view: ActiveView) => void;
    isCurrentUserAdmin: boolean;
    onOpenGlobalSearch: () => void;
    currentUser: string;
    currentUserName: string;
    userRole: string;
    onOpenChangePassword: () => void;
    isStockEnabled: boolean;
    isTogglingStock: boolean;
    handleToggleStockGlobal: () => void;
    isCrmEnabled?: boolean;
    isTogglingCrm?: boolean;
    handleToggleCrmGlobal?: () => void;
    isChatEnabled: boolean;
    isTogglingChat: boolean;
    handleToggleChatGlobal: () => void;
    requestNotificationPermission: () => Promise<boolean>;
    reputation?: { score: number; total: number; matched: number };
    onOpenBacklogReport?: () => void;
    isReferenceAccount?: boolean;
}


import { useGlobalNotificationContext } from '../context/GlobalNotificationContext';

import speakerAnim from '../../pictures/speaker_anim.gif';
import NotificationDetailModal from '../modals/NotificationDetailModal';
import InternalChat from '../chat/InternalChat';
import './sidebar-navigation.css';

const formatDisplayName = (name: string) => {
    if (!name) return '';
    if (name.toLowerCase() === 'admin') return 'Admin';
    return name;
};

const Header: React.FC<HeaderProps> = ({
    presentation = 'navbar',
    setCreateRequestData,
    toggleNotificationPanel,
    unreadCount,
    isNotificationPanelOpen,
    notifications,
    handleMarkAllAsRead,
    handleNotificationClick,
    onLogout,
    notificationContainerRef,
    activeView,
    setActiveView,
    isCurrentUserAdmin,
    onOpenGlobalSearch,
    currentUser,
    currentUserName,
    userRole,
    onOpenChangePassword = () => { },
    isStockEnabled,
    isTogglingStock,
    handleToggleStockGlobal,
    isCrmEnabled = true,
    isTogglingCrm = false,
    handleToggleCrmGlobal,
    isChatEnabled,
    isTogglingChat: _isTogglingChat,
    handleToggleChatGlobal: _handleToggleChatGlobal,
    requestNotificationPermission,
    reputation,
    onOpenBacklogReport: _onOpenBacklogReport,
    isReferenceAccount
}) => {


    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
    const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = React.useState(false);
    const profileMenuRef = React.useRef<HTMLDivElement>(null);
    const [isAdminControlsOpen, setIsAdminControlsOpen] = React.useState(false);
    const adminControlsRef = React.useRef<HTMLDivElement>(null);
    const [isInternalChatOpen, setIsInternalChatOpen] = React.useState(false);

    // Tự động sử dụng logo theo mùa lễ hội (Halloween từ 09/10 đến hết 02/11)
    const isHalloween = React.useMemo(() => isHalloweenSeason(), []);
    const isMidAutumn = React.useMemo(() => isMidAutumnSeason(), []);
    const currentLogo = isHalloween 
        ? logoShowroomThuanAnHalloween 
        : (isMidAutumn ? logoShowroomThuanAnTrungThu : logoShowroomThuanAn);
    const [chatUnreadCount, setChatUnreadCount] = React.useState(0);
    const [isSwapInboxOpen, setIsSwapInboxOpen] = React.useState(false);
    const [pendingSwapCount, setPendingSwapCount] = React.useState(0);
    React.useEffect(() => {
        recordAndGetVisitCount().catch(() => {});
    }, []);

    const fetchPendingSwapCount = React.useCallback(async () => {
        try {
            const res = await getSwapRequests();
            if (res.status === 'SUCCESS' && res.data) {
                const count = res.data.filter((r: any) => {
                    if (isCurrentUserAdmin) return r.status === 'waiting_admin' || r.status === 'pending_tvbh2';
                    return r.tvbhB.toLowerCase() === (currentUser || '').toLowerCase() && r.status === 'pending_tvbh2';
                }).length;
                setPendingSwapCount(count);
            }
        } catch (e) {}
    }, [currentUser, isCurrentUserAdmin]);

    React.useEffect(() => {
        fetchPendingSwapCount();
        const interval = setInterval(fetchPendingSwapCount, 60000); // 60s giãn cách để tránh spam request liên tục
        return () => clearInterval(interval);
    }, [fetchPendingSwapCount]);

    // Use it to satisfy lint
    React.useEffect(() => {
        if (chatUnreadCount > 0) console.log(`Unread chats: ${chatUnreadCount}`);
    }, [chatUnreadCount]);

    const { notification, dismissNotification, isDismissed } = useGlobalNotificationContext();



    // Click outside for profile menu & admin controls menu
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
            if (adminControlsRef.current && !adminControlsRef.current.contains(event.target as Node)) {
                setIsAdminControlsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        const handleCloseAllSheets = (e: Event) => {
            const except = (e as CustomEvent)?.detail?.except;
            if (except !== 'profileMenu') setIsProfileMenuOpen(false);
            if (except !== 'adminControls') setIsAdminControlsOpen(false);
            if (except !== 'notificationHistory') setIsNotificationHistoryOpen(false);
            if (except !== 'swapInbox') setIsSwapInboxOpen(false);
        };
        window.addEventListener('close-all-sheets', handleCloseAllSheets);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('close-all-sheets', handleCloseAllSheets);
        };
    }, []);



    const navItems = [
        { id: 'orders', label: 'Đơn Hàng', icon: 'fa-car-side' },
        { id: 'backlog', label: 'Cọc Tồn', icon: 'fa-file-invoice-dollar' },
        ...(isStockEnabled || isCurrentUserAdmin ? [{ id: 'stock', label: 'Kho xe', icon: 'fa-warehouse' }] : []),
        ...(isCrmEnabled || isCurrentUserAdmin ? [{ id: 'crm', label: 'KHTN', icon: 'fa-user-plus' }] : []),
        { id: 'laithu', label: 'Lái Thử', icon: 'fa-gauge-high' },
        { id: 'sold', label: 'Lịch Sử', icon: 'fa-receipt' },
    ];

    if (isCurrentUserAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: 'fa-user-shield' });
    }

    return (
        <>
            <header onClick={(e) => { if (!(e.target as HTMLElement).closest('button, a, input, select, textarea, .sidebar-popover, #notification-sheet')) { window.dispatchEvent(new CustomEvent('close-all-sheets')); } }} className={`${presentation === 'sidebar' ? 'app-sidebar-navigation' : ''} relative sticky top-0 z-[1010] h-14 w-full shrink-0 backdrop-blur-xl bg-white/80 border-b border-slate-200/80 shadow-sm flex items-center justify-between px-4 sm:px-6`}>
                <div className="app-navigation-brand flex items-center gap-2 sm:gap-4 relative z-10">
                    {presentation === 'sidebar' ? <span className="app-sidebar-wordmark" title="VinFast Thuận An" aria-label="VinFast Thuận An">V</span> : (
                    <div 
                        className="flex flex-col cursor-default select-none relative" 
                        title={isHalloween ? "VinFast Showroom Thuận An - Halloween Edition" : (isMidAutumn ? "VinFast Showroom Thuận An - Tết Trung Thu" : "VinFast Showroom Thuận An")}
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <img 
                            src={currentLogo} 
                            alt={isHalloween ? "VinFast Showroom Thuận An - Halloween Edition" : (isMidAutumn ? "VinFast Showroom Thuận An - Tết Trung Thu" : "VinFast Showroom Thuận An")} 
                            draggable={false}
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            className="h-12 sm:h-13 w-auto -ml-1 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.15)] pointer-events-none select-none" 
                            style={{ 
                                userSelect: 'none', 
                                WebkitUserSelect: 'none', 
                                WebkitTouchCallout: 'none',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>)}

                </div>

                {/* Top Navigation — Frameless */}
                <nav aria-label="Điều hướng chính" className="app-main-navigation hidden lg:flex items-center gap-1 absolute left-[41%] xl:left-[43%] 2xl:left-[45%] transform -translate-x-1/2 transition-all duration-300 z-10">
                        {navItems.map((item) => {
                            const isActive = activeView === item.id;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-label={item.label}
                                    aria-current={isActive ? 'page' : undefined}
                                    onClick={() => { window.dispatchEvent(new CustomEvent('close-all-sheets')); setActiveView(item.id as any); }}
                                    title={item.label}
                                    className={`
                                        relative h-8 rounded-xl font-semibold flex items-center justify-center overflow-hidden
                                        transition-all duration-300 ease-out outline-none group select-none
                                        ${isActive
                                            ? (isMidAutumn && presentation !== 'sidebar'
                                                ? 'text-slate-800 font-bold shadow-sm border border-amber-200/90'
                                                : 'bg-slate-100 text-slate-900 px-4 gap-2 font-bold shadow-sm'
                                              )
                                            : 'text-gray-400 hover:text-gray-700 hover:bg-slate-100/70 w-9'
                                        }
                                    `}
                                    style={isActive && isMidAutumn && presentation !== 'sidebar' ? {
                                        backgroundImage: `url(${tabActiveTrungThuBg})`,
                                        backgroundPosition: 'left center',
                                        backgroundSize: 'auto 100%',
                                        backgroundRepeat: 'no-repeat',
                                        paddingLeft: '32px',
                                        paddingRight: '12px',
                                    } : {}}
                                >
                                    {isActive ? (
                                        isMidAutumn && presentation !== 'sidebar' ? (
                                            <span className="text-[11px] font-bold tracking-wide whitespace-nowrap text-slate-800">
                                                {item.label}
                                            </span>
                                        ) : (
                                            <>
                                                <i className={`fas ${item.icon} text-[13px] flex-shrink-0 transition-all duration-300 text-slate-800`}></i>
                                                <span className="text-[11px] font-bold tracking-wide whitespace-nowrap text-slate-800">{item.label}</span>
                                            </>
                                        )
                                    ) : (
                                        <i className={`fas ${item.icon} text-[13px] flex-shrink-0 transition-all duration-300 group-hover:scale-110`}></i>
                                    )}
                                </button>
                            );
                        })}
                    </nav>


                <div className="app-navigation-utilities flex items-center justify-end gap-1.5 sm:gap-3 relative z-10">
                    {!isReferenceAccount && presentation === 'sidebar' && <button type="button" className="app-sidebar-create" title="Tạo yêu cầu mới" aria-label="Tạo yêu cầu mới" onClick={() => { window.dispatchEvent(new CustomEvent('close-all-sheets', { detail: { except: 'createRequest' } })); setCreateRequestData({ isOpen: true }); }}><i className="fas fa-plus" aria-hidden="true" /></button>}
                    {!isReferenceAccount && presentation !== 'sidebar' && (
                        <div
                            onClick={() => { window.dispatchEvent(new CustomEvent('close-all-sheets', { detail: { except: 'createRequest' } })); setCreateRequestData({ isOpen: true }); }}
                            title="Tạo Yêu Cầu Mới"
                            className="flex cursor-pointer relative z-10 items-center justify-center w-[90px] sm:w-[120px] lg:w-[150px] h-[40px] transition-transform hover:scale-105 active:scale-95 mr-1"
                        >
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <lottie-player
                                    src={yeucauAnimationUrl}
                                    background="transparent"
                                    speed="1"
                                    style={{ width: '200px', height: '100px' }}
                                    loop
                                    autoplay
                                />
                            </div>
                        </div>
                    )}

                    {/* Controls Dock */}
                    <div className="app-navigation-controls flex items-center gap-1 sm:gap-1.5 transition-all">
                        {isReferenceAccount && (
                            <div className="app-navigation-reference hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-xs animate-pulse mx-1">
                                <i className="fa-solid fa-eye text-amber-600 text-xs"></i>
                                <span className="text-[10px] font-black text-amber-700 tracking-tighter uppercase whitespace-nowrap">BẢN THAM KHẢO (CHỈ XEM)</span>
                            </div>
                        )}


                        {/* Portal for Admin Actions or View-specific actions */}
                        <div id="admin-portal-target" className="flex items-center"></div>

                        {/* Huy hiệu trạng thái kết nối máy VP / Cloud Render */}
                        {isCurrentUserAdmin && (
                            <div className="app-navigation-sync hidden sm:flex items-center mx-1">
                                <CyberAutoSyncBadge />
                            </div>
                        )}

                        <div className="app-navigation-admin flex items-center gap-1 relative">
                            {isCurrentUserAdmin && (
                                <>
                                    <Button
                                        onClick={onOpenGlobalSearch}
                                        variant="ghost"
                                        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center !p-0 text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition-all"
                                        title="Tìm kiếm toàn cục (⌘K)"
                                    >
                                        <i className="fas fa-search text-[13px]"></i>
                                    </Button>

                                    {/* Menu Bật/Tắt Tính Năng Gọn Gàng Cho Admin */}
                                    <div ref={adminControlsRef} className="relative">
                                        <Button
                                            onClick={() => { window.dispatchEvent(new CustomEvent('close-all-sheets', { detail: { except: 'adminControls' } })); setIsAdminControlsOpen(prev => !prev); }}
                                            variant="ghost"
                                            data-active={isAdminControlsOpen}
                                            className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center !p-0 transition-all ${
                                                isAdminControlsOpen
                                                    ? 'bg-blue-50 text-blue-600 shadow-xs ring-1 ring-blue-500/20'
                                                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                                            }`}
                                            title="Bật/Tắt tính năng cho TVBH"
                                        >
                                            <i className="fas fa-sliders text-[13px]"></i>
                                        </Button>

                                        {isAdminControlsOpen && (
                                            <div className="app-navigation-admin-menu sidebar-popover absolute right-0 top-full mt-2 w-60 z-[1000] animate-fade-in">
                                                <div className="sidebar-popover-header">
                                                    <span className="sidebar-popover-title">Tính năng TVBH</span>
                                                    <span className="sidebar-popover-badge">Admin</span>
                                                </div>

                                                <div className="sidebar-popover-list">
                                                    {/* Kho xe */}
                                                    <div className="sidebar-toggle-row">
                                                        <div className="sidebar-toggle-copy">
                                                            <span className="sidebar-toggle-label">Kho xe</span>
                                                            <span className="sidebar-toggle-sub">
                                                                {isStockEnabled ? 'Đang mở cho TVBH' : 'Đang ẩn với TVBH'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleToggleStockGlobal}
                                                            disabled={isTogglingStock}
                                                            className={`sidebar-switch ${isStockEnabled ? 'is-on' : ''}`}
                                                            aria-pressed={isStockEnabled}
                                                        >
                                                            <span className="sidebar-switch-thumb" />
                                                        </button>
                                                    </div>

                                                    {/* Trợ lý AI */}
                                                    <div className="sidebar-toggle-row">
                                                        <div className="sidebar-toggle-copy">
                                                            <span className="sidebar-toggle-label">Trợ lý AI</span>
                                                            <span className="sidebar-toggle-sub">
                                                                {isChatEnabled ? 'Đang kích hoạt' : 'Đang tắt'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={_handleToggleChatGlobal}
                                                            disabled={_isTogglingChat}
                                                            className={`sidebar-switch ${isChatEnabled ? 'is-on' : ''}`}
                                                            aria-pressed={isChatEnabled}
                                                        >
                                                            <span className="sidebar-switch-thumb" />
                                                        </button>
                                                    </div>

                                                    {/* Tab KHTN */}
                                                    <div className="sidebar-toggle-row">
                                                        <div className="sidebar-toggle-copy">
                                                            <span className="sidebar-toggle-label">Tab KHTN</span>
                                                            <span className="sidebar-toggle-sub">
                                                                {isCrmEnabled ? 'Đang mở cho TVBH' : 'Đang tắt với TVBH'}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={handleToggleCrmGlobal}
                                                            disabled={isTogglingCrm}
                                                            className={`sidebar-switch ${isCrmEnabled ? 'is-on' : ''}`}
                                                            aria-pressed={isCrmEnabled}
                                                        >
                                                            <span className="sidebar-switch-thumb" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Consolidated Notification Center Bell */}
                        <div ref={notificationContainerRef} className="static sm:relative">
                            <Button onClick={() => { window.dispatchEvent(new CustomEvent('close-all-sheets', { detail: { except: 'notification' } })); toggleNotificationPanel(); }} aria-haspopup="dialog" aria-controls="notification-sheet" aria-expanded={isNotificationPanelOpen} data-active={isNotificationPanelOpen} variant="ghost" className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center !p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all group relative" title="Hộp thư thông báo & Đổi xe">
                                <i className="fas fa-bell text-[14px] group-hover:scale-110 transition-transform"></i>
                                {(unreadCount + pendingSwapCount) > 0 && (
                                    <span id="notification-badge" className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 text-[9.5px] font-black text-white shadow-xs ring-2 ring-white px-1 z-10">
                                        {(unreadCount + pendingSwapCount) > 9 ? '9+' : (unreadCount + pendingSwapCount)}
                                    </span>
                                )}
                            </Button>

                            <NotificationSheet
                                isOpen={isNotificationPanelOpen}
                                notifications={notifications}
                                unreadCount={unreadCount}
                                pendingSwapCount={pendingSwapCount}
                                onClose={() => toggleNotificationPanel(false)}
                                onNotificationClick={handleNotificationClick}
                                onMarkAllAsRead={handleMarkAllAsRead}
                                onOpenSwapInbox={() => { window.dispatchEvent(new CustomEvent('close-all-sheets', { detail: { except: 'swapInbox' } })); setIsSwapInboxOpen(true); }}
                                onRequestPermission={requestNotificationPermission}
                            />
                        </div>

                        <div className="app-navigation-divider w-px h-4 bg-slate-200/80 mx-1"></div>

                        {/* Profile Pill */}
                        <div ref={profileMenuRef} className="app-navigation-profile relative">
                            <button
                                type="button"
                                aria-label={`Tài khoản ${formatDisplayName(currentUser || currentUserName)}`}
                                title={formatDisplayName(currentUser || currentUserName) || 'Tài khoản'}
                                aria-expanded={isProfileMenuOpen}
                                aria-controls="app-profile-menu"
                                onClick={() => { window.dispatchEvent(new CustomEvent('close-all-sheets', { detail: { except: 'profileMenu' } })); setIsProfileMenuOpen(!isProfileMenuOpen); }}
                                className="app-navigation-profile-trigger flex items-center gap-2 cursor-pointer hover:bg-slate-100 py-1 px-2 rounded-xl transition-all border border-transparent group"
                            >
                                <div className="relative flex-shrink-0">
                                    <Avatar name={currentUser} size="sm" />
                                </div>
                                <div className="app-navigation-profile-copy flex flex-col items-start leading-tight">
                                    <span className="hidden sm:block text-[12px] font-extrabold text-slate-800 max-w-[130px] lg:max-w-[150px] truncate leading-tight" title={formatDisplayName(currentUser || currentUserName)}>
                                        {formatDisplayName(currentUser || currentUserName)}
                                    </span>
                                    {reputation && (
                                        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 text-emerald-700 font-extrabold text-[9.5px] px-1.5 py-0.5 rounded-md shadow-2xs leading-none mt-0.5" title={`Uy tín giữ xe: ${reputation.score}% (Đã ghép ${reputation.matched}/${reputation.total})`}>
                                            <span className="text-[9px]">⭐</span>
                                            <span>{reputation.score}%</span>
                                        </div>
                                    )}
                                </div>
                                <i className={`hidden lg:block fas fa-chevron-down text-[10px] text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`}></i>
                            </button>

                            {/* Dropdown Menu */}
                            {isProfileMenuOpen && (
                                <div id="app-profile-menu" className="app-navigation-profile-menu sidebar-popover absolute top-full right-0 mt-2 w-52 animate-fade-in-up origin-top-right z-[100]">
                                    {/* User Header */}
                                    <div className="sidebar-profile-header">
                                        <div className="relative flex-shrink-0">
                                            <Avatar name={currentUser} size="sm" />
                                        </div>
                                        <div className="sidebar-profile-copy">
                                            <p className="sidebar-profile-name">{formatDisplayName(currentUser || currentUserName) || 'User'}</p>
                                            <p className="sidebar-profile-role">{userRole || 'Member'}</p>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="sidebar-menu-actions">
                                        <button
                                            type="button"
                                            onClick={() => { onOpenChangePassword(); setIsProfileMenuOpen(false); }}
                                            className="sidebar-menu-item"
                                        >
                                            <span>Đổi mật khẩu</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => { onLogout(); setIsProfileMenuOpen(false); }}
                                            className="sidebar-menu-item is-danger"
                                        >
                                            <span>Đăng xuất</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header >

            {/* Global Notification Display */}
            {
                notification && notification.isActive && !isDismissed && (
                    <div className="app-announcement-banner w-full overflow-hidden relative z-40 h-7 flex items-center border-b border-white/10 shadow-md">
                        {/* Type-Specific Overlays */}
                        {notification.type === 'info' && <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 via-slate-900 to-blue-900/90 mix-blend-multiply"></div>}
                        {notification.type === 'warning' && <div className="absolute inset-0 bg-gradient-to-r from-amber-700/80 via-yellow-900/80 to-amber-700/80"></div>}
                        {notification.type === 'success' && <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-green-900 to-emerald-900/90"></div>}
                        {notification.type === 'danger' && <div className="absolute inset-0 bg-gradient-to-r from-red-900/90 via-rose-950 to-red-900/90"></div>}


                        {/* Static Badge/Label (Left Side) - Clickable for History */}
                        <div className="absolute left-0 z-20 h-full flex items-center pl-3 pr-4 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent">
                            <button
                                onClick={() => setIsNotificationHistoryOpen(true)}
                                className={`
                                    flex items-center gap-1.5 px-2 py-0.5 rounded-full border backdrop-blur-md shadow-sm
                                    border-yellow-500/40 bg-red-950/40 transition-transform hover:scale-105 active:scale-95 group cursor-pointer
                                `}
                                title="Xem lịch sử thông báo"
                            >
                                <img src={speakerAnim} alt="Speaker" className="w-5 h-5 object-contain drop-shadow-sm group-hover:rotate-12 transition-transform" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-yellow-200/90 group-hover:text-yellow-100">
                                    Thông Báo
                                </span>
                            </button>
                        </div>

                        {/* Scrolling Content - Seamless Loop - All Festive Text */}
                        <div className="flex items-center gap-16 animate-marquee-smooth whitespace-nowrap pl-24 sm:pl-28 relative z-10 w-fit">

                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <span key={i} className="text-xs font-medium tracking-wide flex items-center gap-3 text-yellow-50/90">
                                    {notification.content}
                                    <span className="w-1 h-1 rounded-full bg-yellow-500/30 ml-8"></span>
                                </span>
                            ))}
                        </div>

                        {/* Dismiss Button (Right Side) */}
                        <div className="absolute right-0 z-20 h-full flex items-center pr-3 pl-8 bg-gradient-to-l from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent">
                            <button
                                onClick={dismissNotification}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
                                title="Ẩn thông báo này"
                            >
                                <i className="fas fa-times text-[10px]"></i>
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Notification History Modal */}
            <NotificationDetailModal
                isOpen={isNotificationHistoryOpen}
                onClose={() => setIsNotificationHistoryOpen(false)}
            />

            {isChatEnabled && (
                <InternalChat
                    isOpen={isInternalChatOpen}
                    setIsOpen={setIsInternalChatOpen}
                    currentUser={currentUser}
                    currentUserName={currentUserName}
                    userRole={userRole}
                    setUnreadCount={setChatUnreadCount}
                />
            )}

            {isSwapInboxOpen && (
                <SwapInboxModal
                    currentUser={currentUser}
                    isAdmin={isCurrentUserAdmin}
                    onClose={() => {
                        setIsSwapInboxOpen(false);
                        fetchPendingSwapCount();
                    }}
                    showToast={(title, msg, type) => console.log(title, msg, type)}
                />
            )}

            <style>{`
                            @keyframes marquee-smooth {
                                0% { transform: translateX(0); }
                                100% { transform: translateX(-50%); }
                            }
                            .animate-marquee-smooth {
                                animation: marquee-smooth 60s linear infinite; /* Slower, smoother */
                                min-width: 200%; /* Ensure content is duplicated enough */
                                display: flex;
                            }
                            .animate-marquee-smooth:hover {
                                animation-play-state: paused;
                            }
                       `}</style>

        </>
    );
};

export default Header;
