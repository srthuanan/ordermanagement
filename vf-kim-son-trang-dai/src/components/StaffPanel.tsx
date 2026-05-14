import React from 'react';
import { BadgePlus, Mail, RefreshCw, ShieldCheck, Trash2, RotateCw, Users } from 'lucide-react';
import { ProfileRow } from '../types';
import { cancelStaffInvite, inviteStaffMember, resendStaffInvite } from '../services/apiService';
import { roleLabels } from '../constants';

type StaffPanelProps = {
  staff: ProfileRow[];
  onReload: () => Promise<boolean>;
};

export const StaffPanel: React.FC<StaffPanelProps> = ({ staff, onReload }) => {
  const [email, setEmail] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [rowAction, setRowAction] = React.useState<{ email: string; action: 'resend' | 'cancel' } | null>(null);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');

  const totalStaff = staff.length;
  const adminCount = staff.filter((item) => item.role === 'admin').length;
  const getStatusLabel = (item: ProfileRow) => {
    if (item.invite_status === 'active') return 'Đã kích hoạt';
    if (item.invite_status === 'recovery_sent') return 'Đã gửi link đặt mật khẩu';
    if (item.invite_status === 'invite_sent') return 'Đã gửi lời mời';
    if (item.invite_status === 'canceled') return 'Đã hủy mời';
    return item.activated_at ? 'Đã kích hoạt' : 'Chưa kích hoạt';
  };

  const getRowEmail = (item: ProfileRow) => item.email?.trim().toLowerCase() || item.id;

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
        role: item.role
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
        role: 'sales'
      });

      if (inviteError) {
        throw inviteError;
      }

      setEmail('');
      setFullName('');
      const delivery = (data as any)?.delivery;
      setSuccess(delivery === 'recovery' ? 'Email đã tồn tại, mình đã gửi link đặt mật khẩu.' : 'Đã gửi email kích hoạt tài khoản TVBH.');
      await onReload();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo tài khoản nhân sự.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">QUẢN LÝ NHÂN SỰ</p>
          <h2>Admin tạo tài khoản, TVBH không tự đăng ký</h2>
        </div>
        <div className="staff-metrics">
          <span><Users size={14} /> {totalStaff} người</span>
          <span><ShieldCheck size={14} /> {adminCount} admin</span>
        </div>
      </div>

      <div className="staff-grid">
        <section className="staff-card">
          <div className="staff-card-title">
            <BadgePlus size={18} />
            <strong>Mời nhân sự mới</strong>
          </div>
          <p className="staff-hint">Nhập email công việc và tên hiển thị. Tài khoản mới luôn là TVBH.</p>
          <form className="staff-form" onSubmit={handleInvite}>
            <label>
              <span>Email công việc</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nhanvien@congty.vn" type="email" required />
            </label>
            <label>
              <span>Họ và tên</span>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Nguyễn Văn A" required />
            </label>
            <div className="staff-static-role">Quyền: TVBH</div>

            {error ? <div className="staff-message staff-error">{error}</div> : null}
            {success ? <div className="staff-message staff-success">{success}</div> : null}

            <button className="primary-button" type="submit" disabled={loading}>
              <Mail size={16} />
              <span>{loading ? 'Đang gửi...' : 'Gửi lời mời'}</span>
            </button>
          </form>
        </section>

        <section className="staff-card staff-card-wide">
          <div className="staff-card-title">
            <RefreshCw size={18} />
            <strong>Danh sách nhân sự</strong>
          </div>
          <div className="staff-list">
            {staff.map((item) => (
              <div key={item.id} className="staff-row">
                <div>
                  <strong>{item.full_name}</strong>
                  <p>{getRowEmail(item)}</p>
                </div>
                <div className="staff-row-meta">
                  <span className={`staff-role role-${item.role}`}>{roleLabels[item.role]}</span>
                  <span className="staff-status">{getStatusLabel(item)}</span>
                  {item.invite_status !== 'active' ? (
                    <div className="staff-actions">
                      <button
                        type="button"
                        className="staff-action-button"
                        onClick={() => runStaffAction('resend', item, resendStaffInvite)}
                        disabled={rowAction?.email === getRowEmail(item) && rowAction.action === 'resend'}
                      >
                        <RotateCw size={14} />
                        <span>{rowAction?.email === getRowEmail(item) && rowAction.action === 'resend' ? 'Đang gửi...' : 'Gửi lại email'}</span>
                      </button>
                      {item.invite_status !== 'canceled' ? (
                        <button
                          type="button"
                          className="staff-action-button staff-action-danger"
                          onClick={() => runStaffAction('cancel', item, cancelStaffInvite)}
                          disabled={rowAction?.email === getRowEmail(item) && rowAction.action === 'cancel'}
                        >
                          <Trash2 size={14} />
                          <span>{rowAction?.email === getRowEmail(item) && rowAction.action === 'cancel' ? 'Đang hủy...' : 'Hủy mời'}</span>
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
};
