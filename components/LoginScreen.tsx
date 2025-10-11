import React, { useState, useEffect, useRef, FormEvent } from 'react';
import * as authService from '../services/authService';

interface LoginScreenProps {
    onLoginSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for different views
    const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'reset'>('login');

    // Login form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    
    // Forgot/Reset password state
    const [email, setEmail] = useState(''); 
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const clockIntervalRef = useRef<number | null>(null);

    // Canvas animation effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let stars: { x: number; y: number; z: number }[] = [];
        const starCount = 800;
        const speed = 2;
        let width: number, height: number, centerX: number, centerY: number;

        const init = () => {
            const parent = canvas.parentElement;
            if (!parent) return;

            width = parent.offsetWidth;
            height = parent.offsetHeight;
            canvas.width = width * window.devicePixelRatio;
            canvas.height = height * window.devicePixelRatio;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

            centerX = width / 2;
            centerY = height / 2;

            stars = [];
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: (Math.random() - 0.5) * width,
                    y: (Math.random() - 0.5) * height,
                    z: Math.random() * width,
                });
            }
        };

        const animate = () => {
            if (!canvas.parentElement) {
                window.cancelAnimationFrame(animationFrameId);
                return;
            }
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (const star of stars) {
                star.z -= speed;
                if (star.z <= 0) {
                    star.x = (Math.random() - 0.5) * width;
                    star.y = (Math.random() - 0.5) * height;
                    star.z = width;
                }
                const k = 128 / star.z;
                const px = star.x * k + centerX;
                const py = star.y * k + centerY;
                if (px >= 0 && px <= width && py >= 0 && py <= height) {
                    const size = (1 - star.z / width) * 4;
                    ctx.beginPath();
                    ctx.arc(px, py, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            animationFrameId = window.requestAnimationFrame(animate);
        };

        const resizeObserver = new ResizeObserver(() => {
            window.cancelAnimationFrame(animationFrameId);
            init();
            animate();
        });

        if (canvas.parentElement) {
          init();
          animate();
          resizeObserver.observe(canvas.parentElement);
        }

        return () => {
            window.cancelAnimationFrame(animationFrameId);
            if (canvas.parentElement) {
                resizeObserver.unobserve(canvas.parentElement);
            }
        };
    }, []);

    // Clock update effect
    useEffect(() => {
        const dayOfWeekEl = document.getElementById('hero-day-of-week');
        const fullDateEl = document.getElementById('hero-full-date');
        const timeEl = document.getElementById('hero-time');
        const timezoneEl = document.getElementById('hero-timezone');

        if (!dayOfWeekEl || !fullDateEl || !timeEl || !timezoneEl) return;

        const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

        const updateTime = () => {
            const now = new Date();
            dayOfWeekEl.textContent = days[now.getDay()];
            fullDateEl.textContent = `Ngày ${String(now.getDate()).padStart(2, '0')} tháng ${String(now.getMonth() + 1).padStart(2, '0')}, ${now.getFullYear()}`;
            timeEl.innerHTML = `${String(now.getHours()).padStart(2, '0')}<span class="opacity-50 animate-pulse">:</span>${String(now.getMinutes()).padStart(2, '0')}<span class="opacity-50 animate-pulse">:</span>${String(now.getSeconds()).padStart(2, '0')}`;
            timezoneEl.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ');
        };

        updateTime();
        clockIntervalRef.current = window.setInterval(updateTime, 1000);

        return () => {
            if (clockIntervalRef.current) {
                clearInterval(clockIntervalRef.current);
            }
        };
    }, []);
    
    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            showToast('Lỗi', 'Vui lòng nhập đầy đủ thông tin!', 'error');
            return;
        }
        setIsSubmitting(true);
        const result = await authService.login(username, password);
        setIsSubmitting(false);

        if (result.success) {
            showToast('Thành Công', 'Đăng nhập thành công!', 'success');
            onLoginSuccess();
        } else {
            showToast('Thất Bại', result.message || 'Đăng nhập không thành công.', 'error');
        }
    };
    
    const handleForgotPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) {
            showToast('Lỗi', 'Vui lòng nhập email của bạn.', 'error');
            return;
        }
        setIsSubmitting(true);
        const result = await authService.forgotPassword(email);
        setIsSubmitting(false);

        if (result.success) {
            showToast('Thành Công', result.message || 'Mã OTP đã được gửi.', 'success', 6000);
            setViewMode('reset');
        } else {
            showToast('Thất Bại', result.message || 'Yêu cầu không thành công.', 'error');
        }
    };

    const handleResetPasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!otp || !newPassword || !confirmPassword) {
            showToast('Thiếu Thông Tin', 'Vui lòng điền đầy đủ các trường.', 'warning');
            return;
        }
        if (newPassword.length < 6) {
            showToast('Mật Khẩu Yếu', 'Mật khẩu mới phải có ít nhất 6 ký tự.', 'warning');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast('Lỗi', 'Mật khẩu xác nhận không khớp.', 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await authService.resetPassword(email, otp, newPassword);
        setIsSubmitting(false);

        if (result.success) {
            showToast('Thành Công', result.message || 'Mật khẩu đã được đặt lại.', 'success');
            handleBackToLogin();
        } else {
            showToast('Thất Bại', result.message || 'Đặt lại mật khẩu không thành công.', 'error');
        }
    };

    const handleBackToLogin = () => {
        setEmail('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setUsername('');
        setPassword('');
        setViewMode('login');
    };

    const inputBaseClass = "peer w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm text-text-primary border border-slate-300/50 rounded-lg focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all placeholder:text-text-secondary/70 shadow-sm";
    
    return (
        <div className="relative isolate h-screen flex flex-col overflow-hidden">
            <div className="scanline"></div>

            <div className="w-full h-full grid grid-cols-1 lg:grid-cols-5">
                {/* Left Panel (Visual) */}
                <div className="relative hidden lg:col-span-3 lg:flex flex-col justify-center items-center text-center p-4 overflow-hidden bg-cover bg-center animate-unfold-in-left login-boundary" style={{backgroundImage: "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop')"}}>
                    <div className="absolute inset-0 bg-black/60 z-0"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-start/10 via-transparent to-transparent z-10 mix-blend-color-dodge"></div>
                    <canvas ref={canvasRef} id="hero-particles-canvas" className="absolute inset-0 z-5 w-full h-full"></canvas>
                    
                    <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-30 text-left text-white/90 p-2 rounded-lg bg-black/10 backdrop-blur-sm">
                        <p id="hero-day-of-week" className="text-lg sm:text-xl font-semibold tracking-wider uppercase" style={{textShadow: '0 1px 5px rgba(0,0,0,0.5)'}}></p>
                        <p id="hero-full-date" className="text-sm sm:text-base font-mono" style={{textShadow: '0 1px 5px rgba(0,0,0,0.5)'}}></p>
                    </div>

                    <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 text-right text-white/90 p-2 rounded-lg bg-black/10 backdrop-blur-sm">
                        <p id="hero-time" className="text-lg sm:text-xl font-mono font-bold tracking-widest" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5), 0 0 15px rgba(96, 165, 250, 0.4)'}}></p>
                        <p id="hero-timezone" className="text-xs sm:text-sm font-semibold uppercase tracking-wider mt-1" style={{textShadow: '0 1px 5px rgba(0,0,0,0.5)'}}></p>
                    </div>

                    <div className="relative z-30 flex flex-col items-center">
                        <div className="flex items-center gap-3 mb-4">
                            <i className="fas fa-bolt text-4xl text-gradient from-accent-start to-accent-end"></i>
                            <div className="text-xl font-bold text-white tracking-wider">
                                ORDER <span className="font-light text-white/80">MANAGEMENT</span>
                            </div>
                        </div>
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-3d animate-text-gradient-flow">
                            Hệ Thống Quản Lý Đơn Hàng
                        </h2>
                        <p className="text-lg md:text-xl mt-4 max-w-2xl text-white/90" style={{textShadow: '0 2px 20px rgba(0,0,0,0.7)'}}>Nâng cao hiệu quả công việc cho tư vấn bán hàng.</p>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full z-20" style={{transform: 'translateY(1px)'}}>
                        <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                            <defs><path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" /></defs>
                            <g className="parallax">
                                <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(247, 249, 252, 0.2)" />
                                <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(247, 249, 252, 0.3)" />
                                <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(247, 249, 252, 0.5)" />
                                <use xlinkHref="#gentle-wave" x="48" y="7" fill="#F7F9FC" />
                            </g>
                        </svg>
                    </div>
                </div>

                {/* Right Panel (Login Form) */}
                <main className="relative w-full h-full lg:col-span-2 flex flex-col items-center justify-center p-4 bg-transparent animate-unfold-in-right overflow-hidden" style={{ animationDelay: '300ms' }}>
                    <div className="right-panel-grid-background absolute inset-0 z-0"></div>
                    <div className="absolute inset-0 z-1 bg-gradient-to-br from-accent-primary/5 via-transparent to-accent-secondary/5 animate-aurora [background-size:400%_400%]"></div>
                    
                    <div className="relative z-10 w-full max-w-md bg-white/70 backdrop-blur-lg p-10 sm:p-12 rounded-2xl border border-white/20 shadow-xl animate-border-glow overflow-hidden">
                        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-accent-start/10 via-transparent to-accent-end/10 animate-aurora opacity-50 -z-10"></div>
                        <div className="relative z-10 min-h-[380px]">
                            {viewMode === 'login' && (
                                <form onSubmit={handleLoginSubmit} className="w-full animate-fade-in-up">
                                    <h2 className="text-gradient text-4xl font-extrabold mb-2 text-center tracking-tight">Đăng Nhập</h2>
                                    <p className="text-md text-text-secondary mb-10 text-center">Truy cập hệ thống nội bộ</p>
                                    <div className="space-y-6">
                                        <div className="relative"><i className="fas fa-user absolute top-1/2 left-4 -translate-y-1/2 icon-gradient peer-focus:opacity-70 transition-opacity"></i><input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Tên đăng nhập" autoComplete="username" className={inputBaseClass}/></div>
                                        <div className="relative"><i className="fas fa-lock absolute top-1/2 left-4 -translate-y-1/2 icon-gradient peer-focus:opacity-70 transition-opacity"></i><input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" autoComplete="current-password" className={inputBaseClass}/></div>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-10 !py-3 !text-base">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Đang xử lý...</> : 'Đăng Nhập'}</button>
                                    <div className="text-center mt-6">
                                        <button type="button" onClick={() => setViewMode('forgot')} className="text-sm font-semibold text-accent-primary hover:underline">Quên mật khẩu?</button>
                                    </div>
                                </form>
                            )}

                            {viewMode === 'forgot' && (
                                <form onSubmit={handleForgotPasswordSubmit} className="w-full animate-fade-in-up">
                                    <h2 className="text-gradient text-3xl font-extrabold mb-2 text-center tracking-tight">Quên Mật Khẩu</h2>
                                    <p className="text-md text-text-secondary mb-10 text-center">Nhập email để nhận mã khôi phục.</p>
                                    <div className="relative"><i className="fas fa-envelope absolute top-1/2 left-4 -translate-y-1/2 icon-gradient peer-focus:opacity-70 transition-opacity"></i><input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email đăng ký" required className={inputBaseClass}/></div>
                                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-10 !py-3 !text-base">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Đang gửi...</> : 'Gửi Mã OTP'}</button>
                                    <div className="text-center mt-6"><button type="button" onClick={handleBackToLogin} className="text-sm font-semibold text-text-secondary hover:underline"><i className="fas fa-arrow-left mr-2"></i>Quay lại Đăng nhập</button></div>
                                </form>
                            )}

                             {viewMode === 'reset' && (
                                <form onSubmit={handleResetPasswordSubmit} className="w-full animate-fade-in-up">
                                    <h2 className="text-gradient text-3xl font-extrabold mb-2 text-center tracking-tight">Đặt Lại Mật Khẩu</h2>
                                    <p className="text-sm text-text-secondary mb-8 text-center">Mã OTP đã được gửi tới <strong>{email}</strong>. Vui lòng kiểm tra và nhập vào bên dưới.</p>
                                    <div className="space-y-4">
                                        <div className="relative"><i className="fas fa-key absolute top-1/2 left-4 -translate-y-1/2 icon-gradient"></i><input value={otp} onChange={e => setOtp(e.target.value)} type="text" placeholder="Mã OTP" required className={inputBaseClass}/></div>
                                        <div className="relative"><i className="fas fa-lock absolute top-1/2 left-4 -translate-y-1/2 icon-gradient"></i><input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" required className={inputBaseClass}/></div>
                                        <div className="relative"><i className="fas fa-check-circle absolute top-1/2 left-4 -translate-y-1/2 icon-gradient"></i><input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Xác nhận mật khẩu mới" required className={inputBaseClass}/></div>
                                    </div>
                                    <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-8 !py-3 !text-base">{isSubmitting ? <><i className="fas fa-spinner animate-spin mr-2"></i>Đang xử lý...</> : 'Xác Nhận & Đổi Mật Khẩu'}</button>
                                    <div className="text-center mt-6"><button type="button" onClick={handleBackToLogin} className="text-sm font-semibold text-text-secondary hover:underline"><i className="fas fa-arrow-left mr-2"></i>Quay lại Đăng nhập</button></div>
                                </form>
                            )}
                        </div>
                    </div>
                     <footer className="absolute bottom-4 text-center text-[10px] font-medium text-text-secondary/50 z-10">
                        &copy; {new Date().getFullYear()} OrderManagement. All Rights Reserved.
                    </footer>
                </main>
            </div>
        </div>
    );
};

export default LoginScreen;