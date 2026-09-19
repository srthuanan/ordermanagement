const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const targetFile = path.join(__dirname, '../components/login/MidAutumnImperialBackdrop.tsx');

// Generate static pillars
let pillarsSvg = '';
for (let i = 0; i < 28; i++) {
  const px = 40 + i * 68;
  pillarsSvg += `                <g key="${i}" transform="translate(${px}, 498)">
                    <rect x="-4" y="8" width="8" height="22" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
                    <ellipse cx="0" cy="5" rx="4.5" ry="6" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" filter="url(#impBloom)" />
                </g>\n`;
}

// Generate static floating lotus lanterns
const lanterns = [
  { x: 380, y: 640, scale: 0.65 },
  { x: 580, y: 670, scale: 0.72 },
  { x: 740, y: 620, scale: 0.6 },
  { x: 1080, y: 630, scale: 0.62 },
  { x: 1260, y: 660, scale: 0.7 },
  { x: 1680, y: 650, scale: 0.68 },
  { x: 490, y: 880, scale: 1.15 },
  { x: 1140, y: 920, scale: 1.2 },
  { x: 1620, y: 890, scale: 1.18 }
];

let lanternsSvg = '';
lanterns.forEach((item, idx) => {
  const animClass = idx % 2 === 0 ? 'animate-lotus-bob-1' : 'animate-lotus-bob-2';
  lanternsSvg += `                <g key="${idx}" transform="translate(${item.x}, ${item.y}) scale(${item.scale})" className="${animClass}">
                    <ellipse cx="0" cy="6" rx="22" ry="7" fill="#f59e0b" opacity="0.5" filter="url(#impBloom)" />
                    <path d="M 0,8 C -12,0 -14,-14 0,-20 C 14,-14 12,0 0,8 Z" fill="url(#impLotusPink)" />
                    <path d="M -7,6 C -16,0 -14,-8 -7,-12 C -2,-8 -2,2 -7,6 Z" fill="url(#impLotusPink)" opacity="0.85" />
                    <path d="M 7,6 C 16,0 14,-8 7,-12 C 2,-8 2,2 7,6 Z" fill="url(#impLotusPink)" opacity="0.85" />
                    <circle cx="0" cy="-5" r="3.2" fill="#ffffff" filter="url(#impBloom)" />
                    <circle cx="0" cy="-5" r="1.8" fill="#fef08a" />
                </g>\n`;
});

const code = `import React from 'react';

export const MidAutumnImperialBackdropComponent: React.FC = () => {
    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0" style={{ contain: 'strict', isolation: 'isolate' }}>
            <style>{\`
                /* ============================================================================== */
                /* CSS CHUYỂN ĐỘNG CUNG ĐÌNH HOÀNG GIA - TỐI ƯU HÓA GPU 60FPS KHÔNG GIẬT LAG      */
                /* ============================================================================== */

                /* 1. VẦNG SIÊU TRĂNG HOÀNG CUNG TỎA HÀO QUANG */
                @keyframes imperial-moon-glow {
                    0%, 100% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 50px rgba(254, 240, 138, 0.5)) drop-shadow(0 0 100px rgba(245, 158, 11, 0.35));
                    }
                    50% {
                        transform: scale(1.025);
                        filter: drop-shadow(0 0 75px rgba(254, 240, 138, 0.75)) drop-shadow(0 0 140px rgba(245, 158, 11, 0.55));
                    }
                }
                .animate-imperial-moon {
                    animation: imperial-moon-glow 8s ease-in-out infinite;
                    transform-origin: 960px 170px;
                }

                /* 2. ĐÀN CHIM HẠC HOÀNG GIA SẢI CÁNH QUA MẶT TRĂNG */
                @keyframes imperial-crane-fly-1 {
                    0% {
                        transform: translate(2100px, 140px) scale(0.85);
                    }
                    100% {
                        transform: translate(-300px, 90px) scale(0.85);
                    }
                }
                .animate-crane-1 {
                    animation: imperial-crane-fly-1 32s linear infinite;
                }
                @keyframes imperial-crane-fly-2 {
                    0% {
                        transform: translate(2200px, 210px) scale(0.68);
                    }
                    100% {
                        transform: translate(-200px, 150px) scale(0.68);
                    }
                }
                .animate-crane-2 {
                    animation: imperial-crane-fly-2 36s linear infinite 7s;
                }
                @keyframes crane-wing-flap {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(0.45); }
                }
                .animate-wing-flap {
                    animation: crane-wing-flap 1.2s ease-in-out infinite;
                    transform-origin: center;
                }

                /* 3. MÂY NGŨ SẮC CUNG ĐÌNH TRÔI BỒNG BỀNH */
                @keyframes imperial-cloud-drift-1 {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(45px); }
                }
                .animate-imperial-cloud-1 {
                    animation: imperial-cloud-drift-1 22s ease-in-out infinite;
                }
                @keyframes imperial-cloud-drift-2 {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(-35px); }
                }
                .animate-imperial-cloud-2 {
                    animation: imperial-cloud-drift-2 26s ease-in-out infinite;
                }

                /* 4. THUYỀN RỒNG HOÀNG GIA LƯỚT HỒ SEN */
                @keyframes imperial-dragon-boat-sail {
                    0% {
                        transform: translate(-380px, 690px);
                    }
                    50% {
                        transform: translate(960px, 700px);
                    }
                    100% {
                        transform: translate(2300px, 690px);
                    }
                }
                @keyframes boat-water-bobbing {
                    0%, 100% { transform: translateY(0) rotate(0.4deg); }
                    50% { transform: translateY(-3.5px) rotate(-0.4deg); }
                }
                .animate-dragon-boat {
                    animation: imperial-dragon-boat-sail 65s linear infinite;
                }
                .animate-boat-bob {
                    animation: boat-water-bobbing 4s ease-in-out infinite;
                    transform-origin: center;
                }

                /* 5. HOA ĐĂNG BÚP SEN DẬP DỀNH TRÊN HỒ */
                @keyframes lotus-lantern-float-1 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(12px, -4px); }
                }
                .animate-lotus-bob-1 {
                    animation: lotus-lantern-float-1 5s ease-in-out infinite;
                }
                @keyframes lotus-lantern-float-2 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-10px, -5px); }
                }
                .animate-lotus-bob-2 {
                    animation: lotus-lantern-float-2 6.5s ease-in-out infinite;
                }

                /* 6. ĐÈN PHA XE VINFAST & BỤC XOAY SHOWROOM */
                @keyframes vinfast-imperial-drl {
                    0%, 100% { opacity: 0.95; filter: drop-shadow(0 0 6px #38bdf8); }
                    50% { opacity: 1; filter: drop-shadow(0 0 14px #67e8f9) drop-shadow(0 0 25px rgba(56,189,248,0.5)); }
                }
                .animate-vinfast-imperial-drl {
                    animation: vinfast-imperial-drl 3.8s ease-in-out infinite;
                }

                /* 7. PHÁO HOA HOÀNG KIM CUNG ĐÌNH */
                @keyframes imperial-firework-1 {
                    0%, 15% { transform: scale(0.1) translateY(0); opacity: 0; }
                    18% { opacity: 1; }
                    26% { transform: scale(1.1) translateY(22px); opacity: 0.85; }
                    32% { transform: scale(1.25) translateY(48px); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-imperial-fw-1 {
                    transform-origin: 380px 180px;
                    animation: imperial-firework-1 12s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }
                @keyframes imperial-firework-2 {
                    0%, 55% { transform: scale(0.1) translateY(0); opacity: 0; }
                    58% { opacity: 1; }
                    66% { transform: scale(1.12) translateY(24px); opacity: 0.88; }
                    72% { transform: scale(1.26) translateY(50px); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-imperial-fw-2 {
                    transform-origin: 1540px 170px;
                    animation: imperial-firework-2 12s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }

                /* GPU ACCELERATION */
                .animate-imperial-moon,
                .animate-crane-1,
                .animate-crane-2,
                .animate-dragon-boat,
                .animate-boat-bob,
                .animate-lotus-bob-1,
                .animate-lotus-bob-2,
                .animate-imperial-fw-1,
                .animate-imperial-fw-2 {
                    will-change: transform, opacity;
                    transform: translateZ(0);
                    backface-visibility: hidden;
                }
            \`}</style>

            <svg
                viewBox="0 0 1920 1080"
                className="w-full h-full object-cover"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    {/* BẦU TRỜI NHUNG DẠ NGUYỆT HOÀNG GIA */}
                    <linearGradient id="impSky" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#020617" />
                        <stop offset="35%" stopColor="#0a122c" />
                        <stop offset="70%" stopColor="#131b3e" />
                        <stop offset="100%" stopColor="#1e1e48" />
                    </linearGradient>

                    {/* HỒ SEN HOÀNG GIA ĐÊM RẰM */}
                    <linearGradient id="impLake" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#09142f" />
                        <stop offset="30%" stopColor="#060f26" />
                        <stop offset="70%" stopColor="#040a1b" />
                        <stop offset="100%" stopColor="#02050f" />
                    </linearGradient>

                    {/* VẦNG TRĂNG DÁT VÀNG HOÀNG KIM 24K */}
                    <radialGradient id="impMoonAura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="35%" stopColor="#fef08a" stopOpacity="0.95" />
                        <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="impMoonTexture" cx="45%" cy="40%" r="55%">
                        <stop offset="0%" stopColor="#fffbeb" />
                        <stop offset="60%" stopColor="#fef3c7" />
                        <stop offset="85%" stopColor="#fde68a" />
                        <stop offset="100%" stopColor="#fbbf24" />
                    </radialGradient>

                    {/* MÁI NGÓI HOÀNG LƯU LY DÁT VÀNG */}
                    <linearGradient id="impGoldTile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="25%" stopColor="#f59e0b" />
                        <stop offset="65%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    {/* MÁI NGÓI THANH LƯU LY NGỌC BÍCH */}
                    <linearGradient id="impJadeTile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#67e8f9" />
                        <stop offset="30%" stopColor="#14b8a6" />
                        <stop offset="70%" stopColor="#0f766e" />
                        <stop offset="100%" stopColor="#042f2e" />
                    </linearGradient>

                    {/* CỘT GỖ SƠN SON THẾP VÀNG */}
                    <linearGradient id="impCrimsonPillar" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4c0519" />
                        <stop offset="25%" stopColor="#9f1239" />
                        <stop offset="60%" stopColor="#e11d48" />
                        <stop offset="85%" stopColor="#9f1239" />
                        <stop offset="100%" stopColor="#4c0519" />
                    </linearGradient>

                    {/* NỀN ĐÁ CẨM THẠCH TRẮNG CUNG ĐÌNH */}
                    <linearGradient id="impMarble" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="40%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>

                    {/* HOA SEN HỒNG NGỌC */}
                    <linearGradient id="impLotusPink" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#e11d48" />
                        <stop offset="40%" stopColor="#fb7185" />
                        <stop offset="80%" stopColor="#fecdd3" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>

                    {/* LÁ SEN NGỌC THẠCH */}
                    <radialGradient id="impLotusLeaf" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="70%" stopColor="#047857" />
                        <stop offset="100%" stopColor="#064e3b" />
                    </radialGradient>

                    {/* BÓNG NƯỚC LUNG LINH ÁNH TRĂNG */}
                    <linearGradient id="impWaterReflection" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
                        <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="80%" stopColor="#d97706" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#040a1b" stopOpacity="0" />
                    </linearGradient>

                    {/* BỘ LỌC HÀO QUANG */}
                    <filter id="impBloom" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="impShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#020617" floodOpacity="0.85" />
                    </filter>
                </defs>

                {/* ============================================================================== */}
                {/* 1. BẦU TRỜI DẠ NGUYỆT & TẦNG TINH TÚ THIÊN HÀ                                  */}
                {/* ============================================================================== */}
                <rect width="1920" height="680" fill="url(#impSky)" />

                {/* Ngàn vì sao tinh tú lấp lánh */}
                <g opacity="0.85">
                    <circle cx="120" cy="70" r="1.5" fill="#ffffff" />
                    <circle cx="280" cy="110" r="1.8" fill="#fef08a" />
                    <circle cx="450" cy="60" r="1.4" fill="#ffffff" />
                    <circle cx="620" cy="130" r="1.9" fill="#fef08a" />
                    <circle cx="780" cy="80" r="1.3" fill="#ffffff" />
                    <circle cx="1140" cy="90" r="1.6" fill="#fef08a" />
                    <circle cx="1290" cy="135" r="1.4" fill="#ffffff" />
                    <circle cx="1460" cy="75" r="1.8" fill="#fef08a" />
                    <circle cx="1680" cy="110" r="1.5" fill="#ffffff" />
                    <circle cx="1820" cy="65" r="1.7" fill="#fef08a" />
                    <circle cx="210" cy="220" r="1.2" fill="#ffffff" />
                    <circle cx="340" cy="180" r="1.5" fill="#fef08a" />
                    <circle cx="1590" cy="210" r="1.3" fill="#ffffff" />
                    <circle cx="1740" cy="190" r="1.6" fill="#fef08a" />
                </g>

                {/* ============================================================================== */}
                {/* 2. SIÊU TRĂNG RẰM HOÀNG CUNG KHỔNG LỒ (THE IMPERIAL SUPERMOON)                */}
                {/* ============================================================================== */}
                <g className="animate-imperial-moon">
                    {/* Hào quang trăng tỏa sáng */}
                    <circle cx="960" cy="170" r="220" fill="url(#impMoonAura)" filter="url(#impBloom)" opacity="0.65" />
                    {/* Thân vầng trăng rằm */}
                    <circle cx="960" cy="170" r="130" fill="url(#impMoonTexture)" filter="url(#impShadow)" />
                    {/* Họa tiết cội đa & Thỏ Ngọc in mờ trên vầng trăng */}
                    <g opacity="0.18" fill="#78350f">
                        <ellipse cx="930" cy="150" rx="35" ry="50" />
                        <ellipse cx="985" cy="175" rx="42" ry="32" />
                        <circle cx="970" cy="130" r="20" />
                    </g>
                    {/* Viền hào quang vàng kim bao quanh trăng */}
                    <circle cx="960" cy="170" r="130" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                </g>

                {/* ============================================================================== */}
                {/* 3. ĐÀN CHIM HẠC HOÀNG GIA SẢI CÁNH BAY QUA TRĂNG                               */}
                {/* ============================================================================== */}
                <g className="animate-crane-1">
                    <g className="animate-wing-flap">
                        {/* Hạc chúa */}
                        <path d="M 0,0 Q -25,-25 -60,-15 Q -40,10 -15,5 Q -5,12 15,2 Q 35,-12 55,-8 Q 30,-22 0,0 Z" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="-12" cy="-4" r="2.5" fill="#f59e0b" />
                        <circle cx="-12" cy="-4" r="1" fill="#dc2626" />
                        {/* Chân hạc duỗi thẳng */}
                        <line x1="5" y1="3" x2="35" y2="18" stroke="#f59e0b" strokeWidth="1.2" />
                    </g>
                </g>
                <g className="animate-crane-2">
                    <g className="animate-wing-flap">
                        {/* Hạc đàn */}
                        <path d="M 0,0 Q -20,-20 -50,-12 Q -30,8 -12,4 Q -4,10 12,2 Q 28,-10 45,-6 Q 25,-18 0,0 Z" fill="#ffffff" opacity="0.9" filter="url(#impBloom)" />
                        <circle cx="-10" cy="-3" r="2" fill="#f59e0b" />
                        <line x1="4" y1="2" x2="28" y2="14" stroke="#f59e0b" strokeWidth="1" />
                    </g>
                </g>

                {/* ============================================================================== */}
                {/* 4. MÂY NGŨ SẮC CUNG ĐÌNH TRIỀU NGUYỄN (AUSPICIOUS IMPERIAL CLOUDS)            */}
                {/* ============================================================================== */}
                <g className="animate-imperial-cloud-1" opacity="0.65" filter="url(#impBloom)">
                    <path d="M 680,240 Q 730,190 800,210 Q 860,180 930,220 Q 980,190 1050,230 Q 1120,200 1190,240 Q 1100,270 950,260 Q 800,270 680,240 Z" fill="#1e1b4b" stroke="#fef08a" strokeWidth="1.5" />
                    <circle cx="800" cy="210" r="14" fill="#fbbf24" opacity="0.4" />
                    <circle cx="1050" cy="230" r="16" fill="#f43f5e" opacity="0.3" />
                </g>
                <g className="animate-imperial-cloud-2" opacity="0.5" filter="url(#impBloom)">
                    <path d="M 220,160 Q 280,120 360,140 Q 420,110 500,150 Q 430,180 340,175 Q 270,180 220,160 Z" fill="#0f172a" stroke="#fef08a" strokeWidth="1.2" />
                    <path d="M 1450,180 Q 1520,130 1610,155 Q 1680,125 1770,170 Q 1690,200 1580,190 Q 1500,200 1450,180 Z" fill="#0f172a" stroke="#fef08a" strokeWidth="1.2" />
                </g>

                {/* ============================================================================== */}
                {/* 5. PHÁO HOA HOÀNG KIM CUNG ĐÌNH SAU CÁC TẦNG MÁI                                */}
                {/* ============================================================================== */}
                <g id="imp-fireworks-behind-palaces">
                    {/* Pháo hoa Tả Cung (Hoàng Kim Liễu) */}
                    <g className="animate-imperial-fw-1">
                        <circle cx="380" cy="180" r="35" fill="url(#impMoonAura)" filter="url(#impBloom)" />
                        <line x1="380" y1="180" x2="310" y2="120" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="450" y2="120" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="300" y2="190" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="460" y2="190" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="330" y2="250" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="430" y2="250" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" />
                        <circle cx="310" cy="120" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="450" cy="120" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="300" cy="190" r="2.8" fill="#fde047" />
                        <circle cx="460" cy="190" r="2.8" fill="#fde047" />
                        <circle cx="330" cy="250" r="2.5" fill="#f59e0b" />
                        <circle cx="430" cy="250" r="2.5" fill="#f59e0b" />
                    </g>

                    {/* Pháo hoa Hữu Cung (Mẫu Đơn Hồng Ngọc) */}
                    <g className="animate-imperial-fw-2">
                        <circle cx="1540" cy="170" r="35" fill="#f43f5e" opacity="0.4" filter="url(#impBloom)" />
                        <line x1="1540" y1="170" x2="1470" y2="110" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1610" y2="110" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1460" y2="180" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1620" y2="180" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1490" y2="240" stroke="#e11d48" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1590" y2="240" stroke="#e11d48" strokeWidth="1.6" strokeLinecap="round" />
                        <circle cx="1470" cy="110" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="1610" cy="110" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="1460" cy="180" r="2.8" fill="#f472b6" />
                        <circle cx="1620" cy="180" r="2.8" fill="#f472b6" />
                    </g>
                </g>

                {/* ============================================================================== */}
                {/* 6. DÃY NÚI NGỰ BÌNH & RỪNG THÔNG HOÀNG GIA XA XĂM                                */}
                {/* ============================================================================== */}
                <path d="M 0,440 Q 220,380 440,430 Q 680,360 960,420 Q 1240,350 1520,430 Q 1740,380 1920,440 L 1920,530 L 0,530 Z" fill="#091428" opacity="0.85" />
                <path d="M 0,470 Q 300,430 620,460 Q 960,410 1320,465 Q 1660,420 1920,470 L 1920,540 L 0,540 Z" fill="#0f1c3a" />

                {/* ============================================================================== */}
                {/* 7. QUẦN THỂ ĐẠI HOÀNG CUNG (THE GRAND IMPERIAL PALACE & PAVILIONS)             */}
                {/* ============================================================================== */}

                {/* --- CHÍNH ĐIỆN: VỌNG NGUYỆT ĐIỆN / LẦU NGŨ PHỤNG (TRUNG TÂM X: 750 -> 1170) --- */}
                <g id="imperial-main-palace" filter="url(#impShadow)">
                    {/* Bệ đá cẩm thạch tam cấp nâng cao cung điện */}
                    <polygon points="720,530 1200,530 1170,470 750,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                    <line x1="735" y1="500" x2="1185" y0="500" stroke="#f1f5f9" strokeWidth="1.2" />

                    {/* Tầng 1: Điện Tiền Triều Sơn Son Thếp Vàng */}
                    <rect x="760" y="370" width="400" height="100" fill="#881337" stroke="#fbbf24" strokeWidth="2" />
                    {/* Các cột gỗ sơn son thếp vàng */}
                    <rect x="770" y="370" width="18" height="100" fill="url(#impCrimsonPillar)" />
                    <rect x="840" y="370" width="18" height="100" fill="url(#impCrimsonPillar)" />
                    <rect x="910" y="370" width="18" height="100" fill="url(#impCrimsonPillar)" />
                    <rect x="990" y="370" width="18" height="100" fill="url(#impCrimsonPillar)" />
                    <rect x="1060" y="370" width="18" height="100" fill="url(#impCrimsonPillar)" />
                    <rect x="1130" y="370" width="18" height="100" fill="url(#impCrimsonPillar)" />

                    {/* Cửa cung điện dát vàng mở rộng tỏa ánh nến lung linh */}
                    <rect x="938" y="390" width="44" height="80" rx="3" fill="#fef08a" filter="url(#impBloom)" opacity="0.95" />
                    <rect x="943" y="395" width="34" height="75" fill="#f59e0b" />
                    {/* Họa tiết song cửa chữ Thọ cung đình */}
                    <line x1="960" y1="395" x2="960" y2="470" stroke="#78350f" strokeWidth="1.2" />
                    <line x1="943" y1="430" x2="977" y2="430" stroke="#78350f" strokeWidth="1.2" />

                    {/* Mái ngói tầng 1: Hoàng Lưu Ly uốn cong vút 2 đầu */}
                    <path d="M 710,375 Q 960,335 1210,375 L 1180,355 Q 960,320 740,355 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                    {/* Đầu đao rồng uốn ngược chầu trời */}
                    <path d="M 710,375 Q 695,365 700,345 Q 715,355 725,370 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                    <path d="M 1210,375 Q 1225,365 1220,345 Q 1205,355 1195,370 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

                    {/* Tầng 2: Vọng Nguyệt Lầu Cung Đình */}
                    <rect x="810" y="275" width="300" height="75" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.5" />
                    <rect x="825" y="275" width="14" height="75" fill="url(#impCrimsonPillar)" />
                    <rect x="890" y="275" width="14" height="75" fill="url(#impCrimsonPillar)" />
                    <rect x="953" y="275" width="14" height="75" fill="url(#impCrimsonPillar)" />
                    <rect x="1015" y="275" width="14" height="75" fill="url(#impCrimsonPillar)" />
                    <rect x="1080" y="275" width="14" height="75" fill="url(#impCrimsonPillar)" />

                    {/* Biển hiệu hoành phi dát vàng: VỌNG NGUYỆT ĐIỆN */}
                    <rect x="910" y="290" width="100" height="26" rx="2" fill="#4c0519" stroke="#fbbf24" strokeWidth="1.2" />
                    <text x="960" y="308" fill="#fef08a" fontSize="13" fontWeight="bold" textAnchor="middle" letterSpacing="3">VỌNG NGUYỆT</text>

                    {/* Mái ngói tầng 2: Ngũ Phụng Lưu Ly Hoàng Kim */}
                    <path d="M 770,280 Q 960,245 1150,280 L 1125,260 Q 960,230 795,260 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                    <path d="M 770,280 Q 755,270 760,250 Q 775,260 785,275 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                    <path d="M 1150,280 Q 1165,270 1160,250 Q 1145,260 1135,275 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

                    {/* Tầng 3: Thượng Đỉnh Ngũ Phụng Lầu */}
                    <rect x="860" y="195" width="200" height="60" fill="#be123c" stroke="#fbbf24" strokeWidth="1.2" />
                    <circle cx="960" cy="225" r="18" fill="#fef08a" filter="url(#impBloom)" opacity="0.9" />
                    <circle cx="960" cy="225" r="14" fill="#fbbf24" />

                    {/* Mái chóp thượng đỉnh dát vàng với hồ lô ngọc & rồng chầu */}
                    <path d="M 830,200 Q 960,165 1090,200 L 1065,185 Q 960,155 855,185 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                    {/* Hồ lô ngọc & ngọn lửa thái cực trên đỉnh mái */}
                    <ellipse cx="960" cy="155" rx="8" ry="12" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" filter="url(#impBloom)" />
                    <circle cx="960" cy="144" r="4.5" fill="#fef08a" />
                </g>

                {/* --- TẢ CUNG & HÀNH LANG HOÀNG GIA (BÊN TRÁI X: 360 -> 720) --- */}
                <g id="imperial-left-colonnade">
                    <polygon points="340,530 730,530 710,470 360,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                    {/* Dãy hành lang ngắm trăng */}
                    <rect x="380" y="400" width="340" height="70" fill="#4c0519" stroke="#d97706" strokeWidth="1" />
                    <rect x="400" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="460" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="520" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="580" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="640" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="700" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    {/* Mái hành lang thanh lưu ly ngọc bích */}
                    <path d="M 350,405 Q 540,380 730,405 L 715,390 Q 540,365 365,390 Z" fill="url(#impJadeTile)" stroke="#67e8f9" strokeWidth="1.2" />
                    {/* Lồng đèn cung đình lục giác treo dưới mái */}
                    <circle cx="430" cy="425" r="8" fill="#f59e0b" filter="url(#impBloom)" />
                    <circle cx="490" cy="425" r="8" fill="#f43f5e" filter="url(#impBloom)" />
                    <circle cx="550" cy="425" r="8" fill="#f59e0b" filter="url(#impBloom)" />
                    <circle cx="610" cy="425" r="8" fill="#f43f5e" filter="url(#impBloom)" />
                    <circle cx="670" cy="425" r="8" fill="#f59e0b" filter="url(#impBloom)" />
                </g>

                {/* --- HỮU CUNG & LẦU TRÀ THƯỞNG NGUYỆT (BÊN PHẢI X: 1180 -> 1580) --- */}
                <g id="imperial-right-colonnade">
                    <polygon points="1190,530 1590,530 1565,470 1205,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                    <rect x="1210" y="400" width="350" height="70" fill="#4c0519" stroke="#d97706" strokeWidth="1" />
                    <rect x="1230" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="1290" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="1350" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="1410" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="1470" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <rect x="1530" y="400" width="12" height="70" fill="url(#impCrimsonPillar)" />
                    <path d="M 1190,405 Q 1380,380 1570,405 L 1555,390 Q 1380,365 1205,390 Z" fill="url(#impJadeTile)" stroke="#67e8f9" strokeWidth="1.2" />
                    <circle cx="1260" cy="425" r="8" fill="#f59e0b" filter="url(#impBloom)" />
                    <circle cx="1320" cy="425" r="8" fill="#f43f5e" filter="url(#impBloom)" />
                    <circle cx="1380" cy="425" r="8" fill="#f59e0b" filter="url(#impBloom)" />
                    <circle cx="1440" cy="425" r="8" fill="#f43f5e" filter="url(#impBloom)" />
                    <circle cx="1500" cy="425" r="8" fill="#f59e0b" filter="url(#impBloom)" />
                </g>

                {/* ============================================================================== */}
                {/* 8. SHOWROOM VINFAST CUNG ĐÌNH HOÀNG GIA (VINFAST IMPERIAL FLAGSHIP PAVILION)   */}
                {/* Tọa lạc bên cánh tả hồ sen (x: 20 -> 340, y: 320 -> 530)                      */}
                {/* ============================================================================== */}
                <g id="vinfast-imperial-flagship" filter="url(#impShadow)">
                    {/* Bệ đá cẩm thạch hoa sen viền vàng */}
                    <polygon points="10,530 350,530 330,460 25,460" fill="url(#impMarble)" stroke="#fbbf24" strokeWidth="1.5" />
                    <line x1="15" y1="495" x2="340" y2="495" stroke="#f59e0b" strokeWidth="1.2" />

                    {/* Vách kính pha lê panorama trong suốt với ánh sáng rọi sang trọng */}
                    <rect x="30" y="360" width="290" height="100" rx="4" fill="#030712" />
                    <rect x="34" y="364" width="282" height="92" rx="3" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" opacity="0.95" />

                    {/* Bục xoay ô tô đá cẩm thạch đa giác viền đèn LED hào quang */}
                    <ellipse cx="175" cy="435" rx="125" ry="18" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" filter="url(#impBloom)" />
                    <ellipse cx="175" cy="435" rx="120" ry="15" fill="#090d16" stroke="#fbbf24" strokeWidth="1" />

                    {/* Ô TÔ ĐIỆN VINFAST VF9 / VF8 ĐỎ HOÀNG GIA LỘNG LẪY */}
                    <g transform="translate(68, 375)">
                        {/* Thân xe khí động học sang trọng */}
                        <path d="M 15,38 L 40,20 Q 80,12 145,12 Q 185,15 195,25 L 210,38 L 212,48 Q 212,52 205,52 L 182,52 Q 175,40 152,40 Q 130,40 124,52 L 72,52 Q 65,40 42,40 Q 20,40 15,52 L 2,52 Q 0,48 2,42 Z" fill="#991b1b" stroke="#f87171" strokeWidth="1" />
                        {/* Nóc xe sơn đen bóng hai tông màu */}
                        <path d="M 45,21 Q 80,13 140,13 Q 170,14 182,24 L 175,25 Q 135,16 85,16 Q 55,18 45,24 Z" fill="#020617" />
                        {/* Kính xe phủ phản chiếu ánh trăng rằm */}
                        <polygon points="46,21 82,14 135,14 170,24 130,24 82,24" fill="#67e8f9" opacity="0.45" />

                        {/* Bánh mâm hợp kim thể thao đa chấu phay kim cương */}
                        <circle cx="42" cy="48" r="14" fill="#090d16" stroke="#e2e8f0" strokeWidth="2.5" />
                        <circle cx="42" cy="48" r="7" fill="#64748b" />
                        <circle cx="152" cy="48" r="14" fill="#090d16" stroke="#e2e8f0" strokeWidth="2.5" />
                        <circle cx="152" cy="48" r="7" fill="#64748b" />

                        {/* ĐÈN LED CÁNH CHIM CHỮ V VINFAST ĐẶC TRƯNG TỎA SÁNG */}
                        <g className="animate-vinfast-imperial-drl">
                            <path d="M 200,32 Q 208,35 212,38" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#impBloom)" />
                            <path d="M 2,36 L 15,36" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                            {/* Logo chữ V kiêu hãnh */}
                            <path d="M 207,34 L 210,38 L 213,34" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#impBloom)" />
                        </g>
                    </g>

                    {/* Mái ngói cung đình Showroom: Thanh Lưu Ly ngọc bích viền vàng */}
                    <path d="M 15,365 Q 175,330 335,365 L 320,350 Q 175,320 30,350 Z" fill="url(#impJadeTile)" stroke="#fef08a" strokeWidth="1.5" />
                    <path d="M 15,365 Q 0,355 5,340 Q 18,350 28,362 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                    <path d="M 335,365 Q 350,355 345,340 Q 332,350 322,362 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

                    {/* Biển hiệu hoàng gia: VINFAST THUẬN AN */}
                    <rect x="75" y="325" width="200" height="26" rx="3" fill="#451a03" stroke="#fbbf24" strokeWidth="1.5" />
                    <text x="175" y="342" fill="#fef08a" fontSize="12" fontWeight="bold" textAnchor="middle" letterSpacing="2">VINFAST THUẬN AN</text>
                </g>

                {/* ============================================================================== */}
                {/* 9. BỜ KÈ CẨM THẠCH & HÀNG LAN CAN HOÀNG GIA DIỆU KỲ                           */}
                {/* ============================================================================== */}
                <rect x="0" y="525" width="1920" height="22" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                <rect x="0" y="525" width="1920" height="4" fill="#cbd5e1" opacity="0.9" />

                {/* Hàng trụ lan can chạm hoa sen đá cẩm thạch */}
${pillarsSvg}
                {/* Tay vịn lan can đá */}
                <line x1="0" y1="506" x2="1920" y2="506" stroke="#94a3b8" strokeWidth="3" />
                <line x1="0" y1="518" x2="1920" y2="518" stroke="#64748b" strokeWidth="2" />

                {/* ============================================================================== */}
                {/* 10. HỒ SEN TRĂNG RẰM HOÀNG GIA (THE IMPERIAL LOTUS LAKE)                       */}
                {/* ============================================================================== */}
                <rect x="0" y="547" width="1920" height="533" fill="url(#impLake)" />

                {/* Dải bóng nước vàng óng lung linh soi bóng Siêu Trăng & Cung Điện */}
                <ellipse cx="960" cy="650" rx="350" ry="90" fill="url(#impWaterReflection)" filter="url(#impBloom)" />
                <ellipse cx="960" cy="780" rx="480" ry="120" fill="url(#impWaterReflection)" filter="url(#impBloom)" opacity="0.75" />
                <ellipse cx="960" cy="920" rx="600" ry="140" fill="url(#impWaterReflection)" filter="url(#impBloom)" opacity="0.5" />

                {/* Các luồng sóng nước dát vàng dập dềnh */}
                <path d="M 0,580 Q 480,565 960,580 Q 1440,595 1920,580" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <path d="M 0,630 Q 480,645 960,630 Q 1440,615 1920,630" fill="none" stroke="#fde047" strokeWidth="1.4" opacity="0.45" />
                <path d="M 0,700 Q 480,685 960,700 Q 1440,715 1920,700" fill="none" stroke="#f59e0b" strokeWidth="1.6" opacity="0.35" />
                <path d="M 0,790 Q 480,810 960,790 Q 1440,770 1920,790" fill="none" stroke="#fde047" strokeWidth="1.8" opacity="0.3" />
                <path d="M 0,890 Q 480,870 960,890 Q 1440,910 1920,890" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.25" />

                {/* ============================================================================== */}
                {/* 11. THUYỀN RỒNG HOÀNG GIA DÁT VÀNG (THE IMPERIAL DRAGON BARGE)                 */}
                {/* Lướt êm ái trên hồ sen từ trái qua phải                                        */}
                {/* ============================================================================== */}
                <g className="animate-dragon-boat">
                    <g className="animate-boat-bob" filter="url(#impShadow)">
                        {/* Vệt rẽ sóng nước dát vàng dưới lườn thuyền */}
                        <ellipse cx="140" cy="65" rx="140" ry="8" fill="#38bdf8" opacity="0.45" filter="url(#impBloom)" />
                        <ellipse cx="135" cy="68" rx="110" ry="5" fill="#fef08a" opacity="0.6" filter="url(#impBloom)" />

                        {/* Thân thuyền gỗ lim dát vàng vát cong mỹ thuật */}
                        <path d="M 10,48 Q 120,68 260,50 L 250,22 Q 130,28 30,26 Z" fill="url(#impGoldTile)" stroke="#fbbf24" strokeWidth="1.5" />
                        {/* Mạn thuyền chạm khắc vảy rồng dát vàng */}
                        <path d="M 35,32 Q 130,40 235,32" stroke="#451a03" strokeWidth="2.5" strokeDasharray="6,4" fill="none" />

                        {/* MŨI THUYỀN: ĐẦU RỒNG DÁT VÀNG UY DŨNG NGẬM NGỌC MINH CHÂU */}
                        <g transform="translate(250, 8)">
                            {/* Đầu rồng uốn lượn */}
                            <path d="M 0,35 Q 15,20 20,5 Q 32,15 28,30 Q 22,42 0,45 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" filter="url(#impBloom)" />
                            {/* Sừng rồng & bờm rồng */}
                            <path d="M 15,8 Q 28,-10 38,-4 Q 30,8 18,14 Z" fill="#f59e0b" />
                            {/* Mắt rồng đính ngọc ruby */}
                            <circle cx="18" cy="12" r="2.2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                            {/* Ngọc minh châu sáng rực miệng rồng */}
                            <circle cx="28" cy="24" r="5" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.2" filter="url(#impBloom)" />
                        </g>

                        {/* ĐUÔI THUYỀN: ĐUÔI PHƯỢNG HOÀNG UỐN CONG */}
                        <path d="M 15,35 Q -10,15 -18,-5 Q -5,-2 8,18 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />

                        {/* LẦU RỒNG CUNG ĐÌNH TRÊN THUYỀN */}
                        <rect x="70" y="-8" width="130" height="36" fill="#881337" stroke="#fbbf24" strokeWidth="1.2" />
                        {/* Cột son và rèm lụa hoàng cung */}
                        <rect x="75" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="115" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="155" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="194" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="83" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />
                        <rect x="123" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />
                        <rect x="163" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />

                        {/* Mái lầu rồng: Hoàng lưu ly cong vút */}
                        <path d="M 55,-6 Q 135,-26 215,-6 L 205,-18 Q 135,-32 65,-18 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                        {/* Đèn lồng cung đình treo đung đưa trước & sau thuyền */}
                        <circle cx="65" cy="5" r="5" fill="#f59e0b" filter="url(#impBloom)" />
                        <circle cx="205" cy="5" r="5" fill="#f43f5e" filter="url(#impBloom)" />
                    </g>
                </g>

                {/* ============================================================================== */}
                {/* 12. QUẦN THỂ HOA SEN HỒNG NGỌC & HOA ĐĂNG BÚP SEN THẮP NẾN                     */}
                {/* ============================================================================== */}
                {/* Cụm Sen 1: Cánh tả hồ sen (x: 180, y: 760) */}
                <g className="animate-lotus-bob-1" transform="translate(180, 760)" filter="url(#impShadow)">
                    {/* Lá sen nổi */}
                    <ellipse cx="-20" cy="10" rx="38" ry="14" fill="url(#impLotusLeaf)" stroke="#047857" strokeWidth="0.8" />
                    <ellipse cx="25" cy="15" rx="34" ry="12" fill="url(#impLotusLeaf)" stroke="#047857" strokeWidth="0.8" />
                    {/* Đóa sen hồng ngọc nở rộ */}
                    <path d="M 0,12 C -18,2 -22,-18 0,-26 C 22,-18 18,2 0,12 Z" fill="url(#impLotusPink)" filter="url(#impBloom)" />
                    <path d="M -10,8 C -26,-2 -22,-14 -10,-18 C -2,-12 -2,4 -10,8 Z" fill="url(#impLotusPink)" opacity="0.9" />
                    <path d="M 10,8 C 26,-2 22,-14 10,-18 C 2,-12 2,4 10,8 Z" fill="url(#impLotusPink)" opacity="0.9" />
                    {/* Ngọn nến lung linh nhị hoa */}
                    <circle cx="0" cy="-8" r="4.5" fill="#ffffff" filter="url(#impBloom)" />
                    <circle cx="0" cy="-8" r="2.5" fill="#fef08a" />
                </g>

                {/* Cụm Sen 2: Trung tâm hồ sen (x: 820, y: 840) */}
                <g className="animate-lotus-bob-2" transform="translate(820, 840)" filter="url(#impShadow)">
                    <ellipse cx="-15" cy="8" rx="42" ry="15" fill="url(#impLotusLeaf)" stroke="#047857" strokeWidth="0.8" />
                    <path d="M 0,14 C -20,2 -24,-20 0,-30 C 24,-20 20,2 0,14 Z" fill="url(#impLotusPink)" filter="url(#impBloom)" />
                    <circle cx="0" cy="-10" r="5" fill="#ffffff" filter="url(#impBloom)" />
                    <circle cx="0" cy="-10" r="3" fill="#fef08a" />
                </g>

                {/* Cụm Sen 3: Cánh hữu hồ sen (x: 1420, y: 780) */}
                <g className="animate-lotus-bob-1" transform="translate(1420, 780)" filter="url(#impShadow)">
                    <ellipse cx="20" cy="10" rx="40" ry="14" fill="url(#impLotusLeaf)" stroke="#047857" strokeWidth="0.8" />
                    <path d="M 0,12 C -18,2 -22,-18 0,-26 C 22,-18 18,2 0,12 Z" fill="url(#impLotusPink)" filter="url(#impBloom)" />
                    <circle cx="0" cy="-8" r="4.5" fill="#ffffff" filter="url(#impBloom)" />
                    <circle cx="0" cy="-8" r="2.5" fill="#fef08a" />
                </g>

                {/* HÀNG HOA ĐĂNG BÚP SEN THẢ TRÔI BỀNH BỒNG TRÊN SÓNG NƯỚC */}
${lanternsSvg}
                {/* ============================================================================== */}
                {/* 13. KHUNG VIỀN HOÀNG GIA VÀNG KIM 24K CHẠM KHẮC 3D (ROYAL GOLD BORDER)         */}
                {/* ============================================================================== */}
                <rect x="3" y="3" width="1914" height="1074" fill="none" stroke="url(#impGoldTile)" strokeWidth="2.5" opacity="0.5" />
                <rect x="8" y="8" width="1904" height="1064" fill="none" stroke="#fef08a" strokeWidth="1" opacity="0.35" />
            </svg>
        </div>
    );
};

export const MidAutumnImperialBackdrop = React.memo(MidAutumnImperialBackdropComponent, () => true);
`;

try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for clean MidAutumnImperialBackdrop.tsx!');
  fs.writeFileSync(targetFile, code, 'utf8');
  console.log('SUCCESS: Written clean MidAutumnImperialBackdrop.tsx');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
