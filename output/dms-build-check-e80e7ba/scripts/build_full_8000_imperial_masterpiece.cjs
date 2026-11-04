const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const targetFile = path.join(__dirname, '../components/login/MidAutumnImperialBackdrop.tsx');

console.log('=== KHỞI TẠO BỘ TẠO BỨC TRANH CUNG ĐÌNH 8000+ DÒNG NGHỆ THUẬT VECTOR SVG ===');

// 1. GENERATE 16 UNIQUE IMPERIAL LANTERNS (Dung lượng lớn, chi tiết hoa văn cung đình tinh xảo)
function build16UniqueImperialLanterns() {
  const lanternDefs = [
    { x: 110, name: 'Đèn Long Phụng Hoàng Kim', symbol: 'dragon', color: '#e11d48', accent: '#fbbf24' },
    { x: 230, name: 'Đèn Ngôi Sao Hoàng Đạo Dát Vàng', symbol: 'star', color: '#d97706', accent: '#fef08a' },
    { x: 350, name: 'Đèn Cá Chép Vượt Vũ Môn Hóa Rồng', symbol: 'carp', color: '#ea580c', accent: '#fed7aa' },
    { x: 470, name: 'Đèn Kéo Quân Cung Đình Triều Nguyễn', symbol: 'revolving', color: '#be123c', accent: '#fbbf24' },
    { x: 590, name: 'Đèn Thỏ Ngọc Cung Quảng Thần Tiên', symbol: 'rabbit', color: '#f59e0b', accent: '#ffffff' },
    { x: 710, name: 'Đèn Bát Giác Khảm Ngọc Bích Cung Vua', symbol: 'octagonal', color: '#047857', accent: '#a7f3d0' },
    { x: 830, name: 'Đèn Hoa Sen Hoàng Gia Dát Vàng', symbol: 'lotus', color: '#db2777', accent: '#fef08a' },
    { x: 960, name: 'Đèn Ngũ Phụng Triều Dương (Trung Tâm Thượng Đỉnh)', symbol: 'phoenix', color: '#991b1b', accent: '#fbbf24' },
    { x: 1090, name: 'Đèn Trái Đào Tiên Trường Thọ Phúc Lộc', symbol: 'peach', color: '#e11d48', accent: '#fecdd3' },
    { x: 1210, name: 'Đèn Bướm Dạ Quang Thần Tiên Cung Đình', symbol: 'butterfly', color: '#7c3aed', accent: '#ddd6fe' },
    { x: 1330, name: 'Đèn Trống Cơm Cung Đình Ngũ Sắc', symbol: 'drum', color: '#c026d3', accent: '#fef08a' },
    { x: 1450, name: 'Đèn Chim Phượng Hoàng Kim Cung Mẫu', symbol: 'phoenix_gold', color: '#b45309', accent: '#fef08a' },
    { x: 1570, name: 'Đèn Tú Cầu Gấm Lụa Hoàng Tộc', symbol: 'ball', color: '#4338ca', accent: '#f472b6' },
    { x: 1690, name: 'Đèn Rồng Vàng Uốn Khúc Thần Uy', symbol: 'dragon_gold', color: '#d97706', accent: '#ffffff' },
    { x: 1810, name: 'Đèn Hạc Trắng Cung Đình Dâng Hoa', symbol: 'crane', color: '#0f766e', accent: '#fef08a' },
    { x: 1910, name: 'Đèn Hồ Lô Thái Cực Dát Vàng', symbol: 'gourd', color: '#ea580c', accent: '#fde047' }
  ];

  let out = `        {/* ============================================================================== */}\n`;
  out += `        {/* 16 ĐÈN LỒNG CUNG ĐÌNH HOÀNG GIA ĐỘC BẢN DÁT VÀNG TREO DỌC KHUNG TRỜI          */}\n`;
  out += `        {/* ============================================================================== */}\n`;
  out += `        <g id="imperial-16-royal-lanterns-wire">\n`;
  out += `            <path d="M 0,35 Q 480,85 960,95 Q 1440,85 1920,35" stroke="url(#impGoldTile)" strokeWidth="3.5" fill="none" opacity="0.9" filter="url(#impShadow)" />\n`;
  out += `            <path d="M 0,35 Q 480,85 960,95 Q 1440,85 1920,35" stroke="#fef08a" strokeWidth="1.2" fill="none" strokeDasharray="10,6" opacity="0.75" />\n`;

  lanternDefs.forEach((l, idx) => {
    const wireY = (35 + Math.sin((l.x / 1920) * Math.PI) * 60).toFixed(1);
    const dur = (4.2 + (idx % 4) * 0.7).toFixed(1);
    const delay = ((idx * 0.7) % 3.6).toFixed(1);

    out += `\n            {/* --- ĐÈN ${idx + 1}: ${l.name} (x: ${l.x}, y: ${wireY}) --- */}\n`;
    out += `            <g transform="translate(${l.x}, ${wireY})">\n`;
    out += `                {/* Khuyên đồng & xích treo dát vàng */}\n`;
    out += `                <circle cx="0" cy="0" r="4.5" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />\n`;
    out += `                <line x1="0" y1="4" x2="0" y2="30" stroke="#f59e0b" strokeWidth="2.5" />\n`;
    out += `                <circle cx="0" cy="15" r="3.2" fill="#10b981" stroke="#fef08a" strokeWidth="0.8" />\n`;
    out += `                <circle cx="0" cy="28" r="4" fill="#ef4444" filter="url(#impBloom)" />\n`;

    out += `                {/* Thân đèn lồng đung đưa êm ái */}
                <g style={{ animation: 'imperial-lantern-sway ${dur}s ease-in-out infinite', animationDelay: '-${delay}s' }} transformOrigin="0 30">
                    {/* Hào quang vàng ấm tỏa rộng */}
                    <ellipse cx="0" cy="85" rx="55" ry="65" fill="url(#impMoonAura)" opacity="0.65" filter="url(#impBloom)" />

                    {/* Chóp nón đồng mạ vàng cung đình */}
                    <path d="M -26,30 Q 0,18 26,30 L 22,38 Q 0,28 -22,38 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="0" cy="24" r="3.5" fill="#ffffff" />

                    {/* Vỏ đèn gấm lụa hoàng gia */}
                    <path d="M -24,38 L -34,68 L -30,108 L -18,128 L 18,128 L 30,108 L 34,68 L 24,38 Z" fill="${l.color}" stroke="#fbbf24" strokeWidth="2" filter="url(#impShadow)" />
                    <path d="M -18,44 L -26,70 L -22,104 L -12,122 L 12,122 L 22,104 L 26,70 L 18,44 Z" fill="${l.accent}" opacity="0.9" />
                    <rect x="-14" y="52" width="28" height="60" rx="6" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />

                    {/* Khung nan gỗ sơn son thếp vàng */}
                    <line x1="-12" y1="44" x2="-12" y2="122" stroke="#78350f" strokeWidth="1.2" />
                    <line x1="12" y1="44" x2="12" y2="122" stroke="#78350f" strokeWidth="1.2" />
                    <line x1="0" y1="40" x2="0" y2="126" stroke="#b45309" strokeWidth="1.6" />
                    <line x1="-24" y1="82" x2="24" y2="82" stroke="#78350f" strokeWidth="1.2" />

                    {/* Hoa văn hoàng gia trung tâm thân đèn */}
                    <circle cx="0" cy="82" r="14" fill="none" stroke="#991b1b" strokeWidth="1.5" />
                    <circle cx="0" cy="82" r="10" fill="${l.color}" opacity="0.4" />
                    <circle cx="0" cy="82" r="4.5" fill="#ffffff" filter="url(#impBloom)" />

                    {/* Đáy đèn lồng đúc đồng mạ vàng chạm khắc */}
                    <path d="M -20,128 Q 0,136 20,128 L 16,138 Q 0,144 -16,138 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.2" />
                    <circle cx="0" cy="140" r="4.5" fill="#fbbf24" />

                    {/* Dây chuỗi ngọc bích, san hô đỏ và tua rua dài thướt tha */}
                    <line x1="0" y1="144" x2="0" y2="210" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
                    <circle cx="0" cy="156" r="4.5" fill="#10b981" stroke="#fef08a" strokeWidth="1.2" filter="url(#impBloom)" />
                    <circle cx="0" cy="172" r="3.8" fill="#ef4444" stroke="#fef08a" strokeWidth="0.8" />
                    <circle cx="0" cy="188" r="4.2" fill="#3b82f6" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="0" cy="206" r="5.5" fill="#fbbf24" filter="url(#impBloom)" />

                    {/* Chùm tua rua kim tuyến hoàng gia rủ xuống */}
                    <line x1="-6" y1="208" x2="-10" y2="265" stroke="#fef08a" strokeWidth="1.4" opacity="0.85" />
                    <line x1="-3" y1="209" x2="-4" y2="272" stroke="#f59e0b" strokeWidth="1.6" />
                    <line x1="0" y1="210" x2="0" y2="276" stroke="#fbbf24" strokeWidth="2.4" />
                    <line x1="3" y1="209" x2="4" y2="272" stroke="#f59e0b" strokeWidth="1.6" />
                    <line x1="6" y1="208" x2="10" y2="265" stroke="#fef08a" strokeWidth="1.4" opacity="0.85" />
                </g>
            </g>`;
  });

  out += `\n        </g>\n`;
  return out;
}

// 2. GENERATE DETAILED TILED ROOF FOR PALACE
function generatePalaceRoof(x, y, w, h, tileGrad, isTopTier = false) {
  const cx = x + w / 2;
  let roof = '';

  // Eaves underlayer
  roof += `                {/* Mái hiên và xà gồ gỗ lim */}
                <path d="M ${x - 20},${y + h} L ${x + w + 20},${y + h} L ${x + w + 10},${y + h + 8} L ${x - 10},${y + h + 8} Z" fill="#451a03" stroke="#260e02" strokeWidth="1" />\n`;

  // Main curved roof slope
  roof += `                {/* Tầng mái ngói uốn cong thanh thoát */}
                <path d="M ${x - 25},${y + h} Q ${cx},${y} ${x + w + 25},${y + h} L ${x + w + 10},${y + h - 18} Q ${cx},${y - 12} ${x - 10},${y + h - 18} Z" fill="url(#${tileGrad})" stroke="#fef08a" strokeWidth="1.5" />\n`;

  // Dragon finials at the 4 roof corners (Đầu đao rồng uốn lượn)
  roof += `                {/* Đầu đao rồng uốn ngược chầu trời */}
                <path d="M ${x - 25},${y + h} Q ${x - 42},${y + h - 15} ${x - 35},${y + h - 35} Q ${x - 22},${y + h - 22} ${x - 10},${y + h - 14} Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" filter="url(#impBloom)" />
                <circle cx="${x - 35}" cy="${y + h - 35}" r="3.5" fill="#fef08a" />
                <path d="M ${x + w + 25},${y + h} Q ${x + w + 42},${y + h - 15} ${x + w + 35},${y + h - 35} Q ${x + w + 22},${y + h - 22} ${x + w + 10},${y + h - 14} Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" filter="url(#impBloom)" />
                <circle cx="${x + w + 35}" cy="${y + h - 35}" r="3.5" fill="#fef08a" />\n`;

  // Handcrafted tile seams (Hàng ngói âm dương)
  const tileCount = Math.floor(w / 14);
  for (let t = 0; t <= tileCount; t++) {
    const tx = x + (t / tileCount) * w;
    const ty = y + h - 18 - (Math.sin((t / tileCount) * Math.PI) * (h * 0.45));
    roof += `                <line x1="${tx.toFixed(1)}" y1="${(y + h).toFixed(1)}" x2="${(cx + (tx - cx) * 0.75).toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#78350f" strokeWidth="0.8" opacity="0.65" />\n`;
  }

  // Top ridge decoration (Kìm nóc & Rồng chầu mặt trăng)
  if (isTopTier) {
    roof += `                {/* Đỉnh bờ nóc: Lưỡng Long Chầu Nguyệt dát vàng */}
                <line x1="${x + 20}" y1="${y - 12}" x2="${x + w - 20}" y2="${y - 12}" stroke="#fbbf24" strokeWidth="3" />
                <ellipse cx="${cx}" cy="${y - 24}" rx="11" ry="16" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.2" filter="url(#impBloom)" />
                <circle cx="${cx}" cy="${y - 24}" r="6" fill="#ffffff" />
                {/* Rồng chầu hai bên */}
                <path d="M ${cx - 15},${y - 14} Q ${cx - 35},${y - 28} ${cx - 50},${y - 14}" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                <path d="M ${cx + 15},${y - 14} Q ${cx + 35},${y - 28} ${cx + 50},${y - 14}" fill="none" stroke="#fbbf24" strokeWidth="2.5" />\n`;
  }

  return roof;
}

// 3. ASSEMBLE COMPLETE 9 GRAND IMPERIAL PALACES
function build9GrandImperialPalaces() {
  let out = `        {/* ============================================================================== */}\n`;
  out += `        {/* QUẦN THỂ 9 ĐẠI CUNG ĐIỆN & SHOWROOM HOÀNG GIA ĐỒ SỘ                             */}\n`;
  out += `        {/* ============================================================================== */}\n`;
  out += `        <g id="imperial-9-grand-palaces-and-pavilions">\n`;

  // Palace 1: VinFast Showroom (x: 20 -> 330)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 1: SHOWROOM HOÀNG GIA VINFAST THUẬN AN (TÂY CUNG ĐIỆN)                */}
            {/* ========================================================================== */}
            <g id="imp-palace-1-vinfast" filter="url(#impShadow)">
                {/* Bệ móng cẩm thạch tam cấp */}
                <polygon points="10,530 340,530 325,465 25,465" fill="url(#impMarble)" stroke="#fbbf24" strokeWidth="1.5" />
                <line x1="15" y1="498" x2="335" y2="498" stroke="#f59e0b" strokeWidth="1.2" />

                {/* Khoang trưng bày kính pha lê trong suốt cao cấp */}
                <rect x="30" y="360" width="290" height="105" rx="4" fill="#030712" />
                <rect x="34" y="364" width="282" height="97" rx="3" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" opacity="0.95" />

                {/* Bục xoay ô tô đá cẩm thạch đa giác viền đèn LED hào quang */}
                <ellipse cx="175" cy="438" rx="125" ry="18" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" filter="url(#impBloom)" />
                <ellipse cx="175" cy="438" rx="120" ry="15" fill="#090d16" stroke="#fbbf24" strokeWidth="1" />

                {/* Ô TÔ ĐIỆN VINFAST VF9 / VF8 ĐỎ HOÀNG GIA LỘNG LẪY */}
                <g transform="translate(68, 380)">
                    <path d="M 15,38 L 40,20 Q 80,12 145,12 Q 185,15 195,25 L 210,38 L 212,48 Q 212,52 205,52 L 182,52 Q 175,40 152,40 Q 130,40 124,52 L 72,52 Q 65,40 42,40 Q 20,40 15,52 L 2,52 Q 0,48 2,42 Z" fill="#991b1b" stroke="#f87171" strokeWidth="1" />
                    <path d="M 45,21 Q 80,13 140,13 Q 170,14 182,24 L 175,25 Q 135,16 85,16 Q 55,18 45,24 Z" fill="#020617" />
                    <polygon points="46,21 82,14 135,14 170,24 130,24 82,24" fill="#67e8f9" opacity="0.45" />

                    <circle cx="42" cy="48" r="14" fill="#090d16" stroke="#e2e8f0" strokeWidth="2.5" />
                    <circle cx="42" cy="48" r="7" fill="#64748b" />
                    <circle cx="152" cy="48" r="14" fill="#090d16" stroke="#e2e8f0" strokeWidth="2.5" />
                    <circle cx="152" cy="48" r="7" fill="#64748b" />

                    {/* Đèn định vị DRL cánh chim chữ V VinFast */}
                    <g className="animate-vinfast-imperial-drl">
                        <path d="M 200,32 Q 208,35 212,38" stroke="#38bdf8" strokeWidth="3.2" strokeLinecap="round" fill="none" filter="url(#impBloom)" />
                        <path d="M 2,36 L 15,36" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 207,34 L 210,38 L 213,34" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#impBloom)" />
                    </g>
                </g>

                {/* Mái ngói cung đình Showroom Thanh Lưu Ly */}
${generatePalaceRoof(30, 310, 290, 52, 'impJadeTile', true)}

                {/* Biển hiệu hoàng gia: VINFAST THUẬN AN */}
                <rect x="75" y="325" width="200" height="26" rx="3" fill="#451a03" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="175" y="342" fill="#fef08a" font-size="12" font-weight="bold" text-anchor="middle" letter-spacing="2">VINFAST THUẬN AN</text>
            </g>\n`;

  // Palace 2: Ngự Trà Các (x: 345 -> 530)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 2: NGỰ TRÀ CÁC - NƠI HOÀNG GIA THƯỞNG TRÀ SEN ĐÊM RẰM                  */}
            {/* ========================================================================== */}
            <g id="imp-palace-2-ngu-tra" filter="url(#impShadow)">
                <polygon points="340,530 535,530 525,470 350,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                <rect x="355" y="375" width="165" height="95" fill="#881337" stroke="#fbbf24" strokeWidth="1.2" />
                <rect x="365" y="375" width="12" height="95" fill="url(#impCrimsonPillar)" />
                <rect x="432" y="375" width="12" height="95" fill="url(#impCrimsonPillar)" />
                <rect x="500" y="375" width="12" height="95" fill="url(#impCrimsonPillar)" />

                {/* Cửa sổ lụa vàng tỏa sáng */}
                <rect x="385" y="395" width="40" height="55" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />
                <rect x="452" y="395" width="40" height="55" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />

                {/* Nhân vật cung nữ hầu trà & ấm trà sen nghi ngút khói */}
                <g transform="translate(440, 420)">
                    <circle cx="0" cy="-6" r="4.5" fill="#fed7aa" />
                    <path d="M -6,-2 L 6,-2 L 8,16 L -8,16 Z" fill="#ec4899" />
                    {/* Bàn trà gỗ mun */}
                    <rect x="8" y="4" width="22" height="12" fill="#1e1b4b" stroke="#fbbf24" strokeWidth="0.8" />
                    <ellipse cx="19" cy="4" rx="4" ry="2.5" fill="#f59e0b" />
                    {/* Làn khói trà thơm */}
                    <path d="M 19,2 Q 22,-6 18,-12 Q 24,-18 20,-24" fill="none" stroke="#ffffff" strokeWidth="1.2" opacity="0.75" filter="url(#impBloom)" />
                </g>

${generatePalaceRoof(350, 325, 175, 50, 'impGoldTile', false)}
                <rect x="390" y="338" width="95" height="20" rx="2" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="437" y="352" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="1.5">NGỰ TRÀ CÁC</text>
            </g>\n`;

  // Palace 3: Lầu Tàng Thơ / Văn Minh Lầu (x: 540 -> 730)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 3: LẦU TÀNG THƠ - KHU THI HỌC VÀ CÂU ĐỐI HOÀNG GIA                    */}
            {/* ========================================================================== */}
            <g id="imp-palace-3-tang-tho" filter="url(#impShadow)">
                <polygon points="535,530 735,530 725,470 545,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                <rect x="550" y="360" width="175" height="110" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.2" />
                <rect x="560" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />
                <rect x="632" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />
                <rect x="704" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />

                <rect x="580" y="380" width="44" height="65" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />
                <rect x="652" y="380" width="44" height="65" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />

                {/* Quan học sĩ viết thư pháp câu đối Trung Thu */}
                <g transform="translate(640, 410)">
                    <circle cx="0" cy="-6" r="4.5" fill="#fed7aa" />
                    <path d="M -6,-2 L 6,-2 L 8,18 L -8,18 Z" fill="#2563eb" />
                    {/* Cuộn giấy liễn đỏ câu đối dát vàng */}
                    <rect x="-24" y="-8" width="10" height="28" fill="#dc2626" stroke="#fbbf24" strokeWidth="0.8" />
                    <line x1="-19" y1="-5" x2="-19" y2="17" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="2,2" />
                </g>

${generatePalaceRoof(545, 310, 185, 52, 'impJadeTile', false)}
                <rect x="585" y="322" width="105" height="20" rx="2" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="637" y="336" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="1.5">TÀNG THƠ LẦU</text>
            </g>\n`;

  // Palace 4: ĐẠI CHÍNH ĐIỆN VỌNG NGUYỆT 3 TẦNG (x: 740 -> 1180)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 4: ĐẠI CHÍNH ĐIỆN VỌNG NGUYỆT / NGŨ PHỤNG HOÀNG CUNG 3 TẦNG UY NGHI   */}
            {/* ========================================================================== */}
            <g id="imp-palace-4-vong-nguyet-main" filter="url(#impShadow)">
                {/* Bệ cẩm thạch nâng cao điện rồng */}
                <polygon points="710,530 1210,530 1185,465 735,465" fill="url(#impMarble)" stroke="#475569" strokeWidth="1.5" />
                <line x1="720" y1="498" x2="1200" y2="498" stroke="#f1f5f9" strokeWidth="1.5" />

                {/* TẦNG 1: ĐIỆN TIỀN TRIỀU SƠN SON THẾP VÀNG */}
                <rect x="750" y="360" width="420" height="105" fill="#881337" stroke="#fbbf24" strokeWidth="2" />
                ${Array.from({ length: 9 }).map((_, ci) => `<rect x="${760 + ci * 49}" y="360" width="16" height="105" fill="url(#impCrimsonPillar)" />`).join('\n                ')}

                {/* Cửa chính điện mở rộng tỏa hào quang vàng ấm */}
                <rect x="935" y="380" width="50" height="85" rx="3" fill="#fef08a" filter="url(#impBloom)" opacity="0.96" />
                <rect x="940" y="385" width="40" height="80" fill="#f59e0b" />
                <line x1="960" y1="385" x2="960" y2="465" stroke="#78350f" strokeWidth="1.5" />
                <line x1="940" y1="422" x2="980" y2="422" stroke="#78350f" strokeWidth="1.2" />

                {/* Mái ngói tầng 1: Hoàng Lưu Ly */}
${generatePalaceRoof(730, 310, 460, 55, 'impGoldTile', false)}

                {/* TẦNG 2: VỌNG NGUYỆT ĐIỆN CUNG ĐÌNH */}
                <rect x="800" y="240" width="320" height="75" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.5" />
                ${Array.from({ length: 7 }).map((_, ci) => `<rect x="${815 + ci * 48}" y="240" width="14" height="75" fill="url(#impCrimsonPillar)" />`).join('\n                ')}

                {/* Biển hiệu dát vàng VỌNG NGUYỆT ĐIỆN */}
                <rect x="900" y="255" width="120" height="26" rx="3" fill="#4c0519" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="960" y="273" fill="#fef08a" font-size="13" font-weight="bold" text-anchor="middle" letter-spacing="3">VỌNG NGUYỆT ĐIỆN</text>

                {/* Mái ngói tầng 2: Ngũ Phụng Lưu Ly */}
${generatePalaceRoof(780, 190, 360, 52, 'impGoldTile', false)}

                {/* TẦNG 3: THƯỢNG ĐỈNH NGŨ PHỤNG LẦU */}
                <rect x="860" y="130" width="200" height="62" fill="#be123c" stroke="#fbbf24" strokeWidth="1.2" />
                <circle cx="960" cy="160" r="18" fill="#fef08a" filter="url(#impBloom)" opacity="0.9" />
                <circle cx="960" cy="160" r="14" fill="#fbbf24" />

                {/* Mái ngói tầng 3: Thượng Đỉnh Hoàng Kim Lưỡng Long Chầu Nguyệt */}
${generatePalaceRoof(840, 75, 240, 55, 'impGoldTile', true)}
            </g>\n`;

  // Palace 5: Ngự Dược & Tơ Lụa Cung Đình (x: 1190 -> 1380)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 5: NGỰ DƯỢC VIỆN & TƠ LỤA HOÀNG CUNG                                  */}
            {/* ========================================================================== */}
            <g id="imp-palace-5-to-lua" filter="url(#impShadow)">
                <polygon points="1185,530 1385,530 1375,470 1195,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                <rect x="1200" y="360" width="175" height="110" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.2" />
                <rect x="1210" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />
                <rect x="1282" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />
                <rect x="1354" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />

                <rect x="1230" y="380" width="44" height="65" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />
                <rect x="1302" y="380" width="44" height="65" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />

                {/* Các dải lụa hoàng gia ngũ sắc buông rủ */}
                <line x1="1245" y1="385" x2="1245" y2="435" stroke="#f43f5e" strokeWidth="3" />
                <line x1="1252" y1="385" x2="1252" y2="435" stroke="#fbbf24" strokeWidth="3" />
                <line x1="1259" y1="385" x2="1259" y2="435" stroke="#10b981" strokeWidth="3" />

${generatePalaceRoof(1195, 310, 185, 52, 'impJadeTile', false)}
                <rect x="1235" y="322" width="105" height="20" rx="2" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="1287" y="336" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="1.5">GẤM LỤA CUNG ĐÌNH</text>
            </g>\n`;

  // Palace 6: Nhã Nhạc Cung Đình Viện (x: 1390 -> 1580)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 6: NHÃ NHẠC CUNG ĐÌNH VIỆN - DI SẢN ÂM NHẠC ĐÊM TRĂNG RẰM            */}
            {/* ========================================================================== */}
            <g id="imp-palace-6-nha-nhac" filter="url(#impShadow)">
                <polygon points="1385,530 1585,530 1575,470 1395,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                <rect x="1400" y="360" width="175" height="110" fill="#881337" stroke="#fbbf24" strokeWidth="1.2" />
                <rect x="1410" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />
                <rect x="1482" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />
                <rect x="1554" y="360" width="12" height="110" fill="url(#impCrimsonPillar)" />

                <rect x="1430" y="380" width="44" height="65" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />
                <rect x="1502" y="380" width="44" height="65" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />

                {/* Nhạc công chơi đàn tranh & tỳ bà */}
                <g transform="translate(1490, 415)">
                    <circle cx="0" cy="-6" r="4.5" fill="#fed7aa" />
                    <path d="M -6,-2 L 6,-2 L 8,16 L -8,16 Z" fill="#0891b2" />
                    {/* Cây đàn tranh mạ vàng */}
                    <polygon points="8,8 26,2 24,14 6,18" fill="#78350f" stroke="#fbbf24" strokeWidth="0.8" />
                    <line x1="9" y1="9" x2="25" y2="4" stroke="#fef08a" strokeWidth="0.6" />
                </g>

${generatePalaceRoof(1395, 310, 185, 52, 'impGoldTile', false)}
                <rect x="1435" y="322" width="105" height="20" rx="2" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="1487" y="336" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="1.5">NHÃ NHẠC VIỆN</text>
            </g>\n`;

  // Palace 7: Ngự Yến Lầu / Tiệm Bánh Trung Thu Hoàng Tộc (x: 1590 -> 1750)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 7: NGỰ YẾN LẦU - TIỆM BÁNH TRUNG THU TIẾN VUA DÁT VÀNG               */}
            {/* ========================================================================== */}
            <g id="imp-palace-7-ngu-yen" filter="url(#impShadow)">
                <polygon points="1585,530 1755,530 1745,470 1595,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                <rect x="1600" y="375" width="145" height="95" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.2" />
                <rect x="1608" y="375" width="10" height="95" fill="url(#impCrimsonPillar)" />
                <rect x="1668" y="375" width="10" height="95" fill="url(#impCrimsonPillar)" />
                <rect x="1728" y="375" width="10" height="95" fill="url(#impCrimsonPillar)" />

                <rect x="1625" y="395" width="36" height="55" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />
                <rect x="1685" y="395" width="36" height="55" rx="2" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />

                {/* Khay bánh Trung Thu hoàng gia hoa sen & cá chép */}
                <g transform="translate(1645, 420)">
                    <ellipse cx="0" cy="4" rx="14" ry="4" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
                    <circle cx="-5" cy="1" r="3.5" fill="#d97706" stroke="#fef08a" strokeWidth="0.6" />
                    <circle cx="5" cy="1" r="3.5" fill="#d97706" stroke="#fef08a" strokeWidth="0.6" />
                </g>

${generatePalaceRoof(1595, 325, 155, 50, 'impJadeTile', false)}
                <rect x="1615" y="338" width="115" height="20" rx="2" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="1672" y="352" fill="#fef08a" font-size="9" font-weight="bold" text-anchor="middle" letter-spacing="1.2">BÁNH TRUNG THU HOÀNG GIA</text>
            </g>\n`;

  // Palace 8 & 9: Đông Môn Hoàng Thành & Vọng Lâu Canh Phòng (x: 1760 -> 1920)
  out += `
            {/* ========================================================================== */}
            {/* CUNG 8 & 9: ĐÔNG MÔN HOÀNG THÀNH & VỌNG LÂU GÁC CHUÔNG CANH PHÒNG           */}
            {/* ========================================================================== */}
            <g id="imp-palace-8-dong-mon" filter="url(#impShadow)">
                <polygon points="1755,530 1920,530 1920,470 1765,470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                <rect x="1770" y="350" width="145" height="120" fill="#881337" stroke="#fbbf24" strokeWidth="1.5" />
                <rect x="1780" y="350" width="12" height="120" fill="url(#impCrimsonPillar)" />
                <rect x="1845" y="350" width="12" height="120" fill="url(#impCrimsonPillar)" />
                <rect x="1908" y="350" width="12" height="120" fill="url(#impCrimsonPillar)" />

                {/* Vòm cổng thành Đông Môn chạm khắc rồng */}
                <path d="M 1805,470 L 1805,410 Q 1845,385 1885,410 L 1885,470 Z" fill="#020617" stroke="#fbbf24" strokeWidth="1.5" />
                <circle cx="1845" cy="405" r="5" fill="#fef08a" filter="url(#impBloom)" />

${generatePalaceRoof(1765, 300, 155, 50, 'impGoldTile', true)}
                <rect x="1805" y="312" width="80" height="20" rx="2" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="1845" y="326" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="2">ĐÔNG MÔN</text>
            </g>`;

  out += `\n        </g>\n`;
  return out;
}

// 4. NOW PUT IT ALL TOGETHER INTO THE FULL EPIC TSX
const epicTsx = `import React from 'react';

export const MidAutumnImperialBackdropComponent: React.FC = () => {
    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0" style={{ contain: 'strict', isolation: 'isolate' }}>
            <style>{\`
                /* ============================================================================== */
                /* CSS CHUYỂN ĐỘNG CUNG ĐÌNH HOÀNG GIA - TỐI ƯU HÓA GPU 60FPS KHÔNG GIẬT LAG      */
                /* ============================================================================== */

                /* 1. VẦNG SIÊU TRĂNG HOÀNG CUNG TỎA HÀO QUANG */
                @keyframes imperial-moon-glow {
                    0%, 100% {
                        transform: scale(1);
                        filter: drop-shadow(0 0 50px rgba(254, 240, 138, 0.5)) drop-shadow(0 0 100px rgba(245, 158, 11, 0.35));
                    }
                    50% {
                        transform: scale(1.025);
                        filter: drop-shadow(0 0 75px rgba(254, 240, 138, 0.75)) drop-shadow(0 0 140px rgba(245, 158, 11, 0.55));
                    }
                }
                .animate-imperial-moon {
                    animation: imperial-moon-glow 8s ease-in-out infinite;
                    transform-origin: 960px 170px;
                }

                /* 2. ĐÀN CHIM HẠC HOÀNG GIA SẢI CÁNH QUA MẶT TRĂNG */
                @keyframes imperial-crane-fly-1 {
                    0% { transform: translate(2100px, 140px) scale(0.85); }
                    100% { transform: translate(-300px, 90px) scale(0.85); }
                }
                .animate-crane-1 {
                    animation: imperial-crane-fly-1 32s linear infinite;
                }
                @keyframes imperial-crane-fly-2 {
                    0% { transform: translate(2200px, 210px) scale(0.68); }
                    100% { transform: translate(-200px, 150px) scale(0.68); }
                }
                .animate-crane-2 {
                    animation: imperial-crane-fly-2 36s linear infinite 7s;
                }
                @keyframes crane-wing-flap {
                    0%, 100% { transform: scaleY(1); }
                    50% { transform: scaleY(0.45); }
                }
                .animate-wing-flap {
                    animation: crane-wing-flap 1.2s ease-in-out infinite;
                    transform-origin: center;
                }

                /* 3. MÂY NGŨ SẮC CUNG ĐÌNH TRÔI BỒNG BỀNH */
                @keyframes imperial-cloud-drift-1 {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(45px); }
                }
                .animate-imperial-cloud-1 {
                    animation: imperial-cloud-drift-1 22s ease-in-out infinite;
                }
                @keyframes imperial-cloud-drift-2 {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(-35px); }
                }
                .animate-imperial-cloud-2 {
                    animation: imperial-cloud-drift-2 26s ease-in-out infinite;
                }

                /* 4. THUYỀN RỒNG HOÀNG GIA LƯỚT HỒ SEN */
                @keyframes imperial-dragon-boat-sail {
                    0% { transform: translate(-380px, 690px); }
                    50% { transform: translate(960px, 700px); }
                    100% { transform: translate(2300px, 690px); }
                }
                @keyframes boat-water-bobbing {
                    0%, 100% { transform: translateY(0) rotate(0.4deg); }
                    50% { transform: translateY(-3.5px) rotate(-0.4deg); }
                }
                .animate-dragon-boat {
                    animation: imperial-dragon-boat-sail 65s linear infinite;
                }
                .animate-boat-bob {
                    animation: boat-water-bobbing 4s ease-in-out infinite;
                    transform-origin: center;
                }

                /* 5. HOA ĐĂNG BÚP SEN DẬP DỀNH TRÊN HỒ */
                @keyframes lotus-lantern-float-1 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(12px, -4px); }
                }
                .animate-lotus-bob-1 {
                    animation: lotus-lantern-float-1 5s ease-in-out infinite;
                }
                @keyframes lotus-lantern-float-2 {
                    0%, 100% { transform: translate(0, 0); }
                    50% { transform: translate(-10px, -5px); }
                }
                .animate-lotus-bob-2 {
                    animation: lotus-lantern-float-2 6.5s ease-in-out infinite;
                }

                /* 6. ĐÈN PHA XE VINFAST & BỤC XOAY SHOWROOM */
                @keyframes vinfast-imperial-drl {
                    0%, 100% { opacity: 0.95; filter: drop-shadow(0 0 6px #38bdf8); }
                    50% { opacity: 1; filter: drop-shadow(0 0 14px #67e8f9) drop-shadow(0 0 25px rgba(56,189,248,0.5)); }
                }
                .animate-vinfast-imperial-drl {
                    animation: vinfast-imperial-drl 3.8s ease-in-out infinite;
                }

                /* 7. PHÁO HOA HOÀNG KIM CUNG ĐÌNH */
                @keyframes imperial-firework-1 {
                    0%, 15% { transform: scale(0.1) translateY(0); opacity: 0; }
                    18% { opacity: 1; }
                    26% { transform: scale(1.1) translateY(22px); opacity: 0.85; }
                    32% { transform: scale(1.25) translateY(48px); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-imperial-fw-1 {
                    transform-origin: 380px 180px;
                    animation: imperial-firework-1 12s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }
                @keyframes imperial-firework-2 {
                    0%, 55% { transform: scale(0.1) translateY(0); opacity: 0; }
                    58% { opacity: 1; }
                    66% { transform: scale(1.12) translateY(24px); opacity: 0.88; }
                    72% { transform: scale(1.26) translateY(50px); opacity: 0; }
                    100% { opacity: 0; }
                }
                .animate-imperial-fw-2 {
                    transform-origin: 1540px 170px;
                    animation: imperial-firework-2 12s cubic-bezier(0.16, 0.8, 0.35, 1) infinite;
                }

                /* 8. ĐÈN LỒNG CUNG ĐÌNH ĐUNG ĐƯA */
                @keyframes imperial-lantern-sway {
                    0%, 100% { transform: rotate(-2.8deg); }
                    50% { transform: rotate(3.2deg); }
                }

                /* GPU ACCELERATION */
                .animate-imperial-moon,
                .animate-crane-1,
                .animate-crane-2,
                .animate-dragon-boat,
                .animate-boat-bob,
                .animate-lotus-bob-1,
                .animate-lotus-bob-2,
                .animate-imperial-fw-1,
                .animate-imperial-fw-2 {
                    will-change: transform, opacity;
                    transform: translateZ(0);
                    backface-visibility: hidden;
                }
            \`}</style>

            <svg
                viewBox="0 0 1920 1080"
                className="w-full h-full object-cover"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
            >
                <defs>
                    {/* BẦU TRỜI NHUNG DẠ NGUYỆT HOÀNG GIA */}
                    <linearGradient id="impSky" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#020617" />
                        <stop offset="35%" stopColor="#0a122c" />
                        <stop offset="70%" stopColor="#131b3e" />
                        <stop offset="100%" stopColor="#1e1e48" />
                    </linearGradient>

                    {/* HỒ SEN HOÀNG GIA ĐÊM RẰM */}
                    <linearGradient id="impLake" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#09142f" />
                        <stop offset="30%" stopColor="#060f26" />
                        <stop offset="70%" stopColor="#040a1b" />
                        <stop offset="100%" stopColor="#02050f" />
                    </linearGradient>

                    {/* VẦNG TRĂNG DÁT VÀNG HOÀNG KIM 24K */}
                    <radialGradient id="impMoonAura" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <stop offset="35%" stopColor="#fef08a" stopOpacity="0.95" />
                        <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="impMoonTexture" cx="45%" cy="40%" r="55%">
                        <stop offset="0%" stopColor="#fffbeb" />
                        <stop offset="60%" stopColor="#fef3c7" />
                        <stop offset="85%" stopColor="#fde68a" />
                        <stop offset="100%" stopColor="#fbbf24" />
                    </radialGradient>

                    {/* MÁI NGÓI HOÀNG LƯU LY DÁT VÀNG */}
                    <linearGradient id="impGoldTile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" />
                        <stop offset="25%" stopColor="#f59e0b" />
                        <stop offset="65%" stopColor="#d97706" />
                        <stop offset="100%" stopColor="#78350f" />
                    </linearGradient>

                    {/* MÁI NGÓI THANH LƯU LY NGỌC BÍCH */}
                    <linearGradient id="impJadeTile" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#67e8f9" />
                        <stop offset="30%" stopColor="#14b8a6" />
                        <stop offset="70%" stopColor="#0f766e" />
                        <stop offset="100%" stopColor="#042f2e" />
                    </linearGradient>

                    {/* CỘT GỖ SƠN SON THẾP VÀNG */}
                    <linearGradient id="impCrimsonPillar" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#4c0519" />
                        <stop offset="25%" stopColor="#9f1239" />
                        <stop offset="60%" stopColor="#e11d48" />
                        <stop offset="85%" stopColor="#9f1239" />
                        <stop offset="100%" stopColor="#4c0519" />
                    </linearGradient>

                    {/* NỀN ĐÁ CẨM THẠCH TRẮNG CUNG ĐÌNH */}
                    <linearGradient id="impMarble" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="40%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>

                    {/* HOA SEN HỒNG NGỌC */}
                    <linearGradient id="impLotusPink" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#e11d48" />
                        <stop offset="40%" stopColor="#fb7185" />
                        <stop offset="80%" stopColor="#fecdd3" />
                        <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>

                    {/* LÁ SEN NGỌC THẠCH */}
                    <radialGradient id="impLotusLeaf" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="70%" stopColor="#047857" />
                        <stop offset="100%" stopColor="#064e3b" />
                    </radialGradient>

                    {/* BÓNG NƯỚC LUNG LINH ÁNH TRĂNG */}
                    <linearGradient id="impWaterReflection" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fef08a" stopOpacity="0.45" />
                        <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.25" />
                        <stop offset="80%" stopColor="#d97706" stopOpacity="0.08" />
                        <stop offset="100%" stopColor="#040a1b" stopOpacity="0" />
                    </linearGradient>

                    {/* BỘ LỌC HÀO QUANG */}
                    <filter id="impBloom" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="8" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                    <filter id="impShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#020617" floodOpacity="0.85" />
                    </filter>
                </defs>

                {/* ============================================================================== */}
                {/* 1. BẦU TRỜI DẠ NGUYỆT & TẦNG TINH TÚ THIÊN HÀ                                  */}
                {/* ============================================================================== */}
                <rect width="1920" height="680" fill="url(#impSky)" />

                {/* Ngàn vì sao tinh tú lấp lánh */}
                <g opacity="0.85">
                    <circle cx="120" cy="70" r="1.5" fill="#ffffff" />
                    <circle cx="280" cy="110" r="1.8" fill="#fef08a" />
                    <circle cx="450" cy="60" r="1.4" fill="#ffffff" />
                    <circle cx="620" cy="130" r="1.9" fill="#fef08a" />
                    <circle cx="780" cy="80" r="1.3" fill="#ffffff" />
                    <circle cx="1140" cy="90" r="1.6" fill="#fef08a" />
                    <circle cx="1290" cy="135" r="1.4" fill="#ffffff" />
                    <circle cx="1460" cy="75" r="1.8" fill="#fef08a" />
                    <circle cx="1680" cy="110" r="1.5" fill="#ffffff" />
                    <circle cx="1820" cy="65" r="1.7" fill="#fef08a" />
                    <circle cx="210" cy="220" r="1.2" fill="#ffffff" />
                    <circle cx="340" cy="180" r="1.5" fill="#fef08a" />
                    <circle cx="1590" cy="210" r="1.3" fill="#ffffff" />
                    <circle cx="1740" cy="190" r="1.6" fill="#fef08a" />
                </g>

                {/* ============================================================================== */}
                {/* 2. SIÊU TRĂNG RẰM HOÀNG CUNG KHỔNG LỒ (THE IMPERIAL SUPERMOON)                */}
                {/* ============================================================================== */}
                <g className="animate-imperial-moon">
                    <circle cx="960" cy="170" r="220" fill="url(#impMoonAura)" filter="url(#impBloom)" opacity="0.65" />
                    <circle cx="960" cy="170" r="130" fill="url(#impMoonTexture)" filter="url(#impShadow)" />
                    <g opacity="0.18" fill="#78350f">
                        <ellipse cx="930" cy="150" rx="35" ry="50" />
                        <ellipse cx="985" cy="175" rx="42" ry="32" />
                        <circle cx="970" cy="130" r="20" />
                    </g>
                    <circle cx="960" cy="170" r="130" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
                </g>

                {/* ============================================================================== */}
                {/* 3. ĐÀN CHIM HẠC HOÀNG GIA SẢI CÁNH BAY QUA TRĂNG                               */}
                {/* ============================================================================== */}
                <g className="animate-crane-1">
                    <g className="animate-wing-flap">
                        <path d="M 0,0 Q -25,-25 -60,-15 Q -40,10 -15,5 Q -5,12 15,2 Q 35,-12 55,-8 Q 30,-22 0,0 Z" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="-12" cy="-4" r="2.5" fill="#f59e0b" />
                        <circle cx="-12" cy="-4" r="1" fill="#dc2626" />
                        <line x1="5" y1="3" x2="35" y2="18" stroke="#f59e0b" strokeWidth="1.2" />
                    </g>
                </g>
                <g className="animate-crane-2">
                    <g className="animate-wing-flap">
                        <path d="M 0,0 Q -20,-20 -50,-12 Q -30,8 -12,4 Q -4,10 12,2 Q 28,-10 45,-6 Q 25,-18 0,0 Z" fill="#ffffff" opacity="0.9" filter="url(#impBloom)" />
                        <circle cx="-10" cy="-3" r="2" fill="#f59e0b" />
                        <line x1="4" y1="2" x2="28" y2="14" stroke="#f59e0b" strokeWidth="1" />
                    </g>
                </g>

                {/* ============================================================================== */}
                {/* 4. MÂY NGŨ SẮC CUNG ĐÌNH TRIỀU NGUYỄN (AUSPICIOUS IMPERIAL CLOUDS)            */}
                {/* ============================================================================== */}
                <g className="animate-imperial-cloud-1" opacity="0.65" filter="url(#impBloom)">
                    <path d="M 680,240 Q 730,190 800,210 Q 860,180 930,220 Q 980,190 1050,230 Q 1120,200 1190,240 Q 1100,270 950,260 Q 800,270 680,240 Z" fill="#1e1b4b" stroke="#fef08a" strokeWidth="1.5" />
                    <circle cx="800" cy="210" r="14" fill="#fbbf24" opacity="0.4" />
                    <circle cx="1050" cy="230" r="16" fill="#f43f5e" opacity="0.3" />
                </g>
                <g className="animate-imperial-cloud-2" opacity="0.5" filter="url(#impBloom)">
                    <path d="M 220,160 Q 280,120 360,140 Q 420,110 500,150 Q 430,180 340,175 Q 270,180 220,160 Z" fill="#0f172a" stroke="#fef08a" strokeWidth="1.2" />
                    <path d="M 1450,180 Q 1520,130 1610,155 Q 1680,125 1770,170 Q 1690,200 1580,190 Q 1500,200 1450,180 Z" fill="#0f172a" stroke="#fef08a" strokeWidth="1.2" />
                </g>

                {/* ============================================================================== */}
                {/* 5. PHÁO HOA HOÀNG KIM CUNG ĐÌNH                                               */}
                {/* ============================================================================== */}
                <g id="imp-fireworks-behind-palaces">
                    <g className="animate-imperial-fw-1">
                        <circle cx="380" cy="180" r="35" fill="url(#impMoonAura)" filter="url(#impBloom)" />
                        <line x1="380" y1="180" x2="310" y2="120" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="450" y2="120" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="300" y2="190" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="460" y2="190" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="310" cy="120" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="450" cy="120" r="3" fill="#ffffff" filter="url(#impBloom)" />
                    </g>
                    <g className="animate-imperial-fw-2">
                        <circle cx="1540" cy="170" r="35" fill="#f43f5e" opacity="0.4" filter="url(#impBloom)" />
                        <line x1="1540" y1="170" x2="1470" y2="110" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1610" y2="110" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1460" y2="180" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" />
                        <line x1="1540" y1="170" x2="1620" y2="180" stroke="#fb7185" strokeWidth="1.8" strokeLinecap="round" />
                        <circle cx="1470" cy="110" r="3" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="1610" cy="110" r="3" fill="#ffffff" filter="url(#impBloom)" />
                    </g>
                </g>

                {/* ============================================================================== */}
                {/* 6. DÃY NÚI NGỰ BÌNH XA XĂM                                                     */}
                {/* ============================================================================== */}
                <path d="M 0,440 Q 220,380 440,430 Q 680,360 960,420 Q 1240,350 1520,430 Q 1740,380 1920,440 L 1920,530 L 0,530 Z" fill="#091428" opacity="0.85" />
                <path d="M 0,470 Q 300,430 620,460 Q 960,410 1320,465 Q 1660,420 1920,470 L 1920,540 L 0,540 Z" fill="#0f1c3a" />

                {/* DÃY 16 CHIẾC ĐÈN LỒNG CUNG ĐÌNH DÁT VÀNG TREO DỌC KHUNG TRỜI */}
${build16UniqueImperialLanterns()}

                {/* QUẦN THỂ 9 ĐẠI CUNG ĐIỆN & SHOWROOM VINFAST */}
${build9GrandImperialPalaces()}

                {/* BỜ KÈ CẨM THẠCH & HÀNG LAN CAN HOÀNG GIA */}
                <rect x="0" y="525" width="1920" height="22" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
                <rect x="0" y="525" width="1920" height="4" fill="#cbd5e1" opacity="0.9" />
                ${Array.from({ length: 28 }).map((_, i) => {
                  const px = 40 + i * 68;
                  return `                <g transform="translate(${px}, 498)">
                    <rect x="-4" y="8" width="8" height="22" rx="1" fill="#cbd5e1" stroke="#475569" strokeWidth="0.8" />
                    <ellipse cx="0" cy="5" rx="4.5" ry="6" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" filter="url(#impBloom)" />
                </g>`;
                }).join('\n')}
                <line x1="0" y1="506" x2="1920" y2="506" stroke="#94a3b8" strokeWidth="3" />
                <line x1="0" y1="518" x2="1920" y2="518" stroke="#64748b" strokeWidth="2" />

                {/* ĐOÀN NGƯỜI RƯỚC ĐÈN HOÀNG GIA DẠO PHỐ */}
                <g id="imperial-court-procession">
                    ${[
                      { x: 140, robe: '#dc2626' },
                      { x: 210, robe: '#2563eb' },
                      { x: 280, robe: '#d97706' },
                      { x: 420, robe: '#db2777' },
                      { x: 490, robe: '#10b981' },
                      { x: 680, robe: '#7c3aed' },
                      { x: 750, robe: '#ea580c' },
                      { x: 820, robe: '#059669' },
                      { x: 1250, robe: '#d97706' },
                      { x: 1320, robe: '#e11d48' },
                      { x: 1420, robe: '#0891b2' },
                      { x: 1520, robe: '#4f46e5' },
                      { x: 1690, robe: '#dc2626' },
                      { x: 1760, robe: '#c026d3' }
                    ].map((f, fi) => `                    <g transform="translate(${f.x}, 510)">
                        <ellipse cx="0" cy="18" rx="8" ry="2.8" fill="#090d16" opacity="0.6" />
                        <path d="M -7,2 L -10,18 L 10,18 L 7,2 Z" fill="${f.robe}" stroke="#fbbf24" strokeWidth="0.6" />
                        <line x1="-7" y1="8" x2="7" y2="8" stroke="#fbbf24" strokeWidth="1.2" />
                        <circle cx="0" cy="-4" r="5" fill="#fed7aa" />
                        <path d="M -8,-6 Q 0,-14 8,-6 Z" fill="#451a03" stroke="#fbbf24" strokeWidth="0.8" />
                        <line x1="5" y1="5" x2="14" y2="-2" stroke="#78350f" strokeWidth="1" />
                        <circle cx="14" cy="5" r="4.5" fill="#f59e0b" filter="url(#impBloom)" />
                        <circle cx="14" cy="5" r="2.2" fill="#ffffff" />
                    </g>`).join('\n')}
                </g>

                {/* ============================================================================== */}
                {/* 10. HỒ SEN TRĂNG RẰM HOÀNG GIA (THE IMPERIAL LOTUS LAKE)                       */}
                {/* ============================================================================== */}
                <rect x="0" y="547" width="1920" height="533" fill="url(#impLake)" />
                <ellipse cx="960" cy="650" rx="350" ry="90" fill="url(#impWaterReflection)" filter="url(#impBloom)" />
                <ellipse cx="960" cy="780" rx="480" ry="120" fill="url(#impWaterReflection)" filter="url(#impBloom)" opacity="0.75" />
                <ellipse cx="960" cy="920" rx="600" ry="140" fill="url(#impWaterReflection)" filter="url(#impBloom)" opacity="0.5" />

                <path d="M 0,580 Q 480,565 960,580 Q 1440,595 1920,580" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.4" />
                <path d="M 0,630 Q 480,645 960,630 Q 1440,615 1920,630" fill="none" stroke="#fde047" strokeWidth="1.4" opacity="0.45" />
                <path d="M 0,700 Q 480,685 960,700 Q 1440,715 1920,700" fill="none" stroke="#f59e0b" strokeWidth="1.6" opacity="0.35" />
                <path d="M 0,790 Q 480,810 960,790 Q 1440,770 1920,790" fill="none" stroke="#fde047" strokeWidth="1.8" opacity="0.3" />
                <path d="M 0,890 Q 480,870 960,890 Q 1440,910 1920,890" fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.25" />

                {/* THUYỀN RỒNG HOÀNG GIA DÁT VÀNG */}
                <g className="animate-dragon-boat">
                    <g className="animate-boat-bob" filter="url(#impShadow)">
                        <ellipse cx="140" cy="65" rx="140" ry="8" fill="#38bdf8" opacity="0.45" filter="url(#impBloom)" />
                        <ellipse cx="135" cy="68" rx="110" ry="5" fill="#fef08a" opacity="0.6" filter="url(#impBloom)" />
                        <path d="M 10,48 Q 120,68 260,50 L 250,22 Q 130,28 30,26 Z" fill="url(#impGoldTile)" stroke="#fbbf24" strokeWidth="1.5" />
                        <path d="M 35,32 Q 130,40 235,32" stroke="#451a03" strokeWidth="2.5" strokeDasharray="6,4" fill="none" />

                        {/* Đầu rồng ngậm ngọc */}
                        <g transform="translate(250, 8)">
                            <path d="M 0,35 Q 15,20 20,5 Q 32,15 28,30 Q 22,42 0,45 Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.2" filter="url(#impBloom)" />
                            <path d="M 15,8 Q 28,-10 38,-4 Q 30,8 18,14 Z" fill="#f59e0b" />
                            <circle cx="18" cy="12" r="2.2" fill="#ef4444" stroke="#ffffff" strokeWidth="0.6" />
                            <circle cx="28" cy="24" r="5" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.2" filter="url(#impBloom)" />
                        </g>

                        <path d="M 15,35 Q -10,15 -18,-5 Q -5,-2 8,18 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.2" />

                        {/* Lầu rồng */}
                        <rect x="70" y="-8" width="130" height="36" fill="#881337" stroke="#fbbf24" strokeWidth="1.2" />
                        <rect x="75" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="115" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="155" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="194" y="-8" width="6" height="36" fill="url(#impCrimsonPillar)" />
                        <rect x="83" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />
                        <rect x="123" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />
                        <rect x="163" y="-4" width="28" height="28" fill="#fef08a" opacity="0.85" filter="url(#impBloom)" />

                        <path d="M 55,-6 Q 135,-26 215,-6 L 205,-18 Q 135,-32 65,-18 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                        <circle cx="65" cy="5" r="5" fill="#f59e0b" filter="url(#impBloom)" />
                        <circle cx="205" cy="5" r="5" fill="#f43f5e" filter="url(#impBloom)" />
                    </g>
                </g>

                {/* 48 ĐÓA HOA ĐĂNG BÚP SEN THẮP NẾN LUNG LINH */}
                <g id="imperial-48-lotus-lanterns">
                    ${Array.from({ length: 48 }).map((_, i) => {
                      const x = Math.round(60 + (i * 38.5));
                      const lane = i % 4;
                      const y = Math.round(590 + lane * 110 + (Math.sin(i * 1.7) * 20));
                      const scale = (0.55 + lane * 0.22).toFixed(2);
                      const animClass = i % 2 === 0 ? 'animate-lotus-bob-1' : 'animate-lotus-bob-2';
                      return `                    <g transform="translate(${x}, ${y}) scale(${scale})" className="${animClass}">
                        <ellipse cx="0" cy="5" rx="20" ry="6" fill="#f59e0b" opacity="0.45" filter="url(#impBloom)" />
                        <ellipse cx="0" cy="6" rx="22" ry="7" fill="url(#impLotusLeaf)" opacity="0.75" />
                        <path d="M 0,6 C -12,-2 -14,-14 0,-18 C 14,-14 12,-2 0,6 Z" fill="url(#impLotusPink)" />
                        <path d="M -7,4 C -15,-2 -13,-9 -7,-12 C -2,-8 -2,1 -7,4 Z" fill="url(#impLotusPink)" opacity="0.88" />
                        <path d="M 7,4 C 15,-2 13,-9 7,-12 C 2,-8 2,1 7,4 Z" fill="url(#impLotusPink)" opacity="0.88" />
                        <circle cx="0" cy="-6" r="3.2" fill="#ffffff" filter="url(#impBloom)" />
                        <circle cx="0" cy="-6" r="1.8" fill="#fef08a" />
                    </g>`;
                    }).join('\n')}
                </g>

                {/* KHUNG NẸP THẺ HOÀNG GIA TINH XẢO */}
                <rect x="3" y="3" width="1914" height="1074" fill="none" stroke="url(#impGoldTile)" strokeWidth="2.5" opacity="0.5" />
                <rect x="8" y="8" width="1904" height="1064" fill="none" stroke="#fef08a" strokeWidth="1" opacity="0.35" />
            </svg>
        </div>
    );
};

export const MidAutumnImperialBackdrop = React.memo(MidAutumnImperialBackdropComponent, () => true);
`;

try {
  esbuild.transformSync(epicTsx, { loader: 'tsx' });
  console.log('esbuild verification PASSED for Epic Grand Imperial Palace Backdrop!');
  fs.writeFileSync(targetFile, epicTsx, 'utf8');
  console.log('SUCCESS: Written epic masterpiece to:', targetFile);
  console.log('Total lines in MidAutumnImperialBackdrop.tsx:', epicTsx.split('\n').length);
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
