const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const tanKyStart = content.indexOf('id="nhaco-tan-ky"');
const hoiQuanStart = content.indexOf('id="nhaco-center-hoi-quan"');
const rightBlockStart = content.indexOf('id="nhaco-block-right"');

const tanKy = content.substring(tanKyStart, hoiQuanStart);
const hoiQuan = content.substring(hoiQuanStart, rightBlockStart);

console.log('--- TAN KY ROOF ENDS ---');
const tanKyRoof = tanKy.match(/<path[^>]*stroke="#f59e0b"[^>]*>/g);
console.log(tanKyRoof);

console.log('--- HOI QUAN ROOF ENDS ---');
const hoiQuanRoof = hoiQuan.match(/<path[^>]*stroke="#f59e0b"[^>]*>/g);
console.log(hoiQuanRoof);
