const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = code.split('\n');
lines.forEach((l, idx) => {
  // Check any human-like shapes:
  // e.g. cylinder body: L -4,-8 or M -4,-6 or polygon -8,-14
  if (l.includes('points="-8,-') || l.includes('fill="#0d9488"') || l.includes('fill="#059669"') || l.includes('fill="#0284c7"')) {
    if (idx < 4000) {
      console.log(`${idx + 1}: ${l.trim()}`);
    }
  }
});
