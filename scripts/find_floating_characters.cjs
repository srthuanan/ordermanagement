const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = code.split('\n');

for (let i = 1000; i < 1438; i++) {
  const l = lines[i];
  if (l.includes('<circle') || l.includes('<path d="M')) {
    if (l.includes('fed7aa') || l.includes('1e3a8a') || l.includes('0d9488') || l.includes('0284c7') || l.includes('991b1b')) {
      console.log(`Line ${i + 1}: ${l.trim()}`);
    }
  }
}
