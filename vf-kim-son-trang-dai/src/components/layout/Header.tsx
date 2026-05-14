import React from 'react';
import { Menu, Bell, Plus } from 'lucide-react';

interface HeaderProps {
  canCreateOrder: boolean;
  setSidebarOpen: (val: boolean) => void;
  setCreateOpen: (val: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  canCreateOrder,
  setSidebarOpen,
  setCreateOpen
}) => {
  return (
    <header className="topbar">
      <button className="icon-button mobile-only" onClick={() => setSidebarOpen(true)} title="Mở menu">
        <Menu size={20} />
      </button>
      <div />
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
