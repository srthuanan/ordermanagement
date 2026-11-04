const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Kích thước chuẩn cho Floating Specs Pill: 560 x 68 px
const WIDTH = 560;
const HEIGHT = 68;
const TOTAL_FRAMES = 24;
const DELAY = 80; // 80ms/frame = ~1.92s loop mượt mà

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

// Vẽ ngôi sao hoàng kim 4 cánh lấp lánh
function renderStar(cx, cy, size, opacity) {
  if (opacity <= 0.05) return '';
  const r = size;
  const inner = size * 0.22;
  return `
    <g transform="translate(${cx}, ${cy})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,${-r} Q 0,${-inner} ${inner},0 Q 0,${inner} 0,${r} Q 0,${inner} ${-inner},0 Q 0,${-inner} 0,${-r} Z" fill="#d97706" />
      <circle cx="0" cy="0" r="${(inner * 0.8).toFixed(1)}" fill="#ffffff" />
    </g>
  `;
}

// Vẽ vân mây cung đình Trung Thu truyền thống cách điệu
function renderTraditionalCloud(x, y, scale = 1.0, opacity = 0.30) {
  return `
    <g transform="translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${scale})" opacity="${opacity.toFixed(2)}">
      <path d="M 0,15 
               Q 10,8 20,12 
               Q 28,0 42,4 
               Q 56,-2 68,8 
               Q 80,4 90,14 
               Q 100,24 88,28 
               Q 75,32 50,30 
               Q 25,32 10,26 
               Q -2,22 0,15 Z" 
            fill="url(#cloudGrad)" />
      <path d="M 15,16 Q 25,10 38,14 Q 50,8 65,14" fill="none" stroke="#f59e0b" stroke-width="0.6" opacity="0.3"/>
      <path d="M 32,22 Q 45,18 60,21 Q 72,17 80,22" fill="none" stroke="#f59e0b" stroke-width="0.6" opacity="0.25"/>
    </g>
  `;
}

// Vẽ đèn lồng đỏ đu đưa nhẹ ở góc phải
function renderSwayingLantern(x, y, angle) {
  return `
    <g transform="translate(${x}, ${y}) rotate(${angle.toFixed(1)})">
      <!-- Dây treo đèn lồng -->
      <line x1="0" y1="-18" x2="0" y2="0" stroke="#b45309" stroke-width="1.2" />
      
      <!-- Nắp vàng trên của đèn -->
      <ellipse cx="0" cy="0" rx="7" ry="2.2" fill="#d97706" />
      
      <!-- Thân đèn lồng đỏ hoàng gia -->
      <ellipse cx="0" cy="11" rx="10" ry="11" fill="url(#lanternRedGrad)" />
      
      <!-- Vạch nan vàng trên thân đèn lồng -->
      <path d="M 0,0 C 0,5 0,17 0,22" stroke="#fbbf24" stroke-width="0.9" opacity="0.7" />
      <path d="M -5,1 C -7,6 -7,16 -5,21" stroke="#fbbf24" stroke-width="0.8" opacity="0.6" fill="none" />
      <path d="M 5,1 C 7,6 7,16 5,21" stroke="#fbbf24" stroke-width="0.8" opacity="0.6" fill="none" />
      
      <!-- Nắp vàng dưới của đèn -->
      <ellipse cx="0" cy="22" rx="6.5" ry="2" fill="#d97706" />
      
      <!-- Hạt ngọc & tua rua vàng đung đưa -->
      <circle cx="0" cy="24" r="1.5" fill="#f59e0b" />
      <line x1="-1.5" y1="25" x2="-2" y2="34" stroke="#d97706" stroke-width="1.0" />
      <line x1="0" y1="25" x2="0" y2="36" stroke="#fbbf24" stroke-width="1.2" />
      <line x1="1.5" y1="25" x2="2" y2="34" stroke="#d97706" stroke-width="1.0" />
    </g>
  `;
}

async function main() {
  console.log('--- BẮT ĐẦU TẠO ẢNH NỀN ĐỘNG SPECS PILL: THỎ NGỌC CUNG TRĂNG (V3) ---');

  const rabbitSourcePath = path.join(__dirname, '../pictures/tho_ngoc_clean.png');
  const hasRabbit = fs.existsSync(rabbitSourcePath);
  if (!hasRabbit) {
    throw new Error('Không tìm thấy file Thỏ Ngọc: ' + rabbitSourcePath);
  }

  const frames = [];

  for (let f = 0; f < TOTAL_FRAMES; f++) {
    const t = f / TOTAL_FRAMES;
    const phase = t * Math.PI * 2;

    // Chuyển động lượn sóng của mây
    const cloud1X = -20 + Math.sin(phase) * 18;
    const cloud2X = 380 - Math.cos(phase) * 22;
    const cloud3X = 180 + Math.sin(phase + 1.5) * 14;

    // Đèn lồng đu đưa nhẹ góc phải
    const lanternAngle = Math.sin(phase) * 4.5;

    // Thỏ Ngọc nhỏ nhắn, thanh tú bồng bềnh lơ lửng nhẹ ở góc trái
    const rbBobY = Math.sin(phase) * 1.2;
    const rbScale = 1.0 + 0.015 * Math.cos(phase);
    // Kích thước thỏ nhỏ gọn tinh tế: Cao 40px, Rộng 40px
    const rbHeight = Math.round(40 * rbScale);
    const rbWidth = Math.round(40 * rbScale);
    const rbCenterX = 28;
    const rbCenterY = 34 + rbBobY;
    const rbLeft = Math.round(rbCenterX - rbWidth / 2);
    const rbTop = Math.round(rbCenterY - rbHeight / 2);

    // Quầng sáng ấm áp tỏa ra từ ngôi sao của Thỏ Ngọc
    const haloRadius = 22 + 2 * Math.sin(phase);
    const haloOpacity = 0.45 + 0.12 * Math.sin(phase);

    // Tia sáng phát ra từ đèn ngôi sao
    const starGlowR = 11 + 2.5 * Math.sin(phase * 2);

    // Vệt lụa trăng quét nhẹ ngang qua
    const sweepX = (t * 720) - 160;

    // Ngôi sao lấp lánh
    const s1 = 0.35 + 0.65 * Math.max(0, Math.sin(phase));
    const s2 = 0.30 + 0.70 * Math.max(0, Math.sin(phase + 1.4));
    const s3 = 0.40 + 0.60 * Math.max(0, Math.sin(phase + 2.8));
    const s4 = 0.35 + 0.65 * Math.max(0, Math.sin(phase + 4.2));

    const svgContent = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Nền lụa bạch ngọc hoàng gia sáng trong, thanh nhã -->
          <linearGradient id="silkBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.98"/>
            <stop offset="60%" stop-color="#fffefe" stop-opacity="0.96"/>
            <stop offset="100%" stop-color="#fefcf8" stop-opacity="0.94"/>
          </linearGradient>

          <!-- Gradient màu mây hoàng kim Trung Thu mềm mại, thanh thoát -->
          <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.28"/>
            <stop offset="50%" stop-color="#fde047" stop-opacity="0.18"/>
            <stop offset="100%" stop-color="#fbbf24" stop-opacity="0.08"/>
          </linearGradient>

          <!-- Gradient đèn lồng đỏ hoàng gia -->
          <radialGradient id="lanternRedGrad" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stop-color="#ff4d4f"/>
            <stop offset="50%" stop-color="#dc2626"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </radialGradient>

          <!-- Quầng sáng ấm áp dịu nhẹ quanh Thỏ Ngọc -->
          <radialGradient id="rbHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="${(haloOpacity * 0.5).toFixed(2)}"/>
            <stop offset="60%" stop-color="#fef9c3" stop-opacity="${(haloOpacity * 0.2).toFixed(2)}"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </radialGradient>

          <!-- Ánh sáng đèn ngôi sao của thỏ -->
          <radialGradient id="starLight" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
            <stop offset="40%" stop-color="#fde047" stop-opacity="0.75"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
          </radialGradient>

          <!-- Dải lụa trăng lướt qua -->
          <linearGradient id="sweepGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
            <stop offset="50%" stop-color="#ffffff" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
          </linearGradient>
        </defs>

        <!-- Thân nền lụa ngọc ngà -->
        <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#silkBg)"/>

        <!-- Quầng sáng ấm sau Thỏ Ngọc ở góc trái -->
        <circle cx="${rbCenterX}" cy="${rbCenterY.toFixed(1)}" r="${haloRadius.toFixed(1)}" fill="url(#rbHalo)"/>

        <!-- Bóng đổ tiếp xúc 3D tự nhiên dưới chân Thỏ Ngọc -->
        <ellipse cx="${rbCenterX}" cy="${(rbCenterY + 17).toFixed(1)}" rx="13" ry="3.2" fill="#78350f" opacity="0.18"/>

        <!-- Các cụm vân mây hoàng cung uốn lượn sắc sảo rõ nét -->
        ${renderTraditionalCloud(cloud1X, 32, 0.7, 0.22)}
        ${renderTraditionalCloud(cloud3X, 6, 0.55, 0.18)}
        ${renderTraditionalCloud(cloud2X, 28, 0.65, 0.20)}

        <!-- Dải lụa ánh trăng lướt qua -->
        <g transform="translate(${sweepX.toFixed(1)}, 0)">
          <polygon points="0,68 60,0 110,0 50,68" fill="url(#sweepGrad)"/>
        </g>

        <!-- Đèn lồng đỏ treo ở góc phải đu đưa đón gió thu -->
        ${renderSwayingLantern(535, 14, lanternAngle)}

        <!-- Quầng sáng ấm sau đèn lồng -->
        <circle cx="535" cy="24" r="16" fill="#f59e0b" opacity="0.10"/>

        <!-- Các ngôi sao hoàng kim 4 cánh lấp lánh -->
        ${renderStar(78, 18, 3.5, s1)}
        ${renderStar(210, 48, 2.8, s2)}
        ${renderStar(340, 16, 3.2, s3)}
        ${renderStar(485, 46, 3.0, s4)}

        <!-- Bụi vàng đom đóm lơ lửng -->
        <circle cx="${(140 + Math.sin(phase) * 4).toFixed(1)}" cy="${(20 - Math.cos(phase) * 2).toFixed(1)}" r="1.3" fill="#f59e0b" opacity="0.65"/>
        <circle cx="${(280 + Math.cos(phase) * 5).toFixed(1)}" cy="${(46 + Math.sin(phase) * 2).toFixed(1)}" r="1.1" fill="#d97706" opacity="0.60"/>
        <circle cx="${(430 - Math.sin(phase) * 4).toFixed(1)}" cy="${(22 + Math.cos(phase) * 2).toFixed(1)}" r="1.2" fill="#f59e0b" opacity="0.65"/>
      </svg>
    `;

    const bgPngBuffer = await sharp(Buffer.from(svgContent)).png().toBuffer();

    // Chuẩn bị icon Thỏ Ngọc sắc nét 3D với thuật toán Lanczos3 & Sharpen
    const resizedRabbit = await sharp(rabbitSourcePath)
      .resize(rbWidth, rbHeight, {
        fit: 'contain',
        kernel: sharp.kernel.lanczos3,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .sharpen({ sigma: 1.0, m1: 1.8, m2: 0.8 })
      .toBuffer();

    // Thêm quầng sáng tỏa từ chiếc đèn ngôi sao cầm tay của Thỏ
    const starGlowSvg = `
      <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${(rbCenterX - 3).toFixed(1)}" cy="${(rbCenterY + 8).toFixed(1)}" r="${starGlowR.toFixed(1)}" fill="#fef08a" opacity="0.45" />
      </svg>
    `;
    const starGlowBuffer = await sharp(Buffer.from(starGlowSvg)).png().toBuffer();

    const finalFrame = await sharp(bgPngBuffer)
      .composite([
        {
          input: resizedRabbit,
          left: Math.max(0, rbLeft),
          top: Math.max(0, rbTop)
        },
        {
          input: starGlowBuffer,
          left: 0,
          top: 0
        }
      ])
      .webp({ quality: 98, alphaQuality: 100, effort: 6, lossless: false })
      .toBuffer();

    frames.push(finalFrame);
    if ((f + 1) % 6 === 0 || f === TOTAL_FRAMES - 1) {
      console.log(`Đã render frame ${f + 1}/${TOTAL_FRAMES}...`);
    }
  }

  console.log('Đang đóng gói file WebP động Specs Pill Thỏ Ngọc (Muxing ANMF chunks)...');
  const animatedWebpBuffer = muxAnimatedWebP(frames, DELAY, 0);

  const outPicturesPath = path.join(__dirname, '../pictures/specs_pill_bg_trung_thu.webp');
  const outPublicPath = path.join(__dirname, '../public/assets/specs_pill_bg_trung_thu.webp');

  fs.writeFileSync(outPicturesPath, animatedWebpBuffer);
  fs.writeFileSync(outPublicPath, animatedWebpBuffer);

  const sizeKb = (animatedWebpBuffer.length / 1024).toFixed(1);
  console.log(`HOÀN TẤT! File ảnh nền động Specs Pill Thỏ Ngọc: ${sizeKb} KB`);
  console.log(`Đã ghi đè vào:\n- ${outPicturesPath}\n- ${outPublicPath}`);
}

main().catch(err => {
  console.error('Lỗi khi tạo ảnh nền Specs Pill Thỏ Ngọc:', err);
  process.exit(1);
});
