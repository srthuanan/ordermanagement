const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const FRAMES = 36;
const DELAY = 50; // 50ms per frame = 1.8s per complete 360-deg rotation
const WIDTH = 380;
const HEIGHT = 380;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 50, loopCount = 0, width = WIDTH, height = HEIGHT) {
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

// ---------------------------------------------------------------------------------
// AUTHENTIC DRIED PALM LEAF COLOR PALETTE (MÀU LÁ NÓN / LÁ CỌ KHÔ TRUYỀN THỐNG CHUẨN THẬT)
// - Nền lá cọ khô: Màu trắng ngà / be cát tự nhiên (#FAF6EC -> #EFE5D0 -> #DDCDB0 -> #B8A585)
// - Gân nan cọ: Màu nâu gỗ be nhạt mỏng mảnh (#8C7B5D)
// - Vành tre: Màu cật tre tự nhiên (#A89574)
// - Quai nón: Màu lụa sen hồng / tím Huế dịu dàng (#E11D48 -> #BE185D)
// ---------------------------------------------------------------------------------
function renderAuthenticRealNonLa(frameIndex) {
  const progress = frameIndex / FRAMES;
  const rotAngle = progress * Math.PI * 2;
  
  // Geometrical parameters for 3D Conical Hat
  const cx = 190;
  const cy = 205;
  const apexX = 190;
  const apexY = 85;
  const rx = 150; // Bán kính ngang vành nón
  const ry = 48;  // Bán kính dọc vành nón
  const baseCenterY = 245;

  // Lơ lửng nhẹ
  const floatY = Math.sin(rotAngle * 2) * 3.5;
  const tiltAngle = Math.sin(rotAngle) * 2.8;

  // 24 Nan cọ lá nón xoay quanh trục 360 độ
  const numRibs = 28;
  let ribsSvg = '';

  for (let i = 0; i < numRibs; i++) {
    const ribAngle = (i / numRibs) * Math.PI * 2 + rotAngle;
    const sinA = Math.sin(ribAngle);
    const cosA = Math.cos(ribAngle);
    
    const rimX = cx + cosA * rx;
    const rimY = (baseCenterY + floatY) + sinA * ry;

    const isFront = sinA >= -0.15;
    const ribOpacity = isFront ? (0.15 + (sinA + 0.15) * 0.4).toFixed(2) : '0';

    if (isFront && ribOpacity > 0.05) {
      ribsSvg += `
        <line x1="${apexX}" y1="${apexY + floatY}" x2="${rimX.toFixed(1)}" y2="${rimY.toFixed(1)}" 
              stroke="#7a6a4d" stroke-width="0.9" opacity="${ribOpacity}" stroke-linecap="round"/>
      `;
    }
  }

  // 16 Vòng nan tre đồng tâm truyền thống nón lá làng Chuông
  let concentricRingsSvg = '';
  const numRings = 16;
  for (let r = 1; r <= numRings; r++) {
    const t = r / (numRings + 1);
    const ringY = apexY + floatY + t * (baseCenterY - apexY);
    const ringRx = t * rx;
    const ringRy = t * ry;
    concentricRingsSvg += `
      <ellipse cx="${cx}" cy="${ringY.toFixed(1)}" rx="${ringRx.toFixed(1)}" ry="${ringRy.toFixed(1)}" 
               fill="none" stroke="#9c8969" stroke-width="0.75" opacity="0.4"/>
    `;
  }

  // Quai nón lụa mềm mại xoay nhẹ
  const ribbonAngle = rotAngle;
  const ribbonX1 = cx + Math.cos(ribbonAngle) * (rx * 0.75);
  const ribbonY1 = (baseCenterY + floatY - 20) + Math.sin(ribbonAngle) * (ry * 0.75);
  const ribbonX2 = cx + Math.cos(ribbonAngle + Math.PI) * (rx * 0.75);
  const ribbonY2 = (baseCenterY + floatY - 20) + Math.sin(ribbonAngle + Math.PI) * (ry * 0.75);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- 🌾 MÀU SẮC LÁ CỌ KHÔ TỰ NHIÊN CHUẨN NÓN LÁ THẬT 100% -->
        <radialGradient id="realLeafGradient" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stop-color="#fffef8" />
          <stop offset="22%" stop-color="#f8f4e6" />
          <stop offset="48%" stop-color="#ede3cd" />
          <stop offset="72%" stop-color="#ddceb2" />
          <stop offset="90%" stop-color="#c8b594" />
          <stop offset="100%" stop-color="#9a8764" />
        </radialGradient>

        <!-- Lớp Ánh Sáng Tự Nhiên (Natural Sun Sheen) -->
        <linearGradient id="realSunSheen" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55" />
          <stop offset="40%" stop-color="#ffffff" stop-opacity="0.05" />
          <stop offset="75%" stop-color="#4a3b2c" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#261c14" stop-opacity="0.65" />
        </linearGradient>

        <!-- Vành Tre Cật Tự Nhiên -->
        <linearGradient id="bambooRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ede3cd" />
          <stop offset="35%" stop-color="#fffef8" />
          <stop offset="70%" stop-color="#bda988" />
          <stop offset="100%" stop-color="#7a6a4d" />
        </linearGradient>

        <!-- Quai Lụa Sen Truyền Thống -->
        <linearGradient id="silkRibbonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fb7185" />
          <stop offset="50%" stop-color="#e11d48" />
          <stop offset="100%" stop-color="#9f1239" />
        </linearGradient>

        <!-- Drop Shadow Tự Nhiên -->
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="${(15 + floatY).toFixed(1)}" stdDeviation="9" flood-color="#1e293b" flood-opacity="0.22"/>
        </filter>
      </defs>

      <!-- 1. Bóng Đổ Tiếp Xúc Dưới Đáy Nón Lá -->
      <ellipse cx="${cx}" cy="${baseCenterY + 45}" rx="${(rx * 0.85).toFixed(1)}" ry="15" fill="#0f172a" opacity="${(0.16 - floatY*0.01).toFixed(2)}" filter="blur(8px)"/>

      <!-- 2. Khối Nón Lá 3D Xoay Quanh Trục Nón -->
      <g transform="rotate(${tiltAngle.toFixed(2)}, ${cx}, ${cy})" filter="url(#softShadow)">
        
        <!-- Mặt Trong Nón Lá (Lòng Nón Màu Nâu Gỗ Nhạt Tự Nhiên) -->
        <ellipse cx="${cx}" cy="${(baseCenterY + floatY).toFixed(1)}" rx="${rx}" ry="${ry}" fill="#4a3a24" stroke="#6b573b" stroke-width="1.2"/>

        <!-- Quai Nón Lụa Mềm Mại -->
        <path d="M ${ribbonX1.toFixed(1)},${ribbonY1.toFixed(1)} Q ${cx},${(baseCenterY + floatY + 70).toFixed(1)} ${ribbonX2.toFixed(1)},${ribbonY2.toFixed(1)}" 
              fill="none" stroke="url(#silkRibbonGrad)" stroke-width="4.2" stroke-linecap="round" opacity="0.85"/>
        <path d="M ${ribbonX1.toFixed(1)},${ribbonY1.toFixed(1)} Q ${cx},${(baseCenterY + floatY + 70).toFixed(1)} ${ribbonX2.toFixed(1)},${ribbonY2.toFixed(1)}" 
              fill="none" stroke="#ffffff" stroke-width="1" stroke-linecap="round" opacity="0.45"/>

        <!-- Thân Hình Nón Lá 3D (Chất Liệu Lá Cọ Khô Màu Trắng Ngà Be Tự Nhiên) -->
        <path d="M ${apexX},${apexY + floatY} 
                 L ${cx - rx},${(baseCenterY + floatY).toFixed(1)} 
                 A ${rx} ${ry} 0 0 0 ${cx + rx} ${(baseCenterY + floatY).toFixed(1)} 
                 Z" 
              fill="url(#realLeafGradient)"/>

        <!-- Lớp Ánh Sáng Phản Chiếu Dầu Thông Quét Nón -->
        <path d="M ${apexX},${apexY + floatY} 
                 L ${cx - rx},${(baseCenterY + floatY).toFixed(1)} 
                 A ${rx} ${ry} 0 0 0 ${cx + rx} ${(baseCenterY + floatY).toFixed(1)} 
                 Z" 
              fill="url(#realSunSheen)" 
              style="mix-blend-mode: multiply;"/>

        <!-- 16 Vòng Nan Tre Đồng Tâm -->
        ${concentricRingsSvg}

        <!-- 28 Nan Cọ Xoay Tròn Quanh Trục Nón 360 Độ -->
        ${ribsSvg}

        <!-- Viền Vành Nón Dưới Cùng (Cật Tre Chuốt Mỏng Tự Nhiên) -->
        <ellipse cx="${cx}" cy="${(baseCenterY + floatY).toFixed(1)}" rx="${rx}" ry="${ry}" 
                 fill="none" stroke="url(#bambooRimGrad)" stroke-width="2.5"/>
        <ellipse cx="${cx}" cy="${(baseCenterY + floatY).toFixed(1)}" rx="${rx - 1.5}" ry="${ry - 0.8}" 
                 fill="none" stroke="#ffffff" stroke-width="0.6" opacity="0.5"/>

        <!-- Chóp Nón Đính Đỉnh Khâu Chỉ Cước Tinh Tế -->
        <ellipse cx="${apexX}" cy="${apexY + floatY}" rx="6.5" ry="4.5" fill="#fffef8" stroke="#8c7b5d" stroke-width="0.8"/>
        <circle cx="${apexX}" cy="${apexY + floatY - 0.8}" r="2.5" fill="#ffffff" opacity="0.9"/>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🌾 Generating 100% Authentic Natural Dried-Palm Color Nón Lá Việt Nam Animation...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderAuthenticRealNonLa(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/non_la_vietnam.png'),
    path.join(__dirname, '../public/assets/non_la_vietnam.webp'),
    path.join(__dirname, '../public/assets/non_la_vietnam_animated.webp'),
    path.join(__dirname, '../pictures/non_la_vietnam.png'),
    path.join(__dirname, '../pictures/non_la_vietnam.webp'),
    path.join(__dirname, '../pictures/non_la_vietnam_animated.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Authentic Real-Color Nón Lá generated across all targets: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
