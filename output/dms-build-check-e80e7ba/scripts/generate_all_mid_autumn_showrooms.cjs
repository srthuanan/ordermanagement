const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 720;
const HEIGHT = 960;
const TOTAL_FRAMES = 16;
const DELAY = 100;

const IMAGE_1_PATH = 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/white_luxury_showroom_1789529871802.jpg';
const IMAGE_2_PATH = 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/surreal_3d_showroom_1789529767641.jpg';
const IMAGE_3_PATH = 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/lotus_pavilion_showroom_1789530002162.jpg';

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

// Render Tranh 3: Thủy Tạ Đầm Sen Trăng Rằm
async function renderShowroom3() {
  console.log('--- Render Tranh 3: Thủy Tạ Đầm Sen Trăng Rằm (Lotus Pavilion) ---');
  const baseBuffer = await sharp(IMAGE_3_PATH)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer();

  const frames = [];
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const phase = (2 * Math.PI * f) / TOTAL_FRAMES;
    const sin1 = Math.sin(phase);
    const cos1 = Math.cos(phase);

    // Vầng trăng Rằm ở góc trên phải: cx ~ 500, cy ~ 240
    const moonAuraR = 85 + 14 * sin1;
    const moonOpacity = 0.35 + 0.15 * sin1;
    const podiumGlowOpacity = 0.28 + 0.14 * cos1;

    const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFBEB" stop-opacity="${moonOpacity.toFixed(2)}"/>
      <stop offset="45%" stop-color="#FDE047" stop-opacity="${(moonOpacity * 0.6).toFixed(2)}"/>
      <stop offset="85%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="podiumGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="${(podiumGlowOpacity * 1.2).toFixed(2)}"/>
      <stop offset="40%" stop-color="#FDE047" stop-opacity="${podiumGlowOpacity.toFixed(2)}"/>
      <stop offset="85%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Quầng sáng trăng Rằm thở nhẹ -->
  <circle cx="500" cy="240" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlow)"/>
  <!-- Quầng sáng vòng LED bục đá cẩm thạch trên mặt nước -->
  <ellipse cx="360" cy="650" rx="220" ry="46" fill="url(#podiumGlow)"/>
</svg>
    `;

    const frameBuf = await sharp(baseBuffer)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0, blend: 'over' }])
      .webp({ quality: 86, effort: 4 })
      .toBuffer();
    frames.push(frameBuf);
  }

  const anim = muxAnimatedWebP(frames, DELAY, 0);
  const outPath = path.resolve(__dirname, '../public/pictures/showroom_trung_thu_3.webp');
  fs.writeFileSync(outPath, anim);
  console.log(`Đã lưu Tranh 3 tại: ${outPath} (${(anim.length / 1024).toFixed(1)} KB)`);
}

// Render Tranh 2: Vòm Kính Thiên Đình Nguyệt Cung
async function renderShowroom2() {
  console.log('--- Render Tranh 2: Vòm Kính Thiên Đình (Celestial Dome) ---');
  const baseBuffer = await sharp(IMAGE_2_PATH)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer();

  const frames = [];
  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const phase = (2 * Math.PI * f) / TOTAL_FRAMES;
    const sin1 = Math.sin(phase);
    const cos1 = Math.cos(phase);

    const moonAuraR = 110 + 15 * sin1;
    const moonOpacity = 0.35 + 0.15 * sin1;
    const podiumGlowOpacity = 0.25 + 0.12 * cos1;

    const overlaySvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFBEB" stop-opacity="${moonOpacity.toFixed(2)}"/>
      <stop offset="45%" stop-color="#FDE047" stop-opacity="${(moonOpacity * 0.6).toFixed(2)}"/>
      <stop offset="85%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="podiumGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="${(podiumGlowOpacity * 1.2).toFixed(2)}"/>
      <stop offset="40%" stop-color="#FDE047" stop-opacity="${podiumGlowOpacity.toFixed(2)}"/>
      <stop offset="85%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="445" cy="275" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlow)"/>
  <ellipse cx="360" cy="590" rx="260" ry="60" fill="url(#podiumGlow)"/>
</svg>
    `;

    const frameBuf = await sharp(baseBuffer)
      .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0, blend: 'over' }])
      .webp({ quality: 86, effort: 4 })
      .toBuffer();
    frames.push(frameBuf);
  }

  const anim = muxAnimatedWebP(frames, DELAY, 0);
  const outPath = path.resolve(__dirname, '../public/pictures/showroom_trung_thu_2.webp');
  fs.writeFileSync(outPath, anim);
  console.log(`Đã lưu Tranh 2 tại: ${outPath} (${(anim.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  // Tranh 1 đã có sẵn trong showroom_trung_thu.webp, sao chép sang showroom_trung_thu_1.webp
  const currentWebp = path.resolve(__dirname, '../public/pictures/showroom_trung_thu.webp');
  const outPath1 = path.resolve(__dirname, '../public/pictures/showroom_trung_thu_1.webp');
  if (fs.existsSync(currentWebp)) {
    fs.copyFileSync(currentWebp, outPath1);
    console.log(`Đã sao lưu Tranh 1 tại: ${outPath1}`);
  }

  await renderShowroom2();
  await renderShowroom3();
  console.log('--- HOÀN TẤT XUẤT CẢ 3 BỘ TRANH TRUNG THU 3D ---');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
