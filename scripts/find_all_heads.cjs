const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const regex = /<circle[^>]*fill="#fed7aa"[^>]*>/g;
let match;
while ((match = regex.exec(code)) !== null) {
  const idx = match.index;
  const line = code.substring(0, idx).split('\n').length;
  // Get 3 lines before and 3 lines after
  const lines = code.split('\n');
  console.log(`--- Line ${line}: ${match[0]}`);
  for (let i = Math.max(0, line - 4); i < Math.min(lines.length, line + 4); i++) {
    console.log(`  ${i + 1}: ${lines[i]}`);
  }
}
