const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../components/login/MidAutumnSvgBackdrop.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// ==============================================================================
// 1. HOUSE 1: TRÀ QUÁN HỘI AN -> BIỂN CUỐN THƯ SƠN MÀI THẾP VÀNG
// ==============================================================================
const h1OldSignRegex = /<rect x="52" y="176" width="70" height="16" rx="2" fill="#1c0a02" stroke="#d97706" strokeWidth="1" \/>\s*<text x="87" y="187" fill="#fef08a" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">TRÀ QUÁN HỘI AN<\/text>/;

const h1ArtisticSign = `{/* BIỂN HIỆU NGHỆ THUẬT 1: CUỐN THƯ SƠN MÀI THẾP VÀNG & CON DẤU TRIỆN SON CỔ */}
        <g filter="url(#dropShadow)">
            {/* Dây treo đồng cổ thả từ xà nhà */}
            <line x1="60" y1="168" x2="60" y2="174" stroke="#ca8a04" strokeWidth="1.2" />
            <line x1="114" y1="168" x2="114" y2="174" stroke="#ca8a04" strokeWidth="1.2" />
            <circle cx="60" cy="168" r="1.5" fill="#f59e0b" />
            <circle cx="114" cy="168" r="1.5" fill="#f59e0b" />

            {/* Thân cuốn thư sơn mài viền vàng óng */}
            <path d="M 50,174 C 54,171 58,172 65,173 L 109,173 C 116,172 120,171 124,174 L 122,192 C 118,195 114,194 107,193 L 67,193 C 60,194 56,195 50,192 Z" 
                  fill="#1c0a02" stroke="#d97706" strokeWidth="1.4" />
            {/* Hai đầu cuốn thư cuộn tròn phong thủy */}
            <path d="M 50,174 C 46,174 44,183 50,192 C 54,188 53,178 50,174 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="1" />
            <path d="M 124,174 C 128,174 130,183 124,192 C 120,188 121,178 124,174 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="1" />
            
            {/* Con dấu triện son đỏ góc biển hiệu */}
            <rect x="55" y="177" width="7" height="7" rx="1" fill="#dc2626" stroke="#fef08a" strokeWidth="0.5" />
            <text x="58.5" y="182.5" fill="#ffffff" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">茶</text>

            {/* Chữ thư pháp dát vàng kiêu sa */}
            <text x="89" y="184" fill="#fef08a" fontSize="7.8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8">TRÀ QUÁN HỘI AN</text>
            <text x="89" y="190" fill="#fed7aa" fontSize="4.6" textAnchor="middle" fontFamily="serif" opacity="0.9">Trà Sen &amp; Thảo Mộc Cung Đình</text>
        </g>`;

if (h1OldSignRegex.test(content)) {
    content = content.replace(h1OldSignRegex, h1ArtisticSign);
    console.log('Successfully upgraded House 1 to Artistic Scroll Sign!');
} else {
    console.log('Warning: House 1 old sign not matched!');
}

// ==============================================================================
// 2. HOUSE 2A: CAO LẦU BÀ BÉ -> BIỂN GỖ LŨA TỰ NHIÊN & DẢI PHƯỚN ĐỎ CỔ TRUYỀN
// ==============================================================================
const h2OldSignRegex = /<rect x="15" y="172" width="120" height="18" rx="2" fill="#451a03" stroke="#f59e0b" strokeWidth="1.2" \/>\s*<text x="75" y="184" fill="#fef08a" fontSize="7.8" fontWeight="bold" textAnchor="middle" fontFamily="serif">CAO LẦU BÀ BÉ - HỘI AN<\/text>/;

const h2ArtisticSign = `{/* BIỂN HIỆU NGHỆ THUẬT 2: GỖ LŨA TỰ NHIÊN MỘC MẠC & CẶP DẢI PHƯỚN ĐỎ PHỐ CỔ */}
        <g filter="url(#dropShadow)">
            {/* Cặp dải phướn lụa đỏ thắm buông rủ hai bên biển */}
            <g>
                <polygon points="18,172 25,172 26,204 21.5,199 17,204" fill="#dc2626" stroke="#991b1b" strokeWidth="0.5" />
                <text x="21.5" y="183" fill="#fef08a" fontSize="4" fontWeight="bold" textAnchor="middle" fontFamily="serif">ĐẶC</text>
                <text x="21.5" y="190" fill="#fef08a" fontSize="4" fontWeight="bold" textAnchor="middle" fontFamily="serif">SẢN</text>

                <polygon points="125,172 132,172 133,204 128.5,199 124,204" fill="#dc2626" stroke="#991b1b" strokeWidth="0.5" />
                <text x="128.5" y="183" fill="#fef08a" fontSize="4" fontWeight="bold" textAnchor="middle" fontFamily="serif">TRUYỀN</text>
                <text x="128.5" y="190" fill="#fef08a" fontSize="4" fontWeight="bold" textAnchor="middle" fontFamily="serif">THỐNG</text>
            </g>

            {/* Thớt gỗ lũa tự nhiên với mép lượn bất đối xứng */}
            <path d="M 26,173 Q 48,170 75,172 Q 102,170 124,173 Q 126,183 123,191 Q 100,194 75,192 Q 50,194 27,191 Q 24,182 26,173 Z" 
                  fill="#451a03" stroke="#d97706" strokeWidth="1.3" />
            {/* Vân thớ gỗ chạm lượn */}
            <path d="M 30,176 Q 75,174 120,176" fill="none" stroke="#78350f" strokeWidth="0.8" opacity="0.6" />
            <path d="M 30,188 Q 75,190 120,188" fill="none" stroke="#78350f" strokeWidth="0.8" opacity="0.6" />

            {/* 2 Đèn lồng đỏ con rọi biển hiệu */}
            <ellipse cx="26" cy="182" rx="3.5" ry="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <ellipse cx="124" cy="182" rx="3.5" ry="5.5" fill="#ef4444" filter="url(#bloomSoft)" />

            {/* Chữ chạm khắc chìm dát vàng */}
            <text x="75" y="183" fill="#fef08a" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.6">CAO LẦU BÀ BÉ</text>
            <text x="75" y="189.5" fill="#fed7aa" fontSize="4.8" textAnchor="middle" fontFamily="serif">Mì Quảng &amp; Cao Lầu Gia Truyền</text>
        </g>`;

if (h2OldSignRegex.test(content)) {
    content = content.replace(h2OldSignRegex, h2ArtisticSign);
    console.log('Successfully upgraded House 2A to Artistic Rustic Timber & Silk Banner Sign!');
} else {
    console.log('Warning: House 2A old sign not matched!');
}

// ==============================================================================
// 3. HOUSE 2B: QUẢNG ĐÔNG HỘI QUÁN -> ĐẠI TỰ HOÀNH PHI CUNG ĐÌNH CHẠM RỒNG & CÂU ĐỐI
// ==============================================================================
const h2bOldSignRegex = /<rect x="202" y="103" width="86" height="18" rx="2" fill="#7f1d1d" stroke="#f59e0b" strokeWidth="1.4" \/>\s*<text x="245" y="115\.5" fill="#fef08a" fontSize="7\.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">QUẢNG ĐÔNG HỘI QUÁN<\/text>\s*<text x="245" y="127" fill="#fed7aa" fontSize="5\.5" textAnchor="middle" fontFamily="serif">廣 東 會 館<\/text>/;

const h2bArtisticSign = `{/* BIỂN HIỆU NGHỆ THUẬT 3: ĐẠI TỰ HOÀNH PHI CỔ KÍNH CHẠM TRÁN RỒNG & CÂU ĐỐI SON VÀNG */}
        <g filter="url(#dropShadow)">
            {/* Trán hoành phi chạm khắc hoa văn rồng uốn lượn cổ truyền */}
            <path d="M 196,102 Q 245,96 294,102 L 290,105 Q 245,100 200,105 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="0.6" />
            <circle cx="245" cy="98" r="3" fill="#ef4444" stroke="#ca8a04" strokeWidth="0.8" />

            {/* Bảng hoành phi son đỏ chu sa viền kép hồi văn kim sắc */}
            <rect x="198" y="104" width="94" height="23" rx="2" fill="#7f1d1d" stroke="#ca8a04" strokeWidth="1.6" />
            <rect x="201" y="107" width="88" height="17" fill="none" stroke="#f59e0b" strokeWidth="0.7" strokeDasharray="3,1.5" />

            {/* Chữ Hán đại tự thiếp vàng nổi bật chính giữa */}
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
        </g>`;

if (h2bOldSignRegex.test(content)) {
    content = content.replace(h2bOldSignRegex, h2bArtisticSign);
    console.log('Successfully upgraded House 2B to Imperial Ancestral Temple Hoành Phi & Couplets!');
} else {
    console.log('Warning: House 2B old sign not matched!');
}

// ==============================================================================
// 4. HOUSE 3A: TƠ LỤA Á ĐÔNG -> KHUNG TRANH OVAL LỤA THÊU GẤM & DÂY XÍCH ĐỒNG
// ==============================================================================
const h3aOldSignRegex = /<rect x="22" y="174" width="140" height="18" rx="2" fill="#1c0a02" stroke="#d97706" strokeWidth="1\.2" \/>\s*<text x="92" y="186" fill="#fef08a" fontSize="7\.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">TƠ LỤA Á ĐÔNG - MAY ĐO LẤY NGAY<\/text>/;

const h3aArtisticSign = `{/* BIỂN HIỆU NGHỆ THUẬT 4: KHUNG OVAL LỤA TƠ TẰM THÊU GẤM & XÍCH ĐỒNG CỔ ĐIỂN */}
        <g filter="url(#dropShadow)">
            {/* Dây xích đồng treo cổ điển từ rui mè mái ngói */}
            <line x1="42" y1="166" x2="52" y2="173" stroke="#ca8a04" strokeWidth="1.2" strokeDasharray="2,1" />
            <line x1="142" y1="166" x2="132" y2="173" stroke="#ca8a04" strokeWidth="1.2" strokeDasharray="2,1" />

            {/* Bảng khung hình OVAL gỗ trắc chạm trổ hạt cườm viền quanh */}
            <ellipse cx="92" cy="183" rx="66" ry="11" fill="#1c0a02" stroke="#d97706" strokeWidth="1.5" />
            <ellipse cx="92" cy="183" rx="62" ry="8.5" fill="#451a03" stroke="#f59e0b" strokeWidth="0.8" />

            {/* Biểu tượng cuộn lụa tơ tằm hai bên */}
            <ellipse cx="38" cy="183" rx="4" ry="5.5" fill="#ec4899" />
            <ellipse cx="38" cy="183" rx="2.5" ry="3.5" fill="#fbcfe8" />
            <ellipse cx="146" cy="183" rx="4" ry="5.5" fill="#06b6d4" />
            <ellipse cx="146" cy="183" rx="2.5" ry="3.5" fill="#a5f3fc" />

            {/* Chữ thêu tơ tằm vàng óng */}
            <text x="92" y="182.5" fill="#fef08a" fontSize="7.8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8">TƠ LỤA Á ĐÔNG</text>
            <text x="92" y="188.5" fill="#fed7aa" fontSize="4.6" textAnchor="middle" fontFamily="serif">May Đo Áo Dài Lấy Ngay Trong Ngày</text>
        </g>`;

if (h3aOldSignRegex.test(content)) {
    content = content.replace(h3aOldSignRegex, h3aArtisticSign);
    console.log('Successfully upgraded House 3A to Artistic Oval Silk Embroidery Sign!');
} else {
    console.log('Warning: House 3A old sign not matched!');
}

// ==============================================================================
// 5. HOUSE 3B: TIỆM LỒNG ĐÈN HUỲNH VĂN -> BIỂN HỘP GỖ LỌNG LỤA PHÁT SÁNG & ĐÈN LỒNG
// ==============================================================================
const h3bOldSignRegex = /<rect x="210" y="174" width="160" height="18" rx="2" fill="#3b1d06" stroke="#f59e0b" strokeWidth="1\.2" \/>\s*<text x="290" y="186" fill="#fef08a" fontSize="7\.2" fontWeight="bold" textAnchor="middle" fontFamily="serif">LỒNG ĐÈN PHỐ CỔ - NGHỆ NHÂN HUỲNH VĂN<\/text>/;

const h3bArtisticSign = `{/* BIỂN HIỆU NGHỆ THUẬT 5: BIỂN HỘP LỤA BÁT GIÁC PHÁT SÁNG ĐÊM RẰM */}
        <g filter="url(#bloomSoft)">
            {/* Hộp đèn lục lăng phát sáng ấm áp rực rỡ */}
            <polygon points="214,173 366,173 372,183 366,193 214,193 208,183" 
                     fill="#fef08a" stroke="#ca8a04" strokeWidth="1.6" filter="url(#bloomHigh)" opacity="0.95" />
            <polygon points="217,175 363,175 368,183 363,191 217,191 212,183" 
                     fill="#fffbeb" stroke="#f59e0b" strokeWidth="0.8" />

            {/* Hoa văn lọng góc gỗ cổ điển */}
            <circle cx="218" cy="183" r="3" fill="#dc2626" />
            <circle cx="362" cy="183" r="3" fill="#dc2626" />

            {/* Chiếc đèn lồng hoa sen mini treo lủng lẳng dưới biển */}
            <g transform="translate(290, 193)">
                <line x1="0" y1="0" x2="0" y2="4" stroke="#78350f" strokeWidth="0.8" />
                <ellipse cx="0" cy="8" rx="4" ry="5.5" fill="#f43f5e" filter="url(#bloomHigh)" />
                <circle cx="0" cy="8" r="1.5" fill="#fef08a" />
                <line x1="0" y1="13.5" x2="0" y2="18" stroke="#f59e0b" strokeWidth="1" />
            </g>

            {/* Chữ gỗ chạm lộng màu nâu sẫm trên nền lụa sáng */}
            <text x="290" y="182" fill="#451a03" fontSize="7.6" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8">LỒNG ĐÈN PHỐ CỔ</text>
            <text x="290" y="188.5" fill="#b45309" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">Nghệ Nhân Huỳnh Văn • Di Sản Hội An</text>
        </g>`;

if (h3bOldSignRegex.test(content)) {
    content = content.replace(h3bOldSignRegex, h3bArtisticSign);
    console.log('Successfully upgraded House 3B to Artisanal Backlit Lantern Box Sign!');
} else {
    console.log('Warning: House 3B old sign not matched!');
}

// ==============================================================================
// 6. HOUSE 3C: CÀ PHÊ FAIFO -> GIÁ SẮT UỐN NGHỆ THUẬT & BIỂN GỖ INDOCHINE HOÀI CỔ
// ==============================================================================
const h3cOldSignRegex = /<rect x="422" y="174" width="180" height="18" rx="2" fill="#1c0a02" stroke="#eab308" strokeWidth="1\.2" \/>\s*<text x="512" y="186" fill="#fef08a" fontSize="7\.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">CÀ PHÊ FAIFO & BÁNH TRUNG THU HỘI AN<\/text>/;

const h3cArtisticSign = `{/* BIỂN HIỆU NGHỆ THUẬT 6: GIÁ SẮT UỐN NGHỆ THUẬT VINTAGE & BẢNG INDOCHINE */}
        <g filter="url(#dropShadow)">
            {/* Giá sắt rèn uốn hoa văn nghệ thuật Pháp - Indochine vươn ra từ tường */}
            <path d="M 424,168 L 440,168 Q 448,168 450,174 L 450,178" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 424,178 Q 436,178 440,172" fill="none" stroke="#1e293b" strokeWidth="1.2" />
            <circle cx="430" cy="172" r="2.2" fill="none" stroke="#ca8a04" strokeWidth="1" />

            {/* Móc xích đôi treo biển */}
            <line x1="454" y1="171" x2="454" y2="175" stroke="#94a3b8" strokeWidth="1" />
            <line x1="578" y1="171" x2="578" y2="175" stroke="#94a3b8" strokeWidth="1" />

            {/* Bảng gỗ Indochine góc bo tròn viền đồng có đinh tán */}
            <rect x="444" y="174" width="144" height="20" rx="4" fill="#1e1b18" stroke="#ca8a04" strokeWidth="1.4" />
            {/* Đinh tán đồng 4 góc */}
            <circle cx="448" cy="178" r="1.2" fill="#f59e0b" />
            <circle cx="584" cy="178" r="1.2" fill="#f59e0b" />
            <circle cx="448" cy="190" r="1.2" fill="#f59e0b" />
            <circle cx="584" cy="190" r="1.2" fill="#f59e0b" />

            {/* Tách cà phê bốc khói nhỏ xinh góc trái */}
            <g transform="translate(456, 185)">
                <ellipse cx="0" cy="0" rx="3.5" ry="2" fill="#d97706" />
                <path d="M -3,-1 Q 0,-5 3,-1" fill="none" stroke="#fef08a" strokeWidth="0.8" className="animate-steam" />
            </g>

            {/* Bánh Trung Thu mặt trăng góc phải */}
            <g transform="translate(572, 184)">
                <circle cx="0" cy="0" r="3.5" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.6" />
                <circle cx="0" cy="0" r="1.5" fill="#f59e0b" />
            </g>

            {/* Chữ phong cách Indochine vintage */}
            <text x="514" y="183.5" fill="#fef08a" fontSize="7.8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8">CÀ PHÊ FAIFO 1932</text>
            <text x="514" y="189.5" fill="#fed7aa" fontSize="4.6" textAnchor="middle" fontFamily="serif">Bánh Nướng Trung Thu &amp; Cà Phê Phin</text>
        </g>`;

if (h3cOldSignRegex.test(content)) {
    content = content.replace(h3cOldSignRegex, h3cArtisticSign);
    console.log('Successfully upgraded House 3C to Vintage Wrought-Iron Indochine Sign!');
} else {
    console.log('Warning: House 3C old sign not matched!');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('All 6 artistic signboards applied to MidAutumnSvgBackdrop.tsx!');
