import React from 'react';
import { UserRound, LogOut } from 'lucide-react';
import { tabs, TabKey, roleLabels } from '../../constants';
import { ProfileRow } from '../../types';

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (key: TabKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  profile: ProfileRow | null;
  userEmail?: string;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  profile,
  userEmail,
  onSignOut
}) => {
  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">VF</div>
        <div>
          <strong>VF KIM SƠN</strong>
          <span>TRANG DÀI</span>
        </div>
      </div>

      <nav className="nav-list" aria-label="Điều hướng chính">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={activeTab === tab.key ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                setActiveTab(tab.key as TabKey);
                setSidebarOpen(false);
              }}
              title={tab.label}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="operator">
          <UserRound size={18} />
          <div>
            <strong>{profile?.full_name ?? userEmail ?? 'Người dùng'}</strong>
            <span>Vai trò: {profile ? roleLabels[profile.role] : 'Chưa có profile'}</span>
          </div>
        </div>
        <button className="ghost-button" title="Đăng xuất" onClick={onSignOut}>
          <LogOut size={17} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
