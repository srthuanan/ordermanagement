const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = code.split('\n');
lines.forEach((l, idx) => {
  // Look for human parts: head, body, arms
  if (idx < 2500) {
    if (l.includes('fed7aa') || l.includes('ÁO BÀ BA') || l.includes('KHÁCH') || l.includes('TRƯỞNG LÃO') || l.includes('TIỂU THƯ') || l.includes('NGƯỜI') || l.includes('VỊ KHÁCH') || l.includes('CỤ')) {
      console.log(`${idx + 1}: ${l.trim()}`);
    }
  }
});
