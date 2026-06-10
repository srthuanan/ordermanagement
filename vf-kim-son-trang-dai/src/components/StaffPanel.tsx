import React from 'react';
import {
  BadgePlus,
  Mail,
  RefreshCw,
  ShieldCheck,
  Trash2,
  RotateCw,
  Users,
  Search,
  MailCheck,
  UserRound,
  Clock3,
  Plus,
  X,
  Send,
  ExternalLink,
  Copy
} from 'lucide-react';
import { ProfileRow } from '../types';
import { cancelStaffInvite, inviteStaffMember, resendStaffInvite, updateStaffPermission } from '../services/apiService';
import { roleLabels } from '../constants';

type StaffPanelProps = {
  staff: ProfileRow[];
  currentProfile: ProfileRow | null;
  onReload: () => Promise<boolean>;
  onEditProfile?: () => void;
  onChangePassword?: () => void;
};

export const StaffPanel: React.FC<StaffPanelProps> = ({ staff, currentProfile, onReload, onEditProfile, onChangePassword }) => {
  const [email, setEmail] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'sales' | 'manager'>('sales');
  const [department, setDepartment] = React.useState('');
  const [inviteManagerId, setInviteManagerId] = React.useState('');
  const [permissionRole, setPermissionRole] = React.useState<'sales' | 'manager'>('sales');
  const [permissionDepartment, setPermissionDepartment] = React.useState('');
  const [permissionManagerId, setPermissionManagerId] = React.useState('');
  const [permissionLoading, setPermissionLoading] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [selectedEmail, setSelectedEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [rowAction, setRowAction] = React.useState<{ email: string; action: 'resend' | 'cancel' } | null>(null);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const getStatusLabel = (item: ProfileRow) => {
    if (item.activated_at || item.invite_status === 'active') return 'Đã kích hoạt';
    if (item.invite_status === 'recovery_sent') return 'Đã gửi link';
    if (item.invite_status === 'invite_sent') return 'Đã gửi lời mời';
    if (item.invite_status === 'canceled') return 'Đã hủy mời';
    return 'Chưa kích hoạt';
  };

  const getRowEmail = (item: ProfileRow) => item.email?.trim().toLowerCase() || item.id;

  const isAdmin = currentProfile?.role === 'admin';
  const isManager = currentProfile?.role === 'manager';
  const isSales = currentProfile?.role === 'sales';
  const isPersonalView = isSales;
  const managerOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return staff
      .filter((item) => item.role === 'manager' && item.department?.trim())
      .map((item) => ({
        id: item.id,
        department: item.department!.trim(),
        label: `${item.full_name} · ${item.department!.trim()}`
      }))
      .filter((item) => {
        const key = item.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [staff]);

  const getManagerLabel = (managerId?: string | null) => {
    if (!managerId) return '';
    return managerOptions.find((item) => item.id === managerId)?.label || '';
  };
  const visibleStaff = React.useMemo(() => {
    // Hide canceled/deleted users from the UI
    const activeStaff = staff.filter(item => item.invite_status !== 'canceled');

    if (isAdmin) {
      return activeStaff;
    }

    if (isManager && currentProfile) {
      return activeStaff.filter(
        (item) =>
          item.department === currentProfile.department &&
          currentProfile.department !== null &&
          currentProfile.department !== ''
      );
    }

    if (isSales && currentProfile) {
      return activeStaff.filter((item) => item.id === currentProfile.id);
    }

    return [];
  }, [currentProfile, isAdmin, isManager, isSales, staff]);

  const filteredStaff = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return visibleStaff;
    return visibleStaff.filter((item) => {
      const email = item.email?.toLowerCase() || item.id.toLowerCase();
      return (
        item.full_name.toLowerCase().includes(normalized) ||
        (item.department || '').toLowerCase().includes(normalized) ||
        email.includes(normalized) ||
        roleLabels[item.role].toLowerCase().includes(normalized) ||
        getStatusLabel(item).toLowerCase().includes(normalized)
      );
    });
  }, [query, visibleStaff]);

  const selectedStaff = React.useMemo(
    () => filteredStaff.find((item) => getRowEmail(item) === selectedEmail) || filteredStaff[0] || null,
    [filteredStaff, selectedEmail]
  );

  React.useEffect(() => {
    if (!selectedStaff) return;
    setPermissionRole(selectedStaff.role === 'manager' ? 'manager' : 'sales');
    setPermissionDepartment(selectedStaff.department || '');
    setPermissionManagerId(selectedStaff.manager_id || '');
  }, [selectedStaff]);

  React.useEffect(() => {
    if (inviteRole === 'sales') {
      setDepartment('');
    } else {
      setInviteManagerId('');
    }
  }, [inviteRole]);

  React.useEffect(() => {
    if (!filteredStaff.length) {
      setSelectedEmail('');
      return;
    }
    if (!selectedEmail || !filteredStaff.some((item) => getRowEmail(item) === selectedEmail)) {
      setSelectedEmail(getRowEmail(filteredStaff[0]));
    }
  }, [filteredStaff, selectedEmail]);

  const totalStaff = visibleStaff.length;
  const adminCount = visibleStaff.filter((item) => item.role === 'admin').length;
  const managerCount = visibleStaff.filter((item) => item.role === 'manager').length;
  const salesCount = visibleStaff.filter((item) => item.role === 'sales').length;
  const pendingCount = visibleStaff.filter((item) => item.invite_status !== 'active' && item.invite_status !== 'canceled').length;
  const inactiveCount = visibleStaff.filter((item) => item.invite_status === 'canceled').length;

  const runStaffAction = async (
    action: 'resend' | 'cancel',
    item: ProfileRow,
    handler: typeof resendStaffInvite
  ) => {
    const email = getRowEmail(item);
    setRowAction({ email, action });
    setSuccess('');
    setError('');

    try {
      const { data, error: actionError } = await handler({
        email: item.email || '',
        fullName: item.full_name || '',
        role: item.role === 'manager' ? 'manager' : 'sales',
        department: item.department || null,
        managerId: item.manager_id || null,
        staffId: item.id
      });

      if (actionError) {
        throw actionError;
      }

      const delivery = (data as any)?.delivery;
      const status = (data as any)?.status;
      if (status === 'canceled') {
        setSuccess('Đã hủy mời nhân sự.');
      } else {
        setSuccess(delivery === 'recovery' ? 'Đã gửi lại link đặt mật khẩu.' : 'Đã gửi lại email kích hoạt.');
      }
      await onReload();
    } catch (err: any) {
      setError(err?.message || 'Không thể xử lý lời mời.');
    } finally {
      setRowAction(null);
    }
  };

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');

    try {
      const { data, error: inviteError } = await inviteStaffMember({
        email: email.trim(),
        fullName: fullName.trim(),
        role: inviteRole,
        department: inviteRole === 'manager' ? department.trim() || null : null,
        managerId: inviteRole === 'sales' ? inviteManagerId || null : null
      });

      if (inviteError) {
        throw inviteError;
      }

      setEmail('');
      setFullName('');
      setInviteManagerId('');
      setDepartment('');
      const delivery = (data as any)?.delivery;
      setSuccess(
        delivery === 'recovery'
          ? 'Email đã tồn tại, mình đã gửi link đặt mật khẩu.'
          : inviteRole === 'manager'
            ? 'Đã gửi email kích hoạt tài khoản TPKD.'
            : 'Đã gửi email kích hoạt tài khoản TVBH.'
      );
      setDrawerOpen(false); // Đóng drawer sau khi mời thành công
      await onReload();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo tài khoản nhân sự.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSavePermission = async () => {
    if (!selectedStaff || selectedStaff.role === 'admin') return;

    setPermissionLoading(true);
    setSuccess('');
    setError('');

    try {
      const { error: updateError } = await updateStaffPermission({
        staffId: selectedStaff.id,
        email: selectedStaff.email || getRowEmail(selectedStaff),
        fullName: selectedStaff.full_name.trim(),
        role: permissionRole,
        department: permissionRole === 'manager' ? permissionDepartment.trim() || null : null,
        managerId: permissionRole === 'sales' ? permissionManagerId || null : null
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(`Đã cập nhật phân quyền cho ${selectedStaff.full_name}.`);
      await onReload();
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật phân quyền.');
    } finally {
      setPermissionLoading(false);
    }
  };

  return (
    <section className="panel staff-panel custom-scrollbar" style={{ background: 'transparent', border: '0', padding: '0', boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
      
      {/* Status Banner Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <X size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', color: '#047857', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MailCheck size={16} /> {success}
        </div>
      )}

      {/* Personal Profile Section (Always Visible) */}
      <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#fafafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Hồ sơ của bạn</div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{currentProfile?.full_name || 'Đang tải...'}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEditProfile && (
              <button 
                onClick={onEditProfile}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <UserRound size={14} /> Cập nhật hồ sơ
              </button>
            )}
            {onChangePassword && (
              <button 
                onClick={onChangePassword}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <ShieldCheck size={14} /> Đổi mật khẩu
              </button>
            )}
          </div>
        </div>
        <div style={{ padding: '20px', display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Họ & tên</span>
            <strong style={{ display: 'block', marginTop: '4px', color: '#0f172a', fontSize: '14px' }}>{currentProfile?.full_name || '---'}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Email</span>
            <strong style={{ display: 'block', marginTop: '4px', color: '#0f172a', fontSize: '14px' }}>{currentProfile?.email || '---'}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Phòng ban</span>
            <strong style={{ display: 'block', marginTop: '4px', color: '#0f172a', fontSize: '14px' }}>{currentProfile?.department || 'Chưa gán'}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Quyền hạn</span>
            <strong style={{ display: 'block', marginTop: '4px', color: '#0f172a', fontSize: '14px' }}>{currentProfile ? roleLabels[currentProfile.role] : 'TVBH'}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Trạng thái</span>
            <strong style={{ display: 'block', marginTop: '4px', color: '#0f172a', fontSize: '14px' }}>{currentProfile ? getStatusLabel(currentProfile) : '---'}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Kích hoạt hoàn tất</span>
            <strong style={{ display: 'block', marginTop: '4px', color: currentProfile?.activated_at ? '#059669' : '#64748b', fontSize: '14px' }}>
              {currentProfile?.activated_at ? `✅ ${new Date(currentProfile.activated_at).toLocaleString('vi-VN')}` : '⌛ Đang chờ kích hoạt'}
            </strong>
          </div>
        </div>
      </div>

      {/* Primary Modular Dual Pane Workspace (Visible for Admins & Managers) */}
      {!isPersonalView && (
        <div className="staff-modern-workspace">
        
        {/* LEFT PANEL: Data Grid */}
        <div className="staff-list-side">
          
          {/* Search & Actions Subheader */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#fafafb', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tên, email..."
                style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13.5px', fontWeight: 500, background: '#fff' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', marginLeft: 'auto' }}>
              <span style={{ color: '#0f766e' }}>{filteredStaff.length}</span>
              <span style={{ color: '#94a3b8' }}>/</span>
              <span>{visibleStaff.length} nhân sự</span>
            </div>
            
            {isAdmin && (
              <button 
                onClick={() => setDrawerOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0f766e', color: '#ffffff', border: '0', borderRadius: '10px', padding: '8px 16px', fontSize: '13.5px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 4px rgba(15, 118, 110, 0.2)' }}
              >
                <Plus size={15} strokeWidth={3} />
                Mời nhân sự
              </button>
            )}
          </div>

          {/* Data Table */}
          <div className="orders-table-scroller custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
            {filteredStaff.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                <Users size={36} style={{ color: '#cbd5e1', marginBottom: '10px' }} />
                <p style={{ fontWeight: 600, margin: 0 }}>Không có dữ liệu trùng khớp</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Họ & Tên</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Phòng ban</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Quyền hạn</th>
                    <th style={{ padding: '12px 20px', fontSize: '12px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((item) => {
                    const emailVal = getRowEmail(item);
                    const isActive = selectedStaff?.id === item.id;
                    return (
                      <tr 
                        key={item.id}
                        onClick={() => setSelectedEmail(emailVal)}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: isActive ? 'rgba(15, 118, 110, 0.03)' : '#fff', transition: 'background 0.15s ease' }}
                        className="hover-row"
                      >
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '13.5px', color: isActive ? '#0f766e' : '#0f172a', fontWeight: 700 }}>{item.full_name}</strong>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{emailVal}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: '#f8fafc',
                            color: '#0f172a',
                            border: '1px solid #e2e8f0'
                          }}>
                            {item.department || 'Chưa gán'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: item.role === 'admin' ? '#eff6ff' : '#f1f5f9',
                            color: item.role === 'admin' ? '#1d4ed8' : '#475569',
                            border: '1px solid',
                            borderColor: item.role === 'admin' ? '#bfdbfe' : '#e2e8f0'
                          }}>
                            {roleLabels[item.role]}
                          </span>
                        </td>
                        <td style={{ padding: '12px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: (item.activated_at || item.invite_status === 'active') ? '#10b981' : item.invite_status === 'canceled' ? '#ef4444' : '#f59e0b'
                            }} />
                            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>{getStatusLabel(item)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Detail Widget */}
        <div className="staff-detail-side">
          {selectedStaff ? (
            <div className="staff-detail-card">
              
              {/* Card Header Banner */}
              <div className={`staff-detail-header-content staff-detail-header-${selectedStaff.role}`}>
                <div className="staff-avatar-large">
                  {selectedStaff.full_name.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#fff', fontWeight: 800 }}>{selectedStaff.full_name}</h3>
                  <div 
                    onClick={() => copyToClipboard(getRowEmail(selectedStaff), 'Email')}
                    style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginTop: '2px' }}
                    title="Click để copy email"
                  >
                    {getRowEmail(selectedStaff)}
                    <Copy size={12} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                  <span style={{
                    background: (selectedStaff.activated_at || selectedStaff.invite_status === 'active') 
                      ? 'rgba(16, 185, 129, 0.2)' 
                      : selectedStaff.invite_status === 'canceled' 
                        ? 'rgba(239, 68, 68, 0.2)' 
                        : 'rgba(245, 158, 11, 0.2)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: (selectedStaff.activated_at || selectedStaff.invite_status === 'active') ? '#10b981' : selectedStaff.invite_status === 'canceled' ? '#ef4444' : '#f59e0b',
                      display: 'inline-block'
                    }} />
                    {getStatusLabel(selectedStaff)}
                  </span>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    🚀 {roleLabels[selectedStaff.role]}
                  </span>
                  <span style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    backdropFilter: 'blur(4px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    {selectedStaff.department || 'Chưa gán'}
                  </span>
                  {selectedStaff.role === 'sales' ? (
                    <span style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      {getManagerLabel(selectedStaff.manager_id).split(' · ')[0] || 'Chưa gắn TPKD'}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Content Block */}
              <div className="staff-detail-body custom-scrollbar" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                
                {/* Personal Info Block */}
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                    Thông tin cá nhân
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Số điện thoại</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 700 }}>{selectedStaff.phone || '---'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Giới tính</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 700 }}>{selectedStaff.gender || '---'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Ngày sinh</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 700 }}>
                        {selectedStaff.dob ? new Date(selectedStaff.dob).toLocaleDateString('vi-VN') : '---'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 600 }}>Địa chỉ</div>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 700 }}>{selectedStaff.address || '---'}</div>
                    </div>
                  </div>
                </div>

                {isAdmin && selectedStaff.role !== 'admin' ? (
                  <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '12px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sửa phân quyền</span>
                      <ShieldCheck size={15} style={{ color: '#0f766e' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Vai trò</label>
                        <select
                          value={permissionRole}
                          onChange={(event) => {
                            const nextRole = event.target.value as 'sales' | 'manager';
                            setPermissionRole(nextRole);
                            if (nextRole === 'sales') {
                              setPermissionDepartment('');
                              setPermissionManagerId('');
                            }
                          }}
                          disabled={permissionLoading}
                          style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: '#fff' }}
                        >
                          <option value="sales">TVBH</option>
                          <option value="manager">TPKD</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                          {permissionRole === 'sales' ? 'TPKD phụ trách' : 'Phòng ban'}
                        </label>
                        {permissionRole === 'sales' ? (
                          <select
                            value={permissionManagerId}
                            onChange={(event) => {
                              const nextManagerId = event.target.value;
                              setPermissionManagerId(nextManagerId);
                              const nextManager = managerOptions.find((item) => item.id === nextManagerId);
                              setPermissionDepartment(nextManager?.department || '');
                            }}
                            disabled={permissionLoading}
                            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontWeight: 600, background: '#fff' }}
                          >
                            <option value="">Chọn TPKD</option>
                            {managerOptions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={permissionDepartment}
                            onChange={(event) => setPermissionDepartment(event.target.value)}
                            disabled={permissionLoading}
                            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}
                          />
                        )}
                      </div>
                    </div>
                    {permissionRole === 'sales' && permissionManagerId ? (
                      <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                        ✓ Thuộc quản lý của <strong>{getManagerLabel(permissionManagerId).split(' · ')[0]}</strong>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleSavePermission}
                      disabled={
                        permissionLoading ||
                        (selectedStaff.role === permissionRole &&
                          ((permissionRole === 'sales' && selectedStaff.manager_id === permissionManagerId) ||
                            (permissionRole === 'manager' && (selectedStaff.department || '') === permissionDepartment.trim())))
                      }
                      style={{ width: '100%', border: 0, background: '#0f766e', color: '#fff', padding: '8px 12px', borderRadius: '10px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', marginTop: '2px' }}
                    >
                      {permissionLoading ? 'Đang lưu...' : 'Lưu phân quyền'}
                    </button>
                  </div>
                ) : isAdmin ? (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 12px', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <ShieldCheck size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      Không thể thay đổi phân quyền của tài khoản Admin.
                    </span>
                  </div>
                ) : null}

                {/* Metadata Timeline Bar */}
                <div style={{ display: 'flex', gap: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px 14px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ngày gửi lời mời</div>
                    <span style={{ fontSize: '12.5px', color: '#334155', fontWeight: 700, display: 'block', marginTop: '2px' }}>
                      {selectedStaff.invited_at ? new Date(selectedStaff.invited_at).toLocaleDateString('vi-VN') : '---'}
                    </span>
                  </div>
                  <div style={{ width: '1px', background: '#e2e8f0' }} />
                  <div style={{ flex: 1.5 }}>
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kích hoạt tài khoản</div>
                    <span style={{ fontSize: '12.5px', color: selectedStaff.activated_at ? '#059669' : '#64748b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      {selectedStaff.activated_at ? `✅ ${new Date(selectedStaff.activated_at).toLocaleString('vi-VN')}` : '⌛ Đang chờ kích hoạt'}
                    </span>
                  </div>
                </div>

                {/* Action Area */}
                <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isAdmin ? (
                    <>
                      {selectedStaff.invite_status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => runStaffAction('resend', selectedStaff, resendStaffInvite)}
                          disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend'}
                          style={{ width: '100%', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <RotateCw size={14} />
                          <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend' ? 'Đang thực thi...' : 'Gửi lại Email mời'}</span>
                        </button>
                      )}

                      {selectedStaff.invite_status === 'active' && (
                        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <ShieldCheck size={14} style={{ color: '#059669', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                            Đã kích hoạt & có đầy đủ quyền thao tác trên hệ thống.
                          </span>
                        </div>
                      )}

                      {selectedStaff.id !== currentProfile?.id && selectedStaff.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa nhân sự ${selectedStaff.full_name}?`)) {
                              runStaffAction('cancel', selectedStaff, cancelStaffInvite);
                            }
                          }}
                          disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel'}
                          style={{ width: '100%', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '8px 12px', fontSize: '13px', color: '#b91c1c', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Trash2 size={14} />
                          <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel' ? 'Đang thực thi...' : 'Xóa nhân sự'}</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '8px 12px', borderRadius: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <ShieldCheck size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: '#1d4ed8', fontWeight: 600 }}>
                        Quyền TPKD: Chỉ quản lý nhân sự & đơn hàng thuộc phòng ban.
                      </span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div style={{ border: '2px dashed #cbd5e1', borderRadius: '20px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8', textAlign: 'center' }}>
              <Users size={36} strokeWidth={1.5} style={{ marginBottom: '10px' }} />
              <strong>Vui lòng chọn một nhân sự</strong>
              <p style={{ fontSize: '12.5px', margin: '4px 0 0 0' }}>Thông số và hành động quản lý tài khoản sẽ được quy tụ đầy đủ tại đây.</p>
            </div>
          )}
        </div>

        </div>
      )}

      {/* ================= RIGHT SLIDING DRAWER: Mời nhân sự ================= */}
      {drawerOpen && isAdmin && (
        <>
          {/* Backdrop Overlay */}
          <div 
            onClick={() => !loading && setDrawerOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(4px)', zIndex: 1000, cursor: 'default' }}
          />
          
          {/* Side Panel Drawer */}
          <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: '100%', maxWidth: '440px', background: '#ffffff', zIndex: 1001, boxShadow: '-5px 0 25px rgba(0,0,0,0.1)', animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BadgePlus size={18} style={{ color: '#0f766e' }} />
                <strong style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Mời nhân sự mới</strong>
              </div>
              <button onClick={() => setDrawerOpen(false)} disabled={loading} style={{ border: '0', background: 'transparent', cursor: 'pointer', padding: '4px', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            {/* Main Form Body */}
            <form onSubmit={handleInvite} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto' }}>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                Hệ thống sẽ tự động gửi một email chứa đường dẫn thiết lập tài khoản. Đảm bảo nhập chính xác email hoạt động của nhân sự.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Họ và Tên</label>
                <input 
                  value={fullName} 
                  onChange={(event) => setFullName(event.target.value)} 
                  placeholder="Ví dụ: Nguyễn Anh Tuấn" 
                  required 
                  disabled={loading}
                  style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Email công việc</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    type="email"
                    value={email} 
                    onChange={(event) => setEmail(event.target.value)} 
                    placeholder="nhanvien@vinfast.vn" 
                    required 
                    disabled={loading}
                    style={{ width: '100%', padding: '10px 12px 10px 36px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <ShieldCheck size={16} style={{ color: '#0f766e' }} />
                <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                  Có thể chọn vai trò <strong style={{ color: '#0f766e' }}>TVBH</strong> hoặc <strong style={{ color: '#0f766e' }}>TPKD</strong>
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Vai trò</label>
                  <select
                    value={inviteRole}
                    onChange={(event) => {
                      const nextRole = event.target.value as 'sales' | 'manager';
                      setInviteRole(nextRole);
                      if (nextRole === 'sales') {
                        setDepartment('');
                        setInviteManagerId('');
                      }
                    }}
                    disabled={loading}
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: '#fff' }}
                  >
                    <option value="sales">TVBH</option>
                    <option value="manager">TPKD</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                    {inviteRole === 'sales' ? 'TPKD phụ trách' : 'Phòng ban'}
                  </label>
                  {inviteRole === 'sales' ? (
                    <select
                      value={inviteManagerId}
                      onChange={(event) => {
                        const nextManagerId = event.target.value;
                        setInviteManagerId(nextManagerId);
                        const nextManager = managerOptions.find((item) => item.id === nextManagerId);
                        setDepartment(nextManager?.department || '');
                      }}
                      disabled={loading}
                      style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: '#fff' }}
                    >
                      <option value="">Chọn TPKD</option>
                      {managerOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="Ví dụ: Kinh doanh 1"
                      disabled={loading}
                      style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                    />
                  )}
                </div>
              </div>
              {inviteRole === 'sales' ? (
                <div style={{ padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', color: '#1d4ed8', fontWeight: 600, fontSize: '12.5px' }}>
                  TVBH mới sẽ được gán cho <strong>{getManagerLabel(inviteManagerId) || 'chưa chọn TPKD'}</strong>.
                </div>
              ) : null}

              {/* Action buttons for form */}
              <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  type="button" 
                  onClick={() => setDrawerOpen(false)}
                  disabled={loading}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#334155', padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '13.5px', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ border: 0, background: '#0f766e', color: '#fff', padding: '12px', borderRadius: '10px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(15, 118, 110, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  {loading ? (
                    <span>Đang gửi lời mời...</span>
                  ) : (
                    <>
                      <Send size={14} />
                      <span>Gửi Email Lời Mời</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </>
      )}

      {/* Standard Animation Keyframes injection for React inline support */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .hover-row:hover {
          background: #f8fafc !important;
        }
      `}</style>

    </section>
  );
};
