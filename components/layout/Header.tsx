import React from 'react';
import moment from 'moment';
import { Notification, NotificationType } from '../../types';

import yeucauAnimationUrl from '../../pictures/yeucau.json?url';
import logo1 from '../../pictures/logo1.png';
import Button from '../ui/Button';
import Avatar from '../ui/Avatar';

import { ActiveView } from '../../hooks/useAppNavigation';

interface HeaderProps {
    setCreateRequestData: (data: { isOpen: boolean }) => void;
    toggleNotificationPanel: () => void;
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
    isChatEnabled: boolean;
    isTogglingChat: boolean;
    handleToggleChatGlobal: () => void;
    requestNotificationPermission: () => Promise<boolean>;
    reputation?: { score: number; total: number; matched: number };
    onOpenBacklogReport?: () => void;
    isReferenceAccount?: boolean;
}


import { useGlobalNotificationContext } from '../context/GlobalNotificationContext';
import bellIcon from '../../pictures/bell_fixed.gif';

import speakerAnim from '../../pictures/speaker_anim.gif';
import NotificationDetailModal from '../modals/NotificationDetailModal';
import InternalChat from '../chat/InternalChat';

const getCompactTime = (timestamp: any) => {
    const min = moment().diff(moment(timestamp), 'minutes');
    if (min < 1) return 'Vừa xong';
    if (min < 60) return `${min}p`;
    const hr = moment().diff(moment(timestamp), 'hours');
    if (hr < 24) return `${hr}h`;
    const day = moment().diff(moment(timestamp), 'days');
    if (day < 7) return `${day}d`;
    return moment(timestamp).format('DD/MM');
};

const Header: React.FC<HeaderProps> = ({
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
    isChatEnabled,
    isTogglingChat: _isTogglingChat,
    handleToggleChatGlobal: _handleToggleChatGlobal,
    requestNotificationPermission,
    reputation,
    onOpenBacklogReport,
    isReferenceAccount
}) => {


    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);
    const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = React.useState(false);
    const profileMenuRef = React.useRef<HTMLDivElement>(null);
    const [isInternalChatOpen, setIsInternalChatOpen] = React.useState(false);
    const [chatUnreadCount, setChatUnreadCount] = React.useState(0);
    // Use it to satisfy lint
    React.useEffect(() => {
        if (chatUnreadCount > 0) console.log(`Unread chats: ${chatUnreadCount}`);
    }, [chatUnreadCount]);

    const { notification, dismissNotification, isDismissed } = useGlobalNotificationContext();


    // Click outside for profile menu
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);



    const navItems = [
        { id: 'orders', label: 'Đơn Hàng', icon: 'fa-car-side' },
        { id: 'stock', label: 'Kho Xe', icon: 'fa-warehouse' },
        { id: 'map', label: 'Bản Đồ', icon: 'fa-map-location-dot' },
        { id: 'inquiry', label: 'Tra Cứu', icon: 'fa-search-location' },
        { id: 'laithu', label: 'Lái Thử', icon: 'fa-gauge-high' },
        { id: 'sold', label: 'Lịch Sử', icon: 'fa-receipt' },
    ];

    if (isCurrentUserAdmin) {
        navItems.push({ id: 'admin', label: 'Admin', icon: 'fa-user-shield' });
    }

    return (
        <>
            <header className={`relative sticky top-0 w-full z-[1010] h-14 bg-surface-card/95 backdrop-blur-md border-b border-border-primary/50 flex items-center justify-between px-4 sm:px-6 shadow-sm`}>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <img src={logo1} alt="OrderMgmt" className="h-11 w-auto -ml-2 object-contain" />
                    </div>
                </div>

                {/* Top Navigation — Compact Pill */}
                <nav className="hidden lg:flex items-center gap-0.5 absolute left-1/2 transform -translate-x-1/2 bg-black/[0.04] backdrop-blur-2xl px-1.5 py-1.5 rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.07)] transition-all duration-300">
                    {navItems.map((item) => {
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveView(item.id as any)}
                                title={item.label}
                                className={`
                                    relative h-8 rounded-xl font-semibold flex items-center justify-center overflow-hidden
                                    transition-all duration-300 ease-out outline-none group
                                    ${isActive
                                        ? 'bg-white text-slate-800 shadow-[0_1px_6px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)] px-4 gap-2'
                                        : 'text-gray-400 hover:text-gray-600 hover:bg-white/60 w-9'
                                    }
                                `}
                            >
                                <i className={`fas ${item.icon} text-[13px] flex-shrink-0 transition-all duration-300 ${isActive ? 'text-slate-700' : 'group-hover:scale-110'}`}></i>
                                {isActive && (
                                    <span className="text-[11px] font-semibold tracking-wide whitespace-nowrap text-slate-700">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>


                <div className="flex items-center justify-end gap-1.5 sm:gap-3 relative z-10">
                    {!isReferenceAccount && (
                        <div
                            onClick={() => setCreateRequestData({ isOpen: true })}
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
                    <div className="flex items-center bg-white/70 backdrop-blur-2xl p-0.5 sm:p-1 rounded-2xl border border-white/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] gap-0.5 transition-all">
                        {isReferenceAccount && (
                            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shadow-sm animate-pulse mx-1">
                                <i className="fa-solid fa-eye text-amber-600 text-xs"></i>
                                <span className="text-[10px] font-black text-amber-700 tracking-tighter uppercase whitespace-nowrap">BẢN THAM KHẢO (CHỈ XEM)</span>
                            </div>
                        )}

                        {onOpenBacklogReport && !isReferenceAccount && (
                            <Button 
                                onClick={onOpenBacklogReport}
                                variant="ghost"
                                className="h-8 px-2.5 rounded-xl flex items-center justify-center gap-2 text-orange-600 hover:bg-orange-50 hover:shadow-sm transition-all group lg:mr-0.5"
                                title="Báo Cáo Đơn Tồn (Chưa lấy xe)"
                            >
                                <div className="relative">
                                    <i className="fas fa-pause-circle text-[14px]"></i>
                                    <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-orange-500 ring-1 ring-white animate-pulse"></span>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">Báo Đơn Tồn</span>
                            </Button>
                        )}

                        {/* Portal for Admin Actions or View-specific actions */}
                        <div id="admin-portal-target" className="flex items-center"></div>

                        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 relative">
                            {isCurrentUserAdmin && (
                                <>
                                    <Button
                                        onClick={onOpenGlobalSearch}
                                        variant="ghost"
                                        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center !p-0 text-gray-400 hover:text-blue-600 hover:bg-white hover:shadow-sm transition-all"
                                        title="Tìm kiếm toàn cục"
                                    >
                                        <i className="fas fa-search text-[13px]"></i>
                                    </Button>
                                    <Button
                                        onClick={handleToggleStockGlobal}
                                        variant="ghost"
                                        disabled={isTogglingStock}
                                        className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center !p-0 transition-all hover:bg-white hover:shadow-sm ${isStockEnabled ? 'text-indigo-500' : 'text-gray-400'}`}
                                        title={isStockEnabled ? 'Ẩn kho xe' : 'Hiện kho xe'}
                                    >
                                        <i className={`fas ${isTogglingStock ? 'fa-spinner fa-spin' : (isStockEnabled ? 'fa-eye-slash' : 'fa-warehouse')} text-[13px]`}></i>
                                    </Button>
                                    <Button
                                        onClick={_handleToggleChatGlobal}
                                        variant="ghost"
                                        disabled={_isTogglingChat}
                                        className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center !p-0 transition-all hover:bg-white hover:shadow-sm ${isChatEnabled ? 'text-blue-500' : 'text-gray-400'}`}
                                        title={isChatEnabled ? 'Tắt trợ lý AI' : 'Bật trợ lý AI'}
                                    >
                                        <i className={`fas ${_isTogglingChat ? 'fa-spinner fa-spin' : (isChatEnabled ? 'fa-robot' : 'fa-user-slash')} text-[13px]`}></i>
                                    </Button>
                                </>
                            )}
                        </div>

                        <div ref={notificationContainerRef} className="static sm:relative">
                            <Button onClick={toggleNotificationPanel} variant="ghost" className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center !p-0 hover:bg-white hover:shadow-sm transition-all group" title="Thông báo">
                                <img src={bellIcon} alt="Notifications" className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" />
                                {unreadCount > 0 && (<span id="notification-badge" className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow ring-1 ring-white px-0.5 z-10">{unreadCount > 9 ? '9+' : unreadCount}</span>)}
                            </Button>
                            <div className={`notification-panel !fixed md:!absolute top-[56px] md:top-[calc(100%+12px)] left-0 right-0 md:left-auto md:right-0 w-full md:w-[360px] h-auto max-h-[40dvh] md:max-h-[300px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] border-t md:border border-slate-200 md:border-white/60 md:rounded-2xl transition-all duration-300 origin-top z-[10000] flex-col ${isNotificationPanelOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>



                                <div className="notification-panel-header flex justify-between items-center !px-4 !py-3 !bg-slate-50/50 !border-b !border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">Thông Báo</span>
                                        {unreadCount > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold shadow-[0_2px_8px_rgba(239,68,68,0.4)]">{unreadCount}</span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {/* Browser Notification Permission Button */}
                                        {('Notification' in window) && window.Notification.permission !== 'granted' && (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    await requestNotificationPermission();
                                                }}
                                                className="text-[10px] font-bold bg-white text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-50 transition-all border border-blue-100/50 shadow-sm flex items-center gap-1.5"
                                                title="Cho phép thông báo đẩy trên trình duyệt"
                                            >
                                                <i className="fas fa-bell"></i>
                                                <span>Bật đẩy</span>
                                            </button>
                                        )}
                                        {unreadCount > 0 && <Button onClick={handleMarkAllAsRead} variant="ghost" size="sm" className="text-[10px] font-medium text-slate-400 hover:text-blue-600 transition-colors !h-auto !p-0">Đánh dấu tất cả đã đọc</Button>}
                                    </div>
                                </div>

                                <div className="notification-list p-2 flex flex-col gap-1.5 flex-1 overflow-y-auto bg-slate-50/50">
                                    {notifications.length > 0 ? (
                                        notifications.map((notification, index) => {
                                            const iconMap: Record<NotificationType, { icon: string, color: string }> = {
                                                success: { icon: 'fa-check-circle', color: 'text-emerald-600' },
                                                danger: { icon: 'fa-times-circle', color: 'text-red-600' },
                                                warning: { icon: 'fa-exclamation-triangle', color: 'text-amber-600' },
                                                info: { icon: 'fa-info-circle', color: 'text-blue-600' },
                                                error: { icon: 'fa-times-circle', color: 'text-red-600' },
                                                stock_hero: { icon: 'fa-car', color: 'text-indigo-600' },
                                                broadcast: { icon: 'fa-bullhorn', color: 'text-red-600' }
                                            };
                                            const type = notification.type === 'error' ? 'danger' : notification.type;
                                            const iconDef = iconMap[type as NotificationType] || { icon: 'fa-bell', color: 'text-slate-400' };
                                            return (
                                                <div
                                                    key={notification.id || index}
                                                    className={`relative px-3 py-2.5 flex cursor-pointer transition-all rounded-xl border hover:shadow-md hover:-translate-y-[1px] ${!notification.isRead ? 'bg-white border-blue-200 shadow-sm shadow-blue-500/5' : 'bg-white/60 border-slate-200/60 shadow-sm hover:border-slate-300 hover:bg-white'}`}
                                                    onClick={(e) => handleNotificationClick(notification, e)}
                                                >
                                                    {!notification.isRead && (
                                                        <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-blue-500 rounded-l-xl opacity-80"></div>
                                                    )}
                                                    <div className="flex-1 min-w-0 flex items-start gap-3">
                                                        <div className="flex-1 min-w-0 flex items-start gap-2">
                                                            <div className={`flex-shrink-0 mt-[2px] ${iconDef.color}`}>
                                                                <i className={`fa-solid ${iconDef.icon} text-[11px]`}></i>
                                                            </div>
                                                            <div className={`text-[12px] leading-relaxed ${!notification.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-500'}`} dangerouslySetInnerHTML={{ __html: notification.message }}></div>
                                                        </div>
                                                        <div className="flex-shrink-0 flex flex-col items-end gap-1.5 mt-0.5">
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap">
                                                                {getCompactTime(notification.timestamp)}
                                                             </p>
                                                            {index === 0 && !notification.isRead && (
                                                                <span className="text-[8px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded shadow-sm border border-blue-200">MỚI</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (<div className="no-notifications flex flex-col items-center justify-center py-12"><i className="fa-solid fa-bell-slash text-2xl text-slate-300 mb-3 block"></i><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không có thông báo nào</p></div>)}
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-3 sm:h-4 bg-gray-200 mx-0.5"></div>

                        <div ref={profileMenuRef} className="relative">
                            <div
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="flex items-center gap-1 sm:gap-1.5 cursor-pointer hover:bg-white py-0.5 px-0.5 sm:px-1 sm:pr-2 rounded-xl transition-all border border-transparent hover:shadow-sm hover:border-gray-100 group"
                            >
                                <div className="relative">
                                    <Avatar name={currentUser} size="sm" />
                                    <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-green-500 ring-1 ring-white"></span>
                                </div>
                                <div className="flex flex-col items-start -space-y-0.5">
                                    <span className="hidden sm:block text-[11px] lg:text-[12px] font-bold text-gray-700 max-w-[60px] lg:max-w-[80px] truncate">{currentUser}</span>
                                    {reputation && (
                                        <div className="flex items-center gap-1 lg:group-hover:scale-105 transition-transform" title={`Uy tín giữ xe: ${reputation.score}% (Đã khớp ${reputation.matched}/${reputation.total})`}>
                                            <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                            <span className="text-[8px] sm:text-[9px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">R:{reputation.score}%</span>
                                        </div>
                                    )}
                                </div>
                                <i className={`hidden lg:block fas fa-chevron-down text-[9px] text-gray-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`}></i>
                            </div>

                            {/* Dropdown Menu */}
                            {isProfileMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.06)] py-1.5 animate-fade-in-up origin-top-right z-[100] overflow-hidden">

                                    {/* User Header */}
                                    <div className="px-3 py-2.5 mx-1.5 mb-1 rounded-xl bg-gradient-to-br from-slate-50 to-gray-100/80 flex items-center gap-2.5">
                                        <div className="relative flex-shrink-0">
                                            <Avatar name={currentUser} size="sm" />
                                            <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white shadow-sm"></span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-[13px] text-gray-900 truncate leading-tight">{currentUser || 'User'}</p>
                                            <p className="text-[11px] text-gray-400 capitalize leading-tight">{userRole || 'Member'}</p>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    <div className="px-1.5 space-y-0.5">
                                        <button
                                            onClick={() => { onOpenChangePassword(); setIsProfileMenuOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] text-gray-700 hover:bg-gray-100 transition-colors text-left group"
                                        >
                                            <span className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                                <i className="fas fa-key text-[11px]"></i>
                                            </span>
                                            <span className="font-medium">Đổi mật khẩu</span>
                                        </button>
                                        <div className="h-px bg-gray-100 my-1"></div>

                                        <button
                                            onClick={() => { onLogout(); setIsProfileMenuOpen(false); }}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] text-red-500 hover:bg-red-50 transition-colors text-left group"
                                        >
                                            <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 flex-shrink-0 group-hover:bg-red-100 transition-colors">
                                                <i className="fas fa-sign-out-alt text-[11px]"></i>
                                            </span>
                                            <span className="font-medium">Đăng xuất</span>
                                        </button>
                                    </div>

                                    <div className="h-1.5"></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header >

            {/* Global Notification Display */}
            {
                notification && notification.isActive && !isDismissed && (
                    <div className="w-full overflow-hidden relative z-40 h-7 flex items-center border-b border-white/10 shadow-md">
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
