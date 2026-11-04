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

// Vẽ đèn tròn Hội An đỏ
function renderRoundLantern(cx, cy, sway, phase) {
  return `
    <g transform="translate(${cx}, ${cy}) rotate(${sway.toFixed(2)})">
      <circle cx="0" cy="0" r="14" fill="#fef08a" opacity="0.35"/>
      <rect x="-3" y="-12" width="6" height="2.5" rx="1" fill="#d97706"/>
      <ellipse cx="0" cy="0" rx="9" ry="10.5" fill="url(#redLanternGrad)" stroke="#fef08a" stroke-width="0.7"/>
      <ellipse cx="0" cy="0" rx="4.5" ry="10.5" fill="none" stroke="#fef08a" stroke-width="0.5" opacity="0.8"/>
      <line x1="0" y1="-10.5" x2="0" y2="10.5" stroke="#fef08a" stroke-width="0.5" opacity="0.9"/>
      <rect x="-3" y="9.5" width="6" height="2.5" rx="1" fill="#d97706"/>
      <line x1="0" y1="12" x2="${Math.sin(phase) * 1.2}" y2="21" stroke="#dc2626" stroke-width="1.2"/>
      <circle cx="${Math.sin(phase) * 1.2}" cy="21" r="1.3" fill="#f59e0b"/>
    </g>
  `;
}

// Vẽ đèn ông sao mini
function renderStarLanternMini(cx, cy, sway, phase) {
  return `
    <g transform="translate(${cx}, ${cy}) rotate(${sway.toFixed(2)})">
      <circle cx="0" cy="0" r="15" fill="#fde047" opacity="0.4"/>
      <circle cx="0" cy="0" r="9.5" fill="none" stroke="#f59e0b" stroke-width="0.9"/>
      <polygon points="0,-9 2.8,-2.8 9,-2.8 4.2,1.4 6.3,7.5 0,3.8 -6.3,7.5 -4.2,1.4 -9,-2.8 -2.8,-2.8"
               fill="url(#starRedGrad)" stroke="#fef08a" stroke-width="0.6"/>
      <circle cx="0" cy="0" r="2.5" fill="#fbbf24"/>
      <line x1="0" y1="9.5" x2="${Math.sin(phase) * 1.2}" y2="19" stroke="#dc2626" stroke-width="1.2"/>
      <circle cx="${Math.sin(phase) * 1.2}" cy="19" r="1.3" fill="#f59e0b"/>
    </g>
  `;
}

// Vẽ đèn quả trám vàng hoàng gia
function renderDiamondLantern(cx, cy, sway, phase) {
  return `
    <g transform="translate(${cx}, ${cy}) rotate(${sway.toFixed(2)})">
      <circle cx="0" cy="0" r="16" fill="#fef08a" opacity="0.35"/>
      <rect x="-3" y="-12" width="6" height="2.5" rx="1" fill="#b45309"/>
      <path d="M 0,-10 C 9,-5 10,5 0,10 C -10,5 -9,-5 0,-10 Z" 
            fill="url(#goldLanternGrad)" stroke="#d97706" stroke-width="0.7"/>
      <ellipse cx="0" cy="0" rx="7" ry="1.8" fill="none" stroke="#b45309" stroke-width="0.8"/>
      <rect x="-3" y="9.5" width="6" height="2.5" rx="1" fill="#b45309"/>
      <line x1="0" y1="12" x2="${Math.sin(phase) * 1.2}" y2="21" stroke="#dc2626" stroke-width="1.2"/>
      <circle cx="${Math.sin(phase) * 1.2}" cy="21" r="1.3" fill="#f59e0b"/>
    </g>
  `;
}

// Vẽ đèn lồng hoa sen tím hồng
function renderLotusLantern(cx, cy, sway, phase) {
  return `
    <g transform="translate(${cx}, ${cy}) rotate(${sway.toFixed(2)})">
      <circle cx="0" cy="0" r="15" fill="#fbcfe8" opacity="0.4"/>
      <rect x="-3" y="-11" width="6" height="2.5" rx="1" fill="#d97706"/>
      <path d="M 0,-9 C 8,-4 8,5 0,9 C -8,5 -8,-4 0,-9 Z" 
            fill="url(#lotusPinkGrad)" stroke="#f472b6" stroke-width="0.7"/>
      <path d="M 0,-9 C 3.5,-4 3.5,5 0,9" fill="none" stroke="#fbcfe8" stroke-width="0.5"/>
      <path d="M 0,-9 C -3.5,-4 -3.5,5 0,9" fill="none" stroke="#fbcfe8" stroke-width="0.5"/>
      <rect x="-3" y="8.5" width="6" height="2.5" rx="1" fill="#d97706"/>
      <line x1="0" y1="11" x2="${Math.sin(phase) * 1.2}" y2="20" stroke="#db2777" stroke-width="1.2"/>
      <circle cx="${Math.sin(phase) * 1.2}" cy="20" r="1.3" fill="#f59e0b"/>
    </g>
  `;
}

// Vẽ tia pháo hoa ánh sao mini nở nhẹ
function renderFireworkSpark(cx, cy, scale = 1.0, opacity = 0.7) {
  return `
    <g transform="translate(${cx}, ${cy}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <circle cx="0" cy="0" r="1.8" fill="#f59e0b"/>
      <line x1="0" y1="-3" x2="0" y2="-9" stroke="#f59e0b" stroke-width="0.8"/>
      <line x1="0" y1="3" x2="0" y2="9" stroke="#f59e0b" stroke-width="0.8"/>
      <line x1="-3" y1="0" x2="-9" y2="0" stroke="#f59e0b" stroke-width="0.8"/>
      <line x1="3" y1="0" x2="9" y2="0" stroke="#f59e0b" stroke-width="0.8"/>
      <line x1="-2.5" y1="-2.5" x2="-6.5" y2="-6.5" stroke="#ef4444" stroke-width="0.7"/>
      <line x1="2.5" y1="-2.5" x2="6.5" y2="-6.5" stroke="#ef4444" stroke-width="0.7"/>
      <line x1="-2.5" y1="2.5" x2="-6.5" y2="6.5" stroke="#ef4444" stroke-width="0.7"/>
      <line x1="2.5" y1="2.5" x2="6.5" y2="6.5" stroke="#ef4444" stroke-width="0.7"/>
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V3: MÁI VÒM PHỐ LỒNG ĐÈN ĐA SẮC & SÂN KHẤU XE ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Đung đưa lệch pha lượn sóng cho 5 chiếc đèn lồng
    const sway1 = Math.sin(phase) * 3.8;
    const sway2 = Math.sin(phase + 1.2) * 3.8;
    const sway3 = Math.sin(phase + 2.4) * 3.2;
    const sway4 = Math.sin(phase + 3.6) * 3.8;
    const sway5 = Math.sin(phase + 4.8) * 3.8;

    // Hào quang sân khấu chính giữa sau xe nhấp nhô ánh sáng
    const heroHaloR = 60 + 6 * Math.sin(phase);
    const heroHaloOpacity = 0.45 + 0.15 * Math.sin(phase);

    // Pháo hoa ánh sao nở nhẹ nhàng
    const fw1Scale = 0.6 + 0.4 * Math.sin(phase);
    const fw1Op = 0.3 + 0.5 * Math.max(0, Math.sin(phase));
    const fw2Scale = 0.6 + 0.4 * Math.sin(phase + Math.PI);
    const fw2Op = 0.3 + 0.5 * Math.max(0, Math.sin(phase + Math.PI));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient đèn lồng đỏ -->
          <linearGradient id="redLanternGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#b91c1c"/>
            <stop offset="40%" stop-color="#ef4444"/>
            <stop offset="60%" stop-color="#f87171"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>

          <!-- Gradient đèn ông sao -->
          <linearGradient id="starRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#b91c1c"/>
          </linearGradient>

          <!-- Gradient đèn quả trám vàng -->
          <linearGradient id="goldLanternGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#d97706"/>
            <stop offset="40%" stop-color="#fbbf24"/>
            <stop offset="60%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>

          <!-- Gradient đèn hoa sen tím hồng -->
          <linearGradient id="lotusPinkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#be185d"/>
            <stop offset="40%" stop-color="#ec4899"/>
            <stop offset="60%" stop-color="#f472b6"/>
            <stop offset="100%" stop-color="#9d174d"/>
          </linearGradient>

          <!-- Hào quang sân khấu vinh danh chính giữa sau xe -->
          <radialGradient id="heroCenterHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="${heroHaloOpacity.toFixed(2)}"/>
            <stop offset="50%" stop-color="#fde68a" stop-opacity="${(heroHaloOpacity * 0.45).toFixed(2)}"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>

          <!-- Mặt sàn ánh trăng nơi xe đậu -->
          <radialGradient id="stageFloor" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.35"/>
            <stop offset="60%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- HÀO QUANG SÂN KHẤU TRUNG THU TỎA SÁNG NGAY SAU XE (Trung tâm cx=160, cy=60) -->
        <circle cx="160" cy="62" r="${heroHaloR.toFixed(1)}" fill="url(#heroCenterHalo)"/>

        <!-- Vầng trăng ngọc mờ ảo chính giữa sau xe -->
        <circle cx="160" cy="62" r="32" fill="#fffbeb" stroke="#fef08a" stroke-width="1.2" opacity="0.8"/>
        <path d="M 152,52 Q 160,46 168,50 Q 174,58 166,66 Q 156,62 152,52 Z" fill="#fde68a" opacity="0.35"/>

        <!-- Mặt sàn ánh sáng dưới bánh xe -->
        <ellipse cx="160" cy="110" rx="130" ry="20" fill="url(#stageFloor)"/>

        <!-- Pháo hoa ánh sao nở nhẹ nhàng 2 bên hông -->
        ${renderFireworkSpark(38, 75, fw1Scale, fw1Op)}
        ${renderFireworkSpark(282, 75, fw2Scale, fw2Op)}

        <!-- Bụi sao lấp lánh rải rác -->
        <circle cx="45" cy="180" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="280" cy="220" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="50" cy="340" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="275" cy="380" r="1.3" fill="#d97706" opacity="0.55"/>

        <!-- ================= DÂY ĐÈN LỒNG GIĂNG NGANG ĐỈNH THẺ ================= -->
        <!-- Sợi dây treo uốn lượn hình cánh cung mềm mại -->
        <path d="M -5,4 Q 80,18 160,22 Q 240,18 325,4" fill="none" stroke="#d97706" stroke-width="1.2" opacity="0.85"/>

        <!-- Dây phụ rủ xuống từng đèn -->
        <line x1="32" y1="10" x2="32" y2="18" stroke="#d97706" stroke-width="1.0" opacity="0.9"/>
        <line x1="95" y1="16" x2="95" y2="24" stroke="#d97706" stroke-width="1.0" opacity="0.9"/>
        <line x1="160" y1="22" x2="160" y2="28" stroke="#d97706" stroke-width="1.0" opacity="0.9"/>
        <line x1="225" y1="16" x2="225" y2="24" stroke="#d97706" stroke-width="1.0" opacity="0.9"/>
        <line x1="288" y1="10" x2="288" y2="18" stroke="#d97706" stroke-width="1.0" opacity="0.9"/>

        <!-- 5 CHIẾC ĐÈN LỒNG LỄ HỘI ĐA SẮC ĐUNG ĐƯA NHỊP NHÀNG -->
        ${renderRoundLantern(32, 28, sway1, phase)}
        ${renderDiamondLantern(95, 34, sway2, phase + 1.2)}
        ${renderStarLanternMini(160, 38, sway3, phase + 2.4)}
        ${renderLotusLantern(225, 34, sway4, phase + 3.6)}
        ${renderRoundLantern(288, 28, sway5, phase + 4.8)}

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

  console.log('Đang đóng gói file WebP động V3 (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v3_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v3_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V3: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
