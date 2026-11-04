const fs = require('fs');

function calcY(x) {
  if (x <= 885) {
    const u = 1 - x / 885;
    return +(78 - 52 * u * u).toFixed(1);
  } else {
    const u = 1 - (1920 - x) / 885;
    return +(78 - 52 * u * u).toFixed(1);
  }
}

// Read test_16_unique_lanterns.cjs to extract LANTERNS array
const testFile = fs.readFileSync('scripts/test_16_unique_lanterns.cjs', 'utf8');
const arrayStart = testFile.indexOf('const LANTERNS = [');
const arrayEnd = testFile.indexOf('];', arrayStart) + 2;
const arrayStr = testFile.substring(arrayStart, arrayEnd);

// Evaluate LANTERNS in local context
const LANTERNS = eval(`(() => { ${arrayStr}; return LANTERNS; })()`);

// Generate Fairy Lights JSX
let fairyLightsJsx = '';
const fairyXs = [];
for (let x = 30; x <= 870; x += 38) fairyXs.push(x);
for (let x = 1050; x <= 1890; x += 38) fairyXs.push(x);

fairyLightsJsx = fairyXs.map(x => {
  const y = calcY(x);
  return `                        <circle cx="${x}" cy="${(y - 1).toFixed(1)}" r="2.2" fill="#fef08a" opacity="0.95" filter="url(#maBloom)" />
                        <circle cx="${x}" cy="${(y - 1).toFixed(1)}" r="1" fill="#ffffff" />`;
}).join('\n');

// Generate 16 Lanterns JSX
let lanternsJsx = LANTERNS.map((c, idx) => {
  const yWire = calcY(c.x);
  const yTop = +(yWire + c.cordLen).toFixed(1);
  const body = c.render().trim();

  return `                    {/* Lồng Đèn #${idx + 1}: ${c.name} tại x=${c.x}, yWire=${yWire} -> yTop=${yTop} */}
                    <g className="${c.anim}" style={{ transformOrigin: '${c.x}px ${yWire}px' }}>
                        {/* Khoen móc kẹp trực tiếp vào dây giăng đèn */}
                        <circle cx="${c.x}" cy="${yWire}" r="4" fill="#f59e0b" stroke="#fef08a" strokeWidth="1.3" />
                        <circle cx="${c.x}" cy="${yWire}" r="1.8" fill="#451a03" />

                        {/* Dây lụa đỏ/vàng thả từ móc trên dây xuống tai đèn */}
                        <line x1="${c.x}" y1="${yWire}" x2="${c.x}" y2="${yTop}" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
                        <circle cx="${c.x}" cy="${(yWire + c.cordLen * 0.45).toFixed(1)}" r="2" fill="#ef4444" stroke="#fef08a" strokeWidth="0.8" />

                        {/* Khung thân lồng đèn 3D treo bên dưới */}
                        <g transform="translate(${c.x}, ${yTop})" filter="url(#maDropShadow)">
                            <circle cx="0" cy="0" r="3.2" fill="none" stroke="#fef08a" strokeWidth="1.3" />
${body}
                        </g>
                    </g>`;
}).join('\n\n');

const fullComponent = `import React from 'react';

interface MidAutumnSvgBackdropProps {
    mouseX?: number;
    mouseY?: number;
}

export const MidAutumnSvgBackdrop: React.FC<MidAutumnSvgBackdropProps> = ({ mouseX = 0, mouseY = 0 }) => {
    // Parallax chuyển động nhẹ nhàng theo con trỏ chuột
    const moonOffsetX = mouseX * 0.02;
    const moonOffsetY = mouseY * 0.02;
    const cloudOffsetX = mouseX * 0.04;

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
            <style>{\`
                @keyframes mid-autumn-moon-breathe {
                    0%, 100% { transform: scale(1); opacity: 0.95; filter: drop-shadow(0 0 40px rgba(254, 240, 138, 0.45)); }
                    50% { transform: scale(1.03); opacity: 1; filter: drop-shadow(0 0 65px rgba(245, 158, 11, 0.7)); }
                }
                .animate-moon-breathe {
                    animation: mid-autumn-moon-breathe 7s ease-in-out infinite;
                    transform-origin: 960px 80px;
                }

                @keyframes mid-autumn-cloud-drift-1 {
                    0% { transform: translateX(0px); }
                    50% { transform: translateX(35px); }
                    100% { transform: translateX(0px); }
                }
                .animate-cloud-drift-1 {
                    animation: mid-autumn-cloud-drift-1 22s ease-in-out infinite;
                }

                /* Keyframes đung đưa tự nhiên chuẩn từ móc treo trên dây */
                @keyframes lantern-wire-swing-1 { 0%, 100% { transform: rotate(2.4deg); } 50% { transform: rotate(-2.8deg); } }
                @keyframes lantern-wire-swing-2 { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(2.3deg); } }
                @keyframes lantern-wire-swing-3 { 0%, 100% { transform: rotate(2deg); } 50% { transform: rotate(-2.5deg); } }
                @keyframes lantern-wire-swing-4 { 0%, 100% { transform: rotate(-2.4deg); } 50% { transform: rotate(2.6deg); } }

                .sw-hook-1 { animation: lantern-wire-swing-1 5.8s ease-in-out infinite; }
                .sw-hook-2 { animation: lantern-wire-swing-2 6.4s ease-in-out infinite 0.5s; }
                .sw-hook-3 { animation: lantern-wire-swing-3 7.0s ease-in-out infinite 1.1s; }
                .sw-hook-4 { animation: lantern-wire-swing-4 6.2s ease-in-out infinite 0.3s; }
                .sw-hook-5 { animation: lantern-wire-swing-1 6.8s ease-in-out infinite 1.4s; }
                .sw-hook-6 { animation: lantern-wire-swing-2 5.9s ease-in-out infinite 0.8s; }
                .sw-hook-7 { animation: lantern-wire-swing-3 7.3s ease-in-out infinite 0.2s; }
                .sw-hook-8 { animation: lantern-wire-swing-4 6.6s ease-in-out infinite 0.9s; }

                @keyframes mid-autumn-candle-flicker {
                    0%, 100% { opacity: 0.82; transform: scale(1); }
                    25% { opacity: 0.98; transform: scale(1.08); }
                    50% { opacity: 0.75; transform: scale(0.96); }
                    75% { opacity: 1; transform: scale(1.04); }
                }
                .animate-candle-flicker {
                    animation: mid-autumn-candle-flicker 2.4s ease-in-out infinite;
                }

                @keyframes mid-autumn-star-twinkle {
                    0%, 100% { opacity: 0.25; transform: scale(0.75) rotate(0deg); }
                    50% { opacity: 1; transform: scale(1.25) rotate(45deg); filter: drop-shadow(0 0 6px #fff); }
                }
                .animate-star-1 { animation: mid-autumn-star-twinkle 3s ease-in-out infinite; }
                .animate-star-2 { animation: mid-autumn-star-twinkle 4.5s ease-in-out infinite 1s; }

                @keyframes garland-shimmer {
                    0%, 100% { opacity: 0.88; filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4)); }
                    50% { opacity: 1; filter: drop-shadow(0 0 8px rgba(254, 240, 138, 0.8)); }
                }
                .animate-garland-glow {
                    animation: garland-shimmer 4s ease-in-out infinite;
                }

                @keyframes mid-autumn-sky-lantern-float-1 {
                    0% { transform: translate(0, 110vh) scale(0.55); opacity: 0; }
                    15% { opacity: 0.85; }
                    85% { opacity: 0.85; }
                    100% { transform: translate(45px, -20vh) scale(0.95); opacity: 0; }
                }
                .animate-sky-lantern-1 { animation: mid-autumn-sky-lantern-float-1 26s linear infinite; }

                @keyframes mid-autumn-sky-lantern-float-2 {
                    0% { transform: translate(0, 110vh) scale(0.42); opacity: 0; }
                    20% { opacity: 0.75; }
                    80% { opacity: 0.75; }
                    100% { transform: translate(-35px, -20vh) scale(0.72); opacity: 0; }
                }
                .animate-sky-lantern-2 { animation: mid-autumn-sky-lantern-float-2 32s linear infinite 8s; }

                @keyframes mid-autumn-shooting-star {
                    0% { transform: translate(-50px, -50px) rotate(-35deg); opacity: 0; }
                    5% { opacity: 1; }
                    20% { transform: translate(450px, 320px) rotate(-35deg); opacity: 0; }
                    100% { transform: translate(450px, 320px) rotate(-35deg); opacity: 0; }
                }
                .animate-shooting-star-1 { animation: mid-autumn-shooting-star 14s linear infinite 3s; }
            \`}</style>

            <svg
                viewBox="0 0 1920 1080"
                preserveAspectRatio="xMidYMin slice"
                className="w-full h-full object-cover"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {/* BẦU TRỜI ĐÊM: Deep Obsidian Sapphire */}
                    <linearGradient id="maSky" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#020612" />
                        <stop offset="30%" stopColor="#061025" />
                        <stop offset="65%" stopColor="#0a1936" />
                        <stop offset="85%" stopColor="#0f162e" />
                        <stop offset="100%" stopColor="#040712" />
                    </linearGradient>

                    {/* HÀO QUANG MẶT TRĂNG KHỔNG LỒ */}
                    <radialGradient id="maMoonAura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.5" />
                        <stop offset="35%" stopColor="#fde047" stopOpacity="0.22" />
                        <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.07" />
                        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                    </radialGradient>

                    {/* VẦNG TRĂNG RẰM 3D HOÀNG KIM */}
                    <radialGradient id="maMoonBody" cx="36%" cy="32%" r="68%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="25%" stopColor="#fffbeb" />
                        <stop offset="55%" stopColor="#fef08a" />
                        <stop offset="82%" stopColor="#fcd34d" />
                        <stop offset="95%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                    </radialGradient>

                    {/* KIM LOẠI VÀNG 24K CUNG ĐÌNH */}
                    <linearGradient id="maGold24k" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="20%" stopColor="#fef08a" />
                        <stop offset="45%" stopColor="#f59e0b" />
                        <stop offset="70%" stopColor="#ffffff" />
                        <stop offset="85%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    {/* VÀNG CHAMPAGNE */}
                    <linearGradient id="maChampagne" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#fef9c3" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0.8" />
                    </linearGradient>

                    {/* DÂY GIĂNG HOÀNG KIM LỄ HỘI */}
                    <linearGradient id="maGarlandWire" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#d97706" />
                        <stop offset="30%" stopColor="#fef08a" />
                        <stop offset="70%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>

                    {/* GẤM ĐỎ RUBY 3D ĐA TẦNG ĐỘ SÂU */}
                    <radialGradient id="maRuby3D" cx="30%" cy="28%" r="72%">
                        <stop offset="0%" stopColor="#fee2e2" />
                        <stop offset="20%" stopColor="#f87171" />
                        <stop offset="50%" stopColor="#dc2626" />
                        <stop offset="80%" stopColor="#991b1b" />
                        <stop offset="100%" stopColor="#450a0a" />
                    </radialGradient>

                    {/* GẤM VÀNG HOÀNG CÚC 3D ĐA TẦNG ĐỘ SÂU */}
                    <radialGradient id="maAmber3D" cx="30%" cy="28%" r="72%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="25%" stopColor="#fef08a" />
                        <stop offset="55%" stopColor="#f59e0b" />
                        <stop offset="85%" stopColor="#b45309" />
                        <stop offset="100%" stopColor="#78350f" />
                    </radialGradient>

                    {/* ĐÈN CÁ CHÉP: ĐỎ CAM VẢY VÀNG */}
                    <radialGradient id="maCarpGoldRuby" cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="25%" stopColor="#fb923c" />
                        <stop offset="60%" stopColor="#ea580c" />
                        <stop offset="90%" stopColor="#b91c1c" />
                        <stop offset="100%" stopColor="#450a0a" />
                    </radialGradient>

                    {/* ĐÈN HOA SEN HỒNG */}
                    <radialGradient id="maLotusPink" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="30%" stopColor="#fbcfe8" />
                        <stop offset="70%" stopColor="#f43f5e" />
                        <stop offset="100%" stopColor="#9f1239" />
                    </radialGradient>

                    {/* ĐÀI SEN XANH NGỌC */}
                    <linearGradient id="maJadeGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="50%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#064e3b" />
                    </linearGradient>

                    {/* ĐÈN KÉO QUÂN HOÀNG CUNG */}
                    <linearGradient id="maKeoQuanPaper" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                        <stop offset="50%" stopColor="#fffbeb" stopOpacity="0.95" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
                    </linearGradient>

                    {/* NẾN SÁNG PHÁT QUANG */}
                    <radialGradient id="maFlame" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="35%" stopColor="#fef08a" />
                        <stop offset="75%" stopColor="#f97316" />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                    </radialGradient>

                    {/* FILTERS PHÁT QUANG */}
                    <filter id="maBloom" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur1" />
                        <feMerge>
                            <feMergeNode in="blur1" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="maSoftGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>

                    <filter id="maDropShadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.85" />
                    </filter>
                </defs>

                {/* 1. NỀN BẦU TRỜI ĐÊM */}
                <rect width="1920" height="1080" fill="url(#maSky)" />

                {/* 2. ÁNH MÂY BỤI TINH VÂN KHỔNG LỒ */}
                <ellipse cx="960" cy="110" rx="480" ry="220" fill="url(#maMoonAura)" opacity="0.65" />

                {/* 3. DẢI SAO BĂNG LƯỚT QUA BẦU TRỜI */}
                <g className="animate-shooting-star-1" opacity="0.75">
                    <line x1="550" y1="90" x2="420" y2="20" stroke="url(#maGold24k)" strokeWidth="2.2" strokeLinecap="round" filter="url(#maSoftGlow)" />
                </g>

                {/* 4. CÁC VÌ SAO LẤP LÁNH */}
                <g filter="url(#maSoftGlow)">
                    <g transform="translate(680, 45)" className="animate-star-1">
                        <path d="M 0,-7 Q 0,-1.5 1.5,0 Q 0,1.5 0,7 Q 0,1.5 -1.5,0 Q 0,-1.5 0,-7 Z" fill="#ffffff" />
                        <circle cx="0" cy="0" r="1.5" fill="#fef08a" />
                    </g>
                    <g transform="translate(1240, 42)" className="animate-star-2">
                        <path d="M 0,-7 Q 0,-1.5 1.5,0 Q 0,1.5 0,7 Q 0,1.5 -1.5,0 Q 0,-1.5 0,-7 Z" fill="#fef08a" />
                    </g>
                </g>

                {/* 5. VẦNG TRĂNG RẰM 3D HOÀNG GIA TRÊN ĐỈNH TRỜI (TRANG TRỌNG, THOÁNG ĐÃNG KHÔNG BỊ DÂY CẮT QUA) */}
                <g transform={\`translate(\${moonOffsetX}, \${moonOffsetY})\`}>
                    <g className="animate-moon-breathe">
                        <circle cx="960" cy="80" r="180" fill="url(#maMoonAura)" />
                        <circle cx="960" cy="80" r="105" fill="url(#maMoonAura)" />

                        <ellipse cx="960" cy="80" rx="140" ry="42" fill="none" stroke="url(#maGold24k)" strokeWidth="1.1" opacity="0.4" transform="rotate(-12, 960, 80)" />
                        <ellipse cx="960" cy="80" rx="155" ry="50" fill="none" stroke="url(#maChampagne)" strokeWidth="0.6" strokeDasharray="3,6" opacity="0.3" transform="rotate(-12, 960, 80)" />

                        <circle cx="960" cy="80" r="65" fill="url(#maMoonBody)" filter="url(#maDropShadow)" />

                        {/* Thỏ Ngọc và gốc đa mờ ảo trên mặt trăng */}
                        <path d="M 940,58 Q 965,38 982,48 Q 1005,72 982,95 Q 955,87 940,58 Z" fill="#92400e" opacity="0.16" />
                        <path d="M 922,86 Q 930,70 948,83 Q 950,105 932,107 Z" fill="#b45309" opacity="0.14" />
                        <circle cx="982" cy="102" r="9" fill="#92400e" opacity="0.12" />

                        <circle cx="972" cy="110" r="4" fill="#ffffff" opacity="0.85" />
                        <line x1="972" y1="110" x2="938" y2="65" stroke="#fffbeb" strokeWidth="0.8" opacity="0.4" />
                        <line x1="972" y1="110" x2="1005" y2="76" stroke="#fffbeb" strokeWidth="0.8" opacity="0.4" />
                        <line x1="972" y1="110" x2="926" y2="102" stroke="#fffbeb" strokeWidth="0.8" opacity="0.4" />

                        <circle cx="960" cy="80" r="63.5" fill="none" stroke="#ffffff" strokeWidth="1.8" opacity="0.5" />
                    </g>
                </g>

                {/* 6. MÂY GẤM CUNG ĐÌNH DÁT VÀNG 3D VẮT DƯỚI CHÂN TRĂNG */}
                <g transform={\`translate(\${cloudOffsetX}, 0)\`}>
                    <g className="animate-cloud-drift-1" opacity="0.7" filter="url(#maDropShadow)">
                        <path
                            d="M 800,118 C 825,95 870,90 892,110 C 920,82 970,88 988,118 C 1014,110 1045,130 1035,152 C 1022,170 990,178 962,172 C 935,180 862,180 834,160 C 802,154 786,135 800,118 Z"
                            fill="#09132b"
                            stroke="url(#maGold24k)"
                            strokeWidth="1.3"
                        />
                        <path d="M 855,142 C 872,130 896,133 901,150 C 903,161 888,170 875,165" fill="none" stroke="url(#maGold24k)" strokeWidth="1" strokeLinecap="round" />
                    </g>
                </g>

                {/* ============================================================================== */}
                {/* 7. DÂY CẦU GIĂNG ĐÈN HOÀNG KIM (UỐN LƯỢN CHUẨN XÁC, ANCHOR VÀO ĐÀI MÂY TRĂNG, KHÔNG CẮT TRĂNG) */}
                {/* ============================================================================== */}
                <g className="animate-garland-glow">
                    {/* Dây lụa vàng cánh cung bên trái: (0, 26) -> Q(440, 78) -> (885, 78) */}
                    <path
                        d="M 0,26 Q 440,78 885,78"
                        fill="none"
                        stroke="#451a03"
                        strokeWidth="4.2"
                        opacity="0.85"
                    />
                    <path
                        d="M 0,26 Q 440,78 885,78"
                        fill="none"
                        stroke="url(#maGarlandWire)"
                        strokeWidth="2.6"
                    />
                    <path
                        d="M 0,26 Q 440,78 885,78"
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="1"
                        strokeDasharray="4,6"
                    />

                    {/* Dây lụa vàng cánh cung bên phải: (1920, 26) -> Q(1480, 78) -> (1035, 78) */}
                    <path
                        d="M 1920,26 Q 1480,78 1035,78"
                        fill="none"
                        stroke="#451a03"
                        strokeWidth="4.2"
                        opacity="0.85"
                    />
                    <path
                        d="M 1920,26 Q 1480,78 1035,78"
                        fill="none"
                        stroke="url(#maGarlandWire)"
                        strokeWidth="2.6"
                    />
                    <path
                        d="M 1920,26 Q 1480,78 1035,78"
                        fill="none"
                        stroke="#fef08a"
                        strokeWidth="1"
                        strokeDasharray="4,6"
                    />

                    {/* Chốt Móc Khuyên Mây Hoàng Kim nối vào Đài Mây dưới Trăng */}
                    <circle cx="885" cy="78" r="6.5" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="885" cy="78" r="3" fill="#78350f" />
                    <circle cx="1035" cy="78" r="6.5" fill="url(#maGold24k)" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="1035" cy="78" r="3" fill="#78350f" />

                    {/* Chuỗi bóng đèn led ngọc dạ quang phát sáng dọc theo dây */}
${fairyLightsJsx}
                </g>

                {/* ============================================================================== */}
                {/* 8. BỘ SƯU TẬP 16 LỒNG ĐÈN ĐẶC SẮC HOÀN TOÀN KHÁC BIỆT TREO TRỰC TIẾP LÊN DÂY 3D  */}
                {/* ============================================================================== */}
                <g>
${lanternsJsx}
                </g>

                {/* 9. ĐÀN THIÊN ĐĂNG LƠ LỬNG BAY LÊN TRỜI XA */}
                <g className="animate-sky-lantern-1" style={{ transformOrigin: '520px 800px' }}>
                    <g transform="translate(520, 0)" filter="url(#maDropShadow)">
                        <ellipse cx="0" cy="18" rx="26" ry="30" fill="#f59e0b" opacity="0.3" filter="url(#maBloom)" />
                        <path d="M -15,0 L -20,38 L 20,38 L 15,0 Z" fill="#ea580c" stroke="url(#maGold24k)" strokeWidth="1" />
                        <ellipse cx="0" cy="38" rx="20" ry="6" fill="url(#maGold24k)" />
                        <circle cx="0" cy="28" r="4.5" fill="#ffffff" filter="url(#maSoftGlow)" />
                    </g>
                </g>

                <g className="animate-sky-lantern-2" style={{ transformOrigin: '1400px 800px' }}>
                    <g transform="translate(1400, 0)" filter="url(#maDropShadow)">
                        <ellipse cx="0" cy="16" rx="22" ry="26" fill="#f59e0b" opacity="0.28" filter="url(#maBloom)" />
                        <path d="M -12,0 L -17,32 L 17,32 L 12,0 Z" fill="#d97706" stroke="url(#maGold24k)" strokeWidth="0.8" />
                        <circle cx="0" cy="23" r="4" fill="#ffffff" filter="url(#maSoftGlow)" />
                    </g>
                </g>

                {/* 10. KHÓM HOA MỘC QUẾ & TRÚC QUÂN TỬ DÁT VÀNG VEN VIỀN DƯỚI */}
                <g opacity="0.35" stroke="url(#maGold24k)" strokeWidth="1.2" fill="none" strokeLinecap="round">
                    <path d="M 0,1080 L 120,950 L 220,980 L 310,910" />
                    <path d="M 120,950 Q 155,930 185,945 Q 150,955 120,950" fill="url(#maGold24k)" />
                    <path d="M 1920,1080 L 1780,960 L 1680,990 L 1590,930" />
                    <circle cx="1680" cy="990" r="3" fill="#fef08a" />
                </g>

                {/* 11. VIỀN NẸP THẺ HOÀNG GIA TINH XẢO */}
                <rect x="2" y="2" width="1916" height="1076" fill="none" stroke="url(#maGold24k)" strokeWidth="1.2" opacity="0.35" />
            </svg>
        </div>
    );
};
`;

fs.writeFileSync('components/login/MidAutumnSvgBackdrop.tsx', fullComponent, 'utf8');
console.log('Successfully written components/login/MidAutumnSvgBackdrop.tsx with 16 unique 3D lanterns! Total bytes:', fullComponent.length);
