const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn tỉ lệ cho TOÀN BỘ THẺ StockCard: 320 x 480 px (Retina 2x)
const WIDTH = 320;
const HEIGHT = 480;
const TOTAL_FRAMES = 24;
const DELAY = 80; // 80ms/frame = ~1.92s chu kỳ mượt mà

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

// Vẽ hoa sen hoàng kim nở rộ
function renderLotusFlower(cx, cy, scale = 1.0, opacity = 0.85) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <!-- Cánh sen ngoài -->
      <path d="M 0,-12 C 8,-8 14,0 0,6 C -14,0 -8,-8 0,-12 Z" fill="url(#lotusPinkGrad)"/>
      <path d="M -8,-6 C -4,-12 4,-12 8,-6 C 12,0 0,6 -8,-6 Z" fill="url(#lotusPinkGrad)" opacity="0.9"/>
      <!-- Cánh sen trong -->
      <path d="M 0,-10 C 5,-6 8,0 0,4 C -8,0 -5,-6 0,-10 Z" fill="#fbcfe8"/>
      <!-- Nhụy sen vàng -->
      <circle cx="0" cy="-2" r="2.2" fill="#fbbf24"/>
    </g>
  `;
}

// Vẽ ngôi sao hoàng kim 4 cánh lấp lánh
function renderSparkle(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#eab308" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V5: ĐÈN CÁ CHÉP HÓA RỒNG & HỒ SEN HOÀNG KIM ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Đèn cá chép bơi lượn uốn sóng duyên dáng
    const carpBobY = Math.sin(phase) * 3.5;
    const carpTailWiggle = Math.sin(phase * 2) * 8.0;
    const carpFinWiggle = Math.sin(phase * 2) * 4.0;

    // Bong bóng ánh trăng nổi lên từ dưới hồ
    const b1Y = 380 - ((f / TOTAL_FRAMES) * 140);
    const b1X = 50 + Math.sin(phase * 2) * 8;
    const b2Y = 430 - (((f + 12) % TOTAL_FRAMES) / TOTAL_FRAMES * 150);
    const b2X = 275 - Math.cos(phase * 2) * 8;

    // Gợn sóng nước hồ sen dưới bánh xe (nhịp thở)
    const waveR = 135 + 8 * Math.sin(phase);

    // Ngôi sao lấp lánh
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient thân cá chép đỏ cam hoàng gia -->
          <linearGradient id="carpBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="40%" stop-color="#f97316"/>
            <stop offset="80%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>

          <!-- Gradient vây đuôi cá chép vàng kim mỏng như lụa -->
          <linearGradient id="carpFinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/>
            <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#f97316" stop-opacity="0.6"/>
          </linearGradient>

          <!-- Gradient hoa sen tím hồng -->
          <linearGradient id="lotusPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f472b6"/>
            <stop offset="50%" stop-color="#ec4899"/>
            <stop offset="100%" stop-color="#be185d"/>
          </linearGradient>

          <!-- Hào quang mặt hồ sen dưới xe -->
          <radialGradient id="lakeRipple" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.38"/>
            <stop offset="50%" stop-color="#fed7aa" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Gợn sóng mặt hồ ánh trăng nâng đỡ bánh xe -->
        <ellipse cx="160" cy="108" rx="${waveR.toFixed(1)}" ry="22" fill="url(#lakeRipple)"/>

        <!-- Gợn sóng nước nét vẽ mảnh nhẹ nhàng -->
        <path d="M 60,110 Q 110,105 160,110 T 260,110" fill="none" stroke="#fde047" stroke-width="0.8" opacity="0.6"/>
        <path d="M 85,116 Q 135,112 185,116 T 235,116" fill="none" stroke="#fed7aa" stroke-width="0.7" opacity="0.5"/>

        <!-- Hoa sen nở rộ 2 bên mặt hồ -->
        ${renderLotusFlower(36, 116, 0.85, 0.80)}
        ${renderLotusFlower(282, 114, 0.80, 0.75)}

        <!-- Bong bóng nước ánh trăng nổi lên lấp lánh -->
        <circle cx="${b1X.toFixed(1)}" cy="${b1Y.toFixed(1)}" r="2.8" fill="none" stroke="#f59e0b" stroke-width="0.7" opacity="0.65"/>
        <circle cx="${(b1X - 0.8).toFixed(1)}" cy="${(b1Y - 0.8).toFixed(1)}" r="0.8" fill="#ffffff" opacity="0.8"/>

        <circle cx="${b2X.toFixed(1)}" cy="${b2Y.toFixed(1)}" r="3.4" fill="none" stroke="#f97316" stroke-width="0.7" opacity="0.60"/>
        <circle cx="${(b2X - 0.9).toFixed(1)}" cy="${(b2Y - 0.9).toFixed(1)}" r="1.0" fill="#ffffff" opacity="0.8"/>

        <!-- Bụi sao lấp lánh -->
        <circle cx="45" cy="220" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="280" cy="260" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="50" cy="370" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="275" cy="410" r="1.3" fill="#d97706" opacity="0.55"/>

        ${renderSparkle(160, 22, 3.8, s1)}
        ${renderSparkle(285, 45, 3.4, s2)}
        ${renderSparkle(35, 175, 3.0, s3)}

        <!-- ================= ĐÈN CÁ CHÉP HOÁ RỒNG 3D BƠI LƯỢN (Góc Trên Trái cx=52, cy=36) ================= -->
        <g transform="translate(52, ${36 + carpBobY})">
          <!-- Hào quang ấm quanh đèn cá chép -->
          <circle cx="0" cy="0" r="28" fill="#fef08a" opacity="0.45"/>

          <!-- Dây treo đèn từ mép thẻ -->
          <line x1="0" y1="-36" x2="0" y2="-12" stroke="#d97706" stroke-width="1.1" opacity="0.85"/>

          <!-- Đuôi lụa cá chép vẫy sóng -->
          <g transform="translate(-14, 2) rotate(${carpTailWiggle.toFixed(2)})">
            <path d="M 0,0 C -12,-6 -18,-2 -22,-8 C -20,2 -24,8 -20,14 C -16,8 -10,6 0,0 Z" 
                  fill="url(#carpFinGrad)" stroke="#f59e0b" stroke-width="0.6"/>
            <!-- Tia gân đuôi lụa -->
            <line x1="0" y1="0" x2="-20" y2="-6" stroke="#ffffff" stroke-width="0.6" opacity="0.7"/>
            <line x1="0" y1="0" x2="-18" y2="4" stroke="#ffffff" stroke-width="0.6" opacity="0.7"/>
            <line x1="0" y1="0" x2="-18" y2="12" stroke="#ffffff" stroke-width="0.6" opacity="0.7"/>
          </g>

          <!-- Vây trên lưng cá chép -->
          <path d="M -4,-8 C 2,-16 10,-12 12,-7 Z" fill="url(#carpFinGrad)" stroke="#f59e0b" stroke-width="0.6"/>

          <!-- Vây dưới bụng vẫy nhẹ -->
          <g transform="translate(4, 8) rotate(${carpFinWiggle.toFixed(2)})">
            <path d="M 0,0 C 4,8 10,6 8,0 Z" fill="url(#carpFinGrad)" stroke="#f59e0b" stroke-width="0.6"/>
          </g>

          <!-- Thân cá chép uốn lượn hình thoi duyên dáng -->
          <path d="M 18,0 C 12,-8 -4,-8 -14,0 C -4,8 12,8 18,0 Z" 
                fill="url(#carpBodyGrad)" stroke="#b45309" stroke-width="0.8"/>

          <!-- Vảy cá vàng kim tinh xảo -->
          <path d="M -6,-3 C -2,-5 2,-3 0,0" fill="none" stroke="#fef08a" stroke-width="0.7"/>
          <path d="M 0,-3 C 4,-5 8,-3 6,0" fill="none" stroke="#fef08a" stroke-width="0.7"/>
          <path d="M -3,1 C 1,-1 5,1 3,4" fill="none" stroke="#fef08a" stroke-width="0.7"/>

          <!-- Mắt cá chép to tròn lanh lợi -->
          <circle cx="12" cy="-2.5" r="3.2" fill="#ffffff" stroke="#b45309" stroke-width="0.7"/>
          <circle cx="12.6" cy="-2.5" r="1.8" fill="#1e293b"/>
          <circle cx="13.2" cy="-3.0" r="0.7" fill="#ffffff"/>

          <!-- Miệng cá ngậm viên ngọc rồng -->
          <circle cx="19" cy="0" r="2.2" fill="#fbbf24" stroke="#d97706" stroke-width="0.6"/>
          <circle cx="18.5" cy="-0.6" r="0.8" fill="#ffffff"/>

          <!-- Râu rồng mềm mại vươn về phía trước -->
          <path d="M 18,-1 Q 24,-4 28,-1" fill="none" stroke="#f59e0b" stroke-width="0.8" stroke-linecap="round"/>
          <path d="M 18,1 Q 24,4 27,2" fill="none" stroke="#f59e0b" stroke-width="0.8" stroke-linecap="round"/>
        </g>
      </svg>
    `;

    const webpBuf = await sharp(Buffer.from(svgContent))
      .webp({ quality: 90, effort: 4 })
      .toBuffer();

    frames.push(webpBuf);

    if ((f + 1) % 6 === 0) {
      console.log(`Đã render frame ${f + 1}/${TOTAL_FRAMES}...`);
    }
  }

  console.log('Đang đóng gói file WebP động V5: ĐÈN CÁ CHÉP HÓA RỒNG (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v5_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v5_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V5: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
