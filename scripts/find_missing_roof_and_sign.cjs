const fs = require('fs');
const c = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = c.split('\n');
console.log('--- Lines 1640 to 1750 ---');
for (let i = 1640; i <= 1750; i++) {
  if (lines[i] && (lines[i].includes('<path') || lines[i].includes('<g') || lines[i].includes('HỘI QUÁN') || lines[i].includes('Quảng Đông') || lines[i].includes('strokeLinecap'))) {
    console.log(i + 1, lines[i].trim());
  }
}

console.log('--- Lines 1700 to 1820 ---');
for (let i = 1700; i <= 1820; i++) {
  if (lines[i] && (lines[i].includes('Hội Quán') || lines[i].includes('hội quán') || lines[i].includes('HOÀNH PHI') || lines[i].includes('BIỂN HIỆU') || lines[i].includes('Cổng vòm') || lines[i].includes('án thờ'))) {
    console.log(i + 1, lines[i].trim());
  }
}
