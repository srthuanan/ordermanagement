import React, { useState, useEffect, useRef, FormEvent } from 'react';
import * as authService from '../services/authService';

interface LoginScreenProps {
    onLoginSuccess: () => void;
    showToast: (title: string, message: string, type: 'success' | 'error' | 'loading' | 'warning' | 'info', duration?: number) => void;
}

const features = [
    { icon: "fa-clipboard-list", title: "Quản Lý Đơn Hàng", text: "Theo dõi và xử lý đơn hàng nhanh chóng.", delay: "1.6s" },
    { icon: "fa-car", title: "Quản Lý Kho Xe", text: "Kiểm tra và quản lý xe trong kho dễ dàng.", delay: "1.8s" },
    { icon: "fa-handshake", title: "Hỗ Trợ Ghép Xe", text: "Tìm kiếm và ghép xe theo nhu cầu khách hàng.", delay: "2s" },
];

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, showToast }) => {
    const [view, setView] = useState<'home' | 'login'>('home');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const clockIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        if (view === 'home') {
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
        }
    }, [view]);

    useEffect(() => {
        if (view === 'home') {
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
        }
    }, [view]);
    
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

    const renderHeader = () => (
        <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-bg-secondary/50 backdrop-blur-md border-b border-border-primary flex items-center justify-between px-4 sm:px-6">
            <div className="flex-1 flex items-center justify-start"></div>
            <div className="flex items-center gap-3">
                <i className="fas fa-bolt text-2xl text-gradient from-accent-start to-accent-end"></i>
                <div className="text-sm font-bold text-text-primary tracking-wider hidden sm:block">
                    VINFAST <span className="font-light text-text-secondary">MINH ĐẠO</span>
                </div>
            </div>
            <div className="flex-1 flex items-center justify-end">
                <div className="w-10 h-10"></div>
            </div>
        </header>
    );

    const renderFooter = () => (
        <footer className="w-full z-0 py-2 text-center text-[10px] font-medium text-text-secondary/50">
            &copy; {new Date().getFullYear()} VinFast Thuận An. All Rights Reserved.
        </footer>
    );

    const renderHome = () => (
        <>
            {renderHeader()}
            <main className="relative z-10 flex-1 pt-16 flex flex-col">
                 <div className="h-full flex flex-col animate-fade-in-up">
                    <section className="relative flex-[3] flex flex-col justify-center items-center text-center p-4 pb-24 overflow-hidden bg-cover bg-center" style={{backgroundImage: "url('https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2071&auto=format&fit=crop')"}}>
                        <div className="absolute inset-0 bg-black/60 z-0"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-accent-start/10 via-transparent to-transparent z-10 mix-blend-color-dodge"></div>
                        <canvas ref={canvasRef} id="hero-particles-canvas" className="absolute inset-0 z-5 w-full h-full"></canvas>
                        
                        <div className="absolute top-6 left-6 sm:top-8 sm:left-8 z-30 text-left text-white/90 p-2 rounded-lg bg-black/10 backdrop-blur-sm animate-fade-in-up" style={{animationDelay: '1.2s'}}>
                            <p id="hero-day-of-week" className="text-lg sm:text-xl font-semibold tracking-wider uppercase" style={{textShadow: '0 1px 5px rgba(0,0,0,0.5)'}}></p>
                            <p id="hero-full-date" className="text-sm sm:text-base font-mono" style={{textShadow: '0 1px 5px rgba(0,0,0,0.5)'}}></p>
                        </div>

                        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 z-30 text-right text-white/90 p-2 rounded-lg bg-black/10 backdrop-blur-sm animate-fade-in-up" style={{animationDelay: '1.2s'}}>
                            <p id="hero-time" className="text-lg sm:text-xl font-mono font-bold tracking-widest" style={{textShadow: '0 2px 10px rgba(0,0,0,0.5), 0 0 15px rgba(96, 165, 250, 0.4)'}}></p>
                            <p id="hero-timezone" className="text-xs sm:text-sm font-semibold uppercase tracking-wider mt-1" style={{textShadow: '0 1px 5px rgba(0,0,0,0.5)'}}></p>
                        </div>

                        <div className="relative z-30 flex flex-col items-center">
                            <p className="text-lg md:text-xl mb-4 max-w-3xl animate-fade-in-up text-white" style={{animationDelay: '0.5s', textShadow: '0 2px 20px rgba(0,0,0,0.7)'}}>Chào mừng đến với Showroom THUẬN AN</p>
                            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight animate-fade-in-up text-3d animate-text-gradient-flow" style={{animationDelay: '0.8s'}}>
                                Hệ Thống Quản Lý Đơn Hàng
                            </h2>
                            <button onClick={() => setView('login')} className="mt-8 px-8 py-3 bg-white/10 border border-white/30 rounded-full font-bold text-white transform hover:-translate-y-1 transition-all duration-300 animate-fade-in-up animate-button-breathing-silver hover:bg-white/20 hover:border-white" style={{animationDelay: '1s'}}>
                                <i className="fas fa-arrow-right-long mr-2"></i> Đăng Nhập
                            </button>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full z-20" style={{transform: 'translateY(1px)'}}>
                             <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                                <defs><path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" /></defs>
                                <g className="parallax">
                                    <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(96, 165, 250, 0.2)" />
                                    <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(59, 130, 246, 0.3)" />
                                    <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(59, 130, 246, 0.5)" />
                                    <use xlinkHref="#gentle-wave" x="48" y="7" fill="#F7F9FC" />
                                </g>
                            </svg>
                        </div>
                    </section>
                     <section className="flex-[2] py-8 px-6 text-center flex flex-col items-center justify-center">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                           {features.map(f => (
                                <div key={f.title} className="bg-bg-glass p-6 rounded-2xl shadow-lg border border-border-primary hover:border-accent-start/50 hover:-translate-y-2 transition-all duration-300 text-center group animate-fade-in-up" style={{ animationDelay: f.delay }}>
                                    <div className="relative text-5xl mb-6 inline-block">
                                        <i className={`fas ${f.icon} icon-gradient`}></i>
                                        <div className="absolute -inset-2 bg-accent-start/20 blur-xl rounded-full transition-opacity duration-300 opacity-0 group-hover:opacity-100"></div>
                                    </div>
                                    <h4 className="text-xl font-bold mb-2 text-text-primary">{f.title}</h4>
                                    <p className="text-sm text-text-secondary">{f.text}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
            {renderFooter()}
        </>
    );

    const renderLogin = () => (
        <>
            {renderHeader()}
            <main className="relative z-10 flex-1 overflow-y-auto pt-16">
                <div className="w-full h-full flex items-center justify-center animate-fade-in-up p-4">
                    <div className="absolute top-20 left-6 z-20">
                        <button onClick={() => setView('home')} className="w-12 h-12 flex items-center justify-center rounded-full bg-bg-glass border border-border-primary text-text-secondary hover:text-text-primary hover:border-accent-start/50 transition-all" title="Back to Home">
                            <i className="fas fa-arrow-left"></i>
                        </button>
                    </div>
                    <div className="w-full max-w-md bg-bg-glass p-8 sm:p-10 rounded-2xl border border-border-primary shadow-2xl animate-border-glow relative overflow-hidden">
                        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-accent-start/10 via-transparent to-accent-end/10 animate-aurora opacity-50 -z-10"></div>
                        <div className="relative z-10">
                           <form onSubmit={handleLoginSubmit} className="w-full">
                                <h2 className="cyber-text text-4xl font-bold mb-2 text-text-primary text-center" data-text="Đăng Nhập">Đăng Nhập</h2>
                                <p className="text-md text-text-secondary mb-8 text-center">Truy cập hệ thống nội bộ THUẬN AN</p>
                                <div className="space-y-5">
                                    <div className="relative">
                                        <i className="fas fa-user absolute top-1/2 left-4 -translate-y-1/2 icon-gradient peer-focus:opacity-70 transition-opacity"></i>
                                        <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Tên đăng nhập" autoComplete="username" className="peer w-full pl-12 pr-4 py-3 bg-bg-secondary text-text-primary border-2 border-border-primary rounded-lg focus:outline-none focus:border-accent-start/50 focus:ring-2 focus:ring-accent-start/20 transition-all placeholder:text-text-secondary/70"/>
                                    </div>
                                    <div className="relative">
                                        <i className="fas fa-lock absolute top-1/2 left-4 -translate-y-1/2 icon-gradient peer-focus:opacity-70 transition-opacity"></i>
                                        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Mật khẩu" autoComplete="current-password" className="peer w-full pl-12 pr-4 py-3 bg-bg-secondary text-text-primary border-2 border-border-primary rounded-lg focus:outline-none focus:border-accent-start/50 focus:ring-2 focus:ring-accent-start/20 transition-all placeholder:text-text-secondary/70"/>
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full mt-8 bg-gradient-to-r from-accent-start to-accent-end text-white font-bold py-3 px-4 rounded-lg shadow-glow shadow-glow-start hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-wait animate-button-breathing">
                                    {isSubmitting ? <i className="fas fa-spinner animate-spin"></i> : 'Đăng Nhập'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </>
    );

    return (
        <div className="relative isolate h-screen flex flex-col overflow-hidden">
            <div className="circuit-background"></div>
            <div className="scanline"></div>
            {view === 'home' ? renderHome() : renderLogin()}
        </div>
    );
};

export default LoginScreen;