import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, LockKeyhole } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const ResetPasswordScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    supabase?.auth.getSession().then(({ data }) => {
      if (mounted) {
        setHasSession(Boolean(data.session));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 8) {
      setError('Mật khẩu nên có ít nhất 8 ký tự.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        throw updateError;
      }

      setMessage('Đặt lại mật khẩu thành công. Đang chuyển vào hệ thống...');
      window.setTimeout(() => {
        window.location.assign('/');
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">VF</div>
          <div>
            <strong>VF KIM SƠN</strong>
            <span>TRẢNG DÀI</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">KHÔI PHỤC MẬT KHẨU</p>
          <h1>Đặt mật khẩu mới</h1>
          <p className="auth-note">
            Mở link trong email đặt lại mật khẩu, rồi nhập mật khẩu mới để tiếp tục sử dụng tài khoản.
          </p>
        </div>

        {!hasSession ? (
          <div className="form-error">
            <AlertTriangle size={17} />
            <span>Bạn cần mở trang này từ link đặt lại mật khẩu trong email.</span>
          </div>
        ) : null}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Mật khẩu mới *</span>
            <input
              type="password"
              value={password}
              placeholder="Tối thiểu 8 ký tự"
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          <label>
            <span>Xác nhận mật khẩu *</span>
            <input
              type="password"
              value={confirmPassword}
              placeholder="Nhập lại mật khẩu"
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          {error ? (
            <div className="form-error">
              <AlertTriangle size={17} />
              <span>{error}</span>
            </div>
          ) : null}

          {message ? (
            <div className="form-success">
              <CheckCircle2 size={17} />
              <span>{message}</span>
            </div>
          ) : null}

          <button className="primary-button auth-submit" type="submit" disabled={loading}>
            <LockKeyhole size={18} />
            <span>{loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}</span>
          </button>
        </form>
      </section>
    </main>
  );
};
