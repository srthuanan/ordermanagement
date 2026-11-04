const fs = require('fs');
const code = fs.readFileSync('components/login/MidAutumnSvgBackdrop.tsx', 'utf8');

const startIdx = code.indexOf('{/* 1.5. BỨC TRANH SVG ĐỘNG: PHỐ CỔ HỘI AN');
const riverIdx = code.indexOf('id="song-hoai-fluid"');

const housesSection = code.substring(startIdx, riverIdx);

// Look for comments, groups, or roof paths
const lines = housesSection.split('\n');
lines.forEach((l, i) => {
  if (l.includes('{/*') || l.includes('<g id=') || (l.includes('<rect') && l.includes('width=') && (l.includes('fill="url(#wall') || l.includes('fill="#')))) {
    console.log(`Line ${i + 1}: ${l.trim().substring(0, 100)}`);
  }
});
