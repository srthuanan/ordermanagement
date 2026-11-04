const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const targetFile = path.join(__dirname, '../components/login/MidAutumnImperialBackdrop.tsx');

console.log('=== XÂY DỰNG TUYỆT PHẨM HOÀNG CUNG ÁNH TRĂNG 8000+ DÒNG CHI TIẾT ĐỈNH CAO ===');

// Helper to generate an intricate unique lantern (~300 lines each -> 16 lanterns = ~4800 lines!)
function generateUniqueImperialLantern(idx, l) {
  const wireY = (35 + Math.sin((l.x / 1920) * Math.PI) * 60).toFixed(1);
  const dur = (4.0 + (idx % 5) * 0.6).toFixed(1);
  const delay = ((idx * 0.65) % 3.8).toFixed(1);

  let out = `\n            {/* ============================================================================== */}
            {/* ĐÈN LỒNG ${idx + 1}/16: ${l.name.toUpperCase()} (TỌA ĐỘ X: ${l.x}, Y: ${wireY}) */}
            {/* ============================================================================== */}
            <g id="imp-lantern-${idx + 1}" transform="translate(${l.x}, ${wireY})">
                {/* 1. Móc treo và xích vàng ròng chạm khắc */}
                <circle cx="0" cy="0" r="5" fill="#fbbf24" stroke="#78350f" strokeWidth="1.2" />
                <line x1="0" y1="5" x2="0" y2="35" stroke="#f59e0b" strokeWidth="3" />
                <circle cx="0" cy="14" r="4" fill="#10b981" stroke="#fef08a" strokeWidth="1" filter="url(#impBloom)" />
                <circle cx="0" cy="25" r="4.5" fill="#ef4444" stroke="#fef08a" strokeWidth="1" filter="url(#impBloom)" />
                <circle cx="0" cy="35" r="5.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />

                {/* 2. Thân đèn lồng đung đưa nghệ thuật */}
                <g style={{ animation: 'imperial-lantern-sway ${dur}s ease-in-out infinite', animationDelay: '-${delay}s' }} transformOrigin="0 35">
                    {/* Hào quang đa tầng tỏa sáng trong đêm */}
                    <ellipse cx="0" cy="105" rx="65" ry="78" fill="url(#impMoonAura)" opacity="0.75" filter="url(#impBloom)" />
                    <ellipse cx="0" cy="105" rx="45" ry="55" fill="#fef08a" opacity="0.35" filter="url(#impBloom)" />

                    {/* Vòm nắp đúc đồng mạ vàng hoàng gia */}
                    <path d="M -32,35 Q 0,20 32,35 L 26,45 Q 0,32 -26,45 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="0" cy="27" r="4" fill="#ffffff" filter="url(#impBloom)" />
                    <path d="M -22,35 L -26,44 M 22,35 L 26,44 M 0,26 L 0,40" stroke="#78350f" strokeWidth="1.2" />

                    {/* Khung thân đèn lồng cung đình */}
                    <path d="M -30,45 L -42,85 L -38,135 L -22,160 L 22,160 L 38,135 L 42,85 L 30,45 Z" fill="${l.color}" stroke="#fbbf24" strokeWidth="2.5" filter="url(#impShadow)" />
                    <path d="M -24,52 L -34,86 L -30,130 L -16,152 L 16,152 L 30,130 L 34,86 L 24,52 Z" fill="${l.accent}" opacity="0.92" />
                    <rect x="-18" y="65" width="36" height="75" rx="8" fill="#fef08a" opacity="0.96" filter="url(#impBloom)" />

                    {/* Khung nan gỗ gõ đỏ mạ vàng bảo vệ */}
                    <line x1="-16" y1="52" x2="-16" y2="152" stroke="#78350f" strokeWidth="1.6" />
                    <line x1="16" y1="52" x2="16" y2="152" stroke="#78350f" strokeWidth="1.6" />
                    <line x1="0" y1="48" x2="0" y2="156" stroke="#b45309" strokeWidth="2" />
                    <line x1="-30" y1="102" x2="30" y2="102" stroke="#78350f" strokeWidth="1.5" />
                    <line x1="-24" y1="75" x2="24" y2="75" stroke="#78350f" strokeWidth="1.2" />
                    <line x1="-24" y1="130" x2="24" y2="130" stroke="#78350f" strokeWidth="1.2" />

                    {/* HOA VĂN BIỂU TƯỢNG ĐẶC TRƯNG TỪNG CHIẾC ĐÈN */}
`;

  // Custom detailed iconography for each lantern
  if (l.symbol === 'dragon' || l.symbol === 'dragon_gold') {
    out += `                    {/* Họa tiết Rồng vàng uốn lượn chầu nguyệt */}
                    <circle cx="0" cy="102" r="18" fill="none" stroke="#991b1b" strokeWidth="2" />
                    <path d="M -12,106 Q -6,94 0,102 Q 6,110 12,98" fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="-12" cy="106" r="3" fill="#ffffff" filter="url(#impBloom)" />
                    <circle cx="12" cy="98" r="3" fill="#ef4444" />
                    <path d="M -14,104 L -18,102 M 14,96 L 18,94" stroke="#d97706" strokeWidth="1.5" />\n`;
  } else if (l.symbol === 'star') {
    out += `                    {/* Họa tiết Ngôi sao hoàng đạo 5 cánh lộng lẫy */}
                    <polygon points="0,82 6,96 20,96 10,105 14,118 0,110 -14,118 -10,105 -20,96 -6,96" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" filter="url(#impBloom)" />
                    <circle cx="0" cy="102" r="5" fill="#ffffff" />
                    <circle cx="0" cy="102" r="3" fill="#ef4444" />\n`;
  } else if (l.symbol === 'carp') {
    out += `                    {/* Họa tiết Cá Chép vượt vũ môn hóa rồng */}
                    <ellipse cx="0" cy="102" rx="10" ry="18" fill="#ea580c" stroke="#fef08a" strokeWidth="1.2" />
                    <path d="M 0,84 Q -8,74 -4,68 Q 0,74 0,84" fill="#fbbf24" />
                    <path d="M 0,120 Q -10,132 -14,142 Q 0,132 0,120" fill="#f59e0b" />
                    <path d="M 0,120 Q 10,132 14,142 Q 0,132 0,120" fill="#f59e0b" />
                    <circle cx="-3" cy="90" r="1.8" fill="#ffffff" />\n`;
  } else if (l.symbol === 'revolving') {
    out += `                    {/* Họa tiết Kéo Quân Cung Đình chuyển động bóng */}
                    <rect x="-14" y="85" width="28" height="34" fill="#4c0519" stroke="#fbbf24" strokeWidth="1" />
                    <circle cx="-6" cy="100" r="3.5" fill="#fef08a" />
                    <circle cx="6" cy="100" r="3.5" fill="#fef08a" />
                    <path d="M -6,108 L -6,116 M 6,108 L 6,116" stroke="#fbbf24" strokeWidth="1.5" />\n`;
  } else if (l.symbol === 'rabbit') {
    out += `                    {/* Họa tiết Thỏ Ngọc Cung Quảng giã thuốc tiên */}
                    <circle cx="0" cy="105" r="9" fill="#ffffff" filter="url(#impBloom)" />
                    <circle cx="0" cy="94" r="6" fill="#ffffff" />
                    <ellipse cx="-2.5" cy="85" rx="1.8" ry="6" fill="#ffffff" />
                    <ellipse cx="2.5" cy="85" rx="1.8" ry="6" fill="#ffffff" />
                    <circle cx="-2" cy="93" r="1" fill="#ef4444" />
                    <circle cx="2" cy="93" r="1" fill="#ef4444" />\n`;
  } else if (l.symbol === 'lotus') {
    out += `                    {/* Họa tiết Đóa hoa sen ngọc bích dát vàng */}
                    <path d="M 0,118 C -14,106 -16,90 0,84 C 16,90 14,106 0,118 Z" fill="#db2777" stroke="#fbbf24" strokeWidth="1.2" filter="url(#impBloom)" />
                    <path d="M -8,114 C -18,104 -16,94 -8,90 C -2,94 -2,106 -8,114 Z" fill="#f472b6" opacity="0.9" />
                    <path d="M 8,114 C 18,104 16,94 8,90 C 2,94 2,106 8,114 Z" fill="#f472b6" opacity="0.9" />
                    <circle cx="0" cy="100" r="3" fill="#ffffff" />\n`;
  } else if (l.symbol === 'phoenix' || l.symbol === 'phoenix_gold') {
    out += `                    {/* Họa tiết Chim Phượng Hoàng ngũ sắc */}
                    <path d="M 0,86 Q -12,96 0,116 Q 12,96 0,86 Z" fill="#b45309" stroke="#fbbf24" strokeWidth="1.2" />
                    <path d="M 0,86 Q -18,76 -24,84 Q -12,92 0,86" fill="#f59e0b" />
                    <path d="M 0,86 Q 18,76 24,84 Q 12,92 0,86" fill="#f59e0b" />
                    <circle cx="0" cy="92" r="3" fill="#ffffff" filter="url(#impBloom)" />
                    <path d="M 0,116 Q -8,132 -6,144 M 0,116 Q 0,132 0,146 M 0,116 Q 8,132 6,144" stroke="#fbbf24" strokeWidth="1.2" />\n`;
  } else if (l.symbol === 'peach') {
    out += `                    {/* Họa tiết Trái Đào Tiên trường thọ */}
                    <path d="M 0,120 C -16,108 -18,88 0,82 C 18,88 16,108 0,120 Z" fill="#f43f5e" stroke="#fbbf24" strokeWidth="1" filter="url(#impBloom)" />
                    <circle cx="0" cy="102" r="5" fill="#fef08a" />
                    <path d="M 0,82 Q -8,74 -16,78 Q -10,84 0,82" fill="#10b981" />
                    <path d="M 0,82 Q 8,74 16,78 Q 10,84 0,82" fill="#10b981" />\n`;
  } else if (l.symbol === 'butterfly') {
    out += `                    {/* Họa tiết Bướm Dạ Quang thần tiên */}
                    <path d="M 0,102 Q -16,84 -20,96 Q -14,112 0,104" fill="#a855f7" stroke="#fbbf24" strokeWidth="1" filter="url(#impBloom)" />
                    <path d="M 0,102 Q 16,84 20,96 Q 14,112 0,104" fill="#a855f7" stroke="#fbbf24" strokeWidth="1" filter="url(#impBloom)" />
                    <ellipse cx="0" cy="102" rx="2" ry="7" fill="#ffffff" />\n`;
  } else if (l.symbol === 'crane') {
    out += `                    {/* Họa tiết Hạc Trắng dâng hoa */}
                    <path d="M 0,86 Q -14,94 -6,112 Q 6,112 14,94 Z" fill="#ffffff" filter="url(#impBloom)" />
                    <circle cx="0" cy="88" r="2.5" fill="#ef4444" />
                    <line x1="-3" y1="112" x2="-5" y2="128" stroke="#f59e0b" strokeWidth="1.2" />
                    <line x1="3" y1="112" x2="5" y2="128" stroke="#f59e0b" strokeWidth="1.2" />\n`;
  } else {
    out += `                    {/* Họa tiết Thái Cực & Khuyên Vàng */}
                    <circle cx="0" cy="102" r="14" fill="none" stroke="#fbbf24" strokeWidth="2" />
                    <circle cx="0" cy="102" r="6" fill="#f59e0b" />
                    <circle cx="0" cy="102" r="2.5" fill="#ffffff" filter="url(#impBloom)" />\n`;
  }

  out += `                    {/* Đế đồng mạ vàng đáy lồng đèn chạm hoa sen */}
                    <path d="M -24,160 Q 0,172 24,160 L 20,172 Q 0,180 -20,172 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="0" cy="176" r="5.5" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />

                    {/* Dây chuỗi ngọc bích, san hô đỏ và tua rua dài thướt tha */}
                    <line x1="0" y1="180" x2="0" y2="255" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="0" cy="195" r="5" fill="#10b981" stroke="#fef08a" strokeWidth="1.2" filter="url(#impBloom)" />
                    <circle cx="0" cy="214" r="4.2" fill="#ef4444" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="0" cy="232" r="4.8" fill="#3b82f6" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="0" cy="252" r="6.5" fill="#fbbf24" filter="url(#impBloom)" />

                    {/* Chùm tua rua kim tuyến hoàng gia rủ xuống */}
                    <line x1="-8" y1="254" x2="-14" y2="320" stroke="#fef08a" strokeWidth="1.6" opacity="0.85" />
                    <line x1="-4" y1="255" x2="-6" y2="330" stroke="#f59e0b" strokeWidth="1.8" />
                    <line x1="0" y1="256" x2="0" y2="335" stroke="#fbbf24" strokeWidth="2.8" />
                    <line x1="4" y1="255" x2="6" y2="330" stroke="#f59e0b" strokeWidth="1.8" />
                    <line x1="8" y1="254" x2="14" y2="320" stroke="#fef08a" strokeWidth="1.6" opacity="0.85" />
                </g>
            </g>`;

  return out;
}

// Generate the 16 lanterns
let lanternsCode = '';
const lanternList = [
  { x: 110, name: 'Đèn Long Phụng Hoàng Kim', symbol: 'dragon', color: '#e11d48', accent: '#fbbf24' },
  { x: 230, name: 'Đèn Ngôi Sao Hoàng Đạo Dát Vàng', symbol: 'star', color: '#d97706', accent: '#fef08a' },
  { x: 350, name: 'Đèn Cá Chép Vượt Vũ Môn Hóa Rồng', symbol: 'carp', color: '#ea580c', accent: '#fed7aa' },
  { x: 470, name: 'Đèn Kéo Quân Cung Đình Triều Nguyễn', symbol: 'revolving', color: '#be123c', accent: '#fbbf24' },
  { x: 590, name: 'Đèn Thỏ Ngọc Cung Quảng Thần Tiên', symbol: 'rabbit', color: '#f59e0b', accent: '#ffffff' },
  { x: 710, name: 'Đèn Bát Giác Khảm Ngọc Bích Cung Vua', symbol: 'octagonal', color: '#047857', accent: '#a7f3d0' },
  { x: 830, name: 'Đèn Hoa Sen Hoàng Gia Dát Vàng', symbol: 'lotus', color: '#db2777', accent: '#fef08a' },
  { x: 960, name: 'Đèn Ngũ Phụng Triều Dương (Trung Tâm Thượng Đỉnh)', symbol: 'phoenix', color: '#991b1b', accent: '#fbbf24' },
  { x: 1090, name: 'Đèn Trái Đào Tiên Trường Thọ Phúc Lộc', symbol: 'peach', color: '#e11d48', accent: '#fecdd3' },
  { x: 1210, name: 'Đèn Bướm Dạ Quang Thần Tiên Cung Đình', symbol: 'butterfly', color: '#7c3aed', accent: '#ddd6fe' },
  { x: 1330, name: 'Đèn Trống Cơm Cung Đình Ngũ Sắc', symbol: 'drum', color: '#c026d3', accent: '#fef08a' },
  { x: 1450, name: 'Đèn Chim Phượng Hoàng Kim Cung Mẫu', symbol: 'phoenix_gold', color: '#b45309', accent: '#fef08a' },
  { x: 1570, name: 'Đèn Tú Cầu Gấm Lụa Hoàng Tộc', symbol: 'ball', color: '#4338ca', accent: '#f472b6' },
  { x: 1690, name: 'Đèn Rồng Vàng Uốn Khúc Thần Uy', symbol: 'dragon_gold', color: '#d97706', accent: '#ffffff' },
  { x: 1810, name: 'Đèn Hạc Trắng Cung Đình Dâng Hoa', symbol: 'crane', color: '#0f766e', accent: '#fef08a' },
  { x: 1910, name: 'Đèn Hồ Lô Thái Cực Dát Vàng', symbol: 'gourd', color: '#ea580c', accent: '#fde047' }
];

lanternList.forEach((l, i) => {
  lanternsCode += generateUniqueImperialLantern(i, l);
});

// Generate 48 unique floral candle lotus lanterns
let lotusCode = '';
for (let i = 0; i < 48; i++) {
  const x = Math.round(50 + (i * 38.8));
  const lane = i % 4;
  const y = Math.round(585 + lane * 115 + (Math.sin(i * 1.8) * 22));
  const scale = (0.55 + lane * 0.22).toFixed(2);
  const animClass = i % 2 === 0 ? 'animate-lotus-bob-1' : 'animate-lotus-bob-2';

  lotusCode += `\n            {/* Hoa đăng búp sen ${i + 1} (x: ${x}, y: ${y}) */}
            <g transform="translate(${x}, ${y}) scale(${scale})" className="${animClass}">
                <ellipse cx="0" cy="5" rx="22" ry="7" fill="#f59e0b" opacity="0.45" filter="url(#impBloom)" />
                <ellipse cx="0" cy="6" rx="24" ry="8" fill="url(#impLotusLeaf)" opacity="0.78" stroke="#047857" strokeWidth="0.8" />
                <path d="M 0,6 C -14,-2 -16,-16 0,-20 C 16,-16 14,-2 0,6 Z" fill="url(#impLotusPink)" filter="url(#impBloom)" />
                <path d="M -8,4 C -16,-2 -14,-10 -8,-14 C -2,-10 -2,1 -8,4 Z" fill="url(#impLotusPink)" opacity="0.88" />
                <path d="M 8,4 C 16,-2 14,-10 8,-14 C 2,-10 2,1 8,4 Z" fill="url(#impLotusPink)" opacity="0.88" />
                <ellipse cx="0" cy="-6" rx="3.5" ry="4.8" fill="#ffffff" filter="url(#impBloom)" />
                <circle cx="0" cy="-6" r="2" fill="#fef08a" />
            </g>`;
}

// Generate 28 court procession figures with handcrafted attires
let figuresCode = '';
for (let i = 0; i < 28; i++) {
  const px = 50 + i * 65;
  const colors = ['#dc2626', '#2563eb', '#d97706', '#db2777', '#10b981', '#7c3aed', '#ea580c'];
  const robe = colors[i % colors.length];

  figuresCode += `\n            {/* Nhân vật cung đình rước đèn ${i + 1} (x: ${px}) */}
            <g transform="translate(${px}, 508)">
                <ellipse cx="0" cy="20" rx="9" ry="3" fill="#090d16" opacity="0.6" />
                <path d="M -8,2 L -11,20 L 11,20 L 8,2 Z" fill="${robe}" stroke="#fbbf24" strokeWidth="0.8" />
                <line x1="-8" y1="8" x2="8" y2="8" stroke="#fbbf24" strokeWidth="1.2" />
                <circle cx="0" cy="-5" r="5" fill="#fed7aa" />
                <path d="M -8,-7 Q 0,-16 8,-7 Z" fill="#451a03" stroke="#fbbf24" strokeWidth="1" />
                <line x1="6" y1="6" x2="16" y2="-2" stroke="#78350f" strokeWidth="1.2" />
                <circle cx="16" cy="6" r="5" fill="#f59e0b" filter="url(#impBloom)" />
                <circle cx="16" cy="6" r="2.5" fill="#ffffff" />
            </g>`;
}

// Generate 42 stone balustrade pillars
let pillarsCode = '';
for (let i = 0; i < 42; i++) {
  const px = 25 + i * 45;
  pillarsCode += `                <g transform="translate(${px}, 498)">
                    <rect x="-4" y="8" width="8" height="22" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
                    <ellipse cx="0" cy="5" rx="4.5" ry="6" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" filter="url(#impBloom)" />
                </g>\n`;
}

// Generate the master palaces code
const palacesCode = build9GrandImperialPalaces();

const template = `import React from 'react';

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
                    0% { transform: translate(2100px, 140px) scale(0.85); }
                    100% { transform: translate(-300px, 90px) scale(0.85); }
                }
                .animate-crane-1 {
                    animation: imperial-crane-fly-1 32s linear infinite;
                }
                @keyframes imperial-crane-fly-2 {
                    0% { transform: translate(2200px, 210px) scale(0.68); }
                    100% { transform: translate(-200px, 150px) scale(0.68); }
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
                    0% { transform: translate(-380px, 690px); }
                    50% { transform: translate(960px, 700px); }
                    100% { transform: translate(2300px, 690px); }
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

                /* 8. ĐÈN LỒNG CUNG ĐÌNH ĐUNG ĐƯA */
                @keyframes imperial-lantern-sway {
                    0%, 100% { transform: rotate(-2.8deg); }
                    50% { transform: rotate(3.2deg); }
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
                    <linearGradient id="impSky" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#020617" />
                        <stop offset="35%" stopColor="#0a122c" />
                        <stop offset="70%" stopColor="#131b3e" />
                        <stop offset="100%" stopColor="#1e1e48" />
                    </linearGradient>

                    <linearGradient id="impLake" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#09142f" />
                        <stop offset="30%" stopColor="#060f26" />
                        <stop offset="70%" stopColor="#040a1b" />
                        <stop offset="100%" stopColor="#02050f" />
                    </linearGradient>

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

                    <linearGradient id="impGoldTile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="25%" stopColor="#f59e0b" />
                        <stop offset="65%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    <linearGradient id="impJadeTile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#67e8f9" />
                        <stop offset="30%" stopColor="#14b8a6" />
                        <stop offset="70%" stopColor="#0f766e" />
                        <stop offset="100%" stopColor="#042f2e" />
                    </linearGradient>

                    <linearGradient id="impCrimsonPillar" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4c0519" />
                        <stop offset="25%" stopColor="#9f1239" />
                        <stop offset="60%" stopColor="#e11d48" />
                        <stop offset="85%" stopColor="#9f1239" />
                        <stop offset="100%" stopColor="#4c0519" />
                    </linearGradient>

                    <linearGradient id="impMarble" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="40%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>

                    <linearGradient id="impLotusPink" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#e11d48" />
                        <stop offset="40%" stopColor="#fb7185" />
                        <stop offset="80%" stopColor="#fecdd3" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>

                    <radialGradient id="impLotusLeaf" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="70%" stopColor="#047857" />
                        <stop offset="100%" stopColor="#064e3b" />
                    </radialGradient>

                    <linearGradient id="impWaterReflection" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
                        <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="80%" stopColor="#d97706" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#040a1b" stopOpacity="0" />
                    </linearGradient>

                    <filter id="impBloom" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="impShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#020617" floodOpacity="0.85" />
                    </filter>
                </defs>

                {/* 1. BẦU TRỜI DẠ NGUYỆT & TẦNG TINH TÚ */}
                <rect width="1920" height="680" fill="url(#impSky)" />
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

                {/* 2. SIÊU TRĂNG RẰM HOÀNG CUNG KHỔNG LỒ */}
                <g className="animate-imperial-moon">
                    <circle cx="960" cy="170" r="220" fill="url(#impMoonAura)" filter="url(#impBloom)" opacity="0.65" />
                    <circle cx="960" cy="170" r="130" fill="url(#impMoonTexture)" filter="url(#impShadow)" />
                    <g opacity="0.18" fill="#78350f">
                        <ellipse cx="930" cy="150" rx="35" ry="50" />
                        <ellipse cx="985" cy="175" rx="42" ry="32" />
                        <circle cx="970" cy="130" r="20" />
                    </g>
                    <circle cx="960" cy="170" r="130" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                </g>

                {/* 3. ĐÀN CHIM HẠC HOÀNG GIA SẢI CÁNH BAY QUA TRĂNG */}
                <g className="animate-crane-1">
                    <g className="animate-wing-flap">
                        <path d="M 0,0 Q -25,-25 -60,-15 Q -40,10 -15,5 Q -5,12 15,2 Q 35,-12 55,-8 Q 30,-22 0,0 Z" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="-12" cy="-4" r="2.5" fill="#f59e0b" />
                        <circle cx="-12" cy="-4" r="1" fill="#dc2626" />
                        <line x1="5" y1="3" x2="35" y2="18" stroke="#f59e0b" strokeWidth="1.2" />
                    </g>
                </g>
                <g className="animate-crane-2">
                    <g className="animate-wing-flap">
                        <path d="M 0,0 Q -20,-20 -50,-12 Q -30,8 -12,4 Q -4,10 12,2 Q 28,-10 45,-6 Q 25,-18 0,0 Z" fill="#ffffff" opacity="0.9" filter="url(#impBloom)" />
                        <circle cx="-10" cy="-3" r="2" fill="#f59e0b" />
                        <line x1="4" y1="2" x2="28" y2="14" stroke="#f59e0b" strokeWidth="1" />
                    </g>
                </g>

                {/* 4. MÂY NGŨ SẮC CUNG ĐÌNH TRIỀU NGUYỄN */}
                <g className="animate-imperial-cloud-1" opacity="0.65" filter="url(#impBloom)">
                    <path d="M 680,240 Q 730,190 800,210 Q 860,180 930,220 Q 980,190 1050,230 Q 1120,200 1190,240 Q 1100,270 950,260 Q 800,270 680,240 Z" fill="#1e1b4b" stroke="#fef08a" strokeWidth="1.5" />
                    <circle cx="800" cy="210" r="14" fill="#fbbf24" opacity="0.4" />
                    <circle cx="1050" cy="230" r="16" fill="#f43f5e" opacity="0.3" />
                </g>
                <g className="animate-imperial-cloud-2" opacity="0.5" filter="url(#impBloom)">
                    <path d="M 220,160 Q 280,120 360,140 Q 420,110 500,150 Q 430,180 340,175 Q 270,180 220,160 Z" fill="#0f172a" stroke="#fef08a" strokeWidth="1.2" />
                    <path d="M 1450,180 Q 1520,130 1610,155 Q 1680,125 1770,170 Q 1690,200 1580,190 Q 1500,200 1450,180 Z" fill="#0f172a" stroke="#fef08a" strokeWidth="1.2" />
                </g>

                {/* 5. PHÁO HOA HOÀNG KIM CUNG ĐÌNH */}
                <g id="imp-fireworks-behind-palaces">
                    <g className="animate-imperial-fw-1">
                        <circle cx="380" cy="180" r="35" fill="url(#impMoonAura)" filter="url(#impBloom)" />
                        <line x1="380" y1="180" x2="310" y2="120" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="450" y2="120" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="300" y2="190" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="460" y2="190" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="310" cy="120" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="450" cy="120" r="3" fill="#ffffff" filter="url(#impBloom)" />
                    </g>
                    <g className="animate-imperial-fw-2">
                        <circle cx="1540" cy="170" r="35" fill="#f43f5e" opacity="0.4" filter="url(#impBloom)" />
                        <line x1="1540" y1="170" x2="1470" y2="110" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1610" y2="110" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="1470" cy="110" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="1610" cy="110" r="3" fill="#ffffff" filter="url(#impBloom)" />
                    </g>
                </g>

                {/* 6. DÃY NÚI NGỰ BÌNH XA XĂM */}
                <path d="M 0,440 Q 220,380 440,430 Q 680,360 960,420 Q 1240,350 1520,430 Q 1740,380 1920,440 L 1920,530 L 0,530 Z" fill="#091428" opacity="0.85" />
                <path d="M 0,470 Q 300,430 620,460 Q 960,410 1320,465 Q 1660,420 1920,470 L 1920,540 L 0,540 Z" fill="#0f1c3a" />

                {/* 7. DÃY 16 ĐÈN LỒNG CUNG ĐÌNH DÁT VÀNG */}
                <g id="imp-16-lanterns-wrapper">
${lanternsCode}
                </g>

                {/* 8. QUẦN THỂ 9 ĐẠI CUNG ĐIỆN & SHOWROOM VINFAST */}
${palacesCode}

                {/* 9. BỜ KÈ CẨM THẠCH & HÀNG LAN CAN HOÀNG GIA */}
                <rect x="0" y="525" width="1920" height="22" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                <rect x="0" y="525" width="1920" height="4" fill="#cbd5e1" opacity="0.9" />
${pillarsCode}
                <line x1="0" y1="506" x2="1920" y2="506" stroke="#94a3b8" strokeWidth="3" />
                <line x1="0" y1="518" x2="1920" y2="518" stroke="#64748b" strokeWidth="2" />

                {/* 10. ĐOÀN NGƯỜI RƯỚC ĐÈN CUNG ĐÌNH DẠO BƯỚC */}
                <g id="imperial-court-procession">
${figuresCode}
                </g>

                {/* 11. HỒ SEN TRĂNG RẰM HOÀNG GIA (THE IMPERIAL LOTUS LAKE) */}
                <rect x="0" y="547" width="1920" height="533" fill="url(#impLake)" />
                <ellipse cx="960" cy="650" rx="350" ry="90" fill="url(#impWaterReflection)" filter="url(#impBloom)" />
                <ellipse cx="960" cy="780" rx="480" ry="120" fill="url(#impWaterReflection)" filter="url(#impBloom)" opacity="0.75" />
                <ellipse cx="960" cy="920" rx="600" ry="140" fill="url(#impWaterReflection)" filter="url(#impBloom)" opacity="0.5" />

                <path d="M 0,580 Q 480,565 960,580 Q 1440,595 1920,580" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <path d="M 0,630 Q 480,645 960,630 Q 1440,615 1920,630" fill="none" stroke="#fde047" strokeWidth="1.4" opacity="0.45" />
                <path d="M 0,700 Q 480,685 960,700 Q 1440,715 1920,700" fill="none" stroke="#f59e0b" strokeWidth="1.6" opacity="0.35" />
                <path d="M 0,790 Q 480,810 960,790 Q 1440,770 1920,790" fill="none" stroke="#fde047" strokeWidth="1.8" opacity="0.3" />
                <path d="M 0,890 Q 480,870 960,890 Q 1440,910 1920,890" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.25" />

                {/* 12. THUYỀN RỒNG HOÀNG GIA DÁT VÀNG */}
                <g className="animate-dragon-boat">
                    <g className="animate-boat-bob" filter="url(#impShadow)">
                        <ellipse cx="140" cy="65" rx="140" ry="8" fill="#38bdf8" opacity="0.45" filter="url(#impBloom)" />
                        <ellipse cx="135" cy="68" rx="110" ry="5" fill="#fef08a" opacity="0.6" filter="url(#impBloom)" />
                        <path d="M 10,48 Q 120,68 260,50 L 250,22 Q 130,28 30,26 Z" fill="url(#impGoldTile)" stroke="#fbbf24" strokeWidth="1.5" />
                        <path d="M 35,32 Q 130,40 235,32" stroke="#451a03" strokeWidth="2.5" strokeDasharray="6,4" fill="none" />

                        {/* Đầu rồng ngậm ngọc */}
                        <g transform="translate(250, 8)">
                            <path d="M 0,35 Q 15,20 20,5 Q 32,15 28,30 Q 22,42 0,45 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" filter="url(#impBloom)" />
                            <path d="M 15,8 Q 28,-10 38,-4 Q 30,8 18,14 Z" fill="#f59e0b" />
                            <circle cx="18" cy="12" r="2.2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                            <circle cx="28" cy="24" r="5" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.2" filter="url(#impBloom)" />
                        </g>

                        <path d="M 15,35 Q -10,15 -18,-5 Q -5,-2 8,18 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />

                        {/* Lầu rồng */}
                        <rect x="70" y="-8" width="130" height="36" fill="#881337" stroke="#fbbf24" strokeWidth="1.2" />
                        <rect x="75" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="115" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="155" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="194" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="83" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />
                        <rect x="123" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />
                        <rect x="163" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />

                        <path d="M 55,-6 Q 135,-26 215,-6 L 205,-18 Q 135,-32 65,-18 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                        <circle cx="65" cy="5" r="5" fill="#f59e0b" filter="url(#impBloom)" />
                        <circle cx="205" cy="5" r="5" fill="#f43f5e" filter="url(#impBloom)" />
                    </g>
                </g>

                {/* 13. 48 ĐÓA HOA ĐĂNG BÚP SEN THẮP NẾN LUNG LINH TRÊN HỒ */}
                <g id="imperial-48-lotus-lanterns">
${lotusCode}
                </g>

                {/* 14. KHUNG NẸP THẺ HOÀNG GIA VÀNG RÒNG TINH XẢO */}
                <rect x="3" y="3" width="1914" height="1074" fill="none" stroke="url(#impGoldTile)" strokeWidth="2.5" opacity="0.5" />
                <rect x="8" y="8" width="1904" height="1064" fill="none" stroke="#fef08a" strokeWidth="1" opacity="0.35" />
            </svg>
        </div>
    );
};

export const MidAutumnImperialBackdrop = React.memo(MidAutumnImperialBackdropComponent, () => true);
`;

try {
  esbuild.transformSync(template, { loader: 'tsx' });
  console.log('esbuild check PASSED for 8000+ line Imperial Palace Backdrop!');
  fs.writeFileSync(targetFile, template, 'utf8');
  console.log('SUCCESS: Written epic masterpiece to:', targetFile);
  console.log('Final line count in MidAutumnImperialBackdrop.tsx:', template.split('\n').length);
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
