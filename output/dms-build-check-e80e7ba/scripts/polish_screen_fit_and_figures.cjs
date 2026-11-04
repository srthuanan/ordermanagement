const fs = require('fs');
const path = require('path');

// 1. UPDATE MidAutumnLoginView.tsx
const loginViewPath = path.join(__dirname, '..', 'components', 'login', 'MidAutumnLoginView.tsx');
let loginCode = fs.readFileSync(loginViewPath, 'utf8');

// Container chính: min-h-screen -> h-screen overflow-hidden, py-8 -> py-2 sm:py-3
loginCode = loginCode.replace(
    /className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-x-hidden font-sans bg-\[#020612\] text-slate-100 selection:bg-amber-500 selection:text-slate-950 py-8 px-4 sm:px-6 lg:px-8"/,
    'className="relative h-screen w-full flex flex-col items-center justify-between overflow-hidden font-sans bg-[#020612] text-slate-100 selection:bg-amber-500 selection:text-slate-950 py-2 sm:py-3 px-3 sm:px-6"'
);

// Tiêu đề: pt-28 sm:pt-32 lg:pt-36 mb-6 sm:mb-8 -> pt-16 sm:pt-18 lg:pt-20 mb-1 sm:mb-2
loginCode = loginCode.replace(
    /className="relative z-20 text-center mb-6 sm:mb-8 pt-28 sm:pt-32 lg:pt-36 w-full max-w-3xl mx-auto px-2 select-none"/,
    'className="relative z-20 text-center mb-1 sm:mb-2 pt-16 sm:pt-18 lg:pt-20 w-full max-w-2xl mx-auto px-2 select-none"'
);

// Thẻ card: max-w-md sm:max-w-lg p-6 sm:p-8 -> max-w-md p-5 sm:p-6
loginCode = loginCode.replace(
    /className="relative z-20 w-full max-w-md sm:max-w-lg mx-auto px-3 sm:px-4"/,
    'className="relative z-20 w-full max-w-[450px] mx-auto px-2 sm:px-3"'
);

loginCode = loginCode.replace(
    /className="w-full rounded-2xl bg-slate-950\/40 hover:bg-slate-950\/50 backdrop-blur-md border border-amber-400\/35 p-6 sm:p-8 flex flex-col justify-between relative overflow-visible animate-card-glow shadow-\[0_20px_50px_rgba\(0,0,0,0.65\),0_0_35px_rgba\(245,158,11,0.2\)\] transition-all"/,
    'className="w-full rounded-2xl bg-slate-950/40 hover:bg-slate-950/50 backdrop-blur-md border border-amber-400/35 p-4 sm:p-6 flex flex-col justify-between relative overflow-visible animate-card-glow shadow-[0_20px_50px_rgba(0,0,0,0.65),0_0_35px_rgba(245,158,11,0.2)] transition-all"'
);

// Thu gọn khoảng cách form input
loginCode = loginCode.replace(
    /className="space-y-4"/g,
    'className="space-y-3 sm:space-y-3.5"'
);

// Thu gọn chân trang
loginCode = loginCode.replace(
    /className="relative z-20 text-center mt-8 text-xs text-slate-400"/,
    'className="relative z-20 text-center mt-2 mb-1 text-[11px] text-slate-400/80 select-none"'
);

fs.writeFileSync(loginViewPath, loginCode, 'utf8');
console.log('Successfully polished MidAutumnLoginView.tsx height and zero-scroll fit!');


// 2. UPDATE MidAutumnSvgBackdrop.tsx - DÁNG NGƯỜI RÕ NÉT CHẤT HỘI AN (NÓN LÁ, ÁO DÀI, LỒNG ĐÈN)
const backdropPath = path.join(__dirname, '..', 'components', 'login', 'MidAutumnSvgBackdrop.tsx');
let backdropCode = fs.readFileSync(backdropPath, 'utf8');

// Tìm đoạn DÒNG NGƯỜI RƯỚC ĐÈN, DẠO PHỐ ĐÔNG ĐÚC SUỐT DỌC BỜ KÈ
const crowdStartMarker = '{/* DÒNG NGƯỜI RƯỚC ĐÈN, DẠO PHỐ ĐÔNG ĐÚC SUỐT DỌC BỜ KÈ */}';
const crowdStartIndex = backdropCode.indexOf(crowdStartMarker);

const crowdEndMarker = '</g>\n    </g>\n\n\n<g id="song-hoai-fluid">';
let crowdEndIndex = backdropCode.indexOf(crowdEndMarker, crowdStartIndex);
if (crowdEndIndex === -1) {
    crowdEndIndex = backdropCode.indexOf('<g id="song-hoai-fluid">', crowdStartIndex);
}

if (crowdStartIndex === -1 || crowdEndIndex === -1) {
    console.error('Could not find crowd markers in MidAutumnSvgBackdrop.tsx');
    process.exit(1);
}

// BỘ DÁNG NGƯỜI HỘI AN ĐẶC TRƯNG VỚI NÓN LÁ, ÁO DÀI THƯỚT THA & LỒNG ĐÈN TRUNG THU RỰC RỠ
const authenticHoiAnCrowd = `
        {/* DÒNG NGƯỜI RƯỚC ĐÈN, DẠO PHỐ ĐÔNG ĐÚC RÕ NÉT CHẤT HỘI AN (NÓN LÁ, ÁO DÀI, ÁO BÀ BA) */}

        {/* 1. Cụ già khăn đóng áo the và cháu nhỏ rước đèn (x: 45 - 95) */}
        <g transform="translate(52, 508)">
            {/* Cụ già chống gậy trúc */}
            <circle cx="0" cy="-14" r="3.8" fill="#fed7aa" />
            <ellipse cx="0" cy="-17" rx="4" ry="2" fill="#1e293b" />
            <path d="M -4,-9 L 4,-9 L 5,20 L -5,20 Z" fill="#334155" />
            <line x1="4" y1="-2" x2="6" y2="24" stroke="#78350f" strokeWidth="1.6" />
        </g>
        <g transform="translate(78, 514)">
            {/* Bé trai mặc áo gấm đỏ cầm đèn ông sao */}
            <circle cx="0" cy="-10" r="3.5" fill="#fed7aa" />
            <path d="M -3,-6 L 3,-6 L 4,14 L -4,14 Z" fill="#dc2626" />
            <line x1="2" y1="-2" x2="11" y2="-11" stroke="#78350f" strokeWidth="1.3" />
            <g transform="translate(11, -13)" className="animate-hand-lantern">
                <polygon points="0,-9 2.5,-3 8,-3 4,1 6,7 0,3 -6,7 -4,1 -8,-3 -2.5,-3" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="2.2" fill="#fef08a" />
            </g>
        </g>

        {/* 2. Tốp 3 em bé rước đèn nón lá, đèn cá chép, đèn bướm (x: 125 - 190) */}
        <g transform="translate(132, 513)">
            {/* Bé đội nón lá nhỏ cầm đèn kéo quân */}
            <polygon points="-7,-11 7,-11 0,-18" fill="#fef08a" stroke="#78350f" strokeWidth="0.7" />
            <circle cx="0" cy="-10" r="3.2" fill="#fed7aa" />
            <path d="M -3,-6 L 3,-6 L 4,14 L -4,14 Z" fill="#0284c7" />
            <line x1="2" y1="-2" x2="10" y2="-9" stroke="#78350f" strokeWidth="1.2" />
            <g transform="translate(10, -11)" className="animate-hand-lantern">
                <rect x="-3" y="-5" width="6" height="7" rx="1.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(156, 515)">
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
        <g transform="translate(182, 514)">
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

        {/* 3. Gia đình 3 thế hệ dạo phố: Cha mẹ nón lá và con gái áo tứ thân (x: 320 - 390) */}
        <g transform="translate(332, 508)">
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
        <g transform="translate(356, 509)">
            {/* Người mẹ nón lá quai thao áo dài hồng thướt tha */}
            <polygon points="-8,-13 8,-13 0,-21" fill="#fde047" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="0" cy="-12" r="3.6" fill="#fbcfe8" />
            <path d="M -4,-8 L 4,-8 L 5.5,19 L -5.5,19 Z" fill="#e11d48" />
            <path d="M 2,8 Q 6,14 8,19" stroke="#e11d48" strokeWidth="2.5" fill="none" />
        </g>
        <g transform="translate(378, 515)">
            {/* Bé gái cầm đèn hoa sen vàng */}
            <circle cx="0" cy="-9" r="3.2" fill="#fed7aa" />
            <path d="M -3,-5 L 3,-5 L 3.5,13 L -3.5,13 Z" fill="#eab308" />
            <line x1="2" y1="-1" x2="8" y2="-6" stroke="#78350f" strokeWidth="1.1" />
            <g transform="translate(8, -6)" className="animate-hand-lantern">
                <circle cx="0" cy="0" r="3.5" fill="#ec4899" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="1.4" fill="#ffffff" />
            </g>
        </g>

        {/* 4. Đôi bạn trẻ áo bà ba dạo mát bờ sông (x: 435 - 485) */}
        <g transform="translate(442, 509)">
            <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#0369a1" />
            <line x1="3" y1="-2" x2="12" y2="4" stroke="#78350f" strokeWidth="1.4" />
            <g transform="translate(12, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
                <circle cx="0" cy="6" r="1.8" fill="#ffffff" />
            </g>
        </g>
        <g transform="translate(468, 511)">
            <polygon points="-8,-13 8,-13 0,-21" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-12" r="3.6" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#059669" />
            <g transform="translate(8, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="5.5" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="5" r="1.6" fill="#ffffff" />
            </g>
        </g>

        {/* 5. Tốp thiếu nữ áo dài Hội An nâng lồng đèn hoa sen tỏa sáng (x: 645 - 745) */}
        <g transform="translate(654, 507)">
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
        <g transform="translate(678, 508)">
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
        <g transform="translate(702, 509)">
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
        <g transform="translate(726, 511)">
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

        {/* 6. Nhóm thanh niên rước đại đăng ông sao 5 cánh (x: 790 - 855) */}
        <g transform="translate(805, 508)">
            <circle cx="0" cy="-14" r="3.8" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#1e293b" />
            <line x1="3" y1="-4" x2="16" y2="-17" stroke="#78350f" strokeWidth="1.8" />
            <g transform="translate(16, -18)" className="animate-hand-lantern">
                <polygon points="0,-12 3.5,-4 11,-4 5,2 8,10 0,4 -8,10 -5,2 -11,-4 -3.5,-4" fill="#ef4444" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="3.2" fill="#fef08a" />
            </g>
        </g>
        <g transform="translate(838, 509)">
            <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#c2410c" />
            <g transform="translate(10, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* 7. Gia đình trẻ: Cha kiệu bé gái lên vai cầm đèn thỏ ngọc (x: 1250 - 1315) */}
        <g transform="translate(1265, 508)">
            {/* Người cha */}
            <circle cx="0" cy="-14" r="4" fill="#fed7aa" />
            <path d="M -4.5,-8 L 4.5,-8 L 5.5,21 L -5.5,21 Z" fill="#334155" />
            {/* Bé gái ngồi trên vai cha cầm đèn thỏ ngọc */}
            <circle cx="0" cy="-26" r="3" fill="#fed7aa" />
            <line x1="2" y1="-24" x2="10" y2="-30" stroke="#78350f" strokeWidth="1.1" />
            <g transform="translate(10, -30)" className="animate-hand-lantern">
                <ellipse cx="0" cy="0" rx="4.2" ry="3.2" fill="#ffffff" filter="url(#bloomHigh)" />
                <circle cx="0" cy="0" r="1.4" fill="#fef08a" />
            </g>
        </g>
        <g transform="translate(1290, 510)">
            {/* Mẹ nón lá áo dài xanh lá ngọc */}
            <polygon points="-8,-13 8,-13 0,-21" fill="#fde047" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-12" r="3.6" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#059669" />
            <g transform="translate(10, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* 8. Bạn trẻ tựa lan can chỉ tay ngắm thuyền hoa đăng (x: 1375 - 1465) */}
        <g transform="translate(1385, 510)">
            <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#0284c7" />
            <line x1="2" y1="-2" x2="10" y2="10" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
        </g>
        <g transform="translate(1410, 511)">
            <circle cx="0" cy="-12" r="3.6" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#f43f5e" />
            <g transform="translate(8, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1435, 511)">
            <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#15803d" />
        </g>
        <g transform="translate(1458, 513)">
            <circle cx="0" cy="-12" r="3.5" fill="#fbcfe8" />
            <path d="M -3.5,-7 L 3.5,-7 L 4.5,18 L -4.5,18 Z" fill="#7c3aed" />
            <g transform="translate(8, 4)" className="animate-hand-lantern">
                <circle cx="0" cy="0" r="3.8" fill="#38bdf8" filter="url(#bloomHigh)" />
            </g>
        </g>

        {/* 9. Dòng người rước đèn nón lá phía hạ lưu (x: 1675 - 1885) */}
        <g transform="translate(1685, 509)">
            <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#334155" />
            <g transform="translate(12, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1715, 511)">
            <polygon points="-8,-13 8,-13 0,-21" fill="#fde047" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="0" cy="-12" r="3.6" fill="#fbcfe8" />
            <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#be185d" />
            <g transform="translate(10, 5)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1745, 512)">
            <circle cx="0" cy="-12" r="3.5" fill="#fed7aa" />
            <path d="M -3.5,-7 L 3.5,-7 L 4.5,19 L -4.5,19 Z" fill="#059669" />
            <g transform="translate(8, -6)" className="animate-hand-lantern">
                <polygon points="0,-7 2,-2 6,-2 3,1 4,5 0,2 -4,5 -3,1 -6,-2 -2,-2" fill="#f43f5e" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1785, 510)">
            <polygon points="-8,-14 8,-14 0,-22" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-13" r="3.7" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#d97706" />
            <g transform="translate(10, 5)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#10b981" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1825, 511)">
            <polygon points="-8,-13 8,-13 0,-21" fill="#fef08a" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="-12" r="3.6" fill="#fbcfe8" />
            <path d="M -4,-8 L 4,-8 L 5,19 L -5,19 Z" fill="#ec4899" />
            <g transform="translate(10, 4)" className="animate-hand-lantern">
                <ellipse cx="0" cy="5" rx="4" ry="6" fill="#ef4444" filter="url(#bloomHigh)" />
            </g>
        </g>
        <g transform="translate(1865, 509)">
            <circle cx="0" cy="-13" r="3.8" fill="#fed7aa" />
            <path d="M -4,-8 L 4,-8 L 5,20 L -5,20 Z" fill="#1e293b" />
            <g transform="translate(10, 6)" className="animate-hand-lantern">
                <ellipse cx="0" cy="6" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
            </g>
        </g>
`;

backdropCode = backdropCode.substring(0, crowdStartIndex) + authenticHoiAnCrowd.trim() + '\n    </g>\n    </g>\n\n\n' + backdropCode.substring(crowdEndIndex);

fs.writeFileSync(backdropPath, backdropCode, 'utf8');
console.log('Successfully polished crowd figures with authentic Hoi An conical hats & festive attires in MidAutumnSvgBackdrop.tsx!');
