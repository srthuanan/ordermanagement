const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Dimensions: 520 x 60 px (Chuẩn tỉ lệ Floating Specs Pill dưới gầm xe)
const WIDTH = 520;
const HEIGHT = 60;
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

// Vẽ ngôi sao hoàng kim 4 cánh nhỏ li ti
function renderTinyStar(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#f59e0b" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU CHO SPECS PILL ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Vệt sáng lụa trăng quét ngang qua pill
    const sweepX = (t * 680) - 160;

    // Nhấp nháy nhẹ các hạt bụi vàng
    const s1 = 0.35 + 0.55 * Math.max(0, Math.sin(phase));
    const s2 = 0.30 + 0.60 * Math.max(0, Math.sin(phase + 1.2));
    const s3 = 0.30 + 0.60 * Math.max(0, Math.sin(phase + 2.4));
    const s4 = 0.35 + 0.55 * Math.max(0, Math.sin(phase + 3.6));
    const s5 = 0.25 + 0.55 * Math.max(0, Math.sin(phase + 4.8));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Nền lụa bạch ngọc pha ánh vàng champagne -->
          <linearGradient id="specsSilkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fffef7" stop-opacity="0.96"/>
            <stop offset="50%" stop-color="#fef8ea" stop-opacity="0.93"/>
            <stop offset="100%" stop-color="#fdf2d0" stop-opacity="0.90"/>
          </linearGradient>

          <!-- Dải lụa trăng lướt qua -->
          <linearGradient id="specsShimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="0.5"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- Thân nền phủ đầy -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#specsSilkGrad)"/>

        <!-- Họa tiết vân mây hoàng cung uốn lượn chìm rất nhẹ nhàng -->
        <g opacity="0.18" stroke="#d97706" stroke-width="0.8" fill="none">
          <path d="M 40,46 Q 50,42 60,45 Q 66,39 76,41 Q 82,46 90,46" />
          <path d="M 170,16 Q 180,12 190,15 Q 196,9 206,11 Q 212,16 220,16" />
          <path d="M 310,46 Q 320,42 330,45 Q 336,39 346,41 Q 352,46 360,46" />
          <path d="M 430,16 Q 440,12 450,15 Q 456,9 466,11 Q 472,16 480,16" />
        </g>

        <!-- Vệt lụa trăng quét ngang -->
        <g transform="translate(${sweepX.toFixed(1)}, 0)">
          <polygon points="0,60 55,0 95,0 40,60" fill="url(#specsShimmer)"/>
        </g>

        <!-- Các ngôi sao nhỏ lấp lánh nhẹ -->
        ${renderTinyStar(55, 18, 3.2, s1)}
        ${renderTinyStar(180, 44, 2.8, s2)}
        ${renderTinyStar(290, 16, 3.0, s3)}
        ${renderTinyStar(400, 42, 2.6, s4)}
        ${renderTinyStar(475, 18, 3.0, s5)}

        <!-- Bụi vàng vi mô trôi nổi -->
        <circle cx="${(95 + Math.sin(phase) * 3).toFixed(1)}" cy="${(14 - Math.cos(phase) * 1.5).toFixed(1)}" r="1.2" fill="#f59e0b" opacity="0.65"/>
        <circle cx="${(240 + Math.cos(phase) * 4).toFixed(1)}" cy="${(45 + Math.sin(phase) * 1.5).toFixed(1)}" r="1.0" fill="#d97706" opacity="0.55"/>
        <circle cx="${(360 - Math.sin(phase) * 3).toFixed(1)}" cy="${(44 + Math.cos(phase) * 1.5).toFixed(1)}" r="1.1" fill="#f59e0b" opacity="0.6"/>
      </svg>
    `;

    const frameWebpBuffer = await sharp(Buffer.from(svgContent))
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toBuffer();

    frames.push(frameWebpBuffer);
    if ((f + 1) % 6 === 0 || f === TOTAL_FRAMES - 1) {
      console.log(`Đã tạo frame ${f + 1}/${TOTAL_FRAMES}...`);
    }
  }

  console.log('Đang đóng gói file WebP động (Muxing ANMF chunks)...');
  const animatedWebpBuffer = muxAnimatedWebP(frames, DELAY, 0);

  const outPicturesPath = path.join(__dirname, '../pictures/specs_pill_bg_trung_thu.webp');
  const outPublicPath = path.join(__dirname, '../public/assets/specs_pill_bg_trung_thu.webp');

  fs.writeFileSync(outPicturesPath, animatedWebpBuffer);
  fs.writeFileSync(outPublicPath, animatedWebpBuffer);

  const sizeKb = (animatedWebpBuffer.length / 1024).toFixed(1);
  console.log(`HOÀN TẤT! File ảnh nền động Specs Pill: ${sizeKb} KB`);
  console.log(`Đã lưu tại:\n- ${outPicturesPath}\n- ${outPublicPath}`);
}

main().catch(err => {
  console.error('Lỗi khi tạo ảnh nền Specs Pill:', err);
  process.exit(1);
});
