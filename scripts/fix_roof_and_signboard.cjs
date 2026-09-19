const fs = require('fs');
const esbuild = require('esbuild');

const targetPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(targetPath, 'utf8');

// 1. Clean up any previous injection of cao-lau-roof or quang-dong-signboard to start fresh
const oldRoofMarker = '{/* MÁI NGÓI ÂM DƯƠNG CỔ KÍNH NHÀ CAO LẦU BÀ BÉ (NÓC NHÀ DI SẢN)         */}';
if (code.includes(oldRoofMarker)) {
  const rStart = code.indexOf('<g id="cao-lau-roof"');
  const rEnd = code.indexOf('</g>\n', rStart) + 5;
  code = code.substring(0, rStart) + code.substring(rEnd);
}

const oldSignMarker = '<g id="quang-dong-signboard"';
if (code.includes(oldSignMarker)) {
  const sStart = code.indexOf(oldSignMarker);
  const sEnd = code.indexOf('</g>\n', sStart) + 5;
  code = code.substring(0, sStart) + code.substring(sEnd);
}

// 2. Remove the stray floating curve at line 1525 in nhaco-tan-ky
const strayCurve = '<path d="M 322,72 Q 338,67 332,52" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />';
if (code.includes(strayCurve)) {
  code = code.replace(strayCurve, '');
  console.log('Removed stray floating roof curl from nhaco-tan-ky!');
}

const curlAt116 = '<path d="M 116,78 Q 100,73 106,58" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />';
if (code.includes(curlAt116)) {
  code = code.replace(curlAt116, '{/* Mái liền kề giao duyên giữa Cao Lầu và Hội Quán */}');
  console.log('Removed awkward curl at x=116!');
}

// 3. SEAMLESS ROOF OVER CAO LẦU BÀ BÉ (x: -50 to 120, y: 38 to 78)
// Matches authentic Hội An terracotta yin-yang tile roof
const caoLauRoofJsx = `
        {/* ==================================================================== */}
        {/* MÁI NGÓI ÂM DƯƠNG CỔ KÍNH NHÀ CAO LẦU BÀ BÉ (NÓC NHÀ DI SẢN)         */}
        {/* ==================================================================== */}
        <g id="cao-lau-roof" filter="url(#dropShadow)">
            {/* Thân mái ngói âm dương màu đất nung tráng men rêu phong cổ kính */}
            <path d="M -50,78 
                     Q 35,70 120,76 
                     L 112,41 
                     Q 35,35 -40,42 Z" 
                  fill="url(#roofTerracotta)" stroke="#1c0a02" strokeWidth="1.8" />
            
            {/* Gờ chỉ xà gồ gỗ lim chạy dọc mép hiên */}
            <path d="M -50,78 Q 35,70 120,76" fill="none" stroke="#240f02" strokeWidth="3" strokeLinecap="round" />
            <path d="M -50,78 Q 35,70 120,76" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.6" strokeLinecap="round" />

            {/* Các hàng ngói âm dương xuôi mái với đường đổ bóng 3D */}
            ${[-36, -22, -8, 6, 20, 34, 48, 62, 76, 90, 104].map((rx, idx) => {
              const topX = rx - 4;
              const topY = 38 + (idx % 2) * 1.5;
              const botX = rx + (idx < 5 ? -6 : 5);
              const botY = 74 + (idx % 3) * 1.2;
              return `
            <line x1="${topX}" y1="${topY}" x2="${botX}" y2="${botY}" stroke="#140601" strokeWidth="1.6" opacity="0.65" />
            <line x1="${topX + 1}" y1="${topY}" x2="${botX + 1}" y2="${botY}" stroke="#78350f" strokeWidth="0.8" opacity="0.4" />`;
            }).join('')}

            {/* Đầu đao mái ngói cong vút góc tây che mưa nắng phố cổ */}
            <path d="M -50,78 Q -66,73 -60,58" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />
        </g>
`;

const caoLauWallTarget = '<rect x="0" y="95" width="150" height="185" fill="url(#wallOchre1)" />';
if (code.includes(caoLauWallTarget)) {
  code = code.replace(caoLauWallTarget, caoLauWallTarget + '\n' + caoLauRoofJsx);
  console.log('Successfully added seamless roof to Cao Lầu Bà Bé!');
}

// 4. HOÀNH PHI & CÂU ĐỐI QUẢNG ĐÔNG HỘI QUÁN (CHUẨN VỊ TRÍ, RÕ RÀNG, UY NGHI)
const hoiQuanSignAndCouplets = `
        {/* ==================================================================== */}
        {/* HOÀNH PHI ĐẠI TỰ CUNG ĐÌNH & CẶP CÂU ĐỐI QUẢNG ĐÔNG HỘI QUÁN         */}
        {/* ==================================================================== */}
        <g id="quang-dong-signboard" filter="url(#dropShadow)">
            {/* Mão hoành phi chạm hình lưỡng long chầu nguyệt dát vàng hoàng kim */}
            <path d="M 191,78 Q 245,71 299,78 L 295,81 Q 245,75 195,81 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="245" cy="73" r="3.5" fill="#ef4444" stroke="#ca8a04" strokeWidth="0.8" />
            <circle cx="245" cy="73" r="1.6" fill="#fef08a" />

            {/* Bảng gỗ mun đại thụ sơn son đỏ ruby thiếp vàng lá */}
            <rect x="193" y="79" width="104" height="27" rx="3" fill="#881337" stroke="#ca8a04" strokeWidth="1.8" />
            <rect x="195.5" y="81.5" width="99" height="22" rx="1.5" fill="#701a1e" stroke="#f59e0b" strokeWidth="0.8" />
            <rect x="197.5" y="83.5" width="95" height="18" fill="none" stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="3,1.5" />

            {/* Chữ Hán đại tự thiếp vàng uy nghi, sắc nét */}
            <text x="245" y="93.5" fill="#fef08a" stroke="#450a0a" strokeWidth="0.3" fontSize="9.5" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="2.6">廣 東 會 館</text>
            
            {/* Quốc ngữ chạm chìm dát vàng */}
            <text x="245" y="102" fill="#fed7aa" fontSize="4.8" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="1">QUẢNG ĐÔNG HỘI QUÁN</text>

            {/* Cặp câu đối son đỏ chữ vàng hai bên trụ cổng vòm di sản */}
            {/* Cột Tả: Phúc Tinh Cao Chiếu (福星高照) */}
            <rect x="192" y="118" width="9" height="46" rx="1.2" fill="#991b1b" stroke="#ca8a04" strokeWidth="0.7" />
            <rect x="193.5" y="119.5" width="6" height="43" fill="none" stroke="#f59e0b" strokeWidth="0.4" />
            <text x="196.5" y="127" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">福</text>
            <text x="196.5" y="136" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">星</text>
            <text x="196.5" y="145" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">高</text>
            <text x="196.5" y="154" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">照</text>

            {/* Cột Hữu: Vạn Tượng Canh Tân (萬象更新) */}
            <rect x="289" y="118" width="9" height="46" rx="1.2" fill="#991b1b" stroke="#ca8a04" strokeWidth="0.7" />
            <rect x="290.5" y="119.5" width="6" height="43" fill="none" stroke="#f59e0b" strokeWidth="0.4" />
            <text x="293.5" y="127" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">萬</text>
            <text x="293.5" y="136" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">象</text>
            <text x="293.5" y="145" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">更</text>
            <text x="293.5" y="154" fill="#fef08a" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif">新</text>
        </g>
`;

const hoiQuanGateTarget = '{/* Cổng vòm son đỏ di sản */}';
if (code.includes(hoiQuanGateTarget)) {
  code = code.replace(hoiQuanGateTarget, hoiQuanSignAndCouplets + '\n        ' + hoiQuanGateTarget);
  console.log('Successfully positioned signboard & couplets to Quảng Đông Hội Quán!');
}

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild verification PASSED!');
  fs.writeFileSync(targetPath, code, 'utf8');
  console.log('SUCCESS: Updated MidAutumnSvgBackdrop.tsx with perfect roof and signboard!');
} catch (err) {
  console.error('esbuild verification FAILED:', err.message);
  process.exit(1);
}
