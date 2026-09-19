const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// ==============================================================================
// 1. CLEAN UP PREVIOUS WHARF AND DOCKING ATTEMPTS
// ==============================================================================

// Remove previous CSS rules from style tag
const oldDockingCssMarker = '/* ============================================================================== */\n                /* HIỆU ỨNG THUYỀN CẬP BẾN, RỜI BẾN, NGƯỜI LÊN / XUỐNG THUYỀN BẾN SÔNG HOÀI       */';
const oldDockingCssEnd = '.animate-pier-ripple-2 {';
if (code.includes(oldDockingCssMarker)) {
  const startIdx = code.indexOf(oldDockingCssMarker);
  const endIdx = code.indexOf('}', code.indexOf(oldDockingCssEnd)) + 1;
  code = code.substring(0, startIdx) + code.substring(endIdx);
  console.log('Cleaned up previous docking CSS!');
}

// Remove previous wooden wharf SVG groups
const oldWharfMarker = '{/* ============================================================================== */}\n    {/* HỆ THỐNG BẾN ĐÒ SÔNG HOÀI: THUYỀN CẬP BẾN, RỜI BẾN, NGƯỜI LÊN / XUỐNG THUYỀN     */}';
const oldWharfEndMarker = '{/* ============================================================================== */}\n    {/* 12 CHIẾC THUYỀN GHE XUỒNG';
if (code.includes(oldWharfMarker) && code.includes(oldWharfEndMarker)) {
  const startIdx = code.indexOf(oldWharfMarker);
  const endIdx = code.indexOf(oldWharfEndMarker);
  code = code.substring(0, startIdx) + code.substring(endIdx);
  console.log('Cleaned up previous wooden wharves SVG!');
}

// ==============================================================================
// 2. NEW REALISTIC CSS KEYFRAMES: DOCK AT BẬC TAM CẤP & ROW ACROSS ENTIRE RIVER
// ==============================================================================

const tamCapDockingCss = `
                /* ============================================================================== */
                /* THUYỀN CẬP BẾN NGAY BẬC TAM CẤP, KHÁCH LÊN/XUỐNG VÀ THUYỀN CHÈO ĐI QUA SÔNG     */
                /* ============================================================================== */

                /* THUYỀN 1: TỪ THƯỢNG LƯU (TRÁI -> PHẢI), CẬP BẬC TAM CẤP 2, RỒI CHÈO QUA PHẢI */
                @keyframes hoian-boat-tam-cap-lr {
                    0% {
                        /* Xuất phát ngoài bờ sông bên trái */
                        transform: translate(-280px, 635px) rotate(0deg);
                    }
                    10% {
                        /* Lướt êm ngang qua trước Showroom VinFast */
                        transform: translate(180px, 615px) rotate(1deg);
                    }
                    17% {
                        /* Giảm tốc, xoay mũi áp sát bờ kè dẫn vào Bậc Tam Cấp 2 */
                        transform: translate(430px, 585px) rotate(3deg);
                    }
                    22% {
                        /* CẬP SÁT BẬC TAM CẤP 2 (x: 535, y: 572) */
                        transform: translate(535px, 572px) rotate(0deg);
                    }
                    /* 22% -> 48%: THUYỀN CẬP SÁT BẬC TAM CẤP, DẬP DỀNH THEO SÓNG CHO KHÁCH LÊN XUỐNG */
                    27% { transform: translate(535px, 570px) rotate(0.4deg); }
                    33% { transform: translate(535.5px, 573.5px) rotate(-0.4deg); }
                    39% { transform: translate(534.5px, 571px) rotate(0.3deg); }
                    45% { transform: translate(535px, 573px) rotate(-0.3deg); }
                    48% { transform: translate(535px, 572px) rotate(0deg); }

                    /* 49% -> 100%: CHÈO RỜI BẬC TAM CẤP, XUÔI DÒNG HỘI AN NHƯ MỌI THUYỀN KHÁC */
                    53% {
                        /* Cắm sào đẩy mạn thuyền tách khỏi bậc đá */
                        transform: translate(610px, 595px) rotate(-3.5deg);
                    }
                    63% {
                        /* Xuôi dòng giữa sông Hoài lấp lánh hoa đăng */
                        transform: translate(950px, 625px) rotate(-1deg);
                    }
                    76% {
                        /* Lướt qua trước Faifo và Tơ Lụa */
                        transform: translate(1420px, 635px) rotate(0.5deg);
                    }
                    88% {
                        /* Xuôi dần về phía hạ lưu bên phải */
                        transform: translate(1840px, 640px) rotate(0deg);
                    }
                    100% {
                        /* Chèo khuất hẳn ra ngoài màn hình bên phải */
                        transform: translate(2260px, 645px) rotate(0deg);
                    }
                }
                .animate-dock-tam-cap-1 {
                    animation: hoian-boat-tam-cap-lr 58s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
                }

                /* KHÁCH 1: TỪ THUYỀN BƯỚC LÊN TỪNG BẬC TAM CẤP RỒI DẠO PHỐ */
                @keyframes hoian-disembark-tam-cap-1 {
                    0%, 22% {
                        /* Ngồi trong khoang thuyền khi đang cập bến */
                        transform: translate(24px, 2px);
                        opacity: 1;
                    }
                    24% {
                        /* Đứng dậy ở mạn thuyền chuẩn bị bước lên */
                        transform: translate(14px, -4px);
                        opacity: 1;
                    }
                    28% {
                        /* Đặt chân lên bậc đá dưới cùng của tam cấp */
                        transform: translate(4px, -12px);
                        opacity: 1;
                    }
                    32% {
                        /* Bước lên bậc đá thứ 2 của tam cấp */
                        transform: translate(-6px, -22px);
                        opacity: 1;
                    }
                    36% {
                        /* Bước lên bậc đá trên cùng (mặt đường vỉa hè) */
                        transform: translate(-16px, -32px);
                        opacity: 1;
                    }
                    40% {
                        /* Bước ra vỉa hè phố cổ */
                        transform: translate(-28px, -42px);
                        opacity: 1;
                    }
                    44% {
                        /* Rảo bước hòa vào dòng người dạo phố */
                        transform: translate(-45px, -46px);
                        opacity: 0;
                    }
                    45%, 100% {
                        opacity: 0;
                        transform: translate(-45px, -46px);
                    }
                }
                .animate-disembark-1 {
                    animation: hoian-disembark-tam-cap-1 58s ease-in-out infinite;
                }

                /* KHÁCH 2: TỪ VỈA HÈ PHỐ CỔ BƯỚC XUỐNG BẬC TAM CẤP VÀO THUYỀN RỒI ĐI THEO THUYỀN */
                @keyframes hoian-embark-tam-cap-1 {
                    0%, 33% {
                        /* Chưa tới lượt, ẩn trên phố */
                        opacity: 0;
                        transform: translate(-38px, -44px);
                    }
                    34% {
                        /* Xuất hiện trên vỉa hè chuẩn bị xuống bậc tam cấp */
                        opacity: 1;
                        transform: translate(-38px, -44px);
                    }
                    37% {
                        /* Bước xuống bậc đá trên cùng */
                        transform: translate(-24px, -32px);
                        opacity: 1;
                    }
                    40% {
                        /* Bước xuống bậc đá thứ 2 */
                        transform: translate(-12px, -22px);
                        opacity: 1;
                    }
                    43% {
                        /* Bước xuống bậc đá mép nước */
                        transform: translate(0px, -12px);
                        opacity: 1;
                    }
                    46% {
                        /* Bước chân vào sàn thuyền */
                        transform: translate(14px, -2px);
                        opacity: 1;
                    }
                    49% {
                        /* Ngồi yên vị trong khoang thuyền */
                        transform: translate(28px, 2px);
                        opacity: 1;
                    }
                    50%, 100% {
                        /* TIẾP TỤC Ở LẠI TRÊN THUYỀN, CHÈO THEO THUYỀN SUỐT HÀNH TRÌNH QUA SÔNG */
                        opacity: 1;
                        transform: translate(28px, 2px);
                    }
                }
                .animate-embark-1 {
                    animation: hoian-embark-tam-cap-1 58s ease-in-out infinite;
                }

                /* BÁC LÁI ĐÒ BẬC TAM CẤP 1 */
                @keyframes hoian-boatman-tam-cap-1 {
                    0%, 18% {
                        /* Đang khom người chèo đò xuôi sông */
                        transform: rotate(-14deg);
                    }
                    20%, 23% {
                        /* Ghìm sào lái thuyền áp sát bậc tam cấp */
                        transform: rotate(6deg);
                    }
                    24%, 48% {
                        /* Đứng thẳng, giữ sào tì nhẹ vào bậc đá cho khách lên xuống an toàn */
                        transform: rotate(0deg);
                    }
                    49%, 52% {
                        /* Cắm sào đẩy mạnh mạn thuyền rời bậc đá */
                        transform: rotate(24deg);
                    }
                    53%, 100% {
                        /* Khua mái chèo đưa thuyền lướt sóng xuôi dòng */
                        transform: rotate(-14deg);
                    }
                }
                .animate-boatman-1 {
                    animation: hoian-boatman-tam-cap-1 58s ease-in-out infinite;
                    transform-origin: 0px 10px;
                }

                /* THUYỀN 2: TỪ HẠ LƯU (PHẢI -> TRÁI), CẬP BẬC TAM CẤP 4, RỒI CHÈO QUA TRÁI */
                @keyframes hoian-boat-tam-cap-rl {
                    0% {
                        /* Xuất phát ngoài mép sông bên phải */
                        transform: translate(2260px, 640px) scaleX(-1) rotate(0deg);
                    }
                    10% {
                        /* Lướt qua trước dãy nhà Faifo */
                        transform: translate(1860px, 620px) scaleX(-1) rotate(-1deg);
                    }
                    17% {
                        /* Giảm tốc, tiếp cận Bậc Tam Cấp 4 */
                        transform: translate(1680px, 585px) scaleX(-1) rotate(-3deg);
                    }
                    22% {
                        /* CẬP SÁT BẬC TAM CẤP 4 (x: 1595, y: 572) */
                        transform: translate(1595px, 572px) scaleX(-1) rotate(0deg);
                    }
                    /* 22% -> 48%: CẬP BẬC TAM CẤP 4 ĐÓN TRẢ KHÁCH */
                    27% { transform: translate(1595px, 570px) scaleX(-1) rotate(-0.4deg); }
                    33% { transform: translate(1594.5px, 573.5px) scaleX(-1) rotate(0.4deg); }
                    39% { transform: translate(1595.5px, 571px) scaleX(-1) rotate(-0.3deg); }
                    45% { transform: translate(1595px, 573px) scaleX(-1) rotate(0.3deg); }
                    48% { transform: translate(1595px, 572px) scaleX(-1) rotate(0deg); }

                    /* 49% -> 100%: CHÈO RỜI BẬC TAM CẤP 4, TIẾP TỤC CHÈO QUA TRÁI TOÀN BỘ MẶT SÔNG */
                    53% {
                        transform: translate(1520px, 595px) scaleX(-1) rotate(3.5deg);
                    }
                    63% {
                        transform: translate(1180px, 625px) scaleX(-1) rotate(1deg);
                    }
                    76% {
                        transform: translate(720px, 635px) scaleX(-1) rotate(-0.5deg);
                    }
                    88% {
                        transform: translate(280px, 640px) scaleX(-1) rotate(0deg);
                    }
                    100% {
                        transform: translate(-280px, 645px) scaleX(-1) rotate(0deg);
                    }
                }
                .animate-dock-tam-cap-2 {
                    animation: hoian-boat-tam-cap-rl 64s cubic-bezier(0.25, 0.1, 0.25, 1) infinite -18s;
                }
                .animate-disembark-2 {
                    animation: hoian-disembark-tam-cap-1 64s ease-in-out infinite -18s;
                }
                .animate-embark-2 {
                    animation: hoian-embark-tam-cap-1 64s ease-in-out infinite -18s;
                }
                .animate-boatman-2 {
                    animation: hoian-boatman-tam-cap-1 64s ease-in-out infinite -18s;
                    transform-origin: 0px 10px;
                }

                /* SÓNG NƯỚC RẼ MẠN KHI THUYỀN VÀO VÀ RỜI BẬC TAM CẤP */
                @keyframes hoian-tam-cap-ripple-1 {
                    0%, 20% { opacity: 0.15; transform: scale(0.85); }
                    22%, 26% { opacity: 0.9; transform: scale(1.15); filter: drop-shadow(0 0 5px rgba(254, 240, 138, 0.6)); }
                    49%, 54% { opacity: 0.95; transform: scale(1.25); filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.7)); }
                    60%, 100% { opacity: 0.1; transform: scale(0.8); }
                }
                .animate-tam-cap-ripple-1 {
                    animation: hoian-tam-cap-ripple-1 58s ease-in-out infinite;
                }
                .animate-tam-cap-ripple-2 {
                    animation: hoian-tam-cap-ripple-1 64s ease-in-out infinite -18s;
                }
`;

// Insert new CSS
code = code.replace('.animate-steam {', tamCapDockingCss.trim() + '\n\n                .animate-steam {');
console.log('Added tam cap docking & full-river sailing keyframes!');

// ==============================================================================
// 3. BUILD 2 DOCKING BOATS DIRECTLY AT BẬC TAM CẤP
// ==============================================================================

function buildBoatAtTamCap(boatId, index) {
  const isSecond = index === 2;
  const num = isSecond ? '2' : '1';
  const name = isSecond ? 'THUYỀN 2 CẬP BẬC TAM CẤP 4 (PHÍA ĐÔNG - FAIFO)' : 'THUYỀN 1 CẬP BẬC TAM CẤP 2 (PHÍA TÂY - TRÀ QUÁN)';
  
  // Passenger attire
  const disembarkCloth = isSecond ? '#c026d3' : '#db2777';
  const disembarkScarf = isSecond ? '#f0abfc' : '#fbcfe8';
  const embarkCloth = isSecond ? '#d97706' : '#0284c7';
  const lanternGlow = isSecond ? '#ef4444' : '#f59e0b';

  return `
    {/* ---------------------------------------------------------------------- */}
    {/* ${name} */}
    {/* ---------------------------------------------------------------------- */}
    <g id="${boatId}" filter="url(#dropShadow)">
        <g className="animate-dock-tam-cap-${num}">
            {/* Bóng thuyền in dưới mặt nước Sông Hoài */}
            <ellipse cx="48" cy="22" rx="64" ry="11" fill="#01040a" opacity="0.8" />
            
            {/* Vệt sóng rẽ nước sau đuôi và hai bên mạn */}
            <path d="M -24,14 Q -50,20 -82,24 M -24,20 Q -46,26 -72,32" stroke="#fef08a" strokeWidth="1.3" opacity="0.65" className="animate-boat-wake" fill="none" />
            
            {/* THÂN THUYỀN NAN GỖ HỘI AN (HULL) */}
            <path d="M -24,6 Q 12,24 50,26 Q 94,24 130,6 Q 94,36 50,38 Q 12,36 -24,6 Z" fill="url(#haBoatWood)" stroke="#1a0a02" strokeWidth="2" />
            <path d="M -24,6 Q 12,24 50,26 Q 94,24 130,6" fill="none" stroke="#ca8a04" strokeWidth="3" strokeLinecap="round" />
            <line x1="12" y1="20" x2="12" y2="31" stroke="#3b1d06" strokeWidth="1.6" />
            <line x1="36" y1="23" x2="36" y2="34" stroke="#3b1d06" strokeWidth="1.6" />
            <line x1="64" y1="23" x2="64" y2="34" stroke="#3b1d06" strokeWidth="1.6" />
            <line x1="90" y1="20" x2="90" y2="31" stroke="#3b1d06" strokeWidth="1.6" />

            {/* MUI VÒM NAN TRE TRUYỀN THỐNG CỔ TRUYỀN */}
            <path d="M 24,9 C 24,-15 82,-15 82,9 Z" fill="#451a03" stroke="#1c0e02" strokeWidth="1.6" />
            <path d="M 26,7 C 26,-12 80,-12 80,7 Z" fill="#78350f" opacity="0.92" />
            <path d="M 30,5 C 30,-9 76,-9 76,5" fill="none" stroke="#d97706" strokeWidth="1.2" opacity="0.75" />
            <line x1="40" y1="-8" x2="40" y2="9" stroke="#261001" strokeWidth="0.9" />
            <line x1="53" y1="-10" x2="53" y2="9" stroke="#261001" strokeWidth="0.9" />
            <line x1="66" y1="-8" x2="66" y2="9" stroke="#261001" strokeWidth="0.9" />
            {/* Ánh đèn vàng ấm áp hắt ra từ khoang thuyền */}
            <ellipse cx="53" cy="5" rx="18" ry="7" fill="#f59e0b" opacity="0.6" filter="url(#bloomSoft)" />

            {/* SÀO ĐÈN LỒNG HOA ĐĂNG TREO ĐẦU MŨI THUYỀN */}
            <path d="M 112,7 Q 124,-4 126,-15" fill="none" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
            <g transform="translate(126, -12)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="0" rx="6" ry="8.5" fill="${lanternGlow}" />
                <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
                <line x1="0" y1="8" x2="0" y2="15" stroke="#f59e0b" strokeWidth="1.2" />
                <ellipse cx="0" cy="38" rx="16" ry="5" fill="${lanternGlow}" opacity="0.55" filter="url(#bloomSoft)" />
            </g>

            {/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU ĐIỀU KHIỂN SÀO & MÁI CHÈO */}
            <g transform="translate(14, -2)">
                <g className="animate-boatman-${num}">
                    {/* Nón lá chóp nhọn truyền thống */}
                    <polygon points="-10,-7 10,-7 0,-19" fill="#fde047" stroke="#78350f" strokeWidth="0.9" />
                    <circle cx="0" cy="-6" r="3.6" fill="#fed7aa" />
                    {/* Thân áo nâu sồng chân quê */}
                    <path d="M -4,-2 L 4,-2 L 5,16 L -5,16 Z" fill="#3b1d06" />
                    {/* Cây sào tre dài chống đò & mái chèo */}
                    <line x1="4" y1="2" x2="-28" y2="38" stroke="#ca8a04" strokeWidth="2.4" strokeLinecap="round" />
                    <path d="M -28,38 L -38,48" stroke="#854d0e" strokeWidth="4.5" strokeLinecap="round" />
                </g>
            </g>

            {/* KHÁCH 1: BƯỚC TỪ LÒNG THUYỀN LÊN BẬC TAM CẤP RỒI LÊN VỈA HÈ PHỐ CỔ */}
            <g className="animate-disembark-${num}">
                <g>
                    {/* Cô gái áo dài gấm sen thướt tha */}
                    <circle cx="0" cy="-11" r="3.6" fill="#fed7aa" />
                    <circle cx="0" cy="-14" r="1.8" fill="#1c1917" />
                    <path d="M -4,-7 L 4,-7 L 5.5,19 L -5.5,19 Z" fill="${disembarkCloth}" stroke="#701a75" strokeWidth="0.6" />
                    <path d="M -3,-4 Q 0,3 3,-4" fill="none" stroke="${disembarkScarf}" strokeWidth="1.4" />
                    {/* Đèn hoa đăng nhỏ cầm trên tay */}
                    <g transform="translate(-6, 2)" filter="url(#bloomHigh)">
                        <ellipse cx="0" cy="2" rx="3.5" ry="2" fill="#f59e0b" />
                        <circle cx="0" cy="1" r="1.5" fill="#fef08a" />
                    </g>
                </g>
            </g>

            {/* KHÁCH 2: TỪ VỈA HÈ BƯỚC XUỐNG BẬC TAM CẤP VÀO THUYỀN RỒI ĐỒNG HÀNH TRÊN SÔNG */}
            <g className="animate-embark-${num}">
                <g>
                    {/* Vị khách áo dài thanh lịch */}
                    <circle cx="0" cy="-12" r="3.8" fill="#fed7aa" />
                    <circle cx="0" cy="-15" r="2" fill="#0f172a" />
                    <path d="M -4.5,-7 L 4.5,-7 L 5.5,19 L -5.5,19 Z" fill="${embarkCloth}" stroke="#0f172a" strokeWidth="0.6" />
                    {/* Quạt giấy hoặc hoa đăng cầm tay */}
                    <path d="M 3,-2 Q 7,3 9,8" fill="none" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
                    <g transform="translate(9, 8)" filter="url(#bloomHigh)">
                        <ellipse cx="0" cy="0" rx="3.5" ry="2" fill="#f43f5e" />
                        <circle cx="0" cy="0" r="1.5" fill="#fef08a" />
                    </g>
                </g>
            </g>

            {/* GỢN SÓNG VỖ MẠN BẬC ĐÁ KHI CẬP & RỜI BẾN TAM CẤP */}
            <g className="animate-tam-cap-ripple-${num}">
                <ellipse cx="10" cy="20" rx="26" ry="5" fill="none" stroke="#fef08a" strokeWidth="1.5" opacity="0.8" />
                <ellipse cx="10" cy="22" rx="40" ry="7" fill="none" stroke="#38bdf8" strokeWidth="1.1" opacity="0.6" />
            </g>
        </g>
    </g>
`;
}

// Generate the new tam cap docking boats
const newTamCapBoatsSvg = `
    {/* ============================================================================== */}
    {/* THUYỀN CẬP BẾN NGAY BẬC TAM CẤP, KHÁCH LÊN XUỐNG VÀ THUYỀN CHÈO ĐI QUA SÔNG     */}
    {/* ============================================================================== */}
    ${buildBoatAtTamCap('thuyen-tam-cap-tay', 1)}
    ${buildBoatAtTamCap('thuyen-tam-cap-dong', 2)}
`;

// Insert right before moving river boats
const movingBoatsMarker = '{/* ============================================================================== */}\n    {/* 12 CHIẾC THUYỀN GHE XUỒNG';
if (code.includes(movingBoatsMarker)) {
  code = code.replace(movingBoatsMarker, newTamCapBoatsSvg.trim() + '\n\n    ' + movingBoatsMarker);
  console.log('Successfully inserted Bậc Tam Cấp docking & continuous river sailing boats!');
} else {
  console.error('Could not find moving boats marker!');
  process.exit(1);
}

// Write file
fs.writeFileSync(backdropPath, code, 'utf8');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('SUCCESS: MidAutumnSvgBackdrop.tsx with tam cap docking compiled cleanly!');
} catch (e) {
  console.error('Compilation error:', e);
  process.exit(1);
}
