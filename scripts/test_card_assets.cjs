const fs = require('fs');
const sharp = require('sharp');

// Test render of the 3 bespoke 3D feature icons + 3D corner brackets + 3D button
const testIconsSvg = `
<svg viewBox="0 0 800 500" width="800" height="500" xmlns="http://www.w3.org/2000/svg" style="background:#030714;">
  <defs>
    <linearGradient id="gold3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="25%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="85%" stop-color="#b45309" />
      <stop offset="100%" stop-color="#451a03" />
    </linearGradient>
    <linearGradient id="cyan3d" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9" />
      <stop offset="60%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0e7490" />
    </linearGradient>
    <linearGradient id="emerald3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a7f3d0" />
      <stop offset="40%" stop-color="#10b981" />
      <stop offset="80%" stop-color="#047857" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="ruby3d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fca5a5" />
      <stop offset="40%" stop-color="#ef4444" />
      <stop offset="80%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#450a0a" />
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4" result="b" />
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- 1. ICON KHO XE TRỰC TUYẾN 3D -->
  <g transform="translate(60, 60)">
    <rect width="64" height="64" rx="16" fill="#09132b" stroke="url(#gold3d)" stroke-width="1.8" filter="url(#glow)" />
    <!-- Showroom Hangar Arch -->
    <path d="M 16,48 L 16,28 Q 32,16 48,28 L 48,48 Z" fill="none" stroke="url(#gold3d)" stroke-width="1.5" />
    <path d="M 22,48 L 22,32 Q 32,22 42,32 L 42,48 Z" fill="#0f172a" stroke="#f59e0b" stroke-width="1" opacity="0.6" />
    <!-- Isometric Luxury Car 3D -->
    <path d="M 20,44 L 26,35 L 38,35 L 44,44 Z" fill="url(#gold3d)" />
    <path d="M 27,36 L 31,31 L 37,31 L 39,36 Z" fill="#38bdf8" opacity="0.8" />
    <!-- Wheels & Headlights -->
    <circle cx="25" cy="44" r="3.5" fill="#030712" stroke="#fef08a" stroke-width="1" />
    <circle cx="39" cy="44" r="3.5" fill="#030712" stroke="#fef08a" stroke-width="1" />
    <ellipse cx="20" cy="41" rx="1.5" ry="1" fill="#38bdf8" filter="url(#glow)" />
    <ellipse cx="44" cy="41" rx="1.5" ry="1" fill="#fef08a" filter="url(#glow)" />
  </g>

  <!-- 2. ICON TIẾN ĐỘ ĐƠN HÀNG 3D -->
  <g transform="translate(180, 60)">
    <rect width="64" height="64" rx="16" fill="#061c18" stroke="url(#emerald3d)" stroke-width="1.8" filter="url(#glow)" />
    <!-- Cuộn thư khế ước hoàng gia 3D -->
    <path d="M 20,20 Q 32,16 44,20 L 44,44 Q 32,40 20,44 Z" fill="url(#emerald3d)" opacity="0.9" />
    <path d="M 18,20 Q 32,15 46,20 Q 46,22 44,24 Q 32,19 18,24 Z" fill="url(#gold3d)" />
    <!-- Dòng chữ khế ước vàng -->
    <line x1="24" y1="26" x2="40" y2="26" stroke="#fef08a" stroke-width="1.2" stroke-linecap="round" />
    <line x1="24" y1="31" x2="36" y2="31" stroke="#fef08a" stroke-width="1.2" stroke-linecap="round" />
    <line x1="24" y1="36" x2="38" y2="36" stroke="#fef08a" stroke-width="1.2" stroke-linecap="round" />
    <!-- Dấu ngọc bích son đỏ 3D -->
    <circle cx="38" cy="40" r="4.5" fill="url(#ruby3d)" stroke="#fef08a" stroke-width="0.8" />
    <!-- Bút lông vàng hoàng gia -->
    <path d="M 46,16 L 36,36 L 34,35 L 44,15 Z" fill="url(#gold3d)" />
    <polygon points="36,36 33,39 34,35" fill="#fef08a" />
  </g>

  <!-- 3. ICON LỊCH SỬ & BÁO CÁO 3D -->
  <g transform="translate(300, 60)">
    <rect width="64" height="64" rx="16" fill="#04182b" stroke="url(#cyan3d)" stroke-width="1.8" filter="url(#glow)" />
    <!-- Các cột doanh số 3D nổi khối -->
    <path d="M 18,48 L 18,36 L 24,32 L 24,44 Z" fill="url(#cyan3d)" />
    <path d="M 18,36 L 22,34 L 28,34 L 24,32 Z" fill="#a5f3fc" />
    <path d="M 26,48 L 26,28 L 32,24 L 32,44 Z" fill="url(#gold3d)" />
    <path d="M 26,28 L 30,26 L 36,26 L 32,24 Z" fill="#fef08a" />
    <path d="M 34,48 L 34,20 L 40,16 L 40,44 Z" fill="url(#cyan3d)" />
    <path d="M 34,20 L 38,18 L 44,18 L 40,16 Z" fill="#ffffff" />
    <!-- Đường xu hướng mũi tên lăng kính vút cao -->
    <path d="M 16,40 Q 28,30 42,16" fill="none" stroke="#fef08a" stroke-width="2" stroke-linecap="round" filter="url(#glow)" />
    <polygon points="45,14 38,16 43,21" fill="#fef08a" />
  </g>

  <!-- 4. GÓC NẸP HOÀNG GIA CHẠM KHẮC 3D (CORNER BRACKETS) -->
  <g transform="translate(420, 40)">
    <rect width="180" height="120" rx="14" fill="#0a1128" stroke="#f59e0b" stroke-width="1.2" stroke-opacity="0.4" />
    <!-- Top-Left Corner Bracket -->
    <path d="M 4,24 L 4,10 Q 4,4 10,4 L 24,4 L 20,8 L 10,8 Q 8,8 8,10 L 8,20 Z" fill="url(#gold3d)" />
    <circle cx="10" cy="10" r="2" fill="#fef08a" />
    <!-- Top-Right Corner Bracket -->
    <path d="M 176,24 L 176,10 Q 176,4 170,4 L 156,4 L 160,8 L 170,8 Q 172,8 172,10 L 172,20 Z" fill="url(#gold3d)" />
    <!-- Bottom-Left -->
    <path d="M 4,96 L 4,110 Q 4,116 10,116 L 24,116 L 20,112 L 10,112 Q 8,112 8,110 L 8,100 Z" fill="url(#gold3d)" />
    <!-- Bottom-Right -->
    <path d="M 176,96 L 176,110 Q 176,116 170,116 L 156,116 L 160,112 L 170,112 Q 172,112 172,110 L 172,100 Z" fill="url(#gold3d)" />
  </g>

  <!-- 5. NÚT BẤM HOÀNG KIM 3D (3D GOLD INGOT BUTTON) -->
  <g transform="translate(60, 200)">
    <!-- Button Background 3D Bevel -->
    <rect width="320" height="52" rx="14" fill="url(#gold3d)" filter="url(#glow)" />
    <rect x="2" y="2" width="316" height="48" rx="12" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.4" />
    <!-- Chiseled Text -->
    <text x="160" y="32" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="900" letter-spacing="0.1em" fill="#3b1d04">
      ĐĂNG NHẬP  ➔
    </text>
  </g>
</svg>
`;

const scratchDir = 'C:/Users/USER/.gemini/antigravity-ide/brain/7bb94944-7be5-403f-8dd9-f6197abeb2ec/scratch';
fs.writeFileSync(scratchDir + '/test_card_3d_assets.svg', testIconsSvg);

sharp(Buffer.from(testIconsSvg))
  .png()
  .toFile(scratchDir + '/test_card_3d_assets.png')
  .then(() => console.log('Successfully rendered test_card_3d_assets.png'));
