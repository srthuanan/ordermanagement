const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', 'components', 'login', 'MidAutumnSvgBackdrop.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. CẬP NHẬT CSS KEYFRAMES CHO 12 LÀN THUYỀN GHE ĐA HƯỚNG VÀ NGƯỜI RƯỚC HỘI
const superKeyframes = `
                /* ============================================================================== */
                /* HỘI AN SUPER BUSTLING RIVER & FESTIVAL PROMENADE KEYFRAMES                     */
                /* ============================================================================== */

                /* THUYỀN GHE XUÔI DÒNG (TRÁI -> PHẢI: L -> R) */
                @keyframes hoian-boat-lr-1 {
                    0% { transform: translate(-280px, 620px) scale(0.85); }
                    100% { transform: translate(2160px, 620px) scale(0.85); }
                }
                .animate-boat-lr-1a { animation: hoian-boat-lr-1 56s linear infinite; }
                .animate-boat-lr-1b { animation: hoian-boat-lr-1 56s linear infinite -28s; }

                @keyframes hoian-boat-lr-2 {
                    0% { transform: translate(-320px, 730px) scale(1.15); }
                    100% { transform: translate(2160px, 730px) scale(1.15); }
                }
                .animate-boat-lr-2a { animation: hoian-boat-lr-2 44s linear infinite -6s; }
                .animate-boat-lr-2b { animation: hoian-boat-lr-2 44s linear infinite -28s; }

                @keyframes hoian-boat-lr-3 {
                    0% { transform: translate(-340px, 860px) scale(1.42); }
                    100% { transform: translate(2160px, 860px) scale(1.42); }
                }
                .animate-boat-lr-3a { animation: hoian-boat-lr-3 36s linear infinite -4s; }
                .animate-boat-lr-3b { animation: hoian-boat-lr-3 36s linear infinite -22s; }

                /* THUYỀN GHE NGƯỢC DÒNG (PHẢI -> TRÁI: R -> L) - LẬT HƯỚNG MŨI THUYỀN scaleX(-1) */
                @keyframes hoian-boat-rl-1 {
                    0% { transform: translate(2160px, 585px) scale(-0.70, 0.70); }
                    100% { transform: translate(-280px, 585px) scale(-0.70, 0.70); }
                }
                .animate-boat-rl-1a { animation: hoian-boat-rl-1 64s linear infinite -10s; }
                .animate-boat-rl-1b { animation: hoian-boat-rl-1 64s linear infinite -42s; }

                @keyframes hoian-boat-rl-2 {
                    0% { transform: translate(2160px, 675px) scale(-1.02, 1.02); }
                    100% { transform: translate(-280px, 675px) scale(-1.02, 1.02); }
                }
                .animate-boat-rl-2a { animation: hoian-boat-rl-2 48s linear infinite -12s; }
                .animate-boat-rl-2b { animation: hoian-boat-rl-2 48s linear infinite -36s; }

                @keyframes hoian-boat-rl-3 {
                    0% { transform: translate(2160px, 795px) scale(-1.28, 1.28); }
                    100% { transform: translate(-300px, 795px) scale(-1.28, 1.28); }
                }
                .animate-boat-rl-3a { animation: hoian-boat-rl-3 38s linear infinite -8s; }
                .animate-boat-rl-3b { animation: hoian-boat-rl-3 38s linear infinite -27s; }

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

                /* Điệu nhảy múa lân Trung Thu nhấp nhổm vui nhộn */
                @keyframes hoian-lion-dance {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-4px) rotate(3deg); }
                    50% { transform: translateY(1px) rotate(-2deg); }
                    75% { transform: translateY(-2px) rotate(2deg); }
                }
                .animate-lion-dance {
                    animation: hoian-lion-dance 1.8s ease-in-out infinite;
                }

                /* Ông Địa phe phẩy quạt mo */
                @keyframes hoian-ong-dia-fan {
                    0%, 100% { transform: rotate(-12deg); }
                    50% { transform: rotate(18deg); }
                }
                .animate-ong-dia-fan {
                    animation: hoian-ong-dia-fan 1.2s ease-in-out infinite;
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

const oldKeyframesRegex = /\/\* ============================================================================== \*\/\s*\/\* HỘI AN BUSTLING RIVER[\s\S]*?\.animate-hoa-dang-3\s*\{\s*animation:[^}]+;\s*\}/;

if (!oldKeyframesRegex.test(code)) {
    console.error('Could not find existing keyframes block');
    process.exit(1);
}

code = code.replace(oldKeyframesRegex, superKeyframes.trim());

// 2. HELPER FUNCTIONS CHO THUYỀN GHE
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
            <ellipse cx="48" cy="4" rx="15" ry="6" fill="#f59e0b" opacity="0.5" filter="url(#bloomSoft)" />

            ${hasPassenger && passengerType === 'couple' ? `
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
            <g transform="translate(68, 6)">
                <circle cx="0" cy="-6" r="3.2" fill="#fed7aa" />
                <path d="M -3,-3 L 3,-3 L 5,6 L -4,6 Z" fill="#ec4899" />
                <path d="M 2,0 Q 8,5 12,12" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <ellipse cx="14" cy="14" rx="4.5" ry="2" fill="#f43f5e" filter="url(#bloomSoft)" />
                <circle cx="14" cy="13" r="1.2" fill="#ffffff" />
            </g>
            ` : ''}

            ${hasPassenger && passengerType === 'family' ? `
            <g transform="translate(34, 2)">
                <circle cx="0" cy="-4" r="3" fill="#fed7aa" /><path d="M -3,-1 L 3,-1 L 4,8 L -4,8 Z" fill="#059669" />
            </g>
            <g transform="translate(48, 4)">
                <circle cx="0" cy="-3.5" r="2.5" fill="#fed7aa" /><path d="M -2.5,-1 L 2.5,-1 L 3,7 L -3,7 Z" fill="#eab308" />
            </g>
            <g transform="translate(60, 2)">
                <circle cx="0" cy="-4" r="3" fill="#fbcfe8" /><path d="M -3,-1 L 3,-1 L 4,8 L -4,8 Z" fill="#db2777" />
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

            {/* Sào đèn lồng cong đầu mũi thuyền */}
            <path d="M 100,6 Q 112,-4 114,-14" fill="none" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="114" cy="-10" rx="5.5" ry="8" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="114" cy="-10" r="2.2" fill="#ffffff" />
            <line x1="114" y1="-2" x2="114" y2="4" stroke="#eab308" strokeWidth="1.2" strokeLinecap="round" />
            <ellipse cx="114" cy="26" rx="14" ry="4.5" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

function createMerchantBoat(options = {}) {
    const { lantern1 = '#ef4444', lantern2 = '#f59e0b' } = options;
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="50" cy="24" rx="65" ry="10" fill="#01040a" opacity="0.75" />
            <path d="M -25,14 Q -55,20 -85,25 M -25,20 -50,28 -75,34" stroke="#fde047" strokeWidth="1.4" opacity="0.5" className="animate-boat-wake" fill="none" />

            <path d="M -26,6 Q 15,25 55,27 Q 95,25 132,6 Q 95,36 55,38 Q 15,36 -26,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="2" />
            <path d="M -26,6 Q 15,25 55,27 Q 95,25 132,6" fill="none" stroke="#ca8a04" strokeWidth="2.8" strokeLinecap="round" />
            
            {/* Thúng hoa cúc mâm xôi & trái cây */}
            <ellipse cx="28" cy="14" rx="11" ry="6" fill="#713f12" />
            <circle cx="28" cy="11" r="9" fill="#eab308" filter="url(#bloomSoft)" />
            <ellipse cx="48" cy="13" rx="11" ry="6" fill="#713f12" />
            <circle cx="48" cy="10" r="9" fill="#f59e0b" filter="url(#bloomSoft)" />
            <ellipse cx="68" cy="14" rx="10" ry="5.5" fill="#713f12" />
            <circle cx="68" cy="11" r="8.5" fill="#eab308" filter="url(#bloomSoft)" />

            <path d="M 22,12 C 24,-6 72,-6 74,12 Z" fill="#291302" stroke="#120601" strokeWidth="1.2" opacity="0.6" />

            {/* Người phụ nữ nón lá quai thao */}
            <g transform="translate(94, 6)">
                <path d="M -11,-4 L 11,-4 L 0,-14 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-2 L 2,12" stroke="#059669" strokeWidth="5.5" strokeLinecap="round" />
                <ellipse cx="1" cy="3" rx="4" ry="5" fill="#10b981" />
            </g>

            {/* Người chèo lái */}
            <g transform="translate(8, -5)">
                <path d="M -10,-6 L 10,-6 L 0,-17 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-4 L 3,17" stroke="#0f172a" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="1" cy="2" rx="4.5" ry="6.5" fill="#1e293b" />
                <g className="animate-oar-row">
                    <line x1="4" y1="6" x2="-30" y2="40" stroke="#5c3818" strokeWidth="3" strokeLinecap="round" />
                    <path d="M -30,40 L -42,50" stroke="#854d0e" strokeWidth="5.5" strokeLinecap="round" />
                </g>
            </g>

            {/* Cột sào 2 lồng đèn kéo quân */}
            <line x1="82" y1="12" x2="82" y2="-22" stroke="#78350f" strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx="82" cy="-12" rx="6" ry="8.5" fill="${lantern1}" filter="url(#bloomHigh)" />
            <circle cx="82" cy="-12" r="2.2" fill="#ffffff" />
            <ellipse cx="100" cy="-12" rx="5.5" ry="7.5" fill="${lantern2}" filter="url(#bloomHigh)" />
            <circle cx="100" cy="-12" r="2" fill="#ffffff" />
            <ellipse cx="90" cy="30" rx="18" ry="5" fill="${lantern1}" opacity="0.45" filter="url(#bloomSoft)" />
        </g>
    `;
}

function createLightCanoe(options = {}) {
    const { lanternColor = '#06b6d4', rowerHat = '#fde047', hasPassenger = true, passengerColor = '#8b5cf6' } = options;
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="40" cy="18" rx="50" ry="7" fill="#01040a" opacity="0.7" />
            <path d="M -18,10 Q -38,15 -62,18" stroke="#38bdf8" strokeWidth="1" opacity="0.5" className="animate-boat-wake" fill="none" />

            <path d="M -18,4 Q 10,17 42,18 Q 78,17 105,4 Q 78,25 42,26 Q 10,25 -18,4 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="1.5" />
            <path d="M -18,4 Q 10,17 42,18 Q 78,17 105,4" fill="none" stroke="#ca8a04" strokeWidth="2" strokeLinecap="round" />
            
            ${hasPassenger ? `
            <g transform="translate(50, 4)">
                <circle cx="0" cy="-4" r="3" fill="#fed7aa" />
                <path d="M -3,-1 L 3,-1 L 4,8 L -4,8 Z" fill="${passengerColor}" />
                <circle cx="8" cy="8" r="3.5" fill="#f43f5e" filter="url(#bloomSoft)" />
            </g>
            ` : ''}

            <g transform="translate(10, -3)">
                <path d="M -8,-5 L 8,-5 L 0,-14 Z" fill="${rowerHat}" stroke="#78350f" strokeWidth="0.7" />
                <path d="M 0,-2 L 3,14" stroke="#334155" strokeWidth="4.5" strokeLinecap="round" />
                <ellipse cx="1" cy="2" rx="3.5" ry="5.5" fill="#475569" />
                <g className="animate-oar-row">
                    <line x1="3" y1="4" x2="-22" y2="30" stroke="#5c3818" strokeWidth="2" strokeLinecap="round" />
                    <path d="M -22,30 L -30,38" stroke="#854d0e" strokeWidth="3.8" strokeLinecap="round" />
                </g>
            </g>

            <line x1="96" y1="4" x2="96" y2="-8" stroke="#78350f" strokeWidth="1.5" strokeLinecap="round" />
            <ellipse cx="96" cy="-2" rx="5" ry="7" fill="${lanternColor}" filter="url(#bloomHigh)" />
            <circle cx="96" cy="-2" r="2" fill="#ffffff" />
            <ellipse cx="96" cy="22" rx="12" ry="4" fill="${lanternColor}" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

function createDragonRoyalBoat() {
    return `
        <g className="animate-boat-stroke" filter="url(#dropShadow)">
            <ellipse cx="55" cy="24" rx="72" ry="11" fill="#01040a" opacity="0.8" />
            <path d="M -28,15 Q -60,22 -95,26 M -28,22 -58,30 -85,36" stroke="#fde047" strokeWidth="1.6" opacity="0.6" className="animate-boat-wake" fill="none" />

            <path d="M -28,6 Q 15,26 58,28 Q 105,26 145,6 Q 105,38 58,40 Q 15,38 -28,6 Z" fill="url(#haBoatWood)" stroke="#170c02" strokeWidth="2.2" />
            <path d="M -28,6 Q 15,26 58,28 Q 105,26 145,6" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
            <path d="M -26,10 Q 15,28 58,30 Q 105,28 140,10" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" />
            
            <g transform="translate(142, 6)">
                <path d="M 0,0 Q 8,-12 16,-10 Q 18,-2 10,2 Z" fill="#dc2626" stroke="#ca8a04" strokeWidth="1.2" />
                <circle cx="12" cy="-7" r="1.8" fill="#fef08a" />
                <path d="M 12,-12 Q 15,-18 10,-20" stroke="#ca8a04" strokeWidth="1.2" fill="none" />
            </g>

            <path d="M 10,-8 Q 60,-18 115,-8" fill="none" stroke="#ca8a04" strokeWidth="1.5" />
            <ellipse cx="25" cy="-7" rx="5" ry="7" fill="#ef4444" filter="url(#bloomHigh)" />
            <circle cx="25" cy="-7" r="1.8" fill="#ffffff" />
            <ellipse cx="50" cy="-11" rx="5.5" ry="7.5" fill="#f59e0b" filter="url(#bloomHigh)" />
            <circle cx="50" cy="-11" r="1.8" fill="#ffffff" />
            <ellipse cx="75" cy="-11" rx="5.5" ry="7.5" fill="#10b981" filter="url(#bloomHigh)" />
            <circle cx="75" cy="-11" r="1.8" fill="#ffffff" />
            <ellipse cx="100" cy="-7" rx="5" ry="7" fill="#ec4899" filter="url(#bloomHigh)" />
            <circle cx="100" cy="-7" r="1.8" fill="#ffffff" />

            <g transform="translate(42, 2)">
                <circle cx="0" cy="-5" r="3.5" fill="#fed7aa" /><path d="M -4,-2 L 4,-2 L 5,9 L -5,9 Z" fill="#b91c1c" />
            </g>
            <g transform="translate(58, 2)">
                <circle cx="0" cy="-5" r="3.5" fill="#fbcfe8" /><path d="M -4,-2 L 4,-2 L 5,9 L -5,9 Z" fill="#c026d3" />
            </g>
            <g transform="translate(74, 4)">
                <circle cx="0" cy="-4" r="2.8" fill="#fed7aa" /><path d="M -3,-1 L 3,-1 L 3.5,7 L -3.5,7 Z" fill="#eab308" />
                <line x1="2" y1="0" x2="8" y2="-6" stroke="#78350f" strokeWidth="1" />
                <polygon points="8,-10 9,-7 12,-7 10,-5 11,-2 8,-4 5,-2 6,-5 4,-7 7,-7" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>

            <g transform="translate(6, -6)">
                <path d="M -11,-6 L 11,-6 L 0,-18 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <path d="M 0,-4 L 3,18" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
                <ellipse cx="1" cy="2" rx="4.5" ry="6.5" fill="#1e293b" />
                <g className="animate-oar-row">
                    <line x1="4" y1="6" x2="-32" y2="42" stroke="#5c3818" strokeWidth="3" strokeLinecap="round" />
                    <path d="M -32,42 L -44,52" stroke="#854d0e" strokeWidth="5.5" strokeLinecap="round" />
                </g>
            </g>

            <ellipse cx="60" cy="32" rx="35" ry="6" fill="#f59e0b" opacity="0.5" filter="url(#bloomSoft)" />
        </g>
    `;
}

// 3. TOÀN BỘ 12 LÀN THUYỀN GHE XUỒNG TẤP NẬP ĐAN XEN
const superBustlingBoats = `
    {/* ============================================================================== */}
    {/* 12 CHIẾC THUYỀN GHE XUỒNG TẤP NẬP LIÊN TỤC CHÈO ĐAN XEN THEO CẢ 2 HƯỚNG        */}
    {/* ============================================================================== */}

    {/* LÀN 1: TẦNG XA (y=620, scale=0.85) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-lr-1a">
        ${createSampanCanopy({ lanternColor: '#ef4444', hasPassenger: true, passengerType: 'couple' })}
    </g>
    <g className="animate-boat-lr-1b">
        ${createLightCanoe({ lanternColor: '#06b6d4', rowerHat: '#fef08a', passengerColor: '#ec4899' })}
    </g>

    {/* LÀN 2: TẦNG XA NGƯỢC CHIỀU (y=585, scale=0.70) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-rl-1a">
        ${createLightCanoe({ lanternColor: '#f59e0b', rowerHat: '#fde047', hasPassenger: false })}
    </g>
    <g className="animate-boat-rl-1b">
        ${createSampanCanopy({ lanternColor: '#ec4899', hasPassenger: true, passengerType: 'family', wakeColor: '#fde047' })}
    </g>

    {/* LÀN 3: TẦNG TRUNG XUÔI DÒNG (y=730, scale=1.15) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-lr-2a">
        ${createMerchantBoat({ lantern1: '#ef4444', lantern2: '#f59e0b' })}
    </g>
    <g className="animate-boat-lr-2b">
        ${createSampanCanopy({ lanternColor: '#f59e0b', hasPassenger: true, passengerType: 'flower_releaser', wakeColor: '#fef08a' })}
    </g>

    {/* LÀN 4: TẦNG TRUNG NGƯỢC CHIỀU (y=675, scale=1.02) - 2 thuyền nối tiếp nhau */}
    <g className="animate-boat-rl-2a">
        ${createSampanCanopy({ lanternColor: '#10b981', hasPassenger: true, passengerType: 'couple', wakeColor: '#38bdf8' })}
    </g>
    <g className="animate-boat-rl-2b">
        ${createLightCanoe({ lanternColor: '#ef4444', rowerHat: '#fde047', passengerColor: '#3b82f6' })}
    </g>

    {/* LÀN 5: TẦNG GẦN XUÔI DÒNG (y=860, scale=1.42 - CẬN CẢNH) - 2 thuyền bề thế */}
    <g className="animate-boat-lr-3a">
        ${createDragonRoyalBoat()}
    </g>
    <g className="animate-boat-lr-3b">
        ${createMerchantBoat({ lantern1: '#f59e0b', lantern2: '#10b981' })}
    </g>

    {/* LÀN 6: TẦNG GẦN NGƯỢC CHIỀU (y=795, scale=1.28 - GIAO THOA CẬN CẢNH) */}
    <g className="animate-boat-rl-3a">
        ${createLightCanoe({ lanternColor: '#ec4899', rowerHat: '#fef08a', passengerColor: '#eab308' })}
    </g>
    <g className="animate-boat-rl-3b">
        ${createSampanCanopy({ lanternColor: '#ef4444', hasPassenger: true, passengerType: 'flower_releaser', wakeColor: '#fef08a' })}
    </g>
`;

// 4. TOÀN BỘ ĐÔNG ĐÚC BỜ KÈ: ĐOÀN MÚA LÂN, ĐOÀN RƯỚC ĐÈN, GIA ĐÌNH, 4 BẬC THỀM THẢ HOA ĐĂNG
const superCrowdedPromenade = `
    {/* ============================================================================== */}
    {/* BỜ KÈ ĐÁ BẠCH ĐẰNG: ĐÔNG ĐÚC DÒNG NGƯỜI RƯỚC ĐÈN, ĐOÀN MÚA LÂN & THẢ HOA ĐĂNG  */}
    {/* ============================================================================== */}
    <g id="hoian-super-crowded-promenade">
        {/* Lòng đường đá phố đi bộ ven sông */}
        <polygon points="0,538 1920,538 1920,565 0,565" fill="#0f172a" />
        <line x1="0" y1="538" x2="1920" y2="538" stroke="#94a3b8" strokeWidth="1.8" opacity="0.9" />

        {/* Hàng lan can cột đá bờ kè chăng đèn lồng */}
        <g fill="#241002">
            ${[60, 180, 310, 440, 580, 710, 850, 990, 1120, 1260, 1400, 1540, 1680, 1820].map((x, idx) => {
                const colors = ['#ef4444', '#f59e0b', '#06b6d4', '#c026d3', '#10b981', '#f43f5e'];
                const col = colors[idx % colors.length];
                return `<rect x="${x}" y="522" width="10" height="28" rx="2" /><circle cx="${x + 5}" cy="522" r="5.5" fill="${col}" filter="url(#bloomSoft)" />`;
            }).join('\n            ')}
        </g>

        {/* 4 BẬC THỀM ĐÁ TAM CẤP DỌC BỜ SÔNG VỚI ĐÔNG ĐÚC NGƯỜI THẢ HOA ĐĂNG */}

        {/* BẬC THỀM 1 (x: 210 - 275) */}
        <polygon points="215,538 275,538 280,568 210,568" fill="#1e293b" />
        <line x1="213" y1="548" x2="277" y2="548" stroke="#64748b" strokeWidth="1.4" />
        <line x1="211" y1="558" x2="279" y2="558" stroke="#64748b" strokeWidth="1.4" />
        <g transform="translate(235, 522)" className="animate-release-person">
            <path d="M -11,-7 L 11,-7 L 0,-18 Z" fill="#fef08a" stroke="#b45309" strokeWidth="0.9" />
            <ellipse cx="0" cy="7" rx="6" ry="14" fill="#ec4899" />
            <path d="M -3,8 Q 5,22 14,25" stroke="#ec4899" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <g transform="translate(16, 26)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="4" rx="9" ry="3.5" fill="#f43f5e" opacity="0.85" />
                <circle cx="0" cy="2" r="4.2" fill="url(#haCandleFlame)" />
            </g>
        </g>
        <g transform="translate(258, 516)">
            <circle cx="0" cy="-14" r="4.2" fill="#fed7aa" />
            <path d="M 0,-10 L 0,20" stroke="#0284c7" strokeWidth="6" strokeLinecap="round" />
            <line x1="2" y1="-2" x2="10" y2="6" stroke="#78350f" strokeWidth="1.4" />
            <g transform="translate(10, 8)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* BẬC THỀM 2 (x: 510 - 575) */}
        <polygon points="515,538 575,538 580,568 510,568" fill="#1e293b" />
        <line x1="513" y1="548" x2="577" y2="548" stroke="#64748b" strokeWidth="1.4" />
        <line x1="511" y1="558" x2="579" y2="558" stroke="#64748b" strokeWidth="1.4" />
        <g transform="translate(535, 524)" className="animate-release-person">
            <path d="M -11,-7 L 11,-7 L 0,-18 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.9" />
            <ellipse cx="0" cy="7" rx="6" ry="14" fill="#059669" />
            <path d="M -3,8 Q 5,22 14,25" stroke="#059669" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <g transform="translate(16, 26)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="4" rx="9" ry="3.5" fill="#f59e0b" opacity="0.9" />
                <circle cx="0" cy="2" r="4.2" fill="url(#haCandleFlame)" />
            </g>
        </g>
        <g transform="translate(555, 532)" className="animate-release-person">
            <circle cx="0" cy="-6" r="3.2" fill="#fed7aa" /><ellipse cx="0" cy="2" rx="4" ry="6.5" fill="#dc2626" />
        </g>

        {/* BẬC THỀM 3 (x: 1120 - 1185) */}
        <polygon points="1125,538 1185,538 1190,568 1120,568" fill="#1e293b" />
        <line x1="1123" y1="548" x2="1187" y2="548" stroke="#64748b" strokeWidth="1.4" />
        <line x1="1121" y1="558" x2="1189" y2="558" stroke="#64748b" strokeWidth="1.4" />
        <g transform="translate(1145, 522)" className="animate-release-person">
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            <ellipse cx="0" cy="6" rx="5.5" ry="15" fill="#0d9488" />
            <path d="M 0,4 Q 8,18 16,24" stroke="#0d9488" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <g transform="translate(18, 25)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="3" rx="9" ry="3.2" fill="#c026d3" opacity="0.85" />
                <circle cx="0" cy="1" r="4" fill="url(#haCandleFlame)" />
            </g>
        </g>
        <g transform="translate(1168, 518)">
            <circle cx="0" cy="-13" r="4.2" fill="#fbcfe8" /><path d="M 0,-9 L 0,20" stroke="#db2777" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(10, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* BẬC THỀM 4 (x: 1560 - 1625) */}
        <polygon points="1565,538 1625,538 1630,568 1560,568" fill="#1e293b" />
        <line x1="1563" y1="548" x2="1627" y2="548" stroke="#64748b" strokeWidth="1.4" />
        <line x1="1561" y1="558" x2="1629" y2="558" stroke="#64748b" strokeWidth="1.4" />
        <g transform="translate(1585, 522)" className="animate-release-person">
            <path d="M -11,-7 L 11,-7 L 0,-18 Z" fill="#fef08a" stroke="#b45309" strokeWidth="0.9" />
            <ellipse cx="0" cy="7" rx="6" ry="14" fill="#ca8a04" />
            <path d="M -3,8 Q 5,22 14,25" stroke="#ca8a04" strokeWidth="4.5" fill="none" strokeLinecap="round" />
            <g transform="translate(16, 26)" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="4" rx="9" ry="3.5" fill="#f43f5e" opacity="0.9" />
                <circle cx="0" cy="2" r="4.2" fill="url(#haCandleFlame)" />
            </g>
        </g>


        {/* ĐOÀN MÚA LÂN MINI TRUNG THU RỘN RÃ TRÊN PHỐ (x: 940 - 1040) */}
        <g transform="translate(970, 508)" className="animate-lion-dance">
            {/* Đầu lân đỏ vàng kim sa nhấp nhô */}
            <path d="M -12,-16 Q 0,-26 14,-16 Q 18,-6 10,0 Q 0,4 -10,0 Z" fill="#dc2626" stroke="#ca8a04" strokeWidth="1.5" />
            <circle cx="-3" cy="-10" r="3.5" fill="#fef08a" /><circle cx="-3" cy="-10" r="1.8" fill="#1e293b" />
            <circle cx="7" cy="-10" r="3.5" fill="#fef08a" /><circle cx="7" cy="-10" r="1.8" fill="#1e293b" />
            <path d="M -8,-3 Q 2,4 10,-3" stroke="#ffffff" strokeWidth="2.5" fill="none" />
            {/* Mình lân kim sa đỏ vàng và chân lân */}
            <path d="M -10,0 Q -24,-2 -32,10 L -28,22 L -8,22 Z" fill="#b91c1c" />
            <path d="M -8,2 Q -18,0 -24,8" stroke="#f59e0b" strokeWidth="2" fill="none" />
        </g>
        <g transform="translate(940, 514)">
            {/* Ông Địa cầm quạt mo phe phẩy đi trước dẫn đường */}
            <circle cx="0" cy="-12" r="5" fill="#fed7aa" />
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            <ellipse cx="0" cy="4" rx="6.5" ry="9" fill="#eab308" />
            <g transform="translate(5, 0)" className="animate-ong-dia-fan">
                <path d="M 0,0 L 8,-6 Q 14,-2 10,6 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
            </g>
        </g>
        <g transform="translate(1015, 515)">
            {/* Em bé đánh trống quân tùng cắc tùng */}
            <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
            <path d="M 0,-7 L 0,16" stroke="#ea580c" strokeWidth="5.5" strokeLinecap="round" />
            <ellipse cx="5" cy="4" rx="4.5" ry="3.5" fill="#dc2626" stroke="#ca8a04" strokeWidth="1" />
        </g>


        {/* DÒNG NGƯỜI RƯỚC ĐÈN, DẠO PHỐ ĐÔNG ĐÚC SUỐT DỌC BỜ KÈ */}

        {/* Cụ già và cháu nhỏ rước đèn (x: 40 - 90) */}
        <g transform="translate(50, 506)">
            <circle cx="0" cy="-16" r="4.2" fill="#fed7aa" /><path d="M 0,-11 L 0,24" stroke="#475569" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="4" y1="-2" x2="6" y2="24" stroke="#78350f" strokeWidth="1.8" />
        </g>
        <g transform="translate(75, 515)">
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" /><path d="M 0,-6 L 0,15" stroke="#f43f5e" strokeWidth="5" strokeLinecap="round" />
            <line x1="2" y1="-2" x2="10" y2="-10" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(10, -12)" className="animate-hand-lantern">
                <polygon points="0,-8 2,-2.5 7,-2.5 3.5,1 5,6 0,2.5 -5,6 -3.5,1 -7,-2.5 -2,-2.5" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
            </g>
        </g>

        {/* 3 em bé rước đèn cá chép, đèn bướm, đèn cù (x: 120 - 180) */}
        <g transform="translate(130, 514)">
            <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" /><path d="M 0,-7 L 0,16" stroke="#0284c7" strokeWidth="5.5" strokeLinecap="round" />
            <line x1="3" y1="-2" x2="12" y2="-10" stroke="#78350f" strokeWidth="1.3" />
            <g transform="translate(12, -12)" className="animate-hand-lantern">
                <polygon points="0,-9 2.5,-3 8,-3 4,1 6,7 0,3 -6,7 -4,1 -8,-3 -2.5,-3" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="2" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(155, 516)">
            <circle cx="0" cy="-10" r="3.6" fill="#fbcfe8" /><path d="M 0,-6 L 0,15" stroke="#db2777" strokeWidth="5" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="10" y2="-8" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(12, -7)" className="animate-hand-lantern">
                <ellipse cx="0" cy="0" rx="6" ry="3.5" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(178, 515)">
            <circle cx="0" cy="-10" r="3.5" fill="#fed7aa" /><path d="M 0,-6 L 0,15" stroke="#10b981" strokeWidth="4.8" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="8" y2="-8" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(8, -8)" className="animate-hand-lantern">
                <circle cx="0" cy="0" r="4.2" fill="#38bdf8" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* Gia đình 4 người rước đèn (x: 320 - 390) */}
        <g transform="translate(330, 508)">
            <circle cx="0" cy="-15" r="4.5" fill="#fed7aa" /><path d="M 0,-10 L 0,22" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            <line x1="3" y1="-2" x2="12" y2="4" stroke="#78350f" strokeWidth="1.5" />
            <g transform="translate(12, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(352, 510)">
            <circle cx="0" cy="-14" r="4.2" fill="#fbcfe8" /><path d="M 0,-9 L 0,21" stroke="#e11d48" strokeWidth="5.5" strokeLinecap="round" />
        </g>
        <g transform="translate(372, 516)">
            <circle cx="0" cy="-9" r="3.4" fill="#fed7aa" /><path d="M 0,-5 L 0,14" stroke="#eab308" strokeWidth="4.5" strokeLinecap="round" />
            <line x1="2" y1="-1" x2="8" y2="-6" stroke="#78350f" strokeWidth="1.1" />
            <g transform="translate(8, -6)" className="animate-hand-lantern">
                <circle cx="0" cy="0" r="3.5" fill="#ec4899" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* Đôi bạn trẻ áo bà ba (x: 430 - 480) */}
        <g transform="translate(440, 510)">
            <circle cx="0" cy="-15" r="4.5" fill="#fed7aa" /><path d="M 0,-10 L 0,22" stroke="#0369a1" strokeWidth="6" strokeLinecap="round" />
            <line x1="3" y1="-2" x2="12" y2="4" stroke="#78350f" strokeWidth="1.5" />
            <g transform="translate(12, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(465, 512)">
            <circle cx="0" cy="-14" r="4.2" fill="#fed7aa" /><path d="M 0,-9 L 0,20" stroke="#059669" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(8, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="5.5" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* Nhóm thiếu nữ áo dài hoa sen (x: 640 - 740) */}
        <g transform="translate(650, 508)">
            <circle cx="0" cy="-16" r="4.5" fill="#fed7aa" /><path d="M 0,-11 L 0,24" stroke="#dc2626" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(12, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.8" ry="7" fill="#f43f5e" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(675, 509)">
            <circle cx="0" cy="-15" r="4.4" fill="#fed7aa" /><path d="M 0,-10 L 0,23" stroke="#ca8a04" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(12, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.8" ry="7" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(700, 510)">
            <circle cx="0" cy="-15" r="4.3" fill="#fed7aa" /><path d="M 0,-10 L 0,22" stroke="#0d9488" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(12, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#06b6d4" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(725, 512)">
            <circle cx="0" cy="-14" r="4.2" fill="#fbcfe8" /><path d="M 0,-9 L 0,21" stroke="#9333ea" strokeWidth="5.2" strokeLinecap="round" />
            <g transform="translate(10, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4.2" ry="6" fill="#ec4899" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* Nhóm thanh niên rước đèn ông sao lớn (x: 780 - 860) */}
        <g transform="translate(800, 508)">
            <circle cx="0" cy="-15" r="4.5" fill="#fed7aa" /><path d="M 0,-10 L 0,22" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            <line x1="3" y1="-4" x2="16" y2="-16" stroke="#78350f" strokeWidth="1.8" />
            <g transform="translate(16, -18)" className="animate-hand-lantern">
                <polygon points="0,-12 3.5,-4 11,-4 5,2 8,10 0,4 -8,10 -5,2 -11,-4 -3.5,-4" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="3" fill="#fef08a" />
            </g>
        </g>
        <g transform="translate(835, 510)">
            <circle cx="0" cy="-15" r="4.4" fill="#fed7aa" /><path d="M 0,-10 L 0,22" stroke="#c2410c" strokeWidth="5.8" strokeLinecap="round" />
            <g transform="translate(10, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* Nhóm gia đình trẻ kiệu bé lên vai (x: 1240 - 1310) */}
        <g transform="translate(1260, 508)">
            {/* Người cha cõng bé gái trên vai */}
            <circle cx="0" cy="-15" r="4.6" fill="#fed7aa" /><path d="M 0,-10 L 0,23" stroke="#334155" strokeWidth="6.5" strokeLinecap="round" />
            {/* Bé gái ngồi trên vai cha cầm đèn thỏ ngọc */}
            <circle cx="0" cy="-28" r="3.2" fill="#fed7aa" />
            <line x1="3" y1="-26" x2="12" y2="-32" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(12, -32)" className="animate-hand-lantern">
                <ellipse cx="0" cy="0" rx="4.5" ry="3.5" fill="#ffffff" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="1.5" fill="#fef08a" />
            </g>
        </g>
        <g transform="translate(1285, 511)">
            {/* Người mẹ nón lá đi bên cạnh */}
            <path d="M -10,-6 L 10,-6 L 0,-16 Z" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
            <path d="M 0,-4 L 2,21" stroke="#059669" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(10, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* Nhóm bạn trẻ đứng tựa lan can chỉ tay ngắm hoa đăng (x: 1360 - 1470) */}
        <g transform="translate(1380, 512)">
            <circle cx="0" cy="-14" r="4.3" fill="#fed7aa" /><path d="M 0,-9 L 0,21" stroke="#0284c7" strokeWidth="5.8" strokeLinecap="round" />
            <line x1="2" y1="-2" x2="10" y2="10" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(1405, 513)">
            <circle cx="0" cy="-13" r="4.2" fill="#fed7aa" /><path d="M 0,-8 L 0,20" stroke="#f43f5e" strokeWidth="5.2" strokeLinecap="round" />
            <g transform="translate(8, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1430, 512)">
            <circle cx="0" cy="-14" r="4.4" fill="#fed7aa" /><path d="M 0,-9 L 0,21" stroke="#15803d" strokeWidth="5.8" strokeLinecap="round" />
        </g>
        <g transform="translate(1455, 514)">
            <circle cx="0" cy="-13" r="4" fill="#fbcfe8" /><path d="M 0,-8 L 0,19" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
            <g transform="translate(8, 4)" className="animate-hand-lantern">
                <circle cx="0" cy="0" r="4" fill="#38bdf8" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* Dòng người rước đèn phía hạ lưu (x: 1660 - 1900) */}
        <g transform="translate(1680, 510)">
            <circle cx="0" cy="-15" r="4.5" fill="#fed7aa" /><path d="M 0,-10 L 0,22" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
            <g transform="translate(12, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1710, 512)">
            <circle cx="0" cy="-14" r="4.2" fill="#fbcfe8" /><path d="M 0,-9 L 0,21" stroke="#be185d" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(10, 5)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1740, 513)">
            <circle cx="0" cy="-13" r="4" fill="#fed7aa" /><path d="M 0,-8 L 0,20" stroke="#059669" strokeWidth="5.2" strokeLinecap="round" />
            <g transform="translate(8, -6)" className="animate-hand-lantern">
                <polygon points="0,-7 2,-2 6,-2 3,1 4,5 0,2 -4,5 -3,1 -6,-2 -2,-2" fill="#f43f5e" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1780, 511)">
            <circle cx="0" cy="-14" r="4.3" fill="#fed7aa" /><path d="M 0,-9 L 0,21" stroke="#d97706" strokeWidth="5.5" strokeLinecap="round" />
            <g transform="translate(10, 5)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#10b981" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1820, 512)">
            <circle cx="0" cy="-14" r="4.2" fill="#fbcfe8" /><path d="M 0,-9 L 0,21" stroke="#ec4899" strokeWidth="5.2" strokeLinecap="round" />
            <g transform="translate(10, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1860, 510)">
            <circle cx="0" cy="-15" r="4.5" fill="#fed7aa" /><path d="M 0,-10 L 0,22" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
            <g transform="translate(10, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
    </g>
    </g>
`;

// 5. TOÀN BỘ 50+ ĐÓA HOA ĐĂNG SEN RỰC RỠ DÀY ĐẶC
function generateSuperDenseHoaDang() {
    const items = [
        // LỚP XA (y = 585 .. 635, scale = 0.52 .. 0.75)
        { x: 180, y: 600, s: 0.60, c: '#f43f5e', a: '1' },
        { x: 290, y: 592, s: 0.55, c: '#f59e0b', a: '2' },
        { x: 380, y: 615, s: 0.68, c: '#06b6d4', a: '3' },
        { x: 470, y: 598, s: 0.58, c: '#f43f5e', a: '1' },
        { x: 560, y: 610, s: 0.65, c: '#c026d3', a: '2' },
        { x: 670, y: 595, s: 0.56, c: '#f59e0b', a: '3' },
        { x: 760, y: 618, s: 0.70, c: '#ec4899', a: '1' },
        { x: 850, y: 602, s: 0.62, c: '#10b981', a: '2' },
        { x: 940, y: 615, s: 0.68, c: '#f43f5e', a: '3' },
        { x: 1040, y: 595, s: 0.58, c: '#f59e0b', a: '1' },
        { x: 1140, y: 612, s: 0.66, c: '#06b6d4', a: '2' },
        { x: 1240, y: 602, s: 0.60, c: '#c026d3', a: '3' },
        { x: 1330, y: 618, s: 0.72, c: '#f43f5e', a: '1' },
        { x: 1430, y: 596, s: 0.57, c: '#f59e0b', a: '2' },
        { x: 1530, y: 614, s: 0.68, c: '#ec4899', a: '3' },
        { x: 1630, y: 604, s: 0.62, c: '#06b6d4', a: '1' },
        { x: 1730, y: 616, s: 0.70, c: '#f43f5e', a: '2' },
        { x: 1830, y: 602, s: 0.60, c: '#f59e0b', a: '3' },

        // LỚP TRUNG (y = 645 .. 765, scale = 0.85 .. 1.25)
        { x: 140, y: 670, s: 0.92, c: '#f43f5e', a: '2' },
        { x: 260, y: 725, s: 1.15, c: '#f59e0b', a: '1' },
        { x: 370, y: 665, s: 0.95, c: '#06b6d4', a: '3' },
        { x: 480, y: 740, s: 1.20, c: '#ec4899', a: '2' },
        { x: 590, y: 680, s: 1.02, c: '#f43f5e', a: '1' },
        { x: 690, y: 735, s: 1.18, c: '#f59e0b', a: '3' },
        { x: 800, y: 675, s: 0.98, c: '#c026d3', a: '2' },
        { x: 910, y: 745, s: 1.22, c: '#f43f5e', a: '1' },
        { x: 1020, y: 685, s: 1.05, c: '#06b6d4', a: '3' },
        { x: 1120, y: 730, s: 1.16, c: '#f59e0b', a: '2' },
        { x: 1220, y: 670, s: 0.96, c: '#ec4899', a: '1' },
        { x: 1320, y: 740, s: 1.20, c: '#f43f5e', a: '3' },
        { x: 1420, y: 680, s: 1.00, c: '#f59e0b', a: '2' },
        { x: 1520, y: 735, s: 1.18, c: '#06b6d4', a: '1' },
        { x: 1620, y: 675, s: 0.98, c: '#c026d3', a: '3' },
        { x: 1720, y: 745, s: 1.22, c: '#f43f5e', a: '2' },
        { x: 1840, y: 685, s: 1.05, c: '#f59e0b', a: '1' },

        // LỚP GẦN TIỀN CẢNH (y = 785 .. 980, scale = 1.35 .. 1.80)
        { x: 110, y: 830, s: 1.38, c: '#f43f5e', a: '1' },
        { x: 240, y: 910, s: 1.55, c: '#f59e0b', a: '3' },
        { x: 390, y: 850, s: 1.42, c: '#06b6d4', a: '2' },
        { x: 530, y: 940, s: 1.65, c: '#ec4899', a: '1' },
        { x: 680, y: 865, s: 1.46, c: '#f43f5e', a: '3' },
        { x: 820, y: 960, s: 1.72, c: '#f59e0b', a: '2' },
        { x: 960, y: 880, s: 1.48, c: '#c026d3', a: '1' },
        { x: 1100, y: 950, s: 1.68, c: '#f43f5e', a: '3' },
        { x: 1250, y: 870, s: 1.45, c: '#06b6d4', a: '2' },
        { x: 1390, y: 965, s: 1.75, c: '#f59e0b', a: '1' },
        { x: 1530, y: 885, s: 1.50, c: '#ec4899', a: '3' },
        { x: 1670, y: 940, s: 1.64, c: '#f43f5e', a: '2' },
        { x: 1810, y: 890, s: 1.52, c: '#f59e0b', a: '1' }
    ];

    return `
    {/* ============================================================================== */}
    {/* DẢI NGÂN HÀ 50+ ĐÓA HOA ĐĂNG SEN RỰC RỠ DẬP DỀNH THEO SÓNG NƯỚC SÔNG HOÀI      */}
    {/* ============================================================================== */}
    <g id="hoian-super-dense-hoa-dang-stream">
        ${items.map(it => `
        <g className="animate-hoa-dang-${it.a}">
            <g transform="translate(${it.x}, ${it.y}) scale(${it.s})" filter="url(#bloomHigh)">
                <ellipse cx="0" cy="12" rx="22" ry="5" fill="${it.c}" opacity="0.45" />
                <ellipse cx="0" cy="12" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                <polygon points="-16,4 -10,8 10,8 16,4 12,-1 -12,-1" fill="#451a03" opacity="0.85" />
                <path d="M -16,4 Q -8,-10 0,-16 Q 8,-10 16,4 Z" fill="${it.c}" opacity="0.9" />
                <path d="M -12,5 Q -5,-7 0,-12 Q 5,-7 12,5 Z" fill="#fda4af" />
                <path d="M -7,6 Q 0,-5 7,6 Z" fill="#ffffff" opacity="0.92" />
                <ellipse cx="0" cy="-7" rx="3.6" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-6" r="1.6" fill="#ffffff" />
            </g>
        </g>
        `).join('\n')}
    </g>
    `;
}

// 6. THAY THẾ TOÀN BỘ KHỐI TỪ BỜ KÈ CŨ ĐẾN HẾT HOA ĐĂNG CŨ
const startMarker = '{/* BỜ KÈ ĐÁ VÀ DÒNG NGƯỜI CẦM LỒNG ĐÈN ĐI CHƠI TRUNG THU';
const startIndex = code.indexOf(startMarker);
if (startIndex === -1) {
    console.error('Could not find startMarker');
    process.exit(1);
}

// Tìm điểm bắt đầu song-hoai-fluid:
const songHoaiFluidMarker = '<g id="song-hoai-fluid">';
const songHoaiFluidIndex = code.indexOf(songHoaiFluidMarker, startIndex);
if (songHoaiFluidIndex === -1) {
    console.error('Could not find songHoaiFluidMarker');
    process.exit(1);
}

// Lấy phần mặt nước sóng nền từ <g id="song-hoai-fluid"> đến hết </g></g>
const boatsStartMarker = '{/* CÁC LÀN THUYỀN GHE XUỒNG TẤP NẬP ĐA DẠNG';
const boatsStartIndex = code.indexOf(boatsStartMarker, songHoaiFluidIndex);
if (boatsStartIndex === -1) {
    console.error('Could not find boatsStartMarker');
    process.exit(1);
}

const waterBg = code.substring(songHoaiFluidIndex, boatsStartIndex);

// Tìm điểm kết thúc hoa đăng:
const endMarker = '<rect x="360" y="320" width="1200" height="660" rx="32" fill="url(#haCardAreaDarken)"';
const endIndex = code.indexOf(endMarker);
if (endIndex === -1) {
    console.error('Could not find endMarker');
    process.exit(1);
}

const combinedNewBlock = `
${superCrowdedPromenade.trim()}

${waterBg.trim()}

${superBustlingBoats.trim()}

${generateSuperDenseHoaDang().trim()}
`;

code = code.substring(0, startIndex) + combinedNewBlock.trim() + '\n    ' + code.substring(endIndex);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Successfully updated MidAutumnSvgBackdrop.tsx with SUPER BUSTLING Hoi An scene!');
