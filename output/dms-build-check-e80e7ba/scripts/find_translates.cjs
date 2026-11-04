const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

// Find all occurrences of translate( in the file that have values near the user's boxes:
// Box 1 (green figure): world x around 380-450, world y around 250-320
// Box 2 (blue figure): world x around 600-750, world y around 250-320
const regex = /<g[^>]*transform="translate\(([^)]+)\)"[^>]*>/g;
let m;
while ((m = regex.exec(code)) !== null) {
  const line = code.substring(0, m.index).split('\n').length;
  if (line < 3000) {
    console.log(`Line ${line}: ${m[0]}`);
  }
}
