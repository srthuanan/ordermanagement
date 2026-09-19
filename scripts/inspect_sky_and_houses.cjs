const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
const end = content.indexOf('id="vinfast-hoian-showroom"');
console.log('Snippet before showroom:\n', content.substring(end - 600, end));
