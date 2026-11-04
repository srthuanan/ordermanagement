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

// Vẽ cánh hoa sen / cánh hoa đào vàng bay lơ lửng
function renderPetal(cx, cy, rotation, scale = 1.0, opacity = 0.6) {
  return `
    <g transform="translate(${cx.toFixed(1)}, ${cy.toFixed(1)}) rotate(${rotation.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,-8 C 4,-6 7,-1 5,5 C 3,8 -3,8 -5,5 C -7,-1 -4,-6 0,-8 Z" fill="url(#petalGrad)" />
      <path d="M 0,-6 L 0,4" stroke="#f59e0b" stroke-width="0.5" opacity="0.5"/>
    </g>
  `;
}

// Vẽ ngôi sao hoàng kim 4 cánh lấp lánh sắc nét
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
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU V2: THỎ NGỌC & ĐÈN LỒNG HỘI AN (WHITE THEME) ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Đèn lồng quả trám Hội An đung đưa nhẹ nhàng ở góc trái trên
    const lanternSway = Math.sin(phase) * 3.5;

    // Quầng sáng Vầng Trăng Rằm hoàng kim ấm áp
    const moonAuraR = 54 + 6 * Math.sin(phase);
    const moonAuraOpacity = 0.65 + 0.20 * Math.sin(phase);

    // Thỏ Ngọc nhấp nhô tai & thở nhẹ nhàng
    const bunnyBounceY = Math.sin(phase) * 1.5;

    // Cánh hoa sen / hoa đào vàng bay lượn từ trên xuống
    const p1X = 60 + Math.sin(phase) * 15;
    const p1Y = (f / TOTAL_FRAMES) * 80 + 100;
    const p1Rot = phase * 30;

    const p2X = 270 - Math.cos(phase) * 12;
    const p2Y = ((f + 8) % TOTAL_FRAMES / TOTAL_FRAMES) * 120 + 200;
    const p2Rot = phase * 45;

    const p3X = 140 + Math.sin(phase + 1) * 18;
    const p3Y = ((f + 16) % TOTAL_FRAMES / TOTAL_FRAMES) * 140 + 320;
    const p3Rot = -phase * 35;

    // Ngôi sao lấp lánh rải rác
    const s1 = 0.40 + 0.60 * Math.max(0, Math.sin(phase));
    const s2 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.45 + 0.55 * Math.max(0, Math.sin(phase + 3.0));
    const s4 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 4.5));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Bục ánh trăng gợn sóng nơi xe đỗ -->
          <radialGradient id="stageRipples" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef9c3" stop-opacity="0.40"/>
            <stop offset="60%" stop-color="#fef08a" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>

          <!-- Quầng hào quang tỏa sáng từ Vầng Trăng Rằm Hoàng Kim -->
          <radialGradient id="moonGlowV2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fde047" stop-opacity="${moonAuraOpacity.toFixed(2)}"/>
            <stop offset="45%" stop-color="#fbbf24" stop-opacity="${(moonAuraOpacity * 0.45).toFixed(2)}"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </radialGradient>

          <!-- Bề mặt Vầng Trăng Rằm Hoàng Kim 3D -->
          <radialGradient id="moonSurfaceV2" cx="36%" cy="36%" r="64%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="25%" stop-color="#fef9c3"/>
            <stop offset="65%" stop-color="#facc15"/>
            <stop offset="90%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>

          <!-- Gradient Đèn lồng quả trám Hội An đỏ ruby sang trọng -->
          <linearGradient id="silkLanternRed" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#b91c1c"/>
            <stop offset="30%" stop-color="#ef4444"/>
            <stop offset="50%" stop-color="#fca5a5"/>
            <stop offset="70%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </linearGradient>

          <!-- Gradient Đai vàng đèn lồng -->
          <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#d97706"/>
            <stop offset="50%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>

          <!-- Gradient Cánh hoa sen / hoa quế hoàng kim -->
          <linearGradient id="petalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fef08a"/>
            <stop offset="50%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </linearGradient>
        </defs>

        <!-- NỀN TRẮNG TINH KHÔI (#ffffff) -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="16" fill="#ffffff"/>

        <!-- Bục xe ánh trăng êm dịu (khoảng Y = 80..115) -->
        <ellipse cx="160" cy="108" rx="135" ry="24" fill="url(#stageRipples)"/>

        <!-- Bụi sao hoàng kim thanh lịch -->
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

        <!-- Cánh hoa hoàng kim trôi bay nhẹ nhàng -->
        ${renderPetal(p1X, p1Y, p1Rot, 0.9, 0.7)}
        ${renderPetal(p2X, p2Y, p2Rot, 0.8, 0.65)}
        ${renderPetal(p3X, p3Y, p3Rot, 1.0, 0.6)}

        <!-- Quầng hào quang Vầng Trăng Rằm (góc trên phải) -->
        <circle cx="245" cy="48" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlowV2)"/>

        <!-- Vầng Trăng Rằm 3D Hoàng Kim -->
        <circle cx="245" cy="48" r="28" fill="url(#moonSurfaceV2)"/>

        <!-- THỎ NGỌC 3D TRẮNG ĐÁNG YÊU NGỒI TRÊN MÂY CUNG TRĂNG (cx=225, cy=58) -->
        <g transform="translate(225, ${58 + bunnyBounceY})">
          <!-- Đám mây ngọc bồng bềnh dưới chân thỏ -->
          <ellipse cx="6" cy="6" rx="14" ry="5" fill="#ffffff" opacity="0.9" filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"/>
          <circle cx="0" cy="4" r="5" fill="#fef9c3" opacity="0.75"/>
          <circle cx="12" cy="4" r="6" fill="#ffffff" opacity="0.85"/>

          <!-- Đuôi tròn xoe -->
          <circle cx="-5" cy="2" r="3.2" fill="#ffffff" stroke="#fde047" stroke-width="0.6"/>

          <!-- Thân thỏ ngọc trắng muốt -->
          <ellipse cx="4" cy="1" rx="8" ry="6.5" fill="#ffffff" stroke="#fef08a" stroke-width="0.8"/>

          <!-- Đầu thỏ ngọc -->
          <circle cx="10" cy="-4" r="5.5" fill="#ffffff" stroke="#fef08a" stroke-width="0.8"/>

          <!-- Đôi tai thỏ dài xinh xắn (tai trái, tai phải) -->
          <ellipse cx="9" cy="-12" rx="1.8" ry="5.5" fill="#ffffff" stroke="#fef08a" stroke-width="0.7" transform="rotate(-10, 9, -12)"/>
          <ellipse cx="9" cy="-12" rx="0.9" ry="3.8" fill="#fda4af" opacity="0.7" transform="rotate(-10, 9, -12)"/>

          <ellipse cx="12.5" cy="-12" rx="1.8" ry="5.5" fill="#ffffff" stroke="#fef08a" stroke-width="0.7" transform="rotate(8, 12.5, -12)"/>
          <ellipse cx="12.5" cy="-12" rx="0.9" ry="3.8" fill="#fda4af" opacity="0.7" transform="rotate(8, 12.5, -12)"/>

          <!-- Mắt thỏ ruby ngắm trăng -->
          <circle cx="12.5" cy="-4.5" r="0.9" fill="#e11d48"/>
          <!-- Mũi hồng mini -->
          <circle cx="14.8" cy="-3.2" r="0.6" fill="#fb7185"/>
        </g>

        <!-- ĐÈN LỒNG QUẢ TRÁM HỘI AN ĐỎ HOÀNG GIA ĐU ĐƯA Ở GÓC TRÁI TRÊN -->
        <g transform="translate(32, 0)">
          <!-- Dây treo từ mép trên thẻ -->
          <line x1="0" y1="0" x2="0" y2="16" stroke="#d97706" stroke-width="1.3" opacity="0.9"/>
          
          <!-- Cụm đèn lồng đu đưa theo con lắc -->
          <g transform="translate(0, 32) rotate(${lanternSway.toFixed(2)})">
            <!-- Quầng sáng ấm tỏa ra từ đèn -->
            <circle cx="0" cy="0" r="24" fill="#fef08a" opacity="0.45"/>

            <!-- Khớp móc trên đèn bằng vàng -->
            <rect x="-4" y="-16" width="8" height="3" rx="1.5" fill="url(#goldRibbon)"/>

            <!-- Thân đèn lồng quả trám (Diamond / Oval Lantern Shape) -->
            <path d="M 0,-14 C 13,-8 14,8 0,14 C -14,8 -13,-8 0,-14 Z" 
                  fill="url(#silkLanternRed)" stroke="#fef08a" stroke-width="0.9"/>

            <!-- Các múi nan lụa uốn cong tinh xảo -->
            <path d="M 0,-14 C 6,-8 6,8 0,14" fill="none" stroke="#fef08a" stroke-width="0.6" opacity="0.85"/>
            <path d="M 0,-14 C -6,-8 -6,8 0,14" fill="none" stroke="#fef08a" stroke-width="0.6" opacity="0.85"/>
            <line x1="0" y1="-14" x2="0" y2="14" stroke="#fef08a" stroke-width="0.7" opacity="0.9"/>

            <!-- Vòng đai vàng ở giữa đèn lồng -->
            <ellipse cx="0" cy="0" rx="10" ry="2.2" fill="none" stroke="url(#goldRibbon)" stroke-width="1.2"/>

            <!-- Khớp chốt đáy đèn bằng vàng -->
            <rect x="-4" y="13" width="8" height="3" rx="1.5" fill="url(#goldRibbon)"/>

            <!-- Dây tua rua đỏ đu đưa bên dưới đèn -->
            <line x1="0" y1="16" x2="${Math.sin(phase) * 1.5}" y2="28" stroke="#dc2626" stroke-width="1.4"/>
            <circle cx="${Math.sin(phase) * 1.5}" cy="28" r="1.6" fill="#f59e0b"/>
            <!-- Các sợi tua rua lụa đỏ mềm mại -->
            <line x1="${Math.sin(phase) * 1.5}" y1="28" x2="${Math.sin(phase) * 2.0 - 1.8}" y2="36" stroke="#ef4444" stroke-width="0.9"/>
            <line x1="${Math.sin(phase) * 1.5}" y1="28" x2="${Math.sin(phase) * 2.0 + 1.8}" y2="36" stroke="#ef4444" stroke-width="0.9"/>
            <line x1="${Math.sin(phase) * 1.5}" y1="28" x2="${Math.sin(phase) * 2.0}" y2="38" stroke="#dc2626" stroke-width="0.9"/>
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

  console.log('Đang đóng gói file WebP động V2 (Muxing ANMF chunks)...');
  const animatedWebp = muxAnimatedWebP(frames, DELAY, 0);

  const outPictures = path.resolve(__dirname, '../pictures/stock_card_full_bg_v2_trung_thu.webp');
  const outPublic = path.resolve(__dirname, '../public/assets/stock_card_full_bg_v2_trung_thu.webp');

  fs.writeFileSync(outPictures, animatedWebp);
  fs.writeFileSync(outPublic, animatedWebp);

  console.log(`HOÀN TẤT! File ảnh nền động V2: ${(animatedWebp.length / 1024).toFixed(1)} KB`);
  console.log(`Đã lưu tại:\n- ${outPictures}\n- ${outPublic}`);
}

main().catch(err => {
  console.error('Lỗi tạo ảnh nền:', err);
  process.exit(1);
});
