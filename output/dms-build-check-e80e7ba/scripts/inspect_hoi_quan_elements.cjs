const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
const hqStart = content.indexOf('id="nhaco-center-hoi-quan"');
const hqEnd = content.indexOf('id="nhaco-block-right"');
const hq = content.substring(hqStart, hqEnd);
const lines = hq.split('\n');
lines.forEach((l, i) => {
  if (l.includes('ellipse') || l.includes('lantern') || l.includes('Đèn') || l.includes('Cổng vòm') || l.includes('lồng đèn') || l.includes('Lồng đèn')) {
    console.log(i + 1547, l.trim());
  }
});
