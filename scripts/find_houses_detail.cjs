const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = code.split('\n');
for (let i = 1000; i < 1850; i++) {
  const l = lines[i];
  if (l && (l.includes('<g id=') || l.includes('BIỂN HIỆU') || l.includes('HỘI QUÁN') || l.includes('QUÁN') || l.includes('TIỆM') || l.includes('HIỆU') || l.includes('nhaco'))) {
    console.log(`Line ${i + 1}: ${l.trim()}`);
  }
}
