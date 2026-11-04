const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Dimensions: 360 x 64 px (Chuẩn Retina 2x cho tab h-8 = 32px)
const WIDTH = 360;
const HEIGHT = 64;
const TOTAL_FRAMES = 24;
const DELAY = 80; // 80ms/frame = ~1.92s

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
  animChunk.writeUInt16LE(loopCount, 12);

  const bodyData = Buffer.concat([vp8xHeader, animChunk, ...anmfChunks]);
  const riffSize = 4 + bodyData.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(riffSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, bodyData]);
}

// Ngôi sao nhỏ lấp lánh nhẹ nhàng
function renderTinyGlint(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.25;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#fbbf24" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

async function main() {
  console.log('--- TẠO HÌNH ẢNH NỀN ĐỘNG TAB: PHONG CÁCH TỐI GIẢN & TINH TẾ (MINIMAL LUXURY) ---');

  const mooncakeSourcePath = path.join(__dirname, '../pictures/mooncake_icon_clean.png');
  if (!fs.existsSync(mooncakeSourcePath)) {
    throw new Error('Không tìm thấy file nguồn bánh trung thu: ' + mooncakeSourcePath);
  }

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chuyển động nhẹ nhàng thanh thoát
    const bobY = Math.sin(phase) * 1.2;
    const scale = 1.0 + 0.015 * Math.cos(phase);
    const mooncakeSize = Math.round(38 * scale);

    // Vị trí icon bánh trung thu: X = 32, Y = 32
    const mcCenterX = 32;
    const mcCenterY = 32 + bobY;
    const mcLeft = Math.round(mcCenterX - mooncakeSize / 2);
    const mcTop = Math.round(mcCenterY - mooncakeSize / 2);

    // Quầng sáng ấm áp dịu nhẹ
    const haloRadius = 22 + 2.5 * Math.sin(phase);
    const haloOpacity = 0.40 + 0.15 * Math.sin(phase);

    // Độ lấp lánh nhẹ
    const g1 = 0.35 + 0.55 * Math.max(0, Math.sin(phase));
    const g2 = 0.30 + 0.50 * Math.max(0, Math.sin(phase + 2.0));

    // Nền trắng ngà ánh vàng ấm áp tối giản
    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Nền ngọc trai ấm dịu, hiện đại, thanh lịch -->
          <linearGradient id="minimalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"/>
            <stop offset="50%" stop-color="#fffef7" stop-opacity="0.93"/>
            <stop offset="100%" stop-color="#fef8ea" stop-opacity="0.90"/>
          </linearGradient>

          <!-- Quầng sáng ấm áp nhẹ nhàng sau bánh -->
          <radialGradient id="softGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="${haloOpacity.toFixed(2)}"/>
            <stop offset="60%" stop-color="#fbbf24" stop-opacity="${(haloOpacity * 0.4).toFixed(2)}"/>
            <stop offset="100%" stop-color="#fbbf24" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- Nền trắng ngà sang trọng bao phủ đều -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#minimalGrad)"/>

        <!-- Quầng sáng ấm áp sau bánh nướng -->
        <circle cx="${mcCenterX}" cy="${mcCenterY.toFixed(1)}" r="${haloRadius.toFixed(1)}" fill="url(#softGlow)"/>

        <!-- Bóng đổ tiếp xúc 3D tự nhiên dịu nhẹ dưới bánh -->
        <ellipse cx="${mcCenterX}" cy="${(mcCenterY + 17).toFixed(1)}" rx="16" ry="3.5" fill="#78350f" opacity="0.18"/>

        <!-- Vài đốm sáng lấp lánh điểm xuyết tinh tế -->
        ${renderTinyGlint(56, 17, 3.5, g1)}
        ${renderTinyGlint(48, 46, 2.8, g2)}
        <circle cx="${(36 + Math.sin(phase) * 2).toFixed(1)}" cy="${(14 - Math.cos(phase) * 1.5).toFixed(1)}" r="1.2" fill="#f59e0b" opacity="0.65"/>
      </svg>
    `;

    // Render SVG nền ra buffer PNG
    const bgPngBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer();

    // Chuẩn bị icon Bánh Trung Thu (transparent background, sắc nét hoàn hảo)
    const resizedMooncake = await sharp(mooncakeSourcePath)
      .resize(mooncakeSize, mooncakeSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    // Ghép Bánh Trung Thu vào khung hình
    const framePngBuffer = await sharp(bgPngBuffer)
      .composite([
        {
          input: resizedMooncake,
          left: Math.max(0, mcLeft),
          top: Math.max(0, mcTop)
        }
      ])
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toBuffer();

    frames.push(framePngBuffer);
    if ((f + 1) % 6 === 0 || f === TOTAL_FRAMES - 1) {
      console.log(`Đã tạo frame ${f + 1}/${TOTAL_FRAMES}...`);
    }
  }

  console.log('Đang đóng gói file WebP động (Muxing ANMF chunks)...');
  const animatedWebpBuffer = muxAnimatedWebP(frames, DELAY, 0);

  const outPicturesPath = path.join(__dirname, '../pictures/tab_active_trung_thu_bg.webp');
  const outPublicPath = path.join(__dirname, '../public/assets/tab_active_trung_thu_bg.webp');

  fs.writeFileSync(outPicturesPath, animatedWebpBuffer);
  fs.writeFileSync(outPublicPath, animatedWebpBuffer);

  const sizeKb = (animatedWebpBuffer.length / 1024).toFixed(1);
  console.log(`HOÀN TẤT! File ảnh nền động tab active tối giản: ${sizeKb} KB`);
  console.log(`Đã lưu tại:\n- ${outPicturesPath}\n- ${outPublicPath}`);
}

main().catch(err => {
  console.error('Lỗi khi tạo ảnh nền động tab:', err);
  process.exit(1);
});
