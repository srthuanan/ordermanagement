import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, ChevronRight, Bell, CheckCircle2, type LucideIcon } from 'lucide-react';
import { useNotifications, AdminNotification } from '../../hooks/useNotifications';

interface HeaderProps {
  canCreateOrder: boolean;
  isAdmin?: boolean;
  setSidebarOpen: (val: boolean) => void;
  setCreateOpen: (val: boolean) => void;
  activeTabLabel?: string;
  activeTabIcon?: LucideIcon;
}

export const Header: React.FC<HeaderProps> = ({
  canCreateOrder,
  isAdmin = false,
  setSidebarOpen,
  setCreateOpen,
  activeTabLabel,
  activeTabIcon: ActiveIcon
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(isAdmin);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="topbar" style={{ 
      minHeight: '54px', 
      height: '54px', 
      padding: '0 20px', 
      background: 'rgba(255, 255, 255, 0.85)', 
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #cbd5e1',
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.02)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative'
    }}>
      {/* Mobile Open Button & Active Tab Context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} title="Mở menu" style={{ padding: '6px', height: '32px', width: '32px' }}>
          <Menu size={18} />
        </button>
        
        {/* High-end Dynamic Title Breadcrumb */}
        <div className="desktop-only" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '12px', fontWeight: 500 }}>
          <span>Hệ thống</span>
          <ChevronRight size={12} strokeWidth={2.5} style={{ color: '#94a3b8' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px', color: '#0f172a', fontWeight: 700, border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
            {ActiveIcon && <ActiveIcon size={14} className="text-primary" style={{ color: '#0f766e' }} />}
            <span>{activeTabLabel || 'Bảng điều khiển'}</span>
          </div>
        </div>

        <div className="mobile-only" style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
          {activeTabLabel || 'Trang chủ'}
        </div>
      </div>

      {/* Compact Global Actions */}
      <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* Notification Bell */}
        {isAdmin && (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="icon-button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              style={{ position: 'relative', border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', color: '#64748b' }}
              title="Thông báo"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, background: '#ef4444', color: '#fff',
                  fontSize: '10px', fontWeight: 'bold', width: '16px', height: '16px', 
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
              <div style={{
                position: 'absolute', top: '40px', right: '-10px', width: '320px',
                background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column',
                maxHeight: '400px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>Thông báo</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAllAsRead()}
                      style={{ fontSize: '12px', color: '#0f766e', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Đánh dấu đã đọc tất cả
                    </button>
                  )}
                </div>
                <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                      Không có thông báo nào.
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => {
                          if (!notif.is_read) markAsRead(notif.id);
                        }}
                        style={{
                          padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                          background: notif.is_read ? '#fff' : '#f0fdfa',
                          cursor: 'pointer', transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                          <div style={{ marginTop: '2px' }}>
                            {notif.is_read ? (
                              <CheckCircle2 size={16} color="#94a3b8" />
                            ) : (
                              <div style={{ width: '8px', height: '8px', background: '#0ea5e9', borderRadius: '50%', marginTop: '4px' }} />
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: notif.is_read ? 400 : 500, lineHeight: 1.4 }}>
                              {notif.message}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                              {new Date(notif.created_at).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          className="primary-button"
          onClick={() => setCreateOpen(true)}
          disabled={!canCreateOrder}
          title={canCreateOrder ? 'Tạo đơn' : 'Cần quyền Admin hoặc TVBH'}
          style={{ 
            height: '34px', 
            padding: '0 12px', 
            fontSize: '12px', 
            borderRadius: '8px', 
            gap: '4px',
            fontWeight: 600,
            boxShadow: '0 1px 2px rgba(15, 118, 110, 0.2)'
          }}
        >
          <Plus size={15} strokeWidth={2.5} />
          <span>Tạo đơn</span>
        </button>
      </div>
    </header>
  );
};
