const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// The street surface is at y = 515.
// The stone wall goes from y = 515 to y = 542.
// The water starts below y = 542.
// Therefore, the trees must be planted ON THE STREET WALKWAY (y = 515)!
// When translate(x, 515):
// Ground is at y = 0.
// Tree trunk rises from y = 0 up to y = -95.
// Bồn cây viền đá sitting on street: rect x="-14" y="-3" width="28" height="5" rx="1.5"
// Branches originate at y = -90 and weep downwards to y = +30 (draping over the stone wall into water).

const fixedGreeneryJsx = `
                {/* ============================================================================== */}
                {/* HỆ THỐNG CÂY XANH & CẢNH QUAN PHỐ CỔ HỘI AN (CHUẨN XÁC: MỌC TRÊN BỜ ĐƯỜNG)       */}
                {/* (GỐC CÂY TRỒNG TRONG BỒN ĐÁ TRÊN VỈA HÈ BỜ KÈ, CÀNH LIỄU MỀM RỦ XUỐNG SÔNG)    */}
                {/* ============================================================================== */}
                <g id="hoian-authentic-greenery" filter="url(#dropShadow)">
                    {/* ---------------------------------------------------------------------- */}
                    {/* A. VÒM CÂY BÓNG MÁT CỔ THỤ PHÍA SAU CÁC MÁI NGÓI (TẠO ĐỘ SÂU BỐ CỤC)     */}
                    {/* ---------------------------------------------------------------------- */}
                    <g opacity="0.85">
                        {/* Vòm cây sau mái nhà Trà Quán (x: 230) */}
                        <ellipse cx="230" cy="235" rx="46" ry="24" fill="#0f3822" />
                        <ellipse cx="270" cy="225" rx="52" ry="28" fill="#14532d" />
                        <ellipse cx="250" cy="210" rx="38" ry="20" fill="#166534" />
                        <circle cx="260" cy="205" r="8" fill="#22c55e" opacity="0.6" />

                        {/* Vòm cây sau mái Quảng Đông Hội Quán (x: 810) */}
                        <ellipse cx="790" cy="225" rx="44" ry="24" fill="#0f3822" />
                        <ellipse cx="835" cy="215" rx="48" ry="26" fill="#14532d" />
                        <ellipse cx="810" cy="200" rx="36" ry="18" fill="#166534" />
                        <circle cx="825" cy="198" r="7" fill="#22c55e" opacity="0.5" />

                        {/* Vòm cây sau mái Bánh Mì & Tơ Lụa (x: 1265) */}
                        <ellipse cx="1245" cy="230" rx="42" ry="22" fill="#0f3822" />
                        <ellipse cx="1285" cy="218" rx="46" ry="25" fill="#14532d" />
                        <ellipse cx="1265" cy="205" rx="34" ry="18" fill="#166534" />

                        {/* Vòm cây sau mái Cà Phê Faifo (x: 1700) */}
                        <ellipse cx="1680" cy="235" rx="45" ry="24" fill="#0f3822" />
                        <ellipse cx="1725" cy="222" rx="50" ry="26" fill="#14532d" />
                        <ellipse cx="1700" cy="208" rx="36" ry="18" fill="#166534" />
                        <circle cx="1715" cy="204" r="8" fill="#22c55e" opacity="0.5" />
                    </g>

                    {/* ---------------------------------------------------------------------- */}
                    {/* B. CÂY LIỄU RỦ TRỒNG TRÊN VỈA HÈ BỜ KÈ (GỐC TRÊN BỜ, CÀNH RỦ XUỐNG SÔNG) */}
                    {/* ---------------------------------------------------------------------- */}
                    
                    {/* CÂY LIỄU TẢ NGẠN (BỜ TÂY, x: 80, gốc trồng trên mặt đường vỉa hè y=515) */}
                    <g transform="translate(80, 515)">
                        {/* Bồn cây viền đá granite xám cổ trên mặt vỉa hè bờ kè */}
                        <rect x="-14" y="-3" width="28" height="5" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                        <ellipse cx="0" cy="-2" rx="12" ry="2" fill="#0f172a" />

                        {/* Thân cây liễu cổ thụ mọc TỪ MẶT ĐẤT VƯƠN LÊN CAO (từ y=0 lên y=-90) */}
                        <path d="M -7,0 Q -4,-35 -14,-65 Q -8,-80 8,-92 Q 14,-98 22,-100 Q 8,-65 5,-35 Q 2,-15 7,0 Z" fill="#291407" stroke="#120601" strokeWidth="1.2" />
                        
                        {/* Vòm tán lá liễu ở đỉnh ngọn cây trên cao */}
                        <ellipse cx="12" cy="-96" rx="36" ry="17" fill="#14532d" opacity="0.9" />
                        <ellipse cx="28" cy="-88" rx="30" ry="15" fill="#166534" opacity="0.95" />
                        <ellipse cx="-8" cy="-84" rx="26" ry="13" fill="#15803d" opacity="0.85" />
                        <circle cx="16" cy="-100" r="9" fill="#22c55e" opacity="0.65" />

                        {/* Các cành liễu buông rủ từ trên cao (y=-90) dập dềnh xuống mép nước (y=+25) */}
                        <g className="animate-willow-1">
                            {/* Cành liễu uốn cong buông xuống */}
                            <path d="M 8,-90 Q 45,-85 65,-50 Q 72,-20 74,25" fill="none" stroke="#291407" strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M -6,-75 Q -28,-70 -42,-45 Q -48,-15 -50,22" fill="none" stroke="#291407" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M 18,-95 Q 24,-115 48,-110 Q 66,-98 80,-60 Q 90,-25 92,30" fill="none" stroke="#291407" strokeWidth="1.6" strokeLinecap="round" />
                            
                            {/* Dải lá liễu rủ mềm mại buông từ trên cao xuống mép nước */}
                            ${[-48, -36, -24, -12, 0, 14, 28, 42, 56, 70, 82, 92].map((lx, i) => `
                            <path d="M ${lx},${-60 + (i % 4) * 8} Q ${lx + 6},${-20 + (i % 3) * 12} ${lx + 2},${20 + (i % 5) * 6}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#15803d' : '#16a34a'}" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx + 2},${-50 + (i % 4) * 8} Q ${lx + 8},${-10 + (i % 3) * 12} ${lx + 4},${26 + (i % 5) * 6}" 
                                  fill="none" stroke="#86efac" strokeWidth="1.1" strokeDasharray="3,3" opacity="0.75" />
                            `).join('')}

                            {/* Đèn lồng đỏ treo trên cành liễu soi bóng xuống sông */}
                            <ellipse cx="48" cy="-35" rx="3.8" ry="5.8" fill="#ef4444" filter="url(#bloomSoft)" />
                            <line x1="48" y1="-42" x2="48" y2="-35" stroke="#78350f" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* CÂY LIỄU HỮU NGẠN (BỜ ĐÔNG, x: 1845, gốc trồng trên mặt đường vỉa hè y=515) */}
                    <g transform="translate(1845, 515)">
                        {/* Bồn cây viền đá granite xám cổ trên mặt vỉa hè bờ kè */}
                        <rect x="-14" y="-3" width="28" height="5" rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
                        <ellipse cx="0" cy="-2" rx="12" ry="2" fill="#0f172a" />

                        {/* Thân cây liễu cổ thụ mọc TỪ MẶT ĐẤT VƯƠN LÊN CAO */}
                        <path d="M 7,0 Q 4,-35 14,-65 Q 8,-80 -8,-92 Q -14,-98 -22,-100 Q -8,-65 -5,-35 Q -2,-15 -7,0 Z" fill="#291407" stroke="#120601" strokeWidth="1.2" />
                        <ellipse cx="-12" cy="-96" rx="36" ry="17" fill="#14532d" opacity="0.9" />
                        <ellipse cx="-28" cy="-88" rx="30" ry="15" fill="#166534" opacity="0.95" />
                        <ellipse cx="8" cy="-84" rx="26" ry="13" fill="#15803d" opacity="0.85" />

                        <g className="animate-willow-2">
                            <path d="M -8,-90 Q -45,-85 -65,-50 Q -72,-20 -74,25" fill="none" stroke="#291407" strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M 6,-75 Q 28,-70 42,-45 Q 48,-15 50,22" fill="none" stroke="#291407" strokeWidth="1.8" strokeLinecap="round" />
                            
                            ${[-84, -72, -58, -44, -30, -16, 0, 14, 28, 42, 52].map((lx, i) => `
                            <path d="M ${lx},${-60 + (i % 4) * 8} Q ${lx - 6},${-20 + (i % 3) * 12} ${lx - 2},${20 + (i % 5) * 6}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#16a34a' : '#15803d'}" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                            <path d="M ${lx - 2},${-50 + (i % 4) * 8} Q ${lx - 8},${-10 + (i % 3) * 12} ${lx - 4},${26 + (i % 5) * 6}" 
                                  fill="none" stroke="#4ade80" strokeWidth="1.1" strokeDasharray="3,3" opacity="0.75" />
                            `).join('')}
                            <ellipse cx="-45" cy="-35" rx="3.8" ry="5.8" fill="#f59e0b" filter="url(#bloomSoft)" />
                            <line x1="-45" y1="-42" x2="-45" y2="-35" stroke="#78350f" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* ---------------------------------------------------------------------- */}
                    {/* C. GIÀN HOA GIẤY HỘI AN RỰC RỠ (BOUGAINVILLEA LEO TƯỜNG & MÁI NGÓI)    */}
                    {/* ---------------------------------------------------------------------- */}
                    {/* Giàn hoa giấy góc trái nhà cổ Trà Quán (x: 365) */}
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

                    {/* Giàn hoa giấy góc Tơ Lụa Á Đông (x: 1455) */}
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
                      { x: 1672, type: 'cuc' },
                      { x: 1885, type: 'cau' }
                    ].map(p => {
                      if (p.type === 'cau') {
                        return `
                        {/* Chậu cau cảnh sát góc tường x=${p.x} trên vỉa hè y=515 */}
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
                        {/* Khóm trúc cảnh sát vách tường x=${p.x} trên vỉa hè y=515 */}
                        <g transform="translate(${p.x}, 515)">
                            <path d="M -5,-10 L 5,-10 L 6.5,0 L -6.5,0 Z" fill="#78350f" stroke="#ca8a04" strokeWidth="0.6" />
                            <line x1="-2" y1="-10" x2="-3" y2="-32" stroke="#15803d" strokeWidth="1.3" />
                            <line x1="1" y1="-10" x2="2" y2="-36" stroke="#16a34a" strokeWidth="1.3" />
                            <path d="M -3,-24 Q -8,-26 -11,-24" fill="none" stroke="#4ade80" strokeWidth="1.1" />
                            <path d="M 2,-28 Q 7,-30 10,-28" fill="none" stroke="#4ade80" strokeWidth="1.1" />
                        </g>`;
                      } else {
                        return `
                        {/* Chậu hoa cúc mâm xôi vàng rực rỡ đón Rằm x=${p.x} trên vỉa hè y=515 */}
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

// Locate start and end of hoian-authentic-greenery section
const startIdx = code.indexOf('{/* ============================================================================== */}\n                {/* HỆ THỐNG CÂY XANH & CẢNH QUAN PHỐ CỔ');
const endIdx = code.indexOf('{/* DẢI NGÂN HÀ 50+ ĐÓA HOA ĐĂNG');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate old greenery section in code!', { startIdx, endIdx });
  process.exit(1);
}

code = code.substring(0, startIdx) + fixedGreeneryJsx.trim() + '\n\n                ' + code.substring(endIdx);

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for trees rooted on land!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully fixed trees to be firmly rooted on land!');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
