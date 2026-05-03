import React, { useState, FormEvent, useEffect } from 'react';
import * as authService from '../services/authService';
// Import images
import kepgiay from '../pictures/kepgiay.webp';

interface LoginScreenProps {
    onLoginSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset' | 'join'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [invitationDetails, setInvitationDetails] = useState<{ full_name: string, role: string } | null>(null);
    const [inviteToken, setInviteToken] = useState('');
    const [rememberMe, setRememberMe] = useState<boolean>(() => localStorage.getItem('rememberMe') !== 'false');

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
            checkSession(session, event);
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
    }, [onLoginSuccess, showToast]);

    // --- LOGIC GIAO DIỆN MỚI ---
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        // Calculate tilt based on mouse position relative to center
        const x = (e.clientX / window.innerWidth - 0.5) * 10; // Max 10 deg tilt
        const y = (e.clientY / window.innerHeight - 0.5) * -10; // Max 10 deg tilt
        setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
        // Reset tilt on mouse leave
        setMousePos({ x: 0, y: 0 });
    };





    // Typing effect logic
    useEffect(() => {
        // Log removed to fix TS6133
    }, []);

    // Typewriter effect for tagline



    // Trigger Fireworks after Transformer Animation (~6s)





    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            showToast('Thông báo', 'Vui lòng nhập đầy đủ thông tin!', 'warning');
            return;
        }
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 800));
        const result = await authService.login(username, password, rememberMe);
        setIsSubmitting(false);
        if (result.success) {
            // showToast('Xuân Bính Ngọ 2026', 'Đăng nhập thành công!', 'success'); // Removed redundant toast
            onLoginSuccess();
        } else {
            showToast('Lỗi', result.message || 'Sai thông tin đăng nhập.', 'error');
        }
    };

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

    return (
        <div
            className="relative min-h-screen w-full max-w-full flex items-center justify-center overflow-hidden overflow-x-hidden font-sans bg-slate-50 selection:bg-blue-500 selection:text-white"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >



            {/* Animated Background - Simple and Minimalist */}
            <div className="absolute inset-0 z-0 bg-white overflow-hidden pointer-events-none flex items-center justify-center">
                {/* Subtle mesh background without bright colors */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white via-slate-50/50 to-slate-100/30 opacity-90 animate-mesh-pulse mix-blend-multiply"></div>
                
                {/* School Notebook Grid Pattern (Ô ly tập) - Moving and Clearer */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#7dd3fc_1px,transparent_1px),linear-gradient(to_bottom,#7dd3fc_1px,transparent_1px)] bg-[size:12px_12px] opacity-25 select-none pointer-events-none animate-grid-drift"></div>

                {/* Sub-line Notebook Grid Pattern - Moving and Clearer */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:60px_60px] opacity-40 select-none pointer-events-none animate-grid-drift"></div>

                {/* Single subtle slow sweeping line of light */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 animate-light-sweep pointer-events-none"></div>
            </div>

            {/* Main Content Container - Expanded for multi-section */}
            <div className="relative z-10 w-full max-w-7xl h-[100dvh] flex flex-col lg:flex-row items-center lg:items-stretch justify-center p-4 sm:p-8 xl:p-12 gap-4 lg:gap-12 xl:gap-24 overflow-hidden">

                {/* Mobile Title Section */}
                <div className="flex lg:hidden flex-col justify-center text-center w-full relative z-10 order-1 pt-2 sm:pt-4">
                    <div className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/50 text-blue-700 text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase mb-2 shadow-sm backdrop-blur-md animate-transformer-drop mx-auto w-max">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Hệ Thống Nội Bộ
                    </div>
                    <h1 className="font-extrabold mb-3 tracking-tight leading-[1.2] drop-shadow-xl flex flex-row flex-nowrap whitespace-nowrap items-baseline justify-center gap-x-2">
                        <span className="flex text-slate-800 text-[1.2rem] sm:text-2xl">
                            {'Showroom'.split('').map((char, index) => (
                                <span key={`srm-${index}`} className="inline-block animate-transformer-letter" style={{ animationDelay: `${0.2 + index * 0.06}s` }}>
                                    {char === ' ' ? '\u00A0' : char}
                                </span>
                            ))}
                        </span>
                        <span className="flex text-[1.6rem] sm:text-4xl pb-1">
                            {'Thuận An'.split('').map((char, index) => (
                                <span key={`tam-${index}`} className="inline-block animate-transformer-letter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 drop-shadow-sm pb-1" style={{ animationDelay: `${0.8 + index * 0.06}s` }}>
                                    {char === ' ' ? '\u00A0' : char}
                                </span>
                            ))}
                        </span>
                    </h1>
                    <p className="text-slate-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed font-medium animate-transformer-fade-up px-4">
                        Hệ thống quản lý giúp bạn dễ dàng theo dõi đơn hàng, kiểm tra kho xe và tối ưu quy trình bán hàng.
                    </p>
                </div>


                <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;700&display=swap');

                @keyframes text-glow {
                    0%, 100% { opacity: 0.5; filter: brightness(1.2) blur(1px); }
                    50% { opacity: 1; filter: brightness(2) blur(2px) drop-shadow(0 0 5px #00ff00); }
                }
                .animate-text-glow { animation: text-glow 2s ease-in-out infinite; }

                @keyframes handwritten-pulse {
                    0%, 100% { opacity: 0.35; }
                    50% { opacity: 0.55; }
                }
                .animate-handwritten-pulse { animation: handwritten-pulse 6s ease-in-out infinite; }
                
                @keyframes float-up {
                    0% { transform: translateY(20px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .animate-float-up { animation: float-up 0.8s ease-out forwards; }

                @keyframes mesh-pulse {
                    0%, 100% { opacity: 0.85; }
                    50% { opacity: 0.95; }
                }
                @keyframes grid-drift {
                    0% { background-position: 0px 0px; }
                    100% { background-position: 60px 60px; }
                }
                @keyframes float-shape-1 {
                    0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
                    33% { transform: translate(30px, -50px) rotate(120deg) scale(1.1); }
                    66% { transform: translate(-20px, 20px) rotate(240deg) scale(0.9); }
                }
                @keyframes float-shape-2 {
                    0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
                    33% { transform: translate(-40px, 30px) rotate(-120deg) scale(0.9); }
                    66% { transform: translate(30px, -30px) rotate(-240deg) scale(1.1); }
                }
                @keyframes float-shape-3 {
                    0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
                    50% { transform: translate(40px, 40px) rotate(180deg) scale(1.15); }
                }
                @keyframes light-sweep {
                    0% { transform: translateX(-100%) skewX(-12deg); }
                    50%, 100% { transform: translateX(100%) skewX(-12deg); }
                }
                .animate-mesh-pulse { animation: mesh-pulse 8s ease-in-out infinite; }
                .animate-grid-drift { animation: grid-drift 20s linear infinite; }
                .animate-float-shape-1 { animation: float-shape-1 18s ease-in-out infinite; }
                .animate-float-shape-2 { animation: float-shape-2 22s ease-in-out infinite; }
                .animate-float-shape-3 { animation: float-shape-3 25s ease-in-out infinite; }
                .animate-light-sweep { animation: light-sweep 12s ease-in-out infinite; }

                @keyframes bubble-float {
                    0% { transform: translateY(0) scale(1); opacity: 0; }
                    20% { opacity: 0.45; }
                    80% { opacity: 0.45; }
                    100% { transform: translateY(-105vh) scale(1.5); opacity: 0; }
                }
                .animate-bubble-float { animation: bubble-float linear infinite; }

                @keyframes aurora-1 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    33% { transform: translate(40px, -40px) rotate(120deg) scale(1.1); }
                    66% { transform: translate(-20px, 30px) rotate(240deg) scale(0.9); }
                }
                @keyframes aurora-2 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    33% { transform: translate(-30px, 40px) rotate(-120deg) scale(1.1); }
                    66% { transform: translate(40px, -20px) rotate(-240deg) scale(0.9); }
                }
                @keyframes aurora-3 {
                    0%, 100% { transform: translate(0, 0) rotate(0deg) scale(1); }
                    50% { transform: translate(50px, 50px) rotate(180deg) scale(1.1); }
                }
                .animate-aurora-1 { animation: aurora-1 18s ease-in-out infinite; }
                .animate-aurora-2 { animation: aurora-2 22s ease-in-out infinite; }
                .animate-aurora-3 { animation: aurora-3 25s ease-in-out infinite; }

                @keyframes clip-glow {
                    0%, 100% { filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 12px rgba(255, 255, 255, 0.4)); }
                    50% { filter: drop-shadow(0 0 16px rgba(255, 255, 255, 1)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.6)); }
                }
                .animate-clip-glow { animation: clip-glow 3s ease-in-out infinite; }
            `}</style>


                {/* Left Side: Features Showcase (Updated Neo-Brutalist EV Redesign) */}
                <div className="hidden lg:flex w-full lg:w-1/2 flex-col justify-center relative z-50 px-2 sm:px-4 lg:px-0 lg:pr-12 mt-2 lg:mt-0 order-3 lg:order-1 pt-4 lg:pt-0 pb-12 sm:pb-20 lg:pb-0">
                    {/* Desktop Title Section */}
                    <div className="hidden lg:block text-left mb-10 w-full relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold tracking-[0.2em] uppercase mb-6 shadow-[4px_4px_0px_0px_#e2e8f0] animate-transformer-drop">
                            <span className="w-2.5 h-2.5 bg-[#10b981] animate-pulse"></span> Hệ Thống Nội Bộ
                        </div>
                        <h1 className="font-black mb-4 tracking-tight leading-none text-slate-800 flex flex-row flex-nowrap whitespace-nowrap items-baseline gap-x-2 sm:gap-x-3 uppercase">
                            <span className="flex text-lg sm:text-xl lg:text-2xl xl:text-3xl italic font-black">
                                {'Showroom'.split('').map((char, index) => (
                                    <span key={`sr-${index}`} className="inline-block animate-transformer-letter" style={{ animationDelay: `${0.2 + index * 0.06}s` }}>
                                        {char === ' ' ? '\u00A0' : char}
                                    </span>
                                ))}
                            </span>
                             <span className="inline-flex items-center text-3xl sm:text-4xl lg:text-5xl xl:text-5xl px-6 py-2.5 bg-[#0f172a] text-white font-black uppercase tracking-widest select-none shadow-[6px_6px_0px_0px_#0284c7] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#0284c7] transition-all duration-300 ml-2">
                                Thuận An
                            </span>
                        </h1>
                        <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto lg:mx-0 leading-relaxed font-bold animate-transformer-fade-up">
                            Hệ thống quản lý thông minh giúp bạn dễ dàng theo dõi đơn hàng, kiểm tra kho xe và tối ưu quy trình bán hàng.
                        </p>
                    </div>

                    {/* Features Showcase - Neo-Brutalist Panel */}
                    <div className="relative w-full max-w-[560px] mx-auto lg:mx-0 p-0 bg-white border-2 border-slate-300 shadow-[8px_8px_0px_0px_#e2e8f0] animate-transformer-slam flex flex-col overflow-hidden">
                        {/* Top banner accent */}
                        <div className="h-2 bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#10b981] border-b border-slate-200 w-full"></div>
                        
                        <div className="relative flex flex-col gap-3 p-5 overflow-hidden">
                            {[
                                { icon: 'fa-file-signature', title: 'Tiến Độ Đơn Hàng', desc: 'Theo dõi toàn bộ vòng đời của đơn hàng của bạn' },
                                { icon: 'fa-warehouse', title: 'Kho Xe', desc: 'Tra cứu thông tin phiên bản màu sắc theo nhu cầu' },
                                { icon: 'fa-chart-line', title: 'Lịch Sử Bán Hàng', desc: 'Sổ sách và báo cáo phân tích trực quan.' }
                            ].map((feat, idx) => (
                                <div key={idx} className={`animate-transformer-item-${idx + 1} flex items-center gap-4 sm:gap-5 p-4 bg-white border border-slate-300 shadow-[4px_4px_0px_0px_#e2e8f0] hover:shadow-[6px_6px_0px_0px_#e2e8f0] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-300 cursor-default`}>
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center shadow-[2px_2px_0px_0px_#f1f5f9] transition-all duration-300">
                                        <i className={`fa-solid ${feat.icon} text-xl sm:text-2xl text-[#0284c7]`}></i>
                                    </div>
                                    <div className="text-left flex-1">
                                        <h3 className="text-slate-800 font-black text-sm sm:text-base tracking-wide mb-1 transition-colors">{feat.title}</h3>
                                        <p className="text-slate-500 text-sm font-bold leading-relaxed">{feat.desc}</p>
                                    </div>
                                    <div className="text-[#0284c7] pr-2">
                                        <i className="fa-solid fa-chevron-right text-sm"></i>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Neo-Brutalist Premium Login Frame with 3D Parallax */}
                <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end relative z-50 px-2 sm:px-4 lg:px-0 perspective-1000 order-2 lg:order-2">
                    <div
                        className="relative w-full max-w-[420px] transition-all duration-500 ease-out pointer-events-auto p-0 bg-transparent border-none shadow-none"
                        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px) scale3d(1.02, 1.02, 1.02)` }}
                    >

                        {/* Asymmetric Hard-Edged Card - Neo-Brutalist Signature Style */}
                        <div className="w-full bg-white border-2 border-slate-300 shadow-[8px_8px_0px_0px_#e2e8f0] hover:shadow-[12px_12px_0px_0px_#e2e8f0] transition-all overflow-visible relative z-20 flex flex-col">
                            
                            {/* Card Accent Top Banner - Soft EV cyan to emerald */}
                            <div className="h-4 bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#10b981] border-b border-slate-200 w-full relative"></div>

                            {/* Paperclip Image in Top Right */}
                            <div className="absolute top-[-26px] right-6 z-30 select-none hover:scale-110 transition-all cursor-pointer rotate-[30deg] animate-clip-glow">
                                <img src={kepgiay} alt="Paperclip" className="w-16 h-16 object-contain drop-shadow-lg" />
                            </div>

                            {/* Dynamic Content Area */}
                            <main className="px-6 py-10 transition-all duration-300">
                                {viewMode === 'login' && (
                                    <div key="login-view" className="animate-fade-in">
                                        <div className="text-[12px] font-mono tracking-wider font-bold text-[#0284c7] mb-1 uppercase">Xin chào,</div>
                                        <div className="text-[26px] text-slate-800 font-black mb-8 uppercase tracking-tight leading-none">
                                            Đăng Nhập
                                        </div>

                                        <div className="space-y-6">
                                            <form onSubmit={handleLoginSubmit} className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                                                        Tài khoản Email
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            value={username}
                                                            onChange={e => setUsername(e.target.value)}
                                                            type="text"
                                                            required
                                                            placeholder="example@gmail.com"
                                                            className="w-full px-4 py-4 bg-white border border-slate-300 focus:bg-slate-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#f1f5f9] outline-none text-[14px] text-slate-800 font-bold transition-all placeholder:text-slate-400 font-mono"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">
                                                        Mật khẩu
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            value={password}
                                                            onChange={e => setPassword(e.target.value)}
                                                            type="password"
                                                            required
                                                            placeholder="••••••••"
                                                            className="w-full px-4 py-4 bg-white border border-slate-300 focus:bg-slate-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#f1f5f9] outline-none text-[14px] text-slate-800 font-bold transition-all placeholder:text-slate-400 font-mono"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-1 pb-1 select-none">
                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                        <input
                                                            type="checkbox"
                                                            checked={rememberMe}
                                                            onChange={e => setRememberMe(e.target.checked)}
                                                            className="form-checkbox h-4 w-4 text-[#0284c7] border-slate-300 rounded-none cursor-pointer"
                                                        />
                                                        <span className="text-[12px] font-black text-slate-800 uppercase tracking-wide">Duy trì đăng nhập</span>
                                                    </label>
                                                </div>

                                                <div className="flex justify-center pt-2">
                                                    <button
                                                        type="submit"
                                                        disabled={isSubmitting}
                                                        className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-4 px-10 border border-slate-300 font-black text-[14px] tracking-[1.5px] shadow-[4px_4px_0px_0px_#e2e8f0] hover:shadow-[6px_6px_0px_0px_#cbd5e1] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-70 flex items-center justify-center gap-3 uppercase cursor-pointer"
                                                    >
                                                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'ĐĂNG NHẬP'}
                                                    </button>
                                                </div>
                                            </form>

                                            <div className="text-center mt-6">
                                                <button type="button" onClick={() => setViewMode('forgot')} className="text-slate-700 hover:text-[#0284c7] underline text-[12px] font-bold tracking-wider transition-colors uppercase">
                                                    Bạn quên mật khẩu?
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {viewMode === 'forgot' && (
                                    <div key="forgot-view" className="animate-fade-in">
                                        {!isEmailSent ? (
                                            <>
                                                <div className="text-[12px] font-mono tracking-wider font-bold text-[#0284c7] mb-1 uppercase">Khôi phục,</div>
                                                <div className="text-[26px] text-slate-800 font-black mb-8 uppercase tracking-tight leading-none">
                                                    Quên Mật Khẩu
                                                </div>

                                                <div className="space-y-6">
                                                    <div className="text-[13px] text-slate-800 leading-relaxed font-bold bg-slate-50 p-4 border border-slate-300 shadow-[4px_4px_0px_0px_#f1f5f9]">
                                                        Vui lòng nhập email đã đăng ký. Link khôi phục sẽ được gửi ngay lập tức.
                                                    </div>

                                                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                                                        <div className="space-y-2">
                                                            <label className="text-[11px] font-black text-slate-800 uppercase tracking-wider block">Địa chỉ Email</label>
                                                            <input
                                                                value={email}
                                                                onChange={e => setEmail(e.target.value)}
                                                                type="email"
                                                                required
                                                                placeholder="example@gmail.com"
                                                                className="w-full px-4 py-4 bg-white border border-slate-300 focus:bg-slate-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#f1f5f9] outline-none text-[14px] text-slate-800 font-bold transition-all placeholder:text-slate-400 font-mono"
                                                            />
                                                        </div>

                                                        <div className="flex justify-center pt-2">
                                                            <button
                                                                type="submit"
                                                                disabled={isSubmitting}
                                                                className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-4 px-10 border border-slate-300 font-black text-[14px] tracking-[1.5px] shadow-[4px_4px_0px_0px_#e2e8f0] hover:shadow-[6px_6px_0px_0px_#cbd5e1] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-70 flex items-center justify-center gap-3 uppercase cursor-pointer"
                                                            >
                                                                {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'Gửi yêu cầu'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-6">
                                                <div className="w-16 h-16 bg-[#10b981] border border-slate-200 rounded-none flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_#f1f5f9]">
                                                    <i className="fas fa-check text-white text-2xl"></i>
                                                </div>
                                                <h3 className="text-[22px] font-black text-slate-800 mb-2 uppercase tracking-tight">Đã Gửi Link!</h3>
                                                <p className="text-slate-800 text-[13px] leading-relaxed px-4 font-bold">
                                                    Vui lòng kiểm tra email <span className="underline decoration-[#0284c7] decoration-2">{email}</span>.
                                                </p>
                                                
                                                <div className="mt-8 p-4 bg-slate-50 rounded-none border border-slate-200 text-[12px] font-bold text-slate-700 text-left flex items-start gap-3 shadow-[4px_4px_0px_0px_#f1f5f9]">
                                                    <i className="fas fa-info-circle mt-0.5 text-sm"></i>
                                                    <span className="leading-relaxed">Nếu không thấy email, vui lòng kiểm tra hộp thư rác (Spam).</span>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="text-center mt-10">
                                            <button type="button" onClick={handleBackToLogin} className="text-slate-700 hover:text-[#0284c7] text-[13px] font-black underline transition-colors flex items-center justify-center gap-2 mx-auto group">
                                                <i className="fas fa-arrow-left text-[11px] transition-transform group-hover:-translate-x-1"></i>
                                                Quay lại Đăng nhập
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {viewMode === 'join' && (
                                    <div key="join-view" className="animate-fade-in">
                                        <div className="text-[12px] font-mono tracking-wider font-bold text-[#0284c7] mb-1 uppercase">Chào mừng,</div>
                                        <div className="text-[22px] text-slate-800 font-black mb-6 uppercase tracking-tight leading-none">Tham Gia Hệ Thống</div>

                                        <div className="bg-white border border-slate-300 p-5 space-y-5 shadow-[4px_4px_0px_0px_#e2e8f0]">
                                            <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200">
                                                <div className="w-12 h-12 border border-slate-300 bg-white flex items-center justify-center text-slate-800 shadow-[2px_2px_0px_0px_#f1f5f9]">
                                                    <i className="fas fa-user-tie text-xl"></i>
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="text-[10px] text-[#0284c7] font-black uppercase tracking-wider">Nhân viên mới</div>
                                                    <div className="text-slate-800 text-[15px] font-black leading-tight truncate">{invitationDetails?.full_name}</div>
                                                    <div className="text-[11px] font-mono font-bold text-slate-600 truncate">{invitationDetails?.role}</div>
                                                </div>
                                            </div>

                                            <form onSubmit={handleJoinSubmit} className="space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">Xác nhận Email</label>
                                                    <input
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        required
                                                        type="email"
                                                        className="w-full px-3 py-3 bg-white border border-slate-300 focus:bg-slate-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#f1f5f9] text-[13px] text-slate-800 font-bold transition-all placeholder:text-slate-400 font-mono"
                                                        placeholder="example@gmail.com"
                                                    />
                                                </div>

                                                <div className="space-y-1 pt-2">
                                                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">Thiết lập mật khẩu</label>
                                                    <input
                                                        value={password}
                                                        onChange={e => setPassword(e.target.value)}
                                                        required
                                                        type="password"
                                                        className="w-full px-3 py-3 bg-white border border-slate-300 focus:bg-slate-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_#f1f5f9] text-[13px] text-slate-800 font-bold transition-all placeholder:text-slate-400 font-mono"
                                                        placeholder="Tối thiểu 10 ký tự..."
                                                    />
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="w-full bg-[#0284c7] hover:bg-[#0369a1] text-white py-4 border border-slate-300 font-black text-[13px] shadow-[4px_4px_0px_0px_#e2e8f0] hover:shadow-[6px_6px_0px_0px_#cbd5e1] hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-70 flex items-center justify-center gap-2 mt-4 uppercase cursor-pointer"
                                                >
                                                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'KÍCH HOẠT TÀI KHOẢN'}
                                                </button>
                                            </form>
                                        </div>

                                        <div className="text-center mt-8">
                                            <button type="button" onClick={handleBackToLogin} className="text-slate-700 hover:text-[#0284c7] text-[11px] font-black uppercase tracking-widest underline transition-colors">
                                                Quay lại đăng nhập
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </main>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes cinema-pan {
                    0%, 100% { transform: scale(1.02) translate(0, 0); }
                    25% { transform: scale(1.06) translate(-1%, 1%); }
                    50% { transform: scale(1.08) translate(1%, -1%); }
                    75% { transform: scale(1.05) translate(-1%, -1%); }
                }
                .animate-cinema-pan { animation: cinema-pan 25s ease-in-out infinite; transform-origin: center; }

                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .animate-blink { animation: blink 1s step-end infinite; }
                
                /* Enhanced Animations */
                @keyframes grid-move {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(50px); }
                }
                .bg-grid {
                    background-size: 50px 50px;
                    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    animation: grid-move 2s linear infinite;
                }
                .animate-grid-rotate {
                    transform: rotateX(60deg) translateY(-20vh) translateZ(-200px);
                }

                @keyframes light-beam {
                    0% { transform: translateY(-50vh) rotate(5deg); opacity: 0; filter: blur(5px); }
                    20% { opacity: 1; filter: blur(0px); }
                    80% { opacity: 1; filter: blur(0px); }
                    100% { transform: translateY(150vh) rotate(5deg); opacity: 0; filter: blur(5px); }
                }
                .beam {
                    position: absolute;
                    width: 3px;
                    height: 250px;
                    background: linear-gradient(to bottom, transparent, rgba(34, 211, 238, 0.9), transparent);
                    animation: light-beam 8s infinite ease-in-out;
                    box-shadow: 0 0 25px 3px rgba(34, 211, 238, 0.8), 0 0 50px 10px rgba(59, 130, 246, 0.4);
                    top: -250px;
                    border-radius: 50%;
                }
                
                @keyframes scanline {
                    0% { top: -10%; opacity: 0; }
                    20% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }
                .animate-scanline { animation: scanline 12s linear infinite; }

                .animation-delay-0 { animation-delay: 0s; }
                .animation-delay-1000 { animation-delay: 1.5s; }
                .animation-delay-2000 { animation-delay: 3s; }
                .animation-delay-4000 { animation-delay: 5s; }

                /* Assembly Anim */
                @keyframes assemble-up {
                    from { transform: translateY(40px) scale(0.95); opacity: 0; filter: blur(10px); }
                    to { transform: translateY(0) scale(1); opacity: 1; filter: blur(0); }
                }
                .animate-stagger-1 { animation: assemble-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.1s; opacity: 0; }
                .animate-stagger-2 { animation: assemble-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.2s; opacity: 0; }
                .animate-stagger-3 { animation: assemble-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.3s; opacity: 0; }
                .animate-stagger-4 { animation: assemble-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.4s; opacity: 0; }
                .animate-stagger-5 { animation: assemble-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.5s; opacity: 0; }

                /* Transformer Left Side Animations */
                @keyframes transformer-letter {
                    0% { transform: scale(3) rotateY(180deg) rotateX(180deg) translateZ(200px); opacity: 0; filter: blur(15px); }
                    50% { transform: scale(0.5) rotateY(-20deg) rotateX(-20deg) translateZ(-50px); opacity: 0.8; filter: blur(5px); }
                    100% { transform: scale(1) rotateY(0deg) rotateX(0deg) translateZ(0); opacity: 1; filter: blur(0); }
                }
                .animate-transformer-letter { animation: transformer-letter 1.2s cubic-bezier(0.1, 0.8, 0.2, 1) forwards; opacity: 0; }

                @keyframes transformer-drop {
                    0% { transform: translateY(-100vh) rotate(-15deg); opacity: 0; filter: blur(20px); }
                    70% { transform: translateY(10px) rotate(5deg); opacity: 1; filter: blur(5px); }
                    100% { transform: translateY(0) rotate(0); opacity: 1; filter: blur(0); }
                }
                .animate-transformer-drop { animation: transformer-drop 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; opacity: 0; }

                @keyframes transformer-slide-right {
                    0% { transform: translateX(-150%) skewX(30deg); opacity: 0; filter: blur(15px); }
                    70% { transform: translateX(20px) skewX(-10deg); opacity: 1; filter: blur(2px); }
                    100% { transform: translateX(0) skewX(0); opacity: 1; filter: blur(0); }
                }
                .animate-transformer-slide-right { animation: transformer-slide-right 1.5s cubic-bezier(0.1, 0.6, 0.2, 1) forwards; animation-delay: 0.4s; opacity: 0; }

                @keyframes transformer-fade-up {
                    0% { transform: translateY(50px) rotateX(45deg); opacity: 0; filter: blur(10px); }
                    100% { transform: translateY(0) rotateX(0deg); opacity: 1; filter: blur(0); }
                }
                .animate-transformer-fade-up { animation: transformer-fade-up 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 0.8s; opacity: 0; transform-origin: top; }

                @keyframes transformer-slam {
                    0% { transform: scale(3) translateZ(500px) translateY(100vh); opacity: 0; filter: blur(40px); }
                    60% { transform: scale(1.05) translateZ(0) translateY(-20px); opacity: 0.8; filter: blur(5px); }
                    100% { transform: scale(1) translateZ(0) translateY(0); opacity: 1; filter: blur(0); }
                }
                .animate-transformer-slam { animation: transformer-slam 2s cubic-bezier(0.1, 0.8, 0.1, 1) forwards; animation-delay: 1.2s; opacity: 0; }

                @keyframes transformer-item-slide-in {
                    0% { transform: translateX(120%) rotateY(-60deg); opacity: 0; filter: blur(5px); }
                    100% { transform: translateX(0) rotateY(0deg); opacity: 1; filter: blur(0); }
                }
                .animate-transformer-item-1 { animation: transformer-item-slide-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 2.0s; opacity: 0; transform-origin: right; }
                .animate-transformer-item-2 { animation: transformer-item-slide-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 2.3s; opacity: 0; transform-origin: right; }
                .animate-transformer-item-3 { animation: transformer-item-slide-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: 2.6s; opacity: 0; transform-origin: right; }


                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 10s infinite alternate cubic-bezier(0.4, 0, 0.2, 1); }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-4000 { animation-delay: 4s; }

                @keyframes slow-pan {
                    0% { transform: scale(1.05) translate(0, 0); }
                    50% { transform: scale(1.1) translate(-1%, -1%); }
                    100% { transform: scale(1.05) translate(0, 0); }
                }
                .animate-slow-pan { animation: slow-pan 30s infinite ease-in-out; }

                .perspective-1000 { perspective: 1000px; transform-style: preserve-3d; }


            `}</style>
        </div >
    );
};

export default LoginScreen;
