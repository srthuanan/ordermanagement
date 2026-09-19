const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Check if CSS keyframes already exist or need insertion
const cssToInsert = `
                /* DÒNG NGƯỜI ĐI TỚI DỌC BỜ PHỐ (TRÁI -> PHẢI: L -> R) */
                @keyframes hoian-promenade-lr {
                    0% { transform: translateX(-350px); }
                    100% { transform: translateX(2250px); }
                }
                .animate-promenade-lr-1 { animation: hoian-promenade-lr 64s linear infinite -10s; }
                .animate-promenade-lr-2 { animation: hoian-promenade-lr 72s linear infinite -28s; }
                .animate-promenade-lr-3 { animation: hoian-promenade-lr 60s linear infinite -46s; }
                .animate-promenade-lr-4 { animation: hoian-promenade-lr 76s linear infinite -62s; }

                /* DÒNG NGƯỜI ĐI LUI DỌC BỜ PHỐ (PHẢI -> TRÁI: R -> L) - LẬT HƯỚNG MẶT scale(-1, 1) */
                @keyframes hoian-promenade-rl {
                    0% { transform: translateX(2250px) scale(-1, 1); }
                    100% { transform: translateX(-350px) scale(-1, 1); }
                }
                .animate-promenade-rl-1 { animation: hoian-promenade-rl 58s linear infinite -14s; }
                .animate-promenade-rl-2 { animation: hoian-promenade-rl 68s linear infinite -32s; }
                .animate-promenade-rl-3 { animation: hoian-promenade-rl 62s linear infinite -48s; }
                .animate-promenade-rl-4 { animation: hoian-promenade-rl 70s linear infinite -64s; }

                /* Nhịp bước chân dạo phố nhấp nhô sống động */
                @keyframes hoian-footstep-bob-1 {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-2.2px); }
                }
                @keyframes hoian-footstep-bob-2 {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-1.8px); }
                }
                .animate-footstep-1 { animation: hoian-footstep-bob-1 0.9s ease-in-out infinite; }
                .animate-footstep-2 { animation: hoian-footstep-bob-2 1.05s ease-in-out infinite 0.35s; }
                .animate-footstep-3 { animation: hoian-footstep-bob-1 1.15s ease-in-out infinite 0.6s; }
`;

if (!content.includes('hoian-promenade-lr')) {
    const cssAnchor = '.animate-ong-dia-fan {';
    const cssAnchorIdx = content.indexOf(cssAnchor);
    if (cssAnchorIdx === -1) {
        throw new Error('Cannot find CSS anchor .animate-ong-dia-fan');
    }
    const endOfBlock = content.indexOf('}', cssAnchorIdx) + 1;
    content = content.slice(0, endOfBlock) + cssToInsert + content.slice(endOfBlock);
    console.log('Successfully inserted promenade walking CSS keyframes!');
}

// 2. Build the walking promenade JSX
const walkingPromenadeJSX = `
        {/* ============================================================================== */}
        {/* DÒNG NGƯỜI DẠO PHỐ ĐI TỚI LUI (ĐAN XEN 2 HƯỚNG TRÁI <-> PHẢI, BƯỚC CHÂN SỐNG ĐỘNG) */}
        {/* ============================================================================== */}

        {/* HƯỚNG ĐI TỚI 1: TỐP TRẺ EM & CỤ GIÀ RƯỚC ĐÈN (L -> R) */}
        <g className="animate-promenade-lr-1">
            <g transform="translate(0, 508)" className="animate-footstep-1">
                {/* Cụ già chống gậy trúc */}
                <circle cx="0" cy="-14" r="3.8" fill="#fed7aa" />
                <ellipse cx="0" cy="-17" rx="4" ry="2" fill="#1e293b" />
                <path d="M -4,-9 L 4,-9 L 5,20 L -5,20 Z" fill="#334155" />
                <line x1="4" y1="-2" x2="6" y2="24" stroke="#78350f" strokeWidth="1.6" />
            </g>
            <g transform="translate(26, 514)" className="animate-footstep-2">
                {/* Bé trai mặc áo gấm đỏ cầm đèn ông sao */}
                <circle cx="0" cy="-10" r="3.5" fill="#fed7aa" />
                <path d="M -3,-6 L 3,-6 L 4,14 L -4,14 Z" fill="#dc2626" />
                <line x1="2" y1="-2" x2="11" y2="-11" stroke="#78350f" strokeWidth="1.3" />
                <g transform="translate(11, -13)" className="animate-hand-lantern">
                    <polygon points="0,-9 2.5,-3 8,-3 4,1 6,7 0,3 -6,7 -4,1 -8,-3 -2.5,-3" fill="#ef4444" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="0" r="2.2" fill="#fef08a" />
                </g>
            </g>
            <g transform="translate(62, 513)" className="animate-footstep-3">
                {/* Bé đội nón lá nhỏ cầm đèn kéo quân */}
                <polygon points="-7,-11 7,-11 0,-18" fill="#fef08a" stroke="#78350f" strokeWidth="0.7" />
                <circle cx="0" cy="-10" r="3.2" fill="#fed7aa" />
                <path d="M -3,-6 L 3,-6 L 4,14 L -4,14 Z" fill="#0284c7" />
                <line x1="2" y1="-2" x2="10" y2="-9" stroke="#78350f" strokeWidth="1.2" />
                <g transform="translate(10, -11)" className="animate-hand-lantern">
                    <rect x="-3" y="-5" width="6" height="7" rx="1.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(90, 515)" className="animate-footstep-1">
                {/* Bé gái áo bà ba hồng cầm đèn cá chép uốn lượn */}
                <circle cx="0" cy="-10" r="3.4" fill="#fbcfe8" />
                <path d="M -3,-6 L 3,-6 L 4,14 L -4,14 Z" fill="#db2777" />
                <line x1="2" y1="-1" x2="11" y2="-7" stroke="#78350f" strokeWidth="1.2" />
                <g transform="translate(13, -6)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="0" rx="6.5" ry="3.8" fill="#f59e0b" filter="url(#bloomHigh)" />
                    <polygon points="6,0 10,-3 10,3" fill="#ef4444" />
                    <circle cx="-2" cy="-1" r="1" fill="#ffffff" />
                </g>
            </g>
            <g transform="translate(120, 514)" className="animate-footstep-2">
                {/* Bé trai cầm đèn bướm phát sáng */}
                <circle cx="0" cy="-10" r="3.3" fill="#fed7aa" />
                <path d="M -3,-6 L 3,-6 L 3.8,14 L -3.8,14 Z" fill="#10b981" />
                <line x1="2" y1="-1" x2="9" y2="-7" stroke="#78350f" strokeWidth="1.2" />
                <g transform="translate(9, -7)" className="animate-hand-lantern">
                    <ellipse cx="-2.5" cy="-2" rx="3" ry="4" fill="#38bdf8" filter="url(#bloomHigh)" />
                    <ellipse cx="2.5" cy="-2" rx="3" ry="4" fill="#38bdf8" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="0" r="1.5" fill="#fef08a" />
                </g>
            </g>
        </g>

        {/* HƯỚNG ĐI TỚI 2: TỨ ĐẠI THIẾU NỮ ÁO DÀI HỘI AN DẠO BƯỚC NÂNG LỒNG ĐÈN (L -> R) */}
        <g className="animate-promenade-lr-2">
            <g transform="translate(0, 507)" className="animate-footstep-1">
                {/* Thiếu nữ áo dài đỏ son nón lá */}
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5.5,21 L -5.5,21 Z" fill="#dc2626" />
                <path d="M 2,10 Q 7,16 9,21" stroke="#dc2626" strokeWidth="2.8" fill="none" />
                <g transform="translate(12, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="6" rx="4.8" ry="7" fill="#f43f5e" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="5" r="1.8" fill="#ffffff" />
                </g>
            </g>
            <g transform="translate(28, 508)" className="animate-footstep-2">
                {/* Thiếu nữ áo dài vàng hoàng gia */}
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5.5,21 L -5.5,21 Z" fill="#ca8a04" />
                <path d="M 2,10 Q 7,16 9,21" stroke="#ca8a04" strokeWidth="2.8" fill="none" />
                <g transform="translate(12, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="6" rx="4.8" ry="7" fill="#f59e0b" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="5" r="1.8" fill="#ffffff" />
                </g>
            </g>
            <g transform="translate(56, 509)" className="animate-footstep-3">
                {/* Thiếu nữ áo dài xanh ngọc bích */}
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.6" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5.5,20 L -5.5,20 Z" fill="#0d9488" />
                <path d="M 2,10 Q 7,16 9,20" stroke="#0d9488" strokeWidth="2.8" fill="none" />
                <g transform="translate(12, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#06b6d4" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="5" r="1.8" fill="#ffffff" />
                </g>
            </g>
            <g transform="translate(84, 511)" className="animate-footstep-1">
                {/* Thiếu nữ áo dài tím huế mộng mơ */}
                <polygon points="-8,-13 8,-13 0,-21" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-12" r="3.6" fill="#fbcfe8" />
                <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#9333ea" />
                <path d="M 2,10 Q 6,15 8,19" stroke="#9333ea" strokeWidth="2.5" fill="none" />
                <g transform="translate(10, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4.2" ry="6" fill="#ec4899" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="4" r="1.6" fill="#ffffff" />
                </g>
            </g>
        </g>

        {/* HƯỚNG ĐI TỚI 3: THANH NIÊN ĐẠI ĐĂNG ÔNG SAO & GIA ĐÌNH TRẺ (L -> R) */}
        <g className="animate-promenade-lr-3">
            <g transform="translate(0, 508)" className="animate-footstep-1">
                {/* Thanh niên giương cao đại đăng ông sao 5 cánh */}
                <circle cx="0" cy="-14" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#1e293b" />
                <line x1="3" y1="-4" x2="16" y2="-17" stroke="#78350f" strokeWidth="1.8" />
                <g transform="translate(16, -18)" className="animate-hand-lantern">
                    <polygon points="0,-12 3.5,-4 11,-4 5,2 8,10 0,4 -8,10 -5,2 -11,-4 -3.5,-4" fill="#ef4444" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="0" r="3.2" fill="#fef08a" />
                </g>
            </g>
            <g transform="translate(35, 509)" className="animate-footstep-2">
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#c2410c" />
                <g transform="translate(10, 6)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(75, 508)" className="animate-footstep-3">
                {/* Người cha kiệu bé gái lên vai cầm đèn thỏ ngọc */}
                <circle cx="0" cy="-14" r="4" fill="#fed7aa" />
                <path d="M -4.5,-8 L 4.5,-8 L 5.5,21 L -5.5,21 Z" fill="#334155" />
                <circle cx="0" cy="-26" r="3" fill="#fed7aa" />
                <line x1="2" y1="-24" x2="10" y2="-30" stroke="#78350f" strokeWidth="1.1" />
                <g transform="translate(10, -30)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="0" rx="4.2" ry="3.2" fill="#ffffff" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="0" r="1.4" fill="#fef08a" />
                </g>
            </g>
            <g transform="translate(105, 510)" className="animate-footstep-1">
                {/* Mẹ nón lá áo dài xanh lá ngọc */}
                <polygon points="-8,-13 8,-13 0,-21" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-12" r="3.6" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#059669" />
                <g transform="translate(10, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#ef4444" filter="url(#bloomHigh)" />
                </g>
            </g>
        </g>

        {/* HƯỚNG ĐI TỚI 4: ĐOÀN NGƯỜI NÓN LÁ RƯỚC ĐÈN HẠ LƯU (L -> R) */}
        <g className="animate-promenade-lr-4">
            <g transform="translate(0, 509)" className="animate-footstep-1">
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#334155" />
                <g transform="translate(12, 6)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(30, 511)" className="animate-footstep-2">
                <polygon points="-8,-13 8,-13 0,-21" fill="#fde047" stroke="#b45309" strokeWidth="0.8" />
                <circle cx="0" cy="-12" r="3.6" fill="#fbcfe8" />
                <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#be185d" />
                <g transform="translate(10, 5)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(60, 512)" className="animate-footstep-3">
                <circle cx="0" cy="-12" r="3.5" fill="#fed7aa" />
                <path d="M -3.5,-7 L 3.5,-7 L 4.5,19 L -4.5,19 Z" fill="#059669" />
                <g transform="translate(8, -6)" className="animate-hand-lantern">
                    <polygon points="0,-7 2,-2 6,-2 3,1 4,5 0,2 -4,5 -3,1 -6,-2 -2,-2" fill="#f43f5e" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(95, 510)" className="animate-footstep-1">
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#d97706" />
                <g transform="translate(10, 5)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#10b981" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(130, 511)" className="animate-footstep-2">
                <polygon points="-8,-13 8,-13 0,-21" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-12" r="3.6" fill="#fbcfe8" />
                <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#ec4899" />
                <g transform="translate(10, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#ef4444" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(165, 509)" className="animate-footstep-3">
                <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#1e293b" />
                <g transform="translate(10, 6)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
                </g>
            </g>
        </g>


        {/* HƯỚNG ĐI LUI 1: ĐOÀN MÚA LÂN TRUNG THU RỘN RÃ (R -> L) */}
        <g className="animate-promenade-rl-1">
            <g transform="translate(0, 514)" className="animate-footstep-1">
                {/* Ông Địa cầm quạt mo phe phẩy đi trước dẫn đường */}
                <circle cx="0" cy="-12" r="5" fill="#fed7aa" />
                <ellipse cx="0" cy="4" rx="6.5" ry="9" fill="#eab308" />
                <g transform="translate(5, 0)" className="animate-ong-dia-fan">
                    <path d="M 0,0 L 8,-6 Q 14,-2 10,6 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
                </g>
            </g>
            <g transform="translate(36, 508)" className="animate-lion-dance">
                {/* Đầu lân đỏ vàng kim sa nhấp nhô */}
                <path d="M -12,-16 Q 0,-26 14,-16 Q 18,-6 10,0 Q 0,4 -10,0 Z" fill="#dc2626" stroke="#ca8a04" strokeWidth="1.5" />
                <circle cx="-3" cy="-10" r="3.5" fill="#fef08a" /><circle cx="-3" cy="-10" r="1.8" fill="#1e293b" />
                <circle cx="7" cy="-10" r="3.5" fill="#fef08a" /><circle cx="7" cy="-10" r="1.8" fill="#1e293b" />
                <path d="M -8,-3 Q 2,4 10,-3" stroke="#ffffff" strokeWidth="2.5" fill="none" />
                {/* Mình lân kim sa đỏ vàng và chân lân */}
                <path d="M -10,0 Q -24,-2 -32,10 L -28,22 L -8,22 Z" fill="#b91c1c" />
                <path d="M -8,2 Q -18,0 -24,8" stroke="#f59e0b" strokeWidth="2" fill="none" />
            </g>
            <g transform="translate(80, 515)" className="animate-footstep-2">
                {/* Em bé đánh trống quân tùng cắc tùng */}
                <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
                <path d="M 0,-7 L 0,16" stroke="#ea580c" strokeWidth="5.5" strokeLinecap="round" />
                <ellipse cx="5" cy="4" rx="4.5" ry="3.5" fill="#dc2626" stroke="#ca8a04" strokeWidth="1" />
            </g>
        </g>

        {/* HƯỚNG ĐI LUI 2: GIA ĐÌNH 3 THẾ HỆ & ĐÔI BẠN TRẺ ÁO BÀ BA (R -> L) */}
        <g className="animate-promenade-rl-2">
            <g transform="translate(0, 508)" className="animate-footstep-1">
                {/* Người cha nón lá áo nâu truyền thống */}
                <polygon points="-8,-14 8,-14 0,-23" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#451a03" />
                <line x1="2" y1="-2" x2="11" y2="4" stroke="#78350f" strokeWidth="1.4" />
                <g transform="translate(11, 6)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="6" r="1.8" fill="#ffffff" />
                </g>
            </g>
            <g transform="translate(26, 509)" className="animate-footstep-2">
                {/* Người mẹ nón lá quai thao áo dài hồng thướt tha */}
                <polygon points="-8,-13 8,-13 0,-21" fill="#fde047" stroke="#b45309" strokeWidth="0.8" />
                <circle cx="0" cy="-12" r="3.6" fill="#fbcfe8" />
                <path d="M -4,-8 L 4,-8 L 5.5,19 L -5.5,19 Z" fill="#e11d48" />
                <path d="M 2,8 Q 6,14 8,19" stroke="#e11d48" strokeWidth="2.5" fill="none" />
            </g>
            <g transform="translate(48, 515)" className="animate-footstep-3">
                {/* Bé gái cầm đèn hoa sen vàng */}
                <circle cx="0" cy="-9" r="3.2" fill="#fed7aa" />
                <path d="M -3,-5 L 3,-5 L 3.5,13 L -3.5,13 Z" fill="#eab308" />
                <line x1="2" y1="-1" x2="8" y2="-6" stroke="#78350f" strokeWidth="1.1" />
                <g transform="translate(8, -6)" className="animate-hand-lantern">
                    <circle cx="0" cy="0" r="3.5" fill="#ec4899" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="0" r="1.4" fill="#ffffff" />
                </g>
            </g>
            <g transform="translate(85, 509)" className="animate-footstep-1">
                {/* Chàng trai áo bà ba dạo mát */}
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#0369a1" />
                <line x1="3" y1="-2" x2="12" y2="4" stroke="#78350f" strokeWidth="1.4" />
                <g transform="translate(12, 6)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="6" r="1.8" fill="#ffffff" />
                </g>
            </g>
            <g transform="translate(112, 511)" className="animate-footstep-2">
                <polygon points="-8,-13 8,-13 0,-21" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-12" r="3.6" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#059669" />
                <g transform="translate(8, 6)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="5.5" fill="#ef4444" filter="url(#bloomHigh)" />
                    <circle cx="0" cy="5" r="1.6" fill="#ffffff" />
                </g>
            </g>
        </g>

        {/* HƯỚNG ĐI LUI 3: NHÓM BẠN TRẺ NGẮM HOA ĐĂNG (R -> L) */}
        <g className="animate-promenade-rl-3">
            <g transform="translate(0, 510)" className="animate-footstep-1">
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#0284c7" />
                <line x1="2" y1="-2" x2="10" y2="10" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g transform="translate(26, 511)" className="animate-footstep-2">
                <circle cx="0" cy="-12" r="3.6" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#f43f5e" />
                <g transform="translate(8, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(52, 511)" className="animate-footstep-3">
                <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#15803d" />
            </g>
            <g transform="translate(76, 513)" className="animate-footstep-1">
                <circle cx="0" cy="-12" r="3.5" fill="#fbcfe8" />
                <path d="M -3.5,-7 L 3.5,-7 L 4.5,18 L -4.5,18 Z" fill="#7c3aed" />
                <g transform="translate(8, 4)" className="animate-hand-lantern">
                    <circle cx="0" cy="0" r="3.8" fill="#38bdf8" filter="url(#bloomHigh)" />
                </g>
            </g>
        </g>

        {/* HƯỚNG ĐI LUI 4: NHÓM DU KHÁCH TRẨY HỘI ĐÊM RẰM (R -> L) */}
        <g className="animate-promenade-rl-4">
            <g transform="translate(0, 509)" className="animate-footstep-2">
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#451a03" />
                <g transform="translate(10, 5)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#ef4444" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(30, 511)" className="animate-footstep-1">
                <polygon points="-8,-13 8,-13 0,-21" fill="#fde047" stroke="#b45309" strokeWidth="0.8" />
                <circle cx="0" cy="-12" r="3.6" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#0284c7" />
                <g transform="translate(10, 4)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(65, 512)" className="animate-footstep-3">
                <circle cx="0" cy="-12" r="3.5" fill="#fed7aa" />
                <path d="M -3.5,-7 L 3.5,-7 L 4.5,19 L -4.5,19 Z" fill="#dc2626" />
                <g transform="translate(8, -6)" className="animate-hand-lantern">
                    <polygon points="0,-7 2,-2 6,-2 3,1 4,5 0,2 -4,5 -3,1 -6,-2 -2,-2" fill="#fef08a" filter="url(#bloomHigh)" />
                </g>
            </g>
            <g transform="translate(98, 510)" className="animate-footstep-2">
                <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
                <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
                <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#ca8a04" />
                <g transform="translate(10, 5)" className="animate-hand-lantern">
                    <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
                </g>
            </g>
        </g>
`;

// Find start and end of static crowd section
const startCrowdStr = '{/* ĐOÀN MÚA LÂN MINI TRUNG THU RỘN RÃ TRÊN PHỐ (x: 940 - 1040) */}';
const endCrowdStr = '<g id="song-hoai-fluid">';

const startIdx = content.indexOf(startCrowdStr);
const endIdx = content.indexOf(endCrowdStr);

if (startIdx === -1 || endIdx === -1) {
    throw new Error('Cannot find start/end indices for crowd section! startIdx=' + startIdx + ', endIdx=' + endIdx);
}

// Check what is right before endIdx: should be </g> closing tag for hoian-super-crowded-promenade
const beforeEnd = content.slice(startIdx, endIdx);
console.log('Found crowd section, length:', beforeEnd.length);

// Replace from startIdx to just before the closing </g> tags of hoian-super-crowded-promenade
const lastCloseG = content.lastIndexOf('</g>', endIdx);
const secondLastCloseG = content.lastIndexOf('</g>', lastCloseG - 1);

const replacement = walkingPromenadeJSX + '\n    </g>\n\n\n';
content = content.slice(0, startIdx) + replacement + content.slice(endIdx);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated MidAutumnSvgBackdrop.tsx with dynamic walking promenade crowds!');
