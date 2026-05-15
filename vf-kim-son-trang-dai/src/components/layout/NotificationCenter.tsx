import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCircle2, Clock3, AlertTriangle, Info, type LucideIcon } from 'lucide-react';
import type { AppNotification, NotificationTone } from '../../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
}

const toneConfig: Record<NotificationTone, { icon: LucideIcon; border: string; background: string; color: string }> = {
  info: {
    icon: Info,
    border: '#bfdbfe',
    background: '#eff6ff',
    color: '#1d4ed8'
  },
  success: {
    icon: CheckCircle2,
    border: '#b7ebcc',
    background: '#ecfdf5',
    color: '#047857'
  },
  warning: {
    icon: Clock3,
    border: '#fde68a',
    background: '#fffbeb',
    color: '#b45309'
  },
  danger: {
    icon: AlertTriangle,
    border: '#fecdd3',
    background: '#fff1f2',
    color: '#be123c'
  }
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications }) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const unreadCount = notifications.length;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const visibleNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      <button
        className="icon-button"
        type="button"
        title="Trung tâm thông báo"
        aria-label="Mở trung tâm thông báo"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        style={{
          height: '34px',
          width: '34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          position: 'relative'
        }}
      >
        <Bell size={16} style={{ color: '#64748b' }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              minWidth: '18px',
              height: '18px',
              padding: '0 5px',
              borderRadius: '999px',
              background: '#be123c',
              color: 'white',
              fontSize: '10px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid white'
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Trung tâm thông báo"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 12px)',
            width: '380px',
            maxWidth: 'calc(100vw - 24px)',
            background: 'white',
            border: '1px solid #dbe3ea',
            borderRadius: '16px',
            boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)',
            overflow: 'hidden',
            zIndex: 60
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
            }}
          >
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Trung tâm thông báo</div>
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                Dữ liệu được tổng hợp từ trạng thái hệ thống và nghiệp vụ hiện tại.
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '28px',
                height: '28px',
                padding: '0 8px',
                borderRadius: '999px',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 800
              }}
            >
              {unreadCount}
            </span>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '10px' }}>
            {visibleNotifications.length === 0 ? (
              <div
                style={{
                  padding: '18px 14px',
                  border: '1px dashed #dbe3ea',
                  borderRadius: '12px',
                  color: '#64748b',
                  fontSize: '13px',
                  textAlign: 'center'
                }}
              >
                Chưa có thông báo mới.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {visibleNotifications.map((item) => {
                  const config = toneConfig[item.tone];
                  const Icon = config.icon;

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: `1px solid ${config.border}`,
                        background: config.background,
                        color: config.color,
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '10px',
                          background: 'rgba(255,255,255,0.75)',
                          display: 'grid',
                          placeItems: 'center',
                          flex: '0 0 auto'
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                          {item.title}
                        </div>
                        <div style={{ marginTop: '3px', fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                          {item.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
