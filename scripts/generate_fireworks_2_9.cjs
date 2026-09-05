const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 600;
const HEIGHT = 400;
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
// 🎆 ĐẠI LỄ PHÁO HOA RỰC RỠ KỶ NIỆM QUỐC KHÁNH 2/9
// - Các chùm pháo hoa bung nở đa tầng: Đỏ Cờ, Vàng Kim, Xanh Sapphire, Ngọc Bích
// - Quỹ đạo tia sáng bung nở hình cầu, sao rơi lấp lánh (Particle Physics)
// - Dòng chữ Tự Hào 2/9 & Ngôi Sao Vàng Tổ Quốc rực sáng trong đêm hội
// -----------------------------------------------------------------------------
const FIREWORK_BURSTS = [
  // 1. Pháo hoa Đỏ Cờ & Vàng Kim (Trung tâm trên cao)
  { startFrame: 0, cx: 300, cy: 130, maxRadius: 130, numSparks: 32, colors: ['#ef4444', '#facc15', '#ffffff', '#f87171'] },
  // 2. Pháo hoa Vàng Hoàng Gia 24K (Bên trái)
  { startFrame: 8, cx: 130, cy: 170, maxRadius: 105, numSparks: 26, colors: ['#fef08a', '#eab308', '#ca8a04', '#ffffff'] },
  // 3. Pháo hoa Xanh Sapphire & Bạc (Bên phải)
  { startFrame: 14, cx: 470, cy: 160, maxRadius: 115, numSparks: 28, colors: ['#38bdf8', '#0284c7', '#ffffff', '#93c5fd'] },
  // 4. Pháo hoa Đa Sắc Phù Hoa (Trung tâm tầng 2)
  { startFrame: 22, cx: 280, cy: 190, maxRadius: 110, numSparks: 26, colors: ['#ec4899', '#f43f5e', '#fde047', '#ffffff'] }
];

function renderFireworksFrame(frameIndex) {
  const sparksSvg = [];

  FIREWORK_BURSTS.forEach(burst => {
    const elapsed = (frameIndex - burst.startFrame + FRAMES) % FRAMES;
    const duration = 22; // Mỗi quả pháo kéo dài 22 frames (~1.7s)

    if (elapsed < duration) {
      const progress = elapsed / duration;
      // Easing nở nhanh lúc đầu, trôi chậm dần lúc sau
      const easeOut = 1 - Math.pow(1 - progress, 2.5);
      const currentRadius = easeOut * burst.maxRadius;
      const opacity = Math.max(0, 1 - Math.pow(progress, 1.8));

      for (let i = 0; i < burst.numSparks; i++) {
        const angle = (i / burst.numSparks) * Math.PI * 2 + (burst.cx % 5);
        const speedVar = 0.75 + ((i % 5) * 0.08);
        const r = currentRadius * speedVar;

        // Trọng lực làm rơi nhẹ các tàn pháo ở cuối chu kỳ
        const gravity = Math.pow(progress, 2.2) * 28;

        const x = burst.cx + Math.cos(angle) * r;
        const y = burst.cy + Math.sin(angle) * r + gravity;

        const color = burst.colors[i % burst.colors.length];
        const sparkSize = Math.max(1, (1 - progress * 0.6) * 3.5);

        // Vệt tia sáng pháo hoa (Trail line)
        const tailX = burst.cx + Math.cos(angle) * (r * 0.85);
        const tailY = burst.cy + Math.sin(angle) * (r * 0.85) + (gravity * 0.8);

        sparksSvg.push(`
          <line x1="${tailX.toFixed(1)}" y1="${tailY.toFixed(1)}" 
                x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" 
                stroke="${color}" stroke-width="${(sparkSize * 0.8).toFixed(1)}" 
                opacity="${(opacity * 0.7).toFixed(2)}" stroke-linecap="round"/>
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${sparkSize.toFixed(1)}" 
                  fill="${color}" opacity="${opacity.toFixed(2)}"/>
        `);

        // Đốm sáng lấp lánh (Sparkle glint) ngẫu nhiên
        if ((i + frameIndex) % 4 === 0 && opacity > 0.4) {
          sparksSvg.push(`
            <polygon points="${x.toFixed(1)},${(y - 6).toFixed(1)} ${(x + 2).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + 6).toFixed(1)} ${(x - 2).toFixed(1)},${y.toFixed(1)}" 
                     fill="#ffffff" opacity="${(opacity * 0.9).toFixed(2)}"/>
          `);
        }
      }

      // Tâm bộc phát chói lóa lúc mới nổ (Flash burst)
      if (elapsed <= 3) {
        const flashRadius = (3 - elapsed) * 25;
        const flashOp = (1 - elapsed / 4).toFixed(2);
        sparksSvg.push(`
          <circle cx="${burst.cx}" cy="${burst.cy}" r="${flashRadius}" fill="#ffffff" opacity="${flashOp}"/>
          <circle cx="${burst.cx}" cy="${burst.cy}" r="${flashRadius * 1.8}" fill="${burst.colors[0]}" opacity="${(flashOp * 0.5).toFixed(2)}"/>
        `);
      }
    }
  });

  // Ánh sáng quét rực rỡ nền trời
  const glowPhase = Math.sin((frameIndex / FRAMES) * Math.PI * 2);
  const skyGlow = (0.25 + glowPhase * 0.1).toFixed(2);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Bầu Trời Đêm Lễ Hội Sâu Thẳm -->
        <linearGradient id="nightSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#020617" />
          <stop offset="40%" stop-color="#0f172a" />
          <stop offset="80%" stop-color="#1e1b4b" />
          <stop offset="100%" stop-color="#31102f" />
        </linearGradient>

        <!-- Quầng sáng Đỏ Vàng Quốc Khánh -->
        <radialGradient id="nationAura" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#e11d48" stop-opacity="${skyGlow}" />
          <stop offset="40%" stop-color="#ca8a04" stop-opacity="${(skyGlow * 0.6).toFixed(2)}" />
          <stop offset="100%" stop-color="#020617" stop-opacity="0" />
        </radialGradient>

        <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ca8a04" />
          <stop offset="25%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="75%" stop-color="#fef08a" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>

        <filter id="festiveGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#f59e0b" flood-opacity="0.8"/>
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.9"/>
        </filter>
      </defs>

      <!-- 1. BẦU TRỜI ĐÊM ĐẠI LỄ -->
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#nightSky)" rx="16"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#nationAura)" rx="16"/>

      <!-- 2. HÀNG TRIỆU TIA PHÁO HOA BUNG NỞ (PARTICLES) -->
      ${sparksSvg.join('\n')}

      <!-- 3. BIỂU TƯỢNG NGÔI SAO VÀNG 3D VÀ BẢN ĐỒ VIỆT NAM TRÊN NỀN TRỜI -->
      <g transform="translate(300, 85)" opacity="0.85" filter="url(#festiveGlow)">
        <!-- 3D Star Facets -->
        <polygon points="0,0 0,-24 7,-7" fill="#ffffff"/>
        <polygon points="0,0 0,-24 -7,-7" fill="#ca8a04"/>
        <polygon points="0,0 23,-7 9,3" fill="#ffffff"/>
        <polygon points="0,0 23,-7 7,-7" fill="#ca8a04"/>
        <polygon points="0,0 14,19 0,8" fill="#ffffff"/>
        <polygon points="0,0 14,19 9,3" fill="#ca8a04"/>
        <polygon points="0,0 -14,19 -9,3" fill="#ffffff"/>
        <polygon points="0,0 -14,19 0,8" fill="#ca8a04"/>
        <polygon points="0,0 -23,-7 -7,-7" fill="#ffffff"/>
        <polygon points="0,0 -23,-7 -9,3" fill="#ca8a04"/>
      </g>

      <!-- 4. BANNER CHÚC MỪNG QUỐC KHÁNH 2/9 DƯỚI ĐÁY -->
      <g transform="translate(300, 340)" filter="url(#festiveGlow)">
        <!-- Dải Nẹp Hoàng Kim -->
        <rect x="-240" y="-30" width="480" height="58" rx="14" fill="#0f172a" stroke="url(#goldTextGrad)" stroke-width="2" opacity="0.95"/>
        
        <!-- Tiêu đề chính rực rỡ -->
        <text x="0" y="-4" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="22" font-weight="900" 
              letter-spacing="4"
              fill="url(#goldTextGrad)">
          🇻🇳 CHÀO MỪNG QUỐC KHÁNH 2/9 🇻🇳
        </text>

        <!-- Phụ đề hào hùng -->
        <text x="0" y="17" 
              text-anchor="middle" dominant-baseline="central"
              font-family="'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif" 
              font-size="11" font-weight="800" 
              letter-spacing="3"
              fill="#fef08a">
          ★ TỰ HÀO VIỆT NAM • ĐỘC LẬP &amp; TỰ DO ★
        </text>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🎆 Rendering Brilliant National Day 2/9 Fireworks Animation (WebP)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderFireworksFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 85, alphaQuality: 90, effort: 6, lossless: false })
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

  console.log(`🎉 Brilliant National Day Fireworks rendered successfully:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
