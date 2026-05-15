import React, { useState } from 'react';
import { LockKeyhole, AlertTriangle, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (forgotMode) {
        if (!email.trim()) {
          setError('Vui lòng nhập email công việc để nhận link đặt lại mật khẩu.');
          return;
        }

        const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const redirectTo = new URL('/reset-password', appUrl).toString();
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo
        });

        if (resetError) {
          throw resetError;
        }

        setMessage('Đã gửi link đặt lại mật khẩu vào email của bạn.');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError) {
        setError('Đăng nhập thất bại. Tài khoản phải do admin tạo và cấp quyền.');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống không mong muốn.');
    } finally {
      setLoading(false);
    }
  }

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
          <p className="eyebrow">ĐĂNG NHẬP CỔNG NỘI BỘ</p>
          <h1>Hệ thống quản lý</h1>
          <p className="auth-note">
            Tài khoản do admin tạo. Nhân sự không tự đăng ký.
            {!forgotMode ? ' Nếu quên mật khẩu, bạn có thể gửi link đặt lại.' : ''}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            <span>Email công việc *</span>
            <input
              type="email"
              value={email}
              placeholder="nhanvien@vinfast.com"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          {!forgotMode ? (
            <label>
              <span>Mật khẩu *</span>
              <input
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
          ) : null}

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
            {forgotMode ? <Mail size={18} /> : <LockKeyhole size={18} />}
            <span>{loading ? 'Đang xử lý...' : forgotMode ? 'Gửi link đặt lại mật khẩu' : 'Đăng nhập ngay'}</span>
          </button>

          <button
            type="button"
            className="ghost-button auth-switch"
            onClick={() => {
              setError('');
              setMessage('');
              setForgotMode((value) => !value);
            }}
            disabled={loading}
          >
            <ArrowLeft size={16} />
            <span>{forgotMode ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}</span>
          </button>
        </form>
      </section>
    </main>
  );
};
