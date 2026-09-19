const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'components', 'login', 'MidAutumnSvgBackdrop.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. CÁC CSS KEYFRAMES MỚI CHO THUYỀN XUỒNG ĐA HƯỚNG VÀ NGƯỜI RƯỚC ĐÈN THẢ HOA ĐĂNG
const newKeyframes = `
                /* ============================================================================== */
                /* HỘI AN BUSTLING RIVER & FESTIVAL PROMENADE KEYFRAMES                           */
                /* ============================================================================== */

                /* THUYỀN GHE XUÔI DÒNG: TRÁI SANG PHẢI (L -> R) */
                @keyframes hoian-boat-lr-lane1 {
                    0% { transform: translate(-280px, 620px) scale(0.85); }
                    100% { transform: translate(2160px, 620px) scale(0.85); }
                }
                .animate-boat-lr-1 {
                    animation: hoian-boat-lr-lane1 56s linear infinite;
                }

                @keyframes hoian-boat-lr-lane2 {
                    0% { transform: translate(-320px, 730px) scale(1.15); }
                    100% { transform: translate(2160px, 730px) scale(1.15); }
                }
                .animate-boat-lr-2 {
                    animation: hoian-boat-lr-lane2 44s linear infinite -18s;
                }

                @keyframes hoian-boat-lr-lane3 {
                    0% { transform: translate(-340px, 860px) scale(1.42); }
                    100% { transform: translate(2160px, 860px) scale(1.42); }
                }
                .animate-boat-lr-3 {
                    animation: hoian-boat-lr-lane3 36s linear infinite -8s;
                }

                /* THUYỀN GHE NGƯỢC DÒNG: PHẢI SANG TRÁI (R -> L) - LẬT HƯỚNG MŨI THUYỀN scaleX(-1) */
                @keyframes hoian-boat-rl-lane1 {
                    0% { transform: translate(2160px, 585px) scale(-0.70, 0.70); }
                    100% { transform: translate(-280px, 585px) scale(-0.70, 0.70); }
                }
                .animate-boat-rl-1 {
                    animation: hoian-boat-rl-lane1 66s linear infinite -24s;
                }

                @keyframes hoian-boat-rl-lane2 {
                    0% { transform: translate(2160px, 675px) scale(-1.02, 1.02); }
                    100% { transform: translate(-280px, 675px) scale(-1.02, 1.02); }
                }
                .animate-boat-rl-2 {
                    animation: hoian-boat-rl-lane2 50s linear infinite -35s;
                }

                @keyframes hoian-boat-rl-lane3 {
                    0% { transform: translate(2160px, 795px) scale(-1.28, 1.28); }
                    100% { transform: translate(-300px, 795px) scale(-1.28, 1.28); }
                }
                .animate-boat-rl-3 {
                    animation: hoian-boat-rl-lane3 40s linear infinite -14s;
                }

                /* Nhịp chèo đò và sóng nhấp nhô theo từng nhịp đẩy mái chèo */
                @keyframes hoian-boat-stroke-bob {
                    0%, 100% { transform: translateY(0px) rotate(0.6deg); }
                    35% { transform: translateY(-3.5px) rotate(-1.1deg); }
                    65% { transform: translateY(2px) rotate(0.4deg); }
                }
                .animate-boat-stroke {
                    animation: hoian-boat-stroke-bob 3.2s ease-in-out infinite;
                }

                /* Động tác vung mái chèo chèo nước */
                @keyframes hoian-oar-rowing {
                    0%, 100% { transform: rotate(-14deg); }
                    40% { transform: rotate(18deg); }
                    55% { transform: rotate(8deg); }
                    80% { transform: rotate(-8deg); }
                }
                .animate-oar-row {
                    animation: hoian-oar-rowing 3.2s ease-in-out infinite;
                    transform-origin: 5px 5px;
                }

                /* Vệt sóng rẽ nước sau đuôi thuyền */
                @keyframes hoian-boat-wake {
                    0%, 100% { opacity: 0.3; transform: scaleX(0.9); }
                    50% { opacity: 0.65; transform: scaleX(1.2); }
                }
                .animate-boat-wake {
                    animation: hoian-boat-wake 3.2s ease-in-out infinite;
                }

                /* Đèn lồng cầm tay người đi chơi đung đưa theo bước chân */
                @keyframes hoian-hand-lantern-sway {
                    0%, 100% { transform: rotate(-6deg); }
                    50% { transform: rotate(6deg); }
                }
                .animate-hand-lantern {
                    animation: hoian-hand-lantern-sway 2.4s ease-in-out infinite;
                    transform-origin: 0px 0px;
                }

                /* Người thả hoa đăng dập dềnh đưa tay theo sóng */
                @keyframes hoian-release-sway {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(1.5px); }
                }
                .animate-release-person {
                    animation: hoian-release-sway 3.8s ease-in-out infinite;
                }

                @keyframes hoian-hoa-dang-float-1 {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(14px, -3px); }
                    100% { transform: translate(28px, 1px); }
                }
                @keyframes hoian-hoa-dang-float-2 {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(-12px, -4px); }
                    100% { transform: translate(-25px, 0px); }
                }
                .animate-hoa-dang-1 {
                    animation: hoian-hoa-dang-float-1 12s ease-in-out infinite alternate;
                }
                .animate-hoa-dang-2 {
                    animation: hoian-hoa-dang-float-2 15s ease-in-out infinite alternate 1.5s;
                }
                .animate-hoa-dang-3 {
                    animation: hoian-hoa-dang-float-1 10s ease-in-out infinite alternate 3s;
                }
`;

// Thay thế keyframes cũ từ hoian-boat-travel-1 đến animate-hoa-dang-3
const oldKeyframesRegex = /\/\* THUYỀN NAN CHÈO THEO DÒNG NƯỚC SÔNG HOÀI[\s\S]*?\.animate-hoa-dang-3\s*\{\s*animation:[^}]+;\s*\}/;

if (!oldKeyframesRegex.test(code)) {
    console.error('Could not find old keyframes pattern');
    process.exit(1);
}

code = code.replace(oldKeyframesRegex, newKeyframes.trim());

// 2. TẠO CÁC MẪU SVG MỚI:
// A) Helper tạo thuyền nan mui vòm Hội An
function createSampanCanopy(options = {}) {
    const { lanternColor = '#ef4444', hasPassenger = true, passengerType = 'couple', wakeColor = '#fde047' } = options;
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="45" cy="22" rx="58" ry="9" fill="#01040a" opacity="0.75" />
            <path d="M -22,12 Q -45,18 -75,22 M -22,18 Q -40,24 -65,30" stroke="${wakeColor}" strokeWidth="1.2" opacity="0.5" className="animate-boat-wake" fill="none" />
            
            {/* Thân thuyền nan gỗ Hội An */}
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5 Q 85,32 45,34 Q 10,32 -22,5 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.8" />
            <path d="M -22,5 Q 10,22 45,24 Q 85,22 118,5" fill="none" stroke="#854d0e" strokeWidth="3" strokeLinecap="round" />
            <line x1="10" y1="18" x2="10" y2="28" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="32" y1="21" x2="32" y2="31" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="58" y1="21" x2="58" y2="31" stroke="#3b1d06" strokeWidth="1.5" />
            <line x1="82" y1="18" x2="82" y2="28" stroke="#3b1d06" strokeWidth="1.5" />
            
            {/* Mui vòm chiếu tre truyền thống Hội An */}
            <path d="M 22,8 C 22,-14 74,-14 74,8 Z" fill="#451a03" stroke="#1c0e02" strokeWidth="1.5" />
            <path d="M 24,6 C 24,-11 72,-11 72,6 Z" fill="#78350f" opacity="0.9" />
            <path d="M 28,4 C 28,-8 68,-8 68,4" fill="none" stroke="#d97706" strokeWidth="1" opacity="0.7" />
            <line x1="36" y1="-7" x2="36" y2="8" stroke="#261001" strokeWidth="0.8" />
            <line x1="48" y1="-9" x2="48" y2="8" stroke="#261001" strokeWidth="0.8" />
            <line x1="60" y1="-7" x2="60" y2="8" stroke="#261001" strokeWidth="0.8" />
            {/* Ánh đèn vàng ấm bên trong mui thuyền */}
            <ellipse cx="48" cy="4" rx="15" ry="6" fill="#f59e0b" opacity="0.5" filter="url(#bloomSoft)" />

            ${hasPassenger && passengerType === 'couple' ? `
            {/* Du khách ngồi ngắm trăng bên trong mui */}
            <g transform="translate(38, 2)">
                <circle cx="0" cy="-4" r="3.2" fill="#fed7aa" />
                <path d="M -4,-1 L 4,-1 L 5,8 L -5,8 Z" fill="#0284c7" />
            </g>
            <g transform="translate(54, 2)">
                <circle cx="0" cy="-4" r="3.2" fill="#fbcfe8" />
                <path d="M -4,-1 L 4,-1 L 5,8 L -5,8 Z" fill="#e11d48" />
            </g>
            ` : ''}

            ${hasPassenger && passengerType === 'flower_releaser' ? `
            {/* Du khách cúi tay thả hoa đăng từ mạn thuyền */}
            <g transform="translate(68, 6)">
                <circle cx="0" cy="-6" r="3.2" fill="#fed7aa" />
                <path d="M -3,-3 L 3,-3 L 5,6 L -4,6 Z" fill="#ec4899" />
                <path d="M 2,0 Q 8,5 12,12" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                {/* Đóa hoa đăng vừa thả chạm nước */}
                <ellipse cx="14" cy="14" rx="4.5" ry="2" fill="#f43f5e" filter="url(#bloomSoft)" />
                <circle cx="14" cy="13" r="1.2" fill="#ffffff" />
            </g>
            ` : ''}
            
            {/* Người chèo đò nón lá áo bà ba vung mái chèo */}
            <g transform="translate(14, -4)">
                <path d="M -10,-6 L 10,-6 L 0,-17 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-4 L 4,16" stroke="#1e293b" strokeWidth="5.5" strokeLinecap="round" />
                <ellipse cx="2" cy="1" rx="4.5" ry="6" fill="#334155" />
                <g className="animate-oar-row">
                    <line x1="5" y1="5" x2="-26" y2="36" stroke="#5c3818" strokeWidth="2.5" strokeLinecap="round" />
                    <path d="M -26,36 L -35,45" stroke="#854d0e" strokeWidth="4.5" strokeLinecap="round" />
                </g>
            </g>

            {/* Sào đèn lồng cong đầu mũi thuyền soi sáng mặt sông */}
            <path d="M 100,6 Q 112,-4 114,-14" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="114" cy="-10" rx="5.5" ry="8" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="114" cy="-10" r="2.2" fill="#ffffff" />
            <line x1="114" y1="-2" x2="114" y2="4" stroke="#eab308" strokeWidth="1.2" strokeLinecap="round" />
            <ellipse cx="114" cy="26" rx="14" ry="4.5" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

// B) Helper tạo ghe buôn hoa cúc, trái cây & lồng đèn kéo quân Hội An
function createMerchantBoat(options = {}) {
    const { lantern1 = '#ef4444', lantern2 = '#f59e0b', scale = 1 } = options;
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="50" cy="24" rx="65" ry="10" fill="#01040a" opacity="0.75" />
            <path d="M -25,14 Q -55,20 -85,25 M -25,20 -50,28 -75,34" stroke="#fde047" strokeWidth="1.4" opacity="0.5" className="animate-boat-wake" fill="none" />

            {/* Thân thuyền gỗ mộc bề thế */}
            <path d="M -26,6 Q 15,25 55,27 Q 95,25 132,6 Q 95,36 55,38 Q 15,36 -26,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="2" />
            <path d="M -26,6 Q 15,25 55,27 Q 95,25 132,6" fill="none" stroke="#ca8a04" strokeWidth="2.8" strokeLinecap="round" />
            
            {/* Hàng thúng hoa cúc mâm xôi vàng rực và buồng chuối */}
            <ellipse cx="28" cy="14" rx="11" ry="6" fill="#713f12" />
            <circle cx="28" cy="11" r="9" fill="#eab308" filter="url(#bloomSoft)" />
            <circle cx="26" cy="9" r="2.5" fill="#fef08a" />
            <circle cx="31" cy="10" r="2.2" fill="#ca8a04" />

            <ellipse cx="48" cy="13" rx="11" ry="6" fill="#713f12" />
            <circle cx="48" cy="10" r="9" fill="#f59e0b" filter="url(#bloomSoft)" />
            <circle cx="46" cy="8" r="2.5" fill="#fef08a" />
            <circle cx="51" cy="9" r="2.2" fill="#d97706" />

            <ellipse cx="68" cy="14" rx="10" ry="5.5" fill="#713f12" />
            <circle cx="68" cy="11" r="8.5" fill="#eab308" filter="url(#bloomSoft)" />

            {/* Mái che bạt nan che hàng */}
            <path d="M 22,12 C 24,-6 72,-6 74,12 Z" fill="#291302" stroke="#120601" strokeWidth="1.2" opacity="0.6" />

            {/* Người phụ nữ nón lá quai thao ngồi trước mũi thuyền */}
            <g transform="translate(94, 6)">
                <path d="M -11,-4 L 11,-4 L 0,-14 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-2 L 2,12" stroke="#059669" strokeWidth="5.5" strokeLinecap="round" />
                <ellipse cx="1" cy="3" rx="4" ry="5" fill="#10b981" />
            </g>

            {/* Người chèo lái phía sau vững chãi */}
            <g transform="translate(8, -5)">
                <path d="M -10,-6 L 10,-6 L 0,-17 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-4 L 3,17" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="1" cy="2" rx="4.5" ry="6.5" fill="#1e293b" />
                <g className="animate-oar-row">
                    <line x1="4" y1="6" x2="-30" y2="40" stroke="#5c3818" strokeWidth="3" strokeLinecap="round" />
                    <path d="M -30,40 L -42,50" stroke="#854d0e" strokeWidth="5.5" strokeLinecap="round" />
                </g>
            </g>

            {/* Cột sào treo 2 lồng đèn kéo quân Hội An cao ráo */}
            <line x1="82" y1="12" x2="82" y2="-22" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 82,-22 Q 95,-28 100,-16" fill="none" stroke="#ca8a04" strokeWidth="1.4" />
            <ellipse cx="82" cy="-12" rx="6" ry="8.5" fill="${lantern1}" filter="url(#bloomHigh)" />
            <circle cx="82" cy="-12" r="2.2" fill="#ffffff" />
            <ellipse cx="100" cy="-12" rx="5.5" ry="7.5" fill="${lantern2}" filter="url(#bloomHigh)" />
            <circle cx="100" cy="-12" r="2" fill="#ffffff" />
            {/* Phản chiếu bóng đèn xuống sông */}
            <ellipse cx="90" cy="30" rx="18" ry="5" fill="${lantern1}" opacity="0.45" filter="url(#bloomSoft)" />
        </g>
    `;
}

// C) Helper tạo xuồng ba lá lướt nhẹ nhàng (canoeing sampan)
function createLightCanoe(options = {}) {
    const { lanternColor = '#06b6d4', scale = 1, rowerHat = '#fde047' } = options;
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="40" cy="18" rx="50" ry="7" fill="#01040a" opacity="0.7" />
            <path d="M -18,10 Q -38,15 -62,18" stroke="#38bdf8" strokeWidth="1" opacity="0.5" className="animate-boat-wake" fill="none" />

            {/* Thân xuồng ba lá thon dài mũi vót nhọn */}
            <path d="M -18,4 Q 10,17 42,18 Q 78,17 105,4 Q 78,25 42,26 Q 10,25 -18,4 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.5" />
            <path d="M -18,4 Q 10,17 42,18 Q 78,17 105,4" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
            
            {/* Thiếu nữ ngồi giữa ngắm hoa đăng */}
            <g transform="translate(50, 4)">
                <circle cx="0" cy="-4" r="3" fill="#fed7aa" />
                <path d="M -3,-1 L 3,-1 L 4,8 L -4,8 Z" fill="#8b5cf6" />
                <circle cx="8" cy="8" r="3.5" fill="#f43f5e" filter="url(#bloomSoft)" />
            </g>

            {/* Người chèo lái phía sau */}
            <g transform="translate(10, -3)">
                <path d="M -8,-5 L 8,-5 L 0,-14 Z" fill="${rowerHat}" stroke="#78350f" strokeWidth="0.7" />
                <path d="M 0,-2 L 3,14" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" />
                <ellipse cx="1" cy="2" rx="3.5" ry="5.5" fill="#475569" />
                <g className="animate-oar-row">
                    <line x1="3" y1="4" x2="-22" y2="30" stroke="#5c3818" strokeWidth="2" strokeLinecap="round" />
                    <path d="M -22,30 L -30,38" stroke="#854d0e" strokeWidth="3.8" strokeLinecap="round" />
                </g>
            </g>

            {/* Đèn lồng treo mũi xuồng */}
            <line x1="96" y1="4" x2="96" y2="-8" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
            <ellipse cx="96" cy="-2" rx="5" ry="7" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="96" cy="-2" r="2" fill="#ffffff" />
            <ellipse cx="96" cy="22" rx="12" ry="4" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

// D) Helper tạo thuyền rồng hoa đăng trang hoàng lộng lẫy (Dragon Lantern Royal Boat)
function createDragonRoyalBoat(options = {}) {
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="55" cy="24" rx="72" ry="11" fill="#01040a" opacity="0.8" />
            <path d="M -28,15 Q -60,22 -95,26 M -28,22 -58,30 -85,36" stroke="#fde047" strokeWidth="1.6" opacity="0.6" className="animate-boat-wake" fill="none" />

            {/* Thân thuyền rồng sơn son thếp vàng */}
            <path d="M -28,6 Q 15,26 58,28 Q 105,26 145,6 Q 105,38 58,40 Q 15,38 -28,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="2.2" />
            <path d="M -28,6 Q 15,26 58,28 Q 105,26 145,6" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
            <path d="M -26,10 Q 15,28 58,30 Q 105,28 140,10" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" />
            
            {/* Đầu rồng chạm trổ ở mũi thuyền */}
            <g transform="translate(142, 6)">
                <path d="M 0,0 Q 8,-12 16,-10 Q 18,-2 10,2 Z" fill="#dc2626" stroke="#ca8a04" strokeWidth="1.2" />
                <circle cx="12" cy="-7" r="1.8" fill="#fef08a" />
                <path d="M 12,-12 Q 15,-18 10,-20" stroke="#ca8a04" strokeWidth="1.2" fill="none" />
            </g>

            {/* Giàn lồng đèn rực rỡ 4 chiếc dọc thân thuyền */}
            <path d="M 10,-8 Q 60,-18 115,-8" fill="none" stroke="#ca8a04" strokeWidth="1.5" />
            <ellipse cx="25" cy="-7" rx="5" ry="7" fill="#ef4444" filter="url(#bloomHigh)" />
            <circle cx="25" cy="-7" r="1.8" fill="#ffffff" />
            <ellipse cx="50" cy="-11" rx="5.5" ry="7.5" fill="#f59e0b" filter="url(#bloomHigh)" />
            <circle cx="50" cy="-11" r="1.8" fill="#ffffff" />
            <ellipse cx="75" cy="-11" rx="5.5" ry="7.5" fill="#10b981" filter="url(#bloomHigh)" />
            <circle cx="75" cy="-11" r="1.8" fill="#ffffff" />
            <ellipse cx="100" cy="-7" rx="5" ry="7" fill="#ec4899" filter="url(#bloomHigh)" />
            <circle cx="100" cy="-7" r="1.8" fill="#ffffff" />

            {/* Gia đình du khách mặc Áo Dài thưởng ngoạn */}
            <g transform="translate(42, 2)">
                <circle cx="0" cy="-5" r="3.5" fill="#fed7aa" />
                <path d="M -4,-2 L 4,-2 L 5,9 L -5,9 Z" fill="#b91c1c" />
            </g>
            <g transform="translate(58, 2)">
                <circle cx="0" cy="-5" r="3.5" fill="#fbcfe8" />
                <path d="M -4,-2 L 4,-2 L 5,9 L -5,9 Z" fill="#c026d3" />
            </g>
            {/* Em bé cầm đèn ông sao */}
            <g transform="translate(74, 4)">
                <circle cx="0" cy="-4" r="2.8" fill="#fed7aa" />
                <path d="M -3,-1 L 3,-1 L 3.5,7 L -3.5,7 Z" fill="#eab308" />
                <line x1="2" y1="0" x2="8" y2="-6" stroke="#78350f" strokeWidth="1" />
                <polygon points="8,-10 9,-7 12,-7 10,-5 11,-2 8,-4 5,-2 6,-5 4,-7 7,-7" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>

            {/* Người chèo lái nón lá áo nâu */}
            <g transform="translate(6, -6)">
                <path d="M -11,-6 L 11,-6 L 0,-18 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-4 L 3,18" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="1" cy="2" rx="4.5" ry="6.5" fill="#1e293b" />
                <g className="animate-oar-row">
                    <line x1="4" y1="6" x2="-32" y2="42" stroke="#5c3818" strokeWidth="3" strokeLinecap="round" />
                    <path d="M -32,42 L -44,52" stroke="#854d0e" strokeWidth="5.5" strokeLinecap="round" />
                </g>
            </g>

            {/* Phản chiếu đèn rồng xuống mặt sông */}
            <ellipse cx="60" cy="32" rx="35" ry="6" fill="#f59e0b" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

// 3. TẠO TOÀN BỘ PHẦN BỜ KÈ VÀ DÒNG NGƯỜI CẦM LỒNG ĐÈN & THẢ HOA ĐĂNG
const bustlingPromenadeAndPeople = `
    {/* ============================================================================== */}
    {/* BỜ KÈ ĐÁ VÀ DÒNG NGƯỜI CẦM LỒNG ĐÈN ĐI CHƠI TRUNG THU, THẢ HOA ĐĂNG DỌC BỜ     */}
    {/* ============================================================================== */}
    <g id="hoian-riverbank-and-crowds">
        {/* Nền đường đá phố đi bộ ven sông Bạch Đằng */}
        <polygon points="0,540 1920,540 1920,565 0,565" fill="#0f172a" />
        <line x1="0" y1="540" x2="1920" y2="540" stroke="#94a3b8" strokeWidth="1.8" opacity="0.9" />

        {/* Các trụ đá lan can bờ kè và lồng đèn bờ sông */}
        <g fill="#241002">
            <rect x="75" y="522" width="10" height="28" rx="2" /><circle cx="80" cy="522" r="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <rect x="255" y="524" width="9" height="26" rx="2" /><circle cx="259.5" cy="524" r="5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <rect x="585" y="526" width="9" height="24" rx="2" /><circle cx="589.5" cy="526" r="5" fill="#06b6d4" filter="url(#bloomSoft)" />
            <rect x="815" y="524" width="9" height="26" rx="2" /><circle cx="819.5" cy="524" r="5" fill="#ef4444" filter="url(#bloomSoft)" />
            <rect x="1105" y="524" width="9" height="26" rx="2" /><circle cx="1109.5" cy="524" r="5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <rect x="1355" y="526" width="9" height="24" rx="2" /><circle cx="1359.5" cy="526" r="5" fill="#c026d3" filter="url(#bloomSoft)" />
            <rect x="1625" y="524" width="10" height="28" rx="2" /><circle cx="1630" cy="524" r="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <rect x="1845" y="524" width="9" height="26" rx="2" /><circle cx="1849.5" cy="524" r="5" fill="#f59e0b" filter="url(#bloomSoft)" />
        </g>

        {/* BẬC THỀM ĐÁ TAM CẤP 1 (X: 410 - 470) - NGƯỜI CÚI THẢ HOA ĐĂNG */}
        <polygon points="410,540 470,540 475,568 405,568" fill="#1e293b" />
        <line x1="408" y1="549" x2="472" y2="549" stroke="#64748b" strokeWidth="1.4" />
        <line x1="406" y1="558" x2="474" y2="558" stroke="#64748b" strokeWidth="1.4" />
        
        {/* 2 người ngồi thả hoa đăng tại Bậc thềm 1 */}
        <g transform="translate(435, 524)" className="animate-release-person">
            {/* Thiếu nữ áo bà ba hồng ngồi xổm nhẹ nhàng đưa hoa đăng xuống nước */}
            <path d="M -12,-8 L 12,-8 L 0,-20 Z" fill="#fef08a" stroke="#b45309" strokeWidth="1" />
            <ellipse cx="0" cy="7" rx="6.5" ry="14" fill="#f43f5e" />
            <path d="M -4,8 Q 5,23 15,26" stroke="#f43f5e" strokeWidth="5" fill="none" strokeLinecap="round" />
            {/* Hoa đăng sen đỏ chạm nước tỏa sáng rực rỡ */}
            <g transform="translate(18, 28)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="4" rx="10" ry="3.5" fill="#f43f5e" opacity="0.85" />
                <circle cx="0" cy="2" r="4.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="1" r="1.8" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(458, 518)">
            {/* Bạn đi cùng đứng soi đèn lồng vàng */}
            <circle cx="0" cy="-14" r="4.5" fill="#fed7aa" />
            <path d="M 0,-10 L 0,20" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
            <line x1="2" y1="-2" x2="10" y2="6" stroke="#78350f" strokeWidth="1.4" />
            <g transform="translate(10, 8)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
                <circle cx="0" cy="6" r="1.8" fill="#ffffff" />
            </g>
        </g>

        {/* BẬC THỀM ĐÁ TAM CẤP 2 (X: 880 - 945) - MẸ VÀ BÉ THẢ HOA ĐĂNG */}
        <polygon points="885,540 945,540 950,568 880,568" fill="#1e293b" />
        <line x1="883" y1="549" x2="947" y2="549" stroke="#64748b" strokeWidth="1.4" />
        <line x1="881" y1="558" x2="949" y2="558" stroke="#64748b" strokeWidth="1.4" />
        
        <g transform="translate(905, 522)" className="animate-release-person">
            {/* Mẹ nón lá áo dài vàng cúi đỡ bé */}
            <path d="M -11,-7 L 11,-7 L 0,-18 Z" fill="#fef08a" stroke="#b45309" strokeWidth="0.9" />
            <ellipse cx="0" cy="8" rx="6" ry="14" fill="#ca8a04" />
            <path d="M 2,8 Q 8,20 14,24" stroke="#ca8a04" strokeWidth="4.5" fill="none" strokeLinecap="round" />
        </g>
        <g transform="translate(922, 532)" className="animate-release-person">
            {/* Bé mặc yếm đỏ ngồi xổm thả hoa đăng sen vàng */}
            <circle cx="0" cy="-6" r="3.5" fill="#fed7aa" />
            <ellipse cx="0" cy="2" rx="4.5" ry="7" fill="#dc2626" />
            <g transform="translate(6, 12)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="3" rx="8" ry="3" fill="#f59e0b" opacity="0.9" />
                <circle cx="0" cy="1" r="3.8" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
            </g>
        </g>

        {/* BẬC THỀM ĐÁ TAM CẤP 3 (X: 1395 - 1460) - THIẾU NỮ ÁO DÀI THẢ HOA ĐĂNG */}
        <polygon points="1400,540 1460,540 1465,568 1395,568" fill="#1e293b" />
        <line x1="1398" y1="549" x2="1462" y2="549" stroke="#64748b" strokeWidth="1.4" />
        <line x1="1396" y1="558" x2="1464" y2="558" stroke="#64748b" strokeWidth="1.4" />
        
        <g transform="translate(1425, 520)" className="animate-release-person">
            {/* Cô gái áo dài xanh ngọc thả hoa đăng tím sen */}
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            <ellipse cx="0" cy="6" rx="5.5" ry="15" fill="#0d9488" />
            <path d="M 0,4 Q 8,18 16,24" stroke="#0d9488" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <g transform="translate(18, 25)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="3" rx="9" ry="3.2" fill="#c026d3" opacity="0.85" />
                <circle cx="0" cy="1" r="4" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="0" r="1.6" fill="#ffffff" />
            </g>
        </g>


        {/* NHÓM NGƯỜI RƯỚC ĐÈN ĐI CHƠI TRUNG THU TRÊN BỜ KÈ PHỐ CỔ */}

        {/* Nhóm 1: Trẻ em rước đèn ông sao tung tăng gần Chùa Cầu (X: 120 - 180) */}
        <g transform="translate(135, 514)">
            {/* Bé trai áo bà ba xanh cầm đèn ông sao */}
            <circle cx="0" cy="-12" r="4" fill="#fed7aa" />
            <path d="M 0,-8 L 0,16" stroke="#0284c7" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="3" y1="-2" x2="12" y2="-12" stroke="#78350f" strokeWidth="1.4" />
            {/* Đèn ông sao đỏ rực rỡ */}
            <g transform="translate(12, -14)" className="animate-hand-lantern">
                <polygon points="0,-9 2.5,-3 8,-3 4,1 6,7 0,3 -6,7 -4,1 -8,-3 -2.5,-3" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="2.5" fill="#fef08a" />
                <circle cx="0" cy="0" r="1.2" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(160, 516)">
            {/* Bé gái áo hồng cầm đèn cá chép */}
            <circle cx="0" cy="-10" r="3.8" fill="#fbcfe8" />
            <path d="M 0,-6 L 0,16" stroke="#db2777" strokeWidth="5" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="10" y2="-8" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(12, -7)" className="animate-hand-lantern">
                <ellipse cx="0" cy="0" rx="6.5" ry="3.5" fill="#f59e0b" filter="url(#bloomHigh)" />
                <polygon points="6,0 10,-3 10,3" fill="#ef4444" />
                <circle cx="-2" cy="-1" r="1" fill="#ffffff" />
            </g>
        </g>

        {/* Nhóm 2: Đôi bạn trẻ áo bà ba dạo phố (X: 310 - 360) */}
        <g transform="translate(325, 510)">
            <circle cx="0" cy="-15" r="4.5" fill="#fed7aa" />
            <path d="M 0,-10 L 0,22" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            <line x1="3" y1="-2" x2="12" y2="4" stroke="#78350f" strokeWidth="1.5" />
            <g transform="translate(12, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="6" r="1.8" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(345, 512)">
            <circle cx="0" cy="-13" r="4.2" fill="#fed7aa" />
            <path d="M 0,-9 L 0,20" stroke="#059669" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="9" y2="5" stroke="#78350f" strokeWidth="1.4" />
            <g transform="translate(9, 7)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="5.5" fill="#f59e0b" filter="url(#bloomHigh)" />
                <circle cx="0" cy="5" r="1.5" fill="#ffffff" />
            </g>
        </g>

        {/* Nhóm 3: Thiếu nữ áo dài đỏ thướt tha cầm lồng đèn hoa sen (X: 660 - 720) */}
        <g transform="translate(680, 508)">
            <circle cx="0" cy="-16" r="4.5" fill="#fed7aa" />
            <path d="M 0,-11 L 0,24" stroke="#dc2626" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="3" y1="-3" x2="14" y2="2" stroke="#78350f" strokeWidth="1.5" />
            <g transform="translate(14, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="7" rx="5" ry="7.5" fill="#f43f5e" filter="url(#bloomHigh)" />
                <circle cx="0" cy="6" r="2" fill="#ffffff" />
                <line x1="0" y1="14" x2="0" y2="20" stroke="#eab308" strokeWidth="1.2" />
            </g>
        </g>
        <g transform="translate(705, 514)">
            {/* Em nhỏ đi bên cạnh ngước nhìn lồng đèn */}
            <circle cx="0" cy="-10" r="3.8" fill="#fed7aa" />
            <path d="M 0,-6 L 0,16" stroke="#ca8a04" strokeWidth="5" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="8" y2="-8" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(8, -8)" className="animate-hand-lantern">
                <circle cx="0" cy="0" r="4" fill="#10b981" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="1.4" fill="#ffffff" />
            </g>
        </g>

        {/* Nhóm 4: Đoàn rước đèn Trung Thu 3 em nhỏ (X: 1140 - 1220) */}
        <g transform="translate(1155, 515)">
            <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
            <path d="M 0,-7 L 0,16" stroke="#ea580c" strokeWidth="5" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="10" y2="-10" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(10, -11)" className="animate-hand-lantern">
                <polygon points="0,-8 2,-2.5 7,-2.5 3.5,1 5,6 0,2.5 -5,6 -3.5,1 -7,-2.5 -2,-2.5" fill="#f59e0b" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(1185, 516)">
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
            <path d="M 0,-6 L 0,15" stroke="#7c3aed" strokeWidth="4.8" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="9" y2="-6" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(9, -6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="4" rx="3.8" ry="5.5" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="4" r="1.5" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(1212, 517)">
            <circle cx="0" cy="-9" r="3.5" fill="#fed7aa" />
            <path d="M 0,-5 L 0,14" stroke="#059669" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="2" y1="0" x2="8" y2="-5" stroke="#78350f" strokeWidth="1.1" />
            <g transform="translate(8, -5)" className="animate-hand-lantern">
                <circle cx="0" cy="0" r="3.8" fill="#38bdf8" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="1.4" fill="#ffffff" />
            </g>
        </g>

        {/* Nhóm 5: Đôi lứa ngắm sông đèn hoa đăng (X: 1660 - 1720) */}
        <g transform="translate(1680, 510)">
            <circle cx="0" cy="-15" r="4.5" fill="#fed7aa" />
            <path d="M 0,-10 L 0,22" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
            <line x1="3" y1="-1" x2="12" y2="5" stroke="#78350f" strokeWidth="1.5" />
            <g transform="translate(12, 7)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="6" r="1.8" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(1705, 512)">
            <circle cx="0" cy="-14" r="4.2" fill="#fbcfe8" />
            <path d="M 0,-9 L 0,21" stroke="#be185d" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="10" y2="4" stroke="#78350f" strokeWidth="1.4" />
            <g transform="translate(10, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
                <circle cx="0" cy="5" r="1.6" fill="#ffffff" />
            </g>
        </g>
    </g>
`;

// 4. TẠO CÁC LÀN THUYỀN GHE TẤP NẬP ĐA HƯỚNG
const bustlingRiverLanes = `
    {/* ============================================================================== */}
    {/* CÁC LÀN THUYỀN GHE XUỒNG TẤP NẬP ĐA DẠNG CHÈO THEO NHIỀU HƯỚNG TRÊN SÔNG HOÀI  */}
    {/* ============================================================================== */}

    {/* LÀN 1 (XUÔI DÒNG: TRÁI -> PHẢI, y=620, scale=0.85): Ghe tam bản mui vòm chở khách */}
    <g className="animate-boat-lr-1">
        ${createSampanCanopy({ lanternColor: '#ef4444', hasPassenger: true, passengerType: 'couple', wakeColor: '#fde047' })}
    </g>

    {/* LÀN 2 (NGƯỢC DÒNG: PHẢI -> TRÁI, y=585, scale=0.70): Xuồng ba lá thanh mảnh xa bờ */}
    <g className="animate-boat-rl-1">
        ${createLightCanoe({ lanternColor: '#06b6d4', rowerHat: '#fde047' })}
    </g>

    {/* LÀN 3 (XUÔI DÒNG: TRÁI -> PHẢI, y=730, scale=1.15): Thuyền buôn hoa cúc mâm xôi & đèn kéo quân */}
    <g className="animate-boat-lr-2">
        ${createMerchantBoat({ lantern1: '#ef4444', lantern2: '#f59e0b' })}
    </g>

    {/* LÀN 4 (NGƯỢC DÒNG: PHẢI -> TRÁI, y=675, scale=1.02): Ghe du khách cúi thả hoa đăng mạn thuyền */}
    <g className="animate-boat-rl-2">
        ${createSampanCanopy({ lanternColor: '#f59e0b', hasPassenger: true, passengerType: 'flower_releaser', wakeColor: '#fef08a' })}
    </g>

    {/* LÀN 5 (XUÔI DÒNG: TRÁI -> PHẢI, y=860, scale=1.42 - Cận cảnh): Thuyền rồng hoa đăng hoàng gia */}
    <g className="animate-boat-lr-3">
        ${createDragonRoyalBoat()}
    </g>

    {/* LÀN 6 (NGƯỢC DÒNG: PHẢI -> TRÁI, y=795, scale=1.28): Xuồng ba lá lướt nhanh giao thoa */}
    <g className="animate-boat-rl-3">
        ${createLightCanoe({ lanternColor: '#ec4899', rowerHat: '#fef08a' })}
    </g>
`;

// 5. TẠO DÒNG SÔNG HOA ĐĂNG DÀY ĐẶC LUNG LINH TRÔI THEO DÒNG NƯỚC
function generateDenseHoaDang() {
    const items = [
        // Lớp xa (y=590..630, scale=0.55..0.75)
        { x: 340, y: 605, s: 0.65, color: '#f43f5e', anim: '1' },
        { x: 490, y: 595, s: 0.60, color: '#f59e0b', anim: '2' },
        { x: 620, y: 615, s: 0.70, color: '#06b6d4', anim: '3' },
        { x: 760, y: 600, s: 0.62, color: '#f43f5e', anim: '1' },
        { x: 920, y: 610, s: 0.72, color: '#f59e0b', anim: '2' },
        { x: 1060, y: 598, s: 0.65, color: '#c026d3', anim: '3' },
        { x: 1220, y: 615, s: 0.70, color: '#f43f5e', anim: '1' },
        { x: 1380, y: 605, s: 0.66, color: '#f59e0b', anim: '2' },
        { x: 1540, y: 612, s: 0.68, color: '#06b6d4', anim: '3' },
        { x: 1720, y: 602, s: 0.62, color: '#f43f5e', anim: '1' },

        // Lớp trung (y=640..750, scale=0.85..1.2)
        { x: 280, y: 665, s: 0.95, color: '#f43f5e', anim: '2' },
        { x: 440, y: 685, s: 1.05, color: '#f59e0b', anim: '1' },
        { x: 570, y: 720, s: 1.15, color: '#06b6d4', anim: '3' },
        { x: 710, y: 670, s: 0.98, color: '#ec4899', anim: '2' },
        { x: 860, y: 735, s: 1.20, color: '#f59e0b', anim: '1' },
        { x: 1010, y: 680, s: 1.02, color: '#f43f5e', anim: '3' },
        { x: 1180, y: 725, s: 1.18, color: '#c026d3', anim: '2' },
        { x: 1340, y: 665, s: 0.95, color: '#f59e0b', anim: '1' },
        { x: 1500, y: 715, s: 1.12, color: '#06b6d4', anim: '3' },
        { x: 1680, y: 675, s: 1.00, color: '#f43f5e', anim: '2' },
        { x: 1820, y: 730, s: 1.22, color: '#f59e0b', anim: '1' },

        // Lớp tiền cảnh gần bờ dưới (y=770..980, scale=1.35..1.75 - Lớn rực rỡ)
        { x: 220, y: 840, s: 1.40, color: '#f43f5e', anim: '1' },
        { x: 410, y: 910, s: 1.55, color: '#f59e0b', anim: '3' },
        { x: 650, y: 860, s: 1.45, color: '#06b6d4', anim: '2' },
        { x: 890, y: 960, s: 1.70, color: '#f43f5e', anim: '1' },
        { x: 1120, y: 885, s: 1.48, color: '#ec4899', anim: '3' },
        { x: 1360, y: 945, s: 1.65, color: '#f59e0b', anim: '2' },
        { x: 1590, y: 875, s: 1.42, color: '#c026d3', anim: '1' },
        { x: 1780, y: 920, s: 1.58, color: '#f43f5e', anim: '3' }
    ];

    return `
    {/* ============================================================================== */}
    {/* DÒNG SÔNG HOA ĐĂNG ĐỎ RỰC LUNG LINH DẬP DỀNH THEO SÓNG NƯỚC SÔNG HOÀI          */}
    {/* ============================================================================== */}
    <g id="hoian-dense-hoa-dang-stream">
        ${items.map(it => `
        <g className="animate-hoa-dang-${it.anim}">
            <g transform="translate(${it.x}, ${it.y}) scale(${it.s})" filter="url(#bloomHigh)">
                {/* Vệt phản chiếu ánh nến hoa đăng loang trên mặt nước */}
                <ellipse cx="0" cy="12" rx="22" ry="5" fill="${it.color}" opacity="0.45" />
                <ellipse cx="0" cy="12" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                {/* Đài hoa sen và cánh hoa giấy ngũ sắc */}
                <polygon points="-16,4 -10,8 10,8 16,4 12,-1 -12,-1" fill="#451a03" opacity="0.85" />
                <path d="M -16,4 Q -8,-10 0,-16 Q 8,-10 16,4 Z" fill="${it.color}" opacity="0.9" />
                <path d="M -12,5 Q -5,-7 0,-12 Q 5,-7 12,5 Z" fill="#fda4af" />
                <path d="M -7,6 Q 0,-5 7,6 Z" fill="#ffffff" opacity="0.92" />
                {/* Ngọn nến lung linh tỏa ánh lửa ấm */}
                <ellipse cx="0" cy="-7" rx="3.6" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-6" r="1.6" fill="#ffffff" />
            </g>
        </g>
        `).join('\n')}
    </g>
    `;
}

// Thay thế toàn bộ đoạn từ bờ kè đá cũ (dòng 1920) đến hết hoa đăng cũ (trước <rect x="360" y="320" width="1200" height="660" rx="32" fill="url(#haCardAreaDarken)")
// Tìm điểm bắt đầu bờ kè cũ:
const oldRiverbankStart = code.indexOf('<polygon points="0,542 1920,542 1920,562 0,562" fill="#0f172a" />');
if (oldRiverbankStart === -1) {
    console.error('Could not find old riverbank start');
    process.exit(1);
}

// Tìm điểm kết thúc hoa đăng cũ:
const oldRiverbankEnd = code.indexOf('<rect x="360" y="320" width="1200" height="660" rx="32" fill="url(#haCardAreaDarken)"');
if (oldRiverbankEnd === -1) {
    console.error('Could not find old card darken area');
    process.exit(1);
}

// Giữ lại phần mặt nước sóng nền <g id="song-hoai-fluid">... đường sóng shimmer
const oldMiddle = code.substring(oldRiverbankStart, oldRiverbankEnd);
const songHoaiFluidIndex = oldMiddle.indexOf('<g id="song-hoai-fluid">');
const boatsSectionIndex = oldMiddle.indexOf('THUYỀN');

if (songHoaiFluidIndex === -1 || boatsSectionIndex === -1) {
    console.error('Could not parse song-hoai-fluid or boats section');
    process.exit(1);
}

// Lấy phần mặt nước nền sóng từ <g id="song-hoai-fluid"> đến trước phần thuyền cũ
const waterBackgroundPart = oldMiddle.substring(songHoaiFluidIndex, boatsSectionIndex);

// Hợp nhất toàn bộ khối mới:
const newContentBlock = `
${bustlingPromenadeAndPeople}

${waterBackgroundPart}

${bustlingRiverLanes}

${generateDenseHoaDang()}

`;

code = code.substring(0, oldRiverbankStart) + newContentBlock.trim() + '\n    ' + code.substring(oldRiverbankEnd);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully updated MidAutumnSvgBackdrop.tsx with bustling boats, promenade crowds & dense hoa dang!');
