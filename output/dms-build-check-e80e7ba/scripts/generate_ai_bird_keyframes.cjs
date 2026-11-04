const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const MODEL = '@cf/black-forest-labs/flux-1-schnell';

const SIZE = 512;
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

async function generateBirdPhotoAI(promptText, cachePath) {
  if (fs.existsSync(cachePath)) {
    console.log(`📦 Đã có cache AI: ${path.basename(cachePath)}`);
    return fs.readFileSync(cachePath);
  }

  console.log(`🚀 Cloudflare AI FLUX đang vẽ chú chim: "${promptText.substring(0, 60)}..."`);
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${MODEL}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt: promptText,
      steps: 4
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudflare API error: ${errText}`);
  }

  const contentType = response.headers.get('content-type');
  let imgBuf;

  if (contentType && contentType.includes('application/json')) {
    const json = await response.json();
    imgBuf = Buffer.from(json.result.image, 'base64');
  } else {
    imgBuf = Buffer.from(await response.arrayBuffer());
  }

  fs.writeFileSync(cachePath, imgBuf);
  return imgBuf;
}

// Bóc tách phông xanh Chroma Green thành trong suốt
async function removeChromaGreenClean(imageBuffer) {
  const raw = await sharp(imageBuffer)
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

    const isGreen = (g > 85 && g > r * 1.25 && g > b * 1.25);

    if (isGreen) {
      const diff = g - Math.max(r, b);
      if (diff > 35) {
        outBuf[i + 3] = 0;
      } else {
        outBuf[i + 3] = Math.max(0, Math.round(255 - (diff / 35) * 255));
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

async function main() {
  console.log('🤖 Bắt đầu tạo CHIM VỖ CÁNH BẰNG CLOUDFLARE AI FLUX...');

  const cacheDir = path.join(__dirname, '../pictures/cloudflare_bird_keyframes');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  // 1. Dùng AI FLUX tạo ảnh chụp chim bồ câu trắng thực tế trên phông xanh lá
  const prompt = 'photorealistic wildlife studio shot of a beautiful white dove in mid-air flight with wide wings spread, isolated on solid bright green screen background #00FF00, sharp focus, 85mm lens';
  const birdImgBuf = await generateBirdPhotoAI(prompt, path.join(cacheDir, 'ai_dove_master.png'));

  console.log('🧹 Đang bóc tách phông xanh Chroma Green thành trong suốt...');
  const cleanBirdPng = await removeChromaGreenClean(birdImgBuf);

  console.log('✨ Đang nội suy động học vỗ cánh mượt mà 32 khung hình...');
  const frames = [];
  const TOTAL_FRAMES = 32;

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const rad = (f / TOTAL_FRAMES) * Math.PI * 2;
    // Nhịp vỗ cánh và nhấp nhô cơ học
    const scaleY = (Math.sin(rad) * 0.28 + 0.95).toFixed(3); // Cánh đập co giãn 3D
    const liftY = Math.round(Math.sin(rad + 0.3) * 14); // Nâng hạ thân chim

    const transformedBird = await sharp(cleanBirdPng)
      .resize(SIZE, Math.round(SIZE * scaleY), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.max(0, 20 + liftY),
        bottom: Math.max(0, 40 - liftY),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .resize(SIZE, SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85, alphaQuality: 92, effort: 6, lossless: false })
      .toBuffer();

    frames.push(transformedBird);
  }

  console.log(`📦 Đang đóng gói ${frames.length} khung hình thành file WebP...`);
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0, SIZE, SIZE);

  const outputPath = path.join(__dirname, '../public/assets/flying_bird_ai_animated.webp');
  fs.writeFileSync(outputPath, animatedWebp);

  console.log(`🎉 CHIM VỖ CÁNH BẰNG CLOUDFLARE AI FLUX HOÀN THÀNH 100%!`);
  console.log(`👉 File: ${outputPath} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
