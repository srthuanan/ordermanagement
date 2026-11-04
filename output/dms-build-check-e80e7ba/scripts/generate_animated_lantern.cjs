const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTH = 320;
const HEIGHT = 480;
const FRAMES = 36;
const DELAY = 80; // 80ms (~12.5 fps siêu mượt mà)

function writeUInt24LE(buf, value, offset) {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >> 8) & 0xff;
  buf[offset + 2] = (value >> 16) & 0xff;
}

function muxAnimatedWebP(frameWebpBuffers, delayMs = 80, loopCount = 0, width = WIDTH, height = HEIGHT) {
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
    anmfHeader[15] = 0x02; // Dispose to background for clean transparency

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
  vp8xHeader[8] = 0x12; // Has animation (0x02) + Has alpha (0x10)
  writeUInt24LE(vp8xHeader, width - 1, 12);
  writeUInt24LE(vp8xHeader, height - 1, 15);

  const animChunk = Buffer.alloc(8 + 6);
  animChunk.write('ANIM', 0, 4, 'latin1');
  animChunk.writeUInt32LE(6, 4);
  animChunk.writeUInt32LE(0x00000000, 8); // Transparent
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
// 🏮 LỒNG ĐÈN TRUNG THU CUNG ĐÌNH 3D ĐỘNG (100% NỀN TRONG SUỐT)
// - Cấu trúc lồng đèn lụa đỏ thêu hoa văn vàng hoàng gia
// - Ngọn nến phát sáng thấu quang lung linh từ lõi trong (Translucent Candlelight)
// - Dao động đung đưa con lắc vật lý thật trong làn gió thu (Pendulum Swaying)
// - Dây tua rua lụa đỏ vàng rủ dài uốn lượn mềm mại
// - 100% Nền trong suốt (Alpha Transparency), thích hợp trang trí website
// -----------------------------------------------------------------------------
function renderAnimatedLanternFrame(frameIndex) {
  const rad = (frameIndex / FRAMES) * Math.PI * 2;

  // 1. DAO ĐỘNG CON LẮC ĐUNG ĐƯA THEO GIÓ (PENDULUM SWAYING ±6.5°)
  const swayAngle = Math.sin(rad) * 6.5;
  const pivotX = 160;
  const pivotY = 15;

  // 2. NHỊP NẾN LẬP LÒE THẤU QUANG (CANDLELIGHT FLICKER)
  const flicker = Math.sin(rad * 3.5) * 0.12 + 0.88;
  const candleGlowR = (75 * flicker).toFixed(1);
  const candleGlowOp = (0.55 * flicker).toFixed(2);

  // 3. ĐỘ TRỄ SÓNG CỦA DÂY TUA RUA DƯỚI ĐÁY (TASSEL WAVE LAG)
  const tasselSway = Math.sin(rad - 0.6) * 16;
  const tasselTipX = (160 + tasselSway).toFixed(1);

  return `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Thân lụa đỏ thấu quang phát sáng từ tâm -->
        <radialGradient id="silkGlowCore" cx="50%" cy="48%" r="52%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="25%" stop-color="#fef08a" />
          <stop offset="55%" stop-color="#f97316" />
          <stop offset="82%" stop-color="#dc2626" />
          <stop offset="100%" stop-color="#7f1d1d" />
        </radialGradient>

        <!-- Viền nẹp vàng 24K vát cạnh 3D -->
        <linearGradient id="goldRim3D" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#78350f" />
          <stop offset="20%" stop-color="#ca8a04" />
          <stop offset="45%" stop-color="#facc15" />
          <stop offset="55%" stop-color="#ffffff" />
          <stop offset="75%" stop-color="#facc15" />
          <stop offset="100%" stop-color="#78350f" />
        </linearGradient>

        <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fef08a" />
          <stop offset="50%" stop-color="#eab308" />
          <stop offset="100%" stop-color="#ca8a04" />
        </linearGradient>

        <!-- Filters Ánh Sáng Lung Linh & Bóng Đổ 3D -->
        <filter id="lanternShadow3D" x="-30%" y="-20%" width="160%" height="150%">
          <feDropShadow dx="0" dy="16" stdDeviation="12" flood-color="#000000" flood-opacity="0.6"/>
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#f97316" flood-opacity="0.5"/>
        </filter>
        <filter id="candleBloom" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="20"/>
        </filter>
        <filter id="sparkleDot" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- ================= TOÀN BỘ LỒNG ĐÈN ĐUNG ĐƯA QUANH ĐIỂM TREO ================= -->
      <g transform="rotate(${swayAngle.toFixed(2)}, ${pivotX}, ${pivotY})" filter="url(#lanternShadow3D)">

        <!-- 1. KHUY MÓC TREO & DÂY LỤA VÀNG HOÀNG GIA -->
        <!-- Khuyên đồng treo trên cùng -->
        <circle cx="160" cy="20" r="8" fill="none" stroke="url(#goldRim3D)" stroke-width="3"/>
        <line x1="160" y1="28" x2="160" y2="110" stroke="url(#goldRibbon)" stroke-width="3"/>

        <!-- Nút thắt hoa mai may mắn trên đỉnh đèn -->
        <g transform="translate(160, 110)">
          <circle cx="0" cy="0" r="10" fill="#dc2626" stroke="url(#goldRim3D)" stroke-width="2"/>
          <polygon points="0,-7 2,-2 7,0 2,2 0,7 -2,2 -7,0 -2,-2" fill="#facc15"/>
        </g>

        <!-- 2. NẮP ĐÈN TRÊN BẰNG GỖ MẠ VÀNG 24K VÁT CẠNH -->
        <g transform="translate(160, 135)">
          <polygon points="-55,-8 55,-8 45,8 -45,8" fill="url(#goldRim3D)" stroke="#ffffff" stroke-width="0.8"/>
          <rect x="-35" y="-14" width="70" height="6" rx="2" fill="url(#goldRim3D)"/>
        </g>

        <!-- 3. QUẦNG SÁNG ẤM ÁP TỎA RA TỪ LÕI ĐÈN -->
        <circle cx="160" cy="225" r="${candleGlowR}" fill="#f97316" opacity="${candleGlowOp}" filter="url(#candleBloom)"/>
        <circle cx="160" cy="225" r="${(candleGlowR * 0.6).toFixed(1)}" fill="#fef08a" opacity="${(candleGlowOp * 0.8).toFixed(2)}" filter="url(#candleBloom)"/>

        <!-- 4. THÂN LỒNG ĐÈN LỤA ĐỎ CẦU TRÒN HOÀNG GIA -->
        <!-- Khối thân lụa phát sáng -->
        <ellipse cx="160" cy="225" rx="82" ry="92" fill="url(#silkGlowCore)" stroke="url(#goldRim3D)" stroke-width="2.5"/>

        <!-- Các múi lồng đèn uốn cong 3D -->
        <ellipse cx="160" cy="225" rx="58" ry="92" fill="none" stroke="#7f1d1d" stroke-width="2" opacity="0.6"/>
        <ellipse cx="160" cy="225" rx="30" ry="92" fill="none" stroke="#7f1d1d" stroke-width="2" opacity="0.6"/>
        <line x1="160" y1="133" x2="160" y2="317" stroke="#7f1d1d" stroke-width="2" opacity="0.6"/>

        <!-- Nan viền vàng trang trí trên thân lụa -->
        <ellipse cx="160" cy="225" rx="82" ry="92" fill="none" stroke="url(#goldRim3D)" stroke-width="1.8" opacity="0.85"/>
        <ellipse cx="160" cy="225" rx="82" ry="40" fill="none" stroke="url(#goldRim3D)" stroke-width="2.2" opacity="0.9"/>

        <!-- Chữ PHÚC (福) / VĂN HOA VÀNG DẬP NỔI TRUNG TÂM -->
        <g transform="translate(160, 225)" filter="url(#sparkleDot)">
          <circle cx="0" cy="0" r="22" fill="#991b1b" stroke="url(#goldRim3D)" stroke-width="2"/>
          <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="url(#goldRim3D)"/>
          <circle cx="0" cy="0" r="3.5" fill="#ffffff"/>
        </g>

        <!-- 5. ĐÁY ĐÈN MẠ VÀNG 24K -->
        <g transform="translate(160, 317)">
          <polygon points="-45,-8 45,-8 55,8 -55,8" fill="url(#goldRim3D)" stroke="#ffffff" stroke-width="0.8"/>
          <circle cx="0" cy="14" r="8" fill="url(#goldRim3D)"/>
        </g>

        <!-- 6. DÂY TUA RUA LỤA ĐỎ VÀNG RỦ DÀI UỐN LƯỢN MỀM MẠI -->
        <g transform="translate(0, 330)">
          <!-- Vệt bóng chuyển động của tua rua -->
          <path d="M 160,0 Q 160,60 ${tasselTipX},125" fill="none" stroke="#7f1d1d" stroke-width="12" stroke-linecap="round" opacity="0.6"/>
          <!-- Chùm tua rua chính màu đỏ tươi -->
          <path d="M 160,0 Q 160,60 ${tasselTipX},125" fill="none" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/>
          <path d="M 160,0 Q 160,60 ${tasselTipX},125" fill="none" stroke="url(#goldRibbon)" stroke-width="3" stroke-linecap="round"/>
          
          <!-- Hạt ngọc bích / vàng đính dưới chóp tua rua -->
          <circle cx="${tasselTipX}" cy="125" r="5" fill="url(#goldRim3D)"/>
          <circle cx="${tasselTipX}" cy="125" r="2" fill="#ffffff"/>
        </g>

        <!-- Đốm sáng lấp lánh ở khuyên vàng đỉnh đèn -->
        <g transform="translate(160, 20)">
          <polygon points="0,-6 1.5,-1.5 6,0 1.5,1.5 0,6 -1.5,1.5 -6,0 -1.5,-1.5" fill="#ffffff"/>
        </g>
      </g>
    </svg>
  `;
}

async function main() {
  console.log('🏮 Rendering 100% Transparent Animated 3D Royal Lantern (WebP)...');

  const frameBuffers = [];

  for (let f = 0; f < FRAMES; f++) {
    const svg = renderAnimatedLanternFrame(f);
    const frameWebp = await sharp(Buffer.from(svg))
      .webp({ quality: 90, alphaQuality: 95, effort: 6, lossless: false })
      .toBuffer();
    frameBuffers.push(frameWebp);
  }

  const animatedWebp = muxAnimatedWebP(frameBuffers, DELAY, 0, WIDTH, HEIGHT);

  const filesToSave = [
    path.join(__dirname, '../public/assets/lantern_trung_thu_animated.webp'),
    path.join(__dirname, '../pictures/lantern_trung_thu_animated.webp')
  ];

  for (const f of filesToSave) {
    fs.writeFileSync(f, animatedWebp);
  }

  console.log(`🎉 100% Transparent Animated Lantern rendered successfully:`);
  console.log(`👉 File: ${filesToSave[0]} (${(animatedWebp.length / 1024).toFixed(1)} KB)`);
}

main().catch(console.error);
