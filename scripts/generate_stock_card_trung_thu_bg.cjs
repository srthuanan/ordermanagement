const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn tỉ lệ Retina cho car-image-container (h-[90px], rộng ~240px - 260px)
const WIDTH = 480;
const HEIGHT = 180;
const TOTAL_FRAMES = 24;
const DELAY = 80; // 80ms/frame = ~1.92s vòng lặp mượt mà

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

// Vẽ ngôi sao hoàng kim 4 cánh lấp lánh tinh tế
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

// Vẽ vân mây cung đình mềm mại
function renderCloud(x, y, scale = 1.0, opacity = 0.35) {
  return `
    <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,20 Q 15,10 30,16 Q 42,0 60,6 Q 78,-2 95,12 Q 110,6 125,18 Q 138,32 120,38 Q 100,42 65,40 Q 30,42 12,34 Q -4,30 0,20 Z" 
            fill="url(#cloudGrad)" />
      <path d="M 22,22 Q 36,14 54,20 Q 72,12 92,20" fill="none" stroke="#fde047" stroke-width="0.9" opacity="0.5"/>
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG SÂN KHẤU TRUNG THU CHO THẺ XE (STOCK CARD) ---');

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Đèn ông sao mini đung đưa nhẹ nhàng ở góc trái
    const starLanternSway = Math.sin(phase) * 4.0;

    // Quầng sáng Vầng Trăng Rằm tỏa sáng phía sau xe (nhịp thở nhẹ)
    const moonAuraR = 56 + 5 * Math.sin(phase);
    const moonAuraOpacity = 0.50 + 0.18 * Math.sin(phase);

    // Vị trí mây trôi nhẹ qua trăng
    const cloud1X = 260 + Math.sin(phase) * 16;
    const cloud2X = 90 - Math.cos(phase) * 14;

    // Ngôi sao lấp lánh trên bầu trời
    const s1 = 0.35 + 0.65 * Math.max(0, Math.sin(phase));
    const s2 = 0.30 + 0.70 * Math.max(0, Math.sin(phase + 1.5));
    const s3 = 0.40 + 0.60 * Math.max(0, Math.sin(phase + 3.0));
    const s4 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 4.5));

    // Đom đóm vàng bay lơ lửng quanh sàn xe
    const firefly1X = 140 + Math.sin(phase * 2) * 12;
    const firefly1Y = 145 - Math.cos(phase * 2) * 8;
    const firefly2X = 350 + Math.cos(phase * 2) * 14;
    const firefly2Y = 135 + Math.sin(phase * 2) * 6;

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Bầu trời đêm Trung Thu hoàng gia sâu thẳm -->
          <linearGradient id="nightSkyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#080e1c"/>
            <stop offset="45%" stop-color="#0e172e"/>
            <stop offset="80%" stop-color="#152142"/>
            <stop offset="100%" stop-color="#0c1224"/>
          </linearGradient>

          <!-- Mặt sàn phản chiếu ánh trăng dịu nhẹ -->
          <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#1e293b" stop-opacity="0"/>
            <stop offset="50%" stop-color="#334155" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#0f172a" stop-opacity="0.75"/>
          </linearGradient>

          <!-- Quầng hào quang tỏa sáng từ Vầng Trăng Rằm -->
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="${moonAuraOpacity.toFixed(2)}"/>
            <stop offset="45%" stop-color="#f59e0b" stop-opacity="${(moonAuraOpacity * 0.45).toFixed(2)}"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </radialGradient>

          <!-- Bề mặt Vầng Trăng Rằm Hoàng Kim -->
          <radialGradient id="moonSurface" cx="38%" cy="38%" r="62%">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="25%" stop-color="#fef9c3"/>
            <stop offset="65%" stop-color="#fde047"/>
            <stop offset="90%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </radialGradient>

          <!-- Gradient màu mây hoàng kim -->
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.40"/>
            <stop offset="50%" stop-color="#fbbf24" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.10"/>
          </linearGradient>
        </defs>

        <!-- Thân nền bầu trời đêm bo góc -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" rx="12" fill="url(#nightSkyGrad)"/>

        <!-- Mặt sàn sân khấu đậu xe -->
        <ellipse cx="240" cy="165" rx="220" ry="28" fill="url(#floorGrad)"/>

        <!-- Bụi sao đêm lấp lánh -->
        <circle cx="65" cy="45" r="1.1" fill="#ffffff" opacity="0.7"/>
        <circle cx="160" cy="25" r="1.3" fill="#fef08a" opacity="0.8"/>
        <circle cx="280" cy="20" r="1.0" fill="#ffffff" opacity="0.6"/>
        <circle cx="430" cy="70" r="1.2" fill="#fef08a" opacity="0.75"/>
        <circle cx="450" cy="28" r="1.0" fill="#ffffff" opacity="0.6"/>

        ${renderSparkle(175, 32, 3.5, s1)}
        ${renderSparkle(265, 18, 3.0, s2)}
        ${renderSparkle(425, 42, 3.8, s3)}
        ${renderSparkle(115, 65, 2.8, s4)}

        <!-- Quầng hào quang Vầng Trăng Rằm (Tọa lạc lệch phải, rọi sáng phía sau xe) -->
        <circle cx="360" cy="50" r="${moonAuraR.toFixed(1)}" fill="url(#moonGlow)"/>

        <!-- Vầng Trăng Rằm 3D Hoàng Kim -->
        <circle cx="360" cy="50" r="30" fill="url(#moonSurface)"/>
        <!-- Vân bóng nguyệt chìm trên trăng -->
        <path d="M 352,42 Q 358,36 365,40 Q 370,48 362,58 Q 354,54 352,42 Z" fill="#d97706" opacity="0.16"/>
        <circle cx="372" cy="46" r="5" fill="#b45309" opacity="0.12"/>

        <!-- Các cụm vân mây hoàng kim trôi qua cung trăng -->
        ${renderCloud(cloud1X, 48, 0.75, 0.45)}
        ${renderCloud(cloud2X, 22, 0.60, 0.35)}

        <!-- ĐÈN ÔNG SAO MINI ĐU ĐƯA Ở GÓC TRÁI TRÊN -->
        <g transform="translate(40, 0)">
          <!-- Dây treo từ trần -->
          <line x1="0" y1="0" x2="0" y2="18" stroke="#f59e0b" stroke-width="1.2" opacity="0.85"/>
          <!-- Cụm đèn ông sao đu đưa -->
          <g transform="translate(0, 32) rotate(${starLanternSway.toFixed(2)})">
            <!-- Quầng sáng ấm áp -->
            <circle cx="0" cy="0" r="20" fill="#ef4444" opacity="0.25"/>
            <circle cx="0" cy="0" r="13" fill="#f59e0b" opacity="0.35"/>

            <!-- Cánh ngôi sao 5 cánh đỏ gập 3D -->
            <polygon points="0,0 0,-14 -3.3,-4.5" fill="#dc2626"/>
            <polygon points="0,0 0,-14 3.3,-4.5" fill="#f87171"/>
            <polygon points="0,0 13.3,-4.3 3.3,-4.5" fill="#ef4444"/>
            <polygon points="0,0 13.3,-4.3 5.3,1.7" fill="#dc2626"/>
            <polygon points="0,0 8.2,11.3 5.3,1.7" fill="#ef4444"/>
            <polygon points="0,0 8.2,11.3 0,5.6" fill="#b91c1c"/>
            <polygon points="0,0 -8.2,11.3 0,5.6" fill="#dc2626"/>
            <polygon points="0,0 -8.2,11.3 -5.3,1.7" fill="#b91c1c"/>
            <polygon points="0,0 -13.3,-4.3 -5.3,1.7" fill="#dc2626"/>
            <polygon points="0,0 -13.3,-4.3 -3.3,-4.5" fill="#ef4444"/>

            <!-- Vòng tròn nan tre đặc trưng -->
            <circle cx="0" cy="0" r="8.5" fill="none" stroke="#fbbf24" stroke-width="1.1" opacity="0.9"/>
            <!-- Nan tre xuyên tâm -->
            <line x1="0" y1="0" x2="0" y2="-14" stroke="#fbbf24" stroke-width="0.7"/>
            <line x1="0" y1="0" x2="13.3" y2="-4.3" stroke="#fbbf24" stroke-width="0.7"/>
            <line x1="0" y1="0" x2="8.2" y2="11.3" stroke="#fbbf24" stroke-width="0.7"/>
            <line x1="0" y1="0" x2="-8.2" y2="11.3" stroke="#fbbf24" stroke-width="0.7"/>
            <line x1="0" y1="0" x2="-13.3" y2="-4.3" stroke="#fbbf24" stroke-width="0.7"/>

            <!-- Tâm đèn phát sáng -->
            <circle cx="0" cy="0" r="3.5" fill="#fef08a"/>
            <circle cx="0" cy="0" r="1.8" fill="#ffffff"/>

            <!-- Tua rua đuôi đèn ông sao -->
            <line x1="0" y1="11" x2="0" y2="26" stroke="#ef4444" stroke-width="1.4" stroke-linecap="round"/>
            <line x1="-2.5" y1="10" x2="-4" y2="22" stroke="#f59e0b" stroke-width="0.9" stroke-linecap="round"/>
            <line x1="2.5" y1="10" x2="4" y2="22" stroke="#38bdf8" stroke-width="0.9" stroke-linecap="round"/>
            <circle cx="0" cy="26" r="1.2" fill="#fbbf24"/>
          </g>
        </g>

        <!-- Đom đóm bay lơ lửng quanh xe -->
        <g transform="translate(${firefly1X.toFixed(1)}, ${firefly1Y.toFixed(1)})">
          <circle cx="0" cy="0" r="3.5" fill="#fde047" opacity="0.35"/>
          <circle cx="0" cy="0" r="1.5" fill="#ffffff" opacity="0.95"/>
        </g>
        <g transform="translate(${firefly2X.toFixed(1)}, ${firefly2Y.toFixed(1)})">
          <circle cx="0" cy="0" r="3.0" fill="#f59e0b" opacity="0.4"/>
          <circle cx="0" cy="0" r="1.3" fill="#fde047" opacity="0.9"/>
        </g>
      </svg>
    `;

    const frameWebpBuffer = await sharp(Buffer.from(svgContent))
      .webp({ quality: 95, alphaQuality: 100, effort: 5, lossless: false })
      .toBuffer();

    frames.push(frameWebpBuffer);
    if ((f + 1) % 6 === 0 || f === TOTAL_FRAMES - 1) {
      console.log(`Đã render frame ${f + 1}/${TOTAL_FRAMES}...`);
    }
  }

  console.log('Đang đóng gói file WebP động Stock Card Car Stage (Muxing ANMF chunks)...');
  const animatedWebpBuffer = muxAnimatedWebP(frames, DELAY, 0);

  const outPicturesPath = path.join(__dirname, '../pictures/stock_card_car_bg_trung_thu.webp');
  const outPublicPath = path.join(__dirname, '../public/assets/stock_card_car_bg_trung_thu.webp');

  fs.writeFileSync(outPicturesPath, animatedWebpBuffer);
  fs.writeFileSync(outPublicPath, animatedWebpBuffer);

  const sizeKb = (animatedWebpBuffer.length / 1024).toFixed(1);
  console.log(`HOÀN TẤT! File ảnh nền động Stock Card Car Stage: ${sizeKb} KB`);
  console.log(`Đã lưu tại:\n- ${outPicturesPath}\n- ${outPublicPath}`);
}

main().catch(err => {
  console.error('Lỗi khi tạo ảnh nền Stock Card Car Stage:', err);
  process.exit(1);
});
