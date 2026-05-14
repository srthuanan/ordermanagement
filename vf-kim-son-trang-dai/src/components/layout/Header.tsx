import React from 'react';
import { Menu, Bell, Plus } from 'lucide-react';
import { tabs, TabKey } from '../../constants';

interface HeaderProps {
  activeTab: TabKey;
  canCreateOrder: boolean;
  roleLabel?: string;
  setSidebarOpen: (val: boolean) => void;
  setCreateOpen: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  canCreateOrder,
  roleLabel,
  setSidebarOpen,
  setCreateOpen
}) => {
  const currentLabel = tabs.find((tab) => tab.key === activeTab)?.label || 'Hệ thống';

  return (
    <header className="topbar">
      <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} title="Mở menu">
        <Menu size={20} />
      </button>
      <div>
        <p className="eyebrow">Hệ thống quản lý đơn hàng</p>
        <h1>{currentLabel}</h1>
        {roleLabel ? <small>Quyền hiện tại: {roleLabel}</small> : null}
      </div>
      <div className="top-actions">
        <button className="icon-button" title="Thông báo">
          <Bell size={19} />
        </button>
        <button
          className="primary-button"
          onClick={() => setCreateOpen(true)}
          disabled={!canCreateOrder}
          title={canCreateOrder ? 'Tạo đơn' : 'Cần quyền Admin hoặc TVBH'}
        >
          <Plus size={18} />
          <span>Tạo đơn</span>
        </button>
      </div>
    </header>
  );
};
