const fs = require('fs');
const esbuild = require('esbuild');

const targetFile = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(targetFile, 'utf8');

// Polish VinFast Signboard to be wider and perfectly centered
const oldSignboardStart = '<g id="vinfast-signboard" filter="url(#dropShadow)">';
const oldSignboardEnd = '{/* ========================================================================== */}\n        {/* DÃY LỒNG ĐÈN HỘI AN CAO CẤP';

const polishedSignboard = `<g id="vinfast-signboard" filter="url(#dropShadow)">
            {/* Mão hoành phi chạm khắc hoa văn hoàng gia thếp vàng */}
            <path d="M 93,83 Q 172,76 251,83 L 247,86 Q 172,80 97,86 Z" fill="#f59e0b" stroke="#78350f" strokeWidth="0.8" />
            <circle cx="172" cy="78" r="3.4" fill="#0284c7" stroke="#ca8a04" strokeWidth="0.8" />
            <circle cx="172" cy="78" r="1.6" fill="#ffffff" />

            {/* Bảng gỗ mun sơn son đỏ ruby thiếp vàng lá mở rộng */}
            <rect x="95" y="84" width="154" height="29" rx="3" fill="#7f1d1d" stroke="#ca8a04" strokeWidth="1.8" />
            <rect x="98" y="87" width="148" height="23" rx="1.8" fill="#450a0a" stroke="#f59e0b" strokeWidth="0.8" />
            <rect x="100" y="89" width="144" height="19" fill="none" stroke="#fbbf24" strokeWidth="0.5" strokeDasharray="3,1.5" />

            {/* Logo VinFast mạ bạc tỏa sáng */}
            <path d="M 108,94 L 110.5,100 L 113,94 L 111.5,94 L 110.5,97.5 L 109.5,94 Z" fill="#38bdf8" />
            <path d="M 231,94 L 233.5,100 L 236,94 L 234.5,94 L 233.5,97.5 L 232.5,94 Z" fill="#38bdf8" />

            {/* Tên thương hiệu đại tự mạ vàng 24K sắc nét chuẩn tâm */}
            <text x="172" y="98.5" fill="#fef08a" stroke="#450a0a" strokeWidth="0.3" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="'Cinzel', serif" letterSpacing="1.8">VINFAST THUẬN AN</text>
            
            {/* Phụ đề quốc ngữ Showroom */}
            <text x="172" y="106" fill="#fed7aa" fontSize="4.6" fontWeight="bold" textAnchor="middle" fontFamily="serif" letterSpacing="0.8">SHOWROOM Ô TÔ ĐIỆN THÔNG MINH</text>

            {/* 2 Đèn lồng đỏ con rọi biển hiệu */}
            <ellipse cx="95" cy="98" rx="3.5" ry="5.5" fill="#0284c7" filter="url(#bloomSoft)" />
            <ellipse cx="249" cy="98" rx="3.5" ry="5.5" fill="#0284c7" filter="url(#bloomSoft)" />
        </g>

        `;

if (code.includes(oldSignboardStart)) {
  const sStart = code.indexOf(oldSignboardStart);
  const sEnd = code.indexOf(oldSignboardEnd);
  if (sEnd !== -1) {
    code = code.substring(0, sStart) + polishedSignboard + code.substring(sEnd);
    esbuild.transformSync(code, { loader: 'tsx' });
    fs.writeFileSync(targetFile, code, 'utf8');
    console.log('Successfully polished VinFast signboard in MidAutumnSvgBackdrop.tsx!');
  }
}

// Update script as well
let sc = fs.readFileSync('scripts/replace_chua_cau_with_vinfast_showroom.cjs', 'utf8');
if (sc.includes(oldSignboardStart)) {
  const sStart = sc.indexOf(oldSignboardStart);
  const sEnd = sc.indexOf(oldSignboardEnd);
  if (sEnd !== -1) {
    sc = sc.substring(0, sStart) + polishedSignboard + sc.substring(sEnd);
    fs.writeFileSync('scripts/replace_chua_cau_with_vinfast_showroom.cjs', sc, 'utf8');
    console.log('Successfully polished VinFast signboard in replace script!');
  }
}
