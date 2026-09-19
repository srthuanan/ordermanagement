const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// ============================================================================
// 1. ADD CSS KEYFRAMES FOR WILLOW BREEZE AND STAR TWINKLE 3
// ============================================================================
const newCss = `
                @keyframes willow-breeze-sway-1 {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(3.5deg) skewX(1.5deg); }
                }
                @keyframes willow-breeze-sway-2 {
                    0%, 100% { transform: rotate(0deg); }
                    50% { transform: rotate(-3.8deg) skewX(-1.8deg); }
                }
                .animate-willow-1 {
                    animation: willow-breeze-sway-1 6.5s ease-in-out infinite;
                    transform-origin: top center;
                }
                .animate-willow-2 {
                    animation: willow-breeze-sway-2 7.8s ease-in-out infinite 0.8s;
                    transform-origin: top center;
                }
                .animate-star-3 { animation: mid-autumn-star-twinkle 5s ease-in-out infinite 1.8s; }
`;

if (!code.includes('animate-willow-1')) {
  code = code.replace('.animate-star-2 { animation: mid-autumn-star-twinkle 4.5s ease-in-out infinite 1s; }',
    '.animate-star-2 { animation: mid-autumn-star-twinkle 4.5s ease-in-out infinite 1s; }\n' + newCss.trim());
}

// ============================================================================
// 2. ENHANCE STARRY SKY (TRỜI CÓ ĐẦY SAO LUNG LINH)
// Replace lines from {/* 4. CÁC VÌ SAO LẤP LÁNH */} to before {/* 5. VẦNG TRĂNG RẰM
// ============================================================================
const starCoords = [
  // Cánh trái bầu trời
  { x: 45, y: 35, s: 0.9, a: '1', c: '#ffffff' },
  { x: 95, y: 75, s: 0.6, a: '2', c: '#fef08a' },
  { x: 140, y: 25, s: 1.1, a: '3', c: '#ffffff' },
  { x: 190, y: 65, s: 0.7, a: '1', c: '#fef08a' },
  { x: 235, y: 110, s: 0.5, a: '2', c: '#ffffff' },
  { x: 280, y: 40, s: 1.2, a: '3', c: '#fde047' },
  { x: 330, y: 85, s: 0.8, a: '1', c: '#ffffff' },
  { x: 375, y: 30, s: 0.6, a: '2', c: '#fef08a' },
  { x: 420, y: 120, s: 0.9, a: '3', c: '#ffffff' },
  { x: 470, y: 55, s: 0.7, a: '1', c: '#fde047' },
  { x: 520, y: 95, s: 1.0, a: '2', c: '#ffffff' },
  { x: 575, y: 35, s: 0.8, a: '3', c: '#fef08a' },
  { x: 625, y: 70, s: 0.6, a: '1', c: '#ffffff' },
  { x: 670, y: 115, s: 1.1, a: '2', c: '#fde047' },
  { x: 715, y: 45, s: 0.7, a: '3', c: '#ffffff' },
  { x: 760, y: 90, s: 0.9, a: '1', c: '#fef08a' },
  { x: 810, y: 30, s: 0.6, a: '2', c: '#ffffff' },
  { x: 855, y: 65, s: 0.8, a: '3', c: '#fde047' },

  // Quanh vòm trăng đỉnh trời
  { x: 910, y: 22, s: 0.9, a: '1', c: '#ffffff' },
  { x: 1010, y: 24, s: 0.9, a: '2', c: '#ffffff' },
  { x: 890, y: 145, s: 0.6, a: '3', c: '#fef08a' },
  { x: 1030, y: 145, s: 0.6, a: '1', c: '#fef08a' },

  // Cánh phải bầu trời
  { x: 1065, y: 60, s: 0.8, a: '2', c: '#fde047' },
  { x: 1110, y: 35, s: 0.6, a: '3', c: '#ffffff' },
  { x: 1155, y: 95, s: 1.0, a: '1', c: '#fef08a' },
  { x: 1205, y: 45, s: 0.7, a: '2', c: '#ffffff' },
  { x: 1250, y: 110, s: 1.2, a: '3', c: '#fde047' },
  { x: 1295, y: 65, s: 0.6, a: '1', c: '#ffffff' },
  { x: 1340, y: 30, s: 0.9, a: '2', c: '#fef08a' },
  { x: 1390, y: 85, s: 0.7, a: '3', c: '#ffffff' },
  { x: 1435, y: 40, s: 1.1, a: '1', c: '#fde047' },
  { x: 1485, y: 115, s: 0.6, a: '2', c: '#ffffff' },
  { x: 1530, y: 55, s: 0.8, a: '3', c: '#fef08a' },
  { x: 1580, y: 90, s: 1.0, a: '1', c: '#ffffff' },
  { x: 1625, y: 35, s: 0.7, a: '2', c: '#fde047' },
  { x: 1675, y: 75, s: 0.9, a: '3', c: '#ffffff' },
  { x: 1720, y: 120, s: 0.6, a: '1', c: '#fef08a' },
  { x: 1765, y: 45, s: 1.2, a: '2', c: '#ffffff' },
  { x: 1810, y: 85, s: 0.8, a: '3', c: '#fde047' },
  { x: 1855, y: 35, s: 0.6, a: '1', c: '#ffffff' },
  { x: 1890, y: 95, s: 1.0, a: '2', c: '#fef08a' },
];

const starrySkyJsx = `{/* 4. CÁC VÌ SAO LẤP LÁNH & CHÒM SAO ĐÊM RẰM TRUNG THU */}
                <g filter="url(#maSoftGlow)">
${starCoords.map(s => `                    <g transform="translate(${s.x}, ${s.y}) scale(${s.s})" className="animate-star-${s.a}">
                        <path d="M 0,-7 Q 0,-1.5 1.5,0 Q 0,1.5 0,7 Q 0,1.5 -1.5,0 Q 0,-1.5 0,-7 Z" fill="${s.c}" />
                        <circle cx="0" cy="0" r="1.5" fill="#ffffff" />
                    </g>`).join('\n')}
                    {/* Bụi sao tinh tú li ti phủ khắp nền trời */}
                    <circle cx="120" cy="140" r="1" fill="#fff" opacity="0.7" />
                    <circle cx="210" cy="90" r="1.2" fill="#fef08a" opacity="0.8" />
                    <circle cx="340" cy="130" r="0.9" fill="#fff" opacity="0.6" />
                    <circle cx="490" cy="100" r="1.1" fill="#fde047" opacity="0.75" />
                    <circle cx="640" cy="40" r="1.3" fill="#fff" opacity="0.8" />
                    <circle cx="780" cy="130" r="1" fill="#fef08a" opacity="0.7" />
                    <circle cx="1180" cy="70" r="1.2" fill="#fff" opacity="0.85" />
                    <circle cx="1320" cy="125" r="0.9" fill="#fde047" opacity="0.6" />
                    <circle cx="1470" cy="70" r="1.1" fill="#fff" opacity="0.75" />
                    <circle cx="1610" cy="135" r="1" fill="#fef08a" opacity="0.7" />
                    <circle cx="1740" cy="65" r="1.3" fill="#fff" opacity="0.8" />
                    <circle cx="1870" cy="140" r="1" fill="#fde047" opacity="0.75" />
                </g>`;

const starStartIdx = code.indexOf('{/* 4. CÁC VÌ SAO LẤP LÁNH */}');
const starEndIdx = code.indexOf('{/* 5. VẦNG TRĂNG RẰM', starStartIdx);
if (starStartIdx !== -1 && starEndIdx !== -1) {
  code = code.substring(0, starStartIdx) + starrySkyJsx + '\n\n                ' + code.substring(starEndIdx);
  console.log('Successfully replaced starry sky with 50+ stars!');
}


// ============================================================================
// 3. NHÀ LẦU 2 TẦNG (2-STORY ANCIENT HOI AN HOUSES / GÁC LẦU PHỐ CỔ)
// ============================================================================

// --- NHÀ LẦU 1: VỌNG NGUYỆT LẦU TRÀ QUÁN (trong nhaco-tan-ky) ---
// Local x: 15 to 160, y: -45 to 45 (nhô cao lên trên mái trệt)
const house1Story2 = `
        {/* ==================================================================== */}
        {/* NHÀ LẦU 2 TẦNG: VỌNG NGUYỆT LẦU TRÀ QUÁN HỘI AN (TẦNG 2 NGẮM TRĂNG)   */}
        {/* ==================================================================== */}
        <g id="tra-quan-tang-2" filter="url(#dropShadow)">
            {/* Tường gác lầu 2 màu vàng đất rêu phong */}
            <rect x="22" y="-35" width="132" height="75" fill="url(#wallOchre1)" stroke="#2b1404" strokeWidth="1.2" />
            
            {/* Cửa chấn song gỗ gụ con tiện tầng 2 mở toang hắt sáng ấm */}
            <rect x="42" y="-18" width="92" height="42" rx="2" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            {/* Chấn song thượng song hạ bản */}
            <rect x="42" y="-18" width="92" height="42" fill="none" stroke="#3b1d06" strokeWidth="1.2" />
            <line x1="72" y1="-18" x2="72" y2="24" stroke="#451a03" strokeWidth="1.4" />
            <line x1="104" y1="-18" x2="104" y2="24" stroke="#451a03" strokeWidth="1.4" />

            {/* Bàn trà và 2 vị khách đàm đạo thưởng trà trên lầu 2 */}
            <rect x="78" y="5" width="20" height="15" rx="1.5" fill="#2d1502" />
            <ellipse cx="88" cy="4" rx="4" ry="1.8" fill="#ca8a04" />
            {/* Vị khách ngắm trăng bên trái lầu 2 */}
            <circle cx="62" cy="-2" r="3.6" fill="#fed7aa" />
            <path d="M 58,2 L 66,2 L 67,22 L 57,22 Z" fill="#1e3a8a" />
            {/* Vị khách đàm đạo bên phải lầu 2 */}
            <circle cx="114" cy="-2" r="3.6" fill="#fed7aa" />
            <path d="M 110,2 L 118,2 L 119,22 L 109,22 Z" fill="#991b1b" />

            {/* Lan can ban công gỗ con tiện tầng 2 */}
            <rect x="20" y="22" width="136" height="18" fill="#240f02" stroke="#120601" strokeWidth="1" />
            ${[28, 38, 48, 58, 68, 78, 88, 98, 108, 118, 128, 138, 148].map(bx => 
                `<line x1="${bx}" y1="24" x2="${bx}" y2="38" stroke="#f59e0b" strokeWidth="1.2" />`
            ).join('\n            ')}

            {/* Mái ngói âm dương tầng 2 lượn sóng vuốt cong đầu đao */}
            <path d="M 10,-35 Q 88,-48 166,-35 L 148,-62 Q 88,-68 28,-62 Z" fill="url(#roofDarkSlate)" stroke="#1c0a02" strokeWidth="1.8" />
            <path d="M 10,-35 Q -2,-39 4,-48" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 166,-35 Q 178,-39 172,-48" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
            {/* Chóp hồ lô gốm trên đỉnh nóc gác lầu */}
            <circle cx="88" cy="-65" r="3" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />

            {/* Cặp lồng đèn đỏ tầng 2 đung đưa */}
            <g transform="translate(24, -20) scale(0.7)" filter="url(#bloomSoft)">
                <ellipse cx="0" cy="10" rx="9" ry="13" fill="#dc2626" />
                <circle cx="0" cy="8" r="2" fill="#fff" />
            </g>
            <g transform="translate(152, -20) scale(0.7)" filter="url(#bloomSoft)">
                <ellipse cx="0" cy="10" rx="9" ry="13" fill="#dc2626" />
                <circle cx="0" cy="8" r="2" fill="#fff" />
            </g>
        </g>
`;

// Insert into nhaco-tan-ky: right before `<rect x="0" y="80" width="175" height="185" fill="url(#wallOchreBright)" />`
const tanKyTarget = '<rect x="0" y="80" width="175" height="185" fill="url(#wallOchreBright)" />';
if (code.includes(tanKyTarget)) {
  code = code.replace(tanKyTarget, house1Story2 + '\n        ' + tanKyTarget);
  console.log('Successfully added 2-story pavilion to Trà Quán!');
}


// --- NHÀ LẦU 2: GÁC CHUÔNG VỌNG NGUYỆT QUẢNG ĐÔNG HỘI QUÁN (trong nhaco-center-hoi-quan) ---
// Local x: 180 to 315, y: -45 to 80
const house4Story2 = `
        {/* ==================================================================== */}
        {/* NHÀ LẦU 2 TẦNG: GÁC CHUÔNG VỌNG NGUYỆT QUẢNG ĐÔNG HỘI QUÁN (CUNG ĐÌNH) */}
        {/* ==================================================================== */}
        <g id="quang-dong-tang-2" filter="url(#dropShadow)">
            {/* Thân gác lầu cung đình tầng 2 son đỏ viền vàng */}
            <rect x="185" y="-30" width="125" height="72" fill="url(#wallRedHeritage)" stroke="#78350f" strokeWidth="1.2" />
            
            {/* Cửa sổ bát giác phong thủy thếp vàng mở sáng */}
            <polygon points="247.5,-18 262,-3 262,17 247.5,32 233,32 218.5,17 218.5,-3 233,-18" fill="url(#interiorGlow)" filter="url(#bloomSoft)" />
            <polygon points="247.5,-18 262,-3 262,17 247.5,32 233,32 218.5,17 218.5,-3 233,-18" fill="none" stroke="#f59e0b" strokeWidth="1.6" />
            <circle cx="240.2" cy="7" r="8" fill="none" stroke="#78350f" strokeWidth="1.2" />
            <line x1="240.2" y1="-1" x2="240.2" y2="15" stroke="#78350f" strokeWidth="1.2" />
            <line x1="232.2" y1="7" x2="248.2" y2="7" stroke="#78350f" strokeWidth="1.2" />

            {/* Mái ngói lưu ly cung đình 2 tầng vuốt cong lưỡng long tranh châu */}
            <path d="M 172,-30 Q 247.5,-45 323,-30 L 305,-58 Q 247.5,-66 190,-58 Z" fill="url(#roofTerracotta)" stroke="#1c0a02" strokeWidth="1.8" />
            <path d="M 172,-30 Q 158,-35 164,-46" fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M 323,-30 Q 337,-35 331,-46" fill="none" stroke="#f59e0b" strokeWidth="2.4" strokeLinecap="round" />
            {/* Lưỡng long triều nhật / Nhật nguyệt đỉnh mái */}
            <circle cx="247.5" cy="-63" r="4.5" fill="#ef4444" stroke="#f59e0b" strokeWidth="1.2" />
            <path d="M 240,-63 Q 234,-70 228,-63" fill="none" stroke="#f59e0b" strokeWidth="1.6" />
            <path d="M 255,-63 Q 261,-70 267,-63" fill="none" stroke="#f59e0b" strokeWidth="1.6" />

            {/* Cặp lồng đèn bát giác Hội An cung đình buông từ 2 đầu đao */}
            <g transform="translate(166, -18) scale(0.8)" filter="url(#bloomSoft)">
                <ellipse cx="0" cy="10" rx="9" ry="13" fill="#f59e0b" />
                <circle cx="0" cy="8" r="2" fill="#fff" />
            </g>
            <g transform="translate(329, -18) scale(0.8)" filter="url(#bloomSoft)">
                <ellipse cx="0" cy="10" rx="9" ry="13" fill="#f59e0b" />
                <circle cx="0" cy="8" r="2" fill="#fff" />
            </g>
        </g>
`;

// Insert into nhaco-center-hoi-quan: right before `<rect x="150" y="80" width="195" height="200" fill="url(#wallOchreBright)" />`
const hoiQuanTarget = '<rect x="150" y="80" width="195" height="200" fill="url(#wallOchreBright)" />';
if (code.includes(hoiQuanTarget)) {
  code = code.replace(hoiQuanTarget, house4Story2 + '\n        ' + hoiQuanTarget);
  console.log('Successfully added 2-story imperial pavilion to Quảng Đông Hội Quán!');
}


// --- NHÀ LẦU 3: FAIFO ROOFTOP COFFEE (trong nhaco-block-right) ---
// Local x: 420 to 600, y: -40 to 85
const house9Story2 = `
        {/* ==================================================================== */}
        {/* NHÀ LẦU 2 TẦNG: FAIFO ROOFTOP COFFEE (SÂN THƯỢNG NGẮM TRĂNG TRỨ DANH) */}
        {/* ==================================================================== */}
        <g id="faifo-rooftop-tang-2" filter="url(#dropShadow)">
            {/* Tường gác lầu 2 Faifo vàng cam ấm áp */}
            <rect x="425" y="-35" width="165" height="75" fill="url(#wallOchreBright)" stroke="#2b1404" strokeWidth="1.2" />
            
            {/* Cửa gỗ cổ điển tầng 2 mở toang ra sân thượng */}
            <rect x="445" y="-18" width="70" height="42" rx="2" fill="url(#interiorGlow)" opacity="0.95" filter="url(#bloomSoft)" />
            <rect x="445" y="-18" width="70" height="42" fill="none" stroke="#3b1d06" strokeWidth="1.2" />
            <line x1="480" y1="-18" x2="480" y2="24" stroke="#451a03" strokeWidth="1.4" />

            {/* Sân thượng gỗ Rooftop nổi tiếng & Lan can con tiện ngắm phố */}
            <rect x="420" y="20" width="175" height="20" fill="#240f02" stroke="#120601" strokeWidth="1" />
            ${[430, 442, 454, 466, 478, 490, 502, 514, 526, 538, 550, 562, 574, 586].map(bx => 
                `<line x1="${bx}" y1="22" x2="${bx}" y2="38" stroke="#ca8a04" strokeWidth="1.2" />`
            ).join('\n            ')}

            {/* Đôi bạn trẻ đứng tựa lan can rooftop ngắm trăng & sông Hoài */}
            {/* Chàng trai áo trắng */}
            <circle cx="535" cy="5" r="3.8" fill="#fed7aa" />
            <path d="M 531,9 L 539,9 L 540,24 L 530,24 Z" fill="#0284c7" />
            {/* Cô gái áo dài hoa vàng */}
            <circle cx="550" cy="6" r="3.6" fill="#fed7aa" />
            <circle cx="550" cy="2" r="2.2" fill="#1c1917" />
            <path d="M 546,10 L 554,10 L 555,25 L 545,25 Z" fill="#eab308" />
            {/* Tách cà phê ấm áp trên bàn ban công */}
            <rect x="562" y="16" width="4" height="5" rx="0.5" fill="#f8fafc" />

            {/* Mái ngói rêu phong cổ kính lầu 2 */}
            <path d="M 410,-35 Q 507.5,-48 605,-35 L 585,-62 Q 507.5,-68 430,-62 Z" fill="url(#roofDarkSlate)" stroke="#1c0a02" strokeWidth="1.8" />
            <path d="M 410,-35 Q 398,-39 404,-48" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 605,-35 Q 617,-39 611,-48" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />

            {/* Dây cờ hoa & đèn lồng Hội An trang trí sân thượng Faifo */}
            <path d="M 425,-25 Q 507.5,-15 590,-25" fill="none" stroke="#78350f" strokeWidth="0.8" strokeDasharray="2,3" />
            <circle cx="465" cy="-19" r="2.5" fill="#ef4444" filter="url(#bloomSoft)" />
            <circle cx="507" cy="-17" r="2.5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <circle cx="550" cy="-19" r="2.5" fill="#10b981" filter="url(#bloomSoft)" />
        </g>
`;

// Insert into nhaco-block-right: right before `<rect x="395" y="85" width="230" height="190" fill="url(#wallOchreBright)" />`
const faifoTarget = '<rect x="395" y="85" width="230" height="190" fill="url(#wallOchreBright)" />';
if (code.includes(faifoTarget)) {
  code = code.replace(faifoTarget, house9Story2 + '\n        ' + faifoTarget);
  console.log('Successfully added 2-story Faifo rooftop pavilion to Cà Phê Faifo!');
}


// ============================================================================
// 4. CÂY CỐI, CÂY LIỄU RỦ VÀ CÂY CẢNH VEN ĐƯỜNG & SÔNG HOÀI
// ============================================================================
const streetTreesAndWillowsJsx = `
                {/* ============================================================================== */}
                {/* HÀNG CÂY LIỄU RỦ THƯỚT THA, CÂY CỔ THỤ & CÂY KIỂNG DỌC ĐƯỜNG BỜ KÈ SÔNG HOÀI */}
                {/* ============================================================================== */}
                <g id="hoian-street-trees-and-willows" filter="url(#dropShadow)">
                    {/* --- CÂY LIỄU 1 (BỜ SÔNG PHÍA TÂY, x=240, buông cành rủ xuống dòng sông) --- */}
                    <g transform="translate(240, 480)">
                        {/* Thân cây liễu cổ uốn lượn phong trần */}
                        <path d="M -8,90 Q -2,40 -15,10 Q -6,2 6,-8 Q 12,-15 20,-20 Q 8,5 4,45 Q 2,75 8,90 Z" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
                        
                        {/* Tán cành liễu uốn cong buông rủ thướt tha */}
                        <g className="animate-willow-1">
                            {/* Cành chính vươn ra mặt nước */}
                            <path d="M 6,-8 Q 35,-12 55,15 Q 65,35 68,75" fill="none" stroke="#2d1502" strokeWidth="2.4" strokeLinecap="round" />
                            <path d="M -6,2 Q -30,-5 -45,20 Q -55,45 -58,80" fill="none" stroke="#2d1502" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 12,-15 Q 15,-40 38,-35 Q 55,-25 72,5 Q 85,30 88,85" fill="none" stroke="#2d1502" strokeWidth="1.8" strokeLinecap="round" />
                            
                            {/* Các chuỗi dải lá liễu mềm mại xanh ngọc chạm mặt sông */}
                            ${[-58, -48, -38, -25, -12, 0, 15, 28, 42, 55, 68, 80, 92].map((lx, i) => `
                            <path d="M ${lx - 10},${15 + (i % 4) * 8} Q ${lx},${45 + (i % 3) * 12} ${lx + 5},${85 + (i % 5) * 10}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#15803d' : '#16a34a'}" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx - 8},${25 + (i % 4) * 8} Q ${lx + 2},${55 + (i % 3) * 12} ${lx + 6},${92 + (i % 5) * 10}" 
                                  fill="none" stroke="#4ade80" strokeWidth="1.2" strokeDasharray="4,4" opacity="0.75" />
                            `).join('')}

                            {/* Đèn lồng giấy đỏ treo trên cành liễu */}
                            <ellipse cx="45" cy="22" rx="4" ry="6" fill="#ef4444" filter="url(#bloomSoft)" />
                            <line x1="45" y1="16" x2="45" y2="22" stroke="#78350f" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* --- CÂY LIỄU 2 (BỜ SÔNG TRUNG TÂM, x=740) --- */}
                    <g transform="translate(740, 480)">
                        <path d="M -6,90 Q 2,45 -8,12 Q 2,2 14,-10 Q 6,8 5,50 Q 2,75 6,90 Z" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
                        <g className="animate-willow-2">
                            <path d="M 14,-10 Q 42,-14 62,12 Q 72,32 75,78" fill="none" stroke="#2d1502" strokeWidth="2.4" strokeLinecap="round" />
                            <path d="M -4,5 Q -25,-2 -40,22 Q -50,45 -52,82" fill="none" stroke="#2d1502" strokeWidth="2" strokeLinecap="round" />
                            ${[-50, -38, -25, -10, 5, 20, 35, 50, 65, 78].map((lx, i) => `
                            <path d="M ${lx - 8},${18 + (i % 4) * 7} Q ${lx},${48 + (i % 3) * 10} ${lx + 4},${86 + (i % 5) * 9}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#16a34a' : '#15803d'}" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx - 6},${28 + (i % 4) * 7} Q ${lx + 2},${58 + (i % 3) * 10} ${lx + 5},${94 + (i % 5) * 9}" 
                                  fill="none" stroke="#86efac" strokeWidth="1" strokeDasharray="3,4" opacity="0.7" />
                            `).join('')}
                            <ellipse cx="-28" cy="24" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomSoft)" />
                        </g>
                    </g>

                    {/* --- CÂY LIỄU 3 (BỜ SÔNG ĐÔNG, x=1220) --- */}
                    <g transform="translate(1220, 480)">
                        <path d="M -7,90 Q -1,42 -12,12 Q -4,2 8,-8 Q 14,-15 22,-18 Q 10,6 6,48 Q 3,75 7,90 Z" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
                        <g className="animate-willow-1">
                            <path d="M 8,-8 Q 38,-10 58,16 Q 68,36 70,76" fill="none" stroke="#2d1502" strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M -5,4 Q -28,-4 -42,22 Q -52,44 -55,80" fill="none" stroke="#2d1502" strokeWidth="1.8" strokeLinecap="round" />
                            ${[-52, -40, -26, -12, 2, 18, 32, 48, 62, 74].map((lx, i) => `
                            <path d="M ${lx - 8},${16 + (i % 4) * 7} Q ${lx},${46 + (i % 3) * 10} ${lx + 4},${84 + (i % 5) * 9}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#15803d' : '#16a34a'}" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx - 6},${26 + (i % 4) * 7} Q ${lx + 2},${56 + (i % 3) * 10} ${lx + 5},${90 + (i % 5) * 9}" 
                                  fill="none" stroke="#4ade80" strokeWidth="1.1" strokeDasharray="4,4" opacity="0.75" />
                            `).join('')}
                            <ellipse cx="48" cy="20" rx="3.8" ry="5.8" fill="#ef4444" filter="url(#bloomSoft)" />
                        </g>
                    </g>

                    {/* --- CÂY LIỄU 4 (BỜ SÔNG ĐÔNG HẠ LƯU, x=1690) --- */}
                    <g transform="translate(1690, 480)">
                        <path d="M -6,90 Q 2,44 -8,12 Q 3,2 14,-10 Q 6,8 5,50 Q 2,75 6,90 Z" fill="#2d1502" stroke="#120601" strokeWidth="1.2" />
                        <g className="animate-willow-2">
                            <path d="M 14,-10 Q 42,-14 62,12 Q 72,32 75,78" fill="none" stroke="#2d1502" strokeWidth="2.4" strokeLinecap="round" />
                            <path d="M -4,5 Q -25,-2 -40,22 Q -50,45 -52,82" fill="none" stroke="#2d1502" strokeWidth="2" strokeLinecap="round" />
                            ${[-50, -36, -22, -8, 6, 22, 38, 52, 66, 78].map((lx, i) => `
                            <path d="M ${lx - 8},${18 + (i % 4) * 7} Q ${lx},${48 + (i % 3) * 10} ${lx + 4},${86 + (i % 5) * 9}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#16a34a' : '#15803d'}" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx - 6},${28 + (i % 4) * 7} Q ${lx + 2},${58 + (i % 3) * 10} ${lx + 5},${94 + (i % 5) * 9}" 
                                  fill="none" stroke="#86efac" strokeWidth="1" strokeDasharray="3,4" opacity="0.7" />
                            `).join('')}
                            <ellipse cx="-26" cy="22" rx="4" ry="6" fill="#f59e0b" filter="url(#bloomSoft)" />
                        </g>
                    </g>

                    {/* --- 2 CÂY BÀNG CỔ THỤ VEN PHỐ --- */}
                    {/* Cây bàng cổ thụ 1 (x=450) */}
                    <g transform="translate(450, 440)">
                        <path d="M -12,130 Q -6,60 -18,10 Q -6,-15 15,-40 Q 25,-10 12,60 Q 8,100 14,130 Z" fill="#3b1d06" stroke="#1c0a02" strokeWidth="1.5" />
                        {/* Tán lá bàng cổ thụ xếp tầng xanh mát */}
                        <ellipse cx="-15" cy="-25" rx="35" ry="18" fill="#14532d" opacity="0.9" />
                        <ellipse cx="12" cy="-45" rx="42" ry="22" fill="#166534" opacity="0.95" />
                        <ellipse cx="35" cy="-20" rx="32" ry="16" fill="#15803d" opacity="0.9" />
                        <ellipse cx="5" cy="-55" rx="28" ry="14" fill="#22c55e" opacity="0.8" />
                        {/* Đèn lồng treo cành bàng */}
                        <ellipse cx="28" cy="-8" rx="3.5" ry="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
                    </g>

                    {/* Cây bàng cổ thụ 2 (x=1440) */}
                    <g transform="translate(1440, 440)">
                        <path d="M -10,130 Q -4,60 -16,10 Q -5,-15 12,-38 Q 22,-10 10,60 Q 6,100 12,130 Z" fill="#3b1d06" stroke="#1c0a02" strokeWidth="1.5" />
                        <ellipse cx="-12" cy="-24" rx="32" ry="17" fill="#14532d" opacity="0.9" />
                        <ellipse cx="10" cy="-42" rx="38" ry="20" fill="#166534" opacity="0.95" />
                        <ellipse cx="32" cy="-18" rx="30" ry="15" fill="#15803d" opacity="0.9" />
                        <ellipse cx="5" cy="-52" rx="25" ry="13" fill="#22c55e" opacity="0.8" />
                        <ellipse cx="-18" cy="-8" rx="3.5" ry="5.5" fill="#f59e0b" filter="url(#bloomSoft)" />
                    </g>

                    {/* --- CÁC CHẬU CAU CẢNH, TRÚC QUÂN TỬ & CHẬU HOA CÚC MÂM XÔI VEN ĐƯỜNG --- */}
                    ${[
                      { x: 130, type: 'cau' },
                      { x: 360, type: 'cuc' },
                      { x: 530, type: 'truc' },
                      { x: 645, type: 'cuc' },
                      { x: 880, type: 'cau' },
                      { x: 1090, type: 'truc' },
                      { x: 1275, type: 'cuc' },
                      { x: 1510, type: 'cau' },
                      { x: 1670, type: 'cuc' },
                      { x: 1850, type: 'truc' }
                    ].map(p => {
                      if (p.type === 'cau') {
                        return `
                        {/* Chậu cau cảnh Thanh Hà tại x=${p.x} */}
                        <g transform="translate(${p.x}, 538)">
                            <path d="M -6,22 L 6,22 L 8,36 L -8,36 Z" fill="#9a3412" stroke="#f59e0b" strokeWidth="0.8" />
                            {/* Thân cau cảnh vươn cao */}
                            <line x1="0" y1="22" x2="0" y2="-15" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
                            {/* Bẹ lá cau xòe quạt thanh thoát */}
                            <path d="M 0,-15 Q -14,-32 -22,-24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 0,-15 Q 14,-32 22,-24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 0,-15 Q -12,-38 0,-44" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 0,-15 Q 12,-38 0,-44" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
                        </g>`;
                      } else if (p.type === 'truc') {
                        return `
                        {/* Khóm trúc quân tử tại x=${p.x} */}
                        <g transform="translate(${p.x}, 538)">
                            <path d="M -7,22 L 7,22 L 9,36 L -9,36 Z" fill="#7c2d12" stroke="#ca8a04" strokeWidth="0.8" />
                            {/* Các nhánh trúc thanh tao */}
                            <line x1="-3" y1="22" x2="-5" y2="-20" stroke="#15803d" strokeWidth="1.6" />
                            <line x1="0" y1="22" x2="1" y2="-28" stroke="#16a34a" strokeWidth="1.6" />
                            <line x1="3" y1="22" x2="6" y2="-18" stroke="#15803d" strokeWidth="1.6" />
                            {/* Lá trúc nhọn */}
                            <path d="M -5,-15 Q -12,-18 -16,-15" fill="none" stroke="#4ade80" strokeWidth="1.4" />
                            <path d="M 1,-22 Q 8,-25 12,-22" fill="none" stroke="#4ade80" strokeWidth="1.4" />
                            <path d="M 6,-12 Q 14,-15 17,-12" fill="none" stroke="#4ade80" strokeWidth="1.4" />
                        </g>`;
                      } else {
                        return `
                        {/* Chậu hoa cúc mâm xôi vàng rực đón Tết Trung Thu tại x=${p.x} */}
                        <g transform="translate(${p.x}, 542)">
                            <path d="M -6,18 L 6,18 L 8,30 L -8,30 Z" fill="#9a3412" stroke="#d97706" strokeWidth="0.8" />
                            {/* Bụi hoa cúc tròn xoe nở rộ vàng rực */}
                            <circle cx="0" cy="12" r="11" fill="#ca8a04" />
                            <circle cx="0" cy="11" r="10" fill="#eab308" />
                            <circle cx="0" cy="10" r="8" fill="#fef08a" />
                            <circle cx="-4" cy="9" r="2" fill="#fff" opacity="0.6" />
                            <circle cx="4" cy="9" r="2" fill="#fff" opacity="0.6" />
                        </g>`;
                      }
                    }).join('\n')}
                </g>
`;

// Insert street trees and willows right after DÒNG NGƯỜI DẠO PHỐ, right before SÔNG HOÀI
const riverStartTarget = '{/* DẢI NGÂN HÀ 50+ ĐÓA HOA ĐĂNG SEN RỰC RỠ';
const riverIdx = code.indexOf(riverStartTarget);
if (riverIdx !== -1) {
  code = code.substring(0, riverIdx) + streetTreesAndWillowsJsx + '\n\n                ' + code.substring(riverIdx);
  console.log('Successfully added Weeping Willows, ancient trees, and street greenery!');
} else {
  console.error('Could not find river start target!');
  process.exit(1);
}

// Clean up any stray HTML comments
code = code.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for multi-story houses, stars, and trees!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully updated backdrop with all user requests!');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
