const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const idx = content.indexOf('Huỳnh Văn');
console.log('Huynh Van idx:', idx);
if (idx !== -1) {
    console.log(content.slice(idx, idx + 2000));
}
