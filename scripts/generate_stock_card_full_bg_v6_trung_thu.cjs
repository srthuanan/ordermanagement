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

// Vẽ Đèn Trời (Sky Lantern / Thiên Đăng) phát sáng ấm áp
function renderSkyLantern(cx, cy, scale = 1.0, tilt = 0, glowOpacity = 0.5) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${tilt.toFixed(1)}) scale(${scale})">
      <!-- Quầng hào quang ấm áp tỏa ra từ đèn trời -->
      <ellipse cx="0" cy="0" rx="18" ry="22" fill="url(#skyLanternGlow)" opacity="${glowOpacity.toFixed(2)}"/>

      <!-- Thân đèn trời hình trụ vòm giấy dó truyền thống -->
      <path d="M -10,12 C -13,4 -12,-8 -9,-14 C -5,-18 5,-18 9,-14 C 12,-8 13,4 10,12 Z" 
            fill="url(#skyLanternPaper)" stroke="#f59e0b" stroke-width="0.8"/>

      <!-- Khung vành tre ở đáy đèn -->
      <ellipse cx="0" cy="12" rx="10" ry="2.5" fill="#d97706" stroke="#b45309" stroke-width="0.6"/>
      <ellipse cx="0" cy="12" rx="7.5" ry="1.8" fill="#1c1917" opacity="0.6"/>

      <!-- Ngọn lửa nến ấm lung linh bên trong đáy đèn -->
      <ellipse cx="0" cy="10" rx="3.5" ry="4.5" fill="url(#candleFlame)"/>
      <circle cx="0" cy="10" r="1.5" fill="#ffffff"/>

      <!-- Nan tre mỏng định hình khung đèn -->
      <path d="M -5,-16 C -7,-6 -6,6 -5,12" fill="none" stroke="#fef08a" stroke-width="0.5" opacity="0.6"/>
      <path d="M 5,-16 C 7,-6 6,6 5,12" fill="none" stroke="#fef08a" stroke-width="0.5" opacity="0.6"/>
      <line x1="0" y1="-17" x2="0" y2="12" stroke="#fef08a" stroke-width="0.6" opacity="0.75"/>
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
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V6: ĐÊM HỘI THẢ ĐÈN TRỜI THIÊN ĐĂNG BAY BỔNG ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Các ngọn đèn trời bay bổng từ dưới lên trên và đung đưa nhẹ theo gió
    // Đèn 1 (chính, lớn, góc trên phải): bay bồng bềnh
    const l1Y = 36 + Math.sin(phase) * 4;
    const l1X = 265 + Math.cos(phase) * 3;
    const l1Tilt = Math.sin(phase) * 3;
    const l1Glow = 0.55 + 0.15 * Math.sin(phase * 2);

    // Đèn 2 (trung bình, góc trên trái):
    const l2Y = 48 - Math.sin(phase + 1) * 3.5;
    const l2X = 42 + Math.cos(phase + 1) * 2.5;
    const l2Tilt = -Math.sin(phase + 1) * 2.5;
    const l2Glow = 0.50 + 0.15 * Math.sin(phase * 2 + 1);

    // Đèn 3 (nhỏ hơn, bay ở xa hơn giữa bầu trời):
    const l3Y = 22 + Math.sin(phase + 2) * 2.5;
    const l3X = 145 + Math.cos(phase + 2) * 3;
    const l3Tilt = Math.sin(phase + 2) * 2;

    // Đèn 4 (bay ngang sườn xe bên phải):
    const l4Y = 175 + Math.sin(phase + 3) * 3;
    const l4X = 285 + Math.cos(phase + 3) * 2;

    // Đèn 5 (xa tít tắp mờ ảo):
    const l5Y = 15 + Math.sin(phase + 4) * 2;
    const l5X = 210 - Math.cos(phase + 4) * 2;

    // Bục ánh sáng dưới xe (nhịp thở dịu êm)
    const stageR = 135 + 6 * Math.sin(phase);

    // Ngôi sao lấp lánh
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient giấy dó đèn trời ấm áp -->
          <linearGradient id="skyLanternPaper" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="35%" stop-color="#fbbf24"/>
            <stop offset="75%" stop-color="#f97316"/>
            <stop offset="100%" stop-color="#ef4444"/>
          </linearGradient>

          <!-- Quầng hào quang ấm áp của đèn trời -->
          <radialGradient id="skyLanternGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fde047" stop-opacity="0.9"/>
            <stop offset="45%" stop-color="#f97316" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
          </radialGradient>

          <!-- Ngọn lửa ấm bên trong đèn trời -->
          <radialGradient id="candleFlame" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="40%" stop-color="#fef08a"/>
            <stop offset="80%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#ef4444"/>
          </radialGradient>

          <!-- Bục ánh trăng nơi xe đậu -->
          <radialGradient id="stageWarmGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.40"/>
            <stop offset="55%" stop-color="#fde68a" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục xe ánh sáng ấm nâng đỡ gầm xe -->
        <ellipse cx="160" cy="108" rx="${stageR.toFixed(1)}" ry="24" fill="url(#stageWarmGlow)"/>

        <!-- Bụi sao hoàng kim thanh lịch -->
        <circle cx="50" cy="240" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="270" cy="270" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="45" cy="380" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="280" cy="420" r="1.3" fill="#d97706" opacity="0.55"/>

        ${renderSparkle(160, 45, 3.5, s1)}
        ${renderSparkle(85, 25, 3.2, s2)}
        ${renderSparkle(240, 150, 3.0, s3)}

        <!-- ================= CÁC NGỌN ĐÈN TRỜI THIÊN ĐĂNG BAY BỔNG ================= -->
        <!-- Đèn 5 (rất xa, mờ ảo) -->
        ${renderSkyLantern(l5X, l5Y, 0.40, 1.5, 0.35)}

        <!-- Đèn 3 (ở xa, nhỏ) -->
        ${renderSkyLantern(l3X, l3Y, 0.55, l3Tilt, 0.40)}

        <!-- Đèn 4 (bay bên sườn phải xe) -->
        ${renderSkyLantern(l4X, l4Y, 0.60, -2.0, 0.45)}

        <!-- Đèn 2 (góc trên trái, cỡ vừa) -->
        ${renderSkyLantern(l2X, l2Y, 0.85, l2Tilt, l2Glow)}

        <!-- Đèn 1 (góc trên phải, nổi bật nhất, to nhất) -->
        ${renderSkyLantern(l1X, l1Y, 1.10, l1Tilt, l1Glow)}

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

  console.log('Đang đóng gói file WebP động V6: THẢ ĐÈN TRỜI THIÊN ĐĂNG (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v6_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v6_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V6: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
