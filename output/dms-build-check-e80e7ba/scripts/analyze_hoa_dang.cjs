const fs = require('fs');
const content = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');
const streamStart = content.indexOf('<g id="hoian-super-dense-hoa-dang-stream">');
const streamEnd = content.indexOf('</g>\n    <rect x="360" y="320"');
const sub = content.substring(streamStart, streamEnd);
const regex = /translate\((\d+),\s*(\d+)\)\s*scale\(([\d\.]+)\)/g;
let m;
const items = [];
while ((m = regex.exec(sub)) !== null) {
  items.push({ x: parseInt(m[1]), y: parseInt(m[2]), scale: parseFloat(m[3]) });
}
console.log('Total hoa dang found:', items.length);
console.log('First 5:', items.slice(0, 5));
console.log('Last 5:', items.slice(-5));
