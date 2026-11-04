const sharp = require('sharp');
const svg = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="25%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#b45309"/>
      <stop offset="75%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#78350f"/>
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="30" fill="url(#gold)" filter="url(#glow)"/>
</svg>`;

sharp(Buffer.from(svg)).png().toBuffer()
  .then(b => console.log('Filter rendered perfectly, size:', b.length))
  .catch(console.error);
