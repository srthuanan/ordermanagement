const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

// Let's count <g and </g>
const openG = (content.match(/<g[\s>]/g) || []).length;
const closeG = (content.match(/<\/g>/g) || []).length;
console.log('Open <g>:', openG, 'Close </g>:', closeG, 'Difference:', openG - closeG);
