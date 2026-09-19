const fs = require('fs');

const file = 'components/login/MidAutumnSvgBackdrop.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the awkward roof curl at x=116 that pokes into Cao Lầu roof
const curlAt116 = '<path d="M 116,78 Q 100,73 106,58" fill="none" stroke="#f59e0b" strokeWidth="2.8" strokeLinecap="round" />';
if (content.includes(curlAt116)) {
  content = content.replace(curlAt116, '{/* Mái liền kề giao duyên giữa Cao Lầu và Hội Quán */}');
  console.log('Removed awkward curl at x=116!');
} else {
  console.log('Curl at 116 not found (already removed or different).');
}

// 2. Refine the signboard to be ultra sharp and rich (no blur on text, rich royal ruby frame)
const oldSignRegex = /<g id="quang-dong-signboard"[\s\S]*?<\/g>\s*<\/g>/;
// Let's find exact quang-dong-signboard block
const signStart = content.indexOf('<g id="quang-dong-signboard"');
if (signStart !== -1) {
  const signEnd = content.indexOf('</g>', content.indexOf('萬象更新', signStart)) + 4;
  const oldSignBlock = content.substring(signStart, signEnd);

  const refinedSignBlock = `<g id="quang-dong-signboard" filter="url(#dropShadow)">
            {/* Mão hoành phi chạm hình lưỡng long chầu nguyệt dát vàng hoàng kim */}
            <path d="M 191,78 Q 245,71 299,78 L 295,81 Q 245,75 195,81 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="245" cy="73" r="3.5" fill="#ef4444" stroke="#ca8a04" strokeWidth="0.8" />
            <circle cx="245" cy="73" r="1.6" fill="#fef08a" />

            {/* Bảng gỗ mun đại thụ sơn son đỏ ruby thiếp vàng lá */}
            <rect x="193" y="79" width="104" height="27" rx="3" fill="#881337" stroke="#ca8a04" strokeWidth="1.8" />
            <rect x="195.5" y="81.5" width="99" height="22" rx="1.5" fill="#701a1e" stroke="#f59e0b" strokeWidth="0.8" />
            <rect x="197.5" y="83.5" width="95" height="18" fill="none" stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="3,1.5" />

            {/* Chữ Hán đại tự thiếp vàng uy nghi, sắc nét (không dính blur) */}
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
        </g>`;

  content = content.substring(0, signStart) + refinedSignBlock + content.substring(signEnd);
  console.log('Refined signboard block successfully!');
}

fs.writeFileSync(file, content, 'utf8');
console.log('Saved MidAutumnSvgBackdrop.tsx');
