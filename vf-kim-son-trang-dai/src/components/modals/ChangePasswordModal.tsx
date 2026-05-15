import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, LockKeyhole, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, onClose]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setError('');
    setSuccess('');

    if (password.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      setSuccess('Đổi mật khẩu thành công.');
      window.setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-layer" role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget && !loading) {
        onClose();
      }
    }}>
      <section
        className="auth-card"
        role="dialog"
        aria-modal="true"
        aria-label="Đổi mật khẩu"
        style={{
          width: 'min(460px, calc(100% - 32px))',
          margin: 'auto',
          position: 'relative'
        }}
      >
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          title="Đóng"
          disabled={loading}
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          <X size={18} />
        </button>

        <div>
          <p className="eyebrow">BẢO MẬT TÀI KHOẢN</p>
          <h1>Đổi mật khẩu</h1>
          <p className="auth-note">Mật khẩu mới sẽ được áp dụng ngay cho tài khoản đang đăng nhập.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Mật khẩu mới *</span>
            <input
              type="password"
              value={password}
              placeholder="Tối thiểu 8 ký tự"
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            <span>Xác nhận mật khẩu *</span>
            <input
              type="password"
              value={confirmPassword}
              placeholder="Nhập lại mật khẩu mới"
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          {success ? (
            <div className="form-success">
              <CheckCircle2 size={17} />
              <span>{success}</span>
            </div>
          ) : null}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            <span>{loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}</span>
          </button>
        </form>
      </section>
    </div>
  );
};
