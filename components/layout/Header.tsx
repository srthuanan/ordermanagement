import React from 'react';
import moment from 'moment';
import { Notification, NotificationType } from '../../types';
import logoxmasImg from '../../pictures/logoxmas.png';
import yeucauAnimationUrl from '../../pictures/yeucau.json?url';

interface HeaderProps {
    isSidebarCollapsed: boolean;
    setCreateRequestData: (data: { isOpen: boolean }) => void;
    toggleNotificationPanel: () => void;
    unreadCount: number;
    isNotificationPanelOpen: boolean;
    notifications: Notification[];
    handleMarkAllAsRead: (e: React.MouseEvent) => void;
    handleNotificationClick: (notification: Notification, e: React.MouseEvent) => void;
    onLogout: () => void;
    notificationContainerRef: React.RefObject<HTMLDivElement>;
}

const Header: React.FC<HeaderProps> = ({
    isSidebarCollapsed,
    setCreateRequestData,
    toggleNotificationPanel,
    unreadCount,
    isNotificationPanelOpen,
    notifications,
    handleMarkAllAsRead,
    handleNotificationClick,
    onLogout,
    notificationContainerRef
}) => {


    return (
        <header className={`relative sticky top-0 w-full z-20 h-14 bg-surface-card/70 backdrop-blur-xl border-b border-border-primary/50 flex items-center justify-between px-4 sm:px-6`}>
            <div className="flex items-center gap-4">

            </div>

            <div className={`absolute -translate-x-1/2 hidden sm:flex items-center left-1/2 ${isSidebarCollapsed ? 'lg:left-[calc(50%-3rem)]' : 'lg:left-[calc(50%-9rem)]'}`}>
                <img
                    src={logoxmasImg}
                    alt="Order Management Logo"
                    className="h-14 object-contain"
                />
            </div>

            <div className="flex items-center justify-end space-x-2 sm:space-x-4">
                <div
                    onClick={() => setCreateRequestData({ isOpen: true })}
                    title="Tạo Yêu Cầu Mới"
                    className="cursor-pointer transition-transform hover:scale-105 active:scale-95"
                >
                    <lottie-player
                        src={yeucauAnimationUrl}
                        background="transparent"
                        speed="1"
                        style={{ width: '250px', height: '120px', marginTop: '-10px', marginBottom: '-10px' }}
                        loop
                        autoplay
                    />
                </div>

                <div ref={notificationContainerRef} className="relative notification-bell-container">
                    <button onClick={toggleNotificationPanel} className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-accent-primary transition-colors" title="Thông báo">
                        <i className="fa-solid fa-bell"></i>
                        {unreadCount > 0 && (<span id="notification-badge" className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>)}
                    </button>
                    <div className={`notification-panel ${isNotificationPanelOpen ? 'visible' : ''}`}>
                        <div className="notification-panel-header flex justify-between items-center">
                            <span>Thông Báo</span>
                            {unreadCount > 0 && <button onClick={handleMarkAllAsRead} className="text-xs font-medium text-accent-secondary hover:text-accent-primary-hover transition-colors">Đánh dấu đã đọc tất cả</button>}
                        </div>
                        <div className="notification-list">
                            {notifications.length > 0 ? (
                                notifications.map(notification => {
                                    const iconMap: Record<NotificationType, string> = { success: 'fa-check', danger: 'fa-times-circle', warning: 'fa-exclamation-triangle', info: 'fa-info-circle', error: 'fa-times-circle' };
                                    const type = notification.type === 'error' ? 'danger' : notification.type;
                                    return (
                                        <div key={notification.id} className={`notification-item ${!notification.isRead ? 'unread' : ''}`} onClick={(e) => handleNotificationClick(notification, e)}>
                                            <div className={`notification-icon type-${type}`}><i className={`fa-solid ${iconMap[type] || 'fa-bell'}`}></i></div>
                                            <div className="notification-content">
                                                <p className="notification-message" dangerouslySetInnerHTML={{ __html: notification.message }}></p>
                                                <p className="notification-time">{moment(notification.timestamp).fromNow()}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (<div className="no-notifications"><i className="fa-solid fa-bell-slash"></i><p>Không có thông báo nào.</p></div>)}
                        </div>
                    </div>
                </div>
                <button onClick={onLogout} className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-danger transition-colors" title="Đăng xuất">
                    <i className="fa-solid fa-sign-out-alt"></i>
                </button>
            </div>
        </header>
    );
};

export default Header;
