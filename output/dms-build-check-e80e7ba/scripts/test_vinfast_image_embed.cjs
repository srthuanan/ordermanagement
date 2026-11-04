const fs = require('fs');
const sharp = require('sharp');

async function run() {
  // Convert webp to PNG buffer
  const pngBuf = await sharp('public/pictures/vf8-ce1m.webp').resize(500).png().toBuffer();
  const base64Png = 'data:image/png;base64,' + pngBuf.toString('base64');
  console.log('PNG base64 length:', base64Png.length);

  const svg = `<svg viewBox="0 0 400 300" width="800" height="600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="interiorGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
        <stop offset="25%" stop-color="#fef08a" stop-opacity="0.95" />
        <stop offset="65%" stop-color="#f59e0b" stop-opacity="0.8" />
        <stop offset="100%" stop-color="#b45309" stop-opacity="0.4" />
      </radialGradient>
      <filter id="bloomSoft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur2" />
        <feMerge><feMergeNode in="blur2" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <rect width="400" height="300" fill="#0f172a" />
    
    <!-- Showroom Glass & Glow -->
    <rect x="20" y="50" width="360" height="220" rx="4" fill="#1e293b" />
    <rect x="25" y="55" width="350" height="210" rx="3" fill="url(#interiorGlow)" opacity="0.92" />
    
    <!-- Turntable -->
    <ellipse cx="200" cy="235" rx="110" ry="24" fill="#1e293b" stroke="#ca8a04" stroke-width="2" />
    <ellipse cx="200" cy="233" rx="105" ry="20" fill="#0f172a" />
    <ellipse cx="200" cy="233" rx="98" ry="17" fill="none" stroke="#38bdf8" stroke-width="2" opacity="0.8" />
    
    <!-- Real VinFast Car Image (PNG) -->
    <image href="${base64Png}" x="85" y="115" width="230" height="130" preserveAspectRatio="xMidYMid meet" />
  </svg>`;

  const scratchDir = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch';
  await sharp(Buffer.from(svg)).png().toFile(scratchDir + '/test_car_in_showroom.png');
  console.log('Successfully rendered PNG car in showroom!');
}

run();
