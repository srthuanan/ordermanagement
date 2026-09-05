const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_PHOTO = path.join('C:/Users/USER/.gemini/antigravity-ide/brain/76049b4f-b40a-4855-b7c7-3075b1138599/trung_thu_photo_bg_1787634050944.jpg');

const WIDTH = 860;
const HEIGHT = 484;
const FRAMES = 32;
const DELAY = 85;

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 85, loopCount = 0, width = WIDTH, height = HEIGHT) {
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
    writeUInt24LE(anmfHeader, width - 1, 6);
    writeUInt24LE(anmfHeader, height - 1, 9);
    writeUInt24LE(anmfHeader, delayMs, 12);
    anmfHeader[15] = 0x02;

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
  vp8xHeader[8] = 0x12;
  writeUInt24LE(vp8xHeader, width - 1, 12);
  writeUInt24LE(vp8xHeader, height - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8);
  animChunk.writeUInt16LE(loopCount, 12);

  const bodyData = Buffer.concat([vp8xHeader, animChunk, ...anmfChunks]);
  const riffSize = 4 + bodyData.length;

  const riffHeader = Buffer.alloc(12);
  riffHeader.write('RIFF', 0, 4, 'latin1');
  riffHeader.writeUInt32LE(riffSize, 4);
  riffHeader.write('WEBP', 8, 4, 'latin1');

  return Buffer.concat([riffHeader, bodyData]);
}

// -----------------------------------------------------------------------------
// 🌌 VIVID CINEMATIC DYNAMIC ANIMATION (CHUYỂN ĐỘNG RÕ RÀNG, MẠNH MẼ, SỐNG ĐỘNG)
// 1. Vòng Hào Quang Mặt Trăng Lan Tỏa Đa Tầng (Expanding Concentric Lunar Rings)
// 2. Mặt Hồ Sóng Nước Gợn Lăn Tăn & Bóng Trăng Dập Dềnh Lấp Lánh Rõ Rệt
// 3. Đèn Lồng Đỏ Đung Đưa Lắc Lư Qua Lại Mạnh Mẽ Trong Gió Thu
// 4. Hàng Trăm Đốm Đom Đóm Vàng Rực Bay Lượn Khắp Mặt Hồ
// 5. Ngọn Nến Hoa Đăng Nhấp Nhô Bồng Bềnh Theo Từng Đợt Sóng
// -----------------------------------------------------------------------------
function generateVividAnimationOverlay(frameIndex) {
  const progress = frameIndex / FRAMES;
  const rad = progress * Math.PI * 2;

  // 1. VÒNG HÀO QUANG MẶT TRĂNG LAN TỎA (EXPANDING LUNAR WAVES)
  const ring1R = 110 + ((frameIndex % 16) / 16) * 70;
  const ring1Op = (0.45 * (1 - (frameIndex % 16) / 16)).toFixed(2);

  const ring2R = 110 + (((frameIndex + 8) % 16) / 16) * 70;
  const ring2Op = (0.45 * (1 - ((frameIndex + 8) % 16) / 16)).toFixed(2);

  // 2. GỢN SÓNG NƯỚC MẶT HỒ PHẢN CHIẾU ÁNH TRĂNG DẬP DỀNH (DYNAMIC WATER REFLECTION)
  const waterWaves = [];
  for (let i = 0; i < 14; i++) {
    const yPos = 290 + i * 13;
    // Sóng nước chuyển động theo phương ngang và dao động lên xuống
    const waveShiftX = Math.sin(rad * 2 + i * 0.7) * 25;
    const waveShiftY = Math.cos(rad * 1.5 + i * 0.5) * 3;
    const waveOp = (0.28 + Math.sin(rad * 2.5 + i * 1.1) * 0.14).toFixed(2);
    const waveWidth = 140 - i * 6;

    waterWaves.push(`
      <ellipse cx="${(440 + waveShiftX).toFixed(1)}" cy="${(yPos + waveShiftY).toFixed(1)}" 
               rx="${waveWidth}" ry="${(5.5 + i * 0.4).toFixed(1)}" 
               fill="#fef08a" opacity="${waveOp}" filter="url(#glowMedium)"/>
      <ellipse cx="${(440 + waveShiftX * 0.8).toFixed(1)}" cy="${(yPos + waveShiftY).toFixed(1)}" 
               rx="${waveWidth * 0.6}" ry="${(3.5 + i * 0.3).toFixed(1)}" 
               fill="#ffffff" opacity="${(waveOp * 0.8).toFixed(2)}" filter="url(#glowMedium)"/>
    `);
  }

  // 3. LỒNG ĐÈN ĐỎ LẮC LƯ ĐUNG ĐƯA QUA LẠI & PHÁT SÁNG LẬP LÒE RÕ RỆT
  const lanternList = [
    { baseX: 200, baseY: 95, r: 25, swayAmp: 18, color: '#ff4d4f' },
    { baseX: 135, baseY: 175, r: 22, swayAmp: -15, color: '#facc15' },
    { baseX: 85, baseY: 295, r: 18, swayAmp: 14, color: '#ff4d4f' },
    { baseX: 285, baseY: 265, r: 20, swayAmp: -16, color: '#f97316' },
    { baseX: 800, baseY: 250, r: 24, swayAmp: 15, color: '#ff4d4f' }
  ];

  const lanternsSvg = lanternList.map((l, idx) => {
    const swayX = Math.sin(rad + idx * 1.2) * l.swayAmp;
    const flicker = Math.sin(rad * 3 + idx * 2.1) * 0.25 + 0.75;
    const curR = (l.r * flicker).toFixed(1);
    const op = (0.45 * flicker).toFixed(2);

    return `
      <circle cx="${(l.baseX + swayX).toFixed(1)}" cy="${l.baseY}" r="${curR}" fill="${l.color}" opacity="${op}" filter="url(#glowHeavy)"/>
      <circle cx="${(l.baseX + swayX).toFixed(1)}" cy="${l.baseY}" r="${(curR * 0.5).toFixed(1)}" fill="#ffffff" opacity="${(op * 0.9).toFixed(2)}"/>
    `;
  }).join('\n');

  // 4. HÀNG CHỤC ĐÈN HOA ĐĂNG TRÊN MẶT NƯỚC NHẤP NHÔ LƯỢN SÓNG (BOBBING LOTUS CANDLES)
  const floatingCandles = [
    { x: 330, y: 395, amp: 5.5, col: '#facc15' },
    { x: 240, y: 380, amp: -4.5, col: '#fde047' },
    { x: 575, y: 425, amp: 6.0, col: '#facc15' },
    { x: 630, y: 395, amp: -5.0, col: '#fde047' },
    { x: 675, y: 385, amp: 4.8, col: '#facc15' },
    { x: 745, y: 375, amp: -4.2, col: '#fde047' }
  ];

  const candlesSvg = floatingCandles.map((c, idx) => {
    const bobY = Math.sin(rad * 2 + idx * 1.4) * c.amp;
    const driftX = Math.cos(rad + idx) * 8;
    const candleFlicker = Math.sin(rad * 4 + idx * 2) * 0.3 + 0.7;
    return `
      <circle cx="${(c.x + driftX).toFixed(1)}" cy="${(c.y + bobY).toFixed(1)}" r="${(14 * candleFlicker).toFixed(1)}" fill="${c.col}" opacity="${(0.55 * candleFlicker).toFixed(2)}" filter="url(#glowMedium)"/>
      <circle cx="${(c.x + driftX).toFixed(1)}" cy="${(c.y + bobY).toFixed(1)}" r="3" fill="#ffffff"/>
    `;
  }).join('\n');

  // 5. ĐÀN ĐOM ĐÓM BAY LƯỢN RỰC RỠ KHẮP KHÔNG GIAN (VIVID DANCING FIREFLIES)
  const fireflies = [];
  for (let i = 0; i < 35; i++) {
    // Đom đóm bay theo quỹ đạo số 8 (Lissajous curve)
    const flyX = (80 + i * 22 + Math.sin(rad * 1.5 + i * 0.8) * 35).toFixed(1);
    const flyY = (220 + (i % 8) * 28 + Math.cos(rad * 2 + i * 1.2) * 22).toFixed(1);
    const blink = Math.sin(rad * 3.5 + i * 2.3) * 0.5 + 0.5;
    const flyOp = (0.4 + blink * 0.6).toFixed(2);
    const flySize = (1.8 + blink * 1.4).toFixed(1);

    fireflies.push(`
      <circle cx="${flyX}" cy="${flyY}" r="${flySize}" fill="#fef08a" opacity="${flyOp}" filter="url(#brightPoint)"/>
      <circle cx="${flyX}" cy="${flyY}" r="${(flySize * 0.5).toFixed(1)}" fill="#ffffff" opacity="${flyOp}"/>
    `);
  }

  // 6. LÀN SƯƠNG ĐÊM THU TRÔI QUA MẶT HỒ
  const mist1X = ((frameIndex * 4.5) % (WIDTH + 300)) - 150;
  const mist2X = (((frameIndex + 16) * 3.8) % (WIDTH + 300)) - 150;

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glowHeavy" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="16"/>
        </filter>
        <filter id="glowMedium" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9"/>
        </filter>
        <filter id="mistBlur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="24"/>
        </filter>
        <filter id="brightPoint" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- 1. VÒNG HÀO QUANG MẶT TRĂNG TỎA SÓNG LIÊN TỤC -->
      <circle cx="440" cy="120" r="${ring1R.toFixed(1)}" fill="none" stroke="#fef08a" stroke-width="8" opacity="${ring1Op}" filter="url(#glowMedium)"/>
      <circle cx="440" cy="120" r="${ring2R.toFixed(1)}" fill="none" stroke="#fef08a" stroke-width="8" opacity="${ring2Op}" filter="url(#glowMedium)"/>
      <circle cx="440" cy="120" r="135" fill="#fef08a" opacity="${(0.35 + Math.sin(rad) * 0.15).toFixed(2)}" filter="url(#glowHeavy)"/>

      <!-- 2. MẶT HỒ GỢN SÓNG & BÓNG TRĂNG DẬP DỀNH RỰC RỠ -->
      ${waterWaves.join('\n')}

      <!-- 3. LỒNG ĐÈN ĐUNG ĐƯA LẮC LƯ QUA LẠI MẠNH MẼ -->
      ${lanternsSvg}

      <!-- 4. NGỌN NẾN HOA ĐĂNG NHẤP NHÔ THEO SÓNG -->
      ${candlesSvg}

      <!-- 5. LÀN SƯƠNG THU LÃNG ĐÃNG TRÔI QUA MẶT HỒ -->
      <ellipse cx="${mist1X}" cy="260" rx="220" ry="25" fill="#fef08a" opacity="0.12" filter="url(#mistBlur)"/>
      <ellipse cx="${mist2X}" cy="290" rx="260" ry="30" fill="#93c5fd" opacity="0.09" filter="url(#mistBlur)"/>

      <!-- 6. 35 ĐỐM ĐOM ĐÓM BAY LƯỢN DẠ QUANG RỰC RỠ -->
      ${fireflies.join('\n')}
    </svg>
  `;
}

async function main() {
  console.log('🌌 Compositing Vivid & Dynamic Photorealistic Animation...');

  const baseImageBuffer = await sharp(SOURCE_PHOTO)
    .resize(WIDTH, HEIGHT, { fit: 'cover' })
    .toBuffer();

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const overlaySvg = generateVividAnimationOverlay(f);

    const frameWebp = await sharp(baseImageBuffer)
      .composite([
        {
          input: Buffer.from(overlaySvg),
          top: 0,
          left: 0,
          blend: 'over'
        }
      ])
      .webp({ quality: 80, effort: 6, lossless: false })
      .toBuffer();

    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/trung_thu_harvest_moon_art.webp'),
    path.join(__dirname, '../pictures/trung_thu_harvest_moon_art.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 Vivid Photorealistic ANIMATED Masterpiece rendered:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
