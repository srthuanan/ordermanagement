const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Dimensions: 540 x 200 px (Chuẩn tỉ lệ VIN Hero Card trong OrderDetailView)
const WIDTH = 540;
const HEIGHT = 200;
const TOTAL_FRAMES = 36;
const DELAY = 70; // 70ms/frame = ~2.52s vòng lặp mượt mà

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 70, loopCount = 0) {
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

// Vẽ ngôi sao 4 cánh lấp lánh tinh tế
function renderSparkle(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#fde047" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG TRUNG THU CHO VIN HERO CARD ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chuyển động đung đưa nhẹ nhàng của đèn lồng theo gió đêm
    const swayAngle1 = Math.sin(phase) * 3.5; // Đèn lồng đỏ góc trái
    const swayAngle2 = Math.cos(phase) * 2.8; // Đèn lồng vàng góc trái bên cạnh

    // Quầng sáng vầng trăng rằm hoàng kim nhịp thở
    const moonAuraR = 64 + 6 * Math.sin(phase);
    const moonAuraOpacity = 0.55 + 0.2 * Math.sin(phase);

    // Vị trí mây trôi ngang qua trăng
    const cloud1X = 425 + Math.sin(phase) * 12;
    const cloud2X = 140 + Math.cos(phase) * 15;

    // Vệt sao băng lướt qua bầu trời đêm
    let shootingStarSvg = '';
    if (f >= 12 && f <= 22) {
      const stT = (f - 12) / 10;
      const starX1 = 200 + stT * 180;
      const starY1 = 15 + stT * 40;
      const starX2 = starX1 - 45;
      const starY2 = starY1 - 10;
      const starOpacity = Math.sin(stT * Math.PI) * 0.85;
      shootingStarSvg = `
        <line x1="${starX1.toFixed(1)}" y1="${starY1.toFixed(1)}" x2="${starX2.toFixed(1)}" y2="${starY2.toFixed(1)}" 
              stroke="url(#shootingStarGrad)" stroke-width="1.8" stroke-linecap="round" opacity="${starOpacity.toFixed(2)}" />
      `;
    }

    // Các vì sao lấp lánh trên nền trời đêm
    const s1 = 0.4 + 0.6 * Math.max(0, Math.sin(phase));
    const s2 = 0.3 + 0.7 * Math.max(0, Math.sin(phase + 1.2));
    const s3 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 2.5));
    const s4 = 0.4 + 0.6 * Math.max(0, Math.sin(phase + 3.8));
    const s5 = 0.3 + 0.7 * Math.max(0, Math.sin(phase + 5.0));

    // Đom đóm bay lơ lửng
    const firefly1Y = 160 - ((t * 80) % 80);
    const firefly1X = 180 + Math.sin(phase * 2) * 15;
    const firefly2Y = 175 - (((t + 0.5) * 80) % 80);
    const firefly2X = 360 + Math.cos(phase * 2) * 18;

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Bầu trời đêm Trung Thu sâu thẳm huyền ảo -->
          <linearGradient id="nightSky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#070a14"/>
            <stop offset="40%" stop-color="#0b1122"/>
            <stop offset="75%" stop-color="#141c38"/>
            <stop offset="100%" stop-color="#090d18"/>
          </linearGradient>

          <!-- Quầng hào quang vàng ấm của Trăng Rằm -->
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="${moonAuraOpacity.toFixed(2)}"/>
            <stop offset="35%" stop-color="#f59e0b" stop-opacity="${(moonAuraOpacity * 0.5).toFixed(2)}"/>
            <stop offset="70%" stop-color="#d97706" stop-opacity="${(moonAuraOpacity * 0.15).toFixed(2)}"/>
            <stop offset="100%" stop-color="#0b1122" stop-opacity="0"/>
          </radialGradient>

          <!-- Mặt Trăng Rằm Hoàng Kim 3D -->
          <radialGradient id="moonSurface" cx="38%" cy="38%" r="62%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="45%" stop-color="#fef9c3"/>
            <stop offset="85%" stop-color="#fef08a"/>
            <stop offset="100%" stop-color="#f59e0b"/>
          </radialGradient>

          <!-- Đèn lồng gấm đỏ Hội An -->
          <linearGradient id="redLanternGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#991b1b"/>
            <stop offset="50%" stop-color="#ef4444"/>
            <stop offset="100%" stop-color="#7f1d1d"/>
          </linearGradient>

          <!-- Đèn lồng gấm vàng cung đình -->
          <linearGradient id="goldLanternGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#b45309"/>
            <stop offset="50%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>

          <!-- Vệt sao băng -->
          <linearGradient id="shootingStarGrad" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
            <stop offset="40%" stop-color="#fef08a" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
          </linearGradient>

          <!-- Viền vàng kim tinh tế quanh card -->
          <linearGradient id="cardRimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.5"/>
            <stop offset="50%" stop-color="#fef08a" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#d97706" stop-opacity="0.4"/>
          </linearGradient>
        </defs>

        <!-- Thân nền thẻ bo góc mềm mại -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="24" fill="url(#nightSky)"/>

        <!-- Bụi sao lấp lánh rải rác trên bầu trời đêm -->
        <circle cx="110" cy="35" r="1.2" fill="#ffffff" opacity="0.75"/>
        <circle cx="230" cy="22" r="1.0" fill="#fef08a" opacity="0.8"/>
        <circle cx="290" cy="48" r="1.4" fill="#ffffff" opacity="0.65"/>
        <circle cx="340" cy="25" r="1.1" fill="#38bdf8" opacity="0.75"/>
        <circle cx="490" cy="110" r="1.3" fill="#fef08a" opacity="0.7"/>
        <circle cx="160" cy="85" r="1.0" fill="#ffffff" opacity="0.6"/>
        <circle cx="390" cy="95" r="1.2" fill="#ffffff" opacity="0.7"/>

        ${renderSparkle(215, 30, 4.0, s1)}
        ${renderSparkle(315, 18, 3.5, s2)}
        ${renderSparkle(485, 95, 3.8, s3)}
        ${renderSparkle(135, 75, 3.2, s4)}
        ${renderSparkle(280, 80, 3.5, s5)}

        <!-- Sao băng lướt qua -->
        ${shootingStarSvg}

        <!-- Quầng hào quang tỏa sáng từ Vầng Trăng Rằm (ở góc trên bên phải) -->
        <circle cx="455" cy="46" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlow)"/>

        <!-- Vầng Trăng Rằm Hoàng Kim 3D -->
        <circle cx="455" cy="46" r="32" fill="url(#moonSurface)"/>
        <!-- Hoa văn bóng nguyệt / cây đa chìm trên cung trăng -->
        <path d="M 445,36 Q 452,30 460,34 Q 466,42 458,54 Q 448,50 445,36 Z" fill="#d97706" opacity="0.18"/>
        <circle cx="468" cy="42" r="6" fill="#b45309" opacity="0.14"/>
        <circle cx="448" cy="56" r="5" fill="#b45309" opacity="0.12"/>

        <!-- Dải mây dạ nguyệt trôi qua mặt trăng -->
        <g opacity="0.45" fill="#fef08a">
          <path d="M ${cloud1X.toFixed(1)},52 Q ${(cloud1X + 25).toFixed(1)},42 ${(cloud1X + 50).toFixed(1)},50 Q ${(cloud1X + 70).toFixed(1)},46 ${(cloud1X + 85).toFixed(1)},54 Q ${(cloud1X + 45).toFixed(1)},62 ${cloud1X.toFixed(1)},52 Z" />
        </g>
        <g opacity="0.30" fill="#cbd5e1">
          <path d="M ${cloud2X.toFixed(1)},24 Q ${(cloud2X + 30).toFixed(1)},16 ${(cloud2X + 60).toFixed(1)},22 Q ${(cloud2X + 80).toFixed(1)},18 ${(cloud2X + 95).toFixed(1)},26 Q ${(cloud2X + 50).toFixed(1)},32 ${cloud2X.toFixed(1)},24 Z" />
        </g>

        <!-- ĐÈN 1: LỒNG ĐÈN ÔNG SAO TRUYỀN THỐNG TRUNG THU (Thả dài hẳn xuống sâu dưới đèn kế bên) -->
        <g transform="translate(42, 0)">
          <!-- Dây treo dài nối từ trần xuống sâu -->
          <line x1="0" y1="0" x2="0" y2="40" stroke="#f59e0b" stroke-width="1.2" opacity="0.85"/>
          <!-- Cụm lồng đèn ông sao đung đưa ở vị trí thấp dài nổi bật -->
          <g transform="translate(0, 58) rotate(${swayAngle1.toFixed(2)})">
            <!-- Quầng sáng ấm áp tỏa từ ruột đèn ông sao -->
            <circle cx="0" cy="0" r="26" fill="#ef4444" opacity="0.25"/>
            <circle cx="0" cy="0" r="16" fill="#f59e0b" opacity="0.35"/>

            <!-- Cánh ngôi sao 5 cánh 3D gập nếp giấy bóng kính đỏ truyền thống -->
            <!-- Cánh trên -->
            <polygon points="0,0 0,-17 -3.99,-5.50" fill="#dc2626"/>
            <polygon points="0,0 0,-17 3.99,-5.50" fill="#f87171"/>
            <!-- Cánh phải trên -->
            <polygon points="0,0 16.17,-5.25 3.99,-5.50" fill="#ef4444"/>
            <polygon points="0,0 16.17,-5.25 6.47,2.10" fill="#dc2626"/>
            <!-- Cánh phải dưới -->
            <polygon points="0,0 9.99,13.75 6.47,2.10" fill="#ef4444"/>
            <polygon points="0,0 9.99,13.75 0,6.8" fill="#b91c1c"/>
            <!-- Cánh trái dưới -->
            <polygon points="0,0 -9.99,13.75 0,6.8" fill="#dc2626"/>
            <polygon points="0,0 -9.99,13.75 -6.47,2.10" fill="#b91c1c"/>
            <!-- Cánh trái trên -->
            <polygon points="0,0 -16.17,-5.25 -6.47,2.10" fill="#dc2626"/>
            <polygon points="0,0 -16.17,-5.25 -3.99,-5.50" fill="#ef4444"/>

            <!-- Vòng tròn nan tre uốn quanh cánh sao đặc trưng của đèn ông sao -->
            <circle cx="0" cy="0" r="10.5" fill="none" stroke="#fbbf24" stroke-width="1.3" opacity="0.9"/>

            <!-- Các nan tre khung đèn tỏa ra 5 đỉnh sao -->
            <line x1="0" y1="0" x2="0" y2="-17" stroke="#fbbf24" stroke-width="0.8"/>
            <line x1="0" y1="0" x2="16.17" y2="-5.25" stroke="#fbbf24" stroke-width="0.8"/>
            <line x1="0" y1="0" x2="9.99" y2="13.75" stroke="#fbbf24" stroke-width="0.8"/>
            <line x1="0" y1="0" x2="-9.99" y2="13.75" stroke="#fbbf24" stroke-width="0.8"/>
            <line x1="0" y1="0" x2="-16.17" y2="-5.25" stroke="#fbbf24" stroke-width="0.8"/>

            <!-- Tâm đèn nến phát sáng rực rỡ -->
            <circle cx="0" cy="0" r="4.5" fill="#fef08a"/>
            <circle cx="0" cy="0" r="2.2" fill="#ffffff"/>

            <!-- Chùm tua rua đuôi đèn ông sao dài thướt tha đung đưa phía dưới -->
            <line x1="0" y1="14" x2="0" y2="38" stroke="#ef4444" stroke-width="1.6" stroke-linecap="round"/>
            <line x1="-3" y1="13" x2="-6" y2="32" stroke="#f59e0b" stroke-width="1.0" stroke-linecap="round"/>
            <line x1="3" y1="13" x2="6" y2="32" stroke="#38bdf8" stroke-width="1.0" stroke-linecap="round"/>
            <circle cx="0" cy="38" r="1.5" fill="#fbbf24"/>
          </g>
        </g>

        <!-- Đèn 2: Đèn lồng vàng hoàng cung (nhỏ hơn, treo bên cạnh) -->
        <g transform="translate(78, 0)">
          <line x1="0" y1="0" x2="0" y2="18" stroke="#d97706" stroke-width="1.0" opacity="0.7"/>
          <g transform="translate(0, 18) rotate(${swayAngle2.toFixed(2)})">
            <rect x="-6" y="0" width="12" height="2.5" rx="1" fill="#d97706"/>
            <!-- Quầng sáng -->
            <ellipse cx="0" cy="13" rx="15" ry="18" fill="#f59e0b" opacity="0.3"/>
            <!-- Thân đèn -->
            <ellipse cx="0" cy="13" rx="11" ry="13" fill="url(#goldLanternGrad)"/>
            <path d="M 0,1 Q -7,13 0,25" stroke="#fef08a" stroke-width="0.7" opacity="0.8" fill="none"/>
            <path d="M 0,1 Q 7,13 0,25" stroke="#fef08a" stroke-width="0.7" opacity="0.8" fill="none"/>
            <rect x="-5" y="25" width="10" height="2" rx="1" fill="#d97706"/>
            <line x1="0" y1="27" x2="0" y2="40" stroke="#f59e0b" stroke-width="1.4" stroke-linecap="round"/>
          </g>
        </g>

        <!-- Đom đóm dạ nguyệt bay lơ lửng trong đêm -->
        <g transform="translate(${firefly1X.toFixed(1)}, ${firefly1Y.toFixed(1)})">
          <circle cx="0" cy="0" r="4.5" fill="#fde047" opacity="0.3"/>
          <circle cx="0" cy="0" r="1.8" fill="#ffffff" opacity="0.95"/>
        </g>
        <g transform="translate(${firefly2X.toFixed(1)}, ${firefly2Y.toFixed(1)})">
          <circle cx="0" cy="0" r="4.0" fill="#f59e0b" opacity="0.35"/>
          <circle cx="0" cy="0" r="1.6" fill="#fde047" opacity="0.9"/>
        </g>

        <!-- Viền ánh kim nhẹ sang trọng bao quanh card -->
        <rect x="1" y="1" width="${WIDTH - 2}" height="${HEIGHT - 2}" rx="23" fill="none" stroke="url(#cardRimGrad)" stroke-width="1.2"/>
      </svg>
    `;

    const frameWebpBuffer = await sharp(Buffer.from(svgContent))
      .webp({ quality: 95, alphaQuality: 100, lossless: false })
      .toBuffer();

    frames.push(frameWebpBuffer);
    if ((f + 1) % 9 === 0 || f === TOTAL_FRAMES - 1) {
      console.log(`Đã tạo frame ${f + 1}/${TOTAL_FRAMES}...`);
    }
  }

  console.log('Đang đóng gói file WebP động (Muxing ANMF chunks)...');
  const animatedWebpBuffer = muxAnimatedWebP(frames, DELAY, 0);

  const outPicturesPath = path.join(__dirname, '../pictures/vin_hero_card_bg_trung_thu.webp');
  const outPublicPath = path.join(__dirname, '../public/assets/vin_hero_card_bg_trung_thu.webp');

  fs.writeFileSync(outPicturesPath, animatedWebpBuffer);
  fs.writeFileSync(outPublicPath, animatedWebpBuffer);

  const sizeKb = (animatedWebpBuffer.length / 1024).toFixed(1);
  console.log(`HOÀN TẤT! File ảnh nền động VIN Hero Card Trung Thu: ${sizeKb} KB`);
  console.log(`Đã lưu tại:\n- ${outPicturesPath}\n- ${outPublicPath}`);
}

main().catch(err => {
  console.error('Lỗi khi tạo ảnh nền động VIN Hero Card Trung Thu:', err);
  process.exit(1);
});
