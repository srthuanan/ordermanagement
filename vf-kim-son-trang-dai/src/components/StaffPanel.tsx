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
  Clock3
} from 'lucide-react';
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
  const [query, setQuery] = React.useState('');
  const [selectedEmail, setSelectedEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [rowAction, setRowAction] = React.useState<{ email: string; action: 'resend' | 'cancel' } | null>(null);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');

  const getStatusLabel = (item: ProfileRow) => {
    if (item.invite_status === 'active') return 'Đã kích hoạt';
    if (item.invite_status === 'recovery_sent') return 'Đã gửi link đặt mật khẩu';
    if (item.invite_status === 'invite_sent') return 'Đã gửi lời mời';
    if (item.invite_status === 'canceled') return 'Đã hủy mời';
    return item.activated_at ? 'Đã kích hoạt' : 'Chưa kích hoạt';
  };

  const getRowEmail = (item: ProfileRow) => item.email?.trim().toLowerCase() || item.id;

  const filteredStaff = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return staff;
    return staff.filter((item) => {
      const email = item.email?.toLowerCase() || item.id.toLowerCase();
      return (
        item.full_name.toLowerCase().includes(normalized) ||
        email.includes(normalized) ||
        roleLabels[item.role].toLowerCase().includes(normalized) ||
        getStatusLabel(item).toLowerCase().includes(normalized)
      );
    });
  }, [query, staff]);

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

  const totalStaff = staff.length;
  const adminCount = staff.filter((item) => item.role === 'admin').length;
  const salesCount = staff.filter((item) => item.role === 'sales').length;
  const pendingCount = staff.filter((item) => item.invite_status !== 'active').length;
  const inactiveCount = staff.filter((item) => item.invite_status === 'canceled').length;

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
    <section className="panel staff-panel">
      <div className="panel-heading section-heading staff-panel-heading">
        <div className="staff-panel-title">
          <p className="eyebrow">QUẢN LÝ NHÂN SỰ</p>
          <h2>Admin mời, TVBH kích hoạt qua email</h2>
          <p className="staff-panel-lead">
            Khung mới tách rõ phần mời nhân sự, lọc danh sách, và xem nhanh trạng thái từng tài khoản.
          </p>
        </div>
        <div className="staff-metrics">
          <span><Users size={14} /> {totalStaff} người</span>
          <span><ShieldCheck size={14} /> {adminCount} admin</span>
          <span><UserRound size={14} /> {salesCount} TVBH</span>
          <span><Clock3 size={14} /> {pendingCount} chờ kích hoạt</span>
          <span><MailCheck size={14} /> {inactiveCount} tạm ngưng</span>
        </div>
      </div>

      <div className="staff-workspace">
        <section className="staff-card staff-invite-card">
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

        <section className="staff-card staff-directory-card">
          <div className="staff-directory-toolbar">
            <div className="staff-card-title">
              <RefreshCw size={18} />
              <strong>Danh sách nhân sự</strong>
            </div>
            <label className="staff-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm tên, email, trạng thái..."
              />
            </label>
          </div>

          <div className="staff-directory">
            <div className="staff-list-pane">
              <div className="staff-list">
                {filteredStaff.length === 0 ? (
                  <div className="staff-empty">
                    <strong>Không tìm thấy nhân sự phù hợp.</strong>
                    <p>Thử đổi từ khóa hoặc xóa bộ lọc để xem lại toàn bộ danh sách.</p>
                  </div>
                ) : (
                  filteredStaff.map((item) => {
                    const emailValue = getRowEmail(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`staff-row staff-row-button ${selectedStaff?.id === item.id ? 'active' : ''}`}
                        onClick={() => setSelectedEmail(emailValue)}
                      >
                        <div className="staff-row-main">
                          <strong>{item.full_name}</strong>
                          <p>{emailValue}</p>
                        </div>
                        <div className="staff-row-meta">
                          <span className={`staff-role role-${item.role}`}>{roleLabels[item.role]}</span>
                          <span className="staff-status">{getStatusLabel(item)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <aside className="staff-detail-card">
              {selectedStaff ? (
                <>
                  <div className="staff-detail-header">
                    <div>
                      <p className="staff-card-label">Nhân sự đang chọn</p>
                      <h3>{selectedStaff.full_name}</h3>
                      <p>{getRowEmail(selectedStaff)}</p>
                    </div>
                    <span className={`staff-role role-${selectedStaff.role}`}>{roleLabels[selectedStaff.role]}</span>
                  </div>

                  <div className="staff-detail-grid">
                    <div>
                      <span>Vai trò</span>
                      <strong>{roleLabels[selectedStaff.role]}</strong>
                    </div>
                    <div>
                      <span>Trạng thái</span>
                      <strong>{getStatusLabel(selectedStaff)}</strong>
                    </div>
                    <div>
                      <span>Kích hoạt</span>
                      <strong>{selectedStaff.activated_at || 'Chưa có'}</strong>
                    </div>
                    <div>
                      <span>Mời lúc</span>
                      <strong>{selectedStaff.invited_at || 'Chưa có'}</strong>
                    </div>
                  </div>

                  <div className="staff-detail-actions">
                    {selectedStaff.invite_status !== 'active' ? (
                      <>
                        <button
                          type="button"
                          className="staff-action-button"
                          onClick={() => runStaffAction('resend', selectedStaff, resendStaffInvite)}
                          disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend'}
                        >
                          <RotateCw size={14} />
                          <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'resend' ? 'Đang gửi...' : 'Gửi lại email'}</span>
                        </button>
                        {selectedStaff.invite_status !== 'canceled' ? (
                          <button
                            type="button"
                            className="staff-action-button staff-action-danger"
                            onClick={() => runStaffAction('cancel', selectedStaff, cancelStaffInvite)}
                            disabled={rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel'}
                          >
                            <Trash2 size={14} />
                            <span>{rowAction?.email === getRowEmail(selectedStaff) && rowAction.action === 'cancel' ? 'Đang hủy...' : 'Hủy mời'}</span>
                          </button>
                        ) : null}
                      </>
                    ) : (
                      <div className="staff-active-note">
                        Tài khoản này đã kích hoạt và đăng nhập bình thường.
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="staff-empty">
                  <strong>Chọn một nhân sự để xem chi tiết.</strong>
                  <p>Danh sách bên trái sẽ cho phép mở nhanh trạng thái, thời gian mời và hành động gửi lại/hủy mời.</p>
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </section>
  );
};
