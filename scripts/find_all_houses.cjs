const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const regex = /<g id="(nhaco[^"]*)"([^>]*)>/g;
let match;
while ((match = regex.exec(code)) !== null) {
  console.log(`Found house: id="${match[1]}" attrs="${match[2]}" at index ${match.index}`);
}
