const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let content = fs.readFileSync(backdropPath, 'utf8');

function replaceSection(startMarker, endMarker, newBlock, name) {
  const s = content.indexOf(startMarker);
  if (s === -1) {
    console.error(`ERROR: startMarker not found for ${name}`);
    process.exit(1);
  }
  const e = content.indexOf(endMarker, s);
  if (e === -1) {
    console.error(`ERROR: endMarker not found for ${name}`);
    process.exit(1);
  }
  content = content.slice(0, s) + newBlock.trim() + '\n\n        ' + content.slice(e);
  console.log(`✓ Upgraded ${name}`);
}

// 1. UPGRADE HOUSE 1 SIGNBOARD (Trà Quán Hội An)
const newH1 = `{/* BIỂN HIỆU NGHỆ THUẬT 1: CUỐN THƯ SƠN MÀI THẾP VÀNG & CON DẤU TRIỆN SON CỔ */}
        <g filter="url(#dropShadow)">
            {/* Dây xích đồng vàng thả từ rui mè xà gồ */}
            <line x1="56" y1="165" x2="56" y2="173" stroke="#ca8a04" strokeWidth="1.4" />
            <line x1="122" y1="165" x2="122" y2="173" stroke="#ca8a04" strokeWidth="1.4" />
            <circle cx="56" cy="165" r="2" fill="#fef08a" />
            <circle cx="122" cy="165" r="2" fill="#fef08a" />

            {/* Thân cuốn thư sơn mài đen tuyền viền vàng óng kép */}
            <path d="M 44,173 C 49,169 54,170 63,171 L 115,171 C 124,170 129,169 134,173 L 131,194 C 126,198 121,197 113,196 L 65,196 C 57,197 52,198 44,194 Z" 
                  fill="#1c0a02" stroke="#d97706" strokeWidth="1.8" />
            {/* Viền chỉ vàng dát son nội vi */}
            <path d="M 48,175 C 52,173 56,173 64,174 L 114,174 C 122,173 126,173 130,175 L 128,192 C 124,195 120,194 113,194 L 65,194 C 58,194 54,195 48,192 Z" 
                  fill="#2d1502" stroke="#fef08a" strokeWidth="0.7" strokeDasharray="3,1" />
            {/* Hai đầu cuốn thư cuộn tròn phong thủy chạm nổi */}
            <path d="M 44,173 C 39,173 37,183 44,194 C 49,189 48,178 44,173 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="1.2" />
            <path d="M 134,173 C 139,173 141,183 134,194 C 129,189 130,178 134,173 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="1.2" />
            
            {/* Con dấu triện son đỏ góc biển hiệu phát sáng son */}
            <rect x="50" y="176" width="8.5" height="8.5" rx="1.5" fill="#dc2626" stroke="#fef08a" strokeWidth="0.7" />
            <text x="54.25" y="182.5" fill="#ffffff" fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="serif">茶</text>

            {/* Chữ thư pháp dát vàng kiêu sa */}
            <text x="91" y="183.5" fill="#fef08a" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.9" filter="url(#bloomSoft)">TRÀ QUÁN HỘI AN</text>
            <text x="91" y="190.5" fill="#fed7aa" fontSize="4.8" textAnchor="middle" fontFamily="serif" opacity="0.95">Trà Sen &amp; Thảo Mộc Cung Đình</text>
        </g>`;

replaceSection(
  '{/* BIỂN HIỆU NGHỆ THUẬT 1: CUỐN THƯ SƠN MÀI THẾP VÀNG',
  '{/* CỬA RA VÀO GỖ & QUẦY TRÀ',
  newH1,
  'House 1 Signboard'
);

// 2. UPGRADE HOUSE 2 SIGNBOARD (Cao Lầu Bà Bé)
const newH2 = `{/* BIỂN HIỆU NGHỆ THUẬT 2: GỖ LŨA TỰ NHIÊN MỘC MẠC & CẶP DẢI PHƯỚN ĐỎ PHỐ CỔ */}
        <g filter="url(#dropShadow)">
            {/* Cặp đinh rèn cổ điển đóng vào xà nhà */}
            <circle cx="28" cy="172" r="1.8" fill="#475569" stroke="#0f172a" strokeWidth="0.8" />
            <circle cx="122" cy="172" r="1.8" fill="#475569" stroke="#0f172a" strokeWidth="0.8" />

            {/* Dải phướn lụa đỏ bên TRÁI: ĐẶC SẢN */}
            <g>
                <polygon points="14,173 22,173 23,205 18,200 13,205" fill="#dc2626" stroke="#991b1b" strokeWidth="0.6" />
                <text x="18" y="181" fill="#fef08a" fontSize="3.6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Đ</text>
                <text x="18" y="186" fill="#fef08a" fontSize="3.6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Ặ</text>
                <text x="18" y="191" fill="#fef08a" fontSize="3.6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">C</text>
                <text x="18" y="196" fill="#fef08a" fontSize="3.6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">S</text>
                <text x="18" y="201" fill="#fef08a" fontSize="3.6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Ả</text>
            </g>

            {/* Dải phướn lụa đỏ bên PHẢI: GIA TRUYỀN */}
            <g>
                <polygon points="128,173 136,173 137,205 132,200 127,205" fill="#dc2626" stroke="#991b1b" strokeWidth="0.6" />
                <text x="132" y="181" fill="#fef08a" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">G</text>
                <text x="132" y="185" fill="#fef08a" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">I</text>
                <text x="132" y="189" fill="#fef08a" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">A</text>
                <text x="132" y="194" fill="#fef08a" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">T</text>
                <text x="132" y="198" fill="#fef08a" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">R</text>
                <text x="132" y="202" fill="#fef08a" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">Y</text>
            </g>

            {/* Thớt gỗ lũa tự nhiên với mép lượn sóng mộc mạc viền vàng */}
            <path d="M 24,171 C 38,170 75,172 126,171 C 131,175 129,189 125,194 C 95,195 52,193 25,194 C 21,188 22,177 24,171 Z" 
                  fill="#2d1502" stroke="#ca8a04" strokeWidth="1.8" />
            <path d="M 28,174 C 40,173 75,175 122,174 C 125,178 124,186 121,191 C 95,192 54,190 29,191 C 26,186 26,179 28,174 Z" 
                  fill="#1c0a02" stroke="#854d0e" strokeWidth="0.8" />
            {/* Vân gỗ lũa cổ thụ */}
            <line x1="34" y1="178" x2="116" y2="178" stroke="#451a03" strokeWidth="0.8" strokeDasharray="18,8" />
            <line x1="32" y1="187" x2="118" y2="187" stroke="#451a03" strokeWidth="0.8" strokeDasharray="22,12" />

            {/* 2 Đèn lồng đỏ con rọi biển hiệu */}
            <ellipse cx="28" cy="182" rx="3.5" ry="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <ellipse cx="122" cy="182" rx="3.5" ry="5.5" fill="#ef4444" filter="url(#bloomSoft)" />

            {/* Chữ chạm khắc chìm dát vàng */}
            <text x="75" y="183.5" fill="#fef08a" fontSize="8.8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8" filter="url(#bloomSoft)">CAO LẦU BÀ BÉ</text>
            <text x="75" y="190.5" fill="#fed7aa" fontSize="5" textAnchor="middle" fontFamily="serif">Mì Quảng &amp; Cao Lầu Gia Truyền</text>
        </g>`;

replaceSection(
  '{/* BIỂN HIỆU NGHỆ THUẬT 2: GỖ LŨA TỰ NHIÊN MỘC MẠC',
  '{/* CỬA RA VÀO BẾP MỞ',
  newH2,
  'House 2 Signboard'
);

// 3. UPGRADE HOUSE 4 SIGNBOARD (Tơ Lụa Á Đông)
const newH4 = `{/* BIỂN HIỆU NGHỆ THUẬT 4: KHUNG OVAL LỤA TƠ TẰM THÊU GẤM & XÍCH ĐỒNG CỔ ĐIỂN */}
        <g filter="url(#dropShadow)">
            {/* Dây xích đồng treo cổ điển từ rui mè mái ngói */}
            <line x1="38" y1="164" x2="48" y2="173" stroke="#ca8a04" strokeWidth="1.4" strokeDasharray="3,1" />
            <line x1="146" y1="164" x2="136" y2="173" stroke="#ca8a04" strokeWidth="1.4" strokeDasharray="3,1" />
            <circle cx="38" cy="164" r="2" fill="#fef08a" />
            <circle cx="146" cy="164" r="2" fill="#fef08a" />

            {/* Bảng khung hình OVAL gỗ trắc chạm trổ hạt cườm viền quanh */}
            <ellipse cx="92" cy="183" rx="68" ry="12" fill="#1c0a02" stroke="#d97706" strokeWidth="1.8" />
            <ellipse cx="92" cy="183" rx="64" ry="9.5" fill="#3b1502" stroke="#fef08a" strokeWidth="0.8" strokeDasharray="4,1" />

            {/* Biểu tượng cuộn lụa tơ tằm hai bên */}
            <g transform="translate(36, 183)">
                <ellipse cx="0" cy="0" rx="4.5" ry="6" fill="#ec4899" stroke="#fbcfe8" strokeWidth="0.8" />
                <ellipse cx="0" cy="0" rx="2.5" ry="3.5" fill="#fdf2f8" />
            </g>
            <g transform="translate(148, 183)">
                <ellipse cx="0" cy="0" rx="4.5" ry="6" fill="#06b6d4" stroke="#a5f3fc" strokeWidth="0.8" />
                <ellipse cx="0" cy="0" rx="2.5" ry="3.5" fill="#ecfeff" />
            </g>

            {/* Chữ thêu tơ tằm vàng óng */}
            <text x="92" y="182.5" fill="#fef08a" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.9" filter="url(#bloomSoft)">TƠ LỤA Á ĐÔNG</text>
            <text x="92" y="189" fill="#fed7aa" fontSize="5" textAnchor="middle" fontFamily="serif">May Đo Áo Dài Lấy Ngay Trong Ngày</text>
        </g>`;

replaceSection(
  '{/* BIỂN HIỆU NGHỆ THUẬT 4: KHUNG OVAL LỤA TƠ TẰM',
  '<rect x="42" y="200" width="100" height="75"',
  newH4,
  'House 4 Signboard'
);

// 4. UPGRADE HOUSE 5 SIGNBOARD (Lồng Đèn Phố Cổ)
const newH5 = `{/* BIỂN HIỆU NGHỆ THUẬT 5: BIỂN HỘP LỤA BÁT GIÁC PHÁT SÁNG ĐÊM RẰM */}
        <g filter="url(#bloomSoft)">
            {/* Hộp đèn lục lăng phát sáng ấm áp rực rỡ */}
            <polygon points="210,172 370,172 377,183 370,194 210,194 203,183" 
                     fill="#fef08a" stroke="#ca8a04" strokeWidth="2" filter="url(#bloomHigh)" opacity="0.98" />
            <polygon points="213,174 367,174 373,183 367,192 213,192 207,183" 
                     fill="#fffbeb" stroke="#f59e0b" strokeWidth="1" />

            {/* Hoa văn nút thắt Cát Tường đỏ hoàng gia góc biển */}
            <circle cx="215" cy="183" r="3.5" fill="#dc2626" stroke="#fef08a" strokeWidth="0.6" />
            <circle cx="365" cy="183" r="3.5" fill="#dc2626" stroke="#fef08a" strokeWidth="0.6" />

            {/* Chiếc đèn lồng hoa sen mini treo lủng lẳng dưới biển đung đưa */}
            <g transform="translate(290, 194)" className="animate-hand-lantern">
                <line x1="0" y1="0" x2="0" y2="5" stroke="#78350f" strokeWidth="1" />
                <ellipse cx="0" cy="9" rx="4.5" ry="6" fill="#f43f5e" filter="url(#bloomHigh)" />
                <circle cx="0" cy="9" r="1.8" fill="#fef08a" />
                <line x1="0" y1="15" x2="0" y2="20" stroke="#f59e0b" strokeWidth="1.2" />
            </g>

            {/* Chữ gỗ chạm lộng màu nâu sẫm sắc nét trên nền lụa sáng */}
            <text x="290" y="182" fill="#451a03" fontSize="8.2" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.9">LỒNG ĐÈN PHỐ CỔ</text>
            <text x="290" y="189" fill="#9a3412" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="serif">Nghệ Nhân Huỳnh Văn • Di Sản Hội An</text>
        </g>`;

replaceSection(
  '{/* BIỂN HIỆU NGHỆ THUẬT 5: BIỂN HỘP LỤA BÁT GIÁC',
  '{/* CỬA TIỆM LỒNG ĐÈN RỰC RỠ SẮC MÀU */',
  newH5,
  'House 5 Signboard'
);

// 5. UPGRADE HOUSE 6 SIGNBOARD (Cà Phê Faifo 1932)
const newH6 = `{/* BIỂN HIỆU NGHỆ THUẬT 6: GIÁ SẮT UỐN NGHỆ THUẬT VINTAGE & BẢNG INDOCHINE */}
        <g filter="url(#dropShadow)">
            {/* Giá sắt rèn nghệ thuật Pháp - Indochine với đường cong xoắn ốc S-curves cổ điển */}
            <path d="M 420,166 L 442,166 Q 452,166 454,172 L 454,178" fill="none" stroke="#0f172a" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 420,178 Q 436,178 442,170" fill="none" stroke="#0f172a" strokeWidth="1.5" />
            {/* Hoa văn uốn tròn đầu giá sắt */}
            <circle cx="422" cy="166" r="2.8" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
            <circle cx="432" cy="172" r="2.4" fill="none" stroke="#ca8a04" strokeWidth="1.2" />

            {/* Móc xích đôi treo biển */}
            <line x1="454" y1="171" x2="454" y2="175" stroke="#ca8a04" strokeWidth="1.2" />
            <line x1="584" y1="171" x2="584" y2="175" stroke="#ca8a04" strokeWidth="1.2" />

            {/* Bảng gỗ Indochine góc bo tròn viền đồng có đinh tán cổ điển */}
            <rect x="440" y="174" width="152" height="21" rx="4.5" fill="#181411" stroke="#d97706" strokeWidth="1.6" />
            <rect x="442" y="176" width="148" height="17" rx="3.5" fill="#2d2218" stroke="#ca8a04" strokeWidth="0.7" strokeDasharray="3,1" />
            {/* Đinh tán đồng 4 góc */}
            <circle cx="445" cy="178" r="1.4" fill="#fef08a" />
            <circle cx="587" cy="178" r="1.4" fill="#fef08a" />
            <circle cx="445" cy="191" r="1.4" fill="#fef08a" />
            <circle cx="587" cy="191" r="1.4" fill="#fef08a" />

            {/* Tách cà phê bốc khói nhỏ xinh góc trái */}
            <g transform="translate(456, 185)">
                <ellipse cx="0" cy="1" rx="4.5" ry="2.5" fill="#d97706" stroke="#fef08a" strokeWidth="0.6" />
                <path d="M -3,-1 Q 0,-5 3,-1" fill="none" stroke="#fef08a" strokeWidth="1" className="animate-steam" />
            </g>

            {/* Bánh Trung Thu mặt trăng góc phải */}
            <g transform="translate(576, 184)">
                <circle cx="0" cy="0" r="4.2" fill="#ca8a04" stroke="#fef08a" strokeWidth="0.8" />
                <circle cx="0" cy="0" r="2" fill="#f59e0b" />
            </g>

            {/* Chữ phong cách Indochine vintage sang trọng */}
            <text x="516" y="183.5" fill="#fef08a" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.9" filter="url(#bloomSoft)">CÀ PHÊ FAIFO 1932</text>
            <text x="516" y="190" fill="#fed7aa" fontSize="5" textAnchor="middle" fontFamily="serif">Bánh Nướng Trung Thu &amp; Cà Phê Phin</text>
        </g>`;

replaceSection(
  '{/* BIỂN HIỆU NGHỆ THUẬT 6: GIÁ SẮT UỐN NGHỆ THUẬT',
  '{/* CỬA QUÁN CÀ PHÊ & QUẦY BAR GỖ CỔ ĐIỂN */}',
  newH6,
  'House 6 Signboard'
);

// 6. UPGRADE EMBANKMENT STONE BOLLARDS
const postPositions = [
  { x: 60, col: '#ef4444' },
  { x: 180, col: '#f59e0b' },
  { x: 310, col: '#06b6d4' },
  { x: 440, col: '#ec4899' },
  { x: 580, col: '#10b981' },
  { x: 710, col: '#f43f5e' },
  { x: 850, col: '#f59e0b' },
  { x: 990, col: '#fef08a' },
  { x: 1120, col: '#06b6d4' },
  { x: 1260, col: '#ec4899' },
  { x: 1400, col: '#10b981' },
  { x: 1540, col: '#f43f5e' },
  { x: 1680, col: '#ef4444' },
  { x: 1820, col: '#f59e0b' },
];

const newPosts = `<g id="hoian-granite-bollards">
` + postPositions.map(p => `            <g transform="translate(${p.x}, 520)">
                {/* Đế đá granit xanh nguyên khối */}
                <rect x="-2" y="24" width="14" height="6" rx="1.5" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
                {/* Thân trụ đá chạm vát cạnh cổ truyền */}
                <polygon points="0,24 10,24 8.5,4 1.5,4" fill="#334155" stroke="#475569" strokeWidth="0.8" />
                {/* Vòng đai đồng giữ chóa đèn */}
                <rect x="-1" y="2" width="12" height="3" rx="0.5" fill="#b45309" stroke="#f59e0b" strokeWidth="0.6" />
                {/* Đèn lồng quả cầu phát sáng ấm áp */}
                <circle cx="5" cy="-2" r="5.5" fill="${p.col}" filter="url(#bloomSoft)" />
                <circle cx="5" cy="-2" r="2.2" fill="#fffbeb" />
            </g>`).join('\n') + `
        </g>`;

replaceSection(
  '<g fill="#241002">',
  '{/* 4 BẬC THỀM ĐÁ TAM CẤP',
  newPosts,
  'Embankment Stone Bollards'
);

// 7. ADD SHIMMERING MOONLIGHT RIVER COLUMN
const riverStartMarker = '<g id="song-hoai-fluid">';
const riverWaterRect = '<rect x="0" y="560" width="1920" height="520" fill="url(#riverGrad)" />';
const newMoonlightRiver = `<g id="song-hoai-fluid">
        <rect x="0" y="560" width="1920" height="520" fill="url(#riverGrad)" />

        {/* DẢI ÁNH TRĂNG VÀNG DÁT XUỐNG MẶT SÔNG HOÀI (SHIMMERING MOONLIGHT RIVER COLUMN) */}
        <g filter="url(#bloomSoft)" opacity="0.6" className="animate-water-shimmer">
            <ellipse cx="960" cy="575" rx="140" ry="10" fill="#fef08a" opacity="0.45" />
            <ellipse cx="960" cy="610" rx="190" ry="14" fill="#fef08a" opacity="0.38" />
            <ellipse cx="960" cy="660" rx="240" ry="18" fill="#fde047" opacity="0.32" />
            <ellipse cx="960" cy="720" rx="290" ry="22" fill="#f59e0b" opacity="0.28" />
            <ellipse cx="960" cy="790" rx="340" ry="26" fill="#f59e0b" opacity="0.22" />
            <ellipse cx="960" cy="870" rx="390" ry="30" fill="#d97706" opacity="0.18" />
            <ellipse cx="960" cy="970" rx="440" ry="36" fill="#d97706" opacity="0.15" />
        </g>`;

if (content.includes(riverWaterRect)) {
  content = content.replace(riverStartMarker + '\n        \n        ' + riverWaterRect, newMoonlightRiver);
  console.log('✓ Added Shimmering Moonlight River Column');
} else {
  console.log('Warning: riverWaterRect pattern not matched directly');
}

// Validate with esbuild
try {
  esbuild.transformSync(content, { loader: 'tsx' });
  fs.writeFileSync(backdropPath, content, 'utf8');
  console.log('ALL UPDATES APPLIED AND ESBUILD VALIDATED! Total lines:', content.split('\n').length);
} catch (err) {
  console.error('esbuild validation failed:', err.message);
  process.exit(1);
}
