const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 480;
const HEIGHT = 520;
const FRAMES = 36;
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
    anmfHeader[15] = 0x02; // Dispose to background for clean transparency

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
  vp8xHeader[8] = 0x12; // Animation + Alpha
  writeUInt24LE(vp8xHeader, width - 1, 12);
  writeUInt24LE(vp8xHeader, height - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8); // Pure Transparent
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
// 🎂 BÁNH KEM SINH NHẬT 3D HOÀNG GIA ĐỘNG (100% NỀN TRONG SUỐT)
// - Bánh kem 2 tầng phủ sốt socola Bỉ bóng bẩy và kem vani óng ả
// - Trang trí dâu tây đỏ tươi mọng nước và ngọc trai vàng 24K
// - Ngọn nến lung linh bùng cháy, ngọn lửa uốn lượn theo nhịp khí động học
// - Các đốm pháo bông que lấp lánh (Sparkler Glints) bung nở lấp lánh
// -----------------------------------------------------------------------------
function renderAnimatedCakeFrame(frameIndex) {
  const rad = (frameIndex / FRAMES) * Math.PI * 2;

  // 1. NGỌN LỬA NẾN UỐN LƯỢN KHÍ ĐỘNG HỌC (PHYSICAL FLAME DYNAMICS)
  const flameSway = Math.sin(rad * 3) * 3.5;
  const flameScaleY = Math.sin(rad * 4) * 0.15 + 1.0;
  const flameFlicker = Math.sin(rad * 5) * 0.2 + 0.8;

  // 2. HÀO QUANG ÁNH NẾN TỎA SÁNG (VOLUMETRIC CANDLE GLOW)
  const glowR = (70 * flameFlicker).toFixed(1);
  const glowOp = (0.55 * flameFlicker).toFixed(2);

  // 3. ĐỐM PHÁO BÔNG LẤP LÁNH XUNG QUANH (SPARKLER PARTICLES)
  const sparkles = [];
  const numSparkles = 10;
  for (let i = 0; i < numSparkles; i++) {
    const sRad = rad * 2 + i * (Math.PI * 2 / numSparkles);
    const sDist = 55 + Math.sin(sRad * 1.5) * 35;
    const sX = (240 + Math.cos(sRad) * sDist).toFixed(1);
    const sY = (140 + Math.sin(sRad) * (sDist * 0.6)).toFixed(1);
    const sOp = (0.3 + (Math.sin(sRad * 3) * 0.5 + 0.5) * 0.7).toFixed(2);
    const sSize = (1.5 + Math.sin(sRad * 2) * 1.2).toFixed(1);

    sparkles.push(`
      <circle cx="${sX}" cy="${sY}" r="${sSize}" fill="#ffffff" opacity="${sOp}" filter="url(#sparkleBloom)"/>
      <polygon points="${sX},${sY - 4} ${Number(sX) + 1},${sY} ${sX},${Number(sY) + 4} ${sX - 1},${sY}" fill="#fef08a" opacity="${sOp}"/>
    `);
  }

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradients Kem Vani, Socola & Dâu Tây -->
        <linearGradient id="creamBase" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#fdf4ff" />
          <stop offset="35%" stop-color="#ffffff" />
          <stop offset="70%" stop-color="#fae8ff" />
          <stop offset="100%" stop-color="#f5d0fe" />
        </linearGradient>

        <linearGradient id="chocoDrip" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#451a03" />
          <stop offset="50%" stop-color="#78350f" />
          <stop offset="100%" stop-color="#3b1502" />
        </linearGradient>

        <radialGradient id="strawberryRed" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#ff4d4f" />
          <stop offset="40%" stop-color="#ef4444" />
          <stop offset="80%" stop-color="#b91c1c" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </radialGradient>

        <linearGradient id="candleWax" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f472b6" />
          <stop offset="30%" stop-color="#fdf2f8" />
          <stop offset="60%" stop-color="#ec4899" />
          <stop offset="100%" stop-color="#be185d" />
        </linearGradient>

        <!-- Ngọn Lửa Nến 3 Tầng Siêu Thực -->
        <radialGradient id="flameOuter" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fef08a" />
          <stop offset="60%" stop-color="#f97316" />
          <stop offset="90%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#38bdf8" />
        </radialGradient>

        <!-- Viền Đĩa Bạc Hoàng Gia -->
        <linearGradient id="silverPlate" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#94a3b8" />
          <stop offset="25%" stop-color="#f8fafc" />
          <stop offset="50%" stop-color="#ffffff" />
          <stop offset="75%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#64748b" />
        </linearGradient>

        <!-- Filters 3D & Quang Học -->
        <filter id="cakeDepthShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="14" flood-color="#000000" flood-opacity="0.45"/>
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#78350f" flood-opacity="0.35"/>
        </filter>
        <filter id="flameBloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="16"/>
        </filter>
        <filter id="sparkleBloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- ================= 1. ĐĨA BẠC ĐỠ BÁNH SINH NHẬT HOÀNG GIA ================= -->
      <g filter="url(#cakeDepthShadow)">
        <ellipse cx="240" cy="460" rx="195" ry="36" fill="url(#silverPlate)"/>
        <ellipse cx="240" cy="455" rx="180" ry="30" fill="#f1f5f9" stroke="#ffffff" stroke-width="2"/>
      </g>

      <!-- ================= 2. TẦNG BÁNH KEM LỚN DƯỚI (BOTTOM TIER) ================= -->
      <g filter="url(#cakeDepthShadow)">
        <!-- Thân bánh dưới -->
        <path d="M 90,360 L 90,430 C 90,460 390,460 390,430 L 390,360 Z" fill="url(#creamBase)"/>
        <!-- Mặt trên tầng dưới -->
        <ellipse cx="240" cy="360" rx="150" ry="32" fill="url(#creamBase)" stroke="#fdf4ff" stroke-width="1.5"/>

        <!-- Sốt Socola Bỉ Drip Chảy Xuống -->
        <path d="M 90,360 
                 C 105,395 115,395 125,370 
                 C 140,415 155,415 170,375 
                 C 190,430 210,430 225,380 
                 C 245,435 265,435 285,385 
                 C 305,420 325,420 340,375 
                 C 360,405 375,405 390,360 
                 C 390,335 90,335 90,360 Z" 
              fill="url(#chocoDrip)"/>
      </g>

      <!-- ================= 3. TẦNG BÁNH KEM NHỎ TRÊN (TOP TIER) ================= -->
      <g filter="url(#cakeDepthShadow)">
        <!-- Thân bánh trên -->
        <path d="M 140,260 L 140,330 C 140,355 340,355 340,330 L 340,260 Z" fill="url(#creamBase)"/>
        <!-- Mặt trên tầng bánh -->
        <ellipse cx="240" cy="260" rx="100" ry="24" fill="url(#creamBase)" stroke="#fdf4ff" stroke-width="1.5"/>

        <!-- Sốt Socola Drip tầng trên -->
        <path d="M 140,260 
                 C 155,290 165,290 175,270 
                 C 195,310 210,310 225,275 
                 C 245,315 260,315 275,280 
                 C 295,305 310,305 325,270 
                 C 335,285 340,285 340,260 
                 C 340,240 140,240 140,260 Z" 
              fill="url(#chocoDrip)"/>
      </g>

      <!-- ================= 4. DÂU TÂY ĐỎ MỌNG & KEM TƯƠI TRANG TRÍ ================= -->
      <!-- Dâu tây 1 (Trái) -->
      <g transform="translate(180, 245)">
        <path d="M 0,18 C -16,6 -14,-14 0,-18 C 14,-14 16,6 0,18 Z" fill="url(#strawberryRed)"/>
        <!-- Cuống dâu xanh -->
        <polygon points="0,-18 -6,-24 0,-20 6,-24" fill="#16a34a"/>
        <!-- Hạt dâu tây vàng -->
        <circle cx="-4" cy="-5" r="1" fill="#fef08a"/>
        <circle cx="4" cy="-2" r="1" fill="#fef08a"/>
        <circle cx="0" cy="6" r="1" fill="#fef08a"/>
      </g>

      <!-- Dâu tây 2 (Phải) -->
      <g transform="translate(300, 245)">
        <path d="M 0,18 C -16,6 -14,-14 0,-18 C 14,-14 16,6 0,18 Z" fill="url(#strawberryRed)"/>
        <polygon points="0,-18 -6,-24 0,-20 6,-24" fill="#16a34a"/>
        <circle cx="-4" cy="-5" r="1" fill="#fef08a"/>
        <circle cx="4" cy="-2" r="1" fill="#fef08a"/>
        <circle cx="0" cy="6" r="1" fill="#fef08a"/>
      </g>

      <!-- Bông kem tươi uốn xoắn trung tâm -->
      <circle cx="240" cy="255" r="15" fill="#ffffff" stroke="#fce7f3" stroke-width="1.5"/>

      <!-- ================= 5. CÂY NẾN SINH NHẬT & NGỌN LỬA BÙNG CHÁY 3D ================= -->
      <!-- Thân nến hồng xoắn sọc -->
      <g filter="url(#cakeDepthShadow)">
        <rect x="233" y="170" width="14" height="85" rx="4" fill="url(#candleWax)"/>
        <!-- Tim nến -->
        <line x1="240" y1="170" x2="${(240 + flameSway * 0.3).toFixed(1)}" y2="155" stroke="#1f2937" stroke-width="2.5"/>
      </g>

      <!-- Hào quang ánh nến lan tỏa -->
      <circle cx="${(240 + flameSway).toFixed(1)}" cy="135" r="${glowR}" fill="#f97316" opacity="${glowOp}" filter="url(#flameBloom)"/>
      <circle cx="${(240 + flameSway).toFixed(1)}" cy="135" r="${(glowR * 0.5).toFixed(1)}" fill="#fef08a" opacity="${(glowOp * 0.9).toFixed(2)}" filter="url(#flameBloom)"/>

      <!-- Ngọn Lửa Nến Sinh Nhật Uốn Lượn Khí Động Học -->
      <g transform="translate(${(240 + flameSway).toFixed(1)}, 140) scale(1, ${flameScaleY.toFixed(2)})">
        <!-- Ngọn lửa ngoài vàng cam -->
        <path d="M 0,-30 C 14,-14 12,10 0,14 C -12,10 -14,-14 0,-30 Z" fill="url(#flameOuter)"/>
        <!-- Lõi lửa trắng nóng 2000°C -->
        <path d="M 0,-18 C 7,-8 6,6 0,8 C -6,6 -7,-8 0,-18 Z" fill="#ffffff"/>
        <!-- Đáy lửa xanh lam mát dịu -->
        <ellipse cx="0" cy="12" rx="4" ry="2.5" fill="#38bdf8" opacity="0.85"/>
      </g>

      <!-- ================= 6. CÁC ĐỐM PHÁO BÔNG QUE LẤP LÁNH ================= -->
      ${sparkles.join('\n')}
    </svg>
  `;
}

async function main() {
  console.log('🎂 Rendering 100% Transparent Animated 3D Birthday Cake (WebP)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderAnimatedCakeFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 90, alphaQuality: 95, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/birthday_cake_animated_transparent.webp'),
    path.join(__dirname, '../pictures/birthday_cake_animated_transparent.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 100% Transparent Animated Birthday Cake rendered successfully:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
