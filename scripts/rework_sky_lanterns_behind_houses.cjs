const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const backdropPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let code = fs.readFileSync(backdropPath, 'utf8');

// ==============================================================================
// 1. REMOVE OLD FOREGROUND SKY LANTERNS
// ==============================================================================
const oldLanternSectionMarker = '{/* 9. ĐÀN THIÊN ĐĂNG LƠ LỬNG BAY LÊN TRỜI XA */}';
const nextSectionMarker = '{/* 10. KHÓM HOA MỘC QUẾ & TRÚC QUÂN TỬ DÁT VÀNG VEN VIỀN DƯỚI */}';

if (code.includes(oldLanternSectionMarker) && code.includes(nextSectionMarker)) {
  const startIdx = code.indexOf(oldLanternSectionMarker);
  const endIdx = code.indexOf(nextSectionMarker);
  code = code.substring(0, startIdx) + code.substring(endIdx);
  console.log('Successfully removed old foreground sky lanterns!');
}

// Remove old sky lantern keyframes from CSS
const oldCssStart = '@keyframes mid-autumn-sky-lantern-float-1';
const oldCssEnd = '.animate-sky-lantern-2 { animation: mid-autumn-sky-lantern-float-2 32s linear infinite 8s; }';
if (code.includes(oldCssStart) && code.includes(oldCssEnd)) {
  const startIdx = code.indexOf(oldCssStart);
  const endIdx = code.indexOf(oldCssEnd) + oldCssEnd.length;
  code = code.substring(0, startIdx) + code.substring(endIdx);
  console.log('Successfully removed old sky lantern CSS keyframes!');
}

// ==============================================================================
// 2. ADD NEW REALISTIC SKY LANTERNS CSS (RELEASED FROM BEHIND HOUSES)
// ==============================================================================
const skyLanternsBehindHousesCss = `
                /* ============================================================================== */
                /* THIÊN ĐĂNG PHỐ CỔ THẢ TỪ PHÍA SAU LƯNG CÁC NGÔI NHÀ BAY LÊN TRỜI CAO             */
                /* ============================================================================== */

                /* Quỹ đạo 1: Thả từ sau lưng Hội Quán & Cao Lầu, dạt nhẹ sang phải (+35px) */
                @keyframes thien-dang-float-lane1 {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 0;
                    }
                    4% {
                        /* Vừa nhú lên khỏi mái ngói cổ */
                        opacity: 0.95;
                    }
                    30% {
                        transform: translate(14px, -140px) scale(0.88);
                        opacity: 0.92;
                    }
                    65% {
                        transform: translate(25px, -300px) scale(0.72);
                        opacity: 0.85;
                    }
                    90% {
                        transform: translate(35px, -420px) scale(0.55);
                        opacity: 0.65;
                    }
                    100% {
                        transform: translate(40px, -490px) scale(0.42);
                        opacity: 0;
                    }
                }

                /* Quỹ đạo 2: Thả từ sau lưng Trà Quán / VinFast, dạt nhẹ sang trái (-30px) */
                @keyframes thien-dang-float-lane2 {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 0;
                    }
                    4% {
                        opacity: 0.92;
                    }
                    35% {
                        transform: translate(-12px, -150px) scale(0.86);
                        opacity: 0.9;
                    }
                    70% {
                        transform: translate(-22px, -320px) scale(0.7);
                        opacity: 0.82;
                    }
                    92% {
                        transform: translate(-28px, -440px) scale(0.52);
                        opacity: 0.6;
                    }
                    100% {
                        transform: translate(-32px, -500px) scale(0.4);
                        opacity: 0;
                    }
                }

                /* Quỹ đạo 3: Thả từ sau Faifo / Tiệm Lồng Đèn, lượn sóng chữ S nhẹ nhàng */
                @keyframes thien-dang-float-lane3 {
                    0% {
                        transform: translate(0, 0) scale(1);
                        opacity: 0;
                    }
                    5% {
                        opacity: 0.95;
                    }
                    25% {
                        transform: translate(16px, -120px) scale(0.9);
                        opacity: 0.92;
                    }
                    50% {
                        transform: translate(-10px, -250px) scale(0.78);
                        opacity: 0.88;
                    }
                    75% {
                        transform: translate(20px, -380px) scale(0.65);
                        opacity: 0.75;
                    }
                    100% {
                        transform: translate(12px, -480px) scale(0.45);
                        opacity: 0;
                    }
                }

                /* Quỹ đạo 4: Thiên đăng xa tầm mắt, trôi rất chậm trên bầu trời cao */
                @keyframes thien-dang-float-distant {
                    0% {
                        transform: translate(0, 0) scale(0.75);
                        opacity: 0;
                    }
                    5% {
                        opacity: 0.8;
                    }
                    50% {
                        transform: translate(22px, -260px) scale(0.6);
                        opacity: 0.75;
                    }
                    100% {
                        transform: translate(45px, -470px) scale(0.35);
                        opacity: 0;
                    }
                }

                /* Lắc lư nhẹ nhàng của ngọn nến bên trong thiên đăng */
                @keyframes thien-dang-sway {
                    0%, 100% { transform: rotate(-2deg); }
                    50% { transform: rotate(2.5deg); }
                }

                .animate-thien-dang-sway {
                    animation: thien-dang-sway 4.5s ease-in-out infinite;
                }
`;

const styleClosingTag = '`}</style>';
if (code.includes(styleClosingTag) && !code.includes('thien-dang-float-lane1')) {
  code = code.replace(styleClosingTag, skyLanternsBehindHousesCss + '\n            ' + styleClosingTag);
  console.log('Successfully added sky lanterns CSS keyframes!');
}

// ==============================================================================
// 3. ADD GRADIENTS FOR THIÊN ĐĂNG TO <defs>
// ==============================================================================
const thienDangDefs = `
        {/* GRADIENTS CHO THIÊN ĐĂNG THẢ TỪ SAU LƯNG NHÀ PHỐ CỔ */}
        <radialGradient id="thienDangAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#fef08a" stopOpacity="0.75" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="thienDangPaper" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#fde047" stopOpacity="0.9" />
            <stop offset="85%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ea580c" stopOpacity="0.8" />
        </linearGradient>
        <linearGradient id="thienDangPaperPink" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#fb7185" stopOpacity="0.9" />
            <stop offset="85%" stopColor="#fef08a" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e11d48" stopOpacity="0.8" />
        </linearGradient>
`;

if (code.includes('</defs>') && !code.includes('thienDangAura')) {
  code = code.replace('</defs>', thienDangDefs + '\n    </defs>');
  console.log('Successfully added thien dang defs!');
}

// ==============================================================================
// 4. DESIGN SKY LANTERNS SVG RELEASED BEHIND HOUSES
// ==============================================================================
// Each lantern starts at y: 350-370 (behind house rooftops)
// Total 10 lanterns with negative delays so they are distributed across the sky immediately!

const skyLanternTemplate = (id, x, y, dur, delay, animClass, paperGrad = 'thienDangPaper', scale = 1.0) => `
        {/* Thiên đăng ${id}: Thả từ sau lưng nhà tại x=${x}, y=${y} */}
        <g transform="translate(${x}, ${y})" style={{ animation: '${animClass} ${dur}s linear infinite', animationDelay: '${delay}s' }}>
            <g className="animate-thien-dang-sway" transform="scale(${scale})" filter="url(#dropShadow)">
                {/* Vầng sáng ấm áp tỏa ra không gian */}
                <ellipse cx="0" cy="-6" rx="28" ry="34" fill="url(#thienDangAura)" filter="url(#bloomSoft)" />
                {/* Thân đèn lồng giấy dó lục giác truyền thống */}
                <path d="M -11,14 L -15,-16 L -7,-24 L 7,-24 L 15,-16 L 11,14 Z" fill="url(#${paperGrad})" stroke="#d97706" strokeWidth="0.8" />
                {/* Nan tre khung đèn */}
                <line x1="-7" y1="-24" x2="-6" y2="14" stroke="#b45309" strokeWidth="0.6" opacity="0.6" />
                <line x1="7" y1="-24" x2="6" y2="14" stroke="#b45309" strokeWidth="0.6" opacity="0.6" />
                <line x1="0" y1="-24" x2="0" y2="14" stroke="#f59e0b" strokeWidth="0.8" opacity="0.7" />
                {/* Vành miệng nan tre đáy đèn */}
                <ellipse cx="0" cy="14" rx="11" ry="3.2" fill="#78350f" stroke="#451a03" strokeWidth="0.8" />
                <ellipse cx="0" cy="14" rx="8" ry="2.2" fill="#ea580c" />
                {/* Ngọn nến lung linh rực sáng tâm đáy đèn */}
                <ellipse cx="0" cy="11" rx="3.5" ry="4.5" fill="#fef08a" opacity="0.95" />
                <circle cx="0" cy="11" r="2.2" fill="#ffffff" filter="url(#bloomSoft)" />
            </g>
        </g>`;

const skyLanternsGroupJsx = `    {/* ============================================================================== */}
    {/* ĐÀN THIÊN ĐĂNG THẢ TỪ PHÍA SAU LƯNG CÁC NGÔI NHÀ PHỐ CỔ BAY LÊN TRỜI CAO          */}
    {/* Vị trí lớp: Nằm PHÍA SAU các ngôi nhà & showroom, nhú lên tự nhiên từ rặng mái ngói */}
    {/* ============================================================================== */}
    <g id="hoian-sky-lanterns-behind-houses">
        {/* --- CỤM 1: THẢ TỪ SAU LƯNG SHOWROOM VINFAST & TRÀ QUÁN (TÂY PHỐ) --- */}
        ${skyLanternTemplate('1A', 220, 360, 26, -5, 'thien-dang-float-lane2', 'thienDangPaper', 1.05)}
        ${skyLanternTemplate('1B', 380, 355, 30, -16, 'thien-dang-float-lane1', 'thienDangPaperPink', 0.92)}
        ${skyLanternTemplate('1C', 300, 365, 34, -25, 'thien-dang-float-distant', 'thienDangPaper', 0.78)}

        {/* --- CỤM 2: THẢ TỪ SAU LƯNG HỘI QUÁN QUẢNG ĐÔNG & CAO LẦU (TRUNG TÂM PHỐ) --- */}
        ${skyLanternTemplate('2A', 860, 350, 28, -2, 'thien-dang-float-lane1', 'thienDangPaper', 1.1)}
        ${skyLanternTemplate('2B', 990, 355, 32, -12, 'thien-dang-float-lane3', 'thienDangPaperPink', 0.95)}
        ${skyLanternTemplate('2C', 760, 360, 25, -20, 'thien-dang-float-lane2', 'thienDangPaper', 0.85)}
        ${skyLanternTemplate('2D', 920, 365, 36, -8, 'thien-dang-float-distant', 'thienDangPaper', 0.72)}

        {/* --- CỤM 3: THẢ TỪ SAU LƯNG CÀ PHÊ FAIFO, TIỆM LỒNG ĐÈN & TƠ LỤA (ĐÔNG PHỐ) --- */}
        ${skyLanternTemplate('3A', 1480, 355, 27, -7, 'thien-dang-float-lane3', 'thienDangPaper', 1.05)}
        ${skyLanternTemplate('3B', 1650, 350, 31, -19, 'thien-dang-float-lane2', 'thienDangPaperPink', 0.98)}
        ${skyLanternTemplate('3C', 1780, 360, 33, -11, 'thien-dang-float-lane1', 'thienDangPaper', 0.88)}
        ${skyLanternTemplate('3D', 1580, 365, 38, -27, 'thien-dang-float-distant', 'thienDangPaper', 0.75)}
    </g>
`;

// ==============================================================================
// 5. INSERT BEHIND HOUSES (ALONGSIDE SURREAL FIREWORKS)
// ==============================================================================
const fireworksBehindHousesMarker = '<g id="hoian-surreal-fireworks-behind-houses">';

if (code.includes(fireworksBehindHousesMarker)) {
  code = code.replace(fireworksBehindHousesMarker, skyLanternsGroupJsx + '\n    ' + fireworksBehindHousesMarker);
  console.log('Successfully inserted sky lanterns behind houses (before fireworks)!');
} else {
  // fallback before showroom
  const showroomMarker = '{/* ============================================================================== */}\n    {/* VINFAST SHOWROOM THUẬN AN: PHONG CÁCH DI SẢN PHỐ CỔ HỘI AN ĐÊM RẰM TRUNG THU';
  if (code.includes(showroomMarker)) {
    code = code.replace(showroomMarker, skyLanternsGroupJsx + '\n\n    ' + showroomMarker);
    console.log('Successfully inserted sky lanterns behind houses (before showroom)!');
  } else {
    console.error('ERROR: Could not find insertion point behind houses!');
    process.exit(1);
  }
}

// ==============================================================================
// 6. VALIDATE TSX WITH ESBUILD AND WRITE
// ==============================================================================
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for sky lanterns behind houses!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('SUCCESS: Written sky lanterns behind houses to MidAutumnSvgBackdrop.tsx');
} catch (err) {
  console.error('esbuild verification FAILED:', err.message);
  process.exit(1);
}
