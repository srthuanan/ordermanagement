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

// Vẽ nốt nhạc ánh sao bay bổng (Musical note)
function renderMusicNote(cx, cy, rotation, scale = 1.0, opacity = 0.8) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <ellipse cx="0" cy="0" rx="3.5" ry="2.5" fill="#f59e0b" transform="rotate(-20)"/>
      <line x1="2.5" y1="-1" x2="2.5" y2="-12" stroke="#f59e0b" stroke-width="1.2"/>
      <path d="M 2.5,-12 Q 6,-10 8,-14" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="1.5" cy="-0.5" r="1.0" fill="#ffffff"/>
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
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V9: CÂY ĐA CHÚ CUỘI THỔI SÁO & NỐT NHẠC ÁNH SAO ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Vầng trăng khuyết bồng bềnh êm ả cùng Chú Cuội
    const moonBobY = Math.sin(phase) * 3.0;

    // Cành cây đa vàng khẽ đung đưa theo gió thu
    const banyanSway = Math.sin(phase) * 3.5;

    // Các nốt nhạc ánh sao bay lượn từ cây sáo ra bầu trời
    const n1X = 220 - ((f / TOTAL_FRAMES) * 80);
    const n1Y = 38 + Math.sin(phase * 2) * 12;
    const n1Rot = phase * 25;

    const n2X = 220 - (((f + 8) % TOTAL_FRAMES) / TOTAL_FRAMES * 90);
    const n2Y = 52 - Math.cos(phase * 2) * 10;
    const n2Rot = -phase * 30;

    const n3X = 220 - (((f + 16) % TOTAL_FRAMES) / TOTAL_FRAMES * 100);
    const n3Y = 65 + Math.sin(phase * 2 + 1) * 14;
    const n3Rot = phase * 40;

    // Bục xe ánh sáng cỏ ngọc dịu êm
    const stageR = 135 + 6 * Math.sin(phase);

    // Ngôi sao lấp lánh
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient vầng trăng khuyết hoàng kim 3D -->
          <radialGradient id="crescentMoonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#fef08a"/>
            <stop offset="70%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>

          <!-- Gradient cành cây đa ngàn năm dát vàng -->
          <linearGradient id="banyanBranchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#78350f"/>
            <stop offset="50%" stop-color="#b45309"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>

          <!-- Gradient lá đa vàng óng -->
          <linearGradient id="banyanLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="60%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>

          <!-- Hào quang trăng khuyết -->
          <radialGradient id="crescentGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.45"/>
            <stop offset="50%" stop-color="#fde68a" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>

          <!-- Bục xe ánh sáng cỏ ngọc -->
          <radialGradient id="stageMeadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.45"/>
            <stop offset="55%" stop-color="#fef08a" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục xe ánh sáng nâng đỡ bánh xe -->
        <ellipse cx="160" cy="108" rx="${stageR.toFixed(1)}" ry="24" fill="url(#stageMeadow)"/>

        <!-- DẢI NỐT NHẠC TIẾNG SÁO TRÚC BAY LƯỢN -->
        <path d="M 230,${42 + moonBobY} Q 160,${25 + Math.sin(phase)*10} 100,${50 - Math.sin(phase)*8} T 40,${65 + Math.sin(phase)*10}" 
              fill="none" stroke="#fde047" stroke-width="1.2" stroke-dasharray="3,3" opacity="0.65"/>

        ${renderMusicNote(n1X, n1Y, n1Rot, 0.9, 0.85)}
        ${renderMusicNote(n2X, n2Y, n2Rot, 0.8, 0.75)}
        ${renderMusicNote(n3X, n3Y, n3Rot, 1.0, 0.80)}

        <!-- Bụi sao lấp lánh -->
        <circle cx="45" cy="220" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="280" cy="260" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="50" cy="370" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="275" cy="410" r="1.3" fill="#d97706" opacity="0.55"/>

        ${renderSparkle(160, 22, 3.8, s1)}
        ${renderSparkle(285, 95, 3.4, s2)}
        ${renderSparkle(35, 175, 3.0, s3)}

        <!-- ================= CÂY ĐA CỔ THỤ HOÀNG KIM (Góc Trên Trái cx=0, cy=0) ================= -->
        <g transform="translate(0, 0)">
          <!-- Thân cây đa cổ thụ uốn cong từ góc trên trái xuống -->
          <path d="M -8,-8 Q 30,12 55,2 Q 75,-4 85,-10" fill="none" stroke="url(#banyanBranchGrad)" stroke-width="6.5" stroke-linecap="round"/>
          <!-- Nhánh phụ rủ xuống -->
          <path d="M 35,8 Q 45,26 40,42" fill="none" stroke="url(#banyanBranchGrad)" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M 55,2 Q 68,18 64,32" fill="none" stroke="url(#banyanBranchGrad)" stroke-width="2.0" stroke-linecap="round"/>
          <!-- Rễ phụ cây đa buông rủ thanh mảnh -->
          <line x1="38" y1="20" x2="36" y2="48" stroke="#d97706" stroke-width="0.9" opacity="0.8"/>
          <line x1="44" y1="24" x2="43" y2="52" stroke="#d97706" stroke-width="0.8" opacity="0.75"/>

          <!-- Vòm lá cây đa vàng xum xuê đung đưa -->
          <g transform="translate(48, 16) rotate(${banyanSway.toFixed(2)})">
            <ellipse cx="0" cy="0" rx="14" ry="7" fill="url(#banyanLeafGrad)" opacity="0.9"/>
            <ellipse cx="-12" cy="6" rx="10" ry="5" fill="url(#banyanLeafGrad)" opacity="0.85"/>
            <ellipse cx="12" cy="4" rx="11" ry="5" fill="url(#banyanLeafGrad)" opacity="0.85"/>
            <circle cx="2" cy="-4" r="5" fill="#fef08a" opacity="0.9"/>
          </g>
        </g>

        <!-- ================= CHÚ CUỘI NGỒI THỔI SÁO TRÊN VẦNG TRĂNG KHUYẾT (Góc Trên Phải cx=255, cy=40) ================= -->
        <g transform="translate(255, ${40 + moonBobY})">
          <!-- Hào quang vầng trăng khuyết -->
          <circle cx="0" cy="0" r="32" fill="url(#crescentGlow)"/>

          <!-- VẦNG TRĂNG KHUYẾT HOÀNG KIM 3D HÌNH LƯỠI LIỀM -->
          <path d="M 12,-24 C 28,-12 28,12 12,24 C 20,16 22,-8 6,-18 C 8,-20 10,-22 12,-24 Z" 
                fill="url(#crescentMoonGrad)" stroke="#b45309" stroke-width="0.8"/>

          <!-- CHÚ CUỘI NGỒI DUYÊN DÁNG TRÊN LƯNG TRĂNG THỔI SÁO -->
          <g transform="translate(-4, -2)">
            <!-- Búi tóc củ tỏi & đầu Chú Cuội -->
            <circle cx="2" cy="-14.5" r="2.2" fill="#78350f"/>
            <circle cx="0" cy="-10" r="4.2" fill="#fef08a" stroke="#b45309" stroke-width="0.6"/>

            <!-- Khăn quấn đầu màu đỏ -->
            <path d="M -3.5,-12 Q 0,-14 3.5,-12" fill="none" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>

            <!-- Thân áo nâu Chú Cuội ngồi tựa -->
            <ellipse cx="2" cy="-2" rx="4.5" ry="6.0" fill="#92400e"/>

            <!-- Cây sáo trúc nằm ngang Chú Cuội đang thổi -->
            <line x1="-12" y1="-8" x2="6" y2="-6" stroke="#b45309" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="-12" cy="-8" r="0.8" fill="#fef08a"/>
            <!-- Các lỗ sáo trúc -->
            <circle cx="-8" cy="-7.5" r="0.5" fill="#1e293b"/>
            <circle cx="-5" cy="-7" r="0.5" fill="#1e293b"/>
            <circle cx="-2" cy="-6.5" r="0.5" fill="#1e293b"/>

            <!-- Dây tua rua đỏ treo đuôi cây sáo trúc -->
            <line x1="-11" y1="-7" x2="-13" y2="-2" stroke="#dc2626" stroke-width="0.9"/>
            <circle cx="-13" cy="-2" r="1.0" fill="#f59e0b"/>

            <!-- Chân Chú Cuội buông thõng trên trăng -->
            <path d="M 0,2 Q -2,9 2,12" fill="none" stroke="#92400e" stroke-width="2.2" stroke-linecap="round"/>
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

  console.log('Đang đóng gói file WebP động V9: CHÚ CUỘI THỔI SÁO & CÂY ĐA (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v9_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v9_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V9: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
