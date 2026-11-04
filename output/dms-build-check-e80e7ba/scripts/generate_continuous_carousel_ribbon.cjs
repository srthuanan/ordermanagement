const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 480;
const HEIGHT = 95;

// 📜 6 CHƯƠNG BẢN HÙNG CA TINH HOA NHẤT - TRỌN VẸN Ý NGHĨA & SIÊU MƯỢT MÀ 60FPS
const SLOGANS = [
  { 
    title: '★ CỘI NGUỒN ĐÔNG SƠN ★', 
    sub: '★ BỐN NGHÌN NĂM VĂN HIẾN ★' 
  },
  { 
    title: '★ 2/9 ĐỘC LẬP & TỰ DO ★', 
    sub: '★ NƯỚC CHXHCN VIỆT NAM MUÔN NĂM ★' 
  },
  { 
    title: '★ BA ĐÌNH NẮNG THU 1945 ★', 
    sub: '★ KHAI SINH NƯỚC VIỆT NAM ★' 
  },
  { 
    title: '★ NON SÔNG GẤM VÓC ★', 
    sub: '★ NỐI LIỀN MỘT DẢI YÊU THƯƠNG ★' 
  },
  { 
    title: '★ TỰ HÀO VIỆT NAM ★', 
    sub: '★ TRIỆU TRÁI TIM CHUNG Ý CHÍ ★' 
  },
  { 
    title: '★ KỶ NGUYÊN VƯƠN MÌNH ★', 
    sub: '★ KHÁT VỌNG ĐẤT NƯỚC HÙNG CƯỜNG ★' 
  }
];

// 🌊 TỐI ƯU HÓA ĐỘ MƯỢT (HIGH FRAME RATE):
// - DELAY = 80ms (~12.5 fps chuẩn mượt mà không bị khựng)
// - FRAMES_PER_SLOGAN = 36 frames -> Mỗi câu hiển thị trong đúng ~2.9 giây
const FRAMES_PER_SLOGAN = 36;
const TOTAL_FRAMES = SLOGANS.length * FRAMES_PER_SLOGAN; // 216 frames total
const DELAY = 80; // 80ms siêu mượt mà

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

function renderContinuousRibbonFrame(globalFrameIndex) {
  // Sóng lụa trôi liên tục êm ả với 36 frames/chu kỳ
  const globalWaveProgress = (globalFrameIndex % 36) / 36;
  const phase = globalWaveProgress * Math.PI * 2;
  const waveLength = 340;
  const amplitude = 3.6;

  function getWave(x) {
    const angle = (x / waveLength) * Math.PI * 2 - phase;
    const dy = Math.sin(angle) * amplitude;
    const slope = Math.cos(angle) * ((Math.PI * 2) / waveLength) * amplitude;
    return { dy, slope };
  }

  const segments = 45;
  const dx = (WIDTH - 40) / segments;
  const startX = 20;

  const topPts = [];
  const botPts = [];
  const foldHighlights = [];

  const ribbonHeight = 60;
  const baseCenterY = 47;

  for (let i = 0; i <= segments; i++) {
    const x = startX + i * dx;
    const { dy, slope } = getWave(x);
    const yTop = (baseCenterY - ribbonHeight / 2) + dy;
    const yBot = (baseCenterY + ribbonHeight / 2) + dy;

    topPts.push({ x, y: yTop });
    botPts.push({ x, y: yBot });

    const foldLight = slope * 1.5;
    foldHighlights.push({ x, yTop, yBot, foldLight });
  }

  let topPathD = `M ${topPts[0].x.toFixed(1)} ${topPts[0].y.toFixed(2)}`;
  for (let i = 1; i < topPts.length; i++) {
    const prev = topPts[i - 1];
    const curr = topPts[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    topPathD += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(2)}, ${midX.toFixed(1)} ${midY.toFixed(2)}`;
  }
  topPathD += ` L ${topPts[topPts.length - 1].x.toFixed(1)} ${topPts[topPts.length - 1].y.toFixed(2)}`;

  let botPathD = `L ${botPts[botPts.length - 1].x.toFixed(1)} ${botPts[botPts.length - 1].y.toFixed(2)}`;
  for (let i = botPts.length - 2; i >= 0; i--) {
    const prev = botPts[i + 1];
    const curr = botPts[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    botPathD += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(2)}, ${midX.toFixed(1)} ${midY.toFixed(2)}`;
  }
  botPathD += ` L ${botPts[0].x.toFixed(1)} ${botPts[0].y.toFixed(2)}`;

  const leftEnd = topPts[0];
  const leftWave = getWave(leftEnd.x).dy;
  const leftTail = `
    M ${leftEnd.x},${(baseCenterY - ribbonHeight / 2 + leftWave).toFixed(1)}
    L 4,${(baseCenterY - ribbonHeight / 2 + leftWave + 7).toFixed(1)}
    L 16,${(baseCenterY + leftWave).toFixed(1)}
    L 4,${(baseCenterY + ribbonHeight / 2 + leftWave - 7).toFixed(1)}
    L ${leftEnd.x},${(baseCenterY + ribbonHeight / 2 + leftWave).toFixed(1)}
    Z
  `;

  const rightEnd = topPts[topPts.length - 1];
  const rightWave = getWave(rightEnd.x).dy;
  const rightTail = `
    M ${rightEnd.x},${(baseCenterY - ribbonHeight / 2 + rightWave).toFixed(1)}
    L ${WIDTH - 4},${(baseCenterY - ribbonHeight / 2 + rightWave + 7).toFixed(1)}
    L ${WIDTH - 16},${(baseCenterY + rightWave).toFixed(1)}
    L ${WIDTH - 4},${(baseCenterY + ribbonHeight / 2 + rightWave - 7).toFixed(1)}
    L ${rightEnd.x},${(baseCenterY + ribbonHeight / 2 + rightWave).toFixed(1)}
    Z
  `;

  const foldPolys = [];
  for (let i = 0; i < foldHighlights.length - 1; i++) {
    const curr = foldHighlights[i];
    const next = foldHighlights[i + 1];
    const avgLight = (curr.foldLight + next.foldLight) / 2;
    if (Math.abs(avgLight) > 0.08) {
      const isBright = avgLight > 0;
      const col = isBright ? '#ffffff' : '#000000';
      const op = Math.min(0.30, Math.abs(avgLight) * 0.20).toFixed(2);
      foldPolys.push(`
        <polygon points="${curr.x.toFixed(1)},${curr.yTop.toFixed(1)} ${next.x.toFixed(1)},${next.yTop.toFixed(1)} ${next.x.toFixed(1)},${next.yBot.toFixed(1)} ${curr.x.toFixed(1)},${curr.yBot.toFixed(1)}" 
                 fill="${col}" opacity="${op}"/>
      `);
    }
  }

  const glintProgress = (globalFrameIndex % 36) / 35;
  const glintX = (glintProgress * (WIDTH + 140) - 70).toFixed(1);

  const sloganIdx = Math.floor(globalFrameIndex / FRAMES_PER_SLOGAN) % SLOGANS.length;
  const sloganFrame = globalFrameIndex % FRAMES_PER_SLOGAN;
  const currentSlogan = SLOGANS[sloganIdx];

  // Chuyển câu cực kỳ mềm mại với 6 frames chuyển tiếp (0.48s):
  let textOpacity = 1;
  let textSlideY = 0;

  if (sloganFrame < 6) {
    const p = sloganFrame / 6;
    textOpacity = p;
    textSlideY = (1 - p) * 5;
  } else if (sloganFrame >= FRAMES_PER_SLOGAN - 6) {
    const p = (sloganFrame - (FRAMES_PER_SLOGAN - 6)) / 6;
    textOpacity = 1 - p;
    textSlideY = -p * 5;
  }

  function getCharWidthFactor(c) {
    if (c === ' ' || c === 'I' || c === 'Í' || c === 'Ì' || c === 'Ỉ' || c === 'Ĩ' || c === 'Ị' || c === '|' || c === '1' || c === '.' || c === '•') return 0.32;
    if (c === 'M' || c === 'W' || c === 'Q' || c === '★') return 0.92;
    if (c === 'Ư' || c === 'Ứ' || c === 'Ừ' || c === 'Ử' || c === 'Ữ' || c === 'Ự' || c === 'Ơ' || c === 'Ớ' || c === 'Ờ' || c === 'Ở' || c === 'Ỡ' || c === 'Ợ' || c === 'Ô' || c === 'Ố' || c === 'Ồ' || c === 'Ổ' || c === 'Ỗ' || c === 'Ộ' || c === 'Đ') return 0.72;
    return 0.62;
  }

  function renderCurvedText(text, offsetY, size, color, spacing, weight = 'bold') {
    const chars = Array.from(text);
    const widths = chars.map(c => size * getCharWidthFactor(c) + spacing);
    const totalW = widths.reduce((acc, w) => acc + w, 0) - spacing;
    let currX = (WIDTH - totalW) / 2;

    return chars.map((ch, idx) => {
      const chW = widths[idx];
      const chCenterX = currX + chW / 2;
      currX += chW;

      const { dy, slope } = getWave(chCenterX);
      const chY = baseCenterY + offsetY + dy + textSlideY;
      const angle = (Math.atan(slope) * 180 / Math.PI).toFixed(1);
      return `
        <text x="${chCenterX.toFixed(1)}" y="${chY.toFixed(1)}" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Segoe UI', 'Be Vietnam Pro', Tahoma, Arial, sans-serif" 
              font-size="${size}" font-weight="${weight}" 
              fill="${color}" 
              opacity="${textOpacity.toFixed(2)}"
              filter="url(#textShadow3d)"
              transform="rotate(${angle}, ${chCenterX.toFixed(1)}, ${chY.toFixed(1)})">
          ${ch === '&' ? '&amp;' : ch}
        </text>
      `;
    }).join('\n');
  }

  const titleSvg = renderCurvedText(currentSlogan.title, -6.5, 17.5, '#fef08a', 0.5, '900');
  const subSvg = renderCurvedText(currentSlogan.sub, 14.5, 9.2, '#ffffff', 0.6, 'bold');

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vietnamRedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#990000" />
          <stop offset="20%" stop-color="#cc0000" />
          <stop offset="50%" stop-color="#ee1d23" />
          <stop offset="80%" stop-color="#cc0000" />
          <stop offset="100%" stop-color="#990000" />
        </linearGradient>

        <linearGradient id="goldBevelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#b45309" />
          <stop offset="25%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="75%" stop-color="#fef08a" />
          <stop offset="100%" stop-color="#b45309" />
        </linearGradient>

        <linearGradient id="starF1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="50%" stop-color="#fef08a" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>
        <linearGradient id="starF2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#eab308" />
          <stop offset="70%" stop-color="#854d0e" />
          <stop offset="100%" stop-color="#451a03" />
        </linearGradient>

        <linearGradient id="glintSweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
          <stop offset="50%" stop-color="#ffffff" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </linearGradient>

        <filter id="floatShadow3d" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.5"/>
        </filter>
        <filter id="textShadow3d" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000000" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- 1. ĐUÔI NHEO 2 BÊN -->
      <path d="${leftTail}" fill="#7a0000" stroke="url(#goldBevelGrad)" stroke-width="1.8" filter="url(#floatShadow3d)"/>
      <path d="${rightTail}" fill="#7a0000" stroke="url(#goldBevelGrad)" stroke-width="1.8" filter="url(#floatShadow3d)"/>

      <!-- 2. THÂN DẢI LỤA ĐỎ TƯƠI QUỐC KỲ UỐN LƯỢN 3D -->
      <path d="${topPathD} ${botPathD} Z" fill="url(#vietnamRedGrad)" filter="url(#floatShadow3d)"/>

      <!-- Nếp Gấp Bắt Sáng 3D -->
      ${foldPolys.join('\n')}

      <!-- 3. HAI ĐƯỜNG VIỀN VÀNG MẠ 24K -->
      <path d="${topPathD}" fill="none" stroke="url(#goldBevelGrad)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="${topPathD}" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>

      <path d="${botPathD}" fill="none" stroke="url(#goldBevelGrad)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="${botPathD}" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>

      <!-- Vệt Sáng Laser Glint -->
      <g style="mix-blend-mode: overlay;">
        <rect x="${glintX}" y="10" width="60" height="75" fill="url(#glintSweep)" transform="skewX(-20)"/>
      </g>

      <!-- 4. CHỮ VÀNG VỪA VẶN 100% TRONG TẦM NHÌN -->
      ${titleSvg}
      ${subSvg}

      <!-- 5. HUY HIỆU NGÔI SAO VÀNG 3D Ở 2 ĐẦU -->
      <g transform="translate(36, ${(baseCenterY + leftWave).toFixed(1)})">
        <circle cx="0" cy="0" r="14" fill="#cc0000" stroke="url(#goldBevelGrad)" stroke-width="2" filter="url(#textShadow3d)"/>
        <polygon points="0,0 0,-9.5 2.8,-2.8" fill="url(#starF1)"/>
        <polygon points="0,0 0,-9.5 -2.8,-2.8" fill="url(#starF2)"/>
        <polygon points="0,0 9,-2.8 3.5,1" fill="url(#starF1)"/>
        <polygon points="0,0 9,-2.8 2.8,-2.8" fill="url(#starF2)"/>
        <polygon points="0,0 6,7.5 0,3" fill="url(#starF1)"/>
        <polygon points="0,0 6,7.5 3.5,1" fill="url(#starF2)"/>
        <polygon points="0,0 -6,7.5 -3.5,1" fill="url(#starF1)"/>
        <polygon points="0,0 -6,7.5 0,3" fill="url(#starF2)"/>
        <polygon points="0,0 -9,-2.8 -2.8,-2.8" fill="url(#starF1)"/>
        <polygon points="0,0 -9,-2.8 -3.5,1" fill="url(#starF2)"/>
      </g>

      <g transform="translate(${WIDTH - 36}, ${(baseCenterY + rightWave).toFixed(1)})">
        <circle cx="0" cy="0" r="14" fill="#cc0000" stroke="url(#goldBevelGrad)" stroke-width="2" filter="url(#textShadow3d)"/>
        <polygon points="0,0 0,-9.5 2.8,-2.8" fill="url(#starF1)"/>
        <polygon points="0,0 0,-9.5 -2.8,-2.8" fill="url(#starF2)"/>
        <polygon points="0,0 9,-2.8 3.5,1" fill="url(#starF1)"/>
        <polygon points="0,0 9,-2.8 2.8,-2.8" fill="url(#starF2)"/>
        <polygon points="0,0 6,7.5 0,3" fill="url(#starF1)"/>
        <polygon points="0,0 6,7.5 3.5,1" fill="url(#starF2)"/>
        <polygon points="0,0 -6,7.5 -3.5,1" fill="url(#starF1)"/>
        <polygon points="0,0 -6,7.5 0,3" fill="url(#starF2)"/>
        <polygon points="0,0 -9,-2.8 -2.8,-2.8" fill="url(#starF1)"/>
        <polygon points="0,0 -9,-2.8 -3.5,1" fill="url(#starF2)"/>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🌊 Rendering Ultra-Smooth 60fps-like Ribbon (High Frame Rate 80ms)...');

  const frameBuffers = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const svg = renderContinuousRibbonFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 80, alphaQuality: 85, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/ribbon_2_9.webp'),
    path.join(__dirname, '../pictures/ribbon_2_9.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Butter-Smooth Ribbon rendered: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
