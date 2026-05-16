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
import { cancelStaffInvite, inviteStaffMember, resendStaffInvite } from '../services/apiService';
import { roleLabels } from '../constants';

type StaffPanelProps = {
  staff: ProfileRow[];
  currentProfile: ProfileRow | null;
  onReload: () => Promise<boolean>;
};

export const StaffPanel: React.FC<StaffPanelProps> = ({ staff, currentProfile, onReload }) => {
  const [email, setEmail] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [role, setRole] = React.useState<'sales' | 'manager'>('sales');
  const [department, setDepartment] = React.useState('Kinh doanh');
  const [query, setQuery] = React.useState('');
  const [selectedEmail, setSelectedEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [rowAction, setRowAction] = React.useState<{ email: string; action: 'resend' | 'cancel' } | null>(null);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const getStatusLabel = (item: ProfileRow) => {
    if (item.invite_status === 'active') return 'Đã kích hoạt';
    if (item.invite_status === 'recovery_sent') return 'Đã gửi link';
    if (item.invite_status === 'invite_sent') return 'Đã gửi lời mời';
    if (item.invite_status === 'canceled') return 'Đã hủy mời';
    return item.activated_at ? 'Đã kích hoạt' : 'Chưa kích hoạt';
  };

  const getRowEmail = (item: ProfileRow) => item.email?.trim().toLowerCase() || item.id;

  const currentDepartment = currentProfile?.department?.trim().toLowerCase() || '';
  const isAdmin = currentProfile?.role === 'admin';
  const isManager = currentProfile?.role === 'manager';
  const visibleStaff = React.useMemo(() => {
    if (isManager && currentDepartment) {
      return staff.filter((item) => item.department?.trim().toLowerCase() === currentDepartment);
    }
    return staff;
  }, [currentDepartment, isManager, staff]);

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
        email,
        fullName: item.full_name,
        role: item.role === 'manager' ? 'manager' : 'sales',
        department: item.department || 'Kinh doanh'
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
        role,
        department: department.trim() || 'Kinh doanh'
      });

      if (inviteError) {
        throw inviteError;
      }

      setEmail('');
      setFullName('');
      const delivery = (data as any)?.delivery;
      setSuccess(delivery === 'recovery' ? 'Email đã tồn tại, mình đã gửi link đặt mật khẩu.' : 'Đã gửi email kích hoạt tài khoản TVBH.');
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

  return (
    <section className="panel staff-panel" style={{ background: 'transparent', border: '0', padding: '0', boxShadow: 'none' }}>
      


      {/* Status Banner Notifications */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <X size={16} /> {error}
        </div>
      )}
      {success && (
        <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px', color: '#047857', fontWeight: 600, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <MailCheck size={16} /> {success}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Tổng nhân sự</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{totalStaff}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Admin</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{adminCount}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>TVBH</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{salesCount}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>TPKD</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{managerCount}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Chờ kích hoạt</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{pendingCount}</div>
        </div>
        <div style={{ padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', minWidth: '120px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Đã hủy</div>
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{inactiveCount}</div>
        </div>
        {isManager && currentProfile?.department ? (
          <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', minWidth: '180px' }}>
            <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>Phòng đang xem</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#1d4ed8' }}>{currentProfile.department}</div>
          </div>
        ) : null}
      </div>

      {/* Primary Modular Dual Pane Workspace */}
      <div className="orders-modular-workspace">
        
        {/* LEFT PANEL: Data Grid */}
        <div className="orders-data-side" style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '20px', border: '1px solid #cbd5e1', boxShadow: '0 4px 15px -3px rgba(0, 0, 0, 0.02)', overflow: 'hidden' }}>
          
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
          <div className="orders-table-scroller" style={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 260px)' }}>
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
                            {item.department || 'Kinh doanh'}
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
                              background: item.invite_status === 'active' ? '#10b981' : item.invite_status === 'canceled' ? '#ef4444' : '#f59e0b'
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
        <div className="orders-visual-side" style={{ position: 'sticky', top: '70px', alignSelf: 'start' }}>
          {selectedStaff ? (
            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '20px', boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.03)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Card Header Banner */}
              <div style={{ background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)', padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
                <div style={{ height: '56px', width: '56px', borderRadius: '50%', background: '#0f766e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, boxShadow: '0 4px 10px rgba(15, 118, 110, 0.2)' }}>
                  {selectedStaff.full_name.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 800 }}>{selectedStaff.full_name}</h3>
                  <div 
                    onClick={() => copyToClipboard(getRowEmail(selectedStaff), 'Email')}
                    style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginTop: '2px' }}
                    title="Click để copy email"
                  >
                    {getRowEmail(selectedStaff)}
                    <Copy size={12} />
                  </div>
                </div>
                <span style={{
                  background: selectedStaff.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                  color: selectedStaff.role === 'admin' ? '#1e40af' : '#475569',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: selectedStaff.role === 'admin' ? '#bfdbfe' : '#e2e8f0',
                  marginTop: '2px'
                }}>
                  🚀 {roleLabels[selectedStaff.role]}
                </span>
                <span style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  border: '1px solid #e2e8f0'
                }}>
                  {selectedStaff.department || 'Kinh doanh'}
                </span>
              </div>

              {/* Content Block */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                
                {/* Standard Attributes Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Phòng ban</span>
                    <strong style={{ display: 'block', marginTop: '2px', color: '#0f172a', fontSize: '13px', fontWeight: 700 }}>
                      {selectedStaff.department || 'Kinh doanh'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Trạng thái</span>
                    <strong style={{ display: 'block', marginTop: '2px', color: '#0f172a', fontSize: '13px', fontWeight: 700 }}>{getStatusLabel(selectedStaff)}</strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Lần mời lúc</span>
                    <strong style={{ display: 'block', marginTop: '2px', color: '#0f172a', fontSize: '13px', fontWeight: 700 }}>
                      {selectedStaff.invited_at ? new Date(selectedStaff.invited_at).toLocaleDateString('vi-VN') : '---'}
                    </strong>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', gridColumn: 'span 2' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Kích hoạt hoàn tất</span>
                    <strong style={{ display: 'block', marginTop: '2px', color: selectedStaff.activated_at ? '#059669' : '#64748b', fontSize: '13px', fontWeight: 700 }}>
                      {selectedStaff.activated_at ? `✅ ${new Date(selectedStaff.activated_at).toLocaleString('vi-VN')}` : '⌛ Đang chờ kích hoạt'}
                    </strong>
                  </div>
                </div>

                {/* Action Area */}
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {isAdmin && selectedStaff.invite_status !== 'active' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => runStaffAction('resend', selectedStaff, resendStaffInvite)}
                        disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend'}
                        style={{ width: '100%', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        <RotateCw size={14} />
                        <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend' ? 'Đang thực thi...' : 'Gửi lại Email mời'}</span>
                      </button>

                      {selectedStaff.invite_status !== 'canceled' && (
                        <button
                          type="button"
                          onClick={() => runStaffAction('cancel', selectedStaff, cancelStaffInvite)}
                          disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel'}
                          style={{ width: '100%', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px', fontSize: '13px', color: '#b91c1c', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                          <Trash2 size={14} />
                          <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel' ? 'Đang thực thi...' : 'Thu hồi lời mời'}</span>
                        </button>
                      )}
                    </>
                  ) : isAdmin ? (
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <ShieldCheck size={18} style={{ color: '#16a34a', marginTop: '1px', flexShrink: 0 }} />
                      <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 600, lineHeight: '1.4' }}>
                        Tài khoản TVBH này đã kích hoạt thành công. Hiện có toàn quyền truy cập các báo cáo, đặt cọc, ghép xe và yêu cầu hóa đơn.
                      </span>
                    </div>
                  ) : (
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <ShieldCheck size={18} style={{ color: '#1d4ed8', marginTop: '1px', flexShrink: 0 }} />
                      <span style={{ fontSize: '12.5px', color: '#1d4ed8', fontWeight: 600, lineHeight: '1.4' }}>
                        TPKD chỉ xem được nhân sự và đơn hàng thuộc phòng ban của mình.
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
                    value={role}
                    onChange={(event) => setRole(event.target.value as 'sales' | 'manager')}
                    disabled={loading}
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600, background: '#fff' }}
                  >
                    <option value="sales">TVBH</option>
                    <option value="manager">TPKD</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Phòng ban</label>
                  <input
                    value={department}
                    onChange={(event) => setDepartment(event.target.value)}
                    placeholder="Kinh doanh"
                    disabled={loading}
                    style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', fontWeight: 600 }}
                  />
                </div>
              </div>

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
