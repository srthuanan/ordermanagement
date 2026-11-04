const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const start = content.indexOf('@keyframes mid-autumn-sky-lantern-float-1');
console.log('CSS snippet:\n', content.substring(start - 50, start + 1200));
