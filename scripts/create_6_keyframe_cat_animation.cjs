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

async function fetchAIKeyframe(promptText, cachePath) {
  if (fs.existsSync(cachePath)) {
    console.log(`📦 Đã có cache Keyframe: ${path.basename(cachePath)}`);
    return fs.readFileSync(cachePath);
  }

  console.log(`🚀 AI FLUX đang vẽ Keyframe: "${promptText.substring(0, 60)}..."`);
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
    throw new Error(`Cloudflare AI API error (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(cachePath, buffer);
  return buffer;
}

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

    const isGreen = (g > 80 && g > r * 1.25 && g > b * 1.25);

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
  }).raw().toBuffer();
}

async function blendFrames(rawA, rawB, progress) {
  const p = Math.max(0, Math.min(1, progress));
  const easedP = 0.5 - 0.5 * Math.cos(p * Math.PI);

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
  console.log('🐱 Bắt đầu tạo 6 KEYFRAME CHUYỂN ĐỘNG CỦA CHÚ MÈO BẰNG AI FLUX...');

  const cacheDir = path.join(__dirname, '../pictures/cloudflare_cat_keyframes');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  // 6 KEYFRAME HÀNH ĐỘNG CỦA CHÚ MÈO (CUTE GESTURE CYCLE)
  const poses = [
    {
      name: 'cat_kf1_sit_idle',
      desc: 'Frame 1: Ngồi ngoan nhìn thẳng, mắt tròn to long lanh',
      prompt: 'photorealistic adorable fluffy British Shorthair cat sitting calmly looking forward at camera with big round glowing amber eyes, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k'
    },
    {
      name: 'cat_kf2_tilt_head',
      desc: 'Frame 2: Nghiêng đầu tò mò sang bên phải',
      prompt: 'photorealistic adorable fluffy British Shorthair cat sitting tilting head curiously to the right, big curious round eyes, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k'
    },
    {
      name: 'cat_kf3_wave_paw',
      desc: 'Frame 3: Giơ một chân trước vẫy chào đáng yêu',
      prompt: 'photorealistic adorable fluffy British Shorthair cat sitting raising its front right paw waving hello cute gesture, soft pink paw pads visible, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k'
    },
    {
      name: 'cat_kf4_meow_smile',
      desc: 'Frame 4: Mở miệng kêu meo meo vui vẻ',
      prompt: 'photorealistic adorable fluffy British Shorthair cat sitting with mouth open in a cute happy meow expression, whiskers twitching, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k'
    },
    {
      name: 'cat_kf5_wink_tail',
      desc: 'Frame 5: Nháy mắt tinh nghịch, đuôi cuộn ve vẩy',
      prompt: 'photorealistic adorable fluffy British Shorthair cat sitting winking one eye playfully with fluffy tail swishing to the side, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k'
    },
    {
      name: 'cat_kf6_return_idle',
      desc: 'Frame 6: Hạ chân xuống chuẩn bị hoàn tất chu kỳ lặp',
      prompt: 'photorealistic adorable fluffy British Shorthair cat sitting lowering paws down gently back into neutral resting pose, looking at camera, isolated on solid bright green screen background #00FF00, studio lighting, 85mm portrait, 8k'
    }
  ];

  const rawKeyframes = [];

  for (let i = 0; i < poses.length; i++) {
    const cacheFile = path.join(cacheDir, `${poses[i].name}.png`);
    const imgBuf = await fetchAIKeyframe(poses[i].prompt, cacheFile);
    console.log(`🧹 Đang tách phông xanh cho Keyframe ${i + 1} (${poses[i].name} - ${poses[i].desc})...`);
    const rawTransparent = await removeChromaGreenClean(imgBuf);
    rawKeyframes.push(rawTransparent);
  }

  console.log('✨ Đang nội suy mượt mà 6 Keyframe chuyển động chu kỳ...');
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

  const outputPath = path.join(__dirname, '../public/assets/cute_cat_6_keyframes_animated.webp');
  fs.writeFileSync(outputPath, animatedWebp);

  console.log(`🎉 6-KEYFRAME CAT ANIMATION HOÀN THÀNH 100%!`);
  console.log(`👉 File xuất: ${outputPath} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
