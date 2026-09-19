const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 540;
const HEIGHT = 200;
const TOTAL_FRAMES = 24;
const DELAY = 80;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 80, loopCount = 0) {
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

  const vp8xHeader = Buffer.alloc(8 + 10);
  vp8xHeader.write('VP8X', 0, 4, 'latin1');
  vp8xHeader.writeUInt32LE(10, 4);
  vp8xHeader[8] = 0x12;
  writeUInt24LE(vp8xHeader, WIDTH - 1, 12);
  writeUInt24LE(vp8xHeader, HEIGHT - 1, 15);

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

async function main() {
  console.log('--- BẮT ĐẦU TẠO MẪU B: 3D CGI / AI RENDER SIÊU THỰC (ANIMATED WEBP) ---');

  // Tìm file ảnh AI vừa tạo
  const artDir = 'C:\\Users\\USER\\.gemini\\antigravity-ide\\brain\\20283d69-1a33-4b02-a664-4c400b1f10f4';
  const files = fs.readdirSync(artDir).filter(f => f.startsWith('vin_hero_3d_render') && f.endsWith('.jpg'));
  if (files.length === 0) {
    throw new Error('Không tìm thấy file ảnh render 3D');
  }
  const sourceImagePath = path.join(artDir, files[files.length - 1]);
  console.log('Sử dụng ảnh nguồn 3D:', sourceImagePath);

  // Resize và crop ảnh 3D về kích thước 540 x 200 banner hoàn hảo
  // Chúng ta tập trung vào nửa trên & giữa (trăng, mái chùa, đèn lồng và thỏ ngọc)
  const baseBuffer = await sharp(sourceImagePath)
    .resize(540, 280, { fit: 'cover', position: 'center' })
    .extract({ left: 0, top: 20, width: 540, height: 200 })
    .toBuffer();

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Hào quang trăng nhịp thở
    const moonGlowOpacity = 0.15 + 0.10 * Math.sin(phase);
    // Tia sáng thần tiên quét nhẹ
    const rayAngle = Math.sin(phase) * 1.5;

    // Đom đóm bay lơ lửng
    const f1X = 330 + Math.sin(phase) * 15;
    const f1Y = 120 + Math.cos(phase * 2) * 8;
    const f2X = 360 + Math.cos(phase) * 18;
    const f2Y = 145 + Math.sin(phase * 2) * 6;
    const f3X = 270 + Math.sin(phase + 1) * 12;
    const f3Y = 90 + Math.cos(phase) * 8;

    // Ánh sao lấp lánh
    const s1 = 0.3 + 0.7 * Math.max(0, Math.sin(phase));
    const s2 = 0.3 + 0.7 * Math.max(0, Math.sin(phase + 2));

    const overlaySvg = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="godRayAura" cx="62%" cy="20%" r="60%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="${moonGlowOpacity.toFixed(2)}"/>
            <stop offset="40%" stop-color="#f59e0b" stop-opacity="${(moonGlowOpacity * 0.5).toFixed(2)}"/>
            <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
          </radialGradient>
          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3"/>
          </filter>
        </defs>

        <!-- Lớp hào quang thở nhẹ nhàng quanh vầng trăng -->
        <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#godRayAura)" style="mix-blend-mode: screen;"/>

        <!-- Đom đóm bay lơ lửng lung linh -->
        <circle cx="${f1X.toFixed(1)}" cy="${f1Y.toFixed(1)}" r="2.5" fill="#fef08a" filter="url(#soft)" opacity="0.85"/>
        <circle cx="${f1X.toFixed(1)}" cy="${f1Y.toFixed(1)}" r="1.0" fill="#ffffff"/>

        <circle cx="${f2X.toFixed(1)}" cy="${f2Y.toFixed(1)}" r="2.2" fill="#fde047" filter="url(#soft)" opacity="0.8"/>
        <circle cx="${f2X.toFixed(1)}" cy="${f2Y.toFixed(1)}" r="0.9" fill="#ffffff"/>

        <circle cx="${f3X.toFixed(1)}" cy="${f3Y.toFixed(1)}" r="2.0" fill="#f59e0b" filter="url(#soft)" opacity="0.75"/>
        <circle cx="${f3X.toFixed(1)}" cy="${f3Y.toFixed(1)}" r="0.8" fill="#ffffff"/>

        <!-- Sao vàng lấp lánh trên bầu trời đêm -->
        <g transform="translate(180, 25)" opacity="${s1.toFixed(2)}" filter="url(#soft)">
          <line x1="-6" y1="0" x2="6" y2="0" stroke="#fef08a" stroke-width="1.2"/>
          <line x1="0" y1="-6" x2="0" y2="6" stroke="#fef08a" stroke-width="1.2"/>
          <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
        </g>
        <g transform="translate(480, 35)" opacity="${s2.toFixed(2)}" filter="url(#soft)">
          <line x1="-5" y1="0" x2="5" y2="0" stroke="#fef08a" stroke-width="1.0"/>
          <line x1="0" y1="-5" x2="0" y2="5" stroke="#fef08a" stroke-width="1.0"/>
          <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
        </g>
      </svg>
    `;

    const frameBuf = await sharp(baseBuffer)
      .composite([{ input: Buffer.from(overlaySvg), blend: 'over' }])
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(frameBuf);
  }

  const animWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/vin_hero_test_3d_cgi.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/vin_hero_test_3d_cgi.webp');

  fs.writeFileSync(outPictures, animWebp);
  fs.writeFileSync(outPublic, animWebp);

  console.log(`HOÀN TẤT MẪU B (3D CGI ANIMATED WEBP): ${(animWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Lưu tại: ${outPictures}`);
}

main().catch(console.error);
