const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SOURCE_PHOTO = path.join(__dirname, '../pictures/cloudflare_keyframes/cake_kf_1.png');

const SIZE = 512;
const FRAMES = 36;
const DELAY = 85;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 85, loopCount = 0, width = SIZE, height = SIZE) {
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

// Bóc tách phông xanh Chroma Green thành trong suốt
async function removeChromaGreenClean(imagePath) {
  const raw = await sharp(imagePath)
    .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const len = raw.length;
  const outBuf = Buffer.alloc(len);

  for (let i = 0; i < len; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];

    outBuf[i] = r;
    outBuf[i + 1] = g;
    outBuf[i + 2] = b;

    // Nhận diện phông xanh lá chính xác
    const isGreen = (g > 90 && g > r * 1.25 && g > b * 1.25);

    if (isGreen) {
      const diff = g - Math.max(r, b);
      if (diff > 35) {
        outBuf[i + 3] = 0; // Trong suốt 100%
      } else {
        outBuf[i + 3] = Math.max(0, Math.round(255 - (diff / 35) * 255));
        // Khử viền xanh (Spill suppression)
        outBuf[i + 1] = Math.round((r + b) / 2);
      }
    } else {
      outBuf[i + 3] = 255;
    }
  }

  return sharp(outBuf, {
    raw: { width: SIZE, height: SIZE, channels: 4 }
  }).png().toBuffer();
}

function generateConsistentFlameAnimationOverlay(frameIndex) {
  const rad = (frameIndex / FRAMES) * Math.PI * 2;

  // Dao động ngọn lửa tự nhiên
  const flameSwayX = Math.sin(rad * 3) * 3.5;
  const flameScaleY = Math.sin(rad * 4) * 0.18 + 1.0;
  const flicker = Math.sin(rad * 5) * 0.2 + 0.8;

  // Hào quang ấm áp tỏa ra trên mặt bánh
  const glowR = (55 * flicker).toFixed(1);
  const glowOp = (0.50 * flicker).toFixed(2);

  // Đốm sáng kim cương lấp lánh (Sparkler Particles)
  const sparkles = [];
  for (let i = 0; i < 8; i++) {
    const sRad = rad * 2 + i * (Math.PI * 2 / 8);
    const sDist = 45 + Math.sin(sRad * 1.5) * 25;
    const sX = (256 + Math.cos(sRad) * sDist).toFixed(1);
    const sY = (110 + Math.sin(sRad) * (sDist * 0.5)).toFixed(1);
    const sOp = (0.3 + (Math.sin(sRad * 3) * 0.5 + 0.5) * 0.7).toFixed(2);
    const sSize = (1.5 + Math.sin(sRad * 2) * 1.2).toFixed(1);

    sparkles.push(`
      <circle cx="${sX}" cy="${sY}" r="${sSize}" fill="#ffffff" opacity="${sOp}" filter="url(#sparkleGlow)"/>
      <polygon points="${sX},${sY - 4} ${Number(sX) + 1},${sY} ${sX},${Number(sY) + 4} ${sX - 1},${sY}" fill="#fef08a" opacity="${sOp}"/>
    `);
  }

  return `
    <svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Ngọn lửa nến 3 tầng chân thực -->
        <radialGradient id="realFlameGrad" cx="50%" cy="65%" r="50%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fef08a" />
          <stop offset="55%" stop-color="#f97316" />
          <stop offset="85%" stop-color="#ef4444" />
          <stop offset="100%" stop-color="#38bdf8" />
        </radialGradient>

        <radialGradient id="cakeGlowAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="${(glowOp * 1.2).toFixed(2)}" />
          <stop offset="35%" stop-color="#fef08a" stop-opacity="${glowOp}" />
          <stop offset="70%" stop-color="#f97316" stop-opacity="${(glowOp * 0.4).toFixed(2)}" />
          <stop offset="100%" stop-color="#dc2626" stop-opacity="0" />
        </radialGradient>

        <filter id="flameBloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="15"/>
        </filter>
        <filter id="sparkleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- 1. HÀO QUANG ÁNH NẾN CHIẾU SÁNG MẶT KEM (Tâm nến: 256, 115) -->
      <circle cx="${(256 + flameSwayX).toFixed(1)}" cy="115" r="${glowR}" fill="url(#cakeGlowAura)" filter="url(#flameBloom)"/>

      <!-- 2. NGỌN LỬA NẾN UỐN LƯỢN SỐNG ĐỘNG -->
      <g transform="translate(${(256 + flameSwayX).toFixed(1)}, 115) scale(1, ${flameScaleY.toFixed(2)})">
        <!-- Ngọn lửa ngoài -->
        <path d="M 0,-26 C 11,-12 10,8 0,11 C -10,8 -11,-12 0,-26 Z" fill="url(#realFlameGrad)"/>
        <!-- Lõi lửa trắng nóng -->
        <path d="M 0,-15 C 6,-6 5,5 0,6 C -5,5 -6,-6 0,-15 Z" fill="#ffffff"/>
      </g>

      <!-- 3. BỤI VÀNG PHÁO BÔNG QUE LẤP LÁNH -->
      ${sparkles.join('\n')}
    </svg>
  `;
}

async function main() {
  console.log('🎂 Rendering 100% CONSISTENT Photorealistic Cake Animation...');

  const cleanCakePng = await removeChromaGreenClean(SOURCE_PHOTO);
  const frames = [];

  for (let f = 0; f < FRAMES; f++) {
    const overlaySvg = generateConsistentFlameAnimationOverlay(f);

    const frameWebp = await sharp(cleanCakePng)
      .composite([
        {
          input: Buffer.from(overlaySvg),
          top: 0,
          left: 0,
          blend: 'over'
        }
      ])
      .webp({ quality: 85, alphaQuality: 92, effort: 6, lossless: false })
      .toBuffer();

    frames.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0, SIZE, SIZE);

  const outputPath = path.join(__dirname, '../public/assets/birthday_cake_cloudflare_animated.webp');
  fs.writeFileSync(outputPath, animatedWebp);

  console.log(`🎉 100% CONSISTENT Cake Animation rendered successfully!`);
  console.log(`👉 File: ${outputPath} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
