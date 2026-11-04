const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

// Find start of ancient town section:
const startIdx = code.indexOf('{/* 1.5. BỨC TRANH SVG ĐỘNG: PHỐ CỔ HỘI AN');
const endIdx = code.indexOf('{/* 2. ÁNH MÂY BỤI TINH VÂN KHỔNG LỒ */}');

console.log('Ancient town start:', startIdx, 'end:', endIdx);

const townContent = code.substring(startIdx, endIdx);

// Look for rects with walls, or sub-groups
const groupRegex = /<g\s+([^>]*?)>/g;
let m;
while ((m = groupRegex.exec(townContent)) !== null) {
  if (m[1].includes('translate') || m[1].includes('id=')) {
    console.log('Group in town:', m[1].substring(0, 100));
  }
}
