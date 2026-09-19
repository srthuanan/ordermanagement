const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const regex = /<g\s+id="([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(match[1]);
}
