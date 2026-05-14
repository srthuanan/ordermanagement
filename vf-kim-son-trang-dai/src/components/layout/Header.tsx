import React from 'react';
import { Menu, Bell, Plus, ChevronRight, type LucideIcon } from 'lucide-react';

interface HeaderProps {
  canCreateOrder: boolean;
  setSidebarOpen: (val: boolean) => void;
  setCreateOpen: (val: boolean) => void;
  activeTabLabel?: string;
  activeTabIcon?: LucideIcon;
}

export const Header: React.FC<HeaderProps> = ({
  canCreateOrder,
  setSidebarOpen,
  setCreateOpen,
  activeTabLabel,
  activeTabIcon: ActiveIcon
}) => {
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
      justifyContent: 'space-between'
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
      <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="icon-button" title="Thông báo" style={{ height: '34px', width: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <Bell size={16} style={{ color: '#64748b' }} />
        </button>
        
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
