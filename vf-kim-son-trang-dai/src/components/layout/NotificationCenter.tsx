import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCircle2, Clock3, AlertTriangle, Info } from 'lucide-react';
import type { AppNotification } from '../../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
}

const toneMeta = {
  info: {
    icon: Info,
    accent: '#2563eb',
    background: '#eff6ff'
  },
  success: {
    icon: CheckCircle2,
    accent: '#0f766e',
    background: '#e9f7f2'
  },
  warning: {
    icon: Clock3,
    accent: '#a15c18',
    background: '#fff8ec'
  },
  danger: {
    icon: AlertTriangle,
    accent: '#b42318',
    background: '#fff8f6'
  }
} as const;

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
            width: '360px',
            maxWidth: 'calc(100vw - 24px)',
            zIndex: 60
          }}
        >
          <div className={`sync-banner sync-${unreadCount > 0 ? 'live' : 'idle'}`} style={{ marginBottom: '10px' }}>
            <span style={{ display: 'inline-flex', width: '18px', justifyContent: 'center' }}>
              <Bell size={16} />
            </span>
            <span>Trung tâm thông báo</span>
            <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{unreadCount}</span>
          </div>

          <div
            style={{
              border: '1px solid #d9ded5',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.96)',
              boxShadow: '0 18px 48px rgba(45, 58, 50, 0.08)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Thông báo mới nhất</div>
              <div style={{ marginTop: '3px', fontSize: '11.5px', color: '#64748b' }}>
                Theo đúng giao diện đậm chất hệ thống của dự án.
              </div>
            </div>

            <div style={{ padding: '12px' }}>
              {visibleNotifications.length === 0 ? (
                <div className="alert-item" style={{ justifyContent: 'center', color: '#64748b' }}>
                  Chưa có thông báo mới.
                </div>
              ) : (
                <div className="alert-list" style={{ marginTop: 0 }}>
                  {visibleNotifications.map((item) => {
                    const meta = toneMeta[item.tone];
                    const Icon = meta.icon;

                    return (
                      <div
                        key={item.id}
                        className="alert-item"
                        style={{
                          background: meta.background,
                          alignItems: 'flex-start',
                          border: '1px solid rgba(217, 222, 213, 0.7)'
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            display: 'grid',
                            placeItems: 'center',
                            background: '#fff',
                            flex: '0 0 auto',
                            border: `1px solid ${meta.accent}22`
                          }}
                        >
                          <Icon size={15} style={{ color: meta.accent }} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', lineHeight: 1.35 }}>
                            {item.title}
                          </div>
                          <p>{item.message}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
