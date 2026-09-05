const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_PHOTO = 'C:/Users/USER/.gemini/antigravity-ide/brain/76049b4f-b40a-4855-b7c7-3075b1138599/ai_lantern_kf1_1787640069333.jpg';

const WIDTH = 480;
const HEIGHT = 580;
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

async function prepareTransparentLanternSubject() {
  const raw = await sharp(SOURCE_PHOTO)
    .resize(WIDTH, HEIGHT, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .raw()
    .toBuffer();

  const len = raw.length;
  const outBuf = Buffer.alloc(len);

  // Thuật toán tách nền trắng studio chính xác (Chroma White Cutout with Alpha Feathering)
  for (let i = 0; i < len; i += 4) {
    const r = raw[i];
    const g = raw[i + 1];
    const b = raw[i + 2];

    outBuf[i] = r;
    outBuf[i + 1] = g;
    outBuf[i + 2] = b;

    // Khoảng cách màu tới màu trắng #FFFFFF
    const distToWhite = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

    if (distToWhite < 18) {
      outBuf[i + 3] = 0; // Trong suốt hoàn toàn
    } else if (distToWhite < 45) {
      outBuf[i + 3] = Math.round(((distToWhite - 18) / 27) * 255); // Mép mờ mịn
    } else {
      outBuf[i + 3] = 255;
    }
  }

  return sharp(outBuf, {
    raw: { width: WIDTH, height: HEIGHT, channels: 4 }
  }).png().toBuffer();
}

function generateCandlelightAuraSvg(frameIndex, swayAngle) {
  const rad = (frameIndex / FRAMES) * Math.PI * 2;
  const flicker = Math.sin(rad * 3.5) * 0.15 + 0.85;
  const auraR = (60 * flicker).toFixed(1);
  const auraOp = (0.55 * flicker).toFixed(2);

  // Tâm nến phát sáng: (240, 245)
  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="candleGlowPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="${(auraOp * 1.2).toFixed(2)}" />
          <stop offset="30%" stop-color="#fef08a" stop-opacity="${auraOp}" />
          <stop offset="65%" stop-color="#f97316" stop-opacity="${(auraOp * 0.5).toFixed(2)}" />
          <stop offset="100%" stop-color="#dc2626" stop-opacity="0" />
        </radialGradient>
        <filter id="bloomAura" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="15"/>
        </filter>
      </defs>
      <g transform="rotate(${swayAngle}, 240, 25)">
        <circle cx="240" cy="245" r="${auraR}" fill="url(#candleGlowPulse)" filter="url(#bloomAura)"/>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🏮 Rendering AI-Photorealistic Animated Lantern (100% Transparent Background)...');

  const transparentLanternPng = await prepareTransparentLanternSubject();
  const frames = [];

  for (let f = 0; f < FRAMES; f++) {
    const rad = (f / FRAMES) * Math.PI * 2;
    // Góc đung đưa con lắc vật lý thật ±5.8° quanh điểm móc treo (240, 25)
    const swayAngle = Math.sin(rad) * 5.8;

    // Xoay chiếc lồng đèn chụp thật quanh móc treo
    const rotatedLantern = await sharp(transparentLanternPng)
      .rotate(swayAngle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(WIDTH, HEIGHT, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const auraSvg = generateCandlelightAuraSvg(f, swayAngle);

    // Ghép hào quang ngọn nến lập lòe với chiếc lồng đèn lụa thêu vàng thật
    const compositeFrame = await sharp(rotatedLantern)
      .composite([
        {
          input: Buffer.from(auraSvg),
          top: 0,
          left: 0,
          blend: 'over'
        }
      ])
      .webp({ quality: 85, alphaQuality: 92, effort: 6, lossless: false })
      .toBuffer();

    frames.push(compositeFrame);
  }

  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/lantern_trung_thu_animated.webp'),
    path.join(__dirname, '../pictures/lantern_trung_thu_animated.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 AI-Photorealistic Transparent Animated Lantern rendered:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
