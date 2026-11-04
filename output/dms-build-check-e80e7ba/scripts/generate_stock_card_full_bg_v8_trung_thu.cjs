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

// Vẽ Đèn Kéo Quân Hoàng Gia 3D với đoàn bóng ngựa quay tròn bên trong
function renderRevolvingLantern(cx, cy, rotationProgress, swayAngle, phase) {
  // Chu kỳ quay của đoàn ngựa/người bên trong lồng kính
  const rot1 = (rotationProgress * 360) % 360;
  const rot2 = (rotationProgress * 360 + 120) % 360;
  const rot3 = (rotationProgress * 360 + 240) % 360;

  // Tính tọa độ X và độ mờ của bóng chiếu khi đi qua mặt kính phẳng trước
  function getShadowFigure(rotDeg) {
    const rad = rotDeg * Math.PI / 180;
    const x = Math.sin(rad) * 12; // Tọa độ X chiếu trên lồng
    const z = Math.cos(rad); // Chiều sâu (z > 0 là mặt trước nhìn thấy)
    const isVisible = z > -0.2;
    const opacity = isVisible ? (z * 0.5 + 0.45) : 0;
    return { x, opacity, isVisible };
  }

  const fig1 = getShadowFigure(rot1);
  const fig2 = getShadowFigure(rot2);
  const fig3 = getShadowFigure(rot3);

  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${swayAngle.toFixed(2)})">
      <!-- Quầng hào quang ấm áp tỏa ra từ đèn kéo quân -->
      <circle cx="0" cy="4" r="28" fill="#fef08a" opacity="0.45"/>

      <!-- Dây treo từ trần thẻ -->
      <line x1="0" y1="-32" x2="0" y2="-18" stroke="#d97706" stroke-width="1.2" opacity="0.9"/>

      <!-- Chóp ngọc đỉnh mái đèn -->
      <circle cx="0" cy="-18" r="2.5" fill="#f59e0b" stroke="#b45309" stroke-width="0.6"/>

      <!-- MÁI ĐÈN LỤC GIÁC CUNG ĐÌNH CỔ KÍNH (Mái ngói cong 6 góc vuốt nhọn) -->
      <path d="M 0,-18 L -18,-11 L -15,-9 L 0,-11 L 15,-9 L 18,-11 Z" fill="url(#roofGoldGrad)" stroke="#b45309" stroke-width="0.7"/>
      <!-- Chuông gió mini treo ở 2 đầu mái -->
      <circle cx="-17" cy="-9" r="1.0" fill="#dc2626"/>
      <circle cx="17" cy="-9" r="1.0" fill="#dc2626"/>

      <!-- THÂN ĐÈN LỤC GIÁC (3 mặt kính giấy dó phát quang nhìn thấy) -->
      <!-- Mặt kính sáng bên trong -->
      <rect x="-14" y="-9" width="28" height="24" fill="url(#lanternGlassGrad)" stroke="#d97706" stroke-width="0.8"/>

      <!-- CÁC BÓNG HÌNH ĐOÀN NGỰA / KỴ MÃ QUAY TRÒN BÊN TRONG (Revolving Shadows) -->
      ${fig1.isVisible ? `
        <g transform="translate(${fig1.x.toFixed(1)}, 3)" opacity="${fig1.opacity.toFixed(2)}">
          <!-- Bóng chú ngựa phi nước kiệu -->
          <ellipse cx="0" cy="0" rx="3.5" ry="2.2" fill="#78350f"/>
          <circle cx="3" cy="-2" r="1.5" fill="#78350f"/>
          <!-- Chân trước & chân sau phi -->
          <line x1="-2" y1="1" x2="-4" y2="4" stroke="#78350f" stroke-width="0.8"/>
          <line x1="2" y1="1" x2="4" y2="4" stroke="#78350f" stroke-width="0.8"/>
        </g>
      ` : ''}

      ${fig2.isVisible ? `
        <g transform="translate(${fig2.x.toFixed(1)}, 3)" opacity="${fig2.opacity.toFixed(2)}">
          <!-- Bóng em bé rước đèn ngôi sao -->
          <circle cx="0" cy="-2.5" r="1.6" fill="#78350f"/>
          <path d="M -1.2,-1 L 1.2,-1 L 1.8,3 L -1.8,3 Z" fill="#78350f"/>
          <line x1="1" y1="0" x2="4" y2="-3" stroke="#78350f" stroke-width="0.6"/>
          <polygon points="4,-4 5,-3 4,-2 3,-3" fill="#b45309"/>
        </g>
      ` : ''}

      ${fig3.isVisible ? `
        <g transform="translate(${fig3.x.toFixed(1)}, 3)" opacity="${fig3.opacity.toFixed(2)}">
          <!-- Bóng kỵ mã thứ hai -->
          <ellipse cx="0" cy="0" rx="3.5" ry="2.2" fill="#78350f"/>
          <circle cx="3" cy="-2" r="1.5" fill="#78350f"/>
          <line x1="-2" y1="1" x2="-4" y2="4" stroke="#78350f" stroke-width="0.8"/>
          <line x1="2" y1="1" x2="4" y2="4" stroke="#78350f" stroke-width="0.8"/>
        </g>
      ` : ''}

      <!-- Khung nẹp tre / gỗ chia các ô lục giác của đèn -->
      <line x1="-5" y1="-9" x2="-5" y2="15" stroke="#92400e" stroke-width="0.9"/>
      <line x1="5" y1="-9" x2="5" y2="15" stroke="#92400e" stroke-width="0.9"/>

      <!-- ĐÁY ĐÈN KÉO QUÂN HOÀNG GIA (Đài sen lật úp) -->
      <path d="M -16,15 L -13,18 L 13,18 L 16,15 Z" fill="url(#roofGoldGrad)" stroke="#b45309" stroke-width="0.7"/>

      <!-- Dây tua rua đỏ đu đưa dưới đáy đèn -->
      <line x1="0" y1="18" x2="${Math.sin(phase) * 1.5}" y2="30" stroke="#dc2626" stroke-width="1.4"/>
      <circle cx="${Math.sin(phase) * 1.5}" cy="30" r="1.6" fill="#f59e0b"/>
      <!-- Sợi tua rua lụa đỏ mềm -->
      <line x1="${Math.sin(phase) * 1.5}" y1="30" x2="${Math.sin(phase) * 2.0 - 1.6}" y2="38" stroke="#ef4444" stroke-width="0.9"/>
      <line x1="${Math.sin(phase) * 1.5}" y1="30" x2="${Math.sin(phase) * 2.0 + 1.6}" y2="38" stroke="#ef4444" stroke-width="0.9"/>
      <line x1="${Math.sin(phase) * 1.5}" y1="30" x2="${Math.sin(phase) * 2.0}" y2="40" stroke="#dc2626" stroke-width="0.9"/>
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
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V8: ĐÈN KÉO QUÂN HOÀNG GIA 3D CHIẾU BÓNG ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Con lắc đu đưa nhẹ của đèn kéo quân
    const lanternSway = Math.sin(phase) * 3.2;

    // Bục xe ánh sáng vàng cung đình
    const stageR = 135 + 6 * Math.sin(phase);

    // Mây gấm cung đình lượn sóng ngang đỉnh thẻ
    const cloudWaveX = Math.sin(phase) * 12;

    // Ngôi sao lấp lánh
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient mái đèn và đài sen thếp vàng hoàng gia -->
          <linearGradient id="roofGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="40%" stop-color="#fbbf24"/>
            <stop offset="80%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#92400e"/>
          </linearGradient>

          <!-- Gradient lụa chiếu sáng bên trong đèn kéo quân -->
          <linearGradient id="lanternGlassGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#fef9c3"/>
            <stop offset="50%" stop-color="#fde047"/>
            <stop offset="100%" stop-color="#fef08a"/>
          </linearGradient>

          <!-- Gradient diềm gấm cung đình đỏ may mắn -->
          <linearGradient id="brocadeRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#991b1b"/>
            <stop offset="30%" stop-color="#dc2626"/>
            <stop offset="50%" stop-color="#ef4444"/>
            <stop offset="70%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>

          <!-- Bục xe ánh sáng ấm -->
          <radialGradient id="stageWarmPalace" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.45"/>
            <stop offset="55%" stop-color="#fde68a" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục xe ánh sáng cung đình nâng đỡ bánh xe -->
        <ellipse cx="160" cy="108" rx="${stageR.toFixed(1)}" ry="24" fill="url(#stageWarmPalace)"/>

        <!-- Bụi sao lấp lánh rải rác -->
        <circle cx="45" cy="220" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="280" cy="260" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="50" cy="370" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="275" cy="410" r="1.3" fill="#d97706" opacity="0.55"/>

        ${renderSparkle(160, 26, 3.8, s1)}
        ${renderSparkle(285, 45, 3.4, s2)}
        ${renderSparkle(35, 175, 3.0, s3)}

        <!-- DIỀM GẤM CUNG ĐÌNH UỐN LƯỢN Ở ĐỈNH THẺ (Imperial Brocade Valance) -->
        <path d="M 0,0 L 0,8 Q 40,${14 + Math.sin(phase)*2} 80,8 T 160,${14 - Math.sin(phase)*2} T 240,8 T 320,${12 + Math.sin(phase)*2} L 320,0 Z" 
              fill="url(#brocadeRed)" opacity="0.85"/>
        <path d="M 0,8 Q 40,${14 + Math.sin(phase)*2} 80,8 T 160,${14 - Math.sin(phase)*2} T 240,8 T 320,${12 + Math.sin(phase)*2}" 
              fill="none" stroke="#fef08a" stroke-width="1.0" opacity="0.9"/>

        <!-- ================= ĐÈN KÉO QUÂN HOÀNG GIA 3D CHIẾU BÓNG (Góc Trên Trái cx=48, cy=38) ================= -->
        ${renderRevolvingLantern(48, 38, t, lanternSway, phase)}

        <!-- ================= VẦNG TRĂNG VÀNG HOÀNG CUNG Ở GÓC TRÊN PHẢI (cx=265, cy=36) ================= -->
        <g transform="translate(265, 36)">
          <!-- Quầng hào quang trăng vàng dịu -->
          <circle cx="0" cy="0" r="26" fill="#fef08a" opacity="0.45"/>
          <!-- Vầng trăng ngọc cung đình -->
          <circle cx="0" cy="0" r="18" fill="url(#roofGoldGrad)"/>
          <!-- Vân mây lượn ngang trăng -->
          <path d="M -22,4 Q -8,10 6,4 Q 16,-2 24,6" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.85"/>
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

  console.log('Đang đóng gói file WebP động V8: ĐÈN KÉO QUÂN HOÀNG GIA (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v8_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v8_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V8: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
