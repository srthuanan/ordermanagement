import React, { useState } from 'react';
import { LockKeyhole, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const AuthScreen: React.FC = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
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
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (signInError) {
          setError('Đăng nhập thất bại. Vui lòng kiểm tra email, mật khẩu hoặc xác nhận email.');
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || email.trim()
            }
          }
        });

        if (signUpError) {
          setError('Không tạo được tài khoản. Đảm bảo mật khẩu đủ mạnh và email chưa được dùng.');
        } else if (!data.session) {
          setMessage('Đăng ký thành công! Hãy kiểm tra hòm thư để xác thực email.');
          setMode('signin');
        }
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
            <span>TRANG DÀI</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">ĐĂNG NHẬP CỔNG NỘI BỘ</p>
          <h1>{mode === 'signin' ? 'Hệ thống quản lý' : 'Đăng ký tài khoản'}</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' ? (
            <label>
              <span>Họ và tên *</span>
              <input
                value={fullName}
                placeholder="Nguyễn Văn A"
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
          ) : null}
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
            <span>{loading ? 'Đang xử lý...' : mode === 'signin' ? 'Đăng nhập ngay' : 'Tạo tài khoản'}</span>
          </button>
        </form>

        <button
          className="ghost-button auth-switch"
          onClick={() => {
            setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
            setError('');
            setMessage('');
          }}
        >
          {mode === 'signin' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </section>
    </main>
  );
};
