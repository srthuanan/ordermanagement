import React, { useState } from 'react';
import { LockKeyhole, AlertTriangle, CheckCircle2, Mail, ArrowLeft, Loader2 } from 'lucide-react';
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
        <div style={{ textAlign: 'center', display: 'grid', gap: '16px' }}>
          <div className="brand auth-brand" style={{ justifyContent: 'center' }}>
            <div className="brand-mark" style={{ width: '56px', height: '56px', fontSize: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }}>VF</div>
            <div style={{ textAlign: 'left' }}>
              <strong style={{ fontSize: '18px', letterSpacing: '0.05em' }}>VF KIM SƠN</strong>
              <span style={{ fontSize: '13px', color: '#64748b' }}>TRẢNG DÀI</span>
            </div>
          </div>

          <div style={{ marginTop: '8px' }}>
            <p className="eyebrow" style={{ color: '#0d9488', fontSize: '11px', letterSpacing: '0.15em' }}>
              {forgotMode ? 'KHÔI PHỤC TRUY CẬP' : 'CỔNG NỘI BỘ'}
            </p>
            <h1>{forgotMode ? 'Quên mật khẩu' : 'Đăng nhập'}</h1>
            <p className="auth-note">
              {forgotMode 
                ? 'Nhập email công việc để nhận liên kết thiết lập lại mật khẩu.' 
                : 'Hệ thống dành riêng cho nhân sự. Vui lòng đăng nhập để tiếp tục.'}
            </p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: '20px' }}>
            <label>
              <span>Email công việc</span>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  value={email}
                  placeholder="nhanvien@vinfast.com"
                  onChange={(event) => setEmail(event.target.value)}
                  style={{ paddingLeft: '48px' }}
                  required
                />
              </div>
            </label>

            {!forgotMode ? (
              <label>
                <span>Mật khẩu</span>
                <div style={{ position: 'relative' }}>
                  <LockKeyhole size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="password"
                    value={password}
                    placeholder="••••••••"
                    onChange={(event) => setPassword(event.target.value)}
                    style={{ paddingLeft: '48px' }}
                    minLength={6}
                    required
                  />
                </div>
              </label>
            ) : null}
          </div>

          {error ? (
            <div className="form-error" style={{ background: '#fff1f2', color: '#e11d48', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : null}
          
          {message ? (
            <div className="form-success" style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          ) : null}

          <div style={{ display: 'grid', gap: '12px', marginTop: '8px' }}>
            <button className="primary-button auth-submit" type="submit" disabled={loading} style={{ background: '#0f172a', color: '#fff' }}>
              {loading ? (
                <Loader2 className="vin-spinner-wrap" size={18} />
              ) : forgotMode ? (
                <Mail size={18} />
              ) : (
                <LockKeyhole size={18} />
              )}
              <span>{loading ? 'Đang xử lý...' : forgotMode ? 'Gửi link khôi phục' : 'Đăng nhập ngay'}</span>
            </button>

            <button
              type="button"
              className="auth-switch"
              onClick={() => {
                setError('');
                setMessage('');
                setForgotMode((value) => !value);
              }}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
            >
              {!forgotMode ? <AlertTriangle size={16} /> : <ArrowLeft size={16} />}
              <span>{forgotMode ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}</span>
            </button>
          </div>
        </form>

        {!forgotMode && (
          <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
             <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
               © 2026 Kim Sơn Trảng Dài &middot; VinFast
             </p>
          </div>
        )}
      </section>
    </main>
  );
};
