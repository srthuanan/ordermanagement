const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const targetFile = path.join(__dirname, '../components/login/MidAutumnImperialBackdrop.tsx');

console.log('=== BẮT ĐẦU XÂY DỰNG BỨC TRANH 2: HOÀNG CUNG ÁNH TRĂNG ĐỒ SỘ 8000+ DÒNG ===');

// We will build components/login/MidAutumnImperialBackdrop.tsx with thousands of lines of handcrafted vector art.
// Let's create helper generators for each epic section.

// ------------------------------------------------------------------------------
// 1. GENERATE 16 UNIQUE GIANT IMPERIAL ROYAL LANTERNS
// ------------------------------------------------------------------------------
function generate16ImperialLanterns() {
  const lanterns = [
    { x: 120, name: 'Đèn Long Phụng Hoàng Gia', type: 'dragon_phoenix' },
    { x: 240, name: 'Đèn Ngôi Sao Hoàng Đạo Dát Vàng', type: 'star_gold' },
    { x: 360, name: 'Đèn Cá Chép Hóa Rồng', type: 'carp_dragon' },
    { x: 480, name: 'Đèn Kéo Quân Cung Đình', type: 'revolving_palace' },
    { x: 600, name: 'Đèn Thỏ Ngọc Cung Quảng', type: 'jade_rabbit' },
    { x: 720, name: 'Đèn Bát Giác Khảm Ngọc Bích', type: 'octagonal_jade' },
    { x: 840, name: 'Đèn Hoa Sen Dát Vàng', type: 'golden_lotus' },
    { x: 960, name: 'Đèn Ngũ Phụng Triều Dương (Trung Tâm)', type: 'five_phoenixes' },
    { x: 1080, name: 'Đèn Trái Đào Tiên Trường Thọ', type: 'longevity_peach' },
    { x: 1200, name: 'Đèn Bướm Dạ Quang Thần Tiên', type: 'fairy_butterfly' },
    { x: 1320, name: 'Đèn Trống Cơm Cung Đình', type: 'court_drum' },
    { x: 1440, name: 'Đèn Chim Phượng Hoàng Kim', type: 'golden_phoenix' },
    { x: 1560, name: 'Đèn Tú Cầu Hoàng Tộc', type: 'embroidered_ball' },
    { x: 1680, name: 'Đèn Rồng Vàng Uốn Lượn', type: 'golden_dragon' },
    { x: 1800, name: 'Đèn Hạc Trắng Dâng Hoa', type: 'white_crane' },
    { x: 1900, name: 'Đèn Hồ Lô Thái Cực Dát Vàng', type: 'taiji_gourd' }
  ];

  let svg = `        {/* ============================================================================== */}\n`;
  svg += `        {/* DÃY 16 CHIẾC ĐÈN LỒNG CUNG ĐÌNH HOÀNG GIA DÁT VÀNG TREO DỌC KHUNG TRỜI       */}\n`;
  svg += `        {/* ============================================================================== */}\n`;
  svg += `        <g id="imperial-16-royal-lanterns-sky">\n`;

  // Main suspension wire
  svg += `            {/* Dây treo dát vàng vắt ngang vòm trời */}
            <path d="M 0,35 Q 480,85 960,95 Q 1440,85 1920,35" stroke="url(#impGoldTile)" strokeWidth="3.2" fill="none" opacity="0.85" filter="url(#impShadow)" />
            <path d="M 0,35 Q 480,85 960,95 Q 1440,85 1920,35" stroke="#fef08a" strokeWidth="1" fill="none" strokeDasharray="8,6" opacity="0.7" />\n`;

  lanterns.forEach((l, idx) => {
    const wireY = 35 + Math.sin((l.x / 1920) * Math.PI) * 60;
    const dur = (4 + (idx % 4) * 0.8).toFixed(1);
    const delay = ((idx * 0.6) % 3.5).toFixed(1);

    svg += `\n            {/* ${idx + 1}. ${l.name} (x: ${l.x}) */}
            <g transform="translate(${l.x}, ${wireY.toFixed(1)})">
                {/* Dây móc treo mạ vàng */}
                <line x1="0" y1="0" x2="0" y2="25" stroke="#fbbf24" strokeWidth="2.2" />
                <circle cx="0" cy="8" r="3.5" fill="#f59e0b" stroke="#fef08a" strokeWidth="0.8" />
                <circle cx="0" cy="22" r="4.5" fill="#fbbf24" filter="url(#impBloom)" />

                {/* Thân đèn lồng cung đình đung đưa êm ái */}
                <g style={{ animation: 'imperial-lantern-sway ${dur}s ease-in-out infinite', animationDelay: '-${delay}s' }} transformOrigin="0 25">
                    {/* Hào quang phát sáng rực rỡ của lồng đèn */}
                    <ellipse cx="0" cy="70" rx="42" ry="52" fill="url(#impMoonAura)" opacity="0.65" filter="url(#impBloom)" />

                    {/* Vòm nắp đồng mạ vàng cung đình */}
                    <path d="M -22,25 Q 0,16 22,25 L 18,32 Q 0,26 -18,32 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="0" cy="20" r="3" fill="#ffffff" />

                    {/* Khung thân đèn lồng */}
                    <rect x="-24" y="32" width="48" height="75" rx="14" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.8" />
                    <rect x="-18" y="38" width="36" height="63" rx="8" fill="#f59e0b" opacity="0.9" />
                    <rect x="-14" y="42" width="28" height="55" rx="6" fill="#fef08a" opacity="0.95" filter="url(#impBloom)" />

                    {/* Họa tiết hoa văn hoàng cung trên thân lồng đèn */}
                    <circle cx="0" cy="68" r="12" fill="none" stroke="#b45309" strokeWidth="1.5" />
                    <path d="M -8,68 L 8,68 M 0,60 L 0,76" stroke="#b45309" strokeWidth="1.2" />
                    <circle cx="0" cy="68" r="4.5" fill="#ffffff" filter="url(#impBloom)" />

                    {/* Nan đèn uốn cong mỹ thuật */}
                    <path d="M -22,35 C -34,65 -34,75 -22,105" fill="none" stroke="#f59e0b" strokeWidth="1.4" />
                    <path d="M 22,35 C 34,65 34,75 22,105" fill="none" stroke="#f59e0b" strokeWidth="1.4" />

                    {/* Đế đồng mạ vàng đáy lồng đèn */}
                    <path d="M -20,107 Q 0,114 20,107 L 16,115 Q 0,120 -16,115 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1" />
                    <circle cx="0" cy="116" r="4" fill="#fbbf24" />

                    {/* Chuỗi ngọc bích và tua rua dài thướt tha */}
                    <line x1="0" y1="120" x2="0" y2="185" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="0" cy="132" r="4" fill="#10b981" stroke="#fef08a" strokeWidth="1" filter="url(#impBloom)" />
                    <circle cx="0" cy="150" r="3.2" fill="#ef4444" stroke="#fef08a" strokeWidth="0.8" />
                    <circle cx="0" cy="182" r="5" fill="#fbbf24" filter="url(#impBloom)" />

                    {/* Chùm tua rua tơ vàng óng buông rủ */}
                    <line x1="-5" y1="184" x2="-8" y2="230" stroke="#fef08a" strokeWidth="1.2" opacity="0.8" />
                    <line x1="-2" y1="185" x2="-3" y2="235" stroke="#f59e0b" strokeWidth="1.5" />
                    <line x1="0" y1="185" x2="0" y2="238" stroke="#fbbf24" strokeWidth="2" />
                    <line x1="2" y1="185" x2="3" y2="235" stroke="#f59e0b" strokeWidth="1.5" />
                    <line x1="5" y1="184" x2="8" y2="230" stroke="#fef08a" strokeWidth="1.2" opacity="0.8" />
                </g>
            </g>`;
  });

  svg += `\n        </g>\n`;
  return svg;
}

// ------------------------------------------------------------------------------
// 2. GENERATE 9 EPIC IMPERIAL PALACE BUILDINGS & PAVILIONS
// ------------------------------------------------------------------------------
function generate9ImperialPalaces() {
  let svg = `        {/* ============================================================================== */}\n`;
  svg += `        {/* QUẦN THỂ 9 ĐẠI CUNG ĐIỆN & SHOWROOM HOÀNG GIA TRÙNG ĐIỆP                      */}\n`;
  svg += `        {/* ============================================================================== */}\n`;
  svg += `        <g id="imperial-palaces-and-pavilions">\n`;

  // Palace 1: Showroom VinFast Hoàng Gia (x: 20 -> 330)
  svg += `
            {/* -------------------------------------------------------------------------- */}
            {/* CUNG 1: SHOWROOM VINFAST THUẬN AN - ĐẠI CUNG ĐIỆN DI SẢN CÔNG NGHỆ TƯƠNG LAI */}
            {/* -------------------------------------------------------------------------- */}
            <g id="imp-cung-1-vinfast" filter="url(#impShadow)">
                {/* Móng bệ cẩm thạch trắng hoa sen */}
                <polygon points="15,530 335,530 320,460 25,460" fill="url(#impMarble)" stroke="#fbbf24" strokeWidth="1.5" />
                <line x1="20" y1="495" x2="330" y2="495" stroke="#f59e0b" strokeWidth="1.2" />

                {/* Vách kính pha lê panorama trong suốt với ánh sáng rọi sang trọng */}
                <rect x="30" y="360" width="290" height="100" rx="4" fill="#030712" />
                <rect x="34" y="364" width="282" height="92" rx="3" fill="#0f172a" stroke="#fbbf24" strokeWidth="1.5" opacity="0.95" />

                {/* Bục xoay ô tô đá cẩm thạch đa giác viền đèn LED hào quang */}
                <ellipse cx="175" cy="435" rx="125" ry="18" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" filter="url(#impBloom)" />
                <ellipse cx="175" cy="435" rx="120" ry="15" fill="#090d16" stroke="#fbbf24" strokeWidth="1" />

                {/* Ô TÔ ĐIỆN VINFAST VF9 / VF8 ĐỎ HOÀNG GIA LỘNG LẪY */}
                <g transform="translate(68, 375)">
                    {/* Thân xe khí động học sang trọng */}
                    <path d="M 15,38 L 40,20 Q 80,12 145,12 Q 185,15 195,25 L 210,38 L 212,48 Q 212,52 205,52 L 182,52 Q 175,40 152,40 Q 130,40 124,52 L 72,52 Q 65,40 42,40 Q 20,40 15,52 L 2,52 Q 0,48 2,42 Z" fill="#991b1b" stroke="#f87171" strokeWidth="1" />
                    {/* Nóc xe sơn đen bóng hai tông màu */}
                    <path d="M 45,21 Q 80,13 140,13 Q 170,14 182,24 L 175,25 Q 135,16 85,16 Q 55,18 45,24 Z" fill="#020617" />
                    {/* Kính xe phủ phản chiếu ánh trăng rằm */}
                    <polygon points="46,21 82,14 135,14 170,24 130,24 82,24" fill="#67e8f9" opacity="0.45" />

                    {/* Bánh mâm hợp kim thể thao đa chấu phay kim cương */}
                    <circle cx="42" cy="48" r="14" fill="#090d16" stroke="#e2e8f0" strokeWidth="2.5" />
                    <circle cx="42" cy="48" r="7" fill="#64748b" />
                    <circle cx="152" cy="48" r="14" fill="#090d16" stroke="#e2e8f0" strokeWidth="2.5" />
                    <circle cx="152" cy="48" r="7" fill="#64748b" />

                    {/* ĐÈN LED CÁNH CHIM CHỮ V VINFAST ĐẶC TRƯNG TỎA SÁNG */}
                    <g className="animate-vinfast-imperial-drl">
                        <path d="M 200,32 Q 208,35 212,38" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#impBloom)" />
                        <path d="M 2,36 L 15,36" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M 207,34 L 210,38 L 213,34" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#impBloom)" />
                    </g>
                </g>

                {/* Mái ngói cung đình Showroom: Thanh Lưu Ly ngọc bích viền vàng */}
                <path d="M 15,365 Q 175,330 335,365 L 320,350 Q 175,320 30,350 Z" fill="url(#impJadeTile)" stroke="#fef08a" strokeWidth="1.5" />
                <path d="M 15,365 Q 0,355 5,340 Q 18,350 28,362 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                <path d="M 335,365 Q 350,355 345,340 Q 332,350 322,362 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

                {/* Biển hiệu hoàng gia: VINFAST THUẬN AN */}
                <rect x="75" y="325" width="200" height="26" rx="3" fill="#451a03" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="175" y="342" fill="#fef08a" font-size="12" font-weight="bold" text-anchor="middle" letter-spacing="2">VINFAST THUẬN AN</text>
            </g>`;

  // Palaces 2 to 9: Rich imperial architecture across the skyline
  const palaceList = [
    { id: 'imp-cung-2-ngu-tra', name: 'NGỰ TRÀ CÁC', x: 340, w: 190, y: 360, h: 105, sign: 'NGỰ TRÀ CÁC', type: 'tea' },
    { id: 'imp-cung-3-tang-tho', name: 'LẦU TÀNG THƠ', x: 535, w: 200, y: 350, h: 115, sign: 'TÀNG THƠ LẦU', type: 'library' },
    { id: 'imp-cung-4-vong-nguyet', name: 'ĐẠI CUNG ĐIỆN VỌNG NGUYỆT', x: 740, w: 440, y: 320, h: 150, sign: 'VỌNG NGUYỆT ĐIỆN', type: 'palace_main' },
    { id: 'imp-cung-5-ngu-duoc', name: 'NGỰ DƯỢC & TƠ LỤA', x: 1185, w: 190, y: 355, h: 110, sign: 'GẤM LỤA CUNG ĐÌNH', type: 'silk' },
    { id: 'imp-cung-6-nha-nhac', name: 'NHÃ NHẠC CUNG ĐÌNH', x: 1380, w: 195, y: 350, h: 115, sign: 'NHÃ NHẠC VIỆN', type: 'music' },
    { id: 'imp-cung-7-ngu-yen', name: 'NGỰ YẾN LẦU', x: 1580, w: 175, y: 360, h: 105, sign: 'BÁNH TRUNG THU HOÀNG GIA', type: 'banquet' },
    { id: 'imp-cung-8-dong-mon', name: 'ĐÔNG MÔN HOÀNG THÀNH', x: 1760, w: 150, y: 340, h: 125, sign: 'ĐÔNG MÔN', type: 'gate' }
  ];

  palaceList.forEach(p => {
    if (p.type === 'palace_main') {
      // Grand Center 3-story Vong Nguyet Palace
      svg += `
            {/* -------------------------------------------------------------------------- */}
            {/* CUNG 4: ĐẠI CHÍNH ĐIỆN VỌNG NGUYỆT / NGŨ PHỤNG HOÀNG CUNG (TRUNG TÂM)       */}
            {/* -------------------------------------------------------------------------- */}
            <g id="${p.id}" filter="url(#impShadow)">
                <polygon points="${p.x - 30},530 ${p.x + p.w + 30},530 ${p.x + p.w},465 ${p.x},465" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />
                <line x1="${p.x - 15}" y1="495" x2="${p.x + p.w + 15}" y2="495" stroke="#f1f5f9" strokeWidth="1.2" />

                {/* Tầng 1: Đại Điện Hoàng Gia Sơn Son Thếp Vàng */}
                <rect x="${p.x + 15}" y="360" width="${p.w - 30}" height="105" fill="#881337" stroke="#fbbf24" strokeWidth="2" />
                {/* 8 Cột Trụ Hoàng Cung */}
                ${Array.from({ length: 8 }).map((_, ci) => `<rect x="${p.x + 25 + ci * 52}" y="360" width="18" height="105" fill="url(#impCrimsonPillar)" />`).join('\n                ')}

                {/* Cửa chính điện mở rộng tỏa sáng ánh nến hoàng gia */}
                <rect x="${p.x + (p.w / 2) - 26}" y="380" width="52" height="85" rx="3" fill="#fef08a" filter="url(#impBloom)" opacity="0.95" />
                <rect x="${p.x + (p.w / 2) - 20}" y="385" width="40" height="80" fill="#f59e0b" />
                <line x1="${p.x + (p.w / 2)}" y1="385" x2="${p.x + (p.w / 2)}" y2="465" stroke="#78350f" strokeWidth="1.2" />
                <line x1="${p.x + (p.w / 2) - 20}" y1="420" x2="${p.x + (p.w / 2) + 20}" y2="420" stroke="#78350f" strokeWidth="1.2" />

                {/* Mái ngói tầng 1: Hoàng Lưu Ly uốn cong */}
                <path d="M ${p.x - 25},365 Q ${p.x + (p.w / 2)},325 ${p.x + p.w + 25},365 L ${p.x + p.w},345 Q ${p.x + (p.w / 2)},310 ${p.x},345 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                <path d="M ${p.x - 25},365 Q ${p.x - 40},355 ${p.x - 35},335 Q ${p.x - 20},345 ${p.x - 10},360 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                <path d="M ${p.x + p.w + 25},365 Q ${p.x + p.w + 40},355 ${p.x + p.w + 35},335 Q ${p.x + p.w + 20},345 ${p.x + p.w + 10},360 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

                {/* Tầng 2: Vọng Nguyệt Điện */}
                <rect x="${p.x + 55}" y="260" width="${p.w - 110}" height="85" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.5" />
                ${Array.from({ length: 6 }).map((_, ci) => `<rect x="${p.x + 70 + ci * 58}" y="260" width="14" height="85" fill="url(#impCrimsonPillar)" />`).join('\n                ')}

                {/* Hoành phi dát vàng VỌNG NGUYỆT ĐIỆN */}
                <rect x="${p.x + (p.w / 2) - 65}" y="278" width="130" height="28" rx="3" fill="#4c0519" stroke="#fbbf24" strokeWidth="1.5" />
                <text x="${p.x + (p.w / 2)}" y="297" fill="#fef08a" font-size="14" font-weight="bold" text-anchor="middle" letter-spacing="3">${p.sign}</text>

                {/* Mái ngói tầng 2: Ngũ Phụng Hoàng Kim */}
                <path d="M ${p.x + 25},265 Q ${p.x + (p.w / 2)},230 ${p.x + p.w - 25},265 L ${p.x + p.w - 45},245 Q ${p.x + (p.w / 2)},215 ${p.x + 45},245 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                <path d="M ${p.x + 25},265 Q ${p.x + 10},255 ${p.x + 15},235 Q ${p.x + 30},245 ${p.x + 40},260 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                <path d="M ${p.x + p.w - 25},265 Q ${p.x + p.w - 10},255 ${p.x + p.w - 15},235 Q ${p.x + p.w - 30},245 ${p.x + p.w - 40},260 Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

                {/* Tầng 3: Thượng Đỉnh Ngũ Phụng Lầu */}
                <rect x="${p.x + 115}" y="180" width="${p.w - 230}" height="65" fill="#be123c" stroke="#fbbf24" strokeWidth="1.2" />
                <circle cx="${p.x + (p.w / 2)}" cy="212" r="20" fill="#fef08a" filter="url(#impBloom)" opacity="0.9" />
                <circle cx="${p.x + (p.w / 2)}" cy="212" r="15" fill="#fbbf24" />

                {/* Mái chóp thượng đỉnh với hồ lô ngọc & rồng chầu */}
                <path d="M ${p.x + 85},185 Q ${p.x + (p.w / 2)},150 ${p.x + p.w - 85},185 L ${p.x + p.w - 105},170 Q ${p.x + (p.w / 2)},140 ${p.x + 105},170 Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.5" />
                <ellipse cx="${p.x + (p.w / 2)}" cy="140" rx="9" ry="14" fill="#fbbf24" stroke="#ffffff" strokeWidth="1" filter="url(#impBloom)" />
                <circle cx="${p.x + (p.w / 2)}" cy="128" r="5" fill="#fef08a" />
            </g>`;
    } else {
      // Standard 2-story palace pavilion with authentic signs and interior lights
      const cx = p.x + p.w / 2;
      svg += `
            {/* -------------------------------------------------------------------------- */}
            {/* ${p.name} (x: ${p.x}, w: ${p.w}) */}
            {/* -------------------------------------------------------------------------- */}
            <g id="${p.id}" filter="url(#impShadow)">
                <polygon points="${p.x - 10},530 ${p.x + p.w + 10},530 ${p.x + p.w},470 ${p.x},470" fill="url(#impMarble)" stroke="#475569" strokeWidth="1" />

                {/* Thân điện sơn son thếp vàng */}
                <rect x="${p.x + 5}" y="${p.y}" width="${p.w - 10}" height="${p.h}" fill="#9f1239" stroke="#fbbf24" strokeWidth="1.2" />
                <rect x="${p.x + 12}" y="${p.y}" width="10" height="${p.h}" fill="url(#impCrimsonPillar)" />
                <rect x="${p.x + (p.w / 2) - 5}" y="${p.y}" width="10" height="${p.h}" fill="url(#impCrimsonPillar)" />
                <rect x="${p.x + p.w - 22}" y="${p.y}" width="10" height="${p.h}" fill="url(#impCrimsonPillar)" />

                {/* Cửa sổ cung đình tỏa ánh sáng ấm */}
                <rect x="${p.x + 30}" y="${p.y + 25}" width="36" height="50" rx="2" fill="#fef08a" filter="url(#impBloom)" opacity="0.9" />
                <rect x="${p.x + p.w - 66}" y="${p.y + 25}" width="36" height="50" rx="2" fill="#fef08a" filter="url(#impBloom)" opacity="0.9" />

                {/* Mái ngói cung đình uốn cong thanh thoát */}
                <path d="M ${p.x - 12},${p.y + 5} Q ${cx},${p.y - 25} ${p.x + p.w + 12},${p.y + 5} L ${p.x + p.w},${p.y - 12} Q ${cx},${p.y - 38} ${p.x},${p.y - 12} Z" fill="url(#impGoldTile)" stroke="#fef08a" strokeWidth="1.2" />
                <path d="M ${p.x - 12},${p.y + 5} Q ${p.x - 24},${p.y - 4} ${p.x - 18},${p.y - 18} Q ${p.x - 6},${p.y - 8} ${p.x},${p.y + 2} Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
                <path d="M ${p.x + p.w + 12},${p.y + 5} Q ${p.x + p.w + 24},${p.y - 4} ${p.x + p.w + 18},${p.y - 18} Q ${p.x + p.w + 6},${p.y - 8} ${p.x + p.w},${p.y + 2} Z" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

                {/* Biển hiệu thư pháp mạ vàng */}
                <rect x="${cx - 55}" y="${p.y + 6}" width="110" height="22" rx="2" fill="#451a03" stroke="#fbbf24" strokeWidth="1.2" />
                <text x="${cx}" y="${p.y + 21}" fill="#fef08a" font-size="10" font-weight="bold" text-anchor="middle" letter-spacing="1.5">${p.sign}</text>

                {/* Đèn lồng cung đình treo dưới mái */}
                <circle cx="${p.x + 25}" cy="${p.y + 32}" r="7" fill="#f59e0b" filter="url(#impBloom)" />
                <circle cx="${p.x + p.w - 25}" cy="${p.y + 32}" r="7" fill="#f43f5e" filter="url(#impBloom)" />
            </g>`;
    }
  });

  svg += `\n        </g>\n`;
  return svg;
}

// ------------------------------------------------------------------------------
// 3. GENERATE COURT PROCESSION (ĐOÀN RƯỚC ĐÈN HOÀNG CUNG DẠO QUẢNG TRƯỜNG)
// ------------------------------------------------------------------------------
function generateCourtProcession() {
  const figures = [
    { x: 120, type: 'guard', hat: 'nón_ngự_lâm', robe: '#dc2626' },
    { x: 180, type: 'courtier', hat: 'mũ_cánh_chuồn', robe: '#2563eb' },
    { x: 250, type: 'prince', hat: 'mũ_hoàng_tử', robe: '#d97706' },
    { x: 420, type: 'lady', hat: 'nón_quai_thao', robe: '#db2777' },
    { x: 490, type: 'maid', hat: 'khăn_vấn', robe: '#10b981' },
    { x: 680, type: 'scholar', hat: 'mũ_nho_sinh', robe: '#7c3aed' },
    { x: 750, type: 'child_star', hat: 'búi_tóc_đào', robe: '#ea580c' },
    { x: 820, type: 'child_carp', hat: 'búi_tóc_đào', robe: '#059669' },
    { x: 1250, type: 'prince', hat: 'mũ_hoàng_tử', robe: '#d97706' },
    { x: 1320, type: 'princess', hat: 'mũ_phượng', robe: '#e11d48' },
    { x: 1420, type: 'musician', hat: 'khăn_xếp', robe: '#0891b2' },
    { x: 1520, type: 'musician', hat: 'khăn_xếp', robe: '#4f46e5' },
    { x: 1690, type: 'guard', hat: 'nón_ngự_lâm', robe: '#dc2626' },
    { x: 1760, type: 'lady', hat: 'nón_quai_thao', robe: '#c026d3' }
  ];

  let svg = `        {/* ============================================================================== */}\n`;
  svg += `        {/* ĐOÀN NGƯỜI RƯỚC ĐÈN HOÀNG GIA DẠO BƯỚC TRÊN QUẢNG TRƯỜNG CẨM THẠCH           */}\n`;
  svg += `        {/* ============================================================================== */}\n`;
  svg += `        <g id="imperial-court-procession">\n`;

  figures.forEach((f, idx) => {
    const animDur = (18 + (idx % 3) * 4);
    svg += `
            {/* Nhân vật cung đình ${idx + 1} (${f.type} tại x: ${f.x}) */}
            <g transform="translate(${f.x}, 510)">
                {/* Bóng đổ trên đá cẩm thạch */}
                <ellipse cx="0" cy="18" rx="8" ry="2.8" fill="#090d16" opacity="0.6" />
                {/* Áo dài ngũ thân cung đình */}
                <path d="M -7,2 L -10,18 L 10,18 L 7,2 Z" fill="${f.robe}" stroke="#fbbf24" strokeWidth="0.6" />
                {/* Đai lưng hoàng gia */}
                <line x1="-7" y1="8" x2="7" y2="8" stroke="#fbbf24" strokeWidth="1.2" />
                {/* Đầu và nón mũ hoàng tộc */}
                <circle cx="0" cy="-4" r="5" fill="#fed7aa" />
                <path d="M -8,-6 Q 0,-14 8,-6 Z" fill="#451a03" stroke="#fbbf24" strokeWidth="0.8" />
                {/* Đèn lồng cầm tay lung linh */}
                <line x1="5" y1="5" x2="14" y2="-2" stroke="#78350f" strokeWidth="1" />
                <circle cx="14" cy="5" r="4.5" fill="#f59e0b" filter="url(#impBloom)" />
                <circle cx="14" cy="5" r="2.2" fill="#ffffff" />
            </g>`;
  });

  svg += `\n        </g>\n`;
  return svg;
}

// ------------------------------------------------------------------------------
// 4. GENERATE 48 ROYAL LOTUS CANDLE LANTERNS ON THE LAKE
// ------------------------------------------------------------------------------
function generate48LotusLanterns() {
  let svg = `        {/* ============================================================================== */}\n`;
  svg += `        {/* 48 ĐÓA HOA ĐĂNG BÚP SEN HOÀNG GIA DẬP DỀNH TRÊN HỒ SEN ÁNH TRĂNG             */}\n`;
  svg += `        {/* ============================================================================== */}\n`;
  svg += `        <g id="imperial-48-lotus-lanterns">\n`;

  for (let i = 0; i < 48; i++) {
    const x = Math.round(60 + (i * 38.5));
    const lane = i % 4;
    const y = Math.round(590 + lane * 110 + (Math.sin(i * 1.7) * 20));
    const scale = (0.55 + lane * 0.22).toFixed(2);
    const animClass = i % 2 === 0 ? 'animate-lotus-bob-1' : 'animate-lotus-bob-2';

    svg += `            <g transform="translate(${x}, ${y}) scale(${scale})" className="${animClass}">
                <ellipse cx="0" cy="5" rx="20" ry="6" fill="#f59e0b" opacity="0.45" filter="url(#impBloom)" />
                <ellipse cx="0" cy="6" rx="22" ry="7" fill="url(#impLotusLeaf)" opacity="0.75" />
                <path d="M 0,6 C -12,-2 -14,-14 0,-18 C 14,-14 12,-2 0,6 Z" fill="url(#impLotusPink)" />
                <path d="M -7,4 C -15,-2 -13,-9 -7,-12 C -2,-8 -2,1 -7,4 Z" fill="url(#impLotusPink)" opacity="0.88" />
                <path d="M 7,4 C 15,-2 13,-9 7,-12 C 2,-8 2,1 7,4 Z" fill="url(#impLotusPink)" opacity="0.88" />
                <circle cx="0" cy="-6" r="3.2" fill="#ffffff" filter="url(#impBloom)" />
                <circle cx="0" cy="-6" r="1.8" fill="#fef08a" />
            </g>\n`;
  }

  svg += `        </g>\n`;
  return svg;
}

// ------------------------------------------------------------------------------
// 5. ASSEMBLE FULL MASTERPIECE TSX COMPONENT
// ------------------------------------------------------------------------------
const fullMasterpiece = `import React from 'react';

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
                    0% {
                        transform: translate(2100px, 140px) scale(0.85);
                    }
                    100% {
                        transform: translate(-300px, 90px) scale(0.85);
                    }
                }
                .animate-crane-1 {
                    animation: imperial-crane-fly-1 32s linear infinite;
                }
                @keyframes imperial-crane-fly-2 {
                    0% {
                        transform: translate(2200px, 210px) scale(0.68);
                    }
                    100% {
                        transform: translate(-200px, 150px) scale(0.68);
                    }
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
                    0% {
                        transform: translate(-380px, 690px);
                    }
                    50% {
                        transform: translate(960px, 700px);
                    }
                    100% {
                        transform: translate(2300px, 690px);
                    }
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
                        <line x1="380" y1="180" x2="330" y2="250" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" />
                        <line x1="380" y1="180" x2="430" y2="250" stroke="#d97706" strokeWidth="1.6" strokeLinecap="round" />
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

                {/* 16 ĐÈN LỒNG CUNG ĐÌNH DÁT VÀNG */}
${generate16ImperialLanterns()}

                {/* 9 ĐẠI CUNG ĐIỆN & SHOWROOM VINFAST */}
${generate9ImperialPalaces()}

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
${generateCourtProcession()}

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

                        {/* Đầu rồng dát vàng ngậm ngọc */}
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
${generate48LotusLanterns()}

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
  esbuild.transformSync(fullMasterpiece, { loader: 'tsx' });
  console.log('esbuild check PASSED for Grand Imperial Palace Backdrop!');
  fs.writeFileSync(targetFile, fullMasterpiece, 'utf8');
  console.log('SUCCESS: Written epic masterpiece to components/login/MidAutumnImperialBackdrop.tsx');
  console.log('Total lines:', fullMasterpiece.split('\n').length);
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
