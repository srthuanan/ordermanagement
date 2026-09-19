const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// ==============================================================================
// 1. CSS KEYFRAMES FOR DOCKING, DISEMBARKING, EMBARKING, BOATMAN & WAVES
// ==============================================================================
const dockingCss = `
                /* ============================================================================== */
                /* HIỆU ỨNG THUYỀN CẬP BẾN, RỜI BẾN, NGƯỜI LÊN / XUỐNG THUYỀN BẾN SÔNG HOÀI       */
                /* ============================================================================== */

                /* 1. THUYỀN TIẾN VÀO CẬP BẾN, ĐỖ ĐÓN KHÁCH & RỜI BẾN (CHU KỲ 26S) */
                @keyframes hoian-boat-docking-cycle {
                    0% {
                        /* Đang từ xa ngoài sông tiến về phía bến */
                        transform: translate(-150px, 50px) rotate(8deg);
                        opacity: 0.85;
                    }
                    14% {
                        /* Giảm tốc, xoay mũi tiếp cận mép cầu tàu bến đá */
                        transform: translate(-28px, 10px) rotate(3deg);
                        opacity: 1;
                    }
                    20% {
                        /* Chạm nhẹ vào mép cầu tàu, đỗ sát bến */
                        transform: translate(0px, 0px) rotate(0deg);
                    }
                    /* 20% -> 72%: ĐỖ YÊN TẠI BẾN ĐÓN TRẢ KHÁCH (NHẤP NHÔ NHẸ THEO SÓNG) */
                    28% { transform: translate(0.8px, -2.5px) rotate(0.6deg); }
                    38% { transform: translate(-0.8px, 1.8px) rotate(-0.5deg); }
                    48% { transform: translate(0.5px, -2.2px) rotate(0.4deg); }
                    58% { transform: translate(-0.6px, 1.5px) rotate(-0.6deg); }
                    68% { transform: translate(0.8px, -1.8px) rotate(0.5deg); }
                    72% { transform: translate(0px, 0px) rotate(0deg); }
                    
                    /* 73% -> 100%: RỜI BẾN XUẤT PHÁT RA KHƠI */
                    76% {
                        /* Bác lái đò cắm sào đẩy dạt mạn thuyền ra xa bến */
                        transform: translate(16px, 8px) rotate(-3.5deg);
                    }
                    84% {
                        /* Xoay mũi thuyền xuôi theo dòng nước */
                        transform: translate(65px, 28px) rotate(-7deg);
                    }
                    93% {
                        /* Lướt êm ra giữa lòng sông Hoài lấp lánh hoa đăng */
                        transform: translate(150px, 62px) rotate(-9deg);
                        opacity: 1;
                    }
                    100% {
                        /* Hòa vào làn thuyền xuôi dòng */
                        transform: translate(240px, 95px) rotate(-10deg);
                        opacity: 0;
                    }
                }
                .animate-docking-boat-1 {
                    animation: hoian-boat-docking-cycle 26s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
                }
                .animate-docking-boat-2 {
                    animation: hoian-boat-docking-cycle 26s cubic-bezier(0.4, 0.0, 0.2, 1) infinite -13s;
                }

                /* 2. KHÁCH TỪ DƯỚI THUYỀN BƯỚC LÊN BỜ (DISEMBARKING) */
                @keyframes hoian-passenger-disembark {
                    0%, 18% {
                        /* Ngồi yên trong lòng thuyền khi đang cập bến */
                        transform: translate(0px, 0px);
                        opacity: 1;
                    }
                    21% {
                        /* Đứng dậy ở mạn thuyền chuẩn bị bước lên */
                        transform: translate(-4px, -6px);
                        opacity: 1;
                    }
                    26% {
                        /* Đặt chân thứ nhất lên sàn cầu tàu gỗ */
                        transform: translate(-18px, -15px);
                        opacity: 1;
                    }
                    31% {
                        /* Bước hẳn lên sàn cầu tàu gỗ */
                        transform: translate(-34px, -24px);
                        opacity: 1;
                    }
                    36% {
                        /* Bước lên bậc thềm đá bến sông */
                        transform: translate(-52px, -34px);
                        opacity: 1;
                    }
                    41% {
                        /* Bước lên mặt đường phố cổ */
                        transform: translate(-72px, -42px);
                        opacity: 1;
                    }
                    45% {
                        /* Rảo bước hòa vào dòng người dạo phố Hội An */
                        transform: translate(-94px, -46px);
                        opacity: 0;
                    }
                    46%, 100% {
                        opacity: 0;
                        transform: translate(-94px, -46px);
                    }
                }
                .animate-passenger-disembark-1 {
                    animation: hoian-passenger-disembark 26s ease-in-out infinite;
                }
                .animate-passenger-disembark-2 {
                    animation: hoian-passenger-disembark 26s ease-in-out infinite -13s;
                }

                /* 3. KHÁCH TỪ TRÊN BỜ BƯỚC XUỐNG THUYỀN (EMBARKING) */
                @keyframes hoian-passenger-embark {
                    0%, 46% {
                        /* Chưa tới lượt, ẩn trên vỉa hè phố */
                        opacity: 0;
                        transform: translate(-90px, -46px);
                    }
                    48% {
                        /* Xuất hiện trên thềm đá, bắt đầu bước xuống bến */
                        opacity: 1;
                        transform: translate(-90px, -46px);
                    }
                    53% {
                        /* Bước xuống bậc thềm đá */
                        transform: translate(-70px, -36px);
                        opacity: 1;
                    }
                    58% {
                        /* Đi dọc trên sàn cầu tàu gỗ */
                        transform: translate(-48px, -24px);
                        opacity: 1;
                    }
                    63% {
                        /* Vịn tay vịn bước vào mép mạn thuyền */
                        transform: translate(-24px, -14px);
                        opacity: 1;
                    }
                    68% {
                        /* Đặt chân vào lòng thuyền */
                        transform: translate(-6px, -4px);
                        opacity: 1;
                    }
                    72% {
                        /* Ngồi yên vị trong khoang thuyền */
                        transform: translate(8px, 2px);
                        opacity: 1;
                    }
                    73%, 94% {
                        /* Ngồi thưởng ngoạn trên thuyền khi thuyền rời bến */
                        transform: translate(8px, 2px);
                        opacity: 1;
                    }
                    98%, 100% {
                        /* Mờ dần theo thuyền khi thuyền trôi xa */
                        opacity: 0;
                        transform: translate(8px, 2px);
                    }
                }
                .animate-passenger-embark-1 {
                    animation: hoian-passenger-embark 26s ease-in-out infinite;
                }
                .animate-passenger-embark-2 {
                    animation: hoian-passenger-embark 26s ease-in-out infinite -13s;
                }

                /* 4. ĐỘNG TÁC BÁC LÁI ĐÒ (CHỐNG SÀO, GHÌM ĐÒ, ĐẨY THUYỀN XUẤT BẾN) */
                @keyframes hoian-dock-boatman {
                    0%, 16% {
                        /* Đang khom người chèo đò tiến vào bến */
                        transform: rotate(-12deg);
                    }
                    18%, 22% {
                        /* Ghìm sào neo đò vào cọc bến */
                        transform: rotate(8deg);
                    }
                    23%, 71% {
                        /* Đứng thẳng giữ đò cho khách lên xuống an toàn, tay vẫy chào */
                        transform: rotate(0deg);
                    }
                    72%, 77% {
                        /* Cắm sào đẩy mạnh mạn thuyền rời bến */
                        transform: rotate(22deg);
                    }
                    82%, 100% {
                        /* Khua mái chèo đưa thuyền lướt sóng ra sông */
                        transform: rotate(-14deg);
                    }
                }
                .animate-dock-boatman-1 {
                    animation: hoian-dock-boatman 26s ease-in-out infinite;
                    transform-origin: 0px 10px;
                }
                .animate-dock-boatman-2 {
                    animation: hoian-dock-boatman 26s ease-in-out infinite -13s;
                    transform-origin: 0px 10px;
                }

                /* 5. GỢN SÓNG VỖ MẠN CẦU TÀU KHI CẬP & RỜI BẾN */
                @keyframes hoian-pier-ripple {
                    0%, 15% { opacity: 0.2; transform: scale(0.85); }
                    20%, 30% { opacity: 0.85; transform: scale(1.15); filter: drop-shadow(0 0 5px rgba(254, 240, 138, 0.6)); }
                    74%, 82% { opacity: 0.95; transform: scale(1.25); filter: drop-shadow(0 0 7px rgba(56, 189, 248, 0.7)); }
                    90%, 100% { opacity: 0.2; transform: scale(0.9); }
                }
                .animate-pier-ripple-1 {
                    animation: hoian-pier-ripple 26s ease-in-out infinite;
                }
                .animate-pier-ripple-2 {
                    animation: hoian-pier-ripple 26s ease-in-out infinite -13s;
                }
`;

// Inject into styles
if (!code.includes('hoian-boat-docking-cycle')) {
  code = code.replace('.animate-steam {', dockingCss.trim() + '\n\n                .animate-steam {');
  console.log('Added docking and boarding keyframes to CSS!');
}

// ==============================================================================
// 2. BUILD WHARVES, DOCKING BOATS & BOARDING/DISEMBARKING PASSENGERS
// ==============================================================================

function buildWharfAndDockingBoat(wharfId, pierX, pierY, isEast = false) {
  const suffix = isEast ? '2' : '1';
  const name = isEast ? 'BẾN ĐÔNG (BẠCH ĐẰNG - FAIFO)' : 'BẾN TÂY (VỌNG NGUYỆT - TRÀ QUÁN)';
  
  // Passenger colors:
  // Disembarking passenger: graceful pink/ruby ao dai
  // Embarking passenger: regal gold/blue ao dai
  return `
    {/* ---------------------------------------------------------------------- */}
    {/* ${name} - BẾN ĐÒ SÔNG HOÀI: CẦU TÀU, THUYỀN CẬP/RỜI BẾN & KHÁCH LÊN XUỐNG */}
    {/* ---------------------------------------------------------------------- */}
    <g id="${wharfId}" filter="url(#dropShadow)">
        {/* CẦU TÀU GỖ BẮC TỪ BỜ KÈ RA MẶT NƯỚC */}
        <g transform="translate(${pierX}, ${pierY})">
            {/* Cọc gỗ lim cắm sâu lòng sông */}
            <rect x="-42" y="10" width="8" height="34" rx="1.5" fill="#1c0a02" stroke="#100501" strokeWidth="0.8" />
            <rect x="18" y="10" width="8" height="34" rx="1.5" fill="#1c0a02" stroke="#100501" strokeWidth="0.8" />
            <rect x="-14" y="14" width="7" height="30" rx="1.5" fill="#2d1203" />
            
            {/* Rêu phong bám chân cọc ven nước */}
            <ellipse cx="-38" cy="38" rx="6" ry="4" fill="#14532d" opacity="0.85" />
            <ellipse cx="22" cy="38" rx="6" ry="4" fill="#14532d" opacity="0.85" />

            {/* Khung dầm gỗ chịu lực */}
            <path d="M -46,12 L 28,12 L 24,18 L -42,18 Z" fill="#2b1104" stroke="#140601" strokeWidth="1" />
            
            {/* Sàn ván gỗ lát cầu tàu đón khách */}
            <rect x="-48" y="4" width="78" height="10" rx="2" fill="url(#haBoatWood)" stroke="#1a0902" strokeWidth="1.2" />
            <line x1="-34" y1="4" x2="-34" y2="14" stroke="#240e02" strokeWidth="1.2" />
            <line x1="-18" y1="4" x2="-18" y2="14" stroke="#240e02" strokeWidth="1.2" />
            <line x1="-2" y1="4" x2="-2" y2="14" stroke="#240e02" strokeWidth="1.2" />
            <line x1="14" y1="4" x2="14" y2="14" stroke="#240e02" strokeWidth="1.2" />

            {/* Cọc bến buộc dây thừng thuyền (Mooring Bollard) */}
            <rect x="20" y="-8" width="8" height="15" rx="2" fill="#78350f" stroke="#2b1104" strokeWidth="1.2" />
            <ellipse cx="24" cy="-8" rx="4" ry="2.2" fill="#d97706" />
            {/* Cuộn dây thừng bện cuốn quanh cọc */}
            <ellipse cx="24" cy="-1" rx="6" ry="3.5" fill="none" stroke="#d97706" strokeWidth="2" strokeDasharray="3,1.5" />
            <path d="M 24,2 Q 32,10 40,18" fill="none" stroke="#d97706" strokeWidth="1.8" />

            {/* Trụ đèn lồng cổ dẫn lối ở đầu bến */}
            <rect x="-46" y="-22" width="4" height="28" fill="#451a03" />
            <g transform="translate(-44, -20)" filter="url(#bloomHigh)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#d97706" strokeWidth="1" />
                <ellipse cx="0" cy="8" rx="5.5" ry="7.5" fill="#f59e0b" />
                <circle cx="0" cy="7" r="2" fill="#ffffff" />
                <line x1="0" y1="15" x2="0" y2="22" stroke="#dc2626" strokeWidth="1.2" />
                <ellipse cx="0" cy="40" rx="14" ry="4.5" fill="#f59e0b" opacity="0.5" filter="url(#bloomSoft)" />
            </g>

            {/* Bậc thềm đá nối từ mặt phố xuống sàn cầu tàu */}
            <polygon points="-65,-12 -45,-12 -48,4 -68,4" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
            <line x1="-63" y1="-6" x2="-45" y2="-6" stroke="#64748b" strokeWidth="1.2" />
            <polygon points="-85,-24 -65,-24 -68,-12 -88,-12" fill="#334155" stroke="#0f172a" strokeWidth="1" />
            <line x1="-83" y1="-18" x2="-65" y2="-18" stroke="#94a3b8" strokeWidth="1.2" />

            {/* Biển gỗ bến đò: "BẾN ĐÒ SÔNG HOÀI" */}
            <rect x="-62" y="-34" width="44" height="11" rx="2" fill="#2d1203" stroke="#ca8a04" strokeWidth="0.8" />
            <text x="-40" y="-26.5" fill="#fef08a" fontSize="4.2" fontWeight="bold" textAnchor="middle" fontFamily="serif">BẾN ĐÒ SÔNG HOÀI</text>

            {/* Gợn sóng vỗ nhẹ vào mạn cầu tàu khi thuyền cập/rời bến */}
            <g className="animate-pier-ripple-${suffix}">
                <ellipse cx="45" cy="24" rx="22" ry="4" fill="none" stroke="#fef08a" strokeWidth="1.4" opacity="0.8" />
                <ellipse cx="45" cy="26" rx="34" ry="5.5" fill="none" stroke="#38bdf8" strokeWidth="1" opacity="0.6" />
            </g>
        </g>

        {/* THUYỀN HỘI AN ĐANG THỰC HIỆN CHU KỲ CẬP BẾN, ĐỖ ĐÓN KHÁCH & RỜI BẾN */}
        <g transform="translate(${pierX + 54}, ${pierY + 22})">
            <g className="animate-docking-boat-${suffix}">
                {/* Bóng thuyền in trên mặt nước Sông Hoài */}
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
                    <ellipse cx="0" cy="0" rx="6" ry="8.5" fill="#ef4444" />
                    <circle cx="0" cy="0" r="2.2" fill="#ffffff" />
                    <line x1="0" y1="8" x2="0" y2="15" stroke="#f59e0b" strokeWidth="1.2" />
                    <ellipse cx="0" cy="38" rx="16" ry="5" fill="#ef4444" opacity="0.55" filter="url(#bloomSoft)" />
                </g>

                {/* BÁC LÁI ĐÒ NÓN LÁ ÁO NÂU ĐIỀU KHIỂN SÀO & MÁI CHÈO */}
                <g transform="translate(14, -2)">
                    <g className="animate-dock-boatman-${suffix}">
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

                {/* KHÁCH 1 (DISEMBARKING): BƯỚC TỪ LÒNG THUYỀN LÊN CẦU TÀU VÀ LÊN PHỐ CỔ */}
                <g className="animate-passenger-disembark-${suffix}">
                    <g transform="translate(38, 2)">
                        {/* Cô gái áo dài gấm hồng thướt tha */}
                        <circle cx="0" cy="-11" r="3.6" fill="#fed7aa" />
                        <circle cx="0" cy="-14" r="1.8" fill="#1c1917" />
                        <path d="M -4,-7 L 4,-7 L 5.5,19 L -5.5,19 Z" fill="#db2777" stroke="#9d174d" strokeWidth="0.6" />
                        {/* Khăn voan lụa quàng vai duyên dáng */}
                        <path d="M -3,-4 Q 0,3 3,-4" fill="none" stroke="#fbcfe8" strokeWidth="1.4" />
                        {/* Đèn hoa đăng nhỏ cầm trên tay */}
                        <g transform="translate(-6, 2)" filter="url(#bloomHigh)">
                            <ellipse cx="0" cy="2" rx="3.5" ry="2" fill="#f59e0b" />
                            <circle cx="0" cy="1" r="1.5" fill="#fef08a" />
                        </g>
                    </g>
                </g>

                {/* KHÁCH 2 (EMBARKING): TỪ TRÊN PHỐ CỔ BƯỚC XUỐNG CẦU TÀU VÀ LÊN THUYỀN */}
                <g className="animate-passenger-embark-${suffix}">
                    <g transform="translate(56, 2)">
                        {/* Chàng trai áo dài cách tân màu xanh hoàng gia */}
                        <circle cx="0" cy="-12" r="3.8" fill="#fed7aa" />
                        <circle cx="0" cy="-15" r="2" fill="#0f172a" />
                        <path d="M -4.5,-7 L 4.5,-7 L 5.5,19 L -5.5,19 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="0.6" />
                        {/* Quạt giấy hoặc hoa đăng cầm tay */}
                        <path d="M 3,-2 Q 7,3 9,8" fill="none" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
                        <g transform="translate(9, 8)" filter="url(#bloomHigh)">
                            <ellipse cx="0" cy="0" rx="3.5" ry="2" fill="#f43f5e" />
                            <circle cx="0" cy="0" r="1.5" fill="#fef08a" />
                        </g>
                    </g>
                </g>
            </g>
        </g>
    </g>
`;
}

// Generate Western Wharf (at x: 380, y: 546) and Eastern Wharf (at x: 1530, y: 546)
const wharvesSvg = `
    {/* ============================================================================== */}
    {/* HỆ THỐNG BẾN ĐÒ SÔNG HOÀI: THUYỀN CẬP BẾN, RỜI BẾN, NGƯỜI LÊN / XUỐNG THUYỀN     */}
    {/* ============================================================================== */}
    ${buildWharfAndDockingBoat('ben-do-song-hoai-tay', 380, 546, false)}
    ${buildWharfAndDockingBoat('ben-do-song-hoai-dong', 1530, 546, true)}
`;

// Insert wharvesSvg right before moving river boats
const movingBoatsMarker = '{/* ============================================================================== */}\n    {/* 12 CHIẾC THUYỀN GHE XUỒNG';
if (code.includes(movingBoatsMarker)) {
  code = code.replace(movingBoatsMarker, wharvesSvg.trim() + '\n\n    ' + movingBoatsMarker);
  console.log('Successfully inserted Wharves, Docking Boats & Embarking/Disembarking Passengers!');
} else {
  console.error('Could not find moving boats marker!');
  process.exit(1);
}

// Write file
fs.writeFileSync(backdropPath, code, 'utf8');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('SUCCESS: MidAutumnSvgBackdrop.tsx with docking boats & passengers compiled cleanly!');
} catch (e) {
  console.error('Compilation error:', e);
  process.exit(1);
}
