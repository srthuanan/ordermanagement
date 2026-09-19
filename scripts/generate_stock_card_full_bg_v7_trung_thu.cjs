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

// Vẽ Lá Thu Hoàng Kim (Autumn Gold Leaf) chao liệng
function renderAutumnLeaf(cx, cy, rotation, scale = 1.0, opacity = 0.8) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,-10 C 6,-6 10,0 6,8 C 2,12 -2,12 -6,8 C -10,0 -6,-6 0,-10 Z" fill="url(#leafAutumnGrad)"/>
      <path d="M 0,-9 L 0,11" stroke="#b45309" stroke-width="0.6"/>
      <path d="M 0,-4 L 3,-2" stroke="#b45309" stroke-width="0.5"/>
      <path d="M 0,-1 L -3,1" stroke="#b45309" stroke-width="0.5"/>
      <path d="M 0,3 L 3,5" stroke="#b45309" stroke-width="0.5"/>
    </g>
  `;
}

// Vẽ Bánh Trung Thu Nướng 3D Hoàng Kim Tinh Xảo
function renderMooncake(cx, cy, rotation, scale = 1.0) {
  const petals = 12;
  const petalNodes = [];
  for (let i = 0; i < petals; i++) {
    const angle = (i * 360 / petals) * Math.PI / 180;
    const px = Math.cos(angle) * 22;
    const py = Math.sin(angle) * 22;
    petalNodes.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.2" fill="url(#mooncakeBrownGrad)" stroke="#92400e" stroke-width="0.5"/>`);
  }

  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})">
      <!-- Hào quang bánh nướng thơm ngon -->
      <circle cx="0" cy="0" r="32" fill="#fef08a" opacity="0.45"/>

      <!-- Các múi viền hoa văn bánh nướng xung quanh -->
      ${petalNodes.join('')}

      <!-- Thân tròn bánh nướng màu nâu vàng mật ong -->
      <circle cx="0" cy="0" r="22" fill="url(#mooncakeBrownGrad)" stroke="#78350f" stroke-width="0.9"/>

      <!-- Vòng tròn hoa văn dập nổi bên trong -->
      <circle cx="0" cy="0" r="16.5" fill="none" stroke="#fef08a" stroke-width="1.2" opacity="0.9"/>
      <circle cx="0" cy="0" r="14.5" fill="none" stroke="#92400e" stroke-width="0.6"/>

      <!-- Hoa văn cánh sen / hoa cúc dập nổi trung tâm -->
      <path d="M 0,-12 C 4,-7 4,-2 0,0 C -4,-2 -4,-7 0,-12 Z" fill="#fef08a" stroke="#78350f" stroke-width="0.5"/>
      <path d="M 0,12 C 4,7 4,2 0,0 C -4,2 -4,7 0,12 Z" fill="#fef08a" stroke="#78350f" stroke-width="0.5"/>
      <path d="M -12,0 C -7,4 -2,4 0,0 C -2,-4 -7,-4 -12,0 Z" fill="#fef08a" stroke="#78350f" stroke-width="0.5"/>
      <path d="M 12,0 C 7,4 2,4 0,0 C 2,-4 7,-4 12,0 Z" fill="#fef08a" stroke="#78350f" stroke-width="0.5"/>

      <!-- Tâm bánh nướng hạt sen -->
      <circle cx="0" cy="0" r="3.8" fill="#f59e0b" stroke="#78350f" stroke-width="0.6"/>
      <circle cx="0" cy="0" r="1.5" fill="#fef08a"/>
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
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V7: BÁNH NƯỚNG HOÀNG KIM & LÁ THU RƠI ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chiếc bánh nướng hoàng kim xoay nhẹ nhàng đung đưa ở góc trên phải
    const cakeSway = Math.sin(phase) * 6.0;
    const cakeBobY = Math.sin(phase) * 2.5;

    // Tách trà sen bốc khói mờ ảo ở góc trên trái
    const steamY1 = -18 - (f / TOTAL_FRAMES) * 16;
    const steamX1 = Math.sin(phase * 2) * 3;

    // Lá thu rơi chao liệng từ trên xuống
    const leaf1Y = ((f / TOTAL_FRAMES) * 120) + 80;
    const leaf1X = 65 + Math.sin(phase) * 18;
    const leaf1Rot = Math.sin(phase) * 35;

    const leaf2Y = (((f + 8) % TOTAL_FRAMES) / TOTAL_FRAMES * 140) + 160;
    const leaf2X = 275 - Math.cos(phase) * 14;
    const leaf2Rot = -Math.sin(phase + 1) * 40;

    const leaf3Y = (((f + 16) % TOTAL_FRAMES) / TOTAL_FRAMES * 130) + 290;
    const leaf3X = 140 + Math.sin(phase + 2) * 16;
    const leaf3Rot = Math.cos(phase) * 30;

    // Bục xe ánh sáng mật ong ấm áp
    const stageR = 135 + 6 * Math.sin(phase);

    // Ngôi sao lấp lánh
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient bánh nướng vàng nâu mật ong nướng giòn thơm ngon -->
          <radialGradient id="mooncakeBrownGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="30%" stop-color="#f59e0b"/>
            <stop offset="70%" stop-color="#d97706"/>
            <stop offset="92%" stop-color="#b45309"/>
            <stop offset="100%" stop-color="#78350f"/>
          </radialGradient>

          <!-- Gradient lá thu vàng cam óng ánh -->
          <linearGradient id="leafAutumnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="40%" stop-color="#f59e0b"/>
            <stop offset="80%" stop-color="#ea580c"/>
            <stop offset="100%" stop-color="#dc2626"/>
          </linearGradient>

          <!-- Gradient chén trà gốm sứ ngọc bích -->
          <linearGradient id="ceramicTeacup" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#0f766e"/>
            <stop offset="50%" stop-color="#14b8a6"/>
            <stop offset="100%" stop-color="#0d9488"/>
          </linearGradient>

          <!-- Bục xe ánh mật ong dịu êm -->
          <radialGradient id="stageHoneyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.45"/>
            <stop offset="60%" stop-color="#fde68a" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục xe ánh sáng mật ong nâng đỡ bánh xe -->
        <ellipse cx="160" cy="108" rx="${stageR.toFixed(1)}" ry="24" fill="url(#stageHoneyGlow)"/>

        <!-- Bụi sao lấp lánh rải rác -->
        <circle cx="45" cy="220" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="280" cy="250" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="50" cy="370" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="275" cy="410" r="1.3" fill="#d97706" opacity="0.55"/>

        ${renderSparkle(160, 25, 3.8, s1)}
        ${renderSparkle(285, 95, 3.4, s2)}
        ${renderSparkle(35, 175, 3.0, s3)}

        <!-- CÁC CHIẾC LÁ THU VÀNG CHAO LIỆNG TỰ NHIÊN -->
        ${renderAutumnLeaf(leaf1X, leaf1Y, leaf1Rot, 0.95, 0.85)}
        ${renderAutumnLeaf(leaf2X, leaf2Y, leaf2Rot, 0.85, 0.75)}
        ${renderAutumnLeaf(leaf3X, leaf3Y, leaf3Rot, 1.0, 0.80)}

        <!-- ================= BÁNH TRUNG THU HOÀNG KIM 3D (Góc Trên Phải cx=265, cy=38) ================= -->
        ${renderMooncake(265, 38 + cakeBobY, cakeSway, 0.95)}

        <!-- ================= CHÉN TRÀ SEN BỐC KHÓI MỜ ẢO (Góc Trên Trái cx=44, cy=40) ================= -->
        <g transform="translate(44, 40)">
          <!-- Hào quang chén trà ấm -->
          <circle cx="0" cy="0" r="20" fill="#ccfbf1" opacity="0.5"/>

          <!-- Đĩa lót chén trà gốm ngọc -->
          <ellipse cx="0" cy="10" rx="15" ry="4" fill="#0f766e" stroke="#134e4a" stroke-width="0.8"/>
          <ellipse cx="0" cy="9" rx="12" ry="2.8" fill="#14b8a6"/>

          <!-- Thân chén trà bằng gốm sứ ngọc bích -->
          <path d="M -11,8 C -13,0 -11,-4 -9,-6 L 9,-6 C 11,-4 13,0 11,8 Z" 
                fill="url(#ceramicTeacup)" stroke="#0f766e" stroke-width="0.8"/>

          <!-- Mặt nước trà sen hoàng kim bên trong chén -->
          <ellipse cx="0" cy="-6" rx="9" ry="3" fill="#fef08a" stroke="#d97706" stroke-width="0.6"/>
          <circle cx="-2" cy="-6" r="1.5" fill="#f59e0b" opacity="0.8"/>

          <!-- Làn khói trà sen bốc lên mềm mại mờ ảo -->
          <path d="M ${steamX1.toFixed(1)},-8 Q ${-steamX1.toFixed(1)},-16 ${steamX1.toFixed(1)},${steamY1.toFixed(1)}" 
                fill="none" stroke="#99f6e4" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/>
          <path d="M ${(steamX1 + 2).toFixed(1)},-8 Q ${(-steamX1 + 2).toFixed(1)},-18 ${(steamX1 + 2).toFixed(1)},${(steamY1 - 4).toFixed(1)}" 
                fill="none" stroke="#ffffff" stroke-width="1.0" stroke-linecap="round" opacity="0.6"/>
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

  console.log('Đang đóng gói file WebP động V7: BÁNH NƯỚNG HOÀNG KIM & LÁ THU (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v7_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v7_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V7: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
