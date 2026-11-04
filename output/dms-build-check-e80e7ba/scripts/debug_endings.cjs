const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const starts = [
    { name: 'Tra Quan 1', s: 473675 },
    { name: 'Tiem Thuoc', s: 499142 },
    { name: 'Cao Lau', s: 512515 },
    { name: 'Banh Mi', s: 545245 },
    { name: 'Long Den', s: 580081 },
    { name: 'Patrons', s: 625309 }
];

starts.forEach(({ name, s }) => {
    console.log('=== ' + name + ' ===');
    console.log(content.slice(s, s + 1500));
});
