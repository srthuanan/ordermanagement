const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// 1. Remove willow animation classes from CSS (set to none / stationary)
code = code.replace(
  /\.animate-willow-1\s*\{[^}]*\}/g,
  '.animate-willow-1 { transform: none !important; animation: none !important; }'
);
code = code.replace(
  /\.animate-willow-2\s*\{[^}]*\}/g,
  '.animate-willow-2 { transform: none !important; animation: none !important; }'
);

// 2. Re-craft the willows:
// - Completely STATIC (đứng im, không rung lắc)
// - Shifted to the edges (x=50 on left, x=1890 on right) so they frame the screen and do NOT block Cà Phê Faifo or Trà Quán
// - Soft, natural artistic willow branches with graceful drooping curves instead of straight cage-like bars
// - Beautiful weeping foliage that looks authentic and gentle

const staticWillowsJsx = `
                {/* ============================================================================== */}
                {/* HỆ THỐNG CÂY XANH & CẢNH QUAN PHỐ CỔ HỘI AN (CÂY LIỄU ĐỨNG IM THANH BÌNH)         */}
                {/* ============================================================================== */}
                <g id="hoian-authentic-greenery" filter="url(#dropShadow)">
                    {/* ---------------------------------------------------------------------- */}
                    {/* A. VÒM CÂY BÓNG MÁT CỔ THỤ PHÍA SAU CÁC MÁI NGÓI (TẠO ĐỘ SÂU BỐ CỤC)     */}
                    {/* ---------------------------------------------------------------------- */}
                    <g opacity="0.85">
                        <ellipse cx="230" cy="235" rx="46" ry="24" fill="#0f3822" />
                        <ellipse cx="270" cy="225" rx="52" ry="28" fill="#14532d" />
                        <ellipse cx="250" cy="210" rx="38" ry="20" fill="#166534" />
                        <circle cx="260" cy="205" r="8" fill="#22c55e" opacity="0.6" />

                        <ellipse cx="790" cy="225" rx="44" ry="24" fill="#0f3822" />
                        <ellipse cx="835" cy="215" rx="48" ry="26" fill="#14532d" />
                        <ellipse cx="810" cy="200" rx="36" ry="18" fill="#166534" />
                        <circle cx="825" cy="198" r="7" fill="#22c55e" opacity="0.5" />

                        <ellipse cx="1245" cy="230" rx="42" ry="22" fill="#0f3822" />
                        <ellipse cx="1285" cy="218" rx="46" ry="25" fill="#14532d" />
                        <ellipse cx="1265" cy="205" rx="34" ry="18" fill="#166534" />

                        <ellipse cx="1680" cy="235" rx="45" ry="24" fill="#0f3822" />
                        <ellipse cx="1725" cy="222" rx="50" ry="26" fill="#14532d" />
                        <ellipse cx="1700" cy="208" rx="36" ry="18" fill="#166534" />
                        <circle cx="1715" cy="204" r="8" fill="#22c55e" opacity="0.5" />
                    </g>

                    {/* ---------------------------------------------------------------------- */}
                    {/* B. CÂY LIỄU RỦ ĐỨNG IM (TĨNH LẶNG, MỀM MẠI, ÔM HAI BÊN MÉP KHUNG HÌNH) */}
                    {/* Gốc trồng vững chãi trên vỉa hè y=515, không che khuất cửa tiệm          */}
                    {/* ---------------------------------------------------------------------- */}
                    
                    {/* CÂY LIỄU TẢ NGẠN (GÓC TÂY, x: 50, đứng im thanh bình) */}
                    <g transform="translate(50, 515)">
                        {/* Bồn đá cổ trên vỉa hè bờ kè */}
                        <rect x="-12" y="-3" width="24" height="5" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

                        {/* Thân cây liễu cổ thụ uốn cong tự nhiên */}
                        <path d="M -6,0 Q -3,-35 -12,-65 Q -6,-80 8,-90 Q 14,-96 20,-98 Q 6,-65 4,-35 Q 2,-15 6,0 Z" fill="#291407" stroke="#120601" strokeWidth="1.2" />
                        
                        {/* Tán vòm lá liễu mềm mại tĩnh tại */}
                        <ellipse cx="10" cy="-94" rx="32" ry="16" fill="#14532d" opacity="0.9" />
                        <ellipse cx="24" cy="-86" rx="26" ry="14" fill="#166534" opacity="0.95" />
                        <ellipse cx="-6" cy="-82" rx="24" ry="12" fill="#15803d" opacity="0.85" />
                        <circle cx="12" cy="-98" r="8" fill="#22c55e" opacity="0.65" />

                        {/* Các nhánh liễu buông lơi tự nhiên, ĐỨNG IM HOÀN TOÀN */}
                        <g>
                            <path d="M 8,-88 Q 35,-80 52,-48 Q 58,-15 56,22" fill="none" stroke="#291407" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M -6,-74 Q -22,-68 -32,-42 Q -38,-15 -36,18" fill="none" stroke="#291407" strokeWidth="1.5" strokeLinecap="round" />
                            
                            {/* Dải lá liễu rủ mềm mại buông tĩnh lặng */}
                            ${[-36, -26, -14, 0, 12, 24, 36, 48, 58].map((lx, i) => `
                            <path d="M ${lx},${-55 + (i % 3) * 8} Q ${lx + 5},${-15 + (i % 3) * 10} ${lx + 1},${18 + (i % 4) * 6}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#15803d' : '#16a34a'}" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx + 2},${-45 + (i % 3) * 8} Q ${lx + 7},${-5 + (i % 3) * 10} ${lx + 3},${22 + (i % 4) * 6}" 
                                  fill="none" stroke="#86efac" strokeWidth="1" strokeDasharray="3,3" opacity="0.75" />
                            `).join('')}

                            {/* Đèn lồng đỏ tĩnh tại buông từ cành */}
                            <ellipse cx="38" cy="-30" rx="3.5" ry="5.5" fill="#ef4444" filter="url(#bloomSoft)" />
                            <line x1="38" y1="-36" x2="38" y2="-30" stroke="#78350f" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* CÂY LIỄU HỮU NGẠN (GÓC ĐÔNG, x: 1895, ngoài cửa Faifo, đứng im thanh bình) */}
                    <g transform="translate(1895, 515)">
                        <rect x="-12" y="-3" width="24" height="5" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />

                        <path d="M 6,0 Q 3,-35 12,-65 Q 6,-80 -8,-90 Q -14,-96 -20,-98 Q -6,-65 -4,-35 Q -2,-15 -6,0 Z" fill="#291407" stroke="#120601" strokeWidth="1.2" />
                        <ellipse cx="-10" cy="-94" rx="32" ry="16" fill="#14532d" opacity="0.9" />
                        <ellipse cx="-24" cy="-86" rx="26" ry="14" fill="#166534" opacity="0.95" />
                        <ellipse cx="6" cy="-82" rx="24" ry="12" fill="#15803d" opacity="0.85" />

                        {/* Các nhánh liễu buông lơi tự nhiên, ĐỨNG IM HOÀN TOÀN */}
                        <g>
                            <path d="M -8,-88 Q -35,-80 -52,-48 Q -58,-15 -56,22" fill="none" stroke="#291407" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 6,-74 Q 22,-68 32,-42 Q 38,-15 36,18" fill="none" stroke="#291407" strokeWidth="1.5" strokeLinecap="round" />
                            
                            ${[-58, -48, -36, -24, -12, 0, 14, 26, 36].map((lx, i) => `
                            <path d="M ${lx},${-55 + (i % 3) * 8} Q ${lx - 5},${-15 + (i % 3) * 10} ${lx - 1},${18 + (i % 4) * 6}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#16a34a' : '#15803d'}" strokeWidth="1.8" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx - 2},${-45 + (i % 3) * 8} Q ${lx - 7},${-5 + (i % 3) * 10} ${lx - 3},${22 + (i % 4) * 6}" 
                                  fill="none" stroke="#4ade80" strokeWidth="1" strokeDasharray="3,3" opacity="0.75" />
                            `).join('')}
                            <ellipse cx="-38" cy="-30" rx="3.5" ry="5.5" fill="#f59e0b" filter="url(#bloomSoft)" />
                            <line x1="-38" y1="-36" x2="-38" y2="-30" stroke="#78350f" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* ---------------------------------------------------------------------- */}
                    {/* C. GIÀN HOA GIẤY HỘI AN RỰC RỠ (BOUGAINVILLEA LEO TƯỜNG & MÁI NGÓI)    */}
                    {/* ---------------------------------------------------------------------- */}
                    <g transform="translate(365, 340)" filter="url(#dropShadow)">
                        <path d="M -6,180 Q -12,120 4,80 Q 16,50 8,10 Q 2,-20 18,-45" fill="none" stroke="#3b1d06" strokeWidth="2.2" strokeLinecap="round" />
                        <path d="M 4,80 Q 22,65 32,35 Q 36,15 28,-10" fill="none" stroke="#3b1d06" strokeWidth="1.6" strokeLinecap="round" />
                        <ellipse cx="-2" cy="70" rx="14" ry="10" fill="#14532d" />
                        <ellipse cx="14" cy="45" rx="16" ry="12" fill="#15803d" />
                        <ellipse cx="24" cy="15" rx="18" ry="13" fill="#166534" />
                        <ellipse cx="10" cy="-25" rx="16" ry="11" fill="#15803d" />
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
                    {/* D. CHẬU KIỂNG CỔ TRUYỀN ĐẶT GỌN GÀNG TRÊN VỈA HÈ SÁT CHÂN TƯỜNG         */}
                    {/* ---------------------------------------------------------------------- */}
                    ${[
                      { x: 350, type: 'cuc' },
                      { x: 525, type: 'truc' },
                      { x: 642, type: 'cuc' },
                      { x: 795, type: 'cau' },
                      { x: 998, type: 'truc' },
                      { x: 1142, type: 'cuc' },
                      { x: 1276, type: 'cau' },
                      { x: 1462, type: 'truc' },
                      { x: 1672, type: 'cuc' }
                    ].map(p => {
                      if (p.type === 'cau') {
                        return `
                        <g transform="translate(${p.x}, 515)">
                            <path d="M -5,-10 L 5,-10 L 6.5,0 L -6.5,0 Z" fill="#9a3412" stroke="#d97706" strokeWidth="0.6" />
                            <line x1="0" y1="-10" x2="0" y2="-32" stroke="#15803d" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 0,-32 Q -10,-44 -16,-38" fill="none" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 0,-32 Q 10,-44 16,-38" fill="none" stroke="#22c55e" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 0,-32 Q -8,-48 0,-52" fill="none" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M 0,-32 Q 8,-48 0,-52" fill="none" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" />
                        </g>`;
                      } else if (p.type === 'truc') {
                        return `
                        <g transform="translate(${p.x}, 515)">
                            <path d="M -5,-10 L 5,-10 L 6.5,0 L -6.5,0 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="0.6" />
                            <line x1="-2" y1="-10" x2="-3" y2="-32" stroke="#15803d" strokeWidth="1.3" />
                            <line x1="1" y1="-10" x2="2" y2="-36" stroke="#16a34a" strokeWidth="1.3" />
                            <path d="M -3,-24 Q -8,-26 -11,-24" fill="none" stroke="#4ade80" strokeWidth="1.1" />
                            <path d="M 2,-28 Q 7,-30 10,-28" fill="none" stroke="#4ade80" strokeWidth="1.1" />
                        </g>`;
                      } else {
                        return `
                        <g transform="translate(${p.x}, 515)">
                            <path d="M -4.5,-8 L 4.5,-8 L 6,0 L -6,0 Z" fill="#9a3412" stroke="#d97706" strokeWidth="0.6" />
                            <circle cx="0" cy="-12" r="7.5" fill="#ca8a04" />
                            <circle cx="0" cy="-13" r="6.5" fill="#eab308" />
                            <circle cx="0" cy="-14" r="5" fill="#fef08a" />
                            <circle cx="-2" cy="-14.5" r="1.2" fill="#fff" opacity="0.6" />
                            <circle cx="2" cy="-14.5" r="1.2" fill="#fff" opacity="0.6" />
                        </g>`;
                      }
                    }).join('\n')}
                </g>
`;

// Replace in code
const startIdx = code.indexOf('{/* ============================================================================== */}\n                {/* HỆ THỐNG CÂY XANH & CẢNH QUAN PHỐ CỔ');
const endIdx = code.indexOf('{/* DẢI NGÂN HÀ 50+ ĐÓA HOA ĐĂNG');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate old greenery section in code!', { startIdx, endIdx });
  process.exit(1);
}

code = code.substring(0, startIdx) + staticWillowsJsx.trim() + '\n\n                ' + code.substring(endIdx);

// Clean up any stray comments
code = code.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for static willows!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully made willows stay completely still and moved outside Faifo!');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
