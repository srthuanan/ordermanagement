const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// 1. Create the new Authentic Hoi An Greenery Module
// This replaces the old clumsy trees with:
// A. Background Treetops peeking from behind the ancient tile roofs (creating natural depth and silhouette)
// B. Signature Cascading Bougainvillea (Giàn hoa giấy rực rỡ) climbing and draping over eaves and walls
// C. Natural, Elegant Weeping Willows (Liễu rủ sông Hoài) on the far embankment flanks (framing the view, not blocking shops)
// D. Traditional Potted Bonsai & Chrysanthemum planters tucked neatly against building pillars (not on the street)

const authenticGreeneryJsx = `
                {/* ============================================================================== */}
                {/* HỆ THỐNG CÂY XANH & CẢNH QUAN PHỐ CỔ HỘI AN NGHỆ THUẬT, TINH TẾ & HÀI HÒA        */}
                {/* (GIÀN HOA GIẤY LÃNG MẠN, CÂY BÓNG MÁT SAU MÁI NGÓI, CÂY LIỄU RỦ THƯỚT THA BỜ SÔNG) */}
                {/* ============================================================================== */}
                <g id="hoian-authentic-greenery" filter="url(#dropShadow)">
                    {/* ---------------------------------------------------------------------- */}
                    {/* A. VÒM CÂY BÓNG MÁT CỔ THỤ PHÍA SAU CÁC MÁI NGÓI (TẠO ĐỘ SÂU BỐ CỤC)     */}
                    {/* ---------------------------------------------------------------------- */}
                    {/* Vòm cây sau mái nhà Trà Quán & Chùa Cầu (x: 180 - 320, y: 220) */}
                    <g opacity="0.85">
                        <ellipse cx="230" cy="235" rx="46" ry="24" fill="#0f3822" />
                        <ellipse cx="270" cy="225" rx="52" ry="28" fill="#14532d" />
                        <ellipse cx="250" cy="210" rx="38" ry="20" fill="#166534" />
                        <ellipse cx="295" cy="240" rx="40" ry="22" fill="#15803d" />
                        {/* Điểm xuyết lá non sáng trăng */}
                        <circle cx="260" cy="205" r="8" fill="#22c55e" opacity="0.6" />
                    </g>

                    {/* Vòm cây sau mái Quảng Đông Hội Quán & Cao Lầu (x: 770 - 870, y: 210) */}
                    <g opacity="0.85">
                        <ellipse cx="790" cy="225" rx="44" ry="24" fill="#0f3822" />
                        <ellipse cx="835" cy="215" rx="48" ry="26" fill="#14532d" />
                        <ellipse cx="810" cy="200" rx="36" ry="18" fill="#166534" />
                        <circle cx="825" cy="198" r="7" fill="#22c55e" opacity="0.5" />
                    </g>

                    {/* Vòm cây sau mái Bánh Mì & Tơ Lụa (x: 1220 - 1320, y: 215) */}
                    <g opacity="0.85">
                        <ellipse cx="1245" cy="230" rx="42" ry="22" fill="#0f3822" />
                        <ellipse cx="1285" cy="218" rx="46" ry="25" fill="#14532d" />
                        <ellipse cx="1265" cy="205" rx="34" ry="18" fill="#166534" />
                    </g>

                    {/* Vòm cây sau mái Cà Phê Faifo (x: 1650 - 1760, y: 220) */}
                    <g opacity="0.85">
                        <ellipse cx="1680" cy="235" rx="45" ry="24" fill="#0f3822" />
                        <ellipse cx="1725" cy="222" rx="50" ry="26" fill="#14532d" />
                        <ellipse cx="1700" cy="208" rx="36" ry="18" fill="#166534" />
                        <circle cx="1715" cy="204" r="8" fill="#22c55e" opacity="0.5" />
                    </g>

                    {/* ---------------------------------------------------------------------- */}
                    {/* B. CÂY LIỄU RỦ TỰ NHIÊN VEN BỜ SÔNG HOÀI (HAI BÊN CÁNH KHUNG HÌNH)     */}
                    {/* Cây mọc ở mép bờ sông phía ngoài, cành mềm mại buông sát mặt nước       */}
                    {/* ---------------------------------------------------------------------- */}
                    
                    {/* CÂY LIỄU TẢ NGẠN (BỜ TÂY PHỐ CỔ, x: 75, buông rủ thanh thoát) */}
                    <g transform="translate(85, 520)">
                        {/* Thân cây liễu cổ kính uốn cong mềm mại */}
                        <path d="M -15,95 Q -6,50 -20,15 Q -10,-8 10,-22 Q 18,-30 26,-32 Q 12,6 8,45 Q 4,75 14,95 Z" fill="#291407" stroke="#120601" strokeWidth="1.2" />
                        
                        {/* Cụm tán lá liễu mềm mại tự nhiên */}
                        <ellipse cx="12" cy="-22" rx="35" ry="16" fill="#14532d" opacity="0.85" />
                        <ellipse cx="28" cy="-14" rx="28" ry="14" fill="#166534" opacity="0.9" />
                        <ellipse cx="-8" cy="-10" rx="26" ry="12" fill="#15803d" opacity="0.8" />
                        <circle cx="16" cy="-26" r="10" fill="#22c55e" opacity="0.65" />

                        {/* Cành liễu uốn cong rủ dài xuống mặt nước sông */}
                        <g className="animate-willow-1">
                            {/* Cành vươn và rủ */}
                            <path d="M 12,-18 Q 45,-18 68,15 Q 78,38 80,82" fill="none" stroke="#291407" strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M -6,0 Q -28,-6 -42,18 Q -50,42 -52,78" fill="none" stroke="#291407" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 22,-24 Q 26,-46 50,-40 Q 68,-28 84,6 Q 96,32 98,88" fill="none" stroke="#291407" strokeWidth="1.6" strokeLinecap="round" />
                            
                            {/* Từng sợi lá liễu mềm mại buông rủ */}
                            ${[-50, -38, -25, -12, 0, 15, 30, 44, 58, 72, 85, 96].map((lx, i) => `
                            <path d="M ${lx},${12 + (i % 4) * 8} Q ${lx + 6},${44 + (i % 3) * 11} ${lx + 2},${86 + (i % 5) * 8}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#15803d' : '#16a34a'}" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx + 2},${22 + (i % 4) * 8} Q ${lx + 8},${54 + (i % 3) * 11} ${lx + 4},${92 + (i % 5) * 8}" 
                                  fill="none" stroke="#86efac" strokeWidth="1.1" strokeDasharray="3,3" opacity="0.75" />
                            `).join('')}

                            {/* Đèn lồng đỏ treo trên cành liễu soi bóng xuống sông */}
                            <ellipse cx="48" cy="22" rx="3.8" ry="5.8" fill="#ef4444" filter="url(#bloomSoft)" />
                            <line x1="48" y1="16" x2="48" y2="22" stroke="#78350f" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* CÂY LIỄU HỮU NGẠN (BỜ ĐÔNG PHỐ CỔ, x: 1840, buông rủ đối xứng) */}
                    <g transform="translate(1840, 520)">
                        <path d="M 15,95 Q 6,50 20,15 Q 10,-8 -10,-22 Q -18,-30 -26,-32 Q -12,6 -8,45 Q -4,75 -14,95 Z" fill="#291407" stroke="#120601" strokeWidth="1.2" />
                        <ellipse cx="-12" cy="-22" rx="35" ry="16" fill="#14532d" opacity="0.85" />
                        <ellipse cx="-28" cy="-14" rx="28" ry="14" fill="#166534" opacity="0.9" />
                        <ellipse cx="8" cy="-10" rx="26" ry="12" fill="#15803d" opacity="0.8" />

                        <g className="animate-willow-2">
                            <path d="M -12,-18 Q -45,-18 -68,15 Q -78,38 -80,82" fill="none" stroke="#291407" strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M 6,0 Q 28,-6 42,18 Q 50,42 52,78" fill="none" stroke="#291407" strokeWidth="1.8" strokeLinecap="round" />
                            
                            ${[-88, -75, -60, -45, -30, -15, 0, 14, 28, 42, 54].map((lx, i) => `
                            <path d="M ${lx},${12 + (i % 4) * 8} Q ${lx - 6},${44 + (i % 3) * 11} ${lx - 2},${86 + (i % 5) * 8}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#16a34a' : '#15803d'}" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx - 2},${22 + (i % 4) * 8} Q ${lx - 8},${54 + (i % 3) * 11} ${lx - 4},${92 + (i % 5) * 8}" 
                                  fill="none" stroke="#4ade80" strokeWidth="1.1" strokeDasharray="3,3" opacity="0.75" />
                            `).join('')}
                            <ellipse cx="-45" cy="24" rx="3.8" ry="5.8" fill="#f59e0b" filter="url(#bloomSoft)" />
                        </g>
                    </g>

                    {/* VÀI NHÀNH LIỄU NHẸ VEN THIỀM ĐÁ SÔNG HOÀI (x=530 & x=1420) */}
                    <g transform="translate(535, 545)" className="animate-willow-1" opacity="0.85">
                        <path d="M 0,0 Q 15,10 22,35 Q 26,55 24,78" fill="none" stroke="#291407" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M 6,10 Q 18,32 16,68" fill="none" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M 12,14 Q 24,36 22,72" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M 18,18 Q 28,40 26,75" fill="none" stroke="#86efac" strokeWidth="1" strokeDasharray="3,3" />
                    </g>
                    <g transform="translate(1415, 545)" className="animate-willow-2" opacity="0.85">
                        <path d="M 0,0 Q -15,10 -22,35 Q -26,55 -24,78" fill="none" stroke="#291407" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M -6,10 Q -18,32 -16,68" fill="none" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M -12,14 Q -24,36 -22,72" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M -18,18 Q -28,40 -26,75" fill="none" stroke="#86efac" strokeWidth="1" strokeDasharray="3,3" />
                    </g>

                    {/* ---------------------------------------------------------------------- */}
                    {/* C. GIÀN HOA GIẤY HỘI AN RỰC RỠ (BOUGAINVILLEA LEO TƯỜNG & MÁI NGÓI)    */}
                    {/* ---------------------------------------------------------------------- */}
                    {/* Giàn hoa giấy góc trái nhà cổ Trà Quán (x: 350 - 390) */}
                    <g transform="translate(365, 340)" filter="url(#dropShadow)">
                        {/* Cành dây leo nâu xám uốn lượn men theo tường gạch vàng */}
                        <path d="M -6,180 Q -12,120 4,80 Q 16,50 8,10 Q 2,-20 18,-45" fill="none" stroke="#3b1d06" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M 4,80 Q 22,65 32,35 Q 36,15 28,-10" fill="none" stroke="#3b1d06" strokeWidth="1.6" strokeLinecap="round" />
                        
                        {/* Tán lá xanh biếc */}
                        <ellipse cx="-2" cy="70" rx="14" ry="10" fill="#14532d" />
                        <ellipse cx="14" cy="45" rx="16" ry="12" fill="#15803d" />
                        <ellipse cx="24" cy="15" rx="18" ry="13" fill="#166534" />
                        <ellipse cx="10" cy="-25" rx="16" ry="11" fill="#15803d" />

                        {/* Chùm hoa giấy hồng cánh sen & tím huế rực rỡ buông rủ */}
                        ${[
                          { cx: -4, cy: 65, r: 5, c: '#db2777' },
                          { cx: 2, cy: 58, r: 6, c: '#e11d48' },
                          { cx: 12, cy: 68, r: 4.5, c: '#c026d3' },
                          { cx: 8, cy: 40, r: 6.5, c: '#db2777' },
                          { cx: 18, cy: 35, r: 7, c: '#f43f5e' },
                          { cx: 25, cy: 45, r: 5.5, c: '#e11d48' },
                          { cx: 15, cy: 18, r: 6.5, c: '#c026d3' },
                          { cx: 26, cy: 10, r: 7.5, c: '#db2777' },
                          { cx: 32, cy: 22, r: 6, c: '#f43f5e' },
                          { cx: 8, cy: -15, r: 6.5, c: '#e11d48' },
                          { cx: 18, cy: -28, r: 7, c: '#db2777' },
                          { cx: 4, cy: -32, r: 5.5, c: '#c026d3' },
                          { cx: 24, cy: -40, r: 6, c: '#f43f5e' },
                        ].map(f => `<circle cx="${f.cx}" cy="${f.cy}" r="${f.r}" fill="${f.c}" opacity="0.9" filter="url(#bloomSoft)" />`).join('\n                        ')}
                    </g>

                    {/* Giàn hoa giấy góc Tơ Lụa Á Đông & Huỳnh Văn (x: 1450) */}
                    <g transform="translate(1455, 340)" filter="url(#dropShadow)">
                        <path d="M 6,180 Q 12,120 -4,80 Q -16,50 -8,10 Q -2,-20 -18,-45" fill="none" stroke="#3b1d06" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M -4,80 Q -22,65 -30,35 Q -34,15 -26,-10" fill="none" stroke="#3b1d06" strokeWidth="1.6" strokeLinecap="round" />
                        
                        <ellipse cx="2" cy="70" rx="14" ry="10" fill="#14532d" />
                        <ellipse cx="-14" cy="45" rx="16" ry="12" fill="#15803d" />
                        <ellipse cx="-24" cy="15" rx="18" ry="13" fill="#166534" />
                        <ellipse cx="-10" cy="-25" rx="16" ry="11" fill="#15803d" />

                        ${[
                          { cx: 4, cy: 65, r: 5, c: '#db2777' },
                          { cx: -2, cy: 58, r: 6, c: '#e11d48' },
                          { cx: -12, cy: 68, r: 4.5, c: '#c026d3' },
                          { cx: -8, cy: 40, r: 6.5, c: '#db2777' },
                          { cx: -18, cy: 35, r: 7, c: '#f43f5e' },
                          { cx: -25, cy: 45, r: 5.5, c: '#e11d48' },
                          { cx: -15, cy: 18, r: 6.5, c: '#c026d3' },
                          { cx: -26, cy: 10, r: 7.5, c: '#db2777' },
                          { cx: -32, cy: 22, r: 6, c: '#f43f5e' },
                          { cx: -8, cy: -15, r: 6.5, c: '#e11d48' },
                          { cx: -18, cy: -28, r: 7, c: '#db2777' },
                          { cx: -4, cy: -32, r: 5.5, c: '#c026d3' },
                          { cx: -24, cy: -40, r: 6, c: '#f43f5e' },
                        ].map(f => `<circle cx="${f.cx}" cy="${f.cy}" r="${f.r}" fill="${f.c}" opacity="0.9" filter="url(#bloomSoft)" />`).join('\n                        ')}
                    </g>

                    {/* ---------------------------------------------------------------------- */}
                    {/* D. CHẬU KIỂNG CỔ TRUYỀN ĐẶT GỌN GÀNG SÁT CHÂN TƯỜNG CỬA TIỆM           */}
                    {/* (KHÔNG CHE ĐƯỜNG ĐI, KHÔNG CHE CỬA, TÔ ĐIỂM NÉT DUYÊN DÁNG PHỐ CỔ)    */}
                    {/* ---------------------------------------------------------------------- */}
                    ${[
                      // Đặt sát các vách góc nhà (Building corners)
                      { x: 350, type: 'cuc' },
                      { x: 525, type: 'truc' },
                      { x: 642, type: 'cuc' },
                      { x: 795, type: 'cau' },
                      { x: 998, type: 'truc' },
                      { x: 1142, type: 'cuc' },
                      { x: 1276, type: 'cau' },
                      { x: 1462, type: 'truc' },
                      { x: 1672, type: 'cuc' },
                      { x: 1885, type: 'cau' }
                    ].map(p => {
                      if (p.type === 'cau') {
                        return `
                        {/* Chậu cau cảnh dáng thanh thoát sát góc tường x=${p.x} */}
                        <g transform="translate(${p.x}, 528)">
                            <path d="M -5,14 L 5,14 L 6.5,24 L -6.5,24 Z" fill="#9a3412" stroke="#d97706" strokeWidth="0.6" />
                            <line x1="0" y1="14" x2="0" y2="-12" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 0,-12 Q -10,-24 -16,-18" fill="none" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 0,-12 Q 10,-24 16,-18" fill="none" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 0,-12 Q -8,-28 0,-32" fill="none" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 0,-12 Q 8,-28 0,-32" fill="none" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" />
                        </g>`;
                      } else if (p.type === 'truc') {
                        return `
                        {/* Khóm trúc cảnh sát vách tường x=${p.x} */}
                        <g transform="translate(${p.x}, 528)">
                            <path d="M -5,14 L 5,14 L 6.5,24 L -6.5,24 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="0.6" />
                            <line x1="-2" y1="14" x2="-3" y2="-14" stroke="#15803d" strokeWidth="1.3" />
                            <line x1="1" y1="14" x2="2" y2="-18" stroke="#16a34a" strokeWidth="1.3" />
                            <path d="M -3,-8 Q -8,-10 -11,-8" fill="none" stroke="#4ade80" strokeWidth="1.1" />
                            <path d="M 2,-12 Q 7,-14 10,-12" fill="none" stroke="#4ade80" strokeWidth="1.1" />
                        </g>`;
                      } else {
                        return `
                        {/* Chậu hoa cúc mâm xôi vàng rực rỡ đón Rằm x=${p.x} */}
                        <g transform="translate(${p.x}, 532)">
                            <path d="M -4.5,12 L 4.5,12 L 6,20 L -6,20 Z" fill="#9a3412" stroke="#d97706" strokeWidth="0.6" />
                            <circle cx="0" cy="8" r="7.5" fill="#ca8a04" />
                            <circle cx="0" cy="7" r="6.5" fill="#eab308" />
                            <circle cx="0" cy="6" r="5" fill="#fef08a" />
                            <circle cx="-2" cy="5.5" r="1.2" fill="#fff" opacity="0.6" />
                            <circle cx="2" cy="5.5" r="1.2" fill="#fff" opacity="0.6" />
                        </g>`;
                      }
                    }).join('\n')}
                </g>
`;

// Locate start and end of hoian-street-trees-and-willows section
const startIdx = code.indexOf('{/* ============================================================================== */}\n                {/* HÀNG CÂY LIỄU RỦ THƯỚT THA');
const endIdx = code.indexOf('{/* DẢI NGÂN HÀ 50+ ĐÓA HOA ĐĂNG');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate old trees section in code!', { startIdx, endIdx });
  process.exit(1);
}

code = code.substring(0, startIdx) + authenticGreeneryJsx.trim() + '\n\n                ' + code.substring(endIdx);

// Clean up any stray comments
code = code.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for authentic Hoi An greenery!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully updated backdrop with authentic, harmonious greenery!');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
