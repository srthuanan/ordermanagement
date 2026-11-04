const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 860;
const HEIGHT = 520;
const FRAMES = 54; // 54 frames loop (~4.6s)
const DELAY = 85;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 85, loopCount = 0, width = WIDTH, height = HEIGHT) {
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
// 🎆 SIÊU ĐẠI TIỆC PHÁO HOA GIAO HƯỞNG 12 CHỦNG LOẠI ĐỘC BẢN (FESTIVAL SPECTACULAR)
// 1. Kamuro Waterfall (Thác Đại Kim Liễu)
// 2. 5-Point Golden Star (Pháo Hoa Ngôi Sao Vàng 5 Cánh)
// 3. Heart Shape Ruby Bloom (Pháo Hoa Hình Trái Tim Đỏ Rực)
// 4. Saturn Dual-Ring (Vành Đai Sao Thổ 2 Tầng)
// 5. Emerald Palm Tree (Cây Cọ Lửa Ngọc Bích Thân Vàng)
// 6. Tourbillon / Spiral Bees (Pháo Hoa Ong Bay Xoáy Ốc)
// 7. Rainbow Ghost Peony (Hoa Cúc 7 Màu Biến Ảo)
// 8. Diamond Crossette (Pháo Hoa Tách Nhánh Chữ Thập)
// 9. Sapphire Cyan Chrysanthemum (Cẩm Tú Lam Ngọc Nhụy Vàng)
// 10. Spider Silk Shell (Pháo Hoa Chân Nhện Vươn Dài)
// 11. Roman Candle Fan Array (Dàn Phóng Quạt Tầm Thấp 7 Họng)
// 12. Grand Titanium Brocade Finale (Đại Cao Trào Bộc Phát Toàn Cảnh)
// -----------------------------------------------------------------------------
const SHELLS = [
  // 1. Thác Đại Kim Liễu (Trung tâm đỉnh trời)
  { launchF: 0, burstF: 6, lx: 430, cx: 440, cy: 110, maxR: 220, count: 60, type: 'kamuro', col1: '#facc15', col2: '#fef08a', trail: '#ca8a04', dur: 32 },
  // 2. Ngôi Sao Vàng 5 Cánh 3D (Bên trái cao)
  { launchF: 5, burstF: 11, lx: 210, cx: 200, cy: 140, maxR: 150, count: 45, type: 'star', col1: '#fef08a', col2: '#ffffff', trail: '#eab308', dur: 26 },
  // 3. Hình Trái Tim Đỏ Rực (Bên phải cao)
  { launchF: 10, burstF: 16, lx: 670, cx: 680, cy: 135, maxR: 155, count: 48, type: 'heart', col1: '#ef4444', col2: '#fca5a5', trail: '#b91c1c', dur: 26 },
  // 4. Cây Cọ Lửa Ngọc Bích (Emerald Palm)
  { launchF: 16, burstF: 22, lx: 320, cx: 310, cy: 175, maxR: 145, count: 42, type: 'palm', col1: '#10b981', col2: '#a7f3d0', trail: '#047857', dur: 25 },
  // 5. Vành Đai Sao Thổ 2 Tầng (Saturn Ring)
  { launchF: 21, burstF: 27, lx: 560, cx: 550, cy: 165, maxR: 150, count: 46, type: 'saturn', col1: '#ec4899', col2: '#f43f5e', trail: '#be185d', dur: 25 },
  // 6. Ong Bay Xoáy Ốc (Spiral Bees)
  { launchF: 27, burstF: 32, lx: 440, cx: 435, cy: 160, maxR: 140, count: 36, type: 'spiral', col1: '#38bdf8', col2: '#ffffff', trail: '#0284c7', dur: 24 },
  // 7. Hoa Cúc 7 Màu Biến Ảo (Rainbow Ghost)
  { launchF: 32, burstF: 38, lx: 180, cx: 175, cy: 190, maxR: 150, count: 50, type: 'rainbow', col1: '#a855f7', col2: '#f472b6', trail: '#7e22ce', dur: 27 },
  // 8. Tách Nhánh Chữ Thập (Diamond Crossette)
  { launchF: 37, burstF: 42, lx: 690, cx: 700, cy: 185, maxR: 145, count: 44, type: 'crossette', col1: '#06b6d4', col2: '#67e8f9', trail: '#0e7490', dur: 26 },
  // 9. Đại Cao Trào Bạch Kim Phù Hoa (Grand Titanium Finale)
  { launchF: 42, burstF: 47, lx: 430, cx: 430, cy: 195, maxR: 240, count: 68, type: 'finale', col1: '#ffffff', col2: '#fef08a', trail: '#facc15', dur: 32 }
];

function renderSymphonicFireworksSvg(frameIndex) {
  const elements = [];

  // Tính toán chiếu sáng bầu trời theo thời gian thực
  let totalSkyGlow = 0;
  let activeSkyCol = '#facc15';

  SHELLS.forEach(shell => {
    const elapsed = (frameIndex - shell.burstF + FRAMES) % FRAMES;
    if (elapsed >= 0 && elapsed <= 8) {
      const flash = Math.pow(1 - elapsed / 8, 1.8);
      totalSkyGlow += flash * 0.35;
      activeSkyCol = shell.col1;
    }
  });

  const skyOp = Math.min(0.48, totalSkyGlow).toFixed(2);

  // 1. BẦU TRỜI ĐÊM ĐIỆN ẢNH SÂU THẲM
  elements.push(`
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#realSkyGrad)" />
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${activeSkyCol}" opacity="${skyOp}" filter="url(#skyBloomFilter)" />
  `);

  // 2. KHÓI THUỐC PHÁO KHUẾCH TÁN ĐA SẮC
  SHELLS.forEach(shell => {
    const elapsed = (frameIndex - shell.burstF + FRAMES) % FRAMES;
    if (elapsed > 3 && elapsed < shell.dur + 6) {
      const p = (elapsed - 3) / (shell.dur + 4);
      const smokeOp = (0.24 * (1 - p)).toFixed(2);
      const smokeR = (45 + p * 115).toFixed(1);
      const smokeX = (shell.cx + p * 38).toFixed(1);
      const smokeY = (shell.cy - p * 16).toFixed(1);

      elements.push(`
        <circle cx="${smokeX}" cy="${smokeY}" r="${smokeR}" 
                fill="${shell.col1}" opacity="${smokeOp}" filter="url(#volumetricSmoke)"/>
      `);
    }
  });

  // 3. DÀN PHÓNG QUẠT TẦM THẤP (ROMAN CANDLE FAN ARRAY TỪ BỜ SÔNG)
  if (frameIndex % 18 < 6) {
    const fanP = (frameIndex % 18) / 6;
    for (let f = -3; f <= 3; f++) {
      const fanAngle = (-90 + f * 18) * (Math.PI / 180);
      const fanDist = fanP * 220;
      const startX = 430;
      const startY = 445;
      const curX = startX + Math.cos(fanAngle) * fanDist;
      const curY = startY + Math.sin(fanAngle) * fanDist;
      const tailX = startX + Math.cos(fanAngle) * (fanDist * 0.75);
      const tailY = startY + Math.sin(fanAngle) * (fanDist * 0.75);
      const fanCol = ['#ef4444', '#facc15', '#10b981', '#38bdf8', '#ec4899', '#a855f7', '#ffffff'][(f + 3) % 7];

      elements.push(`
        <line x1="${tailX.toFixed(1)}" y1="${tailY.toFixed(1)}" 
              x2="${curX.toFixed(1)}" y2="${curY.toFixed(1)}" 
              stroke="${fanCol}" stroke-width="2.8" opacity="${(1 - fanP * 0.4).toFixed(2)}" stroke-linecap="round"/>
        <circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="3" fill="#ffffff" filter="url(#sparkleLaser)"/>
      `);
    }
  }

  // 4. VỆT TÊN LỬA TẦM CAO PHÓNG VÚT LÊN TRỜI (ROCKET ASCENT TRAILS)
  SHELLS.forEach(shell => {
    const launchElapsed = (frameIndex - shell.launchF + FRAMES) % FRAMES;
    const launchDur = (shell.burstF - shell.launchF + FRAMES) % FRAMES;

    if (launchElapsed >= 0 && launchElapsed < launchDur) {
      const p = launchElapsed / launchDur;
      const curY = 445 - (445 - shell.cy) * Math.pow(p, 1.18);
      const tailY = curY + 42;
      const curX = shell.lx + (shell.cx - shell.lx) * p;

      elements.push(`
        <line x1="${curX.toFixed(1)}" y1="${tailY.toFixed(1)}" 
              x2="${curX.toFixed(1)}" y2="${curY.toFixed(1)}" 
              stroke="#fef08a" stroke-width="2.5" opacity="0.95" stroke-linecap="round"/>
        <circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="3" fill="#ffffff" filter="url(#sparkleLaser)"/>
      `);
    }
  });

  // 5. MÔ PHỎNG 12 CHỦNG LOẠI PHÁO HOA VẬT LÝ VỚI HÌNH DÁNG ĐỘC BẢN
  SHELLS.forEach(shell => {
    const elapsed = (frameIndex - shell.burstF + FRAMES) % FRAMES;

    if (elapsed >= 0 && elapsed < shell.dur) {
      const progress = elapsed / shell.dur;

      // Gia tốc nở hình cầu chân thực
      const easeDist = 1 - Math.pow(1 - progress, 3.3);
      const currentR = easeDist * shell.maxR;
      const opacity = Math.max(0, 1 - Math.pow(progress, 1.55));

      // Chớp sáng tâm nổ 2000°C (White-hot Flash Core)
      if (elapsed <= 2) {
        const flashR = (3 - elapsed) * 46;
        const flashOp = (1 - elapsed / 3).toFixed(2);
        elements.push(`
          <circle cx="${shell.cx}" cy="${shell.cy}" r="${flashR}" fill="#ffffff" opacity="${flashOp}" filter="url(#whiteHotCore)"/>
          <circle cx="${shell.cx}" cy="${shell.cy}" r="${flashR * 2.2}" fill="${shell.col2}" opacity="${(flashOp * 0.7).toFixed(2)}" filter="url(#whiteHotCore)"/>
        `);
      }

      for (let i = 0; i < shell.count; i++) {
        let baseAngle = (i / shell.count) * Math.PI * 2;
        let velFactor = 0.72 + (Math.sin(i * 11.3) * 0.5 + 0.5) * 0.38;
        let gravityMult = 38;
        let tailLag = 0.85;
        let pColor = shell.col2;

        // XỬ LÝ HÌNH HỌC THEO TỪNG LOẠI PHÁO HOA ĐỘC ĐÁO:
        if (shell.type === 'kamuro') {
          // Thác Kim Liễu vàng rủ dài
          gravityMult = 80;
          tailLag = 0.65;
        } else if (shell.type === 'star') {
          // Ngôi sao 5 cánh: điều chế bán kính r = 1 + 0.5 * cos(5 * theta)
          const starMod = 0.65 + 0.45 * Math.abs(Math.cos(5 * baseAngle / 2));
          velFactor = starMod;
          gravityMult = 28;
        } else if (shell.type === 'heart') {
          // Hình trái tim: tọa độ x = 16 sin^3(t), y = 13 cos(t) - 5 cos(2t)...
          const t = baseAngle;
          const hX = Math.pow(Math.sin(t), 3);
          const hY = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) / 16;
          velFactor = Math.sqrt(hX * hX + hY * hY) * 0.95;
          baseAngle = Math.atan2(hY, hX);
          gravityMult = 25;
        } else if (shell.type === 'saturn') {
          // Vành đai Sao Thổ 2 tầng
          if (i % 3 === 0) {
            velFactor = 0.45; // Khối nhân trung tâm
          } else {
            velFactor = 0.95 + Math.sin(i * 4) * 0.1; // Vành đai ngoài
          }
          gravityMult = 30;
        } else if (shell.type === 'palm') {
          // Cây cọ lá dừa
          gravityMult = 50;
          tailLag = 0.72;
        } else if (shell.type === 'spiral') {
          // Ong bay xoáy ốc (Tourbillon)
          const spiralAngle = baseAngle + progress * Math.PI * 4;
          velFactor = (0.5 + Math.sin(i * 7) * 0.5) * 0.9;
          baseAngle = spiralAngle;
          gravityMult = 20;
        } else if (shell.type === 'rainbow') {
          // 7 màu chuyển sắc
          const rainbowCols = ['#ef4444', '#facc15', '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
          pColor = rainbowCols[i % rainbowCols.length];
        } else if (shell.type === 'crossette') {
          // Tách nhánh chữ thập
          if (progress > 0.5) {
            velFactor += 0.25 * Math.sin(i * 4);
          }
        } else if (shell.type === 'finale') {
          // Đại cao trào Bạch Kim
          velFactor = 0.65 + (Math.sin(i * 13) * 0.5 + 0.5) * 0.55;
          gravityMult = 65;
          tailLag = 0.70;
        }

        const angle = baseAngle + Math.sin(i * 17.5) * 0.05;
        const r = currentR * velFactor;
        const gravity = Math.pow(progress, 2.2) * gravityMult;

        const x = shell.cx + Math.cos(angle) * r;
        const y = shell.cy + Math.sin(angle) * r + gravity;

        const tailX = shell.cx + Math.cos(angle) * (r * tailLag);
        const tailY = shell.cy + Math.sin(angle) * (r * tailLag) + (gravity * tailLag);

        const sparkSize = Math.max(0.7, (1 - progress * 0.48) * 3.3);
        const flicker = Math.sin(frameIndex * 2.8 + i * 2.1) * 0.35 + 0.65;
        const sparkOp = (opacity * flicker).toFixed(2);

        // Vệt hoa lửa kéo đuôi sáng mượt mà
        elements.push(`
          <line x1="${tailX.toFixed(1)}" y1="${tailY.toFixed(1)}" 
                x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" 
                stroke="${shell.trail}" stroke-width="${(sparkSize * 0.95).toFixed(1)}" 
                opacity="${(sparkOp * 0.85).toFixed(2)}" stroke-linecap="round"/>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sparkSize.toFixed(1)}" 
                  fill="${pColor}" opacity="${sparkOp}"/>
        `);

        // Đốm nổ lách tách ở đuôi cánh pháo hoa
        if (progress > 0.35 && (i + frameIndex) % 3 === 0) {
          const crackX = x + Math.sin(i * 5) * 3.5;
          const crackY = y + 4;
          elements.push(`
            <circle cx="${crackX.toFixed(1)}" cy="${crackY.toFixed(1)}" r="1.3" 
                    fill="#ffffff" opacity="${(sparkOp * 0.95).toFixed(2)}"/>
          `);
        }
      }
    }
  });

  // 6. THÀNH PHỐ ĐÊM ĐIỆN ẢNH & MẶT NƯỚC SÔNG PHẢN CHIẾU THỜI GIAN THỰC
  elements.push(`
    <!-- Mặt Nước Sông Đêm Gợn Sóng -->
    <rect x="0" y="440" width="${WIDTH}" height="80" fill="url(#realWaterGrad)" />
    <line x1="0" y1="440" x2="${WIDTH}" y2="440" stroke="#1e293b" stroke-width="1.2"/>

    <!-- Vệt Phản Chiếu Ánh Sáng Pháo Hoa Lung Linh Dưới Mặt Nước Sông -->
    <ellipse cx="440" cy="475" rx="260" ry="26" fill="#ca8a04" opacity="${(skyOp * 0.88).toFixed(2)}" filter="url(#volumetricSmoke)"/>
    <ellipse cx="200" cy="480" rx="130" ry="18" fill="#ef4444" opacity="${(skyOp * 0.78).toFixed(2)}" filter="url(#volumetricSmoke)"/>
    <ellipse cx="680" cy="478" rx="140" ry="20" fill="#0284c7" opacity="${(skyOp * 0.78).toFixed(2)}" filter="url(#volumetricSmoke)"/>

    <!-- Đường Chân Trời Thành Phố Đêm (City Skyline Silhouette) -->
    <g fill="#020617">
      <rect x="30" y="380" width="65" height="60"/>
      <rect x="105" y="350" width="75" height="90"/>
      <rect x="190" y="395" width="50" height="45"/>
      <!-- Tháp Landmark Cao Vút Vươn Lên Trời Đêm -->
      <polygon points="260,440 273,275 279,275 292,440"/>
      <line x1="276" y1="275" x2="276" y2="235" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="276" cy="235" r="2.5" fill="#ef4444"/>
      <rect x="310" y="365" width="70" height="75"/>
      <rect x="390" y="400" width="55" height="40"/>
      <!-- Cầu Thành Phố Vắt Ngang Sông -->
      <path d="M 455,440 Q 545,400 635,440" stroke="#090d16" stroke-width="16" fill="none"/>
      <rect x="660" y="355" width="80" height="85"/>
      <rect x="750" y="385" width="60" height="55"/>
      <rect x="820" y="340" width="40" height="100"/>
    </g>

    <!-- Hàng Triệu Ánh Đèn Cửa Sổ Thành Phố Ấm Áp -->
    <g fill="#fef08a" opacity="0.85">
      <rect x="120" y="365" width="4" height="6"/>
      <rect x="138" y="385" width="4" height="6"/>
      <rect x="155" y="405" width="4" height="6"/>
      <rect x="320" y="380" width="4" height="6"/>
      <rect x="345" y="400" width="4" height="6"/>
      <rect x="680" y="370" width="4" height="6"/>
      <rect x="705" y="390" width="4" height="6"/>
      <rect x="770" y="400" width="4" height="6"/>
      <!-- Đèn Cầu Lung Linh -->
      <circle cx="485" cy="425" r="1.5" fill="#facc15"/>
      <circle cx="525" cy="418" r="1.5" fill="#facc15"/>
      <circle cx="565" cy="418" r="1.5" fill="#facc15"/>
      <circle cx="605" cy="425" r="1.5" fill="#facc15"/>
    </g>
  `);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Bầu Trời Đêm Điện Ảnh 4K -->
        <linearGradient id="realSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#010409" />
          <stop offset="35%" stop-color="#030814" />
          <stop offset="70%" stop-color="#081022" />
          <stop offset="100%" stop-color="#12182c" />
        </linearGradient>

        <!-- Mặt Nước Sông Đêm -->
        <linearGradient id="realWaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#040816" />
          <stop offset="50%" stop-color="#010309" />
          <stop offset="100%" stop-color="#000000" />
        </linearGradient>

        <!-- Filters Khói Thuốc & Chớp Sáng Quang Học -->
        <filter id="volumetricSmoke" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="24"/>
        </filter>
        <filter id="skyBloomFilter" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="48"/>
        </filter>
        <filter id="whiteHotCore" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8"/>
        </filter>
        <filter id="sparkleLaser" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5"/>
        </filter>
      </defs>

      ${elements.join('\n')}
    </svg>
  `;
}

async function main() {
  console.log('🎆 Rendering Mega 12-Shell Symphonic Fireworks Spectacular (54 Frames / 85ms Real-Speed)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderSymphonicFireworksSvg(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 85, alphaQuality: 92, effort: 6, lossless: false })
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

  console.log(`🎉 Mega 12-Shell Symphonic Fireworks rendered successfully:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
