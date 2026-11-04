const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = code.split('\n');
console.log('Searching for any elements between lines 600 and 1500 that could be people:');
for (let i = 600; i < 1500; i++) {
  const l = lines[i];
  // Check for any circle or path or polygon
  if (l.includes('<circle') || l.includes('<ellipse') || l.includes('<polygon') || l.includes('<path')) {
    // If it's not sky or stars or roof
    if (!l.includes('maSky') && !l.includes('roof') && !l.includes('townAtmosphere') && !l.includes('wallOchre')) {
      // Check if it has color like green, teal, blue, red
      if (l.includes('0d9488') || l.includes('059669') || l.includes('1e3a8a') || l.includes('0284c7') || l.includes('3b82f6') || l.includes('10b981') || l.includes('22c55e') || l.includes('15803d') || l.includes('166534') || l.includes('0f3822')) {
        console.log(`Line ${i + 1}: ${l.trim()}`);
      }
    }
  }
}
