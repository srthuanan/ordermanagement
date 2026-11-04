const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const tanKyStart = code.indexOf('id="nhaco-tan-ky"');
const hoiQuanStart = code.indexOf('id="nhaco-center-hoi-quan"');
const tanKy = code.substring(tanKyStart, hoiQuanStart);

const lines = tanKy.split('\n');
lines.forEach((l, i) => {
  if (l.includes('translate(') || l.includes('fed7aa') || l.includes('VỌNG NGUYỆT') || l.includes('ĐỒNG NHÂN')) {
    console.log(i + 1, l.trim());
  }
});
