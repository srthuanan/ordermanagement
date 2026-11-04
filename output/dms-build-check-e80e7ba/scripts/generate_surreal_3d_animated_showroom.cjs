const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BASE_IMAGE_PATH = 'C:/Users/USER/.gemini/antigravity-ide/brain/7ba121bf-873a-46e4-93fc-b8066318040e/surreal_3d_showroom_1789529767641.jpg';

// Kích thước chuẩn khung hình modal: 720 x 960 px (tỷ lệ 3:4 / ~4:5 cực kỳ sắc nét trên màn hình Retina)
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

// Tạo hiệu ứng hạt bụi sao & đom đóm 3D lơ lửng
const PARTICLES = [];
for (let i = 0; i < 35; i++) {
  PARTICLES.push({
    baseX: 120 + Math.random() * 480,
    baseY: 150 + Math.random() * 550,
    r: 1.5 + Math.random() * 3.0,
    speedY: 20 + Math.random() * 35,
    swayAmp: 4 + Math.random() * 8,
    phaseOffset: Math.random() * Math.PI * 2,
    color: Math.random() > 0.4 ? '#FDE047' : '#FFFFFF'
  });
}

function renderAnimationOverlaySvg(frameIndex) {
  const phase = (2 * Math.PI * frameIndex) / TOTAL_FRAMES;
  const sin1 = Math.sin(phase);
  const cos1 = Math.cos(phase);

  // Tọa độ vầng trăng trên ảnh 3D chuẩn 720x960: cx ~ 445, cy ~ 275, r ~ 75
  const moonCx = 445;
  const moonCy = 275;
  const moonAuraR = 140 + 18 * sin1;
  const moonAuraOpacity = 0.35 + 0.15 * sin1;

  // Tọa độ bục tròn LED 3D: cx ~ 360, cy ~ 590, rx ~ 260, ry ~ 65
  const podiumCx = 360;
  const podiumCy = 590;
  const podiumLedOpacity = 0.25 + 0.12 * cos1;

  // Luồng sáng thiên đình từ đỉnh vòm kính
  const lightBeamOpacity = 0.08 + 0.05 * sin1;

  // Các hạt đom đóm & bụi sao 3D
  const particlesSvg = PARTICLES.map((p, idx) => {
    const loopProgress = (frameIndex / TOTAL_FRAMES);
    const curY = (p.baseY - loopProgress * p.speedY + 960) % 960;
    const curX = p.baseX + p.swayAmp * Math.sin(phase + p.phaseOffset);
    const pOpacity = 0.4 + 0.5 * Math.sin(phase * 2 + p.phaseOffset);
    return `<circle cx="${curX.toFixed(1)}" cy="${curY.toFixed(1)}" r="${p.r.toFixed(1)}" fill="${p.color}" opacity="${Math.max(0.1, pOpacity).toFixed(2)}" filter="url(#glow)"/>`;
  }).join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Quầng sáng trăng Rằm siêu thực -->
    <radialGradient id="moonGlowAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="${moonAuraOpacity.toFixed(2)}"/>
      <stop offset="45%" stop-color="#FDE047" stop-opacity="${(moonAuraOpacity * 0.5).toFixed(2)}"/>
      <stop offset="80%" stop-color="#F59E0B" stop-opacity="${(moonAuraOpacity * 0.15).toFixed(2)}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>

    <!-- Vầng sáng bục tròn LED Neon -->
    <radialGradient id="podiumAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="${(podiumLedOpacity * 1.2).toFixed(2)}"/>
      <stop offset="40%" stop-color="#FDE047" stop-opacity="${podiumLedOpacity.toFixed(2)}"/>
      <stop offset="85%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>

    <!-- Tia sáng thiên đình từ nóc vòm kính -->
    <linearGradient id="celestialBeam" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" stop-color="#FEF08A" stop-opacity="${(lightBeamOpacity * 1.5).toFixed(2)}"/>
      <stop offset="40%" stop-color="#FDE047" stop-opacity="${lightBeamOpacity.toFixed(2)}"/>
      <stop offset="100%" stop-color="#FDE047" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- 1. Luồng sáng thiên đình chiếu từ vòm kính -->
  <polygon points="310,0 410,0 520,580 200,580" fill="url(#celestialBeam)"/>

  <!-- 2. Hào quang siêu thực thở quanh vầng Trăng Rằm -->
  <circle cx="${moonCx}" cy="${moonCy}" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlowAura)"/>

  <!-- 3. Quầng sáng lấp lánh trên vòng LED bục cẩm thạch -->
  <ellipse cx="${podiumCx}" cy="${podiumCy}" rx="275" ry="68" fill="url(#podiumAura)"/>

  <!-- 4. Hệ thống hạt bụi sao & hoa đăng 3D bay bổng -->
  ${particlesSvg}
</svg>
  `;
}

async function main() {
  console.log(`--- ĐANG RENDER ẢNH ĐỘNG SIÊU THỰC 3D SHOWROOM (${WIDTH}x${HEIGHT}, ${TOTAL_FRAMES} FRAMES) ---`);

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
      .webp({ quality: 86, effort: 4 })
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

  // Cũng xuất file tĩnh PNG chất lượng cao của frame 0 làm fallback nếu cần
  const staticPngPath = path.resolve(__dirname, '../public/pictures/showroom_trung_thu.png');
  await sharp(frames[0]).png().toFile(staticPngPath);

  console.log(`\nĐÃ XUẤT THÀNH CÔNG ẢNH ĐỘNG SIÊU THỰC 3D TẠI: ${outputPathWebp}`);
  console.log(`Dung lượng file WebP động: ${(animatedBuffer.length / 1024).toFixed(1)} KB`);
}

main().catch(err => {
  console.error('Lỗi khi render ảnh động siêu thực 3D:', err);
  process.exit(1);
});
