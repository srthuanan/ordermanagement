const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BASE_IMAGE_PATH = 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/white_luxury_showroom_1789529871802.jpg';

// Kích thước chuẩn khung hình modal: 720 x 960 px (tỷ lệ 3:4 / ~4:5 chuẩn Portrait sắc nét)
const WIDTH = 720;
const HEIGHT = 960;
const TOTAL_FRAMES = 16;
const DELAY = 100; // 100ms/frame = 1.6s chu kỳ tuần hoàn vô tận mượt mà

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
    anmfHeader[15] = 0x02; // Dispose to background

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
  vp8xHeader[8] = 0x12; // Animated + Alpha
  writeUInt24LE(vp8xHeader, WIDTH - 1, 12);
  writeUInt24LE(vp8xHeader, HEIGHT - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8); // Transparent canvas
  animChunk.writeUInt16LE(loopCount, 12); // 0 = Infinite loop

  const bodyData = Buffer.concat([vp8xHeader, animChunk, ...anmfChunks]);
  const riffSize = 4 + bodyData.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(riffSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, bodyData]);
}

// Danh sách các hạt bụi sao / đom đóm vàng champagne lơ lửng tinh tế
const PARTICLES = [];
for (let i = 0; i < 28; i++) {
  PARTICLES.push({
    baseX: 140 + Math.random() * 460,
    baseY: 220 + Math.random() * 500,
    r: 1.2 + Math.random() * 2.2,
    speedY: 16 + Math.random() * 28,
    swayAmp: 3 + Math.random() * 6,
    phaseOffset: Math.random() * Math.PI * 2,
    color: Math.random() > 0.3 ? '#FDE047' : '#FFFFFF'
  });
}

function renderAnimationOverlaySvg(frameIndex) {
  const phase = (2 * Math.PI * frameIndex) / TOTAL_FRAMES;
  const sin1 = Math.sin(phase);
  const cos1 = Math.cos(phase);

  // Vầng trăng Rằm ở góc trái vách kính: cx ~ 219, cy ~ 326
  const moonCx = 219;
  const moonCy = 326;
  const moonAuraR = 68 + 12 * sin1;
  const moonAuraOpacity = 0.35 + 0.15 * sin1;

  // Bục tròn LED vàng champagne: cx ~ 360, cy ~ 600, rx ~ 235, ry ~ 46
  const podiumCx = 360;
  const podiumCy = 600;
  const podiumLedOpacity = 0.30 + 0.15 * cos1;

  // Trần đèn LED vàng ấm thở nhẹ
  const ceilingGlowOpacity = 0.18 + 0.08 * sin1;

  // Các hạt bụi sao vàng champagne
  const particlesSvg = PARTICLES.map((p, idx) => {
    const loopProgress = (frameIndex / TOTAL_FRAMES);
    const curY = (p.baseY - loopProgress * p.speedY + 960) % 960;
    const curX = p.baseX + p.swayAmp * Math.sin(phase + p.phaseOffset);
    const pOpacity = 0.35 + 0.45 * Math.sin(phase * 2 + p.phaseOffset);
    return `<circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="${p.r.toFixed(1)}" fill="${p.color}" opacity="${Math.max(0.08, pOpacity).toFixed(2)}"/>`;
  }).join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <!-- Quầng hào quang vầng trăng -->
    <radialGradient id="moonGlowAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFBEB" stop-opacity="${moonAuraOpacity.toFixed(2)}"/>
      <stop offset="40%" stop-color="#FEF08A" stop-opacity="${(moonAuraOpacity * 0.6).toFixed(2)}"/>
      <stop offset="80%" stop-color="#FDE047" stop-opacity="${(moonAuraOpacity * 0.18).toFixed(2)}"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Quầng sáng vòng LED bục cẩm thạch -->
    <radialGradient id="podiumLedGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="${(podiumLedOpacity * 1.3).toFixed(2)}"/>
      <stop offset="35%" stop-color="#FDE047" stop-opacity="${podiumLedOpacity.toFixed(2)}"/>
      <stop offset="85%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>

    <!-- Ánh sáng êm dịu trần nhà -->
    <radialGradient id="ceilingGlow" cx="50%" cy="20%" r="60%">
      <stop offset="0%" stop-color="#FEF9C3" stop-opacity="${ceilingGlowOpacity.toFixed(2)}"/>
      <stop offset="60%" stop-color="#FDE047" stop-opacity="${(ceilingGlowOpacity * 0.3).toFixed(2)}"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- 1. Hào quang thở trần nhà sang trọng -->
  <rect x="0" y="0" width="${WIDTH}" height="180" fill="url(#ceilingGlow)"/>

  <!-- 2. Hào quang siêu thực thở quanh vầng Trăng Rằm -->
  <circle cx="${moonCx}" cy="${moonCy}" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlowAura)"/>

  <!-- 3. Quầng sáng lấp lánh trên vòng LED bục cẩm thạch trắng -->
  <ellipse cx="${podiumCx}" cy="${podiumCy}" rx="250" ry="52" fill="url(#podiumLedGlow)"/>

  <!-- 4. Hạt bụi sao vàng kim lơ lửng -->
  ${particlesSvg}
</svg>
  `;
}

async function main() {
  console.log(`--- ĐANG RENDER ẢNH ĐỘNG 3D SHOWROOM TONE TRẮNG SÁNG SIÊU SANG (${WIDTH}x${HEIGHT}, ${TOTAL_FRAMES} FRAMES) ---`);

  // Resize ảnh gốc 3D sang đúng kích thước chuẩn WIDTH x HEIGHT
  const baseBuffer = await sharp(BASE_IMAGE_PATH)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
    .toBuffer();

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const overlaySvg = renderAnimationOverlaySvg(f);
    const frameBuffer = await sharp(baseBuffer)
      .composite([{
        input: Buffer.from(overlaySvg),
        top: 0,
        left: 0,
        blend: 'over'
      }])
      .webp({ quality: 88, effort: 4 })
      .toBuffer();

    frames.push(frameBuffer);
    process.stdout.write(`\rRendered frame ${f + 1}/${TOTAL_FRAMES}...`);
  }

  console.log('\nĐang đóng gói thành Animated WebP lặp vô tận...');
  const animatedBuffer = muxAnimatedWebP(frames, DELAY, 0);

  const outputPathWebp = path.resolve(__dirname, '../public/pictures/showroom_trung_thu.webp');
  const outputPathBgWhiteWebp = path.resolve(__dirname, '../public/pictures/showroom_bg_white.webp');
  fs.writeFileSync(outputPathWebp, animatedBuffer);
  fs.writeFileSync(outputPathBgWhiteWebp, animatedBuffer);

  // Cũng xuất file tĩnh PNG chất lượng cao
  const staticPngPath = path.resolve(__dirname, '../public/pictures/showroom_trung_thu.png');
  const staticBgWhitePng = path.resolve(__dirname, '../public/pictures/showroom_bg_white.png');
  await sharp(frames[0]).png().toFile(staticPngPath);
  await sharp(frames[0]).png().toFile(staticBgWhitePng);

  console.log(`\nĐÃ XUẤT THÀNH CÔNG ẢNH ĐỘNG 3D TONE TRẮNG SÁNG TẠI: ${outputPathWebp}`);
  console.log(`Dung lượng file WebP động: ${(animatedBuffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Lỗi khi render ảnh động 3D tone trắng sáng:', err);
  process.exit(1);
});
