const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// ==============================================================================
// 1. TRÀ QUÁN HỘI AN (TẦNG 1: THƯỞNG TRÀ SEN & TẦNG 2: VỌNG NGUYỆT LẦU TẤU ĐÀN)
// ==============================================================================
const house1NewDoor = `
        {/* CỬA RA VÀO GỖ & KHÔNG GIAN THƯỞNG TRÀ ĐẠO HỘI AN ĐẦY NGHỆ THUẬT */}
        <rect x="38" y="194" width="98" height="74" rx="3" fill="#140801" />
        <rect x="46" y="200" width="82" height="68" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        {/* Cánh cửa bức bàn gỗ lim mở rộng sang 2 bên */}
        <rect x="38" y="194" width="14" height="74" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <line x1="45" y1="194" x2="45" y2="268" stroke="#451a03" strokeWidth="0.8" />
        <rect x="122" y="194" width="14" height="74" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <line x1="129" y1="194" x2="129" y2="268" stroke="#451a03" strokeWidth="0.8" />

        {/* Kệ gỗ phía sau bày hũ gốm trà cổ Chu Đậu & liễn chữ Trà Đạo */}
        <g opacity="0.85">
            <line x1="52" y1="214" x2="120" y2="214" stroke="#522504" strokeWidth="1.4" />
            <ellipse cx="60" cy="210" rx="3.5" ry="4.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.5" />
            <ellipse cx="72" cy="210" rx="4" ry="4.8" fill="#15803d" stroke="#4ade80" strokeWidth="0.5" />
            <ellipse cx="104" cy="210" rx="3.8" ry="4.5" fill="#b45309" stroke="#f59e0b" strokeWidth="0.5" />
            <ellipse cx="114" cy="210" rx="3.5" ry="4.2" fill="#7c2d12" stroke="#ea580c" strokeWidth="0.5" />
            {/* Liễn gỗ thư pháp treo tường */}
            <rect x="82" y="204" width="14" height="9" rx="1" fill="#451a03" stroke="#ca8a04" strokeWidth="0.5" />
            <text x="89" y="210.5" fill="#fef08a" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="serif">茶</text>
        </g>

        {/* Bàn trà gỗ hương nguyên tấm ở trung tâm */}
        <rect x="55" y="238" width="64" height="28" rx="2" fill="#3b1d06" stroke="#1c0a02" strokeWidth="1.2" />
        <rect x="58" y="239" width="58" height="3" fill="#5c2b09" />
        
        {/* Khay trà trúc, ấm tử sa Nghi Hưng bốc khói & chén trà sen */}
        <ellipse cx="80" cy="239" rx="11" ry="4.5" fill="#1c0a02" stroke="#ca8a04" strokeWidth="0.6" />
        <ellipse cx="77" cy="237" rx="4.5" ry="3" fill="#78350f" stroke="#451a03" strokeWidth="0.6" />
        <circle cx="77" cy="234.5" r="1.2" fill="#9a3412" />
        {/* Dòng nước trà sen hổ phách rót vào chén */}
        <path d="M 81,236 Q 83,237 84,239" fill="none" stroke="#f59e0b" strokeWidth="1.1" strokeLinecap="round" />
        <ellipse cx="85" cy="239" rx="2.5" ry="1.5" fill="#ca8a04" />
        {/* Khói trà thơm nghi ngút */}
        <path d="M 77,233 Q 74,224 78,217 Q 82,211 77,205" fill="none" stroke="#fef08a" strokeWidth="1.2" className="animate-steam" opacity="0.8" />
        
        {/* Đĩa bánh dẻo Trung Thu hoa sen trên bàn */}
        <ellipse cx="98" cy="239" rx="6" ry="2.5" fill="#991b1b" stroke="#ca8a04" strokeWidth="0.5" />
        <circle cx="96" cy="238" r="1.6" fill="#f8fafc" />
        <circle cx="100" cy="238" r="1.6" fill="#fef08a" />

        {/* 1. TRÀ CHỦ: CỤ ÔNG RÂU BẠC (ÁO GẤM LAM, CÚI NGƯỜI RÓT TRÀ SEN ĐIỆU NGHỆ) */}
        <g transform="translate(68, 222)">
            <ellipse cx="0" cy="-15" rx="4.5" ry="2.2" fill="#0f172a" />
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            <path d="M -1.5,-8 Q 0,-2 1.5,-8 Z" fill="#f8fafc" />
            <path d="M -5,-8 L 5,-8 L 6.5,22 L -6.5,22 Z" fill="#1e3a8a" stroke="#172554" strokeWidth="0.8" />
            {/* Tay nâng ấm tử sa rót trà */}
            <path d="M 3,-2 Q 7,2 9,12" fill="none" stroke="#fed7aa" strokeWidth="2.2" strokeLinecap="round" />
        </g>

        {/* 2. VỊ KHÁCH TAO NHÃ: NGỒI GHẾ TRÚC NÂNG CHÉN TRÀ THƯỞNG HƯƠNG */}
        <g transform="translate(104, 224)">
            {/* Tóc búi cài trâm & áo dài xanh ngọc bích */}
            <circle cx="0" cy="-13" r="2" fill="#1e293b" />
            <circle cx="0" cy="-10" r="3.8" fill="#fed7aa" />
            <path d="M -4,-6 L 4,-6 L 5.5,20 L -5.5,20 Z" fill="#0d9488" stroke="#042f2e" strokeWidth="0.6" />
            {/* Tay nâng chén trà lên ngang cằm thưởng hương */}
            <path d="M -2,0 Q -6,-2 -7,-6" fill="none" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="-7" cy="-7" rx="1.8" ry="1.2" fill="#fef08a" />
            <path d="M -7,-9 Q -9,-13 -7,-17" fill="none" stroke="#fef08a" strokeWidth="0.8" className="animate-steam" opacity="0.6" />
        </g>
`;

// ==============================================================================
// 2. ĐỒNG NHÂN ĐƯỜNG - TIỆM THUỐC BẮC (LƯƠNG Y CÂN TIỂU LY, TIỂU ĐỒNG SẮC THUỐC)
// ==============================================================================
const house2NewDoor = `
        {/* CỬA HIỆU THUỐC BẮC MỞ RỘNG & TỦ THUỐC BÁCH NHÃN GIA TRUYỀN */}
        <g>
            <rect x="202" y="196" width="71" height="71" rx="2" fill="#140801" />
            <rect x="207" y="201" width="61" height="66" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            {/* Cánh cửa bức bàn gấp 2 bên */}
            <rect x="202" y="196" width="9" height="71" fill="#291407" stroke="#120601" strokeWidth="0.8" />
            <rect x="264" y="196" width="9" height="71" fill="#291407" stroke="#120601" strokeWidth="0.8" />

            {/* TỦ THUỐC BÁCH NHÃN (HÀNG CHỤC NGĂN KÉO GỖ MUN CÓ NÚM ĐỒNG SÁNG) */}
            <g stroke="#3b1d06" strokeWidth="0.6">
                <line x1="212" y1="205" x2="263" y2="205" />
                <line x1="212" y1="211" x2="263" y2="211" />
                <line x1="212" y1="217" x2="263" y2="217" />
                <line x1="212" y1="223" x2="263" y2="223" />
                <line x1="222" y1="201" x2="222" y2="228" />
                <line x1="233" y1="201" x2="233" y2="228" />
                <line x1="244" y1="201" x2="244" y2="228" />
                <line x1="254" y1="201" x2="254" y2="228" />
                {/* Núm đồng ngăn kéo thếp vàng */}
                <circle cx="217" cy="208" r="0.8" fill="#fef08a" />
                <circle cx="228" cy="208" r="0.8" fill="#fef08a" />
                <circle cx="238" cy="208" r="0.8" fill="#fef08a" />
                <circle cx="249" cy="208" r="0.8" fill="#fef08a" />
                <circle cx="258" cy="208" r="0.8" fill="#fef08a" />
                <circle cx="217" cy="214" r="0.8" fill="#fef08a" />
                <circle cx="228" cy="214" r="0.8" fill="#fef08a" />
                <circle cx="238" cy="214" r="0.8" fill="#fef08a" />
                <circle cx="249" cy="214" r="0.8" fill="#fef08a" />
                <circle cx="258" cy="214" r="0.8" fill="#fef08a" />
                <circle cx="217" cy="220" r="0.8" fill="#fef08a" />
                <circle cx="228" cy="220" r="0.8" fill="#fef08a" />
                <circle cx="238" cy="220" r="0.8" fill="#fef08a" />
                <circle cx="249" cy="220" r="0.8" fill="#fef08a" />
            </g>

            {/* Quầy gỗ bốc thuốc & các gói giấy thuốc bắc vuông vắn */}
            <rect x="211" y="235" width="53" height="30" rx="1.5" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />
            <rect x="213" y="236" width="49" height="2.5" fill="#522504" />
            {/* Các thang thuốc bắc gói giấy dó buộc dây đỏ trên quầy */}
            <rect x="215" y="234" width="6" height="4" rx="0.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.4" />
            <line x1="218" y1="234" x2="218" y2="238" stroke="#dc2626" strokeWidth="0.5" />
            <rect x="223" y="234" width="6" height="4" rx="0.5" fill="#fed7aa" stroke="#ca8a04" strokeWidth="0.4" />
            <line x1="226" y1="234" x2="226" y2="238" stroke="#dc2626" strokeWidth="0.5" />

            {/* Bếp lò than hồng & ấm đất nung sắc thuốc bốc khói ngào ngạt */}
            <g transform="translate(216, 256)">
                <rect x="-3" y="0" width="7" height="6" rx="1" fill="#78350f" stroke="#1c0a02" strokeWidth="0.5" />
                <circle cx="0.5" cy="4" r="1.5" fill="#ef4444" filter="url(#bloomSoft)" />
                <ellipse cx="0.5" cy="-1" rx="3.5" ry="2.2" fill="#292524" stroke="#44403c" strokeWidth="0.5" />
                <path d="M 0,-3 Q -2,-10 1,-16 Q 4,-21 0,-26" fill="none" stroke="#fef08a" strokeWidth="1.1" className="animate-steam" opacity="0.8" />
            </g>

            {/* 1. LƯƠNG Y: CỤ ĐỒ RÂU DÀI CẦM CÂN TIỂU LY ĐỒNG NÂNG NGANG TẦM MẮT */}
            <g transform="translate(247, 222)">
                <ellipse cx="0" cy="-14" rx="4.2" ry="2" fill="#1e3a8a" />
                <circle cx="0" cy="-11" r="4.2" fill="#fed7aa" />
                <circle cx="-1" cy="-11" r="1.2" fill="none" stroke="#78350f" strokeWidth="0.5" />
                <path d="M -1.5,-8 Q 0,-2 1.5,-8" fill="#f8fafc" stroke="#f8fafc" strokeWidth="1.2" />
                <path d="M -5,-7 L 5,-7 L 6.5,20 L -6.5,20 Z" fill="#1d4ed8" stroke="#ca8a04" strokeWidth="0.6" />
                {/* Tay giơ cao cân tiểu ly ngắm quả cân đồng */}
                <line x1="-3" y1="-1" x2="-14" y2="2" stroke="#ca8a04" strokeWidth="1.3" />
                <line x1="-14" y1="2" x2="-14" y2="9" stroke="#f59e0b" strokeWidth="0.8" />
                <circle cx="-14" cy="10" r="2" fill="#ca8a04" />
                <circle cx="-7" cy="2" r="1.2" fill="#ca8a04" />
            </g>

            {/* 2. MÔN ĐỆ: CHÚ TIỂU ĐỒNG ÁO NÂU CẦM CHÀY GIÃ THUỐC TRONG CỐI ĐỒNG */}
            <g transform="translate(232, 226)">
                <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
                <circle cx="0" cy="-13.5" r="1.8" fill="#1c1917" />
                <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#78350f" />
                {/* Cối đồng và chày thuốc */}
                <path d="M -2,12 L 4,12 L 3,18 L -1,18 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
                <line x1="1" y1="2" x2="1" y2="13" stroke="#ca8a04" strokeWidth="1.6" strokeLinecap="round" />
            </g>
        </g>
`;

// ==============================================================================
// 3. CAO LẦU BÀ BÉ (CHAN NƯỚC LÈO BỐC KHÓI, TRỤNG MÌ, KHÁCH NGỒI ĂN MÌ NGON LÀNH)
// ==============================================================================
const house3NewDoor = `
        {/* CỬA RA VÀO BẾP MỞ & NỒI NƯỚC DÙNG CAO LẦU NGHI NGÚT KHÓI */}
        <rect x="24" y="196" width="102" height="74" rx="2" fill="#140801" />
        <rect x="32" y="202" width="86" height="68" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        {/* Cửa gỗ 2 bên */}
        <rect x="24" y="196" width="14" height="74" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="112" y="196" width="14" height="74" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* Bếp quầy nấu cao lầu bên trái & nồi nước lèo đồng sôi sùng sục */}
        <rect x="38" y="238" width="46" height="28" rx="2" fill="#3b1d06" stroke="#1c0e02" strokeWidth="1" />
        <ellipse cx="48" cy="237" rx="8" ry="4.5" fill="#475569" stroke="#1e293b" strokeWidth="1" />
        <ellipse cx="48" cy="236.5" rx="6.5" ry="3.5" fill="#ca8a04" />
        {/* Làn khói thơm ngào ngạt bốc lên từ nồi nước lèo */}
        <path d="M 48,233 Q 44,222 49,215 Q 54,208 48,200" fill="none" stroke="#fef08a" strokeWidth="1.6" className="animate-steam" opacity="0.85" />
        {/* Rổ tre đựng mì Cao Lầu sợi vàng óng */}
        <ellipse cx="62" cy="237" rx="5" ry="2.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.6" />
        <circle cx="62" cy="236" r="2.2" fill="#fef08a" />

        {/* Bàn gỗ ăn mì bên phải: Có đĩa rau sống Trà Quế & tô mì bốc khói */}
        <rect x="88" y="242" width="24" height="24" rx="1.5" fill="#522504" stroke="#1c0a02" strokeWidth="0.8" />
        {/* Đĩa rau Trà Quế xanh mướt */}
        <ellipse cx="94" cy="241" rx="4" ry="2" fill="#15803d" />
        {/* Tô mì Cao Lầu của khách */}
        <ellipse cx="102" cy="241" rx="4" ry="2.2" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
        <path d="M 102,239 Q 100,233 103,227" fill="none" stroke="#fef08a" strokeWidth="0.9" className="animate-steam" opacity="0.75" />

        {/* 1. CHỦ QUÁN (BÀ BÉ - ÁO BÀ BA HỒNG THẮM, CẦM VÁ CHAN NƯỚC SỐT VÀO TÔ) */}
        <g transform="translate(58, 222)">
            <circle cx="0" cy="-11" r="4.4" fill="#fed7aa" />
            <path d="M -3,-15 Q 0,-18 4,-14" stroke="#1e293b" strokeWidth="2.5" fill="none" />
            <path d="M -5,-7 L 5,-7 L 6.5,20 L -6.5,20 Z" fill="#db2777" />
            {/* Tay cầm vá múc nước sốt chan vào tô */}
            <path d="M -3,0 Q -8,6 -9,12" fill="none" stroke="#fed7aa" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="-10" cy="13" rx="3" ry="1.8" fill="#ca8a04" stroke="#78350f" strokeWidth="0.5" />
            {/* Tay kia giữ tô Cao Lầu */}
            <ellipse cx="7" cy="4" rx="5" ry="3.5" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.8" />
        </g>

        {/* 2. PHỤ BẾP: CHÀNG TRAI ÁO NÂU CẦM VỢT TRE TRỤNG MÌ */}
        <g transform="translate(42, 225)">
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
            <line x1="-3" y1="-13" x2="3" y2="-13" stroke="#ffffff" strokeWidth="1.2" />
            <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#78350f" />
            {/* Tay nhúng vợt mì vào nồi */}
            <line x1="2" y1="2" x2="6" y2="11" stroke="#ca8a04" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="6" cy="12" r="2" fill="#fef08a" />
        </g>

        {/* 3. VỊ KHÁCH NGỒI GHẾ GỖ: CẦM ĐŨA GẮP SỢI MÌ CAO LẦU ĂN NGON LÀNH */}
        <g transform="translate(104, 226)">
            <circle cx="0" cy="-10" r="3.8" fill="#fed7aa" />
            <circle cx="0" cy="-13" r="2" fill="#0f172a" />
            <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#0284c7" />
            {/* Đôi đũa gắp mì đưa lên miệng */}
            <line x1="-2" y1="0" x2="-6" y2="-5" stroke="#ca8a04" strokeWidth="1" strokeLinecap="round" />
            <line x1="-1" y1="1" x2="-5" y2="-4" stroke="#ca8a04" strokeWidth="1" strokeLinecap="round" />
            <path d="M -6,-5 Q -5,-8 -6,-10" fill="none" stroke="#fef08a" strokeWidth="1.2" />
        </g>
`;

// ==============================================================================
// 4. QUẢNG ĐÔNG HỘI QUÁN (LỄ BÁI CÚNG RẰM, LƯ TRẦM NGHI NGÚT, TIỂU ĐỒNG GÕ CHUÔNG)
// ==============================================================================
const house4NewDoor = `
        {/* Cổng vòm son đỏ di sản */}
        <path d="M 205,145 C 205,110 285,110 285,145 L 285,268 L 205,268 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 205,145 C 205,110 285,110 285,145 L 285,268 L 205,268 Z" fill="none" stroke="#991b1b" strokeWidth="4" />

        {/* ÁN THỜ QUAN CÔNG SƠN SON THIẾP VÀNG & ĐÔI HẠC CHẦU LINH THIÊNG */}
        <g transform="translate(245, 195)">
            {/* Án gian sơn son dát vàng */}
            <rect x="-24" y="10" width="48" height="24" rx="2" fill="#7f1d1d" stroke="#ca8a04" strokeWidth="1.4" />
            <rect x="-22" y="12" width="44" height="5" fill="#991b1b" stroke="#f59e0b" strokeWidth="0.6" />
            {/* Bát hương đồng đại uy nghiêm */}
            <ellipse cx="0" cy="11" rx="7" ry="3.5" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="0" cy="10" r="2.5" fill="#ef4444" />
            {/* Ba nén nhang vàng đỏ bốc khói trầm uốn lượn bay cao */}
            <line x1="-2" y1="10" x2="-2" y2="2" stroke="#dc2626" strokeWidth="0.8" />
            <line x1="0" y1="10" x2="0" y2="0" stroke="#f59e0b" strokeWidth="0.8" />
            <line x1="2" y1="10" x2="2" y2="2" stroke="#dc2626" strokeWidth="0.8" />
            <path d="M 0,0 Q -4,-12 1,-22 Q 6,-32 0,-40" fill="none" stroke="#fef08a" strokeWidth="1.5" className="animate-steam" opacity="0.85" />

            {/* Mâm ngũ quả & bánh dẻo Trung Thu cúng thần */}
            <ellipse cx="-14" cy="11" rx="5.5" ry="2.5" fill="#ca8a04" />
            <circle cx="-16" cy="9.5" r="2" fill="#eab308" />
            <circle cx="-12" cy="9.5" r="2" fill="#ef4444" />
            
            {/* Đôi nến sáp đỏ thắp sáng 2 bên bàn thờ */}
            <rect x="-22" y="5" width="2" height="7" fill="#dc2626" />
            <circle cx="-21" cy="4" r="1.5" fill="#fef08a" filter="url(#bloomSoft)" />
            <rect x="20" y="5" width="2" height="7" fill="#dc2626" />
            <circle cx="21" cy="4" r="1.5" fill="#fef08a" filter="url(#bloomSoft)" />
        </g>

        {/* 1. TRƯỞNG LÃO HỘI QUÁN (ÁO THỤNG GẤM ĐỎ CHỮ THỌ, THÀNH KÍNH DÂNG NHANG) */}
        <g transform="translate(232, 222)">
            <ellipse cx="0" cy="-16" rx="5" ry="2.5" fill="#7f1d1d" />
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            <path d="M -1.5,-8 Q 0,-2 1.5,-8 Z" fill="#f8fafc" />
            <path d="M -5.5,-8 L 5.5,-8 L 7,22 L -7,22 Z" fill="#b91c1c" stroke="#f59e0b" strokeWidth="1" />
            {/* Hai tay chắp nâng nén nhang vàng bái lạy */}
            <line x1="2" y1="-2" x2="8" y2="-6" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="8" y1="-6" x2="14" y2="-12" stroke="#f59e0b" strokeWidth="1.2" />
            <circle cx="14" cy="-12" r="1.2" fill="#ef4444" filter="url(#bloomSoft)" />
        </g>

        {/* 2. CHÚ TIỂU ĐỒNG: GÕ CHUÔNG ĐỒNG NGÂN VANG ĐÊM RẰM */}
        <g transform="translate(268, 225)">
            <circle cx="0" cy="-11" r="3.6" fill="#fed7aa" />
            <circle cx="0" cy="-14" r="1.8" fill="#1c1917" />
            <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
            {/* Dùi gõ vào chuông đồng */}
            <ellipse cx="8" cy="6" rx="4" ry="6" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
            <line x1="-2" y1="2" x2="6" y2="5" stroke="#fed7aa" strokeWidth="1.6" strokeLinecap="round" />
        </g>
`;

// ==============================================================================
// 5. GỐM THANH HÀ (NGHỆ NHÂN NẮN GỐM BÀN XOAY, CÔ GÁI CHẤM MEN LAM VẼ HOA VĂN)
// ==============================================================================
const house5NewDoor = `
        {/* CỬA HIỆU GỐM MỞ SÁNG & XƯỞNG GỐM ĐẤT NUNG TRUYỀN THỐNG */}
        <g>
            <rect x="375" y="202" width="85" height="78" rx="2" fill="#140801" />
            <rect x="382" y="207" width="71" height="73" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            {/* Cửa gỗ 2 bên */}
            <rect x="375" y="202" width="12" height="78" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />
            <rect x="448" y="202" width="12" height="78" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />

            {/* Kệ gỗ 3 tầng trưng bày các sản phẩm gốm Thanh Hà nổi tiếng */}
            <g opacity="0.85">
                <line x1="388" y1="216" x2="446" y2="216" stroke="#78350f" strokeWidth="1.2" />
                <ellipse cx="394" cy="212" rx="3.5" ry="4.5" fill="#ea580c" stroke="#ca8a04" strokeWidth="0.6" />
                <ellipse cx="406" cy="213" rx="4.5" ry="2.8" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.6" />
                <ellipse cx="430" cy="212" rx="3.5" ry="4" fill="#b45309" />
                <ellipse cx="440" cy="213" rx="3" ry="3" fill="#15803d" />
            </g>

            {/* BÀN XOAY GỐM VÀ CHIẾC BÌNH GỐM ĐANG ĐƯỢC CHUỐT NẮN */}
            <ellipse cx="414" cy="254" rx="14" ry="4.5" fill="#57534e" stroke="#292524" strokeWidth="1.2" />
            <ellipse cx="414" cy="253" rx="12" ry="3.8" fill="#78716c" />
            {/* Chiếc bình gốm đất nung đang xoay nặn thành hình */}
            <path d="M 410,252 Q 407,242 414,236 Q 421,242 418,252 Z" fill="#c2410c" stroke="#7c2d12" strokeWidth="0.7" />
            <ellipse cx="414" cy="236" rx="2.5" ry="1" fill="#ea580c" />

            {/* 1. NGHỆ NHÂN GỐM: NGỒI KHOM LƯNG NẮN VUỐT BÌNH ĐẤT SÉT */}
            <g transform="translate(404, 238)">
                <circle cx="0" cy="-10" r="4" fill="#fed7aa" />
                <path d="M -4.5,-6 L 4.5,-6 L 6,18 L -6,18 Z" fill="#b45309" />
                {/* Đôi bàn tay ôm vuốt chiếc bình gốm trên bàn xoay */}
                <path d="M 3,2 Q 8,8 10,12" fill="none" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
            </g>

            {/* 2. CÔ THỢ VẼ GỐM: CẦM CỌ CHẤM MEN LAM VẼ HOA VĂN HOA SEN */}
            <g transform="translate(436, 236)">
                <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
                <circle cx="0" cy="-14" r="2" fill="#1c1917" />
                <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#eab308" />
                {/* Đĩa gốm tròn trên tay */}
                <circle cx="-6" cy="4" r="5" fill="#f8fafc" stroke="#0284c7" strokeWidth="0.8" />
                {/* Tay cầm cọ vẽ hoa sen */}
                <line x1="-1" y1="0" x2="-5" y2="4" stroke="#fed7aa" strokeWidth="1.6" strokeLinecap="round" />
                <line x1="-5" y1="4" x2="-8" y2="4" stroke="#0284c7" strokeWidth="0.8" />
            </g>
        </g>
`;

// ==============================================================================
// 6. BÁNH MÌ HỘI AN (XẺ BÁNH GIÒN RỤM, QUẾT PATE BỐC KHÓI, KHÁCH CẦM TIỀN CHỜ LẤY)
// ==============================================================================
const house6NewDoor = `
        {/* CỬA HÀNG BÁNH MÌ MỞ & QUẦY TỦ BÁNH VÀNG ÓNG BỐC KHÓI THƠM LỪNG */}
        <g>
            <rect x="522" y="200" width="76" height="80" rx="2" fill="#140801" />
            <rect x="528" y="205" width="64" height="75" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            {/* Cửa gỗ 2 bên */}
            <rect x="522" y="200" width="10" height="80" fill="#291407" stroke="#120601" strokeWidth="0.8" />
            <rect x="588" y="200" width="10" height="80" fill="#291407" stroke="#120601" strokeWidth="0.8" />

            {/* Quầy tủ kính bánh mì giòn rụm & khay nhân thịt thơm nức */}
            <rect x="530" y="240" width="60" height="28" rx="1.5" fill="#3b1d06" stroke="#ca8a04" strokeWidth="0.8" />
            <rect x="532" y="242" width="28" height="14" fill="#0f172a" opacity="0.5" stroke="#94a3b8" strokeWidth="0.5" />
            {/* Các ổ bánh mì vàng ươm xếp giòn rụm */}
            <ellipse cx="538" cy="247" rx="4.5" ry="2.2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.5" />
            <ellipse cx="548" cy="247" rx="4.5" ry="2.2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.5" />
            <ellipse cx="554" cy="247" rx="4" ry="2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.5" />
            {/* Âu pate nóng hổi bốc cuộn khói thơm ngát */}
            <ellipse cx="566" cy="246" rx="4.5" ry="2.5" fill="#78350f" stroke="#ca8a04" strokeWidth="0.6" />
            <path d="M 566,243 Q 562,234 567,227 Q 571,220 565,214" fill="none" stroke="#fef08a" strokeWidth="1.3" className="animate-steam" opacity="0.85" />

            {/* 1. CHỊ CHỦ BÁNH MÌ: ÁO HOA TẠP DỀ TRẮNG, CẦM DAO XẺ BÁNH & QUẾT PATE */}
            <g transform="translate(565, 226)">
                <circle cx="0" cy="-11" r="4" fill="#fed7aa" />
                <circle cx="0" cy="-15" r="2.5" fill="#1c1917" />
                <path d="M -4.5,-7 L 4.5,-7 L 6,19 L -6,19 Z" fill="#e11d48" />
                <rect x="-3" y="-3" width="6" height="14" fill="#f8fafc" opacity="0.9" />
                {/* Dao xẻ bánh mì và ổ bánh đang kẹp nhân */}
                <ellipse cx="-8" cy="5" rx="4.5" ry="2.2" fill="#f59e0b" stroke="#ca8a04" strokeWidth="0.6" />
                <line x1="-3" y1="2" x2="-8" y2="4" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* 2. VỊ KHÁCH ĐỨNG CHỜ: CẦM TIỀN HÁO HỨC NHẬN BÁNH NÓNG GÓI GIẤY BÁO */}
            <g transform="translate(542, 228)">
                <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
                <path d="M -4,-6 L 4,-6 L 5,18 L -5,18 Z" fill="#0284c7" />
                {/* Tay đưa tiền và nhận ổ bánh gói giấy */}
                <line x1="2" y1="2" x2="8" y2="4" stroke="#fed7aa" strokeWidth="1.5" strokeLinecap="round" />
                <rect x="8" y="2" width="6" height="4" rx="0.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
            </g>
        </g>
`;

// ==============================================================================
// 7. TƠ LỤA Á ĐÔNG (TIỂU THƯ ƯỚM ÁO DÀI TRƯỚC GƯƠNG, THỢ CẦM THƯỚC DÂY MAY ĐO)
// ==============================================================================
const house7NewDoor = `
        <rect x="42" y="200" width="100" height="75" rx="3" fill="#140801" />
        <rect x="52" y="208" width="80" height="67" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        <rect x="42" y="200" width="18" height="75" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="124" y="200" width="18" height="75" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* GIÀN LỤA TƠ TẰM NGŨ SẮC BUÔNG RỦ & KHUNG CỬI DỆT VẢI */}
        <g opacity="0.85">
            <line x1="58" y1="216" x2="118" y2="216" stroke="#451a03" strokeWidth="1.6" />
            {/* Các dải lụa mềm mại buông rủ: Hồng sen, Vàng óng, Xanh ngọc, Tím huế */}
            <path d="M 62,216 Q 64,228 62,242" fill="none" stroke="#ec4899" strokeWidth="2.5" opacity="0.9" />
            <path d="M 68,216 Q 70,230 68,244" fill="none" stroke="#f59e0b" strokeWidth="2.5" opacity="0.9" />
            <path d="M 108,216 Q 106,230 108,244" fill="none" stroke="#06b6d4" strokeWidth="2.5" opacity="0.9" />
            <path d="M 114,216 Q 112,228 114,242" fill="none" stroke="#a855f7" strokeWidth="2.5" opacity="0.9" />
        </g>

        {/* Gương soi toàn thân viền đồng cổ điển bên góc */}
        <ellipse cx="60" cy="242" rx="5" ry="14" fill="#e2e8f0" stroke="#ca8a04" strokeWidth="1" />
        <ellipse cx="60" cy="242" rx="3.5" ry="12" fill="#f8fafc" opacity="0.7" />

        {/* Bàn may gỗ, súc vải gấm & kéo cắt vải bằng đồng */}
        <rect x="74" y="244" width="44" height="22" rx="1.5" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />
        <rect x="78" y="242" width="14" height="5" rx="1" fill="#ec4899" />
        <line x1="96" y1="243" x2="102" y2="246" stroke="#ca8a04" strokeWidth="1.2" />

        {/* 1. TIỂU THƯ ĐÀI CÁC: ĐỨNG DUYÊN DÁNG ƯỚM ÁO DÀI LỤA HỒNG TRƯỚC GƯƠNG */}
        <g transform="translate(74, 224)">
            <circle cx="0" cy="-13" r="2" fill="#1c1917" />
            <circle cx="0" cy="-10" r="3.8" fill="#fed7aa" />
            <path d="M -4,-6 L 4,-6 L 5.5,21 L -5.5,21 Z" fill="#db2777" stroke="#9d174d" strokeWidth="0.6" />
            {/* Khăn voan lụa quàng vai thướt tha */}
            <path d="M -3,-3 Q 0,4 3,-3" fill="none" stroke="#fbcfe8" strokeWidth="1.5" />
        </g>

        {/* 2. CÔ THỢ MAY: QUÀNG THƯỚC DÂY VÀNG, KHOM NGƯỜI ĐO TÀ ÁO CHO KHÁCH */}
        <g transform="translate(98, 226)">
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
            <circle cx="0" cy="-13" r="2" fill="#1c1917" />
            <path d="M -4,-6 L 4,-6 L 5,20 L -5,20 Z" fill="#0d9488" />
            {/* Thước dây may quàng qua cổ */}
            <path d="M -2,-3 Q 0,2 2,-3" fill="none" stroke="#fef08a" strokeWidth="1" />
            {/* Tay cầm thước đo tà áo */}
            <line x1="-2" y1="2" x2="-14" y2="12" stroke="#fef08a" strokeWidth="1.3" strokeLinecap="round" />
        </g>
`;

// ==============================================================================
// 8. TIỆM LỒNG ĐÈN HUỲNH VĂN (NGHỆ NHÂN DÁN LỤA NAN TRE, EM BÉ CẦM ĐÈN ÔNG SAO)
// ==============================================================================
const house8NewDoor = `
        {/* CỬA TIỆM LỒNG ĐÈN RỰC RỠ SẮC MÀU */}
        <rect x="238" y="198" width="104" height="76" rx="3" fill="#140801" />
        <rect x="246" y="206" width="88" height="68" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        <rect x="238" y="198" width="16" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="326" y="198" width="16" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* DÀN LỒNG ĐÈN TREO LUNG LINH TỎA SÁNG KHẮP KHÔNG GIAN TIỆM */}
        <ellipse cx="258" cy="210" rx="5" ry="7" fill="#ef4444" filter="url(#bloomHigh)" />
        <ellipse cx="276" cy="207" rx="4.5" ry="6.5" fill="#f59e0b" filter="url(#bloomHigh)" />
        <ellipse cx="295" cy="209" rx="5" ry="7" fill="#06b6d4" filter="url(#bloomHigh)" />
        <ellipse cx="314" cy="207" rx="4.5" ry="6.5" fill="#ec4899" filter="url(#bloomHigh)" />

        {/* Đèn kéo quân mini đang quay nhẹ giữa tiệm */}
        <g transform="translate(285, 220)">
            <rect x="-4" y="0" width="8" height="9" rx="1" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.6" filter="url(#bloomSoft)" />
            <circle cx="0" cy="4.5" r="1.5" fill="#ef4444" />
        </g>

        {/* Bàn làm việc của nghệ nhân với nan tre uốn khung & chậu hồ dán */}
        <rect x="254" y="240" width="50" height="26" rx="1.5" fill="#3b1d06" stroke="#1c0a02" strokeWidth="0.8" />
        <ellipse cx="260" cy="239" rx="4" ry="2" fill="#ca8a04" />

        {/* 1. NGHỆ NHÂN HUỲNH VĂN: NGỒI GHẾ CHUỐT NAN TRE & DÁN LỤA LÊN KHUNG ĐÈN */}
        <g transform="translate(268, 226)">
            <circle cx="0" cy="-10" r="3.8" fill="#fed7aa" />
            <path d="M -1,-7 Q 0,-3 1,-7" fill="#f8fafc" stroke="#f8fafc" strokeWidth="0.8" />
            <path d="M -4,-6 L 4,-6 L 5,20 L -5,20 Z" fill="#451a03" />
            {/* Khung đèn hoa sen đang phết hồ dán lụa đỏ */}
            <ellipse cx="8" cy="5" rx="5" ry="6.5" fill="#ef4444" stroke="#b91c1c" strokeWidth="0.8" />
            <line x1="2" y1="2" x2="7" y2="5" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* 2. EM BÉ NHỎ: HÁO HỨC GIƠ TAY CẦM ĐÈN ÔNG SAO 5 CÁNH LẤP LÁNH */}
        <g transform="translate(308, 230)">
            <circle cx="0" cy="-8" r="3.2" fill="#fed7aa" />
            <path d="M -3,-5 L 3,-5 L 4,14 L -4,14 Z" fill="#e11d48" />
            {/* Cầm cán đèn ông sao vàng viền đỏ phát sáng */}
            <line x1="-1" y1="0" x2="-8" y2="-6" stroke="#ca8a04" strokeWidth="1.2" strokeLinecap="round" />
            <polygon points="-8,-12 -6,-8 -2,-8 -5,-5 -3,-1 -8,-4 -13,-1 -11,-5 -14,-8 -10,-8" 
                     fill="#fef08a" stroke="#dc2626" strokeWidth="0.6" filter="url(#bloomSoft)" />
        </g>
`;

// ==============================================================================
// 9. CÀ PHÊ FAIFO 1932 (BARISTA PHA PHIN BỐC KHÓI, KHÁCH NHÂM NHI BÁNH TRUNG THU)
// ==============================================================================
const house9NewDoor = `
        {/* CỬA QUÁN CÀ PHÊ & QUẦY BAR GỖ INDOCHINE CỔ ĐIỂN */}
        <rect x="445" y="198" width="134" height="76" rx="3" fill="#140801" />
        <rect x="455" y="206" width="114" height="68" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
        <rect x="445" y="198" width="18" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
        <rect x="561" y="198" width="18" height="76" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />

        {/* QUẦY BAR PHA CHẾ INDOCHINE & DÃY PHIN CÀ PHÊ NHÔM NHỎ GIỌT BỐC KHÓI */}
        <rect x="468" y="238" width="56" height="28" rx="2" fill="#3b1d06" stroke="#1c0e02" strokeWidth="1" />
        <rect x="470" y="239" width="52" height="2.5" fill="#522504" />
        
        {/* Bộ phin cà phê nhôm tí tách nhỏ giọt xuống ly thủy tinh có lớp sữa vàng */}
        <g transform="translate(484, 237)">
            <rect x="-2.5" y="0" width="5" height="6" rx="0.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
            <rect x="-2" y="4" width="4" height="2" fill="#fef08a" />
            <rect x="-2" y="1" width="4" height="3" fill="#451a03" />
            <rect x="-3" y="-3" width="6" height="3" fill="#cbd5e1" />
            <path d="M 0,-4 Q -3,-10 1,-16 Q 5,-22 0,-28" fill="none" stroke="#fef08a" strokeWidth="1.2" className="animate-steam" opacity="0.8" />
        </g>
        
        <g transform="translate(496, 237)">
            <rect x="-2.5" y="0" width="5" height="6" rx="0.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="0.5" />
            <rect x="-2" y="4" width="4" height="2" fill="#fef08a" />
            <rect x="-2" y="1" width="4" height="3" fill="#451a03" />
            <rect x="-3" y="-3" width="6" height="3" fill="#cbd5e1" />
            <path d="M 0,-4 Q 3,-10 -1,-16" fill="none" stroke="#fef08a" strokeWidth="1" className="animate-steam" opacity="0.7" />
        </g>

        {/* BÀN GỖ KHÁCH NGỒI UỐNG CÀ PHÊ & THƯỞNG THỨC BÁNH TRUNG THU */}
        <rect x="528" y="242" width="28" height="24" rx="1.5" fill="#522504" stroke="#1c0a02" strokeWidth="0.8" />
        {/* Ly cà phê sữa đá & đĩa bánh Trung Thu cắt múi */}
        <rect x="532" y="239" width="3.5" height="5" rx="0.5" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.5" />
        <ellipse cx="542" cy="241" rx="5" ry="2.2" fill="#f8fafc" stroke="#ca8a04" strokeWidth="0.5" />
        <circle cx="542" cy="240" r="1.8" fill="#d97706" />

        {/* 1. ANH BARISTA: SƠ MI TRẮNG GILE ĐEN ĐIỆU NGHỆ RÓT NƯỚC SÔI ẤM CỔ NGỖNG */}
        <g transform="translate(508, 222)">
            <circle cx="0" cy="-11" r="3.8" fill="#fed7aa" />
            <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#f8fafc" />
            <path d="M -3,-5 L 3,-5 L 4,14 L -4,14 Z" fill="#451a03" />
            {/* Tay nâng ấm đồng rót nước sôi */}
            <path d="M -3,0 Q -8,2 -11,8" fill="none" stroke="#fed7aa" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="-12" cy="9" rx="3" ry="2.2" fill="#ca8a04" />
        </g>

        {/* 2. VỊ KHÁCH NGỒI THƯỞNG THỨC: NÂNG TÁCH CÀ PHÊ CHUYỆN TRÒ */}
        <g transform="translate(548, 224)">
            <circle cx="0" cy="-10" r="3.6" fill="#fed7aa" />
            <circle cx="0" cy="-13" r="2" fill="#1c1917" />
            <path d="M -4,-6 L 4,-6 L 5.5,20 L -5.5,20 Z" fill="#eab308" />
            {/* Tay nâng tách cà phê */}
            <line x1="-2" y1="0" x2="-6" y2="4" stroke="#fed7aa" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse cx="-7" cy="4" rx="2" ry="1.5" fill="#f8fafc" />
        </g>
`;

// Replace each doorway in code
function replaceBetween(src, startStr, endStr, newContent) {
  const sIdx = src.indexOf(startStr);
  if (sIdx === -1) throw new Error('Start string not found: ' + startStr);
  const eIdx = src.indexOf(endStr, sIdx);
  if (eIdx === -1) throw new Error('End string not found: ' + endStr);
  return src.substring(0, sIdx) + newContent.trim() + '\n\n        ' + src.substring(eIdx);
}

code = replaceBetween(
  code,
  '{/* CỬA RA VÀO GỖ & QUẦY TRÀ THẢO MỘC HỘI AN */}',
  '<g filter="url(#dropShadow)">\n            <path d="M -28,84',
  house1NewDoor
);

code = replaceBetween(
  code,
  '{/* CỬA HIỆU THUỐC BẮC MỞ RỘNG & TỦ THUỐC TRĂM NGĂN GỖ CỔ */}',
  '<g filter="url(#dropShadow)">\n            <path d="M 153,72',
  house2NewDoor
);

code = replaceBetween(
  code,
  '{/* CỬA RA VÀO BẾP MỞ & NỒI NƯỚC DÙNG CAO LẦU NGHI NGÚT KHÓI */}',
  '<g filter="url(#dropShadow)">\n            <path d="M 116,78',
  house3NewDoor
);

code = replaceBetween(
  code,
  '{/* Cổng vòm son đỏ di sản */}',
  '<g transform="translate(185, 125) scale(1.2)" filter="url(#bloomSoft)">',
  house4NewDoor
);

code = replaceBetween(
  code,
  '{/* CỬA HIỆU GỐM MỞ SÁNG & BÀN XOAY NẮN GỐM TRUYỀN THỐNG */}',
  '<g filter="url(#dropShadow)">\n            <path d="M 323,104',
  house5NewDoor
);

code = replaceBetween(
  code,
  '{/* CỬA HÀNG BÁNH MÌ MỞ & QUẦY TỦ BÁNH VÀNG ÓNG BỐC KHÓI THƠM LỪNG */}',
  '<g filter="url(#dropShadow)">\n            <path d="M 466,90',
  house6NewDoor
);

code = replaceBetween(
  code,
  '<rect x="42" y="200" width="100" height="75" rx="3" fill="#140801" />',
  '<g filter="url(#dropShadow)">\n            <path d="M -28,94',
  house7NewDoor
);

code = replaceBetween(
  code,
  '{/* CỬA TIỆM LỒNG ĐÈN RỰC RỠ SẮC MÀU */}',
  '<g filter="url(#dropShadow)">\n            <path d="M 152,70',
  house8NewDoor
);

code = replaceBetween(
  code,
  '{/* CỬA QUÁN CÀ PHÊ & QUẦY BAR GỖ CỔ ĐIỂN */}',
  '<g filter="url(#dropShadow)">\n            <path d="M 364,90',
  house9NewDoor
);

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild verification PASSED!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully added vibrant, living activities to all 9 houses!');
} catch (err) {
  console.error('esbuild verification FAILED:', err.message);
  process.exit(1);
}
