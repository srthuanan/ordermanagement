const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn tỉ lệ cho TOÀN BỘ THẺ StockCard: 320 x 480 px (Retina 2x cho card ~230px x 350px)
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

// Vẽ ngôi sao hoàng kim 4 cánh lấp lánh sắc nét cho nền sáng
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

// Vẽ vân mây hoàng kim cung đình thanh thoát (Tone sáng)
function renderCloud(x, y, scale = 1.0, opacity = 0.5) {
  return `
    <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,20 Q 15,10 30,16 Q 42,0 60,6 Q 78,-2 95,12 Q 110,6 125,18 Q 138,32 120,38 Q 100,42 65,40 Q 30,42 12,34 Q -4,30 0,20 Z" 
            fill="url(#cloudGradLight)" />
      <path d="M 22,22 Q 36,14 54,20 Q 72,12 92,20" fill="none" stroke="#d97706" stroke-width="0.9" opacity="0.45"/>
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU TONE SÁNG (LIGHT FULL STOCK CARD) ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Đèn ông sao mini đung đưa nhẹ nhàng ở góc trái trên
    const starLanternSway = Math.sin(phase) * 4.0;

    // Quầng sáng Vầng Trăng Rằm hoàng kim ấm áp
    const moonAuraR = 54 + 6 * Math.sin(phase);
    const moonAuraOpacity = 0.65 + 0.20 * Math.sin(phase);

    // Mây hoàng kim trôi nhẹ qua trăng và giữa thẻ
    const cloud1X = 165 + Math.sin(phase) * 14;
    const cloud2X = 25 - Math.cos(phase) * 12;
    const cloud3X = 130 + Math.sin(phase + 1.5) * 10;

    // Ngôi sao lấp lánh rải rác
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));
    const s4 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 4.5));

    // Bụi phấn vàng / ánh sao ấm trôi bồng bềnh
    const goldP1X = 75 + Math.sin(phase * 2) * 10;
    const goldP1Y = 220 - Math.cos(phase * 2) * 12;
    const goldP2X = 245 + Math.cos(phase * 2) * 12;
    const goldP2Y = 325 + Math.sin(phase * 2) * 12;
    const goldP3X = 115 - Math.sin(phase * 2) * 8;
    const goldP3Y = 415 + Math.cos(phase * 2) * 10;

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Bục ánh trăng nơi xe đỗ (hắt sáng vàng kim nhạt dịu mắt) -->
          <radialGradient id="carStageLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.35"/>
            <stop offset="55%" stop-color="#fef3c7" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>

          <!-- Quầng hào quang tỏa sáng từ Vầng Trăng Rằm Hoàng Kim -->
          <radialGradient id="moonGlowLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fde047" stop-opacity="${moonAuraOpacity.toFixed(2)}"/>
            <stop offset="45%" stop-color="#fbbf24" stop-opacity="${(moonAuraOpacity * 0.45).toFixed(2)}"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </radialGradient>

          <!-- Bề mặt Vầng Trăng Rằm Hoàng Kim 3D sắc sảo -->
          <radialGradient id="moonSurfaceLight" cx="36%" cy="36%" r="64%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="25%" stop-color="#fef9c3"/>
            <stop offset="65%" stop-color="#facc15"/>
            <stop offset="90%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>

          <!-- Gradient màu mây hoàng kim thanh thoát -->
          <linearGradient id="cloudGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.90"/>
            <stop offset="45%" stop-color="#fef9c3" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#fef08a" stop-opacity="0.35"/>
          </linearGradient>

          <!-- Gradient đèn ông sao đỏ rực rỡ truyền thống -->
          <linearGradient id="lanternRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="50%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#b91c1c"/>
          </linearGradient>
          <linearGradient id="lanternGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>

        <!-- Thân nền toàn thẻ MÀU TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục xe ánh trăng dịu dàng nơi xe đậu (khoảng Y = 80..115) -->
        <ellipse cx="160" cy="108" rx="135" ry="24" fill="url(#carStageLight)"/>

        <!-- Bụi sao hoàng kim thanh lịch rải rác trên nền sáng -->
        <circle cx="45" cy="45" r="1.3" fill="#d97706" opacity="0.65"/>
        <circle cx="120" cy="22" r="1.5" fill="#f59e0b" opacity="0.75"/>
        <circle cx="285" cy="30" r="1.2" fill="#d97706" opacity="0.6"/>
        <circle cx="35" cy="165" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="290" cy="210" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="40" cy="360" r="1.2" fill="#f59e0b" opacity="0.55"/>
        <circle cx="275" cy="420" r="1.4" fill="#d97706" opacity="0.65"/>

        ${renderSparkle(135, 30, 3.8, s1)}
        ${renderSparkle(282, 55, 3.4, s2)}
        ${renderSparkle(50, 240, 3.0, s3)}
        ${renderSparkle(275, 340, 3.2, s4)}

        <!-- Quầng hào quang Vầng Trăng Rằm (góc trên phải) -->
        <circle cx="245" cy="48" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlowLight)"/>

        <!-- Vầng Trăng Rằm 3D Hoàng Kim Tỏa Sáng -->
        <circle cx="245" cy="48" r="28" fill="url(#moonSurfaceLight)"/>
        <!-- Vân bóng nguyệt chìm trên trăng -->
        <path d="M 238,40 Q 244,34 250,38 Q 255,46 248,54 Q 240,50 238,40 Z" fill="#b45309" opacity="0.18"/>
        <circle cx="256" cy="44" r="4.5" fill="#92400e" opacity="0.14"/>

        <!-- Các cụm vân mây hoàng kim cung đình bồng bềnh -->
        ${renderCloud(cloud1X, 46, 0.70, 0.75)}
        ${renderCloud(cloud2X, 22, 0.55, 0.65)}
        ${renderCloud(cloud3X, 420, 0.60, 0.55)}

        <!-- ĐÈN ÔNG SAO TRUYỀN THỐNG ĐU ĐƯA Ở GÓC TRÁI TRÊN CỦA THẺ -->
        <g transform="translate(32, 0)">
          <!-- Dây treo từ trần thẻ -->
          <line x1="0" y1="0" x2="0" y2="18" stroke="#d97706" stroke-width="1.3" opacity="0.9"/>
          <!-- Cụm đèn ông sao đu đưa -->
          <g transform="translate(0, 32) rotate(${starLanternSway.toFixed(2)})">
            <!-- Quầng sáng ấm áp -->
            <circle cx="0" cy="0" r="22" fill="#fef08a" opacity="0.5"/>

            <!-- Khung tre tròn bao quanh ngôi sao -->
            <circle cx="0" cy="0" r="14" fill="none" stroke="#f59e0b" stroke-width="1.2" opacity="0.95"/>

            <!-- Ngôi sao 5 cánh Trung Thu đỏ truyền thống -->
            <polygon points="0,-13 4,-4 13,-4 6,2 9,11 0,6 -9,11 -6,2 -13,-4 -4,-4"
                     fill="url(#lanternRed)" stroke="#fef08a" stroke-width="0.8"/>

            <!-- Vòng tròn tâm sao màu vàng ngọc -->
            <circle cx="0" cy="0" r="3.8" fill="url(#lanternGold)"/>
            <circle cx="0" cy="0" r="1.6" fill="#ffffff"/>

            <!-- Nan tre phụ nối từ tâm ra cánh sao -->
            <line x1="0" y1="0" x2="0" y2="-13" stroke="#fef08a" stroke-width="0.6" opacity="0.85"/>
            <line x1="0" y1="0" x2="13" y2="-4" stroke="#fef08a" stroke-width="0.6" opacity="0.85"/>
            <line x1="0" y1="0" x2="9" y2="11" stroke="#fef08a" stroke-width="0.6" opacity="0.85"/>
            <line x1="0" y1="0" x2="-9" y2="11" stroke="#fef08a" stroke-width="0.6" opacity="0.85"/>
            <line x1="0" y1="0" x2="-13" y2="-4" stroke="#fef08a" stroke-width="0.6" opacity="0.85"/>

            <!-- Dây tua rua đỏ đu đưa bên dưới đèn -->
            <line x1="0" y1="14" x2="${Math.sin(phase) * 1.5}" y2="28" stroke="#dc2626" stroke-width="1.4"/>
            <circle cx="${Math.sin(phase) * 1.5}" cy="28" r="1.6" fill="#f59e0b"/>
            <!-- Các sợi tua rua nhỏ -->
            <line x1="${Math.sin(phase) * 1.5}" y1="28" x2="${Math.sin(phase) * 2.0 - 1.5}" y2="34" stroke="#ef4444" stroke-width="0.9"/>
            <line x1="${Math.sin(phase) * 1.5}" y1="28" x2="${Math.sin(phase) * 2.0 + 1.5}" y2="34" stroke="#ef4444" stroke-width="0.9"/>
          </g>
        </g>

        <!-- Hạt bụi vàng lung linh bay lơ lửng -->
        <circle cx="${goldP1X.toFixed(1)}" cy="${goldP1Y.toFixed(1)}" r="1.6" fill="#f59e0b" opacity="0.75"/>
        <circle cx="${goldP2X.toFixed(1)}" cy="${goldP2Y.toFixed(1)}" r="1.8" fill="#d97706" opacity="0.65"/>
        <circle cx="${goldP3X.toFixed(1)}" cy="${goldP3Y.toFixed(1)}" r="1.5" fill="#eab308" opacity="0.70"/>
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

  console.log('Đang đóng gói file WebP động Light Stock Card (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_light_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_light_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động Light Stock Card: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
