const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('0,536') || l.includes('0,538') || l.includes('hoian-promenade') || l.includes('DÒNG NGƯỜI') || l.includes('cột mốc') || l.includes('bờ kè')) {
    console.log(idx + 1, l.trim());
  }
});
