const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// ==============================================================================
// 1. ADD STEAM ANIMATION TO CSS
// ==============================================================================
if (!content.includes('hoian-steam-rise')) {
    const cssToInsert = `
                /* Làn khói trà sen & bếp ẩm thực phố Hội bay nhè nhẹ */
                @keyframes hoian-steam-rise {
                    0% { opacity: 0.2; transform: translateY(0) scaleX(0.8); }
                    50% { opacity: 0.65; transform: translateY(-5px) scaleX(1.2); }
                    100% { opacity: 0; transform: translateY(-10px) scaleX(1.6); }
                }
                .animate-steam {
                    animation: hoian-steam-rise 3s ease-out infinite;
                }
`;
    const cssAnchor = '.animate-footstep-3 { animation: hoian-footstep-bob-1 1.15s ease-in-out infinite 0.6s; }';
    const idx = content.indexOf(cssAnchor);
    if (idx !== -1) {
        content = content.slice(0, idx + cssAnchor.length) + cssToInsert + content.slice(idx + cssAnchor.length);
        console.log('Added steam animation keyframes!');
    }
}

// ==============================================================================
// 2. ENHANCE HOUSE 1 (TẤN KÝ): TRÀ QUÁN HỘI AN (CHỦ QUÁN CỤ ÔNG + NHÂN VIÊN CÔ GÁI DÂNG TRÀ)
// ==============================================================================
const house1OldStart = '<rect x="42" y="196" width="90" height="69" rx="2" fill="#140801" />';
const house1OldEnd = '<g filter="url(#dropShadow)">\n            <path d="M -28,84';

const house1NewContent = `
        {/* CỬA RA VÀO GỖ & QUẦY TRÀ THẢO MỘC HỘI AN */}
        <rect x="42" y="196" width="90" height="69" rx="2" fill="#140801" />
        <rect x="50" y="202" width="74" height="63" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        {/* Cánh cửa bức bàn gỗ mở sang 2 bên */}
        <rect x="42" y="196" width="16" height="69" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <line x1="50" y1="196" x2="50" y2="265" stroke="#451a03" strokeWidth="0.8" />
        <rect x="116" y="196" width="16" height="69" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <line x1="124" y1="196" x2="124" y2="265" stroke="#451a03" strokeWidth="0.8" />

        {/* Quầy gỗ mộc trà thảo mộc & ấm tích gốm Chu Đậu */}
        <rect x="56" y="236" width="62" height="28" rx="2" fill="#3b1d06" stroke="#1c0a02" strokeWidth="1" />
        <rect x="58" y="237" width="58" height="3" fill="#78350f" />
        <ellipse cx="68" cy="235" rx="5.5" ry="3.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.7" />
        <circle cx="68" cy="232" r="1.8" fill="#ca8a04" />
        {/* Làn khói trà sen bốc nghi ngút */}
        <path d="M 68,231 Q 65,223 69,217 Q 73,212 68,206" fill="none" stroke="#fef08a" strokeWidth="1.2" className="animate-steam" opacity="0.75" />

        {/* 1. CHỦ QUÁN (CỤ ÔNG TRÀ CHỦ - KHĂN ĐÓNG ÁO DÀI LAM SẪM NÂNG KHAY TRÀ) */}
        <g transform="translate(73, 218)">
            {/* Khăn đóng & đầu cụ ông */}
            <ellipse cx="0" cy="-15" rx="4.5" ry="2.2" fill="#0f172a" />
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            {/* Râu chòm bạc trắng hiền từ */}
            <path d="M -1.5,-8 Q 0,-2 1.5,-8 Z" fill="#f8fafc" />
            {/* Áo dài gấm lam sẫm */}
            <path d="M -5,-8 L 5,-8 L 6.5,22 L -6.5,22 Z" fill="#1e3a8a" stroke="#172554" strokeWidth="0.8" />
            {/* Hai tay nâng khay trà sen mời khách */}
            <line x1="-4" y1="-2" x2="3" y2="4" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
            <rect x="2" y="2" width="10" height="3.5" rx="1" fill="#78350f" />
            <ellipse cx="7" cy="1.5" rx="2.5" ry="1.5" fill="#059669" />
        </g>

        {/* 2. NHÂN VIÊN (THIẾU NỮ ÁO BÀ BA VÀNG RƠM NÓN LÁ ĐỨNG QUẦY RÓT TRÀ) */}
        <g transform="translate(102, 222)">
            {/* Nón lá nghiêng cài quai lụa đỏ */}
            <polygon points="-8,-12 8,-12 0,-20" fill="#fef08a" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="0" cy="-11" r="3.6" fill="#fed7aa" />
            {/* Áo bà ba vàng hoàng yến thắt eo duyên dáng */}
            <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#eab308" />
            {/* Tay cầm bình trà gốm rót nước */}
            <line x1="-2" y1="-2" x2="-8" y2="5" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="-9" cy="6" rx="2.5" ry="3.5" fill="#0284c7" />
        </g>
`;

const h1Start = content.indexOf(house1OldStart);
const h1End = content.indexOf(house1OldEnd);
if (h1Start !== -1 && h1End !== -1) {
    content = content.slice(0, h1Start) + house1NewContent + '\n        ' + content.slice(h1End);
    console.log('Successfully upgraded House 1 (Trà Quán Hội An) with owner and staff!');
} else {
    console.log('Warning: House 1 anchor not matched!', h1Start, h1End);
}

// ==============================================================================
// 3. ENHANCE HOUSE 2 (CAO LẦU BÀ BÉ + QUẢNG ĐÔNG HỘI QUÁN)
// ==============================================================================
const house2OldStart = '<g id="nhaco-center-hoi-quan" transform="translate(650, 265)" filter="url(#dropShadow)">';
const house2OldEnd = '<g filter="url(#dropShadow)">\n            <path d="M 116,78';

const house2NewFacadeA = `<g id="nhaco-center-hoi-quan" transform="translate(650, 265)" filter="url(#dropShadow)">
        <rect x="0" y="95" width="150" height="185" fill="url(#wallOchre1)" />
        <rect x="25" y="125" width="40" height="42" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="45" y1="125" x2="45" y2="167" stroke="#3b1d06" strokeWidth="1.6" />
        <rect x="85" y="125" width="40" height="42" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="105" y1="125" x2="105" y2="167" stroke="#3b1d06" strokeWidth="1.6" />

        {/* BIỂN HIỆU QUÁN: CAO LẦU BÀ BÉ - ĐẶC SẢN HỘI AN */}
        <rect x="15" y="172" width="120" height="18" rx="2" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" />
        <text x="75" y="184" fill="#fef08a" fontSize="7.8" fontWeight="bold" textAnchor="middle" fontFamily="serif">CAO LẦU BÀ BÉ - HỘI AN</text>

        {/* CỬA RA VÀO BẾP MỞ & NỒI NƯỚC DÙNG CAO LẦU NGHI NGÚT KHÓI */}
        <rect x="28" y="196" width="94" height="74" rx="2" fill="#140801" />
        <rect x="36" y="202" width="78" height="68" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        {/* Cửa gỗ 2 bên */}
        <rect x="28" y="196" width="16" height="74" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="106" y="196" width="16" height="74" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* Bếp quầy nấu cao lầu và nồi nước dùng sôi sùng sục */}
        <rect x="44" y="238" width="62" height="28" rx="2" fill="#3b1d06" stroke="#1c0e02" strokeWidth="1" />
        <ellipse cx="56" cy="237" rx="7" ry="4" fill="#64748b" stroke="#334155" strokeWidth="1" />
        <path d="M 56,233 Q 52,224 57,218 Q 62,212 56,206" fill="none" stroke="#fef08a" strokeWidth="1.4" className="animate-steam" opacity="0.8" />

        {/* 1. CHỦ QUÁN (BÀ BÉ - ÁO BÀ BA HỒNG TÍM, BƯNG TÔ CAO LẦU ĐẶC SẢN BỐC KHÓI) */}
        <g transform="translate(62, 222)">
            <circle cx="0" cy="-11" r="4.4" fill="#fed7aa" />
            <path d="M -3,-15 Q 0,-18 4,-14" stroke="#1e293b" strokeWidth="2.5" fill="none" />
            <path d="M -5,-7 L 5,-7 L 6.5,20 L -6.5,20 Z" fill="#db2777" />
            {/* Hai tay bưng tô cao lầu vàng óng */}
            <ellipse cx="8" cy="4" rx="5" ry="3.5" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.8" />
            <line x1="6" y1="2" x2="10" y2="2" stroke="#15803d" strokeWidth="1.5" />
            <path d="M 8,1 Q 6,-6 10,-12" fill="none" stroke="#fef08a" strokeWidth="1" className="animate-steam" opacity="0.75" />
        </g>

        {/* 2. NHÂN VIÊN (CHÀNG TRAI ÁO NÂU KHĂN RẰN CẦM VỢT TRỤNG MÌ) */}
        <g transform="translate(94, 224)">
            <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
            {/* Khăn rằn quấn trán */}
            <line x1="-4" y1="-14" x2="4" y2="-14" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#78350f" />
            {/* Tay cầm vợt tre trụng mì */}
            <line x1="-3" y1="0" x2="-14" y2="10" stroke="#ca8a04" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="-15" cy="11" r="2.5" fill="#fef08a" />
        </g>
`;

const h2Start = content.indexOf(house2OldStart);
const h2End = content.indexOf(house2OldEnd);
if (h2Start !== -1 && h2End !== -1) {
    content = content.slice(0, h2Start) + house2NewFacadeA + '\n        ' + content.slice(h2End);
    console.log('Successfully upgraded House 2A (Cao Lầu Bà Bé)!');
} else {
    console.log('Warning: House 2A anchor not matched!', h2Start, h2End);
}

// Enhance House 2B: Quảng Đông Hội Quán
const hoiQuanOldSign = '<rect x="218" y="105" width="55" height="16" rx="2" fill="#7f1d1d" stroke="#f59e0b" strokeWidth="1.2" />\n        <text x="245" y="117" fill="#fef08a" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">會 館</text>';
const hoiQuanNewSignAndPeople = `<rect x="202" y="103" width="86" height="18" rx="2" fill="#7f1d1d" stroke="#f59e0b" strokeWidth="1.4" />
        <text x="245" y="115.5" fill="#fef08a" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">QUẢNG ĐÔNG HỘI QUÁN</text>
        <text x="245" y="127" fill="#fed7aa" fontSize="5.5" textAnchor="middle" fontFamily="serif">廣 東 會 館</text>

        {/* 1. CHỦ TẾ / TRƯỞNG BAN (CỤ ÔNG ÁO THỤNG ĐỎ VIỀN VÀNG, MŨ CÁNH CHUỒN CHÀO KHÁCH) */}
        <g transform="translate(230, 220)">
            <ellipse cx="0" cy="-16" rx="5" ry="2.5" fill="#7f1d1d" />
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            <path d="M -1.5,-8 Q 0,-2 1.5,-8 Z" fill="#f8fafc" />
            <path d="M -5.5,-8 L 5.5,-8 L 7,22 L -7,22 Z" fill="#b91c1c" stroke="#f59e0b" strokeWidth="1" />
            {/* Chắp tay áo dài cung kính chào đón du khách */}
            <rect x="-4" y="0" width="8" height="5" rx="2" fill="#991b1b" stroke="#f59e0b" strokeWidth="0.8" />
        </g>

        {/* 2. NHÂN VIÊN / TIỂU ĐỒNG (ÁO GẤM VÀNG NÂNG LƯ TRẦM HƯƠNG TỎA KHÓI) */}
        <g transform="translate(262, 224)">
            <circle cx="0" cy="-11" r="3.6" fill="#fed7aa" />
            <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
            {/* Lư xông trầm hương và đèn lồng đỏ */}
            <ellipse cx="6" cy="4" rx="4" ry="3" fill="#78350f" />
            <path d="M 6,1 Q 4,-6 8,-12" fill="none" stroke="#fef08a" strokeWidth="1" className="animate-steam" opacity="0.7" />
            <circle cx="7" cy="8" r="2.8" fill="#ef4444" filter="url(#bloomSoft)" />
        </g>`;

if (content.includes(hoiQuanOldSign)) {
    content = content.replace(hoiQuanOldSign, hoiQuanNewSignAndPeople);
    console.log('Successfully upgraded House 2B (Quảng Đông Hội Quán) with title and staff!');
}

// ==============================================================================
// 4. ENHANCE HOUSE 3 (TƠ LỤA Á ĐÔNG + TIỆM LỒNG ĐÈN + CÀ PHÊ FAIFO)
// ==============================================================================
const house3OldDoor = `<rect x="42" y="200" width="100" height="75" rx="3" fill="#140801" />
        <rect x="52" y="208" width="80" height="67" fill="url(#interiorGlow)" opacity="0.9" filter="url(#bloomSoft)" />
        <rect x="42" y="200" width="24" height="75" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="118" y="200" width="24" height="75" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />`;

const house3NewDoorsAndShops = `{/* 1. HIỆU VẢI TƠ LỤA Á ĐÔNG - MAY ĐO LẤY NGAY */}
        <rect x="22" y="174" width="140" height="18" rx="2" fill="#1c0a02" stroke="#d97706" strokeWidth="1.2" />
        <text x="92" y="186" fill="#fef08a" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">TƠ LỤA Á ĐÔNG - MAY ĐO LẤY NGAY</text>

        <rect x="42" y="200" width="100" height="75" rx="3" fill="#140801" />
        <rect x="52" y="208" width="80" height="67" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        <rect x="42" y="200" width="18" height="75" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="124" y="200" width="18" height="75" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* Kệ lụa tơ tằm óng ả ngũ sắc */}
        <rect x="62" y="240" width="60" height="26" fill="#3b1d06" stroke="#1c0a02" strokeWidth="1" />
        <rect x="65" y="242" width="12" height="5" rx="1" fill="#ec4899" />
        <rect x="80" y="242" width="12" height="5" rx="1" fill="#06b6d4" />
        <rect x="95" y="242" width="12" height="5" rx="1" fill="#f59e0b" />

        {/* CHỦ HIỆU TƠ LỤA: CÔ CHỦ ÁO DÀI HỒNG CÁNH SEN CẦM THƯỚC ĐO LỤA */}
        <g transform="translate(68, 222)">
            <polygon points="-7,-11 7,-11 0,-18" fill="#fde047" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="0" cy="-10" r="3.7" fill="#fed7aa" />
            <path d="M -4,-6 L 4,-6 L 5.5,21 L -5.5,21 Z" fill="#db2777" />
            {/* Thước dây gỗ may đo */}
            <line x1="3" y1="0" x2="10" y2="15" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
        </g>

        {/* NHÂN VIÊN: THỢ MAY ÁO BÀ BA XANH NGỌC NÂNG XẤP GẤM */}
        <g transform="translate(108, 224)">
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
            <path d="M -4,-6 L 4,-6 L 5,20 L -5,20 Z" fill="#0d9488" />
            {/* Xấp lụa gấm hoa */}
            <rect x="-8" y="2" width="8" height="4" rx="1" fill="#eab308" />
        </g>`;

if (content.includes(house3OldDoor)) {
    content = content.replace(house3OldDoor, house3NewDoorsAndShops);
    console.log('Successfully upgraded House 3A (Tơ Lụa Á Đông)!');
} else {
    console.log('Warning: House 3A door not matched!');
}

// Enhance House 3B (Tiệm Lồng Đèn Huỳnh Văn) & House 3C (Cà Phê Faifo)
// Look for lines 1610 to 1664:
const house3MiddleStart = '<rect x="185" y="65" width="210" height="210" fill="url(#wallOchre1)" />';
const house3MiddleTarget = `<rect x="185" y="65" width="210" height="210" fill="url(#wallOchre1)" />
        <rect x="185" y="235" width="210" height="40" fill="url(#baseDampness)" />
        
        <path d="M 215,130 C 215,102 250,102 250,130 L 250,158 L 215,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 270,130 C 270,102 305,102 305,130 L 305,158 L 270,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 325,130 C 325,102 360,102 360,130 L 360,158 L 325,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />`;

const house3MiddleReplacement = `<rect x="185" y="65" width="210" height="210" fill="url(#wallOchre1)" />
        <rect x="185" y="235" width="210" height="40" fill="url(#baseDampness)" />
        
        {/* Cửa sổ vòm tầng trên */}
        <path d="M 215,130 C 215,102 250,102 250,130 L 250,158 L 215,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 270,130 C 270,102 305,102 305,130 L 305,158 L 270,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 325,130 C 325,102 360,102 360,130 L 360,158 L 325,158 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />

        {/* BIỂN HIỆU: LỒNG ĐÈN PHỐ CỔ - NGHỆ NHÂN HUỲNH VĂN */}
        <rect x="210" y="174" width="160" height="18" rx="2" fill="#3b1d06" stroke="#f59e0b" strokeWidth="1.2" />
        <text x="290" y="186" fill="#fef08a" fontSize="7.2" fontWeight="bold" textAnchor="middle" fontFamily="serif">LỒNG ĐÈN PHỐ CỔ - NGHỆ NHÂN HUỲNH VĂN</text>

        {/* CỬA TIỆM LỒNG ĐÈN RỰC RỠ SẮC MÀU */}
        <rect x="238" y="198" width="104" height="76" rx="3" fill="#140801" />
        <rect x="246" y="206" width="88" height="68" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        <rect x="238" y="198" width="16" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="326" y="198" width="16" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* Dàn đèn lồng trưng bày trước cửa hiệu */}
        <ellipse cx="260" cy="208" rx="4.5" ry="6.5" fill="#ef4444" filter="url(#bloomHigh)" />
        <ellipse cx="282" cy="205" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomHigh)" />
        <ellipse cx="304" cy="207" rx="4.5" ry="6.5" fill="#06b6d4" filter="url(#bloomHigh)" />

        {/* 1. NGHỆ NHÂN LÀM ĐÈN (CỤ HUỲNH VĂN - NGỒI CHUỐT NAN TRE & DÁN LỤA) */}
        <g transform="translate(266, 228)">
            <circle cx="0" cy="-10" r="3.8" fill="#fed7aa" />
            <path d="M -4,-6 L 4,-6 L 5,20 L -5,20 Z" fill="#451a03" />
            {/* Khung đèn lồng hoa sen đang dán dở */}
            <ellipse cx="7" cy="4" rx="4" ry="5.5" fill="#ec4899" stroke="#be185d" strokeWidth="0.8" />
            <line x1="2" y1="2" x2="6" y2="4" stroke="#fed7aa" strokeWidth="1.5" />
        </g>

        {/* 2. NHÂN VIÊN PHỤ VIỆC (CHÀNG TRAI CẦM LỒNG ĐÈN VÀNG THỬ SÁNG) */}
        <g transform="translate(306, 226)">
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
            <path d="M -4,-6 L 4,-6 L 5,20 L -5,20 Z" fill="#0284c7" />
            {/* Đèn lồng vàng sáng rực */}
            <line x1="-3" y1="0" x2="-9" y2="8" stroke="#fed7aa" strokeWidth="1.5" />
            <ellipse cx="-10" cy="9" rx="4" ry="5.5" fill="#f59e0b" filter="url(#bloomHigh)" />
        </g>`;

if (content.includes(house3MiddleTarget)) {
    content = content.replace(house3MiddleTarget, house3MiddleReplacement);
    console.log('Successfully upgraded House 3B (Tiệm Lồng Đèn Huỳnh Văn)!');
} else {
    console.log('Warning: House 3B target not matched!');
}

// Enhance House 3C (Cà Phê Faifo & Bánh Trung Thu)
const house3RightTarget = `<rect x="395" y="85" width="230" height="190" fill="url(#wallOchreBright)" />
        <rect x="430" y="118" width="48" height="56" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <rect x="510" y="118" width="48" height="56" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />`;

const house3RightReplacement = `<rect x="395" y="85" width="230" height="190" fill="url(#wallOchreBright)" />
        <rect x="430" y="118" width="48" height="46" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="454" y1="118" x2="454" y2="164" stroke="#3b1d06" strokeWidth="1.6" />
        <rect x="510" y="118" width="48" height="46" rx="2" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <line x1="534" y1="118" x2="534" y2="164" stroke="#3b1d06" strokeWidth="1.6" />

        {/* BIỂN HIỆU: CÀ PHÊ FAIFO & BÁNH TRUNG THU HỘI AN */}
        <rect x="422" y="174" width="180" height="18" rx="2" fill="#1c0a02" stroke="#eab308" strokeWidth="1.2" />
        <text x="512" y="186" fill="#fef08a" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">CÀ PHÊ FAIFO & BÁNH TRUNG THU HỘI AN</text>

        {/* CỬA QUÁN CÀ PHÊ & QUẦY BAR GỖ CỔ ĐIỂN */}
        <rect x="445" y="198" width="134" height="76" rx="3" fill="#140801" />
        <rect x="455" y="206" width="114" height="68" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        <rect x="445" y="198" width="18" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="561" y="198" width="18" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* Quầy pha chế cà phê phin & khay bánh nướng */}
        <rect x="472" y="238" width="80" height="28" rx="2" fill="#3b1d06" stroke="#1c0e02" strokeWidth="1" />
        {/* Phin cà phê nhôm tí tách */}
        <ellipse cx="490" cy="236" rx="3.5" ry="2" fill="#94a3b8" />
        <rect x="488" y="230" width="4" height="6" fill="#cbd5e1" />
        <path d="M 490,229 Q 487,222 491,216" fill="none" stroke="#fef08a" strokeWidth="1.1" className="animate-steam" opacity="0.75" />

        {/* 1. CHỦ QUÁN (ANH BARISTA PHỐ CỔ - SƠ MI TRẮNG GILE CỔ ĐIỂN PHA CÀ PHÊ) */}
        <g transform="translate(506, 222)">
            <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
            <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#f8fafc" />
            <path d="M -3,-5 L 3,-5 L 4,14 L -4,14 Z" fill="#451a03" />
            {/* Tay nâng cốc thủy tinh cà phê sữa đá */}
            <rect x="3" y="1" width="3" height="5" rx="0.5" fill="#ca8a04" />
        </g>

        {/* 2. NHÂN VIÊN (CÔ GÁI ÁO DÀI VÀNG BÊ KHAY BÁNH TRUNG THU NGŨ SẮC) */}
        <g transform="translate(542, 222)">
            <polygon points="-7,-11 7,-11 0,-18" fill="#fef08a" stroke="#b45309" strokeWidth="0.8" />
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
            <path d="M -4,-6 L 4,-6 L 5.5,21 L -5.5,21 Z" fill="#ca8a04" />
            {/* Khay sơn mài đỏ đựng bánh nướng & bánh dẻo */}
            <ellipse cx="-8" cy="4" rx="6" ry="3" fill="#991b1b" stroke="#78350f" strokeWidth="0.7" />
            <circle cx="-10" cy="3" r="1.8" fill="#d97706" />
            <circle cx="-6" cy="3" r="1.8" fill="#ffffff" />
        </g>`;

if (content.includes(house3RightTarget)) {
    content = content.replace(house3RightTarget, house3RightReplacement);
    console.log('Successfully upgraded House 3C (Cà Phê Faifo & Bánh Trung Thu)!');
} else {
    console.log('Warning: House 3C target not matched!');
}

// ==============================================================================
// 5. UPGRADE 48 HOA ĐĂNG STREAM TO 6 DIVERSE AUTHENTIC SHAPES & COLORS
// ==============================================================================
const analyzeScript = require('./analyze_hoa_dang.cjs');
// We have the 48 coordinates from analyze_hoa_dang.cjs
const streamStartStr = '<g id="hoian-super-dense-hoa-dang-stream">';
const streamEndStr = '</g>\n    <rect x="360" y="320"';

const sStart = content.indexOf(streamStartStr);
const sEnd = content.indexOf(streamEndStr);

if (sStart !== -1 && sEnd !== -1) {
    // Read the 48 positions from the existing code
    const sub = content.substring(sStart, sEnd);
    const regex = /<g className="(animate-hoa-dang-\d)">\s*<g transform="translate\((\d+),\s*(\d+)\)\s*scale\(([\d\.]+)\)" filter="url\(#bloomHigh\)">/g;
    let m;
    const positions = [];
    while ((m = regex.exec(sub)) !== null) {
        positions.push({
            animClass: m[1],
            x: parseInt(m[2]),
            y: parseInt(m[3]),
            scale: parseFloat(m[4])
        });
    }
    console.log('Found', positions.length, 'hoa dang positions to transform!');

    // 6 Distinct Generator Templates:
    function renderHoaDang(type, x, y, scale, animClass) {
        let svgBody = '';
        switch(type) {
            case 0: // TYPE 1: HOA SEN NHIỀU TẦNG NỞ RỘ (MULTI-LAYER LOTUS)
                svgBody = `
                {/* 1. HOA SEN 3 TẦNG BUNG NỞ TRÊN LÁ SEN XANH */}
                <ellipse cx="0" cy="11" rx="24" ry="5.5" fill="#f43f5e" opacity="0.5" />
                <ellipse cx="0" cy="11" rx="12" ry="3" fill="#fef08a" opacity="0.65" />
                {/* Lá sen xanh ngọc đỡ đáy */}
                <ellipse cx="0" cy="7" rx="18" ry="5.5" fill="#047857" opacity="0.85" />
                {/* Cánh sen ngoài xòe rộng */}
                <path d="M -18,3 Q -9,-12 0,-18 Q 9,-12 18,3 Z" fill="#f43f5e" opacity="0.9" />
                <path d="M -17,3 Q -22,-3 -12,-2 Z" fill="#e11d48" />
                <path d="M 17,3 Q 22,-3 12,-2 Z" fill="#e11d48" />
                {/* Cánh sen trong hồng phấn & nhụy vàng */}
                <path d="M -11,4 Q -4,-8 0,-13 Q 4,-8 11,4 Z" fill="#fda4af" />
                <ellipse cx="0" cy="4" rx="5" ry="2" fill="#fef08a" />
                {/* Ngọn nến lung linh */}
                <ellipse cx="0" cy="-7" rx="3.6" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-6" r="1.6" fill="#ffffff" />`;
                break;

            case 1: // TYPE 2: THUYỀN GIẤY XẾP HOA ĐĂNG (ORIGAMI SAMPAN BOAT)
                svgBody = `
                {/* 2. THUYỀN GIẤY HOA ĐĂNG MŨI NHỌN ORIGAMI */}
                <ellipse cx="0" cy="11" rx="26" ry="5" fill="#f59e0b" opacity="0.45" />
                <ellipse cx="0" cy="11" rx="14" ry="2.8" fill="#fef08a" opacity="0.65" />
                {/* Mạn thuyền origami gấp góc cạnh */}
                <polygon points="-24,-2 -14,8 14,8 24,-2 18,1 -18,1" fill="#ea580c" />
                <polygon points="-24,-2 0,7 24,-2 15,7 -15,7" fill="#f59e0b" />
                <polygon points="-24,-2 0,-11 0,7 -24,-2" fill="#fbbf24" opacity="0.92" />
                <polygon points="24,-2 0,-11 0,7 24,-2" fill="#fef08a" opacity="0.82" />
                {/* Tim nến sáp đỏ cắm giữa thuyền */}
                <rect x="-2" y="-5" width="4" height="8" rx="1" fill="#dc2626" />
                <ellipse cx="0" cy="-10" rx="3.5" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-9" r="1.6" fill="#ffffff" />`;
                break;

            case 2: // TYPE 3: HOA SÚNG / HOA CÚC NỞ TRÒN TỎA ĐỀU (WATER LILY / CHRYSANTHEMUM)
                svgBody = `
                {/* 3. ĐÈN HOA CÚC / HOA SÚNG TRÒN NỞ RỘ */}
                <ellipse cx="0" cy="10" rx="22" ry="5" fill="#06b6d4" opacity="0.45" />
                <ellipse cx="0" cy="10" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                {/* Cánh hoa xòe tròn tỏa nhiều hướng */}
                <circle cx="0" cy="4" r="15" fill="#0284c7" opacity="0.85" />
                <path d="M 0,-14 L 4,-5 L 13,-6 L 6,0 L 11,8 L 3,5 L 0,13 L -3,5 L -11,8 L -6,0 L -13,-6 L -4,-5 Z" fill="#38bdf8" />
                <circle cx="0" cy="1" r="5.5" fill="#fef08a" />
                {/* Ngọn nến vàng rực giữa nhụy hoa */}
                <ellipse cx="0" cy="-6" rx="3.5" ry="7" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-5" r="1.5" fill="#ffffff" />`;
                break;

            case 3: // TYPE 4: HOA ĐĂNG NGÔI SAO TRUNG THU 5 CÁNH (ORIGAMI 5-POINTED STAR)
                svgBody = `
                {/* 4. ĐÈN HOA ĐĂNG NGÔI SAO 5 CÁNH TRUNG THU */}
                <ellipse cx="0" cy="11" rx="22" ry="5" fill="#ec4899" opacity="0.5" />
                <ellipse cx="0" cy="11" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                {/* Ngôi sao giấy màu 5 cánh nổi trên nước */}
                <polygon points="0,-16 4.5,-5 16,-5 7,2 10.5,13 0,6 -10.5,13 -7,2 -16,-5 -4.5,-5" fill="#dc2626" stroke="#f59e0b" strokeWidth="0.8" />
                <polygon points="0,-16 0,6 10.5,13" fill="#ef4444" />
                <polygon points="0,-16 0,6 7,2" fill="#f43f5e" />
                <polygon points="0,-16 0,6 -7,2" fill="#fb7185" />
                <circle cx="0" cy="0" r="4.5" fill="#fef08a" />
                {/* Nến cháy bập bùng tâm sao */}
                <ellipse cx="0" cy="-5" rx="3.5" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-4" r="1.6" fill="#ffffff" />`;
                break;

            case 4: // TYPE 5: ĐÈN BÁT GIÁC CỔ TRUYỀN HỘI AN (OCTAGONAL PAPER LANTERN)
                svgBody = `
                {/* 5. ĐÈN BÁT GIÁC GIẤY DÁN CỔ TRUYỀN */}
                <ellipse cx="0" cy="11" rx="23" ry="5.2" fill="#c026d3" opacity="0.45" />
                <ellipse cx="0" cy="11" rx="12" ry="2.8" fill="#fef08a" opacity="0.65" />
                {/* Khung bát giác giấy màu */}
                <polygon points="-16,0 -11,-9 11,-9 16,0 11,9 -11,9" fill="#701a75" stroke="#4a044e" strokeWidth="1" />
                <polygon points="-12,0 -8,-7 8,-7 12,0 8,7 -8,7" fill="#c026d3" opacity="0.9" />
                <polygon points="-8,0 -5,-5 5,-5 8,0 5,5 -5,5" fill="#f0abfc" opacity="0.85" />
                {/* Nến thơm tỏa sáng */}
                <ellipse cx="0" cy="-4" rx="3.5" ry="7.5" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-3" r="1.6" fill="#ffffff" />`;
                break;

            case 5: // TYPE 6: BÚP SEN E ẤP THẢ NƯỚC (ELEGANT LOTUS BUD)
                svgBody = `
                {/* 6. BÚP SEN HỒNG E ẤP ĐÓN TRĂNG */}
                <ellipse cx="0" cy="11" rx="22" ry="5" fill="#f59e0b" opacity="0.5" />
                <ellipse cx="0" cy="11" rx="11" ry="2.8" fill="#fef08a" opacity="0.65" />
                {/* Cánh búp sen khum tròn ôm lấy nhụy */}
                <path d="M 0,-18 C 12,-10 16,3 10,8 C 4,12 -4,12 -10,8 C -16,3 -12,-10 0,-18 Z" fill="#d97706" stroke="#92400e" strokeWidth="0.8" />
                <path d="M 0,-14 C 8,-8 11,2 7,6 C 3,9 -3,9 -7,6 C -11,2 -8,-8 0,-14 Z" fill="#fbbf24" />
                <path d="M 0,-10 Q 4,-3 0,4 Q -4,-3 0,-10 Z" fill="#fef08a" />
                {/* Ánh lửa nến lấp ló */}
                <ellipse cx="0" cy="-7" rx="3.4" ry="7.2" fill="url(#haCandleFlame)" />
                <circle cx="0" cy="-6" r="1.5" fill="#ffffff" />`;
                break;
        }

        return `        <g className="${animClass}">
            <g transform="translate(${x}, ${y}) scale(${scale})" filter="url(#bloomHigh)">${svgBody}
            </g>
        </g>`;
    }

    let newStreamJSX = '<g id="hoian-super-dense-hoa-dang-stream">\n' + 
        positions.map((pos, idx) => {
            const type = idx % 6; // cycle through all 6 distinct types
            return renderHoaDang(type, pos.x, pos.y, pos.scale, pos.animClass);
        }).join('\n\n') + '\n    ';

    content = content.slice(0, sStart) + newStreamJSX + content.slice(sEnd);
    console.log('Successfully replaced all 48 hoa dang with 6 distinct authentic shapes & colors!');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('All updates written to MidAutumnSvgBackdrop.tsx!');
