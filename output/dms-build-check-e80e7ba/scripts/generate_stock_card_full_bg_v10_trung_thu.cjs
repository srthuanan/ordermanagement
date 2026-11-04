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
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V10: CHỊ HẰNG NGA CUNG QUẢNG HÀN & DẢI LỤA TIÊN ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chị Hằng Nga bay bổng lơ lửng bồng bềnh
    const fairyBobY = Math.sin(phase) * 3.5;
    const fairyTilt = Math.sin(phase) * 2.0;

    // Dải lụa tiên bay lượn uốn sóng
    const ribbonWave1 = Math.sin(phase) * 8;
    const ribbonWave2 = Math.cos(phase) * 8;

    // Mây tiên dưới chân xe bồng bềnh
    const cloudSway = Math.sin(phase) * 12;

    // Bụi sao thần tiên rải từ tà áo Chị Hằng
    const p1X = 230 - ((f / TOTAL_FRAMES) * 120);
    const p1Y = 45 + Math.sin(phase * 2) * 14;
    const p2X = 230 - (((f + 12) % TOTAL_FRAMES) / TOTAL_FRAMES * 140);
    const p2Y = 60 - Math.cos(phase * 2) * 12;

    // Ngôi sao lấp lánh
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient vầng trăng rằm thần tiên -->
          <radialGradient id="fairyMoonGrad" cx="38%" cy="38%" r="62%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="25%" stop-color="#fef9c3"/>
            <stop offset="65%" stop-color="#fde047"/>
            <stop offset="90%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>

          <!-- Gradient dải lụa tiên màu hồng ngọc & vàng ánh kim -->
          <linearGradient id="fairyRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fb7185" stop-opacity="0.8"/>
            <stop offset="35%" stop-color="#f472b6" stop-opacity="0.85"/>
            <stop offset="65%" stop-color="#fef08a" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.75"/>
          </linearGradient>

          <!-- Gradient áo tiên Chị Hằng -->
          <linearGradient id="fairyDressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="50%" stop-color="#fbcfe8"/>
            <stop offset="100%" stop-color="#f472b6"/>
          </linearGradient>

          <!-- Hào quang trăng cung đình -->
          <radialGradient id="fairyAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.55"/>
            <stop offset="50%" stop-color="#fde68a" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>

          <!-- Bục mây thần tiên dưới xe -->
          <radialGradient id="fairyStage" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.45"/>
            <stop offset="55%" stop-color="#fde68a" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục mây thần tiên nâng đỡ bánh xe -->
        <ellipse cx="160" cy="108" rx="135" ry="24" fill="url(#fairyStage)"/>

        <!-- DẢI LỤA TIÊN UỐN LƯỢN MỀM MẠI TỪ CHỊ HẰNG SANG TOÀN THẺ -->
        <path d="M 235,${42 + fairyBobY} Q 170,${20 + ribbonWave1} 110,${46 - ribbonWave2} T 25,${65 + ribbonWave1}" 
              fill="none" stroke="url(#fairyRibbonGrad)" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M 235,${42 + fairyBobY} Q 170,${20 + ribbonWave1} 110,${46 - ribbonWave2} T 25,${65 + ribbonWave1}" 
              fill="none" stroke="#ffffff" stroke-width="0.8" stroke-linecap="round" opacity="0.8"/>

        <!-- Bụi sao thần tiên rải từ tà áo Chị Hằng -->
        <circle cx="${p1X.toFixed(1)}" cy="${p1Y.toFixed(1)}" r="1.6" fill="#f59e0b" opacity="0.8"/>
        <circle cx="${p2X.toFixed(1)}" cy="${p2Y.toFixed(1)}" r="1.8" fill="#fb7185" opacity="0.75"/>

        <!-- Bụi sao lấp lánh rải rác -->
        <circle cx="45" cy="220" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="280" cy="260" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="50" cy="370" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="275" cy="410" r="1.3" fill="#d97706" opacity="0.55"/>

        ${renderSparkle(160, 22, 3.8, s1)}
        ${renderSparkle(285, 95, 3.4, s2)}
        ${renderSparkle(35, 175, 3.0, s3)}

        <!-- ================= CUNG QUẢNG HÀN THU NHỎ Ở GÓC TRÊN TRÁI (cx=42, cy=35) ================= -->
        <g transform="translate(42, 35)">
          <!-- Hào quang cung điện -->
          <circle cx="0" cy="0" r="22" fill="#fef08a" opacity="0.4"/>
          <!-- Mái lầu cung điện dát vàng cong vuốt -->
          <path d="M -16,4 L -18,0 L 0,-8 L 18,0 L 16,4 L 0,-2 Z" fill="#d97706" stroke="#b45309" stroke-width="0.7"/>
          <path d="M -12,-1 L 0,-6 L 12,-1 L 0,-2 Z" fill="#fef08a"/>
          <!-- Cột cung điện -->
          <line x1="-10" y1="4" x2="-10" y2="15" stroke="#d97706" stroke-width="1.4"/>
          <line x1="10" y1="4" x2="10" y2="15" stroke="#d97706" stroke-width="1.4"/>
          <line x1="0" y1="4" x2="0" y2="15" stroke="#d97706" stroke-width="1.0"/>
          <!-- Bệ đá cung điện -->
          <rect x="-14" y="15" width="28" height="3" rx="1" fill="#f59e0b"/>
          <!-- Đèn lồng mini treo dưới mái lầu -->
          <circle cx="-13" cy="7" r="1.8" fill="#ef4444"/>
          <circle cx="13" cy="7" r="1.8" fill="#ef4444"/>
        </g>

        <!-- ================= VẦNG TRĂNG RẰM & CHỊ HẰNG NGA BAY LƯỢN (Góc Trên Phải cx=250, cy=44) ================= -->
        <g transform="translate(250, 44)">
          <!-- Hào quang vầng trăng rằm -->
          <circle cx="0" cy="0" r="32" fill="url(#fairyAura)"/>
          <!-- Vầng trăng rằm hoàng kim 3D -->
          <circle cx="0" cy="0" r="24" fill="url(#fairyMoonGrad)"/>
          <path d="M -8,-6 Q -2,-12 4,-8 Q 10,0 2,8 Q -6,4 -8,-6 Z" fill="#d97706" opacity="0.16"/>

          <!-- HÌNH BÓNG CHỊ HẰNG NGA 3D THƯỚT THA BAY LƯỢN (cx=-8, cy=2) -->
          <g transform="translate(-10, ${2 + fairyBobY}) rotate(${fairyTilt.toFixed(2)})">
            <!-- Đám mây tiên dưới chân Chị Hằng -->
            <ellipse cx="6" cy="14" rx="12" ry="4" fill="#ffffff" opacity="0.85"/>
            <circle cx="0" cy="12" r="4.5" fill="#ffffff" opacity="0.9"/>
            <circle cx="10" cy="13" r="4.5" fill="#ffffff" opacity="0.9"/>

            <!-- Tà váy lụa tiên thướt tha mềm mại -->
            <path d="M -4,2 C -7,8 -10,16 -3,17 C 4,18 8,14 6,2 Z" fill="url(#fairyDressGrad)" stroke="#f472b6" stroke-width="0.5"/>

            <!-- Thân áo tiên trắng ngọc -->
            <ellipse cx="1" cy="-1" rx="3.5" ry="4.5" fill="#ffffff" stroke="#fbcfe8" stroke-width="0.5"/>

            <!-- Dải khăn choàng vai tiên nữ vắt chéo -->
            <path d="M -4,-3 Q 1,-6 6,-3 Q 9,1 7,8" fill="none" stroke="#f472b6" stroke-width="1.2" stroke-linecap="round"/>

            <!-- Khuôn mặt Chị Hằng thanh tú -->
            <circle cx="2" cy="-9" r="3.2" fill="#fef08a" stroke="#f59e0b" stroke-width="0.5"/>

            <!-- Búi tóc tiên nữ mây bồng bềnh & Trâm cài hoa ngọc -->
            <ellipse cx="0.5" cy="-12.5" rx="3.5" ry="2.2" fill="#1e293b"/>
            <circle cx="-1.5" cy="-13" r="1.2" fill="#fb7185"/>
            <line x1="-1.5" y1="-13" x2="-4" y2="-15" stroke="#fef08a" stroke-width="0.8"/>

            <!-- Quạt lụa tròn hoa sen trên tay Chị Hằng -->
            <g transform="translate(6, -6)">
              <circle cx="0" cy="0" r="2.8" fill="#ffffff" stroke="#f472b6" stroke-width="0.6"/>
              <line x1="0" y1="2.8" x2="0" y2="5.5" stroke="#b45309" stroke-width="0.6"/>
              <circle cx="0" cy="0" r="1.0" fill="#fb7185"/>
            </g>
          </g>
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

  console.log('Đang đóng gói file WebP động V10: CHỊ HẰNG NGA & CUNG QUẢNG HÀN (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v10_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v10_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V10: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
