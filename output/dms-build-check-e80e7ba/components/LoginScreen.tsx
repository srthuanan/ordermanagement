import React, { useState, FormEvent, useEffect, useRef } from 'react';
import * as authService from '../services/authService';
import { MobileLoginView } from './login/MobileLoginView';
import { DesktopPasskeyControls } from './login/DesktopPasskeyControls';
import { getSavedPasskeyProfile, isWebAuthnSupported, loginWithPasskey, registerPasskey } from '../services/passkeyService';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Lock, Mail, Pause, Play, UserRound } from 'lucide-react';

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
    const [motionPaused, setMotionPaused] = useState(false);
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

    const fieldClass = 'relative flex items-center h-12 rounded-xl border border-white/90 bg-white/65 px-4 transition-all focus-within:border-blue-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-600/10';
    const inputClass = 'min-w-0 w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60';
    const labelClass = 'mb-2 block text-sm font-medium text-[#172344]';
    const primaryClass = 'group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-5 text-sm font-semibold tracking-normal text-white transition-all duration-200 active:scale-[0.985] disabled:cursor-wait disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600';
    const primaryStyle = {
        background: 'linear-gradient(180deg, #1d5bc2 0%, #174da9 55%, #123b83 100%)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 6px 16px -6px rgba(29,78,216,0.3)',
        border: '1px solid rgba(255,255,255,0.16)',
    };
    const title = viewMode === 'login' ? 'Đăng nhập' : viewMode === 'forgot' ? 'Quên mật khẩu' : viewMode === 'join' ? 'Tham gia hệ thống' : 'Đặt lại mật khẩu';
    const subtitle = viewMode === 'login'
        ? 'Hệ thống điều hành đơn hàng & kho xe VinFast Thuận An'
        : viewMode === 'forgot' ? 'Nhập email để nhận liên kết khôi phục mật khẩu'
        : viewMode === 'join' ? 'Hoàn tất thông tin để kích hoạt tài khoản của bạn'
        : 'Tiếp tục từ liên kết khôi phục trong email của bạn';

    return (
        <div data-motion-paused={motionPaused} className="pearl-login-page relative isolate flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#f4f8ff] px-8 py-16 font-sans text-slate-800 selection:bg-blue-100 selection:text-blue-900">
            <style>{`
                .pearl-brand-float { animation: pearlBrandFloat 6s ease-in-out infinite; }
                .pearl-brand-sheen {
                    background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.85) 46%, transparent 60%);
                    background-size: 260% 100%;
                    animation: pearlBrandSheen 8s ease-in-out infinite;
                }
                .pearl-title-sheen {
                    background: linear-gradient(100deg, #081334 20%, #255fba 43%, #081334 66%);
                    background-size: 240% 100%;
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    animation: pearlTitleSheen 12s ease-in-out infinite;
                }
                .pearl-feature-icon { animation: pearlFeaturePulse 9s ease-in-out infinite; }
                .pearl-feature-icon:nth-of-type(1) { animation-delay: 0s; }
                .pearl-feature-2 { animation-delay: 3s !important; }
                .pearl-feature-3 { animation-delay: 6s !important; }
                .pearl-ambient { animation: pearlAmbientDrift 16s ease-in-out infinite alternate; }
                .pearl-light-trail { stroke-dasharray: 14 720; animation: pearlLightTrail 11s linear infinite; }
                .pearl-light-trail-2 { animation-delay: -5.5s; animation-duration: 15s; }
                .pearl-login-page[data-motion-paused="true"] .pearl-motion { animation-play-state: paused !important; }
                @keyframes pearlBrandFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                @keyframes pearlBrandSheen { 0%, 18% { background-position: 150% 0; } 48%, 100% { background-position: -150% 0; } }
                @keyframes pearlTitleSheen { 0%, 100% { background-position: 100% 50%; } 50% { background-position: 0% 50%; } }
                @keyframes pearlFeaturePulse {
                    0%, 28%, 100% { transform: translateY(0); box-shadow: 0 0 0 rgba(37,99,235,0); }
                    12%, 18% { transform: translateY(-4px); box-shadow: 0 6px 20px rgba(37,99,235,0.15); }
                }
                @keyframes pearlAmbientDrift { from { transform: translate3d(-4%, 2%, 0) scale(0.96); opacity: 0.45; } to { transform: translate3d(9%, -5%, 0) scale(1.08); opacity: 0.85; } }
                @keyframes pearlLightTrail { from { stroke-dashoffset: 734; } to { stroke-dashoffset: -734; } }
                @media (prefers-reduced-motion: reduce) {
                    .pearl-login-page .pearl-motion { animation: none !important; }
                    .pearl-login-page .pearl-motion-toggle { display: none; }
                    .pearl-login-page .pearl-light-trail { opacity: 0; }
                }
                .desktop-pearl-login {
                    background: linear-gradient(145deg, rgba(255,255,255,0.74), rgba(243,249,255,0.48));
                    -webkit-backdrop-filter: blur(18px) saturate(115%);
                    backdrop-filter: blur(18px) saturate(115%);
                    box-shadow: 0 16px 48px rgba(47,85,145,0.08), inset 0 1px 0 rgba(255,255,255,0.95);
                }
                @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
                    .desktop-pearl-login { background: rgba(250,253,255,0.94); }
                }
                .desktop-pearl-login input:-webkit-autofill,
                .desktop-pearl-login input:-webkit-autofill:hover,
                .desktop-pearl-login input:-webkit-autofill:focus {
                    -webkit-box-shadow: none !important;
                    -webkit-background-clip: text !important;
                    background-clip: text !important;
                    -webkit-text-fill-color: #0f172a !important;
                    caret-color: #2563eb !important;
                }
            `}</style>
            <img src={`${import.meta.env.BASE_URL}pictures/desktop-login-pearl-a.webp`} alt="" aria-hidden="true" draggable={false}
                className="pointer-events-none absolute inset-0 -z-10 h-full w-full select-none object-cover object-center" />
            <div aria-hidden="true" className="pearl-ambient pearl-motion pointer-events-none absolute left-[4%] top-[14%] -z-10 h-[48%] w-[46%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(96,165,250,0.13),transparent_68%)]" />
            <svg aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 -z-10 h-[58%] w-[58%]" viewBox="0 0 1000 600" fill="none" preserveAspectRatio="none">
                <path className="pearl-light-trail pearl-motion" d="M-60 50C90 335 520 285 1060 450" stroke="#60a5fa" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
                <path className="pearl-light-trail pearl-light-trail-2 pearl-motion" d="M-40 470C280 350 580 560 1080 400" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="grid w-full max-w-[1080px] grid-cols-[minmax(0,1fr)_minmax(360px,448px)] items-start gap-10 xl:gap-16">
                <section aria-label="VinFast Thuận An" className="relative min-w-0 pt-1">
                    <div className="pearl-brand-float pearl-motion relative mb-9 w-[280px] max-w-full xl:w-[300px]">
                        <img src={`${import.meta.env.BASE_URL}assets/vinfast-thuan-an-pearl.svg`}
                            alt="VinFast Thuận An" width={350} height={108} draggable={false}
                            className="block h-auto w-full select-none" />
                        <span aria-hidden="true" className="pearl-brand-sheen pearl-motion pointer-events-none absolute inset-0"
                            style={{ WebkitMaskImage: `url(${import.meta.env.BASE_URL}assets/vinfast-thuan-an-pearl.svg)`, maskImage: `url(${import.meta.env.BASE_URL}assets/vinfast-thuan-an-pearl.svg)`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
                    </div>
                    <h1 className="text-[36px] font-bold leading-[1.18] tracking-[-0.045em] text-[#081334] xl:text-[50px]">
                        Không gian điều hành<br /><span className="pearl-title-sheen pearl-motion">VinFast Thuận An</span>
                    </h1>
                    <p className="mt-5 max-w-xl text-base leading-7 text-[#6e7e99]">
                        Đơn hàng, kho xe và báo cáo trong cùng một hệ thống.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-medium text-[#172344] xl:gap-x-6">
                        <span className="inline-flex items-center gap-2.5"><span className="pearl-feature-icon pearl-motion flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill="#1765cf" /><path d="M14 3v5h4M8 11h6M8 14h7M8 17h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>Đơn hàng</span>
                        <span className="h-5 w-px bg-blue-200/70" aria-hidden="true" />
                        <span className="inline-flex items-center gap-2.5"><span className="pearl-feature-icon pearl-motion pearl-feature-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 9 1.5-4h11L19 9M4 11l1-2h14l1 2v9h-3v-3H7v3H4v-9Z" stroke="#1765cf" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M7 12h2m6 0h2M7 16h10" stroke="#1765cf" strokeWidth="1.8" strokeLinecap="round" /></svg></span>Kho xe</span>
                        <span className="hidden h-5 w-px bg-blue-200/70 xl:block" aria-hidden="true" />
                        <span className="inline-flex items-center gap-2.5"><span className="pearl-feature-icon pearl-motion pearl-feature-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100/70 text-blue-600"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="12" width="4" height="9" rx="1" fill="#1765cf" /><rect x="10" y="7" width="4" height="14" rx="1" fill="#1765cf" /><rect x="17" y="3" width="4" height="18" rx="1" fill="#1765cf" /></svg></span>Báo cáo</span>
                    </div>
                    <button type="button" onClick={() => setMotionPaused(!motionPaused)} aria-pressed={motionPaused}
                        aria-label={motionPaused ? 'Bật chuyển động trang trí' : 'Tạm dừng chuyển động trang trí'}
                        className="pearl-motion-toggle mt-5 inline-flex items-center gap-1.5 rounded-md py-1 text-[11px] text-slate-400 transition-colors hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        {motionPaused ? <Play size={11} aria-hidden="true" /> : <Pause size={11} aria-hidden="true" />}
                        {motionPaused ? 'Bật chuyển động' : 'Tạm dừng hiệu ứng'}
                    </button>
                </section>
                <div className="min-w-0">
                <main className="desktop-pearl-login w-full min-w-0 grow-0 rounded-[28px] border border-white/85 p-7 xl:p-10" style={{ flexGrow: 0 }} aria-label={title}>
                    <header className="mb-8">
                        <h2 className="text-[30px] font-bold tracking-[-0.035em] text-[#081334] xl:text-[36px]">{title}</h2>
                        <p className="mt-2 text-base leading-relaxed text-[#7d8da8]">{viewMode === 'login' ? 'Chào mừng bạn trở lại' : subtitle}</p>
                    </header>
                {viewMode === 'login' && (
                    <>
                        <form onSubmit={handleLoginSubmit} className="space-y-5">
                            <div>
                                <label htmlFor="desktop-login-username" className={labelClass}>Email</label>
                                <div className={fieldClass}>
                                    <Mail size={17} className="mr-2.5 shrink-0 text-slate-400" aria-hidden="true" />
                                    <input id="desktop-login-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false}
                                        value={username} onChange={e => setUsername(e.target.value)} required disabled={isSubmitting}
                                        placeholder="Email công việc" className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="desktop-login-password" className={labelClass}>Mật khẩu</label>
                                <div className={fieldClass}>
                                    <Lock size={17} className="mr-2.5 shrink-0 text-slate-400" aria-hidden="true" />
                                    <input id="desktop-login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
                                        value={password} onChange={e => setPassword(e.target.value)} required disabled={isSubmitting}
                                        placeholder="Nhập mật khẩu" className={`${inputClass} pr-7`} />
                                    <button id="desktop-login-password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}
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
                        <div className="mt-5">{desktopPasskeyControls}</div>
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
                </div>
            </div>
            <footer className="absolute bottom-5 left-0 w-full text-center text-[11px] text-slate-500">
                VinFast Thuận An · Hệ thống nội bộ
            </footer>
        </div>
    );
};

export default LoginScreen;
