import React, { useState } from 'react';
import { CheckCircle2, LockKeyhole, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const SetPasswordScreen: React.FC = () => {
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

      setMessage('Đặt mật khẩu thành công. Đang chuyển vào hệ thống...');
      window.setTimeout(() => {
        window.location.assign('/');
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Không thể đặt mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

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
            <p className="eyebrow" style={{ color: '#0d9488', fontSize: '11px', letterSpacing: '0.15em' }}>KÍCH HOẠT TÀI KHOẢN</p>
            <h1>Thiết lập mật khẩu</h1>
            <p className="auth-note">
              Chào mừng bạn! Vui lòng đặt mật khẩu để bắt đầu sử dụng hệ thống.
            </p>
          </div>
        </div>

        {!hasSession ? (
          <div className="form-error" style={{ background: '#fff1f2', color: '#e11d48', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
            <AlertTriangle size={20} />
            <span>Bạn cần mở trang này từ liên kết trong email mời kích hoạt.</span>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gap: '20px' }}>
              <label>
                <span>Mật khẩu mới</span>
                <div style={{ position: 'relative' }}>
                  <LockKeyhole size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="password"
                    value={password}
                    placeholder="Tối thiểu 8 ký tự"
                    onChange={(event) => setPassword(event.target.value)}
                    style={{ paddingLeft: '48px' }}
                    minLength={8}
                    required
                  />
                </div>
              </label>

              <label>
                <span>Xác nhận mật khẩu</span>
                <div style={{ position: 'relative' }}>
                  <CheckCircle2 size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="password"
                    value={confirmPassword}
                    placeholder="Nhập lại mật khẩu"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    style={{ paddingLeft: '48px' }}
                    minLength={8}
                    required
                  />
                </div>
              </label>
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

            <button className="primary-button auth-submit" type="submit" disabled={loading} style={{ background: '#0f172a', color: '#fff', marginTop: '8px' }}>
              {loading ? (
                 <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ width: '16px', height: '16px', border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                   Đang lưu...
                 </span>
              ) : (
                <>
                  <LockKeyhole size={18} />
                  <span>Kích hoạt & Đăng nhập</span>
                </>
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '24px' }}>
           <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
             © 2026 Kim Sơn Trảng Dài &middot; VinFast
           </p>
        </div>
      </section>
    </main>
  );
};
