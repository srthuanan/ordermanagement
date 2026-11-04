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

// Vẽ đồng tiền vàng may mắn rước lộc xoay nhẹ
function renderGoldCoin(cx, cy, rotation, scale = 1.0, opacity = 0.85) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <circle cx="0" cy="0" r="7" fill="url(#coinGoldGrad)" stroke="#b45309" stroke-width="0.8"/>
      <rect x="-2.2" y="-2.2" width="4.4" height="4.4" fill="#ffffff" stroke="#b45309" stroke-width="0.6"/>
      <circle cx="0" cy="0" r="5.2" fill="none" stroke="#fef08a" stroke-width="0.4" stroke-dasharray="1.5,1.5"/>
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
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V4: LÂN SƯ RỒNG RƯỚC LỘC & TRỐNG HỘI ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Đầu Lân nhấp nhô vui tươi & lắc lư đầu
    const lionBobY = Math.sin(phase) * 2.5;
    const lionTilt = Math.sin(phase) * 4.0;
    // Mắt lân chớp nhẹ ở giữa chu kỳ
    const eyeScaleY = (f >= 10 && f <= 13) ? 0.2 : 1.0;

    // Trống hội rung nhịp thở
    const drumScale = 1.0 + 0.04 * Math.sin(phase * 2);

    // Đồng xu may mắn rước lộc rơi xoay tròn từ trên xuống
    const coin1X = 55 + Math.sin(phase) * 12;
    const coin1Y = ((f / TOTAL_FRAMES) * 90) + 90;
    const coin1Rot = phase * 40;

    const coin2X = 265 - Math.cos(phase) * 10;
    const coin2Y = (((f + 10) % TOTAL_FRAMES) / TOTAL_FRAMES * 110) + 180;
    const coin2Rot = -phase * 50;

    const coin3X = 135 + Math.sin(phase + 1.2) * 14;
    const coin3Y = (((f + 18) % TOTAL_FRAMES) / TOTAL_FRAMES * 120) + 310;
    const coin3Rot = phase * 35;

    // Dải lụa đỏ may mắn uốn lượn (wave phase)
    const ribbonOffset = Math.sin(phase) * 6;

    // Ngôi sao lấp lánh rải rác
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gradient đỏ rực may mắn cho đầu Lân & Trống hội -->
          <linearGradient id="luckyRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ef4444"/>
            <stop offset="60%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>

          <!-- Gradient vàng kim hoàng gia cho sừng Lân & Đồng xu -->
          <linearGradient id="coinGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="30%" stop-color="#fef08a"/>
            <stop offset="70%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>

          <!-- Gradient dải lụa đỏ may mắn -->
          <linearGradient id="silkRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.75"/>
            <stop offset="50%" stop-color="#fca5a5" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#dc2626" stop-opacity="0.70"/>
          </linearGradient>

          <!-- Hào quang bục xe hoàng kim -->
          <radialGradient id="stageGoldLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.40"/>
            <stop offset="60%" stop-color="#fde68a" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục xe ánh sáng vàng may mắn -->
        <ellipse cx="160" cy="108" rx="135" ry="24" fill="url(#stageGoldLight)"/>

        <!-- Bụi sao lấp lánh rải rác -->
        <circle cx="45" cy="170" r="1.3" fill="#f59e0b" opacity="0.6"/>
        <circle cx="280" cy="220" r="1.4" fill="#d97706" opacity="0.6"/>
        <circle cx="50" cy="340" r="1.2" fill="#f59e0b" opacity="0.5"/>
        <circle cx="275" cy="390" r="1.3" fill="#d97706" opacity="0.55"/>

        ${renderSparkle(160, 22, 3.8, s1)}
        ${renderSparkle(285, 90, 3.4, s2)}
        ${renderSparkle(35, 230, 3.0, s3)}

        <!-- DẢI LỤA ĐỎ MAY MẮN UỐN LƯỢN MỀM MẠI QUANH XE -->
        <path d="M 20,48 Q 90,${85 + ribbonOffset} 160,${78 - ribbonOffset} T 300,${65 + ribbonOffset}" 
              fill="none" stroke="url(#silkRibbonGrad)" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M 20,48 Q 90,${85 + ribbonOffset} 160,${78 - ribbonOffset} T 300,${65 + ribbonOffset}" 
              fill="none" stroke="#fef08a" stroke-width="0.8" opacity="0.8"/>

        <!-- ĐỒNG XU VÀNG MAY MẮN RƯỚC LỘC RƠI TỰ NHIÊN -->
        ${renderGoldCoin(coin1X, coin1Y, coin1Rot, 0.9, 0.85)}
        ${renderGoldCoin(coin2X, coin2Y, coin2Rot, 0.8, 0.75)}
        ${renderGoldCoin(coin3X, coin3Y, coin3Rot, 1.0, 0.80)}

        <!-- ================= ĐẦU LÂN SƯ RỒNG MINI 3D MAY MẮN (Góc Trên Trái cx=46, cy=38) ================= -->
        <g transform="translate(46, ${38 + lionBobY}) rotate(${lionTilt.toFixed(2)})">
          <!-- Hào quang đỏ vàng quanh đầu Lân -->
          <circle cx="0" cy="0" r="28" fill="#fef08a" opacity="0.4"/>

          <!-- Đuôi/bờm Lân uốn lượn sau đầu -->
          <path d="M -14,-8 Q -24,4 -16,16 Q -6,22 4,18" fill="none" stroke="#dc2626" stroke-width="4.5" stroke-linecap="round"/>
          <path d="M -12,-6 Q -20,6 -14,14" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>

          <!-- Sọ đầu Lân chính màu đỏ rực -->
          <ellipse cx="0" cy="0" rx="16" ry="14" fill="url(#luckyRed)" stroke="#b91c1c" stroke-width="0.8"/>

          <!-- Trán Lân dát gương bát quái / gương ngọc tròn -->
          <circle cx="0" cy="-6" r="4.2" fill="url(#coinGoldGrad)" stroke="#b45309" stroke-width="0.8"/>
          <circle cx="0" cy="-6" r="2.0" fill="#ffffff"/>

          <!-- Sừng Lân hoàng kim vươn cao -->
          <path d="M -2.5,-10 Q 0,-19 2.5,-10 Z" fill="url(#coinGoldGrad)" stroke="#b45309" stroke-width="0.7"/>
          <circle cx="0" cy="-19" r="1.8" fill="#ef4444"/>

          <!-- Đôi mắt Lân to tròn lanh lợi (có hiệu ứng chớp mắt) -->
          <g transform="translate(-6.5, -1) scale(1, ${eyeScaleY})">
            <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="#d97706" stroke-width="0.8"/>
            <circle cx="0.5" cy="0" r="2.6" fill="#1e293b"/>
            <circle cx="1.2" cy="-0.8" r="1.0" fill="#ffffff"/>
            <!-- Lông mày vàng cong uy phong -->
            <path d="M -4,-3 Q -1,-6 3,-4" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
          </g>

          <g transform="translate(6.5, -1) scale(1, ${eyeScaleY})">
            <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke="#d97706" stroke-width="0.8"/>
            <circle cx="0.5" cy="0" r="2.6" fill="#1e293b"/>
            <circle cx="1.2" cy="-0.8" r="1.0" fill="#ffffff"/>
            <!-- Lông mày vàng cong uy phong -->
            <path d="M -3,-4 Q 1,-6 4,-3" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-linecap="round"/>
          </g>

          <!-- Mũi Lân đỏ tròn ngộ nghĩnh -->
          <ellipse cx="0" cy="4" rx="4.2" ry="3.0" fill="#ef4444" stroke="#b91c1c" stroke-width="0.6"/>
          <circle cx="-1.2" cy="3.5" r="0.8" fill="#ffffff" opacity="0.8"/>

          <!-- Miệng Lân cười rạng rỡ & Hàm râu trắng ngọc -->
          <path d="M -9,8 Q 0,14 9,8" fill="none" stroke="#fef08a" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M -11,10 Q -6,17 0,16 Q 6,17 11,10" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" opacity="0.95"/>
        </g>

        <!-- ================= TRỐNG HỘI TRUNG THU (Góc Trên Phải cx=265, cy=38) ================= -->
        <g transform="translate(265, 38) scale(${drumScale.toFixed(3)})">
          <!-- Hào quang trống hội -->
          <circle cx="0" cy="0" r="24" fill="#fef08a" opacity="0.4"/>

          <!-- Thân trống đỏ cong tròn -->
          <ellipse cx="0" cy="2" rx="15" ry="12" fill="url(#luckyRed)" stroke="#991b1b" stroke-width="0.8"/>

          <!-- Vành đai trống màu vàng kim đính đinh tán -->
          <ellipse cx="0" cy="2" rx="15" ry="4" fill="none" stroke="url(#coinGoldGrad)" stroke-width="2.2"/>
          <circle cx="-10" cy="2" r="0.9" fill="#ffffff"/>
          <circle cx="-5" cy="3.2" r="0.9" fill="#ffffff"/>
          <circle cx="0" cy="3.8" r="0.9" fill="#ffffff"/>
          <circle cx="5" cy="3.2" r="0.9" fill="#ffffff"/>
          <circle cx="10" cy="2" r="0.9" fill="#ffffff"/>

          <!-- Mặt trống bằng da màu ngà -->
          <ellipse cx="0" cy="-4" rx="14" ry="6" fill="#fef9c3" stroke="#d97706" stroke-width="0.9"/>
          <!-- Vòng hoa văn tâm trống -->
          <circle cx="0" cy="-4" r="2.8" fill="#f59e0b" opacity="0.8"/>
          <circle cx="0" cy="-4" r="1.2" fill="#dc2626"/>

          <!-- Hai chiếc dùi trống bắt chéo -->
          <line x1="-12" y1="-12" x2="6" y2="4" stroke="#d97706" stroke-width="1.4" stroke-linecap="round"/>
          <circle cx="-12" cy="-12" r="2.2" fill="#ef4444"/>

          <line x1="12" y1="-12" x2="-6" y2="4" stroke="#d97706" stroke-width="1.4" stroke-linecap="round"/>
          <circle cx="12" cy="-12" r="2.2" fill="#ef4444"/>
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

  console.log('Đang đóng gói file WebP động V4 (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v4_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v4_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V4: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
