const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 760;
const HEIGHT = 480;
const FRAMES = 36;
const DELAY = 80;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 80, loopCount = 0, width = WIDTH, height = HEIGHT) {
  const anmfChunks = [];

  for (const frameBuf of frameWebpBuffers) {
    let pos = 12;
    const payloads = [];

    while (pos < frameBuf.length) {
      const fourcc = frameBuf.toString('latin1', pos, pos + 4);
      const size = frameBuf.readUInt32LE(pos + 4);
      const chunkSize = 8 + size + (size % 2);

      if (fourcc === 'VP8 ' || fourcc === 'VP8L' || fourcc === 'ALPH') {
        payloads.push(frameBuf.subarray(pos, pos + chunkSize));
      }
      pos += chunkSize;
    }

    const payloadData = Buffer.concat(payloads);
    const anmfHeader = Buffer.alloc(16);
    writeUInt24LE(anmfHeader, 0, 0);
    writeUInt24LE(anmfHeader, 0, 3);
    writeUInt24LE(anmfHeader, width - 1, 6);
    writeUInt24LE(anmfHeader, height - 1, 9);
    writeUInt24LE(anmfHeader, delayMs, 12);
    anmfHeader[15] = 0x02;

    const anmfData = Buffer.concat([anmfHeader, payloadData]);
    const anmfPayloadSize = anmfData.length;
    const anmfChunkHeader = Buffer.alloc(8);
    anmfChunkHeader.write('ANMF', 0, 4, 'latin1');
    anmfChunkHeader.writeUInt32LE(anmfPayloadSize, 4);

    const pad = (anmfPayloadSize % 2 !== 0) ? Buffer.from([0]) : Buffer.alloc(0);
    anmfChunks.push(Buffer.concat([anmfChunkHeader, anmfData, pad]));
  }

  const vp8xHeader = Buffer.alloc(8 + 10);
  vp8xHeader.write('VP8X', 0, 4, 'latin1');
  vp8xHeader.writeUInt32LE(10, 4);
  vp8xHeader[8] = 0x12;
  writeUInt24LE(vp8xHeader, width - 1, 12);
  writeUInt24LE(vp8xHeader, height - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8);
  animChunk.writeUInt16LE(loopCount, 12);

  const bodyData = Buffer.concat([vp8xHeader, animChunk, ...anmfChunks]);
  const riffSize = 4 + bodyData.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(riffSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, bodyData]);
}

// -----------------------------------------------------------------------------
// 🌌 CINEMATIC ULTRA-REALISTIC NATIONAL DAY FIREWORKS (100% NHƯ PHIM QUAY THỰC TẾ)
// - Bỏ hoàn toàn các khung chữ nhân tạo, tập trung 100% vào vẻ đẹp pháo hoa điện ảnh
// - Quỹ đạo phóng tên lửa bắn lên (Rocket Launch Streak) -> Nổ chớp sáng 2000°C (White Flash)
// - Từng dải Kim Liễu Rủ (Kamuro Willow) rơi tự nhiên theo đồ thị parabol vật lý thật
// - Tàn pháo hoa nổ vỡ lách tách (Crackle Strobe Sparks) và khói pháo trôi dạt chân thực
// - Mặt nước sông Sài Gòn / Hồ Tây phản chiếu ánh sáng pháo hoa theo thời gian thực
// -----------------------------------------------------------------------------
const REAL_SHELLS = [
  // 1. Pháo Hoa Đại Kim Liễu Vàng Rực (Kamuro Golden Willow - Trung tâm)
  { launchFrame: 0, burstFrame: 4, launchX: 360, cx: 380, cy: 110, maxR: 195, numSparks: 54, type: 'kamuro', primary: '#facc15', secondary: '#fef08a', trail: '#ca8a04' },
  // 2. Pháo Hoa Hồng Ngọc Đỏ Rực (Ruby Peony - Bên Trái)
  { launchFrame: 8, burstFrame: 12, launchX: 180, cx: 170, cy: 150, maxR: 145, numSparks: 44, type: 'peony', primary: '#ef4444', secondary: '#fecaca', trail: '#991b1b' },
  // 3. Pháo Hoa Lam Ngọc Sapphire (Electric Cyan Willow - Bên Phải)
  { launchFrame: 16, burstFrame: 20, launchX: 580, cx: 590, cy: 135, maxR: 155, numSparks: 48, type: 'cyan', primary: '#0284c7', secondary: '#38bdf8', trail: '#0369a1' },
  // 4. Pháo Hoa Bạch Kim Rơi Đa Sắc (Silver Strobe Cascades - Tầng thấp)
  { launchFrame: 24, burstFrame: 28, launchX: 410, cx: 400, cy: 175, maxR: 150, numSparks: 46, type: 'strobe', primary: '#f43f5e', secondary: '#fef08a', trail: '#ffffff' }
];

function renderUltraRealisticFireworksSvg(frameIndex) {
  const elements = [];

  // Tính toán cường độ chiếu sáng của toàn bộ bầu trời đêm (Atmospheric Illumination)
  let totalSkyLight = 0;
  let dominantColor = '#ca8a04';

  REAL_SHELLS.forEach(shell => {
    const elapsed = (frameIndex - shell.burstFrame + FRAMES) % FRAMES;
    if (elapsed >= 0 && elapsed <= 10) {
      const burstIntensity = Math.pow(1 - elapsed / 10, 1.8);
      totalSkyLight += burstIntensity * 0.35;
      dominantColor = shell.primary;
    }
  });

  const skyGlowOp = Math.min(0.45, totalSkyLight).toFixed(2);

  // 1. BẦU TRỜI ĐÊM ĐIỆN ẢNH SÂU THẲM
  elements.push(`
    <!-- Deep Space Sky Gradient -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#realSky)" />
    <!-- Dynamic Atmospheric Flash Lighting -->
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${dominantColor}" opacity="${skyGlowOp}" filter="url(#skyBlur)" />
  `);

  // 2. KHÓI THUỐC PHÁO KHUẾCH TÁN (VOLUMETRIC SMOKE CLOUDS)
  REAL_SHELLS.forEach(shell => {
    const elapsed = (frameIndex - shell.burstFrame + FRAMES) % FRAMES;
    if (elapsed > 4 && elapsed < 34) {
      const p = (elapsed - 4) / 30;
      const smokeOp = (0.24 * (1 - p)).toFixed(2);
      const smokeR = (45 + p * 95).toFixed(1);
      const smokeX = (shell.cx + p * 30).toFixed(1);
      const smokeY = (shell.cy - p * 12).toFixed(1);

      elements.push(`
        <circle cx="${smokeX}" cy="${smokeY}" r="${smokeR}" 
                fill="${shell.primary}" opacity="${smokeOp}" filter="url(#volumetricSmoke)"/>
      `);
    }
  });

  // 3. VỆT TÊN LỬA PHÓNG VÚT LÊN TRỜI (ROCKET ASCENT STREAKS)
  REAL_SHELLS.forEach(shell => {
    const launchElapsed = (frameIndex - shell.launchFrame + FRAMES) % FRAMES;
    if (launchElapsed >= 0 && launchElapsed < 4) {
      const p = launchElapsed / 4;
      const startY = 410;
      const curY = startY - (startY - shell.cy) * p;
      const tailY = curY + 45;
      const curX = shell.launchX + (shell.cx - shell.launchX) * p;

      elements.push(`
        <line x1="${curX.toFixed(1)}" y1="${tailY.toFixed(1)}" 
              x2="${curX.toFixed(1)}" y2="${curY.toFixed(1)}" 
              stroke="#fef08a" stroke-width="2.5" opacity="0.95" stroke-linecap="round"/>
        <circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="3" fill="#ffffff" filter="url(#brightGlint)"/>
      `);
    }
  });

  // 4. QUỸ ĐẠO BUNG NỞ HOA LỬA VẬT LÝ SIÊU THỰC
  REAL_SHELLS.forEach(shell => {
    const elapsed = (frameIndex - shell.burstFrame + FRAMES) % FRAMES;
    const duration = 24; // 24 frames (~1.9 giây)

    if (elapsed >= 0 && elapsed < duration) {
      const progress = elapsed / duration;

      // Gia tốc nở bung hình cầu chân thật
      const easeDist = 1 - Math.pow(1 - progress, 3.4);
      const currentRadius = easeDist * shell.maxR;
      const opacity = Math.max(0, 1 - Math.pow(progress, 1.5));

      // Chớp sáng tâm nổ cực đại (White-hot Flash Core 2000°C)
      if (elapsed <= 2) {
        const flashR = (3 - elapsed) * 45;
        const flashOp = (1 - elapsed / 3).toFixed(2);
        elements.push(`
          <circle cx="${shell.cx}" cy="${shell.cy}" r="${flashR}" fill="#ffffff" opacity="${flashOp}" filter="url(#coreWhiteHot)"/>
          <circle cx="${shell.cx}" cy="${shell.cy}" r="${flashR * 2.2}" fill="${shell.secondary}" opacity="${(flashOp * 0.7).toFixed(2)}" filter="url(#coreWhiteHot)"/>
        `);
      }

      for (let i = 0; i < shell.numSparks; i++) {
        // Góc bung tỏa đa diện 3D tự nhiên
        const baseAngle = (i / shell.numSparks) * Math.PI * 2;
        const jitterAngle = Math.sin(i * 17.3) * 0.09;
        const angle = baseAngle + jitterAngle;

        // Vận tốc từng hạt có độ chênh lệch thực tế
        const velSpread = 0.70 + (Math.sin(i * 11.5) * 0.5 + 0.5) * 0.42;
        const r = currentRadius * velSpread;

        // Trọng lực rơi hình Parabol (Parabolic Gravity Curve: y = 0.5 * g * t^2)
        const gravityMult = shell.type === 'kamuro' ? 68 : 38;
        const gravity = Math.pow(progress, 2.3) * gravityMult;

        const x = shell.cx + Math.cos(angle) * r;
        const y = shell.cy + Math.sin(angle) * r + gravity;

        // Đuôi hoa lửa quán tính (Inertial Fire Streak)
        const tailFactor = shell.type === 'kamuro' ? 0.72 : 0.86;
        const tailX = shell.cx + Math.cos(angle) * (r * tailFactor);
        const tailY = shell.cy + Math.sin(angle) * (r * tailFactor) + (gravity * tailFactor);

        const sparkSize = Math.max(0.7, (1 - progress * 0.5) * 3.4);

        // Hiệu ứng nhấp nháy tàn pháo hoa (Strobe Twinkle Decay)
        const flicker = Math.sin(frameIndex * 3 + i * 1.8) * 0.35 + 0.65;
        const sparkOp = (opacity * flicker).toFixed(2);

        // Vệt hoa lửa kéo đuôi sáng mượt
        elements.push(`
          <line x1="${tailX.toFixed(1)}" y1="${tailY.toFixed(1)}" 
                x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" 
                stroke="${shell.trail}" stroke-width="${(sparkSize * 0.95).toFixed(1)}" 
                opacity="${(sparkOp * 0.85).toFixed(2)}" stroke-linecap="round"/>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sparkSize.toFixed(1)}" 
                  fill="${shell.secondary}" opacity="${sparkOp}"/>
        `);

        // Đốm nổ lách tách ở đuôi cánh liễu (Crackle Strobe Embers)
        if (progress > 0.35 && (i + frameIndex) % 3 === 0) {
          const crackleX = x + Math.sin(i * 7) * 4;
          const crackleY = y + 5;
          elements.push(`
            <circle cx="${crackleX.toFixed(1)}" cy="${crackleY.toFixed(1)}" r="1.4" 
                    fill="#ffffff" opacity="${(sparkOp * 0.95).toFixed(2)}"/>
          `);
        }
      }
    }
  });

  // 5. THÀNH PHỐ ĐÊM ĐIỆN ẢNH & MẶT NƯỚC SÔNG PHẢN CHIẾU THỰC TẾ
  elements.push(`
    <!-- Mặt Nước Sông Đêm Gợn Sóng Phản Chiếu Ánh Sáng Pháo Hoa -->
    <rect x="0" y="400" width="${WIDTH}" height="80" fill="url(#realWater)" />
    <line x1="0" y1="400" x2="${WIDTH}" y2="400" stroke="#1e293b" stroke-width="1.2"/>

    <!-- Vệt Phản Chiếu Ánh Sáng Pháo Hoa Lung Linh Dưới Mặt Nước -->
    <ellipse cx="380" cy="435" rx="210" ry="22" fill="#ca8a04" opacity="${(skyGlowOp * 0.8).toFixed(2)}" filter="url(#volumetricSmoke)"/>
    <ellipse cx="170" cy="440" rx="110" ry="16" fill="#ef4444" opacity="${(skyGlowOp * 0.7).toFixed(2)}" filter="url(#volumetricSmoke)"/>
    <ellipse cx="590" cy="438" rx="120" ry="18" fill="#0284c7" opacity="${(skyGlowOp * 0.7).toFixed(2)}" filter="url(#volumetricSmoke)"/>

    <!-- Tòa Nhà & Đường Chân Trời Thành Phố Đêm Chân Thực (City Skyline) -->
    <g fill="#020617">
      <rect x="30" y="340" width="55" height="60"/>
      <rect x="95" y="310" width="65" height="90"/>
      <rect x="170" y="355" width="40" height="45"/>
      <!-- Tháp Landmark Cao Vút -->
      <polygon points="230,400 242,240 248,240 260,400"/>
      <line x1="245" y1="240" x2="245" y2="200" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="245" cy="200" r="2.5" fill="#ef4444"/>
      <rect x="275" y="325" width="60" height="75"/>
      <rect x="345" y="360" width="45" height="40"/>
      <!-- Cầu Thành Phố Vắt Ngang Sông -->
      <path d="M 400,400 Q 480,360 560,400" stroke="#090d16" stroke-width="14" fill="none"/>
      <rect x="580" y="315" width="70" height="85"/>
      <rect x="660" y="345" width="50" height="55"/>
      <rect x="720" y="300" width="40" height="100"/>
    </g>

    <!-- Hàng Triệu Ánh Đèn Cửa Sổ Thành Phố Ấm Áp -->
    <g fill="#fef08a" opacity="0.8">
      <rect x="110" y="325" width="4" height="6"/>
      <rect x="125" y="345" width="4" height="6"/>
      <rect x="140" y="365" width="4" height="6"/>
      <rect x="285" y="340" width="4" height="6"/>
      <rect x="305" y="360" width="4" height="6"/>
      <rect x="600" y="330" width="4" height="6"/>
      <rect x="625" y="350" width="4" height="6"/>
      <rect x="680" y="360" width="4" height="6"/>
      <!-- Đèn Cầu Lung Linh -->
      <circle cx="430" cy="385" r="1.5" fill="#facc15"/>
      <circle cx="460" cy="378" r="1.5" fill="#facc15"/>
      <circle cx="490" cy="378" r="1.5" fill="#facc15"/>
      <circle cx="520" cy="385" r="1.5" fill="#facc15"/>
    </g>
  `);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Bầu Trời Đêm Điện Ảnh 4K -->
        <linearGradient id="realSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#010409" />
          <stop offset="40%" stop-color="#040914" />
          <stop offset="75%" stop-color="#0a1224" />
          <stop offset="100%" stop-color="#141c30" />
        </linearGradient>

        <!-- Mặt Nước Sông Đêm -->
        <linearGradient id="realWater" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#050a17" />
          <stop offset="50%" stop-color="#02040a" />
          <stop offset="100%" stop-color="#000000" />
        </linearGradient>

        <!-- Filters Khói Thuốc & Chớp Sáng Quang Học -->
        <filter id="volumetricSmoke" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="20"/>
        </filter>
        <filter id="skyBlur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="40"/>
        </filter>
        <filter id="coreWhiteHot" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6"/>
        </filter>
        <filter id="brightGlint" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2"/>
        </filter>
      </defs>

      ${elements.join('\n')}
    </svg>
  `;
}

async function main() {
  console.log('🌌 Rendering 100% Cinematic Photo-Realistic Fireworks Animation (WebP)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderUltraRealisticFireworksSvg(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 88, alphaQuality: 95, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/fireworks_2_9_national_day.webp'),
    path.join(__dirname, '../pictures/fireworks_2_9_national_day.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 100% Cinematic Photo-Realistic Fireworks rendered:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
