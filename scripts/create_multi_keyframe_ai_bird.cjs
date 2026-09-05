const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const MODEL = '@cf/black-forest-labs/flux-1-schnell';

const SIZE = 512;
const DELAY = 90;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 90, loopCount = 0, width = SIZE, height = SIZE) {
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

async function fetchCloudflareKeyframe(promptText, cachePath) {
  if (fs.existsSync(cachePath)) {
    console.log(`📦 Đã có cache: ${path.basename(cachePath)}`);
    return fs.readFileSync(cachePath);
  }

  console.log(`🚀 Cloudflare AI đang vẽ Keyframe: "${promptText.substring(0, 50)}..."`);
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
    imageBuffer = Buffer.from(await response.arrayBuffer());
  }

  fs.writeFileSync(cachePath, imageBuffer);
  return imageBuffer;
}

// Bóc tách phông xanh Chroma Green hoặc Hồng Magenta chuyên nghiệp
async function removeKeyColorClean(imageBuffer) {
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

    // Nhận diện phông xanh lá Chroma Green (#00FF00) hoặc phông sáng
    const isGreen = (g > 80 && g > r * 1.25 && g > b * 1.25);
    const isMagenta = (r > 120 && b > 120 && g < Math.min(r, b) * 0.7);

    if (isGreen) {
      const diff = g - Math.max(r, b);
      if (diff > 35) {
        outBuf[i + 3] = 0;
      } else {
        outBuf[i + 3] = Math.max(0, Math.round(255 - (diff / 35) * 255));
        outBuf[i + 1] = Math.round((r + b) / 2);
      }
    } else if (isMagenta) {
      const diff = Math.min(r, b) - g;
      if (diff > 40) {
        outBuf[i + 3] = 0;
      } else {
        outBuf[i + 3] = Math.max(0, Math.round(255 - (diff / 40) * 255));
      }
    } else {
      outBuf[i + 3] = 255;
    }
  }

  return sharp(outBuf, {
    raw: { width: SIZE, height: SIZE, channels: 4 }
  }).raw().toBuffer();
}

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
  console.log('🕊️ Bắt đầu sinh 4 KEYFRAME TƯ THẾ VỖ CÁNH THẬT BẰNG AI FLUX...');

  const cacheDir = path.join(__dirname, '../pictures/cloudflare_bird_poses');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const poses = [
    {
      name: 'kf1_wings_up',
      prompt: 'photorealistic white dove in flight, wings raised high up in V-shape upstroke position, front view, solid bright green screen background #00FF00, sharp studio photography'
    },
    {
      name: 'kf2_wings_glide',
      prompt: 'photorealistic white dove in flight, wings spread wide horizontally gliding, front view, solid bright green screen background #00FF00, sharp studio photography'
    },
    {
      name: 'kf3_wings_down',
      prompt: 'photorealistic white dove in flight, wings curved deeply downwards in powerful downstroke, front view, solid bright green screen background #00FF00, sharp studio photography'
    },
    {
      name: 'kf4_wings_recovery',
      prompt: 'photorealistic white dove in flight, wings partially tucked in upstroke recovery, front view, solid bright green screen background #00FF00, sharp studio photography'
    }
  ];

  const rawKeyframes = [];

  for (let i = 0; i < poses.length; i++) {
    const cacheFile = path.join(cacheDir, `${poses[i].name}.png`);
    const imgBuf = await fetchCloudflareKeyframe(poses[i].prompt, cacheFile);
    console.log(`🧹 Đang tách phông xanh cho Pose ${i + 1} (${poses[i].name})...`);
    const rawTransparent = await removeKeyColorClean(imgBuf);
    rawKeyframes.push(rawTransparent);
  }

  console.log('✨ Đang nội suy mượt mà chu kỳ vỗ cánh (Up -> Glide -> Down -> Recovery -> Up)...');
  const frames = [];
  const stepsPerPose = 6;

  for (let k = 0; k < rawKeyframes.length; k++) {
    const currentKf = rawKeyframes[k];
    const nextKf = rawKeyframes[(k + 1) % rawKeyframes.length];

    for (let s = 0; s < stepsPerPose; s++) {
      const p = s / stepsPerPose;
      frames.push(await blendFrames(currentKf, nextKf, p));
    }
  }

  console.log(`📦 Đang đóng gói ${frames.length} khung hình thành file WebP nền trong suốt...`);
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0, SIZE, SIZE);

  const outputPath = path.join(__dirname, '../public/assets/flying_bird_ai_animated.webp');
  fs.writeFileSync(outputPath, animatedWebp);

  console.log(`🎉 4-KEYFRAME AI WING FLAPPING HOÀN THÀNH 100%!`);
  console.log(`👉 File: ${outputPath} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
