const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const anchor = `<path d="M 380,78 Q 396,73 390,58" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
        
                <ellipse cx="248" cy="36" rx="5" ry="7" fill="#f59e0b" filter="url(#bloomSoft)" />
                <circle cx="248" cy="28" r="3.5" fill="#fef08a" />
                <path d="M 238,38 Q 248,30 258,38" fill="none" stroke="#ca8a04" strokeWidth="2" />
            </g>`;

const hoiQuanMarkup = `
        {/* ==================================================================== */}
        {/* QUẢNG ĐÔNG HỘI QUÁN (HỘI QUÁN DI SẢN PHỐ CỔ HỘI AN)                  */}
        {/* ==================================================================== */}
        <rect x="150" y="80" width="195" height="200" fill="url(#wallOchreBright)" />
        <rect x="150" y="240" width="195" height="40" fill="url(#baseDampness)" />
        
        {/* Cổng vòm son đỏ di sản */}
        <path d="M 205,150 C 205,115 285,115 285,150 L 285,268 L 205,268 Z" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
        <path d="M 205,150 C 205,115 285,115 285,150 L 285,268 L 205,268 Z" fill="none" stroke="#991b1b" strokeWidth="4" />

        {/* HOÀNH PHI ĐẠI TỰ CUNG ĐÌNH CHẠM TRÁN RỒNG & CÂU ĐỐI SON VÀNG */}
        <g filter="url(#dropShadow)">
            <path d="M 196,102 Q 245,96 294,102 L 290,105 Q 245,100 200,105 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="0.6" />
            <circle cx="245" cy="98" r="3" fill="#ef4444" stroke="#ca8a04" strokeWidth="0.8" />

            <rect x="198" y="104" width="94" height="23" rx="2" fill="#7f1d1d" stroke="#ca8a04" strokeWidth="1.6" />
            <rect x="201" y="107" width="88" height="17" fill="none" stroke="#f59e0b" strokeWidth="0.7" strokeDasharray="3,1.5" />

            <text x="245" y="116" fill="#fef08a" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="2">廣 東 會 館</text>
            <text x="245" y="122" fill="#fed7aa" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8">QUẢNG ĐÔNG HỘI QUÁN</text>

            {/* Cặp câu đối chữ vàng buông rủ hai bên trụ vòm */}
            <rect x="193" y="132" width="8" height="42" rx="1" fill="#991b1b" stroke="#ca8a04" strokeWidth="0.6" />
            <text x="197" y="140" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">福</text>
            <text x="197" y="148" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">星</text>
            <text x="197" y="156" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">高</text>
            <text x="197" y="164" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">照</text>

            <rect x="289" y="132" width="8" height="42" rx="1" fill="#991b1b" stroke="#ca8a04" strokeWidth="0.6" />
            <text x="293" y="140" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">萬</text>
            <text x="293" y="148" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">象</text>
            <text x="293" y="156" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">更</text>
            <text x="293" y="164" fill="#fef08a" fontSize="4.2" textAnchor="middle" fontFamily="serif">新</text>
        </g>

        {/* 1. CHỦ TẾ / TRƯỞNG BAN (CỤ ÔNG ÁO THỤNG ĐỎ VIỀN VÀNG, MŨ CÁNH CHUỒN CHÀO KHÁCH) */}
        <g transform="translate(230, 220)">
            <ellipse cx="0" cy="-16" rx="5" ry="2.5" fill="#7f1d1d" />
            <circle cx="0" cy="-12" r="4.2" fill="#fed7aa" />
            <path d="M -1.5,-8 Q 0,-2 1.5,-8 Z" fill="#f8fafc" />
            <path d="M -5.5,-8 L 5.5,-8 L 7,22 L -7,22 Z" fill="#b91c1c" stroke="#f59e0b" strokeWidth="1" />
            <rect x="-4" y="0" width="8" height="5" rx="2" fill="#991b1b" stroke="#f59e0b" strokeWidth="0.8" />
        </g>

        {/* 2. NHÂN VIÊN / TIỂU ĐỒNG (ÁO GẤM VÀNG NÂNG LƯ TRẦM HƯƠNG TỎA KHÓI) */}
        <g transform="translate(262, 224)">
            <circle cx="0" cy="-11" r="3.6" fill="#fed7aa" />
            <path d="M -4,-7 L 4,-7 L 5,20 L -5,20 Z" fill="#ca8a04" stroke="#78350f" strokeWidth="0.8" />
            <ellipse cx="6" cy="4" rx="4" ry="3" fill="#78350f" />
            <path d="M 6,1 Q 4,-6 8,-12" fill="none" stroke="#fef08a" strokeWidth="1" className="animate-steam" opacity="0.7" />
            <circle cx="7" cy="8" r="2.8" fill="#ef4444" filter="url(#bloomSoft)" />
        </g>
`;

if (content.includes(anchor)) {
    content = content.replace(anchor, anchor + hoiQuanMarkup);
    fs.writeFileSync(targetPath, content, 'utf8');
    console.log('Successfully inserted Quảng Đông Hội Quán Hoành Phi & Couplets!');
} else {
    console.log('Error: anchor not found!');
}
