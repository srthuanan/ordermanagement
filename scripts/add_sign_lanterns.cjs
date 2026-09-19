const fs = require('fs');
const esbuild = require('esbuild');

const backdropPath = 'components/login/MidAutumnSvgBackdrop.tsx';
let code = fs.readFileSync(backdropPath, 'utf8');

// 1. Add lanterns to House 2 sign
const h2SignOld = `<rect x="200" y="174" width="75" height="19" rx="2" fill="#1c1917" stroke="#eab308" strokeWidth="1.4" />`;
const h2SignNew = `<!-- Đèn lồng treo 2 bên biển hiệu -->
            <ellipse cx="196" cy="183" rx="3.2" ry="5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <ellipse cx="279" cy="183" rx="3.2" ry="5" fill="#f59e0b" filter="url(#bloomSoft)" />
            <line x1="196" y1="178" x2="196" y2="180" stroke="#78350f" strokeWidth="0.8" />
            <line x1="279" y1="178" x2="279" y2="180" stroke="#78350f" strokeWidth="0.8" />
            <rect x="200" y="174" width="75" height="19" rx="2" fill="#1c1917" stroke="#eab308" strokeWidth="1.4" />`;
code = code.replace(h2SignOld, h2SignNew);

// 2. Add lanterns to House 5 sign
const h5SignOld = `<path d="M 374,182 Q 417.5,179 461,182 L 458,201 Q 417.5,198 377,201 Z" fill="#9a3412" stroke="#f59e0b" strokeWidth="1.4" />`;
const h5SignNew = `<!-- Đèn lồng nung đất đỏ 2 bên biển hiệu gốm -->
            <ellipse cx="368" cy="191" rx="3.2" ry="5" fill="#ea580c" filter="url(#bloomSoft)" />
            <ellipse cx="467" cy="191" rx="3.2" ry="5" fill="#ea580c" filter="url(#bloomSoft)" />
            <line x1="368" y1="186" x2="368" y2="188" stroke="#78350f" strokeWidth="0.8" />
            <line x1="467" y1="186" x2="467" y2="188" stroke="#78350f" strokeWidth="0.8" />
            <path d="M 374,182 Q 417.5,179 461,182 L 458,201 Q 417.5,198 377,201 Z" fill="#9a3412" stroke="#f59e0b" strokeWidth="1.4" />`;
code = code.replace(h5SignOld, h5SignNew);

// 3. Add lanterns to House 6 sign
const h6SignOld = `<rect x="520" y="174" width="80" height="20" rx="2.5" fill="#451a03" stroke="#f59e0b" strokeWidth="1.4" />`;
const h6SignNew = `<!-- Đèn lồng hoa giấy hồng thắm 2 bên biển bánh mì -->
            <ellipse cx="514" cy="184" rx="3.2" ry="5" fill="#f43f5e" filter="url(#bloomSoft)" />
            <ellipse cx="606" cy="184" rx="3.2" ry="5" fill="#f43f5e" filter="url(#bloomSoft)" />
            <line x1="514" y1="179" x2="514" y2="181" stroke="#78350f" strokeWidth="0.8" />
            <line x1="606" y1="179" x2="606" y2="181" stroke="#78350f" strokeWidth="0.8" />
            <rect x="520" y="174" width="80" height="20" rx="2.5" fill="#451a03" stroke="#f59e0b" strokeWidth="1.4" />`;
code = code.replace(h6SignOld, h6SignNew);

// Clean up any HTML comments into JSX comments
code = code.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// Validate with esbuild
try {
  esbuild.transformSync(code, { loader: 'tsx' });
  console.log('esbuild check PASSED for decorative sign lanterns!');
  fs.writeFileSync(backdropPath, code, 'utf8');
  console.log('Successfully updated sign lanterns!');
} catch (err) {
  console.error('esbuild check FAILED:', err.message);
  process.exit(1);
}
