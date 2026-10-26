import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, ScanFace } from 'lucide-react';
import * as authService from '../../services/authService';
import {
  isPasskeySupported,
  getSavedPasskeyProfile,
  registerPasskey,
  loginWithPasskey,
  PasskeyProfile,
} from '../../services/passkeyService';
import { VinFastAnimatedLogo } from '../common/VinFastAnimatedLogo';

interface MobileLoginViewProps {
  onLoginSuccess: () => void;
  showToast: (
    title: string,
    message: string,
    type: 'success' | 'error' | 'loading' | 'warning' | 'info',
    duration?: number
  ) => void;
  onSwitchToDesktop?: () => void;
}

export const MobileLoginView: React.FC<MobileLoginViewProps> = ({
  onLoginSuccess,
  showToast,
  onSwitchToDesktop: _onSwitchToDesktop,
}) => {
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [faceIdLoading, setFaceIdLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [savedProfile, setSavedProfile] = useState<PasskeyProfile | null>(null);
  const [showFaceIdModal, setShowFaceIdModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  // Chế độ xem: Đăng nhập ('login') hoặc Quên mật khẩu ('forgot')
  const [viewMode, setViewMode] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  useEffect(() => {
    // Kiểm tra hỗ trợ Face ID Passkey
    const checkPasskey = async () => {
      const supported = await isPasskeySupported();
      setPasskeySupported(supported);
      const profile = getSavedPasskeyProfile();
      setSavedProfile(profile);
    };
    checkPasskey();
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanInput = emailOrUser.trim().toLowerCase();
    if (!cleanInput) {
      showToast('Cảnh báo', 'Vui lòng nhập Email hoặc Tên đăng nhập.', 'warning');
      return;
    }
    if (!password) {
      showToast('Cảnh báo', 'Vui lòng nhập mật khẩu.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.login(cleanInput, password, rememberMe);
      if (result.success) {
        showToast('Thành công', `Chào mừng ${result.consultantName || result.username}!`, 'success');

        // Nếu thiết bị hỗ trợ Face ID mà chưa đăng ký cho tài khoản này
        if (passkeySupported && (!savedProfile || savedProfile.username !== result.username)) {
          setPendingUser(result);
          setShowFaceIdModal(true);
        } else {
          onLoginSuccess();
        }
      } else {
        showToast('Đăng nhập thất bại', result.message || 'Email hoặc mật khẩu không chính xác.', 'error');
      }
    } catch (err: any) {
      showToast('Lỗi hệ thống', err.message || 'Không thể kết nối máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceIdLogin = async () => {
    if (!savedProfile) {
      showToast(
        'Chưa kích hoạt Face ID',
        'Vui lòng đăng nhập bằng Email lần đầu. Hệ thống sẽ kích hoạt Face ID để sử dụng từ lần sau.',
        'info',
        5000
      );
      return;
    }

    setFaceIdLoading(true);
    try {
      const res = await loginWithPasskey();
      if (res.success) {
        showToast('Xác thực Face ID thành công', `Chào mừng ${res.profile?.consultantName || res.profile?.username}!`, 'success');
        onLoginSuccess();
      } else {
        showToast('Xác thực Face ID', res.message || 'Không thể xác thực khuôn mặt.', 'error');
      }
    } catch (err: any) {
      showToast('Lỗi cảm biến', err.message || 'Không thể bật Face ID.', 'error');
    } finally {
      setFaceIdLoading(false);
    }
  };

  const handleActivateFaceId = async () => {
    if (!pendingUser) {
      onLoginSuccess();
      return;
    }
    setFaceIdLoading(true);
    try {
      const res = await registerPasskey({
        username: pendingUser.username,
        consultantName: pendingUser.consultantName,
        role: pendingUser.role,
        email: pendingUser.email,
        token: pendingUser.token,
      });

      if (res.success) {
        showToast('Kích hoạt Face ID thành công', 'Bạn có thể đăng nhập bằng khuôn mặt từ các lần sau!', 'success');
      } else {
        showToast('Chưa kích hoạt được Face ID', res.message || 'Lỗi đăng ký khuôn mặt.', 'warning');
      }
    } catch (err: any) {
      showToast('Lỗi Face ID', err.message || 'Lỗi đăng ký.', 'error');
    } finally {
      setFaceIdLoading(false);
      setShowFaceIdModal(false);
      onLoginSuccess();
    }
  };

  const handleForgotPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = (forgotEmail || emailOrUser).trim().toLowerCase();
    if (!cleanEmail) {
      showToast('Cảnh báo', 'Vui lòng nhập Email để khôi phục mật khẩu.', 'warning');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await authService.forgotPassword(cleanEmail);
      if (res.success) {
        setForgotSuccess(true);
        showToast('Đã gửi email', 'Vui lòng kiểm tra hộp thư để đặt lại mật khẩu.', 'success');
      } else {
        showToast('Thông báo', res.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.', 'error');
      }
    } catch (err: any) {
      showToast('Lỗi hệ thống', err.message || 'Lỗi khi gửi yêu cầu.', 'error');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-100/90 text-slate-800 flex flex-col justify-between px-5 py-6 select-none relative overflow-x-hidden font-sans">
      {/* Light Theme Autofill & Styling Overrides */}
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #f8fafc inset !important;
          -webkit-text-fill-color: #0f172a !important;
          caret-color: #2563eb !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>

      {/* Subtle Pearl Aurora Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header & Animated SVG Brand */}
      <div className="w-full flex flex-col items-center pt-2 mb-1 z-10">
        <VinFastAnimatedLogo size={130} />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1 mt-1">
          {viewMode === 'login' ? 'Đăng nhập' : 'Quên mật khẩu'}
        </h1>
        <p className="text-xs text-slate-500 font-medium text-center">
          {viewMode === 'login'
            ? 'Hệ thống điều hành đơn hàng & kho xe VinFast Thuận An'
            : 'Nhập email để nhận liên kết khôi phục mật khẩu'}
        </p>
      </div>

      {/* Form Container (Clean Pearl Card) */}
      <div className="w-full max-w-sm mx-auto my-auto py-2 z-10">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
          {viewMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email
                </label>
                <div className="relative flex items-center h-11 bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all">
                  <Mail size={17} className="text-slate-400 mr-2.5 flex-shrink-0" />
                  <input
                    type="text"
                    autoComplete="username"
                    value={emailOrUser}
                    onChange={(e) => setEmailOrUser(e.target.value)}
                    placeholder="tvbh@vinfast.vn"
                    className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative flex items-center h-11 bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all">
                  <Lock size={17} className="text-slate-400 mr-2.5 flex-shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none pr-8"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center cursor-pointer space-x-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs font-medium text-slate-600">Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(emailOrUser);
                    setForgotSuccess(false);
                    setViewMode('forgot');
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Submit Button - Luxury Automotive Edition (Sleek 44px Ergonomics) */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-11 flex items-center justify-center px-5 rounded-xl text-white font-medium text-sm tracking-wide overflow-hidden transition-all duration-300 active:scale-[0.985] disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #1e3a8a 0%, #172554 60%, #0a0f1d 100%)',
                  boxShadow: '0 1px 0 0 rgba(255,255,255,0.3) inset, 0 8px 20px -4px rgba(15, 23, 42, 0.28), 0 2px 6px -1px rgba(30, 58, 138, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                }}
              >
                {/* Specular Bevel Top Line */}
                <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

                {/* Subtle Ambient Shimmer Sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

                {loading ? (
                  <span className="text-xs font-medium text-white/90">Đang xác thực...</span>
                ) : (
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-[13.5px] tracking-[0.04em] text-white">Đăng nhập</span>
                    <div className="w-5 h-5 rounded-full bg-white/12 border border-white/20 flex items-center justify-center ml-2 transition-transform duration-300 group-hover:translate-x-0.5 shadow-sm">
                      <ArrowRight size={11} className="text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                )}
              </button>
            </form>
          ) : (
            /* Forgot Password Form */
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotSuccess ? (
                <div className="text-center py-3 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Đã gửi liên kết khôi phục</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Vui lòng kiểm tra hộp thư <span className="font-semibold text-slate-700">{forgotEmail}</span> để đặt lại mật khẩu.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('login')}
                    className="w-full h-11 mt-2 flex items-center justify-center px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs tracking-wide transition-all"
                  >
                    Quay lại Đăng nhập
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Email tài khoản
                    </label>
                    <div className="relative flex items-center h-11 bg-slate-50/80 border border-slate-200 rounded-xl px-3.5 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10 transition-all">
                      <Mail size={17} className="text-slate-400 mr-2.5 flex-shrink-0" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="tvbh@vinfast.vn"
                        className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                        disabled={forgotLoading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="group relative w-full h-11 flex items-center justify-center px-5 rounded-xl text-white font-medium text-sm tracking-wide overflow-hidden transition-all duration-300 active:scale-[0.985] disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(180deg, #1e3a8a 0%, #172554 60%, #0a0f1d 100%)',
                      boxShadow: '0 1px 0 0 rgba(255,255,255,0.3) inset, 0 8px 20px -4px rgba(15, 23, 42, 0.28)',
                      border: '1px solid rgba(255, 255, 255, 0.16)',
                    }}
                  >
                    {forgotLoading ? (
                      <span className="text-xs font-medium text-white/90">Đang gửi yêu cầu...</span>
                    ) : (
                      <span className="font-semibold text-[13.5px] tracking-[0.04em] text-white">
                        Gửi liên kết khôi phục
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('login')}
                    className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors pt-1"
                  >
                    ← Quay lại Đăng nhập
                  </button>
                </>
              )}
            </form>
          )}

          {viewMode === 'login' && (
            <>
              {/* Divider */}
              <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-slate-200/80"></div>
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  HOẶC
                </span>
                <div className="flex-grow border-t border-slate-200/80"></div>
              </div>

              {/* Face ID Button - Platinum Glass Edition */}
              <button
                type="button"
                onClick={handleFaceIdLogin}
                disabled={faceIdLoading || loading}
                className="w-full h-11 flex items-center justify-center px-4 rounded-xl bg-white hover:bg-slate-50/80 active:scale-[0.985] transition-all duration-200 border border-slate-200/90 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_14px_rgba(15,23,42,0.08)]"
              >
                {faceIdLoading ? (
                  <span className="text-xs font-medium text-blue-600">Đang quét Face ID...</span>
                ) : (
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-lg bg-blue-50/80 border border-blue-100/80 flex items-center justify-center mr-2">
                      <ScanFace size={15} className="text-blue-600" />
                    </div>
                    <span className="text-[13px] font-semibold text-slate-800 tracking-tight">
                      {savedProfile ? `Đăng nhập Face ID (@${savedProfile.username})` : 'Đăng nhập bằng Face ID'}
                    </span>
                  </div>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer Minimalist */}
      <div className="w-full flex items-center justify-center text-xs text-slate-500 z-10 pt-2 pb-1">
        <ShieldCheck size={14} className="text-blue-600 mr-1.5" />
        <span>VinFast Thuận An</span>
      </div>

      {/* Modal Kích Hoạt Face ID sau khi đăng nhập lần đầu */}
      {showFaceIdModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
              <ScanFace size={32} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Kích hoạt Face ID</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              Bạn có muốn kích hoạt nhận diện khuôn mặt <strong>Face ID</strong> để đăng nhập nhanh cho tài khoản{' '}
              <strong className="text-blue-600">@{pendingUser?.username}</strong> trong các lần sau mà không cần gõ mật khẩu?
            </p>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowFaceIdModal(false);
                  onLoginSuccess();
                }}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Để sau
              </button>
              <button
                type="button"
                onClick={handleActivateFaceId}
                disabled={faceIdLoading}
                className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center"
              >
                {faceIdLoading ? 'Đang quét...' : 'Kích hoạt ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
