const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 560;
const HEIGHT = 480;
const FRAMES = 32;
const DELAY = 75;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 75, loopCount = 0, width = WIDTH, height = HEIGHT) {
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

function renderSilkySmoothBirdFrame(frameIndex) {
  const rad = (frameIndex / FRAMES) * Math.PI * 2;

  // Chu kỳ vỗ cánh uốn lượn mượt mà $\pm 38^\circ$
  const wingAngleDeg = Math.sin(rad) * 38;
  const wingRad = (wingAngleDeg * Math.PI) / 180;

  // Lực nâng dâng thân chim nhấp nhô
  const bodyLiftY = Math.sin(rad + 0.3) * 12;
  const bodyCenterY = 240 + bodyLiftY;
  const bodyCenterX = 280;

  const tipLag = Math.sin(rad - 0.5) * 16;
  const tailLag = Math.sin(rad - 0.8) * 10;

  const leftShoulderX = bodyCenterX - 18;
  const leftShoulderY = bodyCenterY - 10;
  const rightShoulderX = bodyCenterX + 18;
  const rightShoulderY = bodyCenterY - 10;

  const wingSpanX = 175 * Math.cos(wingRad * 0.4);
  const wingSpanY = -135 * Math.sin(wingRad);

  const leftWingTipX = (leftShoulderX - wingSpanX).toFixed(1);
  const leftWingTipY = (leftShoulderY + wingSpanY + tipLag).toFixed(1);
  const rightWingTipX = (rightShoulderX + wingSpanX).toFixed(1);
  const rightWingTipY = (rightShoulderY + wingSpanY + tipLag).toFixed(1);

  const leftJointX = (leftShoulderX - wingSpanX * 0.55).toFixed(1);
  const leftJointY = (leftShoulderY + wingSpanY * 0.75 - 25).toFixed(1);
  const rightJointX = (rightShoulderX + wingSpanX * 0.55).toFixed(1);
  const rightJointY = (rightShoulderY + wingSpanY * 0.75 - 25).toFixed(1);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="doveWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="45%" stop-color="#f8fafc" />
          <stop offset="75%" stop-color="#e2e8f0" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>

        <linearGradient id="wingShadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="60%" stop-color="#cbd5e1" />
          <stop offset="100%" stop-color="#94a3b8" />
        </linearGradient>

        <radialGradient id="peaceGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.25" />
          <stop offset="60%" stop-color="#fef08a" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>

        <filter id="birdDepth3D" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.35"/>
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#38bdf8" flood-opacity="0.25"/>
        </filter>
        <filter id="featherSoft" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.8"/>
        </filter>
      </defs>

      <!-- 1. HÀO QUANG ÁNH SÁNG DƯỚI THÂN CHIM -->
      <ellipse cx="${bodyCenterX}" cy="${bodyCenterY}" rx="220" ry="160" fill="url(#peaceGlow)"/>

      <g filter="url(#birdDepth3D)">
        <!-- 2. ĐUÔI CHIM LÁI GIÓ -->
        <g transform="translate(${bodyCenterX}, ${bodyCenterY + 45}) rotate(${(tailLag * 0.8).toFixed(1)})">
          <path d="M -12,0 C -28,35 -40,65 -25,75 C -10,80 0,65 0,45 C 0,65 10,80 25,75 C 40,65 28,35 12,0 Z" 
                fill="url(#doveWhiteGrad)" stroke="#cbd5e1" stroke-width="1.2"/>
        </g>

        <!-- 3. CÁNH TRÁI UỐN LIỀN KHỚP HỮU CƠ -->
        <g filter="url(#featherSoft)">
          <path d="M ${leftShoulderX},${leftShoulderY} 
                   Q ${leftJointX},${leftJointY} ${leftWingTipX},${leftWingTipY} 
                   C ${Number(leftWingTipX) + 30},${Number(leftWingTipY) + 40} ${Number(leftJointX) + 25},${Number(leftJointY) + 55} ${leftShoulderX - 10},${leftShoulderY + 30} 
                   Z" 
                fill="url(#wingShadowGrad)" stroke="#cbd5e1" stroke-width="1.5"/>

          <path d="M ${leftJointX},${leftJointY} Q ${Number(leftJointX) - 25},${Number(leftJointY) + 35} ${Number(leftWingTipX) + 15},${Number(leftWingTipY) + 20}" 
                stroke="#ffffff" stroke-width="1.8" fill="none"/>
          <path d="M ${leftJointX},${Number(leftJointY) + 12} Q ${Number(leftJointX) - 15},${Number(leftJointY) + 45} ${Number(leftWingTipX) + 30},${Number(leftWingTipY) + 35}" 
                stroke="#ffffff" stroke-width="1.5" fill="none"/>
        </g>

        <!-- 4. CÁNH PHẢI UỐN LIỀN KHỚP HỮU CƠ -->
        <g filter="url(#featherSoft)">
          <path d="M ${rightShoulderX},${rightShoulderY} 
                   Q ${rightJointX},${rightJointY} ${rightWingTipX},${rightWingTipY} 
                   C ${Number(rightWingTipX) - 30},${Number(rightWingTipY) + 40} ${Number(rightJointX) - 25},${Number(rightJointY) + 55} ${rightShoulderX + 10},${rightShoulderY + 30} 
                   Z" 
                fill="url(#wingShadowGrad)" stroke="#cbd5e1" stroke-width="1.5"/>

          <path d="M ${rightJointX},${rightJointY} Q ${Number(rightJointX) + 25},${Number(rightJointY) + 35} ${Number(rightWingTipX) - 15},${Number(rightWingTipY) + 20}" 
                stroke="#ffffff" stroke-width="1.8" fill="none"/>
          <path d="M ${rightJointX},${Number(rightJointY) + 12} Q ${Number(rightJointX) + 15},${Number(rightJointY) + 45} ${Number(rightWingTipX) - 30},${Number(rightWingTipY) + 35}" 
                stroke="#ffffff" stroke-width="1.5" fill="none"/>
        </g>

        <!-- 5. THÂN CHIM & ĐẦU GẮN LIỀN MƯỢT MÀ -->
        <g transform="translate(${bodyCenterX}, ${bodyCenterY})">
          <ellipse cx="0" cy="10" rx="30" ry="42" fill="url(#doveWhiteGrad)" stroke="#e2e8f0" stroke-width="1.2"/>
          <circle cx="0" cy="-32" r="18" fill="url(#doveWhiteGrad)" stroke="#e2e8f0" stroke-width="1.2"/>
          <polygon points="0,-48 -4,-36 4,-36" fill="#f59e0b" stroke="#d97706" stroke-width="0.8"/>
          <circle cx="-9" cy="-35" r="3.2" fill="#0f172a"/>
          <circle cx="-10" cy="-36" r="1.1" fill="#ffffff"/>
          <circle cx="9" cy="-35" r="3.2" fill="#0f172a"/>
          <circle cx="8" cy="-36" r="1.1" fill="#ffffff"/>
        </g>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🕊️ Rendering Silky Smooth Organic Flying Bird WebP...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderSilkySmoothBirdFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 90, alphaQuality: 95, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/flying_bird_ai_animated.webp'),
    path.join(__dirname, '../public/assets/flying_bird_animated_transparent.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Silky Smooth Flying Bird WebP rendered successfully:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
