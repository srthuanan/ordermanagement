const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const s2 = 512515; // Cao Lau
console.log(content.slice(s2 + 2800, s2 + 3500));
