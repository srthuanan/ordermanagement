import React, { useState, FormEvent, useEffect } from 'react';
import * as authService from '../services/authService';
// Import images
import modernBg from '../pictures/complex_luxury_car_bg.jpg';




interface LoginScreenProps {
    onLoginSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // --- LOGIC GIAO DIỆN MỚI ---
    const [typingText, setTypingText] = useState('');
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





    const fullText = "Quản Lý Đơn Hàng";



    // Typing effect logic
    useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= fullText.length) {
                setTypingText(fullText.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, 100); // Speed of typing
        return () => clearInterval(interval);
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
        const result = await authService.login(username, password);
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
        setIsSubmitting(true);
        const result = await authService.forgotPassword(email);
        setIsSubmitting(false);
        if (result.success) {
            showToast('Thành công', 'Mã xác thực đã gửi.', 'success');
            setViewMode('reset');
        } else {
            showToast('Lỗi', result.message || 'Lỗi gửi yêu cầu.', 'error');
        }
    };

    const handleResetPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const result = await authService.resetPassword(email, otp, newPassword);
        setIsSubmitting(false);
        if (result.success) {
            showToast('Thành công', 'Đổi mật khẩu thành công.', 'success');
            handleBackToLogin();
        } else {
            showToast('Lỗi', result.message || 'Thất bại.', 'error');
        }
    };

    const handleBackToLogin = () => {
        setEmail(''); setOtp(''); setUsername(''); setPassword('');
        setViewMode('login');
    };


    return (
        <div
            className="relative min-h-screen w-full max-w-full flex items-center justify-center overflow-hidden overflow-x-hidden font-sans bg-slate-50 selection:bg-blue-500 selection:text-white"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >



            {/* Background */}
            <div className="absolute inset-0 z-0 bg-slate-950 overflow-hidden overflow-x-hidden pointer-events-none max-w-full">
                {/* 3D Depth Wrapper for Background Parallax */}
                <div
                    className="absolute inset-[-5%] w-[110%] h-[110%] transition-transform duration-300 ease-out"
                    style={{ transform: `translate(${-mousePos.x * 2.5}px, ${mousePos.y * 2.5}px)` }}
                >
                    <img src={modernBg} alt="Modern Background" className="w-full h-full object-cover object-center select-none opacity-90 animate-cinema-pan mix-blend-screen" draggable="false" />
                </div>
                {/* Premium Vignette Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.5)_120%)] pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/30 to-white/60 max-h-screen pointer-events-none"></div>

                {/* Animated Perspective Grid */}
                <div className="absolute inset-0 perspective-1000 origin-bottom opacity-20 mt-[30vh] pointer-events-none">
                    <div className="absolute inset-0 w-[200%] md:w-[150%] left-[-50%] md:left-[-25%] h-[200%] bg-grid animate-grid-rotate mix-blend-overlay"></div>
                </div>

                {/* Animated Electric Light Beams */}
                <div className="absolute inset-0 overflow-hidden opacity-60 pointer-events-none">
                    <div className="beam left-[15%] animation-delay-0 mix-blend-screen"></div>
                    <div className="beam left-[45%] animation-delay-2000 mix-blend-screen"></div>
                    <div className="beam left-[75%] animation-delay-4000 mix-blend-screen"></div>
                    <div className="beam left-[90%] animation-delay-1000 mix-blend-screen"></div>
                </div>

                {/* Floating Glowing Orbs - Optimized with transform-gpu and radial gradients */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-[radial-gradient(circle,rgba(103,232,249,0.15)_0%,transparent_70%)] rounded-full mix-blend-screen animate-blob transform-gpu will-change-transform"></div>
                    <div className="absolute top-[30%] right-[5%] w-[35rem] h-[35rem] bg-[radial-gradient(circle,rgba(147,197,253,0.15)_0%,transparent_70%)] rounded-full mix-blend-screen animate-blob animation-delay-2000 transform-gpu will-change-transform"></div>
                    <div className="absolute bottom-[0%] left-[40%] w-[45rem] h-[45rem] bg-[radial-gradient(circle,rgba(165,180,252,0.1)_0%,transparent_70%)] rounded-full mix-blend-screen animate-blob animation-delay-4000 transform-gpu will-change-transform"></div>
                </div>

                {/* Horizontal Sweeping Laser */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute w-full h-[1px] bg-cyan-400/50 shadow-[0_0_20px_2px_rgba(34,211,238,0.5)] animate-scanline mix-blend-screen"></div>
                </div>

                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E')] opacity-[0.05] mix-blend-overlay pointer-events-none"></div>
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
                @keyframes text-glow {
                    0%, 100% { opacity: 0.5; filter: brightness(1.2) blur(1px); }
                    50% { opacity: 1; filter: brightness(2) blur(2px) drop-shadow(0 0 5px #00ff00); }
                }
                .animate-text-glow { animation: text-glow 2s ease-in-out infinite; }
                
                @keyframes float-up {
                    0% { transform: translateY(20px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .animate-float-up { animation: float-up 0.8s ease-out forwards; }
            `}</style>


                {/* Left Side: Features Showcase (New Redesign) */}
                <div className="hidden lg:flex w-full lg:w-1/2 flex-col justify-center relative z-50 px-2 sm:px-4 lg:px-0 lg:pr-12 mt-2 lg:mt-0 order-3 lg:order-1 pt-4 lg:pt-0 pb-12 sm:pb-20 lg:pb-0">
                    {/* Desktop Title Section */}
                    <div className="hidden lg:block text-left mb-10 w-full relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/50 text-blue-700 text-xs font-semibold tracking-[0.2em] uppercase mb-6 shadow-sm backdrop-blur-md animate-transformer-drop">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Hệ Thống Nội Bộ
                        </div>
                        <h1 className="font-extrabold mb-4 tracking-tight leading-[1.2] drop-shadow-xl flex flex-row flex-nowrap whitespace-nowrap items-baseline gap-x-2 sm:gap-x-3">
                            <span className="flex text-slate-800 text-xl sm:text-2xl lg:text-3xl xl:text-4xl">
                                {'Showroom'.split('').map((char, index) => (
                                    <span key={`sr-${index}`} className="inline-block animate-transformer-letter" style={{ animationDelay: `${0.2 + index * 0.06}s` }}>
                                        {char === ' ' ? '\u00A0' : char}
                                    </span>
                                ))}
                            </span>
                            <span className="flex text-3xl sm:text-4xl lg:text-5xl xl:text-6xl pb-2">
                                {'Thuận An'.split('').map((char, index) => (
                                    <span key={`ta-${index}`} className="inline-block animate-transformer-letter text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 drop-shadow-sm pb-2" style={{ animationDelay: `${0.8 + index * 0.06}s` }}>
                                        {char === ' ' ? '\u00A0' : char}
                                    </span>
                                ))}
                            </span>
                        </h1>
                        <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto lg:mx-0 leading-relaxed font-medium animate-transformer-fade-up">
                            Hệ thống quản lý giúp bạn dễ dàng theo dõi đơn hàng, kiểm tra kho xe và tối ưu quy trình bán hàng.
                        </p>
                    </div>

                    {/* Features Showcase - Glass Panel */}
                    <div className="relative w-full max-w-[560px] mx-auto lg:mx-0 p-[1px] rounded-3xl shadow-[0_30px_60px_rgba(59,130,246,0.05)] animate-transformer-slam">
                        <div className="absolute inset-0 rounded-3xl bg-slate-50/5 backdrop-blur-[15px] border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1)]"></div>
                        <div className="relative flex flex-col gap-1 p-3 sm:p-5 overflow-hidden">
                            {[
                                { icon: 'fa-file-signature', title: 'Tiến Độ Đơn Hàng', desc: 'Theo dõi toàn bộ vòng đời của đơn hàng của\u00A0bạn' },
                                { icon: 'fa-warehouse', title: 'Kho Xe', desc: 'Tra cứu thông tin phiên bản màu sắc theo nhu\u00A0cầu' },
                                { icon: 'fa-chart-line', title: 'Lịch Sử Bán Hàng', desc: 'Sổ sách và báo cáo phân tích trực\u00A0quan.' }
                            ].map((feat, idx) => (
                                <div key={idx} className={`animate-transformer-item-${idx + 1} flex items-center gap-4 sm:gap-5 p-3 sm:p-4 rounded-2xl hover:bg-white/20 transition-all duration-300 group cursor-default shadow-sm border border-transparent hover:border-white/30 hover:shadow-lg backdrop-blur-sm`}>
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full flex items-center justify-center bg-white/30 border border-white/50 text-slate-700 group-hover:text-blue-600 group-hover:border-cyan-300 group-hover:bg-white/60 transition-all duration-300 shadow-sm">
                                        <i className={`fa-solid ${feat.icon} text-lg sm:text-xl transform group-hover:scale-110 transition-transform duration-300`}></i>
                                    </div>
                                    <div className="text-left flex-1">
                                        <h3 className="text-slate-800 font-bold text-sm sm:text-base tracking-wide mb-1 group-hover:text-blue-600 transition-colors drop-shadow-sm">{feat.title}</h3>
                                        <p className="text-slate-500 text-sm leading-relaxed">{feat.desc}</p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-blue-500/70 pr-2 transform translate-x-[-10px] group-hover:translate-x-0">
                                        <i className="fa-solid fa-chevron-right text-xs"></i>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Modern Login Frame with 3D Parallax */}
                <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end relative z-50 px-2 sm:px-4 lg:px-0 perspective-1000 order-2 lg:order-2">
                    <div
                        className="relative w-full max-w-[420px] p-6 sm:p-8 md:p-10 rounded-[2rem] bg-white/5 backdrop-blur-[20px] border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.1),inset_0_0_20px_rgba(255,255,255,0.2)] flex flex-col items-center justify-center group transition-transform duration-300 ease-out pointer-events-auto"
                        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px) scale3d(1.02, 1.02, 1.02)` }}
                    >

                        {/* Edge Lighting Shimmer */}
                        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                            <div className="absolute top-0 -left-[100%] w-[200%] h-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent group-hover:transition-all group-hover:duration-1500 group-hover:left-[100%]"></div>
                        </div>

                        {/* Top Gloss Highlight */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-80"></div>


                        <div className="text-center mb-8 w-full relative z-10 animate-stagger-1">
                            <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
                                {viewMode === 'login' ? 'Truy Cập Hệ Thống' : viewMode === 'forgot' ? 'Khôi Phục' : 'Mật Khẩu Mới'}
                            </h2>
                            <p className="text-blue-600 text-[10px] tracking-[0.2em] uppercase font-semibold min-h-[16px] opacity-80">
                                {typingText}<span className="animate-blink text-slate-800">|</span>
                            </p>
                        </div>

                        {viewMode === 'login' && (
                            <form onSubmit={handleLoginSubmit} className="space-y-3 w-full relative z-10">
                                <div className="space-y-2 animate-stagger-2 pt-2">
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <i className="fas fa-user text-slate-400 text-sm transition-colors group-focus-within/input:text-blue-500"></i>
                                        </div>
                                        <input
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            type="text"
                                            className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/30 rounded-xl text-slate-800 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/30 transition-all text-sm shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-md font-medium"
                                            placeholder="Tên đăng nhập"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 pb-2 animate-stagger-3">
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <i className="fas fa-lock text-slate-500 text-sm transition-colors group-focus-within/input:text-cyan-500"></i>
                                        </div>
                                        <input
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            type="password"
                                            className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/30 rounded-xl text-slate-800 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/30 transition-all text-sm shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-md font-medium"
                                            placeholder="Mật khẩu"
                                        />
                                    </div>
                                </div>

                                <div className="animate-stagger-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className={`w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform transition-all hover:-translate-y-0.5 active:scale-[0.98] uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-3 relative overflow-hidden`}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <i className="fas fa-circle-notch fa-spin text-lg"></i>
                                                <span>Đang Xác Thực...</span>
                                            </>
                                        ) : 'Đăng Nhập'}
                                    </button>
                                </div>

                                <div className="text-center flex justify-center mt-6 animate-stagger-5 pt-2">
                                    <button type="button" onClick={() => setViewMode('forgot')} className="text-slate-500 hover:text-blue-600 text-xs transition-colors font-semibold relative z-20 p-2 cursor-pointer inline-block">
                                        Quên mật khẩu?
                                    </button>
                                </div>
                            </form>
                        )}

                        {viewMode === 'forgot' && (
                            <form key="forgot" onSubmit={handleForgotPasswordSubmit} className="space-y-4 w-full relative z-10">
                                <div className="space-y-2 animate-stagger-2 pt-2">
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <i className="fas fa-envelope text-slate-400 text-sm transition-colors group-focus-within/input:text-blue-500"></i>
                                        </div>
                                        <input
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            type="email"
                                            className="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/30 rounded-xl text-slate-800 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/30 transition-all text-sm shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-md font-medium z-10 relative"
                                            placeholder="Email đăng ký"
                                        />
                                    </div>
                                </div>
                                <div className="animate-stagger-3 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform transition-all hover:-translate-y-0.5 active:scale-[0.98] uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-3 relative overflow-hidden z-10"
                                    >
                                        {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'Gửi Mã Xác Nhận'}
                                    </button>
                                </div>
                                <div className="text-center flex justify-center mt-6 animate-stagger-4 pt-2">
                                    <button type="button" onClick={handleBackToLogin} className="text-slate-500 hover:text-blue-600 text-xs transition-colors font-semibold relative z-20 p-2 cursor-pointer inline-block">
                                        Quay lại đăng nhập
                                    </button>
                                </div>
                            </form>
                        )}

                        {viewMode === 'reset' && (
                            <form key="reset" onSubmit={handleResetPasswordSubmit} className="space-y-4 w-full relative z-10">
                                <div className="space-y-2 animate-stagger-2 pt-2">
                                    <input
                                        value={otp}
                                        onChange={e => setOtp(e.target.value)}
                                        type="text"
                                        className="w-full px-4 py-3.5 bg-white/10 border border-white/30 rounded-xl text-slate-800 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/30 transition-all text-sm shadow-inner text-center tracking-[0.5em] focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-md font-bold"
                                        placeholder="Mã OTP"
                                    />
                                </div>
                                <div className="space-y-2 animate-stagger-3">
                                    <input
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        type="password"
                                        className="w-full px-4 py-3.5 bg-white/10 border border-white/30 rounded-xl text-slate-800 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/30 transition-all text-sm shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-md font-medium"
                                        placeholder="Mật khẩu mới"
                                    />
                                </div>
                                <div className="space-y-2 animate-stagger-4">
                                    <input
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        type="password"
                                        className="w-full px-4 py-3.5 bg-white/10 border border-white/30 rounded-xl text-slate-800 placeholder-slate-600 focus:outline-none focus:border-cyan-400 focus:bg-white/30 transition-all text-sm shadow-inner focus:shadow-[0_0_20px_rgba(34,211,238,0.2)] backdrop-blur-md font-medium"
                                        placeholder="Nhập lại mật khẩu"
                                    />
                                </div>
                                <div className="animate-stagger-5 pt-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform transition-all hover:-translate-y-0.5 active:scale-[0.98] uppercase tracking-[0.15em] text-xs flex items-center justify-center gap-3 relative overflow-hidden z-10"
                                    >
                                        {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : 'Đổi Mật Khẩu'}
                                    </button>
                                </div>
                                <div className="text-center flex justify-center mt-6 animate-stagger-5 pt-2">
                                    <button type="button" onClick={handleBackToLogin} className="text-slate-500 hover:text-blue-600 text-xs transition-colors font-semibold relative z-20 p-2 cursor-pointer inline-block">
                                        Hủy bỏ
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div >
            </div >

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
