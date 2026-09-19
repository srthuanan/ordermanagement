const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const idx = content.indexOf('{/* 9. ĐÀN THIÊN ĐĂNG LƠ LỬNG BAY LÊN TRỜI XA */}');
console.log('Index:', idx, 'Total length:', content.length);
console.log('Surrounding code:\n', content.substring(Math.max(0, idx - 400), Math.min(content.length, idx + 2500)));
