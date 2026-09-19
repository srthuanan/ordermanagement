const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Check for any green or teal clothing or blue clothing
  if (line.includes('fill="#0d9488"') || line.includes('fill="#059669"') || line.includes('fill="#0284c7"') || line.includes('fill="#1e3a8a"') || line.includes('fill="#10b981"') || line.includes('fill="#008080"')) {
    // Check if within 5 lines there is a head (circle with radius 3-5)
    let hasHead = false;
    for (let j = Math.max(0, i - 8); j <= Math.min(lines.length - 1, i + 8); j++) {
      if (lines[j].includes('<circle') && (lines[j].includes('r="3') || lines[j].includes('r="4') || lines[j].includes('r="2'))) {
        hasHead = true;
        break;
      }
    }
    if (hasHead) {
      console.log(`Match at line ${i + 1}: ${line.trim()}`);
      for (let k = Math.max(0, i - 4); k <= Math.min(lines.length - 1, i + 4); k++) {
        console.log(`   ${k + 1}: ${lines[k]}`);
      }
      console.log('--------------------------------------------------');
    }
  }
}
