import React from 'react';
import { UserRound, LogOut, LockKeyhole, User, type LucideIcon } from 'lucide-react';
import { TabKey, getVisibleTabs, roleLabels } from '../../constants';
import { ProfileRow } from '../../types';

interface SidebarProps {
  activeTab: TabKey;
  setActiveTab: (key: TabKey) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (val: boolean) => void;
  profile: ProfileRow | null;
  visibleTabs: { key: TabKey; label: string; icon: LucideIcon }[];
  userEmail?: string;
  onSignOut: () => void;
  onChangePassword: () => void;
  onEditProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  profile,
  visibleTabs,
  userEmail,
  onSignOut,
  onChangePassword,
  onEditProfile
}) => {
  const tabs = visibleTabs.length ? visibleTabs : getVisibleTabs(profile?.role ?? 'sales');

  return (
    <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark">VF</div>
        <div>
          <strong>VF KIM SƠN</strong>
          <span>TRẢNG DÀI</span>
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

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #0f766e, #14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <UserRound size={18} strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {profile?.full_name ?? userEmail ?? 'Người dùng'}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Vai trò: {profile ? roleLabels[profile.role] : 'Chưa có profile'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button 
            onClick={onSignOut}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid transparent', background: '#fff1f2', color: '#e11d48', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', outline: 'none', marginTop: '4px' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ffe4e6'; e.currentTarget.style.color = '#be123c'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.color = '#e11d48'; }}
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </div>
    </aside>
  );
};
