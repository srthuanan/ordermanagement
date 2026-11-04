const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 720;
const HEIGHT = 960;
const TOTAL_FRAMES = 16;
const DELAY = 100;

const IMAGES = [
  {
    src: 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/white_penthouse_showroom_1789530468801.jpg',
    out: 'showroom_trung_thu_2.webp',
    name: 'Penthouse Sky Studio',
    moon: { cx: 440, cy: 330, r: 28 },
    podium: { cx: 360, cy: 560, rx: 185, ry: 35 }
  },
  {
    src: 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/white_terrace_showroom_1789530495757.jpg',
    out: 'showroom_trung_thu_3.webp',
    name: 'Cathedral Infinity Terrace',
    moon: { cx: 430, cy: 270, r: 26 },
    podium: { cx: 360, cy: 545, rx: 200, ry: 40 }
  },
  {
    src: 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/white_rotunda_showroom_1789530517050.jpg',
    out: 'showroom_trung_thu_4.webp',
    name: 'Grand Circular Rotunda',
    moon: { cx: 460, cy: 250, r: 25 },
    podium: { cx: 360, cy: 540, rx: 215, ry: 40 }
  },
  {
    src: 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/white_zen_studio_1789530541128.jpg',
    out: 'showroom_trung_thu_5.webp',
    name: 'Modern Zen Bamboo Studio',
    moon: { cx: 415, cy: 245, r: 30 },
    podium: { cx: 360, cy: 545, rx: 240, ry: 42 }
  }
];

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 100, loopCount = 0) {
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
    writeUInt24LE(anmfHeader, WIDTH - 1, 6);
    writeUInt24LE(anmfHeader, HEIGHT - 1, 9);
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

  const vp8xHeader = Buffer.alloc(18);
  vp8xHeader.write('VP8X', 0, 4, 'latin1');
  vp8xHeader.writeUInt32LE(10, 4);
  vp8xHeader[8] = 0x12;
  writeUInt24LE(vp8xHeader, WIDTH - 1, 12);
  writeUInt24LE(vp8xHeader, HEIGHT - 1, 15);

  const animChunk = Buffer.alloc(14);
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

async function renderItem(item, index) {
  console.log(`\n--- [${index + 1}/4] Rendering: ${item.name} (${item.out}) ---`);

  const baseBuffer = await sharp(item.src)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer();

  // Tạo 25 hạt bụi sao vàng cho mỗi ảnh
  const particles = [];
  for (let i = 0; i < 24; i++) {
    particles.push({
      baseX: 120 + Math.random() * 480,
      baseY: 180 + Math.random() * 520,
      r: 1.2 + Math.random() * 2.0,
      speedY: 15 + Math.random() * 25,
      swayAmp: 3 + Math.random() * 6,
      phaseOffset: Math.random() * Math.PI * 2,
      color: Math.random() > 0.35 ? '#FDE047' : '#FFFFFF'
    });
  }

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const phase = (2 * Math.PI * f) / TOTAL_FRAMES;
    const sin1 = Math.sin(phase);
    const cos1 = Math.cos(phase);

    const moonAuraR = item.moon.r * 2.2 + 8 * sin1;
    const moonOpacity = 0.32 + 0.14 * sin1;
    const podiumGlowOpacity = 0.28 + 0.12 * cos1;

    const particlesSvg = particles.map(p => {
      const loopProgress = (f / TOTAL_FRAMES);
      const curY = (p.baseY - loopProgress * p.speedY + HEIGHT) % HEIGHT;
      const curX = p.baseX + p.swayAmp * Math.sin(phase + p.phaseOffset);
      const pOpacity = 0.3 + 0.45 * Math.sin(phase * 2 + p.phaseOffset);
      return `<circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="${p.r.toFixed(1)}" fill="${p.color}" opacity="${Math.max(0.08, pOpacity).toFixed(2)}"/>`;
    }).join('\n');

    const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="moonAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFBEB" stop-opacity="${moonOpacity.toFixed(2)}"/>
      <stop offset="45%" stop-color="#FEF08A" stop-opacity="${(moonOpacity * 0.55).toFixed(2)}"/>
      <stop offset="85%" stop-color="#FDE047" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="podiumAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="${(podiumGlowOpacity * 1.2).toFixed(2)}"/>
      <stop offset="40%" stop-color="#FDE047" stop-opacity="${podiumGlowOpacity.toFixed(2)}"/>
      <stop offset="85%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Quầng sáng vầng trăng thở êm dịu -->
  <circle cx="${item.moon.cx}" cy="${item.moon.cy}" r="${moonAuraR.toFixed(1)}" fill="url(#moonAura)"/>
  <!-- Hào quang vòng LED bục cẩm thạch -->
  <ellipse cx="${item.podium.cx}" cy="${item.podium.cy}" rx="${item.podium.rx + 15}" ry="${item.podium.ry + 8}" fill="url(#podiumAura)"/>
  <!-- Bụi sáng kim cương lơ lửng -->
  ${particlesSvg}
</svg>
    `;

    const frameBuf = await sharp(baseBuffer)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0, blend: 'over' }])
      .webp({ quality: 86, effort: 4 })
      .toBuffer();

    frames.push(frameBuf);
    process.stdout.write(`\rRendered frame ${f + 1}/${TOTAL_FRAMES}...`);
  }

  const anim = muxAnimatedWebP(frames, DELAY, 0);
  const outPath = path.resolve(__dirname, '../public/pictures', item.out);
  fs.writeFileSync(outPath, anim);
  console.log(`\n=> Đã lưu thành công: ${outPath} (${(anim.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log('=== BẮT ĐẦU RENDER 4 BỨC TRANH 3D TONE TRẮNG SÁNG SIÊU SANG ===');
  for (let i = 0; i < IMAGES.length; i++) {
    await renderItem(IMAGES[i], i);
  }
  console.log('\n=== HOÀN TẤT RENDER CẢ 4 BỨC TRANH MỚI! ===');
}

main().catch(err => {
  console.error('Lỗi:', err);
  process.exit(1);
});
