import React, { FormEvent, useState, useRef, useEffect } from 'react';
import { MidAutumnSvgBackdrop } from './MidAutumnSvgBackdrop';

interface MidAutumnLoginViewProps {
    viewMode: 'login' | 'forgot' | 'reset' | 'join';
    setViewMode: (mode: 'login' | 'forgot' | 'reset' | 'join') => void;
    username: string;
    setUsername: (val: string) => void;
    password: string;
    setPassword: (val: string) => void;
    email: string;
    setEmail: (val: string) => void;
    rememberMe: boolean;
    setRememberMe: (val: boolean) => void;
    isSubmitting: boolean;
    isEmailSent: boolean;
    invitationDetails: { full_name: string; role: string } | null;
    handleLoginSubmit: (e: FormEvent) => void;
    handleForgotPasswordSubmit: (e: FormEvent) => void;
    handleJoinSubmit: (e: FormEvent) => void;
    handleBackToLogin: () => void;
    mousePos: { x: number; y: number };
    handleMouseMove: (e: React.MouseEvent) => void;
    handleMouseLeave: () => void;
    toggleMidAutumnTheme: () => void;
}

{/* GÓC NẸP HOÀNG GIA CHẠM KHẮC 3D (IMPERIAL 3D CORNER BRACKET) */}
const ImperialCornerBracket: React.FC<{ position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }> = ({ position }) => {
    const posClasses = {
        'top-left': 'top-2 left-2',
        'top-right': 'top-2 right-2 rotate-90',
        'bottom-right': 'bottom-2 right-2 rotate-180',
        'bottom-left': 'bottom-2 left-2 -rotate-90',
    }[position];

    return (
        <svg
            viewBox="0 0 40 40"
            className={`absolute ${posClasses} w-7 h-7 sm:w-8 sm:h-8 pointer-events-none z-20 drop-shadow-[0_2px_6px_rgba(245,158,11,0.4)]`}
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="bracketGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor="#fef08a" />
                    <stop offset="60%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
            </defs>
            <path d="M 4,28 L 4,12 Q 4,4 12,4 L 28,4 L 24,8 L 12,8 Q 8,8 8,12 L 8,24 Z" fill="url(#bracketGoldGrad)" />
            <path d="M 12,18 L 12,14 Q 12,12 14,12 L 18,12 L 16,14 L 14,14 L 14,16 Z" fill="#fef08a" opacity="0.85" />
            <circle cx="12" cy="12" r="2" fill="#ffffff" />
            <circle cx="26" cy="6" r="1.2" fill="#fef08a" />
            <circle cx="6" cy="26" r="1.2" fill="#fef08a" />
        </svg>
    );
};

{/* 1. ICON KHO XE TRỰC TUYẾN 3D DÁT VÀNG */}
export const IconKhoXe3D: React.FC = () => (
    <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0 drop-shadow-[0_4px_14px_rgba(245,158,11,0.45)] group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="carBody3D" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="25%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
            <linearGradient id="glassCyan3D" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <radialGradient id="boxBgGold3D" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#080e1f" />
            </radialGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="url(#boxBgGold3D)" stroke="url(#carBody3D)" strokeWidth="1.6" />
        {/* Vòm nhà kính Showroom hoàng gia 3D */}
        <path d="M 14,50 L 14,28 Q 32,14 50,28 L 50,50 Z" fill="none" stroke="url(#carBody3D)" strokeWidth="1.4" opacity="0.6" />
        <path d="M 20,50 L 20,32 Q 32,22 44,32 L 44,50 Z" fill="#0f172a" opacity="0.5" />
        {/* Xe Điện VinFast Sang Trọng 3D */}
        <path d="M 18,45 L 24,35 L 40,35 L 46,45 Z" fill="url(#carBody3D)" />
        <path d="M 25,36 L 29,30 L 39,30 L 41,36 Z" fill="url(#glassCyan3D)" />
        <circle cx="23" cy="46" r="4" fill="#030712" stroke="#fef08a" strokeWidth="1.2" />
        <circle cx="23" cy="46" r="1.5" fill="#f59e0b" />
        <circle cx="41" cy="46" r="4" fill="#030712" stroke="#fef08a" strokeWidth="1.2" />
        <circle cx="41" cy="46" r="1.5" fill="#f59e0b" />
        {/* Đèn pha LED ma trận phát sáng */}
        <ellipse cx="18" cy="42" rx="2" ry="1.2" fill="#38bdf8" />
        <ellipse cx="46" cy="42" rx="2" ry="1.2" fill="#fef08a" />
    </svg>
);

{/* 2. ICON TIẾN ĐỘ ĐƠN HÀNG 3D NGỌC BÍCH */}
export const IconTienDo3D: React.FC = () => (
    <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0 drop-shadow-[0_4px_14px_rgba(16,185,129,0.45)] group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="scrollJade3D" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a7f3d0" />
                <stop offset="40%" stopColor="#10b981" />
                <stop offset="80%" stopColor="#047857" />
                <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
            <radialGradient id="sealRuby3D" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#fca5a5" />
                <stop offset="40%" stopColor="#ef4444" />
                <stop offset="80%" stopColor="#b91c1c" />
                <stop offset="100%" stopColor="#450a0a" />
            </radialGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="#051a17" stroke="url(#scrollJade3D)" strokeWidth="1.6" />
        {/* Cuộn thư khế ước hoàng cung 3D */}
        <path d="M 18,18 Q 32,14 46,18 L 46,46 Q 32,42 18,46 Z" fill="url(#scrollJade3D)" opacity="0.88" />
        <path d="M 16,18 Q 32,13 48,18 Q 48,21 46,23 Q 32,17 16,23 Z" fill="#fef08a" />
        {/* Các dòng chữ khế ước vàng */}
        <line x1="22" y1="26" x2="42" y2="26" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="22" y1="32" x2="36" y2="32" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="22" y1="38" x2="40" y2="38" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
        {/* Dấu ấn son đỏ 3D */}
        <circle cx="40" cy="42" r="5" fill="url(#sealRuby3D)" stroke="#fef08a" strokeWidth="1" />
        <circle cx="40" cy="42" r="2.5" fill="#fef08a" opacity="0.8" />
        {/* Ngọn bút lông vàng hoàng gia */}
        <path d="M 48,14 L 38,36 L 36,35 L 46,13 Z" fill="#f59e0b" />
        <polygon points="38,36 34,40 36,35" fill="#fef08a" />
    </svg>
);

{/* 3. ICON LỊCH SỬ & BÁO CÁO 3D LĂNG KÍNH */}
const IconBaoCao3D: React.FC = () => (
    <svg viewBox="0 0 64 64" className="w-12 h-12 shrink-0 drop-shadow-[0_4px_14px_rgba(56,189,248,0.45)] group-hover:scale-105 transition-transform" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="prismCyan3D" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a5f3fc" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="goldBar3D" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#fde047" />
                <stop offset="80%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#78350f" />
            </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill="#041629" stroke="url(#prismCyan3D)" strokeWidth="1.6" />
        {/* Các cột doanh số 3D đa diện */}
        <path d="M 16,50 L 16,36 L 22,32 L 22,46 Z" fill="url(#prismCyan3D)" />
        <path d="M 16,36 L 20,34 L 26,34 L 22,32 Z" fill="#e0f2fe" />
        <path d="M 26,50 L 26,28 L 32,24 L 32,46 Z" fill="url(#goldBar3D)" />
        <path d="M 26,28 L 30,26 L 36,26 L 32,24 Z" fill="#fef08a" />
        <path d="M 36,50 L 36,18 L 42,14 L 42,46 Z" fill="url(#prismCyan3D)" />
        <path d="M 36,18 L 40,16 L 46,16 L 42,14 Z" fill="#ffffff" />
        {/* Đường xu hướng tăng trưởng phát quang */}
        <path d="M 14,42 Q 28,32 44,14" fill="none" stroke="#fef08a" strokeWidth="2.4" strokeLinecap="round" />
        <polygon points="47,12 40,14 45,19" fill="#fef08a" />
    </svg>
);

export const MidAutumnLoginView: React.FC<MidAutumnLoginViewProps> = ({
    viewMode,
    setViewMode,
    username,
    setUsername,
    password,
    setPassword,
    email,
    setEmail,
    rememberMe,
    setRememberMe,
    isSubmitting,
    isEmailSent,
    invitationDetails,
    handleLoginSubmit,
    handleForgotPasswordSubmit,
    handleJoinSubmit,
    handleBackToLogin,
    mousePos,
    handleMouseMove,
    handleMouseLeave,
    toggleMidAutumnTheme,
}) => {
    const [showPassword, setShowPassword] = useState(false);

    // Khả năng kéo thả thẻ đăng nhập tự do khắp màn hình (Draggable Login Card)
    const [cardOffset, setCardOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

    const startDragging = (clientX: number, clientY: number) => {
        setIsDragging(true);
        dragRef.current = {
            startX: clientX,
            startY: clientY,
            initX: cardOffset.x,
            initY: cardOffset.y,
        };
    };

    const handleCardMouseDown = (e: React.MouseEvent) => {
        // Không kích hoạt kéo khi bấm vào input, button, link, label hoặc vùng chọn
        const target = e.target as HTMLElement;
        if (target.closest('input, button, a, label, textarea, select, [role="button"]')) {
            return;
        }
        startDragging(e.clientX, e.clientY);
    };

    const handleCardTouchStart = (e: React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('input, button, a, label, textarea, select, [role="button"]')) {
            return;
        }
        if (e.touches.length === 1) {
            startDragging(e.touches[0].clientX, e.touches[0].clientY);
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMouseMove = (e: MouseEvent) => {
            if (!dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setCardOffset({
                x: dragRef.current.initX + dx,
                y: dragRef.current.initY + dy,
            });
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!dragRef.current || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - dragRef.current.startX;
            const dy = e.touches[0].clientY - dragRef.current.startY;
            setCardOffset({
                x: dragRef.current.initX + dx,
                y: dragRef.current.initY + dy,
            });
        };

        const onMouseUp = () => {
            setIsDragging(false);
            dragRef.current = null;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('touchend', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onMouseUp);
        };
    }, [isDragging]);

    const resetCardPosition = () => {
        setCardOffset({ x: 0, y: 0 });
    };

    return (
        <div
            className="relative h-screen min-h-screen w-full flex flex-col items-center justify-between overflow-hidden font-sans bg-[#020612] text-slate-100 selection:bg-amber-500 selection:text-slate-950 py-2 sm:py-3 px-3 sm:px-6"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* 1. NỀN SVG NÂNG CAO PHONG CÁCH TRUNG THU HOÀNG GIA */}
            <MidAutumnSvgBackdrop mouseX={mousePos.x} mouseY={mousePos.y} />

            {/* 2. NÚT CHUYỂN ĐỔI GIAO DIỆN TRUNG THU / MẶC ĐỊNH Ở GÓC TRÊN BÊN PHẢI */}
            <div className="fixed top-4 right-4 z-[100] flex items-center gap-2">
                <button
                    type="button"
                    onClick={toggleMidAutumnTheme}
                    className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-lg flex items-center gap-2 cursor-pointer backdrop-blur-md bg-slate-950/85 text-amber-200 border border-amber-500/50 hover:bg-amber-950/90 hover:border-amber-400 hover:shadow-amber-500/20 active:scale-95"
                    title="Sau mùa Trung Thu hệ thống sẽ tự động trở về màn hình mặc định"
                >
                    <span className="text-amber-400 text-sm">🏮</span>
                    <span className="font-extrabold tracking-wide">Tết Trung Thu</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Đang Bật</span>
                </button>
            </div>

            {/* CSS Animation & Autofill Override */}
            <style>{`
                @keyframes gold-shine {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .animate-gold-shine {
                    background: linear-gradient(90deg, #f59e0b 0%, #fef08a 25%, #ffffff 50%, #fef08a 75%, #f59e0b 100%);
                    background-size: 200% auto;
                    color: transparent;
                    -webkit-background-clip: text;
                    animation: gold-shine 6s linear infinite;
                }
                
                @keyframes card-glow-pulse {
                    0%, 100% { box-shadow: 0 15px 40px -10px rgba(0,0,0,0.85), 0 0 25px rgba(245, 158, 11, 0.12); }
                    50% { box-shadow: 0 20px 50px -10px rgba(0,0,0,0.95), 0 0 35px rgba(245, 158, 11, 0.22); }
                }
                .animate-card-glow {
                    animation: card-glow-pulse 6s ease-in-out infinite;
                }

                @keyframes lantern-mini-swing {
                    0%, 100% { transform: rotate(8deg); }
                    50% { transform: rotate(-7deg); }
                }
                .animate-mini-lantern {
                    animation: lantern-mini-swing 4.2s ease-in-out infinite;
                    transform-origin: 27.5px 0px;
                }

                /* CHROME & EDGE AUTOFILL FIX CHO DARK THEME */
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 1000px #0a1124 inset !important;
                    -webkit-text-fill-color: #f8fafc !important;
                    caret-color: #f8fafc !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
            `}</style>

            {/* 3. TIÊU ĐỀ TRUNG TÂM SVG NÂNG CAO CAO CẤP */}
            <div className="relative z-20 text-center mb-1 sm:mb-2 pt-16 sm:pt-18 lg:pt-20 w-full max-w-2xl mx-auto px-2 select-none">
                <svg
                    viewBox="0 0 900 130"
                    className="w-full h-auto drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="svgRoyalGold" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="15%" stopColor="#fffbeb" />
                            <stop offset="35%" stopColor="#fef08a" />
                            <stop offset="60%" stopColor="#f59e0b" />
                            <stop offset="85%" stopColor="#d97706" />
                            <stop offset="100%" stopColor="#78350f" />
                        </linearGradient>

                        <linearGradient id="svgSilverPlatinum" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ffffff" />
                            <stop offset="35%" stopColor="#f8fafc" />
                            <stop offset="70%" stopColor="#cbd5e1" />
                            <stop offset="100%" stopColor="#64748b" />
                        </linearGradient>

                        <linearGradient id="svgLightSweep" x1="-100%" y1="0%" x2="200%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                            <stop offset="35%" stopColor="#fef08a" stopOpacity="0.2" />
                            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
                            <stop offset="65%" stopColor="#fef08a" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                            <animate
                                attributeName="x1"
                                from="-150%"
                                to="150%"
                                dur="4.5s"
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="x2"
                                from="0%"
                                to="300%"
                                dur="4.5s"
                                repeatCount="indefinite"
                            />
                        </linearGradient>

                        <linearGradient id="svgFiligreeGold" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                            <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.7" />
                            <stop offset="50%" stopColor="#fef08a" stopOpacity="1" />
                            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.7" />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                        </linearGradient>

                        <filter id="svgText3DEmboss" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.9" />
                            <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#f59e0b" floodOpacity="0.3" />
                        </filter>
                    </defs>

                    {/* Huy hiệu Đêm Hội Trăng Rằm */}
                    <g filter="url(#svgText3DEmboss)">
                        <rect
                            x="340"
                            y="4"
                            width="220"
                            height="24"
                            rx="12"
                            fill="#030714"
                            fillOpacity="0.85"
                            stroke="#f59e0b"
                            strokeWidth="1.2"
                            strokeOpacity="0.6"
                        />
                        <circle cx="355" cy="16" r="3" fill="#f59e0b" />
                        <circle cx="355" cy="16" r="5" fill="#f59e0b" opacity="0.3">
                            <animate attributeName="r" values="3;7;3" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                        </circle>
                        <text
                            x="455"
                            y="20"
                            textAnchor="middle"
                            fontFamily="'Outfit', 'Inter', system-ui, sans-serif"
                            fontSize="11"
                            fontWeight="800"
                            letterSpacing="0.22em"
                            fill="#fef08a"
                        >
                            🏮 ĐÊM HỘI TRĂNG RẰM
                        </text>
                    </g>

                    {/* SHOWROOM */}
                    <g filter="url(#svgText3DEmboss)">
                        <text
                            x="410"
                            y="70"
                            textAnchor="end"
                            fontFamily="'Outfit', 'Inter', system-ui, sans-serif"
                            fontSize="44"
                            fontWeight="900"
                            fontStyle="italic"
                            letterSpacing="0.07em"
                            fill="url(#svgSilverPlatinum)"
                            stroke="#0f172a"
                            strokeWidth="2"
                            style={{ paintOrder: 'stroke fill' }}
                        >
                            SHOWROOM
                        </text>
                    </g>

                    {/* THUẬN AN */}
                    <g filter="url(#svgText3DEmboss)">
                        <text
                            x="430"
                            y="70"
                            textAnchor="start"
                            fontFamily="'Outfit', 'Inter', system-ui, sans-serif"
                            fontSize="50"
                            fontWeight="900"
                            letterSpacing="0.05em"
                            fill="url(#svgRoyalGold)"
                            stroke="#78350f"
                            strokeWidth="2.5"
                            style={{ paintOrder: 'stroke fill' }}
                        >
                            THUẬN AN
                        </text>
                        <text
                            x="430"
                            y="70"
                            textAnchor="start"
                            fontFamily="'Outfit', 'Inter', system-ui, sans-serif"
                            fontSize="50"
                            fontWeight="900"
                            letterSpacing="0.05em"
                            fill="url(#svgLightSweep)"
                            opacity="0.85"
                            style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
                        >
                            THUẬN AN
                        </text>
                    </g>

                    {/* Nẹp hoa văn */}
                    <g>
                        <path
                            d="M 230,88 Q 340,84 450,94 Q 560,84 670,88"
                            fill="none"
                            stroke="url(#svgFiligreeGold)"
                            strokeWidth="1.8"
                        />
                        <polygon points="450,86 456,94 450,102 444,94" fill="#fef08a" />
                        <circle cx="450" cy="94" r="2.2" fill="#ffffff" />
                    </g>

                    {/* Phụ đề */}
                    <text
                        x="450"
                        y="120"
                        textAnchor="middle"
                        fontFamily="'Inter', system-ui, sans-serif"
                        fontSize="14"
                        fontWeight="600"
                        fill="#cbd5e1"
                        opacity="0.9"
                        letterSpacing="0.03em"
                    >
                        Hệ thống quản lý thông minh giúp tối ưu quy trình kinh doanh &amp; kho xe
                    </text>
                </svg>
            </div>

            {/* 4. KHUNG ĐĂNG NHẬP TINH GIẢN - KÍNH MỜ TRONG SUỐT (FROSTED GLASSMORPHISM CARD) - KÉO THẢ TỰ DO KHẮP MÀN HÌNH */}
            {/* THIẾT KẾ ĐƠN GIẢN HÓA 1 THẺ GỌN GÀNG, NHÌN THẤU BỨC TRANH HỘI AN PHÍA SAU */}
            <div
                className={`relative z-20 w-full max-w-[450px] mx-auto px-2 sm:px-3 transition-transform ${isDragging ? 'duration-0 pointer-events-auto select-none' : 'duration-200'}`}
                style={{
                    transform: `translate3d(${cardOffset.x}px, ${cardOffset.y}px, 0)`,
                }}
            >
                <div
                    onMouseDown={handleCardMouseDown}
                    onTouchStart={handleCardTouchStart}
                    className={`w-full rounded-2xl bg-slate-950/40 hover:bg-slate-950/50 backdrop-blur-md border ${isDragging ? 'border-amber-400 shadow-[0_30px_70px_rgba(0,0,0,0.95),0_0_50px_rgba(245,158,11,0.4)] scale-[1.01] cursor-grabbing' : 'border-amber-400/35 shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_35px_rgba(245,158,11,0.2)] animate-card-glow'} p-4 sm:p-6 flex flex-col justify-between relative overflow-visible transition-all`}
                >
                    {/* Dải nẹp vàng hoàng gia trên đầu thẻ */}
                    <div className="h-1.5 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 w-full absolute top-0 left-0 rounded-t-2xl"></div>

                    {/* Thanh tay cầm kéo thẻ hoàng gia (Drag Handle Bar) */}
                    <div
                        className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/20 cursor-grab active:cursor-grabbing select-none group"
                        title="Nhấp giữ chuột hoặc chạm để kéo thẻ đăng nhập khắp màn hình"
                    >
                        <div className="flex items-center gap-1.5 text-amber-300/80 group-hover:text-amber-200 transition-colors">
                            <span className="text-base tracking-tighter leading-none text-amber-400">⠿</span>
                            <span className="text-[10px] tracking-wider uppercase font-semibold">
                                {isDragging ? 'Đang di chuyển thẻ...' : 'Kéo di chuyển thẻ khắp nơi'}
                            </span>
                        </div>
                        {(cardOffset.x !== 0 || cardOffset.y !== 0) && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    resetCardPosition();
                                }}
                                className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-400/30 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                title="Đưa thẻ trở về vị trí trung tâm mặc định"
                            >
                                <i className="fa-solid fa-rotate-left text-[9px]"></i> Về giữa
                            </button>
                        )}
                    </div>

                    {/* 4 Góc Nẹp Chạm Khắc Hoàng Gia 3D */}
                    <ImperialCornerBracket position="top-left" />
                    <ImperialCornerBracket position="top-right" />
                    <ImperialCornerBracket position="bottom-left" />
                    <ImperialCornerBracket position="bottom-right" />

                    {/* Đèn lồng Đại Đăng 3D treo góc phải thẻ đung đưa */}
                    <div className="absolute top-[-26px] right-6 z-30 select-none hover:scale-110 transition-all cursor-pointer animate-mini-lantern">
                        <svg width="50" height="70" viewBox="0 0 55 70" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_6px_20px_rgba(245,158,11,0.65)]">
                            <defs>
                                <radialGradient id="miniRuby3D" cx="35%" cy="35%" r="65%">
                                    <stop offset="0%" stopColor="#fee2e2" />
                                    <stop offset="30%" stopColor="#ef4444" />
                                    <stop offset="70%" stopColor="#b91c1c" />
                                    <stop offset="100%" stopColor="#450a0a" />
                                </radialGradient>
                            </defs>
                            <circle cx="27.5" cy="0" r="3" fill="#f59e0b" stroke="#fef08a" strokeWidth="1" />
                            <path d="M 27.5,0 L 27.5,14" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
                            <rect x="18" y="13" width="19" height="5.5" rx="1.5" fill="#d97706" stroke="#fef08a" strokeWidth="1" />
                            <ellipse cx="27.5" cy="34" rx="20" ry="17" fill="url(#miniRuby3D)" />
                            <path d="M 27.5,17 C 13,22 13,46 27.5,51" stroke="#fef08a" strokeWidth="1.2" fill="none" />
                            <path d="M 27.5,17 C 42,22 42,46 27.5,51" stroke="#fef08a" strokeWidth="1.2" fill="none" />
                            <line x1="27.5" y1="17" x2="27.5" y2="51" stroke="#ffffff" strokeWidth="1" opacity="0.75" />
                            <circle cx="27.5" cy="34" r="5.5" fill="#fef08a" opacity="0.9" />
                            <circle cx="27.5" cy="34" r="2.5" fill="#ffffff" />
                            <rect x="19" y="50" width="17" height="5" rx="1.5" fill="#d97706" stroke="#fef08a" strokeWidth="0.8" />
                            <line x1="27.5" y1="55" x2="27.5" y2="70" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1="23" y1="55" x2="21" y2="66" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                            <line x1="32" y1="55" x2="34" y2="66" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="27.5" cy="69" r="2.5" fill="#fef08a" />
                        </svg>
                    </div>

                    {/* Huy hiệu Tết Đoàn Viên & Câu thơ chúc mừng tinh tế gói gọn */}
                    <div className="mb-4 text-center">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-950/50 border border-amber-400/40 shadow-[0_2px_10px_rgba(245,158,11,0.2)] select-none mb-2">
                            <span className="text-amber-400 text-xs">🏮</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 text-[11px] font-black tracking-widest uppercase">
                                Tết Trung Thu
                            </span>
                        </div>
                        <p className="text-amber-200/90 font-serif italic text-xs leading-relaxed">
                            “Trăng rằm tỏa sáng muôn nơi, Thuận An gắn kết rạng ngời niềm tin.”
                        </p>
                    </div>

                    {/* VÙNG NỘI DUNG FORM ĐĂNG NHẬP CHÍNH */}
                    <div className="w-full relative z-10">
                        {viewMode === 'login' && (
                            <div key="login-view-ma" className="animate-fade-in">


                                <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-3.5">
                                    {/* Email Field với 3D Illuminated Icon */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[11px] font-bold text-amber-200/90 uppercase tracking-wider block">
                                            Tài khoản Email
                                        </label>
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3.5 text-amber-400/80 text-sm pointer-events-none">
                                                <i className="fa-regular fa-envelope"></i>
                                            </span>
                                            <input
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                                type="email"
                                                required
                                                placeholder="example@gmail.com"
                                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/75 border border-amber-500/30 focus:border-amber-400 focus:bg-slate-900/90 focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] outline-none text-sm text-slate-100 font-medium transition-all placeholder:text-slate-400 font-mono backdrop-blur-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Password Field với 3D Illuminated Icon */}
                                    <div className="space-y-1.5 text-left">
                                        <label className="text-[11px] font-bold text-amber-200/90 uppercase tracking-wider block">
                                            Mật khẩu
                                        </label>
                                        <div className="relative flex items-center">
                                            <span className="absolute left-3.5 text-amber-400/80 text-sm pointer-events-none">
                                                <i className="fa-solid fa-lock"></i>
                                            </span>
                                            <input
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                placeholder="••••••••"
                                                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900/60 hover:bg-slate-900/75 border border-amber-500/30 focus:border-amber-400 focus:bg-slate-900/90 focus:shadow-[0_0_20px_rgba(245,158,11,0.25)] outline-none text-sm text-slate-100 font-medium transition-all placeholder:text-slate-400 font-mono backdrop-blur-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3.5 text-slate-400 hover:text-amber-300 text-sm transition-colors cursor-pointer"
                                                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                            >
                                                <i className={'fa-regular ' + (showPassword ? 'fa-eye-slash' : 'fa-eye')}></i>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Duy trì đăng nhập & Quên mật khẩu */}
                                    <div className="flex items-center justify-between pt-1 select-none text-xs">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={rememberMe}
                                                onChange={e => setRememberMe(e.target.checked)}
                                                className="h-4 w-4 rounded text-amber-500 border-amber-500/40 bg-slate-900/70 focus:ring-amber-500/30 cursor-pointer"
                                            />
                                            <span className="font-semibold text-slate-200">Duy trì đăng nhập</span>
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('forgot')}
                                            className="text-amber-300 hover:text-amber-200 underline font-semibold transition-colors cursor-pointer"
                                        >
                                            Quên mật khẩu?
                                        </button>
                                    </div>

                                    {/* NÚT BẤM THỎI VÀNG HOÀNG KIM 3D */}
                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-500 text-slate-950 py-3.5 px-6 font-black text-sm tracking-widest uppercase shadow-[0_4px_25px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.7),inset_0_-2px_4px_rgba(120,53,15,0.4)] hover:shadow-[0_6px_30px_rgba(245,158,11,0.7)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer border border-amber-300/60"
                                        >
                                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none"></div>
                                            {isSubmitting ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin text-slate-950"></i>
                                                    <span className="relative z-10 font-black">ĐANG XÁC THỰC...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="relative z-10 font-black text-slate-950 tracking-wider">ĐĂNG NHẬP</span>
                                                    <span className="relative z-10 text-slate-950 font-bold text-base transition-transform group-hover:translate-x-1">➔</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {viewMode === 'forgot' && (
                            <div key="forgot-view-ma" className="animate-fade-in">
                                {!isEmailSent ? (
                                    <>
                                        <div className="text-left mb-6">
                                            <div className="text-xs font-mono tracking-wider font-bold text-amber-400 mb-1 uppercase">
                                                Khôi phục
                                            </div>
                                            <div className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                                                QUÊN MẬT KHẨU
                                            </div>
                                            <p className="text-slate-300 text-xs mt-1">
                                                Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu
                                            </p>
                                        </div>

                                        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4 text-left">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold text-amber-200/90 uppercase tracking-wider block">
                                                    Địa chỉ Email
                                                </label>
                                                <div className="relative flex items-center">
                                                    <span className="absolute left-3.5 text-amber-400/70 text-sm pointer-events-none">
                                                        <i className="fa-regular fa-envelope"></i>
                                                    </span>
                                                    <input
                                                        value={email}
                                                        onChange={e => setEmail(e.target.value)}
                                                        type="email"
                                                        required
                                                        placeholder="example@gmail.com"
                                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-amber-500/30 focus:border-amber-400 outline-none text-sm text-slate-100 font-medium transition-all placeholder:text-slate-400 font-mono"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <button
                                                    type="submit"
                                                    disabled={isSubmitting}
                                                    className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-500 text-slate-950 py-3.5 px-6 font-black text-sm tracking-widest uppercase shadow-[0_4px_25px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.7)] transition-all disabled:opacity-60 flex items-center justify-center gap-2.5 cursor-pointer border border-amber-300/60"
                                                >
                                                    {isSubmitting ? (
                                                        <>
                                                            <i className="fas fa-spinner fa-spin text-slate-950"></i>
                                                            <span className="relative z-10">ĐANG GỬI...</span>
                                                        </>
                                                    ) : (
                                                        <span className="relative z-10">GỬI LIÊN KẾT KHÔI PHỤC</span>
                                                    )}
                                                </button>
                                            </div>
                                        </form>
                                    </>
                                ) : (
                                    <div className="text-center py-6">
                                        <div className="w-16 h-16 bg-emerald-500/20 border-2 border-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                            <i className="fas fa-check text-emerald-400 text-2xl"></i>
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2 uppercase">Đã Gửi Liên Kết!</h3>
                                        <p className="text-slate-300 text-xs leading-relaxed px-2">
                                            Vui lòng kiểm tra hộp thư đến của <span className="text-amber-300 font-mono underline">{email}</span>.
                                        </p>
                                        <div className="mt-4 p-3 bg-slate-900/70 rounded-xl border border-amber-500/20 text-xs text-slate-400 text-left flex items-start gap-2.5">
                                            <i className="fas fa-info-circle text-amber-400 mt-0.5 shrink-0"></i>
                                            <span>Nếu không tìm thấy, vui lòng kiểm tra thư mục Thư rác (Spam).</span>
                                        </div>
                                    </div>
                                )}

                                <div className="text-center mt-6">
                                    <button
                                        type="button"
                                        onClick={handleBackToLogin}
                                        className="text-amber-300 hover:text-amber-200 text-xs font-bold underline transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <i className="fas fa-arrow-left text-[10px]"></i>
                                        Quay lại Đăng nhập
                                    </button>
                                </div>
                            </div>
                        )}

                        {viewMode === 'join' && (
                            <div key="join-view-ma" className="animate-fade-in text-left">
                                <div className="mb-6">
                                    <div className="text-xs font-mono tracking-wider font-bold text-amber-400 mb-1 uppercase">Chào mừng</div>
                                    <div className="text-2xl font-black text-white uppercase">Kích Hoạt Tài Khoản</div>
                                </div>

                                <div className="p-3.5 bg-slate-900/80 rounded-xl border border-amber-500/25 flex items-center gap-3.5 mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                        <i className="fas fa-user-tie text-lg"></i>
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="text-[10px] text-amber-400 font-bold uppercase">Nhân viên mới</div>
                                        <div className="text-white text-sm font-bold truncate">{invitationDetails?.full_name}</div>
                                        <div className="text-xs text-slate-400 truncate">{invitationDetails?.role}</div>
                                    </div>
                                </div>

                                <form onSubmit={handleJoinSubmit} className="space-y-3 sm:space-y-3.5">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-amber-200/90 uppercase tracking-wider block">Xác nhận Email</label>
                                        <input
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            type="email"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 focus:border-amber-400 outline-none text-sm text-white font-medium transition-all placeholder:text-slate-400 font-mono"
                                            placeholder="example@gmail.com"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-amber-200/90 uppercase tracking-wider block">Thiết lập mật khẩu</label>
                                        <input
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            type="password"
                                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-amber-500/30 focus:border-amber-400 outline-none text-sm text-white font-medium transition-all placeholder:text-slate-400 font-mono"
                                            placeholder="Tối thiểu 10 ký tự..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full relative group overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-500 text-slate-950 py-3.5 font-black text-sm tracking-widest uppercase shadow-[0_4px_25px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.7)] transition-all disabled:opacity-60 mt-2 cursor-pointer border border-amber-300/60"
                                    >
                                        {isSubmitting ? 'ĐANG KÍCH HOẠT...' : 'KÍCH HOẠT TÀI KHOẢN'}
                                    </button>
                                </form>

                                <div className="text-center mt-5">
                                    <button
                                        type="button"
                                        onClick={handleBackToLogin}
                                        className="text-amber-300 hover:text-amber-200 text-xs font-bold uppercase underline transition-colors cursor-pointer"
                                    >
                                        Quay lại đăng nhập
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 5. DÒNG BẢN QUYỀN CHÂN TRANG NHẸ NHÀNG */}
            <div className="relative z-20 text-center mt-2 mb-1 text-[11px] text-slate-400/80 select-none">
                <span>© 2026 Showroom Thuận An • Đêm Hội Trăng Rằm</span>
            </div>
        </div>
    );
};
