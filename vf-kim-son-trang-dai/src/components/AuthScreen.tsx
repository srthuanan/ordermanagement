import React, { useState } from 'react';
import { LockKeyhole, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const AuthScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
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
          <p className="auth-note">Tài khoản do admin tạo. Nhân sự không tự đăng ký.</p>
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
            <span>{loading ? 'Đang xử lý...' : 'Đăng nhập ngay'}</span>
          </button>
        </form>
      </section>
    </main>
  );
};
