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

// Gọi Cloudflare Workers AI sinh 1 Keyframe
async function fetchCloudflareKeyframe(promptText, cachePath) {
  if (fs.existsSync(cachePath)) {
    console.log(`📦 Đã có cache: ${path.basename(cachePath)}`);
    return fs.readFileSync(cachePath);
  }

  console.log(`🚀 Cloudflare AI đang vẽ: "${promptText.substring(0, 50)}..."`);
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
    throw new Error(`Cloudflare API error (${response.status}): ${errText}`);
  }

  const contentType = response.headers.get('content-type');
  let imageBuffer;

  if (contentType && contentType.includes('application/json')) {
    const json = await response.json();
    imageBuffer = Buffer.from(json.result.image, 'base64');
  } else {
    const arrayBuffer = await response.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  }

  fs.writeFileSync(cachePath, imageBuffer);
  return imageBuffer;
}

// Thuật toán tách phông xanh Chroma Green (#00FF00) chuyên nghiệp
async function removeChromaGreen(imageBuffer) {
  const raw = await sharp(imageBuffer)
    .resize(SIZE, SIZE, { fit: 'cover' })
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

    // Khoảng cách tới màu xanh lá thuần Chroma Green (r=0, g=255, b=0)
    // Hoặc điều kiện phông xanh: g > r + 35 && g > b + 35
    const isGreenScreen = (g > 100 && g > r * 1.35 && g > b * 1.35);

    if (isGreenScreen) {
      // Tách nền trong suốt hoàn toàn
      const greenDominance = g - Math.max(r, b);
      if (greenDominance > 45) {
        outBuf[i + 3] = 0; // Trong suốt 100%
      } else {
        outBuf[i + 3] = Math.max(0, Math.round(255 - (greenDominance / 45) * 255));
        // Khử ám xanh viền mép (Green Spill Suppression)
        outBuf[i + 1] = Math.round((r + b) / 2);
      }
    } else {
      outBuf[i + 3] = 255;
    }
  }

  return sharp(outBuf, {
    raw: { width: SIZE, height: SIZE, channels: 4 }
  }).raw().toBuffer();
}

// Hòa trộn 2 Keyframe với nội suy chuyển động mượt mà
async function blendFrames(rawA, rawB, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const easedP = 0.5 - 0.5 * Math.cos(p * Math.PI); // S-curve easing

  const len = rawA.length;
  const outBuf = Buffer.alloc(len);

  for (let i = 0; i < len; i += 4) {
    outBuf[i] = Math.round(rawA[i] * (1 - easedP) + rawB[i] * easedP);
    outBuf[i + 1] = Math.round(rawA[i + 1] * (1 - easedP) + rawB[i + 1] * easedP);
    outBuf[i + 2] = Math.round(rawA[i + 2] * (1 - easedP) + rawB[i + 2] * easedP);
    outBuf[i + 3] = Math.round(rawA[i + 3] * (1 - easedP) + rawB[i + 3] * easedP);
  }

  return sharp(outBuf, {
    raw: { width: SIZE, height: SIZE, channels: 4 }
  }).webp({ quality: 85, effort: 6, lossless: false }).toBuffer();
}

async function main() {
  console.log('🎬 Bắt đầu Pipeline 1 Lệnh Duy Nhất (Cloudflare AI 6-Keyframe Chroma Green Animation)...');

  const cacheDir = path.join(__dirname, '../pictures/cloudflare_keyframes');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const prompts = [
    'luxury birthday cream cake with fresh strawberries, glossy chocolate drip, glowing lit candle flame standing upright on solid bright green screen background #00FF00',
    'luxury birthday cream cake with fresh strawberries, glossy chocolate drip, glowing lit candle flame swaying slightly right with warm sparkle glints on solid bright green screen background #00FF00',
    'luxury birthday cream cake with fresh strawberries, glossy chocolate drip, glowing lit candle flame burning brightly with golden glitter dust on solid bright green screen background #00FF00',
    'luxury birthday cream cake with fresh strawberries, glossy chocolate drip, glowing lit candle flame swaying slightly left on solid bright green screen background #00FF00'
  ];

  const rawKeyframes = [];

  for (let k = 0; k < prompts.length; k++) {
    const cacheFile = path.join(cacheDir, `cake_kf_${k + 1}.png`);
    const imgBuf = await fetchCloudflareKeyframe(prompts[k], cacheFile);
    console.log(`🧹 Đang tách phông xanh Chroma Green cho Keyframe ${k + 1}...`);
    const rawTransparent = await removeChromaGreen(imgBuf);
    rawKeyframes.push(rawTransparent);
  }

  console.log('✨ Đang nội suy chuyển tiếp mượt mà giữa các Keyframe...');
  const frames = [];
  const stepsPerKf = 6;

  for (let k = 0; k < rawKeyframes.length; k++) {
    const currentKf = rawKeyframes[k];
    const nextKf = rawKeyframes[(k + 1) % rawKeyframes.length];

    for (let s = 0; s < stepsPerKf; s++) {
      const p = s / stepsPerKf;
      frames.push(await blendFrames(currentKf, nextKf, p));
    }
  }

  console.log(`📦 Đang đóng gói ${frames.length} khung hình thành file WebP nền trong suốt 100%...`);
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0, SIZE, SIZE);

  const outputPath = path.join(__dirname, '../public/assets/birthday_cake_cloudflare_animated.webp');
  fs.writeFileSync(outputPath, animatedWebp);

  console.log(`🎉 HOÀN THÀNH XUẤT SẮC 100%!`);
  console.log(`👉 File kết quả: ${outputPath} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
