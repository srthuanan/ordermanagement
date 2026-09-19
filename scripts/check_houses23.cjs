const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

console.log('=== AFTER BOC THUOC ===');
const bocThuocIdx = content.indexOf('bốc thuốc');
console.log(content.slice(bocThuocIdx, bocThuocIdx + 2000));

console.log('=== AFTER NOI NUOC LEO (CAO LAU) ===');
const caoLauIdx = content.indexOf('cao lầu bên trái & nồi nước lèo');
console.log(content.slice(caoLauIdx, caoLauIdx + 2000));
