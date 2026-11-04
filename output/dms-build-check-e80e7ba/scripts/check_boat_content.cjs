const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const key = 'className="animate-boat-lr-1a"';
const idx = content.indexOf(key);
const endIdx = content.indexOf('</g>', content.indexOf('</g>', idx + 50) + 10);
console.log('--- BOAT 1A ---');
console.log(content.slice(idx - 10, idx + 2500));
