const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const lines = content.split('\n');
lines.forEach((l, i) => {
    if (l.includes('會館') || l.includes('HỘI QUÁN') || l.includes('Hội Quán') || l.includes('GỐM THANH HÀ')) {
        console.log(`${i+1}: ${l.trim().slice(0, 100)}`);
    }
});
