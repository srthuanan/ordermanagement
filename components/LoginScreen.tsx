import React, { useState, FormEvent, useEffect, useRef } from 'react';
import * as authService from '../services/authService';
import { MobileLoginView } from './login/MobileLoginView';
import { DesktopPasskeyControls } from './login/DesktopPasskeyControls';
import { getSavedPasskeyProfile, isWebAuthnSupported, loginWithPasskey, registerPasskey } from '../services/passkeyService';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { VinFastAnimatedLogo } from './common/VinFastAnimatedLogo';

interface LoginScreenProps {
    onLoginSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passkeyBusy, setPasskeyBusy] = useState(false);
    const [pendingPasskeyUser, setPendingPasskeyUser] = useState<Parameters<typeof registerPasskey>[0] | null>(null);
    const loginBusyRef = useRef(false);

    useEffect(() => () => {
        if (loginBusyRef.current) authService.setInteractiveLoginPending(false);
    }, []);
    const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset' | 'join'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [invitationDetails, setInvitationDetails] = useState<{ full_name: string, role: string } | null>(null);
    const [inviteToken, setInviteToken] = useState('');
    const [rememberMe, setRememberMe] = useState<boolean>(() => localStorage.getItem('rememberMe') !== 'false');

    // Tự động nhận diện thiết bị di động hoặc khi co màn hình về kích thước điện thoại (<= 768px)
    const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    });

    useEffect(() => {
        const handleResize = () => {
            const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobileScreen(isMobile);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Kiểm tra phiên đăng nhập (từ Link Email) để ẩn ô OTP
    useEffect(() => {
        const checkSession = async (session: any, event?: string) => {
            const hash = window.location.hash;
            
            // 1. Kiểm tra luồng Join (Onboarding tự phục vụ)
            if (hash.includes('/join')) {
                const params = new URLSearchParams(hash.split('?')[1]);
                const token = params.get('token');
                if (token) {
                    setInviteToken(token);
                    setViewMode('join');
                    const res = await authService.getInvitationDetails(token);
                    if (res.success) {
                        setInvitationDetails(res.data);
                    } else {
                        showToast('Lỗi Link', res.message, 'error');
                        setViewMode('login');
                    }
                    return;
                }
            }

            // 2. Chỉ hiển thị chế độ reset nếu có dấu hiệu khôi phục mật khẩu
            const isRecoveryFlow = hash.includes('type=recovery') || 
                                   hash.includes('type=invite') || 
                                   hash.includes('access_token') || 
                                   hash.includes('reset-password') ||
                                   hash.includes('recovery') ||
                                   hash.includes('invite') ||
                                   event === 'PASSWORD_RECOVERY';

            console.log(`[Auth Debug] event: ${event}, hash: ${hash}, isRecoveryFlow: ${isRecoveryFlow}`);

            if (isRecoveryFlow) {
                console.log("[Auth] 🛡️ Chế độ khôi phục/mời phát hiện. Chuyển hướng xử lý cho index.tsx hoặc hiển thị Reset Password.");
                // Chúng ta để cho index.tsx xử lý việc chuyển vào App và hiện Modal
                // Nhưng vẫn giữ viewMode reset ở đây đề phòng
                setViewMode('reset');
                
                if (session) {
                    // GỌI LUÔN onLoginSuccess để index.tsx bắt được và hiện App + Modal
                    onLoginSuccess();
                } else {
                    const { data } = await authService.supabase.auth.getSession();
                    if (data.session) {
                        onLoginSuccess();
                    }
                }
                return;
            } 
            
            if (authService.isInteractiveLoginPending()) return;
            // Mobile login owns verification and the post-login passkey enrollment dialog.
            if (isMobileScreen && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) return;
            if (session) {
                const restored = await authService.restoreSession();
                if (restored) onLoginSuccess();
            }
        };

        // Lắng nghe thay đổi auth state
        const { data: { subscription } } = authService.supabase.auth.onAuthStateChange((event, session) => {
            console.log("[Auth Event]", event);
            // Quan trọng: Nếu event là SIGNED_IN nhưng là từ luồng recovery, Supabase thường bắn PASSWORD_RECOVERY trước
            // Hoặc chúng ta dựa vào hash ở thời điểm này.
            setTimeout(() => { void checkSession(session, event); }, 0);
        });

        // Chạy lần đầu
        authService.supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
                checkSession(data.session, 'INITIAL_CHECK');
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [onLoginSuccess, showToast, isMobileScreen]);

    const finishDesktopLogin = () => {
        loginBusyRef.current = false;
        authService.setInteractiveLoginPending(false);
        setPendingPasskeyUser(null);
        setIsSubmitting(false);
        onLoginSuccess();
    };

    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (loginBusyRef.current) return;
        if (!username || !password) {
            showToast('Thông báo', 'Vui lòng nhập đầy đủ thông tin!', 'warning');
            return;
        }
        loginBusyRef.current = true;
        authService.setInteractiveLoginPending(true);
        setIsSubmitting(true);
        let awaitingEnrollment = false;
        try {
            const result = await authService.login(username, password, rememberMe);
            if (!result.success) {
                showToast('Lỗi', result.message || 'Sai thông tin đăng nhập.', 'error');
                return;
            }
            const saved = getSavedPasskeyProfile();
            if (isWebAuthnSupported() && result.email && saved?.email !== result.email) {
                awaitingEnrollment = true;
                setPendingPasskeyUser({
                    username: result.username || result.email,
                    consultantName: result.consultantName || result.username || result.email,
                    role: result.role || '', email: result.email,
                });
            } else {
                finishDesktopLogin();
            }
        } catch {
            showToast('Lỗi', 'Không thể kết nối máy chủ. Vui lòng thử lại.', 'error');
        } finally {
            if (!awaitingEnrollment) {
                loginBusyRef.current = false;
                authService.setInteractiveLoginPending(false);
                setIsSubmitting(false);
            }
        }
    };

    const handlePasskeyLogin = async () => {
        if (loginBusyRef.current) return;
        loginBusyRef.current = true;
        authService.setInteractiveLoginPending(true);
        setPasskeyBusy(true);
        setIsSubmitting(true);
        try {
            const result = await loginWithPasskey(rememberMe);
            if (result.success) finishDesktopLogin();
            else showToast('Đăng nhập bằng Passkey', result.message || 'Không thể xác thực. Vui lòng thử lại.', 'warning');
        } catch {
            showToast('Đăng nhập bằng Passkey', 'Không thể xác thực. Vui lòng thử lại hoặc dùng mật khẩu.', 'error');
        } finally {
            loginBusyRef.current = false;
            authService.setInteractiveLoginPending(false);
            setPasskeyBusy(false);
            setIsSubmitting(false);
        }
    };

    const handleRegisterDesktopPasskey = async () => {
        if (!pendingPasskeyUser || passkeyBusy) return;
        setPasskeyBusy(true);
        try {
            const result = await registerPasskey(pendingPasskeyUser);
            showToast(result.success ? 'Đã kích hoạt Passkey' : 'Chưa kích hoạt Passkey',
                result.success ? 'Lần sau bạn có thể chọn Đăng nhập bằng Passkey.' : result.message || 'Bạn vẫn có thể đăng nhập bằng mật khẩu.',
                result.success ? 'success' : 'warning');
        } finally {
            setPasskeyBusy(false);
            finishDesktopLogin();
        }
    };

    const desktopPasskeyControls = (
        <DesktopPasskeyControls busy={isSubmitting} onSignIn={handlePasskeyLogin}
            pendingAccount={pendingPasskeyUser?.email} enrolling={passkeyBusy}
            onEnroll={handleRegisterDesktopPasskey} onContinue={finishDesktopLogin} />
    );

    const handleForgotPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) return;
        setIsSubmitting(true);
        const result = await authService.forgotPassword(email);
        setIsSubmitting(false);
        if (result.success) {
            setIsEmailSent(true);
            showToast('Đã Gửi Email', 'Vui lòng kiểm tra hộp thư của bạn.', 'success');
        } else {
            showToast('Lỗi', result.message || 'Lỗi gửi yêu cầu.', 'error');
        }
    };

    const handleBackToLogin = () => {
        setEmail(''); setUsername(''); setPassword('');
        setIsEmailSent(false);
        setViewMode('login');
    };

    const handleJoinSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        
        setIsSubmitting(true);
        try {
            const res = await authService.completeOnboarding(inviteToken, email, password);
            if (res.success) {
                showToast('Thành công', 'Tài khoản của bạn đã được kích hoạt. Đang đăng nhập...', 'success');
                // Tự động đăng nhập sau khi signup
                const loginRes = await authService.login(email, password);
                if (loginRes.success) {
                    onLoginSuccess();
                } else {
                    setViewMode('login');
                }
            } else {
                showToast('Lỗi', res.message, 'error');
            }
        } catch (err) {
            showToast('Lỗi', 'Không thể hoàn tất kích hoạt.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Khi ở kích thước màn hình điện thoại (<= 768px hoặc thiết bị di động):
    if (isMobileScreen) {
        return <MobileLoginView onLoginSuccess={onLoginSuccess} showToast={showToast} />;
    }

    const fieldClass = 'relative flex items-center h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-600/10';
    const inputClass = 'min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60';
    const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
    const primaryClass = 'group relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-[13.5px] font-semibold tracking-wide text-white transition-all duration-200 active:scale-[0.985] disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';
    const primaryStyle = {
        background: 'linear-gradient(180deg, #1e3a8a 0%, #172554 60%, #0a0f1d 100%)',
        boxShadow: '0 1px 0 0 rgba(255,255,255,0.3) inset, 0 8px 20px -4px rgba(15,23,42,0.28), 0 2px 6px -1px rgba(30,58,138,0.2)',
        border: '1px solid rgba(255,255,255,0.16)',
    };
    const title = viewMode === 'login' ? 'Đăng nhập' : viewMode === 'forgot' ? 'Quên mật khẩu' : viewMode === 'join' ? 'Tham gia hệ thống' : 'Đặt lại mật khẩu';
    const subtitle = viewMode === 'login'
        ? 'Hệ thống điều hành đơn hàng & kho xe VinFast Thuận An'
        : viewMode === 'forgot' ? 'Nhập email để nhận liên kết khôi phục mật khẩu'
        : viewMode === 'join' ? 'Hoàn tất thông tin để kích hoạt tài khoản của bạn'
        : 'Tiếp tục từ liên kết khôi phục trong email của bạn';

    return (
        <div className="relative isolate flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100/90 px-6 py-10 font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
            <style>{`
                .desktop-pearl-login input:-webkit-autofill,
                .desktop-pearl-login input:-webkit-autofill:hover,
                .desktop-pearl-login input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 1000px #f8fafc inset !important;
                    -webkit-text-fill-color: #0f172a !important;
                    caret-color: #2563eb !important;
                }
            `}</style>
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
            <div aria-hidden="true" className="pointer-events-none absolute right-[15%] top-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-[100px]" />
            <header className="mb-7 flex flex-col items-center text-center">
                <VinFastAnimatedLogo size={130} />
                <h1 className="mb-1 mt-1 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
                <p className="max-w-md text-xs font-medium leading-relaxed text-slate-500">{subtitle}</p>
            </header>
            <main className="desktop-pearl-login w-full max-w-sm rounded-3xl border border-slate-200/90 bg-white/90 p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl" aria-label={title}>
                {viewMode === 'login' && (
                    <>
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="desktop-login-username" className={labelClass}>Email</label>
                                <div className={fieldClass}>
                                    <Mail size={17} className="mr-2.5 shrink-0 text-slate-400" aria-hidden="true" />
                                    <input id="desktop-login-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                                        value={username} onChange={e => setUsername(e.target.value)} required disabled={isSubmitting}
                                        placeholder="tvbh@vinfast.vn" className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="desktop-login-password" className={labelClass}>Mật khẩu</label>
                                <div className={fieldClass}>
                                    <Lock size={17} className="mr-2.5 shrink-0 text-slate-400" aria-hidden="true" />
                                    <input id="desktop-login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                                        value={password} onChange={e => setPassword(e.target.value)} required disabled={isSubmitting}
                                        placeholder="Nhập mật khẩu" className={`${inputClass} pr-7`} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}
                                        aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={showPassword}
                                        className="absolute right-3.5 rounded text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-0.5">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} disabled={isSubmitting}
                                        className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
                                    <span className="text-xs font-medium text-slate-600">Ghi nhớ đăng nhập</span>
                                </label>
                                <button type="button" disabled={isSubmitting} onClick={() => { setEmail(username.includes('@') ? username : ''); setIsEmailSent(false); setViewMode('forgot'); }}
                                    className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline disabled:opacity-50">Quên mật khẩu?</button>
                            </div>
                            <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className={primaryClass} style={primaryStyle}>
                                <span aria-hidden="true" className="pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                                {isSubmitting ? 'Đang xác thực...' : <><span>Đăng nhập</span><ArrowRight size={15} aria-hidden="true" /></>}
                            </button>
                        </form>
                        <div className="mt-4">{desktopPasskeyControls}</div>
                    </>
                )}
                {viewMode === 'forgot' && (
                    <div className="space-y-5">
                        {isEmailSent ? (
                            <div role="status" className="space-y-3 py-2 text-center">
                                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600"><Check size={23} aria-hidden="true" /></span>
                                <h2 className="text-sm font-bold text-slate-800">Đã gửi liên kết khôi phục</h2>
                                <p className="text-xs leading-relaxed text-slate-500">Vui lòng kiểm tra hộp thư <strong className="break-all font-semibold text-slate-700">{email}</strong> để đặt lại mật khẩu.</p>
                                <p className="text-xs leading-relaxed text-slate-400">Nếu chưa thấy email, hãy kiểm tra thư mục Spam.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                                <div>
                                    <label htmlFor="desktop-recovery-email" className={labelClass}>Email tài khoản</label>
                                    <div className={fieldClass}>
                                        <Mail size={17} className="mr-2.5 shrink-0 text-slate-400" aria-hidden="true" />
                                        <input id="desktop-recovery-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                                            required disabled={isSubmitting} placeholder="tvbh@vinfast.vn" className={inputClass} />
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className={primaryClass} style={primaryStyle}>{isSubmitting ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}</button>
                            </form>
                        )}
                        <button type="button" onClick={handleBackToLogin} disabled={isSubmitting} className="mx-auto flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-blue-600">
                            <ArrowLeft size={14} aria-hidden="true" />Quay lại đăng nhập
                        </button>
                    </div>
                )}
                {viewMode === 'join' && (
                    <div className="space-y-5">
                        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                            <UserRound size={21} className="shrink-0 text-blue-600" aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">{invitationDetails?.full_name || 'Nhân viên mới'}</p>
                                <p className="text-xs text-slate-500">{invitationDetails?.role}</p>
                            </div>
                        </div>
                        <form onSubmit={handleJoinSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="desktop-join-email" className={labelClass}>Xác nhận Email</label>
                                <div className={fieldClass}>
                                    <Mail size={17} className="mr-2.5 shrink-0 text-slate-400" aria-hidden="true" />
                                    <input id="desktop-join-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                                        required disabled={isSubmitting} placeholder="tvbh@vinfast.vn" className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="desktop-join-password" className={labelClass}>Thiết lập mật khẩu</label>
                                <div className={fieldClass}>
                                    <Lock size={17} className="mr-2.5 shrink-0 text-slate-400" aria-hidden="true" />
                                    <input id="desktop-join-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)}
                                        required disabled={isSubmitting} placeholder="Tối thiểu 10 ký tự" className={inputClass} />
                                </div>
                            </div>
                            <button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className={primaryClass} style={primaryStyle}>{isSubmitting ? 'Đang kích hoạt...' : 'Kích hoạt tài khoản'}</button>
                        </form>
                        <button type="button" onClick={handleBackToLogin} disabled={isSubmitting} className="mx-auto flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600"><ArrowLeft size={14} aria-hidden="true" />Quay lại đăng nhập</button>
                    </div>
                )}
                {viewMode === 'reset' && <p role="status" className="text-center text-sm leading-relaxed text-slate-500">Vui lòng mở liên kết khôi phục trong email để tiếp tục đặt lại mật khẩu.</p>}
            </main>
            <footer className="mt-7 flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-blue-600" aria-hidden="true" /><span>VinFast Thuận An</span>
            </footer>
        </div>
    );
};

export default LoginScreen;
