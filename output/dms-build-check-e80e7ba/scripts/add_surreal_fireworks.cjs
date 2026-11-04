const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const backdropPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let code = fs.readFileSync(backdropPath, 'utf8');

// ==============================================================================
// 1. DEFINE SURREAL FIREWORKS CSS KEYFRAMES (14s SEAMLESS CHOREOGRAPHY)
// ==============================================================================
const fireworksCss = `
                /* ============================================================================== */
                /* HIỆU ỨNG PHÁO HOA SIÊU THỰC (SURREAL FESTIVE FIREWORKS) PHÍA SAU PHỐ CỔ HỘI AN  */
                /* ============================================================================== */

                /* --- PHÁO HOA 1: HOÀNG KIM LIỄU SA (GOLDEN BROCADE WILLOW) - X: 240, Y: 135 --- */
                /* Chu kỳ: Bắn lên 0.0s -> Nổ 1.2s -> Rũ liễu rơi 1.3s - 5.0s -> Biến mất 5.2s */
                @keyframes fw-trail-1 {
                    0% { stroke-dashoffset: 260; opacity: 0; }
                    2% { opacity: 1; }
                    8% { stroke-dashoffset: 0; opacity: 1; }
                    9% { opacity: 0; stroke-dashoffset: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-trail-1 {
                    stroke-dasharray: 260;
                    animation: fw-trail-1 14s ease-out infinite;
                }
                @keyframes fw-flash-1 {
                    0%, 8% { transform: scale(0.1); opacity: 0; }
                    8.8% { transform: scale(1.6); opacity: 1; }
                    10% { transform: scale(2.2); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-flash-1 {
                    transform-origin: 240px 135px;
                    animation: fw-flash-1 14s ease-out infinite;
                }
                @keyframes fw-burst-1 {
                    0%, 8.5% { transform: scale(0.05) translateY(0); opacity: 0; }
                    9.5% { opacity: 1; }
                    15% { transform: scale(0.75) translateY(6px); opacity: 0.95; }
                    22% { transform: scale(1.05) translateY(24px); opacity: 0.85; }
                    28% { transform: scale(1.18) translateY(48px); opacity: 0.4; }
                    34% { transform: scale(1.25) translateY(72px); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-burst-1 {
                    transform-origin: 240px 135px;
                    animation: fw-burst-1 14s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }
                @keyframes fw-sparkle-1 {
                    0%, 9% { opacity: 0; }
                    11% { opacity: 1; }
                    13% { opacity: 0.4; }
                    16% { opacity: 1; }
                    19% { opacity: 0.3; }
                    22% { opacity: 0.9; }
                    26% { opacity: 0.2; }
                    30% { opacity: 0.7; }
                    34% { opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-sparkle-1 {
                    animation: fw-sparkle-1 14s ease-in-out infinite;
                }

                /* --- PHÁO HOA 2: ĐẠI ĐÓA MẪU ĐƠN THẤT SẮC (MAGENTA PEONY) - X: 880, Y: 110 --- */
                /* Chu kỳ: Bắn lên 3.5s (25%) -> Nổ 4.7s (33.5%) -> Rơi 4.8s - 8.5s (60%) */
                @keyframes fw-trail-2 {
                    0%, 23% { stroke-dashoffset: 280; opacity: 0; }
                    25% { opacity: 1; }
                    33% { stroke-dashoffset: 0; opacity: 1; }
                    34% { opacity: 0; stroke-dashoffset: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-trail-2 {
                    stroke-dasharray: 280;
                    animation: fw-trail-2 14s ease-out infinite;
                }
                @keyframes fw-flash-2 {
                    0%, 33% { transform: scale(0.1); opacity: 0; }
                    33.8% { transform: scale(1.8); opacity: 1; }
                    35% { transform: scale(2.4); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-flash-2 {
                    transform-origin: 880px 110px;
                    animation: fw-flash-2 14s ease-out infinite;
                }
                @keyframes fw-burst-2 {
                    0%, 33.5% { transform: scale(0.05) translateY(0); opacity: 0; }
                    34.5% { opacity: 1; }
                    41% { transform: scale(0.82) translateY(5px); opacity: 0.95; }
                    48% { transform: scale(1.1) translateY(20px); opacity: 0.85; }
                    54% { transform: scale(1.22) translateY(42px); opacity: 0.45; }
                    60% { transform: scale(1.28) translateY(65px); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-burst-2 {
                    transform-origin: 880px 110px;
                    animation: fw-burst-2 14s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }
                @keyframes fw-sparkle-2 {
                    0%, 34% { opacity: 0; }
                    36% { opacity: 1; }
                    39% { opacity: 0.35; }
                    42% { opacity: 0.95; }
                    45% { opacity: 0.4; }
                    49% { opacity: 0.85; }
                    53% { opacity: 0.3; }
                    57% { opacity: 0.6; }
                    60% { opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-sparkle-2 {
                    animation: fw-sparkle-2 14s ease-in-out infinite;
                }

                /* --- PHÁO HOA 3: NGỌC BÍCH DẠ QUANG (EMERALD & CYAN PALM) - X: 1600, Y: 130 --- */
                /* Chu kỳ: Bắn lên 7.0s (50%) -> Nổ 8.2s (58.5%) -> Tàn rơi 8.3s - 12.0s (85.7%) */
                @keyframes fw-trail-3 {
                    0%, 48% { stroke-dashoffset: 270; opacity: 0; }
                    50% { opacity: 1; }
                    58% { stroke-dashoffset: 0; opacity: 1; }
                    59% { opacity: 0; stroke-dashoffset: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-trail-3 {
                    stroke-dasharray: 270;
                    animation: fw-trail-3 14s ease-out infinite;
                }
                @keyframes fw-flash-3 {
                    0%, 58% { transform: scale(0.1); opacity: 0; }
                    58.8% { transform: scale(1.7); opacity: 1; }
                    60% { transform: scale(2.3); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-flash-3 {
                    transform-origin: 1600px 130px;
                    animation: fw-flash-3 14s ease-out infinite;
                }
                @keyframes fw-burst-3 {
                    0%, 58.5% { transform: scale(0.05) translateY(0); opacity: 0; }
                    59.5% { opacity: 1; }
                    66% { transform: scale(0.8) translateY(6px); opacity: 0.95; }
                    73% { transform: scale(1.08) translateY(22px); opacity: 0.82; }
                    79% { transform: scale(1.2) translateY(45px); opacity: 0.4; }
                    85% { transform: scale(1.26) translateY(68px); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-burst-3 {
                    transform-origin: 1600px 130px;
                    animation: fw-burst-3 14s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }
                @keyframes fw-sparkle-3 {
                    0%, 59% { opacity: 0; }
                    61% { opacity: 1; }
                    64% { opacity: 0.35; }
                    67% { opacity: 0.95; }
                    70% { opacity: 0.3; }
                    74% { opacity: 0.85; }
                    78% { opacity: 0.25; }
                    82% { opacity: 0.6; }
                    85% { opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-sparkle-3 {
                    animation: fw-sparkle-3 14s ease-in-out infinite;
                }

                /* --- PHÁO HOA 4: BÁCH HOA TINH TÚ THƯỢNG ĐỈNH (CELESTIAL CHRYSANTHEMUM) - X: 560, Y: 80 --- */
                /* Chu kỳ: Bắn lên 10.5s (75%) -> Nổ 11.7s (83.5%) -> Rơi lấp lánh đến 14.0s (100%) */
                @keyframes fw-trail-4 {
                    0%, 73% { stroke-dashoffset: 300; opacity: 0; }
                    75% { opacity: 1; }
                    83% { stroke-dashoffset: 0; opacity: 1; }
                    84% { opacity: 0; stroke-dashoffset: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-trail-4 {
                    stroke-dasharray: 300;
                    animation: fw-trail-4 14s ease-out infinite;
                }
                @keyframes fw-flash-4 {
                    0%, 83% { transform: scale(0.1); opacity: 0; }
                    83.8% { transform: scale(1.9); opacity: 1; }
                    85% { transform: scale(2.5); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-fw-flash-4 {
                    transform-origin: 560px 80px;
                    animation: fw-flash-4 14s ease-out infinite;
                }
                @keyframes fw-burst-4 {
                    0%, 83.5% { transform: scale(0.05) translateY(0); opacity: 0; }
                    84.5% { opacity: 1; }
                    90% { transform: scale(0.85) translateY(5px); opacity: 0.95; }
                    94% { transform: scale(1.12) translateY(18px); opacity: 0.85; }
                    98% { transform: scale(1.22) translateY(38px); opacity: 0.4; }
                    100% { transform: scale(1.28) translateY(55px); opacity: 0; }
                }
                .animate-fw-burst-4 {
                    transform-origin: 560px 80px;
                    animation: fw-burst-4 14s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }
                @keyframes fw-sparkle-4 {
                    0%, 84% { opacity: 0; }
                    86% { opacity: 1; }
                    89% { opacity: 0.35; }
                    92% { opacity: 0.95; }
                    94% { opacity: 0.4; }
                    96% { opacity: 0.85; }
                    98% { opacity: 0.3; }
                    100% { opacity: 0; }
                }
                .animate-fw-sparkle-4 {
                    animation: fw-sparkle-4 14s ease-in-out infinite;
                }
`;

// Insert CSS before style closing tag
const styleClosingTag = '`}</style>';
if (code.includes(styleClosingTag) && !code.includes('animate-fw-trail-1')) {
  code = code.replace(styleClosingTag, fireworksCss + '\n            ' + styleClosingTag);
  console.log('Successfully added surreal fireworks CSS keyframes!');
}

// ==============================================================================
// 2. DEFINE GRADIENTS IN <defs>
// ==============================================================================
const fireworkDefs = `
        {/* GRADIENTS CHO PHÁO HOA SIÊU THỰC ĐÊM RẰM */}
        <linearGradient id="fwTrailGold" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="80%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="fwTrailMagenta" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0" />
            <stop offset="40%" stopColor="#d946ef" stopOpacity="0.5" />
            <stop offset="85%" stopColor="#f472b6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="fwTrailCyan" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0" />
            <stop offset="40%" stopColor="#14b8a6" stopOpacity="0.5" />
            <stop offset="85%" stopColor="#67e8f9" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="fwTrailCoral" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ea580c" stopOpacity="0" />
            <stop offset="40%" stopColor="#f97316" stopOpacity="0.5" />
            <stop offset="85%" stopColor="#fde047" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
        </linearGradient>

        <radialGradient id="fwGlowGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#fef08a" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fwGlowMagenta" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#fbcfe8" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#e11d48" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#881337" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fwGlowCyan" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#cffafe" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#06b6d4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#0e7490" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fwGlowAmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="25%" stopColor="#ffedd5" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#f97316" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c2410c" stopOpacity="0" />
        </radialGradient>
`;

if (code.includes('</defs>') && !code.includes('fwTrailGold')) {
  code = code.replace('</defs>', fireworkDefs + '\n    </defs>');
  console.log('Successfully added firework gradient definitions to <defs>!');
}

// ==============================================================================
// 3. GENERATE ARTISTIC BURST SHELLS (PATH FILAMENTS & SPARKS)
// ==============================================================================

function generateGoldenWillow(cx, cy, count, radius) {
  let paths = '';
  let sparks = '';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const len = radius * (0.65 + 0.35 * Math.sin(i * 3.7));
    // Willow curves gracefully downward: add gravity bend
    const endX = cx + Math.cos(angle) * len;
    const gravity = Math.abs(Math.sin(angle)) * 26 + 18;
    const endY = cy + Math.sin(angle) * len + gravity;
    const cpX = cx + Math.cos(angle) * (len * 0.5);
    const cpY = cy + Math.sin(angle) * (len * 0.5) + (gravity * 0.2);

    const strokeColor = i % 4 === 0 ? '#ffffff' : (i % 2 === 0 ? '#fde047' : '#f59e0b');
    const width = i % 3 === 0 ? 1.6 : 1.1;

    paths += `        <path d="M ${cx},${cy} Q ${cpX.toFixed(1)},${cpY.toFixed(1)} ${endX.toFixed(1)},${endY.toFixed(1)}" stroke="${strokeColor}" strokeWidth="${width}" strokeLinecap="round" opacity="0.88" />\n`;

    // Outer twinkling stars & falling sparks
    sparks += `        <circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="${(i % 2 === 0 ? 2.2 : 1.5).toFixed(1)}" fill="${strokeColor}" filter="url(#bloomSoft)" />\n`;
    if (i % 2 === 0) {
      const dropX = endX + (i % 4 === 0 ? 4 : -4);
      const dropY = endY + 12 + (i % 3) * 6;
      sparks += `        <circle cx="${dropX.toFixed(1)}" cy="${dropY.toFixed(1)}" r="1.1" fill="#fef08a" opacity="0.75" />\n`;
    }
  }
  return { paths, sparks };
}

function generatePeonyShell(cx, cy, count, radius, colors) {
  let paths = '';
  let sparks = '';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const len = radius * (0.7 + 0.3 * Math.cos(i * 2.3));
    const endX = cx + Math.cos(angle) * len;
    const gravity = 8;
    const endY = cy + Math.sin(angle) * len + gravity;

    const col = colors[i % colors.length];
    const width = i % 2 === 0 ? 1.5 : 1.0;

    paths += `        <line x1="${cx}" y1="${cy}" x2="${endX.toFixed(1)}" y2="${endY.toFixed(1)}" stroke="${col}" strokeWidth="${width}" strokeLinecap="round" opacity="0.9" />\n`;
    sparks += `        <circle cx="${endX.toFixed(1)}" cy="${endY.toFixed(1)}" r="${(i % 3 === 0 ? 2.4 : 1.7).toFixed(1)}" fill="${col}" filter="url(#bloomSoft)" />\n`;

    // Mid-way starburst for double ring
    if (i % 2 === 0) {
      const midX = cx + Math.cos(angle) * (len * 0.45);
      const midY = cy + Math.sin(angle) * (len * 0.45);
      sparks += `        <circle cx="${midX.toFixed(1)}" cy="${midY.toFixed(1)}" r="1.3" fill="#ffffff" opacity="0.85" />\n`;
    }
  }
  return { paths, sparks };
}

// Generate the 4 firework models
const fw1 = generateGoldenWillow(240, 135, 36, 110);
const fw2 = generatePeonyShell(880, 110, 36, 105, ['#ffffff', '#f472b6', '#d946ef', '#fb7185', '#c084fc']);
const fw3 = generatePeonyShell(1600, 130, 32, 100, ['#ffffff', '#67e8f9', '#2dd4bf', '#10b981', '#fde047']);
const fw4 = generateGoldenWillow(560, 80, 32, 115);

// ==============================================================================
// 4. ASSEMBLE COMPLETE SURREAL FIREWORKS LAYER BEHIND HOUSES
// ==============================================================================
const surrealFireworksJsx = `    {/* ============================================================================== */}
    {/* DÀN PHÁO HOA SIÊU THỰC ĐÊM RẰM TRUNG THU PHÍA SAU CÁC DÃY NHÀ PHỐ CỔ HỘI AN        */}
    {/* Nằm phía sau rặng mái ngói âm dương, tạo hiệu ứng chiều sâu quang học 3D ngoạn mục */}
    {/* ============================================================================== */}
    <g id="hoian-surreal-fireworks-behind-houses">
        {/* --- 1. PHÁO HOA 1: HOÀNG KIM LIỄU SA (SAU SHOWROOM VINFAST & TRÀ QUÁN) --- */}
        <g id="fw-1-golden-willow">
            {/* Vệt phóng vút lên trời */}
            <path className="animate-fw-trail-1" d="M 240,360 Q 238,240 240,135" stroke="url(#fwTrailGold)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.9" />
            {/* Quả cầu lóe sáng bùng nổ khi chạm đỉnh */}
            <circle className="animate-fw-flash-1" cx="240" cy="135" r="42" fill="url(#fwGlowGold)" filter="url(#bloomSoft)" />
            {/* Chùm liễu rũ hoàng kim xòe bung & tàn lửa rơi */}
            <g className="animate-fw-burst-1">
${fw1.paths}
                <g className="animate-fw-sparkle-1">
${fw1.sparks}
                </g>
            </g>
        </g>

        {/* --- 2. PHÁO HOA 2: ĐẠI ĐÓA MẪU ĐƠN THẤT SẮC (SAU HỘI QUÁN QUẢNG ĐÔNG) --- */}
        <g id="fw-2-magenta-peony">
            {/* Vệt phóng vút lên trời */}
            <path className="animate-fw-trail-2" d="M 880,350 Q 878,230 880,110" stroke="url(#fwTrailMagenta)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.9" />
            {/* Quả cầu lóe sáng bùng nổ khi chạm đỉnh */}
            <circle className="animate-fw-flash-2" cx="880" cy="110" r="45" fill="url(#fwGlowMagenta)" filter="url(#bloomSoft)" />
            {/* Đóa hoa mẫu đơn xòe bung rực rỡ */}
            <g className="animate-fw-burst-2">
${fw2.paths}
                <g className="animate-fw-sparkle-2">
${fw2.sparks}
                </g>
            </g>
        </g>

        {/* --- 3. PHÁO HOA 3: NGỌC BÍCH DẠ QUANG (SAU CÀ PHÊ FAIFO & TIỆM LỒNG ĐÈN) --- */}
        <g id="fw-3-emerald-cyan-palm">
            {/* Vệt phóng vút lên trời */}
            <path className="animate-fw-trail-3" d="M 1600,355 Q 1602,240 1600,130" stroke="url(#fwTrailCyan)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.9" />
            {/* Quả cầu lóe sáng bùng nổ khi chạm đỉnh */}
            <circle className="animate-fw-flash-3" cx="1600" cy="130" r="40" fill="url(#fwGlowCyan)" filter="url(#bloomSoft)" />
            {/* Vòng tia ngọc bích tỏa sáng lấp lánh */}
            <g className="animate-fw-burst-3">
${fw3.paths}
                <g className="animate-fw-sparkle-3">
${fw3.sparks}
                </g>
            </g>
        </g>

        {/* --- 4. PHÁO HOA 4: BÁCH HOA TINH TÚ THƯỢNG ĐỈNH (TRỜI CAO TRUNG TÂM) --- */}
        <g id="fw-4-celestial-burst">
            {/* Vệt phóng vút lên trời cao */}
            <path className="animate-fw-trail-4" d="M 560,340 Q 562,210 560,80" stroke="url(#fwTrailCoral)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
            {/* Quả cầu lóe sáng bùng nổ khi chạm đỉnh */}
            <circle className="animate-fw-flash-4" cx="560" cy="80" r="48" fill="url(#fwGlowAmber)" filter="url(#bloomSoft)" />
            {/* Chùm tinh tú vàng kim bung nở thượng đỉnh */}
            <g className="animate-fw-burst-4">
${fw4.paths}
                <g className="animate-fw-sparkle-4">
${fw4.sparks}
                </g>
            </g>
        </g>
    </g>
`;

// ==============================================================================
// 5. INSERT BEHIND HOUSES (RIGHT BEFORE VINFAST SHOWROOM)
// ==============================================================================
const showroomMarker = '{/* ============================================================================== */}\n    {/* VINFAST SHOWROOM THUẬN AN: PHONG CÁCH DI SẢN PHỐ CỔ HỘI AN ĐÊM RẰM TRUNG THU';

if (code.includes(showroomMarker)) {
  code = code.replace(showroomMarker, surrealFireworksJsx + '\n\n    ' + showroomMarker);
  console.log('Successfully inserted surreal fireworks BEHIND houses!');
} else {
  console.error('ERROR: Could not find showroom marker to insert behind houses!');
  process.exit(1);
}

// ==============================================================================
// 6. VALIDATE TSX BUILD WITH ESBUILD
// ==============================================================================
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild verification PASSED for surreal fireworks!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('SUCCESS: Written surreal fireworks behind houses to MidAutumnSvgBackdrop.tsx');
} catch (err) {
  console.error('esbuild verification FAILED:', err.message);
  process.exit(1);
}
