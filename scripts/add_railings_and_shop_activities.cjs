const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const targetFile = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let content = fs.readFileSync(targetFile, 'utf8');

// ==============================================================================
// 1. ADD CSS KEYFRAMES FOR IN-SHOP MOVEMENTS & SHOP PATRON ENTER/EXIT
// ==============================================================================
const newStyleKeyframes = `
                /* --- CỬ ĐỘNG NHÂN VẬT TRONG CÁC CỬA TIỆM (IN-SHOP MICRO-ANIMATIONS) --- */
                /* 1. Trà sư rót trà sen & Khách nâng chén */
                @keyframes hoian-tea-pour {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-14deg); }
                }
                .animate-tea-pour {
                    animation: hoian-tea-pour 4.5s ease-in-out infinite;
                    transform-origin: 3px -2px;
                }
                @keyframes hoian-tea-sip {
                    0%, 100% { transform: translate(0, 0); }
                    40%, 60% { transform: translate(1px, -3.5px); }
                }
                .animate-tea-sip {
                    animation: hoian-tea-sip 5.2s ease-in-out infinite -1.5s;
                }

                /* 2. Lương y cân tiểu ly & Tiểu đồng giã thuốc */
                @keyframes hoian-herb-scale {
                    0%, 100% { transform: rotate(0deg); }
                    30% { transform: rotate(8deg); }
                    70% { transform: rotate(-6deg); }
                }
                .animate-herb-scale {
                    animation: hoian-herb-scale 4s ease-in-out infinite;
                    transform-origin: -3px -1px;
                }
                @keyframes hoian-herb-pestle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                .animate-herb-pestle {
                    animation: hoian-herb-pestle 1.6s ease-in-out infinite;
                }

                /* 3. Bà Bé chan vá nước sốt & Khách gắp mì */
                @keyframes hoian-ladle-sauce {
                    0%, 100% { transform: rotate(0deg) translate(0, 0); }
                    35% { transform: rotate(-20deg) translate(-2px, -3px); }
                    70% { transform: rotate(5deg) translate(1px, 2px); }
                }
                .animate-ladle-sauce {
                    animation: hoian-ladle-sauce 3.6s ease-in-out infinite;
                    transform-origin: 2px 2px;
                }
                @keyframes hoian-noodle-dip {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-noodle-dip {
                    animation: hoian-noodle-dip 2.8s ease-in-out infinite -0.8s;
                }
                @keyframes hoian-eat-noodles {
                    0%, 100% { transform: translate(0, 0); }
                    40%, 60% { transform: translate(1px, -3px); }
                }
                .animate-eat-noodles {
                    animation: hoian-eat-noodles 3.2s ease-in-out infinite -1.2s;
                }

                /* 4. Trưởng lão cúi mình dâng nhang & Tiểu đồng gõ chuông */
                @keyframes hoian-pray-bow {
                    0%, 100% { transform: rotate(0deg); }
                    45%, 65% { transform: rotate(12deg); }
                }
                .animate-pray-bow {
                    animation: hoian-pray-bow 6s ease-in-out infinite;
                    transform-origin: 0 16px;
                }
                @keyframes hoian-strike-bell {
                    0%, 100% { transform: rotate(0deg); }
                    40% { transform: rotate(-18deg); }
                    50% { transform: rotate(8deg); }
                }
                .animate-strike-bell {
                    animation: hoian-strike-bell 3.5s ease-in-out infinite -0.5s;
                    transform-origin: 0 0;
                }

                /* 5. Thợ chuốt gốm & Thợ vẽ hoa sen */
                @keyframes hoian-pottery-wheel {
                    0%, 100% { transform: scaleX(1); }
                    50% { transform: scaleX(0.92) translateY(-1px); }
                }
                .animate-pottery-wheel {
                    animation: hoian-pottery-wheel 2.4s ease-in-out infinite;
                    transform-origin: 0 10px;
                }
                @keyframes hoian-pottery-paint {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-2px, 2px); }
                }
                .animate-pottery-paint {
                    animation: hoian-pottery-paint 2s ease-in-out infinite;
                }

                /* 6. Chị chủ xẻ bánh mì & Khách chờ nhận */
                @keyframes hoian-slice-bread {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    50% { transform: translate(2.5px, 0) rotate(-6deg); }
                }
                .animate-slice-bread {
                    animation: hoian-slice-bread 1.8s ease-in-out infinite;
                    transform-origin: 0 2px;
                }
                @keyframes hoian-wait-customer {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-1.5px); }
                }
                .animate-wait-customer {
                    animation: hoian-wait-customer 4s ease-in-out infinite;
                }

                /* 7. Tiểu thư ướm áo dài trước gương & Thợ may đo tà */
                @keyframes hoian-silk-pose {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(4deg); }
                }
                .animate-silk-pose {
                    animation: hoian-silk-pose 5s ease-in-out infinite;
                    transform-origin: 0 15px;
                }
                @keyframes hoian-tailor-measure {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(2.5px); }
                }
                .animate-tailor-measure {
                    animation: hoian-tailor-measure 3s ease-in-out infinite;
                }

                /* 8. Nghệ nhân vuốt nan dán lồng đèn & Em bé giơ đèn ông sao */
                @keyframes hoian-craft-lantern {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-8deg); }
                }
                .animate-craft-lantern {
                    animation: hoian-craft-lantern 3.2s ease-in-out infinite;
                    transform-origin: 0 4px;
                }
                @keyframes hoian-star-lantern {
                    0%, 100% { transform: rotate(0deg); }
                    30% { transform: rotate(-15deg); }
                    70% { transform: rotate(12deg); }
                }
                .animate-star-lantern {
                    animation: hoian-star-lantern 3s ease-in-out infinite;
                    transform-origin: 0 0;
                }

                /* 9. Barista rót nước pha phin & Khách thưởng thức */
                @keyframes hoian-barista-drip {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-12deg); }
                }
                .animate-barista-drip {
                    animation: hoian-barista-drip 4s ease-in-out infinite;
                    transform-origin: 2px 2px;
                }

                /* --- KHÁCH DẠO PHỐ BƯỚC RA VÀO CÁC TIỆM (SHOP ENTRANCE & EXIT PATRONS) --- */
                /* Chu kỳ: Đi từ lòng đường vào tiệm -> Dừng mua sắm/thưởng thức -> Bước ra phố */
                @keyframes hoian-patron-caolau {
                    0% { transform: translate(620px, 528px) scale(1.22); opacity: 0; }
                    8% { opacity: 1; }
                    28% { transform: translate(695px, 506px) scale(1.08); opacity: 1; }
                    35% { transform: translate(715px, 498px) scale(0.98); opacity: 0.95; }
                    48% { transform: translate(718px, 498px) scale(0.98); opacity: 0.95; }
                    60% { transform: translate(715px, 498px) scale(-0.98, 0.98); opacity: 0.95; }
                    75% { transform: translate(740px, 508px) scale(-1.08, 1.08); opacity: 1; }
                    92% { transform: translate(800px, 528px) scale(-1.22, 1.22); opacity: 1; }
                    100% { transform: translate(820px, 528px) scale(-1.22, 1.22); opacity: 0; }
                }
                .animate-patron-caolau {
                    animation: hoian-patron-caolau 26s ease-in-out infinite;
                }

                @keyframes hoian-patron-banhmi {
                    0% { transform: translate(1130px, 528px) scale(1.2); opacity: 0; }
                    8% { opacity: 1; }
                    26% { transform: translate(1185px, 506px) scale(1.06); opacity: 1; }
                    34% { transform: translate(1202px, 498px) scale(0.96); opacity: 0.95; }
                    50% { transform: translate(1205px, 498px) scale(0.96); opacity: 0.95; }
                    62% { transform: translate(1202px, 498px) scale(-0.96, 0.96); opacity: 0.95; }
                    78% { transform: translate(1230px, 508px) scale(-1.06, 1.06); opacity: 1; }
                    92% { transform: translate(1290px, 528px) scale(-1.2, 1.2); opacity: 1; }
                    100% { transform: translate(1310px, 528px) scale(-1.2, 1.2); opacity: 0; }
                }
                .animate-patron-banhmi {
                    animation: hoian-patron-banhmi 24s ease-in-out infinite -8s;
                }

                @keyframes hoian-patron-hoiquan {
                    0% { transform: translate(820px, 530px) scale(1.24); opacity: 0; }
                    8% { opacity: 1; }
                    28% { transform: translate(875px, 508px) scale(1.08); opacity: 1; }
                    36% { transform: translate(895px, 498px) scale(0.98); opacity: 0.95; }
                    52% { transform: translate(895px, 498px) scale(0.98); opacity: 0.95; }
                    64% { transform: translate(895px, 498px) scale(-0.98, 0.98); opacity: 0.95; }
                    80% { transform: translate(920px, 510px) scale(-1.08, 1.08); opacity: 1; }
                    93% { transform: translate(975px, 530px) scale(-1.24, 1.24); opacity: 1; }
                    100% { transform: translate(995px, 530px) scale(-1.24, 1.24); opacity: 0; }
                }
                .animate-patron-hoiquan {
                    animation: hoian-patron-hoiquan 30s ease-in-out infinite -14s;
                }

                @keyframes hoian-patron-longden {
                    0% { transform: translate(1460px, 528px) scale(1.2); opacity: 0; }
                    8% { opacity: 1; }
                    28% { transform: translate(1510px, 506px) scale(1.06); opacity: 1; }
                    36% { transform: translate(1530px, 498px) scale(0.96); opacity: 0.95; }
                    50% { transform: translate(1530px, 498px) scale(0.96); opacity: 0.95; }
                    62% { transform: translate(1530px, 498px) scale(-0.96, 0.96); opacity: 0.95; }
                    78% { transform: translate(1555px, 508px) scale(-1.06, 1.06); opacity: 1; }
                    92% { transform: translate(1610px, 528px) scale(-1.2, 1.2); opacity: 1; }
                    100% { transform: translate(1630px, 528px) scale(-1.2, 1.2); opacity: 0; }
                }
                .animate-patron-longden {
                    animation: hoian-patron-longden 28s ease-in-out infinite -5s;
                }

                @keyframes hoian-patron-traquan {
                    0% { transform: translate(370px, 528px) scale(1.2); opacity: 0; }
                    8% { opacity: 1; }
                    28% { transform: translate(425px, 506px) scale(1.06); opacity: 1; }
                    36% { transform: translate(445px, 498px) scale(0.96); opacity: 0.95; }
                    52% { transform: translate(445px, 498px) scale(0.96); opacity: 0.95; }
                    64% { transform: translate(445px, 498px) scale(-0.96, 0.96); opacity: 0.95; }
                    80% { transform: translate(470px, 508px) scale(-1.06, 1.06); opacity: 1; }
                    93% { transform: translate(525px, 528px) scale(-1.2, 1.2); opacity: 1; }
                    100% { transform: translate(545px, 528px) scale(-1.2, 1.2); opacity: 0; }
                }
                .animate-patron-traquan {
                    animation: hoian-patron-traquan 32s ease-in-out infinite -18s;
                }

                @keyframes hoian-patron-tolua {
                    0% { transform: translate(1320px, 528px) scale(1.2); opacity: 0; }
                    8% { opacity: 1; }
                    28% { transform: translate(1370px, 506px) scale(1.06); opacity: 1; }
                    36% { transform: translate(1390px, 498px) scale(0.96); opacity: 0.95; }
                    50% { transform: translate(1390px, 498px) scale(0.96); opacity: 0.95; }
                    62% { transform: translate(1390px, 498px) scale(-0.96, 0.96); opacity: 0.95; }
                    78% { transform: translate(1415px, 508px) scale(-1.06, 1.06); opacity: 1; }
                    92% { transform: translate(1470px, 528px) scale(-1.2, 1.2); opacity: 1; }
                    100% { transform: translate(1490px, 528px) scale(-1.2, 1.2); opacity: 0; }
                }
                .animate-patron-tolua {
                    animation: hoian-patron-tolua 27s ease-in-out infinite -11s;
                }
`;

// Insert new CSS right before `}</style>
const styleClosingTag = '`}</style>';
if (content.includes(styleClosingTag)) {
  content = content.replace(styleClosingTag, newStyleKeyframes + '\n            ' + styleClosingTag);
  console.log('Successfully added in-shop and patron entrance keyframes to CSS!');
} else {
  console.error('ERROR: Could not find `}</style> tag!');
}

// ==============================================================================
// 2. ATTACH ANIMATION CLASSES TO IN-SHOP CHARACTERS
// ==============================================================================

// 1. Trà Quán: Cụ ông rót trà (line ~ 1064)
content = content.replace(
  '{/* Tay nâng ấm tử sa rót trà */}\n            <path d="M 3,-2 Q 7,2 9,12" fill="none" stroke="#fed7aa" strokeWidth="2.2" strokeLinecap="round" />',
  '{/* Tay nâng ấm tử sa rót trà */}\n            <g className="animate-tea-pour"><path d="M 3,-2 Q 7,2 9,12" fill="none" stroke="#fed7aa" strokeWidth="2.2" strokeLinecap="round" /></g>'
);

// 4. Quảng Đông Hội Quán: Trưởng lão cúi mình dâng nhang & Tiểu đồng gõ chuông
content = content.replace(
  '{/* 1. TRƯỞNG LÃO HỘI QUÁN (ÁO THỤNG GẤM ĐỎ CHỮ THỌ, THÀNH KÍNH DÂNG NHANG) */}\n        <g transform="translate(232, 224)">',
  '{/* 1. TRƯỞNG LÃO HỘI QUÁN (ÁO THỤNG GẤM ĐỎ CHỮ THỌ, THÀNH KÍNH DÂNG NHANG) */}\n        <g transform="translate(232, 224)" className="animate-pray-bow">'
);
content = content.replace(
  '{/* 2. CHÚ TIỂU ĐỒNG: GÕ CHUÔNG ĐỒNG NGÂN VANG ĐÊM RẰM */}\n        <g transform="translate(268, 226)">',
  '{/* 2. CHÚ TIỂU ĐỒNG: GÕ CHUÔNG ĐỒNG NGÂN VANG ĐÊM RẰM */}\n        <g transform="translate(268, 226)" className="animate-strike-bell">'
);

// 5. Gốm Thanh Hà: Thợ chuốt gốm xoay & Thợ vẽ hoa sen
content = content.replace(
  '{/* 1. NGHỆ NHÂN GỐM: NGỒI KHOM LƯNG NẮN VUỐT BÌNH ĐẤT SÉT */}\n        <g transform="translate(388, 232)">',
  '{/* 1. NGHỆ NHÂN GỐM: NGỒI KHOM LƯNG NẮN VUỐT BÌNH ĐẤT SÉT */}\n        <g transform="translate(388, 232)" className="animate-pottery-wheel">'
);
content = content.replace(
  '{/* 2. CÔ THỢ VẼ GỐM: CẦM CỌ CHẤM MEN LAM VẼ HOA VĂN HOA SEN */}\n        <g transform="translate(432, 230)">',
  '{/* 2. CÔ THỢ VẼ GỐM: CẦM CỌ CHẤM MEN LAM VẼ HOA VĂN HOA SEN */}\n        <g transform="translate(432, 230)" className="animate-pottery-paint">'
);

// 6. Tiệm Bánh Mì Phượng: Chị chủ xẻ bánh & Khách chờ nhận
content = content.replace(
  '{/* 1. CHỊ CHỦ BÁNH MÌ: ÁO HOA TẠP DỀ TRẮNG, CẦM DAO XẺ BÁNH & QUẾT PATE */}\n        <g transform="translate(542, 228)">',
  '{/* 1. CHỊ CHỦ BÁNH MÌ: ÁO HOA TẠP DỀ TRẮNG, CẦM DAO XẺ BÁNH & QUẾT PATE */}\n        <g transform="translate(542, 228)" className="animate-slice-bread">'
);
content = content.replace(
  '{/* 2. VỊ KHÁCH ĐỨNG CHỜ: CẦM TIỀN HÁO HỨC NHẬN BÁNH NÓNG GÓI GIẤY BÁO */}\n        <g transform="translate(578, 228)">',
  '{/* 2. VỊ KHÁCH ĐỨNG CHỜ: CẦM TIỀN HÁO HỨC NHẬN BÁNH NÓNG GÓI GIẤY BÁO */}\n        <g transform="translate(578, 228)" className="animate-wait-customer">'
);

// 7. Tơ Lụa Á Đông: Tiểu thư ướm áo & Thợ may đo tà
content = content.replace(
  '{/* 1. TIỂU THƯ ĐÀI CÁC: ĐỨNG DUYÊN DÁNG ƯỚM ÁO DÀI LỤA HỒNG TRƯỚC GƯƠNG */}\n        <g transform="translate(85, 226)">',
  '{/* 1. TIỂU THƯ ĐÀI CÁC: ĐỨNG DUYÊN DÁNG ƯỚM ÁO DÀI LỤA HỒNG TRƯỚC GƯƠNG */}\n        <g transform="translate(85, 226)" className="animate-silk-pose">'
);
content = content.replace(
  '{/* 2. CÔ THỢ MAY: QUÀNG THƯỚC DÂY VÀNG, KHOM NGƯỜI ĐO TÀ ÁO CHO KHÁCH */}\n        <g transform="translate(125, 230)">',
  '{/* 2. CÔ THỢ MAY: QUÀNG THƯỚC DÂY VÀNG, KHOM NGƯỜI ĐO TÀ ÁO CHO KHÁCH */}\n        <g transform="translate(125, 230)" className="animate-tailor-measure">'
);

// 8. Lồng Đèn Huỳnh Văn: Nghệ nhân vuốt nan & Em bé giơ đèn ông sao
content = content.replace(
  '{/* 1. NGHỆ NHÂN HUỲNH VĂN: NGỒI GHẾ CHUỐT NAN TRE & DÁN LỤA LÊN KHUNG ĐÈN */}\n        <g transform="translate(230, 228)">',
  '{/* 1. NGHỆ NHÂN HUỲNH VĂN: NGỒI GHẾ CHUỐT NAN TRE & DÁN LỤA LÊN KHUNG ĐÈN */}\n        <g transform="translate(230, 228)" className="animate-craft-lantern">'
);
content = content.replace(
  '{/* 2. EM BÉ NHỎ: HÁO HỨC GIƠ TAY CẦM ĐÈN ÔNG SAO 5 CÁNH LẤP LÁNH */}\n        <g transform="translate(270, 234)">',
  '{/* 2. EM BÉ NHỎ: HÁO HỨC GIƠ TAY CẦM ĐÈN ÔNG SAO 5 CÁNH LẤP LÁNH */}\n        <g transform="translate(270, 234)" className="animate-star-lantern">'
);

// 9. Faifo Coffee: Barista rót nước
content = content.replace(
  '{/* 1. ANH BARISTA: SƠ MI TRẮNG GILE ĐEN ĐIỆU NGHỆ RÓT NƯỚC SÔI ẤM CỔ NGỖNG */}\n        <g transform="translate(485, 228)">',
  '{/* 1. ANH BARISTA: SƠ MI TRẮNG GILE ĐEN ĐIỆU NGHỆ RÓT NƯỚC SÔI ẤM CỔ NGỖNG */}\n        <g transform="translate(485, 228)" className="animate-barista-drip">'
);

console.log('Successfully updated in-shop character animations!');

// ==============================================================================
// 3. ADD SHOP ENTRANCE/EXIT PATRON CHARACTERS (VÀO RA CÁC TIỆM TRÊN PHỐ)
// ==============================================================================
const shopPatronsJsx = `
        {/* ==================================================================== */}
        {/* NHÓM KHÁCH DẠO PHỐ BƯỚC VÀO VÀ RA KHỎI CÁC CỬA TIỆM ĐÊM HỘI TRUNG THU */}
        {/* ==================================================================== */}
        <g id="hoian-shop-patrons-group" filter="url(#dropShadow)">
            {/* 1. KHÁCH VÀO RA QUÁN CAO LẦU BÀ BÉ (Ăn mì rồi bước ra phe phẩy quạt nan) */}
            <g className="animate-patron-caolau">
                <g filter="url(#dropShadow)">
                    {/* Nón lá Hội An vàng rực */}
                    <path d="M -8,-20 L 8,-20 L 0,-28 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.7" />
                    {/* Khuôn mặt & tóc */}
                    <circle cx="0" cy="-15" r="3.6" fill="#fed7aa" />
                    {/* Thân áo bà ba vàng tươi & quần lụa đen */}
                    <path d="M -4,-11 L 4,-11 L 5.5,8 L -5.5,8 Z" fill="#eab308" stroke="#ca8a04" strokeWidth="0.5" />
                    <line x1="-2.5" y1="8" x2="-2.5" y2="18" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="2.5" y1="8" x2="2.5" y2="18" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    {/* Tay cầm quạt nan trúc phe phẩy mát rượi */}
                    <path d="M 4,-7 Q 8,-3 9,2" fill="none" stroke="#fed7aa" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M 8,0 Q 13,-4 14,-9 Q 9,-7 8,0 Z" fill="#fed7aa" stroke="#ca8a04" strokeWidth="0.5" />
                </g>
            </g>

            {/* 2. KHÁCH VÀO RA TIỆM BÁNH MÌ PHƯỢNG (Cầm túi bánh mì nóng bọc giấy) */}
            <g className="animate-patron-banhmi">
                <g filter="url(#dropShadow)">
                    <circle cx="0" cy="-20" r="1.8" fill="#1e293b" />
                    <circle cx="0" cy="-16" r="3.6" fill="#fed7aa" />
                    {/* Áo dài lụa xanh ngọc bích */}
                    <path d="M -4,-12 L 4,-12 L 6,10 L -6,10 Z" fill="#06b6d4" stroke="#0891b2" strokeWidth="0.5" />
                    <line x1="-2" y1="10" x2="-2" y2="19" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                    <line x1="2" y1="10" x2="2" y2="19" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                    {/* Túi giấy kraft đựng 2 ổ bánh mì Phượng thơm lừng */}
                    <rect x="5" y="-5" width="6" height="9" rx="1" fill="#d97706" stroke="#92400e" strokeWidth="0.5" />
                    <line x1="7" y1="-8" x2="7" y2="-5" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="9" y1="-7" x2="9" y2="-5" stroke="#fef08a" strokeWidth="1.2" strokeLinecap="round" />
                </g>
            </g>

            {/* 3. PHẬT TỬ / DU KHÁCH VÀO LỄ BÁI QUẢNG ĐÔNG HỘI QUÁN (Áo gấm cung đình) */}
            <g className="animate-patron-hoiquan">
                <g filter="url(#dropShadow)">
                    {/* Khăn đóng lam & áo the cung đình */}
                    <ellipse cx="0" cy="-21" rx="4.2" ry="2" fill="#1e3a8a" />
                    <circle cx="0" cy="-17" r="3.8" fill="#fed7aa" />
                    <path d="M -4.5,-13 L 4.5,-13 L 6,12 L -6,12 Z" fill="#991b1b" stroke="#ca8a04" strokeWidth="0.6" />
                    <line x1="-2.5" y1="12" x2="-2.5" y2="20" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="2.5" y1="12" x2="2.5" y2="20" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
                    {/* Chuỗi tràng hạt gỗ bồ đề trên tay */}
                    <circle cx="-5" cy="-2" r="2.2" fill="none" stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="1,1" />
                </g>
            </g>

            {/* 4. MẸ VÀ BÉ VÀO RA TIỆM LỒNG ĐÈN HUỲNH VĂN (Bé xách lồng đèn cá chép đỏ) */}
            <g className="animate-patron-longden">
                <g filter="url(#dropShadow)">
                    {/* Người mẹ nón lá áo tím huế */}
                    <g transform="translate(-5, 0)">
                        <path d="M -7,-19 L 7,-19 L 0,-26 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.6" />
                        <circle cx="0" cy="-15" r="3.4" fill="#fed7aa" />
                        <path d="M -4,-11 L 4,-11 L 5,9 L -5,9 Z" fill="#a855f7" stroke="#7e22ce" strokeWidth="0.5" />
                        <line x1="-2" y1="9" x2="-2" y2="18" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="2" y1="9" x2="2" y2="18" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                    </g>
                    {/* Em bé dắt tay mẹ, tay kia xách đèn lồng cá chép phát sáng */}
                    <g transform="translate(6, 6) scale(0.75)">
                        <circle cx="0" cy="-14" r="3.6" fill="#fed7aa" />
                        <circle cx="0" cy="-18" r="2" fill="#0f172a" />
                        <path d="M -4,-10 L 4,-10 L 5,10 L -5,10 Z" fill="#ef4444" />
                        <line x1="-2" y1="10" x2="-2" y2="16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                        <line x1="2" y1="10" x2="2" y2="16" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
                        {/* Lồng đèn cá chép con phát sáng */}
                        <line x1="4" y1="-5" x2="9" y2="-8" stroke="#ca8a04" strokeWidth="1" />
                        <line x1="9" y1="-8" x2="9" y2="-2" stroke="#dc2626" strokeWidth="0.6" />
                        <ellipse cx="9" cy="2" rx="4" ry="2.6" fill="#f97316" filter="url(#bloomSoft)" />
                        <circle cx="9" cy="2" r="1.5" fill="#fef08a" />
                    </g>
                </g>
            </g>

            {/* 5. KHÁCH TAO NHÃ VÀO RA TRÀ QUÁN HỘI AN (Áo bà ba xám tro thanh lịch) */}
            <g className="animate-patron-traquan">
                <g filter="url(#dropShadow)">
                    <circle cx="0" cy="-21" r="1.8" fill="#1e293b" />
                    <circle cx="0" cy="-17" r="3.6" fill="#fed7aa" />
                    <path d="M -4.5,-12 L 4.5,-12 L 5.5,9 L -5.5,9 Z" fill="#64748b" stroke="#334155" strokeWidth="0.5" />
                    <line x1="-2.5" y1="9" x2="-2.5" y2="19" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    <line x1="2.5" y1="9" x2="2.5" y2="19" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
                    {/* Hộp trà tre khắc chữ Trà cầm tay */}
                    <rect x="4" y="-3" width="5" height="7" rx="1" fill="#78350f" stroke="#ca8a04" strokeWidth="0.5" />
                </g>
            </g>

            {/* 6. QUÝ CÔ GHÉ HIỆU TƠ LỤA Á ĐÔNG (Áo dài hồng phấn thướt tha) */}
            <g className="animate-patron-tolua">
                <g filter="url(#dropShadow)">
                    <circle cx="0" cy="-21" r="2" fill="#0f172a" />
                    <circle cx="0" cy="-17" r="3.6" fill="#fed7aa" />
                    <path d="M -4.5,-12 L 4.5,-12 L 6,10 L -6,10 Z" fill="#ec4899" stroke="#be185d" strokeWidth="0.5" />
                    <line x1="-2" y1="10" x2="-2" y2="19" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                    <line x1="2" y1="10" x2="2" y2="19" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" />
                    {/* Chiếc xách tay lụa thêu hoa sen */}
                    <ellipse cx="6" cy="2" rx="3.5" ry="2.8" fill="#f43f5e" stroke="#ca8a04" strokeWidth="0.5" />
                    <line x1="4" y1="-4" x2="6" y2="0" stroke="#ca8a04" strokeWidth="0.8" />
                </g>
            </g>
        </g>
`;

// Insert patron characters right before {/* BỜ KÈ ĐÁ BẠCH ĐẰNG */}
const promenadeComment = '{/* BỜ KÈ ĐÁ BẠCH ĐẰNG: ĐÔNG ĐÚC DÒNG NGƯỜI RƯỚC ĐÈN, ĐOÀN MÚA LÂN & THẢ HOA ĐĂNG  */}';
if (content.includes(promenadeComment)) {
  content = content.replace(promenadeComment, shopPatronsJsx + '\n    ' + promenadeComment);
  console.log('Successfully inserted shop entrance and exit patrons!');
}

// ==============================================================================
// 4. AUTHENTIC HOI AN RIVERSIDE BALUSTRADE / RAILINGS (LAN CANG PHỐ CỔ BỜ SÔNG)
// ==============================================================================
// In Hoi An, the promenade along Sông Hoài has an exquisite balustrade:
// - Continuous top teak/bronze rail at y=533 with luminous gold trim
// - Bottom rail at y=551
// - Carved vertical balusters / Chinese fretwork spindles every 14px
// - 14 sturdy stone/timber pillars with lotus bronze caps (#f59e0b)
// - Bronze chain swags gracefully slung between posts
// - Elegantly interrupted at the 4 boat/lantern stone steps:
//   Step 1: x: 210 to 280
//   Step 2: x: 510 to 580
//   Step 3: x: 1150 to 1220
//   Step 4: x: 1600 to 1670

function generateBalustersForSpan(xStart, xEnd) {
  let balusters = '';
  const step = 14;
  for (let x = xStart + 8; x <= xEnd - 8; x += step) {
    balusters += `<line x1="${x}" y1="535" x2="${x}" y2="549" stroke="#3b1d06" strokeWidth="1.8" />
            <line x1="${x + 0.4}" y1="535" x2="${x + 0.4}" y2="549" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="${x}" cy="542" r="1.4" fill="#ca8a04" stroke="#78350f" strokeWidth="0.4" />\n            `;
  }
  return balusters;
}

function generateChainSwags(posts) {
  let chains = '';
  for (let i = 0; i < posts.length - 1; i++) {
    const p1 = posts[i];
    const p2 = posts[i + 1];
    // Don't draw chains across the 4 boat piers
    const midX = (p1 + p2) / 2;
    const isOverPier = (midX > 200 && midX < 290) ||
                       (midX > 500 && midX < 590) ||
                       (midX > 1140 && midX < 1230) ||
                       (midX > 1590 && midX < 1680);
    if (!isOverPier && (p2 - p1) < 180) {
      chains += `<path d="M ${p1 + 5},537 Q ${midX},545 ${p2 - 5},537" fill="none" stroke="#ca8a04" strokeWidth="1.2" strokeDasharray="2.5,1.5" opacity="0.85" />\n            `;
    }
  }
  return chains;
}

const postPositions = [60, 180, 310, 440, 580, 710, 850, 990, 1120, 1260, 1400, 1540, 1680, 1820];

// Spans for continuous handrail (skipping the 4 boat landings)
const railSpans = [
  { start: 0, end: 210 },
  { start: 280, end: 510 },
  { start: 580, end: 1150 },
  { start: 1220, end: 1600 },
  { start: 1670, end: 1920 }
];

let railsSvg = `
        {/* ==================================================================== */}
        {/* HỆ THỐNG LAN CAN BỜ KÈ SÔNG HOÀI PHỐ CỔ (HERITAGE PROMENADE BALUSTRADE)*/}
        {/* ==================================================================== */}
        <g id="hoian-riverside-balustrade" filter="url(#dropShadow)">
`;

// Draw balusters for each span
railSpans.forEach(span => {
  railsSvg += `
            {/* Nhịp lan can từ x=${span.start} đến ${span.end} */}
            {/* Thanh giằng đáy gỗ lim chạy dọc mép đá */}
            <rect x="${span.start}" y="549" width="${span.end - span.start}" height="3" fill="#1c0a02" stroke="#451a03" strokeWidth="0.6" />
            
            {/* Hàng con tiện tiện tròn & chấn song di sản */}
            ${generateBalustersForSpan(span.start, span.end)}

            {/* Thanh tay vịn trên bằng đồng hun & gỗ lim nguyên khối */}
            <rect x="${span.start}" y="531.5" width="${span.end - span.start}" height="4.5" rx="1.5" fill="#2d1502" stroke="#120601" strokeWidth="0.8" />
            <line x1="${span.start}" y1="532" x2="${span.end}" y2="532" stroke="#f59e0b" strokeWidth="1" opacity="0.8" strokeLinecap="round" />
            <line x1="${span.start}" y1="535" x2="${span.end}" y2="535" stroke="#78350f" strokeWidth="0.6" opacity="0.5" />
  `;
});

// Draw decorative chain swags between posts
railsSvg += `
            {/* Dây xích đồng võng mềm mại giữa các nhịp trụ lan can */}
            ${generateChainSwags(postPositions)}

            {/* 14 TRỤ ĐÁ & CỘT GỖ LIM ĐẦU ĐỘI BÚP SEN ĐỒNG HOÀNG KIM CỔ KÍNH */}
`;

// Draw the 14 sturdy posts
const lanternColors = ['#ef4444', '#f59e0b', '#06b6d4', '#c026d3', '#10b981', '#f43f5e', '#ef4444', '#f59e0b', '#06b6d4', '#c026d3', '#10b981', '#f43f5e', '#ef4444', '#f59e0b'];

postPositions.forEach((x, idx) => {
  const color = lanternColors[idx % lanternColors.length];
  railsSvg += `
            <g transform="translate(${x}, 520)">
                {/* Chân đế đá hoa cương kiên cố */}
                <rect x="-1" y="27" width="12" height="6" rx="1" fill="#0f172a" stroke="#334155" strokeWidth="0.6" />
                {/* Thân cột gỗ lim vuông vắn chạm nẹp chỉ đồng */}
                <rect x="0" y="2" width="10" height="27" rx="1.5" fill="#241002" stroke="#120601" strokeWidth="1" />
                <line x1="2" y1="4" x2="2" y2="27" stroke="#78350f" strokeWidth="0.6" />
                <line x1="8" y1="4" x2="8" y2="27" stroke="#78350f" strokeWidth="0.6" />
                
                {/* Đỉnh trụ: Búp sen đồng / quả cầu đồng hoàng kim phản chiếu ánh trăng */}
                <path d="M 1,2 Q 5,-4 9,2 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="0.6" />
                <circle cx="5" cy="-2" r="3.2" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.6" />
                <circle cx="5" cy="-2" r="1.5" fill="#ffffff" />
                
                {/* Đèn lồng mini treo trang trí bên hông trụ lan can */}
                <circle cx="5" cy="14" r="3.2" fill="${color}" filter="url(#bloomSoft)" />
                <circle cx="5" cy="14" r="1.2" fill="#ffffff" />
            </g>
  `;
});

railsSvg += `        </g>\n`;

// Target to replace: the old single-post group
const oldPostsTarget = `{/* Hàng lan can cột đá bờ kè chăng đèn lồng */}
        <g fill="#241002">
            <rect x="60" y="522" width="10" height="28" rx="2" /><circle cx="65" cy="522" r="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <rect x="180" y="522" width="10" height="28" rx="2" /><circle cx="185" cy="522" r="5.5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <rect x="310" y="522" width="10" height="28" rx="2" /><circle cx="315" cy="522" r="5.5" fill="#06b6d4" filter="url(#bloomSoft)" />
            <rect x="440" y="522" width="10" height="28" rx="2" /><circle cx="445" cy="522" r="5.5" fill="#c026d3" filter="url(#bloomSoft)" />
            <rect x="580" y="522" width="10" height="28" rx="2" /><circle cx="585" cy="522" r="5.5" fill="#10b981" filter="url(#bloomSoft)" />
            <rect x="710" y="522" width="10" height="28" rx="2" /><circle cx="715" cy="522" r="5.5" fill="#f43f5e" filter="url(#bloomSoft)" />
            <rect x="850" y="522" width="10" height="28" rx="2" /><circle cx="855" cy="522" r="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <rect x="990" y="522" width="10" height="28" rx="2" /><circle cx="995" cy="522" r="5.5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <rect x="1120" y="522" width="10" height="28" rx="2" /><circle cx="1125" cy="522" r="5.5" fill="#06b6d4" filter="url(#bloomSoft)" />
            <rect x="1260" y="522" width="10" height="28" rx="2" /><circle cx="1265" cy="522" r="5.5" fill="#c026d3" filter="url(#bloomSoft)" />
            <rect x="1400" y="522" width="10" height="28" rx="2" /><circle cx="1405" cy="522" r="5.5" fill="#10b981" filter="url(#bloomSoft)" />
            <rect x="1540" y="522" width="10" height="28" rx="2" /><circle cx="1545" cy="522" r="5.5" fill="#f43f5e" filter="url(#bloomSoft)" />
            <rect x="1680" y="522" width="10" height="28" rx="2" /><circle cx="1685" cy="522" r="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <rect x="1820" y="522" width="10" height="28" rx="2" /><circle cx="1825" cy="522" r="5.5" fill="#f59e0b" filter="url(#bloomSoft)" />
        </g>`;

if (content.includes(oldPostsTarget)) {
  content = content.replace(oldPostsTarget, railsSvg);
  console.log('Successfully replaced old posts with authentic Hoi An promenade railings!');
} else {
  console.log('Warning: old posts target not found by exact string, checking regex...');
  const oldPostsRegex = /\{\/\* Hàng lan can cột đá bờ kè chăng đèn lồng \*\/\}[\s\S]*?<\/g>/;
  if (oldPostsRegex.test(content)) {
    content = content.replace(oldPostsRegex, railsSvg);
    console.log('Successfully replaced old posts via regex!');
  } else {
    console.error('ERROR: Could not find old posts section!');
  }
}

// ==============================================================================
// 5. VALIDATE WITH ESBUILD & WRITE FILE
// ==============================================================================
try {
  esbuild.transformSync(content, { loader: 'tsx' });
  console.log('esbuild check PASSED for railings, in-shop movements & shop patrons!');
  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('SUCCESS: Written all upgrades to MidAutumnSvgBackdrop.tsx');
} catch (err) {
  console.error('esbuild verification FAILED:', err.message);
  process.exit(1);
}
