const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('{/* 1.') || l.includes('{/* 2.') || l.includes('{/* 3.') || l.includes('KHÁCH') || l.includes('NGHỆ NHÂN') || l.includes('THỢ') || l.includes('CHỦ')) {
    if (i < 3000) {
      console.log(i + 1, l.trim());
    }
  }
});
