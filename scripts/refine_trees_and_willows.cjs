const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// Refined Street Trees and Willows
const refinedTreesJsx = `
                {/* ============================================================================== */}
                {/* HÀNG CÂY LIỄU RỦ THƯỚT THA, CÂY BÀNG CỔ THỤ & CÂY KIỂNG DỌC ĐƯỜNG BỜ KÈ PHỐ CỔ */}
                {/* ============================================================================== */}
                <g id="hoian-street-trees-and-willows" filter="url(#dropShadow)">
                    {/* --- CÂY LIỄU RỦ 1 (BỜ SÔNG PHÍA TÂY, x=240, buông cành rủ lãng mạn) --- */}
                    <g transform="translate(240, 480)">
                        {/* Gốc rễ & thân cây liễu cổ uốn lượn phong trần */}
                        <path d="M -12,95 Q -4,45 -18,12 Q -8,-5 8,-15 Q 16,-22 24,-25 Q 10,8 6,48 Q 2,75 12,95 Z" fill="#291407" stroke="#120601" strokeWidth="1.4" />
                        
                        {/* Vòm tán lá liễu mềm mại ở đỉnh cành */}
                        <ellipse cx="4" cy="-16" rx="42" ry="18" fill="#14532d" opacity="0.9" />
                        <ellipse cx="22" cy="-8" rx="36" ry="16" fill="#166534" opacity="0.95" />
                        <ellipse cx="-15" cy="-4" rx="32" ry="14" fill="#15803d" opacity="0.85" />
                        <ellipse cx="8" cy="-22" rx="28" ry="12" fill="#22c55e" opacity="0.75" />

                        {/* Tán cành liễu uốn cong buông rủ thướt tha dập dềnh theo gió */}
                        <g className="animate-willow-1">
                            {/* Cành chính vươn ra mặt nước */}
                            <path d="M 8,-12 Q 40,-15 62,18 Q 72,40 75,82" fill="none" stroke="#291407" strokeWidth="2.6" strokeLinecap="round" />
                            <path d="M -8,5 Q -32,-2 -48,24 Q -58,50 -60,86" fill="none" stroke="#291407" strokeWidth="2.2" strokeLinecap="round" />
                            <path d="M 16,-18 Q 20,-42 44,-38 Q 62,-26 78,8 Q 90,35 92,90" fill="none" stroke="#291407" strokeWidth="1.8" strokeLinecap="round" />
                            
                            {/* Các chuỗi dải lá liễu mềm mại xanh ngọc chạm mặt sông Hoài */}
                            ${[-62, -50, -38, -26, -14, 0, 14, 28, 42, 56, 70, 84, 96].map((lx, i) => `
                            <path d="M ${lx - 8},${10 + (i % 4) * 8} Q ${lx},${42 + (i % 3) * 12} ${lx + 6},${84 + (i % 5) * 10}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#15803d' : '#16a34a'}" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
                            <path d="M ${lx - 6},${20 + (i % 4) * 8} Q ${lx + 3},${52 + (i % 3) * 12} ${lx + 8},${92 + (i % 5) * 10}" 
                                  fill="none" stroke="#86efac" strokeWidth="1.2" strokeDasharray="4,4" opacity="0.8" />
                            `).join('')}

                            {/* Đèn lồng giấy đỏ treo trên cành liễu */}
                            <ellipse cx="48" cy="24" rx="4.2" ry="6.5" fill="#ef4444" filter="url(#bloomSoft)" />
                            <line x1="48" y1="18" x2="48" y2="24" stroke="#78350f" strokeWidth="0.8" />
                        </g>
                    </g>

                    {/* --- CÂY LIỄU RỦ 2 (BỜ SÔNG TRUNG TÂM, x=740) --- */}
                    <g transform="translate(740, 480)">
                        <path d="M -10,95 Q -2,48 -14,14 Q -4,-4 12,-12 Q 18,-18 24,-20 Q 10,8 6,52 Q 2,78 10,95 Z" fill="#291407" stroke="#120601" strokeWidth="1.4" />
                        <ellipse cx="6" cy="-14" rx="40" ry="17" fill="#14532d" opacity="0.9" />
                        <ellipse cx="20" cy="-6" rx="34" ry="15" fill="#166534" opacity="0.95" />
                        <ellipse cx="-12" cy="-2" rx="30" ry="13" fill="#15803d" opacity="0.85" />

                        <g className="animate-willow-2">
                            <path d="M 12,-10 Q 42,-14 64,15 Q 74,38 76,82" fill="none" stroke="#291407" strokeWidth="2.4" strokeLinecap="round" />
                            <path d="M -6,6 Q -28,-2 -44,24 Q -52,48 -54,85" fill="none" stroke="#291407" strokeWidth="2" strokeLinecap="round" />
                            ${[-54, -40, -26, -12, 4, 18, 34, 50, 66, 80].map((lx, i) => `
                            <path d="M ${lx - 8},${12 + (i % 4) * 8} Q ${lx},${44 + (i % 3) * 11} ${lx + 5},${86 + (i % 5) * 9}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#16a34a' : '#15803d'}" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
                            <path d="M ${lx - 6},${22 + (i % 4) * 8} Q ${lx + 3},${54 + (i % 3) * 11} ${lx + 6},${94 + (i % 5) * 9}" 
                                  fill="none" stroke="#4ade80" strokeWidth="1.2" strokeDasharray="3,4" opacity="0.75" />
                            `).join('')}
                            <ellipse cx="-28" cy="26" rx="4.2" ry="6.5" fill="#f59e0b" filter="url(#bloomSoft)" />
                        </g>
                    </g>

                    {/* --- CÂY LIỄU RỦ 3 (BỜ SÔNG ĐÔNG, x=1220) --- */}
                    <g transform="translate(1220, 480)">
                        <path d="M -10,95 Q -2,45 -15,14 Q -6,-3 10,-12 Q 16,-18 24,-20 Q 12,8 7,50 Q 3,78 11,95 Z" fill="#291407" stroke="#120601" strokeWidth="1.4" />
                        <ellipse cx="6" cy="-14" rx="42" ry="17" fill="#14532d" opacity="0.9" />
                        <ellipse cx="22" cy="-6" rx="35" ry="15" fill="#166534" opacity="0.95" />
                        <ellipse cx="-14" cy="-2" rx="30" ry="13" fill="#15803d" opacity="0.85" />

                        <g className="animate-willow-1">
                            <path d="M 10,-10 Q 40,-12 60,18 Q 70,40 72,82" fill="none" stroke="#291407" strokeWidth="2.4" strokeLinecap="round" />
                            <path d="M -6,5 Q -28,-3 -44,24 Q -52,48 -54,84" fill="none" stroke="#291407" strokeWidth="2" strokeLinecap="round" />
                            ${[-54, -40, -26, -12, 4, 18, 34, 50, 66, 78].map((lx, i) => `
                            <path d="M ${lx - 8},${12 + (i % 4) * 8} Q ${lx},${44 + (i % 3) * 11} ${lx + 5},${86 + (i % 5) * 9}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#15803d' : '#16a34a'}" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
                            <path d="M ${lx - 6},${22 + (i % 4) * 8} Q ${lx + 3},${54 + (i % 3) * 11} ${lx + 6},${94 + (i % 5) * 9}" 
                                  fill="none" stroke="#86efac" strokeWidth="1.2" strokeDasharray="4,4" opacity="0.8" />
                            `).join('')}
                            <ellipse cx="50" cy="24" rx="4.2" ry="6.5" fill="#ef4444" filter="url(#bloomSoft)" />
                        </g>
                    </g>

                    {/* --- CÂY LIỄU RỦ 4 (BỜ SÔNG ĐÔNG HẠ LƯU, x=1690) --- */}
                    <g transform="translate(1690, 480)">
                        <path d="M -10,95 Q -2,46 -14,14 Q -4,-4 12,-12 Q 18,-18 24,-20 Q 10,8 6,52 Q 2,78 10,95 Z" fill="#291407" stroke="#120601" strokeWidth="1.4" />
                        <ellipse cx="6" cy="-14" rx="40" ry="17" fill="#14532d" opacity="0.9" />
                        <ellipse cx="20" cy="-6" rx="34" ry="15" fill="#166534" opacity="0.95" />
                        <ellipse cx="-12" cy="-2" rx="30" ry="13" fill="#15803d" opacity="0.85" />

                        <g className="animate-willow-2">
                            <path d="M 12,-10 Q 42,-14 64,15 Q 74,38 76,82" fill="none" stroke="#291407" strokeWidth="2.4" strokeLinecap="round" />
                            <path d="M -6,6 Q -28,-2 -44,24 Q -52,48 -54,85" fill="none" stroke="#291407" strokeWidth="2" strokeLinecap="round" />
                            ${[-54, -40, -26, -12, 4, 18, 34, 50, 66, 80].map((lx, i) => `
                            <path d="M ${lx - 8},${12 + (i % 4) * 8} Q ${lx},${44 + (i % 3) * 11} ${lx + 5},${86 + (i % 5) * 9}" 
                                  fill="none" stroke="${i % 2 === 0 ? '#16a34a' : '#15803d'}" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
                            <path d="M ${lx - 6},${22 + (i % 4) * 8} Q ${lx + 3},${54 + (i % 3) * 11} ${lx + 6},${94 + (i % 5) * 9}" 
                                  fill="none" stroke="#4ade80" strokeWidth="1.2" strokeDasharray="3,4" opacity="0.75" />
                            `).join('')}
                            <ellipse cx="-28" cy="26" rx="4.2" ry="6.5" fill="#f59e0b" filter="url(#bloomSoft)" />
                        </g>
                    </g>

                    {/* --- 2 CÂY BÀNG CỔ THỤ VEN ĐƯỜNG PHỐ CỔ --- */}
                    {/* Cây bàng 1 (x=450) */}
                    <g transform="translate(450, 430)">
                        <path d="M -16,145 Q -8,70 -24,15 Q -10,-20 18,-45 Q 30,-12 16,70 Q 10,110 18,145 Z" fill="#3b1d06" stroke="#1c0a02" strokeWidth="1.6" />
                        <ellipse cx="-18" cy="-28" rx="42" ry="22" fill="#14532d" opacity="0.95" />
                        <ellipse cx="16" cy="-50" rx="48" ry="26" fill="#166534" opacity="0.95" />
                        <ellipse cx="40" cy="-24" rx="38" ry="20" fill="#15803d" opacity="0.9" />
                        <ellipse cx="8" cy="-62" rx="34" ry="18" fill="#22c55e" opacity="0.8" />
                        <ellipse cx="32" cy="-10" rx="4.5" ry="7" fill="#ef4444" filter="url(#bloomSoft)" />
                    </g>

                    {/* Cây bàng 2 (x=1440) */}
                    <g transform="translate(1440, 430)">
                        <path d="M -14,145 Q -6,70 -20,15 Q -8,-20 16,-45 Q 26,-12 14,70 Q 8,110 16,145 Z" fill="#3b1d06" stroke="#1c0a02" strokeWidth="1.6" />
                        <ellipse cx="-16" cy="-28" rx="40" ry="22" fill="#14532d" opacity="0.95" />
                        <ellipse cx="14" cy="-48" rx="46" ry="25" fill="#166534" opacity="0.95" />
                        <ellipse cx="38" cy="-22" rx="36" ry="19" fill="#15803d" opacity="0.9" />
                        <ellipse cx="6" cy="-60" rx="32" ry="17" fill="#22c55e" opacity="0.8" />
                        <ellipse cx="-20" cy="-10" rx="4.5" ry="7" fill="#f59e0b" filter="url(#bloomSoft)" />
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
                            <line x1="0" y1="22" x2="0" y2="-15" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
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
                            <line x1="-3" y1="22" x2="-5" y2="-20" stroke="#15803d" strokeWidth="1.6" />
                            <line x1="0" y1="22" x2="1" y2="-28" stroke="#16a34a" strokeWidth="1.6" />
                            <line x1="3" y1="22" x2="6" y2="-18" stroke="#15803d" strokeWidth="1.6" />
                            <path d="M -5,-15 Q -12,-18 -16,-15" fill="none" stroke="#4ade80" strokeWidth="1.4" />
                            <path d="M 1,-22 Q 8,-25 12,-22" fill="none" stroke="#4ade80" strokeWidth="1.4" />
                            <path d="M 6,-12 Q 14,-15 17,-12" fill="none" stroke="#4ade80" strokeWidth="1.4" />
                        </g>`;
                      } else {
                        return `
                        {/* Chậu hoa cúc mâm xôi vàng rực đón Tết Trung Thu tại x=${p.x} */}
                        <g transform="translate(${p.x}, 542)">
                            <path d="M -6,18 L 6,18 L 8,30 L -8,30 Z" fill="#9a3412" stroke="#d97706" strokeWidth="0.8" />
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

// Replace the old street trees group
const oldTreesStart = code.indexOf('{/* ============================================================================== */}\n                {/* HÀNG CÂY LIỄU RỦ');
const oldTreesEnd = code.indexOf('{/* DẢI NGÂN HÀ 50+ ĐÓA HOA ĐĂNG');

if (oldTreesStart !== -1 && oldTreesEnd !== -1) {
  code = code.substring(0, oldTreesStart) + refinedTreesJsx.trim() + '\n\n                ' + code.substring(oldTreesEnd);
  console.log('Successfully refined trees and willows!');
} else {
  console.error('Could not locate old trees section!');
  process.exit(1);
}

// Clean up any stray comments
code = code.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for refined trees and willows!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully saved to', backdropPath);
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
